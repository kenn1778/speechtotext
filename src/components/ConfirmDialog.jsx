import { motion, AnimatePresence } from 'framer-motion'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import useAppStore from '../store/useAppStore'

export default function ConfirmDialog() {
  const { confirmDialog, clearConfirmDialog } = useAppStore()

  const handleConfirm = () => {
    const onConfirm = confirmDialog?.onConfirm
    clearConfirmDialog()
    onConfirm?.()
  }

  const handleCancel = () => {
    const onCancel = confirmDialog?.onCancel
    clearConfirmDialog()
    onCancel?.()
  }

  return (
    <AnimatePresence>
      {confirmDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-[calc(100%-32px)] sm:max-w-sm rounded-2xl bg-[#1a1a2e] border border-border p-5 sm:p-6 shadow-xl mx-4"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-text-primary text-sm leading-relaxed">
                {confirmDialog.message}
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 rounded-xl bg-surface-1 border border-border text-text-secondary text-sm hover:bg-surface-2 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent-glow"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/30 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  {confirmDialog.confirmLabel || 'Confirm'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
