import { useEffect, useRef } from 'react'

function TranscriptEditor({ transcript, setTranscript }) {
  const divRef = useRef(null)

  useEffect(() => {
    if (divRef.current && divRef.current.innerHTML !== transcript) {
      const sel = window.getSelection()
      const active = sel?.focusNode && divRef.current.contains(sel.focusNode)
      if (!active) {
        divRef.current.innerHTML = transcript || ''
      }
    }
  }, [transcript])

  const handleInput = () => {
    if (divRef.current) {
      const html = divRef.current.innerHTML
      setTranscript(html === '<br>' ? '' : html)
    }
  }

  const handlePaste = (e) => {
    const files = e.clipboardData.files
    const hasImage = files.length > 0 && [...files].some(f => f.type.startsWith('image/'))
    if (!hasImage) return

    e.preventDefault()
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const img = `<img src="${ev.target.result}" style="max-width:100%;border-radius:8px;margin:8px 0;display:block" />`
          document.execCommand('insertHTML', false, img)
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
        className="min-h-[120px] sm:min-h-[160px] md:min-h-[220px] w-full rounded-3xl border border-white/10 bg-black/40 px-5 py-5 text-sm text-slate-100 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10 overflow-auto whitespace-pre-wrap"
      />
    </div>
  )
}

export default TranscriptEditor
