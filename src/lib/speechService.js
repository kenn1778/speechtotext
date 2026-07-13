let recognition = null
let onResultCallback = null
let onErrorCallback = null

export function isSpeechSupported() {
  return !!(
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    window.mozSpeechRecognition
  )
}

export function startTranscription({ onResult, onEnd, onError }) {
  if (!isSpeechSupported()) {
    onError?.(new Error('Speech recognition not supported in this browser'))
    return
  }

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    window.mozSpeechRecognition

  recognition = new SpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'
  recognition.maxAlternatives = 1

  let finalTranscript = ''

  recognition.onresult = (event) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) {
        finalTranscript += result[0].transcript + ' '
      } else {
        interim += result[0].transcript
      }
    }
    onResultCallback?.({ final: finalTranscript.trim(), interim: interim.trim() })
  }

  recognition.onend = () => {
    onEnd?.(finalTranscript.trim())
    cleanup()
  }

  recognition.onerror = (event) => {
    onError?.(new Error(`Speech recognition error: ${event.error}`))
    cleanup()
  }

  onResultCallback = onResult
  onErrorCallback = onError

  recognition.start()
}

export function stopTranscription() {
  if (recognition) {
    recognition.stop()
  }
}

function cleanup() {
  recognition = null
  onResultCallback = null
  onErrorCallback = null
}
