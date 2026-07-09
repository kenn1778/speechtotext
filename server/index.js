import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

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
  max: 15,
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
      headers: { 'Content-Type': resType },
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

const PORT = process.env.PORT || 5174
app.listen(PORT, () => console.log(`SpeechWeb proxy running on http://localhost:${PORT}`))
