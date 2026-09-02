#!/usr/bin/env node
/**
 * TÜİK Veri Portalı → hayvancılık tabloları (otomatik).
 *
 *   node scripts/tuik-hayvancilik-yukle.mjs          # kuru çalıştırma: neyi yazacağını raporlar
 *   node scripts/tuik-hayvancilik-yukle.mjs --yaz    # D1'e uygula
 *
 * NEDEN BU BETİK VAR
 * ------------------
 * tr_hayvan_varliklari / cig_sut_uretim_miktari / kirmizi_et_uretim_miktari
 * ana sayfanın manşet kartlarını besliyor ama hiçbir zamanlanmış iş onlara
 * yazmıyordu — 2025 verisi oradaydı çünkü elle yüklenmişti. TÜİK 2026'yı
 * yayımladığında kimse dokunmazsa sayfa bir yıl geride kalacaktı.
 *
 * KAYNAK
 * ------
 * SDMX'te hayvancılık yok (bkz. scripts/tuik-sync/datasets.mjs). Veri Portalı'nın
 * 13.79 "Hayvansal Üretim İstatistikleri" temasındaki dört XLS tablosu kullanılıyor:
 *
 *   46_t1   Büyükbaş Hayvan Sayıları           → varlık (sığır 3 ırk + manda)
 *   46_t2   Küçükbaş Hayvan Sayıları           → varlık (koyun 2 + keçi 2)
 *   46_t5   Kesilen Hayvan Sayısı ve Et Üretimi → kırmızı et
 *   46_t13  Çiğ Süt Üretim Miktarı, 2020+      → çiğ süt
 *
 * İl bazlı hayvan sayıları (il_hayvan_sayilari) BU KAYNAKTA YOK — dördü de
 * yalnızca Türkiye toplamı. İl kırılımı Veri Portalı'nın dinamik veritabanı
 * bölümünde; ayrı bir iş.
 *
 * GÜVENLİK AĞI
 * ------------
 * TÜİK tablo düzenini habersiz değiştiriyor. Bu yüzden betik iki kez duruyor:
 *   1) Başlık metinleri beklenen sütunda değilse hata verip çıkıyor (sessizce
 *      yanlış sütunu okumaktansa hiç yazmamak yeğ).
 *   2) D1'de zaten bulunan son iki yılı yeniden hesaplayıp mevcut değerle
 *      karşılaştırıyor. Tutmuyorsa yeni yılı da yazmıyor — çünkü aynı
 *      hesaptan çıkıyorlar, biri yanlışsa öbürü de yanlıştır.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const YAZ = process.argv.includes('--yaz');

const VERI_PORTALI = 'https://veriportali.tuik.gov.tr';
const TEMA_DUGUM = '13.79'; // Tarım > Hayvansal Üretim İstatistikleri
// Portal tarayıcı dışı istemcileri reddediyor; gerçek bir UA şart.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
// Arka arkaya indirmede portal XLS yerine HTML döndürüyor (hız sınırı).
const INDIRME_ARASI_MS = 6500;

/* ══════════════════════════════════════════════════════════════════════════
   İNDİRME
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * curl ile indirir. Portal ara sıra bağlantıyı düşürüyor; execFileSync'in
 * çıplak hata dökümü CI günlüğünde teşhis edilemez olduğu için üç kez
 * deneyip anlaşılır bir mesajla çıkıyoruz.
 */
function getir(url, baslikEk = []) {
  let son;
  for (let deneme = 1; deneme <= 3; deneme += 1) {
    try {
      return execFileSync(
        'curl',
        ['-sL', '--fail', '--retry', '2', '--max-time', '120',
         '-H', `User-Agent: ${UA}`,
         '-H', `Referer: ${VERI_PORTALI}/tr/statistical-themes`, ...baslikEk, url],
        { maxBuffer: 4e8 },
      );
    } catch (e) {
      son = e;
      if (deneme < 3) execFileSync('sleep', ['10']);
    }
  }
  throw new Error(
    `İndirilemedi (3 deneme): ${url}\n  curl çıkış kodu: ${son?.status ?? '?'}` +
    `\n  ${String(son?.stderr ?? '').trim() || son?.message}`,
  );
}

