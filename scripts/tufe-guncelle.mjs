#!/usr/bin/env node
/**
 * TÜFE aylık güncelleme — yarı otomatik.
 *
 * ─── NEDEN TAM OTOMATİK DEĞİL ───────────────────────────────────────────────
 * TÜFE, TÜİK'in SDMX kataloğunda YOK (406 akış tarandı; "fiyat" geçen 14 akışın
 * hepsi üretici fiyat endeksi). Yalnızca haber bülteni olarak yayımlanıyor ve
 * bültenin JSON uçları (`/api/tr/press/*`) Node'dan 404 dönüyor — WAF
 * non-browser istemcileri engelliyor (ölçüldü: tarayıcıdan 200, Node'dan 404).
 * Sadece İMZALI İNDİRME bağlantısı Node'dan çalışıyor (curl'den de 403!).
 *
 * Bu yüzden tek elle adım şu: bağlantıyı tarayıcıdan al. Gerisi burada.
 *
 * ─── KULLANIM ───────────────────────────────────────────────────────────────
 * 1. Tarayıcıda https://veriportali.tuik.gov.tr/tr/press/<BULTEN_ID> aç.
 *    (Bülten id'sini bulmak için portal ana sayfasında konsoldan:
 *     fetch('/api/tr/press/indicators').then(r=>r.json()).then(j=>
 *       console.log(j.find(x=>x.id===1).pressUrl))  → "/tr/press/58297")
 * 2. Aynı sayfada konsolda:
 *      fetch('/api/tr/press/<ID>').then(r=>r.json()).then(j=>console.log(
 *        (j.data.tables||[]).filter(t=>/ana harcama gruplarının yıllık/i
 *          .test(t.name||t.title||'')).map(t=>'https://veriportali.tuik.gov.tr'+t.url)))
 * 3. Çıkan URL'yi buraya ver:
 *      node scripts/tufe-guncelle.mjs --yil 2026 --ay 7 --url "<URL>"
 *
 * Betik indirir, ayrıştırır, GÜVENLİK KONTROLÜ yapar ve SQL üretir.
 * `--yaz` verilirse wrangler ile doğrudan D1'e yazar.
 */

import * as XLSX from 'xlsx';

const arg = (ad) => {
  const i = process.argv.indexOf(`--${ad}`);
  return i > -1 ? process.argv[i + 1] : null;
};
const yil = Number(arg('yil'));
const ay = Number(arg('ay'));
const url = arg('url');
const yaz = process.argv.includes('--yaz');

if (!yil || !ay || !url) {
  console.error('Kullanım: node scripts/tufe-guncelle.mjs --yil 2026 --ay 7 --url "<imzalı-url>" [--yaz]');
  process.exit(1);
}

const API = process.env.TARPOVIZYON_API ?? 'https://tarpovizyon-api.veteroner.workers.dev';

/** Bültenin "ana harcama grupları" tablosundan TÜFE ve Gıda yıllık değişimi. */
async function bultendenOku(indirmeUrl) {
  const r = await fetch(indirmeUrl);
  if (!r.ok) {
    throw new Error(`İndirme başarısız (HTTP ${r.status}). `
      + 'Bağlantı süresi dolmuş olabilir — bülten sayfasından yenisini al.');
  }
  const buf = Buffer.from(await r.arrayBuffer());
  const wb = XLSX.read(buf);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false });

  /*
   * Satırı ADA göre buluyoruz, konuma göre değil: TÜİK tablo düzenini
   * (başlık satırı sayısı, dil sütunları) dönemden döneme oynatıyor.
   * 5. sütun = "Bir önceki yılın aynı ayına göre değişim (yıllık, %)".
   */
  const satir = (re) => rows.find((r2) => re.test(String((r2 ?? [])[0] ?? '')));
  const tufeSatir = satir(/^TÜFE/);
  const gidaSatir = satir(/^Gıda ve alkolsüz/);
  if (!tufeSatir || !gidaSatir) {
    throw new Error('Tablo düzeni tanınmadı: TÜFE / Gıda satırı bulunamadı.');
  }
  const say = (v) => Number(String(v ?? '').replace(',', '.'));
  return { tufe: say(tufeSatir[4]), gida: say(gidaSatir[4]) };
}

