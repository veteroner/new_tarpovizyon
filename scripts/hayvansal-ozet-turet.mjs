#!/usr/bin/env node
/**
 * `tr_hayvansal_urun_uretimi` özetini otomatik tablolardan tazeler.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Bu tablo sekiz sayfanın okuduğu yıllık özet (ana sayfa kartları dahil):
 * süt, kırmızı et, yumurta, kanatlı eti, bal. İlk dördü D1'de zaten otomatik
 * güncellenen tablolarda duruyor; özet onların ELLE girilmiş bir kopyasıydı.
 *
 * Ölçüldü (2026-10-14): dört sütun 2001'den beri kaynaklarıyla büyük ölçüde
 * birebir aynı — yani gerçekten kopya — ama TÜİK'in sonradan yaptığı
 * revizyonlar özete hiç yansımamış:
 *   süt 2023      özet 43.025 ton EKSİK
 *   kanatlı 2020  özet 2.188 ton fazla
 *   kanatlı 2025  özet 51 ton fazla
 * ve birkaç yılda ±2 tonluk yuvarlama farkı.
 *
 * ─── KAYNAKLAR ──────────────────────────────────────────────────────────────
 *   cig_sut_uretimi      ← cig_sut_uretim_miktari.toplam_sut_uretimi_ton
 *   kirmizi_et_uretimi   ← kirmizi_et_uretim_miktari.toplam_kirmizi_et_uretimi_ton
 *   yumurta_milyon_adet  ← Σ kanatli_uretimleri.tavuk_yumurtasi_bin_adet / 1000
 *   kanatli_eti_ton      ← Σ kanatli_uretimleri.tavuk_eti_ton
 * Kanatlı sütunları yalnız 12 ayı TAMAM yıllar için hesaplanıyor — yarım yılın
 * toplamı yıllık rakam gibi görünürdü.
 *
 * ─── YENİ YIL SATIRI EKLENMİYOR ─────────────────────────────────────────────
 * Balın otomatik bir kaynağı yok. Bal sütunu boş bir yeni yıl satırı eklemek,
 * en son yılı okuyan sayfalarda "bal 0" ve "%−100" demek olurdu. O yüzden bu
 * betik yalnız VAR OLAN yılların dört sütununu yazıyor; yeni yılın satırı (bal
 * ile birlikte) elle açılıyor, açıldığı anda dört sütunu bu betik dolduruyor.
 * Kaynaklar yeni bir yıl için hazırsa ama satır yoksa uyarı basılıyor.
 *
 * Kullanım:
 *   node scripts/hayvansal-ozet-turet.mjs          # yalnız rapor
 *   node scripts/hayvansal-ozet-turet.mjs --yaz    # yaz, sonra D1'den geri okuyup doğrula
 */

import { damgaSql } from './lib/damga.mjs';

const yaz = process.argv.includes('--yaz');
const TABLO = 'tr_hayvansal_urun_uretimi';

/*
 * D1 ERİŞİMİ — CI'da REST (CLOUDFLARE_* secret'ları), yerelde wrangler.
 * Herkese açık API kenar önbelleğinden geçtiği için kullanılmıyor: yazmadan
 * hemen sonraki doğrulama eski yanıtı okuyup "fark var" diyebilirdi.
 */
const rest = Boolean(process.env.CLOUDFLARE_API_TOKEN
  && process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_D1_DATABASE_ID);
const WRANGLER = 'wrangler@4.131.2'; // package.json ile aynı

async function d1(sql) {
  if (rest) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`
      + `/d1/database/${process.env.CLOUDFLARE_D1_DATABASE_ID}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    });
    const b = await r.json().catch(() => null);
    if (!r.ok || !b?.success) throw new Error(`D1 hatası (HTTP ${r.status}): ${JSON.stringify(b?.errors ?? b)}`);
    return b.result;
  }
  const { execFileSync } = await import('node:child_process');
  const cikti = execFileSync('npx',
    ['--yes', WRANGLER, 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--json', '--command', sql],
    { cwd: 'workers/tarpovizyon-api', encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, LANG: 'en_US.UTF-8' } });
  return JSON.parse(cikti.slice(cikti.indexOf('[')));
}
const sorgu = async (sql) => (await d1(sql))[0]?.results ?? [];

/** Kaynaklardan yıl → { sütun: değer } */
async function kaynaklar() {
  const [sut, et, kanatli] = await Promise.all([
    sorgu('SELECT yil, toplam_sut_uretimi_ton v FROM cig_sut_uretim_miktari'),
    sorgu('SELECT yil, toplam_kirmizi_et_uretimi_ton v FROM kirmizi_et_uretim_miktari'),
    sorgu(`SELECT CAST(substr(tarih,1,4) AS INTEGER) yil, COUNT(*) ay,
             SUM(tavuk_yumurtasi_bin_adet) yum, SUM(tavuk_eti_ton) tav
             FROM kanatli_uretimleri GROUP BY 1`),
  ]);
  const k = new Map();
  const ekle = (yil, sutun, v) => {
    if (v === null || v === undefined || !Number.isFinite(Number(v))) return;
    const y = Number(String(yil).slice(0, 4));
    if (!k.has(y)) k.set(y, {});
    k.get(y)[sutun] = Number(v);
  };
  for (const r of sut) ekle(r.yil, 'cig_sut_uretimi', Math.round(r.v));
  for (const r of et) ekle(r.yil, 'kirmizi_et_uretimi', Math.round(r.v));
  for (const r of kanatli) {
    if (Number(r.ay) !== 12) continue; // yarım yıl yıllık rakam değildir
    ekle(r.yil, 'yumurta_milyon_adet', Math.round((Number(r.yum) / 1000) * 100) / 100);
    ekle(r.yil, 'kanatli_eti_ton', Math.round(r.tav));
  }
  return k;
}

