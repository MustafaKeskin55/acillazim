/**
 * CATEGORY SERVICE
 *
 * USE_API = false  → JSON mock data (data/categroies_data.json)
 * USE_API = true   → Gerçek API (/api/v1/categories)
 *
 * Path alias yok: /api/categories/... veya /categories/main|sub kullanılmaz.
 * Geçiş: api/config.ts dosyasındaki USE_API flag'ini değiştir.
 */

import CategoryUtils from './CategoryUtils';
import { USE_API } from '@/api/config';
import categoriesData from '../../data/categroies_data.json';

interface CategoryItem {
  category_id: number;
  label: string;
  parent_id: number | null;
  type?: string;
  slug?: string;
  order?: number;
  isServiceCategory?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  hasCustomPage?: boolean;
  img_url?: string;
  count?: number;
  [key: string]: unknown;
}

interface CategoryWithSlug extends CategoryItem {
  slug: string;
}

interface CategoryPathItem {
  id: number;
  label: string;
  slug: string;
  type?: string;
}

interface PopularCategoryItem extends CategoryWithSlug {
  id: number;
  name: string;
  position: string;
  imageUrl: string | null;
}

interface ApiResponse {
  success: boolean;
  data: CategoryItem[];
  message?: string;
}

interface CacheStatus {
  size: number;
  keys: string[];
  storageType: string;
}

const isBrowser = typeof window !== 'undefined';

/** Host normalize → tam base: {host}/api/v1/categories */
function resolveCategoriesApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  if (!raw) return '/api/v1/categories';
  const host = raw
    .replace(/\/api\/v1\/categories\/?$/, '')
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '');
  return `${host}/api/v1/categories`;
}

// ================================================================
// MODULE-LEVEL SINGLETON — bir kez yüklenir, tüm instance'lar paylaşır
// ================================================================
const _mockDataSingleton: CategoryItem[] = Array.isArray(categoriesData)
  ? (categoriesData as CategoryItem[])
  : [];

// id → CategoryItem hızlı lookup
const _mockDataById = new Map<number, CategoryItem>();
for (const cat of _mockDataSingleton) {
  if (cat.category_id !== undefined) _mockDataById.set(Number(cat.category_id), cat);
}

// parent_id → children[] hızlı lookup
const _mockDataByParent = new Map<number | null, CategoryItem[]>();
for (const cat of _mockDataSingleton) {
  const pid = cat.parent_id !== undefined && cat.parent_id !== null ? Number(cat.parent_id) : null;
  const existing = _mockDataByParent.get(pid as number | null);
  if (existing) existing.push(cat);
  else _mockDataByParent.set(pid as number | null, [cat]);
}

class CategoryService {
  private mockData: CategoryItem[];
  private CACHE_PREFIX: string;
  private API_BASE_URL: string;

  constructor() {
    // Singleton'ı doğrudan kullan — kopyalama yok
    this.mockData = _mockDataSingleton;
    this.CACHE_PREFIX = 'acillazim_category_v2_';
    this.API_BASE_URL = resolveCategoriesApiBase();
  }

  // ==================== MOCK DATA ====================

  loadMockData(): void {
    this.mockData = _mockDataSingleton;
  }

  // ==================== CACHE YÖNETİMİ ====================

  getCacheItem(key: string): unknown {
    if (!isBrowser) return null;
    try {
      const item = localStorage.getItem(this.CACHE_PREFIX + key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  setCacheItem(key: string, value: unknown): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(value));
    } catch {
      // localStorage dolu olabilir
    }
  }

  hasCacheItem(key: string): boolean {
    if (!isBrowser) return false;
    return localStorage.getItem(this.CACHE_PREFIX + key) !== null;
  }

  removeCacheItem(key: string): void {
    if (!isBrowser) return;
    localStorage.removeItem(this.CACHE_PREFIX + key);
  }

  // ==================== API ÇAĞRISI ====================

