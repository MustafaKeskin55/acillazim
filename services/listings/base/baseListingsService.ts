/**
 * Base Listings Service
 * Tüm listing servislerinin kullandığı ortak metotları içerir
 *
 * USE_API = false  → JSON mock data (data/üründat.json, data/categroies_data.json)
 * USE_API = true   → Gerçek API (axios)
 *
 * Path alias yok: /api/listings veya localhost:3000/api/listings kullanılmaz
 *   → GET /api/v1/listings?...
 *   → GET /api/v1/listings/{id}
 *
 * Performans: Tüm pahalı hesaplamalar module-level singleton cache'de tutulur.
 * Aynı process içinde yalnızca bir kez çalışır.
 */
import { decodeHtmlEntities, getListingPrimaryImageUrl } from '@/services/listings/util/listingUtils';
import axios from 'axios';
import { USE_API } from '@/api/config';
import urunData from '@/data/üründat.json';
import kategoriData from '@/data/categroies_data.json';

/** Host normalize → {host}/api/v1 */
function resolveListingsApiBase(): string {
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

// ================================================================
// TIPLER
// ================================================================

interface IlanKonum {
  il?: string;
  ilce?: string;
  mahalle?: string;
  koordinatlar?: unknown;
}

interface IlanItem {
  ilan_id?: number | string;
  baslik?: string;
  fiyat?: number;
  para_birimi?: string;
  category_id?: number | string;
  vitrin_durumu?: string | string[];
  ilan_turu?: string;
  ilan_tarihi?: string;
  konum?: IlanKonum;
  resimler?: string[];
  ozellikler?: Record<string, unknown>;
  [key: string]: unknown;
}

interface IlanData {
  ilanlari?: IlanItem[];
}

export interface KategoriItem {
  category_id?: number | string;
  parent_id?: number | string | null;
  label?: string;
  name?: string;
  type?: string;
  webUrl?: string;
  [key: string]: unknown;
}

interface KategoriMapEntry {
  id: number | string;
  anaKategori: string;
  anaKategoriId: number | string | null;
  parentId: number | string | null;
  name: string;
  label: string;
  path: string[];
  type: string | null;
}

export interface DuzenlenmisIlan {
  id?: number | string;
  ilan_id?: number | string;
  category_id?: number | string;
  baslik?: string;
  title?: string;
  fiyat?: number;
  price?: number;
  para_birimi?: string;
  currency?: string;
  kategori?: string;
  categories?: string;
  kategoriYolu?: string[];
  alt_kategori?: string;
  alt_alt_kategori?: string;
  alt_alt_alt_kategori?: string;
  subcategory?: string;
  sub_subcategory?: string;
  il?: string;
  ilce?: string;
  mahalle?: string;
  sehir?: string;
  city?: string;
  location?: string;
  koordinatlar?: unknown;
  coordinates?: unknown;
  ilanTuru?: string;
  ilan_turu?: string;
  listingType?: string;
  resim?: string | null;
  img?: string | null;
  resimler?: string[];
  images?: string[];
  tarih?: string;
  date?: string;
  ilan_tarihi?: string;
  created_at?: string;
  ozellikler?: Record<string, unknown>;
  [key: string]: unknown;
}

interface GetListingsParams {
  categoryId?: number | string;
  page?: number;
  pageSize?: number;
  includeSubcategories?: boolean;
  [key: string]: unknown;
}

interface ListingsResult {
  listings: DuzenlenmisIlan[];
  totalListings: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  [key: string]: unknown;
}

export interface CategoryPath {
  mainCategory: { id: number | string; name: string; slug: string };
  subCategory: { id: number | string; name: string; slug: string };
  path: string[];
}

type KategoriMap = Record<string | number, KategoriMapEntry>;

// ================================================================
// MODULE-LEVEL SINGLETON CACHE
// Tüm instance'lar bu cache'i paylaşır — yalnızca bir kez hesaplanır
// ================================================================

let _cachedKategoriMap: KategoriMap | null = null;
let _cachedChildrenMap: Map<number, number[]> | null = null;
let _cachedAllListings: DuzenlenmisIlan[] | null = null;

/** Kategori map'i bir kez build eder, sonraki çağrılarda cache döner */
function _getOrBuildKategoriMap(): KategoriMap {
  if (_cachedKategoriMap) return _cachedKategoriMap;

  const categories = Array.isArray(kategoriData) ? (kategoriData as KategoriItem[]) : [];
  const map: KategoriMap = {};

  // Hızlı lookup için id → category index map
  const idIndex = new Map<number | string, KategoriItem>();
  for (const cat of categories) {
    if (cat.category_id !== undefined) idIndex.set(Number(cat.category_id), cat);
  }

  // Root kategori label map
  const rootLabelMap = new Map<number | string, string>();
  for (const cat of categories) {
    if (cat.parent_id === null && cat.category_id !== undefined) {
      rootLabelMap.set(Number(cat.category_id), cat.label || cat.name || '');
    }
  }

  // Root'u bul — recursive yerine iterative (stack overflow riski yok)
  const findRoot = (catId: number | string): number | string | null => {
    let id: number | string | null = Number(catId);
    let depth = 20;
    while (id !== null && depth-- > 0) {
      const cat = idIndex.get(Number(id));
      if (!cat) return null;
      if (cat.parent_id === null) return Number(cat.category_id);
      id = Number(cat.parent_id);
    }
    return id;
  };

  // Path build — iterative
  const buildPath = (catId: number | string): string[] => {
    const path: string[] = [];
    let id: number | string | null = Number(catId);
    let depth = 20;
    while (id !== null && depth-- > 0) {
      const cat = idIndex.get(Number(id));
      if (!cat) break;
      const label = cat.label || cat.name || '';
      if (label) path.unshift(label);
      id = cat.parent_id !== null ? Number(cat.parent_id) : null;
    }
    return path;
  };

  for (const cat of categories) {
    if (!cat.category_id) continue;
    const catId = Number(cat.category_id);
    const parentId = cat.parent_id !== null && cat.parent_id !== undefined ? Number(cat.parent_id) : null;
    const label = cat.label || cat.name || '';
    const rootId = parentId === null ? catId : findRoot(catId);
    const rootLabel = rootId !== null ? rootLabelMap.get(rootId) || '' : '';

    map[catId] = {
      id: catId,
      anaKategori: rootLabel,
      anaKategoriId: rootId,
      parentId,
      name: label,
      label,
      path: buildPath(catId),
      type: cat.type || null,
    };
  }

  _cachedKategoriMap = map;
  return map;
}

/** parent_id → [child_id, ...] map'i bir kez build eder */
function _getOrBuildChildrenMap(): Map<number, number[]> {
  if (_cachedChildrenMap) return _cachedChildrenMap;

  const categories = Array.isArray(kategoriData) ? (kategoriData as KategoriItem[]) : [];
  const map = new Map<number, number[]>();

  for (const cat of categories) {
    if (cat.category_id === undefined || cat.parent_id === null || cat.parent_id === undefined) continue;
    const parentId = Number(cat.parent_id);
    const catId = Number(cat.category_id);
    const existing = map.get(parentId);
    if (existing) existing.push(catId);
    else map.set(parentId, [catId]);
  }

  _cachedChildrenMap = map;
  return map;
}

/** Tüm işlenmiş ilanları bir kez build eder */
function _getOrBuildAllListings(service: BaseListingsService): DuzenlenmisIlan[] {
  if (_cachedAllListings) return _cachedAllListings;

  const data = urunData as IlanData;
  if (!data.ilanlari || !Array.isArray(data.ilanlari)) {
    _cachedAllListings = [];
    return _cachedAllListings;
  }

  _cachedAllListings = data.ilanlari
    .map((ilan) => service._ilanDuzenle(ilan))
    .filter((ilan): ilan is DuzenlenmisIlan => ilan !== null);

  return _cachedAllListings;
}

// ================================================================
// CLASS
// ================================================================

class BaseListingsService {
  apiBaseUrl: string = resolveListingsApiBase();

  // ============================================================
  // YARDIMCI
  // ============================================================

  _shuffleArray<T>(array: T[]): T[] {
    const shuffledArray = [...array];
    for (let i = shuffledArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray;
  }

  _formatCategoryName(categoryLabel: string): string {
    return categoryLabel || '';
  }

  // ============================================================
  // KATEGORİ — hepsi singleton cache üzerinden çalışır
  // ============================================================

  _getCategories(): KategoriItem[] {
    return Array.isArray(kategoriData) ? (kategoriData as KategoriItem[]) : [];
  }

  _buildCategoryMap(_categories?: KategoriItem[]): KategoriMap {
    return _getOrBuildKategoriMap();
  }

  getKategoriAdi(kategoriId: number | string): string {
    if (!kategoriId) return '';
    try {
      return _getOrBuildKategoriMap()[Number(kategoriId)]?.anaKategori || '';
    } catch { return ''; }
  }

  getKategoriSlug(kategoriId: number | string): string {
    if (!kategoriId) return '';
    try {
      const map = _getOrBuildKategoriMap();
      const entry = map[Number(kategoriId)];
      if (!entry?.anaKategoriId) return '';
      const cats = Array.isArray(kategoriData) ? (kategoriData as KategoriItem[]) : [];
      const root = cats.find((c) => Number(c.category_id) === Number(entry.anaKategoriId));
      return root?.webUrl ? root.webUrl.replace(/^\//, '') : '';
    } catch { return ''; }
  }

  getKategoriYolu(kategoriId: number | string): string[] {
    if (!kategoriId) return [];
    try {
      return _getOrBuildKategoriMap()[Number(kategoriId)]?.path || [];
    } catch { return []; }
  }

  /**
   * Verilen kategori ID'sinin tüm alt (ve kendisi dahil) ID'lerini döner.
   * Children map üzerinden BFS — O(n) değil O(k) (k = bu ağacın büyüklüğü).
   */
  _getAllCategoryIds(
    categoryId: number | string,
    _categories?: KategoriItem[] | null
  ): (number | string)[] {
    if (!categoryId) return [];
    const childrenMap = _getOrBuildChildrenMap();
    const result: number[] = [];
    const queue: number[] = [Number(categoryId)];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      const children = childrenMap.get(current);
      if (children) queue.push(...children);
    }
    return result;
  }

  // ============================================================
  // İLAN DÜZENLEME
  // ============================================================

  _ilanDuzenle(ilan: IlanItem): DuzenlenmisIlan | null {
    if (!ilan) return null;

    let ilanTipi = 'normal';
    if (ilan.ilan_turu && typeof ilan.ilan_turu === 'string') {
      const turMetni = ilan.ilan_turu.toLowerCase();
      if (turMetni.includes('acil')) ilanTipi = 'acil';
      else if (turMetni.includes('jet')) ilanTipi = 'jet';
      else if (turMetni.includes('yeni')) ilanTipi = 'yeni';
    }

    const kategoriId = ilan.category_id;
    const konumBilgisi = {
      il: ilan.konum?.il || 'Belirtilmemiş',
      ilce: ilan.konum?.ilce || '',
      mahalle: ilan.konum?.mahalle || '',
      koordinatlar: ilan.konum?.koordinatlar || null,
    };

    const resolvedPrimary = getListingPrimaryImageUrl(ilan as unknown as Record<string, unknown>);
    const resimlerNormalized =
      ilan.resimler && ilan.resimler.length > 0 ? ilan.resimler : resolvedPrimary ? [resolvedPrimary] : [];
    const thumb = resimlerNormalized[0] || null;

    const baseIlan = {
      id: ilan.ilan_id,
      ilan_id: ilan.ilan_id,
      baslik: ilan.baslik,
      title: ilan.baslik,
      fiyat: ilan.fiyat,
      price: ilan.fiyat,
      para_birimi: ilan.para_birimi || 'TL',
      currency: ilan.para_birimi || 'TL',
      il: konumBilgisi.il,
      ilce: konumBilgisi.ilce,
      mahalle: konumBilgisi.mahalle,
      sehir: konumBilgisi.il,
      city: konumBilgisi.il,
      location: `${konumBilgisi.il}${konumBilgisi.ilce ? ', ' + konumBilgisi.ilce : ''}`,
      koordinatlar: konumBilgisi.koordinatlar,
      coordinates: konumBilgisi.koordinatlar,
      ilanTuru: ilan.ilan_turu,
      ilan_turu: ilan.ilan_turu,
      listingType: ilanTipi,
      resim: thumb,
      img: thumb,
      resimler: resimlerNormalized,
      images: [...resimlerNormalized],
      tarih: ilan.ilan_tarihi,
      date: ilan.ilan_tarihi,
      ilan_tarihi: ilan.ilan_tarihi,
      created_at: ilan.ilan_tarihi,
      ozellikler: ilan.ozellikler || {},
    };

    if (!kategoriId) {
      return { ...baseIlan, kategori: '', categories: '', kategoriYolu: [], alt_kategori: '', alt_alt_kategori: '', subcategory: '', sub_subcategory: '' };
    }

    const kategoriAdi = this.getKategoriAdi(kategoriId);
    const kategoriYolu = this.getKategoriYolu(kategoriId);

    return {
      ...baseIlan,
      category_id: kategoriId,
      kategori: kategoriAdi,
      categories: kategoriAdi,
      kategoriYolu,
      alt_kategori: kategoriYolu[1] || '',
      alt_alt_kategori: kategoriYolu[2] || '',
      alt_alt_alt_kategori: kategoriYolu[3] || '',
      subcategory: kategoriYolu[1] || '',
      sub_subcategory: kategoriYolu[2] || '',
    };
  }

  // ============================================================
  // MOCK DATA FONKSİYONLARI
  // ============================================================

  getAllListings(limit = 50, shuffle = true): DuzenlenmisIlan[] {
    const all = _getOrBuildAllListings(this);
    const result = shuffle ? this._shuffleArray([...all]) : [...all];
    return result.slice(0, limit);
  }

  _getListingsFromMockData(params: GetListingsParams = {}): ListingsResult {
    try {
      const { categoryId, page = 1, pageSize = 30, includeSubcategories = true } = params;
      const allListings = _getOrBuildAllListings(this);

      let filteredListings: DuzenlenmisIlan[];

      if (categoryId) {
        if (includeSubcategories) {
          // BFS tabanlı — çok hızlı
          const categoryIdSet = new Set(
            this._getAllCategoryIds(Number(categoryId)).map(Number)
          );
          filteredListings = allListings.filter(
            (ilan) => ilan.category_id !== undefined && categoryIdSet.has(Number(ilan.category_id))
          );
        } else {
          const cid = Number(categoryId);
          filteredListings = allListings.filter(
            (ilan) => Number(ilan.category_id) === cid
          );
        }
      } else {
        filteredListings = allListings;
      }

      const totalListings = filteredListings.length;
      const startIndex = (page - 1) * pageSize;
      const paginatedListings = filteredListings.slice(startIndex, startIndex + pageSize);
      const totalPages = Math.ceil(totalListings / pageSize);

      return { listings: paginatedListings, totalListings, currentPage: page, totalPages, pageSize };
    } catch (error) {
      console.error('[BaseListingsService] Mock data ile ilan getirme hatası:', error);
      return { listings: [], totalListings: 0, currentPage: 1, totalPages: 0, pageSize: params.pageSize || 30 };
    }
  }

  _getListingFromMockData(id: number | string): DuzenlenmisIlan | null {
    try {
      const data = urunData as IlanData;
      if (!data.ilanlari || !Array.isArray(data.ilanlari)) return null;
      const ilan = data.ilanlari.find((item) => item.ilan_id === id);
      if (!ilan) return null;
      return this._ilanDuzenle(ilan);
    } catch (error) {
      console.error('[BaseListingsService] Mock data ile ilan detayı getirme hatası:', error);
      return null;
    }
  }

  // ============================================================
  // KATEGORİ YOLU (Async - API modu için)
  // ============================================================

  async getCategoryPath(categoryId: number | string): Promise<CategoryPath | null> {
    if (!categoryId) return null;
    try {
      const map = _getOrBuildKategoriMap();
      const categoryInfo = map[Number(categoryId)];
      if (!categoryInfo) return null;

      const categories = Array.isArray(kategoriData) ? (kategoriData as KategoriItem[]) : [];
      const rootCategory = categories.find((cat) => Number(cat.category_id) === Number(categoryInfo.anaKategoriId));
      const mainCategory = {
        id: categoryInfo.anaKategoriId || categoryId,
        name: categoryInfo.anaKategori || '',
        slug: rootCategory?.webUrl ? rootCategory.webUrl.replace(/^\//, '') : '',
      };
      const subCategory = {
        id: categoryId,
        name: categoryInfo.name || '',
        slug: categoryInfo.name ? categoryInfo.name.toLowerCase().replace(/\s+/g, '-') : '',
      };
      return { mainCategory, subCategory, path: categoryInfo.path || [mainCategory.name] };
    } catch (error) {
      console.error('Kategori bilgisi alınırken hata:', error);
      return null;
    }
  }

  // ============================================================
  // API FONKSİYONLARI
  // ============================================================

  processListing(listing: DuzenlenmisIlan): DuzenlenmisIlan {
    if (!listing) return listing;
    const result = { ...listing };
    if (result.title || result.baslik) result.title = decodeHtmlEntities(result.title || result.baslik || '');
    if (result.baslik) result.baslik = decodeHtmlEntities(result.baslik);
    if (result.il) result.il = decodeHtmlEntities(result.il);
    if (result.ilce) result.ilce = decodeHtmlEntities(result.ilce);
    if (result.konum) {
      const konum = result.konum as IlanKonum;
      if (konum.il) konum.il = decodeHtmlEntities(konum.il);
      if (konum.ilce) konum.ilce = decodeHtmlEntities(konum.ilce);
    }

    const primary = getListingPrimaryImageUrl(result as Record<string, unknown>);
    if (primary) {
      result.img = primary;
      result.resim = primary;
      const existing = Array.isArray(result.resimler) ? result.resimler : [];
      if (existing.length === 0) {
        result.resimler = [primary];
        result.images = [primary];
      }
    }

    return result;
  }

  async getListings(params: GetListingsParams = {}): Promise<ListingsResult | null> {
    if (!USE_API) {
      return this._getListingsFromMockData(params);
    }

    const endpoint = `${this.apiBaseUrl}/listings`;
    // v1 query isimleri (alias yok: categoryId/pageSize/includeSubcategories gönderilmez)
    const pageSize = (params.pageSize as number) || 30;
    const apiParams: Record<string, unknown> = {
      page: params.page || 1,
      page_size: pageSize,
      include_descendants:
        params.includeSubcategories !== undefined ? params.includeSubcategories : true,
    };
    if (params.categoryId !== undefined && params.categoryId !== null) {
      apiParams.category_id = params.categoryId;
    }
    if (params.vitrin_durumu !== undefined) apiParams.vitrin_durumu = params.vitrin_durumu;
    if (params.il !== undefined) apiParams.il = params.il;
    if (params.ilce !== undefined) apiParams.ilce = params.ilce;
    if (params.lat !== undefined) apiParams.lat = params.lat;
    if (params.lng !== undefined) apiParams.lng = params.lng;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      console.log(`[Listings API] GET ${endpoint}`, apiParams);
      const response = await axios.get(endpoint, { params: apiParams, headers, timeout: 30000 });

      if (response?.data) {
        const body = response.data.data && typeof response.data.data === 'object' && !Array.isArray(response.data.data)
          ? response.data.data
          : response.data;
        const listings = body.listings || (Array.isArray(response.data.data) ? response.data.data : []) || [];
        const processedListings: DuzenlenmisIlan[] = Array.isArray(listings)
          ? listings.map((listing: DuzenlenmisIlan) => this.processListing(listing))
          : [];
        return {
          listings: processedListings,
          totalListings: body.totalListings || body.total || response.data.totalListings || processedListings.length,
          currentPage: body.currentPage || params.page || 1,
          totalPages: body.totalPages || body.total_pages || response.data.totalPages || 1,
          pageSize,
          ...body,
        };
      }
      return null;
    } catch (error: unknown) {
      const axiosError = error as { message?: string; response?: { data?: unknown; status?: number }; request?: unknown };
      this.handleError('Listings', error as Error);
      throw {
        message: (axiosError.response?.data as { message?: string })?.message || axiosError.message || "API'ye bağlanılamadı",
        status: axiosError.response?.status,
        isNetworkError: !axiosError.response,
      };
    }
  }

  async getListing(id: number | string): Promise<DuzenlenmisIlan | null> {
    if (!USE_API) {
      return this._getListingFromMockData(id);
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const endpoint = `${this.apiBaseUrl}/listings/${id}`;
      console.log(`[Listings API] GET ${endpoint}`);
      const response = await axios.get(endpoint, { headers, timeout: 30000 });
      if (response?.data) {
        return this.processListing(response.data.data || response.data);
      }
      return null;
    } catch (error) {
      this.handleError('Listing Detail', error as Error);
      return null;
    }
  }

  handleError(operation: string, error: Error & { response?: { data?: unknown; status?: number }; request?: unknown }): void {
    if (error.response) {
      console.error(`[BaseListingsService] API Hatası (${error.response.status}):`, error.response.data);
    } else if (error.request) {
      console.error('[BaseListingsService] Ağ hatası - API yanıt vermiyor');
    } else {
      console.error(`[BaseListingsService] ${operation} hatası:`, error.message);
    }
  }
}

export default BaseListingsService;
