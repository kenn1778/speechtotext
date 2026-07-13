import { useCallback, useEffect, useRef } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MicrophoneIcon, Bars3Icon } from '@heroicons/react/24/solid'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import useAppStore from './store/useAppStore'
import ThemeOverlay from './components/ThemeOverlay'
import Recorder from './components/Recorder'
import TranscriptEditor from './components/TranscriptEditor'
import ExportControls from './components/ExportControls'
import Sidebar from './components/Sidebar'
import ConfirmDialog from './components/ConfirmDialog'
import UserProfilePanel from './components/UserProfilePanel'
import HistoryPanel from './components/HistoryPanel'
import { fetchProfile, addHistoryItem } from './lib/apiClient'

function WelcomeScreen({ onStart }) {
  const { user, signOut } = useAuthenticator()
  const { userProfile, setConfirmDialog, setActivePanel } = useAppStore()

  const displayName = userProfile?.name || user?.attributes?.name || ''

  const handleSignOut = () => {
    setConfirmDialog({
      message: 'Are you sure you want to sign out?',
      confirmLabel: 'Sign Out',
      onConfirm: () => signOut(),
    })
  }

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="flex flex-col items-center gap-6 sm:gap-8 text-center"
      >
        <div className="relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface-1 border border-border flex items-center justify-center">
            <MicrophoneIcon className="w-8 h-8 sm:w-10 sm:h-10 text-text-primary" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full border border-accent-glow"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        </div>

        <h1 className="text-3xl sm:text-4xl font-display font-light tracking-tight text-text-primary">
          SpeechWeb
        </h1>
        <p className="text-base sm:text-lg text-text-secondary max-w-md leading-relaxed px-2 sm:px-0">
          Record your voice, get an instant transcript, and export it as a polished PDF or slide deck.
        </p>

        {displayName && (
          <p className="text-sm text-text-secondary/70 -mt-2">
            Welcome, {displayName}
          </p>
        )}

        <button
          onClick={onStart}
          className="mt-4 flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-text-primary text-sm sm:text-base font-medium transition-all duration-200 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-accent-glow"
        >
          <MicrophoneIcon className="w-5 h-5" />
          Start Recording
        </button>

        <button
          onClick={() => setActivePanel('profile')}
          className="mt-2 py-1.5 px-3 text-xs text-text-secondary/50 hover:text-text-secondary/80 transition-colors rounded-lg focus-visible:outline-2 focus-visible:outline-accent-glow"
        >
          {userProfile?.name ? 'Edit Profile' : 'Set up your profile'}
        </button>

        <button
          onClick={handleSignOut}
          className="mt-2 py-1.5 px-3 text-xs text-text-secondary/50 hover:text-text-secondary/80 transition-colors rounded-lg focus-visible:outline-2 focus-visible:outline-accent-glow"
        >
          Sign out
        </button>

        <p className="text-xs text-text-secondary/50 mt-4">
          Microphone access is required and only activated when you click the button above.
        </p>
      </motion.div>
    </motion.div>
  )
}

function Header() {
  const { appState, toggleSidebar, userProfile } = useAppStore()
  const { user } = useAuthenticator()

  if (appState === 'idle') return null

  const displayName = userProfile?.name || user?.attributes?.name || ''

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-1 transition-colors focus-visible:outline-2 focus-visible:outline-accent-glow"
          aria-label="Open menu"
        >
          <Bars3Icon className="w-5 h-5" />
        </button>
        <span className="text-xs sm:text-sm font-medium text-text-secondary tracking-widest uppercase">
          SpeechWeb
        </span>
        {displayName && (
          <span className="text-xs sm:text-sm text-text-secondary/50 truncate max-w-[120px] sm:max-w-[200px] hidden sm:inline">
            &middot; {displayName}
          </span>
        )}
      </div>
      <HeaderActions />
    </motion.header>
  )
}

function HeaderActions() {
  const { appState, recordingStatus, reset, setConfirmDialog } = useAppStore()

  if (appState === 'idle') return null

  const handleNewRecording = () => {
    if (appState === 'recording' || appState === 'transcribing') {
      setConfirmDialog({
        message: 'Are you sure you want to abandon the current recording?',
        confirmLabel: 'Abandon',
        onConfirm: () => reset(),
      })
    } else {
      reset()
    }
  }

  return (
    <div className="flex items-center gap-3">
      {(appState === 'editing' || appState === 'exporting') && (
        <button
          onClick={handleNewRecording}
          className="flex items-center gap-1 px-2 sm:px-0 text-[10px] sm:text-xs text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-2 focus-visible:outline-accent-glow"
        >
          <Cog6ToothIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          <span className="hidden sm:inline">New Recording</span>
          <span className="sm:hidden">New</span>
        </button>
      )}
    </div>
  )
}

export default function App() {
  const { appState, activePanel, setActivePanel, setUserProfile, editedTranscript, setHistoryItems, historyItems } = useAppStore()
  const { user } = useAuthenticator()
  const prevAppStateRef = useRef(appState)

  const userId = user?.userId || user?.username

  useEffect(() => {
    if (userId) {
      fetchProfile(userId)
        .then((data) => {
          if (data.exists) setUserProfile(data)
        })
        .catch(() => {})
    }
  }, [userId, setUserProfile])

  useEffect(() => {
    if (prevAppStateRef.current !== 'editing' && appState === 'editing') {
      const text = useAppStore.getState().editedTranscript
      if (userId && text.trim()) {
        addHistoryItem(userId, { type: 'recording', transcript: text, preview: text.slice(0, 100) })
          .then((entry) => {
            if (entry) setHistoryItems([entry, ...useAppStore.getState().historyItems])
          })
          .catch(() => {})
      }
    }
    prevAppStateRef.current = appState
  }, [appState, userId, setHistoryItems])

  useEffect(() => {
    const handler = (e) => {
      if (appState !== 'idle') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    if (appState !== 'idle') {
      window.addEventListener('beforeunload', handler)
    }
    return () => window.removeEventListener('beforeunload', handler)
  }, [appState])

  const handleStart = useCallback(() => {
    const store = useAppStore.getState()
    store.setAppState('recording')
  }, [])

  return (
    <div className="relative min-h-screen min-h-dvh overflow-x-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <ThemeOverlay />
      <Header />

      <Sidebar />
      <ConfirmDialog />

      <AnimatePresence>
        {activePanel === 'profile' && (
          <UserProfilePanel key="profile-panel" onClose={() => setActivePanel(null)} />
        )}
        {activePanel === 'history' && (
          <HistoryPanel key="history-panel" onClose={() => setActivePanel(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {appState === 'idle' ? (
          <WelcomeScreen key="welcome" onStart={handleStart} />
        ) : (
          <motion.main
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen min-h-dvh px-4 py-10 sm:py-20"
          >
            <div className="w-full max-w-2xl flex flex-col items-center gap-8">
              <Recorder />
              <TranscriptEditor />
              <ExportControls />
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  )
}
