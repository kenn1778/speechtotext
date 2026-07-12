import { useState } from 'react'
import { motion } from 'framer-motion'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5">
      <path fill="#ff9c07" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.6-5.8 8-11.3 8-6.4 0-11.5-5.1-11.5-11.5S17.6 13 24 13c2.9 0 5.5 1.1 7.5 2.8l5.7-5.7C33.8 7.1 29.2 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19c9.4 0 17.3-6.5 18.9-15.3.3-1.5.5-3 .5-4.7 0-1.5-.3-3-.8-4.4z"/>
      <path fill="#8a2101" d="M6.3 14.7l6.6 4.8C14.9 14.8 19 11 24 11c2.9 0 5.5 1.1 7.5 2.8l5.7-5.7C33.8 7.1 29.2 5 24 5c-6.9 0-13 3.3-16.8 8.4l1.1 1.3z"/>
      <path fill="#2dbd32" d="M24 43c5.2 0 9.8-2.1 13.2-5.5l-6.1-5.2c-1.8 1.2-4 2-6.7 2-4.5 0-8.3-2.8-9.8-6.7l-6.5 5c2.8 5.9 9.6 10.4 17.9 10.4z"/>
      <path fill="#1988d2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.2 5.7.1 0 6.1 5.3 6.1 5.3 4.6-4.3 7.3-10.6 7.3-18.4 0-1.5-.3-3-.8-4.4z"/>
    </svg>
  )
}

