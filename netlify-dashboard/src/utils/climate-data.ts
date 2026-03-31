/**
 * climate-data.ts — Ortak İklim & Bölge Veritabanı
 *
 * Tüm modüller (Takvim, Sulama, Gübre, Hasat) tarafından paylaşılır.
 * Kaynak: Kamuya açık uzun yıl iklim istatistikleri baz alınarak derlenmiş tahmini değerler.
 * Referans: FAO-56 Penman-Monteith yöntemi. Resmi MGM verisi değildir.
 */

// ─── İklim Bölgeleri ──────────────────────────────────────────────────────────

export type IklimBolge =
  | 'akdeniz'
  | 'ege'
  | 'marmara'
  | 'ic_anadolu'
  | 'karadeniz'
  | 'dogu_anadolu'
  | 'guneydogu';

export const BOLGE_META: Record<IklimBolge, { ad: string; emoji: string; takvimOffset: number; aciklama: string }> = {
  akdeniz:       { ad: 'Akdeniz',          emoji: '🌞', takvimOffset: 0,  aciklama: 'Sıcak kışlar, erken ilkbahar' },
  ege:           { ad: 'Ege',              emoji: '🌤️', takvimOffset: 1,  aciklama: 'Ilık iklim, şubat sonu bahar' },
  marmara:       { ad: 'Marmara',          emoji: '🌥️', takvimOffset: 2,  aciklama: 'Ilık-soğuk geçiş, mart başı bahar' },
  ic_anadolu:    { ad: 'İç Anadolu',       emoji: '🌾', takvimOffset: 3,  aciklama: 'Karasal, geç ilkbahar, don riski' },
  karadeniz:     { ad: 'Karadeniz',        emoji: '🌧️', takvimOffset: 2,  aciklama: 'Nemli, bol yağış, ılık kıyı' },
  dogu_anadolu:  { ad: 'Doğu Anadolu',     emoji: '❄️', takvimOffset: 5,  aciklama: 'Sert kışlar, hazirana kadar don' },
  guneydogu:     { ad: 'Güneydoğu Anadolu', emoji: '☀️', takvimOffset: -1, aciklama: 'Çok sıcak yazlar, kurak' },
};

// ─── 81 İl → Bölge Eşlemesi ──────────────────────────────────────────────────

export const IL_IKLIM_BOLGE: Record<string, IklimBolge> = {
  'Adana': 'akdeniz',
  'Adıyaman': 'guneydogu',
  'Afyon': 'ic_anadolu',
  'Afyonkarahisar': 'ic_anadolu',
  'Ağrı': 'dogu_anadolu',
  'Aksaray': 'ic_anadolu',
  'Amasya': 'karadeniz',
  'Ankara': 'ic_anadolu',
  'Antalya': 'akdeniz',
  'Ardahan': 'dogu_anadolu',
  'Artvin': 'karadeniz',
  'Aydın': 'ege',
  'Balıkesir': 'marmara',
  'Bartın': 'karadeniz',
  'Batman': 'guneydogu',
  'Bayburt': 'dogu_anadolu',
  'Bilecik': 'marmara',
  'Bingöl': 'dogu_anadolu',
  'Bitlis': 'dogu_anadolu',
  'Bolu': 'karadeniz',
  'Burdur': 'akdeniz',
  'Bursa': 'marmara',
  'Çanakkale': 'marmara',
  'Çankırı': 'ic_anadolu',
  'Çorum': 'ic_anadolu',
  'Denizli': 'ege',
  'Diyarbakır': 'guneydogu',
  'Düzce': 'karadeniz',
  'Edirne': 'marmara',
  'Elazığ': 'dogu_anadolu',
  'Erzincan': 'dogu_anadolu',
  'Erzurum': 'dogu_anadolu',
  'Eskişehir': 'ic_anadolu',
  'Gaziantep': 'guneydogu',
  'Giresun': 'karadeniz',
  'Gümüşhane': 'karadeniz',
  'Hakkari': 'dogu_anadolu',
  'Hatay': 'akdeniz',
  'Iğdır': 'dogu_anadolu',
  'Isparta': 'akdeniz',
  'İstanbul': 'marmara',
  'İzmir': 'ege',
  'Kahramanmaraş': 'akdeniz',
  'Karabük': 'karadeniz',
  'Karaman': 'ic_anadolu',
  'Kars': 'dogu_anadolu',
  'Kastamonu': 'karadeniz',
  'Kayseri': 'ic_anadolu',
  'Kilis': 'guneydogu',
  'Kırıkkale': 'ic_anadolu',
  'Kırklareli': 'marmara',
  'Kırşehir': 'ic_anadolu',
  'Kocaeli': 'marmara',
  'Konya': 'ic_anadolu',
  'Kütahya': 'ic_anadolu',
  'Malatya': 'dogu_anadolu',
  'Manisa': 'ege',
  'Mardin': 'guneydogu',
  'Mersin': 'akdeniz',
  'Muğla': 'ege',
  'Muş': 'dogu_anadolu',
  'Nevşehir': 'ic_anadolu',
  'Niğde': 'ic_anadolu',
  'Ordu': 'karadeniz',
  'Osmaniye': 'akdeniz',
  'Rize': 'karadeniz',
  'Sakarya': 'marmara',
  'Samsun': 'karadeniz',
  'Şanlıurfa': 'guneydogu',
  'Siirt': 'guneydogu',
  'Sinop': 'karadeniz',
  'Sivas': 'ic_anadolu',
  'Şırnak': 'guneydogu',
  'Tekirdağ': 'marmara',
  'Tokat': 'karadeniz',
  'Trabzon': 'karadeniz',
  'Tunceli': 'dogu_anadolu',
  'Uşak': 'ege',
  'Van': 'dogu_anadolu',
  'Yalova': 'marmara',
  'Yozgat': 'ic_anadolu',
  'Zonguldak': 'karadeniz',
};