/** 13.79 temasındaki indirilebilir tabloların id → url eşlemesi. */
function tabloListesi() {
  const ham = getir(`${VERI_PORTALI}/api/tr/data/statistical-themes`, [
    '-H', 'X-Requested-With: XMLHttpRequest',
    '-H', 'Accept: application/json',
  ]).toString('utf8');
  const agac = JSON.parse(ham).data;

  const dugum = (function ara(ns) {
    for (const n of ns ?? []) {
      if (String(n.id) === TEMA_DUGUM) return n;
      const r = ara(n.children);
      if (r) return r;
    }
    return null;
  })(agac);
  if (!dugum) throw new Error(`Tema düğümü ${TEMA_DUGUM} bulunamadı — portal ağacı değişmiş.`);

  const out = {};
  (function gez(ns) {
    for (const n of ns ?? []) {
      const id = String(n.id ?? '');
      if (id.includes('istab-') && n.url) out[id.split('istab-')[1]] = n.url;
      gez(n.children);
    }
  })([dugum]);
  return out;
}

function tablolariIndir(idler) {
  const liste = tabloListesi();
  const yollar = {};
  const dizin = join(KOK, '.tuik-indirme');
  mkdirSync(dizin, { recursive: true });

  idler.forEach((id, i) => {
    if (!liste[id]) throw new Error(`Tablo ${id} portal ağacında yok — taşınmış veya adı değişmiş.`);
    if (i > 0) execFileSync('sleep', [String(INDIRME_ARASI_MS / 1000)]);
    const buf = getir(VERI_PORTALI + liste[id]);
    // OLE2 imzası: hız sınırına takılınca portal XLS değil HTML döndürüyor,
    // xlsx bunu sessizce boş sayfa olarak ayrıştırabiliyor.
    if (buf.slice(0, 4).toString('hex') !== 'd0cf11e0') {
      throw new Error(`${id}: XLS değil (${buf.length} bayt) — hız sınırına takılmış olabilir.`);
    }
    const yol = join(dizin, `${id}.xls`);
    writeFileSync(yol, buf);
    yollar[id] = yol;
    console.log(`   ${id}  ${buf.length} bayt`);
  });
  return yollar;
}

/* ══════════════════════════════════════════════════════════════════════════
   AYRIŞTIRMA
   ══════════════════════════════════════════════════════════════════════════ */

function sayfaOku(yol) {
  const wb = XLSX.read(readFileSync(yol), { type: 'buffer' });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1, blankrows: true, defval: null,
  });
}

const metin = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());

/**
 * Başlık satırlarında beklenen sütun etiketlerini doğrular.
 * `bekle` = { sütunIndeksi: /regex/ }. Tutmazsa hata fırlatır: yanlış sütunu
 * okuyup sessizce saçma sayı yazmaktansa durmak yeğ.
 */
function basligiDogrula(id, satirlar, bekle) {
  const ilk10 = satirlar.slice(0, 10);
  for (const [sutun, re] of Object.entries(bekle)) {
    const bulundu = ilk10.some((r) => re.test(metin(r?.[sutun])));
    if (!bulundu) {
      throw new Error(
        `${id}: ${sutun}. sütunda "${re}" başlığı bulunamadı — tablo düzeni değişmiş, ` +
        'sütun eşlemesi gözden geçirilmeli.',
      );
    }
  }
}

