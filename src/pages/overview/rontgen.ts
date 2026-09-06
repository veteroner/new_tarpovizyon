/**
 * Tarım röntgeni — veriden hesaplanan uyarı sinyalleri.
 *
 * ─── NEDEN "AI YORUMU" DEĞİL ────────────────────────────────────────────────
 * İstenen şey "bir bakışta neyde sorun var" görmekti. Bunu bir modele metin
 * yazdırarak da yapabilirdik; yapmadık. Model, sayıyı görmeden cümle kurar ve
 * cümle her zaman ikna edici çıkar — yanlışken bile. Burada her sinyal bir
 * KURAL, bir ÖLÇÜLEN SAYI ve bir KANIT SAYFASI taşıyor. Okuyucu katılmıyorsa
 * bağlantıya tıklayıp veriye bakabiliyor.
 *
 * Model bu ekranın yerine değil, ÜSTÜNE gelebilir: sinyaller hesaplandıktan
 * sonra özetlenmesi ayrı bir iş. Önce ölçü, sonra cümle.
 *
 * ─── KAPSAM: GİRDİDEN ÇIKTIYA ───────────────────────────────────────────────
 * Röntgen zincirin tamamını tarıyor, tek bir halkasını değil:
 *
 *   GİRDİ        gübre, yem, enerji, ilaç, tohum, veteriner (GFE alt grupları)
 *   EKONOMİ      kârlılık, parite, maliyet-fiyat makası
 *   ÜRETİM       hayvansal üretim, hayvan varlığı, bitkisel üretim, ekilen alan
 *   ARZ          yeterlilik derecesi (hayvansal + bitkisel), kişi başı üretim–tüketim
 *   TİCARET      tarımsal dış ticaret dengesi
 *   FİYAT        gıda enflasyonu, aktarım zinciri projeksiyonu
 *
 * Kategori sadece etiket değil: ekran bunlara göre gruplanıyor, çünkü otuz
 * satırlık düz bir liste "neye bakmalıyım" sorusunu yeniden üretirdi.
 *
 * ─── EŞİKLER NEREDEN ────────────────────────────────────────────────────────
 * Eşikler keyfi değil, ölçünün kendi anlamından:
 *   kârlılık   < 0   → üretici zarar ediyor (sıfır doğal eşik)
 *   yeterlilik < 1   → iç üretim tüketimi karşılamıyor (bire tam denk gelir)
 *   makas      > 0   → girdi, çıktıdan hızlı pahalanıyor (sıfır doğal eşik)
 *   üretim     < -5% → hayvansalda tek yıllık dalgalanmanın ötesi
 *   parite           → serinin KENDİ geçmiş medyanı (sektör folklorundan
 *                      gelen "1,5 olmalı" gibi bir sayı uydurulmadı)
 *   bitkisel üretim  → ÜRÜNÜN KENDİ geçmiş medyanının katı. Sabit eşik burada
 *                      işe yaramıyor: zeytinde %30 düşüş normal bir yıl,
 *                      nohutta felaket (bkz. bitkiselUretimSinyali).
 * "Kritik" ile "uyarı" arasındaki ikinci eşik büyüklük içindir, yön değil.
 */

/** Sinyalin aciliyeti. Renk TEK BAŞINA anlam taşımaz; her satırda etiket var. */
export type Seviye = 'kritik' | 'uyari' | 'izle' | 'iyi';

/** Zincirdeki yeri. Ekran bu alana göre gruplanıyor. */
export type Kategori = 'girdi' | 'ekonomi' | 'uretim' | 'arz' | 'ticaret' | 'fiyat';

export type Sinyal = {
  id: string;
  seviye: Seviye;
  kategori: Kategori;
  /** Kısa başlık — ne olduğu. */
  baslik: string;
  /** Ölçülen değer, birimiyle. */
  olcu: string;
  /** Neden önemli — tek cümle, yorum değil sonuç. */
  aciklama: string;
  /** Kanıt sayfası. */
  yol: string;
  /** Ölçünün dönemi. */
  donem?: string;
  /** Kaynağı beklenen tazelik penceresini aştı mı — {@link bayatMi}. */
  bayat?: boolean;
};

/* ── Tazelik ──────────────────────────────────────────────────────────────── */