function LoginPage({ onAuth, onSignOut, user }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const OAUTH_DOMAIN = 'speechweb-auth-dev.auth.us-east-1.amazoncognito.com'
  const OAUTH_CLIENT_ID = '17njfo8q2qobrb5n1ft4f4cp4l'

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmCode('')
    setNewPassword('')
    setShowPassword(false)
    setError('')
    setSubmitting(false)
  }

  const switchMode = (m) => {
    setMode(m)
    resetForm()
  }

  const handleGoogleSignIn = () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (mode === 'login') {
        const { signIn, getCurrentUser } = await import('aws-amplify/auth')
        const result = await signIn({ username: email, password })
        if (result.isSignedIn) {
          const user = await getCurrentUser()
          onAuth(user)
        } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
          setMode('confirm')
        } else {
          setError('Login failed. Check your credentials.')
        }
      } else if (mode === 'signup') {
        const { signUp } = await import('aws-amplify/auth')
        await signUp({
          username: email,
          password,
          options: { userAttributes: { email } },
        })
        setMode('confirm')
      } else if (mode === 'confirm') {
        const { confirmSignUp, signIn, getCurrentUser } = await import('aws-amplify/auth')
        await confirmSignUp({ username: email, confirmationCode: confirmCode })
        const result = await signIn({ username: email, password })
        if (result.isSignedIn) {
          const user = await getCurrentUser()
          onAuth(user)
        } else {
          setError('Sign-in after confirmation failed. Try logging in.')
          setMode('login')
        }
      } else if (mode === 'forgot') {
        const { resetPassword } = await import('aws-amplify/auth')
        await resetPassword({ username: email })
        setMode('forgotConfirm')
      } else if (mode === 'forgotConfirm') {
        const { confirmResetPassword } = await import('aws-amplify/auth')
        await confirmResetPassword({ username: email, confirmationCode: confirmCode, newPassword })
        setError('Password reset successful. Please log in.')
        switchMode('login')
      }
    } catch (err) {
      const msg = err?.message || err?.name || 'An error occurred'
      if (msg.includes('SECRET_HASH') || msg.includes('secret hash') || msg.includes('client secret')) {
        setError('Incorrect email or password.')
      } else if (msg.includes('CodeMismatch') || msg.includes('code mismatch')) {
        setError('Invalid confirmation code. Please check and try again.')
      } else if (msg.includes('ExpiredCode')) {
        setError('Confirmation code expired. Request a new one.')
      } else if (msg.includes('UserNotFoundException')) {
        setError('No account found with this email.')
      } else if (msg.includes('NotAuthorizedException')) {
        setError('Incorrect email or password.')
      } else if (msg.includes('UsernameExistsException')) {
        setError('An account with this email already exists. Try logging in.')
      } else if (msg.includes('InvalidPasswordException')) {
        setError('Password must be at least 8 characters.')
      } else {
        setError('Incorrect email or password.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12 relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_30%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.04),_transparent_28%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-[420px]"
      >
        <div className="rounded-2xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl p-5 sm:p-8 lg:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/15 flex items-center justify-center mb-3 sm:mb-4">
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="3" />
                <rect x="8" y="11" width="8" height="10" rx="2" />
                <path d="M5 14a7 7 0 0114 0" strokeWidth="1" />
                <path d="M3 17a10 10 0 0118 0" strokeWidth="1" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white text-center">Welcome to Agent Kennedy</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Record, transcribe, export</p>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1 sm:mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-3 sm:px-3.5 py-2.5 sm:py-2.5 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-500 text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1 sm:mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-3 sm:px-3.5 py-2.5 sm:py-2.5 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-500 text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {submitting ? 'Signing in...' : 'Log in'}
              </button>

              <div className="flex items-center gap-3 py-1 sm:py-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-slate-500">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 sm:py-2.5 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-sm transition min-h-[44px]"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="text-center pt-1 sm:pt-2">
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-blue-400 hover:text-blue-300 transition py-1">
                  Forgot your password?
                </button>
              </div>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1 sm:mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-3 sm:px-3.5 py-2.5 sm:py-2.5 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-500 text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1 sm:mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    minLength={8}
                    className="w-full px-3 sm:px-3.5 py-2.5 sm:py-2.5 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-500 text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">At least 8 characters required</p>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {submitting ? 'Creating account...' : 'Continue'}
              </button>

              <div className="flex items-center gap-3 py-1 sm:py-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-slate-500">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 sm:py-2.5 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-sm transition min-h-[44px]"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </form>
          )}

          {mode === 'confirm' && (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <p className="text-sm text-slate-400 text-center">
                Enter the confirmation code sent to <span className="text-white font-medium">{email}</span>
              </p>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1 sm:mb-1.5">Confirmation code</label>
                <input
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  placeholder="Enter code"
                  required
                  className="w-full px-3 sm:px-3.5 py-2.5 sm:py-2.5 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-500 text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {submitting ? 'Verifying...' : 'Confirm'}
              </button>

              <div className="text-center">
                <button type="button" onClick={() => { setMode('login'); resetForm() }} className="text-xs text-blue-400 hover:text-blue-300 transition py-1">
                  Back to login
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <p className="text-sm text-slate-400 text-center">
                Enter your email and we'll send you a reset code.
              </p>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1 sm:mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-3 sm:px-3.5 py-2.5 sm:py-2.5 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-500 text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {submitting ? 'Sending...' : 'Send reset code'}
              </button>

              <div className="text-center">
                <button type="button" onClick={() => switchMode('login')} className="text-xs text-blue-400 hover:text-blue-300 transition py-1">
                  Back to login
                </button>
              </div>
            </form>
          )}

          {mode === 'forgotConfirm' && (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <p className="text-sm text-slate-400 text-center">
                Enter the code sent to <span className="text-white font-medium">{email}</span> and your new password.
              </p>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1 sm:mb-1.5">Confirmation code</label>
                <input
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  placeholder="Enter code"
                  required
                  className="w-full px-3 sm:px-3.5 py-2.5 sm:py-2.5 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-500 text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1 sm:mb-1.5">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  className="w-full px-3 sm:px-3.5 py-2.5 sm:py-2.5 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-500 text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {submitting ? 'Resetting...' : 'Reset password'}
              </button>

              <div className="text-center">
                <button type="button" onClick={() => switchMode('login')} className="text-xs text-blue-400 hover:text-blue-300 transition py-1">
                  Back to login
                </button>
              </div>
            </form>
          )}

          {mode !== 'confirm' && mode !== 'forgot' && mode !== 'forgotConfirm' && (
            <div className="mt-5 sm:mt-6 pt-4 sm:pt-4 border-t border-white/6 text-center">
              <p className="text-xs text-slate-500">
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-blue-400 hover:text-blue-300 font-medium transition"
                >
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="text-[10px] text-slate-600 text-center mt-5 sm:mt-6 px-2 sm:px-4 leading-relaxed">
          By continuing, you agree to SpeechWeb's{' '}
          <a href="/terms.html" className="text-blue-400 hover:text-blue-300 underline">Terms of Service</a> and{' '}
          <a href="/privacy.html" className="text-blue-400 hover:text-blue-300 underline">Privacy Policy</a>.
        </p>
      </motion.div>
    </div>
  )
}

export default LoginPage
