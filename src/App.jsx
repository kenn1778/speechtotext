import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import Recorder from './components/Recorder.jsx'
import TranscriptEditor from './components/TranscriptEditor.jsx'
import ExportControls from './components/ExportControls.jsx'
import SlidePreview from './components/SlidePreview.jsx'
import { uploadAudioForTranscription } from './lib/speechClient.js'

function App() {
  const [transcript, setTranscript] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [status, setStatus] = useState('ready')
  const [hidden, setHidden] = useState(false)

  const preventDefault = useCallback(e => e.preventDefault(), [])

  useEffect(() => {
    document.title = 'SpeechWeb - Record, transcribe, export'
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('copy', preventDefault)
    document.addEventListener('cut', preventDefault)
    document.addEventListener('contextmenu', preventDefault)
    const onKey = e => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('keyup', onKey)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('copy', preventDefault)
      document.removeEventListener('cut', preventDefault)
      document.removeEventListener('contextmenu', preventDefault)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('keyup', onKey)
    }
  }, [preventDefault])

  // Auto-transcribe when recording is complete and no transcript was generated
  useEffect(() => {
    if (status === 'recorded' && audioBlob && !transcript.trim()) {
      // Automatically trigger transcription after a short delay
      // to allow any speech recognition results to come in
      const timer = setTimeout(async () => {
        // Check if we still don't have a transcript after the timeout
        if (!transcript.trim()) {
          try {
            setStatus('uploading')
            setStatus('transcribing')
            const result = await uploadAudioForTranscription(audioBlob)
            if (result.status === 'COMPLETED' && result.transcript) {
              setTranscript(result.transcript)
              setStatus('transcribed')
            } else {
              setStatus('error')
            }
          } catch (error) {
            console.error('Auto-transcription failed:', error)
            setStatus('error')
          }
        }
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [status, audioBlob, transcript, setTranscript, setStatus])

  return (
    <div className="min-h-screen bg-ink text-pearl">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_32%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.05),_transparent_30%)]" />
      {hidden && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Content hidden</p>
        </div>
      )}
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 sm:px-8">
        <header className="relative z-10 mb-10 flex flex-col gap-4">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-slate-300">
            SpeechWeb • Voice to text • PDF & slides
          </span>
          <h1 className="max-w-3xl text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight text-white">
            Record speech, turn it into text, and export beautiful documents.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            A dark-themed React experience with sleek motion, soft glows, dust textures, and export-ready output. Start recording and preview your app workflow instantly.
          </p>
        </header>

        <main className="relative z-10 grid gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] items-start">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl overflow-visible"
          >
            <Recorder
              audioBlob={audioBlob}
              setAudioBlob={setAudioBlob}
              setTranscript={setTranscript}
              setStatus={setStatus}
              status={status}
            />
          </motion.section>

          <AnimatePresence mode="wait">
            <motion.section
              key={transcript}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-glow backdrop-blur-xl overflow-hidden"
            >
              <TranscriptEditor transcript={transcript} setTranscript={setTranscript} />
              <ExportControls transcript={transcript} audioBlob={audioBlob} setStatus={setStatus} setTranscript={setTranscript} />
              <div className="mt-6">
                <SlidePreview transcript={transcript} />
              </div>
            </motion.section>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default App
