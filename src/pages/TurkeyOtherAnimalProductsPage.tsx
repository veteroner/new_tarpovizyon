import { useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Globe2, MapPin, Scissors, TrendingDown, TrendingUp } from 'lucide-react';

import SectionTabs from '../components/SectionTabs';
import { useSectionTab, type SectionTab } from '../components/bolumSekmeleri';
import { ChartCard } from '../components/ui/Card';
import { ChartInsightButton } from '../components/ChartInsightButton';
import { AXIS, BAR_COLOR, BAR_HIGHLIGHT, BAR_MUTED, GRID, seriesColor } from '../utils/chartColors';
import { VALUE_HEADROOM, compactValue, LINE_Y_DOMAIN } from '../utils/chartTicks';
import { endeksle } from '../utils/endeks';
import { kisa, eksen, sayi, yuzde } from '../utils/sayi';
import {
  ILK_YIL, URUNLER, urunBul,
  useDunyaSiralamasi, useIlDagilimi, useTurkiyeSerileri, useYogunlasma,
  type UrunSerisi,
} from './hayvan/digerUrunler/veri';

/**
 * Diğer hayvansal ürünler — yapağı, tiftik, keçi kılı, balmumu, ipek, kovan.
 *
 * Sayfa eskiden tek grafik çiftinden ibaretti ve iki ayrı sebeple yanlıştı:
 * ülke satırından beslendiği için 2025'i hiç göremiyordu, il grafiklerini de
 * BOŞ olan `il` sütunundan doldurmaya çalıştığı için il kırılımı, pasta ve
 * sıralama tablosu hiçbir zaman çizilmiyordu. İkisi de `digerUrunler/veri.ts`
 * içinde açıklanıp düzeltildi.
 */

const BOLUMLER: SectionTab[] = [
  { id: 'ozet', label: 'Türkiye Özeti' },
  { id: 'urun', label: 'Ürün Detayı' },
  { id: 'donusum', label: 'Uzun Dönem Dönüşüm' },
  { id: 'cografya', label: 'Coğrafi Yoğunlaşma' },
  { id: 'dunya', label: 'Dünyada Türkiye' },
];

const eksenStili = { fill: 'var(--text-secondary)', fontSize: 11 };

/** Bir serinin son iki dolu yılı arasındaki yüzde değişim. */
const degisim = (s: UrunSerisi) =>
  s.oncekiDeger > 0 ? ((s.sonDeger - s.oncekiDeger) / s.oncekiDeger) * 100 : 0;

const birimliDeger = (v: number, birim: string) => `${kisa(v)} ${birim}`;

/* ══════════════════════════════════════════════════════════════════════════
   Bölüm 1 — Türkiye özeti
   ══════════════════════════════════════════════════════════════════════════ */

