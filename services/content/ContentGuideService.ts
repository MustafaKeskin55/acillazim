/**
 * CONTENT GUIDE SERVICE
 *
 * USE_API = false  → fakeFetch ile data/categoryGuides.json kullanılır
 * USE_API = true   → Gerçek API (axios) kullanılır; hata durumunda mock'a
 *                     düşülmez, hata yukarı fırlatılır.
 *
 * Path alias yok: /api/content-guides veya /api/category-guides kullanılmaz.
 * Geçiş: api/config.ts dosyasındaki USE_API flag'ini değiştir.
 */

import axios from 'axios';
import { USE_API } from '@/api/config';

/** Base: /api/v1 — full paths: /api/v1/content-guides/... */
function resolveContentGuidesApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  if (!raw) return '/api/v1';
  const host = raw
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '');
  return `${host}/api/v1`;
}

const API_URL = resolveContentGuidesApiBase();
const CONTENT_GUIDES_PATH = '/content-guides';

const CACHE_KEY = 'acillazim_category_guides';
const CACHE_TIMESTAMP_KEY = 'acillazim_category_guides_timestamp';

interface Guide {
  id?: number | string;
  categoryId?: number | string;
  categoryName?: string;
  guides?: Guide[];
  [key: string]: unknown;
}

interface GuidesData {
  guides: Guide[];
}

interface FetchOptions {
  token?: string;
  [key: string]: unknown;
}

interface ApiResponse {
  success: boolean;
  data: Guide | Guide[] | null;
  message: string;
}

interface FetchResponse {
  data: ApiResponse;
  status: number;
  statusText: string;
}

const isBrowser = typeof window !== 'undefined';

// ============================================================
// LOCAL STORAGE CACHE
// ============================================================

const loadFromLocalStorage = (): GuidesData | null => {
  if (!isBrowser) return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const saveToLocalStorage = (data: GuidesData): void => {
  if (!isBrowser) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());
  } catch {
    // localStorage dolu olabilir
  }
};

const isValidCache = (): boolean => {
  if (!isBrowser) return false;
  try {
    return localStorage.getItem(CACHE_KEY) !== null;
  } catch {
    return false;
  }
};

const clearCacheStorage = (): void => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch {
    // ignore
  }
};

// ============================================================
// MOCK DATA YÜKLEME
// ============================================================

const loadCategoryGuides = async (): Promise<GuidesData> => {
  // Önce localStorage'dan kontrol et
  if (isValidCache()) {
    const cachedData = loadFromLocalStorage();
    if (cachedData) {
      return cachedData;
    }
  }

  // Cache yoksa API'den yükle. Hata durumunda mock'a düşülmez — hata
  // yukarı fırlatılır ki BE sorunları console'da görünür kalsın.
  if (USE_API) {
    const response = await axios.get(`${API_URL}${CONTENT_GUIDES_PATH}`);
    const payload = response.data?.data || response.data;
    const data: GuidesData = Array.isArray(payload)
      ? { guides: payload }
      : payload?.guides
        ? payload
        : { guides: [] };
    saveToLocalStorage(data);
    return data;
  }

  // Mock mod: JSON dosyasından yükle
  const categoryGuides = await import('@/data/categoryGuides.json');
  const data = (categoryGuides.default || categoryGuides) as GuidesData;
  saveToLocalStorage(data);
  return data;
};

// ============================================================
// FAKE FETCH (USE_API = false olduğunda kullanılır)
// ============================================================

