/**
 * Hayvancılık iniş sayfasındaki kartlar ve detaylarının yapılandırması.
 *
 * ─── TEK ŞABLON, YEDİ YAPILANDIRMA ──────────────────────────────────────────
 * Yedi ayrı detay sayfası yazmak yerine tek şablon bu listeyi okuyor. Sekizinci
 * kart eklemek buraya bir kayıt eklemek demek.
 *
 * ─── STOK / AKIŞ AYRIMI ─────────────────────────────────────────────────────
 * Hayvan SAYISI bir stok (baş, belli bir ana ait), üretim ise akış (ton/yıl).
 * İkisini yan yana dizmek yanlış karşılaştırmaya davet çıkardığı için kartlar
 * `grup` ile ayrılıyor ve ekranda ayrı başlıklar altında duruyor.
 */

export type KartGrubu = 'varlik' | 'uretim';

export type KartTanimi = {
  id: string;
  label: string;
  birim: string;
  grup: KartGrubu;
  /** Değerin okunacağı kaynak: hangi uç ve hangi alan. */
  kaynak: 'varlik' | 'uretim';
  alan: string;
  /** Detaydaki kırılım serileri (aynı kaynaktan). */
  kirilim?: { key: string; label: string }[];
  /** Detayda gösterilecek TÜİK fiyat ürünleri (`tuik/madde-fiyat`.urun). */
  fiyatUrunleri?: string[];
  /** Dünya sıralaması: hangi FAO ürün adı (hook'taki hazır listelerden). */
  dunyaSirasi?: 'sigir-eti' | 'sut' | 'tavuk-eti';
  /**
   * Dünya fiyatı için FAO ürün kodları (`fao/uretici-fiyat`, USD/ton).
   * NOT: FAO üretici fiyatlarında CANLI HAYVAN fiyatı yok, ET fiyatı var —
   * hayvan varlığı kartlarında en yakın karşılık olarak et fiyatı gösteriliyor
   * ve başlıkta bu açıkça yazıyor.
   */
  dunyaFiyat?: { kod: number; label: string }[];
  /** Detayın altındaki yönlendirme: Basic bölüm yolu ve ilk sayfası. */
  sektor?: { label: string; yol: string };
};

const KIRMIZI_ET_SEKTORU = { label: 'Kırmızı Et Sektörü', yol: 'kirmizi-et/uretim-yeterlilik' };
const CIG_SUT_SEKTORU = { label: 'Çiğ Süt Sektörü', yol: 'cig-sut/uretim-yeterlilik' };
const KANATLI_SEKTORU = { label: 'Kanatlı Sektörü', yol: 'kanatli/pilic-eti-uretim' };

export const KARTLAR: KartTanimi[] = [
  {
    id: 'buyukbas',
    label: 'Büyükbaş Sayısı',
    birim: 'baş',
    grup: 'varlik',
    kaynak: 'varlik',
    alan: 'buyukbas_toplam_bas',
    kirilim: [
      { key: 'sigir_bas', label: 'Sığır' },
      { key: 'manda_bas', label: 'Manda' },
    ],
    // TÜİK'te canlı hayvan fiyatı iki ayrı maddede: süt sığırı ve diğer sığır/manda.
    fiyatUrunleri: ['Süt sığırları, canlı', 'Diğer sığır, manda (süt için yetiştirilenler hariç) ve bizonlar, canlı'],
    sektor: KIRMIZI_ET_SEKTORU,
    dunyaFiyat: [{ kod: 867, label: 'Sığır Eti' }],
  },
  {
    id: 'kucukbas',
    label: 'Küçükbaş Sayısı',
    birim: 'baş',
    grup: 'varlik',
    kaynak: 'varlik',
    alan: 'kucukbas_toplam_bas',
    kirilim: [
      { key: 'koyun_bas', label: 'Koyun' },
      { key: 'keci_bas', label: 'Keçi' },
    ],
    fiyatUrunleri: ['Koyun, canlı', 'Keçi, canlı'],
    sektor: KIRMIZI_ET_SEKTORU,
    dunyaFiyat: [{ kod: 977, label: 'Koyun Eti' }, { kod: 1017, label: 'Keçi Eti' }],
  },
  {
    id: 'kirmizi-et',
    label: 'Kırmızı Et',
    birim: 'ton',
    grup: 'uretim',
    kaynak: 'uretim',
    alan: 'kirmizi_et_uretimi',
    dunyaSirasi: 'sigir-eti',
    sektor: KIRMIZI_ET_SEKTORU,
    dunyaFiyat: [{ kod: 867, label: 'Sığır Eti' }, { kod: 977, label: 'Koyun Eti' }],
  },
  {
    id: 'cig-sut',
    label: 'Çiğ Süt',
    birim: 'ton',
    grup: 'uretim',
    kaynak: 'uretim',
    alan: 'cig_sut_uretimi',
    fiyatUrunleri: ['Süt, sığırdan elde edilen (manda sütü hariç), işlenmemiş', 'Koyun sütü, işlenmemiş', 'Keçi sütü, işlenmemiş'],
    dunyaSirasi: 'sut',
    sektor: CIG_SUT_SEKTORU,
    dunyaFiyat: [{ kod: 882, label: 'İnek Sütü' }],
  },
  {
    id: 'beyaz-et',
    label: 'Beyaz Et',
    birim: 'ton',
    grup: 'uretim',
    kaynak: 'uretim',
    alan: 'kanatli_eti_ton',
    dunyaSirasi: 'tavuk-eti',
    sektor: KANATLI_SEKTORU,
    dunyaFiyat: [{ kod: 1058, label: 'Tavuk Eti' }],
  },
  {
    id: 'yumurta',
    label: 'Yumurta',
    birim: 'milyon adet',
    grup: 'uretim',
    kaynak: 'uretim',
    alan: 'yumurta_milyon_adet',
    sektor: KANATLI_SEKTORU,
    dunyaFiyat: [{ kod: 1062, label: 'Yumurta' }],
  },
  {
    id: 'bal',
    label: 'Bal',
    birim: 'ton',
    grup: 'uretim',
    kaynak: 'uretim',
    alan: 'bal_uretimi',
    dunyaFiyat: [{ kod: 1182, label: 'Bal' }],
  },
];

export const kartBul = (id: string) => KARTLAR.find((k) => k.id === id);
