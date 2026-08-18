#!/usr/bin/env node
/**
 * TÜİK dış ticaret → D1.
 *
 *   node scripts/tuik-disticaret/cek.mjs --dogrula                 # D1'deki son dönemi yeniden çekip karşılaştır
 *   node scripts/tuik-disticaret/cek.mjs --yil 2026 --ay 6         # çek, yazma
 *   node scripts/tuik-disticaret/cek.mjs --yil 2026 --ay 6 --yaz   # D1'e yaz
 *   node scripts/tuik-disticaret/cek.mjs --otomatik --yaz          # eksik sonraki dönemi bul ve yükle
 *
 * ─── VERİ NEREDEN ───────────────────────────────────────────────────────────
 * TÜİK'in belgelenmiş SDMX servisinde (406 veri akışı) mal ticareti ürün×ülke
 * kırılımıyla YOK; ticaret başlıklı 27 akışın hepsi endeks. Ayrıntı yalnızca
 * bi.tuik.gov.tr'deki Qlik Sense uygulamasında. Qlik'in kendi Engine API'si
 * var ama düz Node WebSocket'i 403 yiyor; gerçek tarayıcıda çalışıyor. Bu
 * yüzden Playwright — kazıma değil, uygulamanın API'si, çağıran taraf tarayıcı.
 *
 * ─── TABLONUN YAPISI (kolay yanlış anlaşılıyor) ─────────────────────────────
 * Bu tablolar düz olgu tablosu DEĞİL; aynı dönemi 4 toplama seviyesinde birden
 * tutuyor ve dördü de AYNI toplamı verir:
 *
 *   duzey_1  duzey_2     ne demek                        alt_urunkod
 *   ─────────────────────────────────────────────────────────────────
 *   ülke     alt ürün    ülke × GTİP (en ince)           gerçek kod
 *   ülke     ürün        ülke × ana ürün grubu           0
 *   tüm      alt ürün    tüm ülkeler × GTİP              gerçek kod
 *   tüm      ürün        tüm ülkeler × ana ürün grubu    0
 *
 * Dolayısıyla SUM(ihracat_deger) tüm satırlar üzerinden alınırsa gerçek değerin
 * 4 KATI çıkar. Denetim yaparken mutlaka duzey_1/duzey_2 ile filtrele.
 *
 * ─── KOD BİÇİMİ ─────────────────────────────────────────────────────────────
 * D1'deki `alt_urunkod` tek bir sınıflandırma değil, uzunluğa göre değişiyor —
 * ve Qlik'te her biri BAŞKA bir alanda duruyor (ölçülerek doğrulandı):
 *
 *   5-6 hane  → TARIFE6   (HS6,   ör. 40690 = 0406.90 peynir)
 *   7-8 hane  → TARIFE8   (HS8/CN, ör. 4072100)
 *   11-12 hane→ ISTPOZ    (12 haneli GTİP, ör. 200819190016)
 *   0         → kod değil; "ürün grubu" seviyesinin işareti, çekilmez
 *
 * Qlik kodları SIFIR DOLGUSUZ metin tutuyor ('1022190', '01022190' değil);
 * dolgulu gönderilirse set analizi sessizce 0 döndürür, hata vermez.
 *
 * ─── NEDEN SEÇİM DEĞİL SET ANALİZİ ──────────────────────────────────────────
 * `field().selectValues()` bu anonim oturumda sessizce hiçbir şey yapmıyor
 * (ölçüldü: seçim öncesi ve sonrası Sum(DOLAR) birebir aynı, 9.235.187 milyon).
 * Bu yüzden dönem/yön/kod filtresi ÖLÇÜMÜN İÇİNDE set analiziyle veriliyor.
 */

import { qlikOturum, APP_OZEL_TR } from './qlik.mjs';
import { MOTOR } from './motor.mjs';
import { sorgu, dosyaCalistir, s, n } from './d1.mjs';

const TABLOLAR = { hayvansal: 'tuik_ticaret_hayvansal', bitkisel: 'tuik_ticaret_bitkisel' };

