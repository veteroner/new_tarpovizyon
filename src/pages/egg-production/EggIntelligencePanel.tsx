import { yuzde } from '../../utils/sayi';
import { Card } from '../../components/ui/Card';
import type { TuikEggData } from './eggProductionTypes';

interface EggIntelligencePanelProps {
  tuikData: TuikEggData[];
}

export function EggIntelligencePanel({ tuikData }: EggIntelligencePanelProps) {
  if (tuikData.length === 0) return null;

  const lastYear = tuikData[0];
  const firstYear = tuikData[tuikData.length - 1];
  const years = tuikData.length - 1;

  const eggCAGR = years > 0
    ? ((Math.pow(lastYear.eggProduction / firstYear.eggProduction, 1 / years) - 1) * 100)
    : 0;

  const validLayerData = tuikData.filter(d => d.layerCount > 0);
  const layerCAGR = validLayerData.length >= 2
    ? ((Math.pow(validLayerData[0].layerCount / validLayerData[validLayerData.length - 1].layerCount, 1 / (validLayerData.length - 1)) - 1) * 100)
    : 0;

  const yieldChange = lastYear.yieldPerBird - firstYear.yieldPerBird;
  const denomForHybrid = lastYear.layerCount > 0 ? lastYear.layerCount :
    (lastYear.nativeLayer + lastYear.hybridLayer > 0 ? lastYear.nativeLayer + lastYear.hybridLayer : 0);
  const hybridShare = denomForHybrid > 0 ? (lastYear.hybridLayer / denomForHybrid) * 100 : 0;

  /* Degrade zemin + %15 opak beyaz cam karolar kaldırıldı: o zeminde 10 px
     yardımcı yazı WCAG kontrast sınırının altındaydı. Ortak `.hero-ozet`
     düzeni — aynı panel arıcılık ve hayvansal üretim sayfalarında da var. */
  const ogeler = [
    { etiket: 'Yumurta BBO', deger: yuzde(eggCAGR, 1, true), alt: `${years} yıl büyüme` },
    { etiket: 'Tavuk BBO', deger: yuzde(layerCAGR, 1, true), alt: `Popülasyon (${years} yıl)` },
    { etiket: 'Verim artışı', deger: `${yieldChange > 0 ? '+' : ''}${yieldChange.toFixed(0)}`, alt: 'Adet/tavuk/yıl' },
    { etiket: 'Hibrit payı', deger: yuzde(hybridShare, 1), alt: 'Modernizasyon' },
  ];

  return (
    <Card className="hero-ozet" aralik="normal">
      <h3 className="ui-card-title hero-ozet-baslik">Yumurta içgörü özeti</h3>
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
