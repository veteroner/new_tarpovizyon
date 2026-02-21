import type { Feed } from '@/types'

export interface SolutionVector {
  feedAmounts: Map<Feed, number>
  totalCost: number
  iterations: number
}
