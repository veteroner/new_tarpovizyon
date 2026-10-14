#!/usr/bin/env node
/**
 * FAO Gıda Fiyat Endeksi (FFPI) → D1 `fao_urunler_aylik` ve `tuik_fiyatendex` (FAO).
 *
 * ─── İKİ HEDEF, TEK KAYNAK ──────────────────────────────────────────────────
 * Aynı FAO verisi D1'de İKİ tabloda duruyor:
 *   · fao_urunler_aylik      — yıl/ay satırları, nominal, tek ondalık
 *   · tuik_fiyatendex (FAO)  — 6 endeks × nominal/reel = 12 seri, yıl satırı +
 *                              Ocak..Aralık sütunları, tam hassasiyet. Pro'daki
 *                              "Fiyat Endeksleri" sayfasının FAO sekmesi bunu okuyor.
 * Bu betik uzun süre yalnız ilkini yazdı. İkincisi 2026-10-14'te Temmuz 2026'da
 * kalmış bulundu ve son ayları revize EDİLMEMİŞTİ (Temmuz gıda: 131,09 — kaynak
 * 131,71). Kaynağın eski bir sürümünden bir kez yüklenmiş, sonra unutulmuş.
 *
 * ─── NEDEN AYRI BİR İŞ ──────────────────────────────────────────────────────
 * TÜİK senkronu SDMX'e bağlı; bu veri FAO'nun kendi sayfasından geliyor ve
 * TAM OTOMATİK olabiliyor (TÜFE'nin aksine — orada bülten JSON'u Node'dan
 * 404 dönüyor, bkz. scripts/tufe-guncelle.mjs).
 *
 * ─── KAYNAK VE KEŞİF ────────────────────────────────────────────────────────
 * Dosya adı her ay değişiyor (`ffpi-data-2026-08.xlsx`) ve sonunda bir
 * `?sfvrsn=` sürüm damgası var — sabit URL yazılamaz. Bu yüzden bağlantı her
 * çalışmada FAO'nun endeks sayfasından KEŞFEDİLİYOR.
 *
 * ESKİ DOSYAYA DİKKAT: `.../Reports_and_docs/Food_price_indices_data.csv`
 * hâlâ HTTP 200 veriyor ama Mart 2018'de donmuş ve eski bazı (2002-2004=100)
 * kullanıyor. Kullanılmamalı; doğru dosya 2014-2016=100 bazında.
 *
 * ─── REVİZYON ───────────────────────────────────────────────────────────────
 * FAO geçmiş ayları revize ediyor (2026-05 bizde 130,8 iken kaynakta 131,0'e
 * çıkmıştı). Bu yüzden yalnızca yeni ay eklenmiyor; DEĞİŞEN eski aylar da
 * güncelleniyor. Değişmeyen satıra dokunulmuyor.
 *
 * Kullanım:
 *   node scripts/fao-fpi-sync.mjs           # yalnızca rapor
 *   node scripts/fao-fpi-sync.mjs --yaz     # D1'e uygula, sonra D1'den geri okuyup doğrula
 *
 * D1 artık DOĞRUDAN okunuyor (CI'da REST, yerelde wrangler). Herkese açık API
 * kenar önbelleğinden geçiyor; yazmadan hemen sonra doğrulama için okunursa
 * eski yanıtı alıp "fark var" diyebilirdi.
 */

import * as XLSX from 'xlsx';
import { damgaSql } from './lib/damga.mjs';

const SAYFA = 'https://www.fao.org/worldfoodsituation/foodpricesindex/en/';
const yaz = process.argv.includes('--yaz');

