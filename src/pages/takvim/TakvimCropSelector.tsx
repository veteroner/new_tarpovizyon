import { CROP_PROFILES } from './takvimTypes';

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
      <p className="tt-card__desc">Takip etmek istediğin ürünleri seç (birden fazla seçebilirsin).</p>

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
                >
                  <span className="tt-crop-chip__emoji">{crop.emoji}</span>
                  <span className="tt-crop-chip__name">{crop.ad}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
