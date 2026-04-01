import type { Ration } from '@/types'

/**
 * Professional Excel/CSV export with complete nutrient profile
 * Includes all macro/micro minerals, vitamins, protein fractions, optimizer notes, and assumptions
 */
export function exportRationToExcel(ration: Ration): void {
  const { profile, totals, ingredients, cost, requirements, optimizerNotes, solver } = ration

  // CSV formatında export (Excel'de açılabilir)
  const rows: string[][] = []

  // ===== HEADER =====
  rows.push(['=== TARPOL RASYON - PROFESYONEL RAPOR ==='])
  rows.push([`Oluşturulma: ${new Date(ration.createdAt).toLocaleString('tr-TR')}`])
  rows.push([`Rasyon ID: ${ration.id}`])
  rows.push([`Çözücü: ${solver === 'lp' ? 'LP (GLPK)' : solver === 'greedy' ? 'Greedy' : 'Bilinmiyor'}`])
  rows.push([])

  // ===== HAYVAN PROFILI =====
  rows.push(['HAYVAN PROFİLİ'])
  rows.push(['Tür', profile.species === 'cattle' ? 'Sığır' : profile.species === 'sheep' ? 'Koyun' : profile.species === 'goat' ? 'Keçi' : profile.species])
  rows.push(['Irk', profile.breed])
  rows.push(['Cinsiyet', profile.sex === 'female' ? 'Dişi' : profile.sex === 'male' ? 'Erkek' : 'Hadım'])
  rows.push(['Amaç', profile.purpose || ''])
  rows.push(['Laktasyon Evresi', profile.stage || ''])
  if (profile.productionPhase) rows.push(['Üretim Fazı', profile.productionPhase])
  rows.push(['Canlı Ağırlık (kg)', profile.weightKg.toString()])
  if (profile.milkYieldKgPerDay) {
    rows.push(['Süt Verimi (kg/gün)', profile.milkYieldKgPerDay.toString()])
  }
  if (profile.targetAdgKgPerDay) {
    rows.push(['Hedef Günlük CA Artışı (kg)', profile.targetAdgKgPerDay.toString()])
  }
  if (profile.pregnancyMonth) {
    rows.push(['Gebelik Ayı', profile.pregnancyMonth.toString()])
  }
  rows.push([])

  // ===== MALİYET ANALİZİ =====
  rows.push(['MALİYET ANALİZİ'])
  rows.push(['Günlük Yem Maliyeti (₺)', (cost.dailyFeedCostTL || 0).toFixed(2)])
  rows.push(['Aylık Yem Maliyeti (₺)', (cost.monthlyCostTL || 0).toFixed(2)])
  if (typeof cost.costPerKgMilk === 'number') {
    rows.push(['Yem Maliyeti/kg Süt (₺)', cost.costPerKgMilk.toFixed(2)])
  }
  if (typeof cost.costPerKgGain === 'number') {
    rows.push(['Yem Maliyeti/kg CA Artış (₺)', cost.costPerKgGain.toFixed(2)])
  }
  rows.push([])

  // ===== RASYON BİLEŞİMİ =====
  rows.push(['RASYON BİLEŞİMİ'])
  rows.push(['Yem Adı', 'Kategori', 'Miktar (kg yaş/gün)', 'KM (kg/gün)', 'KM Oranı (%)', 'Maliyet (₺/gün)'])
  ingredients.forEach((ing) => {
    const dm = ing.kgDMPerDay ?? 0
    const ratio = totals.dmiKg > 0 ? ((dm / totals.dmiKg) * 100).toFixed(1) : '0.0'
    const category = ing.feedCategory === 'forage' ? 'Kaba Yem' : ing.feedCategory === 'concentrate' ? 'Konsantre' : ing.feedCategory === 'mineral' ? 'Mineral' : ing.feedCategory || ''
    rows.push([
      ing.feedName,
      category,
      (ing.kgAsFedPerDay ?? 0).toFixed(2),
      dm.toFixed(2),
      ratio,
      (ing.costTL ?? 0).toFixed(2),
    ])
  })
  rows.push([])

  // ===== ENERJİ VE PROTEİN =====
  rows.push(['ENERJİ VE PROTEİN'])
  rows.push(['Besin', 'Gereksinim', 'Rasyon Toplamı', 'Karşılama (%)'])
  
  // DMI
  rows.push([
    'Kuru Madde Alımı (kg/gün)',
    requirements.dmiKg.toFixed(2),
    totals.dmiKg.toFixed(2),
    ((totals.dmiKg / requirements.dmiKg) * 100).toFixed(1)
  ])
  
  // Energy systems
  if (typeof requirements.nelMcal === 'number') {
    rows.push([
      'Enerji NEL (Mcal/gün)',
      requirements.nelMcal.toFixed(1),
      totals.mePerDay ? (totals.mePerDay * 0.65).toFixed(1) : '-',
      totals.mePerDay ? (((totals.mePerDay * 0.65) / requirements.nelMcal) * 100).toFixed(1) : '-'
    ])
  }
  
  rows.push([
    'Enerji ME (Mcal/gün)',
    requirements.meMcal.toFixed(1),
    totals.mePerDay.toFixed(1),
    ((totals.mePerDay / requirements.meMcal) * 100).toFixed(1)
  ])
  
  if (typeof requirements.nemMcal === 'number' && typeof totals.nemPerDay === 'number') {
    rows.push([
      'Enerji NEm (Mcal/gün)',
      requirements.nemMcal.toFixed(1),
      totals.nemPerDay.toFixed(1),
      ((totals.nemPerDay / requirements.nemMcal) * 100).toFixed(1)
    ])
  }
  
  if (typeof requirements.negMcal === 'number' && typeof totals.negPerDay === 'number') {
    rows.push([
      'Enerji NEg (Mcal/gün)',
      requirements.negMcal.toFixed(1),
      totals.negPerDay.toFixed(1),
      ((totals.negPerDay / requirements.negMcal) * 100).toFixed(1)
    ])
  }
  
  // Protein
  rows.push([
    'Ham Protein CP (g/gün)',
    requirements.cpGrams.toFixed(0),
    totals.cpGrams.toFixed(0),
    ((totals.cpGrams / requirements.cpGrams) * 100).toFixed(1)
  ])
  
  if (typeof requirements.mpGrams === 'number' && typeof totals.mpGrams === 'number') {
    rows.push([
      'Metabolik Protein MP (g/gün)',
      requirements.mpGrams.toFixed(0),
      totals.mpGrams.toFixed(0),
      ((totals.mpGrams / requirements.mpGrams) * 100).toFixed(1)
    ])
  }
  
  if (typeof requirements.rdpGrams === 'number' && typeof totals.rdpGrams === 'number') {
    rows.push([
      'Rumen Parçalanan Protein RDP (g/gün)',
      requirements.rdpGrams.toFixed(0),
      totals.rdpGrams.toFixed(0),
      ((totals.rdpGrams / requirements.rdpGrams) * 100).toFixed(1)
    ])
  }
  
  if (typeof requirements.rupGrams === 'number' && typeof totals.rupGrams === 'number') {
    rows.push([
      'Rumen Bypass Protein RUP (g/gün)',
      requirements.rupGrams.toFixed(0),
      totals.rupGrams.toFixed(0),
      ((totals.rupGrams / requirements.rupGrams) * 100).toFixed(1)
    ])
  }
  
  if (typeof totals.mcpGrams === 'number') {
    rows.push([
      'Mikrobiyal Ham Protein MCP (g/gün)',
      '-',
      totals.mcpGrams.toFixed(0),
      '-'
    ])
  }
  
  rows.push([])

  // ===== LİFLER VE HIZLI FERMENTE OLAN KARBONHİDRATLAR =====
  rows.push(['LİFLER VE KARBONHİDRATLAR'])
  rows.push(['Besin', 'Hedef (%KM)', 'Rasyon (%KM)', 'Durum'])
  
  rows.push([
    'NDF (Nötr Deterjan Lif)',
    `${requirements.ndfPercentMin}-${requirements.ndfPercentMax || requirements.ndfPercentMin}`,
    totals.ndfPercent.toFixed(1),
    totals.ndfPercent >= requirements.ndfPercentMin && totals.ndfPercent <= (requirements.ndfPercentMax || 100) ? 'OK' : 'DİKKAT'
  ])
  
  rows.push([
    'Nişasta',
    `Max ${requirements.starchPercentMax}`,
    totals.starchPercent.toFixed(1),
    totals.starchPercent <= requirements.starchPercentMax ? 'OK' : 'YÜKSEK'
  ])
  
  rows.push([
    'Şeker',
    `Max ${requirements.sugarPercentMax}`,
    totals.sugarPercent.toFixed(1),
    totals.sugarPercent <= requirements.sugarPercentMax ? 'OK' : 'YÜKSEK'
  ])
  
  rows.push([
    'Yağ',
    `Max ${requirements.fatPercentMax}`,
    totals.fatPercent.toFixed(1),
    totals.fatPercent <= requirements.fatPercentMax ? 'OK' : 'YÜKSEK'
  ])
  
  rows.push([])

  // ===== MAKRO MİNERALLER =====
  rows.push(['MAKRO MİNERALLER'])
  rows.push(['Mineral', 'Gereksinim (g/gün)', 'Rasyon (g/gün)', 'Karşılama (%)'])
  
  const macroMinerals = [
    { name: 'Kalsiyum (Ca)', req: requirements.caGrams, total: totals.caGrams },
    { name: 'Fosfor (P)', req: requirements.pGrams, total: totals.pGrams },
    { name: 'Magnezyum (Mg)', req: requirements.mgGrams, total: totals.mgGrams },
    { name: 'Sodyum (Na)', req: requirements.naGrams, total: totals.naGrams },
    { name: 'Potasyum (K)', req: requirements.kGrams, total: totals.kGrams },
    { name: 'Kükürt (S)', req: requirements.sGrams, total: totals.sGrams },
    { name: 'Klor (Cl)', req: requirements.clGrams, total: totals.clGrams },
  ]
  
  macroMinerals.forEach(m => {
    const pct = m.req > 0 ? ((m.total / m.req) * 100).toFixed(1) : '-'
    rows.push([m.name, m.req.toFixed(2), m.total.toFixed(2), pct])
  })
  
  // Ca:P Ratio
  const caPRatio = totals.pGrams > 0 ? (totals.caGrams / totals.pGrams).toFixed(2) : '-'
  rows.push(['Ca:P Oranı', '1.5-2.5 (hedef 2.0)', caPRatio, ''])
  
  // DCAD
  if (totals.dmiKg > 0) {
    const na_meq = (totals.naGrams / 23) * 1000
    const k_meq = (totals.kGrams / 39) * 1000
    const cl_meq = (totals.clGrams / 35.5) * 1000
    const s_meq = (totals.sGrams / 32) * 2 * 1000
    const dcad_total = na_meq + k_meq - cl_meq - s_meq
    const dcad = (dcad_total / totals.dmiKg).toFixed(0)
    rows.push(['DCAD (mEq/kg KM)', 'Faz-bağlı (150-450 süt)', dcad, ''])
  }
  
  rows.push([])

  // ===== İZ MİNERALLER =====
  if (
    typeof requirements.feMg === 'number' ||
    typeof requirements.znMg === 'number' ||
    typeof requirements.cuMg === 'number'
  ) {
    rows.push(['İZ MİNERALLER'])
    rows.push(['Mineral', 'Gereksinim (mg/gün)', 'Rasyon (mg/gün)', 'Karşılama (%)'])
    
    const traceMinerals = [
      { name: 'Demir (Fe)', req: requirements.feMg, total: totals.feMg },
      { name: 'Çinko (Zn)', req: requirements.znMg, total: totals.znMg },
      { name: 'Bakır (Cu)', req: requirements.cuMg, total: totals.cuMg },
      { name: 'Mangan (Mn)', req: requirements.mnMg, total: totals.mnMg },
      { name: 'Kobalt (Co)', req: requirements.coMg, total: totals.coMg },
      { name: 'İyot (I)', req: requirements.iMg, total: totals.iMg },
      { name: 'Selenyum (Se)', req: requirements.seMg, total: totals.seMg },
    ]
    
    traceMinerals.forEach(m => {
      if (typeof m.req === 'number' && m.req > 0) {
        const totalVal = typeof m.total === 'number' ? m.total : 0
        const pct = ((totalVal / m.req) * 100).toFixed(1)
        rows.push([m.name, m.req.toFixed(2), totalVal.toFixed(2), pct])
      }
    })
    
    rows.push([])
  }

  // ===== VİTAMİNLER =====
  if (
    typeof requirements.vitaminAIU === 'number' ||
    typeof requirements.vitaminDIU === 'number'
  ) {
    rows.push(['VİTAMİNLER (Yağda Eriyen)'])
    rows.push(['Vitamin', 'Gereksinim', 'Rasyon', 'Karşılama (%)'])
    
    const vitamins = [
      { name: 'Vitamin A (IU/gün)', req: requirements.vitaminAIU, total: totals.vitaminAIU },
      { name: 'Vitamin D (IU/gün)', req: requirements.vitaminDIU, total: totals.vitaminDIU },
      { name: 'Vitamin E (IU/gün)', req: requirements.vitaminEIU, total: totals.vitaminEIU },
      { name: 'Vitamin K (mg/gün)', req: requirements.vitaminKMg, total: totals.vitaminKMg },
    ]
    
    vitamins.forEach(v => {
      if (typeof v.req === 'number' && v.req > 0) {
        const totalVal = typeof v.total === 'number' ? v.total : 0
        const pct = ((totalVal / v.req) * 100).toFixed(1)
        rows.push([v.name, v.req.toFixed(0), totalVal.toFixed(0), pct])
      }
    })
    
    rows.push([])
  }

  // ===== OPTİMİZASYON NOTLARI =====
  if (optimizerNotes && optimizerNotes.length > 0) {
    rows.push(['OPTİMİZASYON NOTLARI'])
    optimizerNotes.forEach((note, idx) => {
      rows.push([`${idx + 1}.`, note])
    })
    rows.push([])
  }

  // ===== VARSAYIMLAR VE SINIRLAYICILAR =====
  rows.push(['VARSAYIMLAR VE SINIRLAYICILAR'])
  rows.push(['Açıklama', 'Değer'])
  rows.push(['NRC 2021 hesaplamalarında basitleştirmeler kullanılmıştır.', ''])
  rows.push(['Gerçek sahada kullanımdan önce hayvan beslemesi uzmanı onayı gereklidir.', ''])
  rows.push(['MP/RDP/RUP hesaplamaları enerji-limitli varsayımlar içerir.', ''])
  rows.push(['Trace mineral ve vitamin değerleri yem DB eksikse sıfır kabul edilir.', ''])
  rows.push(['DCAD hedefleri üretim fazına göre değişkendir (kuru dönem vs süt).', ''])
  rows.push([])

  // ===== CSV OLUŞTUR =====
  const csvContent = rows.map(row => 
    row.map(cell => {
      const cellStr = String(cell ?? '')
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    }).join(',')
  ).join('\n')

  // UTF-8 BOM ekle (Excel'de Türkçe karakterler için)
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `rasyon_${ration.id}_${new Date().getTime()}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function generateExcelShareText(ration: Ration): string {
  const { profile, cost, totals, ingredients } = ration

  let text = '📊 TARPOL RASYON RAPORU\n\n'
  
  text += `🐄 ${profile.breed} • ${profile.purpose || ''}\n`
  text += `⚖️ ${profile.weightKg} kg`
  if (profile.milkYieldKgPerDay) {
    text += ` • 🥛 ${profile.milkYieldKgPerDay} kg/gün`
  }
  text += '\n\n'

  text += `💰 GÜNLÜK MALİYET: ${(cost.dailyFeedCostTL || 0).toFixed(2)} ₺\n`
  text += `📈 KM Alımı: ${totals.dmiKg.toFixed(1)} kg/gün\n\n`

  text += '🌾 RASYON:\n'
  ingredients.forEach((ing, idx) => {
    const dm = ing.kgDMPerDay ?? 0
    const ratio = totals.dmiKg > 0 ? ((dm / totals.dmiKg) * 100).toFixed(1) : '0.0'
    text += `${idx + 1}. ${ing.feedName}: ${(ing.kgAsFedPerDay ?? 0).toFixed(1)} kg yaş (${ratio}% KM)\n`
  })

  text += '\n📱 TARPOL Rasyon ile oluşturuldu'
  
  return text
}
