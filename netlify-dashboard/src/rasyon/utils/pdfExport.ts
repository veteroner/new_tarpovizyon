import type { Ration } from '@/types'
import { calculateEnhancedCost } from './costAnalysis'
import logger from './logger'

/**
 * Rasyon sonucunu PDF olarak dışa aktar
 */
export async function exportRationToPDF(ration: Ration, elementId = 'ration-result'): Promise<void> {
  try {
    // Lazy-load heavy deps so they don't bloat the main route bundle.
    const [jspdfModule, html2canvasModule] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ])

    const jsPDFCtor = (jspdfModule as unknown as { default?: unknown; jsPDF?: unknown }).default
      ?? (jspdfModule as unknown as { jsPDF?: unknown }).jsPDF

    if (!jsPDFCtor) {
      throw new Error('jsPDF module did not provide a constructor')
    }

    const html2canvasFn = (html2canvasModule as unknown as { default?: unknown }).default
    if (typeof html2canvasFn !== 'function') {
      throw new Error('html2canvas module did not provide a function')
    }

    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error(`Element with id '${elementId}' not found`)
    }

    // Loading indicator eklenebilir
    const canvas = await (html2canvasFn as (el: HTMLElement, options?: unknown) => Promise<HTMLCanvasElement>)(element, {
      scale: 2, // Yüksek çözünürlük
      useCORS: true,
      logging: false,
      backgroundColor: '#f9fafb',
    })

    const imgData = canvas.toDataURL('image/png')

    type JsPDFInstance = {
      internal: { pageSize: { getWidth: () => number; getHeight: () => number } }
      addImage: (...args: unknown[]) => void
      addPage: () => void
      save: (fileName: string) => void
    }
    type JsPDFConstructor = new (orientation: string, unit: string, format: string) => JsPDFInstance

    const pdf = new (jsPDFCtor as JsPDFConstructor)('p', 'mm', 'a4')

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth - 20 // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 10

    // İlk sayfa
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
    heightLeft -= pageHeight - 20

    // Çok sayfalı içerik için
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - 20
    }

    // Dosya adı
    const fileName = `rasyon-${ration.profile.breed}-${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(fileName)
  } catch (error) {
    logger.error('PDF export failed:', error)
    throw error
  }
}

/**
 * Rasyonu basit metin olarak paylaş (fallback için)
 */
export function generateShareText(ration: Ration): string {
  const { profile, cost, totals } = ration
  
  // Gelişmiş maliyet analizi
  const enhancedCost = calculateEnhancedCost(cost.dailyFeedCostTL, profile)
  
  return `📊 Teknova Rasyon

🐄 Hayvan: ${profile.breed} (${profile.weightKg}kg)

💰 Maliyet Analizi:
  Günlük Yem Maliyeti: ${cost.dailyFeedCostTL.toFixed(2)} TL
  Toplam Günlük Maliyet: ${enhancedCost.totalDailyCostTL.toFixed(2)} TL
  Toplam Aylık Maliyet: ${enhancedCost.totalMonthlyCostTL.toFixed(2)} TL
  ${cost.costPerKgMilk ? `Süt Maliyeti: ${cost.costPerKgMilk.toFixed(2)} TL/kg` : ''}
  ${cost.costPerKgGain ? `CA Artış Maliyeti: ${cost.costPerKgGain.toFixed(2)} TL/kg` : ''}

📦 Kuru Madde: ${totals.dmiKg.toFixed(1)} kg/gün
⚡ Enerji: ${totals.mePerDay.toFixed(1)} Mcal ME
🥩 Protein: ${totals.cpGrams.toFixed(0)} g CP

Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}
`
}
