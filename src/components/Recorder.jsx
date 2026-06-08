import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { uploadAudioForTranscription } from '../lib/speechClient.js'
import RecordingVisualizer from './RecordingVisualizer.jsx'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function Recorder({ audioBlob, setAudioBlob, setTranscript, setStatus, status }) {
  const [transcribing, setTranscribing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [allowed, setAllowed] = useState(false)
  const [showStoppedToast, setShowStoppedToast] = useState(false)
  const recognitionRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const recordingRef = useRef(false)
  const interimRef = useRef('')
  const toastTimerRef = useRef(null)

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('unsupported')
    }
  }, [setStatus])

  useEffect(() => {
    if (status === 'processing' || status === 'uploading' || status === 'transcribing') {
      setShowStoppedToast(true)
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => {
        if (status === 'transcribed' || status === 'recorded' || status === 'error') {
          setShowStoppedToast(false)
        }
      }, 3000)
    }
    if (status === 'transcribed' || status === 'recorded') {
      toastTimerRef.current = setTimeout(() => setShowStoppedToast(false), 2000)
    }
    return () => clearTimeout(toastTimerRef.current)
  }, [status])

  const requestMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setAllowed(true)
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current = [...chunksRef.current, event.data]
        }
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        chunksRef.current = []
        setStatus('recorded')
      }
      setMediaRecorder(recorder)
      setStatus('ready')
      return recorder
    } catch (error) {
      setStatus('denied')
    }
  }

  const startRecording = async () => {
    const recorder = mediaRecorder || await requestMicrophone()
    if (!recorder) return
    chunksRef.current = []
    setShowStoppedToast(false)
    recorder.start()
    recordingRef.current = true
    setStatus('recording')
    startInlineRecognition()
  }

  const stopRecording = () => {
    recordingRef.current = false
    mediaRecorder?.stop()
    stopInlineRecognition()
    setStatus('processing')
  }

  const startInlineRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setStatus('no-speech-api')
      return
    }
    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      const appendText = (fn) => {
        setTranscript(prev => {
          const plain = prev.replace(/<[^>]*>/g, '')
          return plain + fn()
        })
      }
      recognition.onresult = (event) => {
        let final = ''
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]
          if (res.isFinal) final += res[0].transcript + ' '
          else interim += res[0].transcript
        }
        interimRef.current = interim
        if (final) {
          appendText(() => final)
        }
      }
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        if (recordingRef.current) {
          try { recognition.start() } catch (e) {}
        }
      }
      recognition.onend = () => {
        if (interimRef.current) {
          appendText(() => interimRef.current + ' ')
          interimRef.current = ''
        }
        if (recordingRef.current) {
          try { recognition.start() } catch (e) {}
        }
      }
      recognition.start()
      recognitionRef.current = recognition
    } catch (err) {
      setStatus('no-speech-api')
    }
  }

  const stopInlineRecognition = () => {
    if (interimRef.current) {
      setTranscript(prev => {
        const plain = prev.replace(/<[^>]*>/g, '')
        return plain + interimRef.current + ' '
      })
      interimRef.current = ''
    }
    const recognition = recognitionRef.current
    if (recognition) {
      recognition.stop()
      recognitionRef.current = null
    }
  }

  const handleTranscribe = async () => {
    if (!audioBlob) return
    setTranscribing(true)
    setStatus('uploading')
    try {
      setStatus('transcribing')
      const result = await uploadAudioForTranscription(audioBlob)
      if (result.status === 'COMPLETED' && result.transcript) {
        setTranscript(result.transcript)
      }
      setStatus('transcribed')
    } catch {
      setStatus('error')
    }
    setTranscribing(false)
  }

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {showStoppedToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
          >
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-900/90 to-indigo-900/90 backdrop-blur-xl border border-blue-500/30 rounded-xl px-5 py-3 shadow-lg shadow-blue-500/10 whitespace-nowrap">
              <Spinner />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-200">Recording stopped</p>
                <p className="text-xs text-blue-300/70">
                  {status === 'processing' ? 'Saving audio...' :
                   status === 'uploading' ? 'Uploading to cloud...' :
                   status === 'transcribing' ? 'Transcribing via Johnkennedy-V1-Flash...' :
                   'Processing...'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-3xl border border-white/10 bg-neutral-950/80 p-6 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Recorder</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Live capture</h2>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            {status === 'recording' ? 'Recording' : status === 'processing' ? 'Processing' : status === 'uploading' ? 'Uploading' : status === 'transcribing' ? 'Transcribing...' : status === 'transcribed' ? 'Done' : status === 'no-speech-api' ? 'Speech API not available' : 'Idle'}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startRecording}
            className="w-full sm:w-auto rounded-2xl bg-white/10 px-5 py-4 sm:py-3 text-left text-white transition hover:bg-white/15"
          >
            Start Recording
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={stopRecording}
            disabled={!mediaRecorder || status !== 'recording'}
            className="w-full sm:w-auto rounded-2xl bg-slate-800 px-5 py-4 sm:py-3 text-left text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Stop Recording
          </motion.button>
        </div>
        <div className="mt-6">
          <RecordingVisualizer stream={streamRef.current} active={status === 'recording'} />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Tap the button to record audio. After stopping, the app simulates transcription and prepares export options.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Output Preview</p>
            <p className="text-sm text-slate-300">Audio file ready: {audioBlob ? 'yes' : 'no'}</p>
          </div>
          <div className="h-12 w-12 rounded-full border border-white/10 bg-black/40" />
        </div>
        {audioBlob && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTranscribe}
            disabled={transcribing}
            className="mt-4 w-full rounded-2xl bg-indigo-700 px-5 py-3 text-sm text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {transcribing ? 'Transcribing...' : 'Transcribe via Backend'}
          </motion.button>
        )}
      </div>
    </div>
  )
}

export default Recorder