/** Kod uzunluğu → Qlik alanı. */
function kodAlani(kod) {
  const h = String(kod).length;
  if (h >= 11) return 'ISTPOZ';
  if (h >= 7) return 'TARIFE8';
  if (h >= 5) return 'TARIFE6';
  return null;                       // 0 ve kısa kodlar: grup seviyesi
}

/* ─── argümanlar ──────────────────────────────────────────────────────────── */

const arg = process.argv.slice(2);
const deger = (a) => { const i = arg.indexOf(a); return i >= 0 ? arg[i + 1] : null; };
const YAZ = arg.includes('--yaz');
const DOGRULA = arg.includes('--dogrula');
const OTOMATIK = arg.includes('--otomatik');
const SECILEN = deger('--tablo');

/* ─── D1'den kapsam ───────────────────────────────────────────────────────── */

/**
 * Ürün kürasyonunu D1'in kendisinden okur: hangi GTİP kodu hangi ana ürün
 * grubuna ait. Yıllar içinde elle kurulmuş bu eşlemeyi yeniden uydurmuyoruz.
 */
async function kapsamOku(tablo) {
  const satir = await sorgu(`
    SELECT alt_urunkod kod, ana_urun, alt_urun, miktar_birim, COUNT(*) adet
    FROM ${tablo}
    WHERE alt_urunkod > 0 AND duzey_2 = 'alt ürün'
    GROUP BY alt_urunkod, ana_urun, alt_urun, miktar_birim
    ORDER BY alt_urunkod, adet DESC`);
  const h = new Map();
  for (const r of satir) {
    // Aynı kod için birden çok yazım varsa en sık kullanılanı al.
    // D1 sürücüsü sayıyı metin döndürebiliyor; anahtar HER ZAMAN sayı olsun.
    const kod = Number(r.kod);
    if (!h.has(kod)) h.set(kod, { ana_urun: r.ana_urun, alt_urun: r.alt_urun, birim: r.miktar_birim });
  }
  return h;
}

/** ulkekod → D1'deki ülke yazımı. */
async function ulkeAdlari(tablo) {
  const satir = await sorgu(`SELECT ulkekod, ulke, COUNT(*) adet FROM ${tablo}
    WHERE ulkekod > 0 GROUP BY ulkekod, ulke ORDER BY ulkekod, adet DESC`);
  const h = new Map();
  for (const r of satir) if (!h.has(Number(r.ulkekod))) h.set(Number(r.ulkekod), r.ulke);
  return h;
}

/** Ana ürün grubu → o gruptaki birim (grup seviyesi satırları için). */
function grupBirimleri(kapsam) {
  const h = new Map();
  for (const v of kapsam.values()) if (!h.has(v.ana_urun)) h.set(v.ana_urun, v.birim);
  return h;
}

/* ─── Qlik ────────────────────────────────────────────────────────────────── */

/**
 * Bir alan (TARIFE6/TARIFE8/ISTPOZ) için ülke kırılımlı ham veri.
 * Dönen satır: [kod, ulkeKod, ihrMik, ihrDolar, ithMik, ithDolar]
 */
async function alandanCek(oturum, { alan, kodlar, yil, ay }) {
  return oturum.calis(async ({ appId, alan: A, kodlar: K, yil: Y, ay: M }) => {
    const app = await window.__appAc(appId);
    const kume = K.map((c) => `'${c}'`).join(',');
    const set = (yon) => `{<YIL={'${Y}'}, AY={'${M}'}, IHRITH={'${yon}'}, ${A}={${kume}}>}`;

    const kup = await app.createGenericObject({
      qInfo: { qType: 'DT_' + A },
      qHyperCubeDef: {
        qDimensions: [A, 'ULKE_KODU'].map((f) => ({ qDef: { qFieldDefs: [f] }, qNullSuppression: true })),
        qMeasures: [
          `Sum(${set('İhracat')} MIKTAR_1)`, `Sum(${set('İhracat')} DOLAR)`,
          `Sum(${set('İthalat')} MIKTAR_1)`, `Sum(${set('İthalat')} DOLAR)`,
        ].map((e) => ({ qDef: { qDef: e } })),
        qInitialDataFetch: [],
        qSuppressZero: true,
      },
    });

    const duzen = await kup.getLayout();
    const { qcx: gen, qcy: adet } = duzen.qHyperCube.qSize;
    const sayfaBoy = Math.max(1, Math.floor(9000 / gen));
    const cikti = [];
    for (let ust = 0; ust < adet; ust += sayfaBoy) {
      // eslint-disable-next-line no-await-in-loop
      const sayfa = await kup.getHyperCubeData('/qHyperCubeDef', [{
        qTop: ust, qLeft: 0, qWidth: gen, qHeight: Math.min(sayfaBoy, adet - ust),
      }]);
      for (const r of sayfa[0].qMatrix) {
        cikti.push([r[0].qText, r[1].qText,
          r[2].qIsNull ? 0 : r[2].qNum, r[3].qIsNull ? 0 : r[3].qNum,
          r[4].qIsNull ? 0 : r[4].qNum, r[5].qIsNull ? 0 : r[5].qNum]);
      }
    }
    return cikti;
  }, { appId: APP_OZEL_TR, alan, kodlar, yil, ay });
}