// ─── İl Listesi (sıralı) ─────────────────────────────────────────────────────

export const ILLER = Object.keys(IL_IKLIM_BOLGE).sort((a, b) => a.localeCompare(b, 'tr'));

// ─── Aylık Referans Evapotranspiration (ETo) — mm/gün ────────────────────────
// Kaynak: Kamuya açık iklim istatistiklerinden türetilmiş tahmini ETo değerleri (Hargreaves yaklaşımı).
// Resmi MGM verisi değildir; planlama amaçlı yaklaşık değerlerdir.
// [Oca, Şub, Mar, Nis, May, Haz, Tem, Ağu, Eyl, Eki, Kas, Ara]

export const IL_AYLIK_ETO: Record<string, number[]> = {
  'Adana':          [2.0, 2.5, 3.5, 4.8, 6.2, 7.5, 8.0, 7.3, 5.8, 4.0, 2.8, 2.0],
  'Adıyaman':       [1.5, 2.2, 3.5, 5.0, 6.8, 8.5, 9.2, 8.5, 6.5, 4.2, 2.5, 1.5],
  'Afyon':           [1.2, 1.6, 2.8, 4.0, 5.5, 6.8, 7.5, 7.0, 5.2, 3.2, 1.8, 1.2],
  'Ağrı':            [0.6, 0.8, 1.8, 3.2, 5.0, 6.8, 7.8, 7.5, 5.5, 3.0, 1.2, 0.6],
  'Aksaray':         [1.2, 1.6, 2.8, 4.2, 5.8, 7.2, 8.0, 7.5, 5.5, 3.5, 2.0, 1.2],
  'Amasya':          [1.0, 1.5, 2.5, 3.8, 5.2, 6.5, 7.2, 6.8, 5.0, 3.2, 1.8, 1.0],
  'Ankara':          [1.0, 1.5, 2.8, 4.0, 5.5, 7.0, 7.8, 7.2, 5.2, 3.2, 1.8, 1.0],
  'Antalya':         [2.2, 2.8, 3.8, 5.0, 6.5, 7.8, 8.3, 7.5, 6.0, 4.2, 3.0, 2.2],
  'Ardahan':         [0.5, 0.6, 1.5, 3.0, 4.8, 6.2, 7.0, 6.8, 5.0, 2.8, 1.0, 0.5],
  'Artvin':          [1.0, 1.2, 2.2, 3.5, 5.0, 6.0, 6.5, 6.2, 4.8, 3.0, 1.5, 1.0],
  'Aydın':           [1.8, 2.2, 3.2, 4.5, 6.0, 7.5, 8.2, 7.5, 5.8, 3.8, 2.5, 1.8],
  'Balıkesir':       [1.2, 1.8, 2.8, 4.0, 5.5, 6.8, 7.5, 7.0, 5.2, 3.5, 2.0, 1.2],
  'Bartın':          [1.0, 1.2, 2.0, 3.2, 4.5, 5.5, 6.0, 5.8, 4.5, 3.0, 1.5, 1.0],
  'Batman':          [1.5, 2.0, 3.2, 4.8, 6.5, 8.5, 9.5, 9.0, 6.8, 4.2, 2.2, 1.5],
  'Bayburt':         [0.6, 0.8, 1.8, 3.0, 4.8, 6.2, 7.0, 6.8, 5.0, 2.8, 1.2, 0.6],
  'Bilecik':         [1.0, 1.5, 2.5, 3.8, 5.0, 6.2, 7.0, 6.5, 5.0, 3.2, 1.8, 1.0],
  'Bingöl':          [0.8, 1.2, 2.2, 3.5, 5.2, 7.0, 8.0, 7.5, 5.5, 3.2, 1.5, 0.8],
  'Bitlis':           [0.8, 1.0, 2.0, 3.5, 5.2, 7.0, 8.0, 7.5, 5.5, 3.0, 1.5, 0.8],
  'Bolu':            [0.8, 1.2, 2.2, 3.5, 4.8, 6.0, 6.5, 6.2, 4.8, 3.0, 1.5, 0.8],
  'Burdur':          [1.5, 2.0, 3.0, 4.2, 5.8, 7.2, 8.0, 7.2, 5.5, 3.5, 2.2, 1.5],
  'Bursa':           [1.2, 1.5, 2.5, 3.8, 5.2, 6.5, 7.2, 6.8, 5.0, 3.2, 2.0, 1.2],
  'Çanakkale':       [1.2, 1.5, 2.8, 4.0, 5.5, 7.0, 7.8, 7.2, 5.5, 3.5, 2.0, 1.2],
  'Çankırı':         [0.8, 1.2, 2.5, 3.8, 5.2, 6.5, 7.5, 7.0, 5.0, 3.0, 1.5, 0.8],
  'Çorum':           [0.8, 1.2, 2.5, 3.8, 5.0, 6.2, 7.0, 6.5, 5.0, 3.0, 1.5, 0.8],
  'Denizli':         [1.5, 2.0, 3.0, 4.5, 6.0, 7.5, 8.2, 7.5, 5.8, 3.8, 2.2, 1.5],
  'Diyarbakır':      [1.2, 1.8, 3.2, 4.8, 6.5, 8.5, 9.5, 9.0, 6.8, 4.2, 2.2, 1.2],
  'Düzce':           [0.8, 1.2, 2.2, 3.5, 4.8, 5.8, 6.5, 6.2, 4.8, 3.0, 1.5, 0.8],
  'Edirne':          [1.0, 1.5, 2.5, 4.0, 5.5, 7.0, 7.5, 7.0, 5.2, 3.2, 1.8, 1.0],
  'Elazığ':          [1.0, 1.5, 2.8, 4.2, 5.8, 7.5, 8.5, 8.0, 6.0, 3.8, 2.0, 1.0],
  'Erzincan':        [0.8, 1.0, 2.2, 3.5, 5.2, 6.8, 7.5, 7.2, 5.5, 3.2, 1.5, 0.8],
  'Erzurum':         [0.5, 0.8, 2.0, 3.5, 5.0, 6.5, 7.2, 6.8, 5.0, 3.0, 1.2, 0.5],
  'Eskişehir':       [1.0, 1.2, 2.5, 3.8, 5.2, 6.5, 7.5, 7.0, 5.0, 3.2, 1.8, 1.0],
  'Gaziantep':       [1.5, 2.0, 3.2, 4.8, 6.5, 8.2, 9.0, 8.5, 6.5, 4.2, 2.5, 1.5],
  'Giresun':         [1.0, 1.2, 2.0, 3.2, 4.5, 5.5, 6.0, 5.8, 4.5, 3.0, 1.5, 1.0],
  'Gümüşhane':       [0.6, 0.8, 2.0, 3.2, 4.8, 6.2, 7.0, 6.8, 5.0, 3.0, 1.2, 0.6],
  'Hakkari':         [0.8, 1.0, 2.0, 3.5, 5.2, 7.0, 8.2, 7.8, 5.8, 3.2, 1.5, 0.8],
  'Hatay':           [2.0, 2.5, 3.5, 4.8, 6.2, 7.5, 8.0, 7.5, 6.0, 4.2, 2.8, 2.0],
  'Iğdır':           [0.8, 1.2, 2.5, 4.0, 5.8, 7.5, 8.5, 8.0, 6.0, 3.5, 1.8, 0.8],
  'Isparta':         [1.2, 1.8, 2.8, 4.0, 5.5, 7.0, 7.8, 7.2, 5.5, 3.5, 2.0, 1.2],
  'İstanbul':        [1.0, 1.5, 2.5, 3.8, 5.0, 6.2, 7.0, 6.5, 5.0, 3.2, 1.8, 1.0],
  'İzmir':           [1.8, 2.2, 3.2, 4.8, 6.2, 7.8, 8.5, 7.8, 6.0, 4.0, 2.5, 1.8],
  'Kahramanmaraş':   [1.5, 2.0, 3.2, 4.5, 6.0, 7.5, 8.2, 7.5, 6.0, 4.0, 2.5, 1.5],
  'Karabük':         [0.8, 1.2, 2.2, 3.5, 4.8, 5.8, 6.5, 6.2, 4.8, 3.0, 1.5, 0.8],
  'Karaman':         [1.2, 1.5, 2.8, 4.2, 5.8, 7.2, 8.0, 7.5, 5.5, 3.5, 2.0, 1.2],
  'Kars':            [0.5, 0.6, 1.5, 3.0, 4.8, 6.2, 7.0, 6.8, 5.0, 2.8, 1.0, 0.5],
  'Kastamonu':       [0.8, 1.0, 2.0, 3.2, 4.8, 5.8, 6.5, 6.2, 4.8, 3.0, 1.5, 0.8],
  'Kayseri':         [1.0, 1.2, 2.5, 3.8, 5.5, 7.0, 7.8, 7.2, 5.5, 3.2, 1.8, 1.0],
  'Kilis':           [1.5, 2.0, 3.2, 4.8, 6.5, 8.2, 9.0, 8.5, 6.5, 4.2, 2.5, 1.5],
  'Kırıkkale':       [1.0, 1.2, 2.5, 3.8, 5.2, 6.8, 7.5, 7.0, 5.2, 3.2, 1.8, 1.0],
  'Kırklareli':      [1.0, 1.5, 2.5, 3.8, 5.2, 6.8, 7.5, 7.0, 5.2, 3.2, 1.8, 1.0],
  'Kırşehir':        [1.0, 1.2, 2.5, 3.8, 5.5, 7.0, 7.8, 7.2, 5.2, 3.2, 1.8, 1.0],
  'Kocaeli':         [1.0, 1.5, 2.5, 3.5, 5.0, 6.0, 6.8, 6.5, 5.0, 3.2, 1.8, 1.0],
  'Konya':           [1.0, 1.5, 2.8, 4.2, 5.8, 7.2, 8.0, 7.5, 5.5, 3.5, 2.0, 1.0],
  'Kütahya':         [1.0, 1.2, 2.5, 3.8, 5.2, 6.5, 7.2, 6.8, 5.0, 3.2, 1.8, 1.0],
  'Malatya':         [1.0, 1.5, 2.8, 4.2, 5.8, 7.5, 8.5, 8.0, 6.0, 3.8, 2.0, 1.0],
  'Manisa':          [1.5, 2.0, 3.0, 4.5, 6.0, 7.5, 8.2, 7.5, 5.8, 3.8, 2.2, 1.5],
  'Mardin':          [1.5, 2.0, 3.2, 4.8, 6.5, 8.5, 9.5, 9.0, 6.8, 4.2, 2.5, 1.5],
  'Mersin':          [2.0, 2.5, 3.5, 4.8, 6.2, 7.5, 8.0, 7.5, 6.0, 4.2, 2.8, 2.0],
  'Muğla':           [1.8, 2.2, 3.2, 4.5, 6.0, 7.5, 8.2, 7.5, 5.8, 4.0, 2.5, 1.8],
  'Muş':             [0.8, 1.0, 2.0, 3.5, 5.2, 7.0, 8.0, 7.5, 5.5, 3.0, 1.5, 0.8],
  'Nevşehir':        [1.0, 1.2, 2.5, 4.0, 5.5, 7.0, 7.8, 7.2, 5.5, 3.2, 1.8, 1.0],
  'Niğde':           [1.0, 1.2, 2.5, 3.8, 5.5, 7.0, 7.8, 7.2, 5.5, 3.2, 1.8, 1.0],
  'Ordu':            [1.0, 1.2, 2.0, 3.2, 4.5, 5.5, 6.0, 5.8, 4.5, 3.0, 1.5, 1.0],
  'Osmaniye':        [1.8, 2.2, 3.2, 4.5, 6.0, 7.5, 8.0, 7.5, 6.0, 4.0, 2.5, 1.8],
  'Rize':            [1.0, 1.2, 2.0, 3.0, 4.2, 5.2, 5.8, 5.5, 4.2, 3.0, 1.5, 1.0],
  'Sakarya':         [1.0, 1.2, 2.2, 3.5, 4.8, 6.0, 6.5, 6.2, 4.8, 3.0, 1.8, 1.0],
  'Samsun':          [1.0, 1.2, 2.2, 3.5, 4.5, 5.5, 6.0, 5.8, 4.5, 3.2, 1.8, 1.0],
  'Şanlıurfa':       [1.5, 2.2, 3.5, 5.0, 7.0, 9.0, 9.8, 9.2, 7.0, 4.5, 2.5, 1.5],
  'Siirt':           [1.2, 1.8, 3.0, 4.5, 6.2, 8.2, 9.2, 8.8, 6.5, 4.0, 2.2, 1.2],
  'Sinop':           [1.0, 1.2, 2.0, 3.2, 4.5, 5.5, 6.0, 5.8, 4.5, 3.0, 1.5, 1.0],
  'Sivas':           [0.8, 1.0, 2.2, 3.5, 5.0, 6.5, 7.5, 7.0, 5.2, 3.0, 1.5, 0.8],
  'Şırnak':          [1.2, 1.8, 3.0, 4.5, 6.2, 8.2, 9.2, 8.8, 6.5, 4.0, 2.2, 1.2],
  'Tekirdağ':        [1.0, 1.5, 2.5, 3.8, 5.2, 6.5, 7.2, 6.8, 5.0, 3.2, 1.8, 1.0],
  'Tokat':           [0.8, 1.2, 2.2, 3.5, 5.0, 6.2, 7.0, 6.5, 5.0, 3.0, 1.5, 0.8],
  'Trabzon':         [1.0, 1.2, 2.0, 3.0, 4.2, 5.2, 5.8, 5.5, 4.2, 3.0, 1.5, 1.0],
  'Tunceli':         [0.8, 1.2, 2.5, 3.8, 5.5, 7.2, 8.0, 7.5, 5.8, 3.5, 1.8, 0.8],
  'Uşak':            [1.2, 1.5, 2.8, 4.0, 5.5, 7.0, 7.8, 7.2, 5.5, 3.5, 2.0, 1.2],
  'Van':             [0.8, 1.0, 2.0, 3.5, 5.2, 7.0, 8.0, 7.5, 5.8, 3.2, 1.5, 0.8],
  'Yalova':          [1.0, 1.2, 2.2, 3.5, 5.0, 6.2, 7.0, 6.5, 5.0, 3.2, 1.8, 1.0],
  'Yozgat':          [0.8, 1.0, 2.2, 3.5, 5.0, 6.5, 7.5, 7.0, 5.2, 3.0, 1.5, 0.8],
  'Zonguldak':       [1.0, 1.2, 2.0, 3.2, 4.5, 5.5, 6.0, 5.8, 4.5, 3.0, 1.5, 1.0],
};

