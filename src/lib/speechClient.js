const API_URL = 'https://mytne8lapa.execute-api.us-east-1.amazonaws.com/dev/transcribe'

async function fetchWithRetry(url, options, maxRetries = 2) {
  let lastError
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) return res
      if (res.status >= 400 && res.status < 500) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Request failed (${res.status})`)
      }
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
  }
  throw lastError || new Error('Transcription failed after retries')
}

export async function uploadAudioForTranscription(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      try {
        const res = await fetchWithRetry(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'audio/webm' },
          body: base64,
        })
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
  const res = await fetch(`${API_URL}/${encodeURIComponent(jobName)}`, { method: 'GET' })
  if (!res.ok) throw new Error('Failed to get transcription result')
  return res.json()
}

export async function getAudioUrl(filename) {
  return `https://speechweb-audio-dev-352206182975.s3.amazonaws.com/${encodeURIComponent(filename)}`
}
