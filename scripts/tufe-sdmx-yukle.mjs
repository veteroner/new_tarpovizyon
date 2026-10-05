#!/usr/bin/env node
/**
 * TÜFE ana harcama grubu endekslerini TÜİK SDMX'ten çekip D1'e yazar.
 *
 * ─── NEDEN GEREKTİ ──────────────────────────────────────────────────────────
 * `tuik_fiyatendex` tablosunun TUFE bölümü iki türlü bozuktu:
 *
 *   1. BAYAT — kategori satırları 2026 Nisan'da bitiyordu; yalnızca en üstteki
 *      genel TÜFE satırı Temmuz'a kadar doluydu (o da elle doldurulmuştu).
 *   2. YANLIŞ — alt kategori satırları ana grupların değerlerini SIRAYLA
 *      taşıyordu. Ölçüldü: "Gıda" satırında ana grup #1'in değeri, "Alkolsüz
 *      içecekler" satırında #2'nin, "Tahıllar" satırında yine #1'in değeri
 *      vardı. Değerler satır listesine, hangi kategoriye ait olduklarına
 *      bakılmaksızın sırayla yazılmış.
 *
 * İkincisi birincisinden kötü: bayat veri eski ama doğru, bu veri hiç doğru
 * değildi ve düzeltilmeden tazelenseydi yanlışlık tazelenmiş olurdu.
 *
 * ─── KAYNAK ─────────────────────────────────────────────────────────────────
 * SDMX akışı `DF_TUFE_SDMX_TT01` — "Ana harcama gruplarına göre TÜFE ve
 * değişim oranları". Daha önce "TÜFE SDMX kataloğunda yok" diye kayıtlıydı;
 * o ölçüm 406 akış üzerindeydi, katalog 421'e çıkmış ve TÜFE eklenmiş.
 *
 * DEGISIM kodları veriden çözüldü ve çapraz doğrulandı:
 *   1 → ENDEKS          (2026-07 Gıda 134,02)
 *   2 → aylık % değişim (1,61 — tufe_aylik_snapshot ile birebir)
 *   4 → yıllık % değişim (37,53 — tufe_aylik.gida_alkolsuz ile birebir)
 * Bu betik yalnızca DEGISIM=1'i, yani endeksi yazıyor.
 *
 * ─── KULLANIM ───────────────────────────────────────────────────────────────
 *   TUIK_API_KEY=... node scripts/tufe-sdmx-yukle.mjs               # yalnız rapor
 *   TUIK_API_KEY=... node scripts/tufe-sdmx-yukle.mjs --sql cikti.sql [--beklenti b.json]
 *   npx wrangler d1 execute tarpovizyon-basic --remote --file cikti.sql
 *   node scripts/d1-beklenti-dogrula.mjs b.json
 *
 * Günlük senkron (`.github/workflows/tuik-sync.yml`) bu üç adımı sırayla
 * çalıştırıyor. Elle çalıştırmak hâlâ mümkün ama artık GEREKMİYOR.
 *
 * Anahtar ORTAM DEĞİŞKENİNDEN okunuyor, depoda tutulmuyor.
 *
 * ─── NEDEN SQL DOSYASI, NEDEN DOĞRUDAN YAZMIYOR ─────────────────────────────
 * Betik önce wrangler'ı `execFileSync` ile kendi içinden çağırıyordu; alt
 * süreç "Authentication error [code: 10000]" veriyor, aynı komut kabuktan
 * elle çalıştırılınca sorunsuz geçiyor — wrangler'ın oturum anahtarına alt
 * süreçten erişilemiyor. SQL'i dosyaya yazıp wrangler'ı dışarıdan çağırmak
 * hem bu engeli kaldırıyor hem de yazılacakları çalıştırmadan önce
 * okunabilir kılıyor.
 */

import { writeFileSync } from 'node:fs';
import { damgaSql } from './lib/damga.mjs';