// ─── Aylık Ortalama Yağış (mm/ay) ────────────────────────────────────────────
// [Oca, Şub, Mar, Nis, May, Haz, Tem, Ağu, Eyl, Eki, Kas, Ara]

export const IL_AYLIK_YAGIS: Record<string, number[]> = {
  'Adana':          [111, 87, 67, 51, 48, 20, 6, 5, 17, 42, 72, 119],
  'Adıyaman':       [120, 100, 88, 68, 38, 8, 1, 1, 6, 38, 72, 112],
  'Afyon':           [38, 36, 42, 48, 52, 32, 18, 12, 18, 32, 36, 42],
  'Ağrı':            [22, 28, 42, 58, 72, 42, 18, 12, 18, 42, 38, 25],
  'Aksaray':         [32, 28, 35, 40, 42, 22, 8, 5, 10, 25, 28, 35],
  'Amasya':          [42, 38, 45, 52, 55, 42, 18, 12, 22, 38, 42, 48],
  'Ankara':          [38, 32, 35, 42, 48, 32, 12, 8, 15, 28, 32, 42],
  'Antalya':         [237, 150, 95, 51, 31, 10, 3, 2, 13, 64, 131, 262],
  'Ardahan':         [25, 28, 38, 55, 72, 52, 28, 18, 25, 42, 35, 28],
  'Artvin':          [85, 62, 55, 58, 62, 48, 32, 22, 42, 72, 82, 88],
  'Aydın':           [105, 82, 62, 42, 32, 10, 5, 2, 12, 38, 72, 115],
  'Balıkesir':       [72, 58, 52, 48, 42, 28, 12, 8, 22, 42, 55, 72],
  'Bartın':          [98, 68, 58, 52, 48, 42, 32, 28, 52, 82, 88, 102],
  'Batman':          [95, 85, 82, 58, 32, 5, 1, 1, 5, 32, 62, 92],
  'Bayburt':         [22, 25, 35, 52, 65, 42, 18, 12, 18, 35, 28, 25],
  'Bilecik':         [52, 42, 42, 48, 52, 35, 18, 14, 25, 42, 48, 58],
  'Bingöl':          [72, 68, 82, 88, 65, 15, 5, 3, 10, 52, 72, 75],
  'Bitlis':           [82, 75, 85, 88, 58, 15, 5, 3, 12, 58, 72, 82],
  'Bolu':            [55, 42, 45, 52, 55, 42, 22, 18, 32, 52, 52, 58],
  'Burdur':          [62, 52, 45, 38, 38, 18, 8, 5, 12, 32, 42, 65],
  'Bursa':           [82, 65, 58, 55, 52, 32, 18, 12, 28, 52, 62, 85],
  'Çanakkale':       [82, 58, 48, 42, 32, 18, 8, 5, 18, 42, 62, 85],
  'Çankırı':         [35, 28, 32, 42, 52, 38, 15, 10, 18, 32, 32, 38],
  'Çorum':           [38, 32, 35, 45, 52, 38, 12, 8, 15, 32, 35, 42],
  'Denizli':         [88, 68, 52, 42, 32, 12, 5, 3, 12, 35, 58, 95],
  'Diyarbakır':      [72, 68, 72, 65, 42, 8, 1, 1, 5, 32, 55, 72],
  'Düzce':           [72, 52, 52, 55, 52, 42, 28, 22, 42, 65, 68, 78],
  'Edirne':          [52, 42, 42, 42, 45, 38, 22, 15, 28, 48, 52, 55],
  'Elazığ':          [62, 58, 65, 68, 48, 10, 3, 2, 8, 42, 58, 65],
  'Erzincan':        [28, 28, 38, 52, 58, 32, 12, 8, 15, 35, 32, 28],
  'Erzurum':         [22, 26, 38, 56, 72, 47, 24, 16, 22, 43, 33, 24],
  'Eskişehir':       [35, 28, 32, 42, 42, 28, 12, 8, 15, 28, 32, 38],
  'Gaziantep':       [82, 72, 65, 55, 38, 8, 2, 1, 8, 32, 55, 85],
  'Giresun':         [112, 78, 62, 55, 52, 48, 35, 28, 52, 88, 102, 118],
  'Gümüşhane':       [28, 28, 35, 48, 58, 38, 15, 12, 18, 35, 32, 28],
  'Hakkari':         [82, 78, 88, 92, 55, 12, 5, 3, 10, 58, 78, 85],
  'Hatay':           [142, 112, 82, 52, 42, 12, 5, 3, 15, 48, 82, 142],
  'Iğdır':           [15, 18, 28, 38, 48, 28, 12, 8, 12, 28, 22, 15],
  'Isparta':         [62, 52, 52, 48, 48, 25, 12, 8, 15, 35, 42, 62],
  'İstanbul':        [95, 72, 62, 48, 38, 28, 18, 18, 38, 68, 82, 98],
  'İzmir':           [112, 82, 62, 38, 25, 8, 3, 2, 12, 38, 72, 118],
  'Kahramanmaraş':   [118, 95, 72, 55, 42, 12, 5, 3, 12, 42, 68, 115],
  'Karabük':         [48, 38, 42, 48, 52, 38, 22, 15, 28, 48, 48, 52],
  'Karaman':         [32, 28, 32, 38, 42, 22, 8, 5, 10, 28, 28, 35],
  'Kars':            [22, 25, 35, 52, 72, 55, 28, 18, 22, 42, 32, 25],
  'Kastamonu':       [42, 35, 38, 48, 55, 42, 22, 18, 28, 42, 42, 48],
  'Kayseri':         [35, 28, 35, 45, 48, 28, 8, 5, 12, 28, 32, 38],
  'Kilis':           [82, 72, 62, 48, 32, 5, 2, 1, 5, 28, 52, 82],
  'Kırıkkale':       [35, 28, 32, 42, 48, 32, 10, 8, 15, 28, 32, 38],
  'Kırklareli':      [52, 42, 42, 42, 48, 38, 22, 15, 28, 48, 52, 55],
  'Kırşehir':        [35, 28, 32, 42, 48, 28, 8, 5, 12, 28, 32, 38],
  'Kocaeli':         [85, 68, 58, 52, 42, 32, 22, 22, 38, 62, 72, 88],
  'Konya':           [32, 25, 28, 35, 42, 22, 8, 5, 10, 25, 28, 35],
  'Kütahya':         [45, 38, 42, 48, 48, 32, 15, 10, 18, 35, 38, 48],
  'Malatya':         [52, 48, 52, 55, 42, 10, 3, 2, 8, 35, 48, 55],
  'Manisa':          [95, 72, 55, 38, 28, 10, 5, 2, 12, 35, 62, 98],
  'Mardin':          [88, 82, 78, 62, 35, 5, 1, 1, 5, 35, 62, 88],
  'Mersin':          [142, 98, 62, 38, 28, 8, 3, 2, 12, 42, 78, 145],
  'Muğla':           [188, 128, 82, 42, 32, 10, 5, 3, 15, 52, 98, 198],
  'Muş':             [62, 58, 68, 78, 58, 15, 5, 3, 10, 48, 58, 62],
  'Nevşehir':        [35, 28, 32, 42, 48, 28, 8, 5, 12, 28, 32, 38],
  'Niğde':           [35, 28, 32, 40, 45, 25, 8, 5, 10, 28, 30, 35],
  'Ordu':            [72, 52, 48, 52, 48, 42, 32, 25, 45, 72, 78, 78],
  'Osmaniye':        [118, 92, 68, 48, 38, 12, 5, 3, 12, 42, 68, 118],
  'Rize':            [218, 142, 102, 72, 62, 55, 42, 38, 82, 152, 178, 228],
  'Sakarya':         [78, 58, 52, 52, 48, 38, 25, 22, 38, 62, 68, 82],
  'Samsun':          [62, 48, 48, 52, 42, 38, 28, 22, 38, 62, 68, 68],
  'Şanlıurfa':       [88, 72, 62, 42, 22, 3, 1, 1, 3, 28, 52, 82],
  'Siirt':           [82, 78, 82, 72, 38, 5, 1, 1, 5, 38, 62, 82],
  'Sinop':           [62, 48, 48, 45, 42, 38, 28, 22, 42, 68, 72, 68],
  'Sivas':           [35, 32, 38, 48, 55, 32, 8, 5, 12, 32, 35, 38],
  'Şırnak':          [95, 88, 88, 78, 42, 8, 2, 2, 8, 42, 72, 95],
  'Tekirdağ':        [62, 48, 45, 42, 42, 35, 18, 12, 25, 45, 55, 62],
  'Tokat':           [35, 32, 38, 48, 52, 38, 12, 8, 15, 32, 35, 38],
  'Trabzon':         [62, 48, 48, 52, 52, 45, 32, 28, 55, 92, 82, 68],
  'Tunceli':         [62, 58, 68, 72, 52, 12, 3, 2, 8, 42, 58, 65],
  'Uşak':            [52, 42, 42, 42, 42, 22, 10, 5, 15, 32, 42, 55],
  'Van':             [32, 32, 42, 58, 42, 12, 5, 3, 10, 42, 42, 35],
  'Yalova':          [88, 68, 58, 52, 42, 28, 18, 18, 38, 62, 72, 92],
  'Yozgat':          [38, 32, 38, 48, 55, 32, 8, 5, 12, 32, 35, 42],
  'Zonguldak':       [108, 78, 62, 52, 48, 42, 32, 28, 52, 82, 92, 112],
};

