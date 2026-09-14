/**
 * TÜİK SDMX veri akışı arama — "bu veri kaynakta var mı?" sorusunun aracı.
 *
 * ─── NEDEN AYRI BİR BETİK ───────────────────────────────────────────────────
 * "Şu veri TÜİK'te var mı" sorusu bu projede sık soruluyor ve her seferinde
 * tahminle cevaplanıyordu. Tahmin iki yönde de pahalı: olmayan bir veri için
 * boşuna kod yazılıyor, ya da var olan bir veri "yok" sanılıp elle giriliyor.
 *
 * Betik hiçbir şey YAZMIYOR — yalnız akış listesini alıp arıyor. Veri
 * senkronundan ayrı tutulmasının sebebi de bu: çalışan bir boru hattına
 * keşif adımı eklemek, onu keşif hatalarına açık hale getirirdi.
 *
 * ─── ANAHTAR ────────────────────────────────────────────────────────────────
 * `TUIK_API_KEY` ortam değişkeninden. CI'da secret olarak duruyor; yerelde
 * çalıştırmak için elle vermek gerekir.
 *
 * Kullanım:
 *   TUIK_API_KEY=... node scripts/tuik-kesfet.mjs "dış ticaret"
 *   TUIK_API_KEY=... node scripts/tuik-kesfet.mjs            (tüm liste)
 */

const TOKEN_URL = 'https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token';
const DATAFLOW_URL = 'https://nsiws.tuik.gov.tr/rest/dataflow/TR/all/latest';

const anahtar = process.env.TUIK_API_KEY;
if (!anahtar) {
  console.error('TUIK_API_KEY gerekli.');
  process.exit(2);
}

const arananHam = process.argv.slice(2).join(' ').trim();

/** Türkçe büyük/küçük harf farkını da eziyor — "İ" ve "ı" tuzağı. */
const normalle = (s) => String(s ?? '')
  .toLocaleLowerCase('tr')
  .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c]));

const token = await (async () => {
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', client_id: 'nsi-ws-consumer', api_key: anahtar }),
  });
  if (!r.ok) throw new Error(`Token alınamadı (HTTP ${r.status})`);
  const b = await r.json();
  if (!b.access_token) throw new Error('access_token yok');
  return b.access_token;
})();

/*
 * ─── `Accept-Language` ŞART ─────────────────────────────────────────────────
 * İlk sürüm bu başlığı BİLEREK göndermiyordu ve üç varyant da HTTP 500 döndü.
 * Sebebi ölçülmeden tahmin edilmişti; çalışan iki betik (`tuik-sync/sync.mjs`
 * ve `tufe-sdmx-yukle.mjs`) başlığı gönderiyor ve ikisinin de yorumunda aynı
 * cümle var: başlıksız istekte servis `500 languageTag1` veriyor. curl
 * kendiliğinden gönderdiği için elde çalışıyormuş gibi görünüyor, Node/undici
 * göndermiyor — yani hata yalnız kodda ortaya çıkıyor.
 *
 * ─── VARYANTLAR ─────────────────────────────────────────────────────────────
 * Anahtar yalnız CI'da olduğu için her deneme bir tur demek; varyantlar TEK
 * turda sırayla deneniyor. ZAMAN AŞIMI zorunlu: bir önceki turda bir varyant
 * 4,5 dakika yanıtsız asılı kaldı ve iş iptal edildi, yani sonraki varyantlar
 * hiç denenemedi.
 */
const VARYANTLAR = [
  { url: `${DATAFLOW_URL}?references=none&detail=allstubs`, accept: 'application/vnd.sdmx.structure+json;version=1.0' },
  { url: DATAFLOW_URL, accept: 'application/vnd.sdmx.structure+json;version=1.0' },
  { url: DATAFLOW_URL, accept: 'application/vnd.sdmx.structure+xml;version=2.1' },
  { url: DATAFLOW_URL, accept: 'application/json' },
];

let r = null;
let kullanilan = null;
for (const v of VARYANTLAR) {
  let y;
  try {
    y = await fetch(v.url, {
      headers: { Authorization: `Bearer ${token}`, Accept: v.accept, 'Accept-Language': 'tr' },
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e) {
    console.log(`  deneme: HATA (${e.name})  accept=${v.accept}`);
    continue;
  }
  console.log(`  deneme: ${y.status}  accept=${v.accept}  ${v.url.replace(DATAFLOW_URL, '…')}`);
  if (y.ok) { r = y; kullanilan = v; break; }
}
if (!r) {
  console.error('Hiçbir varyant çalışmadı — uç biçimi değişmiş olabilir.');
  process.exit(1);
}
console.log(`\nÇALIŞAN: accept=${kullanilan.accept}\n`);

const icerikTipi = r.headers.get('content-type') ?? '';
if (icerikTipi.includes('xml')) {
  /* XML döndüyse akış kimliklerini kaba biçimde ayıklıyoruz — yalnız keşif
     için, ayrıştırıcı kurmaya değmez. */
  const metin = await r.text();
  const idler = [...metin.matchAll(/<(?:str:)?Dataflow[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
  const adlar = [...metin.matchAll(/<(?:com:)?Name[^>]*>([^<]+)<\//g)].map((m) => m[1]);
  console.log(`Toplam akış (XML): ${idler.length}`);
  const ar = normalle(arananHam).split(/\s+/).filter(Boolean);
  idler.forEach((id, i) => {
    const metin2 = normalle(`${id} ${adlar[i] ?? ''}`);
    if (!ar.length || ar.every((k) => metin2.includes(k))) console.log(`  ${id}\n      ${adlar[i] ?? ''}`);
  });
  process.exit(0);
}

const govde = await r.json();
const akislar = govde?.data?.dataflows ?? [];
if (!akislar.length) {
  console.error('HATA: liste boş döndü — yanıt biçimi değişmiş olabilir.');
  process.exit(2);
}

const ad = (d) => (typeof d.name === 'string' ? d.name : (d.names?.tr ?? d.names?.en ?? d.name?.tr ?? ''));

const arananlar = normalle(arananHam).split(/\s+/).filter(Boolean);
const eslesen = arananlar.length
  ? akislar.filter((d) => {
    const metin = normalle(`${d.id} ${ad(d)}`);
    return arananlar.every((k) => metin.includes(k));
  })
  : akislar;

console.log(`Toplam akış: ${akislar.length}`);
console.log(arananHam ? `"${arananHam}" ile eşleşen: ${eslesen.length}\n` : '');
for (const d of eslesen) {
  console.log(`  ${d.id}`);
  console.log(`      ${ad(d)}`);
}
if (!eslesen.length) console.log('  (eşleşme yok)');
