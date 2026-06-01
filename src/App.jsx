import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Recorder from './components/Recorder.jsx'
import TranscriptEditor from './components/TranscriptEditor.jsx'
import ExportControls from './components/ExportControls.jsx'
import SlidePreview from './components/SlidePreview.jsx'

function App() {
  const [transcript, setTranscript] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [status, setStatus] = useState('ready')

  useEffect(() => {
    document.title = 'SpeechWeb - Record, transcribe, export'
  }, [])

  return (
    <div className="min-h-screen bg-ink text-pearl">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_32%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.05),_transparent_30%)]" />
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