/** Yıl → sayı dizisi. "2001(r)" gibi revizyon eklerini temizler. */
function yillikSatirlar(satirlar) {
  const out = new Map();
  for (const r of satirlar) {
    const y = metin(r?.[0]).replace(/\(.*$/, '').trim();
    if (!/^(19|20)\d{2}$/.test(y)) continue;
    out.set(Number(y), r);
  }
  return out;
}

const sayi = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
/** Hepsi doluysa toplar; biri boşsa null (yarım toplam yazmaktansa hiç yazma). */
const topla = (...xs) => (xs.some((x) => x == null) ? null : xs.reduce((a, b) => a + b, 0));

/* ══════════════════════════════════════════════════════════════════════════
   HESAP
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Dört tablodan üç D1 tablosunun satırlarını üretir.
 * Türetilmiş sütunların formülleri D1'deki 2025 satırıyla birebir doğrulandı:
 *   kasaplık güç oranı = kesilen / varlık × 100
 *   karkas verimi (kg)  = et_ton × 1000 / kesilen
 */
function satirlariUret(T) {
  const t1 = yillikSatirlar(T['46_t1']);
  const t2 = yillikSatirlar(T['46_t2']);
  const t5 = yillikSatirlar(T['46_t5']);
  const t13 = yillikSatirlar(T['46_t13']);

  const varlik = new Map();
  for (const yil of new Set([...t1.keys(), ...t2.keys()])) {
    const a = t1.get(yil), b = t2.get(yil);
    if (!a || !b) continue;
    const sigir = topla(sayi(a[1]), sayi(a[2]), sayi(a[3]));
    const manda = sayi(a[4]);
    const koyun = topla(sayi(b[1]), sayi(b[2]));
    const keci = topla(sayi(b[3]), sayi(b[4]));
    varlik.set(yil, {
      tarih: `${yil}-01-01 00:00:00`,
      sigir_bas: sigir,
      manda_bas: manda,
      buyukbas_toplam_bas: topla(sigir, manda),
      koyun_bas: koyun,
      keci_bas: keci,
      kucukbas_toplam_bas: topla(koyun, keci),
    });
  }

  const sut = new Map();
  for (const [yil, r] of t13) {
    const inek = sayi(r[2]), manda = sayi(r[3]);
    const koyun = sayi(r[4]), keci = sayi(r[5]);
    sut.set(yil, {
      yil,
      // Büyükbaş süt = inek + manda. D1'de 2023 satırı mandayı atlamış
      // (21.438.542 yerine 21.481.567); bu betik onu da düzeltiyor.
      buyukbas_sut_uretimi_ton: topla(inek, manda),
      koyun_sutu_uretimi_ton: koyun,
      keci_sutu_uretimi_ton: keci,
      kucukbas_sutu_uretimi_ton: topla(koyun, keci),
      toplam_sut_uretimi_ton: sayi(r[1]),
      // Sağılan hayvan sayıları bu tabloda yok; D1'de de NULL. Dokunulmuyor.
    });
  }

  const et = new Map();
  for (const [yil, r] of t5) {
    const v = varlik.get(yil);
    const sigirKes = sayi(r[1]), sigirEt = sayi(r[2]);
    const mandaKes = sayi(r[4]), mandaEt = sayi(r[5]);
    const koyunKes = sayi(r[7]), koyunEt = sayi(r[8]);
    const keciKes = sayi(r[10]), keciEt = sayi(r[11]);

    const bbEt = topla(sigirEt, mandaEt);
    const bbKes = topla(sigirKes, mandaKes);
    const kbEt = topla(koyunEt, keciEt);
    const kbKes = topla(koyunKes, keciKes);
    const bbVarlik = v?.buyukbas_toplam_bas ?? null;
    const kbVarlik = v?.kucukbas_toplam_bas ?? null;
    const oran = (kes, vr) => (kes == null || !vr ? null : (kes / vr) * 100);
    const karkas = (ton, kes) => (ton == null || !kes ? null : (ton * 1000) / kes);

    et.set(yil, {
      yil,
      buyukbas_et_uretimi_ton: bbEt,
      buyukbas_hayvan_sayisi_bas: bbVarlik,
      kucukbas_hayvan_sayisi_bas: kbVarlik,
      toplam_hayvan_varligi_bas: topla(bbVarlik, kbVarlik),
      kesilen_buyukbas_hayvan_sayisi_bas: bbKes,
      buyukbas_kasaplik_guc_orani: oran(bbKes, bbVarlik),
      buyukbas_karkas_verimi_kg: karkas(bbEt, bbKes),
      keci_et_uretimi_ton: keciEt,
      koyun_et_uretimi_ton: koyunEt,
      kucukbas_et_uretimi_ton: kbEt,
      koyun_kesilen_bas: koyunKes,
      keci_kesilen_bas: keciKes,
      kesilen_toplam_kucukbas_sayisi_bas: kbKes,
      kucukbas_kasaplik_guc_orani: oran(kbKes, kbVarlik),
      kucukbas_karkas_verimi_kg: karkas(kbEt, kbKes),
      toplam_kirmizi_et_uretimi_ton: topla(bbEt, kbEt),
    });
  }

  return { varlik, sut, et };
}

/* ══════════════════════════════════════════════════════════════════════════
   D1
   ══════════════════════════════════════════════════════════════════════════ */

// CI'da REST API (wrangler oturumu yok), yerelde wrangler (token yok).
const REST = process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID
  && process.env.CLOUDFLARE_D1_DATABASE_ID;

async function d1(sql) {
  if (REST) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}` +
      `/d1/database/${process.env.CLOUDFLARE_D1_DATABASE_ID}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      },
    );
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      throw new Error(`D1 hatası (HTTP ${res.status}): ${JSON.stringify(body?.errors ?? body)}`);
    }
    return body.result[0].results ?? [];
  }
  let stdout;
  try {
    stdout = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--json', '--command', sql],
      { cwd: KOK, maxBuffer: 4e8, encoding: 'utf8' },
    );
  } catch (e) {
    // Çıplak execFileSync dökümü hangi sorgunun patladığını göstermiyor.
    throw new Error(
      `wrangler d1 başarısız (kod ${e.status}): ${sql.slice(0, 120)}\n  ` +
      (String(e.stderr ?? '').trim() || e.message),
    );
  }
  return JSON.parse(stdout.slice(stdout.indexOf('[')))[0].results ?? [];
}

