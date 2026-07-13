import { URL } from 'url'
import jwt from 'jsonwebtoken'
import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from '@aws-sdk/client-transcribe-streaming'

const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-1_g2QvSscNA'
const REGION = process.env.AWS_REGION || 'us-east-1'
const JWKS_URL = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`
const ISS = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`

let jwksCache = null
let jwksCacheTime = 0
const CACHE_TTL = 3600000

async function getJwks() {
  const now = Date.now()
  if (jwksCache && now - jwksCacheTime < CACHE_TTL) return jwksCache
  const res = await fetch(JWKS_URL)
  if (!res.ok) throw new Error('Failed to fetch JWKS')
  const { keys } = await res.json()
  jwksCache = keys
  jwksCacheTime = now
  return keys
}

function getKey(keys, kid) {
  const key = keys.find(k => k.kid === kid)
  if (!key) return null
  const { kty, n, e, alg } = key
  return { key: { kty, n, e }, alg }
}

async function authenticateWsToken(token) {
  const decoded = jwt.decode(token, { complete: true })
  if (!decoded || !decoded.header || !decoded.header.kid) return null

  const keys = await getJwks()
  const { key, alg } = getKey(keys, decoded.header.kid)
  if (!key) return null

  try {
    return jwt.verify(token, key, {
      algorithms: [alg || 'RS256'],
      issuer: ISS,
    })
  } catch {
    return null
  }
}

export async function handleTranscribeStream(ws, req) {
  const searchParams = new URL(req.url, `http://${req.headers.host}`).searchParams
  const token = searchParams.get('token')

  if (!token) {
    ws.send(JSON.stringify({ type: 'error', text: 'Authentication required' }))
    ws.close()
    return
  }

  let payload
  try {
    payload = await authenticateWsToken(token)
  } catch {
    ws.send(JSON.stringify({ type: 'error', text: 'Authentication failed' }))
    ws.close()
    return
  }

  if (!payload) {
    ws.send(JSON.stringify({ type: 'error', text: 'Invalid authentication token' }))
    ws.close()
    return
  }

  const audioChunks = []
  let streamEnded = false
  let resolveChunk = null
  let chunkQueue = []

  function pushChunk(chunk) {
    if (resolveChunk) {
      const resolve = resolveChunk
      resolveChunk = null
      resolve({ value: { AudioChunk: chunk }, done: false })
    } else {
      chunkQueue.push(chunk)
    }
  }

  function endStream() {
    streamEnded = true
    if (resolveChunk) {
      const resolve = resolveChunk
      resolveChunk = null
      resolve({ value: undefined, done: true })
    }
  }

  async function* audioStream() {
    while (!streamEnded) {
      if (chunkQueue.length > 0) {
        const chunk = chunkQueue.shift()
        yield { AudioChunk: chunk }
      } else {
        const result = await new Promise(resolve => {
          resolveChunk = resolve
        })
        if (result.done) break
        yield result.value
      }
    }
  }

  let partialText = ''
  let finalText = ''

  try {
    const client = new TranscribeStreamingClient({ region: REGION })

    const command = new StartStreamTranscriptionCommand({
      LanguageCode: 'en-US',
      MediaSampleRateHertz: 16000,
      MediaEncoding: 'pcm',
      AudioStream: audioStream(),
    })

    ws.send(JSON.stringify({ type: 'connected' }))

    ws.on('message', (data) => {
      if (Buffer.isBuffer(data)) {
        pushChunk(new Uint8Array(data))
      } else {
        try {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'end') {
            endStream()
          }
        } catch {
          // ignore non-JSON messages
        }
      }
    })

    ws.on('close', () => {
      endStream()
    })

    const response = await client.send(command)

    for await (const event of response.TranscriptResultStream) {
      if (event.TranscriptEvent) {
        const results = event.TranscriptEvent.Transcript?.Results || []
        for (const result of results) {
          if (result.IsPartial) {
            const text = result.Alternatives?.[0]?.Transcript || ''
            if (text) {
              partialText = text
              try { ws.send(JSON.stringify({ type: 'partial', text })) } catch {}
            }
          } else {
            const text = result.Alternatives?.[0]?.Transcript || ''
            if (text) {
              finalText = (finalText ? finalText + ' ' : '') + text
              try { ws.send(JSON.stringify({ type: 'final', text: finalText })) } catch {}
            }
          }
        }
      }
    }

    if (finalText) {
      try { ws.send(JSON.stringify({ type: 'end', text: finalText })) } catch {}
    }

  } catch (err) {
    try {
      ws.send(JSON.stringify({ type: 'error', text: err.message || 'Transcription failed' }))
    } catch {}
  } finally {
    try { ws.close() } catch {}
  }
}
