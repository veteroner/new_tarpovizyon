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
 *   - Enerji: Brent Petrol, Ham Petrol, Doğal Gaz, Isıtma Yakıtı, Benzin
 *   - Gübre: CF Industries, CVR Partners (Üre), Nutrien, Mosaic
 *   - Orman: Tomruk
 */

export interface CommodityQuote {
  symbol: string;
  name: string;
  category: 'bitkisel' | 'hayvancilik' | 'sut' | 'enerji' | 'gubre' | 'orman' | 'et_gida' | 'metal' | 'doviz';
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
  // Bitkisel
  'ZW=F': { name: 'Buğday',          category: 'bitkisel',    unit: 'USc/bu' },
  'ZC=F': { name: 'Mısır',           category: 'bitkisel',    unit: 'USc/bu' },
  'ZS=F': { name: 'Soya',            category: 'bitkisel',    unit: 'USc/bu' },
  'ZL=F': { name: 'Soya Yağı',       category: 'bitkisel',    unit: 'USc/lb' },
  'ZM=F': { name: 'Soya Küspesi',    category: 'bitkisel',    unit: '$/ton'  },
  'ZO=F': { name: 'Yulaf',           category: 'bitkisel',    unit: 'USc/bu' },
  'ZR=F': { name: 'Pirinç',          category: 'bitkisel',    unit: 'USc/cwt'},
  'KE=F': { name: 'KC HRW Buğday',   category: 'bitkisel',    unit: 'USc/bu' },
  'CT=F': { name: 'Pamuk',           category: 'bitkisel',    unit: 'USc/lb' },
  'SB=F': { name: 'Şeker',           category: 'bitkisel',    unit: 'USc/lb' },
  'KC=F': { name: 'Kahve',           category: 'bitkisel',    unit: 'USc/lb' },
  'CC=F': { name: 'Kakao',           category: 'bitkisel',    unit: '$/ton'  },
  'OJ=F': { name: 'Portakal Suyu',   category: 'bitkisel',    unit: 'USc/lb' },
  // Hayvancılık
  'LE=F': { name: 'Canlı Sığır',     category: 'hayvancilik', unit: 'USc/lb' },
  'GF=F': { name: 'Besilik Sığır',   category: 'hayvancilik', unit: 'USc/lb' },
  'HE=F': { name: 'Yağsız Domuz',    category: 'hayvancilik', unit: 'USc/lb' },
  // Süt
  'DC=F': { name: 'Süt (Class III)',     category: 'sut',         unit: 'USD/cwt'},
  'GDK=F':{ name: 'Süt (Class IV)',      category: 'sut',         unit: 'USD/cwt'},
  'CB=F': { name: 'Tereyağı',            category: 'sut',         unit: '¢/lb'  },
  'CSC=F':{ name: 'Peynir',              category: 'sut',         unit: '$/lb'   },
  'DY=F': { name: 'Kuru Whey',           category: 'sut',         unit: '¢/lb'  },
  'GNF=F':{ name: 'Yağsız Süt Tozu',    category: 'sut',         unit: '¢/lb'  },
  // Et & Gıda (hisse)
  'TSN':  { name: 'Tyson Foods',         category: 'et_gida',     unit: 'USD/hisse' },
  'HRL':  { name: 'Hormel Foods',        category: 'et_gida',     unit: 'USD/hisse' },
  'PPC':  { name: 'Pilgrim’s Pride (Piliç)', category: 'et_gida',  unit: 'USD/hisse' },
  'SFD':  { name: 'Smithfield Foods (Domuz)', category: 'et_gida', unit: 'USD/hisse' },
  'CALM': { name: 'Cal-Maine (Yumurta)', category: 'et_gida',     unit: 'USD/hisse' },
  // Metaller
  'GC=F': { name: 'Altın',             category: 'metal',       unit: '$/troy oz' },
  'SI=F': { name: 'Gümüş',            category: 'metal',       unit: '$/troy oz' },
  'HG=F': { name: 'Bakır',             category: 'metal',       unit: '$/lb'      },
  'PL=F': { name: 'Platin',             category: 'metal',       unit: '$/troy oz' },
  'PA=F': { name: 'Paladyum',           category: 'metal',       unit: '$/troy oz' },
  // Döviz
  'USDTRY=X': { name: 'Dolar / TL',     category: 'doviz',       unit: 'TRY/USD'   },
  'EURTRY=X': { name: 'Euro / TL',      category: 'doviz',       unit: 'TRY/EUR'   },
  // Enerji
  'BZ=F': { name: 'Brent Petrol',    category: 'enerji',      unit: 'USD/varil' },
  'CL=F': { name: 'Ham Petrol (WTI)',category: 'enerji',      unit: 'USD/varil' },
  'NG=F': { name: 'Doğal Gaz',       category: 'enerji',      unit: '$/MMBtu'   },
  'HO=F': { name: 'Isıtma Yakıtı',   category: 'enerji',      unit: '$/galon'   },
  'RB=F': { name: 'Benzin (RBOB)',   category: 'enerji',      unit: '$/galon'   },
  // Gübre (hisse)
  'CF':   { name: 'CF Industries',   category: 'gubre',       unit: 'USD/hisse' },
  'UAN':  { name: 'CVR Partners (Üre)', category: 'gubre',    unit: 'USD/hisse' },
  'NTR':  { name: 'Nutrien',         category: 'gubre',       unit: 'USD/hisse' },
  'MOS':  { name: 'Mosaic',          category: 'gubre',       unit: 'USD/hisse' },
  'IPI':  { name: 'Intrepid Potash', category: 'gubre',       unit: 'USD/hisse' },
  // Orman Ürünleri
  'LB=F': { name: 'Tomruk',          category: 'orman',       unit: '$/1000 bf' },
};

// Backend PHP proxy URL — çalışır hem web hem Capacitor native'de
const BACKEND_COMMODITY_URL =
  'https://dersbende.com/api.php?action=commodity_prices&api_key=REDACTED_DASHBOARD_KEY';

function mapBackendCategory(cat: string): CommodityQuote['category'] {
  if (cat === 'Hayvancılık') return 'hayvancilik';
  if (cat === 'Süt Ürünleri') return 'sut';
  if (cat === 'Enerji') return 'enerji';
  if (cat === 'Gübre') return 'gubre';
  if (cat === 'Orman Ürünleri') return 'orman';
  if (cat === 'Et & Gıda') return 'et_gida';
  if (cat === 'Metaller') return 'metal';
  if (cat === 'Döviz') return 'doviz';
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
