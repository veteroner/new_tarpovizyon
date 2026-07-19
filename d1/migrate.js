// One-off migration: MySQL (via PHP SELECT proxy) -> SQL files for D1 import.
// Run: node d1/migrate.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API = 'https://dersbende.com/api.php?action=query&api_key=dashboard_secret_key_2024&sql=';
async function q(sql) {
  const r = await axios.get(API + encodeURIComponent(sql));
  if (r.data.error) throw new Error(r.data.error + ' :: ' + sql);
  return r.data.data || [];
}

function esc(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  if (typeof v === 'number') return String(v);
  const s = String(v);
  if (s.trim() === '') return 'NULL';
  return `'${s.replace(/'/g, "''")}'`;
}
function num(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : 'NULL';
}
// Extracts a 4-digit year from either a plain "2020" value or a
// "2020-01-01 00:00:00" datetime string coming from the MySQL source.
function yr(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  const m = String(v).match(/\d{4}/);
  return m ? m[0] : 'NULL';
}

function buildInsert(table, cols, rows, mapRow) {
  if (!rows.length) return '';
  const lines = [];
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = chunk.map(r => `(${mapRow(r).join(',')})`).join(',\n');
    lines.push(`INSERT INTO ${table} (${cols.join(',')}) VALUES\n${values};`);
  }
  return lines.join('\n');
}

