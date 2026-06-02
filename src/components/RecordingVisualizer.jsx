import { useEffect, useRef } from 'react'

function RecordingVisualizer({ stream, active }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active || !stream) return

    const ctx = canvas.getContext('2d')
    const resize = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio
      canvas.height = canvas.clientHeight * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const audioCtx = new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    audioCtxRef.current = audioCtx
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    analyserRef.current = analyser
    const source = audioCtx.createMediaStreamSource(stream)
    sourceRef.current = source
    source.connect(analyser)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!canvas) return
      animRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)

      const barCount = 48
      const step = Math.floor(bufferLength / barCount)
      const barW = (w - (barCount - 1) * 2) / barCount

      for (let i = 0; i < barCount; i++) {
        let sum = 0
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j]
        }
        const avg = sum / step
        const pct = avg / 255
        const barH = pct * h * 0.9

        const hue = 200 + pct * 60
        const alpha = 0.4 + pct * 0.6
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${alpha})`

        const x = i * (barW + 2)
        const y = h - barH
        const r = Math.min(barW, 4)
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + barW - r, y)
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r)
        ctx.lineTo(x + barW, h - r)
        ctx.quadraticCurveTo(x + barW, h, x + barW - r, h)
        ctx.lineTo(x + r, h)
        ctx.quadraticCurveTo(x, h, x, h - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.closePath()
        ctx.fill()
      }
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
      source.disconnect()
      audioCtx.close()
    }
  }, [stream, active])

  return (
    <canvas
      ref={canvasRef}
      className="h-24 w-full rounded-xl border border-white/10 bg-black/60"
    />
  )
}

export default RecordingVisualizer
