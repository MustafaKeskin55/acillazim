/**
 * ============================================================================
 * ACİLLAZIM - KATEGORİ BANNER SERVİSİ
 * ============================================================================
 *
 * USE_API = false  → Mock data (data/banner.json + data/realty_filter.json)
 * USE_API = true   → Gerçek API (GET /api/v1/banner/filters?categoryId={id})
 *
 * Path alias yok: /api/banner/... veya /api/v1/banners/filters kullanılmaz.
 * Geçiş: api/config.ts dosyasındaki USE_API flag'ini değiştir.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { USE_API } from '@/api/config';
import bannerJson from '@/data/banner.json';
import realtyFilterJson from '@/data/realty_filter.json';

// ============================================================================
// TİP TANIMLARI
// ============================================================================

interface FilterOption {
  label?: string;
  value?: string | number;
  [key: string]: unknown;
}

interface FilterItem {
  id?: number | string;
  label?: string;
  type?: string;
  db_field?: string | null;
  display_location?: string;
  priority?: boolean;
  options?: FilterOption[] | FilterItemOptions;
  unit?: string | null;
  category_dependency?: (number | string)[];
  [key: string]: unknown;
}

interface FilterItemOptions {
  label?: string;
  type?: string;
  db_field?: string | null;
  display_location?: string;
  priority?: boolean;
  options?: FilterOption[];
  unit?: string | null;
  [key: string]: unknown;
}

interface BannerCategory {
  banner_category_id?: number;
  filter_id?: (number | string)[];
  [key: string]: unknown;
}

interface BannerData {
  banner_categories?: BannerCategory[];
  [key: string]: unknown;
}

interface BannerResponse {
  success: boolean;
  categoryId?: number;
  hasBanner?: boolean;
  filterCount?: number;
  filters?: FilterItem[];
  backgroundImage?: string | null;
  title?: string | null;
  subtitle?: string | null;
  metadata?: {
    source: string;
    timestamp: string;
    version: string;
  };
  error?: string;
  message?: string;
  statusCode?: number;
}

// ============================================================================
// API YAPILANDIRMASI
// ============================================================================

/** Host (trailing /api yok) + /api/v1 — full path: /api/v1/banner/filters */
const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
  .replace(/\/$/, '')
  .replace(/\/api\/?$/, '');

const API_CONFIG = {
  baseURL: `${API_HOST}/api/v1`,
  endpoints: {
    getBannerFilters: '/banner/filters'
  },
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000 // 5 dakika
  },
  logging: {
    enabled: process.env.NODE_ENV === 'development'
  }
};

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  headers: { 'Content-Type': 'application/json' }
});

axiosInstance.interceptors.request.use(
  (config) => {
    logger('debug', `📤 API İsteği: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    logger('debug', `✅ API Yanıtı: ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    logger('error', `❌ API Hatası: ${error.response?.status || 'Network Error'} - ${error.config?.url}`);
    return Promise.reject(error);
  }
);

// ============================================================================
// LOGGER
// ============================================================================

const logger = (level: string, ...args: unknown[]): void => {
  if (!API_CONFIG.logging.enabled) {
    if (level === 'error') console.error(...args);
    return;
  }
  switch (level) {
    case 'debug': console.log(...args); break;
    case 'info': console.info(...args); break;
    case 'warn': console.warn(...args); break;
    case 'error': console.error(...args); break;
    default: console.log(...args);
  }
};

// ============================================================================
// CACHE SİSTEMİ
// ============================================================================

let bannerDataCache: BannerData | null = null;
let filterDataCache: FilterItem[] | null = null;
const apiResponseCache = new Map<number | string, { data: BannerResponse; timestamp: number }>();

const getCachedResponse = (categoryId: number | string): BannerResponse | null => {
  if (!API_CONFIG.cache.enabled) return null;
  const cached = apiResponseCache.get(categoryId);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > API_CONFIG.cache.ttl) {
    apiResponseCache.delete(categoryId);
    return null;
  }
  return cached.data;
};

const setCachedResponse = (categoryId: number | string, data: BannerResponse): void => {
  if (!API_CONFIG.cache.enabled) return;
  apiResponseCache.set(categoryId, { data, timestamp: Date.now() });
};

const clearApiCache = (): void => {
  apiResponseCache.clear();
};

// ============================================================================
// MOCK DATA (USE_API = false olduğunda kullanılır)
// ============================================================================

const loadBannerData = (): BannerData => {
  if (!bannerDataCache) {
    try {
      bannerDataCache = bannerJson as BannerData;
      logger('info', '📦 [BannerService] banner.json yüklendi (MOCK)');
    } catch (error) {
      logger('error', '❌ [BannerService] banner.json yüklenemedi:', error);
      bannerDataCache = { banner_categories: [] };
    }
  }
  return bannerDataCache!;
};

const loadFilterData = (): FilterItem[] => {
  if (!filterDataCache) {
    try {
      filterDataCache = realtyFilterJson as FilterItem[];
      logger('info', '📦 [BannerService] realty_filter.json yüklendi (MOCK)');
    } catch (error) {
      logger('error', '❌ [BannerService] realty_filter.json yüklenemedi:', error);
      filterDataCache = [];
    }
  }
  return filterDataCache!;
};

