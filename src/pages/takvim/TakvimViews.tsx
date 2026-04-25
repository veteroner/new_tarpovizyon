import { AYLAR, TIP_META, CROP_PROFILES } from './takvimTypes';
import type { Activity } from './takvimTypes';

interface Props {
  viewMode: 'takvim' | 'liste' | 'timeline';
  setViewMode: (m: 'takvim' | 'liste' | 'timeline') => void;
  filterTip: Activity['tip'] | 'hepsi';
  setFilterTip: (t: Activity['tip'] | 'hepsi') => void;
  filteredActivities: Activity[];
  selectedCrops: string[];
  activities: Activity[];
  buHaftaGorevler: Activity[];
  gecikmisGorevler: Activity[];
  selectedIl: string;
  now: { ay: number; hafta: number };
}

export function TakvimViews({
  viewMode, setViewMode, filterTip, setFilterTip,
  filteredActivities, selectedCrops, activities,
  buHaftaGorevler, gecikmisGorevler, selectedIl, now,
}: Props) {
  function downloadIcs() {
    const year = new Date().getFullYear();
    const events = activities.map((a) => {
      const month = String(a.ay).padStart(2, '0');
      const day   = String(Math.min(28, a.hafta * 7)).padStart(2, '0');
      const dtStart = `${year}${month}${day}`;
      return [
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtStart}`,
        `SUMMARY:${a.urun_emoji} ${a.baslik}`,
        `DESCRIPTION:${a.notlar.replace(/\n/g, '\\n')} | Öncelik: ${a.oncelik}`,
        `CATEGORIES:${a.tip}`,
        `UID:tarim-${a.id}@tarpo`,
        'END:VEVENT',
      ].join('\r\n');
    });
    const icsContent = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'PRODID:-//TARPO//Tarimsal Takvim//TR', 'CALSCALE:GREGORIAN',
      ...events, 'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `tarimsal-takvim-${selectedIl || 'genel'}-${year}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="tt-controls">
        <div className="tt-controls__left">
          <div className="tt-view-btns">
            {(['takvim', 'liste', 'timeline'] as const).map((m) => (
              <button
                key={m}
                className={`tt-view-btn${viewMode === m ? ' tt-view-btn--active' : ''}`}
                onClick={() => setViewMode(m)}
              >
                {m === 'takvim' ? '📅 Takvim' : m === 'liste' ? '📋 Liste' : '📊 Çizelge'}
              </button>
            ))}
          </div>
        </div>
        <div className="tt-controls__right">
          <select
            className="tt-filter-select"
            value={filterTip}
            onChange={(e) => setFilterTip(e.target.value as Activity['tip'] | 'hepsi')}
          >
            <option value="hepsi">Tüm Aktiviteler</option>
            {(Object.keys(TIP_META) as Activity['tip'][]).map((t) => (
              <option key={t} value={t}>{TIP_META[t].emoji} {TIP_META[t].etiket}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Calendar View ─────────────────────────────────────────────────── */}
      {viewMode === 'takvim' && (
        <div className="tt-calendar">
          {AYLAR.map((ayAd, ayIdx) => {
            const ayNo = ayIdx + 1;
            const ayActs = filteredActivities.filter((a) => a.ay === ayNo);
            const isCurrent = now.ay === ayNo;
            return (
              <div key={ayIdx} className={`tt-month${isCurrent ? ' tt-month--current' : ''}`}>
                <div className="tt-month__header">
                  <span className="tt-month__name">{ayAd}</span>
                  <span className="tt-month__count">{ayActs.length}</span>
                </div>
                <div className="tt-month__activities">
                  {ayActs.length === 0 ? (
                    <div className="tt-month__empty">—</div>
                  ) : (
                    ayActs.map((a) => (
                      <div key={a.id} className="tt-activity">
                        <div className="tt-activity__header">
                          <span className="tt-activity__emoji">{TIP_META[a.tip].emoji}</span>
                          <div className="tt-activity__meta">
                            <span className="tt-activity__title">{a.urun_emoji} {a.baslik}</span>
                            <div>
                              <span className={`tt-activity__badge tt-activity__badge--${a.oncelik}`}>
                                {a.oncelik}
                              </span>
                              <span className="tt-activity__week">Hf {a.hafta}</span>
                            </div>
                          </div>
                        </div>
                        {a.notlar && <div className="tt-activity__notes">{a.notlar}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── List View ─────────────────────────────────────────────────────── */}
      {viewMode === 'liste' && (
        <div className="tt-list">
          {filteredActivities.map((a) => (
            <div key={a.id} className="tt-list-item">
              <div className="tt-list-item__left">
                <div className="tt-list-item__date">
                  {AYLAR[a.ay - 1]} · {a.hafta}. Hafta
                </div>
                <div className="tt-list-item__title">
                  {a.urun_emoji} {TIP_META[a.tip].emoji} {a.baslik}
                </div>
                {a.notlar && (
                  <div className="tt-list-item__notes">{a.notlar}</div>
                )}
              </div>
              <div className="tt-list-item__right">
                <span className={`tt-list-item__badge tt-list-item__badge--${a.oncelik}`}>
                  {a.oncelik}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Timeline View ─────────────────────────────────────────────────── */}
      {viewMode === 'timeline' && (
        <div className="tt-card">
          <h2 className="tt-card__title">Yıllık Zaman Çizelgesi</h2>
          <div className="tt-timeline">
            {selectedCrops.map((cropKey) => {
              const crop = CROP_PROFILES[cropKey];
              if (!crop) return null;
              const cropActs = filteredActivities.filter((a) => a.urun === crop.ad);
              return (
                <div key={cropKey} className="tt-timeline-row">
                  <div className="tt-timeline-label">
                    <span>{crop.emoji}</span>
                    <span>{crop.ad}</span>
                  </div>
                  <div className="tt-timeline-bar">
                    {AYLAR.map((_, ayIdx) => {
                      const ayActs = cropActs.filter((a) => a.ay === ayIdx + 1);
                      return (
                        <div key={ayIdx} className="tt-timeline-cell">
                          {ayActs.map((act) => (
                            <div
                              key={act.id}
                              className="tt-timeline-dot"
                              style={{ backgroundColor: TIP_META[act.tip].renk }}
                              title={`${act.baslik} — ${AYLAR[ayIdx]} Hafta ${act.hafta}`}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="tt-timeline-months">
            {AYLAR.map((ay, idx) => (
              <div key={idx} className="tt-timeline-month">{ay.slice(0, 3)}</div>
            ))}
          </div>
          <div className="tt-timeline-legend">
            {Object.entries(TIP_META).map(([key, meta]) => (
              <div key={key}>
                <div style={{ backgroundColor: meta.renk }} />
                {meta.etiket}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="tt-stats">
        <div className="tt-stat-card">
          <div className="tt-stat-card__value">{selectedCrops.length}</div>
          <div className="tt-stat-card__label">Seçili Ürün</div>
        </div>
        <div className="tt-stat-card">
          <div className="tt-stat-card__value">{activities.length}</div>
          <div className="tt-stat-card__label">Toplam Aktivite</div>
        </div>
        <div className="tt-stat-card">
          <div className="tt-stat-card__value">
            {activities.filter((a) => a.oncelik === 'kritik').length}
          </div>
          <div className="tt-stat-card__label">Kritik Görev</div>
        </div>
        <div className="tt-stat-card">
          <div className="tt-stat-card__value">{buHaftaGorevler.length}</div>
          <div className="tt-stat-card__label">Bu Hafta</div>
        </div>
        <div className="tt-stat-card">
          <div className="tt-stat-card__value">{gecikmisGorevler.length}</div>
          <div className="tt-stat-card__label">Gecikmeli</div>
        </div>
      </div>

      {/* ── Print + ICS ───────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button className="tt-print-btn" onClick={() => window.print()}>
          🖨️ Takvimi Yazdır
        </button>
        <button className="tt-print-btn" style={{ marginLeft: 8 }} onClick={downloadIcs}>
          📅 ICS İndir
        </button>
      </div>

      {/* ── Disclaimer ────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbeb', borderRadius: 8, border: '1px solid #f59e0b', fontSize: '0.8rem', color: '#92400e', lineHeight: 1.6 }}>
        ⚠️ <strong>Uyarı:</strong> Takvim tarihleri bölgesel iklim ortalamaları baz alınarak oluşturulmuştur.
        O yılın hava koşulları, don riski, yağış durumu ve yerel çeşit özelliklerine göre 1-3 hafta değişkenlik gösterebilir.
        Kesin ekim/hasat tarihlerini il/ilçe tarım müdürlüğü veya yerel ziraat mühendisi ile teyit ediniz.
      </div>
    </>
  );
}
