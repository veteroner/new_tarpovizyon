#!/usr/bin/env node
/**
 * `tuik_fiyatendex` TÜFE satırlarını otomatik senkrondan tamamlar.
 *
 * ─── NEDEN GEREKLİ ──────────────────────────────────────────────────────────
 * Aynı veri panoda İKİ tabloda duruyor ve yalnız biri güncelleniyordu:
 *
 *   tufe_aylik        — Basic okuyor. `scripts/tufe-guncelle.mjs` her ay
 *                       yazıyor. YILLIK DEĞİŞİM (%) tutuyor. 2026-07'ye dolu.
 *   tuik_fiyatendex   — Pro (Fiyat Endeksleri sayfası) okuyor. ENDEKS SEVİYESİ
 *                       tutuyor (2025=100). Hiçbir betik yazmıyordu; TÜFE
 *                       satırları 2026 NİSAN'da duruyordu.
 *
 * Sonuç: Basic güncel, Pro üç ay geride. Kullanıcının gördüğü "TÜFE nisanda
 * bitiyor" tam olarak buydu.
 *
 * ─── İKİSİ ARASINDAKİ BAĞ ÖLÇÜLDÜ ───────────────────────────────────────────
 * Endeks, bir önceki yılın aynı ayına yıllık değişim uygulanarak elde ediliyor:
 *
 *     endeks[ay, Y] = endeks[ay, Y-1] × (1 + yillik_degisim[ay, Y] / 100)
 *
 * Zaten DOLU olan aylarda birebir tutuyor (sapma %0,00):
 *     Mart 2026 : 92,820524 × 1,3084 = 121,47  (tabloda 121,47)
 *     Nisan 2026: 95,601977 × 1,3237 = 126,55  (tabloda 126,55)
 *
 * Yani bu bir tahmin değil, tablonun kendi kuruluş kuralı.
 *
 * ─── GÜVENLİK AĞI ───────────────────────────────────────────────────────────
 * Yazmadan önce DOLU aylar üzerinde aynı hesap yapılıyor. Bir tanesi bile
 * %0,05'ten fazla saparsa hiçbir şey yazılmaz — bağın hâlâ geçerli olduğunu
 * her çalıştırmada yeniden kanıtlıyoruz. (TÜİK baz yılını değiştirirse bu
 * kontrol devreye girer ve sessiz bozulmayı önler.)
 *
 * ─── KULLANIM ───────────────────────────────────────────────────────────────
 *   node scripts/fiyatendex-tufe-tamamla.mjs          # yalnız rapor
 *   node scripts/fiyatendex-tufe-tamamla.mjs --yaz    # D1'e yaz
 */

import { execFileSync } from 'node:child_process';
import { damgaSql } from './lib/damga.mjs';

const YAZ = process.argv.includes('--yaz');
const DB = 'tarpovizyon-basic';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/**
 * `tufe_aylik`'teki oran sütunu → `tuik_fiyatendex`'teki d1 satırı.
 *
 * YALNIZCA GENEL ENDEKS. `gida_alkolsuz` sütunu da denendi ve ÖLÇÜLEREK
 * elendi: dolu aylarda türetilen değer gerçeğinden %16–23 sapıyor
 * (2023-12: gerçek 67,20 · türetilen 82,59). İki sütun aynı şeyi ölçmüyor —
 * bültenin "gıda ve alkolsüz içecekler" tanımı ile endeks tablosunun d1=1
 * kategorisi örtüşmüyor. Genel endekste ise sapma 368 ayın hepsinde %0,00.
 *
 * Yani gıda satırı bilerek boş bırakılıyor; uydurulmuş bir sayı yazmaktansa
 * o grafiğin kendi son ayını söylemesi doğru.
 */
const ESLEME = [
  { oranSutun: 'tufe', d1: 0, ad: 'TÜFE (genel)' },
];

