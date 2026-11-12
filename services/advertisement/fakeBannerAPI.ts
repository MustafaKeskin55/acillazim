/**
 * Simüle Edilmiş Reklam Veri API'si
 * -----------------------------------
 *
 * Bu modül, gerçek bir API hazır olana kadar reklam verilerini simüle eder.
 * Dinamik olarak reklam verileri üretir ve gerçek bir API çağrısını taklit eder.
 */

// Rastgele veri oluşturmak için yardımcı fonksiyonlar
const getRandomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Simüle edilmiş şehirler
const CITIES = ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana'];

// Simüle edilmiş kategoriler
const CATEGORIES = [
  { id: 1, name: 'Emlak' },
  { id: 316, name: 'Vasıta' },
  { id: 499, name: 'Elektronik' },
  { id: 500, name: 'Ev Eşyaları' }
];

// Simüle edilmiş sayfa türleri
const PAGE_TYPES = [
  { id: 1, name: 'Kategori Sayfası' },
  { id: 2, name: 'Ana Sayfa' },
  { id: 3, name: 'Detay Sayfası' },
  { id: 4, name: 'Tüm Sayfalar' }
];

// Simüle edilmiş bölüm türleri
const SECTION_TYPES = [
  { id: 1, name: 'Üst Banner' },
  { id: 2, name: 'Sidebar' },
  { id: 3, name: 'İçerik' },
  { id: 4, name: 'Tüm Bölümler' }
];

