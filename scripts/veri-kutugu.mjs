#!/usr/bin/env node
/**
 * Veri kaynağı kütüğü — hangi tabloyu kim okuyor, kim besliyor, ne kadar taze.
 *
 * ─── NEDEN VAR ──────────────────────────────────────────────────────────────
 * Pro ile Basic aynı konuyu FARKLI tablodan okuyabiliyor. Ölçüldü: 60 + 37
 * tablonun yalnız 22'si ortak. Bu, "iki ekran" sorunu değil "iki gerçek"
 * sorunu — aynı sayı iki yerde farklı çıkabiliyor.
 *
 * Fatura bir kez kesildi: TÜFE Basic'te Temmuz'a kadar güncelken Pro'da
 * NİSAN'da duruyordu, çünkü Pro `tuik_fiyatendex`i okuyor ve o tablonun TÜFE
 * ailesini hiçbir iş beslemiyordu (T-UFE ve T-GFE aileleri SDMX'ten geliyor,
 * TÜFE ise TÜİK'in SDMX kataloğunda YOK).
 *
 * Bunu kullanıcının fark etmesi gerekmemeli. Bu betik makinenin fark etmesini
 * sağlıyor: her tablonun son dönemini ölçüp beklenen tazelikle karşılaştırıyor.
 *
 * ─── NE YAPMAZ ──────────────────────────────────────────────────────────────
 * Hiçbir şey yazmaz, hiçbir şeyi düzeltmez. Yalnız ölçer ve raporlar. Bayat
 * bulursa çıkış kodu 1 — CI'da kapı olarak kullanılabilir.
 *
 * ─── KULLANIM ───────────────────────────────────────────────────────────────
 *   node scripts/veri-kutugu.mjs             # tam rapor
 *   node scripts/veri-kutugu.mjs --bayat     # yalnız sorunlular
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const YALNIZ_BAYAT = process.argv.includes('--bayat');
const KOK = path.resolve(import.meta.dirname, '..');
const DB_BASIC = 'tarpovizyon-basic';

/* ── 1. Uç → tablo (worker yapılandırmasından) ──────────────────────────── */

const workerSrc = fs.readFileSync(
  path.join(KOK, 'workers/tarpovizyon-api/src/index.js'), 'utf8');
const ucTablo = new Map();
const ucDb = new Map();
for (const m of workerSrc.matchAll(
  /'([a-z0-9][a-z0-9/_-]*)':\s*\{([^}]*?)table:\s*'([A-Za-z_]+)'/g)) {
  ucTablo.set(m[1], m[3]);
  ucDb.set(m[1], /db:\s*'DUNYA'/.test(m[2]) ? 'DUNYA' : 'BASIC');
}

/* ── 2. Kimin okuduğu (kaynak taraması) ─────────────────────────────────── */

function uclariTopla(dizinler) {
  const bulunan = new Set();
  const gez = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (!/graphify-out|node_modules/.test(p)) gez(p);
      } else if (/\.(ts|tsx)$/.test(e.name)) {
        const s = fs.readFileSync(p, 'utf8');
        for (const m of s.matchAll(/'([a-z0-9][a-z0-9/_-]*)'/g)) {
          if (ucTablo.has(m[1])) bulunan.add(m[1]);
        }
      }
    }
  };
  dizinler.forEach((d) => gez(path.join(KOK, d)));
  return bulunan;
}

const proUc = uclariTopla(['src/pages', 'src/components']);
const basicUc = uclariTopla(['src/tarpovizyon-basic']);

/* ── 3. Kimin beslediği ─────────────────────────────────────────────────── */

const datasets = fs.readFileSync(path.join(KOK, 'scripts/tuik-sync/datasets.mjs'), 'utf8');
const gunlukSenkron = new Set(
  [...datasets.matchAll(/table:\s*'([a-z_]+)'/g)].map((m) => m[1]));

/** Elle çalıştırılan yükleyiciler → yazdıkları tablolar. */
const elleYazan = new Map();
for (const f of fs.readdirSync(path.join(KOK, 'scripts'))) {
  if (!f.endsWith('.mjs')) continue;
  const s = fs.readFileSync(path.join(KOK, 'scripts', f), 'utf8');
  for (const m of s.matchAll(/(?:INSERT INTO|REPLACE INTO|UPDATE)\s+([a-z_]+)/g)) {
    if (m[1] === 'veri_damga') continue;
    if (!elleYazan.has(m[1])) elleYazan.set(m[1], new Set());
    elleYazan.get(m[1]).add(f);
  }
}

/* ── 4. Tazelik ölçümü ──────────────────────────────────────────────────── */