/*
 * ─── TOLERANS: YUVARLAMA GÜRÜLTÜSÜ YAZILMIYOR ───────────────────────────────
 * Kanatlı sütunları 12 aylık değerin TOPLAMI ve aylık değerler tam sayıya
 * yuvarlanmış tutuluyor; toplamda ±6 ton (yumurtada ±0,006 milyon) birikebilir.
 * Özet ise birçok yılda TÜİK'in ondalıklı yıllık rakamını taşıyor
 * (ör. 2012: 1.723.918,63). İlk sürüm 1–2 tonluk bu farkları da "düzeltiyordu" —
 * yani DAHA HASSAS değeri DAHA KABA olanla eziyordu. Tolerans o birikimin
 * üst sınırı; bunun üstündeki fark gerçek revizyon ya da hata
 * (ör. 2020: özet 2019'un değerini birebir tekrarlıyordu, fark 2.188 ton).
 *
 * Süt ve et kaynakları zaten YILLIK resmî rakam (tam sayı) — orada yarım
 * tondan büyük her fark gerçek.
 */
const TOLERANS = { kanatli_eti_ton: 6.5, yumurta_milyon_adet: 0.012 };

/*
 * ─── YALNIZ 2001 VE SONRASI ─────────────────────────────────────────────────
 * Kopya olduğu 2001–2025 aralığında ÖLÇÜLDÜ. Daha eski yıllarda iki tablo
 * aynı şeyi ölçmüyor: kırmızı ette 1986–2000 arası özet kaynaktan %1 ile %29
 * arasında farklı (1986: 850.589 ↔ 606.130). Bu revizyon değil, tanım farkı —
 * o yıllara kaynaktan yazmak bir seriyi başka bir seriyle değiştirmek olurdu.
 * İlk kuru çalıştırma bunları da "düzeltiyordu"; sınır bu yüzden konuldu.
 */
const ILK_YIL = 2001;
const farkli = (sutun, a, b) => a === null || a === undefined
  || Math.abs(Number(a) - b) >= (TOLERANS[sutun] ?? 0.5);

async function fark(kaynak) {
  const ozet = await sorgu(`SELECT id, yil, cig_sut_uretimi, kirmizi_et_uretimi, yumurta_milyon_adet, kanatli_eti_ton FROM ${TABLO}`);
  const ifadeler = [];
  const degisim = [];
  for (const r of ozet) {
    const y = Number(String(r.yil).slice(0, 4));
    const hedef = y >= ILK_YIL ? kaynak.get(y) : null;
    if (!hedef) continue;
    const set = [];
    for (const [sutun, v] of Object.entries(hedef)) {
      if (!farkli(sutun, r[sutun], v)) continue;
      set.push(`${sutun} = ${v}`);
      degisim.push({ yil: y, sutun, eski: r[sutun], yeni: v });
    }
    if (set.length) ifadeler.push(`UPDATE ${TABLO} SET ${set.join(', ')} WHERE id = ${Number(r.id)};`);
  }
  const ozetYillar = new Set(ozet.map((r) => Number(String(r.yil).slice(0, 4))));
  /* Dört kaynağın dördü de hazır ama özet satırı olmayan yıllar. */
  const eksikYil = [...kaynak.entries()]
    .filter(([y, v]) => !ozetYillar.has(y) && Object.keys(v).length === 4)
    .map(([y]) => y).sort();
  return { ifadeler, degisim, eksikYil };
}

const kaynak = await kaynaklar();
const { ifadeler, degisim, eksikYil } = await fark(kaynak);

console.log(`${TABLO}: ${degisim.length} hücre farklı (${ifadeler.length} satır).`);
for (const d of degisim) console.log(`  ${d.yil}  ${d.sutun.padEnd(20)} ${d.eski} → ${d.yeni}`);
if (eksikYil.length) {
  console.log(`::notice::Hayvansal ürün özeti: ${eksikYil.join(', ')} için dört otomatik kaynak hazır ama `
    + 'özet satırı yok. Satırı bal ile birlikte elle açın; dört sütunu bu betik dolduracak.');
}

if (!ifadeler.length) { console.log('Değişiklik yok.'); process.exit(0); }
if (!yaz) { console.log('\n--yaz verilmedi, yazılmadı.'); process.exit(0); }

/* Damga yazmanın SONUNDA: veri yazıldıktan sonra önbellek tazelensin. */
await d1([...ifadeler, damgaSql([TABLO])].join('\n'));

/*
 * DOĞRULAMA — başarı mesajına değil SONUCA bakılıyor: fark yeniden hesaplanıyor
 * ve sıfır olmalı. WHERE tutmayan bir UPDATE hata vermeden 0 satır etkiler;
 * bu depoda senkron aylarca böyle "güncellendi" yazıp hiçbir şey yazmamıştı.
 */
const sonra = await fark(kaynak);
console.log(`\nDoğrulama: kalan fark ${sonra.degisim.length} hücre.`);
if (sonra.degisim.length) {
  console.error('HATA: yazmadan sonra fark kalmış — yazma etkisiz olmuş olabilir.');
  process.exit(1);
}
console.log(`Yazıldı ve doğrulandı: ${degisim.length} hücre.`);
