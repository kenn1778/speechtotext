export async function uploadAudioForTranscription(blob) {
  const form = new FormData()
  form.append('file', blob, 'recording.webm')
  const res = await fetch('/api/transcribe', { method: 'POST', body: form })
  if (!res.ok) throw new Error('Transcription failed')
  return res.json()
}
