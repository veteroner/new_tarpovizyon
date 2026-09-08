import { yuzde } from '../../utils/sayi';
import type { YearPoint } from './eggProductionTypes';
import { formatMillion } from './eggProductionTypes';
import { Egg, Trophy, TrendingUp, TrendingDown } from 'lucide-react';

interface EggKpiCardsProps {
  latest: YearPoint | undefined;
  yoy: number;
  peak: YearPoint | undefined;
  worldRanking: { world: number; eu: number } | null;
}

export function EggKpiCards({ latest, yoy, peak, worldRanking }: EggKpiCardsProps) {
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
          <div className={`kpi-icon ${yoy >= 0 ? 'green' : 'red'}`}>{yoy >= 0 ? <TrendingUp size={18} aria-hidden="true" /> : <TrendingDown size={18} aria-hidden="true" />}</div>
        </div>
        <div className="kpi-value" style={{ color: yoy >= 0 ? '#22c55e' : '#ef4444' }}>
          {yuzde(yoy, 1)}
        </div>
        <div className="kpi-subtitle">Önceki yıla göre</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">ZİRVE</span>
          <div className="kpi-icon orange"><Trophy size={18} aria-hidden="true" /></div>
        </div>
        <div className="kpi-value">{formatMillion(peak?.eggsMillion ?? 0)}</div>
        <div className="kpi-subtitle">milyon adet ({peak?.year ?? '-'})</div>
      </div>

      {/*
        * GÜNCEL YUMURTA FİYATLARI kartı KALDIRILDI.
        *
        * Kaynak Basmakçı Tavukçuluk'tu ve veri artık çekilemiyor; kart
        * üretimde "Fiyatlar yüklenemedi" yazan boş bir kutuya dönüşmüştü.
        * Çalışmayan bir kartı ekranda tutmak, olmayan bir yetenek vaat edip
        * her açılışta bozuk göstermek demek — kart, beslemesi çözülürse
        * geri gelir.
        */}
      {worldRanking && (
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">YUMURTA</span>
            <div className="kpi-icon yellow"><Egg size={18} aria-hidden="true" /></div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.8rem' }}>Dünya #{worldRanking.world}</div>
          <div className="kpi-subtitle">AB #{worldRanking.eu}</div>
        </div>
      )}
    </div>
  );
}
