/**
 * Gübre fiyatlandırma durumu.
 *
 * `FertilizerPricingPanel.tsx`'ten AYRILDI: bir dosya hem bileşen hem kanca
 * dışa aktarınca Vite'ın hızlı yenilemesi o dosyada çalışmıyor.
 */
import { useEffect, useMemo, useState } from 'react';
import { fetchCommodityPrices } from '../../services/api';
import { FERTILIZER_PRODUCTS } from './gubreData';
import type { FertilizerProduct } from './gubreTypes';

export interface PricingState {
  useLivePricing: boolean;
  usdTry: number | null;
  usdTryUpdatedAt: number | null;
  overrides: Record<string, number>; // urun adı → TL/kg
  effectiveProducts: FertilizerProduct[];
}

export function useFertilizerPricing() {
  const [useLivePricing, setUseLivePricing] = useState(true);
  const [usdTry, setUsdTry] = useState<number | null>(null);
  const [usdTryUpdatedAt, setUsdTryUpdatedAt] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsdTry = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCommodityPrices();
      if (!res.success || !res.commodities) {
        throw new Error(res.error || 'Veri alınamadı');
      }
      const usd = res.commodities.find(c => c.symbol === 'USDTRY=X');
      if (!usd || !usd.price) throw new Error('USDTRY bulunamadı');
      setUsdTry(usd.price);
      setUsdTryUpdatedAt(Date.now());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsdTry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveProducts = useMemo<FertilizerProduct[]>(() => {
    return FERTILIZER_PRODUCTS.map((p) => {
      // Override öncelikli
      if (overrides[p.ad] !== undefined && !Number.isNaN(overrides[p.ad])) {
        return { ...p, fiyat_kg: overrides[p.ad] };
      }
      // Canlı fiyat: USD/ton × USDTRY ÷ 1000
      if (useLivePricing && usdTry && p.usd_ton) {
        const livePrice = (p.usd_ton * usdTry) / 1000;
        return { ...p, fiyat_kg: +livePrice.toFixed(2) };
      }
      return p;
    });
  }, [useLivePricing, usdTry, overrides]);

  return {
    useLivePricing,
    setUseLivePricing,
    usdTry,
    usdTryUpdatedAt,
    overrides,
    setOverrides,
    effectiveProducts,
    loading,
    error,
    refresh: fetchUsdTry,
  };
}
