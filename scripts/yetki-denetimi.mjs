#!/usr/bin/env node
/**
 * Yetki listesi denetimi — korumalı bir uç ücretsiz sürümde kullanılıyor mu.
 *
 * ─── NEDEN VAR ──────────────────────────────────────────────────────────────
 * `workers/.../yetki.js` içindeki `KORUMALI_UCLAR` listesi ELLE yazılı, çünkü
 * onu üretmek için yapılan otomatik tarama güvenilmez çıktı: `piyasa` ve `ai`
 * uçları şablon dizgiyle çağrıldıkları için (`${API_BASE}/api/piyasa`) hiç
 * kullanılmıyor göründüler. Aynı kör nokta bir Basic ucunu yanlışlıkla "Pro"
 * saysaydı, o uç kapandığı anda Basic sessizce bozulurdu — hem de yalnız
 * abonesiz kullanıcılarda, yani geliştirici fark etmeden.
 *
 * Bu betik o riski kapatıyor: Basic ve mobil kaynağını tarayıp korumalı
 * uçlardan birine dokunuluyor mu diye bakıyor.
 *
 * ─── TARAMA NEDEN İKİ DESENLİ ───────────────────────────────────────────────
 * Hem `'uc/adi'` düz dizgisi hem de `/api/uc/adi` biçimi aranıyor. İkincisi
 * tam da yukarıdaki kör noktayı kapatmak için: şablon dizgiyle kurulan URL'ler
 * yalnız bu desenle yakalanıyor.
 *
 * ─── KULLANIM ───────────────────────────────────────────────────────────────
 *   node scripts/yetki-denetimi.mjs
 * Çakışma bulursa çıkış kodu 1.
 */

import fs from 'node:fs';
import path from 'node:path';

const KOK = path.resolve(import.meta.dirname, '..');

/** Ücretsiz kalması gereken sürümlerin kaynak dizinleri. */
const UCRETSIZ_DIZINLER = [
  'src/tarpovizyon-basic',
  'src/mobile',
];

/* Korumalı listeyi kaynaktan okuyor — modülü import etmek Worker'a özgü
   bağımlılıkları (auth.js → crypto) Node'a taşımayı gerektirirdi. */
const yetkiSrc = fs.readFileSync(
  path.join(KOK, 'workers/tarpovizyon-api/src/yetki.js'), 'utf8');
const blok = yetkiSrc.slice(
  yetkiSrc.indexOf('KORUMALI_UCLAR = new Set(['),
  yetkiSrc.indexOf(']);', yetkiSrc.indexOf('KORUMALI_UCLAR')),
);
const korumali = [...blok.matchAll(/'([a-z0-9][a-z0-9/_-]*)'/g)].map((m) => m[1]);

if (!korumali.length) {
  console.error('HATA: korumalı uç listesi okunamadı — yetki.js biçimi değişmiş olabilir.');
  process.exit(2);
}

function dosyalar(dizin) {
  const out = [];
  const gez = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!/node_modules|graphify-out/.test(p)) gez(p); }
      else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) out.push(p);
    }
  };
  gez(path.join(KOK, dizin));
  return out;
}

const cakisma = [];
let taranan = 0;
for (const dizin of UCRETSIZ_DIZINLER) {
  for (const dosya of dosyalar(dizin)) {
    taranan += 1;
    // Yorumlar çıkarılıyor: bir uç adının uyarı yorumunda geçmesi kullanım değil.
    const s = fs.readFileSync(dosya, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const uc of korumali) {
      /*
       * SINIR KONTROLÜ ŞART. İlk sürüm düz `includes` kullanıyordu ve
       * `bitkisel/uretim-detay` ararken Basic'in kullandığı
       * `bitkisel/uretim-detay-yillik` ucunu yakalayıp YANLIŞ ALARM verdi.
       * Aynı hata sınıfı bu depoda daha önce de görüldü (bir codemod
       * `<Tooltip` ararken `<TooltipState` tipini yakalamıştı).
       *
       * Uç adından sonra harf, rakam, tire, eğik çizgi ya da alt çizgi
       * GELMEMELİ — geliyorsa o başka bir uçtur.
       */
      const desen = new RegExp(
        `(['\`"]|/api/)${uc.replace(/[/-]/g, '\\$&')}(?![A-Za-z0-9/_-])`);
      if (desen.test(s)) cakisma.push({ uc, dosya: path.relative(KOK, dosya) });
    }
  }
}

if (!taranan) {
  console.error('HATA: hiçbir dosya taranmadı — dizin yolları değişmiş olabilir.');
  process.exit(2);
}

console.log(`${korumali.length} korumalı uç · ${taranan} ücretsiz sürüm dosyası tarandı`);

if (cakisma.length) {
  console.error(`\nÇAKIŞMA: ${cakisma.length} yerde korumalı uç ücretsiz sürümde kullanılıyor.`);
  console.error('Bu uçlar kapatılırsa Basic/mobil bozulur — ya listeden çıkarın ya kullanımı kaldırın.\n');
  for (const c of cakisma) console.error(`  ${c.uc}  ←  ${c.dosya}`);
  process.exit(1);
}

console.log('Çakışma yok: korumalı uçların hiçbiri ücretsiz sürümde kullanılmıyor.');
