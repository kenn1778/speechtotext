import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { groupByDate } from '../lib/historyStore.js'

function HistoryPanel({ open, onClose, onLoadTranscript, userId, user, onSignOut, historyItems, onClearHistory }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  const groups = groupByDate(historyItems || [])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md z-50 bg-neutral-950 border-l border-white/10 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
                <h2 className="text-base font-semibold text-white">History</h2>
                <span className="text-xs text-slate-500">{(historyItems || []).length}</span>
              </div>
              <div className="flex items-center gap-2">
                {(historyItems || []).length > 0 && (
                  <button onClick={onClearHistory} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10">
                    Clear all
                  </button>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/6 bg-white/3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.attributes?.picture ? (
                    <img src={user.attributes.picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.attributes?.name || user.attributes?.email || 'User'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.attributes?.email || ''}</p>
                </div>
                <button
                  onClick={onSignOut}
                  className="text-xs text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16,17 21,12 16,7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {(!historyItems || historyItems.length === 0) && (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 pt-20">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth="1">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  <p className="text-sm">No history yet</p>
                  <p className="text-xs mt-1">Recordings and PDF exports will appear here.</p>
                </div>
              )}

              {Object.entries(groups).map(([label, items]) => (
                <div key={label}>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{label}</p>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const time = new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      const preview = (item.transcript || item.preview || '').slice(0, 80)
                      return (
                        <motion.button
                          key={item.id}
                          whileHover={{ x: 2 }}
                          onClick={() => { onLoadTranscript(item.transcript || ''); onClose() }}
                          className="w-full text-left rounded-xl border border-white/8 bg-white/3 p-3 hover:bg-white/6 transition"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1.5 rounded-lg ${item.type === 'pdf' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
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
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-300">
                                  {item.type === 'pdf' ? 'PDF Export' : 'Recording'}
                                </span>
                                <span className="text-[10px] text-slate-600">{time}</span>
                              </div>
                              {preview ? (
                                <p className="text-xs text-slate-400 mt-1 truncate">{preview}</p>
                              ) : (
                                <p className="text-xs text-slate-600 mt-1 italic">No transcript</p>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-white/5 text-[10px] text-slate-600 text-center">
              History stored on server &mdash; persists across sessions
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default HistoryPanel
