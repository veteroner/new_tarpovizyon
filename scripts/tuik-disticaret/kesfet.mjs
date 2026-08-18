#!/usr/bin/env node
/**
 * Veri modelini keşfeder: DT_OZEL_TR uygulamasında hangi alanlar ve tablolar var.
 *
 * Çıkarım işi burada bitiyor — asıl çekme betiği (cek.mjs) buradan çıkan alan
 * adlarına göre yazılıyor. Model değişirse önce bunu çalıştır.
 */

import { qlikOturum, APP_OZEL_TR } from './qlik.mjs';

const o = await qlikOturum();
try {
  const model = await o.calis(async (appId) => {
    const app = window.__qlik.openApp(appId, {});

    const bekle = (fn, ms = 45000) => new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('zaman aşımı')), ms);
      fn((r) => { clearTimeout(t); res(r); });
    });

    // Bağlantı kurulsun
    await bekle((cb) => app.getAppLayout(cb));

    const alanListesi = await bekle((cb) => app.createGenericObject(
      { qInfo: { qType: 'AlanListesi' },
        qFieldListDef: { qShowSystem: false, qShowHidden: false, qShowSrcTables: true } },
      cb,
    ));

    const tabloListesi = await bekle((cb) => app.createGenericObject(
      { qInfo: { qType: 'TabloListesi' },
        qTableListDef: {} },
      cb,
    )).catch(() => null);

    return {
      alanlar: (alanListesi.qFieldList?.qItems ?? []).map((f) => ({
        ad: f.qName,
        tablolar: f.qSrcTables ?? [],
        satir: f.qCardinal,
      })),
      tablolar: (tabloListesi?.qTableList?.qItems ?? []).map((t) => t.qName),
    };
  }, APP_OZEL_TR);

  console.log(`✓ ${model.alanlar.length} alan, ${model.tablolar.length} tablo\n`);
  console.log('── ALANLAR (ad · farklı değer sayısı · kaynak tablo) ──');
  for (const a of model.alanlar) {
    console.log(`  ${a.ad.padEnd(38)} ${String(a.satir ?? '?').padStart(8)}  ${a.tablolar.join(',')}`);
  }
  if (model.tablolar.length) {
    console.log('\n── TABLOLAR ──');
    for (const t of model.tablolar) console.log('  ' + t);
  }
} finally {
  await o.kapat();
}
