import { fetchAuthSession } from 'aws-amplify/auth'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const WS_URL = import.meta.env.VITE_WS_TRANSCRIBE_URL || 'ws://localhost:5174/ws/transcribe'

let pcmProcessor = null
let audioCtx = null
let sourceNode = null
let scriptNode = null
let ws = null
let wsCleanup = null
let isStreaming = false
let currentAbort = null

export async function getIdToken() {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.idToken?.toString() || null
  } catch {
    return null
  }
}

export function startStreamingTranscription({
  stream,
  onPartial,
  onFinal,
  onError,
  onEnd,
}) {
  const abort = { cancelled: false }
  currentAbort = abort

  ;(async () => {
    try {
      const token = await getIdToken()
      if (!token) {
        onError?.(new Error('Authentication required. Please sign in.'))
        return
      }

      const url = `${WS_URL}?token=${encodeURIComponent(token)}`
      ws = new WebSocket(url)
      ws.binaryType = 'arraybuffer'

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000)
        ws.onopen = () => {
          clearTimeout(timeout)
          resolve()
        }
        ws.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('WebSocket connection failed'))
        }
      })

      if (abort.cancelled) {
        ws.close()
        return
      }

      let finalText = ''
      let connectedResolved = false

      ws.onmessage = (event) => {
        if (abort.cancelled) return
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'connected') {
            connectedResolved = true
          } else if (msg.type === 'partial') {
            onPartial?.(msg.text)
          } else if (msg.type === 'final') {
            finalText = msg.text
            onFinal?.(msg.text)
          } else if (msg.type === 'error') {
            onError?.(new Error(msg.text || 'Transcription error'))
          } else if (msg.type === 'end') {
            onEnd?.(finalText || msg.text)
          }
        } catch {
          // non-JSON messages are ignored
        }
      }

      ws.onerror = (event) => {
        if (!connectedResolved) {
          onError?.(new Error('WebSocket error during transcription'))
        }
      }

      ws.onclose = () => {
        if (abort.cancelled) return
        if (finalText) {
          onEnd?.(finalText)
        }
      }

      await startPcmStream(stream, ws, abort)

      if (abort.cancelled) return
      isStreaming = true
    } catch (err) {
      if (!abort.cancelled) {
        onError?.(err)
      }
    }
  })()

  return () => {
    abort.cancelled = true
    cleanupStreaming()
  }
}

function startPcmStream(stream, ws, abort) {
  return new Promise((resolve, reject) => {
    try {
      audioCtx = new AudioContext({ sampleRate: 16000 })
      sourceNode = audioCtx.createMediaStreamSource(stream)

      const bufferSize = 4096
      scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1)

      sourceNode.connect(scriptNode)
      scriptNode.connect(audioCtx.destination)

      scriptNode.onaudioprocess = (event) => {
        if (abort.cancelled) {
          cleanupStreaming()
          return
        }

        const input = event.inputBuffer.getChannelData(0)
        const pcm16 = float32ToInt16(input)

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(pcm16.buffer)
        }
      }

      resolve()
    } catch (err) {
      reject(err)
    }
  })
}

function float32ToInt16(float32Array) {
  const len = float32Array.length
  const int16Array = new Int16Array(len)
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }
  return int16Array
}

function cleanupStreaming() {
  if (scriptNode) {
    scriptNode.disconnect()
    scriptNode = null
  }
  if (sourceNode) {
    sourceNode.disconnect()
    sourceNode = null
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {})
    audioCtx = null
  }
  if (ws) {
    ws.onclose = null
    ws.onerror = null
    ws.onmessage = null
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close()
    }
    ws = null
  }
  pcmProcessor = null
  isStreaming = false
  currentAbort = null
}

export function stopStreaming() {
  cleanupStreaming()
}

export async function transcribeBlob(blob) {
  const token = await getIdToken()
  if (!token) {
    throw new Error('Authentication required. Please sign in.')
  }

  const toBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

  const audioBase64 = await toBase64(blob)

  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ audio: audioBase64 }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Transcription failed')
  }

  const data = await res.json()
  return data.transcript || data.Text || ''
}
