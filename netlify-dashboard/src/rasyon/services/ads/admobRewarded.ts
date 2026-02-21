import { AdMob, RewardAdPluginEvents, type AdLoadInfo, type AdMobRewardItem } from '@capacitor-community/admob'
import { Capacitor } from '@capacitor/core'

type RewardedPlacement = 'settings_support' | 'export_pdf' | 'export_excel' | 'ai_explain'

const GOOGLE_TEST_REWARDED_AD_UNIT_ID = {
  ios: 'ca-app-pub-3940256099942544/1712485313',
  android: 'ca-app-pub-3940256099942544/5224354917',
} as const

function getRewardedAdUnitId(): string {
  const platform = Capacitor.getPlatform()

  const fromEnvAny = import.meta.env.VITE_ADMOB_REWARDED_AD_UNIT_ID as string | undefined
  const fromEnvIos = import.meta.env.VITE_ADMOB_REWARDED_AD_UNIT_ID_IOS as string | undefined
  const fromEnvAndroid = import.meta.env.VITE_ADMOB_REWARDED_AD_UNIT_ID_ANDROID as string | undefined

  if (import.meta.env.DEV) {
    return platform === 'ios'
      ? GOOGLE_TEST_REWARDED_AD_UNIT_ID.ios
      : GOOGLE_TEST_REWARDED_AD_UNIT_ID.android
  }

  if (platform === 'ios') return fromEnvIos || fromEnvAny || ''
  if (platform === 'android') return fromEnvAndroid || fromEnvAny || ''
  return ''
}

class AdMobRewardedService {
  private initialized = false
  private pendingPlacement: RewardedPlacement | null = null
  private onRewardCallback: ((placement: RewardedPlacement, reward: AdMobRewardItem) => void) | null = null

  async initialize() {
    if (this.initialized) return
    if (!Capacitor.isNativePlatform()) return

    try {
      await AdMob.initialize({
        initializeForTesting: import.meta.env.DEV,
      })

      this.initialized = true
      this.bindListeners()
    } catch (error) {
      // Don't hard-fail app startup
      console.warn('AdMob initialize failed:', error)
    }
  }

  private bindListeners() {
    AdMob.addListener(RewardAdPluginEvents.Loaded, (_info: AdLoadInfo) => {
      // no-op
    })

    AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (error: unknown) => {
      console.warn('Rewarded ad failed to load:', error)
      this.pendingPlacement = null
      this.onRewardCallback = null
    })

    AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
      const placement = this.pendingPlacement
      const callback = this.onRewardCallback

      this.pendingPlacement = null
      this.onRewardCallback = null

      if (placement && callback) {
        callback(placement, reward)
      }
    })

    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      this.pendingPlacement = null
      this.onRewardCallback = null
    })
  }

  isAvailable(): boolean {
    if (!Capacitor.isNativePlatform()) return false

    // In dev we always allow (test ad unit ids)
    if (import.meta.env.DEV) return true

    return Boolean(getRewardedAdUnitId())
  }

  async showRewardedAd(options: {
    placement: RewardedPlacement
    onReward?: (reward: AdMobRewardItem) => void
  }): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false
    if (!this.initialized) await this.initialize()
    if (!this.isAvailable()) return false

    const adId = getRewardedAdUnitId()
    if (!adId) return false

    try {
      this.pendingPlacement = options.placement
      this.onRewardCallback = (placement, reward) => {
        if (placement === options.placement) {
          options.onReward?.(reward)
        }
      }

      await AdMob.prepareRewardVideoAd({
        adId,
        isTesting: import.meta.env.DEV,
      })

      await AdMob.showRewardVideoAd()
      return true
    } catch (error) {
      console.warn('Rewarded ad show failed:', error)
      this.pendingPlacement = null
      this.onRewardCallback = null
      return false
    }
  }
}

export const admobRewarded = new AdMobRewardedService()
export type { RewardedPlacement }