function TurkiyeOzeti({ seriler }: { seriler: UrunSerisi[] }) {
  const sonYil = Math.max(...seriler.map((s) => s.sonYil ?? 0));

  return (
    <>
      <div className="kpi-grid">
        {seriler.map((s) => {
          const d = degisim(s);
          return (
            <div className="kpi-card" key={s.id}>
              <div className="kpi-header">
                {/* Türkçe yerel ayar şart: düz toUpperCase 'i'yi 'I' yapıyor
                    ("KEÇI KILI", "MERINOS"). tr-TR doğru olanı 'İ' üretiyor. */}
                <span className="kpi-title">{s.ad.toLocaleUpperCase('tr-TR')}</span>
                <div className={`kpi-icon ${d >= 0 ? 'green' : 'red'}`}>
                  {d >= 0
                    ? <TrendingUp size={18} aria-hidden="true" />
                    : <TrendingDown size={18} aria-hidden="true" />}
                </div>
              </div>
              <div className="kpi-value">{kisa(s.sonDeger)}</div>
              <div className="kpi-subtitle">
                {s.birim} ({s.sonYil ?? '—'}) ·{' '}
                <span style={{ color: d >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {yuzde(d, 1, true)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <ChartCard
        title={`${sonYil} rakamları nereden geliyor`}
        icon={<MapPin size={18} aria-hidden="true" />}
      >
        <div className="ui-prose">
          <p>
            TÜİK bu tabloda Türkiye satırını <b>{sonYil}</b> için henüz doldurmadı — ülke
            satırındaki bütün ürünlerde {sonYil} değeri sıfır. İl satırları ise dolu.
            Buradaki toplamlar <b>80 il + İstanbul&apos;un ilçeleri</b> toplanarak kuruldu;
            İstanbul il düzeyinde tabloda hiç yok, yalnızca ilçe satırlarında var.
          </p>
          <p>
            Bu toplamın doğruluğu 2024&apos;te sınandı: aynı yöntem TÜİK&apos;in kendi ülke
            satırını altı üründe de birebir üretiyor (tiftikte 339 yerine 338, yuvarlama
            farkı). Yani gösterilen {sonYil} rakamları tahmin değil, TÜİK&apos;in kendi il
            verisinin toplamı.
          </p>
        </div>
      </ChartCard>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Bölüm 2 — Ürün detayı
   ══════════════════════════════════════════════════════════════════════════ */

function UrunDetayi({ seriler }: { seriler: UrunSerisi[] }) {
  const [secili, setSecili] = useState('yapagi_yerli');
  const u = urunBul(secili);
  const seri = seriler.find((s) => s.id === secili);
  const { data: iller = [], isLoading } = useIlDagilimi(secili, seri?.sonYil ?? null);

  const trend = useMemo(
    () => (seri?.seri ?? []).filter((n) => n.deger > 0),
    [seri],
  );
  const ilk20 = iller.slice(0, 20);

  return (
    <>
      <div className="section-tabs section-tabs--inline" role="tablist" aria-label="Ürün seçimi">
        {URUNLER.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === secili}
            className={`section-tab${p.id === secili ? ' is-active' : ''}`}
            onClick={() => setSecili(p.id)}
          >
            {p.ad}
          </button>
        ))}
      </div>

      <div className="chart-grid">
        <ChartCard
          title={`${u.ad} — Türkiye üretimi`}
          note={`${ILK_YIL}–${seri?.sonYil ?? '—'} · ${u.birim} · 81 ilin toplamı`}
          action={
            <ChartInsightButton
              title={`${u.ad} üretim trendi`} description="Yıllık Türkiye üretimi"
              data={trend} context={{ section: 'Diğer Hayvansal Ürünler' }} compact
            />
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="yil" tick={eksenStili} stroke={AXIS} />
              <YAxis tickFormatter={eksen} tick={eksenStili} stroke={AXIS} width={52} domain={LINE_Y_DOMAIN} />
              <Tooltip formatter={(v: number) => [birimliDeger(v, u.birim), u.ad]} />
              <Area
                type="monotone" dataKey="deger" name={u.ad}
                stroke={BAR_COLOR} fill={BAR_COLOR} fillOpacity={0.22}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={`${u.ad} — il sıralaması (${seri?.sonYil ?? '—'})`}
          note={`${iller.length} il üretim yapıyor`}
          action={
            <ChartInsightButton
              title={`${u.ad} il dağılımı`} description="İl bazında üretim"
              data={ilk20} context={{ section: 'Diğer Hayvansal Ürünler' }} compact
            />
          }
        >
          {isLoading ? (
            <div className="loading"><div className="loading-spinner" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={520}>
              <BarChart data={ilk20} layout="vertical" margin={{ right: 44 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis
                  type="number" tickFormatter={eksen} tick={eksenStili}
                  stroke={AXIS} domain={VALUE_HEADROOM}
                />
                <YAxis
                  type="category" dataKey="il" tick={{ ...eksenStili, fontSize: 10 }}
                  stroke={AXIS} width={92} interval={0}
                />
                <Tooltip formatter={(v: number) => [birimliDeger(v, u.birim), u.ad]} />
                <Bar dataKey="deger" name={u.ad} radius={[0, 4, 4, 0]} fill={BAR_COLOR}>
                  <LabelList
                    dataKey="deger" position="right" formatter={compactValue}
                    style={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {iller.length > 0 && (
        <div className="data-table">
          <h3 className="data-table-title">
            {u.ad} — il payları ({seri?.sonYil})
          </h3>
          {ilk20.map((il, i) => (
            <div className="table-row" key={il.il}>
              <div className={`table-rank ${i < 3 ? 'orange' : ''}`}>{i + 1}</div>
              <div className="table-info">
                <div className="table-name">{il.il}</div>
                <div className="table-subtext">Pay: {yuzde(il.pay, 1)}</div>
              </div>
              <div className="table-value">{sayi(il.deger)} {u.birim}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Bölüm 3 — Uzun dönem dönüşüm
   ══════════════════════════════════════════════════════════════════════════ */

/** Endeks grafiğinde gösterilen seriler — kovan (adet) ölçek olarak dışarıda. */
const ENDEKS_SERILERI = ['yapagi_yerli', 'yapagi_merinos', 'keci_kili', 'tiftik', 'balmumu', 'ipek'];

function UzunDonem({ seriler }: { seriler: UrunSerisi[] }) {
  const gosterilen = ENDEKS_SERILERI
    .map((id) => seriler.find((s) => s.id === id))
    .filter((s): s is UrunSerisi => !!s);

  /*
   * Altı ürünün büyüklükleri 85 ton ile 89.000 ton arasında; aynı eksende ham
   * değerle çizilince ipek ve tiftik sıfır çizgisine yapışıyor. İkinci eksen
   * çözüm değil — soru zaten "hangisi ne kadar büyüdü", yani oransal değişim.
   * `endeksle` ilk dolu yılı 100 alıyor, ham değer ipucunda kalıyor.
   */
  const endeksVeri = useMemo(() => {
    const satirlar = (gosterilen[0]?.seri ?? []).map((n) => {
      const satir: Record<string, number> = { yil: n.yil };
      for (const s of gosterilen) {
        satir[s.id] = s.seri.find((x) => x.yil === n.yil)?.deger ?? 0;
      }
      return satir;
    });
    return endeksle(satirlar, ENDEKS_SERILERI);
  }, [gosterilen]);

  /** Yapağıda merinos payı ve kovanda yeni tip payı — iki yapısal kayma. */
  const paylar = useMemo(() => {
    const bul = (id: string) => seriler.find((s) => s.id === id);
    const my = bul('yapagi_merinos'); const yy = bul('yapagi_yerli');
    const ky = bul('kovan_yeni'); const ke = bul('kovan_eski');
    if (!my || !yy || !ky || !ke) return [];
    return my.seri.map((n, i) => {
      const yapagiTop = n.deger + (yy.seri[i]?.deger ?? 0);
      const kovanTop = (ky.seri[i]?.deger ?? 0) + (ke.seri[i]?.deger ?? 0);
      return {
        yil: n.yil,
        merinosPay: yapagiTop ? (n.deger / yapagiTop) * 100 : 0,
        yeniTipPay: kovanTop ? ((ky.seri[i]?.deger ?? 0) / kovanTop) * 100 : 0,
      };
    }).filter((r) => r.merinosPay > 0 || r.yeniTipPay > 0);
  }, [seriler]);

  const ilkPay = paylar[0];
  const sonPay = paylar.at(-1);
  const eskiTip = seriler.find((s) => s.id === 'kovan_eski');

  return (
    <div className="chart-grid">
      <ChartCard
        span={2}
        title={`Üretim endeksi — ${ILK_YIL} = 100`}
        note="Farklı büyüklükteki altı ürün tek eksende: soru mutlak miktar değil, oransal değişim. Ham değerler ipucunda."
        action={
          <ChartInsightButton
            title="Diğer hayvansal ürünler üretim endeksi"
            description={`${ILK_YIL} = 100 endeksi`}
            data={endeksVeri} context={{ section: 'Diğer Hayvansal Ürünler' }} compact
          />
        }
      >
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={endeksVeri}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="yil" tick={eksenStili} stroke={AXIS} />
            <YAxis tickFormatter={(v: number) => sayi(v)} tick={eksenStili} stroke={AXIS} width={48} domain={LINE_Y_DOMAIN} />
            <Tooltip
              formatter={(v: number, ad, giris) => {
                const s = gosterilen.find((x) => x.ad === ad);
                const ham = (giris?.payload as Record<string, number> | undefined)?.[`ham_${s?.id}`];
                return [
                  `${sayi(v)} · ${ham != null ? birimliDeger(ham, s?.birim ?? '') : '—'}`,
                  ad,
                ];
              }}
            />
            <Legend />
            <ReferenceLine y={100} stroke={AXIS} strokeDasharray="4 4" />
            {gosterilen.map((s, i) => (
              <Line
                key={s.id} type="monotone" dataKey={s.id} name={s.ad}
                stroke={seriesColor(i)} strokeWidth={2} dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Yapağıda merinos payı"
        note={
          ilkPay && sonPay
            ? `${ilkPay.yil}: ${yuzde(ilkPay.merinosPay, 1)} → ${sonPay.yil}: ${yuzde(sonPay.merinosPay, 1)}`
            : undefined
        }
        icon={<Scissors size={18} aria-hidden="true" />}
      >
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={paylar}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="yil" tick={eksenStili} stroke={AXIS} />
            <YAxis
              tickFormatter={(v: number) => yuzde(v, 0)} tick={eksenStili}
              stroke={AXIS} width={48} domain={[0, 'auto']}
            />
            <Tooltip formatter={(v: number) => [yuzde(v, 1), 'Merinos payı']} />
            <Area
              type="monotone" dataKey="merinosPay" name="Merinos payı"
              stroke={seriesColor(1)} fill={seriesColor(1)} fillOpacity={0.22}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/*
        Burada önce "yeni tip kovan payı" çizilmişti; 21 yılda %96,3'ten %97,5'e
        çıkıyor — 1,2 puan. Onu göstermek için ekseni 90–100 arasına sıkıştırmak
        gerekiyordu ki bu, yatay bir çizgiyi dik bir tırmanış gibi gösterir.
        Asıl anlatılacak şey oran değil MUTLAK SAYI: modernleşme anlatısının
        aksine geleneksel kovan sayısı 2004'ten bu yana artmış.
      */}
      <ChartCard
        title="Geleneksel (eski tip) kovan sayısı"
        note={
          eskiTip
            ? `Yeni tip payı ${ilkPay ? yuzde(ilkPay.yeniTipPay, 1) : '—'} → `
              + `${sonPay ? yuzde(sonPay.yeniTipPay, 1) : '—'} arasında neredeyse sabit; `
              + 'geleneksel kovan yok olmuyor, sayıca artıyor.'
            : undefined
        }
      >
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={eskiTip?.seri ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="yil" tick={eksenStili} stroke={AXIS} />
            <YAxis tickFormatter={eksen} tick={eksenStili} stroke={AXIS} width={52} domain={LINE_Y_DOMAIN} />
            <Tooltip formatter={(v: number) => [birimliDeger(v, 'adet'), 'Eski tip kovan']} />
            <Area
              type="monotone" dataKey="deger" name="Eski tip kovan"
              stroke={seriesColor(2)} fill={seriesColor(2)} fillOpacity={0.22}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Bölüm 4 — Coğrafi yoğunlaşma
   ══════════════════════════════════════════════════════════════════════════ */

function CografiYogunlasma({ yil }: { yil: number | null }) {
  const { data = [], isLoading } = useYogunlasma(yil);
  if (isLoading) return <div className="loading"><div className="loading-spinner" /></div>;

  const enYogun = data[0];

  return (
    <div className="chart-grid">
      <ChartCard
        span={2}
        title={`İlk üç ilin payı (${yil})`}
        note="Yüksek pay = ürün birkaç ile sıkışmış; o illerdeki bir sorun ülke üretimini doğrudan vurur."
        action={
          <ChartInsightButton
            title="Coğrafi yoğunlaşma" description="İlk üç ilin üretimdeki payı"
            data={data} context={{ section: 'Diğer Hayvansal Ürünler' }} compact
          />
        }
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ right: 56 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
            <XAxis
              type="number" domain={[0, 100]} tickFormatter={(v: number) => yuzde(v, 0)}
              tick={eksenStili} stroke={AXIS}
            />
            <YAxis
              type="category" dataKey="ad" tick={{ ...eksenStili, fontSize: 10 }}
              stroke={AXIS} width={128} interval={0}
            />
            <Tooltip formatter={(v: number) => [yuzde(v, 1), 'İlk 3 il payı']} />
            <Bar dataKey="ilk3Pay" name="İlk 3 il payı" radius={[0, 4, 4, 0]}>
              {data.map((r) => (
                <Cell key={r.id} fill={r.ilk3Pay >= 60 ? BAR_HIGHLIGHT : BAR_MUTED} />
              ))}
              <LabelList
                dataKey="ilk3Pay" position="right"
                formatter={(v: number) => yuzde(v, 0)}
                style={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard span={2} title="Üretim kaç ile yayılmış">
        <div className="data-table">
          {data.map((r) => (
            <div className="table-row" key={r.id}>
              <div className="table-info">
                <div className="table-name">{r.ad}</div>
                <div className="table-subtext">
                  Lider il: {r.lider} ({yuzde(r.liderPay, 0)})
                </div>
              </div>
              <div className="table-value">
                {r.ilSayisi} il / 81
              </div>
            </div>
          ))}
        </div>
        {enYogun && (
          <p className="ui-card-note">
            En yoğunlaşmış ürün <b>{enYogun.ad}</b>: yalnızca {enYogun.ilSayisi} ilde
            üretiliyor ve tek başına {enYogun.lider} ülke üretiminin {yuzde(enYogun.liderPay, 0)}
            &apos;ini karşılıyor.
          </p>
        )}
      </ChartCard>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Bölüm 5 — Dünyada Türkiye
   ══════════════════════════════════════════════════════════════════════════ */

/** FAO karşılığı olan üç ürün. FAO'nun son tam yılı 2024. */
const FAO_YIL = 2024;
const FAO_URUNLER = [
  { desen: 'Shorn wool, greasy%', ad: 'Yapağı (kırkım, yağlı)', birim: 'ton' },
  { desen: 'Beeswax', ad: 'Balmumu', birim: 'ton' },
  { desen: 'Silk-worm cocoons%', ad: 'İpek böceği kozası', birim: 'ton' },
];

function DunyaKarti({ desen, ad, birim }: { desen: string; ad: string; birim: string }) {
  const { data, isLoading } = useDunyaSiralamasi(desen, FAO_YIL);

  if (isLoading || !data) {
    return <ChartCard title={ad}><div className="loading"><div className="loading-spinner" /></div></ChartCard>;
  }

  return (
    <ChartCard
      title={`${ad} — dünya sıralaması (${FAO_YIL})`}
      note={
        data.turkiye
          ? `Türkiye ${data.turkiye.sira}. sırada · ${data.ulkeSayisi} üretici ülke · dünya payı ${yuzde(data.turkiye.pay, 2)}`
          : `${data.ulkeSayisi} üretici ülke · Türkiye listede yok`
      }
      action={
        <ChartInsightButton
          title={`${ad} dünya sıralaması`} description="FAO üretim sıralaması"
          data={data.ilkler} context={{ section: 'Diğer Hayvansal Ürünler' }} compact
        />
      }
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.ilkler} layout="vertical" margin={{ right: 52 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
          <XAxis
            type="number" tickFormatter={eksen} tick={eksenStili}
            stroke={AXIS} domain={VALUE_HEADROOM}
          />
          <YAxis
            type="category" dataKey="ulke" tick={{ ...eksenStili, fontSize: 10 }}
            stroke={AXIS} width={128} interval={0}
          />
          <Tooltip formatter={(v: number) => [birimliDeger(v, birim), 'Üretim']} />
          <Bar dataKey="uretim" name="Üretim" radius={[0, 4, 4, 0]}>
            {data.ilkler.map((r) => (
              <Cell key={r.ulke} fill={r.turkiyeMi ? BAR_HIGHLIGHT : BAR_MUTED} />
            ))}
            <LabelList
              dataKey="uretim" position="right" formatter={compactValue}
              style={{ fill: 'var(--text-secondary)', fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function DunyadaTurkiye() {
  return (
    <>
      <div className="chart-grid">
        {FAO_URUNLER.map((u) => <DunyaKarti key={u.desen} {...u} />)}
      </div>
      <ChartCard title="Bu sıralama neyi kanıtlar, neyi kanıtlamaz" icon={<Globe2 size={18} aria-hidden="true" />}>
        <div className="ui-prose">
          <p>
            FAO&apos;nun Türkiye rakamları TÜİK&apos;ten geliyor: 2024 için yapağı 84.270,
            balmumu 3.316, ipek kozası 85 ton — üçü de TÜİK&apos;in ülke satırıyla aynı.
            Yani bu tablo TÜİK verisinin <b>bağımsız bir doğrulaması değil</b>; yalnızca
            aynı rakamın diğer ülkelerin yanına konmuş hâli.
          </p>
          <p>
            Tiftik ve keçi kılı FAO&apos;nun bu veri setinde ayrı ürün olarak yok, o yüzden
            burada karşılaştırılamıyor.
          </p>
        </div>
      </ChartCard>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function TurkeyOtherAnimalProductsPage() {
  const { active } = useSectionTab(BOLUMLER);
  const { data: seriler = [], isLoading, isError } = useTurkiyeSerileri();

  const sonYil = seriler.length
    ? Math.max(...seriler.map((s) => s.sonYil ?? 0)) || null
    : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Diğer Hayvansal Ürünler</h1>
        <p className="page-subtitle">
          Yapağı, tiftik, keçi kılı, balmumu, ipek böceği kozası ve kovan —
          TÜİK il verisi {ILK_YIL}–{sonYil ?? '…'}, FAO dünya karşılaştırması
        </p>
      </div>

      <SectionTabs tabs={BOLUMLER} />

      {isError && (
        <div className="ui-card">
          <p>Veri alınamadı. Bağlantıyı denetleyip sayfayı yenileyin.</p>
        </div>
      )}

      {isLoading ? (
        <div className="loading"><div className="loading-spinner" /><p>Veriler yükleniyor…</p></div>
      ) : (
        <>
          {active === 'ozet' && seriler.length > 0 && <TurkiyeOzeti seriler={seriler} />}
          {active === 'urun' && seriler.length > 0 && <UrunDetayi seriler={seriler} />}
          {active === 'donusum' && seriler.length > 0 && <UzunDonem seriler={seriler} />}
          {active === 'cografya' && <CografiYogunlasma yil={sonYil} />}
          {active === 'dunya' && <DunyadaTurkiye />}
        </>
      )}
    </div>
  );
}