// ─── Bölgesel Ortalama Toprak Profilleri ──────────────────────────────────────

export interface BolgeToprakProfil {
  n: number;
  p2o5: number;
  k2o: number;
  ph: number;
  organik_madde: number;
  aciklama: string;
}

export const BOLGE_TOPRAK_PROFILLERI: Record<string, BolgeToprakProfil> = {
  'Trakya':            { n: 5, p2o5: 3, k2o: 12, ph: 6.5, organik_madde: 2.0, aciklama: 'Ağır killi topraklar, asit eğilimli' },
  'Çukurova':          { n: 8, p2o5: 5, k2o: 15, ph: 7.5, organik_madde: 1.8, aciklama: 'Alüvyal verimli topraklar' },
  'İç Anadolu':        { n: 4, p2o5: 3, k2o: 8,  ph: 7.8, organik_madde: 1.2, aciklama: 'Kireçli step toprakları, düşük organik madde' },
  'Ege':               { n: 6, p2o5: 4, k2o: 10, ph: 7.0, organik_madde: 2.2, aciklama: 'Verimli ova toprakları' },
  'Karadeniz':         { n: 7, p2o5: 4, k2o: 9,  ph: 5.5, organik_madde: 3.5, aciklama: 'Asit orman toprakları, yüksek organik madde' },
  'Güneydoğu Anadolu': { n: 5, p2o5: 6, k2o: 14, ph: 7.8, organik_madde: 1.5, aciklama: 'Bazalt kökenli killi topraklar' },
  'Doğu Anadolu':      { n: 3, p2o5: 2, k2o: 7,  ph: 7.2, organik_madde: 1.0, aciklama: 'Erozyona uğramış, düşük besin' },
  'Akdeniz':           { n: 5, p2o5: 4, k2o: 11, ph: 7.5, organik_madde: 1.8, aciklama: 'Terra rossa, kireçli topraklar' },
  'Marmara':           { n: 6, p2o5: 4, k2o: 11, ph: 6.8, organik_madde: 2.3, aciklama: 'Geçiş tipli topraklar' },
};