const sqlBayrak = process.argv.indexOf('--sql');
const SQL_YOL = sqlBayrak > -1 ? process.argv[sqlBayrak + 1] : null;
const beklentiBayrak = process.argv.indexOf('--beklenti');
const BEKLENTI_YOL = beklentiBayrak > -1 ? process.argv[beklentiBayrak + 1] : null;
const DB = 'tarpovizyon-basic';
const TABLO = 'tuik_fiyatendex';
const AKIS = 'DF_TUFE_SDMX_TT01';

const ANAHTAR = process.env.TUIK_API_KEY;
if (!ANAHTAR) {
  console.error('TUIK_API_KEY tanımlı değil. Anahtar depoda tutulmuyor; ortamdan verin.');
  process.exit(1);
}

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Token 300 saniye yaşıyor — her çalıştırmada yenisi alınıyor. */
async function token() {
  const r = await fetch('https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password', client_id: 'nsi-ws-consumer', api_key: ANAHTAR,
    }),
  });
  if (!r.ok) throw new Error(`token: HTTP ${r.status}`);
  return (await r.json()).access_token;
}

/**
 * SDMX-CSV çekimi.
 *
 * İKİ BAŞLIK DA ŞART: `Accept` olmadan XML dönüyor (belgelenen `?format=`
 * parametresi yok sayılıyor), `Accept-Language` olmadan uç `500 languageTag1`
 * veriyor. curl ikincisi olmadan da çalışıyor, Node/undici çalışmıyor — hata
 * yalnızca koda dökülünce ortaya çıkıyor.
 */
async function veri(tkn) {
  const r = await fetch(`https://nsiws.tuik.gov.tr/rest/data/TR,${AKIS},1.0/all`, {
    headers: {
      Authorization: `Bearer ${tkn}`,
      'Accept-Language': 'tr',
      Accept: 'application/vnd.sdmx.data+csv;version=1.0.0',
    },
  });
  if (!r.ok) throw new Error(`veri: HTTP ${r.status}`);
  return r.text();
}

const csvAyristir = (metin) => {
  const [basSatir, ...satirlar] = metin.trim().split('\n');
  const bas = basSatir.split(',');
  return satirlar.map((s) => Object.fromEntries(s.split(',').map((v, i) => [bas[i], v])));
};

const tkn = await token();
const hamSatirlar = csvAyristir(await veri(tkn));

/*
 * ─── KAYNAKTAKİ BOZUK AYLAR ─────────────────────────────────────────────────
 * TÜİK'in bu akışında bazı aylar ÇÖP taşıyor. Ölçüldü (2026-10-05): 2026-04 ve
 * 2026-08'de beş ölçünün beşi de (endeks, aylık, aralığa göre, yıllık, 12 aylık
 * ort.) her grupta AYNI sayı — 4.028,47 ve 4.289,23. Bu betik onları kontrol
 * etmeden yazdı ve sitede TÜFE "yıllık %4.289" gösterdi.
 *
 * Her hücre İKİ BAĞIMSIZ YOLDAN doğrulanıyor:
 *   yıllık(P) ≟ endeks(P) / endeks(P-12) − 1
 *   aylık(P)  ≟ endeks(P) / endeks(P-1)  − 1   (P-1 sağlamsa)
 * Tutmuyorsa hücre bozuk.
 *
 * Bozuk ay, SONRAKİ sağlam aydan türetiliyor:
 *   endeks(P) = endeks(P+1) / (1 + aylık(P+1))
 * ve yıllık/aylık bu endeksten hesaplanıyor. Yöntem bilinen ayda sınandı:
 * Ağustos 2026 için türetilen yıllık oran bültenle BİREBİR aynı (genel 31,51 ·
 * gıda 33,79) ve gıda aylığı (0,22) bültenden gelen fotoğrafla aynı.
 *
 * Türetilemeyen bozuk hücre (sonraki ay yok ya da o da bozuk) HİÇ YAZILMIYOR —
 * D1'deki değer korunuyor. Çöpü yazmaktansa eskiyi tutmak.
 */
