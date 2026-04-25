import { BOLGE_META, donRiskiVar } from '../../utils/climate-data';
import type { IklimBolge } from '../../utils/climate-data';
import { AYLAR, TIP_META } from './takvimTypes';
import type { Activity } from './takvimTypes';

interface Props {
  now: { ay: number; hafta: number };
  bolge: IklimBolge;
  selectedIl: string;
  buHaftaGorevler: Activity[];
  gecikmisGorevler: Activity[];
}

export function TakvimThisWeek({ now, bolge, selectedIl, buHaftaGorevler, gecikmisGorevler }: Props) {
  const bolgeMeta = BOLGE_META[bolge];
  const donRiski = selectedIl ? donRiskiVar(bolge, now.ay) : false;

  return (
    <div className="tt-card tt-thisweek">
      <div className="tt-thisweek__header">
        <span>📅 Bu Hafta</span>
        <span className="tt-thisweek__il">
          {AYLAR[now.ay - 1]} – {now.hafta}. Hafta
          {selectedIl && ` · ${selectedIl}`}
        </span>
      </div>

      {donRiski && (
        <div className="tt-bolge-uyari" style={{ marginBottom: 8 }}>
          ❄️ {bolgeMeta.ad} bölgesinde bu ay don riski mevcut! Hassas ürünleri koruyun.
        </div>
      )}

      {gecikmisGorevler.length > 0 && (
        <div className="tt-thisweek__overdue">
          ⚠️ {gecikmisGorevler.length} gecikmeli görev!
          {gecikmisGorevler.slice(0, 3).map((a) => (
            <span key={a.id} className="tt-thisweek__tag tt-thisweek__tag--overdue">
              {a.urun_emoji} {a.baslik}
            </span>
          ))}
          {gecikmisGorevler.length > 3 && (
            <span className="tt-thisweek__more">+{gecikmisGorevler.length - 3} daha</span>
          )}
        </div>
      )}

      {buHaftaGorevler.length === 0 ? (
        <div className="tt-thisweek__empty">Bu hafta planlanmış görev yok ✅</div>
      ) : (
        <div className="tt-thisweek__tasks">
          {buHaftaGorevler.map((a) => (
            <div
              key={a.id}
              className="tt-thisweek__task"
              style={{ borderLeftColor: TIP_META[a.tip].renk }}
            >
              <div className="tt-thisweek__task-head">
                {TIP_META[a.tip].emoji} {a.urun_emoji} {a.baslik}
                <span className={`tt-activity__badge tt-activity__badge--${a.oncelik}`}>
                  {a.oncelik}
                </span>
              </div>
              <div className="tt-thisweek__task-note">{a.notlar}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