/**
 * Bir sinyalin kaynağı ne kadar eskiyse "artık şu an değil".
 *
 * ─── NEDEN GEREKLİ ──────────────────────────────────────────────────────────
 * Röntgen kendi kendini hesaplıyor, elle güncellenmiyor — ama beslediği
 * tablolar elle güncelleniyor. Bir tablo beslenmezse röntgen susmaz: eski
 * sayıyı GÜNCELMİŞ GİBİ göstermeye devam eder. Sessizce yanlış olmak,
 * görünmez olmaktan kötü.
 *
 * ─── PENCERELER NEREDEN ─────────────────────────────────────────────────────
 * Serinin YAYIM RİTMİNDEN, keyfi değil:
 *   aylık seri → 3 ay.  TÜİK aylık bültenleri bir ay gecikmeli çıkıyor;
 *                       üç ay, bir bültenin kaçırılmasına tolerans bırakıyor.
 *   yıllık seri → 20 ay. Yıllık veri ertesi yılın ortasında yayımlanıyor;
 *                       20 ay, "bir yayım dönemi tamamen atlandı" demek.
 * Aynı eşikler `scripts/veri-kutugu.mjs`teki tazelik denetiminde de kullanılıyor.
 */
export const TAZELIK_AYLIK_AY = 3;
export const TAZELIK_YILLIK_AY = 20;

/**
 * Dönem etiketinden bayatlık kararı.
 *
 * `donem` iki biçimde geliyor: 'YYYY-MM' (aylık) ya da 'YYYY' (yıllık). Sonuna
 * eklenmiş açıklamalar ('2026-06 · 12 ay ort.') kırpılıyor. Dönemi olmayan
 * sinyal denetlenemez — o zaman bayat SAYILMIYOR, çünkü "bilmiyoruz" ile
 * "eski" aynı şey değil.
 */
export function bayatMi(donem: string | undefined, bugun = new Date()): boolean {
  if (!donem) return false;
  const aylik = donem.match(/^(\d{4})-(\d{2})/);
  const yillik = donem.match(/^(\d{4})\s*$/);
  const bugunAy = bugun.getFullYear() * 12 + bugun.getMonth() + 1;
  if (aylik) {
    const yas = bugunAy - (Number(aylik[1]) * 12 + Number(aylik[2]));
    return yas > TAZELIK_AYLIK_AY;
  }
  if (yillik) {
    /* Yıllık veri o yılın sonuna denk sayılıyor: 2024 verisi 2024-12'dir. */
    const yas = bugunAy - (Number(yillik[1]) * 12 + 12);
    return yas > TAZELIK_YILLIK_AY;
  }
  return false;
}

export const SEVIYE_SIRA: Record<Seviye, number> = {
  kritik: 0, uyari: 1, izle: 2, iyi: 3,
};

export const SEVIYE_ETIKET: Record<Seviye, string> = {
  kritik: 'Kritik', uyari: 'Uyarı', izle: 'İzle', iyi: 'İyi',
};

export const KATEGORI_SIRA: Kategori[] = ['girdi', 'ekonomi', 'uretim', 'arz', 'ticaret', 'fiyat'];

export const KATEGORI_ETIKET: Record<Kategori, string> = {
  girdi: 'Girdi',
  ekonomi: 'Ekonomi',
  uretim: 'Üretim',
  arz: 'Arz ve yeterlilik',
  ticaret: 'Dış ticaret',
  fiyat: 'Fiyat',
};

export const KATEGORI_NOT: Record<Kategori, string> = {
  girdi: 'Üreticinin ödediği fiyatlar — gübre, yem, enerji, ilaç, tohum.',
  ekonomi: 'Üreticiye kalan — kârlılık ve girdi-çıktı dengesi.',
  uretim: 'Üretilen miktar, ekilen alan ve hayvan varlığı.',
  arz: 'İç üretimin tüketimi karşılama durumu.',
  ticaret: 'Tarımsal dış ticaretin yönü.',
  fiyat: 'Tüketiciye yansıyan fiyat ve önümüzdeki döneme dair ölçülen baskı.',
};

/* ── Kurallar: EKONOMİ ────────────────────────────────────────────────────── */

/**
 * Kârlılık kuralı.
 *
 * Sıfır doğal eşik: altı zarar demek. Kritik sınırı %10, çünkü küçük eksiler
 * aylık dalgalanmayla gelip geçiyor; %10'u aşan zarar sürdürülemez.
 */
