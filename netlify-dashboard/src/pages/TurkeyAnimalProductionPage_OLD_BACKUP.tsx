import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Download, TrendingUp, Award } from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend,
  AreaChart, Area, ComposedChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TurkeyHeatMap } from '../components/TurkeyHeatMap';
import { Loading } from '../components/Loading';
import { fetchQuery } from '../services/api';
import { getRegionByProvince } from '../utils/productionCategories';

// Data Interfaces
interface HistoricalData {
  yillar: string;
  bal_uretimi: number;
  cig_sut_uretimi: number;
  kirmizi_et_uretimi: number;
  yumurta_milyon_adet: number;
  kanatli_eti_ton: number;
}

interface WorldData {
  ulke: string;
  urun: string;
  uretim_miktari_ton: number;
}

interface RedMeatData {
  yil: number;
  sigir: number;
  manda: number;
  buyukbas_toplam: number;
  koyun: number;
  keci: number;
  kucukbas_toplam: number;
  toplam: number;
}

interface PoultryData {
  tarih: string;
  tavuk_yumurtasi_bin_adet: number;
  tavuk_eti_ton: number;
}

interface CityData {
  il: string;
  sigir: number;
  manda: number;
  koyun: number;
  keci: number;
  balUretimi: number;
  kovan: number;
  balmumu: number;
  etTavugu: number;
  yumurtaTavugu: number;
}

const COLORS: Record<string, string> = {
  'Bal': '#f59e0b',
  'Süt': '#3b82f6',
  'Kırmızı Et': '#ef4444',
  'Yumurta': '#fbbf24',
  'Kanatlı': '#10b981',
  'Sığır': '#8b4513',
  'Koyun': '#a0522d',
  'Keçi': '#d2691e',
  'Manda': '#654321',
};

