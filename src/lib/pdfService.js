import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function generatePdf(text, title = 'SpeechWeb Transcript') {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const maxWidth = pageWidth - margin * 2

  doc.setFillColor(9, 9, 13)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  doc.setTextColor(248, 250, 252)
  doc.setFontSize(18)
  doc.text(title, margin, 30)

  doc.setFontSize(11)
  doc.setTextColor(148, 163, 184)
  const lines = doc.splitTextToSize(text, maxWidth)
  let y = 45

  for (const line of lines) {
    if (y > pageHeight - margin) {
      doc.addPage()
      doc.setFillColor(9, 9, 13)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')
      doc.setTextColor(148, 163, 184)
      y = margin + 10
    }
    doc.text(line, margin, y)
    y += 6
  }

  return { blob: doc.output('blob'), url: doc.output('bloburl') }
}

export async function generatePdfFromElement(element, title = 'SpeechWeb Transcript') {
  const canvas = await html2canvas(element, {
    backgroundColor: '#09090d',
    scale: 2,
    useCORS: true,
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const imgWidth = pageWidth - 20
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  doc.setFillColor(9, 9, 13)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  let heightLeft = imgHeight
  let position = 10

  doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10
    doc.addPage()
    doc.setFillColor(9, 9, 13)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')
    doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  return { blob: doc.output('blob'), url: doc.output('bloburl') }
}
