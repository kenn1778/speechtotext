import jsPDF from 'jspdf'
import { useState } from 'react'
import { uploadAudioForTranscription } from '../lib/speechClient.js'

const stripHtml = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

const URL_REGEX = /https?:\/\/[^\s]+/g

function detectLinks(text) {
  const parts = []
  let lastIndex = 0
  let match
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), link: false })
    }
    parts.push({ text: match[0], link: true })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), link: false })
  }
  return parts
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
    const margin = 50
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2
    const content = plainText || 'No transcript available. Record audio and convert first.'

    const pageHeight = doc.internal.pageSize.getHeight()
    const lineHeight = 16
    let cursorY = 60

    doc.setFont('Times-Roman', 'bold')
    doc.setFontSize(24)
    doc.setTextColor(30, 30, 30)
    doc.text('SpeechWeb Transcript', margin, cursorY)
    cursorY += 30

    doc.setFont('Times-Roman', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(120, 120, 120)
    const now = new Date()
    doc.text(`Generated on ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, cursorY)
    cursorY += 12
    doc.text('Powered by OpenAI Whisper — Johnkennedy-V1-Flash-A30b-free', margin, cursorY)
    cursorY += 10

    doc.setDrawColor(60, 60, 60)
    doc.setLineWidth(0.5)
    doc.line(margin, cursorY, margin + pageWidth, cursorY)
    cursorY += 20

    doc.setFont('Times-Roman', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)

    const lines = doc.splitTextToSize(content, pageWidth)
    for (const line of lines) {
      if (cursorY + lineHeight > pageHeight - margin) {
        doc.addPage()
        cursorY = margin
      }
      const parts = detectLinks(line)
      let xOffset = margin
      for (const part of parts) {
        doc.setTextColor(40, 40, 40)
        doc.setFont('Times-Roman', 'normal')
        if (part.link) {
          doc.setTextColor(0, 80, 200)
          doc.setFont('Times-Roman', 'italic')
          doc.textWithLink(part.text, xOffset, cursorY, { url: part.text })
        } else {
          doc.text(part.text, xOffset, cursorY)
        }
        xOffset += doc.getTextWidth(part.text)
      }
      cursorY += lineHeight
    }

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
    <div className="mt-6 sm:mt-8 rounded-2xl sm:rounded-3xl border border-white/10 bg-neutral-950/80 p-4 sm:p-5 lg:p-6 shadow-glow">
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