function d1(db, sql) {
  const cikti = execFileSync('npx', [
    'wrangler', 'd1', 'execute', db, '--remote', '--json', '--command', sql,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const i = cikti.indexOf('[');
  if (i < 0) throw new Error('beklenmeyen çıktı');
  return JSON.parse(cikti.slice(i))[0].results;
}

/**
 * Tablonun zaman sütununu bulur.
 *
 * DDL metnini ayrıştırmak yerine PRAGMA: tırnaklı ve tipsiz sütunlar DDL
 * deseninden kaçıyordu ve 20 tablo "?" olarak raporlanıyordu.
 */
function zamanSutunu(db, tablo) {
  try {
    const adlar = d1(db, `PRAGMA table_info("${tablo}")`).map((r) => r.name);
    /* `yearcode` FAO'nun, `tahmin_yil`/`model_tarihi` tahmin tablosunun kendi
       adlandırması. Aday listesi kısa olduğu için bu üç tablo "?" düşüyordu —
       zaman sütunları OLMASINA rağmen ölçülmüyorlardı. */
    for (const aday of ['tarih', 'donem', 'yil', 'year', 'yearcode', 'tahmin_yil', 'model_tarihi']) {
      const bul = adlar.find((a) => a.toLowerCase() === aday);
      if (bul) return bul;
    }
    // Geniş biçim: y2025 / "2025" gibi yıl sütunları
    const yilSut = adlar.filter((a) => /^y?(19|20)\d\d$/.test(a)).sort();
    if (yilSut.length) return { genis: yilSut };
    return null;
  } catch { return null; }
}

function sonDonem(db, tablo) {
  const z = zamanSutunu(db, tablo);
  if (!z) return null;
  try {
    if (typeof z === 'object') {
      // Geniş biçim: DOLU olan en son yıl sütunu
      for (const s of [...z.genis].reverse()) {
        const r = d1(db, `SELECT COUNT(*) n FROM "${tablo}" WHERE "${s}" IS NOT NULL AND "${s}"<>0`);
        if (Number(r[0]?.n) > 0) return s.replace(/^y/, '');
      }
      return null;
    }
    const r = d1(db, `SELECT MAX("${z}") v FROM "${tablo}"`);
    return r[0]?.v == null ? null : String(r[0].v).slice(0, 10);
  } catch { return null; }
}

/* ── 5. Rapor ───────────────────────────────────────────────────────────── */

const bugun = new Date();
/** Dönem metnini "kaç ay geride" sayısına çevirir. */
function gecikmeAy(donem) {
  if (!donem) return null;
  const m = String(donem).match(/^(\d{4})(?:-(\d{2}))?/);
  if (!m) return null;
  const yil = Number(m[1]);
  const ay = m[2] ? Number(m[2]) : 12; // yıllık seride yılın sonu varsayılır
  return (bugun.getFullYear() - yil) * 12 + (bugun.getMonth() + 1 - ay);
}

/*
 * ─── DÖNEMSİZ TABLOLAR: İKİNCİ ÖLÇÜM ────────────────────────────────────────
 * Tabloların bir bölümünde zaman sütunu HİÇ YOK — `tr_yeterlilikler`,
 * `makro_veriler`, `il_bal_cesitleri`, `*_snapshot` gibi tek vintajlı özetler.
 * Bunlar rapora "?" düşüyordu ve "?" hiçbir şey söylemiyordu: tablo dün de
 * yazılmış olabilirdi, üç yıl önce de. Ölçülemeyen tablo, ölçülüp temiz çıkan
 * tabloyla aynı satıra yazılınca denetimin kendisi kör nokta üretiyor.
 *
 * `veri_damga` tam bu boşluğu dolduruyor: D1'e yazan her yol o tablonun
 * damgasını ilerletiyor, yani "içerik ne kadar eski" ölçülemese de "en son ne
 * zaman DOKUNULDU" ölçülebiliyor. Rapor artık üç durumu ayırıyor:
 *
 *   dönem var           → içerik tazeliği (asıl ölçüm)
 *   dönem yok, damga var → yazma tazeliği  ("yazıldı: 2026-08-14")
 *   ikisi de yok        → SESSİZ — denetlenemiyor
 *
 * SESSİZ olanlar çıkış kodunu ETKİLEMİYOR. Bunlar "bayat veri" değil
 * "denetlenemeyen tablo": farklı bir iş gerektiriyorlar (tabloya yıl sütunu
 * eklemek ya da yazan yolu damgaya bağlamak). İkisini aynı alarma koymak,
 * gerçek bayatlık alarmını gürültüye boğardı.
 */
const damgalar = new Map();
for (const db of [DB_BASIC, 'tarpovizyon-dunya']) {
  try {
    for (const r of d1(db, 'SELECT tablo, damga FROM veri_damga')) {
      damgalar.set(`${db}|${r.tablo}`, Number(r.damga));
    }
  } catch { /* damga tablosu o DB'de yoksa sessiz geç */ }
}

const tablolar = new Map();
for (const [uc, tbl] of ucTablo) {
  if (!proUc.has(uc) && !basicUc.has(uc)) continue;
  if (!tablolar.has(tbl)) {
    tablolar.set(tbl, { db: ucDb.get(uc), pro: false, basic: false, uclar: [] });
  }
  const k = tablolar.get(tbl);
  if (proUc.has(uc)) k.pro = true;
  if (basicUc.has(uc)) k.basic = true;
  k.uclar.push(uc);
}

const satirlar = [];
for (const [tbl, k] of [...tablolar].sort()) {
  const db = k.db === 'DUNYA' ? 'tarpovizyon-dunya' : DB_BASIC;
  const donem = sonDonem(db, tbl);
  const gecikme = gecikmeAy(donem);
  const besleyen = gunlukSenkron.has(tbl) ? 'günlük senkron'
    : elleYazan.has(tbl) ? [...elleYazan.get(tbl)].join(', ')
      : '—';
  const damga = damgalar.get(`${db}|${tbl}`);
  satirlar.push({
    tablo: tbl,
    okuyan: k.pro && k.basic ? 'İKİSİ' : k.pro ? 'Pro' : 'Basic',
    besleyen,
    donem: donem ?? (damga ? `yaz.${new Date(damga).toISOString().slice(0, 7)}` : 'SESSİZ'),
    gecikme,
    /* Dönemsiz tabloda gecikme yerine yazma yaşı — eşikle karşılaştırılmıyor,
       yalnız raporlanıyor; yazma tazeliği içerik tazeliğini kanıtlamaz. */
    yazmaAyi: donem == null && damga
      ? Math.round((Date.now() - damga) / (30 * 864e5)) : null,
    sessiz: donem == null && !damga,
  });
}

/*
 * ─── EŞİK SERİ TİPİNE GÖRE ──────────────────────────────────────────────────
 * İlk sürümde tek eşik (6 ay) vardı ve rapor yanlış alarmla doluydu: TÜİK
 * yıllık serileri bir yıl gecikmeli yayımlıyor (2025 verisi 2026'da), yani
 * "2025" bir yıllık seride TAZEdir. Aylık bir seride ise 2025 bayattır.
 *
 * Bu yüzden eşik dönemin biçiminden çıkıyor:
 *   YYYY-MM(-DD) → aylık seri  → 4 ay
 *   YYYY         → yıllık seri → 20 ay (bir yayım döngüsü + pay)
 *   fao_/global_ → FAO         → 30 ay (FAO daha da gecikmeli)
 *
 * Güvenilmeyen rapor, rapor olmamasından kötüdür: her yanlış alarm
 * okuyucunun bir sonraki gerçek alarmı da yok saymasına yol açar.
 */
const esik = (t, donem) => {
  if (/^fao_|^global_/.test(t)) return 30;
  return /^\d{4}-\d{2}/.test(String(donem)) ? 4 : 20;
};

const bayat = satirlar.filter((s) => s.gecikme != null && s.gecikme > esik(s.tablo, s.donem));

const yaz = (s) => {
  const bayrak = s.sessiz ? 'SESSİZ'
    : s.gecikme == null ? ' yazma'
      : s.gecikme > esik(s.tablo, s.donem) ? ' BAYAT' : '  ok  ';
  console.log(`${bayrak} ${s.tablo.padEnd(38)} ${s.okuyan.padEnd(6)} ${String(s.donem).padEnd(13)} ${s.besleyen}`);
};

if (!YALNIZ_BAYAT) {
  console.log(`\n${' '.repeat(7)}${'TABLO'.padEnd(38)} ${'OKUYAN'.padEnd(6)} ${'SON DÖNEM'.padEnd(11)} BESLEYEN`);
  console.log('-'.repeat(104));
  satirlar.forEach(yaz);
  const ortak = satirlar.filter((s) => s.okuyan === 'İKİSİ').length;
  console.log('-'.repeat(104));
  console.log(`toplam ${satirlar.length} tablo · ikisinin ortak okuduğu: ${ortak} · beslenmeyen: ${satirlar.filter((s) => s.besleyen === '—').length}`);
} else {
  bayat.forEach(yaz);
}

const sessizler = satirlar.filter((s) => s.sessiz);
if (sessizler.length) {
  console.log(`\n${sessizler.length} tablo DENETLENEMİYOR (zaman sütunu da yazma damgası da yok):`);
  console.log(`  ${sessizler.map((s) => s.tablo).join(', ')}`);
  console.log('  Bunlar sessizce donabilir. Çözüm: tabloya dönem sütunu eklemek');
  console.log('  ya da yazan yolu veri_damga\'ya bağlamak.');
}

if (bayat.length) {
  console.log(`\n${bayat.length} tablo eşiğin ötesinde bayat.`);
  process.exit(1);
}
console.log('\nBayat tablo yok.');
