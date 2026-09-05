import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { ChartCard } from '../../../components/ui/Card';
import { ChartInsightButton } from '../../../components/ChartInsightButton';
import { GRID, AXIS, seriesColor, BAR_COLOR, BAR_HIGHLIGHT, STATUS } from '../../../utils/chartColors';
import { kisa, eksen, sayi, yuzde } from '../../../utils/sayi';
import {
  useTicaretSerisi, useUlkeKirilimi, useDunyaSiralamasi, siraVePay, useAgacYasYapisi,
} from './ticaretVerisi';
import { LINE_Y_DOMAIN } from '../../../utils/chartTicks';

/**
 * Bitkisel sayfaların ek bölümleri — her ürün grubuna KENDİ sorusu.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Dokuz sayfa (tahıl, sebze, meyve, bakliyat, yağlı tohum, şeker, kuruyemiş,
 * içecek, lif) aynı bileşeni çağırıyor; tek farkları ürün filtresi. Menüde
 * dokuz satır, kırılımda dokuz kart yer kaplıyorlar ama kullanıcı için dokuz
 * farklı yer yoktu.
 *
 * Her birinin bir "ek bölümü" vardı — ama hiçbiri veri çekmiyordu, hepsi elle
 * yazılmış sabit dizilerdi. Lif sayfasındakiler doğrudan uydurmaydı ve
 * "ICAC kriterlerine göre" diye kaynak gösteriliyordu.
 *
 * ─── AYRIM NEYE GÖRE ────────────────────────────────────────────────────────
 * Süs olsun diye dokuz farklı grafik değil: her grubun ekonomisinde farklı bir
 * soru var, bölüm onu soruyor.
 *
 *   Tahıl      → kendimize yetiyor muyuz?      (arz dengesi + yeterlilik)
 *   Bakliyat   → ithalat nereden geliyor?      (kaynak ülkeler)
 *   Yağlı tohum→ hangi üründe açık var?        (ürün bazında bağımlılık)
 *   Lif        → pamukta üretim mi ithalat mı? (tekstilin girdisi)
 *   Kuruyemiş  → parayı kimden kazanıyoruz?    (ihracat pazarları)
 *   Meyve      → bahçe yaşlanıyor mu?          (veren/vermeyen ağaç)
 *   Sebze      → dünyada neredeyiz?            (FAO sıralaması)
 *   Şeker      → verimimiz dünyaya göre?       (FAO verim)
 *   İçecek     → üretim tek yerde mi?          (coğrafi yoğunlaşma)
 */

const NOT: React.CSSProperties = {
  fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5,
};

function Bekleyen({ yukleniyor, bosMu, children }: {
  yukleniyor: boolean; bosMu: boolean; children: React.ReactNode;
}) {
  if (yukleniyor) return <p style={NOT}>Veri yükleniyor…</p>;
  if (bosMu) return <p style={NOT}>Bu ürün grubu için dış ticaret kaydı bulunamadı.</p>;
  return <>{children}</>;
}

/* ══════════════════════════════════════════════════════════════════════════
   1) TAHIL — arz dengesi ve kendine yeterlilik
   ══════════════════════════════════════════════════════════════════════════ */

