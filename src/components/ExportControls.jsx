import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { DocumentArrowDownIcon, PhotoIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useAuthenticator } from '@aws-amplify/ui-react'
import useAppStore from '../store/useAppStore'
import { generatePdf } from '../lib/pdfService'
import { generateSlidesPdf, generateSlides } from '../lib/slideService'
import { addHistoryItem } from '../lib/apiClient'

export default function ExportControls() {
  const { user } = useAuthenticator()
  const { appState, editedTranscript, canExport, setExportStatus, exportStatus, setHistoryItems, historyItems } = useAppStore()
  const [exportError, setExportError] = useState(null)

  const userId = user?.userId || user?.username

  const saveToHistory = useCallback(async (type) => {
    if (!userId) return
    try {
      const entry = await addHistoryItem(userId, {
        type,
        transcript: editedTranscript,
        preview: editedTranscript.slice(0, 100),
      })
      setHistoryItems([entry, ...historyItems])
    } catch {
      // silent
    }
  }, [userId, editedTranscript, setHistoryItems, historyItems])

  const handleExportPdf = useCallback(async () => {
    setExportError(null)
    setExportStatus('generating')
    try {
      const { blob } = await generatePdf(editedTranscript)
      downloadBlob(blob, 'speechweb-transcript.pdf')
      setExportStatus('ready')
      saveToHistory('pdf')
    } catch (err) {
      setExportError(err.message)
      setExportStatus('idle')
    }
  }, [editedTranscript, setExportStatus, saveToHistory])

  const handleExportSlides = useCallback(async () => {
    setExportError(null)
    setExportStatus('generating')
    try {
      const slides = generateSlides(editedTranscript)
      const { blob } = await generateSlidesPdf(slides)
      downloadBlob(blob, 'speechweb-slides.pdf')
      setExportStatus('ready')
      saveToHistory('slides')
    } catch (err) {
      setExportError(err.message)
      setExportStatus('idle')
    }
  }, [editedTranscript, setExportStatus, saveToHistory])

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!canExport()) return null

  const isGenerating = exportStatus === 'generating'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-4"
    >
      <p className="text-sm text-text-secondary">Export your transcript</p>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
        <button
          onClick={handleExportPdf}
          disabled={isGenerating}
          className={clsx(
            'flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl flex-1 sm:flex-none min-w-[140px]',
            'bg-surface-1 border border-border text-text-primary',
            'hover:bg-surface-2 hover:border-border-strong',
            'transition-all duration-200',
            'focus-visible:outline-2 focus-visible:outline-accent-glow',
            isGenerating && 'opacity-50 cursor-not-allowed'
          )}
        >
          <DocumentArrowDownIcon className="w-4 sm:w-5 h-4 sm:h-5" />
          <span className="text-xs sm:text-sm">Export PDF</span>
        </button>

        <button
          onClick={handleExportSlides}
          disabled={isGenerating}
          className={clsx(
            'flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl flex-1 sm:flex-none min-w-[140px]',
            'bg-surface-1 border border-border text-text-primary',
            'hover:bg-surface-2 hover:border-border-strong',
            'transition-all duration-200',
            'focus-visible:outline-2 focus-visible:outline-accent-glow',
            isGenerating && 'opacity-50 cursor-not-allowed'
          )}
        >
          <PhotoIcon className="w-4 sm:w-5 h-4 sm:h-5" />
          <span className="text-xs sm:text-sm">Export Slides</span>
        </button>
      </div>

      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-text-secondary"
        >
          <ArrowDownTrayIcon className="w-4 h-4 animate-pulse" />
          Generating export…
        </motion.div>
      )}

      {exportStatus === 'ready' && (
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-sm text-green-400"
        >
          Download complete
        </motion.p>
      )}

      {exportError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-red-400"
          role="alert"
        >
          Export failed: {exportError}
        </motion.p>
      )}
    </motion.div>
  )
}
