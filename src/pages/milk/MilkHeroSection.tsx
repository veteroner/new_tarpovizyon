import { Card, StatCard } from '../../components/ui/Card';
import { yuzde } from '../../utils/sayi';
import { formatTon, type WorldRankings } from './milkUtils';

type Props = {
  latest: { year: number; totalTon: number; cattleTon: number } | undefined;
  yoy: number;
  cattleShare: number;
  cagr: number;
  sufficiency: Record<string, string | number> | null;
  worldRankings: WorldRankings | null;
};

export default function MilkHeroSection({ latest, yoy, cattleShare, cagr, sufficiency, worldRankings }: Props) {
  return (
    <>
      {/* Hero KPI Section */}
      {/*
        Yedi kart tek kart katmanında. Eskiden ikisi (yıllık değişim, yeterlilik)
        işaretine göre zeminini yeşil/bordo yapıyor, kalanı beyaz kart oluyordu —
        aynı ızgarada iki farklı okuma biçimi. Yön artık delta okuyla taşınıyor.
      */}
      <div className="kpi-grid">
        <StatCard
          label={`Toplam üretim ${latest?.year ?? ''}`}
          value={formatTon(latest?.totalTon ?? 0)}
          sub="Yıllık süt üretimi"
        />
        {/* Ölçünün KENDİSİ değişim olduğu için `delta` verilmiyor: verilseydi
            aynı sayı hem değer hem rozet olarak iki kez yazılırdı ("%-4,9 ▼%4,9").
            Yön burada anlamsal ton şeridiyle taşınıyor. */}
        <StatCard
          label="Yıllık değişim"
          value={yuzde(yoy, 1, true)}
          sub="Önceki yıla göre"
          ton={yoy >= 0 ? 'olumlu' : 'olumsuz'}
        />
        <StatCard label="Büyükbaş payı" value={yuzde(cattleShare, 1)} sub="Toplam üretimde" />
        <StatCard label="10 yıllık BBO" value={yuzde(cagr, 1, true)} sub="Bileşik büyüme" />
        {sufficiency && (
          <StatCard
            label="Yeterlilik"
            value={yuzde(Number(sufficiency.sut_ton) * 100, 0)}
            sub={Number(sufficiency.sut_ton) >= 1 ? 'Yeterli' : 'Yetersiz'}
            ton={Number(sufficiency.sut_ton) >= 1 ? 'olumlu' : 'olumsuz'}
          />
        )}
        {worldRankings && (
          <>
            <StatCard label="İnek sütü üretimi" value={`Dünya #${worldRankings.cattle.world}`} sub={`AB #${worldRankings.cattle.eu}`} />
            <StatCard label="Koyun sütü üretimi" value={`Dünya #${worldRankings.sheep.world}`} sub={`AB #${worldRankings.sheep.eu}`} />
            <StatCard label="Keçi sütü üretimi" value={`Dünya #${worldRankings.goat.world}`} sub={`AB #${worldRankings.goat.eu}`} />
          </>
        )}
      </div>

      {/* Degrade zemin + cam karolar kaldırıldı; ortak `.hero-ozet` düzeni. */}
      <Card className="hero-ozet" aralik="normal">
        <h3 className="ui-card-title hero-ozet-baslik">Süt üretimi içgörü özeti</h3>
        <div className="hero-ozet-izgara">
          {[
            { etiket: '10 yıllık BBO', deger: yuzde(cagr, 1, true), alt: 'Yıllık bileşik büyüme' },
            { etiket: 'Yıllık değişim', deger: yuzde(yoy, 1, true), alt: 'Son yıl' },
            { etiket: 'Büyükbaş payı', deger: yuzde(cattleShare, 1), alt: 'Toplam üretimde' },
            { etiket: 'Yeterlilik', deger: sufficiency ? yuzde(Number(sufficiency.sut_ton) * 100, 0) : '—',
              alt: sufficiency && Number(sufficiency.sut_ton) >= 1 ? 'Yeterli' : 'Yetersiz' },
          ].map((o) => (
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
}
