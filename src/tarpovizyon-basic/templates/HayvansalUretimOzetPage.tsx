import { useTurkeyAnimalProductionData } from '../../pages/turkeyAnimalProduction/useTurkeyAnimalProductionData';
import { COLORS } from '../../pages/turkeyAnimalProduction/turkeyAnimalProductionTypes';
import { YearlyChart } from '../charts/YearlyChart';
import { RankingBlock } from '../charts/RankingBlock';
import { ProportionBar } from '../charts/ProportionBar';
import { TurkeyProvinceMap } from '../charts/TurkeyProvinceMap';
import { BolumKategorileri } from '../charts/BolumKategorileri';
import { KartIzgarasi } from './hayvansal/KartIzgarasi';
import { useHayvansalKartlar } from './hayvansal/useHayvansalKartlar';

/**
 * Hayvancılığın iniş sayfası — Türkiye hayvansal üretim özeti.
 *
 * ─── NEREDEN GELDİ ──────────────────────────────────────────────────────────
 * Pro'daki "Hayvansal Üretim → Genel Üretim" sayfasının Basic karşılığı.
 * VERİ KATMANI aynen Pro'nun kancasından geliyor (`useTurkeyAnimalProductionData`):
 * iki uygulama da aynı Worker'a gidiyor, dolayısıyla kancayı yeniden yazmak
 * yalnızca iki sayfanın birbirinden sapma riskini doğururdu. Değişen tek şey
 * SUNUM: Pro'nun gömülü stilleri yerine Basic'in kendi bileşenleri.
 *
 * ─── NEDEN İNİŞ SAYFASI ─────────────────────────────────────────────────────
 * Daha önce hayvancılığa girince rastgele bir alt sayfa ("Hayvansal Ürünler")
 * açılıyordu; 6 bölüm ve 21 sayfa arasında nerede olduğun belli olmuyordu.
 * Artık önce Türkiye özeti geliyor, "başka ne var" sorusu da en altta
 * `BolumKategorileri` ile aynı ekranda cevaplanıyor — ayrı bir menü ekranı
 * koymadık, o herkese her girişte kalıcı bir tık maliyeti bindirirdi.
 */

