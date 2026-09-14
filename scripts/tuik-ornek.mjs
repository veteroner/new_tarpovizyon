/**
 * TÜİK SDMX veri seti ÖRNEKLEME — "bu akışın içinde ne var?" sorusunun aracı.
 *
 * ─── NEDEN DSD OKUNMUYOR ────────────────────────────────────────────────────
 * Boyutları ve kodları öğrenmenin belgelenmiş yolu `?references=all` ile DSD'yi
 * çekip kod listelerini ayrıştırmak. Ama keşif için pahalı: XML ayrıştırıcı
 * gerekir ve kodların KULLANILIYOR olup olmadığını yine söylemez — bir kod
 * listesinde bulunup veride hiç geçmeyen kod bu projede zaten görüldü.
 *
 * Bunun yerine VERİNİN KENDİSİ okunuyor: CSV başlığı boyutları, sütunlardaki
 * ayrık değerler gerçekten kullanılan kodları, son satırlar da dönem biçimini
 * ve serinin nereye kadar geldiğini veriyor. Yani `datasets.mjs`'e satır
 * yazmak için gereken her şey tek turda çıkıyor.
 *
 * Betik hiçbir şey YAZMIYOR. `tuik-kesfet.mjs` "var mı" sorusunu, bu betik
 * "nasıl" sorusunu cevaplıyor.
 *
 * Kullanım:
 *   TUIK_API_KEY=... node scripts/tuik-ornek.mjs DF_IHRACAT_BIRIM_DEGER_V1 ...
 */

const TOKEN_URL = 'https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token';
const VERI_BASE = 'https://nsiws.tuik.gov.tr/rest/data/TR,';
const SDMX_CSV = 'application/vnd.sdmx.data+csv;version=1.0.0';

const anahtar = process.env.TUIK_API_KEY;
if (!anahtar) {
  console.error('TUIK_API_KEY gerekli.');
  process.exit(2);
}

const akislar = process.argv.slice(2).filter(Boolean);
if (!akislar.length) {
  console.error('En az bir akış kimliği verin.');
  process.exit(2);
}

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

/* Tırnaklı alanları da ayıran küçük CSV bölücü — TÜİK etiketlerinde virgül
   geçiyor ve `split(',')` sütunları kaydırıyor. */
function csvBol(satir) {
  const alan = [];
  let s = '';
  let tirnak = false;
  for (let i = 0; i < satir.length; i++) {
    const c = satir[i];
    if (tirnak) {
      if (c === '"' && satir[i + 1] === '"') { s += '"'; i++; } else if (c === '"') tirnak = false;
      else s += c;
    } else if (c === '"') tirnak = true;
    else if (c === ',') { alan.push(s); s = ''; } else s += c;
  }
  alan.push(s);
  return alan;
}

let hata = 0;

for (const flow of akislar) {
  console.log(`\n${'═'.repeat(70)}\n${flow}\n${'═'.repeat(70)}`);
  let res;
  try {
    res = await fetch(`${VERI_BASE}${flow},1.0`, {
      /* Accept-Language ŞART: başlıksız istekte uç `500 languageTag1` döner. */
      headers: { Authorization: `Bearer ${token}`, Accept: SDMX_CSV, 'Accept-Language': 'tr' },
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    console.log(`  HATA: ${e.name}`);
    hata++;
    continue;
  }
  if (!res.ok) {
    console.log(`  HTTP ${res.status}`);
    hata++;
    continue;
  }

  const metin = await res.text();
  const satirlar = metin.trim().split('\n');
  if (satirlar.length < 2) {
    console.log('  BOŞ (yalnız başlık)');
    hata++;
    continue;
  }

  const basliklar = csvBol(satirlar[0]).map((s) => s.trim());
  const veri = satirlar.slice(1).map(csvBol);
  console.log(`  satır: ${veri.length}`);
  console.log(`  sütun: ${basliklar.join(' | ')}\n`);

  /* Her sütunun ayrık değerleri — gerçekten KULLANILAN kodlar bunlar.
     Çok değerli sütunlar (dönem, değer) kısaltılıyor. */
  basliklar.forEach((b, i) => {
    const kume = new Set(veri.map((r) => (r[i] ?? '').trim()));
    const dizi = [...kume].sort();
    if (dizi.length <= 25) {
      console.log(`  ${b} (${dizi.length}): ${dizi.join(', ')}`);
    } else {
      console.log(`  ${b} (${dizi.length}): ${dizi.slice(0, 3).join(', ')} … ${dizi.slice(-3).join(', ')}`);
    }
  });

  console.log('\n  --- son 3 satır ---');
  for (const r of veri.slice(-3)) console.log(`  ${r.join(' | ')}`);
}

/* Hiçbir akış okunamadıysa sessizce başarılı bitmiyor: bu betiğin çıktısına
   bakıp "demek ki veri yok" denmesi, ölçmeden karar vermenin ta kendisi. */
if (hata === akislar.length) {
  console.error('\nHiçbir akış okunamadı.');
  process.exit(1);
}