/** D1'deki mevcut seri — hem mükerrer kontrolü hem güvenlik kontrolü için. */
async function mevcutSeri() {
  const r = await fetch(`${API}/api/makro/tufe-aylik?limit=3000`);
  if (!r.ok) throw new Error(`D1 okunamadı (HTTP ${r.status})`);
  return (await r.json()).data ?? [];
}

const { tufe, gida } = await bultendenOku(url);
if (!Number.isFinite(tufe) || !Number.isFinite(gida)) {
  throw new Error(`Sayı ayrıştırılamadı: tufe=${tufe} gida=${gida}`);
}
console.log(`Bültenden okundu: ${yil}-${String(ay).padStart(2, '0')} → TÜFE %${tufe}, Gıda %${gida}`);

const seri = await mevcutSeri();
const zatenVar = seri.find((s) => Number(s.yil) === yil && Number(s.ay) === ay);
if (zatenVar) {
  console.log(`Bu dönem D1'de ZATEN VAR (tufe=${zatenVar.tufe}, gida=${zatenVar.gida_alkolsuz}). Yazılmadı.`);
  process.exit(0);
}

/*
 * ─── GÜVENLİK KONTROLÜ ──────────────────────────────────────────────────────
 * Yanlış bülteni (ör. başka bir ayınkini) yazmayı önlüyor: bültenin İÇİNDEKİ
 * bir önceki ay, D1'deki aynı ayla eşleşmeli. TÜİK zaman zaman geçmişi revize
 * ediyor, o yüzden eşleşmezse DURUYORUZ; sessizce üzerine yazmıyoruz.
 *
 * Not: bülten tablosu yalnızca kendi ayını taşıdığı için burada D1'in son
 * ayının BEKLENEN ay olduğunu doğruluyoruz (ör. Temmuz yazılacaksa son ay
 * Haziran olmalı) — atlanmış ay varsa uyarıyoruz.
 */
const sonSatir = [...seri].sort((a, b) => (a.yil * 100 + a.ay) - (b.yil * 100 + b.ay)).at(-1);
const beklenen = ay === 1 ? { yil: yil - 1, ay: 12 } : { yil, ay: ay - 1 };
if (!sonSatir || Number(sonSatir.yil) !== beklenen.yil || Number(sonSatir.ay) !== beklenen.ay) {
  console.error(`DURDU: D1'in son dönemi ${sonSatir?.yil}-${sonSatir?.ay}, `
    + `beklenen ${beklenen.yil}-${beklenen.ay}. Arada atlanmış ay var — önce onu yükle.`);
  process.exit(1);
}

const sql = `INSERT INTO tufe_aylik (yil, ay, tufe, gida_alkolsuz)
SELECT ${yil}, ${ay}, ${tufe}, ${gida}
WHERE NOT EXISTS (SELECT 1 FROM tufe_aylik WHERE yil=${yil} AND ay=${ay});`;

if (!yaz) {
  console.log('\n--- D1\'e yazmak için (--yaz ile otomatik de yapılır) ---');
  console.log(`cd workers/tarpovizyon-api && npx wrangler d1 execute tarpovizyon-basic --remote --command "${sql.replace(/\n/g, ' ')}"`);
  process.exit(0);
}

const { execFileSync } = await import('node:child_process');
execFileSync('npx', ['wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--command', sql],
  { cwd: 'workers/tarpovizyon-api', stdio: 'inherit', env: { ...process.env, LANG: 'en_US.UTF-8' } });
console.log('Yazıldı.');