export function karlilikSinyali(
  ad: string, karlilik: number | null, donem: string, yol: string,
): Sinyal | null {
  if (karlilik == null || !Number.isFinite(karlilik)) return null;
  const ortak = { id: `karlilik-${ad}`, kategori: 'ekonomi' as const, donem, yol };
  if (karlilik >= 10) {
    return {
      ...ortak, seviye: 'iyi', baslik: `${ad} üretimi kârda`,
      olcu: `%${karlilik.toFixed(1)}`,
      aciklama: 'Üretici fiyatı maliyetin üzerinde.',
    };
  }
  if (karlilik >= 0) {
    return {
      ...ortak, seviye: 'izle', baslik: `${ad} kâr marjı ince`,
      olcu: `%${karlilik.toFixed(1)}`,
      aciklama: 'Maliyetteki küçük bir artış üretimi zarara çevirebilir.',
    };
  }
  return {
    ...ortak,
    seviye: karlilik < -10 ? 'kritik' : 'uyari',
    baslik: `${ad} üretimi zararda`,
    olcu: `%${karlilik.toFixed(1)}`,
    aciklama: 'Üretici maliyetin altında satıyor; sürdürülemezse arz daralır.',
  };
}

/**
 * Maliyet makası — girdi enflasyonu eksi çıktı enflasyonu.
 *
 * Tarım ekonomisinin en temel ölçüsü: üreticinin ÖDEDİĞİ fiyatlar (Girdi Fiyat
 * Endeksi) ile ALDIĞI fiyatlar (Tarım ÜFE) arasındaki fark. Pozitifse makas
 * üreticinin aleyhine açılıyor.
 *
 * ─── PENCERE NEDEN 12 AY ────────────────────────────────────────────────────
 * Bu seçim ölçülerek yapıldı, çünkü makasın İŞARETİ pencereye göre değişiyor
 * (2026-06 itibarıyla): 1 ay +22,5 · 3 ay +4,2 · 6 ay −1,8 · 12 ay −4,4.
 * Yönü keyfi bir yumuşatma ayarına bağlı olan şey sinyal değil, düğmedir.
 *
 * 12 ay iki nedenle doğru pencere:
 *   1. Tarım ÜFE mevsimsel, girdi endeksi değil. Kısa pencere, çıktı
 *      fiyatlarının mevsimsel bir dilimini mevsimsel olmayan girdiyle
 *      karşılaştırıyor — zıplamanın kaynağı bu. 12 ay tam bir üretim yılını
 *      kapsayıp mevsimi dışarıda bırakıyor.
 *   2. İstikrar ölçüldü: 12 aylık pencere 54 ayda 1 kez işaret değiştiriyor,
 *      3 aylık 63 ayda 7 kez. İkincisi durumu değil gürültüyü raporlar.
 *
 * İki seri farklı aylarda bittiği için önce ORTAK aylar alınıyor; her birinin
 * kendi son 12 ayını almak farklı dönemleri karşılaştırırdı.
 */
export const MAKAS_PENCERE = 12;
export function makasSinyali(
  girdi: number | null, cikti: number | null, donem: string, yol: string,
): Sinyal | null {
  if (girdi == null || cikti == null) return null;
  const makas = girdi - cikti;
  const ortak = { id: 'maliyet-makasi', kategori: 'ekonomi' as const, donem, yol };
  if (makas <= 0) {
    return {
      ...ortak, seviye: 'iyi', baslik: 'Makas üreticinin lehine',
      olcu: `${makas.toFixed(1)} puan`,
      aciklama: `Ürün fiyatları (%${cikti.toFixed(1)}) girdiden (%${girdi.toFixed(1)}) hızlı artıyor.`,
    };
  }
  return {
    ...ortak,
    seviye: makas > 10 ? 'kritik' : 'uyari',
    baslik: 'Maliyet makası açılıyor',
    olcu: `+${makas.toFixed(1)} puan`,
    aciklama: `Girdi %${girdi.toFixed(1)} artarken üretici fiyatları %${cikti.toFixed(1)} artıyor; fark üreticide kalıyor.`,
  };
}

