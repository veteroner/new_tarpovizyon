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
 * ─── EŞİKLER NEREDEN ────────────────────────────────────────────────────────
 * Eşikler keyfi değil, ölçünün kendi anlamından:
 *   kârlılık  < 0   → üretici zarar ediyor (sıfır doğal eşik)
 *   yeterlilik< 1   → iç üretim tüketimi karşılamıyor (bire tam denk gelir)
 *   üretim    < -5% → tek yıllık dalgalanmanın ötesi
 * "Kritik" ile "uyarı" arasındaki ikinci eşik büyüklük içindir, yön değil.
 */

/** Sinyalin aciliyeti. Renk TEK BAŞINA anlam taşımaz; her satırda etiket var. */
export type Seviye = 'kritik' | 'uyari' | 'izle' | 'iyi';

export type Sinyal = {
  id: string;
  seviye: Seviye;
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
};

export const SEVIYE_SIRA: Record<Seviye, number> = {
  kritik: 0, uyari: 1, izle: 2, iyi: 3,
};

export const SEVIYE_ETIKET: Record<Seviye, string> = {
  kritik: 'Kritik', uyari: 'Uyarı', izle: 'İzle', iyi: 'İyi',
};

/* ── Kurallar ────────────────────────────────────────────────────────────── */

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
  if (karlilik >= 10) {
    return {
      id: `karlilik-${ad}`, seviye: 'iyi', baslik: `${ad} üretimi kârda`,
      olcu: `%${karlilik.toFixed(1)}`, donem, yol,
      aciklama: 'Üretici fiyatı maliyetin üzerinde.',
    };
  }
  if (karlilik >= 0) {
    return {
      id: `karlilik-${ad}`, seviye: 'izle', baslik: `${ad} kâr marjı ince`,
      olcu: `%${karlilik.toFixed(1)}`, donem, yol,
      aciklama: 'Maliyetteki küçük bir artış üretimi zarara çevirebilir.',
    };
  }
  return {
    id: `karlilik-${ad}`,
    seviye: karlilik < -10 ? 'kritik' : 'uyari',
    baslik: `${ad} üretimi zararda`,
    olcu: `%${karlilik.toFixed(1)}`, donem, yol,
    aciklama: 'Üretici maliyetin altında satıyor; sürdürülemezse arz daralır.',
  };
}

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
      id: `yeterlilik-${ad}`, seviye: 'iyi', baslik: `${ad}: iç üretim yeterli`,
      olcu: `%${yuzde.toFixed(0)}`, yol,
      aciklama: 'Üretim tüketimi karşılıyor.',
    };
  }
  return {
    id: `yeterlilik-${ad}`,
    seviye: oran < 0.9 ? 'kritik' : 'uyari',
    baslik: `${ad}: arz açığı`,
    olcu: `%${yuzde.toFixed(0)}`, yol,
    /* Ek almayan kuruluş: "%6'i" yanlış, "%6'sı" doğru ama son rakama göre
       değişiyor. Cümleyi ek gerektirmeyecek şekilde kurmak daha sağlam. */
    aciklama: `Aradaki %${(100 - yuzde).toFixed(0)} fark ithalatla kapanıyor.`,
  };
}

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
    seviye: degisim < -10 ? 'kritik' : 'uyari',
    baslik: `${ad} üretimi düştü`,
    olcu: `%${degisim.toFixed(1)}`, donem, yol,
    aciklama: 'Bir önceki yıla göre gerileme.',
  };
}

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
  if (fark <= 0) {
    return {
      id: 'gida-enflasyon', seviye: 'iyi', baslik: 'Gıda enflasyonu genelin altında',
      olcu: `%${gida.toFixed(1)}`, donem, yol,
      aciklama: `Genel TÜFE %${genel.toFixed(1)}.`,
    };
  }
  return {
    id: 'gida-enflasyon',
    seviye: fark > 5 ? 'kritik' : 'uyari',
    baslik: 'Gıda enflasyonu genelin üzerinde',
    olcu: `%${gida.toFixed(1)}`, donem, yol,
    aciklama: `Genel TÜFE %${genel.toFixed(1)} — aradaki fark ${fark.toFixed(1)} puan.`,
  };
}

/** Sinyalleri aciliyete göre sıralar; eşitlikte başlığa göre. */
export const sirala = (s: Sinyal[]): Sinyal[] =>
  [...s].sort((a, b) => SEVIYE_SIRA[a.seviye] - SEVIYE_SIRA[b.seviye]
    || a.baslik.localeCompare(b.baslik, 'tr'));
