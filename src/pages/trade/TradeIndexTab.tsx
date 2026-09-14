import { useState } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Gauge, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { Loading } from '../../components/Loading';
import { LINE_Y_DOMAIN } from '../../utils/chartTicks';
import { useTradeIndexData, fark, type Aralik } from './useTradeIndexData';

/**
 * Dış ticaret endeksleri (2015=100).
 *
 * ─── NEDEN AYRI SEKME ───────────────────────────────────────────────────────
 * Diğer ticaret sekmeleri "kaç ton, kaç dolar" gösteriyor. Bir ürünün ihracat
 * geliri arttığında bunun sebebini söyleyemiyorlar: daha çok mu sattık, yoksa
 * daha pahalıya mı? Birim değer endeksi FİYATI, miktar endeksi HACMİ ölçüyor;
 * ayrım ancak ikisi yan yanayken kuruluyor.
 *
 * ─── SAYILAR TÜİK'İN KENDİ HESABI ───────────────────────────────────────────
 * Dış ticaret haddi burada BÖLÜNEREK bulunmuyor. Kabaca ihracat BDE / ithalat
 * BDE × 100 ama TÜİK ağırlıklandırmayı kendi sepetiyle yapıyor; ham oran
 * ondan sapıyor. Ekranda TÜİK'in yayımladığı seri var.
 *
 * ─── TEK EKSEN ──────────────────────────────────────────────────────────────
 * Tüm seriler aynı ölçekte (2015=100) olduğu için tek Y ekseni yetiyor. İki
 * ayrı ölçeği tek grafiğe koymak (çift eksen) iki serinin kesişme noktasını
 * ölçek seçimine bırakır — okuyucu orada olmayan bir ilişki görür.
 */

const RENK = {
  gida: '#16a34a',
  gidaIkincil: '#b45309',
  toplam: '#64748b',
  ihracat: '#0f766e',
  ithalat: '#be123c',
};

const ARALIKLAR: { id: Aralik; ad: string }[] = [
  { id: 12, ad: '1 yıl' },
  { id: 24, ad: '2 yıl' },
  { id: 48, ad: '4 yıl' },
  { id: 0, ad: 'Tümü' },
];

const sayi = (v: number | null, basamak = 1) =>
  (v === null ? '—' : v.toLocaleString('tr-TR', {
    minimumFractionDigits: basamak, maximumFractionDigits: basamak,
  }));

