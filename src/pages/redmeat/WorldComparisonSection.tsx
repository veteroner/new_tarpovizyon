import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts';
import {
  type WorldCarcassPrices,
  type ProductivityComparison,
  type CarcassWeightData,
  type ConsumptionComparison,
} from './redMeatUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { BAR_COLOR, BAR_HIGHLIGHT } from '../../utils/chartColors';
import { ChartCard } from '../../components/ui/Card';

type Props = {
  worldCarcassPrices: WorldCarcassPrices | null;
  productivityComparison: ProductivityComparison[];
  carcassWeightData: CarcassWeightData[];
  consumptionComparison: ConsumptionComparison[];
};

export default function WorldComparisonSection({
  worldCarcassPrices,
  productivityComparison,
  carcassWeightData,
  consumptionComparison,
}: Props) {
  const worldCarcassPriceTreemap = useMemo(() => {
    if (!worldCarcassPrices) return [];
    return [
      { name: 'İngiltere', value: worldCarcassPrices.ingiltere, fill: '#dc2626' },
      { name: 'ABD', value: worldCarcassPrices.abd, fill: '#ea580c' },
      { name: 'AB-27', value: worldCarcassPrices.ab_27, fill: '#d97706' },
      { name: 'Yeni Zelanda', value: worldCarcassPrices.yeni_zelanda, fill: '#ca8a04' },
      { name: 'Avustralya', value: worldCarcassPrices.avustralya, fill: '#84cc16' },
      { name: 'Arjantin', value: worldCarcassPrices.arjantin, fill: '#22c55e' },
      { name: 'Uruguay', value: worldCarcassPrices.uruguay, fill: '#14b8a6' },
      { name: 'Brezilya', value: worldCarcassPrices.brezilya, fill: '#0ea5e9' },
      { name: 'Türkiye', value: worldCarcassPrices.turkiye, fill: '#6366f1' },
    ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  }, [worldCarcassPrices]);

  const productivityRadarData = useMemo(() => {
    return productivityComparison.slice(0, 11).map(p => ({
      ulke: p.ulke,
      karkas_verimi: p.karkas_verimi,
    }));
  }, [productivityComparison]);

  const consumptionRadarData = useMemo(() => {
    return consumptionComparison.map(c => ({
      ulke: c.ulke,
      kanatli_eti: c.kanatli_eti,
      sigir_eti: c.sigir_eti,
      koyun_keci_eti: c.koyun_keci_eti,
      domuz_eti: c.domuz_eti,
      balik_ve_deniz_urunleri: c.balik_ve_deniz_urunleri,
    }));
  }, [consumptionComparison]);

  const carcassWeightHistogram = useMemo(() => {
    if (carcassWeightData.length === 0) return [];
    const weights = carcassWeightData.map(d => d.karkas_verimi_kg).filter(w => w > 0);
    if (weights.length === 0) return [];
    
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const binCount = 15;
    const binSize = (max - min) / binCount;
    
    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${(min + i * binSize).toFixed(0)}-${(min + (i + 1) * binSize).toFixed(0)}`,
      count: 0,
      turkiye: false,
    }));

    weights.forEach(w => {
      const binIndex = Math.min(binCount - 1, Math.floor((w - min) / binSize));
      bins[binIndex].count++;
    });

    /*
     * Türkiye'nin düştüğü aralığı işaretle. Bu işaret olmadan grafik
     * "dünyada 17 ülkenin karkas ağırlığı 242-268 kg" gibi bir trivia
     * kalıyordu; Türkiye dashboard'unda dağılımın tek anlamı Türkiye'nin
     * o dağılımın neresinde durduğu.
     */
    const tr = carcassWeightData.find(d => /türkiye|turkey/i.test(d.ulke));
    if (tr && tr.karkas_verimi_kg > 0) {
      const i = Math.min(binCount - 1, Math.floor((tr.karkas_verimi_kg - min) / binSize));
      bins[i].turkiye = true;
    }

    return bins;
  }, [carcassWeightData]);

  const turkiyeKarkas = useMemo(
    () => carcassWeightData.find(d => /türkiye|turkey/i.test(d.ulke))?.karkas_verimi_kg ?? 0,
    [carcassWeightData],
  );

  return (
    <>
      {/* Section 4: Dünya Karkas Fiyatları */}
      {worldCarcassPriceTreemap.length > 0 && (
        <div className="chart-grid" style={{ marginTop: '30px' }}>
          {/*
            * Bu tabloyu hiçbir senkron işi beslemiyor — tek seferlik anlık
            * görüntü. Tarihi başlığa yazılıyor ki güncel fiyat sanılmasın.
            */}
          <ChartCard
            title={`💰 Dünya Karkas Et Fiyatları (USD/kg)${worldCarcassPrices?.anlikGoruntuTarihi ? ` — ${worldCarcassPrices.anlikGoruntuTarihi} anlık görüntüsü` : ''}`}
            span={2}
            action={<ChartInsightButton title="💰 Dünya Karkas Et Fiyatları (USD/kg)" description="Dünya ülkeleri karkas et fiyat karşılaştırması" data={worldCarcassPriceTreemap} context={{ birim: 'USD/kg' }} />}
          >
            <ResponsiveContainer width="100%" height={400}>
              <Treemap
                data={worldCarcassPriceTreemap}
                dataKey="value"
                stroke="#fff"
                content={({ x = 0, y = 0, width = 0, height = 0, name, value }) => {
                  return (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        style={{
                          fill: worldCarcassPriceTreemap.find(d => d.name === name)?.fill || '#ccc',
                          stroke: '#fff',
                          strokeWidth: 2,
                        }}
                      />
                      {width > 80 && height > 40 && name && value && (
                        <>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 - 8}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={14}
                            fontWeight={600}
                          >
                            {name}
                          </text>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 + 12}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={16}
                            fontWeight={700}
                          >
                            ${Number(value).toFixed(2)}
                          </text>
                        </>
                      )}
                    </g>
                  );
                }}
              />
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Section 5: Verimlilik Karşılaştırması */}
      {productivityRadarData.length > 0 && (
        <div className="chart-grid" style={{ marginTop: '30px' }}>
          <ChartCard title="🎯 Verimlilik Karşılaştırması (11 Ülke)" action={<ChartInsightButton title="🎯 Verimlilik Karşılaştırması (11 Ülke)" description="Karkas verimi verimlilik karşılaştırması" data={productivityRadarData} context={{ section: 'Verimlilik' }} compact />}>
            <ResponsiveContainer width="100%" height={380}>
              <RadarChart data={productivityRadarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="ulke" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <Radar 
                  name="Karkas Verimi (kg)" 
                  dataKey="karkas_verimi" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.6} 
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)} kg`]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="🌍 Türkiye Dünya Karkas Ağırlığı Dağılımında Nerede?" span={2} action={<ChartInsightButton title="🌍 Dünya Karkas Ağırlığı Dağılımı" description="Türkiye'nin dünya karkas ağırlığı dağılımındaki yeri" data={carcassWeightHistogram} context={{ section: 'Histogram', turkiyeKarkas }} compact />}>
            <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Her sütun bir karkas ağırlığı aralığındaki ülke sayısını gösterir.
              {turkiyeKarkas > 0 && <> Kırmızı sütun Türkiye'nin bulunduğu aralık — <strong>{turkiyeKarkas.toFixed(0)} kg</strong>.</>}
            </p>
            <ResponsiveContainer width="100%" height={380}>
              {/*
                * Histogram; kategorik çubuk grafiği DEĞİL. X ekseni sürekli bir
                * ölçek (kg aralıkları) olduğu için sütunlar bitişik olmalı ve
                * köşeleri yuvarlanmamalı — aralarındaki boşluk "bunlar ayrı
                * kategoriler" yanılgısı yaratıyordu. Ayrım ince beyaz çizgiyle.
                */}
              <BarChart data={carcassWeightHistogram} margin={{ top: 20, right: 8, left: 4, bottom: 5 }} barCategoryGap={0}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="range" 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                  angle={-45} 
                  textAnchor="end" 
                  height={70} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Ülke Sayısı', angle: -90, position: 'insideLeft' }} width={58} />
                <Tooltip 
                  cursor={{ fill: 'var(--border)', opacity: 0.35 }}
                  formatter={(value: number) => [`${value} ülke`]}
                  labelFormatter={(l) => `${l} kg`}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={0} stroke="var(--bg-card)" strokeWidth={1}>
                  {carcassWeightHistogram.map((b, i) => (
                    <Cell key={i} fill={b.turkiye ? BAR_HIGHLIGHT : BAR_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Section 7: Dünya Et Tüketimi Karşılaştırması */}
      {consumptionRadarData.length > 0 && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Dünya Et Tüketimi Karşılaştırması (Kişi Başı/Yıl)
            </h2>
          </div>
          <div className="kpi-grid">
            {consumptionRadarData.map((country, idx) => (
              <div key={idx} className="kpi-card" style={{ gridColumn: 'span 1' }}>
                <div className="kpi-header">
                  <span className="kpi-title" style={{ fontSize: '0.95rem', fontWeight: '700' }}>
                    {country.ulke.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '8px', lineHeight: '1.6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Kanatlı:</span>
                    <span style={{ fontWeight: '600', color: '#dc2626' }}>{country.kanatli_eti.toFixed(1)} kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Sığır:</span>
                    <span style={{ fontWeight: '600', color: '#ea580c' }}>{country.sigir_eti.toFixed(1)} kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Koyun/Keçi:</span>
                    <span style={{ fontWeight: '600', color: '#ca8a04' }}>{country.koyun_keci_eti.toFixed(1)} kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Balık:</span>
                    <span style={{ fontWeight: '600', color: '#14b8a6' }}>{country.balik_ve_deniz_urunleri.toFixed(1)} kg</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: '6px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Toplam:</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                      {(country.kanatli_eti + country.sigir_eti + country.koyun_keci_eti + country.balik_ve_deniz_urunleri).toFixed(1)} kg
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
