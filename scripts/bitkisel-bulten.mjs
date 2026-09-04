#!/usr/bin/env node
/**
 * TÜİK "Bitkisel Üretim Tahmini" bülteninin GRUP toplamlarını D1'e yazar.
 *
 *   node scripts/bitkisel-bulten.mjs --dizin ~/Downloads --bulten 58012        # rapor
 *   node scripts/bitkisel-bulten.mjs --dizin ~/Downloads --bulten 58012 --yaz
 *
 * ─── NEDEN ÜRÜN DEĞİL GRUP ──────────────────────────────────────────────────
 * Bülten ürünleri TOPLU adlarla veriyor ("Buğday", "Arpa", "Mısır (dane)");
 * `bitkisel_tr_uretim_detay` ise MEDAS granülerliğinde ayrık tutuyor
 * ("Buğday, Durum Buğdayı Hariç" + "Durum Buğdayı"). Ölçüldü: bültenin 195
 * satırından yalnızca 56'sı D1 adlarıyla birebir eşleşiyor ve bunların 2025'i
 * zaten dolu. Toplu rakamı ayrık satırlara yazmak veriyi bozardı.
 *
 * Ama bülten GRUP toplamlarını temiz veriyor ve iniş sayfasındaki kartlar da
 * grup seviyesinde çalışıyor. Bu yüzden yalnızca gruplar, AYRI bir tabloya
 * yazılıyor — ürün tablosuna karışmıyor.
 *
 * ─── TAHMİN AYRIMI ──────────────────────────────────────────────────────────
 * Bültendeki gelecek yıl GERÇEKLEŞME DEĞİL TAHMİN. `tahmin` sütunuyla
 * işaretleniyor ve arayüzde kesikli çizgi olarak, ayrı seri hâlinde
 * gösteriliyor; gerçekleşme serisine karıştırılmıyor.
 *
 * ─── NEDEN ELLE ─────────────────────────────────────────────────────────────
 * Bülten indirme bağlantıları imzalı ve tarayıcı oturumuna bağlı; Node'dan
 * ardışık istekte hata sayfası dönüyor. Yılda birkaç kez çıkan bir veri için
 * kırılgan bir otomasyon kurmak yerine dosyalar elle indirilip bu betik
 * çalıştırılıyor.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as XLSX from 'xlsx';
import { damgaSql } from './lib/damga.mjs';

const calistir = promisify(execFile);
const KOK = new URL('../workers/tarpovizyon-api/', import.meta.url).pathname;

const arg = process.argv.slice(2);
const deger = (a) => { const i = arg.indexOf(a); return i >= 0 ? arg[i + 1] : null; };
const DIZIN = (deger('--dizin') ?? '').replace(/^~/, process.env.HOME ?? '~');
const BULTEN = deger('--bulten') ?? '';
const YAZ = arg.includes('--yaz');
if (!DIZIN || !BULTEN) throw new Error('--dizin ve --bulten zorunlu');

/** Dosya adından hangi tabloyu okuduğumuzu anlıyoruz. */
const DOSYA_TURU = [
  [/tah[ıi]l/i, 'tahillar'],
  [/sebze/i, 'sebzeler'],
  [/meyve/i, 'meyveler'],
];

/**
 * Kart grubu → bültendeki grup satırının adı.
 * Yalnızca TEMİZ eşleşenler burada. "Baklagiller" bültende patates ve kök
 * bitkilerle aynı satırda, "Endüstriyel Bitkiler" ise şeker pancarı ve
 * tekstil ham bitkileri diye dağılmış — ikisi de eşlenmiyor, bindirme almıyor.
 */
export const GRUP_ESLEME = {
  tahillar: 'Tahıllar',
  'yagli-tohumlar': 'Yağlı tohumlar',
  meyveler: 'Toplam',      // meyve dosyasının kendi toplamı
  sebzeler: 'Toplam',      // sebze dosyasının kendi toplamı
};

function tabloOku(yol) {
  const wb = XLSX.read(readFileSync(yol), { type: 'buffer' });
  const r = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false });
  let bas = -1; let iEski = -1; let iYeni = -1; let yilEski = 0; let yilYeni = 0;
  for (let i = 0; i < r.length; i++) {
    const t = r[i].map((c) => String(c ?? '').trim());
    const yillar = t.map((x, j) => [x, j]).filter(([x]) => /^(19|20)\d{2}$/.test(x));
    if (yillar.length >= 2) {
      bas = i;
      [[, iEski], [, iYeni]] = yillar;
      yilEski = Number(yillar[0][0]); yilYeni = Number(yillar[1][0]);
      break;
    }
  }
  if (bas < 0) throw new Error(`${yol}: yıl başlığı bulunamadı`);

  const satirlar = [];
  for (const s of r.slice(bas + 1)) {
    const ham = String(s[0] ?? '');
    const v1 = Number(s[iEski]); const v2 = Number(s[iYeni]);
    if (!(v1 > 0) || !(v2 > 0)) continue;
    // Girintili satır alt ürün; grup satırları girintisiz.
    if (/^\s/.test(ham)) continue;
    const ad = ham.split(' - ')[0].trim().replace(/\n[\s\S]*/, '').replace(/\s*\(\d\)\s*$/, '');
    satirlar.push({ ad, [yilEski]: v1, [yilYeni]: v2 });
  }
  return { yilEski, yilYeni, satirlar };
}