function Kart({
  baslik, deger, degisim, alt, ikon: Ikon, vurgu,
}: {
  baslik: string;
  deger: number | null;
  degisim: number | null;
  alt: string;
  ikon: typeof Gauge;
  vurgu?: boolean;
}) {
  const yukseliyor = degisim !== null && degisim > 0;
  return (
    <div
      className="rounded-xl border p-4 shadow-sm"
      style={{ background: 'var(--bg-card)', borderColor: vurgu ? RENK.gida : 'var(--border)' }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Ikon className="h-4 w-4" style={{ color: vurgu ? RENK.gida : 'var(--text-secondary)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{baslik}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {sayi(deger)}
        </span>
        {degisim !== null && (
          <span
            className="flex items-center gap-0.5 text-xs font-semibold tabular-nums"
            style={{ color: yukseliyor ? RENK.ihracat : RENK.ithalat }}
          >
            {yukseliyor ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {sayi(Math.abs(degisim), 1)}%
          </span>
        )}
      </div>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{alt}</p>
    </div>
  );
}

function Grafik({
  baslik, aciklama, veri, cizgiler, referans,
}: {
  baslik: string;
  aciklama: string;
  veri: Record<string, unknown>[];
  cizgiler: { anahtar: string; ad: string; renk: string; kalin?: boolean }[];
  referans?: { deger: number; etiket: string };
}) {
  return (
    <section className="rounded-xl border p-4 shadow-sm" style={{ background: 'var(--bg-card)' }}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{baslik}</h3>
      <p className="mb-3 mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{aciklama}</p>
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={veri} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="etiket" tick={{ fontSize: 11 }} minTickGap={24} />
            {/* Endeks serisi 100 etrafında geziniyor; tabanı 0'a çakmak
                eğrileri düz çizgiye çevirirdi (bkz. LINE_Y_DOMAIN). */}
            <YAxis domain={LINE_Y_DOMAIN} tick={{ fontSize: 11 }} width={46} />
            <Tooltip
              formatter={(v: number | string) => sayi(typeof v === 'number' ? v : null, 1)}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {referans && (
              <ReferenceLine
                y={referans.deger}
                stroke="var(--text-secondary)"
                strokeDasharray="4 4"
                label={{ value: referans.etiket, position: 'insideTopRight', fontSize: 10 }}
              />
            )}
            {cizgiler.map((c) => (
              <Line
                key={c.anahtar}
                type="monotone"
                dataKey={c.anahtar}
                name={c.ad}
                stroke={c.renk}
                strokeWidth={c.kalin ? 2.5 : 1.6}
                dot={false}
                /* connectNulls KAPALI: boş bir ay çizgiyle atlanırsa
                   olmayan veri varmış gibi görünür. */
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default function TradeIndexTab() {
  const [aralik, setAralik] = useState<Aralik>(24);
  const { seri, son, onceki, yukleniyor, hata } = useTradeIndexData(aralik);

  if (yukleniyor) return <Loading />;

  if (hata || !son) {
    /*
     * Boş grafik çizmek yerine açıkça söyleniyor. Bu projede bir kez veri
     * bayatken sayfa sessizce eski değeri çizmişti; "veri yok" demek
     * "sıfır çizmek"ten her zaman iyi.
     */
    return (
      <div className="rounded-xl border p-6 text-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
        Dış ticaret endeksi verisi okunamadı{hata ? `: ${hata}` : '.'}
      </div>
    );
  }

  const [yil, ay] = son.donem.split('-');
  const donemAdi = `${['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz',
    'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][Number(ay) - 1]} ${yil}`;

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h2 className="flex items-center gap-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          <Scale className="h-6 w-6" style={{ color: RENK.gida }} />
          Fiyat ve Hacim Endeksleri
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          İhracat geliri arttığında sebebini ayırır: daha çok mu sattık (miktar endeksi),
          yoksa daha pahalıya mı (birim değer endeksi). 2015 = 100. Son dönem: <strong>{donemAdi}</strong>.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kart
          baslik="Gıda dış ticaret haddi"
          deger={son.gidaHaddi}
          degisim={fark(son.gidaHaddi, onceki?.gidaHaddi ?? null)}
          alt={son.gidaHaddi !== null && son.gidaHaddi < 100
            ? '100 altı: ithalat gıdada ihracattan pahalı'
            : '100 üstü: ihracat gıdada ithalattan pahalı'}
          ikon={Gauge}
          vurgu
        />
        <Kart
          baslik="Gıda ihracat birim değeri"
          deger={son.gidaIhracatBde}
          degisim={fark(son.gidaIhracatBde, onceki?.gidaIhracatBde ?? null)}
          alt="Sattığımız birimin fiyatı"
          ikon={TrendingUp}
        />
        <Kart
          baslik="Gıda ithalat birim değeri"
          deger={son.gidaIthalatBde}
          degisim={fark(son.gidaIthalatBde, onceki?.gidaIthalatBde ?? null)}
          alt="Aldığımız birimin fiyatı"
          ikon={TrendingDown}
        />
        <Kart
          baslik="Türkiye dış ticaret haddi"
          deger={son.haddi}
          degisim={fark(son.haddi, onceki?.haddi ?? null)}
          alt="Kıyas çizgisi (tüm sektörler)"
          ikon={Scale}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ARALIKLAR.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAralik(a.id)}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
            style={aralik === a.id
              ? { background: RENK.gida, borderColor: RENK.gida, color: '#fff' }
              : { background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            {a.ad}
          </button>
        ))}
      </div>

      <Grafik
        baslik="Dış ticaret haddi — gıda ve Türkiye toplamı"
        aciklama="İhracat birim değerinin ithalat birim değerine oranı. 100'ün altı, aynı ithalatı karşılamak için daha çok ihracat gerektiği anlamına gelir."
        veri={seri}
        referans={{ deger: 100, etiket: '100 (2015 dengesi)' }}
        cizgiler={[
          { anahtar: 'gidaHaddi', ad: 'Gıda ve canlı hayvanlar', renk: RENK.gida, kalin: true },
          { anahtar: 'haddi', ad: 'Türkiye toplamı', renk: RENK.toplam },
        ]}
      />

      <Grafik
        baslik="Gıda — birim değer endeksleri"
        aciklama="Fiyat tarafı. İki çizginin arası açıldıkça dış ticaret haddi bozuluyor demektir."
        veri={seri}
        cizgiler={[
          { anahtar: 'gidaIhracatBde', ad: 'İhracat', renk: RENK.ihracat, kalin: true },
          { anahtar: 'gidaIthalatBde', ad: 'İthalat', renk: RENK.ithalat, kalin: true },
        ]}
      />

      <Grafik
        baslik="Gıda — miktar endeksleri"
        aciklama="Hacim tarafı. Birim değer artarken miktar düşüyorsa gelir artışı fiyattan geliyor, satıştan değil."
        veri={seri}
        cizgiler={[
          { anahtar: 'gidaIhracatMe', ad: 'İhracat', renk: RENK.ihracat, kalin: true },
          { anahtar: 'gidaIthalatMe', ad: 'İthalat', renk: RENK.ithalat, kalin: true },
        ]}
      />

      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Kaynak: TÜİK dış ticaret endeksleri (2015=100), aylık. Gıda kapsamı SITC Rev.4
        0. bölümü — gıda maddeleri ve canlı hayvanlar.
      </p>
    </div>
  );
}
