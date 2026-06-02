const API_URL = 'https://mytne8lapa.execute-api.us-east-1.amazonaws.com/dev/transcribe'

export async function uploadAudioForTranscription(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'audio/webm' },
          body: base64,
        })
        if (!res.ok) throw new Error('Transcription upload failed')
        const data = await res.json()
        resolve(data)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read audio blob'))
    reader.readAsDataURL(blob)
  })
}

export async function getTranscriptionResult(jobName) {
  const res = await fetch(`${API_URL}/${jobName}`, { method: 'GET' })
  if (!res.ok) throw new Error('Failed to get transcription result')
  return res.json()
}
