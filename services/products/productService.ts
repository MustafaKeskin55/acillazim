/**
 * productService.ts - Ürün servisi (Kategoriler Sayfası)
 *
 * USE_API = false  → data/üründat.json + data/categories-data.json (mock)
 * USE_API = true   → GET /api/v1/listings?...
 *
 * Path alias yok: /api/products kullanılmaz → /api/v1/listings
 * Favori → /api/v1/favorites/add|remove (toggle yok)
 * Geçiş: api/config.ts USE_API flag.
 */

import axios from 'axios';
import { USE_API } from '@/api/config';
import defaultCardData from '@/data/üründat.json';
import categoryData from '@/data/categories-data.json';

/** Host normalize → {host}/api/v1 */
function resolveProductsApiBase(): string {
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

const API_BASE_URL = resolveProductsApiBase();

// ---- TİP TANIMLARI ----

interface ProductItem {
  id: number;
  product_id: number;
  title: string;
  price: number;
  para_birimi: string;
  description: string;
  images: string[];
  image: string | null;
  location: string;
  city: string;
  district: string;
  date: string;
  seller: string;
  categories: string;
  category_id: number | null;
  status: string;
  isUrgent: boolean;
  isFeatured: boolean;
  isNew: boolean;
  [key: string]: unknown;
}

interface CatHierarchyInfo {
  id: number;
  parent_id: number | null;
  path: string;
}

interface CategoryHierarchy {
  categoryMap: Map<number, CatHierarchyInfo>;
  parentChildMap: Map<number, number[]>;
}

interface GetProductsParams {
  page?: number;
  limit?: number;
  category?: string | number | null;
  category_id?: string | number | null;
  city?: string | null;
  listingType?: string | null;
  status?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  searchQuery?: string | null;
}

interface ProductsResult {
  success: boolean;
  source?: string;
  error?: string;
  data: {
    products: ProductItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface SingleProductResult {
  success: boolean;
  error?: string;
  data: ProductItem | null;
}

interface RawIlan {
  ilan_id: number;
  baslik?: string;
  fiyat?: number;
  para_birimi?: string;
  aciklama?: string;
  resimler?: string[];
  konum?: { il?: string; ilce?: string };
  ilan_tarihi?: string;
  ilan_veren_id?: number;
  category_id?: number;
  ilan_turu?: string;
  [key: string]: unknown;
}

interface RawProductData {
  ilanlari?: RawIlan[];
  emlak_ilanlari?: RawIlan[];
  [key: string]: unknown;
}

interface FakeFeatures {
  [key: string]: string | number;
}

interface FakeProduct {
  id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  subCategory: string;
  location: string;
  address: string;
  mapCoordinates: { lat: number; lng: number };
  seller: { id: number; name: string; phone: string; memberSince: string; otherListings: number; profileImage: string; isVerified: boolean };
  images: string[];
  features: FakeFeatures;
  additionalInfo: { title: string; items: { label: string; value: unknown }[] }[];
  publishDate: string;
  viewCount: number;
  favoriteCount: number;
  isPromoted: boolean;
}

// ---- MOCK VERİ YÜKLEME ----

let productData: RawProductData | null;
try {
  productData = defaultCardData as unknown as RawProductData;
  if (!productData || !Object.keys(productData).length) productData = null;
} catch {
  productData = null;
}

// ---- YARDIMCI FONKSİYONLAR ----

const formatFeatureLabel = (key: string): string => {
  const labels: Record<string, string> = {
    size: 'Metrekare', rooms: 'Oda Sayısı', floorLevel: 'Bulunduğu Kat',
    buildingAge: 'Bina Yaşı', heatingType: 'Isıtma Tipi', bathroom: 'Banyo Sayısı',
    brand: 'Marka', model: 'Model', condition: 'Durumu', color: 'Renk', warranty: 'Garanti Durumu'
  };
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const generateFakeProduct = (productId: string | number): FakeProduct => {
  const id = parseInt(String(productId));
  const isRealEstate = Math.random() > 0.5;

  const features: FakeFeatures = isRealEstate
    ? {
        size: Math.floor(Math.random() * 200) + 50 + ' m²',
        rooms: Math.floor(Math.random() * 4) + 1 + ' + ' + Math.floor(Math.random() * 2),
        floorLevel: Math.floor(Math.random() * 20) + 1 + '. Kat',
        buildingAge: Math.floor(Math.random() * 20) + ' Yaşında',
        heatingType: ['Doğalgaz', 'Merkezi Sistem', 'Kombi', 'Elektrikli'][Math.floor(Math.random() * 4)],
        bathroom: Math.floor(Math.random() * 3) + 1
      }
    : {
        brand: ['Apple', 'Samsung', 'Lenovo', 'Asus', 'Xiaomi'][Math.floor(Math.random() * 5)],
        model: `Model-${Math.floor(Math.random() * 1000)}`,
        condition: ['Yeni', 'Çok Az Kullanılmış', 'Kullanılmış', 'İyi'][Math.floor(Math.random() * 4)],
        color: ['Siyah', 'Beyaz', 'Gri', 'Mavi', 'Kırmızı'][Math.floor(Math.random() * 5)],
        warranty: Math.random() > 0.5 ? 'Garantisi Var' : 'Garantisi Yok'
      };

  return {
    id,
    title: isRealEstate ? `İstinyePark AVM'de ${features.size} Mağaza` : `${features.brand} ${features.model} ${features.color}`,
    description: isRealEstate
      ? `İstinyePark AVM'de ${features.size} büyüklüğünde mağaza. ${features.floorLevel}. Merkezi konumda.`
      : `${features.condition} durumda, ${features.color} renkli ${features.brand} ${features.model}. ${features.warranty}.`,
    price: isRealEstate ? Math.floor(Math.random() * 10000000) + 5000000 : Math.floor(Math.random() * 10000) + 1000,
    currency: 'TL',
    category: isRealEstate ? 'Emlak' : 'Elektronik',
    subCategory: isRealEstate ? 'İşyeri' : 'Telefon',
    location: 'İstanbul/Sarıyer',
    address: 'İstinyePark AVM, Sarıyer/İstanbul',
    mapCoordinates: { lat: 41.1123, lng: 29.031 },
    seller: {
      id: Math.floor(Math.random() * 10000),
      name: 'Ahmet Yılmaz',
      phone: '+90 (532) 555 67 89',
      memberSince: '2020-05-10',
      otherListings: Math.floor(Math.random() * 20) + 1,
      profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
      isVerified: true
    },
    images: Array.from({ length: 5 }, (_, i) => `https://picsum.photos/id/${id + i}/800/600`),
    features,
    additionalInfo: [
      {
        title: 'Ürün Özellikleri',
        items: Object.entries(features).map(([key, value]) => ({ label: formatFeatureLabel(key), value }))
      },
      {
        title: 'Genel Bilgiler',
        items: [
          { label: 'İlan Tarihi', value: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toLocaleDateString('tr-TR') },
          { label: 'İlan No', value: id.toString() },
          { label: 'İlan Durumu', value: Math.random() > 0.1 ? 'Aktif' : 'Pasif' }
        ]
      }
    ],
    publishDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
    viewCount: Math.floor(Math.random() * 1000) + 100,
    favoriteCount: Math.floor(Math.random() * 50) + 5,
    isPromoted: Math.random() > 0.7
  };
};

// ---- ANA SERVİS SINIFI ----

class ProductService {
  products: ProductItem[];
  productsByCategoryId: Map<number, ProductItem[]>;
  categoryHierarchy: CategoryHierarchy;
  apiBaseUrl: string;

  constructor() {
    this.products = [];
    this.productsByCategoryId = new Map();
    this.apiBaseUrl = resolveProductsApiBase();
    this.categoryHierarchy = this._buildCategoryHierarchy(categoryData);

    // Mock mod: JSON'dan ürünleri yükle
    if (!USE_API && productData) {
      this.products = this._flattenProductData(productData);
      this.productsByCategoryId = this._groupProductsByCategoryId();
    }
  }

  _buildCategoryHierarchy(catData: Record<string, unknown>): CategoryHierarchy {
    const hierarchy = new Map<number, CatHierarchyInfo>();
    const parentChildMap = new Map<number, number[]>();

    const processCategories = (obj: Record<string, unknown>, path = '') => {
      if ((obj as { category_id?: number }).category_id !== undefined) {
        const categoryId = (obj as { category_id: number }).category_id;
        const parentId = (obj as { parent_id?: number | null }).parent_id ?? null;
        hierarchy.set(categoryId, { id: categoryId, parent_id: parentId, path });
        if (parentId !== null) {
          if (!parentChildMap.has(parentId)) parentChildMap.set(parentId, []);
          parentChildMap.get(parentId)!.push(categoryId);
        }
      }
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null && key !== 'parent_id' && key !== 'category_id') {
          processCategories(obj[key] as Record<string, unknown>, path ? `${path} > ${key}` : key);
        }
      }
    };

    for (const topCategory in catData) {
      processCategories(catData[topCategory] as Record<string, unknown>, topCategory);
    }

    return { categoryMap: hierarchy, parentChildMap };
  }

  _getAllSubcategoryIds(categoryId: number): number[] {
    if (!this.categoryHierarchy?.parentChildMap) return [];
    const result: number[] = [];
    const collect = (parentId: number) => {
      const children = this.categoryHierarchy.parentChildMap.get(parentId) || [];
      children.forEach(childId => { result.push(childId); collect(childId); });
    };
    collect(categoryId);
    return result;
  }

  _flattenProductData(data: RawProductData): ProductItem[] {
    const all: ProductItem[] = [];
    if (!data) return all;

    // ilanlari dizisi
    if (data.ilanlari && Array.isArray(data.ilanlari)) {
      data.ilanlari.forEach(item => all.push(this._convertToProductFormat(item, 'İlan')));
    }

    // emlak_ilanlari dizisi
    if (data.emlak_ilanlari && Array.isArray(data.emlak_ilanlari)) {
      data.emlak_ilanlari.forEach(item => all.push(this._convertToProductFormat(item, 'Emlak')));
    }

    return all;
  }

  _groupProductsByCategoryId(): Map<number, ProductItem[]> {
    const productMap = new Map<number, ProductItem[]>();
    this.products.forEach(product => {
      if (product.category_id) {
        const list = productMap.get(product.category_id) || [];
        list.push(product);
        productMap.set(product.category_id, list);
      }
    });
    return productMap;
  }

  _convertToProductFormat(item: RawIlan, categoryType: string): ProductItem {
    return {
      id: item.ilan_id,
      product_id: item.ilan_id,
      title: item.baslik || '',
      price: item.fiyat || 0,
      para_birimi: item.para_birimi || 'TL',
      description: item.aciklama || '',
      images: item.resimler || [],
      image: item.resimler && item.resimler.length > 0 ? item.resimler[0] : null,
      location: item.konum ? (item.konum.il + (item.konum.ilce ? ', ' + item.konum.ilce : '')) : '',
      city: item.konum?.il || '',
      district: item.konum?.ilce || '',
      date: item.ilan_tarihi || '',
      seller: item.ilan_veren_id ? 'Satıcı ' + item.ilan_veren_id : 'Bilinmeyen Satıcı',
      categories: categoryType,
      category_id: item.category_id || null,
      status: 'active',
      isUrgent: item.ilan_turu === 'Acil İlan',
      isFeatured: item.ilan_turu === 'Jet İlan',
      isNew: new Date(item.ilan_tarihi || '') >= new Date(Date.now() - 3 * 86400000)
    };
  }

  _applyFilters(products: ProductItem[], params: GetProductsParams): ProductItem[] {
    const { city, listingType, status = 'active', minPrice, maxPrice, searchQuery } = params;
    let filtered = [...products];

    if (status) filtered = filtered.filter(p => p.status === status);
    if (city) filtered = filtered.filter(p => p.city?.toLowerCase().includes(city.toLowerCase()));

    if (listingType) {
      const typeMap: Record<string, string> = { urgent: 'isUrgent', featured: 'isFeatured', new: 'isNew' };
      const fk = typeMap[listingType.toLowerCase()];
      if (fk) filtered = filtered.filter(p => p[fk] === true);
    }

    if (minPrice !== null && minPrice !== undefined) filtered = filtered.filter(p => p.price >= minPrice);
    if (maxPrice !== null && maxPrice !== undefined) filtered = filtered.filter(p => p.price <= maxPrice);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }

    return filtered;
  }

  // ---- API YARDIMCI ----

  _getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // ---- ANA FONKSİYONLAR ----

  async getProducts(params: GetProductsParams = {}): Promise<ProductsResult> {
    const { page = 1, limit = 10, category = null, category_id = null } = params;

    // Mock mod
    if (!USE_API) {
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        if (!this.products?.length) {
          return { success: false, error: 'Ürün verisi bulunamadı', data: { products: [], total: 0, page, limit, totalPages: 0 } };
        }

        let filtered = [...this.products];

        const cid = category_id
          ? parseInt(String(category_id))
          : category ? parseInt(String(category)) : NaN;

        if (!isNaN(cid)) {
          const subs = this._getAllSubcategoryIds(cid);
          const all = [cid, ...subs];
          filtered = filtered.filter(p => all.includes(p.category_id as number));
        }

        filtered = this._applyFilters(filtered, params);
        const start = (page - 1) * limit;
        const paginated = filtered.slice(start, start + limit);

        return {
          success: true, source: 'mock',
          data: { products: paginated, total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) }
        };
      } catch {
        return { success: false, error: 'Ürünler getirilirken hata oluştu', data: { products: [], total: 0, page, limit, totalPages: 0 } };
      }
    }

    // Gerçek API — GET /api/v1/listings
    try {
      const apiParams: Record<string, unknown> = {
        page,
        page_size: limit,
        include_descendants: true,
      };
      const cid = category_id || category;
      if (cid != null && cid !== '') apiParams.category_id = cid;
      if (params.city) apiParams.il = params.city;
      if (params.listingType) apiParams.listing_type = params.listingType;
      if (params.minPrice != null) apiParams.fiyat_min = params.minPrice;
      if (params.maxPrice != null) apiParams.fiyat_max = params.maxPrice;
      if (params.searchQuery) apiParams.q = params.searchQuery;

      console.log(`[ProductService API] GET ${this.apiBaseUrl}/listings`, apiParams);
      const response = await axios.get(`${this.apiBaseUrl}/listings`, {
        params: apiParams,
        headers: this._getAuthHeaders(),
        timeout: 30000,
      });

      const resData = response.data?.data && typeof response.data.data === 'object'
        ? response.data.data
        : response.data;
      const products: ProductItem[] =
        resData.products || resData.listings || resData.data?.products || resData.data || [];
      const total = resData.total || resData.totalListings || resData.data?.total || (Array.isArray(products) ? products.length : 0);
      return {
        success: true,
        source: 'api',
        data: {
          products: Array.isArray(products) ? products : [],
          total,
          page,
          limit,
          totalPages: resData.totalPages || resData.data?.totalPages || Math.ceil(total / limit) || 0,
        },
      };
    } catch (error) {
      console.error('[ProductService] API hatası:', error);
      return { success: false, error: 'Ürünler API\'den alınamadı', data: { products: [], total: 0, page, limit, totalPages: 0 } };
    }
  }

  slugToCategory(slug: string | number | null): string {
    if (!slug) return 'Kategori';
    if (typeof slug === 'number' || (typeof slug === 'string' && !isNaN(parseInt(slug)))) {
      return `Kategori ${parseInt(String(slug))}`;
    }
    return String(slug).toLowerCase().trim()
      .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ').replace('Is', 'İş').replace('Ve', 've');
  }

  async getProductById(id: string | number): Promise<SingleProductResult> {
    // Mock mod
    if (!USE_API) {
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        if (!this.products?.length) return { success: false, error: 'Ürün verisi bulunamadı', data: null };
        const pid = typeof id === 'string' ? parseInt(id) : id;
        if (!pid || isNaN(pid as number)) return { success: false, error: 'Geçersiz ürün ID', data: null };
        const product = this.products.find(p => p.id === pid || p.product_id === pid);
        if (!product) return { success: false, error: 'Ürün bulunamadı', data: null };
        return { success: true, data: product };
      } catch {
        return { success: false, error: 'Ürün detayı getirilirken hata oluştu', data: null };
      }
    }

    // Gerçek API — GET /api/v1/listings/{id}
    try {
      console.log(`[ProductService API] GET ${this.apiBaseUrl}/listings/${id}`);
      const response = await axios.get(`${this.apiBaseUrl}/listings/${id}`, {
        headers: this._getAuthHeaders(),
        timeout: 30000,
      });
      const product = response.data?.data || response.data;
      return { success: true, data: product };
    } catch (error) {
      console.error('[ProductService] getProductById API hatası:', error);
      return { success: false, error: 'Ürün API\'den alınamadı', data: null };
    }
  }

  async getProductsByCategory(
    category: string | number | { category_id?: string | number },
    options: GetProductsParams = {}
  ): Promise<ProductsResult> {
    let categoryId: number | undefined;

    if (typeof category === 'number') categoryId = category;
    else if (typeof category === 'string' && !isNaN(parseInt(category))) categoryId = parseInt(category);
    else if (category && typeof category === 'object' && category.category_id) categoryId = parseInt(String(category.category_id));

    if (!categoryId || isNaN(categoryId)) {
      return { success: false, error: 'Geçerli bir kategori ID bulunamadı', data: { products: [], total: 0, page: options.page || 1, limit: options.limit || 10, totalPages: 0 } };
    }

    // Mock mod
    if (!USE_API) {
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        const subs = this._getAllSubcategoryIds(categoryId);
        const allIds = [categoryId, ...subs];

        let allProducts: ProductItem[] = [];
        for (const catId of allIds) {
          allProducts.push(...this.products.filter(p => p.category_id === catId));
        }

        const { page = 1, limit = 10 } = options;
        const filtered = this._applyFilters(allProducts, options);
        const start = (page - 1) * limit;
        const paginated = filtered.slice(start, start + limit);

        return {
          success: true, source: 'mock',
          data: { products: paginated, total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) }
        };
      } catch {
        return { success: false, error: 'Kategoriye göre ürünler alınırken hata oluştu', data: { products: [], total: 0, page: options.page || 1, limit: options.limit || 10, totalPages: 0 } };
      }
    }

    // Gerçek API
    return this.getProducts({ ...options, category_id: categoryId });
  }

  async getProductsByCity(city: string, opts: { page?: number; limit?: number } = {}): Promise<ProductsResult> {
    return this.getProducts({ city, page: opts.page || 1, limit: opts.limit || 10 });
  }

  async getProductsByListingType(listingType: string, opts: { page?: number; limit?: number } = {}): Promise<ProductsResult> {
    return this.getProducts({ listingType, page: opts.page || 1, limit: opts.limit || 10 });
  }

  async getPopularProducts(limit = 5): Promise<{ success: boolean; data?: ProductItem[]; error?: string }> {
    if (!USE_API) {
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        const shuffled = [...this.products].filter(p => p.status === 'active').sort(() => 0.5 - Math.random());
        return { success: true, data: shuffled.slice(0, limit) };
      } catch {
        return { success: false, error: 'Popüler ürünler getirilirken hata oluştu' };
      }
    }

    try {
      // /products/popular yok → listings + sort=popular
      console.log(`[ProductService API] GET ${this.apiBaseUrl}/listings?sort=popular&page_size=${limit}`);
      const response = await axios.get(`${this.apiBaseUrl}/listings`, {
        params: { sort: 'popular', page_size: limit, page: 1 },
        headers: this._getAuthHeaders(),
        timeout: 30000,
      });
      const body = response.data?.data || response.data;
      const list = body?.listings || body?.products || body || [];
      return { success: true, data: Array.isArray(list) ? list : [] };
    } catch (error) {
      console.error('[ProductService] getPopularProducts API hatası:', error);
      return { success: false, error: 'Popüler ürünler API\'den alınamadı' };
    }
  }

  async getSimilarProducts(productId: string | number, limit = 4): Promise<{ success: boolean; data?: ProductItem[]; error?: string }> {
    if (!USE_API) {
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        const product = this.products.find(p => p.id === parseInt(String(productId)));
        if (!product) return { success: false, error: 'Ürün bulunamadı' };
        let similar = this.products.filter(p => p.id !== parseInt(String(productId)) && p.category_id === product.category_id).slice(0, limit);
        if (similar.length < limit) {
          const others = this.products.filter(p => p.id !== parseInt(String(productId)) && p.category_id !== product.category_id)
            .sort(() => 0.5 - Math.random()).slice(0, limit - similar.length);
          similar = [...similar, ...others];
        }
        return { success: true, data: similar };
      } catch {
        return { success: false, error: 'Benzer ürünler getirilirken hata oluştu' };
      }
    }

    try {
      console.log(`[ProductService API] GET ${this.apiBaseUrl}/listings/${productId}/similar`);
      const response = await axios.get(`${this.apiBaseUrl}/listings/${productId}/similar`, {
        params: { limit },
        headers: this._getAuthHeaders(),
        timeout: 30000,
      });
      return { success: true, data: response.data?.data || response.data || [] };
    } catch (error) {
      console.error('[ProductService] getSimilarProducts API hatası:', error);
      return { success: false, error: 'Benzer ürünler API\'den alınamadı' };
    }
  }

  async addToFavorites(productId: number | string): Promise<{ success: boolean }> {
    if (!USE_API) return { success: true };
    try {
      // favoriteService: POST /api/v1/favorites/add
      await axios.post(
        `${this.apiBaseUrl}/favorites/add`,
        { listing_id: productId },
        { headers: this._getAuthHeaders() }
      );
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async removeFromFavorites(productId: number | string): Promise<{ success: boolean }> {
    if (!USE_API) return { success: true };
    try {
      // favoriteService: DELETE /api/v1/favorites/remove/{listingId}
      await axios.delete(`${this.apiBaseUrl}/favorites/remove/${productId}`, {
        headers: this._getAuthHeaders(),
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  }
}

// Singleton
const productService = new ProductService();
export default productService;

// ---- EK EXPORT'LAR (ilan detay sayfası için) ----

export const fetchProductDetail = async (productId: string | number) => {
  if (!USE_API) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: true, data: generateFakeProduct(productId) };
  }
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    console.log(`[ProductService API] GET ${API_BASE_URL}/listings/${productId}`);
    const response = await axios.get(`${API_BASE_URL}/listings/${productId}`, {
      headers,
      timeout: 30000,
    });
    return { success: true, data: response.data?.data || response.data };
  } catch (error) {
    console.error('Ürün detayları çekilirken hata:', error);
    return { success: false, error: 'Ürün detayları yüklenemedi.' };
  }
};

export const fetchSimilarProducts = async (categoryId: string | number, productId: string | number) => {
  if (!USE_API) {
    await new Promise(resolve => setTimeout(resolve, 600));
    const pid = parseInt(String(productId));
    return {
      success: true,
      data: Array.from({ length: 4 }, (_, i) => ({
        id: pid + i + 100,
        title: `Benzer İlan ${i + 1}`,
        price: Math.floor(Math.random() * 5000000) + 1000000,
        location: ['İstanbul/Beşiktaş', 'İstanbul/Kadıköy', 'Ankara/Çankaya', 'İzmir/Karşıyaka'][i % 4],
        images: [`https://picsum.photos/id/${pid + i + 10}/400/300`],
        date: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
        isPromoted: Math.random() > 0.7,
      })),
    };
  }
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    console.log(`[ProductService API] GET ${API_BASE_URL}/listings/${productId}/similar`);
    const response = await axios.get(`${API_BASE_URL}/listings/${productId}/similar`, {
      params: { category_id: categoryId, limit: 4 },
      headers,
      timeout: 30000,
    });
    return { success: true, data: response.data?.data || response.data || [] };
  } catch (error) {
    console.error('Benzer ürünler çekilirken hata:', error);
    return { success: false, error: 'Benzer ürünler yüklenemedi.' };
  }
};

export const toggleFavorite = async (productId: string | number) => {
  if (!USE_API) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, message: 'İşlem başarılı' };
  }
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // toggle yok → add (UI state'e göre remove ayrı çağrılmalı; favoriteService tercih)
    console.log(`[ProductService API] POST ${API_BASE_URL}/favorites/add`);
    await axios.post(
      `${API_BASE_URL}/favorites/add`,
      { listing_id: productId },
      { headers }
    );
    return { success: true, message: 'İşlem başarılı' };
  } catch (error) {
    console.error('Favori işleminde hata:', error);
    return { success: false, error: 'Favori işlemi başarısız oldu.' };
  }
};
