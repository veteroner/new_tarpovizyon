#!/usr/bin/env node
/**
 * D1 tazelik denetimi — hangi tablo hangi işe bağlı, hangisi öksüz.
 *
 * ─── NEDEN API DEĞİL, DOĞRUDAN SQL ──────────────────────────────────────────
 * Okuma API'si rota başına `maxLimit` uyguluyor (çoğu yerde 5000). Büyük
 * tablolar ürün/ülkeye göre sıralı olduğu için ilk 5000 satırın en büyük yılı
 * TABLONUN son yılı DEĞİL. Bu yolla yapılan bir denetim FAO üretim tablosunu
 * "2000'de kalmış" gösteriyordu; gerçekte 2024'teydi.
 *
 * Burada `MAX()` doğrudan D1'de hesaplanıyor — kırpma yok.
 *
 * Kullanım: node scripts/veri-tazeligi-denetimi.mjs [--json]
 */

import { execFileSync } from 'node:child_process';

const CWD = 'workers/tarpovizyon-api';
const ORTAM = { ...process.env, LANG: 'en_US.UTF-8' };
const DBLER = ['tarpovizyon-basic', 'tarpovizyon-dunya'];

/** Dönem taşıyabilecek sütunlar, öncelik sırasıyla. */
const DONEM_SUTUNLARI = ['tarih', 'yil', 'year', 'donem'];

/** Tek sorgu — ilk sonuç kümesini döndürür. */
function sorgu(db, sql) {
  return tumSonuclar(db, sql)[0] ?? [];
}

/*
 * Çoklu ifade (`;` ile ayrılmış) — her ifade için ayrı sonuç kümesi.
 *
 * NEDEN UNION DEĞİL: SQLite'ın "compound SELECT" terim sınırı var; 6 tablolu
 * bir UNION ALL bile `too many terms in compound SELECT (SQLITE_ERROR 7500)`
 * veriyor (alt sorgular da sayılıyor). Çoklu ifade bu sınıra takılmıyor.
 */
