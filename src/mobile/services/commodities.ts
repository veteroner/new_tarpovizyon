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

const ALL_SYMBOLS = Object.keys(COMMODITY_META).join(',');

// Convert US cents to dollars where applicable
function formatPrice(price: number, symbol: string): number {
  // YF futures USc → display as USD when > 10 (grain prices around 500-800c = $5-8)
  if (['ZW=F', 'ZC=F', 'ZS=F'].includes(symbol)) {
    return Math.round((price / 100) * 100) / 100; // 652c → $6.52
  }
  if (['CT=F', 'SB=F', 'KC=F', 'LE=F', 'GF=F', 'HE=F'].includes(symbol)) {
    return Math.round(price * 100) / 100; // cents but per lb, show as-is USc
  }
  return Math.round(price * 100) / 100;
}

function formatCurrency(symbol: string): string {
  if (['ZW=F', 'ZC=F', 'ZS=F'].includes(symbol)) return 'USD/bu';
  if (['CT=F', 'SB=F', 'KC=F'].includes(symbol)) return 'USc/lb';
  if (['LE=F', 'GF=F', 'HE=F'].includes(symbol)) return 'USc/lb';
  if (symbol === 'DC=F') return 'USD/cwt';
  return 'USD';
}

export async function fetchCommodities(): Promise<CommodityQuote[]> {
  const url = `/yahoo-proxy/v7/finance/quote?symbols=${encodeURIComponent(ALL_SYMBOLS)}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketChange,regularMarketChangePercent,marketState,currency`;

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance API error: ${res.status}`);
  }

  interface YahooQuote {
    symbol: string;
    regularMarketPrice?: number;
    regularMarketPreviousClose?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    marketState?: string;
  }

  const json = await res.json();
  const results: YahooQuote[] = json?.quoteResponse?.result ?? [];

  if (results.length === 0) {
    throw new Error('No data returned from Yahoo Finance');
  }

  return results
    .filter((r) => COMMODITY_META[r.symbol])
    .map((r) => {
      const meta = COMMODITY_META[r.symbol];
      const rawPrice = r.regularMarketPrice ?? 0;
      const rawPrev = r.regularMarketPreviousClose ?? rawPrice;
      const rawChange = r.regularMarketChange ?? (rawPrice - rawPrev);
      const rawChangePct = r.regularMarketChangePercent ?? ((rawChange / rawPrev) * 100);

      return {
        symbol: r.symbol,
        name: meta.name,
        category: meta.category,
        price: formatPrice(rawPrice, r.symbol),
        previousClose: formatPrice(rawPrev, r.symbol),
        change: Math.round(rawChange * 100) / 100,
        changePercent: Math.round(rawChangePct * 100) / 100,
        currency: formatCurrency(r.symbol),
        unit: meta.unit,
        marketState: r.marketState ?? 'CLOSED',
      };
    })
    .sort((a, b) => {
      const catOrder = { bitkisel: 0, hayvancilik: 1, sut: 2 };
      return catOrder[a.category] - catOrder[b.category];
    });
}
