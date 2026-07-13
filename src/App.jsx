import { useCallback } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MicrophoneIcon } from '@heroicons/react/24/solid'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import useAppStore from './store/useAppStore'
import ThemeOverlay from './components/ThemeOverlay'
import Recorder from './components/Recorder'
import TranscriptEditor from './components/TranscriptEditor'
import ExportControls from './components/ExportControls'

function WelcomeScreen({ onStart }) {
  const { signOut } = useAuthenticator()

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-screen px-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="flex flex-col items-center gap-8 text-center"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-surface-1 border border-border flex items-center justify-center">
            <MicrophoneIcon className="w-10 h-10 text-text-primary" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full border border-accent-glow"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        </div>

        <h1 className="text-4xl font-display font-light tracking-tight text-text-primary">
          SpeechWeb
        </h1>
        <p className="text-lg text-text-secondary max-w-md leading-relaxed">
          Record your voice, get an instant transcript, and export it as a polished PDF or slide deck.
        </p>

        <button
          onClick={onStart}
          className="mt-4 flex items-center gap-3 px-8 py-4 rounded-xl bg-text-primary text-base font-medium transition-all duration-200 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-accent-glow"
        >
          <MicrophoneIcon className="w-5 h-5" />
          Start Recording
        </button>

        <button
          onClick={signOut}
          className="mt-2 text-xs text-text-secondary/50 hover:text-text-secondary/80 transition-colors"
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
  const { appState } = useAppStore()

  if (appState === 'idle') return null

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4"
    >
      <span className="text-sm font-medium text-text-secondary tracking-widest uppercase">
        SpeechWeb
      </span>
      <HeaderActions />
    </motion.header>
  )
}

function HeaderActions() {
  const { appState, recordingStatus, reset } = useAppStore()

  if (appState === 'idle') return null

  return (
    <div className="flex items-center gap-3">
      {(appState === 'editing' || appState === 'exporting') && (
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-2 focus-visible:outline-accent-glow"
        >
          <Cog6ToothIcon className="w-3.5 h-3.5" />
          New Recording
        </button>
      )}
    </div>
  )
}

export default function App() {
  const { appState } = useAppStore()

  const handleStart = useCallback(() => {
    const store = useAppStore.getState()
    store.setAppState('recording')
  }, [])

  return (
    <div className="relative min-h-screen min-h-dvh overflow-x-hidden">
      <ThemeOverlay />
      <Header />

      <AnimatePresence mode="wait">
        {appState === 'idle' ? (
          <WelcomeScreen key="welcome" onStart={handleStart} />
        ) : (
          <motion.main
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen min-h-dvh px-4 py-20"
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
