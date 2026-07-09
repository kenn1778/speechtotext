import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Hub } from 'aws-amplify/utils'
import Recorder from './components/Recorder.jsx'
import TranscriptEditor from './components/TranscriptEditor.jsx'
import ExportControls from './components/ExportControls.jsx'
import SlidePreview from './components/SlidePreview.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import LoginPage from './components/LoginPage.jsx'
import LandingPage from './components/LandingPage.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ParticleField from './components/ParticleField.jsx'
import { uploadAudioForTranscription } from './lib/speechClient.js'
import { addHistoryItem } from './lib/historyStore.js'

function AppContent({ user, onSignOut }) {
  const [transcript, setTranscript] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [status, setStatus] = useState('ready')
  const [hidden, setHidden] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const savedTranscriptRef = useRef('')

  const displayUser = user?.attributes?.email
    ? user
    : user
      ? { attributes: { email: user.username, name: user.username } }
      : null

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
      addHistoryItem({
        type: status === 'exported' ? 'pdf' : 'recording',
        transcript,
      })
    }
  }, [status, transcript])

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

  return (
    <div className="min-h-screen bg-ink text-pearl">
      <ParticleField variant="app" />
      {hidden && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Content hidden</p>
        </div>
      )}
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <header className="relative z-10 mb-6 sm:mb-8 lg:mb-10 flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/10 bg-white/5 px-3 sm:px-4 py-1 text-[11px] sm:text-xs lg:text-sm text-slate-300">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="3" />
                  <rect x="8" y="11" width="8" height="10" rx="2" />
                  <path d="M5 14a7 7 0 0114 0" strokeWidth="1" />
                  <path d="M3 17a10 10 0 0118 0" strokeWidth="1" />
                </svg>
                SpeechWeb • Voice to text • PDF & slides
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setHistoryOpen(true)}
              className="p-1.5 sm:p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </motion.button>
          </div>
          <h1 className="max-w-3xl text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-white">
            Record speech, turn it into text, and export beautiful documents.
          </h1>
          <p className="max-w-2xl text-sm sm:text-base lg:text-lg leading-6 sm:leading-7 text-slate-300">
            A dark-themed React experience with sleek motion, soft glows, dust textures, and export-ready output. Start recording and preview your app workflow instantly.
          </p>
        </header>

        <main className="relative z-10 grid gap-4 sm:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] items-start">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5 lg:p-6 shadow-glow backdrop-blur-xl overflow-visible"
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
              className="rounded-2xl sm:rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-5 lg:p-6 shadow-glow backdrop-blur-xl overflow-hidden"
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

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoadTranscript={(t) => { setTranscript(t); savedTranscriptRef.current = t }}
        user={displayUser}
        onSignOut={onSignOut}
      />
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)

  const fetchUser = async () => {
    try {
      const { getCurrentUser, fetchUserAttributes } = await import('aws-amplify/auth')
      const currentUser = await getCurrentUser()
      let attributes = {}
      try { attributes = await fetchUserAttributes() } catch {}
      setUser({ ...currentUser, attributes })
      return true
    } catch {
      setUser(null)
      return false
    }
  }

  useEffect(() => {
    const isOAuthRedirect = new URLSearchParams(window.location.search).has('code')
      || window.location.hash.includes('id_token')

    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') {
        fetchUser().finally(() => setLoading(false))
      }
      if (payload.event === 'signedOut') {
        setUser(null)
        setLoading(false)
      }
    })

    ;(async () => {
      if (isOAuthRedirect) {
        await new Promise(r => setTimeout(r, 2000))
      }
      await fetchUser()
      setLoading(false)
    })()

    return () => unsubscribe()
  }, [])

  const handleAuth = (authedUser) => {
    setUser(authedUser)
  }

  const handleSignOut = async () => {
    try {
      const { signOut } = await import('aws-amplify/auth')
      await signOut()
    } finally {
      setUser(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Signing in...</p>
        </div>
      </div>
    )
  }

  if (!user && !showLogin) {
    return <LandingPage onSignIn={() => setShowLogin(true)} />
  }

  if (!user && showLogin) {
    return <LoginPage onAuth={handleAuth} />
  }

  return (
    <ErrorBoundary>
      <AppContent user={user} onSignOut={handleSignOut} />
    </ErrorBoundary>
  )
}

export default App