/** Bazı iller için bölge genel profilinden farklı toprak tipine sahipken
 *  BOLGE_META.ad eşleşmesi olmayan 'Trakya' ve 'Çukurova' profillerini
 *  il bazında erişilebilir kılmak için override haritası. */
const IL_TOPRAK_OVERRIDE: Record<string, string> = {
  'Edirne':    'Trakya',
  'Tekirdağ':  'Trakya',
  'Kırklareli':'Trakya',
  'Adana':     'Çukurova',
  'Mersin':    'Çukurova',
  'Hatay':     'Çukurova',
  'Osmaniye':  'Çukurova',
};

/** İl adından toprak profilini döndürür.
 *  Önce il-bazlı override kontrol eder, yoksa bölge profilini kullanır. */
export function getToprakProfil(il: string): BolgeToprakProfil | null {
  const normalized = IL_NORMALIZE_MAP[il] ?? il;
  const overrideKey = IL_TOPRAK_OVERRIDE[normalized];
  if (overrideKey) return BOLGE_TOPRAK_PROFILLERI[overrideKey] ?? null;
  const bolge = getBolge(il);
  const bolgeAd = BOLGE_META[bolge].ad;
  return BOLGE_TOPRAK_PROFILLERI[bolgeAd] ?? null;
}

/** getToprakProfil ile birlikte buton etiketi için profil adını döndürür. */
export function getToprakProfilAd(il: string): string {
  const normalized = IL_NORMALIZE_MAP[il] ?? il;
  const overrideKey = IL_TOPRAK_OVERRIDE[normalized];
  if (overrideKey) return overrideKey;
  return BOLGE_META[getBolge(il)].ad;
}

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

