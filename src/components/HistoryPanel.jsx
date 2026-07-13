import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  XMarkIcon, DocumentTextIcon, TrashIcon, ArrowPathIcon,
  DocumentArrowDownIcon, PhotoIcon,
} from '@heroicons/react/24/outline'
import { useAuthenticator } from '@aws-amplify/ui-react'
import useAppStore from '../store/useAppStore'
import { fetchHistory, deleteHistoryItem, clearHistory as apiClearHistory } from '../lib/apiClient'

const TYPE_ICONS = {
  recording: DocumentTextIcon,
  pdf: DocumentArrowDownIcon,
  slides: PhotoIcon,
}

const TYPE_LABELS = {
  recording: 'Recording',
  pdf: 'PDF Export',
  slides: 'Slides Export',
}

export default function HistoryPanel({ onClose }) {
  const { user } = useAuthenticator()
  const { userProfile, historyItems, setHistoryItems, historyLoading, setHistoryLoading, setConfirmDialog } = useAppStore()
  const [deletingId, setDeletingId] = useState(null)

  const userId = user?.userId || user?.username

  const loadHistory = useCallback(async () => {
    if (!userId) return
    setHistoryLoading(true)
    try {
      const items = await fetchHistory(userId)
      setHistoryItems(items)
    } catch {
      // silent
    } finally {
      setHistoryLoading(false)
    }
  }, [userId, setHistoryItems, setHistoryLoading])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleDelete = useCallback((itemId) => {
    setConfirmDialog({
      message: 'Delete this history item?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setDeletingId(itemId)
        try {
          await deleteHistoryItem(userId, itemId)
          setHistoryItems((prev) => prev.filter((h) => h.id !== itemId))
        } catch {
          // silent
        } finally {
          setDeletingId(null)
        }
      },
    })
  }, [userId, setHistoryItems, setConfirmDialog])

  const handleClearAll = useCallback(() => {
    setConfirmDialog({
      message: 'Clear all history? This cannot be undone.',
      confirmLabel: 'Clear All',
      onConfirm: async () => {
        try {
          await apiClearHistory(userId)
          setHistoryItems([])
        } catch {
          // silent
        }
      },
    })
  }, [userId, setHistoryItems, setConfirmDialog])

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed right-0 top-0 bottom-0 z-40 w-full sm:max-w-md bg-[#0e0e1a] border-l sm:border-border shadow-2xl overflow-y-auto panel-scroll"
    >
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <h2 className="text-base sm:text-lg font-medium text-text-primary">Recent Activity</h2>
        <div className="flex items-center gap-2">
          {historyItems.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-red-500"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-1 transition-colors focus-visible:outline-2 focus-visible:outline-accent-glow"
            aria-label="Close history"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="w-6 h-6 text-text-secondary animate-spin" />
          </div>
        ) : historyItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <DocumentTextIcon className="w-10 h-10 text-text-secondary/40" />
            <p className="text-sm text-text-secondary/60">No activity yet.</p>
            <p className="text-xs text-text-secondary/40">Your recordings and exports will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {historyItems.map((item) => {
              const Icon = TYPE_ICONS[item.type] || DocumentTextIcon
              const label = TYPE_LABELS[item.type] || item.type
              const isDeleting = deletingId === item.id

              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative flex items-start gap-3 p-3 rounded-xl bg-surface-1 border border-border hover:bg-surface-2 transition-all duration-200"
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-surface-2">
                    <Icon className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                        {label}
                      </span>
                      <span className="text-[10px] text-text-secondary/40">
                        {formatDate(item.timestamp)}
                      </span>
                    </div>
                    {item.preview && (
                      <p className="text-sm text-text-primary mt-1 line-clamp-2 break-words">
                        {item.preview}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={isDeleting}
                    className="p-1.5 rounded-lg text-text-secondary/40 hover:text-red-400 hover:bg-red-500/10 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:opacity-100 disabled:opacity-30"
                    aria-label="Delete item"
                  >
                    {isDeleting ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <TrashIcon className="w-4 h-4" />
                    )}
                  </button>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
    </motion.div>
  )
}
