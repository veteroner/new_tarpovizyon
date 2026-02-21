import type { AnimalProfile, Feed, OptimizationPreferences } from '@/types'

/**
 * Geçerli yemleri filtrele
 */
export function filterValidFeeds(
  feeds: Feed[],
  _profile: AnimalProfile,
  preferences?: OptimizationPreferences
): Feed[] {
  return feeds.filter((feed) => {
    // Excluded feeds
    if (preferences?.excludeFeeds?.includes(feed.id)) return false

    // Organik tercihi
    if (preferences?.prioritizeOrganic && !feed.isOrganic) return false

    return true
  })
}
