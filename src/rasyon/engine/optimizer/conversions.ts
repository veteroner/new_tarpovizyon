import type { Feed } from '@/types'

export function dmFraction(feed: Feed): number {
  const frac = (feed.dmPercent || 0) / 100
  // Prevent divide-by-zero and crazy values
  return Math.min(0.99, Math.max(0.05, frac))
}

export function asFedToDmKg(feed: Feed, kgAsFed: number): number {
  return kgAsFed * dmFraction(feed)
}

export function dmToAsFedKg(feed: Feed, kgDM: number): number {
  return kgDM / dmFraction(feed)
}
