import { formatShort } from './tuikLivestockTypes';
import type { UseTuikLivestockDataReturn } from './useTuikLivestockData';

type Props = Pick<UseTuikLivestockDataReturn, 'correlationLinks'>;

export default function CorrelationsTab({ correlationLinks }: Props) {
  return (
    <>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>🔗 Üretim Korelasyonları</h2>
      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Hayvan sayıları ile ilgili üretim sayfalarına hızlı erişim
      </p>

      <div className="kpi-grid">
        {correlationLinks.map((link, idx) => (
          <a key={idx} href={link.link} style={{ textDecoration: 'none' }}>
            <div className="kpi-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
              <div className="kpi-header"><span className="kpi-title">{link.animal}</span><div className="kpi-icon orange">🔗</div></div>
              <div className="kpi-value">{formatShort(link.production || 0)}</div>
              <div className="kpi-subtitle">baş • İlgili sayfaya git →</div>
            </div>
          </a>
        ))}
      </div>

      <div className="chart-card" style={{ marginTop: '24px' }}>
        <h3 className="chart-title">ℹ️ Korelasyon Bilgisi</h3>
        <div style={{ padding: '20px', lineHeight: '1.8' }}>
          <p><strong>🐄 Sığır/Manda:</strong> Süt üretimi sayfasında bu hayvanların süt verimliliği analiz edilir.</p>
          <p><strong>🐑 Koyun/Keçi:</strong> Diğer hayvansal ürünler sayfasında yapağı, kıl, tiftik üretimi görüntülenebilir.</p>
          <p><strong>🐔 Tavuk:</strong> Yumurta üretimi ve beyaz et üretimi sayfalarında detaylı analizler mevcuttur.</p>
        </div>
      </div>
    </>
  );
}