function tumSonuclar(db, sql) {
  const cikti = execFileSync('npx',
    ['wrangler', 'd1', 'execute', db, '--remote', '--json', '--command', sql],
    { cwd: CWD, env: ORTAM, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const bas = cikti.indexOf('[');
  if (bas < 0) throw new Error(`Beklenmeyen çıktı: ${cikti.slice(0, 120)}`);
  return JSON.parse(cikti.slice(bas)).map((k) => k.results ?? []);
}

/** Uzun sorguları öbekleyerek çalıştırır (tek komutta 85 tablo sığmıyor). */
function obekle(dizi, boy) {
  const o = [];
  for (let i = 0; i < dizi.length; i += boy) o.push(dizi.slice(i, i + boy));
  return o;
}

/*
 * ─── İŞ EŞLEMESİ ────────────────────────────────────────────────────────────
 * Hangi tabloyu hangi otomatik iş yazıyor. Elle tutuluyor çünkü bu bilgi
 * kodda tek bir yerde durmuyor: TÜİK senkronu datasets.mjs'te, FAO ayrı
 * betikte, TÜFE yarı otomatik betikte.
 */
const ISLER = {
  // scripts/tuik-sync/sync.mjs — günlük, GitHub Actions
  sut_urunleri_uretimi: 'TÜİK senkron (günlük)',
  kanatli_uretimleri: 'TÜİK senkron (günlük)',
  ufe_aylik: 'TÜİK senkron (günlük)',
  gfe_alt_grup_aylik: 'TÜİK senkron (günlük)',
  tuik_fiyatendex: 'TÜİK senkron (günlük)',
  tarim_madde_fiyat: 'TÜİK senkron (günlük)',
  tuik_sync_log: 'TÜİK senkron (günlük, kendi kaydı)',
  // scripts/fao-fpi-sync.mjs — günlük, GitHub Actions
  fao_urunler_aylik: 'FAO endeks senkronu (günlük)',
  // scripts/tufe-guncelle.mjs — elle, aylık
  tufe_aylik: 'TÜFE betiği (elle, aylık)',
  tufe_yillik_snapshot: 'TÜFE betiği (elle, aylık)',
  tufe_aylik_snapshot: 'TÜFE betiği (elle, aylık)',

  /*
   * ─── BU İKİ İŞ HARİTADA YOKTU ─────────────────────────────────────────
   * Denetim yalnızca üç işi biliyordu ve depoda dört tane var. Sonuç:
   * `.github/workflows/fao-yillik.yml` ile `tuik-disticaret.yml`in
   * tazelediği 12 tablo "öksüz" diye raporlanıyordu.
   *
   * Zararsız bir eksik değildi — rapora bakıp karar veriliyor. Gübre,
   * pestisit, arazi örtüsü ve üretici fiyat tabloları bakımsız sanılıp
   * elenebilirdi; oysa hepsinin haftalık işi var ve 2024'te olmalarının
   * sebebi FAO'nun kendisinin 2024'te olması.
   *
   * Yeni bir iş eklenince BURASI DA güncellenmeli.
   */

  // .github/workflows/fao-yillik.yml → scripts/fao-sync/sync.mjs (haftalık)
  fao_land_cover: 'FAO yıllık senkron (haftalık)',
  fao_input_pestisit_use: 'FAO yıllık senkron (haftalık)',
  fao_input_gubre_ticari: 'FAO yıllık senkron (haftalık)',
  fao_uretici_fiyat: 'FAO yıllık senkron (haftalık)',
  fao_nufus: 'FAO yıllık senkron (haftalık)',
  fao_nufus_istihdam_tarim: 'FAO yıllık senkron (haftalık)',
  fao_uretim_bitkisel_islenmis: 'FAO yıllık senkron (haftalık)',
  fao_uretim_hayvansal_islenmis: 'FAO yıllık senkron (haftalık)',

  // .github/workflows/tuik-disticaret.yml → scripts/tuik-disticaret/cek.mjs (günlük)
  tuik_ticaret_bitkisel: 'TÜİK dış ticaret (günlük)',
  tuik_ticaret_hayvansal: 'TÜİK dış ticaret (günlük)',
  bitkisel_tr_dis_ticaret: 'TÜİK dış ticaret (günlük, ikiz)',
  tr_dis_ticaret_hayvansal: 'TÜİK dış ticaret (günlük, ikiz)',
};

const rapor = [];

for (const db of DBLER) {
  /*
   * Tablo adları VE sütunları tek sorguda: `sqlite_master.sql` CREATE
   * ifadesini olduğu gibi tutuyor. 85 tablo için `pragma_table_info`'yu
   * UNION'lamak komut sınırını aşıyordu (ölçüldü: 2 tablo çalışıyor, 15
   * çalışmıyor); bu yol tek istekle bitiyor.
   */
  const semalar = sorgu(db,
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf%' ORDER BY name");
  const tablolar = semalar.map((r) => r.name);

  const sutunlar = {};
  for (const { name, sql } of semalar) {
    const ic = String(sql ?? '').replace(/^[^(]*\(/, '').replace(/\)[^)]*$/, '');
    sutunlar[name] = ic.split(/,(?![^(]*\))/)
      .map((p) => p.trim().split(/\s+/)[0].replace(/["`[\]]/g, ''))
      .filter((c) => c && !/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)$/i.test(c));
  }

  // Son dönem + satır sayısı — 20'şerli öbekler, çoklu ifade olarak
  for (const grup of obekle(tablolar, 20)) {
    const parcalar = grup.map((t) => {
      const s = sutunlar[t] ?? [];
      const d = DONEM_SUTUNLARI.find((x) => s.includes(x));
      // Aylık tablolarda (yil + ay) birlikte sıralanmalı; yoksa yalnızca yıl.
      const ayVar = d && s.includes('ay') && d !== 'tarih';
      const ifade = !d ? 'NULL'
        : ayVar ? `MAX(CAST("${d}" AS INTEGER)*100 + CAST("ay" AS INTEGER))`
          : d === 'tarih' ? 'MAX(CAST("tarih" AS TEXT))'
            : `MAX(CAST(substr(CAST("${d}" AS TEXT),1,4) AS INTEGER))`;
      return `SELECT '${t}' AS tablo, ${d ? `'${d}'` : 'NULL'} AS alan, `
        + `COUNT(*) AS satir, ${ifade} AS son FROM "${t}";`;
    });
    tumSonuclar(db, parcalar.join('\n')).forEach((kume) => {
      kume.forEach((r) => rapor.push({ db, tablo: r.tablo, alan: r.alan, satir: r.satir, son: r.son }));
    });
  }
}

/** "202607" → "2026-07", "2026-05-01 00:00" → "2026-05", 2024 → "2024" */
function bicimle(son, alan) {
  if (son === null || son === undefined) return null;
  const s = String(son);
  if (alan === 'tarih') return s.slice(0, 7);
  if (/^\d{6}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4)}`;
  return s;
}

const bugun = new Date();
const gecikmeAy = (son, alan) => {
  const b = bicimle(son, alan);
  if (!b) return null;
  const m = b.match(/^(\d{4})(?:-(\d{2}))?$/);
  if (!m) return null;
  const yil = Number(m[1]);
  const ay = m[2] ? Number(m[2]) : 12;
  return (bugun.getFullYear() - yil) * 12 + (bugun.getMonth() + 1 - ay);
};

const satirlar = rapor.map((r) => ({
  ...r,
  donem: bicimle(r.son, r.alan),
  gecikme: gecikmeAy(r.son, r.alan),
  is: ISLER[r.tablo] ?? null,
}));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(satirlar, null, 1));
  process.exit(0);
}

const bagli = satirlar.filter((r) => r.is);
const oksuzDonemli = satirlar.filter((r) => !r.is && r.donem);
const donemsiz = satirlar.filter((r) => !r.is && !r.donem);

const yaz = (r) => `  ${(r.donem ?? '—').padEnd(9)} ${String(r.gecikme ?? '').padStart(3)} ay  `
  + `${r.tablo.padEnd(38)} ${String(r.satir).padStart(7)} satır`;

console.log(`\n═══ OTOMATİK/YARI OTOMATİK İŞE BAĞLI (${bagli.length}) ═══`);
for (const is of [...new Set(bagli.map((r) => r.is))]) {
  console.log(`\n── ${is} ──`);
  bagli.filter((r) => r.is === is).forEach((r) => console.log(yaz(r)));
}

console.log(`\n═══ ÖKSÜZ — dönemi var, hiçbir işe bağlı değil (${oksuzDonemli.length}) ═══`);
oksuzDonemli.sort((a, b) => (b.gecikme ?? 0) - (a.gecikme ?? 0)).forEach((r) => console.log(yaz(r)));

console.log(`\n═══ DÖNEMSİZ — referans/katalog tabloları (${donemsiz.length}) ═══`);
donemsiz.forEach((r) => console.log(`  ${r.tablo.padEnd(38)} ${String(r.satir).padStart(7)} satır`));

console.log(`\nToplam ${satirlar.length} tablo · bağlı ${bagli.length} · öksüz ${oksuzDonemli.length} · dönemsiz ${donemsiz.length}`);
