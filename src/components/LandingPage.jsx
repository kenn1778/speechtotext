import { motion } from 'framer-motion'
import ParticleField from './ParticleField.jsx'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5">
      <path fill="#ff8b07" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.6-5.8 8-11.3 8-6.4 0-11.5-5.1-11.5-11.5S17.6 13 24 13c2.9 0 5.5 1.1 7.5 2.8l5.7-5.7C33.8 7.1 29.2 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19c9.4 0 17.3-6.5 18.9-15.3.3-1.5.5-3 .5-4.7 0-1.5-.3-3-.8-4.4z"/>
      <path fill="#8a2203" d="M6.3 14.7l6.6 4.8C14.9 14.8 19 11 24 11c2.9 0 5.5 1.1 7.5 2.8l5.7-5.7C33.8 7.1 29.2 5 24 5c-6.9 0-13 3.3-16.8 8.4l1.1 1.3z"/>
      <path fill="#00b306" d="M24 43c5.2 0 9.8-2.1 13.2-5.5l-6.1-5.2c-1.8 1.2-4 2-6.7 2-4.5 0-8.3-2.8-9.8-6.7l-6.5 5c2.8 5.9 9.6 10.4 17.9 10.4z"/>
      <path fill="#013d50" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.2 5.7.1 0 6.1 5.3 6.1 5.3 4.6-4.3 7.3-10.6 7.3-18.4 0-1.5-.3-3-.8-4.4z"/>
    </svg>
  )
}

function LandingPage({ onSignIn }) {
  const handleGoogleSignIn = () => {
    const OAUTH_DOMAIN = 'speechweb-auth-dev.auth.us-east-1.amazoncognito.com'
    const OAUTH_CLIENT_ID = '6uafsoq8rlvuh3aj0opluh1l2t'
    const redirectUri = window.location.origin + '/'
    const state = crypto.randomUUID()
    const url = 'https://' + OAUTH_DOMAIN + '/login'
      + '?client_id=' + OAUTH_CLIENT_ID
      + '&response_type=code'
      + '&redirect_uri=' + encodeURIComponent(redirectUri)
      + '&scope=' + encodeURIComponent('openid email profile')
      + '&state=' + state
    window.location.assign(url)
  }
  return (
    <div className="min-h-screen bg-ink text-pearl relative overflow-hidden">
      <ParticleField variant="landing" />

      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-white font-semibold text-base sm:text-lg">
          <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="8" r="3" />
            <rect x="8" y="11" width="8" height="10" rx="2" />
            <path d="M5 14a7 7 0 0114 0" strokeWidth="1" />
            <path d="M3 17a10 10 0 0118 0" strokeWidth="1" />
          </svg>
          SpeechWeb
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <a href="/privacy.html" className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-orange-600 hover:bg-green-500 text-[11px] sm:text-sm text-slate-400 hover:text-white transition">Privacy</a>
          <a href="/terms.html" className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-yellow-600 hover:bg-gray-500 text-[11px] sm:text-sm text-slate-400 hover:text-white transition">Terms</a>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onSignIn}
            className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-green-500 text-white font-medium text-[11px] sm:text-sm transition"
          >
            Sign in
          </motion.button>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-16 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-20"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs text-blue-300 mb-4 sm:mb-6">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-400 animate-pulse" />
            Voice to text • PDF export • Slides
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight text-white mb-3 sm:mb-5 tracking-tight">
            Just Speech and Text
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed px-2">
            Dont keep the Agent waiting
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-20">
          {[
            { icon: 'mic', title: 'Record', desc: 'Capture high-quality audio directly in your browser with real-time waveform visualization.' },
            { icon: 'ai', title: 'Transcribe', desc: 'Automatic AI transcription powered by OpenAI Whisper. Edit transcripts inline after processing.' },
            { icon: 'file', title: 'Export', desc: 'Export transcripts as PDF documents or generate PowerPoint-style slide previews.' },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 backdrop-blur-xl"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/15 flex items-center justify-center mb-3 sm:mb-4">
                {feature.icon === 'mic' ? (
                  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2a4 4 0 014 4v3a4 4 0 01-8 0V6a4 4 0 014-4z" />
                    <path d="M18 11v2a6 6 0 01-12 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="9" y1="22" x2="15" y2="22" />
                  </svg>
                ) : feature.icon === 'ai' ? (
                  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                )}
              </div>
              <h3 className="text-white font-semibold text-sm sm:text-base mb-1.5 sm:mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <button
            onClick={handleGoogleSignIn}
            className="inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 text-slate-200 font-medium text-sm transition"
          >
            <GoogleIcon />
            Sign in with Google
          </button>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-3 sm:mt-4 px-4">
            By continuing, you agree to SpeechWeb's{' '}
            <a href="/terms.html" className="text-blue-400 hover:text-blue-300">Terms of Service</a> and{' '}
            <a href="/privacy.html" className="text-blue-400 hover:text-blue-300">Privacy Policy</a>.
          </p>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-4 sm:py-6 text-center text-[10px] sm:text-xs text-slate-600">
        Owner: Johnkennedy I. Alozie 
      </footer>
    </div>
  )
}

export default LandingPage
