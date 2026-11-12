import urunData from '@/data/üründat.json';
import categoriesData from '@/data/categories-data.json';

/**
 * Popüler Hizmetler Mock / API katmanı
 *
 * USE_MOCK = true  → üründat.json + categories-data.json client-side filtre
 * USE_MOCK = false → GET /api/v1/listings?is_service=true&...
 *
 * Path alias yok: /api/popular-services kullanılmaz.
 */

/** Host normalize → {host}/api/v1 */
function resolvePopularServicesApiBase(): string {
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

const API_BASE_URL = resolvePopularServicesApiBase();
const USE_MOCK = false; // Canlı BE

interface IlanKonum {
  il?: string;
  ilce?: string;
  [key: string]: unknown;
}

interface IlanItem {
  ilan_id?: number | string;
  baslik?: string;
  category_id?: number | string;
  vitrin_durumu?: string;
  ilan_tarihi?: string;
  fiyat?: number;
  para_birimi?: string;
  konum?: IlanKonum;
  resimler?: string[];
  aciklama?: string;
  [key: string]: unknown;
}

interface IlanData {
  ilanlari?: IlanItem[];
}

interface CategoryObj {
  category_id?: number | string;
  [key: string]: unknown;
}

interface CategoriesData {
  categories?: {
    Hizmetler?: CategoryObj;
    [key: string]: unknown;
  };
}

interface NormalizedService {
  id?: number | string;
  title?: string;
  price?: number;
  currency?: string;
  city?: string;
  district?: string;
  image: string | null;
  date?: string;
  isVitrin: boolean;
  category_id?: number | string;
  location?: IlanKonum;
  description?: string;
  images: string[];
}

interface PopularCategory {
  categoryId: number;
  listingCount: number;
}

interface FetchOptions {
  limit?: number;
  sortBy?: string;
  city?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  _preFiltered?: IlanItem[];
  [key: string]: unknown;
}

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const unwrapListings = (json: unknown): IlanItem[] => {
  if (!json || typeof json !== 'object') return [];
  const body = json as { data?: unknown; listings?: IlanItem[]; success?: boolean };
  const data = body.data && typeof body.data === 'object' ? (body.data as { listings?: IlanItem[] }) : body;
  const list = data.listings || (Array.isArray(body.data) ? (body.data as IlanItem[]) : []);
  return Array.isArray(list) ? list : [];
};

const normalizeListing = (ilan: IlanItem): NormalizedService => ({
  id: ilan.ilan_id ?? (ilan as { id?: number | string }).id,
  title: ilan.baslik ?? (ilan as { title?: string }).title,
  price: ilan.fiyat ?? (ilan as { price?: number }).price,
  currency: ilan.para_birimi || (ilan as { currency?: string }).currency || 'TL',
  city: ilan.konum?.il ?? (ilan as { city?: string }).city,
  district: ilan.konum?.ilce ?? (ilan as { district?: string }).district,
  image: ilan.resimler && ilan.resimler.length > 0 ? ilan.resimler[0] : null,
  date: ilan.ilan_tarihi ?? (ilan as { date?: string }).date,
  isVitrin: ilan.vitrin_durumu === 'vitrin',
  category_id: ilan.category_id,
  location: ilan.konum,
  description: ilan.aciklama ?? (ilan as { description?: string }).description,
  images: ilan.resimler || (ilan as { images?: string[] }).images || [],
});

const buildListingsQuery = (options: FetchOptions & { categoryId?: number | string }): string => {
  const params = new URLSearchParams();
  if (options.categoryId !== undefined && options.categoryId !== null) {
    params.set('category_id', String(options.categoryId));
  } else {
    params.set('is_service', 'true');
  }
  params.set('include_descendants', 'true');
  params.set('page', '1');
  params.set('page_size', String(options.limit ?? 10));
  if (options.sortBy) params.set('sort', options.sortBy === 'popular' ? 'popular' : options.sortBy);
  if (options.city) params.set('il', options.city);
  if (options.minPrice != null) params.set('fiyat_min', String(options.minPrice));
  if (options.maxPrice != null) params.set('fiyat_max', String(options.maxPrice));
  return params.toString();
};

const fetchListingsFromApi = async (options: FetchOptions & { categoryId?: number | string }): Promise<NormalizedService[]> => {
  const qs = buildListingsQuery(options);
  const url = `${API_BASE_URL}/listings?${qs}`;
  console.log(`[PopularServices API] GET ${url}`);
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);
  const listings = unwrapListings(await res.json());
  return listings.map(normalizeListing);
};

