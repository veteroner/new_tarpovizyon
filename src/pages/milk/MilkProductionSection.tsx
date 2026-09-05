import { AXIS, STATUS, seriesColor } from '../../utils/chartColors';
import { yuzde } from '../../utils/sayi';
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, Area, Line, Cell,
  BarChart, Bar, ReferenceLine, LabelList
} from 'recharts';
import { formatTon, formatShort, type YearPoint, type Productivity, type ProductivityComparison } from './milkUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { LINE_Y_DOMAIN, VALUE_HEADROOM } from '../../utils/chartTicks';

type Props = {
  series: YearPoint[];
  latest: YearPoint | undefined;
  latestBreakdown: { total: number; rows: { name: string; value: number; share: number }[] };
  growthRates: { year: number; rate: number }[];
  productivity: Productivity[];
  productivityComparison: ProductivityComparison[];
  sufficiency: Record<string, string | number> | null;
};

export default function MilkProductionSection({
  series, latest, latestBreakdown, growthRates,
  productivity, productivityComparison, sufficiency
}: Props) {
  return (
    <>
      {/* Üretim Analizi Bölümü */}
      <div style={{ marginTop: '48px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Üretim Analizi
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              Toplam Süt Üretimi Trendi (Tüm Yıllar)
            </h3>
            <ChartInsightButton title="Toplam Süt Üretimi Trendi (Tüm Yıllar)" description="Türkiye toplam süt üretimi tarihsel trendi" data={series} context={{ section: 'Süt Üretimi' }} />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} width={46} domain={LINE_Y_DOMAIN} />
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              Türlere Göre Dağılım ({latest?.year ?? '-'})
            </h3>
            <ChartInsightButton title="Türlere Göre Dağılım" description="Tür bazında süt üretimi dağılımı" data={latestBreakdown.rows} context={{ year: latest?.year }} />
          </div>
          {/*
            * ÜÇ DEĞER İÇİN PASTA DEĞİL, YATAY ÇUBUK.
            *
            * Göz açı karşılaştırmasında kötü, uzunluk karşılaştırmasında iyidir.
            * Üç dilimli halka grafik üç sayıyı okumanın en zor yoluydu; üstelik
            * büyükbaş %94,7 olduğu için kalan iki dilim ince birer şerit olarak
            * kalıyor ve etiketleri birbirine giriyordu. Çubukta üçü de okunur,
            * pay ve mutlak değer yan yana yazılı.
            */}
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={latestBreakdown.rows} layout="vertical" margin={{ left: 8, right: 72 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatShort(Number(v))} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={VALUE_HEADROOM} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} width={86} />
              <Tooltip formatter={(value: number) => [formatTon(value), 'Üretim']} />
              <Bar dataKey="value" name="Üretim" radius={[0, 4, 4, 0]}>
                {latestBreakdown.rows.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={seriesColor(idx)} />
                ))}
                <LabelList
                  dataKey="share"
                  position="right"
                  formatter={(v: number) => yuzde(v, 1)}
                  style={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                />
              </Bar>
            </BarChart>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              Yıllık Büyüme Oranları (%)
            </h3>
            <ChartInsightButton title="Yıllık Büyüme Oranları (%)" description="Son 15 yıl süt üretimi büyüme oranları" data={growthRates.slice(-15)} context={{ section: 'Büyüme' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            {/*
              * BÜYÜME ORANI GRAFİĞİ — burada `LINE_Y_DOMAIN` KULLANILMAZ.
              *
              * Seviye grafiklerinde ekseni auto bırakmak doğru (sıfırdan
              * başlamak varyasyonu eziyor). Ama bu grafiğin ölçüsü zaten
              * DEĞİŞİM: sıfır anlamlı bir eşik — üstü büyüme, altı küçülme.
              * Auto eksen bütün yıllar pozitifken sıfırı ekran dışında
              * bırakır ve okuyucu artı mı eksi mi olduğunu göremez.
              *
              * Bu yüzden sıfır domain'e zorlanıyor ve ayrıca çizgiyle
              * işaretleniyor. Yön ayrıca çubuk renginde de taşınıyor.
              */}
            <ComposedChart data={growthRates.slice(-15)} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v: number) => yuzde(v, 0)}
                domain={([min, max]: [number, number]) => [Math.min(0, min * 1.15), Math.max(0, max * 1.15)]}
                width={52}
              />
              <Tooltip
                formatter={(value: number) => [`${yuzde(value, 2)}`, 'Yıllık değişim']}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <ReferenceLine y={0} stroke={AXIS} />
              <Bar dataKey="rate" name="Yıllık değişim" radius={[4, 4, 0, 0]}>
                {growthRates.slice(-15).map((d, i) => (
                  <Cell key={i} fill={d.rate >= 0 ? STATUS.iyi : STATUS.kritik} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Son 5 Yıl Toplam Üretim */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          gridColumn: 'span 2'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              Son 5 Yıl Toplam Üretim Trendi
            </h3>
            <ChartInsightButton title="Son 5 Yıl Toplam Üretim Trendi" description="Son 5 yıl toplam süt üretimi trendi" data={series.slice(-5)} context={{ section: 'Üretim Trendi' }} />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={series.slice(-5)} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} width={46} domain={LINE_Y_DOMAIN} />
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
                strokeWidth={2} tooltipType="none" legendType="none" />
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

        {/* Büyükbaş Son 5 Yıl */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              Büyükbaş (Son 5 Yıl)
            </h3>
            <ChartInsightButton title="Büyükbaş Süt Üretimi (Son 5 Yıl)" description="Büyükbaş hayvan süt üretimi son 5 yıl" data={series.slice(-5)} context={{ type: 'cattle' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={series.slice(-5)} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} width={46} />
              <Tooltip 
                formatter={(value: number) => [formatTon(value)]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} 
              />
              <Bar dataKey="cattleTon" name="Büyükbaş" radius={[6, 6, 0, 0]} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Koyun Son 5 Yıl */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              Koyun (Son 5 Yıl)
            </h3>
            <ChartInsightButton title="Koyun Süt Üretimi (Son 5 Yıl)" description="Koyun süt üretimi son 5 yıl" data={series.slice(-5)} context={{ type: 'sheep' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={series.slice(-5)} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} width={46} />
              <Tooltip 
                formatter={(value: number) => [formatTon(value)]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} 
              />
              <Bar dataKey="sheepTon" name="Koyun" radius={[6, 6, 0, 0]} fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Keçi Son 5 Yıl */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              Keçi (Son 5 Yıl)
            </h3>
            <ChartInsightButton title="Keçi Süt Üretimi (Son 5 Yıl)" description="Keçi süt üretimi son 5 yıl" data={series.slice(-5)} context={{ type: 'goat' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={series.slice(-5)} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} width={46} />
              <Tooltip 
                formatter={(value: number) => [formatTon(value)]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} 
              />
              <Bar dataKey="goatTon" name="Keçi" radius={[6, 6, 0, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Verimlilik Bölümü */}
      {(productivity.length > 0 || sufficiency) && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Verimlilik Göstergeleri
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
            {productivity.length > 0 && (
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                    Süt Verimi Trendi (Litre/Baş)
                  </h3>
                  <ChartInsightButton title="Süt Verimi Trendi (Litre/Baş)" description="Türkiye süt verimi trendi" data={productivity} context={{ section: 'Verimlilik' }} />
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={productivity} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} domain={LINE_Y_DOMAIN} />
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
                      strokeWidth={2} tooltipType="none" legendType="none" />
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

            {productivityComparison.length > 0 && (
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                    Dünya Karkas Verimi Karşılaştırması
                  </h3>
                  <ChartInsightButton title="Dünya Karkas Verimi Karşılaştırması" description="Türkiye vs dünya karkas verim karşılaştırması" data={productivityComparison} context={{ section: 'Verimlilik' }} />
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={productivityComparison} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis 
                      dataKey="ulke" 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={100} interval="preserveStartEnd" minTickGap={16} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
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
    </>
  );
}
