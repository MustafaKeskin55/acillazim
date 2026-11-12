// Fake API'yi import et
import * as fakeBannerAPI from '@/services/advertisement/fakeBannerAPI';
import {
  getFilteredAds,
  filterByCategoryId,
  filterByRegion,
  filterByLoginStatus
} from '@/services/advertisement/adFilterEngine';

/** Context filtre API — yalnızca /api/v1/advertisements/context (alias yok) */
const resolveAdsContextBase = (): string =>
  (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const ADVERTISEMENTS_CONTEXT_PATH = `${resolveAdsContextBase()}/api/v1/advertisements/context`;
const USE_MOCK = false; // Canlı BE

/**
 * Reklam Servisi
 * Bu servis, uygulama genelinde reklam verilerinin yönetimini sağlar.
 */

interface FetchAdvertisementsParams {
  pageId?: number;
  sectionId?: number;
  categoryId?: number | null;
  listingType?: string | null;
  region?: string | null;
}

interface GetAdvertisementsOptions {
  pageId?: number;
  sectionId?: number;
  categoryId?: number | null;
  listingType?: string | null;
  region?: string | null;
  isUserLoggedIn?: boolean;
  limit?: number;
}

interface GetCategoryAdOptions {
  sectionId?: number;
  listingType?: string | null;
  region?: string | null;
  isUserLoggedIn?: boolean;
  limit?: number;
}

interface GetListingDetailAdOptions {
  categoryId?: number | null;
  listingType?: string | null;
  region?: string | null;
  sectionId?: number;
  limit?: number;
}

/**
 * API'den reklam verilerini çeker
 * @param params - API parametreleri (pageId, sectionId, categoryId vb.)
 * @returns Reklam verileri
 */
const fetchAdvertisements = async (params: FetchAdvertisementsParams = {}): Promise<unknown[]> => {
  console.log('fetchAdvertisements başladı. Parametreler:', params);

  try {
    console.log(`fetchAdvertisements (v1): ${ADVERTISEMENTS_CONTEXT_PATH}`, params);

    if (!USE_MOCK) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== '') qs.set(k, String(v));
      });
      const url = qs.toString()
        ? `${ADVERTISEMENTS_CONTEXT_PATH}?${qs}`
        : ADVERTISEMENTS_CONTEXT_PATH;
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Reklam API hatası: ${response.status}`);
      const json = await response.json();
      const data = json?.data ?? json;
      return Array.isArray(data)
        ? data
        : data?.advertisements || data?.ads || [];
    }

    const ads = await fakeBannerAPI.fetchAdvertisements(params);
    console.log(
      `Mock'tan ${(ads as unknown[]).length} reklam:`,
      (ads as Array<{ id: unknown; title: unknown }>).map((ad) => ({ id: ad.id, title: ad.title }))
    );
    return ads as unknown[];
  } catch (error) {
    console.error('Reklam verisi alınırken hata:', error);
    throw error;
  }
};

/**
 * Reklam verilerini çeker ve filtreler
 * @param options - Filtreleme seçenekleri
 * @returns Filtrelenmiş reklam dizisi
 */
const getAdvertisements = async ({
  pageId = 1, // 1: kategori, 2: anasayfa, 3: detay, 4: tüm sayfalar
  sectionId = 1, // 1: üst banner, 2: sidebar, 3: içerik, 4: tüm bölümler
  categoryId = null,
  listingType = null,
  region = null,
  isUserLoggedIn = false,
  limit = 1
}: GetAdvertisementsOptions = {}): Promise<unknown[]> => {
  try {
    console.log('getAdvertisements çağrıldı');

    // API'den reklamları çek
    const params: FetchAdvertisementsParams = {
      pageId,
      sectionId,
      categoryId,
      listingType,
      region
    };

    const advertisements = await fetchAdvertisements(params);

    // Reklamları filtrele (güvenlik, aktiflik, tarih vb. kontrolleri)
    const filteredAds = getFilteredAds(advertisements as Parameters<typeof getFilteredAds>[0], {
      pageId,
      sectionId,
      categoryId,
      listingType,
      region,
      isUserLoggedIn,
      limit
    });

    return filteredAds;
  } catch (error) {
    console.error('Reklamlar getirme hatası:', error);
    return [];
  }
};

/**
 * Kategori sayfası için reklamları getirir
 * @param categoryId - Kategori ID
 * @param options - Filtreleme seçenekleri
 * @returns Filtrelenmiş reklam dizisi
 */
const getCategoryAdvertisements = async (
  categoryId: number,
  {
    sectionId = 1, // 1: üst banner, 2: sidebar, 3: içerik, 4: tüm bölümler
    listingType = null,
    region = null,
    isUserLoggedIn = false,
    limit = 1
  }: GetCategoryAdOptions = {}
): Promise<unknown[]> => {
  try {
    console.log(
      `getCategoryAdvertisements çağrıldı. categoryId:${categoryId}, sectionId:${sectionId}`
    );

    // API'den reklamları çek
    const params: FetchAdvertisementsParams = {
      pageId: 1, // 1: kategori sayfası
      sectionId,
      categoryId,
      listingType,
      region
    };

    const advertisements = await fetchAdvertisements(params);

    // Reklamları filtrele
    const categoryAds = getFilteredAds(advertisements as Parameters<typeof getFilteredAds>[0], {
      pageId: 1, // 1: kategori sayfası
      sectionId,
      categoryId,
      listingType,
      region,
      isUserLoggedIn,
      limit
    });

    console.log(`Kategori ID ${categoryId} için ${categoryAds.length} reklam bulundu.`);

    return categoryAds;
  } catch (error) {
    console.error('Kategori reklamları getirme hatası:', error);
    return [];
  }
};

/**
 * İlan detay sayfası için reklamları getirir
 * @param options - Filtreleme seçenekleri
 * @param isUserLoggedIn - Kullanıcı giriş yapmış mı
 * @returns Filtrelenmiş reklam dizisi
 */
const getListingDetailAdvertisements = async (
  {
    categoryId = null,
    listingType = null,
    region = null,
    sectionId = 3, // 3: ilgili reklamlar
    limit = 3
  }: GetListingDetailAdOptions = {},
  isUserLoggedIn = false
): Promise<unknown[]> => {
  try {
    console.log('getListingDetailAdvertisements çağrıldı');

    // API'den reklamları çek
    const params: FetchAdvertisementsParams = {
      pageId: 3, // 3: detay sayfası
      sectionId,
      categoryId,
      listingType,
      region
    };

    const advertisements = await fetchAdvertisements(params);

    // Reklamları filtrele
    const detailAds = getFilteredAds(advertisements as Parameters<typeof getFilteredAds>[0], {
      pageId: 3, // 3: detay sayfası
      sectionId,
      categoryId,
      listingType,
      region,
      isUserLoggedIn,
      limit
    });

    return detailAds;
  } catch (error) {
    console.error('İlan detay reklamları getirme hatası:', error);
    return [];
  }
};

export {
  getAdvertisements,
  getCategoryAdvertisements,
  getListingDetailAdvertisements,
  fetchAdvertisements
};
