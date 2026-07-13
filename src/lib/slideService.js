import jsPDF from 'jspdf'

export function generateSlides(text, title = 'SpeechWeb Presentation') {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  const slides = []
  let current = { title: 'SpeechWeb', content: '' }

  for (let i = 0; i < sentences.length; i += 3) {
    const chunk = sentences.slice(i, i + 3).join('. ') + '.'
    slides.push({
      title: i === 0 ? title : `${title} (cont.)`,
      content: chunk,
      number: slides.length + 1,
    })
  }

  if (slides.length === 0) {
    slides.push({ title, content: text, number: 1 })
  }

  return slides
}

export async function generateSlidesPdf(slides, title = 'SpeechWeb Presentation') {
  const doc = new jsPDF('l', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const maxWidth = pageWidth - margin * 2

  for (const slide of slides) {
    doc.setFillColor(9, 9, 13)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')

    doc.setFillColor(255, 255, 255, 0.05)
    doc.roundedRect(margin, margin, maxWidth, pageHeight - margin * 2, 3, 3, 'F')

    doc.setDrawColor(255, 255, 255, 0.1)
    doc.roundedRect(margin, margin, maxWidth, pageHeight - margin * 2, 3, 3, 'S')

    doc.setTextColor(248, 250, 252)
    doc.setFontSize(22)
    doc.text(slide.title, margin + 10, margin + 20)

    doc.setFontSize(14)
    doc.setTextColor(148, 163, 184)

    const lines = doc.splitTextToSize(slide.content, maxWidth - 20)
    doc.text(lines, margin + 10, margin + 35)

    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`${slide.number} / ${slides.length}`, pageWidth - margin - 15, pageHeight - margin - 5)

    if (slide.number < slides.length) {
      doc.addPage()
    }
  }

  return { blob: doc.output('blob'), url: doc.output('bloburl') }
}
