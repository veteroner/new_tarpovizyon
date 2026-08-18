#!/usr/bin/env node
/**
 * İkiz tabloları ANA TABLODAN tazeler — Qlik'e hiç gitmez.
 *
 *   node scripts/tuik-disticaret/ikiz-tazele.mjs --yil 2026 --aylar 1,2,3,4,5,6
 *   node scripts/tuik-disticaret/ikiz-tazele.mjs --yil 2026 --aylar 6 --tablo bitkisel
 *
 * `tuik_ticaret_*` zaten doğruysa ikizi yeniden çekmeye gerek yok; `ülke|ürün`
 * seviyesi olduğu gibi kopyalanıyor. Onarımdan sonra ikizler geride kalırsa
 * (uygulamada eski veri görünür) hızlı çözüm budur.
 */

import { IKIZLER, ikiziYaz } from './ikizler.mjs';
import { sorgu } from './d1.mjs';

const arg = process.argv.slice(2);
const deger = (a) => { const i = arg.indexOf(a); return i >= 0 ? arg[i + 1] : null; };

const yil = Number(deger('--yil'));
const aylar = (deger('--aylar') ?? deger('--ay') ?? '')
  .split(',').map((x) => Number(x.trim())).filter(Boolean);
const secilen = deger('--tablo');

if (!yil || !aylar.length) throw new Error('--yil ve --aylar gerekli');

const adlar = secilen ? [secilen] : Object.keys(IKIZLER);
for (const a of adlar) if (!IKIZLER[a]) throw new Error(`Bilinmeyen tablo: ${a}`);

for (const ay of aylar) {
  for (const ad of adlar) {
    const ik = IKIZLER[ad];
    // eslint-disable-next-line no-await-in-loop
    const kaynak = await sorgu(`SELECT COUNT(*) n FROM ${ik.ana}
      WHERE yil=${yil} AND ay=${ay} AND duzey_1='ülke' AND duzey_2='ürün'`);
    if (!Number(kaynak[0].n)) {
      console.log(`   ⚠ ${ik.ana} ${yil}-${String(ay).padStart(2, '0')}: kaynak yok, atlandı`);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await ikiziYaz(ad, yil, ay);
  }
}
