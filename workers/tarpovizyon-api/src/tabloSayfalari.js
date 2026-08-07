/**
 * Hangi tablo hangi sayfalarda kullanılıyor.
 *
 * Kaynak koddan üretildi: her sayfa bileşeninden import zinciri takip edilip
 * o sayfanın hangi API rotalarını çağırdığı çıkarıldı. Veri yükleme ekranında
 * "bu tabloyu değiştirirsem hangi sayfalar etkilenir?" sorusunu cevaplıyor.
 *
 * Veri düzenleme ekranının kendisi de listeden çıkarıldı: her tabloyu okuduğu
 * için her tablonun yanında görünüyordu ve bilgi taşımıyordu.
 *
 * Ortak servisler (services/api.ts, services/d1.ts) zincirden çıkarıldı;
 * yoksa her tablo her sayfaya bağlı görünüyordu.
 */
export const TABLO_SAYFALARI = {
  'TPE_cografiisaret': ["/tarpovizyon/turkey/geographical-indication"],
  'havza': ["/tarpovizyon/turkey/basin-production"],
  'havzalist': ["/tarpovizyon/turkey/basin-production"],
  'il_arici_sayisi_yillik': [],
  'kanatli_uretimleri': ["/tarpovizyon/turkey/animal-production"],
  'o_dunya_kaarkas_veri': ["/tarpovizyon/turkey/milk", "/tarpovizyon/turkey/red-meat"],
  'o_sur_uretimi_veri': ["/tarpovizyon/turkey/milk"],
  'o_toplam_uretim_veri': ["/tarpovizyon/turkey/eggs"],
  'oner_canli_hayvan_ve_et_ithalati': ["/tarpovizyon/turkey/red-meat"],
  'oner_cig_sut_ekonomik_gostergeler': ["/tarpovizyon/turkey/milk"],
  'oner_dunya_hayvansal_uretim_miktarla': ["/tarpovizyon/turkey/animal-production", "/tarpovizyon/turkey/milk", "/tarpovizyon/turkey/white-meat"],
  'oner_dunya_karkas_agirligi_verileri': ["/tarpovizyon/turkey/red-meat"],
  'oner_dunya_karkas_fiyatlari': ["/tarpovizyon/turkey/red-meat"],
  'oner_dunya_sut_fiyatlari': ["/tarpovizyon/turkey/milk"],
  'oner_hayvansal_urun_uretimi': ["/tarpovizyon/turkey/animal-production", "/tarpovizyon/turkey/red-meat", "/tarpovizyon/turkey/white-meat"],
  'oner_i_llere_gore_arici_sayisi': ["/tarpovizyon/turkey/beekeeping"],
  'oner_i_llerin_bal_cesitleri': ["/tarpovizyon/turkey/beekeeping"],
  'oner_i_llerin_hayvan_sayisi': ["/tarpovizyon/turkey/white-meat", "/tarpovizyon/world/livestock"],
  'oner_kanatli_eti_maliyeti_fiyati': ["/tarpovizyon/turkey/white-meat"],
  'oner_kanatli_uretimleri': ["/tarpovizyon/turkey/animal-production"],
  'oner_karsilastirma_et_tuketimi': ["/tarpovizyon/turkey/red-meat"],
  'oner_kirmizi_et_ekonomik_gostergeler': ["/tarpovizyon/turkey/red-meat"],
  'oner_kirmizi_et_uretim_miktari': ["/tarpovizyon/turkey/red-meat"],
  'oner_kirmizi_et_uretimi': ["/tarpovizyon/turkey/animal-production", "/tarpovizyon/turkey/red-meat"],
  'oner_kisi_basina_guncel_tuketimler': ["/tarpovizyon/turkey/red-meat"],
  'oner_sanayiye_giden_sut_ve_sut_urunu': ["/tarpovizyon/turkey/milk"],
  'oner_verimlilikler': ["/tarpovizyon/turkey/milk"],
  'oner_yeterlilikler': ["/tarpovizyon/turkey/milk"],
  'oner_yumurta_maliyeti_fiyati': ["/tarpovizyon/turkey/eggs"],
  'tarim_madde_fiyat': ["/tarpovizyon/turkey/price-index"],
  'tr_kisi_basi_uretim_tuketim': [],
  'tuik_bitkisel_uretim': ["/tarpovizyon/turkey/basin-production", "/tarpovizyon/turkey/beverages", "/tarpovizyon/turkey/cereals", "/tarpovizyon/turkey/fiber-crops", "/tarpovizyon/turkey/fruits", "/tarpovizyon/turkey/legumes", "/tarpovizyon/turkey/nuts", "/tarpovizyon/turkey/oilseeds", "/tarpovizyon/turkey/plant-production", "/tarpovizyon/turkey/plant-provincial", "/tarpovizyon/turkey/sugar-crops", "/tarpovizyon/turkey/vegetables"],
  'tuik_fiyatendex': ["/tarpovizyon/turkey/cross-intelligence", "/tarpovizyon/turkey/price-index"],
  'tuik_gsyh_a21': ["/tarpovizyon/turkey/macro"],
  'tuik_hayavancilik_sutvesuturunleri': ["/tarpovizyon/turkey/milk"],
  'tuik_hayvancilik_canlihayvan': ["/tarpovizyon/turkey/animal-production", "/tarpovizyon/turkey/eggs", "/tarpovizyon/turkey/provincial", "/tarpovizyon/turkey/tuik-livestock"],
  'tuik_hayvancilik_hayvansaluretim': ["/tarpovizyon/turkey/animal-production", "/tarpovizyon/turkey/beekeeping", "/tarpovizyon/turkey/other-animal-products"],
  'tuik_hayvancilik_kumeshayvanciligi': ["/tarpovizyon/turkey/eggs", "/tarpovizyon/turkey/white-meat"],
  'tuik_kisibasigelir': ["/tarpovizyon/turkey/macro"],
  'tuik_ticaret_bitkisel': ["/tarpovizyon/turkey/trade"],
  'tuik_ticaret_hayvansal': ["/tarpovizyon/turkey/eggs", "/tarpovizyon/turkey/trade", "/tarpovizyon/turkey/white-meat"],
  'tuik_urundenge': ["/tarpovizyon/turkey/cross-intelligence", "/tarpovizyon/turkey/product-balance"],
};
