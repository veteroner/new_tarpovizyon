import { Link, useParams } from 'react-router-dom';
import { YearlyChart } from '../../charts/YearlyChart';
import { RankingBlock } from '../../charts/RankingBlock';
import { ProportionBar } from '../../charts/ProportionBar';
import { TurkeyProvinceMap } from '../../charts/TurkeyProvinceMap';
import { COLORS } from '../../../pages/turkeyAnimalProduction/turkeyAnimalProductionTypes';
import { KARTLAR, kartBul } from './kartlar';
import { useHayvansalKartlar, useFiyatSerisi, useDunyaFiyat, type YilSatiri } from './useHayvansalKartlar';
import { useTurkeyAnimalProductionData } from '../../../pages/turkeyAnimalProduction/useTurkeyAnimalProductionData';

/**
 * Kart detayı — tek şablon, `kartlar.ts`'teki yapılandırmayı okuyor.
 *
 * Bloklar sırayla: künye · kırılım · dünya sıralaması · fiyat · yönlendirme.
 * VERİSİ OLMAYAN BLOK ÇİZİLMİYOR; boş bir grafik göstermektense hiç
 * göstermemek daha dürüst.
 */

const sayi = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const para = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

export function HayvansalDetayPage() {
  const { kartId } = useParams();
  const kart = kartBul(String(kartId));
  const { yukleniyor, varlik, uretim } = useHayvansalKartlar();
  const fiyat = useFiyatSerisi(kart?.fiyatUrunleri);
  const dunyaFiyat = useDunyaFiyat(kart?.dunyaFiyat);
  const {
    worldBeefRanking, worldMilkRanking, worldChickenRanking,
    redMeatBreakdown, redMeatTrendData, poultryMonthlyData, cityData,
  } = useTurkeyAnimalProductionData();

  if (!kart) {
    return (
      <div className="tvb-page">
        <div className="tvb-page__banner tvb-page__banner--orange">Bulunamadı</div>
        <p className="tvb-status">Böyle bir kart yok.</p>
      </div>
    );
  }

  if (yukleniyor) {
    return (
      <div className="tvb-page">
        <div className="tvb-page__banner tvb-page__banner--orange">{kart.label}</div>
        <p className="tvb-status">Yükleniyor…</p>
      </div>
    );
  }

  const kaynak: YilSatiri[] = kart.kaynak === 'varlik' ? varlik : uretim;
  const seri = kaynak
    .map((r) => ({ yil: r.yil, deger: Number(r[kart.alan]) }))
    .filter((d) => Number.isFinite(d.deger) && d.deger > 0);
  const son = seri[seri.length - 1];
  const onceki = seri[seri.length - 2];
  const degisim = son && onceki && onceki.deger !== 0
    ? ((son.deger - onceki.deger) / onceki.deger) * 100 : null;

  // Kırılım serisi: yapılandırmadaki alanlar aynı kaynaktan okunuyor.
  const kirilimVerisi = kart.kirilim
    ? kaynak
      .filter((r) => kart.kirilim!.some((k) => Number.isFinite(Number(r[k.key]))))
      .map((r) => {
        const o: Record<string, number | string> = { yil: r.yil };
        for (const k of kart.kirilim!) o[k.label] = Number(r[k.key]);
        return o;
      })
    : [];

  const dunya = kart.dunyaSirasi === 'sigir-eti' ? worldBeefRanking
    : kart.dunyaSirasi === 'sut' ? worldMilkRanking
      : kart.dunyaSirasi === 'tavuk-eti' ? worldChickenRanking : [];

  /*
   * Fiyat serileri BİRİME GÖRE AYRI grafiklerde.
   * TÜİK aynı ailede farklı birim kullanabiliyor: "Süt sığırları, canlı"
   * TL/BAŞ (~166.000), "Koyun, canlı" TL/KG (~135). Tek eksende çizince
   * küçük olan düz çizgiye dönüyor ve okunmaz oluyor.
   */
  const fiyatGruplari = (() => {
    const satir = fiyat.data ?? [];
    if (!satir.length) return [] as { birim: string; veri: Record<string, number | string>[]; urunler: string[] }[];

    const birimeGore = new Map<string, typeof satir>();
    for (const r of satir) {
      const b = String(r.birim ?? '—');
      birimeGore.set(b, [...(birimeGore.get(b) ?? []), r]);
    }

    return [...birimeGore.entries()].map(([birim, kayitlar]) => {
      const urunler = [...new Set(kayitlar.map((r) => String(r.urun)))];
      const donemler = new Map<string, Record<string, number | string>>();
      for (const r of kayitlar) {
        const d = `${r.yil}-${String(r.ay).padStart(2, '0')}`;
        const kayit = donemler.get(d) ?? { donem: d };
        kayit[String(r.urun)] = Number(r.fiyat);
        donemler.set(d, kayit);
      }
      return {
        birim,
        urunler,
        veri: [...donemler.values()].sort((a, b) => String(a.donem).localeCompare(String(b.donem))),
      };
    });
  })();

  /*
   * Dünya fiyatı: Türkiye'nin USD/ton serisi + son yılın ülke sıralaması.
   * FAO üretici fiyatlarında canlı hayvan fiyatı yok, ET fiyatı var — bu yüzden
   * hayvan varlığı kartlarında başlık "et fiyatı" diyor, yanıltmasın.
   */
  const TURKIYE = 223;
  const dunyaBloklari = (dunyaFiyat.data ?? []).map((g) => {
    /*
     * FAO değeri USD/TON. Ekranda USD/KG gösteriliyor: "15.363" baş fiyatı
     * gibi okunuyordu, "15,4" ise etin kilosu olarak anında anlaşılıyor.
     */
    const kg = (v: unknown) => Number(v) / 1000;
    const tr = g.satirlar
      .filter((r) => Number(r.areacode) === TURKIYE && Number(r.value) > 0)
      .map((r) => ({ yil: Number(r.year), [g.label]: kg(r.value) }))
      .sort((a, b) => a.yil - b.yil);
    /*
     * Sıralama yılı: TÜRKİYE'NİN VERİSİ OLAN son yıl. FAO ülkeleri farklı
     * yıllara kadar yayımlıyor (sığır etinde Türkiye 2022'de bitiyor, dosyada
     * 2024 var). Dosyanın son yılını kullanmak Türkiye'nin hiç görünmediği bir
     * sıralama üretiyordu — karşılaştırma da anlamını yitiriyordu.
     */
    const trYillar = g.satirlar
      .filter((r) => Number(r.areacode) === TURKIYE && Number(r.value) > 0)
      .map((r) => Number(r.year));
    const sonYil = trYillar.length
      ? Math.max(...trYillar)
      : Math.max(0, ...g.satirlar.map((r) => Number(r.year)).filter(Number.isFinite));
    const oYil = g.satirlar.filter((r) => Number(r.year) === sonYil && Number(r.value) > 0);
    const siralama = oYil
      .map((r) => ({ name: String(r.area), value: kg(r.value) }))
      .sort((a, b) => b.value - a.value);
    const trSira = siralama.findIndex((x) => x.name === 'Türkiye');
    const trDeger = siralama[trSira]?.value ?? null;
    return { ...g, tr, sonYil, siralama, trSira: trSira >= 0 ? trSira + 1 : null, trDeger };
  }).filter((g) => g.tr.length || g.siralama.length);

  /* ─── ÖZETTEN TAŞINAN BLOKLAR ─────────────────────────────────────────────
   * Bu grafikler önce iniş sayfasındaydı; orası yalnızca kartlardan oluşsun
   * diye ilgili kartın detayına taşındı. İçerik değişmedi, yeri değişti.
   */
  const etDagilimi = kart.etKirilimi
    ? redMeatBreakdown.map((d) => ({ name: d.name, value: d.value, color: COLORS[d.name] ?? '#94a3b8' }))
    : [];

  const haritaDegerleri: Record<string, number> = {};
  if (kart.haritaTurleri) {
    for (const il of cityData ?? []) {
      haritaDegerleri[il.il] = kart.haritaTurleri.reduce((t2, tur) => t2 + (il[tur] ?? 0), 0);
    }
  }

  const komsular = KARTLAR.filter((k) => k.grup === kart.grup);
  const sira = komsular.findIndex((k) => k.id === kart.id);
  const onceki_kart = komsular[sira - 1];
  const sonraki_kart = komsular[sira + 1];

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner tvb-page__banner--orange">{kart.label}</div>

      <p className="tvb-status">
        <Link to="/tarpovizyon-basic/genel/hayvansal-uretim">← Hayvansal Üretim Özeti</Link>
      </p>

      {son && (
        <div className="tvb-detay__kunye">
          <span className="tvb-detay__deger">{sayi.format(son.deger)} <small>{kart.birim}</small></span>
          {degisim !== null && (
            <span className={degisim >= 0 ? 'tvb-kart__degisim--artan' : 'tvb-kart__degisim--azalan'}>
              {degisim >= 0 ? '▲' : '▼'} {Math.abs(degisim).toFixed(1)}% geçen yıla göre
            </span>
          )}
          <span className="tvb-kart__donem">{son.yil}</span>
        </div>
      )}

      <div className="tvb-section">
        <h3>{kart.label} — Yıllık Seyir ({kart.birim})</h3>
        <YearlyChart
          data={seri.map((d) => ({ yil: d.yil, [kart.label]: d.deger }))}
          xKey="yil"
          series={[{ key: kart.label, label: kart.label, type: 'line' }]}
          yDomain="auto"
        />
      </div>

      {kirilimVerisi.length > 0 && (
        <div className="tvb-section">
          <h3>Kırılım ({kart.birim})</h3>
          <YearlyChart
            data={kirilimVerisi}
            xKey="yil"
            series={kart.kirilim!.map((k) => ({ key: k.label, label: k.label, type: 'line' as const }))}
            yDomain="auto"
          />
        </div>
      )}

      {etDagilimi.length > 0 && (
        <div className="tvb-section">
          <h3>Kırmızı Et Üretiminin Tür Dağılımı</h3>
          <ProportionBar items={etDagilimi} />
        </div>
      )}

      {kart.etKirilimi && redMeatTrendData.length > 0 && (
        <div className="tvb-section">
          <h3>Türlere Göre Yıllık Üretim (ton)</h3>
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

      {kart.aylikAlan && poultryMonthlyData.length > 0 && (
        <div className="tvb-section">
          <h3>Aylık Üretim</h3>
          <YearlyChart
            data={poultryMonthlyData as unknown as Record<string, number | string>[]}
            xKey="ay"
            series={[{ key: kart.aylikAlan, label: kart.aylikAlan, type: 'line' }]}
            yDomain="auto"
          />
        </div>
      )}

      {Object.keys(haritaDegerleri).length > 0 && (
        <div className="tvb-section">
          <h3>İllere Göre Dağılım (baş)</h3>
          <TurkeyProvinceMap values={haritaDegerleri} birim="Baş" />
        </div>
      )}

      {dunya.length > 0 && (
        <div className="tvb-section">
          <h3>Dünya Sıralaması (ton)</h3>
          <RankingBlock items={dunya.map((x) => ({ name: x.ulke, value: x.uretim }))} topN={10} />
        </div>
      )}

      {fiyatGruplari.map((g) => (
        <div className="tvb-section" key={g.birim}>
          <h3>TÜİK Üretici Fiyatı ({g.birim})</h3>
          <YearlyChart
            data={g.veri}
            xKey="donem"
            series={g.urunler.map((u) => ({ key: u, label: u, type: 'line' as const }))}
            yDomain="auto"
          />
          <p className="tvb-status">
            Son değer:{' '}
            {g.urunler.map((u) => {
              const sonKayit = [...g.veri].reverse().find((d) => Number.isFinite(Number(d[u])));
              return sonKayit ? `${u}: ${para.format(Number(sonKayit[u]))} ${g.birim}` : null;
            }).filter(Boolean).join(' · ')}
          </p>
        </div>
      ))}

      {dunyaBloklari.map((g) => (
        <div className="tvb-section" key={g.kod}>
          <h3>Dünya Fiyatı — {g.label} (FAO üretici fiyatı, USD/kg)</h3>
          {g.tr.length > 0 && (
            <YearlyChart
              data={g.tr}
              xKey="yil"
              series={[{ key: g.label, label: `Türkiye — ${g.label} (USD/kg)`, type: 'line' }]}
              yDomain="auto"
            />
          )}
          {g.trSira && (
            <p className="tvb-status">
              {g.sonYil}: Türkiye {para.format(g.trDeger as number)} USD/kg —
              {' '}{g.siralama.length} ülke arasında {g.trSira}. sırada
            </p>
          )}
          {g.siralama.length > 0 && (
            <>
              <h4>{g.sonYil} — En Yüksek Fiyatlı Ülkeler (USD/kg)</h4>
              <RankingBlock items={g.siralama} topN={10} />
            </>
          )}
        </div>
      ))}

      {(onceki_kart || sonraki_kart) && (
        <div className="tvb-detay__gezinme">
          {onceki_kart
            ? <Link to={`/tarpovizyon-basic/genel/hayvansal-uretim/${onceki_kart.id}`}>← {onceki_kart.label}</Link>
            : <span />}
          {sonraki_kart
            && <Link to={`/tarpovizyon-basic/genel/hayvansal-uretim/${sonraki_kart.id}`}>{sonraki_kart.label} →</Link>}
        </div>
      )}

      {kart.sektor && (
        <div className="tvb-section">
          <h3>Devamı</h3>
          <Link to={`/tarpovizyon-basic/${kart.sektor.yol}`} className="tvb-kategoriler__kart">
            <span className="tvb-kategoriler__ad">{kart.sektor.label}</span>
            <span className="tvb-kategoriler__adet">Üretim, fiyat, maliyet ve yeterlilik →</span>
          </Link>
        </div>
      )}
    </div>
  );
}