const fakeFetch = async (endpoint: string, options: FetchOptions = {}): Promise<FetchResponse> => {
  try {
    const allGuides = await loadCategoryGuides();
    const guides = allGuides.guides || [];

    let responseData: Guide | Guide[] | null = null;

    if (endpoint.includes('/videos/categories/')) {
      const categoryId = endpoint.split('/').pop();
      responseData =
        guides.find((g) => String(g.categoryId) === String(categoryId)) ||
        guides.find((g) => g.categoryId === 0) ||
        null;
    } else if (endpoint.includes('/categories/')) {
      const categoryId = endpoint.split('/').pop();
      responseData =
        guides.find((g) => String(g.categoryId) === String(categoryId)) ||
        guides.find((g) => g.categoryId === 0) ||
        null;
    } else if (endpoint.includes('/category-names/')) {
      const categoryName = endpoint.split('/').pop() || '';
      responseData =
        guides.find(
          (g) => g.categoryName && g.categoryName.toLowerCase() === decodeURIComponent(categoryName).toLowerCase()
        ) ||
        guides.find((g) => g.categoryId === 0) ||
        null;
    } else if (endpoint === CONTENT_GUIDES_PATH || endpoint === '/content-guides') {
      responseData = guides;
    } else if (endpoint.startsWith(`${CONTENT_GUIDES_PATH}/`) || endpoint.startsWith('/content-guides/')) {
      const searchId = endpoint.split('/').pop();
      responseData = guides.find((g) => String(g.id) === String(searchId)) || null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void options;

    return {
      data: { success: true, data: responseData, message: 'Content guide fetched successfully' },
      status: 200,
      statusText: 'OK'
    };
  } catch (error) {
    console.error('[Content Guide Service] fakeFetch hatası:', error);
    const allGuides = await loadCategoryGuides();
    const generalGuide = allGuides.guides.find((g) => g.categoryId === 0) || null;
    return {
      data: {
        success: !!generalGuide,
        data: generalGuide,
        message: generalGuide ? 'Default guide returned' : 'No guide found'
      },
      status: generalGuide ? 200 : 404,
      statusText: generalGuide ? 'OK' : 'Not Found'
    };
  }
};

// ============================================================
// API REQUEST
// ============================================================

const apiRequest = async (
  method: string,
  endpoint: string,
  data: unknown = null,
  options: FetchOptions = {}
): Promise<ApiResponse> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const token =
    options.token ||
    (isBrowser ? localStorage.getItem('auth_token') : null);
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    // Mock mod
    if (!USE_API) {
      const response = await fakeFetch(endpoint, options);
      if (response.data.success) return response.data;
      throw new Error(response.data.message || 'Bir hata oluştu');
    }

    // Gerçek API
    const response = await axios({ method, url: `${API_URL}${endpoint}`, data, headers });

    if (response.data?.success === false) {
      throw new Error(response.data.message || 'Bir hata oluştu');
    }

    return { success: true, data: response.data?.data || response.data, message: 'OK' };
  } catch (error) {
    console.error(`[Content Guide Service] ${method.toUpperCase()} ${endpoint} failed:`, error);
    throw error;
  }
};

// ============================================================
// SERVİS SINIFI
// ============================================================

class ContentGuideService {
  clearCache(): void {
    clearCacheStorage();
  }

  async getContentByCategoryId(categoryId: string | number, options: FetchOptions = {}): Promise<ApiResponse> {
    if (!categoryId) throw new Error('Kategori ID gerekli');
    return apiRequest('get', `/content-guides/categories/${categoryId}`, null, options);
  }

  async getContentByCategoryName(categoryName: string, options: FetchOptions = {}): Promise<ApiResponse> {
    if (!categoryName) throw new Error('Kategori adı gerekli');
    return apiRequest('get', `/content-guides/category-names/${categoryName}`, null, options);
  }

  async getVideoGuideByCategory(categoryId: string | number, options: FetchOptions = {}): Promise<ApiResponse> {
    if (!categoryId) throw new Error('Kategori ID gerekli');
    return apiRequest('get', `/content-guides/videos/categories/${categoryId}`, null, options);
  }

  async getAllContentGuides(options: FetchOptions = {}): Promise<ApiResponse> {
    return apiRequest('get', '/content-guides', null, options);
  }

  async getContentGuideById(guideId: string | number, options: FetchOptions = {}): Promise<ApiResponse> {
    if (!guideId) throw new Error('Rehber ID gerekli');
    return apiRequest('get', `/content-guides/${guideId}`, null, options);
  }
}

const contentGuideService = new ContentGuideService();
export default contentGuideService;
