import type { YearPoint } from './eggProductionTypes';
import { formatMillion, formatTL } from './eggProductionTypes';

interface EggKpiCardsProps {
  latest: YearPoint | undefined;
  yoy: number;
  peak: YearPoint | undefined;
  eggPrices: Partial<Record<string, number>>;
  eggPriceDate: string | null;
  eggPriceError: string | null;
  worldRanking: { world: number; eu: number } | null;
}

export function EggKpiCards({ latest, yoy, peak, eggPrices, eggPriceDate, eggPriceError, worldRanking }: EggKpiCardsProps) {
  return (
    <div className="kpi-grid">
      <div className="kpi-card large">
        <div className="kpi-header">
          <span className="kpi-title">SON YIL</span>
        </div>
        <div className="kpi-value">{formatMillion(latest?.eggsMillion ?? 0)}</div>
        <div className="kpi-subtitle">milyon adet ({latest?.year ?? '-'})</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">YILLIK DEĞİŞİM</span>
          <div className={`kpi-icon ${yoy >= 0 ? 'green' : 'red'}`}>{yoy >= 0 ? '📈' : '📉'}</div>
        </div>
        <div className="kpi-value" style={{ color: yoy >= 0 ? '#22c55e' : '#ef4444' }}>
          %{yoy.toFixed(1)}
        </div>
        <div className="kpi-subtitle">Önceki yıla göre</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">ZİRVE</span>
          <div className="kpi-icon orange">🏆</div>
        </div>
        <div className="kpi-value">{formatMillion(peak?.eggsMillion ?? 0)}</div>
        <div className="kpi-subtitle">milyon adet ({peak?.year ?? '-'})</div>
      </div>

      <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
        <div className="kpi-header">
          <span className="kpi-title" style={{ color: 'white' }}>GÜNCEL YUMURTA FİYATLARI 🥚</span>
          <div className="kpi-icon orange">💰</div>
        </div>
        {eggPriceError ? (
          <div style={{ fontSize: '0.9rem', color: 'white', padding: '10px 0' }}>{eggPriceError}</div>
        ) : Object.keys(eggPrices).length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', padding: '10px 0' }}>
            {eggPrices.double && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2px' }}>Double</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>{formatTL(eggPrices.double)} TL</div>
              </div>
            )}
            {eggPrices.eski_ana && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2px' }}>Eski Ana</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>{formatTL(eggPrices.eski_ana)} TL</div>
              </div>
            )}
            {eggPrices.yeni_ana && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2px' }}>Yeni Ana</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>{formatTL(eggPrices.yeni_ana)} TL</div>
              </div>
            )}
            {eggPrices.yarka && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2px' }}>Yarka</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>{formatTL(eggPrices.yarka)} TL</div>
              </div>
            )}
            {eggPrices.pilic && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2px' }}>Piliç</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>{formatTL(eggPrices.pilic)} TL</div>
              </div>
            )}
            {eggPrices.kilavuz && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2px' }}>Kılavuz</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>{formatTL(eggPrices.kilavuz)} TL</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', padding: '10px 0' }}>Fiyatlar yükleniyor...</div>
        )}
        <div className="kpi-subtitle" style={{ marginTop: '4px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.7rem' }}>
          {eggPriceDate ? `${eggPriceDate}` : 'Basmakçı Tavukçuluk'}
        </div>
      </div>

      {worldRanking && (
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">YUMURTA</span>
            <div className="kpi-icon yellow">🥚</div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.8rem' }}>Dünya #{worldRanking.world}</div>
          <div className="kpi-subtitle">AB #{worldRanking.eu}</div>
        </div>
      )}
    </div>
  );
}
