import jsPDF from 'jspdf'
import 'jspdf-autotable'
import type { ReportSummary } from '@/types/report'

// Extend jsPDF type for autoTable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => void
    lastAutoTable: { finalY: number }
  }
}

export async function buildPdfReport(
  summary: ReportSummary,
  orgName: string,
): Promise<Uint8Array> {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(18)
  doc.text('LLM Cost Manager', 14, 22)
  doc.setFontSize(10)
  doc.text(`Period: ${summary.period.from} ~ ${summary.period.to}`, 14, 30)
  doc.text(`Organization: ${orgName}`, 14, 36)

  // Overview table
  doc.autoTable({
    startY: 44,
    head: [['Metric', 'Value']],
    body: [
      ['Total Cost', `$${summary.overview.totalCost.toFixed(2)}`],
      ['Total Tokens', summary.overview.totalTokens.toLocaleString()],
      ['Total Requests', summary.overview.totalRequests.toLocaleString()],
      ['Daily Average', `$${summary.overview.dailyAverage.toFixed(2)}`],
      ['vs Previous Period', `${summary.overview.changePercent >= 0 ? '+' : ''}${summary.overview.changePercent.toFixed(1)}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] },
  })

  // By Provider table
  if (summary.byProvider.length > 0) {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Provider', 'Cost', 'Tokens', 'Requests', 'Share']],
      body: summary.byProvider.map((p) => [
        p.type,
        `$${p.cost.toFixed(2)}`,
        p.tokenCount.toLocaleString(),
        p.requestCount.toLocaleString(),
        `${p.percentage.toFixed(1)}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
    })
  }

  // By Model table (Top 10) - new page
  if (summary.byModel.length > 0) {
    doc.addPage()
    doc.setFontSize(14)
    doc.text('Top Models by Cost', 14, 20)
    doc.autoTable({
      startY: 28,
      head: [['Model', 'Provider', 'Cost', 'Tokens', 'Requests']],
      body: summary.byModel.slice(0, 10).map((m) => [
        m.model,
        m.provider,
        `$${m.cost.toFixed(2)}`,
        m.tokenCount.toLocaleString(),
        m.requestCount.toLocaleString(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
    })
  }

  // By Project table
  if (summary.byProject.length > 0) {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Project', 'Cost', 'Share']],
      body: summary.byProject.map((p) => [
        p.name,
        `$${p.cost.toFixed(2)}`,
        `${p.percentage.toFixed(1)}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
    })
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Generated: ${new Date().toISOString().split('T')[0]} | Page ${i}/${pageCount}`,
      14,
      285,
    )
    doc.setTextColor(0)
  }

  return new Uint8Array(doc.output('arraybuffer'))
}
