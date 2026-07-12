import { motion } from 'framer-motion'
import { useMemo } from 'react'
import Reanimate from '../lib/reanimateWrapper.jsx'

const stripHtml = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

const URL_REGEX = /https?:\/\/[^\s]+/g

function isSafeUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function renderTextWithLinks(text) {
  const parts = []
  let lastIndex = 0
  let match
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), link: false })
    }
    parts.push({ text: match[0], link: isSafeUrl(match[0]) })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), link: false })
  }
  return parts
}

function SlidePreview({ transcript }) {
  const plainText = transcript ? stripHtml(transcript) : ''

  const slides = useMemo(() => {
    if (!plainText) return []
    const raw = plainText
    const separator = raw.includes('\n## ') ? '\n## ' : '\n\n'
    const parts = raw.split(separator).filter(Boolean)
    if (parts.length <= 1) {
      const sentences = raw.match(/[^.!?\n]+[.!?]*/g) || [raw]
      const groups = []
      for (let i = 0; i < sentences.length; i += 3) {
        groups.push(sentences.slice(i, i + 3).join(' ').trim())
      }
      return groups.filter(Boolean).slice(0, 12).map((text, i) => ({
        title: i === 0 ? 'Summary' : `Key Point ${i}`,
        content: text
      }))
    }
    return parts.slice(0, 12).map((part, i) => {
      const lines = part.trim().split('\n')
      const title = lines[0].replace(/^#+\s*/, '').trim()
      const content = lines.slice(1).join(' ').trim() || title
      return { title, content }
    })
  }, [plainText])

  if (!slides.length) return (
    <div className="rounded-2xl border border-white/6 bg-black/20 p-6 text-slate-400">No slides to preview.</div>
  )

  const totalSlides = slides.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-white">Slide Preview</h4>
        <span className="text-xs text-slate-500">{totalSlides} slide{totalSlides > 1 ? 's' : ''}</span>
      </div>
      <div className="max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-1 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
        {slides.map((slide, i) => (
          <Reanimate key={i} delay={i * 0.05} className="relative">
            <motion.div
              whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
              className="bg-white rounded-lg overflow-hidden shadow-lg shadow-black/30"
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-3 sm:px-4 py-2 sm:py-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex gap-1 sm:gap-1.5">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-400" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-400" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-white/60 ml-1 sm:ml-2 font-mono">Slide {i + 1} / {totalSlides}</span>
                </div>
              </div>
              <div className="px-3 sm:px-5 py-3 sm:py-4" style={{ minHeight: 80 }}>
                <h5 className="text-sm font-bold text-gray-800 mb-2 leading-tight">{slide.title}</h5>
                <p className="text-xs leading-relaxed text-gray-600">
                  {renderTextWithLinks(slide.content).map((part, j) =>
                    part.link ? (
                      <a key={j} href={part.text} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800 break-all"
                        onClick={e => { if (e.button === 0) { e.stopPropagation() } }}>
                        {part.text}
                      </a>
                    ) : (
                      <span key={j}>{part.text}</span>
                    )
                  )}
                </p>
              </div>
              <div className="border-t border-gray-100 px-5 py-2 flex justify-between items-center">
                <span className="text-[10px] text-gray-400">Johnkennedy-V1-Flash-A30b-free</span>
                <span className="text-[10px] text-gray-400">{i + 1}</span>
              </div>
            </motion.div>
          </Reanimate>
        ))}
      </div>
    </div>
    </div>
  )
}

export default SlidePreview
