import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowPathIcon, DocumentTextIcon, MicrophoneIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import useAppStore from '../store/useAppStore'

export default function TranscriptEditor() {
  const {
    appState, editedTranscript, rawTranscript, partialTranscript,
    recordingStatus, updateTranscript, resetTranscript,
  } = useAppStore()

  const textareaRef = useRef(null)

  useEffect(() => {
    if (appState === 'editing' && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [appState])

  const showPartial = appState === 'recording' && partialTranscript && recordingStatus === 'recording'
  const showEditor = appState === 'editing' || appState === 'exporting'

  if (!showPartial && !showEditor) return null

  const wordCount = editedTranscript.trim()
    ? editedTranscript.trim().split(/\s+/).length
    : 0

  const hasChanges = editedTranscript !== rawTranscript

  if (showPartial) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-2xl mx-auto flex flex-col gap-4"
      >
        <div className="flex items-center gap-2 text-text-secondary">
          <MicrophoneIcon className="w-4 h-4 text-accent-glow animate-pulse" />
          <span className="text-sm">Live transcription</span>
        </div>

        <div className={clsx(
          'w-full min-h-[80px] sm:min-h-[120px] p-3 sm:p-4 rounded-xl',
          'bg-surface-1/50 border border-border/50',
          'text-text-secondary text-sm sm:text-base leading-relaxed italic'
        )}>
          {partialTranscript || (
            <span className="text-text-secondary/40 text-sm">Speak now — transcript will appear here in real time…</span>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto flex flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 text-text-secondary">
          <DocumentTextIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          <span className="text-xs sm:text-sm">{wordCount} words</span>
        </div>

        {hasChanges && (
          <button
            onClick={resetTranscript}
            className="flex items-center gap-1 text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-2 focus-visible:outline-accent-glow"
          >
            <ArrowPathIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            Reset original
          </button>
        )}
      </div>

      <textarea
        ref={textareaRef}
        value={editedTranscript}
        onChange={(e) => updateTranscript(e.target.value)}
        className={clsx(
          'w-full min-h-[150px] sm:min-h-[200px] max-h-[50vh] sm:max-h-[60vh] p-3 sm:p-4 rounded-xl resize-y',
          'bg-surface-1 border border-border',
          'text-text-primary text-sm sm:text-base leading-relaxed',
          'placeholder:text-text-secondary/50',
          'focus:outline-none focus:border-accent-glow focus:shadow-glow-sm',
          'transition-all duration-200'
        )}
        placeholder="Your transcript will appear here…"
        aria-label="Edit transcript"
        spellCheck
      />

      <p className="text-[10px] sm:text-xs text-text-secondary/60 text-center sm:text-left">
        Edit the transcript freely. Your changes won't affect the original recording.
      </p>
    </motion.div>
  )
}
