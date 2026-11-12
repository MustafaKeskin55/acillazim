/**
 * Kategori Sayfası Reklam Servisi
 * --------------------------------
 * Bu servis, kategori sayfasındaki reklam alanlarına uygun reklamları
 * section_code (KB1, KS1) değerlerine göre filtreleyerek döndürür.
 *
 * NOT: Bu servis simüle edilmiş bir API servisidir. Gerçek API entegrasyonu
 * yapılırken sadece bu servisin içindeki fonksiyonlar değiştirilecektir.
 * Diğer bileşenler aynı kalacaktır.
 */

// Reklam verilerini içeren JSON dosyası (yalnızca mock modda kullanılır)
import advertisementBanners from '@/data/advertisementBanners.json';

const USE_MOCK = false; // Canlı BE

/** Host normalize → {host} (path zaten /api/v1/... ile başlıyor) */
function resolveAdsHost(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ''
  ).replace(/\/$/, '');
  return raw
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/v1\/?$/, '');
}
const ADS_HOST = resolveAdsHost();

/** Kategori sayfası reklamları — yalnızca /api/v1/... (alias yok) */
const CATEGORY_ADS_ALL_SECTIONS_PATH = (categoryId: number | string) =>
  `/api/v1/advertisements/category/${categoryId}/all-sections`;

interface AdvertisementBanner {
  categoryId?: number | null;
  section_code?: string;
  page?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
}

interface AllCategoryAdsData {
  KB1: AdvertisementBanner | null;
  KS1: AdvertisementBanner | null;
}

/**
 * API çağrısı simülasyonu için gecikme fonksiyonu
 * @param ms - Gecikme süresi (milisaniye)
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reklam verilerini kategoriye ve section_code'a göre filtreler
 * @param categoryId - Kategori ID
 * @param sectionCode - Bölüm kodu (KB1, KS1)
 * @returns Eşleşen reklam veya null
 */
/** Kategori sayfasının tüm bölüm reklamlarını gerçek BE'den tek istekle getirir */
const fetchAllSectionsFromApi = async (
  categoryId: number | string
): Promise<ApiResponse<AllCategoryAdsData>> => {
  const url = `${ADS_HOST}${CATEGORY_ADS_ALL_SECTIONS_PATH(categoryId)}`;
  console.log(`[CategoryAds API] GET ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Reklamlar alınamadı (HTTP ${response.status})`);
  const json = await response.json();
  const data = (json && typeof json === 'object' && 'data' in json ? json.data : json) as AllCategoryAdsData;
  return { success: true, data, message: 'Kategori reklamları yüklendi.' };
};

