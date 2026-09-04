import React from 'react';
import { Beef, Droplets, Egg, Hexagon } from 'lucide-react';
import { Card, StatCard } from '../../components/ui/Card';
import { sayi } from '../../utils/sayi';
import type { KpiData } from './useTurkeyAnimalProductionData';
import { formatValue } from './turkeyAnimalProductionTypes';

/**
 * Sayfa başındaki dört KPI ve içgörü paneli.
 *
 * ─── NEDEN YENİDEN YAZILDI ──────────────────────────────────────────────────
 * Dört kart, dört ayrı muamele görüyordu: kırmızı et koyu bordo degrade +
 * beyaz yazı, süt beyaz kart + koyu yazı, yumurta KEHRİBAR degrade + KOYU
 * yazı, bal neredeyse AYNI kehribar degrade + BEYAZ yazı. Yani iki kart aynı
 * zemin rengini paylaşıp zıt yazı rengi kullanıyordu. Üstüne dördü de 48
 * satır içi stille elle kuruluydu.
 *
 * `StatCard` bu iş için zaten vardı (ui/Card.tsx) ama kod tabanında HİÇBİR
 * sayfa onu kullanmıyordu — sistem yazılmış, benimsenmemişti. Zemin artık
 * dördünde de nötr, sayı `tabular-nums` ile hizalı.
 *
 * Dört kartın hiçbirinde ton şeridi YOK ve bu kasıtlı. Ton renkleri anlamsal
 * (olumlu/olumsuz/uyarı); ürün kimliğini onlarla kodlamak "kırmızı et = kötü"
 * diye okunuyordu. Üstelik `bilgi` ile `birincil` aynı `--primary` değerine
 * düşüyor, yani dört karttan ikisi zaten aynı şeridi taşıyordu. Kimliği ikon
 * veriyor, rengi yalnız değişim taşıyor.
 *
 * Değişim oku ve rengi `delta`dan geliyor; renk tek başına anlam taşımasın
 * diye ok işareti de basılıyor.
 */

interface HeroSectionProps {
  kpiData: KpiData | null;
  cagr5Year: number;
  milkProductivityTrend: number;
  forecastRedMeat: number;
  growthStrategy: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  kpiData, cagr5Year, milkProductivityTrend, forecastRedMeat, growthStrategy,
}) => {
  if (!kpiData) return null;

  const ozet = [
    { etiket: '5 yıllık BBO (kırmızı et)', deger: `%${sayi(cagr5Year, 1)}`, alt: 'Yıllık bileşik büyüme' },
    { etiket: 'Süt verimlilik trendi', deger: `%${sayi(milkProductivityTrend, 1)}`, alt: 'Son 3 yıl büyüme' },
    { etiket: 'Tahmin (kırmızı et)', deger: forecastRedMeat > 0 ? `${formatValue(forecastRedMeat)} ton` : '—', alt: 'Doğrusal trend tahmini' },
    { etiket: 'Büyüme stratejisi', deger: growthStrategy, alt: 'Son 3 yıl analizi' },
  ];

  return (
    <>
      <div className="kpi-grid">
        <StatCard
          label="Toplam kırmızı et"
          value={`${formatValue(kpiData.redMeat.value)} ton`}
          delta={kpiData.redMeat.change}
          sub="Yıllık değişim"
          icon={<Beef size={18} aria-hidden="true" />}
        />
        <StatCard
          label="Toplam süt üretimi"
          value={`${formatValue(kpiData.milk.value)} ton`}
          delta={kpiData.milk.change}
          sub="Yıllık değişim"
          icon={<Droplets size={18} aria-hidden="true" />}
        />
        <StatCard
          label="Toplam yumurta"
          value={`${sayi(kpiData.egg.value / 1000, 2)} milyar adet`}
          delta={kpiData.egg.change}
          sub="Yıllık değişim"
          icon={<Egg size={18} aria-hidden="true" />}
        />
        <StatCard
          label="Toplam bal üretimi"
          value={`${formatValue(kpiData.honey.value)} ton`}
          delta={kpiData.honey.change}
          sub="Yıllık değişim"
          icon={<Hexagon size={18} aria-hidden="true" />}
        />
      </div>

      {/*
        İçgörü paneli eskiden yeşil degrade zemin + yarı saydam cam karolardı.
        Degradenin üstündeki %15 opak beyaz kutularda küçük yazı kontrastı
        WCAG sınırının altında kalıyordu. Artık düz kart; vurgu yalnız başlıkta.
      */}
      <Card className="hero-ozet" aralik="normal">
        <h3 className="ui-card-title hero-ozet-baslik">Hayvansal üretim içgörü özeti</h3>
        <div className="hero-ozet-izgara">
          {ozet.map((o) => (
            <div className="hero-ozet-oge" key={o.etiket}>
              <div className="hero-ozet-etiket">{o.etiket}</div>
              <div className="hero-ozet-deger">{o.deger}</div>
              <div className="hero-ozet-alt">{o.alt}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
};

export default HeroSection;