const sqlDeger = (v) =>
  v == null ? 'NULL' : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v);

/* ══════════════════════════════════════════════════════════════════════════
   HEDEFLER
   ══════════════════════════════════════════════════════════════════════════ */

const HEDEFLER = [
  { tablo: 'tr_hayvan_varliklari', anahtar: 'tarih', kaynak: 'varlik',
    anahtarDegeri: (y) => `${y}-01-01 00:00:00` },
  { tablo: 'cig_sut_uretim_miktari', anahtar: 'yil', kaynak: 'sut',
    anahtarDegeri: (y) => y },
  { tablo: 'kirmizi_et_uretim_miktari', anahtar: 'yil', kaynak: 'et',
    anahtarDegeri: (y) => y },
];

/** İki sayıyı "aynı" saymak için tolerans: TÜİK yuvarlaması ve float gürültüsü. */
const esit = (a, b) => {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === 'string' || typeof b === 'string') return String(a) === String(b);
  return Math.abs(a - b) <= Math.max(1, Math.abs(b) * 1e-6);
};

/* ══════════════════════════════════════════════════════════════════════════
   ANA AKIŞ
   ══════════════════════════════════════════════════════════════════════════ */

console.log(`TÜİK Veri Portalı → hayvancılık  |  tema ${TEMA_DUGUM}\n`);

console.log('1) tablolar indiriliyor');
const yollar = tablolariIndir(['46_t1', '46_t2', '46_t5', '46_t13']);

console.log('\n2) ayrıştırılıyor ve başlıklar doğrulanıyor');
const T = {};
for (const [id, yol] of Object.entries(yollar)) T[id] = sayfaOku(yol);

basligiDogrula('46_t1', T['46_t1'], {
  1: /Kültür$|Culture/i, 2: /melez|Cross/i, 3: /Yerli|Domestic/i, 4: /Manda|Buffalo/i,
});
basligiDogrula('46_t2', T['46_t2'], {
  1: /Yerli|Domestic/i, 2: /Merinos|Merino/i, 3: /Kıl|Ordinary/i, 4: /Tiftik|Angora/i,
});
basligiDogrula('46_t5', T['46_t5'], {
  1: /Sığır|Cattle|Kesilen/i, 2: /Et üretim|meat production/i,
  4: /Manda|Buffalo|Kesilen/i, 7: /Koyun|Sheep|Kesilen/i, 10: /Keçi|Goat|Kesilen/i,
});
basligiDogrula('46_t13', T['46_t13'], {
  1: /Toplam|Total/i, 2: /İnek|Cow/i, 3: /Manda|Buffalo/i, 4: /Koyun|Ewe/i, 5: /Keçi|Goat/i,
});
console.log('   dört tablonun da sütun düzeni beklendiği gibi');

const uretilen = satirlariUret(T);
for (const h of HEDEFLER) {
  const m = uretilen[h.kaynak];
  const yillar = [...m.keys()].sort();
  console.log(`   ${h.tablo}: ${m.size} yıl (${yillar[0]}–${yillar.at(-1)})`);
}

console.log('\n3) D1 ile karşılaştırılıyor');
const yazmalar = [];
let engel = false;

