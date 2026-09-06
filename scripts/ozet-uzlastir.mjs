#!/usr/bin/env node
/**
 * Özet tabloyu ayrıntı tablolarından uzlaştırır.
 *
 * ─── SORUN ──────────────────────────────────────────────────────────────────
 * `tr_hayvansal_urun_uretimi` beş ölçüyü birden tutan bir ÖZET tablo; her
 * ölçünün ayrıca kendi AYRINTI tablosu var ve ikisini de hem Pro hem Basic
 * okuyor. Ayrıntılar senkronlu, özet ELLE besleniyor — türetilmediği için
 * sapıyor. Ölçülen sapmalar:
 *
 *   çiğ süt 2019, 2024 : yanlış (bugün düzeltildi)
 *   yumurta 2024       : 19.464 kayıtlı — Ocak–KASIM toplamı 19.467.
 *                        11 aylık kısmi toplam yıllık diye yazılmış, Aralık
 *                        gelince kimse dönüp düzeltmemiş. 12 ay = 21.155.
 *   tavuk eti 2023-24  : %2 ve %8 sapma — FAO AYRINTIYI doğruluyor
 *                        (2023: 2.328.791, 2024: 2.512.131)
 *   kırmızı et         : son yıllarda birebir AMA 1986–2000'de ayrıntı %37'ye
 *                        varan oranda düşük; FAO 2000'de ÖZETİ doğruluyor.
 *                        Bu yüzden kırmızı et uzlaştırılmıyor (aşağı bak).
 *
 * ─── NEDEN GÖRÜNÜM (VIEW) DEĞİL ─────────────────────────────────────────────
 * Özet 1961–2025'i kapsıyor; ayrıntılar 1986'dan (süt/et) ve 2010'dan
 * (kanatlı) başlıyor. Düz bir VIEW 25 yıllık tarihi silerdi. Bu yüzden
 * uzlaştırma: ayrıntının kapsadığı yılda özet ondan yazılıyor, kapsamadığı
 * yılda mevcut tarihsel değer korunuyor.
 *
 * ─── GÜVENLİK AĞI: YALNIZ TAM DÖNEM ─────────────────────────────────────────
 * Aylık kaynaktan türetilen ölçüler YALNIZCA 12 ayı da dolu yıllarda
 * yazılıyor. Yumurta 2024 hatasının sebebi tam olarak buydu; aynı hatayı bu
 * betiğin üretmesi engelleniyor.
 *
 * ─── KULLANIM ───────────────────────────────────────────────────────────────
 *   node scripts/ozet-uzlastir.mjs           # yalnız fark raporu
 *   node scripts/ozet-uzlastir.mjs --yaz     # D1'e yaz
 */

import { execFileSync } from 'node:child_process';
import { damgaSql } from './lib/damga.mjs';

const YAZ = process.argv.includes('--yaz');
const DB = 'tarpovizyon-basic';
const OZET = 'tr_hayvansal_urun_uretimi';

/**
 * Ölçü tanımları.
 *
 * `bal_uretimi` KASTEN YOK: tek il kaynağı `il_bal_cesitleri` ve o tablo
 * bozuk — altı ilde bal değeri kendi verim sütunuyla %16–23 çelişiyor,
 * kovan sütunlarında binlik ayracı ondalık okunmuş. Bozuk kaynaktan
 * türetmektense özetin mevcut değeri bırakılıyor.
 */
