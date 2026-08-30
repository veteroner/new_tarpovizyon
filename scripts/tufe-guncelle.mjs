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
import { damgaSql } from './lib/damga.mjs';

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

/*
 * ─── BÜLTEN ADI → D1 ADI ────────────────────────────────────────────────────
 * Bülten resmî uzun adları kullanıyor ("Konut, su, elektrik, gaz ve diğer
 * yakıtlar"), D1 kısa adları ("Konut"). Eşleme SIRAYA DEĞİL, desene göre:
 * TÜİK grup sırasını değiştirirse konum eşlemesi sessizce yanlış veri yazardı.
 *
 * `tufe_yillik_snapshot` 14 satır (TÜFE genel dahil), `tufe_aylik_snapshot`
 * 13 satır (genel endeks yok) — bülten satırı ikisinde de aynı.
 */
const GRUPLAR = [
  { re: /^TÜFE/, d1: 'TÜFE (Genel Endeks)', genel: true },
  { re: /^Gıda ve alkolsüz/, d1: 'Gıda ve alkolsüz içecekler' },
  { re: /^Alkollü içecekler/, d1: 'Alkollü içecekler ve tütün' },
  { re: /^Giyim ve ayakkabı/, d1: 'Giyim ve ayakkabı' },
  { re: /^Konut/, d1: 'Konut' },
  { re: /^Mobilya/, d1: 'Mobilya ve ev eşyası' },
  { re: /^Sağlık/, d1: 'Sağlık' },
  { re: /^Ulaştırma/, d1: 'Ulaştırma' },
  { re: /^Bilgi ve iletişim/, d1: 'Bilgi ve iletişim' },
  { re: /^Eğlence/, d1: 'Eğlence ve kültür' },
  { re: /^Eğitim/, d1: 'Eğitim' },
  { re: /^Lokantalar/, d1: 'Lokanta ve konaklama' },
  { re: /^Sigorta ve finansal/, d1: 'Sigorta ve finansal hizmetler' },
  { re: /^Kişisel bakım/, d1: 'Çeşitli mal ve hizmetler' },
];

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

  /*
   * Grup kırılımı da aynı tablodan: sütun 2 = bir önceki aya göre (aylık %),
   * sütun 4 = bir önceki yılın aynı ayına göre (yıllık %). Sayfadaki iki
   * "ana gruplara göre" grafiği bunlardan besleniyor; aynı dosyadan
   * okunduğu için trend grafiğiyle ASLA farklı döneme düşemezler.
   */
  const gruplar = [];
  for (const g of GRUPLAR) {
    const r2 = satir(g.re);
    if (!r2) {
      throw new Error(`Grup bulunamadı: ${g.d1}. TÜİK tablo düzenini değiştirmiş olabilir.`);
    }
    gruplar.push({ d1: g.d1, genel: Boolean(g.genel), aylik: say(r2[2]), yillik: say(r2[4]) });
  }

  return { tufe: say(tufeSatir[4]), gida: say(gidaSatir[4]), gruplar };
}

/** D1'deki mevcut seri — hem mükerrer kontrolü hem güvenlik kontrolü için. */
async function mevcutSeri() {
  const r = await fetch(`${API}/api/makro/tufe-aylik?limit=3000`);
  if (!r.ok) throw new Error(`D1 okunamadı (HTTP ${r.status})`);
  return (await r.json()).data ?? [];
}

const { tufe, gida, gruplar } = await bultendenOku(url);
if (!Number.isFinite(tufe) || !Number.isFinite(gida)) {
  throw new Error(`Sayı ayrıştırılamadı: tufe=${tufe} gida=${gida}`);
}
console.log(`Bültenden okundu: ${yil}-${String(ay).padStart(2, '0')} → TÜFE %${tufe}, Gıda %${gida}`);
console.log(`Ana harcama grubu: ${gruplar.length} satır ayrıştırıldı.`);