for (const h of HEDEFLER) {
  const mevcut = await d1(`SELECT * FROM ${h.tablo}`);
  const anahtarla = new Map(mevcut.map((r) => [String(r[h.anahtar]), r]));
  const uret = uretilen[h.kaynak];
  const sutunlar = Object.keys([...uret.values()][0]).filter((c) => c !== h.anahtar);

  const yeni = [], degisen = [], sapan = [];
  for (const [yil, satir] of [...uret].sort((a, b) => a[0] - b[0])) {
    const anahtar = String(h.anahtarDegeri(yil));
    const eski = anahtarla.get(anahtar);
    if (!eski) { yeni.push({ yil, satir }); continue; }
    const farklar = sutunlar.filter((c) => !esit(satir[c], eski[c]));
    if (farklar.length) degisen.push({ yil, satir, eski, farklar });
  }

  // GÜVENLİK AĞI: D1'de zaten olan son iki yıl birebir tutmalı. Tutmuyorsa
  // hesabımız veya TÜİK'in düzeni değişmiş demektir; yeni yılı da yazmayız.
  const kanitYillari = [...uret.keys()].sort((a, b) => b - a)
    .filter((y) => anahtarla.has(String(h.anahtarDegeri(y)))).slice(0, 2);
  for (const y of kanitYillari) {
    const d = degisen.find((x) => x.yil === y);
    if (d) sapan.push(d);
  }

  console.log(`\n   ── ${h.tablo}`);
  console.log(`      D1'de ${mevcut.length} satır  |  yeni: ${yeni.length}  |  değişen: ${degisen.length}`);
  console.log(`      doğrulama yılları: ${kanitYillari.join(', ') || '(yok)'}`);

  for (const d of degisen) {
    const isaret = sapan.includes(d) ? '⚠' : '·';
    for (const c of d.farklar.slice(0, 4)) {
      console.log(`      ${isaret} ${d.yil} ${c}: D1=${d.eski[c]} → TÜİK=${d.satir[c]}`);
    }
    if (d.farklar.length > 4) console.log(`        … +${d.farklar.length - 4} sütun daha`);
  }
  for (const y of yeni) console.log(`      + ${y.yil} (yeni yıl)`);

  // Bilinen istisna: çiğ sütte 2020–2023 büyükbaşı yalnızca ineği sayıyor,
  // manda dışarıda kalmış (2020'de 63.766 t … 2023'te 43.025 t — tam manda
  // sütunu kadar). 2024–2025 doğru. Bu bir düzeltme, sapma değil; yalnızca
  // o yıllar ve yalnızca o iki sütun için geçerli.
  const bilinenDuzeltme = (d) =>
    h.tablo === 'cig_sut_uretim_miktari' && d.yil >= 2020 && d.yil <= 2023 &&
    d.farklar.every((c) => c === 'buyukbas_sut_uretimi_ton' || c === 'toplam_sut_uretimi_ton');

  const gercekSapan = sapan.filter((d) => !bilinenDuzeltme(d));
  if (gercekSapan.length) {
    engel = true;
    console.log(`      ✗ ${gercekSapan.length} doğrulama yılı tutmadı — bu tablo YAZILMAYACAK.`);
    continue;
  }
  if (sapan.length) console.log('      (2023 çiğ süt farkı bilinen manda eksiği — düzeltiliyor)');
  if (!yeni.length && !degisen.length) { console.log('      güncel, yapılacak bir şey yok'); continue; }

  // Yeni yıl → INSERT. Mevcut yıl → yalnızca DEĞİŞEN sütunlara UPDATE.
  // DELETE+INSERT kullanılmıyor: cig_sut_uretim_miktari'nin sağılan hayvan
  // sütunları bu kaynakta yok ama D1'de dolu (2020–2023); satırı silip
  // yeniden kursak onları yok ederdik.
  for (const { yil, satir } of yeni) {
    const kolonlar = [h.anahtar, ...sutunlar];
    const degerler = [h.anahtarDegeri(yil), ...sutunlar.map((c) => satir[c])];
    yazmalar.push(
      `INSERT INTO ${h.tablo} (${kolonlar.join(', ')}) VALUES (${degerler.map(sqlDeger).join(', ')});`,
    );
  }
  for (const { yil, satir, farklar } of degisen) {
    const atama = farklar.map((c) => `${c}=${sqlDeger(satir[c])}`).join(', ');
    yazmalar.push(
      `UPDATE ${h.tablo} SET ${atama} WHERE ${h.anahtar}=${sqlDeger(h.anahtarDegeri(yil))};`,
    );
  }
  // Önbellek damgası: atlanırsa sayfalar ~1 saat eski veriyi gösterir.
  yazmalar.push(
    `INSERT INTO veri_damga (tablo, damga) VALUES ('${h.tablo}', strftime('%s','now')*1000) ` +
    'ON CONFLICT(tablo) DO UPDATE SET damga=excluded.damga;',
  );
}

if (engel) {
  console.error('\n✗ En az bir tablo doğrulamayı geçemedi. Hiçbir şey yazılmadı.');
  process.exit(1);
}
if (!yazmalar.length) { console.log('\nÜç tablo da güncel.'); process.exit(0); }

const sqlYol = join(KOK, '.tuik-indirme', 'hayvancilik.sql');
writeFileSync(sqlYol, yazmalar.join('\n') + '\n');
console.log(`\n4) ${yazmalar.length} ifade  →  ${sqlYol}`);

if (!YAZ) {
  console.log("\n(--yaz verilmedi; D1'e YAZILMADI.)");
  process.exit(0);
}

console.log('\n5) D1\'e yazılıyor');
for (const sql of yazmalar) await d1(sql);
console.log(`   ${yazmalar.length} ifade uygulandı.`);
