/**
 * Risk uyarıları için detaylı açıklamalar
 */

export interface RiskExplanation {
  title: string
  explanation: string
  recommendation: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export const riskExplanations: Record<string, RiskExplanation> = {
  // ASIDOZ RİSKLERİ
  ACIDOSIS_HIGH: {
    title: 'Yüksek Asidoz Riski',
    explanation:
      'Rasyonda nişasta seviyesi yüksek ve/veya NDF (lif) seviyesi düşük. Bu durum rumen pH\'sını düşürerek subakut rumen asidozu (SARA) riskini artırır. SARA, iştah kaybı, süt veriminde düşüş ve sağlık sorunlarına yol açabilir.',
    recommendation:
      'Kaba yem oranını artırın (özellikle NDF kaynakları: yonca, kuru ot, silaj). Nişasta içeriği yüksek yemleri (mısır, buğday) azaltın. Tampon (sodyum bikarbonat) kullanımı düşünülebilir.',
    severity: 'high',
  },
  ACIDOSIS_MEDIUM: {
    title: 'Orta Asidoz Riski',
    explanation:
      'Nişasta/NDF dengesi ideal değil ancak kritik seviyede değil. Dikkatli takip gerektirir.',
    recommendation:
      'Kaba yem kalitesini ve miktarını kontrol edin. Yem geçişlerini kademeli yapın.',
    severity: 'medium',
  },

  // KETOZİS RİSKLERİ
  KETOSIS_HIGH: {
    title: 'Yüksek Ketozis Riski',
    explanation:
      'Özellikle doğum sonrası erken laktasyon döneminde enerji açığı riski yüksek. Hayvanın enerji ihtiyacı karşılanamıyor, vücut yağı hızla mobilize ediliyor ve bu durum ketozise yol açabilir.',
    recommendation:
      'Enerji yoğunluğu yüksek yemler ekleyin (propilen glikol, gliserin, yağ kaynakları). DMI\'ı artırmaya odaklanın. Veteriner kontrolü önerilir.',
    severity: 'high',
  },
  KETOSIS_MEDIUM: {
    title: 'Orta Ketozis Riski',
    explanation:
      'Enerji dengesi sınırda. Özellikle yüksek verimli hayvanlarda dikkat gerektirir.',
    recommendation:
      'Enerji kaynakları ekleyin, hayvanı yakından takip edin (idrar ketonu, kan testi).',
    severity: 'medium',
  },

  // TİMPANİ RİSKLERİ
  BLOAT_HIGH: {
    title: 'Yüksek Şişkinlik (Timpani) Riski',
    explanation:
      'Protein seviyesi yüksek ve NDF düşük. Özellikle taze baklagil (yonca, fiğ) ağırlıklı rasyonlarda köpüklü şişkinlik riski artar.',
    recommendation:
      'Kuru ot oranını artırın, taze yeşil yem kademeli verin. Anti-timpani preparatları kullanılabilir. Hayvanları açlıktan sonra direkt baklagil otlatmayın.',
    severity: 'high',
  },
  BLOAT_MEDIUM: {
    title: 'Orta Şişkinlik Riski',
    explanation: 'Protein/lif dengesi sınırda. Dikkatli yem yönetimi gerektirir.',
    recommendation: 'Kaba yem kalitesini ve otlatma düzenini kontrol edin.',
    severity: 'medium',
  },

  // MİNERAL DENGESİZLİK
  MINERAL_IMBALANCE_HIGH: {
    title: 'Yüksek Mineral Dengesizlik Riski',
    explanation:
      'Ca:P oranı ideal aralığın dışında (önerilen 1.5:1 - 2.5:1) veya DCAD (katyon-anyon dengesi) hedef aralığın dışında. Bu durum süt humması, metabolik bozukluklar ve mineral emilim sorunlarına yol açabilir.',
    recommendation:
      'Mineral premiks kullanın, Ca ve P kaynaklarını dengeleyin. Close-up rasyonlarda DCAD kontrolü kritiktir (anyonik tuz kullanımı). Veteriner/nutrisyonist danışın.',
    severity: 'high',
  },
  MINERAL_IMBALANCE_MEDIUM: {
    title: 'Orta Mineral Dengesizlik Riski',
    explanation: 'Mineral dengesi sınırda. İyileştirme yapılabilir.',
    recommendation: 'Mineral kaynaklarını gözden geçirin, gerekirse premiks kullanın.',
    severity: 'medium',
  },

  // SÜT YAĞ DÜŞÜKLÜĞÜ
  MILK_FAT_DEPRESSION_HIGH: {
    title: 'Süt Yağ Oranı Düşüklüğü Riski',
    explanation:
      'NDF seviyesi düşük ve/veya yağ seviyesi dengesiz. Bu durum rumen fermentasyonunu bozarak sütte yağ sentezini olumsuz etkiler.',
    recommendation:
      'Kaba yem (NDF) oranını artırın. Doymamış yağ kaynaklarını (pamuk tohumu, soya) sınırlayın. Fiziksel etkili NDF (peNDF) sağlayın.',
    severity: 'medium',
  },

  // GENEL UYARILAR
  DMI_LOW: {
    title: 'Düşük Kuru Madde Tüketimi',
    explanation:
      'Hesaplanan rasyon hayvanın beklenen DMI\'sının altında. Bu durum enerji ve besin açığına yol açabilir.',
    recommendation:
      'Yem kalitesini artırın, lezzetlendirici kullanın, su tüketimini kontrol edin. Hayvanın sağlık durumunu kontrol edin.',
    severity: 'medium',
  },
  DMI_HIGH: {
    title: 'Yüksek Kuru Madde Tüketimi',
    explanation: 'Hesaplanan DMI normalin üzerinde. Gerçekçi olmayabilir veya fazla yem tüketimi riski.',
    recommendation: 'Hedef DMI\'ı gözden geçirin, yem israfını kontrol edin.',
    severity: 'low',
  },

  COST_HIGH: {
    title: 'Yüksek Rasyon Maliyeti',
    explanation: 'Rasyon maliyeti hedef bütçenin üzerinde.',
    recommendation:
      'Alternatif yem kaynaklarını değerlendirin, ekonomik preset şablonlarına bakın.',
    severity: 'low',
  },
}

/**
 * Risk kodu için açıklama döndür
 */
export function getRiskExplanation(code: string): RiskExplanation | null {
  return riskExplanations[code] ?? null
}

/**
 * Tüm risk kodlarının listesini döndür
 */
export function getAllRiskCodes(): string[] {
  return Object.keys(riskExplanations)
}