/** Endeks sayfasından güncel xlsx bağlantısını bulur. */
async function dosyaBaglantisi() {
  const r = await fetch(SAYFA);
  if (!r.ok) throw new Error(`FAO sayfası okunamadı (HTTP ${r.status})`);
  const html = await r.text();
  const m = html.match(/https:\/\/[^"']*ffpi-data-\d{4}-\d{2}\.xlsx[^"']*/);
  if (!m) throw new Error('Sayfada ffpi-data-YYYY-MM.xlsx bağlantısı bulunamadı — FAO düzeni değişmiş olabilir.');
  return m[0].replace(/&amp;/g, '&');
}

/** Dosyayı BİR KEZ indirir; iki hedef de aynı çalışma kitabından okunuyor. */
async function indir(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Dosya indirilemedi (HTTP ${r.status})`);
  return XLSX.read(Buffer.from(await r.arrayBuffer()));
}

/** Aylık endeks satırları: { yil, ay, gida, et, sut, hububat, bitkisel_yag, seker } */
function kaynaktanOku(wb) {
  const sayfa = wb.Sheets['Indices_Monthly'];
  if (!sayfa) throw new Error(`"Indices_Monthly" sayfası yok. Bulunanlar: ${wb.SheetNames.join(', ')}`);

  /*
   * Baz doğrulaması: dosya 2014-2016=100 olmalı. Eski dosya (2002-2004=100)
   * aynı sütun adlarını taşıyor, yani baz kontrol edilmezse tamamen farklı
   * ölçekte sayılar sessizce yazılırdı.
   */
  const hamSatirlar = XLSX.utils.sheet_to_json(sayfa, { header: 1, raw: false });
  const bazSatiri = hamSatirlar.slice(0, 4).flat().join(' ');
  if (!/2014-2016\s*=\s*100/.test(bazSatiri)) {
    throw new Error(`Beklenen baz (2014-2016=100) bulunamadı. Başlık: ${bazSatiri.slice(0, 80)}`);
  }

  const say = (v) => {
    const n = Number(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const satirlar = [];
  for (const r2 of hamSatirlar) {
    const tarih = String((r2 ?? [])[0] ?? '').trim();
    const m = tarih.match(/^(\d{4})-(\d{2})$/);
    if (!m) continue;
    satirlar.push({
      yil: Number(m[1]),
      ay: Number(m[2]),
      gida: say(r2[1]),
      et: say(r2[2]),
      sut: say(r2[3]),
      hububat: say(r2[4]),
      bitkisel_yag: say(r2[5]),
      seker: say(r2[6]),
    });
  }
  if (satirlar.length < 300) throw new Error(`Beklenenden az satır (${satirlar.length}) — dosya düzeni değişmiş olabilir.`);
  return satirlar;
}

/*
 * ─── D1 ERİŞİMİ ─────────────────────────────────────────────────────────────
 *  - CI (GitHub Actions): Cloudflare D1 REST API — wrangler oturumu yok, ama
 *    CLOUDFLARE_* secret'ları var (TÜİK senkronuyla aynı üçlü).
 *  - Yerel: wrangler, geliştiricinin mevcut oturumuyla.
 */
const restIleYaz = Boolean(process.env.CLOUDFLARE_API_TOKEN
  && process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_D1_DATABASE_ID);

async function d1Rest(sql) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`
    + `/d1/database/${process.env.CLOUDFLARE_D1_DATABASE_ID}/query`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });
  const b = await r.json().catch(() => null);
  if (!r.ok || !b?.success) throw new Error(`D1 hatası (HTTP ${r.status}): ${JSON.stringify(b?.errors ?? b)}`);
  return b.result;
}

/* Sürüm sabit — package.json devDependency ile aynı. */
const WRANGLER = 'wrangler@4.131.2';

/** Tek SELECT, satırları döndürür. */
async function d1Sorgu(sql) {
  if (restIleYaz) return (await d1Rest(sql))[0]?.results ?? [];
  const { execFileSync } = await import('node:child_process');
  const cikti = execFileSync('npx',
    ['--yes', WRANGLER, 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--json', '--command', sql],
    { cwd: 'workers/tarpovizyon-api', encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, LANG: 'en_US.UTF-8' } });
  return JSON.parse(cikti.slice(cikti.indexOf('[')))[0]?.results ?? [];
}

const d1dekiler = () => d1Sorgu(
  'SELECT id, yil, ay, gida, et, sut, hububat, bitkisel_yag, seker FROM fao_urunler_aylik');

/*
 * ─── tuik_fiyatendex (FAO) ──────────────────────────────────────────────────
 * Eşleme ÖLÇÜLDÜ (2026-10-14): D1'deki 5.239 hücre kaynakla 6 ondalığına kadar
 * birebir tuttu; 12 serinin 12'si doğru sütuna denk geliyor. Fark yalnız
 * revizyonlarda (29 hücre, 2025–2026) ve eksik aylarda (Ağustos–Eylül 2026).
 *
 * Sütunlar KONUMA göre değil BAŞLIK ADINA göre bulunuyor: nominal sayfada tarih
 * A sütununda, reel sayfada B'de; başlıklar da farklı ("Meat" / "Meat Price
 * Index"). FAO düzeni değiştirirse konum eşlemesi sessizce yanlış sütun yazardı.
 */
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const FAO_URUN = [
  [/^food/i, 'FAO Gıda Fiyatı'],
  [/^meat/i, 'Et'],
  [/^dairy/i, 'Süt Ürünleri'],
  [/^cereal/i, 'Tahıllar'],
  [/^oil/i, 'Bitkisel Yağlar'],
  [/^sugar/i, 'Şeker'],
];
/* D1 6 ondalık tutuyor; kaynak 14. Yuvarlamazsak her hücre her gün "değişmiş" görünür. */
const alti = (v) => Math.round(v * 1e6) / 1e6;

