import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { XMarkIcon, UserCircleIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useAuthenticator } from '@aws-amplify/ui-react'
import useAppStore from '../store/useAppStore'
import { fetchProfile, saveProfile } from '../lib/apiClient'

export default function UserProfilePanel({ onClose }) {
  const { user } = useAuthenticator()
  const { userProfile, setUserProfile, setConfirmDialog } = useAppStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const userId = user?.userId || user?.username

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    fetchProfile(userId)
      .then((data) => {
        if (cancelled) return
        if (data.exists) {
          setName(data.name || '')
          setEmail(data.email || '')
          setUserProfile(data)
        } else if (user) {
          setName(user.attributes?.name || '')
          setEmail(user.attributes?.email || '')
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId, user, setUserProfile])

  const handleSave = useCallback(async () => {
    if (!userId) return
    setSaving(true)
    setSaved(false)
    try {
      const profile = await saveProfile(userId, {
        name: name.trim(),
        email: email.trim(),
        picture: user?.attributes?.picture || userProfile?.picture || '',
      })
      setUserProfile(profile)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setConfirmDialog({
        message: err.message || 'Failed to save profile',
        confirmLabel: 'OK',
        onConfirm: () => {},
      })
    } finally {
      setSaving(false)
    }
  }, [userId, name, email, user, userProfile, setUserProfile, setConfirmDialog])

  const pictureUrl = userProfile?.picture || user?.attributes?.picture

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed right-0 top-0 bottom-0 z-40 w-full sm:max-w-md bg-[#0e0e1a] border-l sm:border-border shadow-2xl overflow-y-auto panel-scroll"
    >
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <h2 className="text-base sm:text-lg font-medium text-text-primary">Your Profile</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-1 transition-colors focus-visible:outline-2 focus-visible:outline-accent-glow"
          aria-label="Close profile"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="w-6 h-6 text-text-secondary animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              {pictureUrl ? (
                <img
                  src={pictureUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <UserCircleIcon className="w-20 h-20 text-text-secondary" />
              )}
              <p className="text-xs text-text-secondary/60 font-mono">{userId}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={100}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-1 border border-border text-text-primary placeholder-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent-glow focus:border-transparent transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  maxLength={254}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-1 border border-border text-text-primary placeholder-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent-glow focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !email.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-text-primary text-base font-medium transition-all duration-200 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-accent-glow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : saved ? (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Saved
                </>
              ) : (
                'Save Profile'
              )}
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}
