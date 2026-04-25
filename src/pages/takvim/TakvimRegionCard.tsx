import { ILLER, BOLGE_META } from '../../utils/climate-data';
import type { IklimBolge } from '../../utils/climate-data';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import WeatherWidget from '../../components/WeatherWidget';
import { BOLGE_UYARILAR } from './takvimTypes';

interface Props {
  selectedIl: string;
  setSelectedIl: (il: string) => void;
  bolge: IklimBolge;
}

export function TakvimRegionCard({ selectedIl, setSelectedIl, bolge }: Props) {
  const bolgeMeta = BOLGE_META[bolge];
  const offset = bolgeMeta.takvimOffset;

  return (
    <div className="tt-card">
      <h2 className="tt-card__title">📍 Bölge Seçimi</h2>
      <p className="tt-card__desc">İlini seçerek iklim bölgene özel tarımsal takvim oluştur.</p>

      <div className="tt-region-row">
        <select
          className="tt-il-select"
          value={selectedIl}
          onChange={(e) => setSelectedIl(e.target.value)}
        >
          <option value="">-- İl Seçin --</option>
          {ILLER.map((il) => (
            <option key={il} value={il}>{il}</option>
          ))}
        </select>

        {selectedIl && (
          <div className="tt-bolge-badge">
            {bolgeMeta.emoji} {bolgeMeta.ad} İklimi
          </div>
        )}

        {offset !== 0 && (
          <div className="tt-bolge-offset">
            {offset > 0 ? `+${offset}` : offset} hafta
          </div>
        )}
      </div>

      {selectedIl && (
        <>
          <WeatherWidget il={selectedIl} />
          <ConfidenceBadge score={50} label="Bölgesel iklim ortalaması" />
          <div className="tt-bolge-uyari">{BOLGE_UYARILAR[bolge]}</div>
        </>
      )}
    </div>
  );
}