/**
 * Parite kuralı — bir birim ürünle kaç kilo yem alınabiliyor.
 *
 * Eşik serinin KENDİ geçmiş medyanı. Sektörde dolaşan "parite 1,5 olmalı" gibi
 * sayılar var; hiçbiri bu veriden çıkmıyor, o yüzden kullanılmadı. Medyanın
 * altına düşmek "geçmişteki tipik duruma göre kötüleşti" demek — bu, veriden
 * çıkarılabilecek en güçlü ifade.
 */
export function pariteSinyali(
  ad: string, simdi: number | null, medyan: number | null, donem: string, yol: string,
): Sinyal | null {
  if (simdi == null || medyan == null || !medyan) return null;
  const sapma = ((simdi - medyan) / medyan) * 100;
  const ortak = { id: `parite-${ad}`, kategori: 'ekonomi' as const, donem, yol };
  if (sapma >= 0) {
    return {
      ...ortak, seviye: 'iyi', baslik: `${ad} paritesi geçmiş ortalamanın üzerinde`,
      olcu: simdi.toFixed(2),
      aciklama: `Uzun dönem medyanı ${medyan.toFixed(2)}; şu an %${Math.abs(sapma).toFixed(0)} yukarıda.`,
    };
  }
  return {
    ...ortak,
    seviye: sapma < -15 ? 'kritik' : sapma < -5 ? 'uyari' : 'izle',
    baslik: `${ad} paritesi geçmişin altında`,
    olcu: simdi.toFixed(2),
    aciklama: `Uzun dönem medyanı ${medyan.toFixed(2)}; şu an %${Math.abs(sapma).toFixed(0)} aşağıda — ürün, yemi eskisi kadar karşılamıyor.`,
  };
}

/* ── Kurallar: GİRDİ ──────────────────────────────────────────────────────── */

/** Bir girdi kaleminin sinyal üretmesi için farkın kaç ay üst üste sürmesi gerek. */
export const GIRDI_SUREKLILIK = 3;

/** Girdi kalemi, genel girdi enflasyonunu kaç puan aşarsa haber olur. */
export const GIRDI_ESIK = 5;

/**
 * Girdi grubu kuralı — hangi girdi kalemi genel girdi enflasyonundan sapıyor.
 *
 * Eşik genel GFE: bir kalem ondan hızlı artıyorsa maliyeti o kalem çekiyor
 * demektir. Mutlak yüzde eşiği (ör. %40) yıllara göre anlamsızlaşırdı.
 *
 * ─── NEDEN SÜREKLİLİK ŞARTI ─────────────────────────────────────────────────
 * Tek aya bakan ilk sürüm gürültü raporluyordu. Ölçüldü (2025-07…2026-06):
 * veteriner harcamalarının genel girdiden farkı Aralık'ta +39,6 puan, altı ay
 * sonra −5,6. Tek aylık kural Aralık'ta "veteriner kritik" der, sonra sessizce
 * kaybolurdu — kullanıcı sinyalin neden gittiğini hiç öğrenemezdi.
 *
 * Aynı dönemde gübre farkı 12 ayın 12'sinde de eşiğin üstünde kaldı. Aradaki
 * fark tam olarak sinyal ile gürültü arasındaki fark; kural bunu ayırt etsin
 * diye farkın {@link GIRDI_SUREKLILIK} ay ÜST ÜSTE sürmesi şart koşuldu.
 *
 * Aciliyet, son ayın sıçramasından değil süreklilik penceresinin
 * ORTALAMASINDAN hesaplanıyor — aynı sebeple.
 */
export function girdiGrubuSinyali(
  ad: string, sonFarklar: number[], grupSon: number, genelSon: number,
  donem: string, yol: string,
): Sinyal | null {
  const pencere = sonFarklar.slice(-GIRDI_SUREKLILIK);
  if (pencere.length < GIRDI_SUREKLILIK) return null;
  if (!pencere.every((f) => f > GIRDI_ESIK)) return null;
  const ortalamaFark = pencere.reduce((a, b) => a + b, 0) / pencere.length;
  return {
    id: `girdi-${ad}`,
    kategori: 'girdi',
    seviye: ortalamaFark > 15 ? 'kritik' : 'uyari',
    baslik: `${ad} fiyatı girdi ortalamasını aşıyor`,
    olcu: `%${grupSon.toFixed(1)}`,
    donem,
    yol,
    aciklama: `Girdi ortalaması %${genelSon.toFixed(1)}; fark ${GIRDI_SUREKLILIK} aydır sürüyor, `
      + `ortalama ${ortalamaFark.toFixed(1)} puan.`,
  };
}

