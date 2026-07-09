import { useState, useCallback, useEffect, useRef } from 'react'

function TextToSpeech({ text }) {
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const utteranceRef = useRef(null)
  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent || ''
  }

  useEffect(() => {
    const load = () => {
      const v = speechSynthesis.getVoices()
      if (v.length) {
        setVoices(v)
        if (!selectedVoice) {
          const en = v.find(vc => vc.lang.startsWith('en'))
          setSelectedVoice(en || v[0])
        }
      }
    }
    load()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [selectedVoice])

  const cancel = useCallback(() => {
    speechSynthesis.cancel()
    setSpeaking(false)
    setPaused(false)
  }, [])

  const speak = useCallback(() => {
    cancel()
    const plain = stripHtml(text)
    if (!plain.trim()) return
    const utterance = new SpeechSynthesisUtterance(plain)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => { setSpeaking(false); setPaused(false) }
    utterance.onerror = () => { setSpeaking(false); setPaused(false) }
    utterance.onpause = () => setPaused(true)
    utterance.onresume = () => setPaused(false)
    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
  }, [text, selectedVoice, cancel])

  const togglePause = useCallback(() => {
    if (paused) {
      speechSynthesis.resume()
    } else {
      speechSynthesis.pause()
    }
  }, [paused])

  if (!stripHtml(text).trim()) return null

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <span className="text-xs font-medium text-slate-300">Text to Speech</span>
        </div>
        {voices.length > 1 && (
          <select
            value={selectedVoice?.name || ''}
            onChange={e => {
              const v = voices.find(vc => vc.name === e.target.value)
              if (v) { setSelectedVoice(v); if (speaking) { cancel(); setTimeout(() => speak(), 100) } }
            }}
            className="text-xs bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-slate-300 outline-none max-w-[140px] sm:max-w-[200px] truncate"
          >
            {voices.filter(v => v.lang.startsWith('en')).map(v => (
              <option key={v.name} value={v.name}>{v.name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3">
        {!speaking ? (
          <button
            onClick={speak}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs transition"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Play
          </button>
        ) : (
          <>
            <button
              onClick={togglePause}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-xs transition"
            >
              {paused ? (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              )}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={cancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-xs transition"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default TextToSpeech
