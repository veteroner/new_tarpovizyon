/**
 * Feed Price Service - Abstract Interface
 * 
 * Fiyat kaynaklarını birleştirip cache, fallback ve multi-source desteği sağlar
 */

import logger from '@/utils/logger'

export interface FeedPriceData {
  feedId: string
  priceTLPerKg: number
  source: 'user' | 'tuik' | 'scraper' | 'market' | 'default'
  region?: string // 'marmara' | 'ege' | 'ic-anadolu' | ...
  updatedAt: Date
  confidence: number // 0-1, veri güvenilirliği (user=1.0, tuik=0.9, scraper=0.7, default=0.5)
}

export interface FeedPriceSource {
  getName(): string
  getPrice(feedId: string): Promise<FeedPriceData | null>
  getBulkPrices(feedIds: string[]): Promise<Record<string, FeedPriceData>>
  getLastUpdateTime(): Date
}

/**
 * Mock Fiyat Kaynağı (Development & Fallback)
 * feedsV2.ts'deki statik fiyatlara ±10% random varyasyon ekler
 */
export class MockFeedPriceSource implements FeedPriceSource {
  private lastUpdate: Date

  constructor() {
    this.lastUpdate = new Date()
  }

  getName(): string {
    return 'Mock Price Source (Development)'
  }

  getLastUpdateTime(): Date {
    return this.lastUpdate
  }

  async getPrice(_feedId: string): Promise<FeedPriceData | null> {
    // TODO: Sprint 2'de feedsV2.ts'den fiyat çekip ±10% varyasyon ekle
    return null
  }

  async getBulkPrices(feedIds: string[]): Promise<Record<string, FeedPriceData>> {
    const result: Record<string, FeedPriceData> = {}
    for (const feedId of feedIds) {
      const price = await this.getPrice(feedId)
      if (price) {
        result[feedId] = price
      }
    }
    return result
  }
}

/**
 * Cache Wrapper - Her fiyat kaynağını cache'leyebilir
 */
export class CachedFeedPriceSource implements FeedPriceSource {
  private source: FeedPriceSource
  private cache: Map<string, { data: FeedPriceData; expiresAt: Date }>
  private cacheDurationMs: number

  constructor(source: FeedPriceSource, cacheDurationMinutes: number = 60) {
    this.source = source
    this.cache = new Map()
    this.cacheDurationMs = cacheDurationMinutes * 60 * 1000
  }

  getName(): string {
    return `Cached(${this.source.getName()})`
  }

  getLastUpdateTime(): Date {
    return this.source.getLastUpdateTime()
  }

  async getPrice(feedId: string): Promise<FeedPriceData | null> {
    const cached = this.cache.get(feedId)
    if (cached && cached.expiresAt > new Date()) {
      return cached.data
    }

    const fresh = await this.source.getPrice(feedId)
    if (fresh) {
      this.cache.set(feedId, {
        data: fresh,
        expiresAt: new Date(Date.now() + this.cacheDurationMs),
      })
    }
    return fresh
  }

  async getBulkPrices(feedIds: string[]): Promise<Record<string, FeedPriceData>> {
    const result: Record<string, FeedPriceData> = {}
    const uncachedIds: string[] = []

    // Cache'den mevcut olanları al
    for (const feedId of feedIds) {
      const cached = this.cache.get(feedId)
      if (cached && cached.expiresAt > new Date()) {
        result[feedId] = cached.data
      } else {
        uncachedIds.push(feedId)
      }
    }

    // Geri kalanları source'dan çek
    if (uncachedIds.length > 0) {
      const fresh = await this.source.getBulkPrices(uncachedIds)
      for (const [feedId, data] of Object.entries(fresh)) {
        result[feedId] = data
        this.cache.set(feedId, {
          data,
          expiresAt: new Date(Date.now() + this.cacheDurationMs),
        })
      }
    }

    return result
  }

  clearCache(): void {
    this.cache.clear()
  }
}

/**
 * Fallback Source - Birden fazla kaynağı cascade olarak dener
 */
export class FallbackFeedPriceSource implements FeedPriceSource {
  private sources: FeedPriceSource[]

  constructor(sources: FeedPriceSource[]) {
    this.sources = sources
  }

  getName(): string {
    return `Fallback(${this.sources.map((s) => s.getName()).join(' -> ')})`
  }

  getLastUpdateTime(): Date {
    return this.sources[0]?.getLastUpdateTime() ?? new Date()
  }

  async getPrice(feedId: string): Promise<FeedPriceData | null> {
    for (const source of this.sources) {
      try {
        const price = await source.getPrice(feedId)
        if (price) return price
      } catch (err) {
        logger.warn(`Fiyat kaynağı ${source.getName()} başarısız:`, err)
        continue
      }
    }
    return null
  }

  async getBulkPrices(feedIds: string[]): Promise<Record<string, FeedPriceData>> {
    const result: Record<string, FeedPriceData> = {}
    const remainingIds = new Set(feedIds)

    for (const source of this.sources) {
      if (remainingIds.size === 0) break

      try {
        const prices = await source.getBulkPrices(Array.from(remainingIds))
        for (const [feedId, data] of Object.entries(prices)) {
          result[feedId] = data
          remainingIds.delete(feedId)
        }
      } catch (err) {
        logger.warn(`Bulk fiyat kaynağı ${source.getName()} başarısız:`, err)
        continue
      }
    }

    return result
  }
}

/**
 * Feed Price Service - Singleton instance
 * Production'da farklı sources eklenebilir
 */
class FeedPriceService {
  private source: FeedPriceSource

  constructor() {
    // Development: Mock source kullan
    // Production: TuikSource -> ScraperSource -> MockSource fallback
    const mockSource = new MockFeedPriceSource()
    this.source = new CachedFeedPriceSource(mockSource, 60)
  }

  async getPrice(feedId: string): Promise<FeedPriceData | null> {
    return this.source.getPrice(feedId)
  }

  async getBulkPrices(feedIds: string[]): Promise<Record<string, FeedPriceData>> {
    return this.source.getBulkPrices(feedIds)
  }

  getSourceName(): string {
    return this.source.getName()
  }

  getLastUpdate(): Date {
    return this.source.getLastUpdateTime()
  }
}

// Singleton instance
export const feedPriceService = new FeedPriceService()
