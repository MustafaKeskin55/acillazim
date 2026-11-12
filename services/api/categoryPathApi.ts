/**
 * categoryPathApi.ts
 *
 * İlan ID'sine göre kategori yolunu (breadcrumb) getiren API servisi.
 * Canlı BE kullanır — mock JSON (üründat.json / categories-data.json) yoktur:
 *   1) GET /api/v1/listings/{listingId}          → ilan başlığı + categoryId
 *   2) GET /api/v1/categories/{categoryId}/path  → kategori breadcrumb (id, label, slug)
 */

// Önbellek mekanizması - performans için
const cacheMap = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 dakika (ms)

/** Host normalize → {host} (path zaten /api/v1/... ile başlıyor) */
function resolveApiHost(): string {
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
const API_HOST = resolveApiHost();
const API_V1_BASE = `${API_HOST}/api/v1`;

interface CategoryPath {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
}

interface ListingSummary {
  id: number | string;
  title: string;
  categoryId: number | string | null;
}

interface CategoryPathItemApi {
  id: number | string;
  label: string;
  slug: string;
  type?: string;
}

interface CategoryPathResponse {
  success: boolean;
  message: string;
  data: {
    ad: {
      id: number | string;
      title: string;
      categoryId: string;
    };
    categoryPath: CategoryPath[];
  };
}

function unwrap<T>(json: unknown): T | null {
  if (json && typeof json === 'object' && 'data' in (json as Record<string, unknown>)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/**
 * İlan özetini (başlık + kategori ID) canlı BE'den getirir
 * @param adId - İlan ID
 */
const fetchListingSummary = async (adId: number | string): Promise<ListingSummary> => {
  const url = `${API_V1_BASE}/listings/${adId}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!response.ok) {
    throw new Error(`İlan bulunamadı: ID=${adId} (HTTP ${response.status})`);
  }

  const json: unknown = await response.json();
  const data = unwrap<Record<string, unknown>>(json);
  if (!data) {
    throw new Error(`İlan verisi alınamadı: ID=${adId}`);
  }

  return {
    id: (data.id as number | string | undefined) ?? adId,
    title: String(data.title ?? `İlan #${adId}`),
    categoryId: (data.categoryId as number | string | null | undefined) ?? null,
  };
};

/**
 * Kategori ID'sine göre breadcrumb yolunu canlı BE'den getirir
 * @param categoryId - Kategori ID
 */
const fetchCategoryPathFromApi = async (categoryId: number | string): Promise<CategoryPath[]> => {
  const url = `${API_V1_BASE}/categories/${categoryId}/path`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!response.ok) {
    throw new Error(`Kategori yolu alınamadı: CategoryID=${categoryId} (HTTP ${response.status})`);
  }

  const json: unknown = await response.json();
  const items = unwrap<CategoryPathItemApi[]>(json) ?? [];

  return items.map((item, index, arr) => ({
    id: String(item.id),
    name: item.label,
    slug: item.slug,
    ...(index > 0 ? { parentId: String(arr[index - 1].id) } : {}),
  }));
};

/**
 * İlan ID'sine göre kategori yolunu getiren fonksiyon
 *
 * @param adId - İlan ID
 * @returns Kategori yolu bilgisi
 */
const fetchCategoryPath = async (adId: number | string): Promise<CategoryPathResponse> => {
  if (!adId) {
    throw new Error("İlan ID'si gereklidir");
  }

  // Önbellek kontrolü
  const cacheKey = `categoryPath_${adId}`;
  const cached = cacheMap.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_TIME) {
    return cached.data as CategoryPathResponse;
  }

  const listing = await fetchListingSummary(adId);

  if (!listing.categoryId) {
    throw new Error('İlan için kategori bilgisi bulunamadı');
  }

  const categoryPath = await fetchCategoryPathFromApi(listing.categoryId);

  if (!categoryPath.length) {
    throw new Error(`Kategori yolu bulunamadı: CategoryID=${listing.categoryId}`);
  }

  const response: CategoryPathResponse = {
    success: true,
    message: 'Kategori yolu başarıyla alındı',
    data: {
      ad: {
        id: listing.id,
        title: listing.title,
        categoryId: String(listing.categoryId),
      },
      categoryPath,
    },
  };

  cacheMap.set(cacheKey, { data: response, timestamp: Date.now() });

  return response;
};

/**
 * Önbelleği temizleyen fonksiyon
 * @param adId - Temizlenecek spesifik ilan ID'si (opsiyonel)
 */
const clearCache = (adId: number | string | null = null): void => {
  if (adId) {
    const cacheKey = `categoryPath_${adId}`;
    cacheMap.delete(cacheKey);
  } else {
    cacheMap.clear();
  }
};

// Dışa aktarılan API arayüzü
const categoryPathApi = {
  fetchCategoryPath,
  clearCache,
};

export default categoryPathApi;
