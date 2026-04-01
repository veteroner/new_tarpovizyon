import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Share2, AlertTriangle, Sparkles, FileSpreadsheet, Lightbulb, PieChart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import { useRationStore } from '@/store/rationStore'
import { getFeedById } from '@/data/feedsV2'
import { useRationWizardStore } from '@/store/rationWizardStore'
import { getCaPRatioTarget, getDcadTarget } from '@/engine/nutritionTargets'
import type { RiskWarning, Alternative } from '@/types'
import { formatRiskWarning } from '@/utils/riskFormatter'
import { explainRation, suggestAlternatives } from '@/services/ai/huggingface'
import { useUIStore } from '@/store/uiStore'
import { exportRationToPDF, generateShareText } from '@/utils/pdfExport'
import { exportRationToExcel } from '@/utils/excelExport'
import { calculateEnhancedCost } from '@/utils/costAnalysis'
import { getEffectiveMaxAsFedKgPerDay } from '@/engine/optimizer/feedConstraints'
import Accordion from '@/components/Accordion'
import { getRiskExplanation } from '@/data/riskExplanations'
import OptimizerDiagnosticsPanel from '@/components/OptimizerDiagnosticsPanel'
import logger from '@/utils/logger'
import { trackEvent } from '@/utils/analytics'
import { Capacitor } from '@capacitor/core'
import { admobRewarded } from '@/services/ads/admobRewarded'
import {
  consumeAiCredit,
  consumeExportCredit,
  getAiCredits,
  getExportCredits,
  grantAiCredits,
  grantExportCredits,
  hasAiCredits,
  hasExportCredits,
} from '@/services/ads/rewardCredits'
// import { useAppConfig, useFeature } from '@/contexts/ConfigContext'