const grupKodu = (s) => {
  if (s.SINIFLAMA_DUZEYI === 'TUFE') return 0;
  return /^\d{2}$/.test(s.COICOP_2018) ? Number(s.COICOP_2018) : null;
};
const ayKaydir = (donem, n) => {
  const [y, a] = donem.split('-').map(Number);
  const t = y * 12 + (a - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

/** g → DEGISIM → dönem → değer (yalnız aylık, grup düzeyindeki satırlar). */
const olcu = new Map();
for (const s of hamSatirlar) {
  if (s.FREQ !== 'M') continue;
  const g = grupKodu(s);
  const v = Number(s.OBS_VALUE);
  if (g === null || s.OBS_VALUE === '' || !Number.isFinite(v)) continue;
  if (!olcu.has(g)) olcu.set(g, new Map());
  if (!olcu.get(g).has(s.DEGISIM)) olcu.get(g).set(s.DEGISIM, new Map());
  olcu.get(g).get(s.DEGISIM).set(s.TIME_PERIOD, v);
}

const TOLERANS = 0.15; // yüzde puan — oranlar 2 ondalık yayımlanıyor
const bozuk = new Set(); // "g|P"
for (const [g, d] of olcu) {
  const I = d.get('1') ?? new Map();
  const y = d.get('4') ?? new Map();
  for (const [P, iP] of I) {
    const i12 = I.get(ayKaydir(P, -12));
    if (i12 !== undefined && y.has(P) && Math.abs((iP / i12) * 100 - 100 - y.get(P)) > TOLERANS) {
      bozuk.add(`${g}|${P}`);
    }
  }
  /* Aylık sınama ikinci turda: önceki ay bozuksa bu ayı haksız yere suçlamasın. */
  const m = d.get('2') ?? new Map();
  for (const [P, iP] of I) {
    const onceki = ayKaydir(P, -1);
    if (bozuk.has(`${g}|${P}`) || bozuk.has(`${g}|${onceki}`)) continue;
    const i1 = I.get(onceki);
    if (i1 !== undefined && m.has(P) && Math.abs((iP / i1) * 100 - 100 - m.get(P)) > TOLERANS) {
      bozuk.add(`${g}|${P}`);
    }
  }
}

/** Türetilen hücreler: "g|P" → { '1': endeks, '2': aylık, '4': yıllık } */
const turetilen = new Map();
const yuvarla = (v) => Math.round(v * 100) / 100;
for (const anahtar of [...bozuk].sort()) {
  const [gs, P] = anahtar.split('|');
  const g = Number(gs);
  const d = olcu.get(g);
  const sonraki = ayKaydir(P, 1);
  const iS = d.get('1')?.get(sonraki);
  const mS = d.get('2')?.get(sonraki);
  const i12 = d.get('1')?.get(ayKaydir(P, -12));
  const i1 = d.get('1')?.get(ayKaydir(P, -1));
  const sagla = (k) => !bozuk.has(`${g}|${k}`);
  if (iS === undefined || mS === undefined || !sagla(sonraki)) continue;
  const iP = iS / (1 + mS / 100);
  const deger = { 1: yuvarla(iP) };
  if (i12 !== undefined && sagla(ayKaydir(P, -12))) deger[4] = yuvarla((iP / i12) * 100 - 100);
  if (i1 !== undefined && sagla(ayKaydir(P, -1))) deger[2] = yuvarla((iP / i1) * 100 - 100);
  turetilen.set(anahtar, deger);
}

if (bozuk.size) {
  const aylar = [...new Set([...bozuk].map((k) => k.split('|')[1]))].sort();
  const turetilemeyen = [...bozuk].filter((k) => !turetilen.has(k));
  console.log(`\nKAYNAKTA BOZUK HÜCRE: ${bozuk.size} (aylar: ${aylar.join(', ')})`);
  console.log(`  türetildi: ${turetilen.size}  ·  türetilemedi (yazılmayacak): ${turetilemeyen.length}`);
  for (const P of aylar) {
    const tg = turetilen.get(`0|${P}`);
    const tf = turetilen.get(`1|${P}`);
    if (tg || tf) console.log(`  ${P} → genel yıllık ${tg?.[4] ?? '—'} · gıda yıllık ${tf?.[4] ?? '—'}`);
  }
  /* GitHub arayüzünde sarı uyarı olarak görünsün — loglarda kaybolmasın. */
  console.log(`::warning::TÜİK TÜFE akışında ${aylar.join(', ')} bozuk geliyor; `
    + `${turetilen.size} hücre komşu aydan türetildi, ${turetilemeyen.length} hücre yazılmadı.`);
}

/*
 * Sonraki kod `satirlar`ı okuyor. Bozuk hücreler burada ya türetilmiş değerle
 * değiştiriliyor ya da hiç geçmiyor — aşağıdaki hiçbir yazıcı çöpü göremiyor.
 */
const satirlar = hamSatirlar.flatMap((s) => {
  const g = grupKodu(s);
  if (s.FREQ !== 'M' || g === null || !bozuk.has(`${g}|${s.TIME_PERIOD}`)) return [s];
  const t = turetilen.get(`${g}|${s.TIME_PERIOD}`);
  const v = t?.[s.DEGISIM];
  return v === undefined ? [] : [{ ...s, OBS_VALUE: String(v) }];
});

/*
 * Yalnızca aylık ENDEKS (DEGISIM=1).
 *
 * İki tür satır alınıyor:
 *   COICOP_2018 = '01'..'13'  → ana harcama grupları, D1'de d1=1..13
 *   COICOP_2018 = '0'         → GENEL TÜFE, D1'de d1=0
 *
 * Genel satır ilk sürümde atlanmıştı ve sayfadaki "Aylık Endeks"/"Aylık
 * Trend" grafikleri Temmuz'da kalmaya devam etti — o grafikler ana grupları
 * değil genel TÜFE satırını okuyor. Ana grupları doldurup genel satırı
 * atlamak, tam da düzeltilmek istenen boşluğu bırakıyordu.
 *
 * DİKKAT — genel satırın kodu '_Z' DEĞİL. SDMX'te "boyut yok" işareti olan
 * '_Z', bu akışta COICOP_1999 sütununda duruyor; COICOP_2018'de genel TÜFE
 * tek haneli '0' olarak geliyor. `/^\d{2}$/` iki hane şart koştuğu için '0'
 * sessizce eleniyordu: betik hatasız çalışıp "286 grup×yıl yazıldı" diyor,
 * üretilen SQL'de tek bir d1=0 satırı bulunmuyordu. Onun için süzgeç artık
 * SINIFLAMA_DUZEYI'ne bakıyor — 'TUFE' genel, '2' ana grup — yani kod
 * biçimine değil, TÜİK'in kendi etiketine dayanıyor.
 */
const endeks = satirlar.filter((s) => s.FREQ === 'M' && s.DEGISIM === '1'
  && (s.SINIFLAMA_DUZEYI === 'TUFE' || /^\d{2}$/.test(s.COICOP_2018)));

/* COICOP '01'..'13' → D1'in d1 sütunu 1..13. Ana grup satırı, o d1 için
   id sırasına göre İLK satır; alt kategoriler aynı d1'i paylaşıyor. */
const grupla = new Map();
for (const s of endeks) {
  const d1 = s.SINIFLAMA_DUZEYI === 'TUFE' ? 0 : Number(s.COICOP_2018);
  const [yil, ay] = s.TIME_PERIOD.split('-').map(Number);
  if (!Number.isFinite(d1) || !yil || !ay) continue;
  const anahtar = `${d1}|${yil}`;
  if (!grupla.has(anahtar)) grupla.set(anahtar, {});
  grupla.get(anahtar)[AYLAR[ay - 1]] = Number(s.OBS_VALUE);
}

console.log(`SDMX: ${endeks.length} aylık endeks gözlemi, ${grupla.size} grup×yıl`);
const yillar = [...new Set([...grupla.keys()].map((k) => Number(k.split('|')[1])))].sort();
console.log(`yıl aralığı: ${yillar[0]} → ${yillar.at(-1)}`);

if (!SQL_YOL) {
  const son = yillar.at(-1);
  console.log(`\n${son} ana grup endeksleri:`);
  for (let d1 = 0; d1 <= 13; d1 += 1) {
    const v = grupla.get(`${d1}|${son}`);
    if (v) console.log(`  ${String(d1).padStart(2)}: ` + AYLAR.map((a) => (v[a] != null ? v[a].toFixed(1) : '—')).join(' '));
  }
  console.log('\n--sql verilmedi, dosya üretilmedi.');
  process.exit(0);
}

/*
 * Hedef satır: o d1 ve yıl için EN KÜÇÜK id — yani ana grup satırı. Alt
 * kategoriler aynı d1'i paylaşıyor ve bilerek güncellenmiyor; onların
 * değerleri zaten yanlış ve bu akıştan doğrusu türetilemiyor (TT01 yalnızca
 * ana grupları taşıyor). Yanlışı tazelemektense dokunmamak doğru.
 *
 * İfadeler TOPLU gönderiliyor: 286 ayrı wrangler çağrısı 286 alt süreç
 * demekti; elli ifadelik demetler tek çağrıya sığıyor.
 */
const ifadeler = [];
for (const [anahtar, aylar] of grupla) {
  const [d1, yil] = anahtar.split('|').map(Number);
  const set = AYLAR.filter((a) => aylar[a] != null)
    .map((a) => `"${a}" = ${aylar[a]}`).join(', ');
  if (!set) continue;
  ifadeler.push(`UPDATE ${TABLO} SET ${set} WHERE id = (SELECT MIN(id) FROM ${TABLO} `
    + `WHERE endeks='TUFE' AND d1=${d1} AND yil=${yil});`);
}

/*
 * ─── BASIC'İN OKUDUĞU ÜÇ TABLO DA AYNI AKIŞTAN ──────────────────────────────
 * Yukarısı `tuik_fiyatendex`i (Pro'nun tablosu) yazıyordu. Basic ise TÜFE
 * sayfasında BAŞKA üç tabloyu okuyor — `tufe_aylik` (trend), `tufe_yillik_
 * snapshot` ve `tufe_aylik_snapshot` (ana grup çubukları). Ağustos yayımlandığı
 * halde mobil uygulama Temmuz'da kalmıştı: endeks tablosu tazelendi, bu üçü
 * tazelenmedi. Aynı verinin iki ayrı besleme yolu olması sorunun kendisiydi.
 *
 * Üçü de `scripts/tufe-guncelle.mjs` ile TÜİK bülten JSON'undan besleniyordu;
 * o dosya Node'dan 404 verdiği için elle çalıştırılması gerekiyordu — yani
 * unutulmaya açıktı. Aynı sayılar bu SDMX akışında zaten var:
 *
 *   DEGISIM=2 → aylık % değişim   → tufe_aylik_snapshot.aylik_degisim
 *   DEGISIM=4 → yıllık % değişim  → tufe_aylik.tufe / .gida_alkolsuz
 *                                 → tufe_yillik_snapshot.yillik_degisim
 *
 * ─── KOD → AD EŞLEMESİ VARSAYIM DEĞİL, ÖLÇÜM ────────────────────────────────
 * SDMX yalnız COICOP kodunu taşıyor, snapshot tabloları Türkçe grup adını.
 * Eşleme "herhalde sırayla" diye kabul edilmedi: Temmuz 2026'nın 14 değeri
 * D1'deki 14 satırla karşılaştırıldı ve 14/14 birebir tuttu (genel 31,75 ·
 * gıda 37,53 · eğitim 44,18 …). Sıra yanlış olsaydı bu eşleşme çıkmazdı.
 */
const GRUP_ADLARI = [
  'TÜFE (Genel Endeks)', 'Gıda ve alkolsüz içecekler', 'Alkollü içecekler ve tütün',
  'Giyim ve ayakkabı', 'Konut', 'Mobilya ve ev eşyası', 'Sağlık', 'Ulaştırma',
  'Bilgi ve iletişim', 'Eğlence ve kültür', 'Eğitim', 'Lokanta ve konaklama',
  'Sigorta ve finansal hizmetler', 'Çeşitli mal ve hizmetler',
];

/** DEGISIM koduna göre {d1 → {dönem → değer}} çıkarır. */
const oranSerisi = (degisim) => {
  const cikti = new Map();
  for (const s of satirlar) {
    if (s.FREQ !== 'M' || s.DEGISIM !== degisim) continue;
    const genel = s.SINIFLAMA_DUZEYI === 'TUFE';
    if (!genel && !/^\d{2}$/.test(s.COICOP_2018)) continue;
    const d1 = genel ? 0 : Number(s.COICOP_2018);
    if (!cikti.has(d1)) cikti.set(d1, new Map());
    cikti.get(d1).set(s.TIME_PERIOD, Number(s.OBS_VALUE));
  }
  return cikti;
};

const yillikOran = oranSerisi('4');
const aylikOran = oranSerisi('2');
const tumDonemler = [...new Set([...yillikOran.get(0)?.keys() ?? []])].sort();
const sonDonem = tumDonemler.at(-1);
const [sonYil, sonAy] = sonDonem.split('-').map(Number);

const tirnak = (s) => `'${String(s).replace(/'/g, "''")}'`;

/* tufe_aylik: her ay için genel TÜFE ve gıda grubunun YILLIK değişimi.
   Var olan satır güncelleniyor, yoksa ekleniyor — tablo (yil, ay) anahtarında
   benzersiz değil, o yüzden önce silip sonra eklemek yinelenen satır bırakırdı. */
for (const donem of tumDonemler) {
  const [yil, ay] = donem.split('-').map(Number);
  const tufe = yillikOran.get(0)?.get(donem);
  const gida = yillikOran.get(1)?.get(donem);
  if (tufe == null || gida == null) continue;
  ifadeler.push(
    `UPDATE tufe_aylik SET tufe = ${tufe}, gida_alkolsuz = ${gida} WHERE yil=${yil} AND ay=${ay};`,
    `INSERT INTO tufe_aylik (yil, ay, tufe, gida_alkolsuz) SELECT ${yil}, ${ay}, ${tufe}, ${gida} `
      + `WHERE NOT EXISTS (SELECT 1 FROM tufe_aylik WHERE yil=${yil} AND ay=${ay});`,
  );
}

/* Snapshot'lar tanım gereği TEK dönem tutuyor: son ay. Bu yüzden satır
   eklemek değil, var olan 14 satırı ada göre güncellemek doğru olan. */
for (const [i, ad] of GRUP_ADLARI.entries()) {
  const y = yillikOran.get(i)?.get(sonDonem);
  const a = aylikOran.get(i)?.get(sonDonem);
  if (y != null) {
    ifadeler.push(`UPDATE tufe_yillik_snapshot SET yillik_degisim = ${y} WHERE harcama_grubu = ${tirnak(ad)};`);
  }
  if (a != null) {
    ifadeler.push(`UPDATE tufe_aylik_snapshot SET aylik_degisim = ${a} WHERE harcama_grubu = ${tirnak(ad)};`);
  }
}

/* Damga da aynı dosyada: yazma ile damga ilerletme ayrılırsa, arada bir hata
   olduğunda tablo yeni ama önbellek eski kalıyor. */
ifadeler.push(damgaSql([TABLO, 'tufe_aylik', 'tufe_yillik_snapshot', 'tufe_aylik_snapshot']));
writeFileSync(SQL_YOL, ifadeler.join('\n'), 'utf8');

/*
 * ─── BEKLENTİ: YAZMANIN ETKİSİ ÖLÇÜLÜYOR ────────────────────────────────────
 * wrangler bir dosyayı "başarıyla" çalıştırıp hiçbir satırı değiştirmemiş
 * olabilir — WHERE tutmazsa UPDATE 0 satır etkiler ve hata vermez. Bu depoda
 * tam olarak bu yaşandı: senkron aylarca "güncellendi" yazıp hiçbir şey
 * yazmıyordu. O yüzden yazmadan sonra D1'e geri sorulacak değerler burada,
 * kaynaktan, ayrı bir dosyaya çıkarılıyor; doğrulayıcı bunları karşılaştırıyor.
 */
if (BEKLENTI_YOL) {
  const gidaAd = GRUP_ADLARI[1];
  const beklenti = [
    { aciklama: `tufe_aylik ${sonDonem} genel yıllık`,
      sorgu: `SELECT tufe AS v FROM tufe_aylik WHERE yil=${sonYil} AND ay=${sonAy}`,
      deger: yillikOran.get(0)?.get(sonDonem) },
    { aciklama: `tufe_aylik ${sonDonem} gıda yıllık`,
      sorgu: `SELECT gida_alkolsuz AS v FROM tufe_aylik WHERE yil=${sonYil} AND ay=${sonAy}`,
      deger: yillikOran.get(1)?.get(sonDonem) },
    { aciklama: `tufe_yillik_snapshot genel (${sonDonem})`,
      sorgu: `SELECT yillik_degisim AS v FROM tufe_yillik_snapshot WHERE harcama_grubu=${tirnak(GRUP_ADLARI[0])}`,
      deger: yillikOran.get(0)?.get(sonDonem) },
    { aciklama: `tufe_aylik_snapshot gıda (${sonDonem})`,
      sorgu: `SELECT aylik_degisim AS v FROM tufe_aylik_snapshot WHERE harcama_grubu=${tirnak(gidaAd)}`,
      deger: aylikOran.get(1)?.get(sonDonem) },
    { aciklama: `tufe_aylik ${sonDonem} satır sayısı (yinelenme yok)`,
      sorgu: `SELECT COUNT(*) AS v FROM tufe_aylik WHERE yil=${sonYil} AND ay=${sonAy}`,
      deger: 1 },
    /*
     * MAKULLÜK — yalnız son ayı kontrol etmek yetmedi: 2026-10-05'teki koşu
     * son ayı (Eylül) doğru yazdı ve 5/5 yeşil geçti, ama aynı dosya Nisan ve
     * Ağustos'u 4.028 ve 4.289 olarak yazmıştı. Tüm serideki uç değer sayılıyor.
     * Türkiye'de 2005'ten beri yıllık TÜFE %86'yı aşmadı; 200 cömert bir sınır.
     */
    { aciklama: 'tufe_aylik tüm seride |oran| ≤ 200 olmayan satır',
      sorgu: 'SELECT COUNT(*) AS v FROM tufe_aylik WHERE ABS(tufe) > 200 OR ABS(gida_alkolsuz) > 200',
      deger: 0 },
    { aciklama: 'tuik_fiyatendex TUFE ana satırlarda (2025+) 1000 üstü endeks',
      sorgu: `SELECT COUNT(*) AS v FROM ${TABLO} WHERE endeks='TUFE' AND yil >= 2025 `
        + `AND id IN (SELECT MIN(id) FROM ${TABLO} WHERE endeks='TUFE' GROUP BY d1, yil) AND (`
        + AYLAR.map((a) => `"${a}" > 1000`).join(' OR ') + ')',
      deger: 0 },
  ].filter((b) => b.deger != null);
  writeFileSync(BEKLENTI_YOL, JSON.stringify(beklenti, null, 2), 'utf8');
  console.log(`${beklenti.length} beklenti → ${BEKLENTI_YOL}`);
}
console.log(`\nson dönem: ${sonYil}-${String(sonAy).padStart(2, '0')} `
  + `(genel yıllık ${yillikOran.get(0)?.get(sonDonem)}%, gıda ${yillikOran.get(1)?.get(sonDonem)}%)`);
console.log(`${ifadeler.length - 1} ifade + damga → ${SQL_YOL}`);
console.log(`Çalıştır: npx wrangler d1 execute ${DB} --remote --file ${SQL_YOL}`);