const TurkeyAnimalProductionPage: React.FC = () => {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [worldData, setWorldData] = useState<WorldData[]>([]);
  const [redMeatData, setRedMeatData] = useState<RedMeatData[]>([]);
  const [poultryData, setPoultryData] = useState<PoultryData[]>([]);
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [yearRange, setYearRange] = useState<string>('last10');

  const availableCities = useMemo(() => {
    return Array.from(new Set(data.map(d => d.il))).sort();
  }, [data]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const query = `SELECT * FROM ist.o_illeregore_toplam_hayvan_sayisi`;
      
      const result = await fetchQuery(query);
      if (result.data && result.data.length > 0) {
        // Aynı ilden gelen verileri birleştir (unique il)
        const cityMap = new Map<string, CityData>();
        
        (result.data as Record<string, string | number>[]).forEach(row => {
          const il = String(row['İl'] || row['il'] || '').toUpperCase();
          const existing = cityMap.get(il);
          
          const sigir = parseFloat(String(row['Sığır Varlığı (Baş)'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
          const manda = parseFloat(String(row['Manda Varlığı (Baş)'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
          const koyun = parseFloat(String(row['Koyun Varlığı (Baş)'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
          const keci = parseFloat(String(row['Keçi Varlığı (Baş)'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
          const balUretimi = parseFloat(String(row['Bal Üretimi (Ton)'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
          const kovan = parseFloat(String(row['Kovan Varlığı (Adet)'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
          const balmumu = parseFloat(String(row['Balmumu Üretimi (Ton)'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
          const etTavugu = parseFloat(String(row['Et Tavuğu Sayısı'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
          const yumurtaTavugu = parseFloat(String(row['Yumurta Tavuğu Sayısı'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
          
          if (existing) {
            // İl zaten varsa topla
            existing.sigir += sigir;
            existing.manda += manda;
            existing.koyun += koyun;
            existing.keci += keci;
            existing.balUretimi += balUretimi;
            existing.kovan += kovan;
            existing.balmumu += balmumu;
            existing.etTavugu += etTavugu;
            existing.yumurtaTavugu += yumurtaTavugu;
          } else {
            // Yeni il ekle
            cityMap.set(il, { il, sigir, manda, koyun, keci, balUretimi, kovan, balmumu, etTavugu, yumurtaTavugu });
          }
        });
        
        setData(Array.from(cityMap.values()));
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredData = useMemo(() => {
    if (selectedCity === 'all') return data;
    return data.filter(d => d.il === selectedCity);
  }, [data, selectedCity]);

  // HAYVAN SAYILARI - Tip bazında toplam
  const animalCounts = useMemo(() => {
    const totals = {
      'Sığır': 0,
      'Manda': 0,
      'Koyun': 0,
      'Keçi': 0,
      'Et Tavuğu': 0,
      'Yumurta Tavuğu': 0,
    };
    filteredData.forEach(item => {
      totals['Sığır'] += item.sigir;
      totals['Manda'] += item.manda;
      totals['Koyun'] += item.koyun;
      totals['Keçi'] += item.keci;
      totals['Et Tavuğu'] += item.etTavugu;
      totals['Yumurta Tavuğu'] += item.yumurtaTavugu;
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value, color: COLORS[name] || '#6366f1' }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // BAL VE BALMUMU
  const honeyData = useMemo(() => {
    const totalBal = filteredData.reduce((s, i) => s + i.balUretimi, 0);
    const totalBalmumu = filteredData.reduce((s, i) => s + i.balmumu, 0);
    const totalKovan = filteredData.reduce((s, i) => s + i.kovan, 0);
    return [
      { name: 'Bal Üretimi', value: totalBal, color: '#fbbf24' },
      { name: 'Balmumu', value: totalBalmumu, color: '#f59e0b' },
      { name: 'Kovan', value: totalKovan, color: '#fcd34d' },
    ].filter(item => item.value > 0);
  }, [filteredData]);

  // Top 10 İller - Toplam Hayvan
  const topCities = useMemo(() => {
    const cityTotals = filteredData.map(item => ({
      name: item.il,
      value: item.sigir + item.manda + item.koyun + item.keci,
    })).sort((a, b) => b.value - a.value).slice(0, 10);
    return cityTotals;
  }, [filteredData]);

  // Top 10 İller - Bal Üretimi
  const topCitiesHoney = useMemo(() => {
    return filteredData
      .map(item => ({ name: item.il, value: item.balUretimi }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  // Harita verisi - BÖLGE BAZINDA TOPLAM
  const mapData = useMemo(() => {
    const regionMap = new Map<string, number>();
    
    filteredData.forEach(item => {
      const region = getRegionByProvince(item.il);
      const currentValue = regionMap.get(region) || 0;
      const itemTotal = item.sigir + item.manda + item.koyun + item.keci;
      regionMap.set(region, currentValue + itemTotal);
    });
    
    return Array.from(regionMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredData]);

  // KPI hesaplamaları
  const totalAnimals = useMemo(() => animalCounts.reduce((s, i) => s + i.value, 0), [animalCounts]);
  const totalHoney = useMemo(() => filteredData.reduce((s, i) => s + i.balUretimi, 0), [filteredData]);
  const totalBeehives = useMemo(() => filteredData.reduce((s, i) => s + i.kovan, 0), [filteredData]);

  const formatValue = (v: number) => 
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)} M` : 
    v >= 1_000 ? `${(v / 1_000).toFixed(0)} Bin` : 
    v.toFixed(0);

  const formatShort = (v: number) => 
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : 
    v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : 
    v.toString();

  const exportCSV = () => {
    const headers = ['İl', 'Sığır', 'Manda', 'Koyun', 'Keçi', 'Bal (Ton)', 'Kovan', 'Balmumu', 'Et Tavuğu', 'Yumurta Tavuğu'];
    const rows = filteredData.map(d => [d.il, d.sigir, d.manda, d.koyun, d.keci, d.balUretimi, d.kovan, d.balmumu, d.etTavugu, d.yumurtaTavugu]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hayvansal_uretim_2023.csv`;
    link.click();
  };

  if (loading) return <Loading />;

  return (
    <div className="production-page" style={{ animation: 'fadeIn 0.3s ease-in' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Package size={36} color="#f59e0b" />
            Hayvansal Üretim Dashboard (2023)
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Türkiye geneli hayvan sayıları ve üretim verileri</p>
        </div>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
          <Download size={18} />CSV İndir
        </button>
      </div>

      {/* Filtreler */}
      <div style={{ marginBottom: '32px', padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <MapPin size={16} />İl
        </label>
        <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} style={{ width: '100%', maxWidth: '400px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer' }}>
          <option value="all">Tüm İller</option>
          {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Ana KPI'lar */}
      <div className="kpi-grid" style={{ marginBottom: '48px' }}>
        <KPICard title="Toplam Hayvan" value={formatValue(totalAnimals)} subtitle="2023 • Baş" icon={Users} color="purple" />
        <KPICard title="Toplam Bal" value={formatValue(totalHoney)} subtitle="2023 • Ton" icon={Droplet} color="orange" />
        <KPICard title="Toplam Kovan" value={formatValue(totalBeehives)} subtitle="2023 • Adet" icon={Package} color="orange" />
        <KPICard title="Sığır" value={formatValue(animalCounts.find(a => a.name === 'Sığır')?.value || 0)} subtitle="Baş" icon={Users} color="orange" />
      </div>

      {/* HAYVAN SAYILARI */}
      {animalCounts.length > 0 && (
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={28} color="#8b5cf6" />Hayvan Sayıları Analizi
          </h2>
          <div className="kpi-grid" style={{ marginBottom: '24px' }}>
            {animalCounts.map(item => (
              <KPICard key={item.name} title={item.name} value={formatValue(item.value)} subtitle="2023 • Baş" icon={Users} color="purple" />
            ))}
          </div>
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">Hayvan Türlerine Göre Dağılım</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={animalCounts} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                    {animalCounts.map((e, i) => <Cell key={`cell-${i}`} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} Baş`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3 className="chart-title">Top 10 İl (Toplam Hayvan)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topCities} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} Baş`} />
                  <Bar dataKey="value" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* BAL VE ARIICILIK */}
      {honeyData.length > 0 && (
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Package size={28} color="#fbbf24" />Arıcılık Üretimi
          </h2>
          <div className="kpi-grid" style={{ marginBottom: '24px' }}>
            {honeyData.map(item => (
              <KPICard key={item.name} title={item.name} value={formatValue(item.value)} subtitle={`2023 • ${item.name === 'Kovan' ? 'Adet' : 'Ton'}`} icon={Package} color="orange" />
            ))}
          </div>
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">Arıcılık Ürün Dağılımı</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={honeyData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                    {honeyData.map((e, i) => <Cell key={`cell-${i}`} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => formatValue(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3 className="chart-title">Top 10 İl (Bal Üretimi)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topCitiesHoney} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} Ton`} />
                  <Bar dataKey="value" fill="#fbbf24" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* HARİTA */}
      <div style={{ marginBottom: '48px' }}>
        <div className="chart-card">
          <h3 className="chart-title">İl Bazlı Hayvan Sayısı Dağılımı</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>2023 • Toplam Hayvan Sayısı (Sığır + Manda + Koyun + Keçi)</p>
          <TurkeyHeatMap regionTotals={mapData} unitLabel="Baş" height={400} />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .production-page button:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
        .production-page select:hover { border-color: var(--primary); }
        .production-page select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
      `}</style>
    </div>
  );
};

export default TurkeyAnimalProductionPage;