/* ─── seviyeleri kur ──────────────────────────────────────────────────────── */

const bosOlcu = () => ({ ihrMik: 0, ihrDolar: 0, ithMik: 0, ithDolar: 0 });
const ekle = (h, anahtar, o) => {
  const v = h.get(anahtar) ?? bosOlcu();
  v.ihrMik += o.ihrMik; v.ihrDolar += o.ihrDolar;
  v.ithMik += o.ithMik; v.ithDolar += o.ithDolar;
  h.set(anahtar, v);
};

/**
 * Ham (kod × ülke) verisinden D1'in dört seviyesini üretir.
 * "tüm" satırları ülke kırılımının toplamı — Qlik ülke boyutunu eksiksiz
 * döndürdüğü için bu gerçek toplamdır.
 */
function seviyeleriUret(ham, { yil, ay, kapsam, ulkeler }) {
  const grupBirim = grupBirimleri(kapsam);
  const s1 = new Map(); // ülke × alt ürün
  const s2 = new Map(); // ülke × ürün
  const s3 = new Map(); // tüm  × alt ürün
  const s4 = new Map(); // tüm  × ürün
  const kapsamDisi = new Set();

  for (const [kodMetni, ulkeMetni, ihrMik, ihrDolar, ithMik, ithDolar] of ham) {
    const kod = Number(String(kodMetni).replace(/\D/g, ''));
    const k = kapsam.get(kod);
    if (!k) { kapsamDisi.add(kod); continue; }
    const ulke = Number(ulkeMetni);
    const o = { ihrMik, ihrDolar, ithMik, ithDolar };
    ekle(s1, `${kod}|${ulke}`, o);
    ekle(s2, `${k.ana_urun}|${ulke}`, o);
    ekle(s3, `${kod}`, o);
    ekle(s4, `${k.ana_urun}`, o);
  }

  const satirlar = [];
  const it = (d1, d2, ana_urun, kod, alt_urun, ulkekod, ulke, birim, o) => satirlar.push({
    duzey_1: d1, duzey_2: d2, duzey_3: 'ay', ana_urun, yil, ay,
    alt_urunkod: kod, alt_urun, ulkekod, ulke, miktar_birim: birim,
    ihracat_mik: o.ihrMik, ithalat_mik: o.ithMik, deger_birim: '$',
    ihracat_deger: o.ihrDolar, ithalat_deger: o.ithDolar,
  });

  for (const [a, o] of s1) {
    const [kod, ulke] = a.split('|').map(Number);
    const k = kapsam.get(kod);
    it('ülke', 'alt ürün', k.ana_urun, kod, k.alt_urun, ulke, ulkeler.get(ulke) ?? '', k.birim, o);
  }
  for (const [a, o] of s2) {
    const i = a.lastIndexOf('|');
    const ana = a.slice(0, i); const ulke = Number(a.slice(i + 1));
    it('ülke', 'ürün', ana, 0, '', ulke, ulkeler.get(ulke) ?? '', grupBirim.get(ana), o);
  }
  for (const [a, o] of s3) {
    const kod = Number(a); const k = kapsam.get(kod);
    it('tüm', 'alt ürün', k.ana_urun, kod, k.alt_urun, 0, '', k.birim, o);
  }
  for (const [ana, o] of s4) it('tüm', 'ürün', ana, 0, '', 0, '', grupBirim.get(ana), o);

  return { satirlar, kapsamDisi: [...kapsamDisi] };
}

