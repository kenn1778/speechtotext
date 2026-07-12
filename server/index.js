import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { authMiddleware, requireOwnUser } from './auth.js'
import {
  getUserProfile,
  createOrUpdateUserProfile,
  getHistory,
  addHistoryItem,
  deleteHistoryItem,
  clearHistory,
} from './db.js'

dotenv.config()

const app = express()

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://cognito-idp.us-east-1.amazonaws.com", "https://*.execute-api.us-east-1.amazonaws.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
}))

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://d139i2fhyuv4er.cloudfront.net',
  'https://text2speech.duckdns.org',
]
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(null, false)
  },
}))

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Try again later.' },
})
app.use('/api/', limiter)

app.use(express.json({ limit: '1mb' }))
app.use(express.raw({ type: t => t.startsWith('audio/'), limit: '5mb' }))

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
  } catch {
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
  } catch {
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
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

app.post('/api/user/:userId/profile', authMiddleware, requireOwnUser, (req, res) => {
  try {
    const { name, email, picture } = req.body
    if (typeof name !== 'string' || name.length > 100) {
      return res.status(400).json({ error: 'Invalid name' })
    }
    if (typeof email !== 'string' || email.length > 254) {
      return res.status(400).json({ error: 'Invalid email' })
    }
    if (picture && (typeof picture !== 'string' || picture.length > 2048)) {
      return res.status(400).json({ error: 'Invalid picture URL' })
    }
    const sanitized = {
      name: name.slice(0, 100),
      email: email.slice(0, 254),
    }
    if (picture) sanitized.picture = picture.slice(0, 2048)
    const profile = createOrUpdateUserProfile(req.params.userId, sanitized)
    res.json(profile)
  } catch {
    res.status(500).json({ error: 'Failed to save profile' })
  }
})

app.get('/api/user/:userId/history', authMiddleware, requireOwnUser, (req, res) => {
  try {
    const history = getHistory(req.params.userId)
    res.json(history)
  } catch {
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

app.post('/api/user/:userId/history', authMiddleware, requireOwnUser, (req, res) => {
  try {
    const { type, transcript, preview } = req.body
    if (!['recording', 'pdf'].includes(type)) {
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
  } catch {
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
  } catch {
    res.status(500).json({ error: 'Failed to delete history item' })
  }
})

app.delete('/api/user/:userId/history', authMiddleware, requireOwnUser, (req, res) => {
  try {
    clearHistory(req.params.userId)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to clear history' })
  }
})

const PORT = process.env.PORT || 5174
app.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`SpeechWeb proxy running on http://localhost:${PORT}`)
  }
})
