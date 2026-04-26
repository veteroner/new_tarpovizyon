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

/**
 * Yahoo'dan canlı USDTRY çekip dünya gübre USD/ton referanslarını
 * TL/kg'a çeviren + kullanıcı override imkânı sunan panel + state hook.
 */
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

interface PanelProps {
  pricing: ReturnType<typeof useFertilizerPricing>;
}

export function FertilizerPricingPanel({ pricing }: PanelProps) {
  const [expanded, setExpanded] = useState(false);
  const {
    useLivePricing, setUseLivePricing,
    usdTry, usdTryUpdatedAt, overrides, setOverrides,
    effectiveProducts, loading, error, refresh,
  } = pricing;

  const handleOverrideChange = (urun: string, val: string) => {
    const num = parseFloat(val);
    setOverrides(prev => {
      const next = { ...prev };
      if (val === '' || Number.isNaN(num)) {
        delete next[urun];
      } else {
        next[urun] = num;
      }
      return next;
    });
  };

  const updatedAtStr = usdTryUpdatedAt
    ? new Date(usdTryUpdatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="gh-card" style={{ marginBottom: 12, background: 'linear-gradient(135deg, #ecfeff 0%, #f0fdfa 100%)', border: '1px solid #5eead4' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 className="gh-card__title" style={{ margin: 0 }}>💱 Gübre Fiyat Kaynağı</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#0f766e' }}>
            {useLivePricing && usdTry
              ? <>Canlı: <strong>1 USD = ₺{usdTry.toFixed(2)}</strong> {updatedAtStr && <span style={{ opacity: 0.7 }}>({updatedAtStr})</span>} · Dünya pazar USD/ton × kur ÷ 1000</>
              : 'Statik 2024 ortalama fiyatlar'}
            {Object.keys(overrides).length > 0 && <span style={{ marginLeft: 6, color: '#92400e' }}>· {Object.keys(overrides).length} ürün manuel</span>}
          </p>
          {error && <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#b91c1c' }}>⚠️ Canlı kur alınamadı: {error}. Statik fiyatlara döndü.</p>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useLivePricing}
              onChange={e => setUseLivePricing(e.target.checked)}
              disabled={!usdTry}
            />
            Canlı kur kullan
          </label>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            style={{ padding: '4px 10px', fontSize: '0.8rem', border: '1px solid #14b8a6', borderRadius: 6, background: '#fff', color: '#0f766e', cursor: loading ? 'wait' : 'pointer' }}
          >
            {loading ? '⏳' : '🔄'} Kuru yenile
          </button>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            style={{ padding: '4px 10px', fontSize: '0.8rem', border: '1px solid #14b8a6', borderRadius: 6, background: '#fff', color: '#0f766e', cursor: 'pointer' }}
          >
            {expanded ? '▲ Kapat' : '▼ Fiyatları düzenle'}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #99f6e4' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Ürün</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>USD/ton</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>Hesaplanan ₺/kg</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>Manuel ₺/kg (opsiyonel)</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>Etkin ₺/kg</th>
              </tr>
            </thead>
            <tbody>
              {FERTILIZER_PRODUCTS.map((p) => {
                const eff = effectiveProducts.find(e => e.ad === p.ad)!;
                const liveCalc = useLivePricing && usdTry && p.usd_ton
                  ? +((p.usd_ton * usdTry) / 1000).toFixed(2)
                  : null;
                const isOverride = overrides[p.ad] !== undefined;
                return (
                  <tr key={p.ad} style={{ borderBottom: '1px solid #ccfbf1' }}>
                    <td style={{ padding: '6px 8px' }}>{p.ad}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#6b7280' }}>{p.usd_ton ? `$${p.usd_ton}` : '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#6b7280' }}>{liveCalc !== null ? `₺${liveCalc.toFixed(2)}` : '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={overrides[p.ad] ?? ''}
                        placeholder="—"
                        onChange={e => handleOverrideChange(p.ad, e.target.value)}
                        style={{ width: 80, padding: '3px 6px', borderRadius: 4, border: '1px solid #d1d5db', textAlign: 'right', fontSize: '0.85rem' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: isOverride ? '#92400e' : '#0f766e' }}>
                      ₺{eff.fiyat_kg.toFixed(2)}{isOverride && ' ✎'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {Object.keys(overrides).length > 0 && (
            <button
              type="button"
              onClick={() => setOverrides({})}
              style={{ marginTop: 8, padding: '4px 10px', fontSize: '0.8rem', border: '1px solid #f59e0b', borderRadius: 6, background: '#fff', color: '#92400e', cursor: 'pointer' }}
            >
              ✕ Tüm manuel girişleri temizle
            </button>
          )}
        </div>
      )}
    </div>
  );
}
