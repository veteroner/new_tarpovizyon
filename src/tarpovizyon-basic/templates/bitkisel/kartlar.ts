/**
 * Bitkisel üretim iniş sayfasının kartları.
 *
 * ─── NEDEN ÜRÜN DEĞİL GRUP ──────────────────────────────────────────────────
 * Hayvancılıkta 7 doğal künye vardı (kırmızı et, süt, yumurta…) ve her birine
 * bir kart düştü. Bitkiselde 45 ürün sayfası var; ürün başına kart 45 kutu
 * demek olurdu ve hiçbir şey söylemezdi. Bu yüzden kartlar ÜRÜN GRUBU.
 *
 * Gruplar mevcut menü bölümleriyle birebir aynı değil: "Tarla Bitkileri"
 * altındaki 15 ürün tek kutuda toplanınca tahıl da mercimek de pamuk da aynı
 * rakamın içinde kayboluyordu. Tarla bitkileri dörde ayrıldı; meyve ve sebze
 * kendi bütünlüğünü koruyor.
 *
 * ─── DETAY MANTIĞI ──────────────────────────────────────────────────────────
 * Hayvancılıkla aynı iskelet (künye → seyir → kırılım → yönlendirme), ama
 * kırılım burada "grup içi ürün sıralaması" ve bitkisele özgü iki blok var:
 * EKİLEN ALAN ve VERİM. Hayvancılıkta karşılığı yoktu, burada asıl soru bu.
 */

export type BitkiselKart = {
  id: string;
  label: string;
  /** Grup toplamı için `bitkisel/uretim-detay-yillik` ürün adları. */
  urunler: string[];
  /** Grup içi sıralama: görünen ad → o ürünün detay adları. */
  parcalar: { label: string; urunler: string[] }[];
  /** Detayın altındaki yönlendirme. */
  sektor: { label: string; yol: string };
};

const TARLA = { label: 'Tarla Bitkileri', yol: 'tarla-bitkileri/bugday' };
const MEYVE = { label: 'Meyveler', yol: 'meyveler/antep-fistigi' };
const SEBZE = { label: 'Sebzeler', yol: 'sebzeler/biber' };

/** Ürün adları `pagesBitkisel.ts`'teki listelerle birebir aynı olmalı. */
const P = {
  bugday: ['Buğday, Durum Buğdayı Hariç', 'Durum Buğdayı'],
  arpa: ['Arpa (Diğer)', 'Arpa (Biralık)'],
  misir: ['Mısır'],
  celtik: ['Çeltik'],
  nohut: ['Nohut, Kuru'],
  mercimekK: ['Mercimek, Kuru (Kırmızı)'],
  mercimekY: ['Mercimek, Kuru (Yeşil)'],
  fasulye: ['Fasulye, Kuru'],
  aycicegi: ['Ayçiçeği Tohumu (Çerezlik)', 'Ayçiçeği Tohumu (Yağlık)'],
  soya: ['Soya Fasulyesi'],
  kolza: ['Kanola Veya Kolza Tohumu'],
  aspir: ['Aspir Tohumu'],
  pamuk: ['Pamuk, Çırçırlanmamış (Kütlü)'],
  sekerPancari: ['Şeker Pancarı'],
  patates: ['Patates (Tatlı Patates Hariç)'],
  // meyveler
  antepFistigi: ['Şam Fıstığı (Antep Fıstığı)'],
  armut: ['Armut'], badem: ['Badem'], ceviz: ['Ceviz'],
  elma: ['Elma (Amasya)', 'Elma (Golden)', 'Elma (Granny Smith)', 'Elma (Starking)', 'Diğer Elmalar'],
  seftali: ['Şeftali'], cilek: ['Çilek'], findik: ['Fındık'],
  greyfurt: ['Greyfurt (Altıntop)'], incir: ['İncir (Yaş)'], kayisi: ['Kayısı'],
  kiraz: ['Kiraz'], limon: ['Limon Ve Misket Limonu'],
  mandalina: ['Mandalina (Diğer)', 'Mandalina (King)', 'Mandalina (Klemantin)', 'Mandalina (Satsuma)'],
  muz: ['Muz, Plantain Ve Benzerleri'], nar: ['Nar'],
  uzumYas: ['Sofralık Üzüm, Çekirdekli', 'Sofralık Üzüm, Çekirdeksiz'],
  uzumKuru: ['Kurutmalık Üzüm, Çekirdekli', 'Kurutmalık Üzüm, Çekirdeksiz'],
  portakal: ['Portakal (Washington)', 'Portakal (Yafa)', 'Diğer Portakallar'],
  zeytin: ['Sofralık Zeytinler', 'Yağlık Zeytinler (Zeytinyağı Üretimi İçin)'],
  // sebzeler
  biber: ['Biber (Çarliston)', 'Biber (Dolmalık)', 'Biber (Salçalık, Kapya)', 'Biber (Sivri)'],
  domates: ['Domates (Salçalık)', 'Domates (Sofralık)'],
  hiyar: ['Hıyar (Sofralık)', 'Hıyar (Turşuluk)'],
  karpuz: ['Karpuz'], kavun: ['Kavun'],
  sogan: ['Soğan (Kuru)'], sarimsak: ['Sarımsak (Kuru)'],
};

