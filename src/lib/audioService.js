let mediaRecorder = null
let stream = null
let audioContext = null
let analyser = null
let source = null
let animationId = null
let chunks = []
let onLevelCallback = null
let onStopCallback = null

export async function requestMicPermission() {
  if (stream) return stream
  stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  return stream
}

export function startRecording({ onLevel, onStop }) {
  if (!stream) throw new Error('Microphone not initialized')

  audioContext = new AudioContext()
  source = audioContext.createMediaStreamSource(stream)
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 256
  source.connect(analyser)

  onLevelCallback = onLevel
  onStopCallback = onStop

  chunks = []
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm'

  mediaRecorder = new MediaRecorder(stream, { mimeType })
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType })
    stopAnalyser()
    cleanup()
    onStopCallback?.(blob)
  }
  mediaRecorder.start(100)
  startAnalyserLoop()

  return { mimeType }
}

export function pauseRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause()
    stopAnalyser()
  }
}

export function resumeRecording() {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume()
    startAnalyserLoop()
  }
}

export function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
}

function startAnalyserLoop() {
  if (!analyser) return
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)

  function tick() {
    if (!analyser) return
    analyser.getByteFrequencyData(dataArray)
    const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength
    const level = Math.min(avg / 128, 1)
    onLevelCallback?.(level)
    animationId = requestAnimationFrame(tick)
  }
  tick()
}

function stopAnalyser() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  onLevelCallback?.(0)
}

function cleanup() {
  if (source) { source.disconnect(); source = null }
  if (audioContext) { audioContext.close().catch(() => {}); audioContext = null }
  analyser = null
  mediaRecorder = null
  chunks = []
  onLevelCallback = null
  onStopCallback = null
}

export function releaseMicrophone() {
  stopRecording()
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
}