/* ─── dosyaları bul ve oku ────────────────────────────────────────────────── */

const bulunan = {};
for (const f of readdirSync(DIZIN)) {
  if (!/\.xls$/i.test(f)) continue;
  const tur = DOSYA_TURU.find(([re]) => re.test(f))?.[1];
  if (tur && !bulunan[tur]) bulunan[tur] = join(DIZIN, f);
}
const eksik = ['tahillar', 'sebzeler', 'meyveler'].filter((t) => !bulunan[t]);
if (eksik.length) throw new Error(`Şu tablolar bulunamadı: ${eksik.join(', ')} (${DIZIN})`);

const kayitlar = [];
for (const [tur, yol] of Object.entries(bulunan)) {
  const { yilEski, yilYeni, satirlar } = tabloOku(yol);
  console.log(`── ${tur}: ${satirlar.length} grup satırı, ${yilEski} ve ${yilYeni}`);
  for (const s of satirlar) {
    kayitlar.push({ dosya: tur, grup: s.ad, yil: yilEski, deger: s[yilEski], tahmin: 0 });
    kayitlar.push({ dosya: tur, grup: s.ad, yil: yilYeni, deger: s[yilYeni], tahmin: 1 });
  }
}

console.log(`\ntoplam ${kayitlar.length} kayıt (${kayitlar.filter((k) => k.tahmin).length} tahmin)`);
console.log('\nkartlarla eşleşenler:');
for (const [kart, grupAdi] of Object.entries(GRUP_ESLEME)) {
  const dosya = kart === 'meyveler' ? 'meyveler' : kart === 'sebzeler' ? 'sebzeler' : 'tahillar';
  const bulunanlar = kayitlar.filter((k) => k.dosya === dosya && k.grup === grupAdi);
  const g = (t) => bulunanlar.find((x) => x.tahmin === t);
  console.log(`   ${kart.padEnd(16)} ← "${grupAdi}" (${dosya}): `
    + `${g(0)?.yil}=${Math.round(g(0)?.deger ?? 0).toLocaleString('tr-TR')} · `
    + `${g(1)?.yil}=${Math.round(g(1)?.deger ?? 0).toLocaleString('tr-TR')} (tahmin)`);
}

if (!YAZ) { console.log('\n(--yaz verilmedi, D1\'e yazılmadı)'); process.exit(0); }

/* ─── D1'e yaz ────────────────────────────────────────────────────────────── */

const s = (v) => `'${String(v).replace(/'/g, "''")}'`;
const sql = [
  `CREATE TABLE IF NOT EXISTS bitkisel_bulten_grup (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     dosya TEXT, grup TEXT, yil INTEGER, deger REAL,
     tahmin INTEGER DEFAULT 0, bulten TEXT);`,
  `CREATE INDEX IF NOT EXISTS ix_bbg ON bitkisel_bulten_grup(dosya, grup, yil);`,
  // Aynı bülten yeniden yüklenirse ikizlenmesin.
  `DELETE FROM bitkisel_bulten_grup WHERE bulten = ${s(BULTEN)};`,
  ...kayitlar.map((k) => `INSERT INTO bitkisel_bulten_grup (dosya,grup,yil,deger,tahmin,bulten)
     VALUES (${s(k.dosya)},${s(k.grup)},${k.yil},${k.deger},${k.tahmin},${s(BULTEN)});`),
  /*
   * Önbellek damgası — yığının SONUNDA. Bu satır olmadan bülten D1'e girer ama
   * sayfa bir saate kadar önceki bülteni gösterir: Worker'ın okuma yanıtları
   * kenar önbelleğinde duruyor ve anahtarları tablonun damgasını taşıyor.
   */
  damgaSql(['bitkisel_bulten_grup']),
].join('\n');

const { writeFileSync, unlinkSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const yol = join(tmpdir(), `bbg-${Date.now()}.sql`);
writeFileSync(yol, sql);
try {
  await calistir('npx', ['wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--json', '--file', yol],
    { cwd: KOK, maxBuffer: 2e8 });
  console.log(`\n✓ ${kayitlar.length} kayıt yazıldı (bülten ${BULTEN})`);
} finally { try { unlinkSync(yol); } catch { /* geçici */ } }
