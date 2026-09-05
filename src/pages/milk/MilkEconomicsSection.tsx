import { yuzde } from '../../utils/sayi';
import { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, Area, Line, BarChart, Bar, Cell
} from 'recharts';
import { Coins, Milk, Scale, TrendingUp } from 'lucide-react';
import { StatCard } from '../../components/ui/Card';
import { type MilkEconomicData, type WorldMilkPrices } from './milkUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { LINE_Y_DOMAIN } from '../../utils/chartTicks';

type Props = {
  worldMilkPrices: WorldMilkPrices | null;
  economicData: MilkEconomicData[];
  econStartDate: string;
  setEconStartDate: (v: string) => void;
  econEndDate: string;
  setEconEndDate: (v: string) => void;
};

export default function MilkEconomicsSection({
  worldMilkPrices, economicData,
  econStartDate, setEconStartDate, econEndDate, setEconEndDate
}: Props) {
  const filteredData = useMemo(() => {
    return economicData.filter(d => {
      if (!econStartDate || !econEndDate) return true;
      return d.tarih >= econStartDate && d.tarih <= econEndDate;
    });
  }, [economicData, econStartDate, econEndDate]);

  const chronological = useMemo(() => filteredData.slice().reverse(), [filteredData]);

  const yearlySupport = useMemo(() => {
    const yearlyData: Record<string, { totalDestek: number; totalFiyat: number; count: number }> = {};
    filteredData.forEach(item => {
      const year = item.tarih.substring(0, 4);
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
  }, [filteredData]);

  const latest = filteredData[0];

  return (
    <>
      {/* Dünya Süt Fiyatları */}
      {worldMilkPrices && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Dünya Süt Fiyatları Karşılaştırması
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Türkiye ve dünya ülkeleri çiğ süt fiyatları karşılaştırması (USD/kg)
            </p>
            {/*
              * Bu tabloyu hiçbir senkron işi beslemiyor: tek seferlik bir
              * anlık görüntü. Tarihi burada AÇIKÇA yazılıyor — tarihsiz
              * bırakmak okuyucuya güncel fiyat gösteriyormuş izlenimi verirdi.
              */}
            {worldMilkPrices.anlikGoruntuTarihi && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px', opacity: 0.85 }}>
                {worldMilkPrices.anlikGoruntuTarihi} tarihli anlık görüntü — düzenli güncellenmiyor
              </p>
            )}
          </div>

          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                Ülkelere Göre Süt Fiyatları
              </h3>
              <ChartInsightButton title="Ülkelere Göre Süt Fiyatları" description="Dünya süt fiyatları karşılaştırması" data={worldMilkPrices ? [worldMilkPrices] : []} context={{ birim: 'USD/kg' }} compact />
            </div>
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
                margin={{ top: 10, right: 8, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="ulke" 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  angle={-20}
                  textAnchor="end" interval="preserveStartEnd" minTickGap={16} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(3)} USD/kg`]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Bar dataKey="fiyat" name="Fiyat" radius={[8, 8, 0, 0]}>
                  {[0,1,2,3,4,5].map((index) => (
                    <Cell key={`cell-${index}`} fill={index === 5 ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Ekonomik Göstergeler */}
      {economicData.length > 0 && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Çiğ Süt Ekonomik Göstergeleri
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
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'white', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
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
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'white', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>

          {/*
            Dört ölçü tek kart katmanında (StatCard). Eskiden ikisi degrade
            zemin + beyaz yazı, ikisi beyaz kart + koyu yazıydı; kârlılık kartı
            da işaretine göre zeminini yeşil/bordo yapıyordu — yani aynı kart
            bazen okunur bazen düşük kontrastlıydı. Kârlılığın işareti artık
            `delta` okuyla ve metin renginde taşınıyor, zemin sabit kalıyor.
          */}
          <div className="kpi-grid">
            <StatCard
              label="ÜSK tavsiye fiyatı"
              value={`${latest?.usk_cig_sut_tavsiye_fiyati_tl_lt.toFixed(2)} ₺/lt`}
              sub={latest?.tarih}
              icon={<Milk size={18} aria-hidden="true" />}
            />
            <StatCard
              label="Üretim maliyeti"
              value={`${latest?.cig_sut_uretim_maliyeti_tl_lt.toFixed(2)} ₺/lt`}
              sub={latest?.tarih}
              icon={<Coins size={18} aria-hidden="true" />}
            />
            <StatCard
              label="Kârlılık oranı"
              value={yuzde(latest?.karlilik, 2, true)}
              delta={latest?.karlilik}
              sub={latest?.tarih}
              icon={<TrendingUp size={18} aria-hidden="true" />}
            />
            <StatCard
              label="Süt yem paritesi"
              value={latest?.sut_yem_paritesi.toFixed(2)}
              sub={latest?.tarih}
              icon={<Scale size={18} aria-hidden="true" />}
            />
          </div>

          {/* Fiyat ve Maliyet Trendi */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ 
              gridColumn: 'span 2',
              background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                  Fiyat ve Maliyet Trendi
                </h3>
                <ChartInsightButton title="Fiyat ve Maliyet Trendi" description="Çiğ süt fiyat ve maliyet karşılaştırma trendi" data={chronological} context={{ section: 'Ekonomik Göstergeler' }} />
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chronological}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} domain={LINE_Y_DOMAIN} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    formatter={(value: number) => [`${value.toFixed(2)} ₺/lt`]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="cig_sut_uretim_maliyeti_tl_lt" name="Maliyet Alanı" fill="#fef3c7" stroke="none" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="usk_cig_sut_tavsiye_fiyati_tl_lt" name="ÜSK Tavsiye Fiyatı" stroke="#059669" strokeWidth={4} dot={{ fill: '#059669', r: 5 }} />
                  <Line type="monotone" dataKey="cig_sut_uretim_maliyeti_tl_lt" name="Üretim Maliyeti" stroke="#dc2626" strokeWidth={4} dot={{ fill: '#dc2626', r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Yem fiyatları — aynı kart katmanı, degrade yok. */}
          <div className="kpi-grid">
            <StatCard
              label="Süt yemi (%19 HP)"
              value={`${latest?.sut_yemi_19_hp.toFixed(2)} ₺/kg`}
              sub={latest?.tarih}
            />
            <StatCard
              label="Mısır silajı"
              value={`${latest?.misir_silaji.toFixed(2)} ₺/kg`}
              sub={latest?.tarih}
            />
            <StatCard
              label="Yonca"
              value={`${latest?.yonca.toFixed(2)} ₺/kg`}
              sub={latest?.tarih}
            />
          </div>

          {/* Yem Fiyatları Detay Grafikleri */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '24px'
          }}>
            {/* Süt Yemi */}
            <div style={{ 
              background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                  Süt Yemi Fiyatları (19% HP)
                </h3>
                <ChartInsightButton title="Süt Yemi Fiyatları (19% HP)" description="Süt yemi fiyat trendi" data={chronological} context={{ yem: 'sut_yemi' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chronological}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} domain={LINE_Y_DOMAIN} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]} />
                  <Area type="monotone" dataKey="sut_yemi_19_hp" name="Süt Yemi" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.4} strokeWidth={2} tooltipType="none" legendType="none" />
                  <Line type="monotone" dataKey="sut_yemi_19_hp" stroke="#d97706" strokeWidth={3} dot={{ fill: '#d97706', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Mısır Silajı */}
            <div style={{ 
              background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                  Mısır Silajı Fiyatları
                </h3>
                <ChartInsightButton title="Mısır Silajı Fiyatları" description="Mısır silajı fiyat trendi" data={chronological} context={{ yem: 'misir_silaji' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chronological}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} domain={LINE_Y_DOMAIN} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]} />
                  <Area type="monotone" dataKey="misir_silaji" name="Mısır Silajı" fill="#06b6d4" stroke="#06b6d4" fillOpacity={0.4} strokeWidth={2} tooltipType="none" legendType="none" />
                  <Line type="monotone" dataKey="misir_silaji" stroke="#0891b2" strokeWidth={3} dot={{ fill: '#0891b2', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Yonca */}
            <div style={{ 
              background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                  Yonca Fiyatları
                </h3>
                <ChartInsightButton title="Yonca Fiyatları" description="Yonca fiyat trendi" data={chronological} context={{ yem: 'yonca' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chronological}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} domain={LINE_Y_DOMAIN} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]} />
                  <Area type="monotone" dataKey="yonca" name="Yonca" fill="#10b981" stroke="#10b981" fillOpacity={0.4} strokeWidth={2} tooltipType="none" legendType="none" />
                  <Line type="monotone" dataKey="yonca" stroke="#059669" strokeWidth={3} dot={{ fill: '#059669', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Süt-Yem Paritesi */}
            <div style={{ 
              background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                  Süt-Yem Paritesi
                </h3>
                <ChartInsightButton title="Süt-Yem Paritesi" description="Süt-yem paritesi ve destek dahil parite" data={chronological} context={{ section: 'Parite' }} />
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chronological}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(2)}`]} />
                  <Legend />
                  <Bar dataKey="sut_yem_paritesi" name="Süt-Yem Paritesi" fill="#3b82f6" radius={[6, 6, 0, 0]} fillOpacity={0.8} />
                  <Line type="monotone" dataKey="sut_yem_paritesi_destek_dahil" name="Destek Dahil" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Destek Oranı */}
            <div style={{ 
              background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                  Destek Oranı (Fiyat İçinde Destek Payı)
                </h3>
                <ChartInsightButton title="Destek Oranı (Fiyat İçinde Destek Payı)" description="Yıllık ortalama destek oranı" data={yearlySupport} context={{ section: 'Destek' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={yearlySupport}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: '%', angle: 0, position: 'top', offset: 10 }} width={58} />
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
                  <Bar dataKey="destekOrani" name="Destek Oranı (%)" fill="#10b981" radius={[6, 6, 0, 0]} fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </>
  );
}