const OLCULER = [
  {
    ad: 'çiğ süt (ton)',
    sutun: 'cig_sut_uretimi',
    sorgu: `SELECT yil, toplam_sut_uretimi_ton AS v FROM cig_sut_uretim_miktari`,
    tam: () => true,
  },
  /*
   * KIRMIZI ET KASTEN YOK — ölçüldü, ayrıntı tablosu tarih için GÜVENİLMEZ.
   *
   * 2022–2025'te iki tablo birebir aynı, ama 1986–2000'de ayrıntı %0,8–37
   * DÜŞÜK (1988: özet 709.442 / ayrıntı 444.919). Hakem FAO: 2000 yılında
   * 491.217 diyor ve bu ÖZETLE birebir tutuyor, ayrıntıyla değil.
   *
   * Yani eski yıllarda ayrıntı tablosu eksik (muhtemelen bazı türler yok).
   * "Ayrıntı her zaman doğrudur" varsayımıyla yazsaydık 15 yıllık tarihi
   * bozacaktık. Bu yüzden bu ölçü uzlaştırılmıyor.
   */
  {
    ad: 'yumurta (milyon adet)',
    sutun: 'yumurta_milyon_adet',
    // Aylık seri yıla toplanıyor; `ay` sayısı da geliyor ki eksik yıl elensin.
    sorgu: `SELECT CAST(substr(tarih,1,4) AS INTEGER) yil,
                   SUM(tavuk_yumurtasi_bin_adet)/1000.0 AS v, COUNT(*) ay
            FROM kanatli_uretimleri
            WHERE tavuk_yumurtasi_bin_adet IS NOT NULL
            GROUP BY substr(tarih,1,4)`,
    tam: (r) => Number(r.ay) === 12,
  },
  {
    ad: 'kanatlı eti (ton)',
    sutun: 'kanatli_eti_ton',
    sorgu: `SELECT CAST(substr(tarih,1,4) AS INTEGER) yil,
                   SUM(tavuk_eti_ton) AS v, COUNT(*) ay
            FROM kanatli_uretimleri
            WHERE tavuk_eti_ton IS NOT NULL
            GROUP BY substr(tarih,1,4)`,
    tam: (r) => Number(r.ay) === 12,
  },
];

function d1(sql) {
  const cikti = execFileSync('npx', [
    'wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', sql,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const i = cikti.indexOf('[');
  if (i < 0) throw new Error(`beklenmeyen çıktı:\n${cikti.slice(0, 300)}`);
  return JSON.parse(cikti.slice(i))[0].results;
}

const ozetSatirlari = d1(
  `SELECT yil, ${OLCULER.map((o) => o.sutun).join(', ')} FROM ${OZET}`);
const ozet = new Map(ozetSatirlari.map((r) => [Number(r.yil), r]));

const guncellemeler = [];
let toplamFark = 0;

for (const olcu of OLCULER) {
  const ayrinti = d1(olcu.sorgu);
  const farklar = [];
  let atlananEksik = 0;

  for (const r of ayrinti) {
    const yil = Number(r.yil);
    if (!ozet.has(yil)) continue;              // özette olmayan yıl eklenmiyor
    if (!olcu.tam(r)) { atlananEksik++; continue; }
    const yeni = Number(r.v);
    const mevcut = ozet.get(yil)[olcu.sutun];
    if (mevcut == null) { farklar.push({ yil, mevcut: null, yeni }); continue; }
    const sapma = Math.abs(yeni - Number(mevcut)) / Number(mevcut) * 100;
    /*
     * %1 altı GÜRÜLTÜ sayılıyor, yazılmıyor. Kaynaklar arasında yuvarlama ve
     * küçük revizyon farkları normal; kanatlı eti 2020'de fark %0,1 ve FAO
     * ÖZETİ doğruluyor. Eşiksiz yazmak doğruyu yanlışla değiştirirdi.
     */
    if (sapma > 1) farklar.push({ yil, mevcut: Number(mevcut), yeni, sapma });
  }

  console.log(`\n${olcu.ad}  ←  ayrıntı tablosu`);
  if (atlananEksik) console.log(`   (${atlananEksik} yıl EKSİK dönem olduğu için atlandı)`);
  if (!farklar.length) {
    console.log('   fark yok.');
    continue;
  }
  for (const f of farklar) {
    const s = f.sapma == null ? 'BOŞTU' : `%${f.sapma.toFixed(1)}`;
    console.log(`   ${f.yil}  ${f.mevcut == null ? '—' : f.mevcut.toLocaleString('tr-TR')}`
      + `  →  ${f.yeni.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}   (${s})`);
    guncellemeler.push({ yil: f.yil, sutun: olcu.sutun, deger: f.yeni });
  }
  toplamFark += farklar.length;
}

console.log(`\ntoplam ${toplamFark} hücre farklı.`);
if (!guncellemeler.length) process.exit(0);

const sql = guncellemeler
  .map((g) => `UPDATE ${OZET} SET ${g.sutun} = ${g.deger} WHERE yil = ${g.yil};`)
  .join('\n');
const tumSql = `${sql}\n${damgaSql([OZET])}`;

if (!YAZ) {
  console.log('\n--yaz verilmedi. Üretilecek SQL:\n');
  console.log(tumSql);
  process.exit(0);
}

execFileSync('npx', ['wrangler', 'd1', 'execute', DB, '--remote', '--command', tumSql],
  { encoding: 'utf8', stdio: 'inherit' });
console.log('\nyazıldı ve önbellek damgası ilerletildi.');