function d1(sql) {
  const cikti = execFileSync('npx', [
    'wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', sql,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const i = cikti.indexOf('[');
  if (i < 0) throw new Error(`Beklenmeyen çıktı:\n${cikti.slice(0, 400)}`);
  return JSON.parse(cikti.slice(i))[0].results;
}

const oranlar = d1('SELECT yil, ay, tufe, gida_alkolsuz FROM tufe_aylik ORDER BY yil, ay');
const endeksler = d1(
  `SELECT yil, d1, ${AYLAR.map((a) => `"${a}"`).join(', ')} FROM tuik_fiyatendex
   WHERE endeks='TUFE' AND d2=0 AND d3=0 AND d4=0 AND d1 IN (0,1)`,
);

const endeksAl = (yil, d1no, ay) => {
  const r = endeksler.find((x) => Number(x.yil) === yil && Number(x.d1) === d1no);
  const v = r?.[AYLAR[ay - 1]];
  return v == null ? null : Number(v);
};
const oranAl = (yil, ay, sutun) => {
  const r = oranlar.find((x) => Number(x.yil) === yil && Number(x.ay) === ay);
  const v = r?.[sutun];
  return v == null ? null : Number(v);
};

let sapmaEnBuyuk = 0;
let dogrulanan = 0;
const yazilacak = [];

for (const { oranSutun, d1: d1no, ad } of ESLEME) {
  for (const r of oranlar) {
    const yil = Number(r.yil);
    const ay = Number(r.ay);
    const oran = oranAl(yil, ay, oranSutun);
    const oncekiEndeks = endeksAl(yil - 1, d1no, ay);
    if (oran == null || oncekiEndeks == null) continue;

    const turetilen = oncekiEndeks * (1 + oran / 100);
    const mevcut = endeksAl(yil, d1no, ay);

    if (mevcut != null) {
      // Güvenlik ağı: bağ hâlâ geçerli mi?
      const sapma = Math.abs(turetilen - mevcut) / mevcut * 100;
      sapmaEnBuyuk = Math.max(sapmaEnBuyuk, sapma);
      dogrulanan++;
    } else {
      yazilacak.push({ yil, ay, d1: d1no, ad, deger: Number(turetilen.toFixed(6)) });
    }
  }
}

console.log(`doğrulanan dolu ay: ${dogrulanan}   en büyük sapma: %${sapmaEnBuyuk.toFixed(4)}`);
if (sapmaEnBuyuk > 0.05) {
  console.error('DUR: sapma eşiği aşıldı — endeks/oran bağı artık geçerli değil.');
  console.error('TÜİK baz yılını değiştirmiş olabilir; elle incelenmeli.');
  process.exit(1);
}

if (yazilacak.length === 0) {
  console.log('Doldurulacak boş ay yok.');
  process.exit(0);
}

console.log(`\ndoldurulacak ${yazilacak.length} hücre:`);
for (const y of yazilacak) {
  console.log(`   ${y.yil}-${String(y.ay).padStart(2, '0')}  ${y.ad.padEnd(28)} ${y.deger.toFixed(2)}`);
}

const sql = yazilacak.map((y) =>
  `UPDATE tuik_fiyatendex SET "${AYLAR[y.ay - 1]}" = ${y.deger}
   WHERE endeks='TUFE' AND d1=${y.d1} AND d2=0 AND d3=0 AND d4=0 AND yil=${y.yil};`).join('\n');

const tumSql = `${sql}\n${damgaSql(['tuik_fiyatendex'])}`;

if (!YAZ) {
  console.log('\n--yaz verilmedi, yazılmadı. Üretilen SQL:\n');
  console.log(tumSql);
  process.exit(0);
}

execFileSync('npx', ['wrangler', 'd1', 'execute', DB, '--remote', '--command', tumSql],
  { encoding: 'utf8', stdio: 'inherit' });
console.log('\nyazıldı ve önbellek damgası ilerletildi.');
