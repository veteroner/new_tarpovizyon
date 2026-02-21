import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { fetchQuery } from '../services/api';

type YearPoint = {
  year: number;
  totalTon: number;
  cattleTon: number;
  sheepTon: number;
  goatTon: number;
};

type MilkEconomicData = {
  tarih: string;
  misir_silaji: number;
  yonca: number;
  saman: number;
  sut_yemi_19_hp: number;
  cig_sut_uretim_maliyeti_tl_lt: number;
  usk_cig_sut_tavsiye_fiyati_tl_lt: number;
  sut_yem_paritesi: number;
  litre_basina_cig_sut_destegi_tl: number;
  sut_yem_paritesi_destek_dahil: number;
  fiyat_maliyet_farki_tl_lt: number;
  fiyat_maliyet_farki_tl_lt_destek_dahil: number;
  karlilik: number;
};

type IndustrySutData = {
  yil: string;
  inek_sutu_ton: number;
  yagsiz_sut_tozu_ton: number;
  tereyag_ton: number;
  inek_peyniri_ton: number;
  yogurt_ton: number;
  ayran_ton: number;
  icme_sutu_pastorize_uht_vb_ton: number;
};

type WorldMilkPrices = {
  abd_class_3: number;
  ab_27: number;
  yeni_zelanda: number;
  almanya: number;
  italya: number;
  turkiye: number;
};

type Productivity = {
  yil: string;
  cig_sut_verimi_lt: number;
};

type ProductivityComparison = {
  ulke: string;
  karkas_verimi: number;
};

const COLORS = ['#3b82f6', '#f97316', '#a855f7', '#10b981'];

type TuikSutUrunData = {
  urun: string;
  birim: string;
  yil: number;
  toplam: number;
  aylar: number[]; // Ocak-Aralık (12 ay)
};

const TUIK_SUT_URUNLER = [
  { id: 'İnek Sütü', label: 'İnek Sütü', emoji: '🥛', color: '#3b82f6' },
  { id: 'İnek Peyniri', label: 'İnek Peyniri', emoji: '🧀', color: '#f59e0b' },
  { id: 'Yoğurt', label: 'Yoğurt', emoji: '🥣', color: '#10b981' },
  { id: 'Ayran', label: 'Ayran', emoji: '🥤', color: '#06b6d4' },
  { id: 'İçme Sütü', label: 'İçme Sütü', emoji: '🧃', color: '#8b5cf6' },
  { id: 'Tereyağı', label: 'Tereyağı', emoji: '🧈', color: '#eab308' },
  { id: 'Süt Tozu', label: 'Süt Tozu', emoji: '📦', color: '#a855f7' },
  { id: 'Yağsız Süt Tozu', label: 'Yağsız Süt Tozu', emoji: '🧪', color: '#64748b' },
  { id: 'Konsantre Süt', label: 'Konsantre Süt', emoji: '🥫', color: '#ef4444' },
  { id: 'Krema (İşlenmiş)', label: 'Krema', emoji: '🍦', color: '#ec4899' },
  { id: 'Diğer Peynir', label: 'Diğer Peynir', emoji: '🧀', color: '#14b8a6' },
];