/** "kod|urun|yil" → { 1..12: değer } */
function fiyatendexOku(wb) {
  const sonuc = new Map();
  for (const [kod, sayfaAdi] of [['nominal', 'Indices_Monthly'], ['real', 'Indices_Monthly_Real']]) {
    const sayfa = wb.Sheets[sayfaAdi];
    if (!sayfa) throw new Error(`"${sayfaAdi}" sayfası yok. Bulunanlar: ${wb.SheetNames.join(', ')}`);
    const satirlar = XLSX.utils.sheet_to_json(sayfa, { header: 1, raw: true });

    const baz = satirlar.slice(0, 4).flat().join(' ');
    if (!/2014-2016\s*=\s*100/.test(baz)) throw new Error(`${sayfaAdi}: beklenen baz (2014-2016=100) yok`);

    /* Başlık satırı, TARİH sütunu olan satır. "food price index" ile aramak
       sayfanın en üstündeki "FAO Food Price Index" başlığını yakalıyordu. */
    const basIdx = satirlar.findIndex((r) => (r ?? []).some((h) => /^(date|month)$/i.test(String(h ?? '').trim())));
    if (basIdx < 0) throw new Error(`${sayfaAdi}: başlık satırı bulunamadı`);
    const bas = satirlar[basIdx].map((h) => String(h ?? '').trim());
    const tarihSut = bas.findIndex((h) => /^(date|month)$/i.test(h));
    const sutun = FAO_URUN.map(([desen, urun]) => [bas.findIndex((h) => desen.test(h)), urun]);
    if (tarihSut < 0 || sutun.some(([i]) => i < 0)) {
      throw new Error(`${sayfaAdi}: sütunlar eşlenemedi — başlık: ${JSON.stringify(bas)}`);
    }

    let ay = 0;
    for (const r of satirlar.slice(basIdx + 1)) {
      const t = r?.[tarihSut];
      if (typeof t !== 'number') continue;
      /* Excel tarih sayısı (1899-12-30 tabanlı gün). `XLSX.SSF` ESM içe
         aktarımında tanımsız geliyor; çeviri elle yapılıyor. */
      const tarih = new Date(Date.UTC(1899, 11, 30) + t * 86400000);
      const d = { y: tarih.getUTCFullYear(), m: tarih.getUTCMonth() + 1 };
      if (!d.y || !d.m) continue;
      ay++;
      for (const [i, urun] of sutun) {
        const v = r[i];
        if (typeof v !== 'number' || !Number.isFinite(v)) continue;
        const k = `${kod}|${urun}|${d.y}`;
        if (!sonuc.has(k)) sonuc.set(k, {});
        sonuc.get(k)[d.m] = alti(v);
      }
    }
    if (ay < 300) throw new Error(`${sayfaAdi}: beklenenden az ay (${ay}) — dosya düzeni değişmiş olabilir.`);
  }
  return sonuc;
}

const tirnak = (v) => `'${String(v).replace(/'/g, "''")}'`;