/** İl adı normalize haritası (DB uppercase → climate-data key) */
const IL_NORMALIZE_MAP: Record<string, string> = {};
for (const il of Object.keys(IL_IKLIM_BOLGE)) {
  IL_NORMALIZE_MAP[il.toLocaleLowerCase('tr-TR')] = il;
  IL_NORMALIZE_MAP[il.toLocaleUpperCase('tr-TR')] = il;
  IL_NORMALIZE_MAP[il] = il;
}

/** DB'den gelen il adını climate-data anahtarına çevir */
export function normalizeIl(il: string): string {
  return IL_NORMALIZE_MAP[il] ?? IL_NORMALIZE_MAP[il.toLocaleLowerCase('tr-TR')] ?? il;
}

/** İl adından iklim bölgesini bul (bulunamazsa 'ic_anadolu' default) */
export function getBolge(il: string): IklimBolge {
  const key = normalizeIl(il);
  return IL_IKLIM_BOLGE[key] ?? 'ic_anadolu';
}

/** Belirli il ve ay için ETo (mm/gün). Ay 1-indexed (1=Ocak). */
export function getETo(il: string, ay: number): number {
  const key = normalizeIl(il);
  const table = IL_AYLIK_ETO[key];
  if (!table) return 5.0; // fallback
  return table[Math.max(0, Math.min(11, ay - 1))];
}

