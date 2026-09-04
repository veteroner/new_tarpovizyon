import { Card } from '../../components/ui/Card';
import { yuzde } from '../../utils/sayi';
import { type TuikKovanKpi } from './beekeepingTypes';

/**
 * Arıcılığın türev ölçüleri — büyüme, modernizasyon, balmumu değişimi.
 *
 * Eskiden yeşil degrade zemin üzerinde %15 opak beyaz "cam" karolardı; o
 * zeminde 10–11 px yardımcı yazı WCAG kontrast sınırının altında kalıyordu.
 * Artık `hero-ozet` düzeniyle aynı: düz kart, nötr zemin, tek başlık ayracı.
 * Aynı kalıp `turkeyAnimalProduction/HeroSection` içinde de kullanılıyor —
 * iki panelin görünüşü artık ayrışmıyor.
 */
export function BeekeepingIntelligencePanel({ tuikKovanKpi }: { tuikKovanKpi: TuikKovanKpi }) {
  const ogeler = [
    { etiket: 'Kovan BBO', deger: yuzde(tuikKovanKpi.cagr, 1, true), alt: 'Yıllık bileşik büyüme' },
    { etiket: 'Son yıl değişim', deger: yuzde(tuikKovanKpi.yoy, 1, true), alt: 'Kovan sayısı değişimi' },
    { etiket: 'Eski tip kovan payı', deger: yuzde(tuikKovanKpi.eskiPay, 1), alt: 'Modernizasyon seviyesi' },
    { etiket: 'Balmumu değişim', deger: yuzde(tuikKovanKpi.balmumuYoy, 1, true), alt: 'Son yıl balmumu' },
  ];

  return (
    <Card className="hero-ozet" aralik="normal">
      <h3 className="ui-card-title hero-ozet-baslik">Arıcılık içgörü özeti</h3>
      <div className="hero-ozet-izgara">
        {ogeler.map((o) => (
          <div className="hero-ozet-oge" key={o.etiket}>
            <div className="hero-ozet-etiket">{o.etiket}</div>
            <div className="hero-ozet-deger">{o.deger}</div>
            <div className="hero-ozet-alt">{o.alt}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
