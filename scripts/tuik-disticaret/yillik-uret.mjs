#!/usr/bin/env node
/**
 * Yıllık (`duzey_3='yil'`, `ay=0`) satırlarını aylıklardan yeniden üretir.
 *
 *   node scripts/tuik-disticaret/yillik-uret.mjs --yil 2026 --dogrula
 *   node scripts/tuik-disticaret/yillik-uret.mjs --yil 2026 --yaz
 *
 * ─── NEDEN AYRI BİR ADIM ────────────────────────────────────────────────────
 * `tuik_ticaret_*` tabloları her dönemi 4 toplama seviyesinde tutuyor, AMA bir
 * de üçüncü bir eksen var: `duzey_3` = 'ay' (aylık) veya 'yil' (yıla kadar
 * kümülatif, `ay=0`). Sayfaların yıllık kartları `duzey_3='yil'` satırlarını
 * okuyor — Qlik'ten çekilen aylık veriyi yazmak TEK BAŞINA yetmiyor, yıllık
 * satırlar eski kalıyor ve kullanıcı uygulamada güncellenmemiş rakam görüyor.
 *
 * Kural 2025'te iki tabloda da birebir doğrulandı: yıllık satırların toplamı =
 * aynı yılın aylık satırlarının toplamı (hayvansal $1.573.009.646, bitkisel
 * $11.318.596.270). Bu yüzden yıllık satırlar TÜRETİLİYOR, ayrıca çekilmiyor.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { sorgu, dosyaCalistir } from './d1.mjs';
import { YEDEK_DIZIN } from './ikizler.mjs';

const TABLOLAR = ['tuik_ticaret_hayvansal', 'tuik_ticaret_bitkisel'];

const arg = process.argv.slice(2);
const deger = (a) => { const i = arg.indexOf(a); return i >= 0 ? arg[i + 1] : null; };
const YIL = Number(deger('--yil'));
const YAZ = arg.includes('--yaz');
if (!YIL) throw new Error('--yil gerekli');

const para = (v) => '$' + Math.round(Number(v ?? 0)).toLocaleString('tr-TR');

/**
 * Aylıklardan türetilecek yıllık satırların SELECT'i.
 * GROUP BY, yıllık satırın kimliğini oluşturan tüm boyutları içeriyor;
 * duzey_3 'yil' ve ay 0 sabit yazılıyor.
 */
const turetSelect = (tablo, yil) => `
  SELECT duzey_1, duzey_2, 'yil' duzey_3, ana_urun, ${yil} yil, 0 ay,
         alt_urunkod, alt_urun, ulkekod, ulke, miktar_birim,
         SUM(ihracat_mik) ihracat_mik, SUM(ithalat_mik) ithalat_mik,
         deger_birim,
         SUM(ihracat_deger) ihracat_deger, SUM(ithalat_deger) ithalat_deger
  FROM ${tablo}
  WHERE yil = ${yil} AND duzey_3 = 'ay'
  GROUP BY duzey_1, duzey_2, ana_urun, alt_urunkod, ulkekod`;

for (const tablo of TABLOLAR) {
  console.log(`\n── ${tablo} · ${YIL} ──`);

  const mevcut = (await sorgu(`SELECT COUNT(*) n, COALESCE(SUM(ihracat_deger),0) ihr
    FROM ${tablo} WHERE yil=${YIL} AND duzey_3='yil'`))[0];
  const turetilen = (await sorgu(`SELECT COUNT(*) n, COALESCE(SUM(ihracat_deger),0) ihr
    FROM (${turetSelect(tablo, YIL)})`))[0];

  console.log(`   mevcut yıllık : ${String(mevcut.n).padStart(5)} satır  ihracat ${para(mevcut.ihr)}`);
  console.log(`   türetilecek   : ${String(turetilen.n).padStart(5)} satır  ihracat ${para(turetilen.ihr)}`);

  if (!Number(turetilen.n)) { console.log('   ⚠ aylık satır yok — atlandı'); continue; }
  if (!YAZ) { console.log('   (--yaz verilmedi, yazılmadı)'); continue; }

  if (Number(mevcut.n)) {
    // Geri dönülebilir olsun: silmeden önce yedekle.
    const eski = await sorgu(`SELECT * FROM ${tablo} WHERE yil=${YIL} AND duzey_3='yil'`);
    if (eski.length !== Number(mevcut.n)) {
      throw new Error(`yedek eksik: ${eski.length}/${mevcut.n}`);
    }
    mkdirSync(YEDEK_DIZIN, { recursive: true });
    writeFileSync(`${YEDEK_DIZIN}/${tablo}-${YIL}-yillik.json`, JSON.stringify(eski, null, 1));
    await dosyaCalistir(`DELETE FROM ${tablo} WHERE yil=${YIL} AND duzey_3='yil';`);
    const kalan = (await sorgu(`SELECT COUNT(*) n FROM ${tablo} WHERE yil=${YIL} AND duzey_3='yil'`))[0].n;
    if (Number(kalan)) throw new Error(`silme tamamlanmadı, ${kalan} satır kaldı`);
    console.log(`   ✓ eski ${mevcut.n} satır silindi (yedeklendi)`);
  }

  // Türetme tek SQL ifadesiyle: veri D1'den çıkmıyor.
  await dosyaCalistir(`
    INSERT INTO ${tablo} (duzey_1,duzey_2,duzey_3,ana_urun,yil,ay,alt_urunkod,alt_urun,
      ulkekod,ulke,miktar_birim,ihracat_mik,ithalat_mik,deger_birim,ihracat_deger,ithalat_deger)
    ${turetSelect(tablo, YIL)};`);

  const sonra = (await sorgu(`SELECT COUNT(*) n, COALESCE(SUM(ihracat_deger),0) ihr
    FROM ${tablo} WHERE yil=${YIL} AND duzey_3='yil'`))[0];
  console.log(`   ✓ yazıldı: ${sonra.n} satır  ihracat ${para(sonra.ihr)}`);
}
