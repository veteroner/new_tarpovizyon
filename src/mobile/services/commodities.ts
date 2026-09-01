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
  /**
   * Kaynak veri sent (USX) cinsindeyse true; fiyat 100'e bölünerek dolara
   * çevrildi demektir. Geçmiş verisi AYRI bir uçtan ham geliyor ve orada
   * para birimi bilgisi yok — grafiğin KPI ile aynı ölçekte olması için
   * bu bayrak `fetchCommodityHistory`'ye taşınıyor.
   */
  sentKaynak?: boolean;
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

/*
 * ─── ARTIK WORKER ÜZERİNDEN ─────────────────────────────────────────────────
 * Önce doğrudan `dersbende.com/api.php` çağrılıyordu. Ölçüldü: üretimde
 * piyasa sayfası ~10 sn iskelet ekranda kalıyordu, çünkü o kaynak yavaş ve
 * HER ZİYARETÇİ için baştan çalışıyordu. Worker yanıtı Cloudflare kenarında
 * saklıyor (fiyat 10 dk, geçmiş 30 dk) — ilk ziyaretçi bekliyor, sonrakiler
 * anında alıyor. Kaynak anahtarı da istemci paketinden çıkmış oldu.
 */
const API_BASE = import.meta.env.VITE_TARPOVIZYON_BASIC_API
  ?? 'https://tarpovizyon-api.veteroner.workers.dev';

const BACKEND_COMMODITY_URL = `${API_BASE}/api/piyasa`;

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
      /*
       * ─── USX SENTTİR, DOLAR DEĞİL ───────────────────────────────────────
       *
       * Yahoo, CBOT tahıl/yumuşak emtia vadelileri için `currency: "USX"`
       * dönüyor. USX = ABD senti (1/100 $). Buğday 780,50 USX aslında
       * 7,81 $/bushel demek.
       *
       * Ekranda ham hâliyle "780,50 USX" yazıyordu: hem tanınmayan bir kod
       * hem de dolar sanılırsa 100 kat yanlış. Listede bazı satırlar USD
       * (pirinç, kakao, soya küspesi) bazıları USX olduğu için karşılaştırma
       * da imkânsızdı.
       *
       * Çeviri BURADA, veri girişinde yapılıyor — liste, detay sayfası ve
       * grafikler aynı kaynaktan beslendiği için hepsi tutarlı oluyor.
       * `change` ve `previousClose` da bölünmeli, yoksa değişim tutarı fiyatla
       * aynı ölçekte olmaz. `changePercent` oransal olduğu için dokunulmuyor.
       *
       * Birim etiketi de sadeleşiyor: `USc/bu` → `$/bu`, `USc/lb` → `$/lb`.
       */
      const sent = (c.currency || '').toUpperCase() === 'USX';
      const bol = sent ? 100 : 1;
      const yuvarla = (v: number) => Math.round(v * 10000) / 10000;

      const fiyat = yuvarla(c.price / bol);
      const degisim = yuvarla(c.change / bol);
      const previousClose = yuvarla(fiyat - degisim);

      const hamBirim = COMMODITY_META[c.symbol]?.unit ?? c.unit;
      const birim = sent ? hamBirim.replace(/^USc\/|^¢\//, '$/') : hamBirim;

      return {
        symbol: c.symbol,
        name: c.name,
        category: mapBackendCategory(c.category),
        price: fiyat,
        previousClose,
        change: degisim,
        changePercent: c.changePct,
        currency: sent ? 'USD' : (c.currency || 'USD'),
        unit: birim,
        marketState: 'CLOSED',
        sentKaynak: sent,
      };
    })
    .sort((a, b) => {
      const catOrder: Record<CommodityQuote['category'], number> = {
        bitkisel: 0,
        hayvancilik: 1,
        sut: 2,
        gubre: 3,
        enerji: 4,
        orman: 5,
        et_gida: 6,
        metal: 7,
        doviz: 8,
      };
      return catOrder[a.category] - catOrder[b.category];
    });
}

/* ─── Geçmiş fiyat (grafik için) ────────────────────────────────────────────
 *
 * Piyasa listesi yalnızca ANLIK fiyatı veriyor; kullanıcı bir ürüne dokununca
 * fiyatın seyrini görmek istiyor. Backend'in `commodity_chart` ucu bunu
 * sağlıyor: kapanış serisi, seçilebilir aralıkla.
 *
 * Ölçülen aralıklar (2026-08): 5d→5 nokta, 1mo→23, 3mo→63, 6mo→125, 1y→251,
 * max→268 (2000'den bugüne, aylığa seyreltilmiş).
 *
 * NOT: Bu uç, piyasa listesiyle AYNI üçüncü taraf sunucuda ve anahtar istemci
 * kodunda açık duruyor (bkz. BACKEND_COMMODITY_URL). Yeni bir güvenlik açığı
 * eklemiyor ama mevcut olanı da kapatmıyor; emtia uçlarının tümü Worker'a
 * taşınmalı.
 */

export type Aralik = '1mo' | '3mo' | '6mo' | '1y' | 'max';

export type FiyatNoktasi = {
  /** Unix saniye. */
  t: number;
  /** Kapanış. */
  c: number;
};

export async function fetchCommodityHistory(
  symbol: string,
  range: Aralik,
  /*
   * Kaynak sent (USX) cinsindeyse true. Bu uç ham fiyat döndürüyor ve para
   * birimi bilgisi taşımıyor; çağıran taraf quote'taki `sentKaynak`'ı geçmezse
   * grafik 780 gösterirken KPI 7,81 gösterir — aynı ekranda 100 kat fark.
   */
  sentKaynak = false,
): Promise<FiyatNoktasi[]> {
  const url = `${API_BASE}/api/piyasa/gecmis`
    + `?sembol=${encodeURIComponent(symbol)}&aralik=${range}`;

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Grafik verisi alınamadı (${res.status})`);

  const json = await res.json() as { success?: boolean; data?: FiyatNoktasi[]; error?: string };
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(json.error ?? 'Grafik verisi alınamadı');
  }
  // Sunucu sıralı gönderiyor ama garanti değil; grafik x ekseni artan olmalı.
  const bol = sentKaynak ? 100 : 1;
  return json.data
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.c))
    .map((p) => (bol === 1 ? p : { ...p, c: Math.round((p.c / bol) * 10000) / 10000 }))
    .sort((a, b) => a.t - b.t);
}