/* ── Kurallar: ÜRETİM ─────────────────────────────────────────────────────── */

/**
 * Üretim değişimi kuralı.
 *
 * %5 eşiği: tek yıllık hava/pazar dalgalanması genelde bunun altında kalıyor,
 * üstü yapısal bir kaymaya işaret ediyor.
 */
export function uretimSinyali(
  ad: string, oncekiYil: number | null, sonYil: number | null,
  donem: string, yol: string,
): Sinyal | null {
  if (!oncekiYil || !sonYil || oncekiYil <= 0) return null;
  const degisim = ((sonYil - oncekiYil) / oncekiYil) * 100;
  if (degisim >= -5) return null;              // düşüş yoksa sinyal yok
  return {
    id: `uretim-${ad}`,
    kategori: 'uretim',
    seviye: degisim < -10 ? 'kritik' : 'uyari',
    baslik: `${ad} üretimi düştü`,
    olcu: `%${degisim.toFixed(1)}`,
    donem,
    yol,
    aciklama: 'Bir önceki yıla göre gerileme.',
  };
}

/**
 * Bitkisel üretim kuralı — eşik ÜRÜNÜN KENDİ geçmişinden.
 *
 * ─── NEDEN SABİT EŞİK OLMUYOR ───────────────────────────────────────────────
 * Hayvansal üretimdeki %5/%10 eşiği bitkiselde işe yaramıyor: bu ürünlerin
 * yıllık değişiminin medyanı zaten %10,2 (ölçüldü, 16 ürün). Yani sabit eşik
 * sıradan bir yılı "kritik" diye raporluyor — ilk denemede 13 ürün birden
 * kritik çıktı ve röntgen "neye bakmalıyım" sorusunu yeniden üretti.
 *
 * Asıl sorun ürünlerin BİRBİRİNDEN çok farklı oynaması. 22 yıllık ölçüm:
 *   sofralık domates  tipik değişim %2,9      nohut       %4,5
 *   buğday            %7,2                    fındık     %24,2
 *   yağlık zeytin     %26,9 (bir yıl var bir yıl yok)
 * Zeytinde %30 düşüş normal bir yıl, nohutta felaket. Tek eşik ikisini de
 * doğru sınıflandıramaz.
 *
 * Bu yüzden eşik her ürünün KENDİ geçmiş medyanının katı:
 *   1,5× → uyarı  (tipik bir yıldan yarı yarıya büyük)
 *   2,5× → kritik (tipik bir yılın iki buçuk katı)
 * Sonuç sınandı: yağlık zeytin −%30,3 sinyal ÜRETMİYOR (kendi normali),
 * nohut −%28,2 KRİTİK (kendi normalinin altı katı). Sabit eşik ikisine de
 * "kritik" diyordu.
 *
 * Son yılın değişimi eşiğin hesabına KATILMIYOR; kendi kendini normalleştiren
 * bir eşik, büyük şoku "demek ki normalmiş" diye eleyebilirdi.
 */
export const BITKISEL_UYARI_KAT = 1.5;
export const BITKISEL_KRITIK_KAT = 2.5;

/** En az kaç yıllık geçmiş olmadan kendi eşiği hesaplanmaz. */
const BITKISEL_ASGARI_YIL = 6;