const getMockBannerData = (categoryId: number | string): BannerResponse | null => {
  try {
    const bannerData = loadBannerData();
    if (!bannerData?.banner_categories) return null;

    const bannerCategory = bannerData.banner_categories.find(
      (item) => item.banner_category_id === Number(categoryId)
    );
    if (!bannerCategory) return null;

    const filterData = loadFilterData();
    if (!filterData || !Array.isArray(filterData)) return null;

    const filters: FilterItem[] = [];
    (bannerCategory.filter_id || []).forEach((filterId) => {
      const filter = filterData.find((f) => f.id === filterId);
      if (filter) {
        const opts = filter.options as FilterItemOptions;
        filters.push({
          id: filter.id,
          label: opts?.label || `Filtre ${filterId}`,
          type: opts?.type || 'text',
          db_field: opts?.db_field || null,
          display_location: opts?.display_location || 'default',
          priority: opts?.priority || false,
          options: opts?.options || [],
          unit: opts?.unit || null,
          category_dependency: filter.category_dependency || []
        });
      }
    });

    if (filters.length === 0) return null;

    return {
      success: true,
      categoryId: Number(categoryId),
      hasBanner: true,
      filterCount: filters.length,
      filters,
      backgroundImage: null,
      title: null,
      subtitle: null,
      metadata: {
        source: 'mock_data',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    };
  } catch (error) {
    logger('error', '❌ [BannerService] Mock data işlenirken hata:', error);
    return null;
  }
};

// ============================================================================
// RESPONSE VALIDATION
// ============================================================================

const validateBannerResponse = (data: BannerResponse, categoryId: number | string): BannerResponse | null => {
  try {
    if (!data || typeof data !== 'object') return null;
    if (data.success !== true) return null;
    if (data.categoryId !== Number(categoryId)) return null;
    if (!Array.isArray(data.filters)) return null;
    for (const filter of data.filters) {
      if (!filter.id || !filter.label || !filter.type) return null;
    }
    return data;
  } catch {
    return null;
  }
};

// ============================================================================
// ANA FONKSİYONLAR
// ============================================================================

export const getBannerFiltersForCategory = async (
  categoryId: number | string
): Promise<BannerResponse | null> => {
  try {
    logger('info', `🎯 [BannerService] Kategori ID ${categoryId} için banner verileri isteniyor...`);

    // Mock mod
    if (!USE_API) {
      return getMockBannerData(categoryId);
    }

    // Cache kontrolü
    const cachedData = getCachedResponse(categoryId);
    if (cachedData) return cachedData;

    // Gerçek API
    const response = await axiosInstance.get(API_CONFIG.endpoints.getBannerFilters, {
      params: { categoryId }
    });

    const validatedData = validateBannerResponse(response.data as BannerResponse, categoryId);
    if (!validatedData) return null;

    setCachedResponse(categoryId, validatedData);
    return validatedData;
  } catch (error) {
    const axiosErr = error as AxiosError;
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const errorData = axiosErr.response.data as { message?: string };
      if (status === 404) return null;
      return {
        success: false,
        error: status >= 500 ? 'Internal Server Error' : `HTTP ${status}`,
        message: errorData?.message || 'Banner verileri alınırken hata oluştu',
        statusCode: status
      };
    } else if (axiosErr.request) {
      return { success: false, error: 'Network Error', message: 'Sunucuya bağlanılamıyor', statusCode: 0 };
    }
    return { success: false, error: 'Unknown Error', message: (error as Error).message, statusCode: 0 };
  }
};

export const hasBanner = async (categoryId: number | string): Promise<boolean> => {
  try {
    // Mock mod
    if (!USE_API) {
      const bannerData = loadBannerData();
      if (!bannerData?.banner_categories) return false;
      return !!bannerData.banner_categories.find(
        (item) => item.banner_category_id === Number(categoryId)
      );
    }

    // Cache kontrolü
    const cachedData = getCachedResponse(categoryId);
    if (cachedData) return true;

    // Gerçek API
    const response = await axiosInstance.head(API_CONFIG.endpoints.getBannerFilters, {
      params: { categoryId }
    });
    return response.status === 200;
  } catch (error) {
    const axiosErr = error as AxiosError;
    if (axiosErr.response?.status === 404) return false;
    return false;
  }
};

export const clearCache = (type = 'all'): void => {
  switch (type) {
    case 'mock':
      bannerDataCache = null;
      filterDataCache = null;
      break;
    case 'api':
      clearApiCache();
      break;
    case 'all':
    default:
      bannerDataCache = null;
      filterDataCache = null;
      clearApiCache();
      break;
  }
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  getBannerFiltersForCategory,
  hasBanner,
  clearCache,
  getConfig: () => API_CONFIG,
  getCacheStats: () => ({
    apiCacheSize: apiResponseCache.size,
    mockDataLoaded: !!bannerDataCache && !!filterDataCache
  }),
  invalidateCache: (categoryId: number | string) => {
    if (categoryId) apiResponseCache.delete(categoryId);
    else clearCache('api');
  }
};