async function main() {
  const out = [];

  // 1) Global
  out.push(buildInsert('global_uretim', ['ulke','urun','uretim_miktari_ton'],
    await q('SELECT ulke,urun,uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla'),
    r => [esc(r.ulke), esc(r.urun), num(r.uretim_miktari_ton)]));

  out.push(buildInsert('global_hayvan_sayilari',
    ['ulke','ari_kovan','sigir','tavuk','ordek','kaz','keci','koyun','hindi'],
    await q('SELECT * FROM oner_dunya_hayvan_sayilari'),
    r => [esc(r.ulke), num(r.ari_varligi), num(r.sigir_varligi), num(r.tavuk_varligi), num(r.ordek_varligi), num(r.kaz_varligi), num(r.keci_varligi), num(r.koyun_varligi), num(r.hindi_varligi)]));

  out.push(buildInsert('global_hayvan_sayilari_detay', ['ulke','hayvan_turu','deger'],
    await q('SELECT ulke,hayvan,deger FROM oner_dunya_hayvan_sayilari_2'),
    r => [esc(r.ulke), esc(r.hayvan), num(r.deger)]));

  out.push(buildInsert('global_karkas_agirligi', ['ulke','karkas_verimi_kg'],
    await q('SELECT ulke,karkas_verimi_kg FROM oner_dunya_karkas_agirligi_verileri'),
    r => [esc(r.ulke), num(r.karkas_verimi_kg)]));

  out.push(buildInsert('global_et_tuketimi_karsilastirma',
    ['ulke','kanatli_eti','sigir_eti','koyun_keci_eti','domuz_eti','balik_deniz_urunleri','diger_etler'],
    await q('SELECT * FROM oner_karsilastirma_et_tuketimi'),
    r => [esc(r.ulke), num(r.kanatli_eti), num(r.sigir_eti), num(r.koyun_keci_eti), num(r.domuz_eti), num(r.balik_ve_deniz_urunleri), num(r.diger_etler)]));

  // 2) Genel / Türkiye
  out.push(buildInsert('tr_hayvan_varliklari',
    ['tarih','sigir_bas','manda_bas','buyukbas_toplam_bas','koyun_bas','keci_bas','kucukbas_toplam_bas'],
    await q('SELECT * FROM oner_hayvan_varliklari'),
    r => [esc(r.tarih), num(r.sigir_varligi_bas), num(r.manda_varligi_bas), num(r.toplam_buyukbas_varligi_bas), num(r.koyun_varligi_bas), num(r.keci_varligi_bas), num(r.toplam_kucukbas_varligi_bas)]));

  out.push(buildInsert('tr_hayvansal_urun_uretimi',
    ['yil','bal_uretimi','cig_sut_uretimi','kirmizi_et_uretimi','yumurta_milyon_adet','kanatli_eti_ton'],
    await q('SELECT * FROM oner_hayvansal_urun_uretimi'),
    r => [yr(r.yillar), num(r.bal_uretimi), num(r.cig_sut_uretimi), num(r.kirmizi_et_uretimi), num(r.yumurta_milyon_adet), num(r.kanatli_eti_ton)]));

  out.push(buildInsert('tr_kisi_basi_uretim_tuketim',
    ['yil','nufus_kisi','toplam_sut_uretimi','sut_uretimi_kg_kisi','sut_tuketimi_kg_kisi','yumurta_uretimi_adet_kisi','yumurta_tuketimi_adet_kisi','tavuk_eti_uretim_kg_kisi','tavuk_eti_tuketim_kg_kisi','kisi_basina_bal_uretimi_kg_kisi'],
    await q('SELECT * FROM oner_kisi_basi_uretim_tuketim'),
    r => [yr(r.yillar), num(r.nufus_kisi), num(r.toplam_sut_uretimi), num(r.sut_uretimi_kg_kisi), num(r.sut_tuketimi_kg_kisi), num(r.yumurta_uretimi_adet_kisi), num(r.yumurta_tuketimi_adet_kisi), num(r.tavuk_eti_uretim_kg_kisi), num(r.tavuk_eti_tuketim_kg_kisi), num(r.kisi_basina_bal_uretimi_kg_kisi)]));

  out.push(buildInsert('tr_kisi_basina_guncel_tuketim',
    ['tereyagi_kg','yogurt_kg','icme_sutu_litre','peynir_kg','toplam_sut_litre','kirmizi_et_kg','yumurta_adet','pilic_eti_kg','bal_kg','balik_deniz_urunleri'],
    await q('SELECT * FROM oner_kisi_basina_guncel_tuketimler'),
    r => [num(r.tereyagi_kg), num(r.yogurt_kg), num(r.icme_sutu_tuketimi_litre), num(r.peynir_tuketimi_kg), num(r.toplam_sut_tuketimi_litre), num(r.kirmizi_et_tuketimi_kg), num(r.yumurta_tuketimi_adet), num(r.pilic_eti_kg), num(r.bal_tuketimi_kg), num(r.balik_ve_deniz_urunleri)]));

  out.push(buildInsert('tr_verimlilikler',
    ['yil','cig_sut_verimi_lt','buyukbas_karkas_et_verimi_kg','kucukbas_karkas_et_verimi_kg','bal_verimi_kg'],
    await q('SELECT * FROM oner_verimlilikler'),
    r => [yr(r.yil), num(r.cig_sut_verimi_lt), num(r.buyukbas_karkas_et_verimi_kg), num(r.kucukbas_karkas_et_verimi_kg), num(r.bal_verimi_kg)]));

  out.push(buildInsert('tr_yeterlilikler',
    ['sira','sut_ton','kirmizi_et_ton','beyaz_et_ton','yumurta_milyon_adet','bal_ton'],
    await q('SELECT * FROM oner_yeterlilikler'),
    r => [num(r['1_sutun']), num(r.sut_ton), num(r.kirmizi_et_ton), num(r.beyaz_et_ton), num(r.yumurta_milyon_adet), num(r.bal_ton)]));

  out.push(buildInsert('il_hayvan_sayilari',
    ['il','tarih','sigir_varligi_bas','manda_varligi_bas','koyun_varligi_bas','keci_varligi_bas','arici_sayisi','bal_uretimi_ton','aricilik_yapan_isletme_sayisi','yeni_kovan_sayisi','eski_kovan_sayisi','kovan_varligi','balmumu_uretimi_ton','bal_verimi_kg','bal_cesidi','peynir_cesidi','et_tavugu_sayisi','yumurta_tavugu_sayisi','toplam_hayvan_varligi'],
    await q('SELECT * FROM oner_i_llerin_hayvan_sayisi'),
    r => [esc(r.il), esc(r.tarih), num(r.sigir_varligi_bas), num(r.manda_varligi_bas), num(r.koyun_varligi_bas), num(r.keci_varligi_bas), num(r.arici_sayisi), num(r.bal_uretimi_ton), num(r.aricilik_yapan_isletme_sayisi_adet), num(r.yeni_kovan_sayisi_adet), num(r.eski_kovan_sayisi_adet), num(r.kovan_varligi_adet), num(r.balmumu_uretimi_ton), num(r.bal_verimi_kg), esc(r.bal_cesiti), esc(r.peynir_cesiti), num(r.et_tavugu_sayisi), num(r.yumurta_tavugu_sayisi), num(r.toplam_hayvan_varligi)]));

  out.push(buildInsert('il_bal_cesitleri',
    ['il','balin_cesiti','aricilik_yapan_isletme_sayisi','yeni_kovan_sayisi','eski_kovan_sayisi','toplam_kovan','bal_uretimi_ton','balmumu_uretimi_ton','bal_verimi_kg'],
    await q('SELECT * FROM oner_i_llerin_bal_cesitleri'),
    r => [esc(r.il), esc(r.balin_cesiti), num(r.aricilik_yapan_isletme_sayisi_adet), num(r.yeni_kovan_sayisi_adet), num(r.eski_kovan_sayisi_adet), num(r.toplam_kovan_adet), num(r.bal_uretimi_ton), num(r.balmumu_uretimi_ton), num(r.bal_verimi_kg)]));

  // Wide -> long normalization for arici sayisi
  {
    const rows = await q('SELECT * FROM oner_i_llere_gore_arici_sayisi');
    const yearCols = ['2013_01_01_00_00_00','2014_01_01_00_00_00','2015_01_01_00_00_00','2016_01_01_00_00_00','2017_01_01_00_00_00','2018_01_01_00_00_00','2019_01_01_00_00_00','2020_01_01_00_00_00','2021_01_01_00_00_00','2022_01_01_00_00_00','2023_01_01_00_00_00'];
    const long = [];
    for (const r of rows) {
      for (const yc of yearCols) {
        const yil = parseInt(yc.slice(0,4), 10);
        if (r[yc] !== null && r[yc] !== undefined && r[yc] !== '') {
          long.push({ il: r.il, yil, arici_sayisi: r[yc] });
        }
      }
    }
    out.push(buildInsert('il_arici_sayisi_yillik', ['il','yil','arici_sayisi'], long,
      r => [esc(r.il), num(r.yil), num(r.arici_sayisi)]));
  }

  // 3) Dış ticaret
  out.push(buildInsert('kirmizi_et_hayvan_ithalati',
    ['yil','kasaplik_kucukbas_bas','kasaplik_kucukbas_deger','damizlik_kucukbas_bas','damizlik_kucukbas_deger','besilik_sigir_bas','besilik_sigir_deger','kasaplik_sigir_bas','kasaplik_sigir_deger','damizlik_sigir_bas','damizlik_sigir_deger','karkas_et_ithalati_ton','karkas_et_ithalati_deger','toplam_odenen_dolar','dolar_kuru','toplam_odenen_tl'],
    await q('SELECT * FROM oner_kirmizi_et_ve_hayvan_ithalati'),
    r => [yr(r.yil), num(r.besilik_kesimlik_kucukbas_sayisi_bas), num(r.besilik_kesimlik_kucukbas_tutar), num(r.damizlik_kucukbas_bas), num(r.damizlik_kucukbas_tutar), num(r.besilik_sigir_bas), num(r.besilik_sigir_tutar), num(r.kasaplik_sigir_bas), num(r.kasaplik_sigir_tutar), num(r.damizlik_sigir_bas), num(r.damizlik_sigir_tutar), num(r.karkas_et_ithalati_ton), num(r.karkas_et_ithalati), num(r.toplam_ithalata_odenen_dolar), num(r.dolar_kuru), num(r.toplam_ithalata_odenen_tutar_guncel_kur_uzerinden_turk_liras)]));

  out.push(buildInsert('ihracat_onaylari',
    ['onay_numarasi','firma_unvani','urun_kategorisi','ihracat_ulkesi','onay_durumu','gosterim_degeri'],
    await q('SELECT * FROM oner_i_hracat_onaylari'),
    r => [esc(r.onay_numarasi), esc(r.firmanin_unvani), esc(r.urunun_kategorisi), esc(r.ihracat_onayi_aldigi_ulke), esc(r.onayin_durumu), num(r.gosterim_icin_deger)]));

  // 4) Çiğ süt
  out.push(buildInsert('cig_sut_uretim_miktari',
    ['yil','buyukbas_sut_uretimi_ton','sagilan_buyukbas_hayvan_sayisi','koyun_sutu_uretimi_ton','keci_sutu_uretimi_ton','kucukbas_sutu_uretimi_ton','sagilan_keci_sayisi','sagilan_koyun_sayisi','toplam_sut_uretimi_ton'],
    await q('SELECT * FROM oner_cig_sut_uretim_miktari'),
    r => [yr(r.yil), num(r.buyukbas_sut_uretimi_ton), num(r.sagilan_buyukbas_hayvan_sayisi_bas), num(r.koyun_sutu_uretimi_ton), num(r.keci_sutu_uretimi_ton), num(r.kucukbas_sutu_uretimi_ton), num(r.sagilan_keci_sayisi_bas), num(r.sagilan_koyun_sayisi_bas), num(r.toplam_sut_uretimi_ton)]));

  out.push(buildInsert('cig_sut_ekonomik_gostergeler',
    ['tarih','misir_silaji','yonca','saman','sut_yemi_19hp','uretim_maliyeti_tl_lt','usk_tavsiye_fiyat_tl_lt','sut_yem_paritesi','litre_basina_destek_tl','sut_yem_paritesi_destek_dahil','fiyat_maliyet_farki_tl_lt','fiyat_maliyet_farki_destek_dahil_tl_lt','karlilik'],
    await q('SELECT * FROM oner_cig_sut_ekonomik_gostergeler'),
    r => [esc(r.tarih), num(r.misir_silaji), num(r.yonca), num(r.saman), num(r.sut_yemi_19_hp), num(r.cig_sut_uretim_maliyeti_tl_lt), num(r.usk_cig_sut_tavsiye_fiyati_tl_lt), num(r.sut_yem_paritesi), num(r.litre_basina_cig_sut_destegi_tl), num(r.sut_yem_paritesi_destek_dahil), num(r.fiyat_maliyet_farki_tl_lt), num(r.fiyat_maliyet_farki_tl_lt_destek_dahil), num(r.karlilik)]));

  out.push(buildInsert('sut_ciftlikleri_onayli', ['il','ilce','isletme_sayisi','adi_ve_adresi'],
    await q('SELECT * FROM oner_onayli_sut_ciftlikleri'),
    r => [esc(r.ili), esc(r.ilcesi), num(r.isletme_sayisi), esc(r.adi_ve_adresi)]));

  // 5) Kırmızı et
  out.push(buildInsert('kirmizi_et_uretim_miktari',
    ['yil','buyukbas_et_uretimi_ton','buyukbas_hayvan_sayisi_bas','kucukbas_hayvan_sayisi_bas','toplam_hayvan_varligi_bas','kesilen_buyukbas_hayvan_sayisi_bas','buyukbas_kasaplik_guc_orani','buyukbas_karkas_verimi_kg','keci_et_uretimi_ton','koyun_et_uretimi_ton','kucukbas_et_uretimi_ton','koyun_kesilen_bas','keci_kesilen_bas','kesilen_toplam_kucukbas_sayisi_bas','kucukbas_kasaplik_guc_orani','kucukbas_karkas_verimi_kg','toplam_kirmizi_et_uretimi_ton'],
    (await q('SELECT * FROM oner_kirmizi_et_uretim_miktari')).filter(r => r.yil),
    r => [yr(r.yil), num(r.buyukbas_et_uretimi_ton), num(r.buyukbas_hayvan_sayisi_bas), num(r.kucukbas_hayvan_sayisi_bas), num(r.toplam_hayvan_varligi_bas), num(r.kesilen_buyukbas_hayvan_sayisi_bas), num(r.buyukbas_kasaplik_guc_orani), num(r.buyukbas_karkas_verimi_kg), num(r.keci_et_uretimi_ton), num(r.koyun_et_uretimi_ton), num(r.kucukbas_et_uretimi_ton), num(r.koyun_kesilen_bas), num(r.keci_kesilen_bas), num(r.kesilen_toplam_kucukbas_sayisi_bas), num(r.kucukbas_kasaplik_guc_orani), num(r.kucukbas_karkas_verimi_kg), num(r.toplam_kirmizi_et_uretimi_ton)]));

  out.push(buildInsert('kirmizi_et_hayvan_sayilari_yillik',
    ['yil','sigir','manda','buyukbas_toplam','koyun','keci','kucukbas_toplam','toplam'],
    await q('SELECT * FROM oner_kirmizi_et_uretimi'),
    r => [yr(r.yil), num(r.sigir), num(r.manda), num(r.buyukbas_toplam), num(r.koyun), num(r.keci), num(r.kucukbas_toplam), num(r.toplam)]));

  out.push(buildInsert('kirmizi_et_ekonomik_gostergeler',
    ['tarih','karkas_paritesi','besi_yemi_fiyati_tl_kg','dolar_kuru_tl','besilik_dana_fiyati_tl_kg','dana_karkas_maliyet_tl_kg','dana_karkas_fiyati_tl_kg','karlilik','kuzu_karkas_fiyati_tl_kg','besilik_kucukbas_fiyati_tl_kg','dana_karkas_fiyat_maliyet_farki_tl_kg'],
    await q('SELECT * FROM oner_kirmizi_et_ekonomik_gostergeler'),
    r => [esc(r.tarih), num(r.karkas_paritesi), num(r.besi_yemi_fiyatlari_tl_kg), num(r.dolar_kuru_tl), num(r.besilik_dana_fiyatlari_tl_kg), num(r.dana_karkas_maliyet_tl_kg), num(r.dana_karkas_fiyati_tl_kg), num(r.karlilik), num(r.kuzu_karkas_fiyati_tl_kg), num(r.besilik_kucukbas_fiyatlari_tl_kg), num(r.dana_karkas_fiyat_maliyet_farki_tl_kg)]));

  // 6) Piliç eti
  out.push(buildInsert('kanatli_uretimleri', ['tarih','tavuk_yumurtasi_bin_adet','tavuk_eti_ton'],
    await q('SELECT * FROM oner_kanatli_uretimleri'),
    r => [esc(r.tarih), num(r.tavuk_yumurtasi_bin_adet), num(r.tavuk_eti_ton)]));

  out.push(buildInsert('kanatli_eti_maliyet_fiyat',
    ['tarih','maliyet_tl_kg','uretici_fiyati_tl_kg','yem_fiyati_tl_kg','tuketici_fiyati_tl_kg','karlilik','fiyat_maliyet_farki_tl_kg','yem_paritesi'],
    await q('SELECT * FROM oner_kanatli_eti_maliyeti_fiyati'),
    r => [esc(r.tarih), num(r.etlik_pilic_maliyet_tl_kg), num(r.uretici_fiyati_tl_kg), num(r.etlik_pilic_yemi_tl_kg), num(r.tuketici_fiyati_tl_kg), num(r.karlilik), num(r.uretici_fiyati_maliyet_farki_tl_kg), num(r.parite_etlik_pilic_yem_paritesi)]));

  // 7) Yumurta
  out.push(buildInsert('yumurta_maliyet_fiyat',
    ['tarih','maliyet_tl_kg','uretici_fiyati_tl_kg','yem_fiyati_tl_kg','tuketici_fiyati_tl','karlilik','uretici_fiyati_maliyet_farki_tl_kg','yem_paritesi','kuluckalik_ihracat_miktari_bin_adet','kuluckalik_ihracat_dolar','sofralik_ihracat_miktari_bin_adet','sofralik_ihracat_dolar','toplam_ihracat_miktari_bin_adet','toplam_ihracat_dolar','sofralik_birim_fiyat_dolar','kuluckalik_birim_fiyat_dolar'],
    await q('SELECT id,tarih,yumurta_maliyet_tl_kg,yumurta_uretici_fiyati_tl_kg,yumurtaci_tavuk_yemi_tl_kg,tuketici_fiyati_tl,karlilik,uretici_fiyati_maliyet_farki_tl_kg,parite_yumurta_yem_paritesi,kuluckalik_ihracat_miktari_bin_adet,kuluckalik_ihracat_dolar,sofralik_ihracat_miktari_bin_adet,sofralik_ihracat_dolar,toplam_yumurta_ihracati_bin_adet,toplam_yumurta_dolar,sofralik_yumurta_ihracati_birim_fiyati_1000_adet_dolar,kuluckalik_yumurta_ihracati_birim_fiyati_1000_adet_dolar FROM oner_yumurta_maliyeti_fiyati'),
    r => [esc(r.tarih), num(r.yumurta_maliyet_tl_kg), num(r.yumurta_uretici_fiyati_tl_kg), num(r.yumurtaci_tavuk_yemi_tl_kg), num(r.tuketici_fiyati_tl), num(r.karlilik), num(r.uretici_fiyati_maliyet_farki_tl_kg), num(r.parite_yumurta_yem_paritesi), num(r.kuluckalik_ihracat_miktari_bin_adet), num(r.kuluckalik_ihracat_dolar), num(r.sofralik_ihracat_miktari_bin_adet), num(r.sofralik_ihracat_dolar), num(r.toplam_yumurta_ihracati_bin_adet), num(r.toplam_yumurta_dolar), num(r.sofralik_yumurta_ihracati_birim_fiyati_1000_adet_dolar), num(r.kuluckalik_yumurta_ihracati_birim_fiyati_1000_adet_dolar)]));

  const sql = out.filter(Boolean).join('\n\n');
  fs.writeFileSync(path.join(__dirname, 'migrations', '0002_data_small.sql'), sql);
  console.log('wrote 0002_data_small.sql,', sql.length, 'bytes');
}

main().catch(e => { console.error(e); process.exit(1); });