export function bitkiselUretimSinyali(
  ad: string, yilDeger: [number, number][], yol: string, alanMi = false,
): Sinyal | null {
  const sirali = [...yilDeger].sort((a, b) => a[0] - b[0]);
  const degisimler: number[] = [];
  for (let i = 1; i < sirali.length; i += 1) {
    const onceki = sirali[i - 1][1];
    if (onceki > 0) degisimler.push(((sirali[i][1] - onceki) / onceki) * 100);
  }
  if (degisimler.length < BITKISEL_ASGARI_YIL) return null;

  const son = degisimler[degisimler.length - 1];
  if (son >= 0) return null;
  const tipik = medyan(degisimler.slice(0, -1).map(Math.abs));
  if (tipik == null || tipik <= 0) return null;

  const uyariEsik = BITKISEL_UYARI_KAT * tipik;
  const kritikEsik = BITKISEL_KRITIK_KAT * tipik;
  if (-son < uyariEsik) return null;

  const donem = String(sirali[sirali.length - 1][0]);
  const kat = (-son / tipik).toFixed(1);
  return {
    id: `${alanMi ? 'alan' : 'bitkisel-uretim'}-${ad}`,
    kategori: 'uretim',
    seviye: -son >= kritikEsik ? 'kritik' : 'uyari',
    baslik: alanMi ? `${ad}: ekilen alan daraldı` : `${ad} üretimi düştü`,
    olcu: `%${son.toFixed(1)}`,
    donem,
    yol,
    aciklama: alanMi
      ? `Bu ürün için olağan yıllık oynama %${tipik.toFixed(1)}; bu daralma onun ${kat} katı. Etkisi gelecek hasatta görülür.`
      : `Bu ürün için olağan yıllık oynama %${tipik.toFixed(1)}; bu düşüş onun ${kat} katı.`,
  };
}

/**
 * Hayvan varlığı kuralı.
 *
 * Üretimden AYRI bir sinyal: sürü küçülmesi bu yılın üretimini değil, gelecek
 * yılların üretim tavanını belirliyor. %3 eşiği üretimdekinden dar, çünkü
 * hayvan sayısı üretim kadar oynak değil — %3'lük bir daralma zaten büyük.
 */
export function varlikSinyali(
  ad: string, onceki: number | null, son: number | null, donem: string, yol: string,
): Sinyal | null {
  if (!onceki || !son || onceki <= 0) return null;
  const degisim = ((son - onceki) / onceki) * 100;
  if (degisim >= -3) return null;
  return {
    id: `varlik-${ad}`,
    kategori: 'uretim',
    seviye: degisim < -8 ? 'kritik' : 'uyari',
    baslik: `${ad} varlığı azaldı`,
    olcu: `%${degisim.toFixed(1)}`,
    donem,
    yol,
    aciklama: 'Sürü küçülmesi gelecek yılların üretim tavanını düşürür.',
  };
}

/* ── Kurallar: ARZ ────────────────────────────────────────────────────────── */

/**
 * Yeterlilik kuralı — iç üretimin tüketimi karşılama oranı.
 *
 * 1,00 doğal eşik: altı ithalat bağımlılığı demek. Tabloda oran (1,17 gibi)
 * tutuluyor, yüzdeye çevriliyor.
 */
export function yeterlilikSinyali(
  ad: string, oran: number | null, yol: string,
): Sinyal | null {
  if (oran == null || !Number.isFinite(oran) || oran <= 0) return null;
  const yuzde = oran * 100;
  if (oran >= 1) {
    return {
      id: `yeterlilik-${ad}`, kategori: 'arz', seviye: 'iyi',
      baslik: `${ad}: iç üretim yeterli`,
      olcu: `%${yuzde.toFixed(0)}`, yol,
      aciklama: 'Üretim tüketimi karşılıyor.',
    };
  }
  return {
    id: `yeterlilik-${ad}`,
    kategori: 'arz',
    seviye: oran < 0.9 ? 'kritik' : 'uyari',
    baslik: `${ad}: arz açığı`,
    olcu: `%${yuzde.toFixed(0)}`, yol,
    /* Ek almayan kuruluş: "%6'i" yanlış, "%6'sı" doğru ama son rakama göre
       değişiyor. Cümleyi ek gerektirmeyecek şekilde kurmak daha sağlam. */
    aciklama: `Aradaki %${(100 - yuzde).toFixed(0)} fark ithalatla kapanıyor.`,
  };
}

/**
 * Kişi başı üretim–tüketim kuralı.
 *
 * Yeterlilikten farkı: yeterlilik oranı toplamlardan, bu ölçü kişi başına
 * geliyor. Nüfus artarken üretim sabit kalırsa yeterlilik geç, bu ölçü erken
 * uyarıyor. %5 eşiği ölçüm yönteminden gelen küçük farkları eliyor.
 */