  async apiCall(endpoint: string, params: Record<string, unknown> = {}): Promise<ApiResponse> {
    // Mock mod: API çağrısı olmadan doğrudan mockFallback döndür
    if (!USE_API) {
      return this.mockFallback(endpoint, params as Record<string, unknown>);
    }

    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString();

    const url = `${this.API_BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (isBrowser) {
      const token = localStorage.getItem('auth_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json();
    } catch (error) {
      console.error(`❌ API Hatası:`, error);
      throw error;
    }
  }

  // ==================== MOCK FALLBACK ====================

  mockFallback(endpoint: string, params: Record<string, unknown>): ApiResponse {
    if (!this.mockData || !Array.isArray(this.mockData)) {
      return { success: false, data: [], message: 'Mock data yok' };
    }

    let filtered = [...this.mockData];

    // Slug lookup
    if (endpoint.startsWith('/by-slug/')) {
      const slug = endpoint.replace('/by-slug/', '');
      const category = filtered.find(
        (cat) => CategoryUtils.slugify(cat.label).toLowerCase() === slug.toLowerCase()
      );
      return { success: true, data: category ? [category] : [] };
    }

    // Arama
    if (endpoint === '/search' && params.q) {
      const term = (params.q as string).toLowerCase();
      filtered = filtered.filter((cat) => cat.label?.toLowerCase().includes(term));
      return { success: true, data: filtered };
    }

    // Parent ID filtresi
    if ('parent_id' in params) {
      const rawParentId = params.parent_id;
      const parentId =
        rawParentId === null || rawParentId === 'null'
          ? null
          : Number(rawParentId);
      filtered = filtered.filter((cat) => {
        const catParentId = cat.parent_id === null ? null : Number(cat.parent_id);
        return catParentId === parentId;
      });
    }

    // Category ID filtresi
    if (params.category_id) {
      filtered = filtered.filter(
        (cat) => Number(cat.category_id) === Number(params.category_id)
      );
    }

    filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
    return { success: true, data: filtered };
  }

  // ==================== ANA FONKSİYONLAR ====================

  async getMainCategories(): Promise<CategoryWithSlug[]> {
    const cacheKey = 'main_categories';
    if (this.hasCacheItem(cacheKey)) {
      return this.getCacheItem(cacheKey) as CategoryWithSlug[];
    }

    const response = await this.apiCall('', { parent_id: null });
    const categories = response.data || [];
    const categoriesWithSlug: CategoryWithSlug[] = categories.map((cat) => ({
      ...cat,
      slug: CategoryUtils.slugify(cat.label)
    }));

    this.setCacheItem(cacheKey, categoriesWithSlug);
    return categoriesWithSlug;
  }

  async getSubCategories(parent_id: number | string): Promise<CategoryWithSlug[]> {
    const cacheKey = `parent_${parent_id}`;
    if (this.hasCacheItem(cacheKey)) {
      const cached = this.getCacheItem(cacheKey) as CategoryWithSlug[];
      if (Array.isArray(cached) && cached.length > 0 && cached.some((c) => Boolean((c as { icon?: string }).icon))) {
        return cached;
      }
    }

    if (!USE_API) {
      // O(1) Map lookup
      const children = _mockDataByParent.get(Number(parent_id)) || [];
      const categoriesWithSlug: CategoryWithSlug[] = children.map((cat) => ({
        ...cat,
        slug: CategoryUtils.slugify(cat.label)
      }));
      this.setCacheItem(cacheKey, categoriesWithSlug);
      return categoriesWithSlug;
    }

    const response = await this.apiCall('', { parent_id });
    const categories = response.data || [];
    const categoriesWithSlug: CategoryWithSlug[] = categories.map((cat) => ({
      ...cat,
      slug: CategoryUtils.slugify(cat.label)
    }));

    this.setCacheItem(cacheKey, categoriesWithSlug);
    return categoriesWithSlug;
  }

  async getCategoryById(category_id: number | string): Promise<CategoryWithSlug | null> {
    const cacheKey = `category_${category_id}`;
    if (this.hasCacheItem(cacheKey)) {
      return this.getCacheItem(cacheKey) as CategoryWithSlug;
    }

    // Mock modda O(1) Map lookup
    if (!USE_API) {
      const category = _mockDataById.get(Number(category_id));
      if (!category) return null;
      const categoryWithSlug: CategoryWithSlug = { ...category, slug: CategoryUtils.slugify(category.label) };
      this.setCacheItem(cacheKey, categoryWithSlug);
      return categoryWithSlug;
    }

    const response = await this.apiCall('', { category_id });
    const categories = response.data || [];
    const category = categories.find((c) => Number(c.category_id) === Number(category_id));
    if (!category) return null;

    const categoryWithSlug: CategoryWithSlug = {
      ...category,
      slug: CategoryUtils.slugify(category.label)
    };
    this.setCacheItem(cacheKey, categoryWithSlug);
    return categoryWithSlug;
  }

  async getCategoryBySlug(slug: string): Promise<CategoryItem | null> {
    if (!slug) return null;

    const cacheKey = `slug_${slug}`;
    if (this.hasCacheItem(cacheKey)) {
      return this.getCacheItem(cacheKey) as CategoryItem;
    }

    const response = await this.apiCall(`/by-slug/${encodeURIComponent(slug)}`, {});
    if (!response.success || !response.data || response.data.length === 0) return null;

    const category = response.data[0];
    this.setCacheItem(cacheKey, category);
    return category;
  }

  async getCategoryPath(category_id: number | string): Promise<CategoryPathItem[]> {
    const path: CategoryPathItem[] = [];
    let currentId: number | string | null = category_id;

    while (currentId) {
      const category = await this.getCategoryById(currentId);
      if (!category) break;
      path.unshift({
        id: category.category_id,
        label: category.label,
        slug: CategoryUtils.slugify(category.label),
        type: category.type
      });
      currentId = category.parent_id;
    }

    return path;
  }

  async getAllCategories(): Promise<CategoryWithSlug[]> {
    const cacheKey = 'all_categories';
    if (this.hasCacheItem(cacheKey)) {
      return this.getCacheItem(cacheKey) as CategoryWithSlug[];
    }

    // Mock modda: singleton'dan al, her seferinde 89k kategori map'leme
    if (!USE_API) {
      if (!_mockDataSingleton.length) return [];
      const categoriesWithSlug: CategoryWithSlug[] = _mockDataSingleton.map((cat) => ({
        ...cat,
        slug: CategoryUtils.slugify(cat.label)
      }));
      this.setCacheItem(cacheKey, categoriesWithSlug);
      return categoriesWithSlug;
    }

    const response = await this.apiCall('', {});
    const categories = response.data || [];
    const categoriesWithSlug: CategoryWithSlug[] = categories.map((cat) => ({
      ...cat,
      slug: CategoryUtils.slugify(cat.label)
    }));
    this.setCacheItem(cacheKey, categoriesWithSlug);
    return categoriesWithSlug;
  }

  // ==================== TYPE KONTROLÜ ====================

  hasSubCategories(category: CategoryItem): boolean {
    if (!category || !category.type) return false;
    return category.type !== 'leaf';
  }

  getCategoryType(category: CategoryItem): string | null {
    return category?.type || null;
  }

  async searchCategories(searchTerm: string, options: Record<string, unknown> = {}): Promise<CategoryWithSlug[]> {
    if (!searchTerm) return [];

    const cacheKey = `search_${searchTerm}_${JSON.stringify(options)}`;
    if (this.hasCacheItem(cacheKey)) {
      return this.getCacheItem(cacheKey) as CategoryWithSlug[];
    }

    const response = await this.apiCall('/search', { q: searchTerm, ...options });
    const categories = response.data || [];
    const categoriesWithSlug: CategoryWithSlug[] = categories.map((cat) => ({
      ...cat,
      slug: CategoryUtils.slugify(cat.label)
    }));

    this.setCacheItem(cacheKey, categoriesWithSlug);
    return categoriesWithSlug;
  }

  // ==================== CACHE YÖNETİMİ ====================

  clearCache(): void {
    if (!isBrowser) return;
    Object.keys(localStorage)
      .filter((key) => key.startsWith(this.CACHE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  }

  clearCacheKey(key: string): void {
    this.removeCacheItem(key);
  }

  getCacheStatus(): CacheStatus {
    if (!isBrowser) return { size: 0, keys: [], storageType: 'localStorage' };
    const keys = Object.keys(localStorage)
      .filter((key) => key.startsWith(this.CACHE_PREFIX))
      .map((key) => key.replace(this.CACHE_PREFIX, ''));
    return { size: keys.length, keys, storageType: 'localStorage' };
  }

  // ==================== UYUMLULUK ====================

  async getCategories(): Promise<CategoryWithSlug[]> {
    return this.getAllCategories();
  }

  async getSubcategoriesByParentId(parent_id: number | string): Promise<CategoryWithSlug[]> {
    return this.getSubCategories(parent_id);
  }

  async getServiceCategories(): Promise<CategoryWithSlug[]> {
    const mainCategories = await this.getMainCategories();
    const serviceCategory = mainCategories.find(
      (cat) => cat.isServiceCategory === true || cat.category_id === 12540
    );
    if (serviceCategory) return this.getSubCategories(serviceCategory.category_id);
    console.warn('⚠️ Hizmet kategorisi bulunamadı!');
    return [];
  }

  async getPopularServiceCategories(parentId: number | null = null): Promise<PopularCategoryItem[]> {
    const cacheKey = `popular_service_categories_${parentId || 'default'}`;
    if (this.hasCacheItem(cacheKey)) {
      return this.getCacheItem(cacheKey) as PopularCategoryItem[];
    }

    let categories: CategoryItem[] = [];

    if (parentId) {
      const response = await this.apiCall('', { parent_id: parentId });
      categories = response.data || [];
    } else {
      const allCategories = await this.getAllCategories();
      categories = allCategories.filter(
        (cat) => cat.isPopular === true || cat.isFeatured === true
      );

      if (categories.length === 0) {
        const response = await this.apiCall('', { parent_id: 12540 });
        categories = response.data || [];
      }
    }

    const categoriesWithMetadata: PopularCategoryItem[] = categories.map((cat) => ({
      ...cat,
      id: cat.category_id,
      name: cat.label,
      slug: CategoryUtils.slugify(cat.label),
      position: (cat.position as string) || 'center',
      imageUrl: cat.img_url || null
    }));

    this.setCacheItem(cacheKey, categoriesWithMetadata);
    return categoriesWithMetadata;
  }
}

const categoryService = new CategoryService();
export default categoryService;
export { CategoryService };
