import { endeksle } from '../../utils/endeks';
import { yuzde } from '../../utils/sayi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, Cell,
} from 'recharts';
import { COLORS, formatNumber, formatShort } from './overviewTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import type { OverviewData } from './overviewTypes';
import { ChartCard } from '../../components/ui/Card';
import { LINE_Y_DOMAIN } from '../../utils/chartTicks';

/**
 * Karşılaştırmalı analizler.
 *
 * ─── BURADA NE DEĞİŞTİ VE NEDEN ─────────────────────────────────────────────
 * Bu bölüm üç ayrı şekilde yanlıştı; üçü de "elmayla armudu aynı sepete
 * koymak"tan geliyordu.
 *
 * 1. UYDURULMUŞ DİLİM. Pasta grafiğinde "Diğer Ürünler" diye bir dilim vardı
 *    ve değeri `(süt + et) * 0.15` idi — yani hiçbir ölçüme dayanmayan, kodda
 *    üretilmiş bir sayı. Silindi. Veriden gelmeyen hiçbir şey grafikte yer
 *    almamalı; uydurulmuş bir dilim, yanlış bir dilimden daha kötü, çünkü
 *    kaynağı yok ve düzeltilemez.
 *
 * 2. PASTANIN KENDİSİ. Kalan iki dilim (süt tonu, et tonu) aynı birimde ama
 *    karşılaştırması anlamsız: 22 milyon ton süt ile 2,5 milyon ton et yan
 *    yana konunca pasta "hayvansal üretimin %90'ı süt" diyor. Ağırlık, sütle
 *    eti kıyaslamanın ölçüsü değil. Pasta silindi; yerine her ürünün KENDİ
 *    ekseninde, KENDİ biriminde çizildiği küçük grafikler geldi. Karışık
 *    birimleri tek çerçeveye sokmanın doğru cevabı, onları hiç aynı çerçeveye
 *    sokmamak.
 *
 * 3. ENDEKS ETİKETİ YALAN SÖYLÜYORDU. Üstteki karşılaştırma grafiği aslında
 *    ENDEKSLİ çiziliyordu (her seri ilk yılına göre 100) ama gösterge "Süt
 *    (ton)", "Et (ton)" diyor, ipucu da değeri "ton" diye biçimlendiriyordu.
 *    Y ekseni 90–210 arasıydı; okuyucu "et 180 ton" görüyordu. Etiketler
 *    düzeltildi, ipucuna HAM değer de eklendi.
 *
 * Ayrıca "Kişi Başı Yıllık Tüketim Tahmini" kg ile adedi tek eksende
 * topluyordu ve adı da yanlıştı — hesap üretim/nüfus, yani tüketim değil
 * üretim. Adı düzeltildi, adet olan yumurta kendi grafiğine ayrıldı.
 */

interface Props {
  data: OverviewData;
}