/**
 * Hizmet kategorilerinin ID'lerini dinamik olarak çıkarır
 * @private
 */
const getServiceCategoryIds = (): (number | string)[] => {
  try {
    const categoryIds: (number | string)[] = [];

    const hizmetlerCategory = (categoriesData as CategoriesData).categories?.Hizmetler;
    if (!hizmetlerCategory) {
      console.warn('⚠️ Hizmetler kategorisi bulunamadı');
      return [];
    }

    if (hizmetlerCategory.category_id !== undefined) {
      categoryIds.push(hizmetlerCategory.category_id);
    }

    const extractCategoryIds = (categoryObj: Record<string, unknown>): void => {
      Object.keys(categoryObj).forEach((key) => {
        if (key !== 'category_id' && key !== 'parent_id' && key !== 'icon' && key !== 'bgColor') {
          const subCategory = categoryObj[key] as CategoryObj;
          if (subCategory && typeof subCategory === 'object' && subCategory.category_id) {
            categoryIds.push(subCategory.category_id);
            extractCategoryIds(subCategory as Record<string, unknown>);
          }
        }
      });
    };

    extractCategoryIds(hizmetlerCategory as Record<string, unknown>);

    console.log(`🔧 ${categoryIds.length} hizmet kategorisi ID'si bulundu`);
    return categoryIds;
  } catch (error) {
    console.error("❌ Hizmet kategori ID'leri alınırken hata:", error);
    return [];
  }
};

/**
 * Hizmet kategorilerindeki tüm ilanları filtreler
 * @private
 */
const getServiceListings = (): IlanItem[] => {
  try {
    const serviceCategories = getServiceCategoryIds();

    if (serviceCategories.length === 0) {
      console.warn('⚠️ Hizmet kategorileri bulunamadı');
      return [];
    }

    const serviceListings =
      (urunData as IlanData).ilanlari?.filter((ilan) =>
        serviceCategories.includes(ilan.category_id as number | string)
      ) || [];

    console.log(`📋 ${serviceListings.length} hizmet ilanı bulundu`);
    return serviceListings;
  } catch (error) {
    console.error('❌ Hizmet ilanları filtrelenirken hata:', error);
    return [];
  }
};

/**
 * Popüler hizmetleri çeker (API benzeri)
 * API: GET /api/v1/listings?is_service=true&sort=popular&...
 */
export const fetchPopularServices = async (options: FetchOptions = {}): Promise<NormalizedService[]> => {
  if (!USE_MOCK) {
    return fetchListingsFromApi(options);
  }

  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 200));

  try {
    const {
      limit = 10,
      sortBy = 'popular',
      city = null,
      minPrice = null,
      maxPrice = null,
      _preFiltered,
    } = options;

    console.log('🚀 fetchPopularServices API çağrısı (mock):', options);
    console.log(
      `[PopularServices API] Hedef path: ${API_BASE_URL}/listings?${buildListingsQuery(options)}`
    );

    let serviceListings: IlanItem[] = _preFiltered || getServiceListings();

    if (serviceListings.length === 0) {
      console.warn('⚠️ Hizmet ilanı bulunamadı');
      return [];
    }

    if (city) {
      serviceListings = serviceListings.filter((ilan) =>
        ilan.konum?.il?.toLowerCase().includes(city.toLowerCase())
      );
    }

    if (minPrice !== null) {
      serviceListings = serviceListings.filter((ilan) => (ilan.fiyat ?? 0) >= minPrice);
    }
    if (maxPrice !== null) {
      serviceListings = serviceListings.filter((ilan) => (ilan.fiyat ?? 0) <= maxPrice);
    }

    switch (sortBy) {
      case 'date':
        serviceListings.sort(
          (a, b) =>
            new Date(b.ilan_tarihi || '').getTime() - new Date(a.ilan_tarihi || '').getTime()
        );
        break;
      case 'price':
        serviceListings.sort((a, b) => (a.fiyat ?? 0) - (b.fiyat ?? 0));
        break;
      case 'popular':
      default:
        serviceListings.sort((a, b) => {
          const aScore =
            (a.vitrin_durumu === 'vitrin' ? 100 : 0) +
            new Date(a.ilan_tarihi || '').getTime() / 1000000;
          const bScore =
            (b.vitrin_durumu === 'vitrin' ? 100 : 0) +
            new Date(b.ilan_tarihi || '').getTime() / 1000000;
          return bScore - aScore;
        });
        break;
    }

    const result = serviceListings.slice(0, limit);
    const normalizedResult = result.map(normalizeListing);

    console.log(`✅ ${normalizedResult.length} popüler hizmet döndürüldü`);
    return normalizedResult;
  } catch (error) {
    console.error('❌ Popüler hizmetler API hatası:', error);
    throw new Error('Popüler hizmetler yüklenirken bir hata oluştu');
  }
};

