import { yuzde } from '../../utils/sayi';
import { Card } from '../../components/ui/Card';
import { fmt } from './plantTypes';
import { BarChart3, Trophy, TrendingUp, TrendingDown } from 'lucide-react';

interface PlantKpiPanelProps {
  totalValue: number;
  yoyChange: number;
  topCity: string;
  topCityValue: number;
  productCount: number;
  currentBirim: string;
  selectedYear: number;
  cagr5Year: number;
  yieldTrend: number;
  forecast: number;
  growthDriver: string;
}

export default function PlantKpiPanel({
  totalValue, yoyChange, topCity, topCityValue, productCount,
  currentBirim, selectedYear, cagr5Year, yieldTrend, forecast, growthDriver,
}: PlantKpiPanelProps) {
  return (
    <>
      {/* ─── KPI Kartları ─── */}
      <div className="kpi-grid">
        <div className="kpi-card large">
          <div className="kpi-header"><span className="kpi-title">TOPLAM</span></div>
          <div className="kpi-value">{fmt(totalValue)}</div>
          <div className="kpi-subtitle">{currentBirim} ({selectedYear})</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">YILLIK DEĞİŞİM</span>
            <div className={`kpi-icon ${yoyChange >= 0 ? 'green' : 'red'}`}>{yoyChange >= 0 ? <TrendingUp size={18} aria-hidden="true" /> : <TrendingDown size={18} aria-hidden="true" />}</div>
          </div>
          <div className="kpi-value" style={{ color: yoyChange >= 0 ? '#22c55e' : '#ef4444' }}>
            {yuzde(yoyChange, 1)}
          </div>
          <div className="kpi-subtitle">Önceki yıla göre</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">LİDER İL</span><div className="kpi-icon green"><Trophy size={18} aria-hidden="true" /></div></div>
          <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{topCity}</div>
          <div className="kpi-subtitle">{fmt(topCityValue)} {currentBirim}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">ÜRÜN SAYISI</span><div className="kpi-icon blue"><BarChart3 size={18} aria-hidden="true" /></div></div>
          <div className="kpi-value">{productCount}</div>
          <div className="kpi-subtitle">Seçili ürün</div>
        </div>
      </div>

      {/* Degrade zemin + cam karolar kaldırıldı; ortak `.hero-ozet` düzeni. */}
      <Card className="hero-ozet" aralik="normal">
        <h3 className="ui-card-title hero-ozet-baslik">Tarım içgörü özeti</h3>
        <div className="hero-ozet-izgara">
          {[
            { etiket: '5 yıllık BBO', deger: yuzde(cagr5Year, 1, true), alt: 'Yıllık bileşik büyüme' },
            { etiket: 'Verimlilik trendi', deger: yuzde(yieldTrend, 1, true), alt: 'Son 3 yıl verim değişimi' },
            { etiket: `Tahmin ${selectedYear + 1}`, deger: forecast > 0 ? fmt(forecast) : '—', alt: 'Doğrusal trend tahmini' },
            { etiket: 'Büyüme stratejisi', deger: growthDriver, alt: 'Son 5 yıl analizi' },
          ].map((o) => (
            <div className="hero-ozet-oge" key={o.etiket}>
              <div className="hero-ozet-etiket">{o.etiket}</div>
              <div className="hero-ozet-deger">{o.deger}</div>
              <div className="hero-ozet-alt">{o.alt}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