export function ComparativeSection({ data }: Props) {
  const combinedData = data.milkProduction.yearly.map((item, idx) => ({
    year: item.year,
    süt: Number(item.milk) || 0,
    et: Number(data.meatProduction.yearly[idx]?.meat) || 0,
    yumurta: Math.round((Number(data.eggProduction.yearly[idx]?.egg) || 0) / 1000000),
  }));

  const milkLast = data.milkProduction.yearly;
  const meatLast = data.meatProduction.yearly;
  const eggLast = data.eggProduction.yearly;

  const milkChange = milkLast.length >= 2
    ? yuzde(((Number(milkLast[milkLast.length - 1]?.milk) || 0) - (Number(milkLast[milkLast.length - 2]?.milk) || 0)) /
      (Number(milkLast[milkLast.length - 2]?.milk) || 1) * 100, 1)
    : 'N/A';

  const meatChange = meatLast.length >= 2
    ? yuzde(((Number(meatLast[meatLast.length - 1]?.meat) || 0) - (Number(meatLast[meatLast.length - 2]?.meat) || 0)) /
      (Number(meatLast[meatLast.length - 2]?.meat) || 1) * 100, 1)
    : 'N/A';

  const eggChange = eggLast.length >= 2
    ? yuzde(((Number(eggLast[eggLast.length - 1]?.egg) || 0) - (Number(eggLast[eggLast.length - 2]?.egg) || 0)) /
      (Number(eggLast[eggLast.length - 2]?.egg) || 1) * 100, 1)
    : 'N/A';
  /* Yıl VERİDEN: '2023' elle yazılıydı, kaynak tablo ilerleyince etiket
     yalan söylüyordu. `years.livestock` o tablonun en güncel dolu yılı. */
  const yil = data.years.livestock ?? '';

  /* Endeksli seri. Ham değerler ipucunda gösterilebilsin diye yan yana
     tutuluyor — endeksi "ton" diye etiketleyen eski hata bir daha olmasın. */
  const endeksli = endeksle(combinedData, ['süt', 'et', 'yumurta']);
  const hamDeger = new Map(combinedData.map((d) => [d.year, d]));

  const kucukGrafikler = [
    {
      ad: 'Çiğ süt üretimi', birim: 'ton', renk: COLORS.milk[0],
      seri: combinedData.map((d) => ({ year: d.year, deger: d.süt })),
      degisim: milkChange,
    },
    {
      ad: 'Et üretimi', birim: 'ton', renk: COLORS.meat[0],
      seri: combinedData.map((d) => ({ year: d.year, deger: d.et })),
      degisim: meatChange,
    },
    {
      ad: 'Yumurta üretimi', birim: 'milyon adet', renk: COLORS.egg[0],
      seri: combinedData.map((d) => ({ year: d.year, deger: d.yumurta })),
      degisim: eggChange,
    },
  ];

  const kisiBasiKg = [
    { name: 'Süt', value: Math.round((data.milkProduction.total * 1000) / (data.population || 1)), fill: COLORS.milk[0] },
    { name: 'Et', value: Math.round((data.meatProduction.total * 1000) / (data.population || 1)), fill: COLORS.meat[0] },
  ];
  const kisiBasiAdet = Math.round(data.eggProduction.total / (data.population || 1));

  return (
    <>
      <div className="section-header" style={{ marginTop: '3rem', marginBottom: '1rem', borderTop: '2px solid var(--border)', paddingTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#8b5cf6' }}>Karşılaştırmalı Analizler</h2>
      </div>

      <div className="chart-grid">
        <ChartCard
          title={`Üretim Büyümesi Karşılaştırması (2010-${yil})`}
          span={2}
          action={<ChartInsightButton title={`Üretim Büyümesi Karşılaştırması (2010-${yil})`} description="Süt, et ve yumurta üretiminin endekslenmiş büyüme karşılaştırması" data={endeksli} context={{ sütDeğişim: milkChange, etDeğişim: meatChange, yumurtaDeğişim: eggChange, ölçü: 'endeks, ilk yıl = 100' }} />}
        >
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '80ch' }}>
            Süt ve et ton, yumurta adet cinsinden — aynı eksende ham hâlleriyle
            kıyaslanamazlar. Her seri kendi ilk yılına göre <strong>100</strong>
            {' '}kabul edilip endekslendi; grafik miktarı değil, <strong>büyüme
            hızını</strong> karşılaştırıyor. Ham değerler ipucunda.
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={endeksli}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} domain={LINE_Y_DOMAIN} />
              <Tooltip
                formatter={(value: number, name: string, props: { payload?: { year?: string | number } }) => {
                  const ham = hamDeger.get(props.payload?.year as never);
                  const anahtar = name as 'süt' | 'et' | 'yumurta';
                  const birim = anahtar === 'yumurta' ? 'milyon adet' : 'ton';
                  const etiket = anahtar === 'süt' ? 'Süt' : anahtar === 'et' ? 'Et' : 'Yumurta';
                  const hamMetin = ham ? ` · ${formatNumber(ham[anahtar])} ${birim}` : '';
                  return [`endeks ${formatNumber(Math.round(value))}${hamMetin}`, etiket];
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="süt" stroke={COLORS.milk[0]} strokeWidth={2} dot={false} name="Süt (endeks)" />
              <Line type="monotone" dataKey="et" stroke={COLORS.meat[0]} strokeWidth={2} dot={false} name="Et (endeks)" />
              <Line type="monotone" dataKey="yumurta" stroke={COLORS.egg[0]} strokeWidth={2} dot={false} name="Yumurta (endeks)" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/*
        * Üç ürün, üç ayrı çerçeve.
        *
        * Burada eskiden bir pasta vardı: süt tonu, et tonu ve uydurulmuş bir
        * "Diğer Ürünler" dilimi. Silindi. Farklı birimdeki ürünleri tek pasta
        * ya da tek eksende toplamak yerine her birine kendi eksenini vermek,
        * karışık birim sorununun tek dürüst çözümü — miktarlar kendi
        * ölçeğinde okunuyor, kıyas ise yukarıdaki endeks grafiğinde yapılıyor.
        */}
      <div className="chart-grid">
        {kucukGrafikler.map((g) => (
          <ChartCard
            key={g.ad}
            title={`${g.ad} (${g.birim})`}
            action={<ChartInsightButton title={g.ad} description={`${g.ad} yıllık seyri`} data={g.seri} context={{ birim: g.birim, sonYıl: yil, yıllıkDeğişim: g.degisim }} compact />}
          >
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={g.seri} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={46} domain={LINE_Y_DOMAIN} />
                <Tooltip formatter={(v: number) => [`${formatNumber(v)} ${g.birim}`, g.ad]} />
                <Line type="monotone" dataKey="deger" stroke={g.renk} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {yil} yılı değişimi: <strong>{g.degisim}</strong>
            </p>
          </ChartCard>
        ))}
      </div>

      {/*
        * Kişi başı üretim — kg olanlar ve adet olan AYRI.
        *
        * Eskiden üçü tek çubuk grafikteydi: süt ~250 kg, et ~25 kg, yumurta
        * ~240 adet. Yumurtanın 240'ı sütün 250 kg'ıyla yan yana durunca göz
        * "neredeyse eşit" diyordu; oysa biri kilogram, diğeri adet. Ayrıldı.
        *
        * Adı da yanlıştı: hesap üretim/nüfus, yani tüketim değil ÜRETİM.
        */}
      <div className="chart-grid">
        <ChartCard
          title="Kişi Başı Üretim — Süt ve Et (kg)"
          action={<ChartInsightButton title="Kişi Başı Üretim (kg)" description="Kişi başına süt ve et üretimi" data={kisiBasiKg} context={{ nüfus: formatNumber(data.population), yıl: yil }} compact />}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={kisiBasiKg}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
              <Tooltip formatter={(value: number) => [`${value} kg`, 'Kişi başı üretim']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {kisiBasiKg.map((k) => <Cell key={k.name} fill={k.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {yil} üretiminin nüfusa bölünmüşü — tüketim değil, üretim.
          </p>
        </ChartCard>

        <ChartCard title="Kişi Başı Üretim — Yumurta (adet)">
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 240, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: COLORS.egg[0], fontVariantNumeric: 'tabular-nums' }}>
              {kisiBasiAdet}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>adet / kişi · {yil}</div>
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Yumurta adet cinsinden; yandaki kilogram ölçüsüyle aynı eksende
            gösterilemeyeceği için ayrı duruyor.
          </p>
        </ChartCard>
      </div>

      <div className="data-table" style={{ marginTop: '2rem' }}>
        <h3 className="data-table-title">Kategori Özet Karşılaştırması ({yil})</h3>
        <div className="table-row" style={{ background: 'var(--bg-card)', fontWeight: '600', borderBottom: '2px solid var(--border)' }}>
          <div className="table-rank" style={{ width: '200px' }}>Kategori</div>
          <div className="table-info" style={{ flex: 1 }}>Toplam Üretim</div>
          <div className="table-value" style={{ width: '150px' }}>Kişi Başı</div>
          <div className="table-value" style={{ width: '150px' }}>Yıllık Değişim</div>
        </div>
        <div className="table-row">
          <div className="table-name" style={{ width: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS.milk[0] }}></span>
            Süt Üretimi
          </div>
          <div className="table-info" style={{ flex: 1 }}>{formatNumber(data.milkProduction.total)} ton</div>
          <div className="table-value" style={{ width: '150px' }}>{kisiBasiKg[0].value} kg</div>
          <div className="table-value green" style={{ width: '150px' }}>{milkChange}</div>
        </div>
        <div className="table-row">
          <div className="table-name" style={{ width: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS.meat[0] }}></span>
            Et Üretimi
          </div>
          <div className="table-info" style={{ flex: 1 }}>{formatNumber(data.meatProduction.total)} ton</div>
          <div className="table-value" style={{ width: '150px' }}>{kisiBasiKg[1].value} kg</div>
          <div className="table-value green" style={{ width: '150px' }}>{meatChange}</div>
        </div>
        <div className="table-row">
          <div className="table-name" style={{ width: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS.egg[0] }}></span>
            Yumurta Üretimi
          </div>
          <div className="table-info" style={{ flex: 1 }}>{formatNumber(data.eggProduction.total)} adet</div>
          <div className="table-value" style={{ width: '150px' }}>{kisiBasiAdet} adet</div>
          <div className="table-value green" style={{ width: '150px' }}>{eggChange}</div>
        </div>
      </div>
    </>
  );
}
