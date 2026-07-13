import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { DocumentArrowDownIcon, PhotoIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import useAppStore from '../store/useAppStore'
import { generatePdf } from '../lib/pdfService'
import { generateSlidesPdf, generateSlides } from '../lib/slideService'

export default function ExportControls() {
  const { appState, editedTranscript, canExport, setExportStatus, exportStatus } = useAppStore()
  const [exportError, setExportError] = useState(null)

  const handleExportPdf = useCallback(async () => {
    setExportError(null)
    setExportStatus('generating')
    try {
      const { blob } = await generatePdf(editedTranscript)
      downloadBlob(blob, 'speechweb-transcript.pdf')
      setExportStatus('ready')
    } catch (err) {
      setExportError(err.message)
      setExportStatus('idle')
    }
  }, [editedTranscript, setExportStatus])

  const handleExportSlides = useCallback(async () => {
    setExportError(null)
    setExportStatus('generating')
    try {
      const slides = generateSlides(editedTranscript)
      const { blob } = await generateSlidesPdf(slides)
      downloadBlob(blob, 'speechweb-slides.pdf')
      setExportStatus('ready')
    } catch (err) {
      setExportError(err.message)
      setExportStatus('idle')
    }
  }, [editedTranscript, setExportStatus])

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

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleExportPdf}
          disabled={isGenerating}
          className={clsx(
            'flex items-center gap-2 px-5 py-3 rounded-xl',
            'bg-surface-1 border border-border text-text-primary',
            'hover:bg-surface-2 hover:border-border-strong',
            'transition-all duration-200',
            'focus-visible:outline-2 focus-visible:outline-accent-glow',
            isGenerating && 'opacity-50 cursor-not-allowed'
          )}
        >
          <DocumentArrowDownIcon className="w-5 h-5" />
          Export PDF
        </button>

        <button
          onClick={handleExportSlides}
          disabled={isGenerating}
          className={clsx(
            'flex items-center gap-2 px-5 py-3 rounded-xl',
            'bg-surface-1 border border-border text-text-primary',
            'hover:bg-surface-2 hover:border-border-strong',
            'transition-all duration-200',
            'focus-visible:outline-2 focus-visible:outline-accent-glow',
            isGenerating && 'opacity-50 cursor-not-allowed'
          )}
        >
          <PhotoIcon className="w-5 h-5" />
          Export Slides
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
