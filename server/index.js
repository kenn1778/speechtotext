import express from 'express'
import cors from 'cors'
import multer from 'multer'
import fs from 'fs'
import path from 'path'

const app = express()
app.use(cors())

const upload = multer({ dest: path.join(process.cwd(), 'server', 'uploads') })

app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  try {
    // NOTE: This is a placeholder. Replace this block with a call to a real
    // speech-to-text service (OpenAI Whisper, Google Speech-to-Text, Vosk, etc.)
    // For demo purposes we read the filename and return a mock transcript.
    const file = req.file
    if (!file) return res.status(400).json({ error: 'No file uploaded' })

    // Optionally persist or process the file here.
    const transcript = `Mock server transcript for file: ${file.originalname}. Replace with real STT integration.`

    // Clean up uploaded file (optional)
    try { fs.unlinkSync(file.path) } catch (e) { /* ignore */ }

    return res.json({ transcript })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal error' })
  }
})

const PORT = process.env.PORT || 5174
app.listen(PORT, () => console.log(`Transcription server running on http://localhost:${PORT}`))
