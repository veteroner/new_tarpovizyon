#!/usr/bin/env node
/**
 * MEDAS akışını keşfeder — hangi tıklama neyi açıyor, Zaman'da hangi yıllar var.
 *
 *   node scripts/tuik-medas/kesfet.mjs               # başsız
 *   node scripts/tuik-medas/kesfet.mjs --goster      # tarayıcıyı göster
 *
 * ─── NEDEN TARAYICI ─────────────────────────────────────────────────────────
 * `bitkisel_tr_uretim_detay` çeşit kırılımında ("Elma (Golden)", "Mandalina
 * (Satsuma)"). Bu ayrıntı TÜİK'in haber bültenlerinde YOK — kesin 2025 bülteni
 * (53939) de yalnızca "Elma", "Mandalina" veriyor. Ölçüldü. Çeşit kırılımı
 * sadece MEDAS'ta.
 *
 * MEDAS bir ZK (sunucu durumlu Ajax) uygulaması: REST ucu yok, her etkileşim
 * sunucudaki bileşen kimliklerine giden bir POST. Üstelik Cloudflare düz
 * isteği kesiyor (curl → 403). Bu yüzden gerçek tarayıcı.
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const GOSTER = process.argv.includes('--goster');
const CIKTI = process.env.MEDAS_CIKTI ?? '/tmp/medas-kesif';
mkdirSync(CIKTI, { recursive: true });

export const MEDAS = 'https://biruni.tuik.gov.tr/medas/?kn=92&locale=tr';

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/** ZK sunucu turu bittikten sonra DOM'un oturmasını bekler. */
async function zkDurul(page, ms = 1200) {
  await bekle(ms);
  await page.waitForLoadState('networkidle').catch(() => {});
}

/** Ekranda görünen ve tam bu metni taşıyan yaprak öğeye tıklar. */
async function tikla(page, metin, { indeks = 0 } = {}) {
  const yer = page.locator(`text="${metin}"`).nth(indeks);
  await yer.waitFor({ state: 'visible', timeout: 15000 });
  await yer.click();
  await zkDurul(page);
}

/** Sayaç satırını okur: seçilen gösterge / düzey / zaman adedi. */
async function sayac(page) {
  const t = await page.locator('text=/Seçilen gösterge adedi/').first().textContent().catch(() => '');
  const n = [...(t ?? '').matchAll(/(\d+)/g)].map((m) => Number(m[1]));
  return { ham: (t ?? '').replace(/\s+/g, ' ').trim(), sayilar: n };
}

async function main() {
  const tarayici = await chromium.launch({ headless: !GOSTER });
  const sayfa = await tarayici.newPage({ viewport: { width: 1600, height: 1000 } });
  const adim = async (ad) => {
    await sayfa.screenshot({ path: `${CIKTI}/${ad}.png` });
    console.log(`   → ${CIKTI}/${ad}.png`);
  };

  try {
    console.log('1) MEDAS açılıyor…');
    await sayfa.goto(MEDAS, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await zkDurul(sayfa, 3000);
    await adim('01-acilis');

    console.log('2) Ölçüm: "Tahıllar ve diğer bitkisel ürünler"');
    await tikla(sayfa, 'Tahıllar ve diğer bitkisel ürünler');
    await adim('02-olcum');

    console.log('3) Kırılım Seçiniz → Tamam');
    await tikla(sayfa, 'Tamam');
    await zkDurul(sayfa, 2000);
    await adim('03-kirilimlar');

    console.log('4) Üç kırılımda da <Hepsi> işaretleniyor');
    const hepsi = sayfa.locator('text="<Hepsi>"');
    const adet = await hepsi.count();
    console.log(`   ekranda ${adet} adet <Hepsi> var`);
    for (let i = 0; i < adet; i++) {
      await hepsi.nth(i).click();
      await zkDurul(sayfa, 600);
    }
    await adim('04-hepsi');
    console.log(`   sayaç: ${(await sayac(sayfa)).ham}`);

    console.log('5) İleri');
    await tikla(sayfa, 'İleri');
    await adim('05-ileri');
    console.log(`   sayaç: ${(await sayac(sayfa)).ham}`);

    console.log('6) Zaman sekmesindeki yıllar');
    const zamanTab = sayfa.locator('text="Zaman"').first();
    if (await zamanTab.isVisible()) {
      await zamanTab.click();
      await zkDurul(sayfa, 2000);
    }
    await adim('06-zaman');
    const yillar = await sayfa.evaluate(() => {
      const y = new Set();
      document.querySelectorAll('*').forEach((el) => {
        if (el.children.length) return;
        const t = (el.textContent || '').trim();
        if (/^(19|20)\d{2}$/.test(t)) y.add(t);
      });
      return [...y].sort();
    });
    console.log(`   bulunan yıllar (${yillar.length}): ${yillar.join(', ') || '(yok)'}`);
    console.log(yillar.includes('2025') ? '\n✓ 2025 MEDAS\'ta VAR' : '\n✗ 2025 görünmüyor');
  } catch (e) {
    console.error(`\nHATA: ${e.message}`);
    await sayfa.screenshot({ path: `${CIKTI}/HATA.png` }).catch(() => {});
    console.error(`   ${CIKTI}/HATA.png`);
  } finally {
    if (!GOSTER) await tarayici.close();
  }
}

main();