/**
 * Kategoriye göre popüler hizmetleri çeker
 * API: GET /api/v1/listings?category_id={id}&include_descendants=true&...
 */
export const fetchPopularServicesByCategory = async (
  categoryId: number | string,
  options: FetchOptions = {}
): Promise<NormalizedService[]> => {
  if (!USE_MOCK) {
    return fetchListingsFromApi({ ...options, categoryId });
  }

  await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 100));

  try {
    console.log(`🎯 fetchPopularServicesByCategory API çağrısı: categoryId=${categoryId}`);
    console.log(
      `[PopularServices API] Hedef path: ${API_BASE_URL}/listings?category_id=${categoryId}&include_descendants=true`
    );

    const serviceListings = getServiceListings();
    const categoryListings = serviceListings.filter((ilan) => ilan.category_id === categoryId);

    if (categoryListings.length === 0) {
      console.warn(`⚠️ Kategori ${categoryId} için hizmet bulunamadı`);
      return [];
    }

    return await fetchPopularServices({
      ...options,
      _preFiltered: categoryListings,
    });
  } catch (error) {
    console.error('❌ Kategoriye göre popüler hizmetler API hatası:', error);
    throw new Error('Kategoriye göre popüler hizmetler yüklenirken bir hata oluştu');
  }
};

/**
 * En popüler hizmet kategorilerini çeker
 * API: GET /api/v1/categories/popular-services?limit=...
 */
export const fetchPopularServiceCategories = async (limit = 8): Promise<PopularCategory[]> => {
  if (!USE_MOCK) {
    const url = `${API_BASE_URL}/categories/popular-services?limit=${limit}`;
    console.log(`[PopularServices API] GET ${url}`);
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    const json = await res.json();
    const data =
      json && typeof json === 'object' && 'data' in json
        ? (json as { data: PopularCategory[] }).data
        : json;
    return Array.isArray(data) ? data : [];
  }

  await new Promise((resolve) => setTimeout(resolve, 150));

  try {
    console.log('📊 fetchPopularServiceCategories API çağrısı (mock)');
    console.log(`[PopularServices API] Hedef path: ${API_BASE_URL}/categories/popular-services?limit=${limit}`);

    const serviceListings = getServiceListings();

    const categoryStats: Record<string, number> = {};
    serviceListings.forEach((ilan) => {
      const catId = String(ilan.category_id);
      categoryStats[catId] = (categoryStats[catId] || 0) + 1;
    });

    const sortedCategories: PopularCategory[] = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([categoryId, count]) => ({
        categoryId: parseInt(categoryId),
        listingCount: count,
      }));

    console.log(`✅ ${sortedCategories.length} popüler kategori döndürüldü`);
    return sortedCategories;
  } catch (error) {
    console.error('❌ Popüler kategoriler API hatası:', error);
    throw new Error('Popüler kategoriler yüklenirken bir hata oluştu');
  }
};