const getAdvertisementBySection = async (
  categoryId: number | string,
  sectionCode: string
): Promise<ApiResponse<AdvertisementBanner>> => {
  const normalizedCategoryId = typeof categoryId === 'string' ? Number(categoryId) : categoryId;

  if (!USE_MOCK) {
    try {
      const all = await fetchAllSectionsFromApi(normalizedCategoryId);
      const data = all.data
        ? ((all.data as unknown as Record<string, AdvertisementBanner | null>)[sectionCode] ?? null)
        : null;
      return { success: true, data, message: data ? 'Reklam bulundu.' : 'Reklam bulunamadı.' };
    } catch (error) {
      console.error('[CategoryAdService] Reklam alınamadı:', error);
      return { success: false, data: null, message: (error as Error).message };
    }
  }

  console.log(
    `[API SİMÜLASYONU] Reklam aranıyor: Kategori ID ${normalizedCategoryId}, Bölüm Kodu: ${sectionCode}`
  );

  try {
    // API çağrısı simülasyonu için gecikme
    await delay(300);

    const banners = advertisementBanners as AdvertisementBanner[];

    // Önce kategoriye özel reklam ara
    let matchedAds = banners.filter((ad) => {
      return (
        ad.categoryId === categoryId &&
        (ad.section_code === sectionCode ||
          // Eski section code'ları da destekleyelim
          (sectionCode === 'KB1' && ad.section_code === 'B1') ||
          (sectionCode === 'KS1' && ad.section_code === 'S1')) &&
        ad.page === 'category' &&
        ad.isActive === true
      );
    });

    // Eğer kategoriye özel reklam bulunamazsa, kategorisi null olan reklamları ara
    if (!matchedAds.length) {
      matchedAds = banners.filter((ad) => {
        return (
          ad.categoryId === null &&
          (ad.section_code === sectionCode ||
            // Eski section code'ları da destekleyelim
            (sectionCode === 'KB1' && ad.section_code === 'B1') ||
            (sectionCode === 'KS1' && ad.section_code === 'S1')) &&
          ad.page === 'category' &&
          ad.isActive === true
        );
      });
    }

    // Eğer hala reklam bulunamazsa, tüm sayfalar için geçerli reklam ara
    if (!matchedAds.length) {
      matchedAds = banners.filter((ad) => {
        return (
          (ad.section_code === sectionCode ||
            // Eski section code'ları da destekleyelim
            (sectionCode === 'KB1' && ad.section_code === 'B1') ||
            (sectionCode === 'KS1' && ad.section_code === 'S1')) &&
          ad.page === 'all' &&
          ad.isActive === true
        );
      });
    }

    console.log(`[API SİMÜLASYONU] ${matchedAds.length} adet uygun reklam bulundu.`);

    // İyi bir API gibi davranmak için sonuçları JSON şeklinde döndür
    return {
      success: true,
      data: matchedAds.length > 0 ? matchedAds[0] : null,
      message: matchedAds.length > 0 ? 'Reklam bulundu.' : 'Reklam bulunamadı.'
    };
  } catch (error: unknown) {
    console.error('[API SİMÜLASYONU] Reklam filtreleme hatası:', error);
    return {
      success: false,
      data: null,
      message: 'API hatası: ' + (error as Error).message
    };
  }
};

/**
 * Kategori sayfası için banner (KB1) reklamını döndürür
 * @param categoryId - Kategori ID
 * @returns Banner reklamı veya null
 */
const getCategoryBanner = async (
  categoryId: number
): Promise<ApiResponse<AdvertisementBanner>> => {
  const response = await getAdvertisementBySection(categoryId, 'KB1');
  return response;
};

/**
 * Kategori sayfası için sidebar (KS1) reklamını döndürür
 * @param categoryId - Kategori ID
 * @returns Sidebar reklamı veya null
 */
const getCategorySidebar = async (
  categoryId: number
): Promise<ApiResponse<AdvertisementBanner>> => {
  const response = await getAdvertisementBySection(categoryId, 'KS1');
  return response;
};

/**
 * Tüm reklamları bölüm koduna göre kontrol eder ve ilgili reklamları döndürür
 * @param categoryId - Kategori ID
 * @returns Tüm bölüm reklamları
 */
const getAllCategoryAds = async (
  categoryId: number
): Promise<ApiResponse<AllCategoryAdsData>> => {
  if (!USE_MOCK) {
    try {
      return await fetchAllSectionsFromApi(categoryId);
    } catch (error) {
      console.error('[CategoryAdService] Kategori reklamları alınamadı:', error);
      return { success: false, data: null, message: (error as Error).message };
    }
  }

  // ---- MOCK MOD ----
  const [bannerResponse, sidebarResponse] = await Promise.all([
    getCategoryBanner(categoryId),
    getCategorySidebar(categoryId)
  ]);

  return {
    success: bannerResponse.success && sidebarResponse.success,
    data: {
      KB1: bannerResponse.data,
      KS1: sidebarResponse.data
    },
    message: 'Kategori reklamları yüklendi.'
  };
};

export default {
  getCategoryBanner,
  getCategorySidebar,
  getAllCategoryAds
};