const AY_ADLARI = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const AY_TAM = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function parseTrNumber(input: unknown): number {
  const raw = String(input ?? '').trim();
  if (!raw) return 0;

  const normalized = raw.replace(/\s+/g, '');
  const commaCount = (normalized.match(/,/g) ?? []).length;
  const dotCount = (normalized.match(/\./g) ?? []).length;

  if (commaCount > 0) {
    const n = Number.parseFloat(normalized.replace(/\./g, '').replace(/,/g, '.'));
    return Number.isFinite(n) ? n : 0;
  }

  if (dotCount > 1) {
    const n = Number.parseFloat(normalized.replace(/\./g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  if (dotCount === 1) {
    const [intPart, fracOrGroup] = normalized.split('.');
    if (fracOrGroup?.length === 3) {
      const n = Number.parseFloat(intPart + fracOrGroup);
      return Number.isFinite(n) ? n : 0;
    }
  }

  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function extractYear(value: unknown): number {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const m = raw.match(/(19|20)\d{2}/);
  if (m) return Number(m[0]);
  return Number.parseInt(raw, 10) || 0;
}

function formatTon(value: number): string {
  if (value >= 1e6) return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value / 1e6) + ' M ton';
  if (value >= 1e3) return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value) + ' ton';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value) + ' ton';
}

function formatShort(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export default function TurkeyMilkProductionPage() {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<YearPoint[]>([]);
  const [economicData, setEconomicData] = useState<MilkEconomicData[]>([]);
  const [industrySutData, setIndustrySutData] = useState<IndustrySutData[]>([]);
  const [worldMilkPrices, setWorldMilkPrices] = useState<WorldMilkPrices | null>(null);
  const [productivity, setProductivity] = useState<Productivity[]>([]);
  const [productivityComparison, setProductivityComparison] = useState<ProductivityComparison[]>([]);
  const [sufficiency, setSufficiency] = useState<Record<string, string | number> | null>(null);
  const [worldRankings, setWorldRankings] = useState<{ 
    cattle: { world: number; eu: number }; 
    sheep: { world: number; eu: number }; 
    goat: { world: number; eu: number };
  } | null>(null);
  const [econStartDate, setEconStartDate] = useState<string>('');
  const [econEndDate, setEconEndDate] = useState<string>('');
  const [tuikSutData, setTuikSutData] = useState<TuikSutUrunData[]>([]);
  const [selectedTuikSutUrun, setSelectedTuikSutUrun] = useState<string>('İnek Sütü');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchQuery('SELECT * FROM o_sur_uretimi_veri');
      const data = (res.data ?? []) as Record<string, unknown>[];

      const points = data
        .map((row) => {
          const year = extractYear(row['Yıl']);
          const cattleTon = parseTrNumber(row['Büyükbaş Süt Üretimi (Ton)']);
          const sheepTon = parseTrNumber(row['Koyun Sütü Üretimi (Ton)']);
          const goatTon = parseTrNumber(row['Keçi Sütü Üretimi (Ton)']);
          const totalTon = parseTrNumber(row['Toplam Süt Üretimi (Ton)']);
          return { year, totalTon, cattleTon, sheepTon, goatTon };
        })
        .filter((p) => p.year > 0)
        .sort((a, b) => a.year - b.year);

      setSeries(points);

      // Ekonomik göstergeleri yükle
      try {
        const economicQuery = `SELECT 
          DATE_FORMAT(tarih, '%Y-%m') as tarih,
          misir_silaji, yonca, saman, sut_yemi_19_hp,
          cig_sut_uretim_maliyeti_tl_lt, usk_cig_sut_tavsiye_fiyati_tl_lt,
          sut_yem_paritesi, litre_basina_cig_sut_destegi_tl,
          sut_yem_paritesi_destek_dahil, fiyat_maliyet_farki_tl_lt,
          fiyat_maliyet_farki_tl_lt_destek_dahil, karlilik
          FROM oner_cig_sut_ekonomik_gostergeler 
          ORDER BY tarih DESC LIMIT 60`;
        
        const economicRes = await fetchQuery(economicQuery);
        if (economicRes.data && economicRes.data.length > 0) {
          const mapped = economicRes.data.map((item: Record<string, string | number>) => ({
            tarih: String(item['tarih'] || ''),
            misir_silaji: Number(item['misir_silaji']) || 0,
            yonca: Number(item['yonca']) || 0,
            saman: Number(item['saman']) || 0,
            sut_yemi_19_hp: Number(item['sut_yemi_19_hp']) || 0,
            cig_sut_uretim_maliyeti_tl_lt: Number(item['cig_sut_uretim_maliyeti_tl_lt']) || 0,
            usk_cig_sut_tavsiye_fiyati_tl_lt: Number(item['usk_cig_sut_tavsiye_fiyati_tl_lt']) || 0,
            sut_yem_paritesi: Number(item['sut_yem_paritesi']) || 0,
            litre_basina_cig_sut_destegi_tl: Number(item['litre_basina_cig_sut_destegi_tl']) || 0,
            sut_yem_paritesi_destek_dahil: Number(item['sut_yem_paritesi_destek_dahil']) || 0,
            fiyat_maliyet_farki_tl_lt: Number(item['fiyat_maliyet_farki_tl_lt']) || 0,
            fiyat_maliyet_farki_tl_lt_destek_dahil: Number(item['fiyat_maliyet_farki_tl_lt_destek_dahil']) || 0,
            karlilik: Number(item['karlilik']) || 0,
          }));
          setEconomicData(mapped);
          if (mapped.length > 0) {
            setEconEndDate(mapped[0].tarih);
            setEconStartDate(mapped[Math.min(11, mapped.length - 1)].tarih);
          }
        }
      } catch (economicError) {
        console.warn('Süt ekonomik göstergeleri yüklenemedi:', economicError);
        setEconomicData([]);
      }

      // Sanayiye Giden Süt verilerini yükle
      try {
        const industryQuery = `SELECT 
          DATE_FORMAT(yil, '%Y-%m') as yil,
          inek_sutu_ton, yagsiz_sut_tozu_ton, tereyag_ton, inek_peyniri_ton,
          yogurt_ton, ayran_ton, icme_sutu_pastorize_uht_vb_ton
          FROM oner_sanayiye_giden_sut_ve_sut_urunu 
          ORDER BY yil DESC LIMIT 24`;
        const industryRes = await fetchQuery(industryQuery);
        if (industryRes.data && industryRes.data.length > 0) {
          const mapped = industryRes.data.map((item: Record<string, string | number>) => ({
            yil: String(item['yil'] || ''),
            inek_sutu_ton: Number(item['inek_sutu_ton']) || 0,
            yagsiz_sut_tozu_ton: Number(item['yagsiz_sut_tozu_ton']) || 0,
            tereyag_ton: Number(item['tereyag_ton']) || 0,
            inek_peyniri_ton: Number(item['inek_peyniri_ton']) || 0,
            yogurt_ton: Number(item['yogurt_ton']) || 0,
            ayran_ton: Number(item['ayran_ton']) || 0,
            icme_sutu_pastorize_uht_vb_ton: Number(item['icme_sutu_pastorize_uht_vb_ton']) || 0,
          }));
          setIndustrySutData(mapped);
        }
      } catch (err) {
        console.warn('Sanayiye giden süt verileri yüklenemedi:', err);
      }

      // Dünya Süt Fiyatları
      try {
        const worldPricesQuery = 'SELECT * FROM oner_dunya_sut_fiyatlari LIMIT 1';
        const worldRes = await fetchQuery(worldPricesQuery);
        if (worldRes.data && worldRes.data.length > 0) {
          const item = worldRes.data[0];
          setWorldMilkPrices({
            abd_class_3: Number(item['abd_class_3']) || 0,
            ab_27: Number(item['ab_27']) || 0,
            yeni_zelanda: Number(item['yeni_zelanda']) || 0,
            almanya: Number(item['almanya']) || 0,
            italya: Number(item['italya']) || 0,
            turkiye: Number(item['turkiye']) || 0,
          });
        }
      } catch (err) {
        console.warn('Dünya süt fiyatları yüklenemedi:', err);
      }

      // Verimlilik verileri
      try {
        const productivityQuery = `SELECT 
          DATE_FORMAT(yil, '%Y') as yil,
          cig_sut_verimi_lt 
          FROM oner_verimlilikler 
          ORDER BY yil ASC`;
        const prodRes = await fetchQuery(productivityQuery);
        if (prodRes.data && prodRes.data.length > 0) {
          const mapped = prodRes.data.map((item: Record<string, string | number>) => ({
            yil: String(item['yil'] || ''),
            cig_sut_verimi_lt: Number(item['cig_sut_verimi_lt']) || 0,
          }));
          setProductivity(mapped);
        }
      } catch (err) {
        console.warn('Verimlilik verileri yüklenemedi:', err);
      }

      // Verimlilik Karşılaştırması
      try {
        const compQuery = 'SELECT ulke, karkas_verimi FROM oner_verimlilik_karsilastirma ORDER BY karkas_verimi DESC';
        const compRes = await fetchQuery(compQuery);
        if (compRes.data && compRes.data.length > 0) {
          const mapped = compRes.data
            .map((item: Record<string, string | number>) => ({
              ulke: String(item['ulke'] || ''),
              karkas_verimi: Number(item['karkas_verimi']) || 0,
            }))
            .filter(d => d.ulke && d.ulke.trim().length > 0);
          setProductivityComparison(mapped);
        }
      } catch (err) {
        console.warn('Verimlilik karşılaştırma verileri yüklenemedi:', err);
      }

      // Yeterlilikler
      try {
        const suffQuery = 'SELECT * FROM oner_yeterlilikler LIMIT 1';
        const suffRes = await fetchQuery(suffQuery);
        if (suffRes.data && suffRes.data.length > 0) {
          setSufficiency(suffRes.data[0]);
        }
      } catch (err) {
        console.warn('Yeterlilik verileri yüklenemedi:', err);
      }

      // Dünya Sıralamaları - oner_dunya_hayvansal_uretim_miktarla tablosundan hesapla
      try {
        const euCountries = ['Almanya', 'Fransa', 'İtalya', 'İspanya', 'Hollanda', 'Belçika', 'Polonya', 'Romanya', 'Avusturya', 'Bulgaristan', 'Hırvatistan', 'Çekya', 'Danimarka', 'Estonya', 'Finlandiya', 'Yunanistan', 'Macaristan', 'İrlanda', 'Letonya', 'Litvanya', 'Portekiz', 'Slovakya', 'Slovenya', 'İsveç'];
        const euList = euCountries.map(c => `'${c}'`).join(',');

        // Sığır sütü sıralaması
        const cattleQuery = `
          SELECT 
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Sığırların çiğ sütü' 
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Sığırların çiğ sütü')) as world_rank,
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Sığırların çiğ sütü' 
             AND ulke IN (${euList}, 'Türkiye')
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Sığırların çiğ sütü')) as eu_rank
        `;
        const cattleRes = await fetchQuery(cattleQuery);

        // Koyun sütü sıralaması
        const sheepQuery = `
          SELECT 
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Koyunların çiğ sütü' 
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Koyunların çiğ sütü')) as world_rank,
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Koyunların çiğ sütü' 
             AND ulke IN (${euList}, 'Türkiye')
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Koyunların çiğ sütü')) as eu_rank
        `;
        const sheepRes = await fetchQuery(sheepQuery);

        // Keçi sütü sıralaması  
        const goatQuery = `
          SELECT 
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Keçilerin çiğ sütü' 
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Keçilerin çiğ sütü')) as world_rank,
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Keçilerin çiğ sütü' 
             AND ulke IN (${euList}, 'Türkiye')
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Keçilerin çiğ sütü')) as eu_rank
        `;
        const goatRes = await fetchQuery(goatQuery);

        if (cattleRes.data && sheepRes.data && goatRes.data) {
          setWorldRankings({
            cattle: {
              world: Number(cattleRes.data[0]?.world_rank) || 0,
              eu: Number(cattleRes.data[0]?.eu_rank) || 0
            },
            sheep: {
              world: Number(sheepRes.data[0]?.world_rank) || 0,
              eu: Number(sheepRes.data[0]?.eu_rank) || 0
            },
            goat: {
              world: Number(goatRes.data[0]?.world_rank) || 0,
              eu: Number(goatRes.data[0]?.eu_rank) || 0
            }
          });
        }
      } catch (err) {
        console.warn('Dünya sıralaması verileri yüklenemedi:', err);
      }

      // TÜİK Süt ve Süt Ürünleri
      try {
        const tuikSutQuery = `SELECT * FROM tuik_hayavancilik_sutvesuturunleri ORDER BY urun, yil`;
        const tuikSutRes = await fetchQuery(tuikSutQuery);
        if (tuikSutRes.data && tuikSutRes.data.length > 0) {
          const mapped: TuikSutUrunData[] = tuikSutRes.data.map((item: Record<string, string | number>) => ({
            urun: String(item['urun'] || ''),
            birim: String(item['birim'] || ''),
            yil: Number(item['yil']) || 0,
            toplam: Number(item['TOPLAM']) || 0,
            aylar: [
              Number(item['Ocak']) || 0,
              Number(item['Şubat'] ?? item['Subat']) || 0,
              Number(item['Mart']) || 0,
              Number(item['Nisan']) || 0,
              Number(item['Mayıs'] ?? item['Mayis']) || 0,
              Number(item['Haziran']) || 0,
              Number(item['Temmuz']) || 0,
              Number(item['Ağustos'] ?? item['Agustos']) || 0,
              Number(item['Eylül'] ?? item['Eylul']) || 0,
              Number(item['Ekim']) || 0,
              Number(item['Kasım'] ?? item['Kasim']) || 0,
              Number(item['Aralık'] ?? item['Aralik']) || 0,
            ],
          }));
          setTuikSutData(mapped);
        }
      } catch (err) {
        console.warn('TÜİK süt ürünleri verileri yüklenemedi:', err);
      }
    } catch (e) {
      console.error('Veri yüklenirken hata:', e);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const latest = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].totalTon > 0) return series[i];
    }
    return series[series.length - 1];
  }, [series]);

  const prev = useMemo(() => {
    if (!latest) return undefined;
    const idx = series.findIndex((p) => p.year === latest.year);
    if (idx > 0) return series[idx - 1];
    return undefined;
  }, [latest, series]);

  const yoy = useMemo(() => {
    if (!latest || !prev || prev.totalTon <= 0) return 0;
    return ((latest.totalTon - prev.totalTon) / prev.totalTon) * 100;
  }, [latest, prev]);

  const latestBreakdown = useMemo(() => {
    const total = latest?.totalTon ?? 0;
    const rows = [
      { name: 'Büyükbaş', value: latest?.cattleTon ?? 0 },
      { name: 'Koyun', value: latest?.sheepTon ?? 0 },
      { name: 'Keçi', value: latest?.goatTon ?? 0 },
    ].filter((r) => r.value > 0);

    const safeTotal = total > 0 ? total : rows.reduce((s, r) => s + r.value, 0);
    return {
      total: safeTotal,
      rows: rows.map((r) => ({
        ...r,
        share: safeTotal > 0 ? (r.value / safeTotal) * 100 : 0,
      })),
    };
  }, [latest]);

  // CAGR Hesaplama (10 yıllık)
  const cagr = useMemo(() => {
    if (series.length < 10) return 0;
    const tenYearsAgo = series[series.length - 10];
    if (!tenYearsAgo || !latest || tenYearsAgo.totalTon <= 0) return 0;
    const years = latest.year - tenYearsAgo.year;
    if (years <= 0) return 0;
    return (Math.pow(latest.totalTon / tenYearsAgo.totalTon, 1 / years) - 1) * 100;
  }, [series, latest]);

  // Büyükbaş Payı
  const cattleShare = useMemo(() => {
    if (!latest || latest.totalTon <= 0) return 0;
    return (latest.cattleTon / latest.totalTon) * 100;
  }, [latest]);

  // Yıllık Büyüme Oranları  
  const growthRates = useMemo(() => {
    return series.slice(1).map((point, idx) => {
      const prevPoint = series[idx];
      const rate = prevPoint.totalTon > 0 
        ? ((point.totalTon - prevPoint.totalTon) / prevPoint.totalTon) * 100 
        : 0;
      return { year: point.year, rate };
    });
  }, [series]);

  // TÜİK Süt Ürünleri hesaplamaları
  const tuikSelectedData = useMemo(() => {
    return tuikSutData.filter(d => d.urun === selectedTuikSutUrun).sort((a, b) => a.yil - b.yil);
  }, [tuikSutData, selectedTuikSutUrun]);

  const tuikLatestYear = useMemo(() => {
    if (tuikSelectedData.length === 0) return null;
    for (let i = tuikSelectedData.length - 1; i >= 0; i--) {
      if (tuikSelectedData[i].toplam > 0) return tuikSelectedData[i];
    }
    return tuikSelectedData[tuikSelectedData.length - 1];
  }, [tuikSelectedData]);

  const tuikPrevYear = useMemo(() => {
    if (!tuikLatestYear) return null;
    return tuikSelectedData.find(d => d.yil === tuikLatestYear.yil - 1) ?? null;
  }, [tuikSelectedData, tuikLatestYear]);

  const tuikYoyChange = useMemo(() => {
    if (!tuikLatestYear || !tuikPrevYear || tuikPrevYear.toplam <= 0) return 0;
    return ((tuikLatestYear.toplam - tuikPrevYear.toplam) / tuikPrevYear.toplam) * 100;
  }, [tuikLatestYear, tuikPrevYear]);

  // Tüm ürünlerin son yıl karşılaştırması
  const tuikAllProductsLatest = useMemo(() => {
    if (tuikSutData.length === 0) return [];
    const latestYil = Math.max(...tuikSutData.filter(d => d.toplam > 0).map(d => d.yil));
    return tuikSutData
      .filter(d => d.yil === latestYil && d.toplam > 0)
      .sort((a, b) => b.toplam - a.toplam);
  }, [tuikSutData]);

  // Mevsimsellik: son yıl aylık dağılım
  const tuikSeasonality = useMemo(() => {
    if (!tuikLatestYear) return [];
    return AY_ADLARI.map((ay, idx) => ({
      ay,
      ayTam: AY_TAM[idx],
      miktar: tuikLatestYear.aylar[idx] || 0,
    }));
  }, [tuikLatestYear]);

  // Mevsimsellik heatmap: tüm yıllar x aylar (seçili ürün)
  const tuikSeasonHeatmap = useMemo(() => {
    return tuikSelectedData.map(d => ({
      yil: d.yil,
      ...Object.fromEntries(AY_ADLARI.map((ay, idx) => [ay, d.aylar[idx] || 0])),
    }));
  }, [tuikSelectedData]);

  // Yıllık büyüme oranları (TÜİK)
  const tuikGrowthRates = useMemo(() => {
    return tuikSelectedData.slice(1).map((d, idx) => {
      const prev = tuikSelectedData[idx];
      const rate = prev.toplam > 0 ? ((d.toplam - prev.toplam) / prev.toplam) * 100 : 0;
      return { yil: d.yil, rate };
    });
  }, [tuikSelectedData]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🥛 Türkiye Süt Üretimi (TÜİK)</h1>
        <p className="page-subtitle">Yıllık süt üretimi ve türlere göre dağılım (ton)</p>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          {/* Hero KPI Section */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '20px', 
            marginBottom: '32px' 
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              padding: '28px', 
              borderRadius: '16px', 
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>🥛</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>
                  TOPLAM ÜRETİM {latest?.year}
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', lineHeight: 1 }}>
                  {formatTon(latest?.totalTon ?? 0)}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginTop: '12px' }}>
                  Yıllık süt üretimi
                </div>
              </div>
            </div>

            <div style={{ 
              background: yoy >= 0 ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              padding: '28px', 
              borderRadius: '16px', 
              boxShadow: `0 4px 16px ${yoy >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>{yoy >= 0 ? '📈' : '📉'}</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>
                  YILLIK DEĞİŞİM
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', lineHeight: 1 }}>
                  {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginTop: '12px' }}>
                  Önceki yıla göre
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
              padding: '28px', 
              borderRadius: '16px', 
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>🐄</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>
                  BÜYÜKBAŞ PAYI
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', lineHeight: 1 }}>
                  %{cattleShare.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginTop: '12px' }}>
                  Toplam üretimde
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
              padding: '28px', 
              borderRadius: '16px', 
              boxShadow: '0 4px 16px rgba(139, 92, 246, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>📊</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>
                  10 YILLIK CAGR
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', lineHeight: 1 }}>
                  %{cagr.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginTop: '12px' }}>
                  Bileşik büyüme
                </div>
              </div>
            </div>

            {sufficiency && (
              <div style={{
                background: Number(sufficiency.sut_ton) >= 1 ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                padding: '28px',
                borderRadius: '16px',
                boxShadow: Number(sufficiency.sut_ton) >= 1 ? '0 4px 16px rgba(34, 197, 94, 0.2)' : '0 4px 16px rgba(239, 68, 68, 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>🥛</div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>
                    YETERLİLİK
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', lineHeight: 1 }}>
                    %{(Number(sufficiency.sut_ton) * 100).toFixed(0)}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginTop: '12px' }}>
                    {Number(sufficiency.sut_ton) >= 1 ? '✓ Yeterli' : '✗ Yetersiz'}
                  </div>
                </div>
              </div>
            )}

            {/* Dünya Sıralamaları */}
            {worldRankings && (
              <>
                {/* Büyükbaş (İnek) Dünya Sıralaması */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                  padding: '28px', 
                  borderRadius: '16px',
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>🐄</div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>
                      İNEK SÜT ÜRETİMİ
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', lineHeight: 1, marginBottom: '8px' }}>
                      Dünya #{worldRankings.cattle.world}
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>
                      AB #{worldRankings.cattle.eu}
                    </div>
                  </div>
                </div>

                {/* Koyun Dünya Sıralaması */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 
                  padding: '28px', 
                  borderRadius: '16px',
                  boxShadow: '0 4px 16px rgba(6, 182, 212, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>🐑</div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>
                      KOYUN SÜT ÜRETİMİ
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', lineHeight: 1, marginBottom: '8px' }}>
                      Dünya #{worldRankings.sheep.world}
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>
                      AB #{worldRankings.sheep.eu}
                    </div>
                  </div>
                </div>

                {/* Keçi Dünya Sıralaması */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)', 
                  padding: '28px', 
                  borderRadius: '16px',
                  boxShadow: '0 4px 16px rgba(168, 85, 247, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '8rem', opacity: 0.1 }}>🐐</div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>
                      KEÇİ SÜT ÜRETİMİ
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', lineHeight: 1, marginBottom: '8px' }}>
                      Dünya #{worldRankings.goat.world}
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>
                      AB #{worldRankings.goat.eu}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ─── 🧠 Intelligence Panel ─── */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '48px',
            color: 'white'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🧠 Süt Üretimi Intelligence Özeti
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>10 YILLIK CAGR</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Yıllık bileşik büyüme</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>YILLIK DEĞİŞİM</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Son yıl</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>BÜYÜKBAŞ PAYI</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>%{cattleShare.toFixed(1)}</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Toplam üretimde</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>YETERLİLİK</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{sufficiency ? `%${(Number(sufficiency.sut_ton) * 100).toFixed(0)}` : '-'}</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>{sufficiency && Number(sufficiency.sut_ton) >= 1 ? '✓ Yeterli' : '✗ Yetersiz'}</div>
              </div>
            </div>
          </div>

          {/* Üretim Analizi Bölümü */}
          <div style={{ marginTop: '48px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              📊 Üretim Analizi
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Türkiye süt üretimi tarihsel trendler ve türlere göre detaylı analiz
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '24px'
          }}>
            {/* Toplam Üretim Trendi - 2 kolon */}
            <div style={{ 
              gridColumn: 'span 2',
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📈 Toplam Süt Üretimi Trendi (Tüm Yıllar)
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={series} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                  <Tooltip 
                    formatter={(value: number) => [formatTon(value)]} 
                    labelFormatter={(label) => `Yıl: ${label}`}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="totalTon" name="Toplam" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                  <Line type="monotone" dataKey="cattleTon" name="Büyükbaş" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="sheepTon" name="Koyun" stroke="#14b8a6" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="goatTon" name="Keçi" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Türlere Göre Dağılım Pie */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🥧 Türlere Göre Dağılım ({latest?.year ?? '-'})
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie
                    data={latestBreakdown.rows}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={60}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                    labelLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1 }}
                  >
                    {latestBreakdown.rows.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatTon(value), ''] } />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Yıllık Büyüme Oranları */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📊 Yıllık Büyüme Oranları (%)
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={growthRates.slice(-15)} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(2)}%`]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    name="Büyüme %" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Toplam Üretim - Son 5 Yıl Trend */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              gridColumn: 'span 2'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📈 Son 5 Yıl Toplam Üretim Trendi
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={series.slice(-5)} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                  <Tooltip 
                    formatter={(value: number) => [formatTon(value)]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalTon" 
                    name="Toplam Üretim" 
                    fill="#8b5cf6" 
                    stroke="#8b5cf6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalTon" 
                    stroke="#7c3aed" 
                    strokeWidth={4}
                    dot={{ fill: '#7c3aed', r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Büyükbaş Süt Üretimi - Son 5 Yıl */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🐄 Büyükbaş (Son 5 Yıl)
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={series.slice(-5)} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                  <Tooltip 
                    formatter={(value: number) => [formatTon(value)]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} 
                  />
                  <Bar 
                    dataKey="cattleTon" 
                    name="Büyükbaş"
                    radius={[6, 6, 0, 0]}
                    fill="#10b981"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Koyun Süt Üretimi - Son 5 Yıl */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🐑 Koyun (Son 5 Yıl)
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={series.slice(-5)} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                  <Tooltip 
                    formatter={(value: number) => [formatTon(value)]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} 
                  />
                  <Bar 
                    dataKey="sheepTon" 
                    name="Koyun"
                    radius={[6, 6, 0, 0]}
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Keçi Süt Üretimi - Son 5 Yıl */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🐐 Keçi (Son 5 Yıl)
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={series.slice(-5)} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                  <Tooltip 
                    formatter={(value: number) => [formatTon(value)]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} 
                  />
                  <Bar 
                    dataKey="goatTon" 
                    name="Keçi"
                    radius={[6, 6, 0, 0]}
                    fill="#f59e0b"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Verimlilik & Yeterlilik Bölümü */}
          {(productivity.length > 0 || worldMilkPrices || sufficiency) && (
            <>
              <div style={{ marginTop: '40px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  ⚡ Verimlilik Göstergeleri
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  Türkiye süt üretim verimi ve dünya karşılaştırması
                </p>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '20px',
                marginBottom: '24px'
              }}>
                {/* Süt Verimi Trendi */}
                {productivity.length > 0 && (
                  <div style={{ 
                    background: 'var(--bg-card)', 
                    padding: '24px', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📈 Süt Verimi Trendi (Litre/Baş)
                    </h3>
                    <ResponsiveContainer width="100%" height={340}>
                      <ComposedChart data={productivity} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)} lt/baş`]}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="cig_sut_verimi_lt" 
                          fill="#8b5cf6" 
                          stroke="#8b5cf6"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="cig_sut_verimi_lt" 
                          name="Süt Verimi" 
                          stroke="#7c3aed" 
                          strokeWidth={3}
                          dot={{ fill: '#7c3aed', r: 4 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Dünya Verimlilik Karşılaştırması */}
                {productivityComparison.length > 0 && (
                  <div style={{ 
                    background: 'var(--bg-card)', 
                    padding: '24px', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🌍 Dünya Karkas Verimi Karşılaştırması
                    </h3>
                    <ResponsiveContainer width="100%" height={340}>
                      <BarChart data={productivityComparison} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis 
                          dataKey="ulke" 
                          tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value: number) => [`${value} kg/baş`]}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                        <Bar 
                          dataKey="karkas_verimi" 
                          name="Karkas Verimi"
                          radius={[6, 6, 0, 0]}
                        >
                          {productivityComparison.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.ulke === 'Türkiye' ? '#ef4444' : '#3b82f6'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Sanayiye Giden Süt ve Ürünler */}
          {industrySutData.length > 0 && (
            <>
              <div style={{ marginTop: '40px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  🏭 Sanayiye Giden Süt ve Ürünler
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  Süt sanayiinde kullanılan süt ve üretilen ürün miktarları - Aylık tüketim analizi
                </p>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '20px',
                marginBottom: '24px'
              }}>
                {/* Radar Chart - Ürün Dağılımı */}
                <div style={{ 
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎯 Ürün Dağılım Haritası
                  </h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <RadarChart data={[
                      { urun: 'Yoğurt', miktar: (industrySutData[0]?.yogurt_ton || 0) / 1000 },
                      { urun: 'Peynir', miktar: (industrySutData[0]?.inek_peyniri_ton || 0) / 1000 },
                      { urun: 'Ayran', miktar: (industrySutData[0]?.ayran_ton || 0) / 1000 },
                      { urun: 'İçme Sütü', miktar: (industrySutData[0]?.icme_sutu_pastorize_uht_vb_ton || 0) / 1000 },
                      { urun: 'Tereyağı', miktar: (industrySutData[0]?.tereyag_ton || 0) / 1000 },
                      { urun: 'Süt Tozu', miktar: (industrySutData[0]?.yagsiz_sut_tozu_ton || 0) / 1000 },
                    ]}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="urun" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                      <Radar name="Tüketim (bin ton)" dataKey="miktar" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)} bin ton`]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Yoğurt Tüketimi */}
                <div style={{ 
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🥣 Yoğurt Üretimi (Aylık)
                  </h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart data={industrySutData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="yil" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="yogurt_ton" 
                        name="Yoğurt" 
                        fill="#10b981" 
                        stroke="#10b981"
                        fillOpacity={0.4}
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="yogurt_ton" 
                        stroke="#059669" 
                        strokeWidth={3}
                        dot={{ fill: '#059669', r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Peynir Tüketimi */}
                <div style={{ 
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🧀 Peynir Üretimi (Aylık)
                  </h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart data={industrySutData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="yil" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="inek_peyniri_ton" 
                        name="Peynir" 
                        fill="#f59e0b" 
                        stroke="#f59e0b"
                        fillOpacity={0.4}
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="inek_peyniri_ton" 
                        stroke="#d97706" 
                        strokeWidth={3}
                        dot={{ fill: '#d97706', r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Ayran Tüketimi */}
                <div style={{ 
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🥤 Ayran Üretimi (Aylık)
                  </h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart data={industrySutData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="yil" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="ayran_ton" 
                        name="Ayran" 
                        fill="#3b82f6" 
                        stroke="#3b82f6"
                        fillOpacity={0.4}
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="ayran_ton" 
                        stroke="#2563eb" 
                        strokeWidth={3}
                        dot={{ fill: '#2563eb', r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* İçme Sütü Tüketimi */}
                <div style={{ 
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🥛 İçme Sütü Üretimi (Aylık)
                  </h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart data={industrySutData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="yil" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="icme_sutu_pastorize_uht_vb_ton" 
                        name="İçme Sütü" 
                        fill="#06b6d4" 
                        stroke="#06b6d4"
                        fillOpacity={0.4}
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="icme_sutu_pastorize_uht_vb_ton" 
                        stroke="#0891b2" 
                        strokeWidth={3}
                        dot={{ fill: '#0891b2', r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Tereyağı Tüketimi */}
                <div style={{ 
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🧈 Tereyağı Üretimi (Aylık)
                  </h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart data={industrySutData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="yil" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="tereyag_ton" 
                        name="Tereyağı" 
                        fill="#eab308" 
                        stroke="#eab308"
                        fillOpacity={0.4}
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="tereyag_ton" 
                        stroke="#ca8a04" 
                        strokeWidth={3}
                        dot={{ fill: '#ca8a04', r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Süt Tozu Tüketimi */}
                <div style={{ 
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🥛 Süt Tozu Üretimi (Aylık)
                  </h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <LineChart data={industrySutData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="yil" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="yagsiz_sut_tozu_ton" 
                        name="Süt Tozu"
                        stroke="#a855f7" 
                        strokeWidth={3}
                        dot={{ fill: '#a855f7', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Ham İnek Sütü Kullanımı - Span 2 */}
                <div style={{ 
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  gridColumn: 'span 2'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📈 Sanayiye Giden Ham İnek Sütü (Aylık Trend)
                  </h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart data={industrySutData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="yil" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number) => [`${(value / 1000).toFixed(1)} bin ton`]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="inek_sutu_ton" 
                        name="Ham İnek Sütü" 
                        fill="#22c55e" 
                        stroke="#22c55e"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="inek_sutu_ton" 
                        stroke="#16a34a" 
                        strokeWidth={4}
                        dot={{ fill: '#16a34a', r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* TÜİK Süt ve Süt Ürünleri Analizi */}
          {tuikSutData.length > 0 && (
            <>
              <div style={{ marginTop: '48px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  📊 TÜİK Süt ve Süt Ürünleri (2010-2025)
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  Sanayiye giden süt ve üretilen ürün miktarları — Yıllık ve aylık detaylı TÜİK verileri
                </p>
              </div>

              {/* Ürün Seçici */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                {TUIK_SUT_URUNLER.map(urun => (
                  <button
                    key={urun.id}
                    onClick={() => setSelectedTuikSutUrun(urun.id)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '12px',
                      border: selectedTuikSutUrun === urun.id ? `2px solid ${urun.color}` : '2px solid var(--border)',
                      background: selectedTuikSutUrun === urun.id ? `${urun.color}15` : 'var(--bg-card)',
                      color: selectedTuikSutUrun === urun.id ? urun.color : 'var(--text-secondary)',
                      fontWeight: selectedTuikSutUrun === urun.id ? '700' : '500',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {urun.emoji} {urun.label}
                  </button>
                ))}
              </div>

              {/* KPI Kartları */}
              {tuikLatestYear && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                  gap: '16px', 
                  marginBottom: '28px' 
                }}>
                  <div style={{
                    background: `linear-gradient(135deg, ${TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.color || '#3b82f6'} 0%, ${TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.color || '#3b82f6'}dd 100%)`,
                    padding: '24px', borderRadius: '14px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>
                      {TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.emoji}
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                        {tuikLatestYear.yil} YILLIK TOPLAM
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                        {new Intl.NumberFormat('tr-TR').format(tuikLatestYear.toplam)} {tuikLatestYear.birim}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: tuikYoyChange >= 0 ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    padding: '24px', borderRadius: '14px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>{tuikYoyChange >= 0 ? '📈' : '📉'}</div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                        YILLIK DEĞİŞİM
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                        {tuikYoyChange >= 0 ? '+' : ''}{tuikYoyChange.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {tuikSelectedData.length >= 5 && (() => {
                    const fiveAgo = tuikSelectedData[tuikSelectedData.length - 5];
                    if (!fiveAgo || fiveAgo.toplam <= 0) return null;
                    const change5 = ((tuikLatestYear.toplam - fiveAgo.toplam) / fiveAgo.toplam) * 100;
                    return (
                      <div style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        padding: '24px', borderRadius: '14px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)', position: 'relative', overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>📊</div>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                            5 YILLIK DEĞİŞİM
                          </div>
                          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                            {change5 >= 0 ? '+' : ''}{change5.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {tuikSeasonality.length > 0 && (() => {
                    const maxMonth = tuikSeasonality.reduce((max, m) => m.miktar > max.miktar ? m : max, tuikSeasonality[0]);
                    return (
                      <div style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        padding: '24px', borderRadius: '14px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)', position: 'relative', overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>📅</div>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                            EN YOĞUN AY
                          </div>
                          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                            {maxMonth.ayTam}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>
                            {new Intl.NumberFormat('tr-TR').format(maxMonth.miktar)} {tuikLatestYear.birim}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '20px',
                marginBottom: '24px'
              }}>
                {/* Yıllık Trend */}
                <div style={{ 
                  gridColumn: 'span 2',
                  background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
                  border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📈 {selectedTuikSutUrun} — Yıllık Üretim Trendi (Ton)
                  </h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart data={tuikSelectedData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                      <Tooltip 
                        formatter={(value: number) => [new Intl.NumberFormat('tr-TR').format(value) + ' ton']}
                        labelFormatter={(label) => `Yıl: ${label}`}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Area 
                        type="monotone" dataKey="toplam" name="Yıllık Toplam"
                        fill={TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.color || '#3b82f6'}
                        stroke={TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.color || '#3b82f6'}
                        fillOpacity={0.15} strokeWidth={2}
                      />
                      <Line 
                        type="monotone" dataKey="toplam" name="Üretim"
                        stroke={TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.color || '#3b82f6'}
                        strokeWidth={3} dot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Aylık Mevsimsellik (Son Yıl) */}
                {tuikSeasonality.length > 0 && (
                  <div style={{ 
                    background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
                    border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📅 Aylık Dağılım ({tuikLatestYear?.yil})
                    </h3>
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart data={tuikSeasonality} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="ay" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                        <Tooltip 
                          formatter={(value: number) => [new Intl.NumberFormat('tr-TR').format(value) + ' ton']}
                          labelFormatter={(label) => `${label}`}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                        <Bar dataKey="miktar" name="Aylık Üretim" radius={[6, 6, 0, 0]}>
                          {tuikSeasonality.map((entry, index) => {
                            const maxVal = Math.max(...tuikSeasonality.map(s => s.miktar));
                            const intensity = entry.miktar / (maxVal || 1);
                            const baseColor = TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.color || '#3b82f6';
                            return <Cell key={index} fill={baseColor} fillOpacity={0.4 + intensity * 0.6} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Büyüme Oranları */}
                {tuikGrowthRates.length > 0 && (
                  <div style={{ 
                    background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
                    border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📊 Yıllık Büyüme Oranları (%)
                    </h3>
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart data={tuikGrowthRates} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`]}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                        <Bar dataKey="rate" name="Büyüme %" radius={[6, 6, 0, 0]}>
                          {tuikGrowthRates.map((entry, index) => (
                            <Cell key={index} fill={entry.rate >= 0 ? '#22c55e' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Tüm Ürünler Karşılaştırması */}
                {tuikAllProductsLatest.length > 0 && (
                  <div style={{ 
                    gridColumn: 'span 2',
                    background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
                    border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🏆 Tüm Süt Ürünleri Karşılaştırması ({tuikAllProductsLatest[0]?.yil})
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart 
                        data={tuikAllProductsLatest} 
                        margin={{ top: 10, right: 24, left: 0, bottom: 60 }}
                        layout="horizontal"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis 
                          dataKey="urun" 
                          tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                          angle={-35}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                        <Tooltip 
                          formatter={(value: number, _name: string, props: { payload?: { birim?: string } }) => [
                            `${new Intl.NumberFormat('tr-TR').format(value)} ${props.payload?.birim ?? ''}`
                          ]}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                        <Bar dataKey="toplam" name="Yıllık Toplam" radius={[6, 6, 0, 0]}>
                          {tuikAllProductsLatest.map((entry, index) => {
                            const urunInfo = TUIK_SUT_URUNLER.find(u => u.id === entry.urun);
                            return (
                              <Cell 
                                key={index} 
                                fill={urunInfo?.color || COLORS[index % COLORS.length]} 
                                fillOpacity={entry.urun === selectedTuikSutUrun ? 1 : 0.6}
                                stroke={entry.urun === selectedTuikSutUrun ? '#000' : 'none'}
                                strokeWidth={entry.urun === selectedTuikSutUrun ? 2 : 0}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Mevsimsellik Isı Haritası (tüm yıllar) */}
                {tuikSeasonHeatmap.length > 0 && (
                  <div style={{ 
                    gridColumn: 'span 2',
                    background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
                    border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🌡️ Mevsimsellik Analizi — {selectedTuikSutUrun} (Yıl x Ay)
                    </h3>
                    <ResponsiveContainer width="100%" height={380}>
                      <ComposedChart data={tuikSeasonHeatmap} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                        <Tooltip 
                          formatter={(value: number) => [new Intl.NumberFormat('tr-TR').format(value) + ' ton']}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                        <Legend />
                        {AY_ADLARI.map((ay, idx) => (
                          <Bar 
                            key={ay} 
                            dataKey={ay} 
                            name={AY_TAM[idx]} 
                            stackId="months"
                            fill={`hsl(${(idx * 30) % 360}, 65%, 55%)`}
                          />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Üretim Tablosu */}
                <div style={{ 
                  gridColumn: 'span 2',
                  background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
                  border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 {selectedTuikSutUrun} — Yıllık Detay Tablosu
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: 'var(--text-primary)' }}>Yıl</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)' }}>Toplam</th>
                          {AY_ADLARI.map(ay => (
                            <th key={ay} style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{ay}</th>
                          ))}
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)' }}>Değişim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tuikSelectedData.slice().reverse().map((row, idx) => {
                          const prevRow = tuikSelectedData.find(d => d.yil === row.yil - 1);
                          const change = prevRow && prevRow.toplam > 0 ? ((row.toplam - prevRow.toplam) / prevRow.toplam) * 100 : null;
                          return (
                            <tr key={row.yil} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-card)' }}>
                              <td style={{ padding: '8px 12px', fontWeight: '700', color: 'var(--text-primary)' }}>{row.yil}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {new Intl.NumberFormat('tr-TR').format(row.toplam)}
                              </td>
                              {row.aylar.map((val, mi) => (
                                <td key={mi} style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                  {val > 0 ? new Intl.NumberFormat('tr-TR').format(val) : '-'}
                                </td>
                              ))}
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: change === null ? 'var(--text-secondary)' : change >= 0 ? '#22c55e' : '#ef4444' }}>
                                {change !== null ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Dünya Süt Fiyatları */}
          {worldMilkPrices && (
            <>
              <div style={{ marginTop: '40px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  🌍 Dünya Süt Fiyatları Karşılaştırması
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  Türkiye ve dünya ülkeleri çiğ süt fiyatları karşılaştırması (USD/kg)
                </p>
              </div>

              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                marginBottom: '24px'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💵 Ülkelere Göre Süt Fiyatları
                </h3>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart 
                    data={[
                      { ulke: 'ABD Class 3', fiyat: worldMilkPrices.abd_class_3 },
                      { ulke: 'AB 27', fiyat: worldMilkPrices.ab_27 },
                      { ulke: 'Yeni Zelanda', fiyat: worldMilkPrices.yeni_zelanda },
                      { ulke: 'Almanya', fiyat: worldMilkPrices.almanya },
                      { ulke: 'İtalya', fiyat: worldMilkPrices.italya },
                      { ulke: 'Türkiye', fiyat: worldMilkPrices.turkiye },
                    ]}
                    margin={{ top: 10, right: 24, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis 
                      dataKey="ulke" 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(3)} USD/kg`]}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    />
                    <Bar 
                      dataKey="fiyat" 
                      name="Fiyat"
                      radius={[8, 8, 0, 0]}
                    >
                      {[0,1,2,3,4,5].map((index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 5 ? '#ef4444' : '#3b82f6'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Süt Ekonomik Göstergeler */}
          {economicData.length > 0 && (
            <>
              <div style={{ 
                marginTop: '40px', 
                marginBottom: '24px'
              }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  🥛 Çiğ Süt Ekonomik Göstergeleri
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Fiyatlar, maliyetler, pariteler ve karlılık analizi
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Başlangıç</label>
                    <input
                      type="month"
                      value={econStartDate}
                      onChange={(e) => setEconStartDate(e.target.value)}
                      max={econEndDate}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'white',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Bitiş</label>
                    <input
                      type="month"
                      value={econEndDate}
                      onChange={(e) => setEconEndDate(e.target.value)}
                      min={econStartDate}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'white',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>
              </div>

              {(() => {
                const filteredData = economicData.filter(d => {
                  if (!econStartDate || !econEndDate) return true;
                  return d.tarih >= econStartDate && d.tarih <= econEndDate;
                });
                return (
                <>
                  {/* Ekonomik KPI Kartları - Gradient Tasarım */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
                    gap: '20px', 
                    marginBottom: '32px' 
                  }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                      padding: '24px', 
                      borderRadius: '14px',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>💰</div>
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                          ÜSK TAVSİYE FİYATI
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                          {filteredData[0]?.usk_cig_sut_tavsiye_fiyati_tl_lt.toFixed(2)} ₺/lt
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                          {filteredData[0]?.tarih}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
                      padding: '24px', 
                      borderRadius: '14px',
                      boxShadow: '0 4px 16px rgba(249, 115, 22, 0.25)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>📊</div>
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                          ÜRETİM MALİYETİ
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                          {filteredData[0]?.cig_sut_uretim_maliyeti_tl_lt.toFixed(2)} ₺/lt
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                          {filteredData[0]?.tarih}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      background: filteredData[0]?.karlilik >= 0 
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
                        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      padding: '24px', 
                      borderRadius: '14px',
                      boxShadow: filteredData[0]?.karlilik >= 0 
                        ? '0 4px 16px rgba(34, 197, 94, 0.25)'
                        : '0 4px 16px rgba(239, 68, 68, 0.25)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>📈</div>
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                          KARLILIK ORANI
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                          {filteredData[0]?.karlilik >= 0 ? '+' : ''}{filteredData[0]?.karlilik.toFixed(2)}%
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                          {filteredData[0]?.tarih}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                      padding: '24px', 
                      borderRadius: '14px',
                      boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🌾</div>
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                          SÜT YEM PARİTESİ
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                          {filteredData[0]?.sut_yem_paritesi.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                          {filteredData[0]?.tarih}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ekonomik Grafikler */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                    gap: '20px',
                    marginBottom: '24px'
                  }}>
                    {/* Fiyat ve Maliyet - 2 kolon */}
                    <div style={{ 
                      gridColumn: 'span 2',
                      background: 'var(--bg-card)', 
                      padding: '24px', 
                      borderRadius: '16px', 
                      border: '1px solid var(--border)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        💰 Fiyat ve Maliyet Trendi
                      </h3>
                      <ResponsiveContainer width="100%" height={340}>
                        <ComposedChart data={filteredData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="tarih" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                            angle={-45} 
                            textAnchor="end" 
                            height={70}
                          />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [`${value.toFixed(2)} ₺/lt`]}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="cig_sut_uretim_maliyeti_tl_lt"
                            name="Maliyet Alanı"
                            fill="#fef3c7"
                            stroke="none"
                            fillOpacity={0.3}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="usk_cig_sut_tavsiye_fiyati_tl_lt" 
                            name="ÜSK Tavsiye Fiyatı" 
                            stroke="#059669" 
                            strokeWidth={4}
                            dot={{ fill: '#059669', r: 5 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="cig_sut_uretim_maliyeti_tl_lt" 
                            name="Üretim Maliyeti" 
                            stroke="#dc2626" 
                            strokeWidth={4}
                            dot={{ fill: '#dc2626', r: 5 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Yem Fiyatları KPI Kartları */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                    gap: '16px', 
                    marginBottom: '24px' 
                  }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                      padding: '20px', 
                      borderRadius: '14px',
                      boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '5rem', opacity: 0.1 }}>🌾</div>
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                          SÜT YEMİ (19% HP)
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                          {filteredData[0]?.sut_yemi_19_hp.toFixed(2)} ₺/kg
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '8px', fontWeight: '600' }}>
                          {filteredData[0]?.tarih}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 
                      padding: '20px', 
                      borderRadius: '14px',
                      boxShadow: '0 4px 16px rgba(6, 182, 212, 0.25)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '5rem', opacity: 0.1 }}>🌽</div>
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                          MISIR SİLAJI
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                          {filteredData[0]?.misir_silaji.toFixed(2)} ₺/kg
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '8px', fontWeight: '600' }}>
                          {filteredData[0]?.tarih}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                      padding: '20px', 
                      borderRadius: '14px',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '5rem', opacity: 0.1 }}>🍀</div>
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                          YONCA
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                          {filteredData[0]?.yonca.toFixed(2)} ₺/kg
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '8px', fontWeight: '600' }}>
                          {filteredData[0]?.tarih}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Yem Fiyatları Detaylı Grafikler */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                    gap: '20px',
                    marginBottom: '24px'
                  }}>
                    {/* Süt Yemi Fiyatları */}
                    <div style={{ 
                      background: 'var(--bg-card)', 
                      padding: '24px', 
                      borderRadius: '16px', 
                      border: '1px solid var(--border)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🌾 Süt Yemi Fiyatları (19% HP)
                      </h3>
                      <ResponsiveContainer width="100%" height={340}>
                        <ComposedChart data={filteredData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="tarih" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                            angle={-45} 
                            textAnchor="end" 
                            height={70}
                          />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="sut_yemi_19_hp" 
                            name="Süt Yemi" 
                            fill="#f59e0b" 
                            stroke="#f59e0b"
                            fillOpacity={0.4}
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="sut_yemi_19_hp" 
                            stroke="#d97706" 
                            strokeWidth={3}
                            dot={{ fill: '#d97706', r: 3 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Mısır Silajı Fiyatları */}
                    <div style={{ 
                      background: 'var(--bg-card)', 
                      padding: '24px', 
                      borderRadius: '16px', 
                      border: '1px solid var(--border)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🌽 Mısır Silajı Fiyatları
                      </h3>
                      <ResponsiveContainer width="100%" height={340}>
                        <ComposedChart data={filteredData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="tarih" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                            angle={-45} 
                            textAnchor="end" 
                            height={70}
                          />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="misir_silaji" 
                            name="Mısır Silajı" 
                            fill="#06b6d4" 
                            stroke="#06b6d4"
                            fillOpacity={0.4}
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="misir_silaji" 
                            stroke="#0891b2" 
                            strokeWidth={3}
                            dot={{ fill: '#0891b2', r: 3 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Yonca Fiyatları */}
                    <div style={{ 
                      background: 'var(--bg-card)', 
                      padding: '24px', 
                      borderRadius: '16px', 
                      border: '1px solid var(--border)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🍀 Yonca Fiyatları
                      </h3>
                      <ResponsiveContainer width="100%" height={340}>
                        <ComposedChart data={filteredData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="tarih" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                            angle={-45} 
                            textAnchor="end" 
                            height={70}
                          />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="yonca" 
                            name="Yonca" 
                            fill="#10b981" 
                            stroke="#10b981"
                            fillOpacity={0.4}
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="yonca" 
                            stroke="#059669" 
                            strokeWidth={3}
                            dot={{ fill: '#059669', r: 3 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Süt Yem Paritesi */}
                    <div style={{ 
                      background: 'var(--bg-card)', 
                      padding: '24px', 
                      borderRadius: '16px', 
                      border: '1px solid var(--border)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📈 Süt-Yem Paritesi
                      </h3>
                      <ResponsiveContainer width="100%" height={340}>
                        <ComposedChart data={filteredData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="tarih" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                            angle={-45} 
                            textAnchor="end" 
                            height={70}
                          />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [`${value.toFixed(2)}`]}
                          />
                          <Legend />
                          <Bar 
                            dataKey="sut_yem_paritesi" 
                            name="Süt-Yem Paritesi" 
                            fill="#3b82f6" 
                            radius={[6, 6, 0, 0]}
                            fillOpacity={0.8}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="sut_yem_paritesi_destek_dahil" 
                            name="Destek Dahil" 
                            stroke="#8b5cf6" 
                            strokeWidth={3}
                            dot={{ fill: '#8b5cf6', r: 4 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Destek Oranı */}
                    <div style={{ 
                      background: 'var(--bg-card)', 
                      padding: '24px', 
                      borderRadius: '16px', 
                      border: '1px solid var(--border)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🎁 Destek Oranı (Fiyat İçinde Destek Payı)
                      </h3>
                      <ResponsiveContainer width="100%" height={340}>
                        <BarChart data={(() => {
                          // Yıllara göre gruplandır ve ortalama al
                          const yearlyData: Record<string, { totalDestek: number; totalFiyat: number; count: number }> = {};
                          
                          filteredData.forEach(item => {
                            const year = item.tarih.substring(0, 4); // "2023-01" -> "2023"
                            if (!yearlyData[year]) {
                              yearlyData[year] = { totalDestek: 0, totalFiyat: 0, count: 0 };
                            }
                            yearlyData[year].totalDestek += item.litre_basina_cig_sut_destegi_tl;
                            yearlyData[year].totalFiyat += item.usk_cig_sut_tavsiye_fiyati_tl_lt;
                            yearlyData[year].count += 1;
                          });
                          
                          return Object.entries(yearlyData)
                            .map(([year, data]) => ({
                              yil: year,
                              avgDestek: data.totalDestek / data.count,
                              avgFiyat: data.totalFiyat / data.count,
                              destekOrani: (data.totalDestek / data.totalFiyat) * 100
                            }))
                            .sort((a, b) => a.yil.localeCompare(b.yil));
                        })()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="yil" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                          />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            label={{ value: '%', angle: 0, position: 'top', offset: 10 }}
                          />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(_value: number, _name: string, props: { payload?: { destekOrani?: number; avgDestek?: number; avgFiyat?: number } }) => {
                              const payload = props.payload;
                              return [
                                `%${payload?.destekOrani?.toFixed(1) ?? '-'} (Ort. Destek: ${payload?.avgDestek?.toFixed(2) ?? '-'} ₺ / Ort. Fiyat: ${payload?.avgFiyat?.toFixed(2) ?? '-'} ₺)`
                              ];
                            }}
                          />
                          <Legend formatter={() => 'Yıllık Ortalama Destek Oranı'} />
                          <Bar 
                            dataKey="destekOrani"
                            name="Destek Oranı (%)"
                            fill="#10b981"
                            radius={[6, 6, 0, 0]}
                            fillOpacity={0.8}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
                );
              })()}
            </>
          )}
        </>
      )}
    </div>
  );
}
