/**
 * Feed Inventory and Lot Tracking Types
 * 
 * Enables enterprise-level feed management with:
 * - Lot/batch tracking with lab/NIR analysis
 * - Stock inventory management
 * - Expiration and quality tracking
 * - Feed sourcing and versioning
 */

export type AnalysisSource = 'table' | 'lab' | 'nir' | 'user-input'
export type InventoryStatus = 'available' | 'low-stock' | 'out-of-stock' | 'expired' | 'on-order'

/**
 * Feed lot/batch with specific analysis results
 */
export interface FeedLot {
  lotId: string
  feedId: string
  feedName: string
  
  // Analysis metadata
  analysisDate: string // ISO date
  analysisSource: AnalysisSource
  labName?: string
  labReportId?: string
  
  // Composition (DM basis)
  dmPercent: number
  meMcalPerKg: number
  nelMcalPerKg?: number
  cpPercent: number
  ndfPercent: number
  starchPercent?: number
  sugarPercent?: number
  fatPercent?: number
  
  // Protein fractions (optional)
  rdpPercent?: number
  rupPercent?: number
  rupDigestibilityPercent?: number
  
  // Minerals
  caPercent: number
  pPercent: number
  mgPercent?: number
  naPercent?: number
  kPercent?: number
  sPercent?: number
  clPercent?: number
  
  // Inventory
  /** Lot'a girilen ilk miktar (kg, as-fed) */
  initialQuantityKg?: number
  /** Lot'ta kalan miktar (kg, as-fed) */
  remainingQuantityKg?: number
  purchaseDate?: string
  expirationDate?: string
  supplier?: string
  lotNumber?: string
  purchasePriceTLPerKg?: number
  
  // Quality flags
  quality?: 'excellent' | 'good' | 'fair' | 'poor'
  warnings?: string[]
  notes?: string
}

/**
 * Feed inventory item with stock tracking
 */
export interface FeedInventoryItem {
  feedId: string
  feedName: string
  category: string
  
  // Current stock
  currentStockKg: number
  minStockKg: number
  maxStockKg: number
  
  // Active lots
  lots: FeedLot[]
  
  // Status
  status: InventoryStatus
  lastRestocked?: string // ISO date
  averageDailyUsageKg?: number
  daysUntilEmpty?: number
  
  // Pricing
  currentPriceTLPerKg: number
  priceHistory?: Array<{
    date: string
    priceTLPerKg: number
  }>
}

/**
 * Inventory alert/notification
 */
export interface InventoryAlert {
  alertId: string
  feedId: string
  feedName: string
  type: 'low-stock' | 'out-of-stock' | 'expiring-soon' | 'expired' | 'quality-issue'
  severity: 'critical' | 'warning' | 'info'
  message: string
  createdAt: string
  resolvedAt?: string
}

/**
 * NIR/Lab import record
 */
export interface AnalysisImport {
  importId: string
  importDate: string
  source: AnalysisSource
  fileName?: string
  labName?: string
  
  // Parsed results
  lots: FeedLot[]
  
  // Import status
  status: 'success' | 'partial' | 'failed'
  errors?: string[]
  warnings?: string[]
}

/**
 * Feed usage history (for tracking consumption)
 */
export interface FeedUsageRecord {
  recordId: string
  feedId: string
  lotId?: string
  date: string
  usedKg: number
  rationId?: string
  animalGroupId?: string
  notes?: string
}
