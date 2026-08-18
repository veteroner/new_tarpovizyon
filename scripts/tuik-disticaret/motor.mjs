/**
 * Qlik Engine üzerinde sorgu yardımcıları (sayfa içinde çalışır).
 *
 * Qlik'in JS API'si geri çağırmalı ve sayfalı: bir hiperküpten tek seferde en
 * çok ~10.000 hücre alınabiliyor. Buradaki yardımcılar bunu söz verilerine
 * sarıp otomatik sayfalıyor.
 */

/** Sayfa içine enjekte edilen yardımcı gövdesi. */
export const MOTOR = `
window.__bekle = (fn, ms = 60000, ad = 'işlem') => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error(ad + ': zaman aşımı')), ms);
  fn((r) => { clearTimeout(t); res(r); });
});

window.__appAc = async (id) => {
  const app = window.__qlik.openApp(id, {});
  await window.__bekle((cb) => app.getAppLayout(cb), 60000, 'uygulama açılışı');
  return app;
};

/** Bir alanın farklı değerleri (kod + etiket). */
window.__alanDegerleri = async (app, alan, limit = 5000) => {
  const o = await window.__bekle((cb) => app.createGenericObject({
    qInfo: { qType: 'AlanDeger' },
    qListObjectDef: {
      qDef: { qFieldDefs: [alan] },
      qInitialDataFetch: [{ qTop: 0, qLeft: 0, qHeight: Math.min(limit, 10000), qWidth: 1 }],
    },
  }, cb), 60000, 'alan değerleri: ' + alan);
  return (o.qListObject?.qDataPages?.[0]?.qMatrix ?? []).map((r) => ({
    metin: r[0].qText, sayi: r[0].qNum, durum: r[0].qState,
  }));
};

/**
 * Hiperküp: boyutlar (alan adları) × ölçümler (ifade).
 * \`secimler\`: { ALAN: [değer, …] } — çekmeden önce uygulanır.
 * Tüm sayfaları dolaşıp satır dizisi döndürür.
 */
window.__hiperkup = async (app, boyutlar, olcumler, secimler = {}, enCok = 500000) => {
  // Seçimleri uygula
  for (const [alan, degerler] of Object.entries(secimler)) {
    const f = app.field(alan);
    await window.__bekle((cb) => f.clear().then(() => cb(true)), 30000, 'temizle ' + alan);
    await window.__bekle(
      (cb) => f.selectValues(degerler.map((d) => ({ qText: String(d) })), false, true).then(() => cb(true)),
      60000, 'seç ' + alan,
    );
  }

  /*
   * DİKKAT: createGenericObject'in GERİ ÇAĞIRMASI düzeni (layout), döndürdüğü
   * SÖZ VERİSİ ise modeli veriyor. getHyperCubeData model üzerinde; düzende yok.
   */
  const tanim = {
    qInfo: { qType: 'Kup' },
    qHyperCubeDef: {
      qDimensions: boyutlar.map((b) => ({ qDef: { qFieldDefs: [b] }, qNullSuppression: true })),
      qMeasures: olcumler.map((m) => ({ qDef: { qDef: m } })),
      qInitialDataFetch: [],
      qSuppressZero: false,
      qSuppressMissing: true,
    },
  };
  const nesne = await app.createGenericObject(tanim);
  const duzen = await nesne.getLayout();

  const enBoy = duzen.qHyperCube.qSize;          // { qcx: sütun, qcy: satır }
  const genislik = enBoy.qcx;
  const toplamSatir = Math.min(enBoy.qcy, enCok);
  const sayfaSatir = Math.max(1, Math.floor(9500 / Math.max(1, genislik)));

  const satirlar = [];
  for (let ust = 0; ust < toplamSatir; ust += sayfaSatir) {
    const yukseklik = Math.min(sayfaSatir, toplamSatir - ust);
    /* eslint-disable no-await-in-loop */
    const sayfalar = await window.__bekle(
      (cb) => nesne.getHyperCubeData('/qHyperCubeDef', [{ qTop: ust, qLeft: 0, qWidth: genislik, qHeight: yukseklik }]).then(cb),
      180000, \`veri sayfası \${ust}\`,
    );
    for (const r of sayfalar[0].qMatrix) {
      satirlar.push(r.map((h) => (h.qIsNull ? null : (h.qNum === 'NaN' || h.qNum === undefined ? h.qText : h.qNum))));
    }
    if (window.__ilerleme) window.__ilerleme(satirlar.length, toplamSatir);
  }
  return { satirlar, toplamSatir: enBoy.qcy };
};
`;