export function TahilArzDengesi() {
  const { data, isLoading } = useTicaretSerisi(['Buğday', 'Arpa', 'Mısır', 'Çeltik']);
  const veri = (data ?? []).map((r) => ({ ...r, net: r.ithalat - r.ihracat }));

  return (
    <ChartCard
      title="Tahılda Arz Dengesi — Net İthalat (bin ton)"
      span={2}
      action={<ChartInsightButton title="Tahıl arz dengesi" description="Buğday, arpa, mısır, çeltik dış ticareti" data={veri} context={{ section: 'Tahıllar' }} compact />}
    >
      <p style={NOT}>
        Buğday, arpa, mısır ve çeltiğin ithalat–ihracat farkı. Çubuk sıfırın
        üstündeyse o yıl <b>net alıcıyız</b>. 2024'teki düşüş tesadüf değil:
        Türkiye o yıl buğday ithalatını kısıtladı. Kaynak: TÜİK dış ticaret.
      </p>
      <Bekleyen yukleniyor={isLoading} bosMu={!veri.length}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={veri}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="yil" tick={{ fill: AXIS, fontSize: 11 }} />
          <YAxis tick={{ fill: AXIS, fontSize: 11 }} width={54} tickFormatter={(v: number) => eksen(v)} />
          <ReferenceLine y={0} stroke={AXIS} />
          <Tooltip formatter={(v: number) => [kisa(v, { birim: 'ton' }), 'Net ithalat']}
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Bar dataKey="net" name="Net ithalat" radius={[4, 4, 0, 0]}>
            {veri.map((r, i) => (
              <Cell key={i} fill={r.net > 0 ? STATUS.uyari : STATUS.iyi} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </Bekleyen>
    </ChartCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   2) BAKLİYAT — ithalat nereden geliyor
   ══════════════════════════════════════════════════════════════════════════ */

export function BakliyatKaynakUlkeler({ yil }: { yil: number }) {
  const urunler = ['Mercimek', 'Mercimek (Kırmızı)', 'Mercimek (Yeşil)', 'Nohut', 'Fasulye'];
  const { data, isLoading } = useUlkeKirilimi(urunler, 'ithalat', yil);
  const toplam = (data ?? []).reduce((t, r) => t + r.deger, 0);

  return (
    <ChartCard
      title={`Bakliyat İthalatı — Kaynak Ülkeler (${yil})`}
      action={<ChartInsightButton title="Bakliyat ithalat kaynakları" description="Mercimek, nohut, fasulye ithalatının ülke kırılımı" data={data ?? []} context={{ section: 'Bakliyat' }} compact />}
    >
      <p style={NOT}>
        Mercimek, nohut ve fasulye ithalatının ülke dağılımı (milyon $).
        Türkiye kırmızı mercimekte dünyanın en büyük alıcılarından; ürettiğinden
        fazlasını işleyip yeniden ihraç ediyor.
      </p>
      <Bekleyen yukleniyor={isLoading} bosMu={!data?.length}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} tickFormatter={(v: number) => eksen(v)} />
            <YAxis type="category" dataKey="ulke" width={120} tick={{ fill: AXIS, fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [
              `${kisa(v, { para: '$' })} · ${yuzde(toplam ? (v / toplam) * 100 : 0, 1)}`, 'İthalat',
            ]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
            <Bar dataKey="deger" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Bekleyen>
    </ChartCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   3) YAĞLI TOHUM — ürün bazında dışa bağımlılık
   ══════════════════════════════════════════════════════════════════════════ */

export function YagliTohumBagimlilik() {
  const { data, isLoading } = useTicaretSerisi(['Ayçiçeği', 'Soya Fasulyesi', 'Kanola (Kolza)', 'Susam']);
  const veri = data ?? [];

  return (
    <ChartCard
      title="Yağlı Tohumda Dışa Bağımlılık — İthalat / İhracat (bin ton)"
      span={2}
      action={<ChartInsightButton title="Yağlı tohum dış ticareti" description="Ayçiçeği, soya, kanola, susam" data={veri} context={{ section: 'Yağlı Tohumlar' }} compact />}
    >
      <p style={NOT}>
        Ayçiçeği, soya, kanola ve susamın dış ticareti. Türkiye'nin ham yağ
        açığı bu grupta: yerli üretim iç talebi karşılamıyor ve fark ithalatla
        kapanıyor. İki seri aynı eksende çünkü aynı birimde.
      </p>
      <Bekleyen yukleniyor={isLoading} bosMu={!veri.length}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={veri}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="yil" tick={{ fill: AXIS, fontSize: 11 }} />
            <YAxis tick={{ fill: AXIS, fontSize: 11 }} width={54} tickFormatter={(v: number) => eksen(v)} domain={LINE_Y_DOMAIN} />
            <Tooltip formatter={(v: number, ad: string) => [kisa(v, { birim: 'ton' }), ad]}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
            <Legend />
            <Line type="monotone" dataKey="ithalat" name="İthalat" stroke={seriesColor(0)} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="ihracat" name="İhracat" stroke={seriesColor(1)} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Bekleyen>
    </ChartCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   4) LİF — pamukta üretim mi ithalat mı
   ══════════════════════════════════════════════════════════════════════════ */

export function PamukAcigi() {
  const { data, isLoading } = useTicaretSerisi(['Pamuk']);
  const veri = data ?? [];

  return (
    <ChartCard
      title="Pamukta Dış Ticaret — İthalat ve İhracat (bin ton)"
      span={2}
      action={<ChartInsightButton title="Pamuk dış ticareti" description="Pamuk ithalat ve ihracatı" data={veri} context={{ section: 'Lif Bitkileri' }} compact />}
    >
      <p style={NOT}>
        Türkiye dünyanın en büyük pamuk ithalatçılarından; tekstil sanayii yerli
        üretimin kat kat üstünde lif tüketiyor. Bu bölümde eskiden kaynağı
        doğrulanamayan bir "lif kalite endeksi" duruyordu — yerine TÜİK'in dış
        ticaret kaydı kondu.
      </p>
      <Bekleyen yukleniyor={isLoading} bosMu={!veri.length}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={veri}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="yil" tick={{ fill: AXIS, fontSize: 11 }} />
            <YAxis tick={{ fill: AXIS, fontSize: 11 }} width={54} tickFormatter={(v: number) => eksen(v)} />
            <Tooltip formatter={(v: number, ad: string) => [kisa(v, { birim: 'ton' }), ad]}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
            <Legend />
            <Bar dataKey="ithalat" name="İthalat" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
            <Bar dataKey="ihracat" name="İhracat" fill={seriesColor(1)} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Bekleyen>
    </ChartCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   5) KURUYEMİŞ — ihracat pazarları
   ══════════════════════════════════════════════════════════════════════════ */

export function FindikPazarlari({ yil }: { yil: number }) {
  const { data, isLoading } = useUlkeKirilimi(['Fındık'], 'ihracat', yil);
  const toplam = (data ?? []).reduce((t, r) => t + r.deger, 0);

  return (
    <ChartCard
      title={`Fındık İhracatı — Pazarlar (${yil})`}
      action={<ChartInsightButton title="Fındık ihracat pazarları" description="Fındık ihracatının ülke kırılımı" data={data ?? []} context={{ section: 'Kuruyemişler' }} compact />}
    >
      <p style={NOT}>
        Fındık Türkiye'nin en büyük tarımsal ihracat kalemi. Grafik <b>değere</b>{' '}
        göre: soru "kime satıyoruz" değil, "para nereden geliyor" — kilo fiyatı
        pazara göre değişiyor. Toplam: {kisa(toplam, { para: '$' })}.
      </p>
      <Bekleyen yukleniyor={isLoading} bosMu={!data?.length}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} tickFormatter={(v: number) => eksen(v)} />
            <YAxis type="category" dataKey="ulke" width={120} tick={{ fill: AXIS, fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [
              `${kisa(v, { para: '$' })} · ${yuzde(toplam ? (v / toplam) * 100 : 0, 1)}`, 'İhracat',
            ]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
            <Bar dataKey="deger" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Bekleyen>
    </ChartCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   6) SEBZE / 7) ŞEKER — FAO dünya sıralaması ve verim
   ══════════════════════════════════════════════════════════════════════════ */

export function DunyaSiralamasi({ urunDesen, yil, baslik, aciklama }: {
  urunDesen: string; yil: number; baslik: string; aciklama: string;
}) {
  const { data, isLoading } = useDunyaSiralamasi(urunDesen, yil, 10);
  const tr = siraVePay(data);

  return (
    <ChartCard
      title={`${baslik} — Dünya Sıralaması (${yil})`}
      span={2}
      action={<ChartInsightButton title={`${baslik} dünya sıralaması`} description="FAO üretim verisine göre ilk 10 ülke" data={data ?? []} context={{ section: baslik }} compact />}
    >
      <p style={NOT}>
        {aciklama}
        {tr && (
          <>
            {' '}Türkiye ilk 10'da <b>{sayi(tr.sira)}. sırada</b>; bu ülkelerin
            toplam üretimindeki payı <b>{yuzde(tr.pay, 1)}</b>.
          </>
        )}
        {' '}Kaynak: FAO.
      </p>
      <Bekleyen yukleniyor={isLoading} bosMu={!data?.length}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} tickFormatter={(v: number) => eksen(v)} />
            <YAxis type="category" dataKey="ulke" width={150} tick={{ fill: AXIS, fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [kisa(v, { birim: 'ton' }), 'Üretim']}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
            <Bar dataKey="uretim" radius={[0, 4, 4, 0]}>
              {(data ?? []).map((r, i) => (
                <Cell key={i} fill={r.turkiyeMi ? BAR_HIGHLIGHT : BAR_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Bekleyen>
    </ChartCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   8) MEYVE — bahçe yaş yapısı
   ══════════════════════════════════════════════════════════════════════════ */

export function BahceYasYapisi({ urunler, yil }: { urunler: string[]; yil: number }) {
  const { data, isLoading } = useAgacYasYapisi(urunler, yil);
  /*
   * EŞİK: 100 bin ağacın altındaki kalemler dışarıda. Avokado, hünnap, muşmula
   * gibi çok küçük üretimlerde birkaç bin fidan dikilmesi "genç ağaç payı"nı
   * %90'a çıkarıyor ve listenin başını marjinal ürünler kaplıyordu — grafik
   * bahçe yenilemesini değil, örneklem küçüklüğünü gösteriyordu.
   */
  const veri = (data ?? [])
    .filter((r) => r.veren + r.vermeyen >= 100_000)
    .map((r) => ({
      ...r,
      genclikPayi: ((r.vermeyen / (r.veren + r.vermeyen)) * 100),
    }))
    .sort((a, b) => b.genclikPayi - a.genclikPayi)
    .slice(0, 12);

  return (
    <ChartCard
      title="Bahçe Yaş Yapısı — Meyve Vermeyen Ağaç Payı"
      span={2}
      action={<ChartInsightButton title="Bahçe yaş yapısı" description="Meyve vermeyen ağaç payı, bahçe yenileme hızının göstergesi" data={veri} context={{ section: 'Meyveler' }} compact />}
    >
      <p style={NOT}>
        TÜİK meyve ağaçlarını <b>meyve veren</b> ve <b>vermeyen</b> diye ayrı
        sayıyor. Vermeyen ağaç payı yüksekse bahçe yenileniyor demektir — bugünkü
        üretim düşük ama gelecek yıllarda artacak. Payı çok düşükse bahçe
        yaşlanıyor ve verim tehdit altında.
      </p>
      <Bekleyen yukleniyor={isLoading} bosMu={!veri.length}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={veri} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} domain={[0, 'auto']}
            tickFormatter={(v: number) => yuzde(v, 0)} />
          <YAxis type="category" dataKey="urun" width={150} tick={{ fill: AXIS, fontSize: 11 }} />
          <Tooltip formatter={(v: number, _a: string, p: { payload?: { veren: number; vermeyen: number } }) => [
            `${yuzde(v, 1)} · veren ${kisa(p?.payload?.veren ?? 0)}, vermeyen ${kisa(p?.payload?.vermeyen ?? 0)}`,
            'Genç ağaç payı',
          ]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Bar dataKey="genclikPayi" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      </Bekleyen>
    </ChartCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   9) İÇECEK — coğrafi yoğunlaşma
   ══════════════════════════════════════════════════════════════════════════ */

export type IlPayi = { il: string; deger: number };

export function CografiYogunlasma({ iller, urunAdi }: { iller: IlPayi[]; urunAdi: string }) {
  const toplam = iller.reduce((t, r) => t + r.deger, 0);
  const sirali = [...iller].sort((a, b) => b.deger - a.deger);
  const ilk3 = sirali.slice(0, 3).reduce((t, r) => t + r.deger, 0);
  /* HHI: payların karesi toplamı. 2500 üstü "yoğunlaşmış" sayılır. */
  const hhi = toplam
    ? sirali.reduce((t, r) => t + ((r.deger / toplam) * 100) ** 2, 0)
    : 0;
  const veri = sirali.slice(0, 10);

  return (
    <ChartCard
      title={`${urunAdi} Üretiminde Coğrafi Yoğunlaşma`}
      span={2}
      action={<ChartInsightButton title="Coğrafi yoğunlaşma" description="İl bazında üretim yoğunlaşması ve HHI" data={veri} context={{ section: 'İçecek Bitkileri' }} compact />}
    >
      <p style={NOT}>
        İlk üç il toplam üretimin <b>{yuzde(toplam ? (ilk3 / toplam) * 100 : 0, 1)}</b>'ini
        karşılıyor; yoğunlaşma endeksi (HHI) <b>{sayi(hhi, 0)}</b>.
        2.500'ün üstü "yoğunlaşmış" sayılır. Çay gibi ürünlerde bu tek bir
        iklim kuşağına bağımlılık demek: o bölgedeki bir don ya da kuraklık
        doğrudan ulusal üretime yansıyor.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={veri} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} tickFormatter={(v: number) => eksen(v)} />
          <YAxis type="category" dataKey="il" width={130} tick={{ fill: AXIS, fontSize: 11 }} />
          <Tooltip formatter={(v: number) => [
            `${kisa(v, { birim: 'ton' })} · ${yuzde(toplam ? (v / toplam) * 100 : 0, 1)}`, 'Üretim',
          ]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Bar dataKey="deger" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
