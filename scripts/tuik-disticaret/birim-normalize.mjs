#!/usr/bin/env node
/**
 * Geçmiş veride birim normalleştirmesi — canlı hayvan BAŞ, yumurta BİN ADET.
 *
 *   node scripts/tuik-disticaret/birim-normalize.mjs            # sadece rapor
 *   node scripts/tuik-disticaret/birim-normalize.mjs --yaz      # uygula
 *
 * Kurallar `birimler.mjs`'te; aynı kurallar yeni aylarda cek.mjs tarafından da
 * uygulanıyor, yani seri bir daha ikiye bölünmüyor.
 *
 * Yumurtada miktar 1000'e BÖLÜNÜYOR — geri alınabilsin diye her tablo için
 * etkilenen satırların tamamı önce yedek dosyasına yazılıyor.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { sorgu, dosyaCalistir } from './d1.mjs';
import { YEDEK_DIZIN } from './ikizler.mjs';
import { CANLI_HAYVAN } from './birimler.mjs';

const YAZ = process.argv.includes('--yaz');

const liste = (a) => a.map((x) => `'${x.replace(/'/g, "''")}'`).join(',');

/** Her tablo için miktar sütun adları farklı. */
const HEDEFLER = [
  { tablo: 'tuik_ticaret_hayvansal', ihr: 'ihracat_mik', ith: 'ithalat_mik' },
  { tablo: 'tr_dis_ticaret_hayvansal', ihr: 'ihracat_miktar', ith: 'ithalat_miktar' },
];

const YUMURTA_KOSUL = "(ana_urun LIKE 'Kuluçkalık%' OR ana_urun LIKE 'Sofral%')";

for (const h of HEDEFLER) {
  console.log(`\n── ${h.tablo} ──`);

  const hayvanKosul = `miktar_birim='ADET' AND ana_urun IN (${liste(CANLI_HAYVAN)})`;
  const yumurtaKosul = `miktar_birim='ADET' AND ${YUMURTA_KOSUL}`;

  const [hv] = await sorgu(`SELECT COUNT(*) n FROM ${h.tablo} WHERE ${hayvanKosul}`);
  const [ym] = await sorgu(`SELECT COUNT(*) n, ROUND(SUM(${h.ihr})) mik
    FROM ${h.tablo} WHERE ${yumurtaKosul}`);

  console.log(`   canlı hayvan ADET→BAŞ        : ${String(hv.n).padStart(6)} satır (etiket)`);
  console.log(`   yumurta ADET→1000ADET (÷1000): ${String(ym.n).padStart(6)} satır,`
    + ` toplam ihracat ${Number(ym.mik ?? 0).toLocaleString('tr-TR')} adet`);

  if (!YAZ) { console.log('   (--yaz verilmedi, uygulanmadı)'); continue; }
  if (!Number(hv.n) && !Number(ym.n)) { console.log('   değişecek satır yok'); continue; }

  // Geri alınabilsin diye etkilenecek satırların tamamını yedekle.
  const etkilenen = await sorgu(`SELECT * FROM ${h.tablo}
    WHERE (${hayvanKosul}) OR (${yumurtaKosul})`);
  mkdirSync(YEDEK_DIZIN, { recursive: true });
  writeFileSync(`${YEDEK_DIZIN}/${h.tablo}-birim-oncesi.json`, JSON.stringify(etkilenen, null, 1));
  console.log(`   yedek: ${etkilenen.length} satır`);

  await dosyaCalistir(`
    UPDATE ${h.tablo} SET miktar_birim='BAŞ' WHERE ${hayvanKosul};
    UPDATE ${h.tablo}
       SET ${h.ihr} = ${h.ihr} / 1000.0,
           ${h.ith} = ${h.ith} / 1000.0,
           miktar_birim = '1000ADET'
     WHERE ${yumurtaKosul};`);

  const [kalanHv] = await sorgu(`SELECT COUNT(*) n FROM ${h.tablo} WHERE ${hayvanKosul}`);
  const [kalanYm] = await sorgu(`SELECT COUNT(*) n FROM ${h.tablo} WHERE ${yumurtaKosul}`);
  if (Number(kalanHv.n) || Number(kalanYm.n)) {
    throw new Error(`dönüşüm eksik kaldı: hayvan ${kalanHv.n}, yumurta ${kalanYm.n}`);
  }
  console.log('   ✓ uygulandı');
}
