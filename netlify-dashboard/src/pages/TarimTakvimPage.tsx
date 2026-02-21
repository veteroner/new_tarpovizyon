import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './TarimTakvimPage.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   Tarımsal Takvim - Agricultural Calendar & Activity Planner
   Unified calendar showing all farming activities
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Activity {
  id: string;
  urun: string;
  urun_emoji: string;
  tip: 'ekim' | 'sulama' | 'gubre' | 'ilac' | 'hasat';
  baslik: string;
  ay: number;        // 1-12
  hafta: number;     // 1-4
  notlar: string;
  oncelik: 'dusuk' | 'orta' | 'yuksek' | 'kritik';
}

interface CropProfile {
  ad: string;
  emoji: string;
  ekim_aylari: number[];
  sulama_baslangic: number;
  gubre_aylari: number[];
  hasat_aylari: number[];
  notlar: string;
}

// ── Crop Profiles Database ───────────────────────────────────────────────────

const CROP_PROFILES: Record<string, CropProfile> = {
  bugday: {
    ad: 'Buğday',
    emoji: '🌾',
    ekim_aylari: [10, 11], // Ekim-Kasım
    sulama_baslangic: 3,    // Mart
    gubre_aylari: [11, 3, 5], // Ekim+Mart+Mayıs
    hasat_aylari: [6, 7],     // Haziran-Temmuz
    notlar: 'Kışlık buğday: Ekim-Kasım ekimi, Haziran hasadı',
  },
  arpa: {
    ad: 'Arpa',
    emoji: '🌾',
    ekim_aylari: [10, 11],
    sulama_baslangic: 3,
    gubre_aylari: [11, 3],
    hasat_aylari: [6],
    notlar: 'Kışlık arpa: Buğdaydan 2 hafta önce hasat',
  },
  misir: {
    ad: 'Mısır',
    emoji: '🌽',
    ekim_aylari: [4, 5], // Nisan-Mayıs
    sulama_baslangic: 5,
    gubre_aylari: [4, 6, 7],
    hasat_aylari: [9, 10],
    notlar: 'Yazlık ürün: Toprak sıcaklığı 12°C üstü',
  },
  domates: {
    ad: 'Domates',
    emoji: '🍅',
    ekim_aylari: [3, 4],
    sulama_baslangic: 4,
    gubre_aylari: [4, 5, 6, 7],
    hasat_aylari: [6, 7, 8, 9],
    notlar: 'Fide: Şubat-Mart; Dikim: Nisan. Düzenli sulama',
  },
  biber: {
    ad: 'Biber',
    emoji: '🫑',
    ekim_aylari: [3, 4],
    sulama_baslangic: 4,
    gubre_aylari: [4, 5, 6],
    hasat_aylari: [7, 8, 9],
    notlar: 'Sıcak seven ürün. Fide: Mart; Dikim: Mayıs',
  },
  patates: {
    ad: 'Patates',
    emoji: '🥔',
    ekim_aylari: [3, 4],
    sulama_baslangic: 4,
    gubre_aylari: [3, 5],
    hasat_aylari: [7, 8],
    notlar: 'İlkbahar ekimi. Yumru oluşumu için düzenli nem',
  },
  sogan: {
    ad: 'Soğan',
    emoji: '🧅',
    ekim_aylari: [2, 3, 10],
    sulama_baslangic: 3,
    gubre_aylari: [3, 4],
    hasat_aylari: [6, 7],
    notlar: 'Kış/ilkbahar ekimi. Baş bağlamada azot azaltılır',
  },
  pamuk: {
    ad: 'Pamuk',
    emoji: '🌱',
    ekim_aylari: [4, 5],
    sulama_baslangic: 5,
    gubre_aylari: [4, 6, 7],
    hasat_aylari: [9, 10],
    notlar: 'Sıcak mevsim ürünü. Çiçeklenme kritik',
  },
  aycicegi: {
    ad: 'Ayçiçeği',
    emoji: '🌻',
    ekim_aylari: [4, 5],
    sulama_baslangic: 5,
    gubre_aylari: [4, 6],
    hasat_aylari: [8, 9],
    notlar: 'Tabla oluşumu ve döllenme döneminde sulama önemli',
  },
  karpuz: {
    ad: 'Karpuz',
    emoji: '🍉',
    ekim_aylari: [4, 5],
    sulama_baslangic: 5,
    gubre_aylari: [5, 6, 7],
    hasat_aylari: [7, 8],
    notlar: 'Sıcak seven ürün. Meyve büyümesinde bol su',
  },
  kavun: {
    ad: 'Kavun',
    emoji: '🍈',
    ekim_aylari: [4, 5],
    sulama_baslangic: 5,
    gubre_aylari: [5, 6],
    hasat_aylari: [7, 8],
    notlar: 'Tatlılık için olgunlaşmada suyu azaltın',
  },
  uzum: {
    ad: 'Üzüm',
    emoji: '🍇',
    ekim_aylari: [],  // Mevcut asma
    sulama_baslangic: 4,
    gubre_aylari: [3, 5, 7],
    hasat_aylari: [8, 9],
    notlar: 'Budama: Ocak-Şubat. Sürgün bağlama: Nisan',
  },
  elma: {
    ad: 'Elma',
    emoji: '🍎',
    ekim_aylari: [],  // Mevcut ağaç
    sulama_baslangic: 4,
    gubre_aylari: [3, 6],
    hasat_aylari: [9, 10],
    notlar: 'Budama: Şubat-Mart. Çiçeklenme: Nisan',
  },
  zeytin: {
    ad: 'Zeytin',
    emoji: '🫒',
    ekim_aylari: [],
    sulama_baslangic: 5,
    gubre_aylari: [3, 6],
    hasat_aylari: [10, 11],
    notlar: 'Budama: Mart. Çiçeklenme: Mayıs. Kuraklığa dayanıklı',
  },
};

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const TIP_COLORS: Record<Activity['tip'], string> = {
  ekim: '#22c55e',      // green
  sulama: '#3b82f6',    // blue
  gubre: '#f59e0b',     // amber
  ilac: '#ef4444',      // red
  hasat: '#8b5cf6',     // purple
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function TarimTakvimPage() {
  const navigate = useNavigate();
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'takvim' | 'liste' | 'timeline'>('takvim');
  const [filterTip, setFilterTip] = useState<Activity['tip'] | 'hepsi'>('hepsi');
  const [currentMonth, _setCurrentMonth] = useState(new Date().getMonth() + 1);

  // ── Generate Activities ────────────────────────────────────────────────────

  const activities = useMemo<Activity[]>(() => {
    if (selectedCrops.length === 0) return [];

    const acts: Activity[] = [];
    let id = 0;

    selectedCrops.forEach((cropKey) => {
      const crop = CROP_PROFILES[cropKey];

      // Ekim
      crop.ekim_aylari.forEach((ay) => {
        acts.push({
          id: `${id++}`,
          urun: crop.ad,
          urun_emoji: crop.emoji,
          tip: 'ekim',
          baslik: `${crop.ad} Ekimi`,
          ay,
          hafta: 2,
          notlar: 'Toprak hazırlığı tamamlanmalı. Tohum kalitesi kontrol edilmeli.',
          oncelik: 'kritik',
        });
      });

      // Gübreleme
      crop.gubre_aylari.forEach((ay) => {
        acts.push({
          id: `${id++}`,
          urun: crop.ad,
          urun_emoji: crop.emoji,
          tip: 'gubre',
          baslik: `${crop.ad} Gübreleme`,
          ay,
          hafta: 2,
          notlar: 'Toprak analizi sonuçlarına göre NPK dozları ayarlanmalı.',
          oncelik: 'yuksek',
        });
      });

      // Sulama (belirli aylardan hasada kadar)
      if (crop.sulama_baslangic > 0 && crop.hasat_aylari.length > 0) {
        const sulamaEnd = Math.max(...crop.hasat_aylari);
        for (let ay = crop.sulama_baslangic; ay <= sulamaEnd; ay++) {
          acts.push({
            id: `${id++}`,
            urun: crop.ad,
            urun_emoji: crop.emoji,
            tip: 'sulama',
            baslik: `${crop.ad} Sulaması`,
            ay,
            hafta: 2,
            notlar: 'Toprak nem seviyesi kontrol edilmeli. Damla sulama önerilir.',
            oncelik: 'orta',
          });
        }
      }

      // İlaçlama (ekim ayından 1 ay sonra başlar)
      if (crop.ekim_aylari.length > 0) {
        const ilacAy = (crop.ekim_aylari[0] % 12) + 1;
        acts.push({
          id: `${id++}`,
          urun: crop.ad,
          urun_emoji: crop.emoji,
          tip: 'ilac',
          baslik: `${crop.ad} İlaçlama`,
          ay: ilacAy,
          hafta: 3,
          notlar: 'Hastalık ve zararlı kontrolü. Rüzgarsız günlerde uygulanmalı.',
          oncelik: 'orta',
        });
      }

      // Hasat
      crop.hasat_aylari.forEach((ay) => {
        acts.push({
          id: `${id++}`,
          urun: crop.ad,
          urun_emoji: crop.emoji,
          tip: 'hasat',
          baslik: `${crop.ad} Hasadı`,
          ay,
          hafta: 3,
          notlar: 'Olgunluk kontrol edilmeli. Hava koşulları uygun olmalı.',
          oncelik: 'kritik',
        });
      });
    });

    return acts.sort((a, b) => a.ay - b.ay);
  }, [selectedCrops]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (filterTip !== 'hepsi' && act.tip !== filterTip) return false;
      return true;
    });
  }, [activities, filterTip]);

  // ── Crop Toggle ────────────────────────────────────────────────────────────

  const toggleCrop = (key: string) => {
    if (selectedCrops.includes(key)) {
      setSelectedCrops(selectedCrops.filter((k) => k !== key));
    } else {
      setSelectedCrops([...selectedCrops, key]);
    }
  };

  // ── Get Activities for Month ───────────────────────────────────────────────

  const getActivitiesForMonth = (ay: number): Activity[] => {
    return filteredActivities.filter((act) => act.ay === ay);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="tt-page">
      {/* Topbar */}
      <div className="tt-topbar">
        <button className="tt-topbar__back" onClick={() => navigate(-1)}>← Geri</button>
        <div className="tt-topbar__title">
          <span>📅</span>
          <span>Tarımsal Takvim</span>
        </div>
        <div style={{ width: '100px' }} />
      </div>

      <div className="tt-content">
        {/* Crop Selection */}
        <div className="tt-card">
          <h2 className="tt-card__title">Ürün Seçimi</h2>
          <p className="tt-card__desc">Takvimde görmek istediğiniz ürünleri seçin (birden fazla seçilebilir).</p>
          
          <div className="tt-crop-grid">
            {Object.keys(CROP_PROFILES).map((key) => {
              const crop = CROP_PROFILES[key];
              const isSelected = selectedCrops.includes(key);
              return (
                <div
                  key={key}
                  className={`tt-crop-chip ${isSelected ? 'tt-crop-chip--selected' : ''}`}
                  onClick={() => toggleCrop(key)}
                >
                  <span className="tt-crop-chip__emoji">{crop.emoji}</span>
                  <span className="tt-crop-chip__name">{crop.ad}</span>
                </div>
              );
            })}
          </div>
        </div>

        {selectedCrops.length === 0 && (
          <div className="tt-empty">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌾</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Hiç ürün seçilmedi</div>
            <div style={{ color: '#78716c', marginTop: '0.5rem' }}>
              Yukarıdan takvimde görmek istediğiniz ürünleri seçin
            </div>
          </div>
        )}

        {selectedCrops.length > 0 && (
          <>
            {/* Controls */}
            <div className="tt-controls">
              <div className="tt-controls__left">
                <label style={{ fontWeight: 700, marginRight: '0.5rem' }}>Görünüm:</label>
                <div className="tt-view-btns">
                  <button
                    className={`tt-view-btn ${viewMode === 'takvim' ? 'tt-view-btn--active' : ''}`}
                    onClick={() => setViewMode('takvim')}
                  >
                    📅 Takvim
                  </button>
                  <button
                    className={`tt-view-btn ${viewMode === 'liste' ? 'tt-view-btn--active' : ''}`}
                    onClick={() => setViewMode('liste')}
                  >
                    📋 Liste
                  </button>
                  <button
                    className={`tt-view-btn ${viewMode === 'timeline' ? 'tt-view-btn--active' : ''}`}
                    onClick={() => setViewMode('timeline')}
                  >
                    📊 Zaman Çizelgesi
                  </button>
                </div>
              </div>

              <div className="tt-controls__right">
                <label style={{ fontWeight: 700, marginRight: '0.5rem' }}>Filtre:</label>
                <select
                  className="tt-filter-select"
                  value={filterTip}
                  onChange={(e) => setFilterTip(e.target.value as Activity['tip'] | 'hepsi')}
                >
                  <option value="hepsi">Tüm Aktiviteler</option>
                  <option value="ekim">🌱 Ekim</option>
                  <option value="sulama">💧 Sulama</option>
                  <option value="gubre">🧪 Gübreleme</option>
                  <option value="ilac">🧴 İlaçlama</option>
                  <option value="hasat">🌾 Hasat</option>
                </select>
              </div>
            </div>

            {/* Calendar View */}
            {viewMode === 'takvim' && (
              <div className="tt-calendar">
                {AYLAR.map((ayAd, idx) => {
                  const ayIndex = idx + 1;
                  const acts = getActivitiesForMonth(ayIndex);
                  const isCurrentMonth = ayIndex === new Date().getMonth() + 1;

                  return (
                    <div key={ayIndex} className={`tt-month ${isCurrentMonth ? 'tt-month--current' : ''}`}>
                      <div className="tt-month__header">
                        <span className="tt-month__name">{ayAd}</span>
                        <span className="tt-month__count">{acts.length} aktivite</span>
                      </div>
                      <div className="tt-month__activities">
                        {acts.length === 0 && (
                          <div className="tt-month__empty">Aktivite yok</div>
                        )}
                        {acts.map((act) => (
                          <div
                            key={act.id}
                            className="tt-activity"
                            style={{ borderLeftColor: TIP_COLORS[act.tip] }}
                          >
                            <div className="tt-activity__header">
                              <span className="tt-activity__emoji">{act.urun_emoji}</span>
                              <span className="tt-activity__title">{act.baslik}</span>
                            </div>
                            <div className="tt-activity__meta">
                              <span className={`tt-activity__badge tt-activity__badge--${act.oncelik}`}>
                                {act.oncelik === 'kritik' && '🔴'}
                                {act.oncelik === 'yuksek' && '🟠'}
                                {act.oncelik === 'orta' && '🟡'}
                                {act.oncelik === 'dusuk' && '⚪'}
                              </span>
                              <span className="tt-activity__week">Hafta {act.hafta}</span>
                            </div>
                            <div className="tt-activity__notes">{act.notlar}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {viewMode === 'liste' && (
              <div className="tt-card">
                <h2 className="tt-card__title">Aktivite Listesi ({filteredActivities.length})</h2>
                <div className="tt-list">
                  {filteredActivities.map((act) => (
                    <div key={act.id} className="tt-list-item" style={{ borderLeftColor: TIP_COLORS[act.tip] }}>
                      <div className="tt-list-item__left">
                        <div className="tt-list-item__date">
                          {AYLAR[act.ay - 1]} <span>Hafta {act.hafta}</span>
                        </div>
                        <div className="tt-list-item__title">
                          <span style={{ marginRight: '0.5rem' }}>{act.urun_emoji}</span>
                          {act.baslik}
                        </div>
                        <div className="tt-list-item__notes">{act.notlar}</div>
                      </div>
                      <div className="tt-list-item__right">
                        <span className={`tt-list-item__badge tt-list-item__badge--${act.oncelik}`}>
                          {act.oncelik.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline View */}
            {viewMode === 'timeline' && (
              <div className="tt-card">
                <h2 className="tt-card__title">Yıllık Zaman Çizelgesi</h2>
                <div className="tt-timeline">
                  {selectedCrops.map((cropKey) => {
                    const crop = CROP_PROFILES[cropKey];
                    const cropActivities = filteredActivities.filter((a) => a.urun === crop.ad);

                    return (
                      <div key={cropKey} className="tt-timeline-row">
                        <div className="tt-timeline-label">
                          <span>{crop.emoji}</span>
                          <span>{crop.ad}</span>
                        </div>
                        <div className="tt-timeline-bar">
                          {AYLAR.map((_, ayIdx) => {
                            const ayActivities = cropActivities.filter((a) => a.ay === ayIdx + 1);
                            return (
                              <div key={ayIdx} className="tt-timeline-cell">
                                {ayActivities.map((act) => (
                                  <div
                                    key={act.id}
                                    className="tt-timeline-dot"
                                    style={{ backgroundColor: TIP_COLORS[act.tip] }}
                                    title={`${act.baslik} - ${AYLAR[ayIdx]}`}
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
                    <div key={idx} className="tt-timeline-month">
                      {ay.slice(0, 3)}
                    </div>
                  ))}
                </div>
                <div className="tt-timeline-legend">
                  <div><div style={{ backgroundColor: TIP_COLORS.ekim }} /> Ekim</div>
                  <div><div style={{ backgroundColor: TIP_COLORS.sulama }} /> Sulama</div>
                  <div><div style={{ backgroundColor: TIP_COLORS.gubre }} /> Gübreleme</div>
                  <div><div style={{ backgroundColor: TIP_COLORS.ilac }} /> İlaçlama</div>
                  <div><div style={{ backgroundColor: TIP_COLORS.hasat }} /> Hasat</div>
                </div>
              </div>
            )}

            {/* Summary Stats */}
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
                <div className="tt-stat-card__value">
                  {getActivitiesForMonth(currentMonth).length}
                </div>
                <div className="tt-stat-card__label">Bu Ay</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
