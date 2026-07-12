import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import Recorder from './Recorder.jsx'
import TranscriptEditor from './TranscriptEditor.jsx'
import ExportControls from './ExportControls.jsx'
import SlidePreview from './SlidePreview.jsx'
import HistoryPanel from './HistoryPanel.jsx'
import TextToSpeech from './TextToSpeech.jsx'
import ParticleField from './ParticleField.jsx'
import ThemeOverlay from './ThemeOverlay.jsx'
import { uploadAudioForTranscription } from '../lib/speechClient.js'
import { addHistoryItem as addHistoryLocal, getHistory as getHistoryLocal } from '../lib/historyStore.js'
import { addHistoryItem as addHistoryRemote, getHistory as getHistoryRemote, clearHistory as clearHistoryRemote } from '../lib/apiClient.js'

const STEPS = [
  { id: 'record', label: 'Record', icon: 'mic' },
  { id: 'transcribe', label: 'Transcribe', icon: 'ai' },
  { id: 'export', label: 'Export', icon: 'file' },
]

function StepIndicator({ currentStep }) {
  return (
    <nav aria-label="Workflow progress" className="flex items-center gap-2 sm:gap-3">
      {STEPS.map((step, i) => {
        const isActive = step.id === currentStep
        const isDone = (i < STEPS.findIndex(s => s.id === currentStep))
        return (
          <div key={step.id} className="flex items-center gap-2 sm:gap-3">
            <div className={`flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-500 ${
              isActive
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-glow'
                : isDone
                  ? 'bg-white/8 text-slate-400 border border-white/6'
                  : 'bg-white/3 text-slate-600 border border-white/4'
            }`}>
              <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                isActive ? 'bg-blue-400 animate-pulse' : isDone ? 'bg-green-400' : 'bg-slate-600'
              }`} />
              {step.label}
            </div>
            {i < STEPS.length - 1 && (
              <svg viewBox="0 0 16 16" className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isDone ? 'text-slate-500' : 'text-slate-700'}`} fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="6,4 10,8 6,12" />
              </svg>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function UserGreeting({ user, onHistoryOpen, onSignOut, onGoToAccount }) {
  const displayName = user?.attributes?.name || user?.attributes?.email || 'User'
  const email = user?.attributes?.email || ''
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-between gap-3 sm:gap-4"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm sm:text-base font-semibold shadow-lg shadow-blue-500/20 flex-shrink-0">
          {initial}
        </div>
        <div>
          <p className="text-sm sm:text-base font-medium text-white leading-tight">
            Welcome back, <span className="text-blue-300">{displayName}</span>
          </p>
          {email && <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{email}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onGoToAccount}
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition text-xs sm:text-sm"
          aria-label="My Account"
        >
          My Account
        </button>
        <button
          onClick={onHistoryOpen}
          className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
          aria-label="Open history"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        </button>
        <button
          onClick={onSignOut}
          className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"
          aria-label="Sign out"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

function UserDashboard({ user, onSignOut, onGoToAccount }) {
  const [transcript, setTranscript] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [status, setStatus] = useState('ready')
  const [hidden, setHidden] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState([])
  const savedTranscriptRef = useRef('')

  const userId = user?.userId || user?.username || 'anon'

  const displayUser = user?.attributes?.email
    ? user
    : user
      ? { attributes: { email: user.username, name: user.username } }
      : null

  useEffect(() => {
    loadHistory()
  }, [userId])

  async function loadHistory() {
    try {
      const items = await getHistoryRemote(userId)
      if (items && items.length > 0) {
        setHistoryItems(items)
        return
      }
    } catch {}
    const local = getHistoryLocal(userId)
    if (local.length > 0) setHistoryItems(local)
  }

  async function saveHistoryItem(type, transcriptText) {
    const item = { type, transcript: transcriptText, preview: transcriptText.slice(0, 100) }
    try {
      await addHistoryRemote(userId, item)
    } catch {
      addHistoryLocal(userId, item)
    }
    loadHistory()
  }

  async function handleClearHistory() {
    try {
      await clearHistoryRemote(userId)
    } catch {}
    setHistoryItems([])
  }

  useEffect(() => {
    document.title = 'SpeechWeb - Record, transcribe, export'
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    const onKey = e => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('keyup', onKey)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('keyup', onKey)
    }
  }, [])

  useEffect(() => {
    if ((status === 'transcribed' || status === 'exported') && transcript.trim() && transcript !== savedTranscriptRef.current) {
      savedTranscriptRef.current = transcript
      saveHistoryItem(status === 'exported' ? 'pdf' : 'recording', transcript)
    }
  }, [status, transcript, userId])

  useEffect(() => {
    if (status === 'recorded' && audioBlob && !transcript.trim()) {
      const timer = setTimeout(async () => {
        if (!transcript.trim()) {
          try {
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

  const currentStep = status === 'recording' || status === 'processing' || status === 'uploading'
    ? 'record'
    : status === 'transcribing' || status === 'transcribed'
      ? 'transcribe'
      : transcript.trim()
        ? 'export'
        : 'record'

  return (
    <div className="min-h-screen bg-ink text-pearl relative overflow-hidden">
      <ParticleField variant="app" />
      <ThemeOverlay />
      {hidden && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Content hidden</p>
        </div>
      )}
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <header className="relative z-10 mb-5 sm:mb-7 lg:mb-8">
          <UserGreeting user={user} onHistoryOpen={() => setHistoryOpen(true)} onSignOut={onSignOut} onGoToAccount={onGoToAccount} />
        </header>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative z-10 mb-6 sm:mb-8 lg:mb-10"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <StepIndicator currentStep={currentStep} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="rounded-full border border-white/8 bg-white/4 px-3 sm:px-4 py-1 sm:py-1.5"
            >
              <span className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  status === 'recording' ? 'bg-red-400 animate-pulse' :
                  status === 'transcribing' ? 'bg-amber-400 animate-pulse' :
                  status === 'transcribed' || status === 'exported' ? 'bg-green-400' :
                  'bg-slate-600'
                }`} />
                {status === 'ready' ? 'Ready' :
                 status === 'recording' ? 'Recording' :
                 status === 'processing' ? 'Processing' :
                 status === 'uploading' ? 'Uploading' :
                 status === 'transcribing' ? 'Transcribing' :
                 status === 'transcribed' ? 'Transcribed' :
                 status === 'exported' ? 'Exported' :
                 status === 'error' ? 'Error' :
                 status === 'denied' ? 'Mic Denied' : 'Idle'}
              </span>
            </motion.div>
          </div>
        </motion.div>

        <main className="relative z-10 grid gap-5 sm:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] items-start">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5 lg:p-6 shadow-glow backdrop-blur-xl overflow-visible"
          >
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a4 4 0 014 4v3a4 4 0 01-8 0V6a4 4 0 014-4z" />
                <path d="M18 11v2a6 6 0 01-12 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="9" y1="22" x2="15" y2="22" />
              </svg>
              <h2 className="text-sm sm:text-base font-semibold text-white">Record Session</h2>
            </div>
            <Recorder
              audioBlob={audioBlob}
              setAudioBlob={setAudioBlob}
              setTranscript={setTranscript}
              setStatus={setStatus}
              status={status}
            />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl sm:rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-5 lg:p-6 shadow-glow backdrop-blur-xl overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              <h2 className="text-sm sm:text-base font-semibold text-white">Transcription & Export</h2>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={transcript}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TranscriptEditor transcript={transcript} setTranscript={setTranscript} />
                <TextToSpeech text={transcript} />
                <ExportControls transcript={transcript} audioBlob={audioBlob} setStatus={setStatus} setTranscript={setTranscript} />
                <div className="mt-6">
                  <SlidePreview transcript={transcript} />
                </div>
              </motion.div>
            </AnimatePresence>
            {!transcript && !audioBlob && (
              <p className="text-xs sm:text-sm text-slate-500 text-center py-8 sm:py-12">
                Record audio above to see your transcript and export options here.
              </p>
            )}
          </motion.section>
        </main>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="relative z-10 mt-8 sm:mt-10 lg:mt-12 border-t border-white/5 py-4 sm:py-5 text-center"
        >
          <p className="text-[10px] sm:text-xs text-slate-600">
            SpeechWeb by Johnkennedy I. Alozie &mdash; Voice to text &bull; PDF &amp; slides
          </p>
        </motion.footer>
      </div>

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoadTranscript={(t) => { setTranscript(t); savedTranscriptRef.current = t }}
        userId={userId}
        user={displayUser}
        onSignOut={onSignOut}
        historyItems={historyItems}
        onClearHistory={handleClearHistory}
      />
    </div>
  )
}

export default UserDashboard
