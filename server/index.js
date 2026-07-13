import http from 'http'
import crypto from 'crypto'
import { URL } from 'url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { WebSocketServer } from 'ws'
import { authMiddleware, requireOwnUser } from './auth.js'
import {
  getUserProfile,
  createOrUpdateUserProfile,
  getHistory,
  addHistoryItem,
  deleteHistoryItem,
  clearHistory,
  backup,
} from './db.js'
import { handleTranscribeStream } from './wsTranscribe.js'

dotenv.config()

const app = express()
const server = http.createServer(app)

const NODE_ENV = process.env.NODE_ENV || 'development'
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug')

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }
const currentLevel = LOG_LEVELS[LOG_LEVEL] ?? 1

function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] === undefined || LOG_LEVELS[level] < currentLevel) return
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId: meta.requestId || null,
    method: meta.method || null,
    path: meta.path || null,
    statusCode: meta.statusCode || null,
    duration: meta.duration || null,
    error: meta.error || null,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') {
    process.stderr.write(line + '\n')
  } else {
    process.stdout.write(line + '\n')
  }
}

function assignRequestId(req, res, next) {
  req.requestId = crypto.randomUUID().slice(0, 8)
  res.setHeader('X-Request-Id', req.requestId)
  next()
}

function requestLogger(req, res, next) {
  const start = Date.now()
  res.on('finish', () => {
    log('info', `${req.method} ${req.originalUrl} ${res.statusCode}`, {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: Date.now() - start,
    })
  })
  next()
}

function errorLogger(err, req, res, _next) {
  log('error', err.message || 'Unhandled error', {
    requestId: req?.requestId || null,
    method: req?.method || null,
    path: req?.originalUrl || null,
    error: err.stack || err.message,
  })
  res.status(500).json({ error: 'Internal server error' })
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://cognito-idp.us-east-1.amazonaws.com", "https://*.execute-api.us-east-1.amazonaws.com", "wss://*.amazonaws.com", "wss://*.execute-api.us-east-1.amazonaws.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
}))

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://d139i2fhyuv4er.cloudfront.net',
  'https://text2speech.duckdns.org',
]
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : []
const ALLOWED_ORIGINS = [...new Set([...defaultOrigins, ...envOrigins])]

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    log('warn', `Blocked request from origin: ${origin}`)
    cb(null, false)
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(assignRequestId)
app.use(requestLogger)

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Try again later.' },
})
app.use('/api/', globalLimiter)

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication requests. Try again later.' },
})

app.use(express.json({ limit: '1mb' }))
app.use(express.raw({ type: t => t.startsWith('audio/'), limit: '5mb' }))

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' })
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' })
  }
  next(err)
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() })
})

// WebSocket server for streaming transcription
const wss = new WebSocketServer({ server, path: '/ws/transcribe' })

wss.on('connection', (ws, req) => {
  handleTranscribeStream(ws, req).catch((err) => {
    log('error', 'WebSocket handler error', { error: err.message })
    try { ws.send(JSON.stringify({ type: 'error', text: err.message })) } catch {}
    try { ws.close() } catch {}
  })
})

wss.on('error', (err) => {
  log('error', 'WebSocket server error', { error: err.message })
})

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'https://mytne8lapa.execute-api.us-east-1.amazonaws.com/dev/transcribe'

app.post('/api/transcribe', authMiddleware, async (req, res) => {
  try {
    const contentType = req.headers['content-type'] || ''
    if (!contentType.startsWith('audio/') && contentType !== 'application/json') {
      return res.status(400).json({ error: 'Unsupported content type' })
    }
    const bodyLen = req.body
      ? (Buffer.isBuffer(req.body) ? req.body.length : JSON.stringify(req.body).length)
      : 0
    if (bodyLen > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Payload too large' })
    }
    if (bodyLen === 0) {
      return res.status(400).json({ error: 'Empty request body' })
    }

    const resType = contentType
    const body = resType === 'application/json' ? JSON.stringify(req.body) : req.body

    const response = await fetch(API_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    const data = await response.json()
    res.json(data)
  } catch (err) {
    log('error', 'Transcription POST failed', { error: err.message, requestId: req.requestId })
    res.status(500).json({ error: 'Transcription service unavailable' })
  }
})

app.get('/api/transcribe/:jobName', authMiddleware, async (req, res) => {
  try {
    if (!/^[a-zA-Z0-9_\-]+$/.test(req.params.jobName)) {
      return res.status(400).json({ error: 'Invalid job name' })
    }
    const response = await fetch(`${API_GATEWAY_URL}/${encodeURIComponent(req.params.jobName)}`)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Job not found' })
    }
    const data = await response.json()
    res.json(data)
  } catch (err) {
    log('error', 'Transcription GET failed', { error: err.message, requestId: req.requestId })
    res.status(500).json({ error: 'Transcription service unavailable' })
  }
})

