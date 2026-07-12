import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { getProfile, getHistory, clearHistory as apiClearHistory } from '../lib/apiClient.js'
import ParticleField from './ParticleField.jsx'
import ThemeOverlay from './ThemeOverlay.jsx'

function AccountPage({ user, onSignOut, onGoToDashboard }) {
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [profileLoaded, setProfileLoaded] = useState(false)

  const userId = user?.userId || user?.username || 'anon'
  const displayName = user?.attributes?.name || user?.attributes?.email || 'User'
  const email = user?.attributes?.email || ''
  const initial = displayName.charAt(0).toUpperCase()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [profileData, historyData] = await Promise.all([
          getProfile(userId),
          getHistory(userId),
        ])
        if (cancelled) return
        if (profileData.exists) setProfile(profileData)
        setHistory(historyData)
      } catch {
        if (cancelled) return
      }
      if (!cancelled) setProfileLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  const recordingCount = history.filter(h => h.type === 'recording').length
  const exportCount = history.filter(h => h.type === 'pdf').length
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Just now'

  const stats = [
    { label: 'Recordings', value: recordingCount, icon: 'mic' },
    { label: 'Exports', value: exportCount, icon: 'file' },
    { label: 'Total Items', value: history.length, icon: 'history' },
  ]

  return (
    <div className="min-h-screen bg-ink text-pearl relative overflow-hidden">
      <ParticleField variant="app" />
      <ThemeOverlay />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg sm:text-xl font-semibold shadow-lg shadow-blue-500/20 flex-shrink-0">
                {initial}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-white">My Account</h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onGoToDashboard}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
              >
                Go to Dashboard
              </motion.button>
              <button
                onClick={onSignOut}
                className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"
                aria-label="Sign out"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16,17 21,12 16,7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </motion.header>

        <div className="relative z-10 grid gap-5 sm:gap-6 lg:gap-8 lg:grid-cols-3">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 space-y-5 sm:space-y-6"
          >
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6 lg:p-7 shadow-glow backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-5">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <h2 className="text-lg font-semibold text-white">Profile</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Name</p>
                  <p className="text-sm text-white font-medium">{displayName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm text-slate-300">{email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">User ID</p>
                  <p className="text-sm text-slate-400 font-mono text-[11px] truncate">{userId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Member since</p>
                  <p className="text-sm text-slate-300">{memberSince}</p>
                </div>
              </div>
              {!profileLoaded && (
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Loading profile...
                </div>
              )}
            </div>

            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6 lg:p-7 shadow-glow backdrop-blur-xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        await apiClearHistory(userId)
                        setHistory([])
                      } catch {}
                    }}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <div className="text-center py-8 sm:py-10">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  <p className="text-sm text-slate-500">No activity yet</p>
                  <p className="text-xs text-slate-600 mt-1">Start recording to see your history here.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {history.slice(0, 10).map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/3 px-4 py-3"
                    >
                      <div className={`p-1.5 rounded-lg ${item.type === 'pdf' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {item.type === 'pdf' ? (
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                            <path d="M19 10v2a7 7 0 01-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-300">
                          {item.type === 'pdf' ? 'PDF Export' : 'Recording'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.transcript ? item.transcript.slice(0, 60) + (item.transcript.length > 60 ? '...' : '') : 'No transcript'}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-600 whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-5 sm:space-y-6"
          >
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6 shadow-glow backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white mb-4">Stats</h2>
              <div className="space-y-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between rounded-xl border border-white/6 bg-black/20 px-4 py-3">
                    <span className="text-sm text-slate-300">{stat.label}</span>
                    <span className="text-lg font-semibold text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6 shadow-glow backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onGoToDashboard}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 text-sm text-white font-medium transition text-center"
                >
                  New Recording
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onGoToDashboard}
                  className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-3 text-sm text-slate-300 transition text-center"
                >
                  View Dashboard
                </motion.button>
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6 shadow-glow backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white mb-3">Storage</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your recordings and transcripts are stored securely on the server. Data persists across sessions and devices.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-green-400">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </svg>
                Cloud saved
              </div>
            </div>
          </motion.section>
        </div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="relative z-10 mt-8 sm:mt-10 lg:mt-12 border-t border-white/5 py-4 sm:py-5 text-center"
        >
          <p className="text-[10px] sm:text-xs text-slate-600">
            SpeechWeb by Johnkennedy I. Alozie &mdash; Your data is stored persistently on our servers.
          </p>
        </motion.footer>
      </div>
    </div>
  )
}

export default AccountPage
