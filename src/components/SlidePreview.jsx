import { motion } from 'framer-motion'
import Reanimate from '../lib/reanimateWrapper.jsx'

const stripHtml = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

function SlidePreview({ transcript }) {
  const plainText = transcript ? stripHtml(transcript) : ''
  if (!plainText) return (
    <div className="rounded-2xl border border-white/6 bg-black/20 p-6 text-slate-400">No slides to preview.</div>
  )

  const chunks = plainText.split(/\n\n|\.\s+/).filter(Boolean).slice(0, 12)

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-white">Slide Preview</h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {chunks.map((c, i) => (
          <Reanimate key={i} delay={i * 0.04} className="rounded-xl border border-white/6 bg-white/3 p-4 text-sm text-slate-100 break-words">
            <h5 className="mb-2 text-sm font-semibold">Slide {i + 1}</h5>
            <p className="text-sm leading-relaxed text-slate-200">{c}</p>
          </Reanimate>
        ))}
      </div>
    </div>
  )
}

export default SlidePreview
