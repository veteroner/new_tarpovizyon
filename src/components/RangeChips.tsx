type Props = {
  /** Veride bulunan yıllar (sıralı olmak zorunda değil). */
  years: number[];
  value: number;
  onChange: (baslangicYili: number) => void;
};

/**
 * Zaman aralığı seçici.
 *
 * Yerine geçtiği açılır menünün üç sorunu vardı:
 *  1. Tek kontrol için bir kartın tamamını (~130 px) harcıyordu.
 *  2. Seçenekler elle yazılmış SABİT yıllardı (1986/2000/2010/2015/2020) —
 *     veri ilerledikçe bayatlıyor.
 *  3. "Başlangıç yılı" tersten kurulmuş bir soru; kullanıcı "son 10 yıl"
 *     diye düşünür, "1986'dan beri" diye değil.
 *
 * Çipler veriden türetiliyor, tek dokunuşla değişiyor ve tek satır yer
 * kaplıyor. Yalnızca veride karşılığı olan aralıklar gösteriliyor.
 */
export default function RangeChips({ years, value, onChange }: Props) {
  if (!years.length) return null;

  const enEski = Math.min(...years);
  const enYeni = Math.max(...years);
  const kapsam = enYeni - enEski;

  const secenekler = [
    { etiket: 'Son 10 Yıl', yil: enYeni - 9 },
    { etiket: 'Son 20 Yıl', yil: enYeni - 19 },
    { etiket: 'Son 30 Yıl', yil: enYeni - 29 },
    { etiket: 'Tümü', yil: enEski },
  ].filter(s => s.etiket === 'Tümü' || s.yil > enEski);

  // 10 yıllık veride "Son 20 Yıl" göstermenin anlamı yok.
  const gorunur = secenekler.filter(s => s.etiket === 'Tümü' || enYeni - s.yil < kapsam);

  return (
    <div className="range-chips" role="group" aria-label="Zaman aralığı">
      {gorunur.map(s => (
        <button
          key={s.etiket}
          type="button"
          aria-pressed={s.yil === value}
          className={`range-chip${s.yil === value ? ' is-active' : ''}`}
          onClick={() => onChange(s.yil)}
        >
          {s.etiket}
        </button>
      ))}
      <span className="range-chips-note">
        {value}–{enYeni}
      </span>
    </div>
  );
}
