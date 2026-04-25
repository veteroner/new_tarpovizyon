import { CROP_PROFILES, TAKVIM_DATA_SOURCE_NOTE, TAKVIM_DATA_VERSION } from './takvimTypes';

interface Props {
  selectedCrops: string[];
  toggleCrop: (key: string) => void;
}

const CATEGORIES: Array<{ key: 'kislik' | 'yazlik' | 'cok_yillik'; label: string; emoji: string }> = [
  { key: 'kislik',     label: 'Kışlık Ürünler',    emoji: '❄️' },
  { key: 'yazlik',     label: 'Yazlık Ürünler',    emoji: '☀️' },
  { key: 'cok_yillik', label: 'Çok Yıllık Ürünler', emoji: '🌳' },
];

export function TakvimCropSelector({ selectedCrops, toggleCrop }: Props) {
  return (
    <div className="tt-card">
      <h2 className="tt-card__title">🌱 Ürün Seçimi</h2>
      <p className="tt-card__desc">Takip etmek istediğin ürünleri seç. Her kartta kural güveni görünür; ayrıntılı kaynak notu hover ile okunabilir.</p>
      <div className="tt-data-meta">Veri sürümü: v{TAKVIM_DATA_VERSION} · {TAKVIM_DATA_SOURCE_NOTE}</div>

      {CATEGORIES.map(({ key, label, emoji }) => {
        const crops = Object.entries(CROP_PROFILES).filter(([, c]) => c.kategori === key);
        return (
          <div key={key} className="tt-crop-category">
            <div className="tt-crop-category__label">{emoji} {label}</div>
            <div className="tt-crop-grid">
              {crops.map(([cropKey, crop]) => (
                <button
                  key={cropKey}
                  className={`tt-crop-chip${selectedCrops.includes(cropKey) ? ' tt-crop-chip--selected' : ''}`}
                  onClick={() => toggleCrop(cropKey)}
                  title={`${crop.ad} • Güven: ${crop.guvenDuzeyi} • ${crop.kaynakNotu}`}
                >
                  <span className="tt-crop-chip__emoji">{crop.emoji}</span>
                  <span className="tt-crop-chip__body">
                    <span className="tt-crop-chip__name">{crop.ad}</span>
                    <span className="tt-crop-chip__meta">{crop.guvenDuzeyi} guven</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
