/**
 * Önbellek damgaları — "bu tablo en son ne zaman yazıldı".
 *
 * Okuma yanıtları `caches.default`te tutuluyor ama hiçbir yazma yolu önbelleği
 * temizlemiyordu; veri güncellendikten sonra site bir saate kadar eski veriyi
 * gösteriyordu. Çözüm silme değil SÜRÜMLEME: her tablonun bir damgası var,
 * damga önbellek anahtarına `__v=<damga>` olarak giriyor. Tabloya yazıldığında
 * damga değişiyor ve o tablonun BÜTÜN eski anahtarları — kaç farklı parametre
 * kombinasyonu olursa olsun — tek hamlede erişilemez oluyor. Eski girdiler
 * silinmiyor, bir daha aranmıyor; kendi TTL'leriyle düşüyorlar.
 *
 * Şema: `migrations/0003_veri_damga.sql` (her iki veritabanında da kurulu).
 */

/**
 * Damga haritasının kendi önbellek süresi.
 *
 * Harita HER okuma isteğinde gerekiyor; her seferinde D1'e gitmek önbelleğin
 * amacını yerdi. Bunun yerine haritanın kendisi kenar önbelleğinde bu kadar
 * saniye tutuluyor: koloni başına dakikada bir kez, birkaç satırlık sorgu.
 * 10.000 satırlık asıl sorguların yanında ölçülemez bir maliyet.
 *
 * Bedeli, geçersizleştirmenin bu kadar saniye gecikmesi — 1 saat yerine.
 */
export const DAMGA_TTL = 60;

/*
 * Haritanın önbellek anahtarı. Ayrı bir hostname DEĞİL: `caches.default` özel
 * hostname'li anahtarlarda güvenilir değil, anahtar aynı kaynakta kalmalı.
 * `/api/` ile başlamadığı için okuma yolunun ürettiği hiçbir anahtarla
 * çakışmıyor (onların hepsinde ayrıca `__v` var).
 */
const HARITA_YOLU = '/__damga';

const YAZ_SQL = `INSERT INTO veri_damga (tablo, damga) VALUES (?, ?)
                 ON CONFLICT(tablo) DO UPDATE SET damga = excluded.damga`;

/**
 * Tablo → damga haritası. İki veritabanından okunur, birleştirilir ve
 * DAMGA_TTL boyunca kenar önbelleğinde tutulur.
 *
 * Okunamazsa (tablo henüz yok, D1 arızası) boş harita döner: bütün damgalar 0
 * olur ve davranış damgalar eklenmeden önceki hâline döner. Eksik bir
 * geçersizleştirme yüzünden çalışan bir uygulamayı 500'e düşürmek daha kötü
 * olurdu — hız sınırındaki tercihle aynı gerekçe.
 */
export async function damgaHaritasi(env, ctx, origin) {
  const onbellek = caches.default;
  const anahtar = new Request(`${origin}${HARITA_YOLU}`);

  const hazir = await onbellek.match(anahtar);
  if (hazir) {
    try { return await hazir.json(); } catch { /* bozuk girdi: yeniden oku */ }
  }

  const harita = {};
  await Promise.all([env.DB, env.DUNYA].map(async (db) => {
    if (!db) return;
    try {
      const { results } = await db.prepare('SELECT tablo, damga FROM veri_damga').all();
      for (const r of results ?? []) harita[r.tablo] = Number(r.damga) || 0;
    } catch { /* damgasız çalış */ }
  }));

  const yanit = new Response(JSON.stringify(harita), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${DAMGA_TTL}`,
    },
  });
  ctx?.waitUntil?.(onbellek.put(anahtar, yanit.clone()));
  return harita;
}

/**
 * Bir okuma slug'ının hangi tablodan beslendiğini çözer.
 *
 * ROUTES ve AGG doğrudan tablo adı taşıyor; geri kalan elle yazılmış uçların
 * tablosu burada tek tek eşleniyor. Çözülemeyen bir uç `null` döner ve
 * `damgaSec` onu en güncel damgaya bağlar — yani gereğinden sık tazelenir,
 * ama asla bayat kalmaz. Yanlış tarafa düşmek bu: fazladan D1 okuması bir
 * maliyet, yanlış veri göstermek bir hata.
 */
export function slugTablosu(slug, { ROUTES, AGG, TRADE_TABLES }) {
  if (ROUTES[slug]) return ROUTES[slug].table;
  if (slug.startsWith('agg/')) return AGG[slug.slice(4)]?.table ?? null;

  const ticaret = slug.match(/^(hayvansal|bitkisel)\/dis-ticaret\/(yillik-trend|urun-ozet|meta)$/);
  if (ticaret) return TRADE_TABLES[ticaret[1]];
  // Modülsüz eski adresler hayvansala düşüyor (okuma yolundaki varsayılanla aynı).
  if (['dis-ticaret/yillik-trend', 'dis-ticaret/urun-ozet', 'dis-ticaret/meta'].includes(slug)) {
    return TRADE_TABLES.hayvansal;
  }

  if (slug === 'makro/gfe-latest') return 'gfe_alt_grup_aylik';
  if (slug === 'bitkisel/uretim-detay-yillik') return 'bitkisel_tr_uretim_detay';
  return null;
}

/**
 * Anahtara girecek damgayı seçer.
 *
 * Tablo biliniyorsa yalnızca o tablonun damgası — böylece bir tabloya yazmak
 * diğerlerinin önbelleğini boşuna atmıyor. Tablo çözülemediyse damgaların
 * MAKSİMUMU kullanılır: harita zaten elde olduğu için bedava, ve o uç herhangi
 * bir yazmada geçersizleşir.
 */
export function damgaSec(harita, tablo) {
  if (tablo) return harita[tablo] ?? 0;
  const hepsi = Object.values(harita);
  return hepsi.length ? Math.max(...hepsi) : 0;
}

/** Verilen tabloların damgasını şimdiye çeker. */
export async function damgala(db, tablolar) {
  const zaman = Date.now();
  const ifadeler = [...new Set(tablolar)].filter(Boolean)
    .map((t) => db.prepare(YAZ_SQL).bind(t, zaman));
  if (ifadeler.length) await db.batch(ifadeler);
}
