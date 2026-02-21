// Bitkisel Üretim Kategorileri
export const PLANT_CATEGORIES = {
  TAHILLAR: {
    name: 'Tahıllar',
    color: '#f59e0b',
    products: [
      'Buğday', 'Arpa', 'Mısır (Dane)', 'Çavdar', 'Yulaf', 'Tritikale',
      'Mısır', 'Pirinç (Çeltik)'
    ]
  },
  SEBZELER: {
    name: 'Sebzeler',
    color: '#10b981',
    products: [
      'Domates', 'Biber', 'Patlıcan', 'Hıyar', 'Kabak', 'Soğan (Kuru)',
      'Lahana', 'Karnabahar', 'Marul', 'Ispanak', 'Fasulye (Taze)',
      'Bamya', 'Havuç', 'Kereviz', 'Turp', 'Sarımsak', 'Pırasa'
    ]
  },
  MEYVELER: {
    name: 'Meyveler',
    color: '#ef4444',
    products: [
      'Elma', 'Portakal', 'Limon', 'Mandalina', 'Üzüm', 'Armut', 'Şeftali',
      'Kayısı', 'Kiraz', 'Vişne', 'Erik', 'Çilek', 'Karpuz', 'Kavun',
      'Nar', 'Ayva', 'Muz', 'Hurma', 'İncir', 'Badem', 'Ceviz', 'Fındık',
      'Antep Fıstığı', 'Zeytin'
    ]
  },
  ENDUSTRI: {
    name: 'Endüstri Bitkileri',
    color: '#8b5cf6',
    products: [
      'Pamuk (Kütlü)', 'Şeker Pancarı', 'Ayçiçeği', 'Tütün', 'Haşhaş (Kapsül)',
      'Soya Fasulyesi', 'Kolza', 'Aspir', 'Susam', 'Keten Tohumu', 'Kanola'
    ]
  },
  YEM: {
    name: 'Yem Bitkileri',
    color: '#06b6d4',
    products: [
      'Yonca', 'Korunga', 'Fiğ', 'Silajlık Mısır', 'Çayır Otu', 'Yem Bezelyesi'
    ]
  },
  DIGER: {
    name: 'Diğer',
    color: '#64748b',
    products: []
  }
} as const;

// Hayvancılık Kategorileri
export const LIVESTOCK_CATEGORIES = {
  BUYUKBAS: {
    name: 'Büyükbaş',
    color: '#d97706',
    animals: ['Sığır', 'Manda', 'Sığır ve Manda']
  },
  KUCUKBAS: {
    name: 'Küçükbaş',
    color: '#0891b2',
    animals: ['Koyun', 'Keçi', 'Koyun ve Keçi']
  },
  KANATLI: {
    name: 'Kanatlı',
    color: '#dc2626',
    animals: ['Tavuk', 'Horoz', 'Hindi', 'Ördek', 'Kaz']
  },
  ARICILIK: {
    name: 'Arıcılık',
    color: '#facc15',
    animals: ['Kovan Sayısı']
  }
} as const;

// 7 Coğrafi Bölge ve İller
export const TURKEY_REGIONS = {
  MARMARA: {
    name: 'Marmara',
    provinces: [
      'İstanbul', 'Tekirdağ', 'Edirne', 'Kırklareli', 'Balıkesir',
      'Çanakkale', 'Bursa', 'Yalova', 'Kocaeli', 'Sakarya', 'Bilecik'
    ]
  },
  EGE: {
    name: 'Ege',
    provinces: [
      'İzmir', 'Aydın', 'Denizli', 'Muğla', 'Manisa', 'Afyonkarahisar',
      'Kütahya', 'Uşak'
    ]
  },
  AKDENIZ: {
    name: 'Akdeniz',
    provinces: [
      'Antalya', 'Adana', 'Mersin', 'Hatay', 'Kahramanmaraş',
      'Osmaniye', 'Isparta', 'Burdur'
    ]
  },
  IC_ANADOLU: {
    name: 'İç Anadolu',
    provinces: [
      'Ankara', 'Konya', 'Eskişehir', 'Aksaray', 'Niğde', 'Nevşehir',
      'Kırıkkale', 'Kırşehir', 'Kayseri', 'Sivas', 'Yozgat', 'Karaman', 'Çankırı'
    ]
  },
  KARADENIZ: {
    name: 'Karadeniz',
    provinces: [
      'Zonguldak', 'Karabük', 'Bartın', 'Kastamonu', 'Çorum', 'Sinop',
      'Samsun', 'Tokat', 'Amasya', 'Ordu', 'Giresun', 'Trabzon', 'Rize',
      'Artvin', 'Gümüşhane', 'Bayburt', 'Düzce', 'Bolu'
    ]
  },
  DOGU_ANADOLU: {
    name: 'Doğu Anadolu',
    provinces: [
      'Erzurum', 'Erzincan', 'Kars', 'Ağrı', 'Iğdır', 'Ardahan',
      'Malatya', 'Elazığ', 'Bingöl', 'Tunceli', 'Van', 'Muş', 'Bitlis', 'Hakkari'
    ]
  },
  GUNEYDOGU_ANADOLU: {
    name: 'Güneydoğu Anadolu',
    provinces: [
      'Gaziantep', 'Adıyaman', 'Kilis', 'Şanlıurfa', 'Diyarbakır',
      'Mardin', 'Batman', 'Şırnak', 'Siirt'
    ]
  }
} as const;

// İlden bölgeye mapping
export function getRegionByProvince(province: string): string {
  const normalizeTr = (input: string): string => {
    return String(input ?? '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ı/g, 'i')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  let provinceKey = normalizeTr(province);
  if (!provinceKey) return 'Diğer';

  // Common aliases/abbreviations observed in datasets/GeoJSON
  const ALIASES: Record<string, string> = {
    // Kahramanmaraş
    'k maras': 'kahramanmaras',
    'kmaras': 'kahramanmaras',
    'maras': 'kahramanmaras',
    'kahraman maras': 'kahramanmaras',

    // Afyonkarahisar
    'afyon': 'afyonkarahisar',
    'afyon karahisar': 'afyonkarahisar',

    // Kırıkkale common typos
    'kinkkale': 'kirikkale',
  };

  provinceKey = ALIASES[provinceKey] ?? provinceKey;

  for (const [, region] of Object.entries(TURKEY_REGIONS)) {
    if (region.provinces.some(p => normalizeTr(p) === provinceKey)) {
      return region.name;
    }
  }
  return 'Diğer';
}

// Üründen kategoriye mapping
export function getCategoryByProduct(product: string): { key: string; name: string; color: string } {
  const normalized = product.toLowerCase().trim();
  
  for (const [key, category] of Object.entries(PLANT_CATEGORIES)) {
    const products = (category as { products: readonly string[] }).products;
    if (products.some(p => p.toLowerCase() === normalized || normalized.includes(p.toLowerCase()))) {
      return { key, name: category.name, color: category.color };
    }
  }
  
  return { key: 'DIGER', name: 'Diğer', color: PLANT_CATEGORIES.DIGER.color };
}

// Hayvandan kategoriye mapping
export function getCategoryByAnimal(animal: string): { key: string; name: string; color: string } {
  const normalized = animal.toLowerCase().trim();
  
  for (const [key, category] of Object.entries(LIVESTOCK_CATEGORIES)) {
    if (category.animals.some(a => a.toLowerCase() === normalized || normalized.includes(a.toLowerCase()))) {
      return { key, name: category.name, color: category.color };
    }
  }
  
  return { key: 'DIGER', name: 'Diğer', color: '#64748b' };
}
