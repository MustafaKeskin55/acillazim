/**
 * Reklam Servisi (kök — legacy)
 *
 * Path alias yok: /api/ads, /api/advertisements (v1’siz) kullanılmaz
 *   → GET /api/v1/advertisements/context
 *
 * Tercih edilen kaynak: services/advertisement/adService.ts (useAdBanner)
 * Bu dosya aynı sözleşmeyi paylaşır; birleştirilmeli.
 */

import * as fakeBannerAPI from '@/services/advertisement/fakeBannerAPI';
import { getFilteredAds } from '@/services/advertisement/adFilterEngine';

/** Host normalize → {host}/api/v1 */
function resolveAdsApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api/v1';
  const host = raw
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/v1\/?$/, '');
  return `${host}/api/v1`;
}

const API_BASE_URL = resolveAdsApiBase();
const ADVERTISEMENTS_CONTEXT_PATH = `${API_BASE_URL}/advertisements/context`;
const USE_MOCK = false; // Canlı BE

interface AdParams {
  pageId?: number;
  sectionId?: number;
  categoryId?: number | string | null;
  listingType?: string | null;
  region?: string | null;
}

interface AdFilterOptions {
  pageId?: number;
  sectionId?: number;
  categoryId?: number | string | null;
  listingType?: string | null;
  region?: string | null;
  isUserLoggedIn?: boolean;
  limit?: number;
}

/**
 * API'den reklam verilerini çeker
 * Hedef: GET /api/v1/advertisements/context
 */
const fetchAdvertisements = async (params: AdParams = {}): Promise<unknown[]> => {
  console.log(`[Ads API] Hedef path: GET ${ADVERTISEMENTS_CONTEXT_PATH}`, params);

  try {
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
      (ads as Array<{ id: unknown; title: unknown }>).map((ad) => ({
        id: ad.id,
        title: ad.title,
      }))
    );
    return ads as unknown[];
  } catch (error) {
    console.error('Reklam verisi alınırken hata:', error);
    throw error;
  }
};

/**
 * Reklam verilerini çeker ve filtreler
 */
const getAdvertisements = async ({
  pageId = 1, // 1: kategori, 2: anasayfa, 3: detay, 4: tüm sayfalar
  sectionId = 1, // 1: üst banner, 2: sidebar, 3: içerik, 4: tüm bölümler
  categoryId = null,
  listingType = null,
  region = null,
  isUserLoggedIn = false,
  limit = 1,
}: AdFilterOptions = {}): Promise<unknown[]> => {
  try {
    const params: AdParams = {
      pageId,
      sectionId,
      categoryId,
      listingType,
      region,
    };

    const advertisements = await fetchAdvertisements(params);

    return (getFilteredAds as (ads: unknown[], opts: AdFilterOptions) => unknown[])(
      advertisements,
      {
        pageId,
        sectionId,
        categoryId,
        listingType,
        region,
        isUserLoggedIn,
        limit,
      }
    );
  } catch (error) {
    console.error('Reklamlar getirme hatası:', error);
    return [];
  }
};

/**
 * Kategori sayfası — pageId: 1
 */
const getCategoryAdvertisements = async (
  categoryId: number | string,
  {
    sectionId = 1,
    listingType = null,
    region = null,
    isUserLoggedIn = false,
    limit = 1,
  }: Omit<AdFilterOptions, 'pageId' | 'categoryId'> = {}
): Promise<unknown[]> => {
  try {
    return getAdvertisements({
      pageId: 1,
      sectionId,
      categoryId,
      listingType,
      region,
      isUserLoggedIn,
      limit,
    });
  } catch (error) {
    console.error('Kategori reklamları getirme hatası:', error);
    return [];
  }
};

/**
 * İlan detay — pageId: 3
 */
const getListingDetailAdvertisements = async (
  {
    categoryId = null,
    listingType = null,
    region = null,
    sectionId = 3,
    limit = 3,
  }: Omit<AdFilterOptions, 'pageId' | 'isUserLoggedIn'> = {},
  isUserLoggedIn = false
): Promise<unknown[]> => {
  try {
    return getAdvertisements({
      pageId: 3,
      sectionId,
      categoryId,
      listingType,
      region,
      isUserLoggedIn,
      limit,
    });
  } catch (error) {
    console.error('İlan detay reklamları getirme hatası:', error);
    return [];
  }
};

export {
  getAdvertisements,
  getCategoryAdvertisements,
  getListingDetailAdvertisements,
  fetchAdvertisements,
};
