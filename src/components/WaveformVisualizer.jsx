import { useRef, useEffect } from 'react'
import useAppStore from '../store/useAppStore'

export default function WaveformVisualizer({ isActive }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const audioLevel = useAppStore((s) => s.audioLevel)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const parent = canvas.parentElement
    const w = Math.min(parent?.clientWidth || 200, 200)
    const h = 48

    canvas.width = w
    canvas.height = h

    const barCount = 32
    const gap = 2
    const barWidth = (w - gap * (barCount - 1)) / barCount

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function draw() {
      ctx.clearRect(0, 0, w, h)
      if (!isActive) {
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + gap)
          const barH = 2
          const y = (h - barH) / 2
          ctx.fillStyle = 'rgba(148, 163, 184, 0.2)'
          ctx.fillRect(x, y, barWidth, barH)
        }
        return
      }

      const level = Math.min(audioLevel || 0.01, 1)
      for (let i = 0; i < barCount; i++) {
        const t = Date.now() * 0.004 + i * 0.4
        const wave = Math.sin(t) * 0.5 + 0.5
        const barH = prefersReduced
          ? Math.max(2, level * h * 0.8)
          : Math.max(2, (level * wave + 0.1) * h * 0.9)

        const x = i * (barWidth + gap)
        const y = (h - barH) / 2
        const alpha = 0.2 + level * 0.6
        ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`
        const r = barWidth > 3 ? 1.5 : 1
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barH, r)
        ctx.fill()
      }
    }

    let running = true
    function loop() {
      if (!running) return
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      running = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isActive, audioLevel])

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-[200px] h-12"
      role="img"
      aria-label={isActive ? 'Audio waveform visualizer' : 'Inactive waveform'}
      style={{ imageRendering: 'crisp-edges' }}
    />
  )
}
