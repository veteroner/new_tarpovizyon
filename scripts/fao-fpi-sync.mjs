#!/usr/bin/env node
/**
 * FAO Gıda Fiyat Endeksi (FFPI) → D1 `fao_urunler_aylik`.
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
 *   node scripts/fao-fpi-sync.mjs --yaz     # D1'e uygula
 */

import * as XLSX from 'xlsx';
import { damgaSql } from './lib/damga.mjs';

const SAYFA = 'https://www.fao.org/worldfoodsituation/foodpricesindex/en/';
const API = process.env.TARPOVIZYON_API ?? 'https://tarpovizyon-api.veteroner.workers.dev';
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

/** Aylık endeks satırları: { yil, ay, gida, et, sut, hububat, bitkisel_yag, seker } */
async function kaynaktanOku(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Dosya indirilemedi (HTTP ${r.status})`);
  const wb = XLSX.read(Buffer.from(await r.arrayBuffer()));

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

async function d1dekiler() {
  const r = await fetch(`${API}/api/makro/fao-urunler-aylik?limit=5000`);
  if (!r.ok) throw new Error(`D1 okunamadı (HTTP ${r.status})`);
  return (await r.json()).data ?? [];
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

const kaynak = await kaynaktanOku(url);
const mevcut = await d1dekiler();
const anahtar = (r) => `${r.yil}-${String(r.ay).padStart(2, '0')}`;
const mevcutHarita = new Map(mevcut.map((r) => [anahtar(r), r]));

const eklenecek = [];
const guncellenecek = [];
for (const s of kaynak) {
  const v = mevcutHarita.get(anahtar(s));
  if (!v) eklenecek.push(s);
  else if (!esit(s, v)) guncellenecek.push({ ...s, id: v.id, eski: v });
}

console.log(`Kaynak ${kaynak.length} ay (son ${anahtar(kaynak.at(-1))}), D1 ${mevcut.length} ay.`);
console.log(`Eklenecek: ${eklenecek.length}, güncellenecek: ${guncellenecek.length}`);

eklenecek.slice(-6).forEach((r) => console.log(`  + ${anahtar(r)}  gıda=${r.gida}`));
guncellenecek.slice(-6).forEach((r) => console.log(`  ~ ${anahtar(r)}  gıda ${r.eski.gida} → ${r.gida}`));

if (!eklenecek.length && !guncellenecek.length) {
  console.log('Değişiklik yok.');
  process.exit(0);
}

const sayOrNull = (v) => (v === null ? 'NULL' : v);
const ifadeler = [
  ...eklenecek.map((r) => `INSERT INTO fao_urunler_aylik (yil, ay, gida, et, sut, hububat, bitkisel_yag, seker) `
    + `VALUES (${r.yil}, ${r.ay}, ${ALANLAR.map((f) => sayOrNull(r[f])).join(', ')});`),
  ...guncellenecek.map((r) => `UPDATE fao_urunler_aylik SET `
    + ALANLAR.map((f) => `${f}=${sayOrNull(r[f])}`).join(', ')
    + ` WHERE id=${r.id};`),
];

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
 */
ifadeler.push(damgaSql(['fao_urunler_aylik']));

/*
 * ─── NEDEN ÖBEKLİ YAZILIYOR ────────────────────────────────────────────────
 * İlk hizalamada 300'den fazla ifade çıkabiliyor (D1 tek ondalık saklamış,
 * kaynak eski yıllarda yağ endeksini iki ondalıkla veriyor). Hepsini tek
 * komuta koymak hem komut satırı sınırlarını hem D1'in ifade sınırını
 * zorluyor; 50'şer öbek güvenli ve ilerlemeyi görünür kılıyor.
 *
 * Bu ilk tam hizalamadan SONRA fark yalnızca gerçek revizyonlarda çıkıyor,
 * yani sonraki çalışmalar birkaç ifadeyle bitiyor.
 */
/*
 * İki yazma yolu:
 *  - CI (GitHub Actions): Cloudflare D1 REST API — wrangler oturumu yok,
 *    ama CLOUDFLARE_* secret'ları var (TÜİK senkronuyla aynı üçlü).
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
}

const { execFileSync } = await import('node:child_process');
/*
 * Öbek boyutu 25: 50'de wrangler hata veriyor (komut satırı/ifade sınırı).
 * İlk tam hizalamada 300+ ifade çıkabiliyor; sonraki çalışmalar birkaç ifade.
 */
const OBEK = 25;
for (let i = 0; i < ifadeler.length; i += OBEK) {
  const dilim = ifadeler.slice(i, i + OBEK);
  try {
    if (restIleYaz) {
      await d1Rest(dilim.join('\n'));
    } else {
      execFileSync('npx', ['wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--command', dilim.join('\n')],
        { cwd: 'workers/tarpovizyon-api', stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, LANG: 'en_US.UTF-8' }, encoding: 'utf8' });
    }
  } catch (e) {
    console.error('  ÖBEK HATASI: ' + String(e.stderr || e.message).slice(0, 400));
    process.exit(1);
  }
  console.log(`  öbek ${Math.floor(i / OBEK) + 1}/${Math.ceil(ifadeler.length / OBEK)} yazıldı (${dilim.length} ifade)`);
}
console.log(`\nYazıldı: ${eklenecek.length} yeni ay, ${guncellenecek.length} revizyon/hizalama.`);
