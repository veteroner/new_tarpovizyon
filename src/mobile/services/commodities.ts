/**
 * Yahoo Finance Commodity Service
 *
 * Emtia fiyatlarını Yahoo Finance üzerinden çeker.
 * Proxy: /yahoo-proxy → https://query1.finance.yahoo.com
 *
 * Kategoriler:
 *   - Bitkisel: Buğday, Mısır, Soya, Pamuk, Şeker, Kahve
 *   - Hayvancılık: Canlı Sığır, Besili Sığır, Canlı Domuz
 *   - Süt: Class III Milk (bazen çalışmıyor)
 */

export interface CommodityQuote {
  symbol: string;
  name: string;
  category: 'bitkisel' | 'hayvancilik' | 'sut';
  price: number;
  previousClose: number;
  change: number;        // absolute change
  changePercent: number; // %
  currency: string;
  unit: string;          // 'USc/bu', 'USD/cwt' etc.
  marketState: string;
}

export const COMMODITY_META: Record<string, {
  name: string;
  category: CommodityQuote['category'];
  unit: string;
}> = {
  'ZW=F': { name: 'Buğday',         category: 'bitkisel',    unit: 'USc/bu' },
  'ZC=F': { name: 'Mısır',          category: 'bitkisel',    unit: 'USc/bu' },
  'ZS=F': { name: 'Soya',           category: 'bitkisel',    unit: 'USc/bu' },
  'CT=F': { name: 'Pamuk',          category: 'bitkisel',    unit: 'USc/lb' },
  'SB=F': { name: 'Şeker',          category: 'bitkisel',    unit: 'USc/lb' },
  'KC=F': { name: 'Kahve',          category: 'bitkisel',    unit: 'USc/lb' },
  'LE=F': { name: 'Canlı Sığır',    category: 'hayvancilik', unit: 'USc/lb' },
  'GF=F': { name: 'Besili Sığır',   category: 'hayvancilik', unit: 'USc/lb' },
  'HE=F': { name: 'Canlı Domuz',    category: 'hayvancilik', unit: 'USc/lb' },
  'DC=F': { name: 'Süt (Class III)', category: 'sut',        unit: 'USD/cwt' },
};

// Backend PHP proxy URL — çalışır hem web hem Capacitor native'de
const BACKEND_COMMODITY_URL =
  'https://dersbende.com/api.php?action=commodity_prices&api_key=dashboard_secret_key_2024';

function mapBackendCategory(cat: string): CommodityQuote['category'] {
  if (cat === 'Hayvancılık') return 'hayvancilik';
  if (cat === 'Süt Ürünleri') return 'sut';
  return 'bitkisel';
}

export async function fetchCommodities(): Promise<CommodityQuote[]> {
  const res = await fetch(BACKEND_COMMODITY_URL, {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Backend API error: ${res.status}`);
  }

  interface BackendCommodity {
    symbol: string;
    name: string;
    category: string;
    unit: string;
    price: number;
    change: number;
    changePct: number;
    currency: string;
  }

  const json = await res.json();

  if (!json.success || !Array.isArray(json.commodities) || json.commodities.length === 0) {
    throw new Error('No data returned from backend');
  }

  return (json.commodities as BackendCommodity[])
    .filter((c) => COMMODITY_META[c.symbol])
    .map((c) => {
      const previousClose = Math.round((c.price - c.change) * 100) / 100;
      return {
        symbol: c.symbol,
        name: c.name,
        category: mapBackendCategory(c.category),
        price: c.price,
        previousClose,
        change: c.change,
        changePercent: c.changePct,
        currency: c.currency || 'USD',
        unit: COMMODITY_META[c.symbol]?.unit ?? c.unit,
        marketState: 'CLOSED',
      };
    })
    .sort((a, b) => {
      const catOrder = { bitkisel: 0, hayvancilik: 1, sut: 2 };
      return catOrder[a.category] - catOrder[b.category];
    });
}
