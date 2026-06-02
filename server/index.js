import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.raw({ type: 'audio/webm', limit: '50mb' }))

const API_GATEWAY_URL = 'https://mytne8lapa.execute-api.us-east-1.amazonaws.com/dev/transcribe'

app.post('/api/transcribe', async (req, res) => {
  try {
    const response = await fetch(API_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': req.headers['content-type'] || 'audio/webm' },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/transcribe/:jobName', async (req, res) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/${req.params.jobName}`)
    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 5174
app.listen(PORT, () => console.log(`Transcription proxy server running on http://localhost:${PORT}`))
