import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { uploadAudioForTranscription } from '../lib/speechClient.js'

function Recorder({ audioBlob, setAudioBlob, setTranscript, setStatus, status }) {
  const [transcribing, setTranscribing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [recordedChunks, setRecordedChunks] = useState([])
  const [allowed, setAllowed] = useState(false)
  const [liveSupported, setLiveSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('unsupported')
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setLiveSupported(Boolean(SpeechRecognition))
  }, [setStatus])

  const requestMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setAllowed(true)
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data])
        }
      }
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        setStatus('recorded')
      }
      setMediaRecorder(recorder)
      setStatus('ready')
    } catch (error) {
      setStatus('denied')
    }
  }

  const startRecording = async () => {
    if (!mediaRecorder) {
      await requestMicrophone()
    }
    setRecordedChunks([])
    mediaRecorder?.start()
    setStatus('recording')
  }

  const stopRecording = () => {
    mediaRecorder?.stop()
    setStatus('processing')
    setTimeout(() => {
      setTranscript('Transcription placeholder: paste the transcript here after processing.')
      setStatus('ready')
    }, 900)
  }

  const startLiveRecognition = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.onresult = (event) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]
          if (res.isFinal) final += res[0].transcript + ' '
          else interim += res[0].transcript
        }
        setTranscript(prev => (final ? prev + final : prev + interim))
      }
      recognition.onerror = () => {
        setListening(false)
        recognition.stop()
      }
      recognition.onend = () => setListening(false)
      recognition.start()
      recognitionRef.current = recognition
      setListening(true)
      setStatus('listening')
    } catch (err) {
      setStatus('denied')
    }
  }

  const stopLiveRecognition = () => {
    const recognition = recognitionRef.current
    if (recognition) {
      recognition.stop()
      recognitionRef.current = null
    }
    setListening(false)
    setStatus('ready')
  }

  const handleTranscribe = async () => {
    if (!audioBlob) return
    setTranscribing(true)
    setStatus('uploading')
    try {
      const data = await uploadAudioForTranscription(audioBlob)
      if (data.transcript) setTranscript(data.transcript)
      setStatus('transcribed')
    } catch {
      setStatus('error')
    }
    setTranscribing(false)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-neutral-950/80 p-6 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Recorder</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Live capture</h2>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            {status === 'recording' ? 'Recording' : status === 'processing' ? 'Processing' : 'Idle'}
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