export function HayvansalUretimOzetPage() {
  const {
    loading,
    historicalChartData, redMeatBreakdown, redMeatTrendData,
    poultryMonthlyData,
    worldBeefRanking, worldMilkRanking, worldChickenRanking, cityData,
  } = useTurkeyAnimalProductionData();
  // Kartlar kendi (daha küçük) kaynağından besleniyor: hayvan SAYISI serisi
  // Pro'nun kancasında yok, `tr/hayvan-varliklari` ucundan geliyor.
  const kartVerisi = useHayvansalKartlar();

  if (loading) {
    return (
      <div className="tvb-page">
        <div className="tvb-page__banner tvb-page__banner--orange">Hayvansal Üretim — Türkiye</div>
        <p className="tvb-status">Yükleniyor…</p>
      </div>
    );
  }

  /*
   * Pro'da bu grafik ÇİFT EKSENLİ (süt solda, diğerleri sağda). Basic'te çift
   * eksen bilinçli olarak kullanılmıyor: ölçekleri farklı serileri tek grafiğe
   * sıkıştırmak küçük olanı düz çizgiye çeviriyor. Bunun yerine süt kendi
   * grafiğinde, diğerleri ortak ölçekte.
   */
  const sutSerisi = historicalChartData.map((d) => ({
    yil: d.yil, 'Süt (M ton)': d['Süt (M ton)'],
  }));
  const digerSeri = historicalChartData.map((d) => ({
    yil: d.yil,
    'Kırmızı Et (K ton)': d['Kırmızı Et (K ton)'],
    'Kanatlı (K ton)': d['Kanatlı (K ton)'],
    'Bal (K ton)': d['Bal (K ton)'],
  }));

  const etDagilimi = redMeatBreakdown.map((d) => ({
    name: d.name, value: d.value, color: COLORS[d.name] ?? '#94a3b8',
  }));

  const sira = (liste: { ulke: string; uretim: number }[]) =>
    liste.map((x) => ({ name: x.ulke, value: x.uretim }));

  /*
   * Harita İL bazında. Kancanın `mapData` alanı bölgeye toplanmış olduğu için
   * ham `cityData` kullanılıyor. Toplam = büyükbaş + küçükbaş hayvan varlığı.
   */
  const haritaDegerleri: Record<string, number> = {};
  for (const il of cityData ?? []) {
    haritaDegerleri[il.il] = (il.sigir ?? 0) + (il.manda ?? 0) + (il.koyun ?? 0) + (il.keci ?? 0);
  }

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner tvb-page__banner--orange">Hayvansal Üretim — Türkiye</div>

      <KartIzgarasi varlik={kartVerisi.varlik} uretim={kartVerisi.uretim} />

      <div className="tvb-section">
        <h3>Çiğ Süt Üretimi (milyon ton)</h3>
        <YearlyChart
          data={sutSerisi}
          xKey="yil"
          series={[{ key: 'Süt (M ton)', label: 'Çiğ Süt', type: 'line' }]}
          yDomain="auto"
        />
      </div>

      <div className="tvb-section">
        <h3>Kırmızı Et, Kanatlı ve Bal Üretimi (bin ton)</h3>
        <YearlyChart
          data={digerSeri}
          xKey="yil"
          series={[
            { key: 'Kırmızı Et (K ton)', label: 'Kırmızı Et', type: 'line' },
            { key: 'Kanatlı (K ton)', label: 'Kanatlı Eti', type: 'line' },
            { key: 'Bal (K ton)', label: 'Bal', type: 'line' },
          ]}
          yDomain="auto"
        />
      </div>

      {etDagilimi.length > 0 && (
        <div className="tvb-section">
          <h3>Kırmızı Et Üretiminin Dağılımı</h3>
          <ProportionBar items={etDagilimi} />
        </div>
      )}

      {redMeatTrendData.length > 0 && (
        <div className="tvb-section">
          <h3>Kırmızı Et Türlerine Göre Yıllık Üretim (ton)</h3>
          <YearlyChart
            data={redMeatTrendData as unknown as Record<string, number | string>[]}
            xKey="yil"
            series={[
              { key: 'Sığır', label: 'Sığır', type: 'bar', stack: 'et' },
              { key: 'Koyun', label: 'Koyun', type: 'bar', stack: 'et' },
              { key: 'Keçi', label: 'Keçi', type: 'bar', stack: 'et' },
              { key: 'Manda', label: 'Manda', type: 'bar', stack: 'et' },
            ]}
          />
        </div>
      )}

      {poultryMonthlyData.length > 0 && (
        <div className="tvb-section">
          <h3>Kanatlı Üretimi — Aylık</h3>
          <YearlyChart
            data={poultryMonthlyData as unknown as Record<string, number | string>[]}
            xKey="ay"
            series={[
              { key: 'Tavuk Eti (ton)', label: 'Tavuk Eti (ton)', type: 'line' },
              { key: 'Yumurta (M adet)', label: 'Yumurta (milyon adet)', type: 'line' },
            ]}
            yDomain="auto"
          />
        </div>
      )}

      <div className="tvb-section">
        <h3>Dünya Sıralamasında Türkiye</h3>
        <div className="tvb-ozet__siralamalar">
          <div>
            <h4>Sığır Eti Üretimi (ton)</h4>
            <RankingBlock items={sira(worldBeefRanking)} topN={10} />
          </div>
          <div>
            <h4>Süt Üretimi (ton)</h4>
            <RankingBlock items={sira(worldMilkRanking)} topN={10} />
          </div>
          <div>
            <h4>Tavuk Eti Üretimi (ton)</h4>
            <RankingBlock items={sira(worldChickenRanking)} topN={10} />
          </div>
        </div>
      </div>

      {Object.keys(haritaDegerleri).length > 0 && (
        <div className="tvb-section">
          <h3>İllere Göre Hayvan Varlığı (baş)</h3>
          <TurkeyProvinceMap values={haritaDegerleri} />
        </div>
      )}

      <BolumKategorileri bolumYolu="genel" />
    </div>
  );
}
