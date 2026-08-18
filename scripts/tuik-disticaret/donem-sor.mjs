#!/usr/bin/env node
/**
 * TÜİK'te dış ticaret verisi hangi döneme kadar yayımlanmış?
 *
 * Ay açılır listesi arayüzde her zaman 1-12 gösteriyor (veri olup olmadığına
 * bakmıyor), bu yüzden soruyu VERİNİN KENDİSİNE soruyoruz: son yıl için hangi
 * aylarda kayıt var.
 */

import { qlikOturum, APP_OZEL_TR } from './qlik.mjs';
import { MOTOR } from './motor.mjs';

const o = await qlikOturum();
try {
  await o.sayfa.addScriptTag({ content: MOTOR });

  const sonuc = await o.calis(async (appId) => {
    const app = await window.__appAc(appId);

    const yillar = (await window.__alanDegerleri(app, 'YIL')).map((v) => v.metin).sort();
    const ihrith = (await window.__alanDegerleri(app, 'IHRITH')).map((v) => v.metin);
    const olcu = (await window.__alanDegerleri(app, 'OLCU_KODU', 50)).map((v) => v.metin);

    const sonYil = yillar[yillar.length - 1];

    // Son yıl seçiliyken hangi aylarda GERÇEKTEN kayıt var: aylık $ toplamı
    const { satirlar } = await window.__hiperkup(
      app, ['AY'], ['Sum(DOLAR)'], { YIL: [sonYil] },
    );

    return {
      yillar: yillar.slice(-4),
      ihrith,
      olcuOrnek: olcu.slice(0, 5),
      sonYil,
      aylar: satirlar.map((r) => ({ ay: r[0], dolar: r[1] })),
    };
  }, APP_OZEL_TR);

  console.log('  YIL alanı (son 4):', sonuc.yillar.join(', '));
  console.log('  IHRITH değerleri :', sonuc.ihrith.join(' | '));
  console.log('  OLCU örnek       :', sonuc.olcuOrnek.join(', '));
  console.log(`\n── ${sonuc.sonYil} yılında veri bulunan aylar ──`);
  for (const a of sonuc.aylar) {
    const milyar = a.dolar === null ? '—' : (a.dolar / 1e9).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
    console.log(`  ${String(a.ay).padStart(2)}. ay   ${String(milyar).padStart(10)} milyar $`);
  }
  const enSon = sonuc.aylar.filter((a) => a.dolar).map((a) => Number(a.ay)).sort((x, y) => x - y).pop();
  console.log(`\n  ➜ TÜİK'te en son dönem: ${sonuc.sonYil}-${String(enSon).padStart(2, '0')}`);
} finally {
  await o.kapat();
}