const seri = await mevcutSeri();
const zatenVar = seri.find((s) => Number(s.yil) === yil && Number(s.ay) === ay);

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
if (!zatenVar) {
  const sonSatir = [...seri].sort((a, b) => (a.yil * 100 + a.ay) - (b.yil * 100 + b.ay)).at(-1);
  const beklenen = ay === 1 ? { yil: yil - 1, ay: 12 } : { yil, ay: ay - 1 };
  if (!sonSatir || Number(sonSatir.yil) !== beklenen.yil || Number(sonSatir.ay) !== beklenen.ay) {
    console.error(`DURDU: D1'in son dönemi ${sonSatir?.yil}-${sonSatir?.ay}, `
      + `beklenen ${beklenen.yil}-${beklenen.ay}. Arada atlanmış ay var — önce onu yükle.`);
    process.exit(1);
  }
} else {
  console.log(`Aylık seri: ${yil}-${ay} zaten var (tufe=${zatenVar.tufe}), tekrar yazılmayacak.`);
}

const tirnak = (s) => `'${String(s).replace(/'/g, "''")}'`;

/*
 * ─── SNAPSHOT'LAR NEDEN HER SEFERİNDE SIFIRLANIYOR ──────────────────────────
 * `tufe_yillik_snapshot` / `tufe_aylik_snapshot` bir SERİ değil, TEK DÖNEMİN
 * fotoğrafı: sayfadaki "Ana Gruplara Göre" grafikleri bunlardan besleniyor.
 * Dönem sütunları yok, o yüzden birikmemeleri gerekiyor — DELETE + INSERT.
 *
 * Aylık seriyle AYNI dosyadan yazılıyorlar; böylece trend grafiği Temmuz'u,
 * grup grafikleri Mayıs'ı gösteren duruma (2026-08'de yaşandı) bir daha
 * düşülmüyor.
 */
const sqlParcalari = [];

if (!zatenVar) {
  sqlParcalari.push(`INSERT INTO tufe_aylik (yil, ay, tufe, gida_alkolsuz)
SELECT ${yil}, ${ay}, ${tufe}, ${gida}
WHERE NOT EXISTS (SELECT 1 FROM tufe_aylik WHERE yil=${yil} AND ay=${ay});`);
}

sqlParcalari.push(
  'DELETE FROM tufe_yillik_snapshot;',
  'INSERT INTO tufe_yillik_snapshot (harcama_grubu, yillik_degisim) VALUES\n'
    + gruplar.map((g) => `(${tirnak(g.d1)}, ${g.yillik})`).join(',\n') + ';',
  'DELETE FROM tufe_aylik_snapshot;',
  // Aylık grafikte genel endeks yok — 13 satır (bkz. GRUPLAR yorumu).
  'INSERT INTO tufe_aylik_snapshot (harcama_grubu, aylik_degisim) VALUES\n'
    + gruplar.filter((g) => !g.genel).map((g) => `(${tirnak(g.d1)}, ${g.aylik})`).join(',\n') + ';',
);

/*
 * Önbellek damgası — aynı yığının SONUNDA, yazmalardan sonra. Bu satırlar
 * olmadan TÜFE D1'de güncellenir ama sayfa bir saate kadar eski değeri
 * göstermeye devam eder: Worker'ın okuma yanıtları kenar önbelleğinde duruyor
 * ve anahtarları tablonun damgasını taşıyor.
 */
sqlParcalari.push(damgaSql(['tufe_aylik', 'tufe_yillik_snapshot', 'tufe_aylik_snapshot']));

const sql = sqlParcalari.join('\n');

if (!yaz) {
  console.log('\n--- Çalıştırılacak SQL (--yaz ile otomatik uygulanır) ---\n');
  console.log(sql);
  process.exit(0);
}

const { execFileSync } = await import('node:child_process');
execFileSync('npx', ['wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--command', sql],
  { cwd: 'workers/tarpovizyon-api', stdio: 'inherit', env: { ...process.env, LANG: 'en_US.UTF-8' } });
console.log('\nYazıldı: aylık seri + iki snapshot tablosu.');