const grup = (parcalar: { label: string; urunler: string[] }[]) => ({
  parcalar,
  urunler: parcalar.flatMap((p) => p.urunler),
});

export const BITKISEL_KARTLAR: BitkiselKart[] = [
  {
    id: 'tahillar', label: 'Tahıllar', sektor: TARLA,
    ...grup([
      { label: 'Buğday', urunler: P.bugday },
      { label: 'Arpa', urunler: P.arpa },
      { label: 'Mısır', urunler: P.misir },
      { label: 'Çeltik', urunler: P.celtik },
    ]),
  },
  {
    id: 'baklagiller', label: 'Baklagiller', sektor: TARLA,
    ...grup([
      { label: 'Nohut', urunler: P.nohut },
      { label: 'Mercimek (Kırmızı)', urunler: P.mercimekK },
      { label: 'Mercimek (Yeşil)', urunler: P.mercimekY },
      { label: 'Fasulye (Kuru)', urunler: P.fasulye },
    ]),
  },
  {
    id: 'yagli-tohumlar', label: 'Yağlı Tohumlar', sektor: TARLA,
    ...grup([
      { label: 'Ayçiçeği', urunler: P.aycicegi },
      { label: 'Soya', urunler: P.soya },
      { label: 'Kolza (Kanola)', urunler: P.kolza },
      { label: 'Aspir', urunler: P.aspir },
    ]),
  },
  {
    id: 'endustriyel', label: 'Endüstriyel Bitkiler', sektor: TARLA,
    ...grup([
      { label: 'Şeker Pancarı', urunler: P.sekerPancari },
      { label: 'Patates', urunler: P.patates },
      { label: 'Pamuk (Kütlü)', urunler: P.pamuk },
    ]),
  },
  {
    id: 'meyveler', label: 'Meyveler', sektor: MEYVE,
    ...grup([
      { label: 'Üzüm (Yaş)', urunler: P.uzumYas },
      { label: 'Üzüm (Kuru)', urunler: P.uzumKuru },
      { label: 'Elma', urunler: P.elma },
      { label: 'Portakal', urunler: P.portakal },
      { label: 'Mandalina', urunler: P.mandalina },
      { label: 'Limon', urunler: P.limon },
      { label: 'Greyfurt', urunler: P.greyfurt },
      { label: 'Zeytin', urunler: P.zeytin },
      { label: 'Fındık', urunler: P.findik },
      { label: 'Antep Fıstığı', urunler: P.antepFistigi },
      { label: 'Ceviz', urunler: P.ceviz },
      { label: 'Badem', urunler: P.badem },
      { label: 'Kayısı', urunler: P.kayisi },
      { label: 'Şeftali', urunler: P.seftali },
      { label: 'Kiraz', urunler: P.kiraz },
      { label: 'Armut', urunler: P.armut },
      { label: 'Nar', urunler: P.nar },
      { label: 'İncir', urunler: P.incir },
      { label: 'Muz', urunler: P.muz },
      { label: 'Çilek', urunler: P.cilek },
    ]),
  },
  {
    id: 'sebzeler', label: 'Sebzeler', sektor: SEBZE,
    ...grup([
      { label: 'Domates', urunler: P.domates },
      { label: 'Karpuz', urunler: P.karpuz },
      { label: 'Biber', urunler: P.biber },
      { label: 'Hıyar', urunler: P.hiyar },
      { label: 'Kavun', urunler: P.kavun },
      { label: 'Soğan (Kuru)', urunler: P.sogan },
      { label: 'Sarımsak', urunler: P.sarimsak },
    ]),
  },
];

export const bitkiselKartBul = (id: string) => BITKISEL_KARTLAR.find((k) => k.id === id);
