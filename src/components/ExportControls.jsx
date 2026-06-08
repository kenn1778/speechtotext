import jsPDF from 'jspdf'
import { useState } from 'react'
import { uploadAudioForTranscription } from '../lib/speechClient.js'

const stripHtml = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

function ExportControls({ transcript, audioBlob, setStatus, setTranscript }) {
  const [exporting, setExporting] = useState(false)
  const plainText = stripHtml(transcript)

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const createPdf = () => {
    setExporting(true)
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 40
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2
    const content = plainText || 'No transcript available. Record audio and convert first.'

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(245, 245, 245)
    doc.text('SpeechWeb Transcript', margin, 70)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(220, 220, 220)
    doc.text(doc.splitTextToSize(content, pageWidth), margin, 110)
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.5)
    doc.line(margin, 90, margin + pageWidth, 90)

    doc.save('speechweb-transcript.pdf')
    setExporting(false)
    setStatus('exported')
  }

  const createSlides = () => {
    setExporting(true)
    const markdown = `# SpeechWeb Slide Export\n\n${plainText || 'No transcript available'}\n`
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    downloadBlob(blob, 'speechweb-slides.md')
    setExporting(false)
    setStatus('exported')
  }

  const transcribeBackend = async () => {
    if (!audioBlob) return
    setExporting(true)
    setStatus('uploading')
    try {
      const result = await uploadAudioForTranscription(audioBlob)
      if (result.transcript) setTranscript(result.transcript)
      setStatus('transcribed')
    } catch (err) {
      setStatus('error')
    }
    setExporting(false)
  }

  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-neutral-950/80 p-6 shadow-glow">
      <div className="flex flex-col gap-5">
        <div>
          <h4 className="text-lg font-semibold text-white">Export</h4>
          <p className="mt-2 text-sm text-slate-400">
            Download a polished PDF or prepare slides for a presentation export.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={transcribeBackend}
            disabled={exporting || !audioBlob}
            className="w-full inline-flex items-center justify-center h-11 rounded-2xl bg-indigo-700 px-4 py-2 text-sm text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Transcribe via Backend
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={createPdf}
              disabled={exporting}
              className="inline-flex items-center justify-center h-10 rounded-2xl bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Download PDF
            </button>
            <button
              onClick={createSlides}
              disabled={exporting}
              className="inline-flex items-center justify-center h-10 rounded-2xl bg-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export Slides
            </button>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        Outputs are generated client-side. No transcript is uploaded unless you add a remote transcription service.
      </p>
    </div>
  )
}

export default ExportControls
