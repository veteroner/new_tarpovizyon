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
 * ─── SÜZGEÇ NEDEN GEREKLİ ───────────────────────────────────────────────────
 * Ayrık değerleri görmek boyutları söylüyor ama birlikte NASIL davrandıklarını
 * söylemiyor. `datasets.mjs`'teki `wide` yazıcı bir dönemi bir sütuna
 * eşliyor; aynı dönem+kod için birden çok satır dönerse sonuncusu diğerlerini
 * sessizce eziyor. `--filtre` ile daraltıp satır sayısını saymak bunu ölçüyor.
 *
 * Kullanım:
 *   TUIK_API_KEY=... node scripts/tuik-ornek.mjs DF_IHRACAT_BIRIM_DEGER_V1
 *   TUIK_API_KEY=... node scripts/tuik-ornek.mjs DF_... --filtre FREQ=M,SITC_REV4_205=_Z --son 6
 */

const TOKEN_URL = 'https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token';
const VERI_BASE = 'https://nsiws.tuik.gov.tr/rest/data/TR,';
const SDMX_CSV = 'application/vnd.sdmx.data+csv;version=1.0.0';

const anahtar = process.env.TUIK_API_KEY;
if (!anahtar) {
  console.error('TUIK_API_KEY gerekli.');
  process.exit(2);
}

const argv = process.argv.slice(2).filter(Boolean);

/** `--filtre A=1,B=2` → { A: '1', B: '2' } */
const filtre = {};
const fi = argv.indexOf('--filtre');
if (fi >= 0) {
  for (const p of (argv[fi + 1] ?? '').split(',').filter(Boolean)) {
    const [k, ...v] = p.split('=');
    filtre[k.trim()] = v.join('=').trim();
  }
  argv.splice(fi, 2);
}

const si = argv.indexOf('--son');
let sonN = 3;
if (si >= 0) {
  sonN = Number(argv[si + 1]) || 3;
  argv.splice(si, 2);
}

const akislar = argv.filter((a) => !a.startsWith('--'));
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
  let veri = satirlar.slice(1).map(csvBol);

  const filtreAnahtar = Object.keys(filtre);
  if (filtreAnahtar.length) {
    const eksik = filtreAnahtar.filter((k) => !basliklar.includes(k));
    if (eksik.length) {
      /* Olmayan bir sütuna süzgeç uygulamak sessizce HER satırı elerdi ve
         çıktı "veri yok" gibi okunurdu — o yüzden açıkça söyleniyor. */
      console.log(`  UYARI: süzgeçteki sütun(lar) yok: ${eksik.join(', ')}`);
    }
    const once = veri.length;
    veri = veri.filter((r) => filtreAnahtar.every((k) => {
      const i = basliklar.indexOf(k);
      return i >= 0 && (r[i] ?? '').trim() === filtre[k];
    }));
    console.log(`  süzgeç: ${JSON.stringify(filtre)} → ${once} satırdan ${veri.length}`);
    if (!veri.length) { hata++; continue; }
  }

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

  /*
   * DÖNEM YİNELENMESİ — `wide` yazıcısı için hayati. O yazıcı dönem başına
   * tek değer tutuyor; aynı dönem birden çok satırla gelirse sonuncusu
   * diğerlerini eziyor ve hangisinin kazandığı CSV sırasına kalıyor.
   */
  const dIdx = basliklar.indexOf('TIME_PERIOD');
  if (dIdx >= 0) {
    const sayac = new Map();
    for (const r of veri) {
      const d = (r[dIdx] ?? '').trim();
      sayac.set(d, (sayac.get(d) ?? 0) + 1);
    }
    const yinelenen = [...sayac].filter(([, n]) => n > 1);
    console.log(`\n  dönem yinelenmesi: ${yinelenen.length ? `VAR (${yinelenen.length} dönem, ör. ${yinelenen[0][0]}×${yinelenen[0][1]})` : 'yok'}`);
  }

  const vIdx = basliklar.indexOf('OBS_VALUE');

  /*
   * Kuyruk satırlarında DEĞİŞEN boyutlar da yazılıyor. Yalnız dönem ve değer
   * basmak, süzgeç bir boyutu sabitlemediğinde hangi satırın hangi koda ait
   * olduğunu gizliyordu — kod→ürün eşlemesi tam olarak bu yüzden gerekiyor.
   */
  const degisenler = basliklar
    .map((b, i) => ({ b, i }))
    .filter(({ b, i }) => b !== 'TIME_PERIOD' && b !== 'OBS_VALUE'
      && new Set(veri.map((r) => (r[i] ?? '').trim())).size > 1);

  console.log(`\n  --- son ${sonN} satır ---`);
  for (const r of veri.slice(-sonN)) {
    if (dIdx < 0 || vIdx < 0) { console.log(`  ${r.join(' | ')}`); continue; }
    const ek = degisenler.map(({ b, i }) => `${b}=${(r[i] ?? '').trim()}`).join('  ');
    console.log(`  ${r[dIdx]}${ek ? `  ${ek}` : ''} = ${r[vIdx]}`);
  }
}

/* Hiçbir akış okunamadıysa sessizce başarılı bitmiyor: bu betiğin çıktısına
   bakıp "demek ki veri yok" denmesi, ölçmeden karar vermenin ta kendisi. */
if (hata === akislar.length) {
  console.error('\nHiçbir akış okunamadı.');
  process.exit(1);
}
