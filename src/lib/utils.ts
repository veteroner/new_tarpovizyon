import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn/ui'nin standart sınıf birleştiricisi.
 *
 * `clsx` koşullu sınıfları düzleştirir, `twMerge` çakışan Tailwind
 * yardımcılarında SONUNCUYU kazandırır — yani `cn('p-2', 'p-4')` → `p-4`.
 * Bu olmadan iki sınıf da CSS'e girer ve hangisinin kazanacağı kaynak
 * dosyadaki sıraya kalır; bileşene dışarıdan sınıf geçirmek güvenilmez olur.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