/** D1 FAO satırlarını okuyup kaynağa göre UPDATE/INSERT ifadeleri üretir. */
async function fiyatendexFarki(kaynakEndeks) {
  const satirlar = await d1Sorgu(
    `SELECT id, maddekod, urun, yil, ${AYLAR.map((a) => `"${a}"`).join(', ')} `
    + "FROM tuik_fiyatendex WHERE endeks='FAO'");
  const mevcut = new Map(satirlar.map((r) => [`${r.maddekod}|${r.urun}|${Number(r.yil)}`, r]));
  const ifadeler = [];
  let hucre = 0;
  for (const [k, aylar] of kaynakEndeks) {
    const [kod, urun, yil] = k.split('|');
    const r = mevcut.get(k);
    if (!r) {
      /* Yeni yıl (Ocak'ta): o yılın 12 satırı henüz yok. */
      const ayIdx = Object.keys(aylar).map(Number);
      hucre += ayIdx.length;
      ifadeler.push('INSERT INTO tuik_fiyatendex (alan, endeks, maddekod, d1, d2, d3, d4, urun, yil, '
        + `${ayIdx.map((m) => `"${AYLAR[m - 1]}"`).join(', ')}, bazyil) VALUES ('tuik', 'FAO', ${tirnak(kod)}, 0, 0, 0, 0, `
        + `${tirnak(urun)}, ${yil}, ${ayIdx.map((m) => aylar[m]).join(', ')}, '2014-2016');`);
      continue;
    }
    const set = [];
    for (const [m, v] of Object.entries(aylar)) {
      const eski = r[AYLAR[m - 1]];
      if (eski !== null && eski !== undefined && Math.abs(Number(eski) - v) < 5e-7) continue;
      set.push(`"${AYLAR[m - 1]}" = ${v}`);
    }
    if (set.length) {
      hucre += set.length;
      ifadeler.push(`UPDATE tuik_fiyatendex SET ${set.join(', ')} WHERE id = ${r.id};`);
    }
  }
  return { ifadeler, hucre };
}

const ALANLAR = ['gida', 'et', 'sut', 'hububat', 'bitkisel_yag', 'seker'];
const esit = (a, b) => ALANLAR.every((f) => {
  const x = a[f]; const y = b[f];
  if (x === null || y === null) return x === y;
  // FAO tek ondalık yayımlıyor; kayan nokta gürültüsü fark sayılmasın.
  return Math.abs(Number(x) - Number(y)) < 0.005;
});

const url = await dosyaBaglantisi();
console.log(`Kaynak: ${url.split('/').pop().split('?')[0]}`);
const wb = await indir(url);

// ─── 1) fao_urunler_aylik ───────────────────────────────────────────────────
const kaynak = kaynaktanOku(wb);
const anahtar = (r) => `${r.yil}-${String(r.ay).padStart(2, '0')}`;

/** Kaynak ile D1'i karşılaştırıp yazılacakları çıkarır. Doğrulamada da kullanılıyor. */
async function urunlerFarki() {
  const mevcut = await d1dekiler();
  const mevcutHarita = new Map(mevcut.map((r) => [anahtar(r), r]));
  const eklenecek = [];
  const guncellenecek = [];
  for (const s of kaynak) {
    const v = mevcutHarita.get(anahtar(s));
    if (!v) eklenecek.push(s);
    else if (!esit(s, v)) guncellenecek.push({ ...s, id: v.id, eski: v });
  }
  return { mevcut, eklenecek, guncellenecek };
}

const { mevcut, eklenecek, guncellenecek } = await urunlerFarki();
console.log(`\nfao_urunler_aylik — kaynak ${kaynak.length} ay (son ${anahtar(kaynak.at(-1))}), D1 ${mevcut.length} ay.`);
console.log(`  eklenecek: ${eklenecek.length}, güncellenecek: ${guncellenecek.length}`);
eklenecek.slice(-6).forEach((r) => console.log(`  + ${anahtar(r)}  gıda=${r.gida}`));
guncellenecek.slice(-6).forEach((r) => console.log(`  ~ ${anahtar(r)}  gıda ${r.eski.gida} → ${r.gida}`));

const sayOrNull = (v) => (v === null ? 'NULL' : v);
const ifadeler1 = [
  ...eklenecek.map((r) => `INSERT INTO fao_urunler_aylik (yil, ay, gida, et, sut, hububat, bitkisel_yag, seker) `
    + `VALUES (${r.yil}, ${r.ay}, ${ALANLAR.map((f) => sayOrNull(r[f])).join(', ')});`),
  ...guncellenecek.map((r) => `UPDATE fao_urunler_aylik SET `
    + ALANLAR.map((f) => `${f}=${sayOrNull(r[f])}`).join(', ')
    + ` WHERE id=${r.id};`),
];

// ─── 2) tuik_fiyatendex (FAO) ───────────────────────────────────────────────
const kaynakEndeks = fiyatendexOku(wb);
const fe = await fiyatendexFarki(kaynakEndeks);
const sonYil = Math.max(...[...kaynakEndeks.keys()].map((k) => Number(k.split('|')[2])));
const sonAy = Math.max(...Object.keys(kaynakEndeks.get(`nominal|FAO Gıda Fiyatı|${sonYil}`) ?? {}).map(Number));
console.log(`\ntuik_fiyatendex (FAO) — kaynak 12 seri, son ${sonYil}-${String(sonAy).padStart(2, '0')}.`);
console.log(`  yazılacak hücre: ${fe.hucre} (${fe.ifadeler.length} ifade)`);

