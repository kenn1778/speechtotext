import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon, UserCircleIcon, ClockIcon, ArrowRightOnRectangleIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline'
import { useAuthenticator } from '@aws-amplify/ui-react'
import useAppStore from '../store/useAppStore'

export default function Sidebar() {
  const { user, signOut } = useAuthenticator()
  const { sidebarOpen, setActivePanel, activePanel, userProfile, setConfirmDialog, reset } = useAppStore()

  const displayName = userProfile?.name || user?.attributes?.name || user?.userId || user?.username || 'User'
  const pictureUrl = userProfile?.picture || user?.attributes?.picture

  const handleSignOut = () => {
    setConfirmDialog({
      message: 'Are you sure you want to sign out? Any unsaved changes will be lost.',
      confirmLabel: 'Sign Out',
      onConfirm: () => {
        reset()
        signOut()
      },
    })
  }

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => useAppStore.getState().closeSidebar()}
          />
          <motion.aside
            initial={{ opacity: 0, x: '-100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-40 w-full max-w-[280px] sm:w-64 bg-[#0a0a18] border-r border-border shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <MicrophoneIcon className="w-5 h-5 text-text-primary" />
                <span className="text-sm font-medium text-text-primary">SpeechWeb</span>
              </div>
              <button
                onClick={() => useAppStore.getState().closeSidebar()}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-1 transition-colors focus-visible:outline-2 focus-visible:outline-accent-glow"
                aria-label="Close sidebar"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-3 space-y-1 overflow-y-auto">
              <button
                onClick={() => setActivePanel('profile')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent-glow ${
                  activePanel === 'profile'
                    ? 'bg-surface-2 text-text-primary'
                    : 'text-text-secondary hover:bg-surface-1 hover:text-text-primary'
                }`}
              >
                <UserCircleIcon className="w-5 h-5" />
                Profile
              </button>

              <button
                onClick={() => setActivePanel('history')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent-glow ${
                  activePanel === 'history'
                    ? 'bg-surface-2 text-text-primary'
                    : 'text-text-secondary hover:bg-surface-1 hover:text-text-primary'
                }`}
              >
                <ClockIcon className="w-5 h-5" />
                Recent Activity
              </button>
            </div>

            <div className="p-3 border-t border-border space-y-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
              <div className="flex items-center gap-3 px-3 py-2">
                {pictureUrl ? (
                  <img
                    src={pictureUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                    <UserCircleIcon className="w-5 h-5 text-text-secondary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary truncate">{displayName}</p>
                  <p className="text-[10px] text-text-secondary/50 truncate font-mono">
                    {user?.userId || user?.username}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-red-500"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
