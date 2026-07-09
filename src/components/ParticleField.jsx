import { useRef, useEffect, useMemo } from 'react'

const SHAPES = ['circle', 'triangle', 'square', 'diamond', 'star']

function randomBetween(a, b) {
  return a + Math.random() * (b - a)
}

function drawParticle(ctx, p) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.globalAlpha = p.opacity
  ctx.fillStyle = p.color

  if (p.shape === 'circle') {
    ctx.beginPath()
    ctx.arc(0, 0, p.size, 0, Math.PI * 2)
    ctx.fill()
  } else if (p.shape === 'triangle') {
    ctx.beginPath()
    ctx.moveTo(0, -p.size)
    ctx.lineTo(-p.size, p.size)
    ctx.lineTo(p.size, p.size)
    ctx.closePath()
    ctx.fill()
  } else if (p.shape === 'square') {
    ctx.fillRect(-p.size * 0.7, -p.size * 0.7, p.size * 1.4, p.size * 1.4)
  } else if (p.shape === 'diamond') {
    ctx.beginPath()
    ctx.moveTo(0, -p.size)
    ctx.lineTo(-p.size * 0.7, 0)
    ctx.lineTo(0, p.size)
    ctx.lineTo(p.size * 0.7, 0)
    ctx.closePath()
    ctx.fill()
  } else if (p.shape === 'star') {
    const spikes = 4, outer = p.size, inner = p.size * 0.4
    ctx.beginPath()
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner
      const a = (Math.PI * i) / spikes - Math.PI / 2
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
  }

  ctx.restore()
}

function createParticle(w, h, variant) {
  const isLanding = variant === 'landing'
  return {
    x: randomBetween(0, w),
    y: isLanding ? h + randomBetween(10, 100) : randomBetween(0, h),
    size: randomBetween(isLanding ? 2 : 1.5, isLanding ? 5 : 4),
    vx: randomBetween(isLanding ? -0.3 : -0.15, isLanding ? 0.3 : 0.15),
    vy: randomBetween(isLanding ? -0.6 : -0.2, isLanding ? -0.2 : -0.08),
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: isLanding
      ? ['rgba(96,165,250,', 'rgba(167,139,250,', 'rgba(52,211,153,', 'rgba(251,191,36,', 'rgba(248,113,113,'][Math.floor(Math.random() * 5)]
      : ['rgba(148,163,184,', 'rgba(96,165,250,', 'rgba(167,139,250,', 'rgba(255,255,255,'][Math.floor(Math.random() * 4)],
    opacity: randomBetween(isLanding ? 0.3 : 0.15, isLanding ? 0.7 : 0.4),
    rotation: randomBetween(0, Math.PI * 2),
    rotSpeed: randomBetween(isLanding ? -0.02 : -0.01, isLanding ? 0.02 : 0.01),
    wavePhase: randomBetween(0, Math.PI * 2),
    waveAmp: isLanding ? randomBetween(15, 40) : randomBetween(5, 15),
    waveFreq: randomBetween(0.005, 0.015),
    baseX: 0,
  }
}