export function kisiBasiSinyali(
  ad: string, uretim: number | null, tuketim: number | null, donem: string, yol: string,
): Sinyal | null {
  if (!uretim || !tuketim || tuketim <= 0) return null;
  const fark = ((uretim - tuketim) / tuketim) * 100;
  if (Math.abs(fark) < 5) return null;         // dengede — haber değil
  if (fark > 0) {
    return {
      id: `kisibasi-${ad}`, kategori: 'arz', seviye: 'iyi',
      baslik: `${ad}: kişi başı üretim tüketimin üzerinde`,
      olcu: `%${fark.toFixed(0)}`, donem, yol,
      aciklama: 'Aradaki fark ihracat kapasitesi anlamına geliyor.',
    };
  }
  return {
    id: `kisibasi-${ad}`,
    kategori: 'arz',
    seviye: fark < -15 ? 'kritik' : 'uyari',
    baslik: `${ad}: kişi başı üretim tüketimin altında`,
    olcu: `%${fark.toFixed(0)}`, donem, yol,
    aciklama: 'Nüfus başına düşen üretim tüketimi karşılamıyor.',
  };
}

/**
 * Bitkisel ürün yeterliliği — ürün dengesi tablosundan.
 *
 * Hayvansal yeterlilikle aynı kural, farklı kaynak: burada oran değil YÜZDE
 * tutuluyor (117,1 gibi), o yüzden ayrı bir işlev. Aynı eşik: 100 doğal
 * sınır, altı ithalat bağımlılığı.
 *
 * ─── NEDEN YALNIZCA SEÇİLMİŞ ÜRÜNLER ────────────────────────────────────────
 * Tabloda 74 ürün var; hepsini basmak röntgeni tek başına doldururdu ve
 * "neye bakmalıyım" sorusunu yeniden üretirdi. Listeye giren ürünler
 * `useRontgen.ts`te, stratejik önemine göre seçili — ekmeklik tahıl, yağ
 * bitkisi, temel sebze.
 */
export function bitkiselYeterlilikSinyali(
  ad: string, yuzde: number | null, donem: string, yol: string,
): Sinyal | null {
  if (yuzde == null || !Number.isFinite(yuzde) || yuzde <= 0) return null;
  if (yuzde >= 100) {
    return {
      id: `bitkisel-yeterlilik-${ad}`, kategori: 'arz', seviye: 'iyi',
      baslik: `${ad}: iç üretim yeterli`,
      olcu: `%${yuzde.toFixed(0)}`, donem, yol,
      aciklama: 'Üretim yurt içi kullanımı karşılıyor.',
    };
  }
  return {
    id: `bitkisel-yeterlilik-${ad}`,
    kategori: 'arz',
    seviye: yuzde < 85 ? 'kritik' : 'uyari',
    baslik: `${ad}: arz açığı`,
    olcu: `%${yuzde.toFixed(0)}`, donem, yol,
    aciklama: `Yurt içi kullanımın %${(100 - yuzde).toFixed(0)} kadarı ithalatla karşılanıyor.`,
  };
}

/* ── Kurallar: TİCARET ────────────────────────────────────────────────────── */

/**
 * Tarımsal dış ticaret dengesi.
 *
 * Sıfır doğal eşik: altı net ithalatçı demek. İkinci ölçü olarak YÖN de
 * bakılıyor — fazla veriyorken daralıyorsa bu, tek başına pozitif rakamın
 * gizlediği bir gidişat.
 */