/* ─── D1 yazımı ───────────────────────────────────────────────────────────── */

const SUTUN = ['duzey_1', 'duzey_2', 'duzey_3', 'ana_urun', 'yil', 'ay', 'alt_urunkod',
  'alt_urun', 'ulkekod', 'ulke', 'miktar_birim', 'ihracat_mik', 'ithalat_mik',
  'deger_birim', 'ihracat_deger', 'ithalat_deger'];
const SAYI = new Set(['yil', 'ay', 'alt_urunkod', 'ulkekod', 'ihracat_mik', 'ithalat_mik',
  'ihracat_deger', 'ithalat_deger']);

function insertSql(tablo, satirlar) {
  const p = [];
  for (let i = 0; i < satirlar.length; i += 200) {
    const obek = satirlar.slice(i, i + 200)
      .map((r) => `(${SUTUN.map((c) => (SAYI.has(c) ? n(r[c]) : s(r[c]))).join(',')})`).join(',\n');
    p.push(`INSERT INTO ${tablo} (${SUTUN.join(',')}) VALUES\n${obek};`);
  }
  return p.join('\n');
}

/* ─── denetim ─────────────────────────────────────────────────────────────── */

const para = (v) => '$' + Math.round(v).toLocaleString('tr-TR');

/** D1 özeti — SEVİYE BAZINDA (toplam almak 4 kat şişirir). */
async function d1Ozet(tablo, yil, ay) {
  const r = await sorgu(`SELECT duzey_1, duzey_2, COUNT(*) n,
    COALESCE(SUM(ihracat_deger),0) ihr, COALESCE(SUM(ithalat_deger),0) ith
    FROM ${tablo} WHERE yil=${yil} AND ay=${ay} GROUP BY duzey_1, duzey_2`);
  const h = new Map();
  for (const x of r) h.set(`${x.duzey_1}|${x.duzey_2}`, x);
  return h;
}

function ozetle(satirlar) {
  const h = new Map();
  for (const r of satirlar) {
    const a = `${r.duzey_1}|${r.duzey_2}`;
    const v = h.get(a) ?? { n: 0, ihr: 0, ith: 0 };
    v.n += 1; v.ihr += r.ihracat_deger; v.ith += r.ithalat_deger;
    h.set(a, v);
  }
  return h;
}

/* ─── ana akış ────────────────────────────────────────────────────────────── */

