import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { uploadAudioForTranscription, getTranscriptionResult } from '../lib/speechClient.js'
import RecordingVisualizer from './RecordingVisualizer.jsx'

function Recorder({ audioBlob, setAudioBlob, setTranscript, setStatus, status }) {
  const [transcribing, setTranscribing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [allowed, setAllowed] = useState(false)
  const recognitionRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const recordingRef = useRef(false)
  const interimRef = useRef('')

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('unsupported')
    }
  }, [setStatus])

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
        
        // After a short delay, if no transcript was generated from speech recognition,
        // automatically trigger backend transcription
        setTimeout(() => {
          // This will be handled by the parent component or UI
        }, 100)
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
    recorder.start()
    recordingRef.current = true
    setStatus('recording')
    startInlineRecognition()
  }

  const stopRecording = () => {
    console.log('Stopping recording')
    recordingRef.current = false
    mediaRecorder?.stop()
    stopInlineRecognition()
    setStatus('processing')
    console.log('Recording stopped, processing...')
    
    // After a short delay, check if we have a transcript
    // If not, automatically trigger backend transcription
    setTimeout(() => {
      // The onstop handler will set the status to 'recorded'
      // We can check if we have an audioBlob and no transcript
      // and automatically trigger transcription
    }, 500)
  }

  const startInlineRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.log('SpeechRecognition API not available')
      // SpeechRecognition not available, show error and use backend fallback
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
        console.log('Speech recognition result event:', event)
        let final = ''
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]
          if (res.isFinal) final += res[0].transcript + ' '
          else interim += res[0].transcript
        }
        console.log('Final text:', final)
        console.log('Interim text:', interim)
        interimRef.current = interim
        if (final) {
          console.log('Appending final text to transcript')
          appendText(() => final)
        }
      }
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        if (recordingRef.current) {
          try { recognition.start() } catch (e) {
            console.error('Failed to restart speech recognition:', e)
          }
        }
      }
      recognition.onend = () => {
        console.log('Speech recognition ended')
        if (interimRef.current) {
          console.log('Appending interim text to transcript')
          appendText(() => interimRef.current + ' ')
          interimRef.current = ''
        }
        if (recordingRef.current) {
          console.log('Restarting speech recognition')
          try { 
            recognition.start() 
          } catch (e) {
            console.error('Failed to restart speech recognition on end:', e)
          }
        }
      }
      recognition.start()
      recognitionRef.current = recognition
      console.log('Speech recognition started')
    } catch (err) {
      console.error('Speech recognition failed to start:', err)
      setStatus('no-speech-api')
    }
  }

  const stopInlineRecognition = () => {
    console.log('Stopping inline recognition')
    if (interimRef.current) {
      console.log('Appending final interim text to transcript')
      setTranscript(prev => {
        const plain = prev.replace(/<[^>]*>/g, '')
        return plain + interimRef.current + ' '
      })
      interimRef.current = ''
    }
    const recognition = recognitionRef.current
    if (recognition) {
      console.log('Stopping speech recognition')
      recognition.stop()
      recognitionRef.current = null
    }
  }

  const handleTranscribe = async () => {
    if (!audioBlob) return
    setTranscribing(true)
    setStatus('uploading')
    try {
      const { jobName } = await uploadAudioForTranscription(audioBlob)
      if (!jobName) throw new Error('No job name returned')
      setStatus('transcribing')
      let result
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000))
        result = await getTranscriptionResult(jobName)
        if (result.status === 'COMPLETED') break
      }
      if (result?.status === 'COMPLETED' && result.transcript) {
        setTranscript(result.transcript)
      }
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
