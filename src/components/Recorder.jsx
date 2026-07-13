import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MicrophoneIcon, PauseIcon, StopIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import useAppStore from '../store/useAppStore'
import { requestMicPermission, startRecording, pauseRecording, resumeRecording, stopRecording, releaseMicrophone } from '../lib/audioService'
import { startStreamingTranscription, stopStreaming, transcribeBlob } from '../lib/transcriptionClient'
import WaveformVisualizer from './WaveformVisualizer'

export default function Recorder() {
  const {
    appState, recordingStatus, partialTranscript, transcriptionError,
    setRecordingStatus, setAppState, setPermissionState,
    setAudioLevel, setPartialTranscript, setTranscript, setTranscriptionError,
    canRecord, canReset, reset,
  } = useAppStore()

  const [error, setError] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [fallbackMode, setFallbackMode] = useState(false)
  const [transcribingStatus, setTranscribingStatus] = useState('idle')
  const timerRef = useRef(null)
  const stopStreamingRef = useRef(null)
  const recordingBlobRef = useRef(null)
  const hasFinalRef = useRef(false)
  const fallbackTimeoutRef = useRef(null)

  const autoStartedRef = useRef(false)

  useEffect(() => {
    if (appState === 'recording' && recordingStatus === 'inactive' && !autoStartedRef.current) {
      autoStartedRef.current = true
      handleStart()
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current)
    }
  }, [appState])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current)
    }
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleStart = useCallback(async () => {
    setError(null)
    setFallbackMode(false)
    setTranscribingStatus('idle')
    hasFinalRef.current = false
    recordingBlobRef.current = null

    try {
      const stream = await requestMicPermission()
      setPermissionState('granted')
      setAppState('recording')
      setRecordingStatus('recording')

      startRecording({
        onLevel: (level) => useAppStore.getState().setAudioLevel(level),
        onStop: (blob) => {
          recordingBlobRef.current = blob
          useAppStore.getState().setAudioBlob(blob)
          clearTimer()
          setRecordingStatus('inactive')

          if (!hasFinalRef.current) {
            fallbackTimeoutRef.current = setTimeout(() => {
              if (!hasFinalRef.current && recordingBlobRef.current) {
                runBatchFallback(recordingBlobRef.current)
              }
            }, 3000)
          }
        },
      })

      const stop = startStreamingTranscription({
        stream,
        onPartial: (text) => {
          useAppStore.getState().setPartialTranscript(text)
        },
        onFinal: (text) => {
          hasFinalRef.current = true
          if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current)
            fallbackTimeoutRef.current = null
          }
          setTranscript(text)
          setTranscribingStatus('completed')
          stopStreamingRef.current = null
        },
        onError: (err) => {
          setTranscriptionError(err.message)
          setTranscribingStatus('error')
        },
        onEnd: () => {
          stopStreamingRef.current = null
        },
      })

      stopStreamingRef.current = stop

      clearTimer()
      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 200)
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setPermissionState('denied')
        setError('Microphone access denied. Please allow microphone access in your browser settings.')
      } else {
        setError(err.message || 'Failed to start recording')
      }
    }
  }, [clearTimer, setAppState, setRecordingStatus, setPermissionState, setAudioLevel, setTranscript, setPartialTranscript, setTranscriptionError])

  const runBatchFallback = useCallback(async (blob) => {
    setFallbackMode(true)
    setTranscribingStatus('transcribing')

    try {
      setAppState('transcribing')
      const text = await transcribeBlob(blob)
      setTranscript(text)
      setTranscribingStatus('completed')
    } catch (err) {
      setError(err.message || 'Transcription failed. Please try again.')
      setTranscribingStatus('error')
      setAppState('editing')
    } finally {
      setFallbackMode(false)
    }
  }, [setAppState, setTranscript])

  const handlePause = useCallback(() => {
    pauseRecording()
    setRecordingStatus('paused')
  }, [])

  const handleResume = useCallback(() => {
    resumeRecording()
    setRecordingStatus('recording')
  }, [])

  const handleStop = useCallback(() => {
    if (stopStreamingRef.current) {
      stopStreamingRef.current()
      stopStreamingRef.current = null
    }
    stopStreaming()
    stopRecording()
  }, [])

  const handleReset = useCallback(() => {
    clearTimer()
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current)
      fallbackTimeoutRef.current = null
    }
    if (stopStreamingRef.current) {
      stopStreamingRef.current()
      stopStreamingRef.current = null
    }
    stopStreaming()
    releaseMicrophone()
    setElapsed(0)
    setPartialTranscript('')
    setError(null)
    setTranscribingStatus('idle')
    setFallbackMode(false)
    setTranscriptionError(null)
    autoStartedRef.current = false
    hasFinalRef.current = false
    recordingBlobRef.current = null
    reset()
  }, [clearTimer, reset, setPartialTranscript, setTranscriptionError])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (!canRecord() && appState !== 'recording' && appState !== 'transcribing') {
    return null
  }

  const isRecording = recordingStatus === 'recording'
  const isPaused = recordingStatus === 'paused'
  const showControls = isRecording || isPaused

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-6 p-8"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-md text-center"
          role="alert"
        >
          {error}
        </motion.div>
      )}

      {transcriptionError && transcribingStatus === 'error' && !fallbackMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm max-w-md text-center flex items-center gap-2 justify-center"
          role="alert"
        >
          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
          <span>Streaming failed. Falling back to batch transcription if recorded.</span>
        </motion.div>
      )}

      <WaveformVisualizer isActive={isRecording} />

      <div className="flex items-center gap-3">
        {showControls && (
          <>
            <span className="text-2xl font-mono tabular-nums text-text-secondary min-w-[4ch]">
              {formatTime(elapsed)}
            </span>

            {isRecording ? (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-1 text-text-secondary border border-border hover:bg-surface-2 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent-glow"
                aria-label="Pause recording"
              >
                <PauseIcon className="w-5 h-5" />
              </button>
            ) : isPaused ? (
              <button
                onClick={handleResume}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-1 text-text-secondary border border-border hover:bg-surface-2 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent-glow"
                aria-label="Resume recording"
              >
                <MicrophoneIcon className="w-5 h-5" />
              </button>
            ) : null}

            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-red-500"
              aria-label="Stop and transcribe"
            >
              <StopIcon className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      <div className="flex gap-3">
        {canReset() && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-2 focus-visible:outline-accent-glow"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>

      {isRecording && partialTranscript && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-md text-center"
        >
          <p className="text-sm text-text-secondary/70 italic leading-relaxed">
            {partialTranscript}
          </p>
        </motion.div>
      )}

      {transcribingStatus === 'transcribing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-accent-glow"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <p className="text-sm text-text-secondary">
            {fallbackMode ? 'Transcribing via batch service…' : 'Transcribing via streaming…'}
          </p>
          {partialTranscript && (
            <p className="text-sm text-text-secondary/70 max-w-md text-center italic">
              {partialTranscript}
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}