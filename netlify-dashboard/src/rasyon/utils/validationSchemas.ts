/**
 * Validation schemas using Zod
 * Provides runtime type checking and validation for user inputs
 */

import { z } from 'zod'

/**
 * Animal Profile validation schema
 * Ensures all user inputs are within valid ranges
 */
export const animalProfileSchema = z.object({
  species: z.enum(['cattle', 'sheep', 'goat'], {
    errorMap: () => ({ message: 'Geçerli bir tür seçiniz' }),
  }),

  breed: z.string().min(1, 'Irk seçiniz'),

  sex: z.enum(['male', 'female', 'castrated'], {
    errorMap: () => ({ message: 'Geçerli bir cinsiyet seçiniz' }),
  }),

  purpose: z.enum(['dairy', 'beef', 'dry', 'grower'], {
    errorMap: () => ({ message: 'Geçerli bir amaç seçiniz' }),
  }),

  weightKg: z
    .number({
      required_error: 'Canlı ağırlık gerekli',
      invalid_type_error: 'Canlı ağırlık sayı olmalı',
    })
    .min(50, 'Canlı ağırlık en az 50 kg olmalı')
    .max(1500, 'Canlı ağırlık en fazla 1500 kg olabilir')
    .finite('Canlı ağırlık geçerli bir sayı olmalı'),

  stage: z.enum(['early', 'mid', 'late', 'dry'], {
    errorMap: () => ({ message: 'Geçerli bir laktasyon aşaması seçiniz' }),
  }),

  parity: z
    .union([z.literal(1), z.literal(2), z.literal(3)])
    .optional()
    .refine((val) => val === undefined || [1, 2, 3].includes(val), {
      message: 'Parite 1, 2 veya 3 olmalı',
    }),

  productionPhase: z
    .enum(['fresh', 'peak', 'mid', 'late', 'dry-faroff', 'dry-closeup', 'starter', 'grower', 'finisher'])
    .optional(),

  milkYieldKgPerDay: z
    .number()
    .min(0, 'Süt verimi negatif olamaz')
    .max(80, 'Süt verimi 80 kg/gün üzerinde olamaz')
    .finite('Süt verimi geçerli bir sayı olmalı')
    .optional(),

  targetAdgKgPerDay: z
    .number()
    .min(0, 'Hedef günlük canlı ağırlık artışı negatif olamaz')
    .max(3, 'Hedef günlük canlı ağırlık artışı 3 kg/gün üzerinde olamaz')
    .finite('Hedef ADG geçerli bir sayı olmalı')
    .optional(),

  groupSize: z
    .number()
    .int('Grup büyüklüğü tam sayı olmalı')
    .min(1, 'Grup büyüklüğü en az 1 olmalı')
    .max(10000, 'Grup büyüklüğü 10000 üzerinde olamaz')
    .optional(),

  pregnancyMonth: z
    .number()
    .int('Gebelik ayı tam sayı olmalı')
    .min(1, 'Gebelik ayı en az 1 olmalı')
    .max(10, 'Gebelik ayı en fazla 10 olabilir')
    .optional(),

  bodyConditionScore: z
    .number()
    .min(1, 'Vücut kondisyon skoru en az 1 olmalı')
    .max(5, 'Vücut kondisyon skoru en fazla 5 olabilir')
    .optional(),

  climateTemperature: z
    .number()
    .min(-20, 'Sıcaklık -20°C altında olamaz')
    .max(50, 'Sıcaklık 50°C üzerinde olamaz')
    .optional(),
})

/**
 * Feed constraints validation schema
 */
export const feedConstraintSchema = z.object({
  maxAsFedKgPerDay: z
    .number()
    .min(0, 'Maksimum miktar negatif olamaz')
    .max(100, 'Maksimum miktar 100 kg üzerinde olamaz')
    .optional(),

  minAsFedKgPerDay: z
    .number()
    .min(0, 'Minimum miktar negatif olamaz')
    .max(100, 'Minimum miktar 100 kg üzerinde olamaz')
    .optional(),

  priceOverrideTLPerKg: z
    .number()
    .min(0, 'Fiyat negatif olamaz')
    .max(1000, 'Fiyat 1000 TL/kg üzerinde olamaz')
    .optional(),

  note: z.string().max(500, 'Not 500 karakterden uzun olamaz').optional(),
})

/**
 * Optimization preferences validation schema
 */
export const optimizationPreferencesSchema = z.object({
  solver: z.enum(['auto', 'greedy', 'lp']).optional(),

  lpDmiTolerancePercent: z
    .number()
    .min(0.5, 'DMI toleransı en az %0.5 olmalı')
    .max(10, 'DMI toleransı en fazla %10 olabilir')
    .optional(),

  maxCostPerDay: z
    .number()
    .min(0, 'Maksimum maliyet negatif olamaz')
    .max(10000, 'Maksimum maliyet 10000 TL üzerinde olamaz')
    .optional(),

  prioritizeOrganic: z.boolean().optional(),

  excludeFeeds: z.array(z.string()).optional(),

  minForagePercent: z
    .number()
    .min(0, 'Minimum kaba yem oranı negatif olamaz')
    .max(100, 'Minimum kaba yem oranı %100 üzerinde olamaz')
    .optional(),

  maxConcentratePercent: z
    .number()
    .min(0, 'Maksimum konsantre oranı negatif olamaz')
    .max(100, 'Maksimum konsantre oranı %100 üzerinde olamaz')
    .optional(),

  feedConstraints: z.record(z.string(), feedConstraintSchema).optional(),
})

/**
 * Type inference from schemas
 */
export type ValidatedAnimalProfile = z.infer<typeof animalProfileSchema>
export type ValidatedFeedConstraint = z.infer<typeof feedConstraintSchema>
export type ValidatedOptimizationPreferences = z.infer<typeof optimizationPreferencesSchema>

/**
 * Validation helper function
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validation result with success flag and errors
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return {
      success: true as const,
      data: result.data,
      errors: null,
    }
  }

  return {
    success: false as const,
    data: null,
    errors: result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  }
}
