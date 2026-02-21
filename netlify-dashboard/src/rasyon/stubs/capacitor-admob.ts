// AdMob stub – no-op on web
export const AdMob = {
  initialize: async (_opts?: Record<string, unknown>) => {},
  addListener: async (_event: string, _handler: (_data: unknown) => void) => ({ remove: () => {} }),
  prepareRewardVideoAd: async (_opts: Record<string, unknown>) => {},
  showRewardVideoAd: async () => {},
}

export const RewardAdPluginEvents = {
  Loaded: 'onAdLoaded',
  FailedToLoad: 'onAdFailedToLoad',
  Rewarded: 'onAdRewarded',
  Dismissed: 'onAdDismissed',
}

export type AdLoadInfo = Record<string, unknown>
export type AdMobRewardItem = Record<string, unknown>