interface FakeAd {
  id: number;
  title: string;
  description: string;
  mediaType: string;
  src: string;
  link: string;
  pageId: number;
  sectionId: number;
  categoryId: number | null;
  categoryName: string | null;
  listingType: string | null;
  regions: string[];
  requiresLogin: boolean;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface FetchFilters {
  pageId?: number;
  sectionId?: number;
  categoryId?: number | string | null;
  listingType?: string | null;
  region?: string | null;
}

/**
 * Fake reklam verileri oluşturur
 * @param count - Oluşturulacak reklam sayısı
 * @returns Rastgele reklam verileri
 */
const generateFakeAds = (count = 10): FakeAd[] => {
  const ads: FakeAd[] = [];

  for (let i = 1; i <= count; i++) {
    // Rastgele bir kategori seç
    const category =
      Math.random() > 0.3
        ? CATEGORIES[getRandomInt(0, CATEGORIES.length - 1)]
        : { id: null, name: 'Genel' };

    // Rastgele bir sayfa türü seç
    const pageType =
      Math.random() > 0.5
        ? PAGE_TYPES[getRandomInt(0, PAGE_TYPES.length - 1)]
        : PAGE_TYPES[3]; // 4: Tüm sayfalar

    // Rastgele bir bölüm türü seç
    const sectionType =
      Math.random() > 0.5
        ? SECTION_TYPES[getRandomInt(0, SECTION_TYPES.length - 1)]
        : SECTION_TYPES[3]; // 4: Tüm bölümler

    // Geçerli ve gelecek tarihler oluştur
    const now = new Date();
    const startDate = new Date(
      now.getTime() - getRandomInt(0, 30) * 24 * 60 * 60 * 1000
    );
    const endDate = new Date(
      now.getTime() + getRandomInt(30, 365) * 24 * 60 * 60 * 1000
    );

    ads.push({
      id: i,
      title: `Reklam ${i} - ${category.name || 'Genel'} kategorisi için`,
      description: `Bu bir test reklamıdır. Kategori: ${category.name || 'Genel'}, Sayfa: ${pageType.name}, Bölüm: ${sectionType.name}`,
      mediaType: 'image',
      src: `https://via.placeholder.com/600x300?text=Reklam_${i}_${category.name || 'Genel'}`,
      link: category.id ? `/kategori/${category.id}` : '/reklam-ver',
      pageId: pageType.id,
      sectionId: sectionType.id,
      categoryId: category.id,
      categoryName: category.name,
      listingType:
        Math.random() > 0.7
          ? Math.random() > 0.5
            ? 'Satılık'
            : 'Kiralık'
          : null,
      regions:
        Math.random() > 0.5
          ? [CITIES[getRandomInt(0, CITIES.length - 1)]]
          : ['all'],
      requiresLogin: Math.random() > 0.8,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      isActive: true
    });
  }

  return ads;
};

// API için reklam verilerini önceden oluştur (simülasyon için)
let fakeAdvertisements: FakeAd[] = generateFakeAds(50);

// Kategori ID'leri için özel reklamlar oluştur
CATEGORIES.forEach((category) => {
  // Her kategori için bir üst banner reklamı
  fakeAdvertisements.push({
    id: 1000 + (category.id || 0),
    title: `${category.name} Özel Üst Banner Reklamı`,
    description: `Bu reklam özel olarak ${category.name} kategorisi için üst banner'da gösterilir`,
    mediaType: 'image',
    src: `https://via.placeholder.com/728x90?text=${category.name}_Üst_Banner`,
    link: `/kategori/${category.id}`,
    pageId: 1, // 1: kategori sayfası
    sectionId: 1, // 1: üst banner
    categoryId: category.id,
    categoryName: category.name,
    listingType: null,
    regions: ['all'],
    requiresLogin: false,
    startDate: '2023-01-01',
    endDate: '2025-12-31',
    isActive: true
  });

  // Her kategori için bir sidebar reklamı
  fakeAdvertisements.push({
    id: 2000 + (category.id || 0),
    title: `${category.name} Özel Sidebar Reklamı`,
    description: `Bu reklam özel olarak ${category.name} kategorisi için sidebar'da gösterilir`,
    mediaType: 'image',
    src: `https://via.placeholder.com/300x600?text=${category.name}_Sidebar`,
    link: `/kategori/${category.id}`,
    pageId: 1, // 1: kategori sayfası
    sectionId: 2, // 2: sidebar
    categoryId: category.id,
    categoryName: category.name,
    listingType: null,
    regions: ['all'],
    requiresLogin: false,
    startDate: '2023-01-01',
    endDate: '2025-12-31',
    isActive: true
  });

  // Her kategori için bir içerik reklamı
  fakeAdvertisements.push({
    id: 3000 + (category.id || 0),
    title: `${category.name} Özel İçerik Reklamı`,
    description: `Bu reklam özel olarak ${category.name} kategorisi için içerik alanında gösterilir`,
    mediaType: 'image',
    src: `https://via.placeholder.com/600x300?text=${category.name}_İçerik`,
    link: `/kategori/${category.id}`,
    pageId: 1, // 1: kategori sayfası
    sectionId: 3, // 3: içerik
    categoryId: category.id,
    categoryName: category.name,
    listingType: null,
    regions: ['all'],
    requiresLogin: false,
    startDate: '2023-01-01',
    endDate: '2025-12-31',
    isActive: true
  });
});

// Genel reklamlar ekle (tüm sayfa ve bölümler için)
fakeAdvertisements.push({
  id: 9000,
  title: 'Tüm Sayfa ve Bölümlerde Gösterilen Genel Reklam',
  description: 'Bu reklam tüm sayfa ve bölümlerde gösterilebilir',
  mediaType: 'image',
  src: 'https://via.placeholder.com/600x300?text=Genel_Reklam',
  link: '/reklam-ver',
  pageId: 4, // 4: tüm sayfalar
  sectionId: 4, // 4: tüm bölümler
  categoryId: null,
  categoryName: null,
  listingType: null,
  regions: ['all'],
  requiresLogin: false,
  startDate: '2023-01-01',
  endDate: '2025-12-31',
  isActive: true
});

/**
 * Simüle edilmiş API çağrısı ile reklam verilerini döndürür
 * @param filters - Filtreleme kriterleri
 * @param delayMs - Cevap gecikmesi (ms)
 * @returns Filtrelenmiş reklam verileri
 */
export const fetchAdvertisements = async (
  filters: FetchFilters = {},
  delayMs = 300
): Promise<FakeAd[]> => {
  console.log('fakeBannerAPI.fetchAdvertisements çağrıldı:', filters);

  // API çağrısı gecikmesini simüle et
  await sleep(delayMs);

  // Filtreleri kullanarak reklamları filtrele
  let results = [...fakeAdvertisements];

  // Sayfa ID'si filtreleme
  if (filters.pageId && filters.pageId !== 4) {
    results = results.filter(
      (ad) => ad.pageId === filters.pageId || ad.pageId === 4
    );
  }

  // Bölüm ID'si filtreleme
  if (filters.sectionId && filters.sectionId !== 4) {
    results = results.filter(
      (ad) => ad.sectionId === filters.sectionId || ad.sectionId === 4
    );
  }

  // Kategori ID'si filtreleme
  if (filters.categoryId) {
    const catIdNum = parseInt(String(filters.categoryId));
    // Tercihen belirli kategori için reklamları göster, yoksa genel reklamları
    const categorySpecificAds = results.filter((ad) => ad.categoryId === catIdNum);

    if (categorySpecificAds.length > 0) {
      results = categorySpecificAds;
    } else {
      // Kategori reklamı bulunamadıysa, kategorisi null olanları göster (genel reklamlar)
      results = results.filter((ad) => ad.categoryId === null);
    }
  }

  // İlan tipi filtreleme
  if (filters.listingType) {
    const typeSpecificAds = results.filter((ad) => ad.listingType === filters.listingType);
    if (typeSpecificAds.length > 0) {
      results = typeSpecificAds;
    }
  }

  // Bölge filtreleme
  if (filters.region) {
    results = results.filter(
      (ad) => ad.regions.includes(filters.region!) || ad.regions.includes('all')
    );
  }

  // Sonuçta 0-3 arası reklam kalabilir (4 ihtimalinin üzerine çık)
  if (results.length === 0) {
    // Eğer hiç sonuç bulunamazsa, her zaman gösterilen bir reklam ekle
    results.push({
      id: 9999,
      title: 'Varsayılan Reklam',
      description:
        'Filtrelerinize uygun reklam bulunamadı, varsayılan reklam gösteriliyor',
      mediaType: 'image',
      src: 'https://via.placeholder.com/600x300?text=Varsayılan_Reklam',
      link: '/reklam-ver',
      pageId: 4, // 4: tüm sayfalar
      sectionId: 4, // 4: tüm bölümler
      categoryId: null,
      categoryName: null,
      listingType: null,
      regions: ['all'],
      requiresLogin: false,
      startDate: '2023-01-01',
      endDate: '2025-12-31',
      isActive: true
    });
  }

  console.log(`fakeBannerAPI: ${results.length} adet reklam döndürüldü`);

  return results;
};

/**
 * Simüle edilmiş API çağrısı ile belirli bir reklamı döndürür
 * @param id - Reklam ID
 * @param delayMs - Cevap gecikmesi (ms)
 * @returns Reklam verisi veya null
 */
export const fetchAdvertisementById = async (
  id: number | string,
  delayMs = 300
): Promise<FakeAd | null> => {
  console.log('fakeBannerAPI.fetchAdvertisementById çağrıldı:', id);

  // API çağrısı gecikmesini simüle et
  await sleep(delayMs);

  // ID'ye göre reklamı bul
  const advertisement = fakeAdvertisements.find((ad) => ad.id === parseInt(String(id)));

  return advertisement || null;
};

export default {
  fetchAdvertisements,
  fetchAdvertisementById
};
