import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
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

app.use(helmet())

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,https://d139i2fhyuv4er.cloudfront.net,https://text2speech.duckdns.org').split(',')
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(null, false)
  },
}))

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Try again later.' },
})
app.use('/api/', limiter)

app.use(express.json({ limit: '10mb' }))
app.use(express.raw({ type: t => t.startsWith('audio/'), limit: '10mb' }))

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'https://mytne8lapa.execute-api.us-east-1.amazonaws.com/dev/transcribe'

app.post('/api/transcribe', async (req, res) => {
  try {
    const contentType = req.headers['content-type'] || ''
    if (!contentType.startsWith('audio/') && contentType !== 'application/json') {
      return res.status(400).json({ error: 'Unsupported content type' })
    }
    const bodyLen = req.body
      ? (Buffer.isBuffer(req.body) ? req.body.length : JSON.stringify(req.body).length)
      : 0
    if (bodyLen > 10 * 1024 * 1024) {
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
    console.error('Proxy error:', err)
    res.status(500).json({ error: 'Transcription service unavailable' })
  }
})

app.get('/api/transcribe/:jobName', async (req, res) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/${encodeURIComponent(req.params.jobName)}`)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Job not found' })
    }
    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error('Proxy error:', err)
    res.status(500).json({ error: 'Transcription service unavailable' })
  }
})

app.get('/api/user/:userId/profile', (req, res) => {
  try {
    const profile = getUserProfile(req.params.userId)
    if (!profile) {
      return res.json({ userId: req.params.userId, exists: false })
    }
    res.json({ ...profile, exists: true })
  } catch (err) {
    console.error('Profile fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

app.post('/api/user/:userId/profile', (req, res) => {
  try {
    const { name, email, picture } = req.body
    const profile = createOrUpdateUserProfile(req.params.userId, { name, email, picture })
    res.json(profile)
  } catch (err) {
    console.error('Profile save error:', err)
    res.status(500).json({ error: 'Failed to save profile' })
  }
})

app.get('/api/user/:userId/history', (req, res) => {
  try {
    const history = getHistory(req.params.userId)
    res.json(history)
  } catch (err) {
    console.error('History fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

app.post('/api/user/:userId/history', (req, res) => {
  try {
    const { type, transcript, preview } = req.body
    const entry = addHistoryItem(req.params.userId, { type, transcript, preview })
    res.status(201).json(entry)
  } catch (err) {
    console.error('History add error:', err)
    res.status(500).json({ error: 'Failed to add history item' })
  }
})

app.delete('/api/user/:userId/history/:itemId', (req, res) => {
  try {
    const deleted = deleteHistoryItem(req.params.userId, req.params.itemId)
    if (!deleted) {
      return res.status(404).json({ error: 'Item not found' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('History delete error:', err)
    res.status(500).json({ error: 'Failed to delete history item' })
  }
})

app.delete('/api/user/:userId/history', (req, res) => {
  try {
    clearHistory(req.params.userId)
    res.json({ success: true })
  } catch (err) {
    console.error('History clear error:', err)
    res.status(500).json({ error: 'Failed to clear history' })
  }
})

const PORT = process.env.PORT || 5174
app.listen(PORT, () => console.log(`SpeechWeb proxy running on http://localhost:${PORT}`))