const ifadeler = [...ifadeler1, ...fe.ifadeler];
if (!ifadeler.length) {
  console.log('\nDeğişiklik yok.');
  process.exit(0);
}

if (!yaz) {
  console.log(`\n--- ${ifadeler.length} ifade üretildi (--yaz ile uygulanır) ---`);
  console.log(ifadeler.slice(0, 4).join('\n'));
  if (ifadeler.length > 4) console.log(`… ve ${ifadeler.length - 4} tane daha`);
  process.exit(0);
}

/*
 * Önbellek damgası — yazma ifadelerinin SONUNA ekleniyor, yani son öbekte
 * veriden sonra çalışıyor. Bu olmadan yeni ay D1'e girer ama sayfa bir saate
 * kadar eski değeri gösterir: Worker'ın okuma yanıtları kenar önbelleğinde
 * duruyor ve anahtarları tablonun damgasını taşıyor.
 *
 * Yalnız gerçekten yazılan tablo damgalanıyor: değişmeyen tablonun
 * önbelleğini atmak boşuna D1 okuması demek.
 */
ifadeler.push(damgaSql([
  ...(ifadeler1.length ? ['fao_urunler_aylik'] : []),
  ...(fe.ifadeler.length ? ['tuik_fiyatendex'] : []),
]));

/*
 * ─── NEDEN ÖBEKLİ YAZILIYOR ────────────────────────────────────────────────
 * İlk hizalamada 300'den fazla ifade çıkabiliyor. Hepsini tek komuta koymak
 * hem komut satırı sınırlarını hem D1'in ifade sınırını zorluyor.
 * Öbek boyutu 25: 50'de wrangler hata veriyor (komut satırı/ifade sınırı).
 */
const { execFileSync } = await import('node:child_process');
const OBEK = 25;
for (let i = 0; i < ifadeler.length; i += OBEK) {
  const dilim = ifadeler.slice(i, i + OBEK);
  try {
    if (restIleYaz) {
      await d1Rest(dilim.join('\n'));
    } else {
      execFileSync('npx', ['--yes', WRANGLER, 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--command', dilim.join('\n')],
        { cwd: 'workers/tarpovizyon-api', stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, LANG: 'en_US.UTF-8' }, encoding: 'utf8' });
    }
  } catch (e) {
    console.error('  ÖBEK HATASI: ' + String(e.stderr || e.message).slice(0, 400));
    process.exit(1);
  }
  console.log(`  öbek ${Math.floor(i / OBEK) + 1}/${Math.ceil(ifadeler.length / OBEK)} yazıldı (${dilim.length} ifade)`);
}

/*
 * ─── DOĞRULAMA: FARK YENİDEN HESAPLANIYOR ───────────────────────────────────
 * Yazma "başarılı" dönüp hiçbir satırı değiştirmemiş olabilir — WHERE tutmayan
 * UPDATE 0 satır etkiler ve hata vermez; bu depoda senkron aylarca böyle
 * "güncellendi" yazıp hiçbir şey yazmamıştı. Burada başarı mesajına değil
 * SONUCA bakılıyor: D1 yeniden okunup aynı fark hesabı yapılıyor ve SIFIR
 * çıkmalı. Çıkmazsa iş akışı kırmızıya döner.
 */
const sonra1 = await urunlerFarki();
const sonra2 = await fiyatendexFarki(kaynakEndeks);
const kalan1 = sonra1.eklenecek.length + sonra1.guncellenecek.length;
console.log(`\nDoğrulama: fao_urunler_aylik kalan fark ${kalan1}, tuik_fiyatendex (FAO) kalan hücre ${sonra2.hucre}`);
if (kalan1 || sonra2.hucre) {
  console.error('HATA: yazmadan sonra fark kalmış — yazma etkisiz olmuş olabilir.');
  process.exit(1);
}
console.log(`Yazıldı ve doğrulandı: ${eklenecek.length} yeni ay + ${guncellenecek.length} revizyon (fao_urunler_aylik), `
  + `${fe.hucre} hücre (tuik_fiyatendex FAO).`);
