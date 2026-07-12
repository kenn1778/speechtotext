import { useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'

function sanitize(html) {
  return DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'target'],
    ALLOW_DATA_ATTR: false,
  })
}

function TranscriptEditor({ transcript, setTranscript }) {
  const divRef = useRef(null)

  useEffect(() => {
    if (divRef.current) {
      const clean = sanitize(transcript)
      if (divRef.current.innerHTML !== clean) {
        const sel = window.getSelection()
        const active = sel?.focusNode && divRef.current.contains(sel.focusNode)
        if (!active) {
          divRef.current.innerHTML = clean
        }
      }
    }
  }, [transcript])

  const handleInput = () => {
    if (divRef.current) {
      const html = divRef.current.innerHTML
      const clean = sanitize(html === '<br>' ? '' : html)
      if (clean !== html) {
        divRef.current.innerHTML = clean
      }
      setTranscript(clean)
    }
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text/plain')
    if (text) {
      e.preventDefault()
      document.execCommand('insertText', false, sanitize(text))
      return
    }

    const files = e.clipboardData.files
    const hasImage = files.length > 0 && [...files].some(f => f.type.startsWith('image/'))
    if (!hasImage) return

    e.preventDefault()
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const img = `<img src="${ev.target.result}" alt="pasted image" style="max-width:100%;border-radius:8px;margin:8px 0;display:block" />`
          document.execCommand('insertHTML', false, sanitize(img))
        }
        reader.readAsDataURL(file)
      }
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold text-white">Transcript</h3>
        <p className="mt-2 text-sm text-slate-400">
          Review and edit your converted speech before creating a final PDF or slide deck.
        </p>
      </div>

      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        className="min-h-[120px] sm:min-h-[160px] md:min-h-[220px] max-h-[400px] w-full rounded-3xl border border-white/10 bg-black/40 px-5 py-5 text-sm text-slate-100 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10 overflow-y-auto whitespace-pre-wrap"
      />
    </div>
  )
}

export default TranscriptEditor