async function tabloIsle(oturum, ad, { yil, ay, yaz, karsilastir }) {
  const tablo = TABLOLAR[ad];
  console.log(`\n── ${tablo} · ${yil}-${String(ay).padStart(2, '0')} ──`);

  const [kapsam, ulkeler] = await Promise.all([kapsamOku(tablo), ulkeAdlari(tablo)]);

  // Kodları Qlik alanlarına dağıt.
  const alanKodlari = new Map();
  for (const kod of kapsam.keys()) {
    const alan = kodAlani(kod);
    if (!alan) continue;
    if (!alanKodlari.has(alan)) alanKodlari.set(alan, []);
    alanKodlari.get(alan).push(String(Number(kod)));
  }
  console.log('   kapsam: ' + [...alanKodlari].map(([a, k]) => `${a} ${k.length} kod`).join(', '));

  const ham = [];
  for (const [alan, kodlar] of alanKodlari) {
    // eslint-disable-next-line no-await-in-loop
    const p = await alandanCek(oturum, { alan, kodlar, yil, ay });
    console.log(`   ${alan.padEnd(8)} → ${p.length} küp satırı`);
    ham.push(...p);
  }

  const { satirlar, kapsamDisi } = seviyeleriUret(ham, { yil, ay, kapsam, ulkeler });
  if (kapsamDisi.length) console.log(`   ⚠ kapsam dışı ${kapsamDisi.length} kod atlandı`);

  const cekilen = ozetle(satirlar);
  console.log(`   üretilen: ${satirlar.length} satır (4 seviye)`);

  if (karsilastir) {
    const mevcut = await d1Ozet(tablo, yil, ay);
    console.log('\n   seviye                 çekilen              D1                  fark');
    let hepsiIyi = true;
    for (const a of ['ülke|alt ürün', 'ülke|ürün', 'tüm|alt ürün', 'tüm|ürün']) {
      const c = cekilen.get(a) ?? { n: 0, ihr: 0 };
      const d = mevcut.get(a) ?? { n: 0, ihr: 0 };
      const f = d.ihr ? ((c.ihr - d.ihr) / d.ihr) * 100 : (c.ihr ? 100 : 0);
      if (Math.abs(f) > 0.5) hepsiIyi = false;
      console.log(`   ${a.padEnd(16)} ${String(c.n).padStart(5)} ${para(c.ihr).padStart(16)}`
        + ` ${String(d.n).padStart(5)} ${para(d.ihr).padStart(16)}   %${f.toFixed(2)}`);
    }
    console.log(hepsiIyi ? '\n   ✓ EŞLEŞTİ — yöntem doğru' : '\n   ✗ SAPMA VAR — yazma');
    return { eslesti: hepsiIyi };
  }

  if (yaz) {
    const mevcut = await d1Ozet(tablo, yil, ay);
    const varOlan = [...mevcut.values()].reduce((t, x) => t + x.n, 0);
    if (varOlan > 0) {
      console.log(`   ⚠ bu dönemde zaten ${varOlan} satır var — ikizlenmesin diye YAZILMADI`);
      return { yazildi: 0 };
    }
    if (!satirlar.length) { console.log('   ⚠ satır yok, yazılmadı'); return { yazildi: 0 }; }
    await dosyaCalistir(insertSql(tablo, satirlar));
    const sonra = await d1Ozet(tablo, yil, ay);
    const toplam = [...sonra.values()].reduce((t, x) => t + x.n, 0);
    console.log(`   ✓ yazıldı — D1'de ${toplam} satır`);
    return { yazildi: toplam };
  }

  for (const [a, v] of cekilen) console.log(`   ${a.padEnd(16)} ${String(v.n).padStart(5)} satır  ihr ${para(v.ihr)}`);
  return {};
}

async function sonDonem(tablo) {
  const y = (await sorgu(`SELECT MAX(yil) v FROM ${tablo}`))[0].v;
  const a = (await sorgu(`SELECT MAX(ay) v FROM ${tablo} WHERE yil=${y}`))[0].v;
  return { yil: y, ay: a };
}

const adlar = SECILEN ? [SECILEN] : Object.keys(TABLOLAR);
for (const a of adlar) if (!TABLOLAR[a]) throw new Error(`Bilinmeyen tablo: ${a}`);

const oturum = await qlikOturum();
try {
  await oturum.sayfa.addScriptTag({ content: MOTOR });
  if (DOGRULA) {
    for (const a of adlar) {
      const d = await sonDonem(TABLOLAR[a]);
      await tabloIsle(oturum, a, { ...d, karsilastir: true });
    }
  } else if (OTOMATIK) {
    for (const a of adlar) {
      const { yil, ay } = await sonDonem(TABLOLAR[a]);
      const s2 = ay === 12 ? { yil: yil + 1, ay: 1 } : { yil, ay: ay + 1 };
      console.log(`\n   ${TABLOLAR[a]}: D1 ${yil}-${String(ay).padStart(2, '0')} → denenecek ${s2.yil}-${String(s2.ay).padStart(2, '0')}`);
      await tabloIsle(oturum, a, { ...s2, yaz: YAZ });
    }
  } else {
    const yil = Number(deger('--yil')); const ay = Number(deger('--ay'));
    if (!yil || !ay) throw new Error('--yil ve --ay gerekli (ya da --otomatik / --dogrula)');
    for (const a of adlar) await tabloIsle(oturum, a, { yil, ay, yaz: YAZ });
  }
} finally {
  await oturum.kapat();
}