export function ticaretSinyali(
  ihracat: number | null, ithalat: number | null,
  oncekiDenge: number | null, donem: string, yol: string,
): Sinyal | null {
  if (ihracat == null || ithalat == null) return null;
  const denge = ihracat - ithalat;
  const ortak = { id: 'tarim-dis-ticaret', kategori: 'ticaret' as const, donem, yol };
  const bicim = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} milyar $`;
  if (denge < 0) {
    return {
      ...ortak, seviye: 'uyari', baslik: 'Tarımsal dış ticaret açık veriyor',
      olcu: bicim(denge),
      aciklama: `İhracat ${ihracat.toFixed(1)}, ithalat ${ithalat.toFixed(1)} milyar dolar.`,
    };
  }
  const daralma = oncekiDenge != null && denge < oncekiDenge;
  return {
    ...ortak,
    seviye: daralma ? 'izle' : 'iyi',
    baslik: daralma ? 'Tarımsal ticaret fazlası daralıyor' : 'Tarımsal dış ticaret fazla veriyor',
    olcu: bicim(denge),
    aciklama: daralma
      ? `Bir önceki yıl ${bicim(oncekiDenge!)} idi.`
      : `İhracat ${ihracat.toFixed(1)}, ithalat ${ithalat.toFixed(1)} milyar dolar.`,
  };
}

/* ── Kurallar: FİYAT ──────────────────────────────────────────────────────── */

/**
 * Gıda enflasyonu kuralı.
 *
 * Eşik genel TÜFE: gıda ondan hızlı artıyorsa tarım kaynaklı bir fiyat baskısı
 * var demektir. Mutlak bir yüzde eşiği (ör. %30) yıllara göre anlamsızlaşırdı.
 */
export function gidaEnflasyonSinyali(
  gida: number | null, genel: number | null, donem: string, yol: string,
): Sinyal | null {
  if (gida == null || genel == null) return null;
  const fark = gida - genel;
  const ortak = { id: 'gida-enflasyon', kategori: 'fiyat' as const, donem, yol };
  if (fark <= 0) {
    return {
      ...ortak, seviye: 'iyi', baslik: 'Gıda enflasyonu genelin altında',
      olcu: `%${gida.toFixed(1)}`,
      aciklama: `Genel TÜFE %${genel.toFixed(1)}.`,
    };
  }
  return {
    ...ortak,
    seviye: fark > 5 ? 'kritik' : 'uyari',
    baslik: 'Gıda enflasyonu genelin üzerinde',
    olcu: `%${gida.toFixed(1)}`,
    aciklama: `Genel TÜFE %${genel.toFixed(1)} — aradaki fark ${fark.toFixed(1)} puan.`,
  };
}

/**
 * Aktarım zinciri projeksiyonu.
 *
 * Röntgendeki TEK ileriye dönük satır. Ölçülen katsayı ve gecikme
 * `zincir.ts`te; buradaki iş onu sinyale çevirmek. Eşik sıfır doğal:
 * gıda enflasyonuna yukarı mı aşağı mı baskı geliyor.
 */
export function aktarimSinyali(
  etki: number | null, hedefAy: string | null, yol: string,
): Sinyal | null {
  if (etki == null || !hedefAy) return null;
  const ortak = { id: 'aktarim-zinciri', kategori: 'fiyat' as const, donem: hedefAy, yol };
  const bicim = `${etki >= 0 ? '+' : '−'}${Math.abs(etki).toFixed(1)} puan`;
  if (etki <= 0) {
    return {
      ...ortak, seviye: 'iyi', baslik: 'Yem bitkilerinden gelen baskı aşağı yönlü',
      olcu: bicim,
      aciklama: 'Bugünkü yem bitkisi fiyatları gıda enflasyonunu ileride aşağı çekiyor.',
    };
  }
  return {
    ...ortak,
    seviye: etki > 3 ? 'kritik' : etki > 1 ? 'uyari' : 'izle',
    baslik: 'Yem bitkilerinden gıda enflasyonuna baskı geliyor',
    olcu: bicim,
    aciklama: 'Bugünkü yem bitkisi fiyatlarının ileriye taşıdığı ölçülen etki.',
  };
}

/* ── Sıralama ─────────────────────────────────────────────────────────────── */

/** Sinyalleri aciliyete göre sıralar; eşitlikte başlığa göre. */
export const sirala = (s: Sinyal[]): Sinyal[] =>
  [...s].sort((a, b) => SEVIYE_SIRA[a.seviye] - SEVIYE_SIRA[b.seviye]
    || a.baslik.localeCompare(b.baslik, 'tr'));

/** Bir dizinin medyanı. Parite eşiği için — ortalama değil, çünkü şok yılları
 *  ortalamayı kaydırıyor, medyanı kaydırmıyor. */
export function medyan(v: number[]): number | null {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const o = Math.floor(s.length / 2);
  return s.length % 2 ? s[o] : (s[o - 1] + s[o]) / 2;
}

/** Son n değerin ortalaması — oynak serileri yumuşatmak için. */
export function sonOrtalama(v: number[], n: number): number | null {
  const dilim = v.filter(Number.isFinite).slice(-n);
  return dilim.length ? dilim.reduce((a, b) => a + b, 0) / dilim.length : null;
}
