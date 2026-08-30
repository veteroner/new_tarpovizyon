/**
 * İkiz dış ticaret tabloları.
 *
 * ─── NEDEN İKİ AİLE VAR ─────────────────────────────────────────────────────
 * Aynı veri D1'de iki ayrı tablo ailesinde duruyor ve farklı sayfalar farklı
 * aileyi okuyor:
 *
 *   tuik_ticaret_hayvansal / tuik_ticaret_bitkisel
 *       → /tarpovizyon/ticaret sekmeleri. 4 toplama seviyesini birden tutuyor.
 *   tr_dis_ticaret_hayvansal / bitkisel_tr_dis_ticaret
 *       → basic modülünün "Dış Ticaret" sayfaları.
 *
 * İkizler, ana tablonun YALNIZCA `ülke|ürün` seviyesinin kopyası; sütun adları
 * farklı (alt_urun_kod, ulke_kod, ihracat_miktar…) ve duzey_ sütunları yok.
 * 2025-05'te birebir doğrulandı: hayvansal 928 satır / $134.918.844,
 * bitkisel 1844 satır / $876.672.845.
 *
 * Sadece `tuik_*`'ı güncellemek YETMİYOR — kullanıcı uygulamada eski veriyi
 * görmeye devam eder, çünkü baktığı sayfa ikizi okuyor. Bu bir kez yaşandı.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { sorgu, dosyaCalistir, s, n } from './d1.mjs';
import { damgaSql } from '../lib/damga.mjs';

export const YEDEK_DIZIN = new URL('./yedek/', import.meta.url).pathname;

export const IKIZLER = {
  hayvansal: {
    ana: 'tuik_ticaret_hayvansal',
    tablo: 'tr_dis_ticaret_hayvansal',
    sutunlar: ['yil', 'ay', 'ana_urun', 'alt_urun_kod', 'alt_urun', 'ulke_kod', 'ulke',
      'miktar_birim', 'ihracat_miktar', 'ithalat_miktar', 'deger_birim',
      'ihracat_deger', 'ithalat_deger'],
    sayisal: new Set(['yil', 'ay', 'alt_urun_kod', 'ulke_kod', 'ihracat_miktar',
      'ithalat_miktar', 'ihracat_deger', 'ithalat_deger']),
    esle: (r) => ({
      yil: r.yil, ay: r.ay, ana_urun: r.ana_urun,
      alt_urun_kod: r.alt_urunkod, alt_urun: r.alt_urun,
      ulke_kod: r.ulkekod, ulke: r.ulke, miktar_birim: r.miktar_birim,
      ihracat_miktar: r.ihracat_mik, ithalat_miktar: r.ithalat_mik,
      deger_birim: r.deger_birim,
      ihracat_deger: r.ihracat_deger, ithalat_deger: r.ithalat_deger,
    }),
  },
  bitkisel: {
    ana: 'tuik_ticaret_bitkisel',
    tablo: 'bitkisel_tr_dis_ticaret',
    // Bu ikizde alt ürün sütunları HİÇ YOK — yalnızca grup düzeyi.
    sutunlar: ['yil', 'ay', 'ana_urun', 'ulke_kod', 'ulke', 'miktar_birim',
      'ihracat_miktar', 'ithalat_miktar', 'deger_birim', 'ihracat_deger', 'ithalat_deger'],
    sayisal: new Set(['yil', 'ay', 'ulke_kod', 'ihracat_miktar', 'ithalat_miktar',
      'ihracat_deger', 'ithalat_deger']),
    esle: (r) => ({
      yil: r.yil, ay: r.ay, ana_urun: r.ana_urun,
      ulke_kod: r.ulkekod, ulke: r.ulke, miktar_birim: r.miktar_birim,
      ihracat_miktar: r.ihracat_mik, ithalat_miktar: r.ithalat_mik,
      deger_birim: r.deger_birim,
      ihracat_deger: r.ihracat_deger, ithalat_deger: r.ithalat_deger,
    }),
  },
};

/**
 * İkizin bir dönemini `ülke|ürün` satırlarından yeniden yazar.
 * `satirlar` verilmezse ANA TABLODAN okunur — Qlik'e gitmeden tazeleme.
 */
export async function ikiziYaz(ad, yil, ay, satirlar = null) {
  const ik = IKIZLER[ad];
  if (!ik) throw new Error(`ikiz tanımı yok: ${ad}`);

  const kaynak = satirlar
    ? satirlar.filter((r) => r.duzey_1 === 'ülke' && r.duzey_2 === 'ürün')
    : await sorgu(`SELECT * FROM ${ik.ana}
        WHERE yil=${yil} AND ay=${ay} AND duzey_1='ülke' AND duzey_2='ürün'`);

  if (!kaynak.length) {
    console.log(`   ⚠ ${ik.tablo} ${yil}-${String(ay).padStart(2, '0')}: kaynak satır yok, dokunulmadı`);
    return 0;
  }

  const say = async () => Number(
    (await sorgu(`SELECT COUNT(*) n FROM ${ik.tablo} WHERE yil=${yil} AND ay=${ay}`))[0].n);

  const varOlan = await say();
  if (varOlan) {
    // Geri dönülebilir olsun: silmeden önce yedekle.
    const eski = await sorgu(`SELECT * FROM ${ik.tablo} WHERE yil=${yil} AND ay=${ay}`);
    if (eski.length !== varOlan) throw new Error(`ikiz yedeği eksik: ${eski.length}/${varOlan}`);
    mkdirSync(YEDEK_DIZIN, { recursive: true });
    writeFileSync(`${YEDEK_DIZIN}/${ik.tablo}-${yil}-${String(ay).padStart(2, '0')}.json`,
      JSON.stringify(eski, null, 1));
    await dosyaCalistir(`DELETE FROM ${ik.tablo} WHERE yil=${yil} AND ay=${ay};`);
    if (await say()) throw new Error(`${ik.tablo}: silme tamamlanmadı`);
  }

  const eslenmis = kaynak.map(ik.esle);
  const parca = [];
  for (let i = 0; i < eslenmis.length; i += 200) {
    const obek = eslenmis.slice(i, i + 200)
      .map((r) => `(${ik.sutunlar.map((c) => (ik.sayisal.has(c) ? n(r[c]) : s(r[c]))).join(',')})`)
      .join(',\n');
    parca.push(`INSERT INTO ${ik.tablo} (${ik.sutunlar.join(',')}) VALUES\n${obek};`);
  }
  /*
   * Yığının SONUNA önbellek damgası. İkizi tazeleyip damgayı atlamak, tam da
   * bu dosyanın başında anlatılan hatayı geri getirirdi: veri D1'de doğru, ama
   * kullanıcı sayfada eskisini görüyor — bu kez sebep yanlış tablo değil,
   * Worker'ın kenar önbelleği olurdu.
   */
  parca.push(damgaSql([ik.tablo]));
  await dosyaCalistir(parca.join('\n'));
  const sonra = await say();
  console.log(`   ✓ ${ik.tablo} ${yil}-${String(ay).padStart(2, '0')}: ${varOlan} → ${sonra} satır`);
  return sonra;
}