export default function ParticleField({ variant = 'landing' }) {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const timeRef = useRef(0)
  const dimsRef = useRef({ w: 0, h: 0 })

  const isLanding = variant === 'landing'

  const soundWaveColors = useMemo(() => {
    if (isLanding) {
      return [
        { r: 59, g: 130, b: 246, a: 0.06 },
        { r: 139, g: 92, b: 246, a: 0.05 },
        { r: 52, g: 211, b: 153, a: 0.04 },
        { r: 251, g: 191, b: 36, a: 0.04 },
        { r: 248, g: 113, b: 113, a: 0.03 },
      ]
    }
    return [
      { r: 59, g: 130, b: 246, a: 0.04 },
      { r: 139, g: 92, b: 246, a: 0.03 },
      { r: 255, g: 255, b: 255, a: 0.02 },
    ]
  }, [isLanding])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w
      canvas.height = h
      dimsRef.current = { w, h }
      const count = isLanding ? 120 : 60
      particlesRef.current = Array.from({ length: count }, () => createParticle(w, h, variant))
    }
    resize()
    window.addEventListener('resize', resize)

    const animate = (t) => {
      timeRef.current = t
      const { w, h } = dimsRef.current
      ctx.clearRect(0, 0, w, h)

      const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7)
      grad.addColorStop(0, 'rgba(9,9,13,1)')
      grad.addColorStop(1, 'rgba(9,9,13,1)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2

      soundWaveColors.forEach((c, i) => {
        const pulse = Math.sin(t * 0.0004 + i * 0.8) * 0.3 + 0.7
        const radius = w * 0.3 + Math.sin(t * 0.0003 + i * 1.2) * w * 0.1
        const grad2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.5)
        grad2.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${c.a * pulse})`)
        grad2.addColorStop(0.5, `rgba(${c.r},${c.g},${c.b},${c.a * pulse * 0.5})`)
        grad2.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`)
        ctx.fillStyle = grad2
        ctx.fillRect(0, 0, w, h)
      })

      if (isLanding) {
        for (let i = 0; i < 3; i++) {
          const offset = i * 1.8
          const waveY = h * 0.3 + Math.sin(t * 0.0005 + offset) * h * 0.05
          const grad3 = ctx.createRadialGradient(cx, waveY, 0, cx, waveY, w * 0.4)
          grad3.addColorStop(0, `rgba(59,130,246,0.03)`)
          grad3.addColorStop(1, `rgba(59,130,246,0)`)
          ctx.fillStyle = grad3
          ctx.fillRect(0, 0, w, h)
        }
      }

      const particles = particlesRef.current
      const count = particles.length

      for (let i = 0; i < count; i++) {
        const p = particles[i]

        p.x += p.vx + Math.sin(t * 0.001 * p.waveFreq + p.wavePhase) * 0.15
        p.y += p.vy
        p.rotation += p.rotSpeed

        if (isLanding) {
          const waveOffset = Math.sin(t * 0.0008 + p.wavePhase) * p.waveAmp
          p.x += waveOffset * 0.01
        }

        const waveGlow = isLanding
          ? (Math.sin(t * 0.001 + p.wavePhase) * 0.15 + 0.85)
          : 1
        const drawOpacity = p.opacity * waveGlow

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = drawOpacity
        ctx.fillStyle = p.color + drawOpacity + ')'

        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === 'triangle') {
          ctx.beginPath()
          ctx.moveTo(0, -p.size)
          ctx.lineTo(-p.size, p.size)
          ctx.lineTo(p.size, p.size)
          ctx.closePath()
          ctx.fill()
        } else if (p.shape === 'square') {
          ctx.fillRect(-p.size * 0.7, -p.size * 0.7, p.size * 1.4, p.size * 1.4)
        } else if (p.shape === 'diamond') {
          ctx.beginPath()
          ctx.moveTo(0, -p.size)
          ctx.lineTo(-p.size * 0.7, 0)
          ctx.lineTo(0, p.size)
          ctx.lineTo(p.size * 0.7, 0)
          ctx.closePath()
          ctx.fill()
        } else if (p.shape === 'star') {
          const spikes = 4, outer = p.size, inner = p.size * 0.4
          ctx.beginPath()
          for (let j = 0; j < spikes * 2; j++) {
            const r = j % 2 === 0 ? outer : inner
            const a = (Math.PI * j) / spikes - Math.PI / 2
            if (j === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
          }
          ctx.closePath()
          ctx.fill()
        }

        ctx.restore()

        if (p.y < -20 || p.x < -50 || p.x > w + 50) {
          Object.assign(p, createParticle(w, h, variant))
          p.y = isLanding ? h + randomBetween(10, 100) : h + randomBetween(10, 50)
          p.x = randomBetween(0, w)
        }
      }

      raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [variant, isLanding, soundWaveColors])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