/** Belirli il ve ay için yağış (mm/ay). Ay 1-indexed. */
export function getYagis(il: string, ay: number): number {
  const key = normalizeIl(il);
  const table = IL_AYLIK_YAGIS[key];
  if (!table) return 30; // fallback
  return table[Math.max(0, Math.min(11, ay - 1))];
}

/** Efektif yağış hesabı — FAO yöntemi (mm/ay). */
export function calcEffectiveRainfall(monthlyRainfall: number): number {
  if (monthlyRainfall <= 0) return 0;
  if (monthlyRainfall <= 250) return Math.max(0, 0.6 * monthlyRainfall - 10);
  return Math.max(0, 0.8 * monthlyRainfall - 25);
}

/** Takvim offset: Bölge offset'ini ay ve haftaya uygula. */
export function applyBolgeOffset(
  baseAy: number,
  baseHafta: number,
  offsetHafta: number,
): { ay: number; hafta: number } {
  let totalHafta = (baseAy - 1) * 4 + baseHafta + offsetHafta;
  // Wrap around year boundaries
  while (totalHafta < 1) totalHafta += 48;
  while (totalHafta > 48) totalHafta -= 48;
  const ay = Math.ceil(totalHafta / 4);
  const hafta = ((totalHafta - 1) % 4) + 1;
  return { ay, hafta };
}