app.get('/api/user/:userId/profile', authMiddleware, requireOwnUser, (req, res) => {
  try {
    const profile = getUserProfile(req.params.userId)
    if (!profile) {
      return res.json({ userId: req.params.userId, exists: false })
    }
    res.json({ ...profile, exists: true })
  } catch (err) {
    log('error', 'Get profile failed', { error: err.message, requestId: req.requestId })
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

app.post('/api/user/:userId/profile', authMiddleware, requireOwnUser, (req, res) => {
  try {
    const { name, email, picture } = req.body
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({ error: 'Invalid name' })
    }
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email' })
    }
    if (picture && (typeof picture !== 'string' || picture.length > 2048)) {
      return res.status(400).json({ error: 'Invalid picture URL' })
    }
    const sanitized = {
      name: name.trim().slice(0, 100),
      email: email.trim().slice(0, 254),
    }
    if (picture) sanitized.picture = picture.slice(0, 2048)
    const profile = createOrUpdateUserProfile(req.params.userId, sanitized)
    res.json(profile)
  } catch (err) {
    log('error', 'Save profile failed', { error: err.message, requestId: req.requestId })
    res.status(500).json({ error: 'Failed to save profile' })
  }
})

app.get('/api/user/:userId/history', authMiddleware, requireOwnUser, (req, res) => {
  try {
    const history = getHistory(req.params.userId)
    res.json(history)
  } catch (err) {
    log('error', 'Get history failed', { error: err.message, requestId: req.requestId })
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

app.post('/api/user/:userId/history', authMiddleware, requireOwnUser, (req, res) => {
  try {
    const { type, transcript, preview } = req.body
    if (!['recording', 'pdf', 'slides'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' })
    }
    if (typeof transcript !== 'string' || transcript.length > 50000) {
      return res.status(400).json({ error: 'Invalid transcript' })
    }
    const entry = addHistoryItem(req.params.userId, {
      type,
      transcript: transcript.slice(0, 50000),
      preview: typeof preview === 'string' ? preview.slice(0, 200) : transcript.slice(0, 100),
    })
    res.status(201).json(entry)
  } catch (err) {
    log('error', 'Add history failed', { error: err.message, requestId: req.requestId })
    res.status(500).json({ error: 'Failed to add history item' })
  }
})

app.delete('/api/user/:userId/history/:itemId', authMiddleware, requireOwnUser, (req, res) => {
  try {
    if (!/^[a-zA-Z0-9_\-]+$/.test(req.params.itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' })
    }
    const deleted = deleteHistoryItem(req.params.userId, req.params.itemId)
    if (!deleted) {
      return res.status(404).json({ error: 'Item not found' })
    }
    res.json({ success: true })
  } catch (err) {
    log('error', 'Delete history item failed', { error: err.message, requestId: req.requestId })
    res.status(500).json({ error: 'Failed to delete history item' })
  }
})

app.delete('/api/user/:userId/history', authMiddleware, requireOwnUser, (req, res) => {
  try {
    clearHistory(req.params.userId)
    res.json({ success: true })
  } catch (err) {
    log('error', 'Clear history failed', { error: err.message, requestId: req.requestId })
    res.status(500).json({ error: 'Failed to clear history' })
  }
})

app.use(errorLogger)

const PORT = process.env.PORT || 5174
server.listen(PORT, () => {
  log('info', `SpeechWeb server starting`, { port: PORT, env: NODE_ENV })
  log('info', `WebSocket server on ws://0.0.0.0:${PORT}/ws/transcribe`)
})