export default function RationResultV2() {
  // Config available for future feature flags
  // const config = useAppConfig()
  // const canExportPDF = useFeature('exportPDF')
  // const canExportExcel = useFeature('exportExcel')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ration = useRationStore((state) => state.rations.find((r) => r.id === id))
  const loadFromRation = useRationWizardStore((s) => s.loadFromRation)
  const updateRation = useRationStore((s) => s.updateRation)
  const showToast = useUIStore((s) => s.showToast)

  const isNative = Capacitor.isNativePlatform()
  const exportCredits = isNative ? getExportCredits() : null
  const aiCredits = isNative ? getAiCredits() : null

  const [loadingAiExplanation, setLoadingAiExplanation] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [alternatives, setAlternatives] = useState<Alternative[]>([])
  const [loadingAlternatives, setLoadingAlternatives] = useState(false)

  // Gelişmiş maliyet analizi - ration varsa hesapla
  const enhancedCost = useMemo(() => 
    ration ? calculateEnhancedCost(ration.cost.dailyFeedCostTL, ration.profile) : null,
    [ration]
  )

  // Check for critical mineral deficiency - MUST be before early return (Rules of Hooks)
  const hasMineralDeficiency = useMemo(() => {
    if (!ration) return false
    const hasMineralFeed = ration.ingredients.some((ing) => {
      const feed = getFeedById(ing.feedId)
      return feed?.category === 'mineral'
    })
    const hasMineralWarning = ration.optimizerNotes?.some((note) => 
      note.includes('mineral/premiks yok') || note.includes('KRİTİK')
    )
    return !hasMineralFeed || hasMineralWarning
  }, [ration])

  // Load alternatives if not already in ration
  useEffect(() => {
    if (!ration) return

    if (ration.alternatives && ration.alternatives.length > 0) {
      setAlternatives(ration.alternatives)
    } else {
      // Generate alternatives from available feeds
      setLoadingAlternatives(true)
      const availableFeedIds = ration.ingredients.map((ing) => ing.feedId)
      suggestAlternatives(ration, availableFeedIds, ration.userEnteredPrices)
        .then((alts) => {
          setAlternatives(alts)
          // Optionally persist to ration
          if (alts.length > 0) {
            updateRation(ration.id, { alternatives: alts })
          }
        })
        .catch((err) => {
          logger.warn('Failed to load alternatives:', err)
        })
        .finally(() => {
          setLoadingAlternatives(false)
        })
    }
  }, [ration, updateRation])

  if (!ration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Rasyon bulunamadı</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-green-600 hover:underline"
          >
            Ana sayfaya dön
          </button>
        </div>
      </div>
    )
  }

  const { profile, requirements, totals, ingredients, cost, riskScore, aiExplanation, solver, optimizerNotes, optimizerDiagnostics } = ration

  const handleExplainWithAI = async () => {
    const runExplain = async () => {
      setLoadingAiExplanation(true)
      try {
        const explanation = await explainRation(ration, profile)
        updateRation(ration.id, { aiExplanation: explanation })

        // Track AI explanation usage
        trackEvent('ai_explain_used', {
          animal_type: profile.species,
          purpose: profile.purpose,
        })

        if (Capacitor.isNativePlatform()) {
          consumeAiCredit()
        }

        showToast({
          type: 'success',
          message: '✨ AI açıklaması oluşturuldu!',
        })
      } catch (err) {
        logger.error('AI explanation failed:', err)
        showToast({
          type: 'error',
          message: 'AI açıklaması oluşturulamadı. Lütfen tekrar deneyin.',
        })
      } finally {
        setLoadingAiExplanation(false)
      }
    }

    // Web: keep existing free behavior. Native: gate by credits + rewarded.
    if (Capacitor.isNativePlatform() && !hasAiCredits()) {
      showToast({
        type: 'info',
        message: '📺 AI açıklaması için reklam açılıyor…',
      })

      const shown = await admobRewarded.showRewardedAd({
        placement: 'ai_explain',
        onReward: async () => {
          grantAiCredits(5)
          await runExplain()
        },
      })

      if (!shown) {
        showToast({
          type: 'error',
          message: 'Reklam yüklenemedi. Lütfen tekrar deneyin.',
        })
      }

      return
    }

    await runExplain()
  }

  const handleDownloadPDF = async () => {
    const runPdfExport = async () => {
      setExportingPDF(true)
      try {
        await exportRationToPDF(ration)

        // Track PDF export
        trackEvent('export_pdf', {
          animal_type: profile.species,
          purpose: profile.purpose,
          cost: cost.dailyFeedCostTL,
        })

        if (Capacitor.isNativePlatform()) {
          consumeExportCredit()
        }

        showToast({
          type: 'success',
          message: '📄 PDF başarıyla indirildi!',
        })
      } catch (err) {
        logger.error('PDF export failed:', err)
        showToast({
          type: 'error',
          message: 'PDF oluşturulamadı. Lütfen tekrar deneyin.',
        })
      } finally {
        setExportingPDF(false)
      }
    }

    // Web: keep existing free behavior. Native: gate by credits + rewarded.
    if (Capacitor.isNativePlatform() && !hasExportCredits()) {
      showToast({
        type: 'info',
        message: '📺 PDF indirmek için reklam açılıyor…',
      })

      const shown = await admobRewarded.showRewardedAd({
        placement: 'export_pdf',
        onReward: async () => {
          grantExportCredits(3)
          await runPdfExport()
        },
      })

      if (!shown) {
        showToast({
          type: 'error',
          message: 'Reklam yüklenemedi. Lütfen tekrar deneyin.',
        })
      }

      return
    }

    await runPdfExport()
  }

  const handleShare = async () => {
    const shareData = {
      title: 'TARPOL Rasyon',
      text: generateShareText(ration),
      url: window.location.href,
    }

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        showToast({
          type: 'success',
          message: '✅ Paylaşıldı!',
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          logger.error('Share failed:', err)
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href)
        showToast({
          type: 'info',
          message: '🔗 Link kopyalandı!',
        })
      } catch (err) {
        logger.error('Clipboard copy failed:', err)
        showToast({
          type: 'error',
          message: 'Link kopyalanamadı.',
        })
      }
    }
  }

  const handleExportExcel = () => {
    const runExcelExport = () => {
      try {
        exportRationToExcel(ration)

        // Track Excel export
        trackEvent('export_excel', {
          animal_type: profile.species,
          purpose: profile.purpose,
          cost: cost.dailyFeedCostTL,
        })

        if (Capacitor.isNativePlatform()) {
          consumeExportCredit()
        }

        showToast({
          type: 'success',
          message: '📊 Excel dosyası indirildi!',
        })
      } catch (err) {
        logger.error('Excel export failed:', err)
        showToast({
          type: 'error',
          message: 'Excel dosyası oluşturulamadı.',
        })
      }
    }

    // Web: keep existing free behavior. Native: gate by credits + rewarded.
    if (Capacitor.isNativePlatform() && !hasExportCredits()) {
      showToast({
        type: 'info',
        message: '📺 Excel indirmek için reklam açılıyor…',
      })

      admobRewarded
        .showRewardedAd({
          placement: 'export_excel',
          onReward: () => {
            grantExportCredits(3)
            runExcelExport()
          },
        })
        .then((shown) => {
          if (!shown) {
            showToast({
              type: 'error',
              message: 'Reklam yüklenemedi. Lütfen tekrar deneyin.',
            })
          }
        })
        .catch((err) => {
          logger.warn('Rewarded ad failed:', err)
          showToast({
            type: 'error',
            message: 'Reklam yüklenemedi. Lütfen tekrar deneyin.',
          })
        })

      return
    }

    runExcelExport()
  }

  // Besin karşılama yüzdeleri
  const energyPercent = (totals.mePerDay / requirements.meMcal) * 100
  const nemPercent =
    typeof totals.nemPerDay === 'number' && typeof requirements.nemMcal === 'number'
      ? (totals.nemPerDay / requirements.nemMcal) * 100
      : null
  const negPercent =
    typeof totals.negPerDay === 'number' && typeof requirements.negMcal === 'number'
      ? (totals.negPerDay / requirements.negMcal) * 100
      : null
  const proteinPercent = (totals.cpGrams / requirements.cpGrams) * 100
  const dmiPercent = (totals.dmiKg / requirements.dmiKg) * 100

  const solverLabel = solver === 'lp' ? 'LP (GLPK)' : solver === 'greedy' ? 'Greedy' : '—'
  const solverBadgeClass = solver === 'lp'
    ? 'bg-green-100 text-green-800 border-green-300'
    : solver === 'greedy'
      ? 'bg-orange-100 text-orange-800 border-orange-300'
      : 'bg-gray-100 text-gray-800 border-gray-300'

  const dmiOutOfBand = dmiPercent < 90 || dmiPercent > 105
  const showOptimizerWarning = solver === 'greedy' || dmiOutOfBand
  const hasOptimizerNotes = Boolean(optimizerNotes && optimizerNotes.length > 0)
  const showOptimizerNote = showOptimizerWarning || hasOptimizerNotes

  // Mineral göstergeleri
  const caPRatio = totals.pGrams > 0 ? totals.caGrams / totals.pGrams : null
  const dcad = (() => {
    if (!totals.dmiKg || totals.dmiKg <= 0) return null
    const na_meq = (totals.naGrams / 23) * 1000
    const k_meq = (totals.kGrams / 39) * 1000
    const cl_meq = (totals.clGrams / 35.5) * 1000
    const s_meq = (totals.sGrams / 32) * 2 * 1000
    const dcad_total = na_meq + k_meq - cl_meq - s_meq
    return dcad_total / totals.dmiKg
  })()

  const dcadTarget = getDcadTarget(profile)
  const caPTarget = getCaPRatioTarget(profile)
  const dcadTargetText = dcadTarget.label
  const caPTargetText = caPTarget.label

  const dcadBadge = (() => {
    if (dcad == null || !Number.isFinite(dcad)) return 'bg-gray-100 text-gray-700'
    return dcad < dcadTarget.min || dcad > dcadTarget.max
      ? 'bg-orange-100 text-orange-800'
      : 'bg-green-100 text-green-800'
  })()

  const caPBadge = (() => {
    if (caPRatio == null || !Number.isFinite(caPRatio)) return 'bg-gray-100 text-gray-700'
    return caPRatio < caPTarget.min || caPRatio > caPTarget.max
      ? 'bg-orange-100 text-orange-800'
      : 'bg-green-100 text-green-800'
  })()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Geri</span>
            </button>
            <div className="flex items-center gap-2">
              <button 
                className="p-2 hover:bg-gray-100 rounded-lg"
                onClick={handleShare}
                title="Paylaş"
              >
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                onClick={handleDownloadPDF}
                disabled={exportingPDF}
                title={isNative ? `PDF İndir (${exportCredits} hak)` : 'PDF İndir'}
              >
                <Download className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                className="p-2 hover:bg-gray-100 rounded-lg"
                onClick={handleExportExcel}
                title={isNative ? `Excel İndir (${exportCredits} hak)` : 'Excel İndir'}
              >
                <FileSpreadsheet className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="ration-result" className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* CTA: Rasyonu düzenle */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col justify-between">
            <div className="mb-3">
              <p className="font-semibold text-gray-900 mb-1">Gelişmiş Düzenleme</p>
              <p className="text-sm text-gray-600">Yem miktarlarını ayarlayın ve yeniden optimize edin.</p>
            </div>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => navigate(`/rasyon/ration/${ration.id}/edit`)}
            >
              Rasyonu Düzenle
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col justify-between">
            <div className="mb-3">
              <p className="font-semibold text-gray-900 mb-1">Yem Setini Değiştir</p>
              <p className="text-sm text-gray-600">Sihirbaza dönüp farklı yemler deneyin.</p>
            </div>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => {
                loadFromRation(ration)
                navigate('/rasyon/wizard/feeds')
              }}
            >
              Yem Setini Düzenle
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col justify-between">
            <div className="mb-3">
              <p className="font-semibold text-gray-900 mb-1">
                Performans Değerlendir
                {ration.evaluations && ration.evaluations.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-green-600">
                    ({ration.evaluations.length} kayıt)
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-600">Gerçek performansı tahminle karşılaştırın.</p>
            </div>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => navigate('/rasyon/evaluation')}
            >
              Değerlendirmeye Git
            </button>
          </div>
        </div>
        {/* Hayvan Bilgisi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Hayvan Profili</h2>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold border ${solverBadgeClass}`}>
              Çözücü: {solverLabel}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Tür</p>
              <p className="font-medium text-gray-900 capitalize">
                {profile.species === 'cattle' ? 'Sığır' : profile.species === 'sheep' ? 'Koyun' : profile.species === 'goat' ? 'Keçi' : profile.species}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Irk</p>
              <p className="font-medium text-gray-900 capitalize">{profile.breed}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Canlı Ağırlık</p>
              <p className="font-medium text-gray-900">{profile.weightKg} kg</p>
            </div>
            {profile.milkYieldKgPerDay && (
              <div>
                <p className="text-xs text-gray-500">Süt Verimi</p>
                <p className="font-medium text-gray-900">{profile.milkYieldKgPerDay} kg/gün</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Açıklama (varsa) */}
        {aiExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-6"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-lg font-semibold text-gray-900">🤖 AI Açıklama</h2>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-semibold">
                  Hazır
                </span>
                <button
                  className="btn-secondary !text-xs"
                  onClick={() => navigator.clipboard.writeText(aiExplanation.summary).catch(() => {})}
                  title="Özeti kopyala"
                >
                  Kopyala
                </button>
              </div>
            </div>
            <p className="text-gray-700 mb-4">{aiExplanation.summary}</p>

            {aiExplanation.criticalPoints.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">⚠️ Dikkat Edilecekler:</p>
                <ul className="space-y-1">
                  {aiExplanation.criticalPoints.map((point, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-purple-500 mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiExplanation.recommendations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">💡 Öneriler:</p>
                <ul className="space-y-1">
                  {aiExplanation.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {/* AI Açıklama Butonu (eğer AI explanation yoksa) */}
        {!aiExplanation && (
          <div className="card bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Bu rasyon neden seçildi?
                  </h3>
                  <p className="text-xs text-gray-600">
                    AI ile rasyonun neden bu şekilde oluşturulduğunu öğrenin.
                  </p>
                </div>
              </div>
              <button
                onClick={handleExplainWithAI}
                disabled={loadingAiExplanation}
                className="btn-secondary whitespace-nowrap"
              >
                {loadingAiExplanation
                  ? 'Üretiliyor...'
                  : isNative
                    ? `🤖 AI Açıkla (${aiCredits} hak)`
                    : '🤖 AI Açıkla'}
              </button>
            </div>
          </div>
        )}

        {/* Sağlık Skoru (varsa) */}
        {riskScore && (() => {
          const healthScore = 100 - riskScore.overall
          const getCategoryInfo = (severity: string) => {
            switch (severity) {
              case 'low':
                return { label: 'Mükemmel Sağlık', color: 'bg-green-100 text-green-800 border-green-300' }
              case 'medium':
                return { label: 'İyi Sağlık', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
              case 'high':
                return { label: 'Dikkat Gerekli', color: 'bg-orange-100 text-orange-800 border-orange-300' }
              case 'critical':
                return { label: 'Kritik Durum', color: 'bg-red-100 text-red-800 border-red-300' }
              default:
                return { label: 'Bilinmiyor', color: 'bg-gray-100 text-gray-800 border-gray-300' }
            }
          }
          const category = getCategoryInfo(riskScore.severity)
          return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Sağlık Risk Tahmini</h2>
                  <p className="text-xs text-gray-500 mb-2">Kural tabanlı tahmini uyarı sistemi (kesin tanı değildir; uzman kontrolü gerekir)</p>
                  <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium border ${category.color}`}>
                    {category.label}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{healthScore}/100</div>
                  <p className="text-xs text-gray-500 mt-1">Sağlık Puanı</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      riskScore.severity === 'low' ? 'bg-green-500' :
                      riskScore.severity === 'moderate' ? 'bg-yellow-500' :
                      riskScore.severity === 'high' ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Asidoz</p>
                  <p className="font-semibold text-gray-900">{100 - riskScore.acidosis}/100</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ketozis</p>
                  <p className="font-semibold text-gray-900">{100 - riskScore.ketosis}/100</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Timpani</p>
                  <p className="font-semibold text-gray-900">{100 - riskScore.bloat}/100</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mineral Dengesi</p>
                  <p className="font-semibold text-gray-900">{100 - riskScore.mineralImbalance}/100</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Süt Yağı</p>
                  <p className="font-semibold text-gray-900">{100 - riskScore.milkFatDepression}/100</p>
                </div>
              </div>

              {riskScore.warnings.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-3">⚠️ Dikkat Edilmesi Gerekenler:</p>
                  <div className="space-y-2">
                    {riskScore.warnings.map((warning: RiskWarning, idx: number) => {
                      const explanation = getRiskExplanation(warning.code)
                      
                      return (
                        <Accordion
                          key={idx}
                          title={
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" />
                              <span className="text-sm font-medium text-gray-900">{formatRiskWarning(warning)}</span>
                            </div>
                          }
                        >
                          {explanation ? (
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="font-medium text-gray-900 mb-1">📋 Açıklama:</p>
                                <p className="text-gray-700">{explanation.explanation}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 mb-1">💡 Öneri:</p>
                                <p className="text-gray-700">{explanation.recommendation}</p>
                              </div>
                              <div className="pt-2 border-t border-gray-200">
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                    explanation.severity === 'critical'
                                      ? 'bg-red-100 text-red-800'
                                      : explanation.severity === 'high'
                                        ? 'bg-orange-100 text-orange-800'
                                        : explanation.severity === 'medium'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {explanation.severity === 'critical' ? 'Kritik' : 
                                   explanation.severity === 'high' ? 'Yüksek' :
                                   explanation.severity === 'medium' ? 'Orta' : 'Düşük'} Önem
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">Bu uyarı için detaylı açıklama henüz eklenmemiş.</p>
                          )}
                        </Accordion>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* CRITICAL: Mineral Deficiency Warning */}
        {hasMineralDeficiency && (
          <div className="rounded-xl p-5 mb-6 border-2 border-red-300 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-0.5 text-red-600" size={24} />
              <div className="flex-1">
                <p className="text-base font-bold text-red-900 mb-2">
                  ⚠️ KRİTİK: Mineral/Premiks Eksikliği Tespit Edildi!
                </p>
                <p className="text-sm text-red-800 mb-3">
                  Bu rasyon <strong>mineral veya vitamin premiksi içermiyor</strong>. 
                  Hayvan sağlığı için <strong>mutlaka</strong> aşağıdaki maddelerden en az birini ekleyin:
                </p>
                <ul className="text-sm text-red-800 space-y-1 list-disc list-inside mb-3">
                  <li><strong>Mineral Vitamin Premiksi</strong> (en önerilen - tüm mineraller + vitaminler)</li>
                  <li><strong>Kireçtaşı/Kalsiyum Karbonat</strong> (Ca dengesi için)</li>
                  <li><strong>Dikalsiyum Fosfat</strong> (Ca ve P dengesi için)</li>
                  <li><strong>Tuz (NaCl)</strong> (Na ve Cl için - zorunlu)</li>
                  <li><strong>Magnezyum Oksit</strong> (süt humması önleme)</li>
                </ul>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      loadFromRation(ration)
                      navigate('/rasyon/wizard/feeds')
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    🔧 Mineral Ekle (Wizard)
                  </button>
                  <button
                    onClick={() => navigate('/rasyon/feeds')}
                    className="px-4 py-2 bg-white border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                  >
                    📚 Yem Kütüphanesi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Optimizasyon Uyarısı */}
        {showOptimizerNote && (
          <div
            className={`rounded-xl p-4 mb-6 border ${
              showOptimizerWarning
                ? 'bg-orange-50 border-orange-200'
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`shrink-0 mt-0.5 ${showOptimizerWarning ? 'text-orange-600' : 'text-blue-600'}`}
                size={20}
              />
              <div>
                <p className={`text-sm font-semibold ${showOptimizerWarning ? 'text-orange-900' : 'text-blue-900'}`}>
                  Optimizasyon Notu
                </p>
                <p className={`text-sm mt-1 ${showOptimizerWarning ? 'text-orange-800' : 'text-blue-800'}`}>
                  {showOptimizerWarning
                    ? 'Bu rasyon, kısıtlar nedeniyle tam optimum olmayabilir. Yem miktarlarını ayarlayın ve yeniden optimize edin.'
                    : 'Bilgi amaçlı notlar (optimizasyon bazı yemleri 0 seçebilir).'}
                </p>
                {optimizerNotes && optimizerNotes.length > 0 && (
                  <ul className={`mt-2 space-y-1 text-sm list-disc list-inside ${showOptimizerWarning ? 'text-orange-800' : 'text-blue-800'}`}>
                    {optimizerNotes.slice(0, 6).map((n, idx) => (
                      <li key={idx}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Besin Karşılama */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Besin Karşılama</h2>
          <div className="space-y-4">
            {/* Enerji */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Enerji (ME)</span>
                <span className="font-medium">
                  {totals.mePerDay.toFixed(1)} / {requirements.meMcal.toFixed(1)} Mcal
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    energyPercent >= 95 ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(energyPercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{energyPercent.toFixed(0)}% karşılandı</p>
            </div>

            {/* Beef Net Energy (optional) */}
            {typeof totals.nemPerDay === 'number' && typeof requirements.nemMcal === 'number' && nemPercent != null && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Enerji (NEm)</span>
                  <span className="font-medium">
                    {totals.nemPerDay.toFixed(1)} / {requirements.nemMcal.toFixed(1)} Mcal
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      nemPercent >= 95 ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(nemPercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{nemPercent.toFixed(0)}% karşılandı</p>
              </div>
            )}

            {typeof totals.negPerDay === 'number' && typeof requirements.negMcal === 'number' && negPercent != null && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Enerji (NEg)</span>
                  <span className="font-medium">
                    {totals.negPerDay.toFixed(1)} / {requirements.negMcal.toFixed(1)} Mcal
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      negPercent >= 95 ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(negPercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{negPercent.toFixed(0)}% karşılandı</p>
              </div>
            )}

            {/* Protein */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Protein (CP)</span>
                <span className="font-medium">
                  {totals.cpGrams.toFixed(0)} / {requirements.cpGrams.toFixed(0)} g
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    proteinPercent >= 95 ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(proteinPercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{proteinPercent.toFixed(0)}% karşılandı</p>
            </div>

            {/* Protein fractions (optional: MP/RDP/RUP/MCP) */}
            {typeof totals.mpGrams === 'number' && typeof requirements.mpGrams === 'number' && (
              <div className="pt-2 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">MP</span>
                      <span className="font-medium">
                        {totals.mpGrams.toFixed(0)} / {requirements.mpGrams.toFixed(0)} g
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          (totals.mpGrams / requirements.mpGrams) * 100 >= 95 ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min((totals.mpGrams / requirements.mpGrams) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  {typeof totals.rdpGrams === 'number' && typeof requirements.rdpGrams === 'number' && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">RDP</span>
                        <span className="font-medium">
                          {totals.rdpGrams.toFixed(0)} / {requirements.rdpGrams.toFixed(0)} g
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            (totals.rdpGrams / requirements.rdpGrams) * 100 >= 90 ? 'bg-green-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${Math.min((totals.rdpGrams / requirements.rdpGrams) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {typeof totals.rupGrams === 'number' && typeof requirements.rupGrams === 'number' && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">RUP</span>
                        <span className="font-medium">
                          {totals.rupGrams.toFixed(0)} / {requirements.rupGrams.toFixed(0)} g
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            (totals.rupGrams / requirements.rupGrams) * 100 >= 90 ? 'bg-green-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${Math.min((totals.rupGrams / requirements.rupGrams) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {typeof totals.mcpGrams === 'number' && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">MCP</span>
                        <span className="font-medium">{totals.mcpGrams.toFixed(0)} g</span>
                      </div>
                      <p className="text-xs text-gray-400">Mikrobiyal protein</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DMI */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Kuru Madde Tüketimi</span>
                <span className="font-medium">
                  {totals.dmiKg.toFixed(1)} / {requirements.dmiKg.toFixed(1)} kg
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    dmiPercent >= 90 && dmiPercent <= 105 ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(dmiPercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{dmiPercent.toFixed(0)}% karşılandı</p>
            </div>

            {/* NDF, Nişasta, Yağ */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs text-gray-500">NDF</p>
                <p className="font-medium text-gray-900">
                  {totals.ndfPercent.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">
                  {requirements.ndfPercentMin}-{requirements.ndfPercentMax}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Nişasta</p>
                <p className="font-medium text-gray-900">
                  {totals.starchPercent.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">max {requirements.starchPercentMax}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Yağ</p>
                <p className="font-medium text-gray-900">
                  {totals.fatPercent.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">max {requirements.fatPercentMax}%</p>
              </div>
            </div>

            {/* DCAD ve Ca:P */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">DCAD</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dcadBadge}`}>
                    {dcad == null ? '—' : `${dcad.toFixed(0)} mEq/kg DM`}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{dcadTargetText}</p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">Ca:P</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${caPBadge}`}>
                    {caPRatio == null ? '—' : caPRatio.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{caPTargetText}</p>
              </div>
            </div>
          </div>
        </div>

        {/* İçerikler */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rasyon İçerikleri</h2>
          <p className="text-xs text-gray-500 mb-4">
            Miktarlar <span className="font-medium">taze kg/gün (as-fed)</span> olarak gösterilir. Sağdaki KM (kuru madde)
            değeri, yemlerin gerçek tüketim karşılaştırması için daha anlamlıdır.
          </p>
          <div className="space-y-3">
            {ingredients.map((ing) => {
              const feed = getFeedById(ing.feedId)
              const category = ing.feedCategory ?? feed?.category
              const dmPercent = feed?.dmPercent
              const dmKg = typeof dmPercent === 'number' ? (ing.kgAsFedPerDay * dmPercent) / 100 : null
              const dmSharePct = dmKg != null && totals.dmiKg > 0 ? (dmKg / totals.dmiKg) * 100 : null

              const maxAllowedAsFed = feed ? getEffectiveMaxAsFedKgPerDay(feed, requirements, profile) : undefined
              const exceedsMax = typeof maxAllowedAsFed === 'number' && ing.kgAsFedPerDay > maxAllowedAsFed * 1.02
              return (
                <div
                  key={ing.feedId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{ing.feedName}</p>
                    <p className="text-xs text-gray-500">
                      {category === 'forage' ? '🌾 Kaba Yem' : category === 'concentrate' ? '🌽 Konsantre' : '💊 Mineral'}
                    </p>
                    {dmKg != null && (
                      <p className="text-xs text-gray-500 mt-1">
                        KM: <span className="font-medium">{dmKg.toFixed(1)} kg</span>
                        {dmSharePct != null && (
                          <>
                            {' '}
                            (<span className="font-medium">%{dmSharePct.toFixed(0)}</span> DM payı)
                          </>
                        )}
                      </p>
                    )}
                    {typeof maxAllowedAsFed === 'number' && !exceedsMax && (
                      <p className="text-xs text-gray-400 mt-1">
                        Üst sınır: ≤ {maxAllowedAsFed.toFixed(1)} kg as-fed / gün
                      </p>
                    )}
                    {exceedsMax && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ Üst sınır aşılıyor (hedef: ≤ {maxAllowedAsFed!.toFixed(1)} kg as-fed / gün)
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {ing.kgAsFedPerDay.toFixed(1)} kg
                    </p>
                    <p className="text-xs text-gray-500">{ing.costTL.toFixed(2)} TL</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Maliyet */}
        {enhancedCost && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Maliyet Analizi</h2>
            </div>

            {/* Temel Maliyet Göstergeleri */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-600">Günlük Yem</p>
                <p className="text-xl font-bold text-gray-900">
                  {cost.dailyFeedCostTL.toFixed(2)} TL
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Toplam Günlük</p>
                <p className="text-xl font-bold text-gray-900">
                  {enhancedCost.totalDailyCostTL.toFixed(2)} TL
                </p>
              </div>
              {cost.costPerKgMilk && (
                <div>
                  <p className="text-xs text-gray-600">Süt Maliyeti</p>
                  <p className="text-xl font-bold text-gray-900">
                    {(enhancedCost.totalDailyCostTL / profile.milkYieldKgPerDay!).toFixed(2)} TL/kg
                  </p>
                </div>
              )}
            <div>
              <p className="text-xs text-gray-600">Aylık</p>
              <p className="text-xl font-bold text-gray-900">
                {enhancedCost.totalMonthlyCostTL.toFixed(2)} TL
              </p>
            </div>
          </div>

          {/* Maliyet Dağılımı */}
          <Accordion 
            title={
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  📊 Maliyet Dağılımı Detayı
                </span>
                <span className="text-xs text-gray-500">({enhancedCost.benchmarkSource})</span>
              </div>
            }
          >
            <div className="space-y-3">
              {/* Progress Bar - Yem */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">🌾 Yem</span>
                  <span className="font-medium text-gray-900">
                    {enhancedCost.breakdown.feedCostTL.toFixed(2)} TL ({(enhancedCost.feedCostRatio * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-green-500" 
                    style={{ width: `${enhancedCost.feedCostRatio * 100}%` }}
                  />
                </div>
              </div>

              {/* Progress Bar - İşçilik */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">👷 İşçilik</span>
                  <span className="font-medium text-gray-900">
                    {enhancedCost.breakdown.laborCostTL.toFixed(2)} TL
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-blue-500" 
                    style={{ width: `${(enhancedCost.breakdown.laborCostTL / enhancedCost.totalDailyCostTL * 100).toFixed(0)}%` }}
                  />
                </div>
              </div>

              {/* Progress Bar - Enerji */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">⚡ Enerji</span>
                  <span className="font-medium text-gray-900">
                    {enhancedCost.breakdown.energyCostTL.toFixed(2)} TL
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-yellow-500" 
                    style={{ width: `${(enhancedCost.breakdown.energyCostTL / enhancedCost.totalDailyCostTL * 100).toFixed(0)}%` }}
                  />
                </div>
              </div>

              {/* Diğer Maliyetler (Compact) */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Sağlık</p>
                  <p className="text-sm font-medium">{enhancedCost.breakdown.healthCostTL.toFixed(2)} TL</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Amortisman</p>
                  <p className="text-sm font-medium">{enhancedCost.breakdown.depreciationCostTL.toFixed(2)} TL</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Diğer</p>
                  <p className="text-sm font-medium">{enhancedCost.breakdown.otherCostTL.toFixed(2)} TL</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 pt-2 border-t">
                ℹ️ Toplam maliyet, sektör benchmarklarına göre tahmin edilmiştir. Gerçek değerler işletmenize göre değişiklik gösterebilir.
              </p>
            </div>
          </Accordion>
          </div>
        )}

        {/* Optimizer Diagnostics (shadow prices, binding constraints) */}
        {optimizerDiagnostics && optimizerDiagnostics.shadowPrices && optimizerDiagnostics.shadowPrices.length > 0 && (
          <OptimizerDiagnosticsPanel diagnostics={optimizerDiagnostics} />
        )}

        {/* Alternatif Yem Önerileri */}
        {alternatives.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-900">Alternatif Yem Önerileri</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Girdiğiniz fiyatlar baz alınarak, mevcut rasyondaki yemlere benzer besin profili ve daha uygun fiyatlı alternatifler:
            </p>
            {ration.userEnteredPrices && Object.keys(ration.userEnteredPrices).length === 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>İpucu:</strong> Wizard'da yem fiyatlarını girerek daha doğru alternatif önerileri alabilirsiniz.
                </p>
              </div>
            )}
            <div className="space-y-3">
              {alternatives.slice(0, 6).map((alt, idx) => {
                const feed = getFeedById(alt.feedId)
                return (
                  <div
                    key={`${alt.feedId}-${idx}`}
                    className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{alt.feedName}</p>
                        {feed && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {feed.category === 'forage' ? '🌾 Kaba Yem' : feed.category === 'concentrate' ? '🌽 Konsantre' : '💊 Mineral'}
                          </p>
                        )}
                      </div>
                      {alt.potentialCostSaving && alt.potentialCostSaving > 0 && (
                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap">
                          -{alt.potentialCostSaving.toFixed(2)} TL/gün
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{alt.reason}</p>
                    {alt.impactOnNutrients && (
                      <p className="text-xs text-gray-600 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                        {alt.impactOnNutrients}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            {loadingAlternatives && (
              <p className="text-sm text-gray-500 text-center mt-4">Alternatifler yükleniyor...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
