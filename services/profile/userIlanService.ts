/**
 * userIlanService.ts - Kullanıcı ilanlarını simüle eden API servisi
 * Mock: üründat.json | BaseListingsService kategori hiyerarşisi
 *
 * Path alias yok:
 *   GET /api/v1/users/{userId}/listings
 *   veya GET /api/v1/listings?user_id={userId}
 * userListingsService ile birleştirilmeli.
 */

import urunData from '@/data/üründat.json';
import BaseListingsService from '@/services/listings/base/baseListingsService';

/** Host normalize → {host}/api/v1 */
function resolveUserIlanApiBase(): string {
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

const API_BASE_URL = resolveUserIlanApiBase();

// ---- TİP TANIMLARI ----
interface IlanRecord {
  ilan_id: number;
  user_id: number;
  category_id?: number;
  kategori?: string;
  categories?: string;
  goster_kategori?: string;
  display_category?: string;
  kategoriYolu?: string[];
  category_path?: string[];
  metadata?: { categories?: unknown };
  fiyat?: number | string;
  ilan_tarihi?: string;
  ilan_turu?: string;
  [key: string]: unknown;
}

interface IlanDataFile {
  ilanlari: IlanRecord[];
}

interface UserIlanParams {
  category?: string;
  categoryName?: string | null;
  mainCategory?: string | null;
  status?: string;
  priceMin?: string | number | null;
  priceMax?: string | number | null;
  dateStart?: string | null;
  dateEnd?: string | null;
  sort?: string;
  page?: string | number;
  limit?: string | number;
}

interface ApiConfig {
  USE_MOCK: boolean;
  MOCK_DELAY: boolean;
  DELAY_MS: { min: number; max: number };
}

interface UserIlanResult {
  success: boolean;
  message: string;
  error?: { code: string; details?: string };
  data: {
    listings: IlanRecord[];
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
    filters: {
      status: string;
      category: string;
      priceRange: { min: string | number | null; max: string | number | null };
      dateRange: { start: Date | null; end: Date | null };
      sort: string;
    };
  } | null;
}

// ---- YAPILANDIRMA ----
const API_CONFIG: ApiConfig = {
  USE_MOCK: false, // Canlı BE
  MOCK_DELAY: true,
  DELAY_MS: { min: 200, max: 500 }
};

const listingService = new BaseListingsService();

// ---- YARDIMCI ----

const kategoriIsmiEslesiyor = (ilan: IlanRecord, kategoriIsmi: string | null): boolean => {
  if (!kategoriIsmi || !ilan) return false;

  const aranan = kategoriIsmi.toLowerCase();

  const ilanKat = (ilan.kategori || ilan.categories || '').toString().toLowerCase();
  if (ilanKat === aranan) return true;

  const kartKat = (ilan.goster_kategori || ilan.display_category || '').toString().toLowerCase();
  if (kartKat === aranan) return true;

  if (ilan.kategoriYolu && Array.isArray(ilan.kategoriYolu)) {
    if (ilan.kategoriYolu.some(k => k.toString().toLowerCase() === aranan)) return true;
  }

  if (ilan.category_path && Array.isArray(ilan.category_path)) {
    if (ilan.category_path.some(cat => cat.toString().toLowerCase() === aranan)) return true;
  }

  if (ilan.metadata?.categories) {
    const metaCats = Array.isArray(ilan.metadata.categories) ? ilan.metadata.categories : [ilan.metadata.categories];
    if (metaCats.some((cat: unknown) =>
      (typeof cat === 'string' && cat.toLowerCase() === aranan) ||
      (typeof cat === 'object' && cat !== null && (cat as { name?: string }).name?.toLowerCase() === aranan)
    )) return true;
  }

  if (ilan.category_id) {
    const anaKat = listingService.getKategoriAdi(ilan.category_id);
    if (anaKat && anaKat.toLowerCase() === aranan) return true;

    const katYolu = listingService.getKategoriYolu(ilan.category_id);
    if (katYolu && Array.isArray(katYolu)) {
      return katYolu.some((cat: string) => cat.toString().toLowerCase() === aranan);
    }
  }

  return false;
};

const apiRequest = async (userId: string | number): Promise<IlanDataFile> => {
  if (API_CONFIG.USE_MOCK) {
    if (API_CONFIG.MOCK_DELAY) {
      const delay = Math.floor(Math.random() * (API_CONFIG.DELAY_MS.max - API_CONFIG.DELAY_MS.min + 1)) + API_CONFIG.DELAY_MS.min;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    console.log(`[UserIlan API] Mock — hedef: ${API_BASE_URL}/users/{userId}/listings`);
    return urunData as unknown as IlanDataFile;
  }

  const url = `${API_BASE_URL}/users/${userId}/listings`;
  console.log(`[UserIlan API] GET ${url}`);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Kullanıcı ilanları alınamadı (HTTP ${response.status})`);
  const json = await response.json();
  const body = (json && typeof json === 'object' && 'data' in json ? json.data : json) as
    | IlanDataFile
    | { listings?: IlanRecord[]; items?: IlanRecord[] };
  const ilanlari = (body as IlanDataFile)?.ilanlari
    || (body as { listings?: IlanRecord[] })?.listings
    || (body as { items?: IlanRecord[] })?.items
    || [];
  return { ilanlari };
};

const sanitizeData = <T>(data: T): T => {
  if (typeof data === 'string') return data.replace(/[<>]/g, '') as unknown as T;
  if (typeof data === 'object' && data !== null) {
    const result = (Array.isArray(data) ? [] : {}) as Record<string, unknown>;
    for (const key in data as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = sanitizeData((data as Record<string, unknown>)[key]);
      }
    }
    return result as T;
  }
  return data;
};

// ---- ANA FONKSİYON ----

const getUserIlanlar = async (userId: string | number, params: UserIlanParams = {}): Promise<UserIlanResult> => {
  try {
    console.log('[UserIlanService] Kullanıcı ilanları yükleniyor, ID:', userId);
    console.log(`[UserIlan API] Hedef path: GET ${API_BASE_URL}/users/${userId}/listings`);

    if (!userId) throw new Error("Kullanıcı ID'si gerekli");
    const userIdNum = parseInt(String(userId).trim(), 10);
    if (isNaN(userIdNum) || userIdNum <= 0) throw new Error('Geçersiz kullanıcı kimliği');

    const validated = {
      category: params.category ? String(params.category).trim() : 'all',
      categoryName: params.categoryName || null,
      mainCategory: params.mainCategory || null,
      status: params.status ? String(params.status).trim() : 'active',
      priceMin: params.priceMin ? parseFloat(String(params.priceMin)) : null,
      priceMax: params.priceMax ? parseFloat(String(params.priceMax)) : null,
      dateStart: params.dateStart ? new Date(params.dateStart) : null,
      dateEnd: params.dateEnd ? new Date(params.dateEnd) : null,
      sort: (['date_desc', 'date_asc', 'price_desc', 'price_asc'] as string[]).includes(params.sort || '') ? params.sort! : 'date_desc',
      page: params.page && !isNaN(parseInt(String(params.page))) ? Math.max(1, parseInt(String(params.page))) : 1,
      limit: params.limit && !isNaN(parseInt(String(params.limit))) ? Math.min(50, Math.max(1, parseInt(String(params.limit)))) : 20
    };

    const data = await apiRequest(userIdNum);
    if (!data?.ilanlari || !Array.isArray(data.ilanlari)) throw new Error('Geçersiz veri formatı');

    const ilanlar = sanitizeData(data.ilanlari) || [];

    // Mock modda tüm üründat.json'dan userId'ye göre client-side filtrelemek gerekir.
    // Gerçek API'de istek zaten /users/{userId}/listings'e atıldığı için BE sonucu
    // önceden kullanıcıya göre süzülmüştür — tekrar user_id filtresi uygulamıyoruz
    // (BE yanıtı user_id alanı döndürmese bile kayıtlar yanlışlıkla elenmesin).
    let userIlanlar = API_CONFIG.USE_MOCK
      ? ilanlar.filter((ilan: IlanRecord) => ilan?.user_id === userIdNum)
      : ilanlar;

    // Kategori bilgilerini ekle
    userIlanlar = userIlanlar.map((ilan: IlanRecord) => {
      if ((!ilan.kategoriYolu || !ilan.kategori) && ilan.category_id !== undefined) {
        const katYolu = listingService.getKategoriYolu(ilan.category_id);
        ilan.kategoriYolu = katYolu;
        const anaKat = listingService.getKategoriAdi(ilan.category_id);
        ilan.kategori = anaKat;
        ilan.categories = anaKat;
      }
      return ilan;
    });

    // Filtreler
    if (validated.category !== 'all') {
      const cid = parseInt(validated.category, 10);
      userIlanlar = userIlanlar.filter((ilan: IlanRecord) => ilan.category_id === cid);
    }
    if (validated.categoryName) {
      userIlanlar = userIlanlar.filter((ilan: IlanRecord) => kategoriIsmiEslesiyor(ilan, validated.categoryName));
    }
    if (validated.mainCategory) {
      userIlanlar = userIlanlar.filter((ilan: IlanRecord) => kategoriIsmiEslesiyor(ilan, validated.mainCategory));
    }
    if (validated.priceMin !== null) {
      userIlanlar = userIlanlar.filter((ilan: IlanRecord) => ilan.fiyat && parseFloat(String(ilan.fiyat)) >= validated.priceMin!);
    }
    if (validated.priceMax !== null) {
      userIlanlar = userIlanlar.filter((ilan: IlanRecord) => ilan.fiyat && parseFloat(String(ilan.fiyat)) <= validated.priceMax!);
    }
    if (validated.dateStart && !isNaN(validated.dateStart.getTime())) {
      userIlanlar = userIlanlar.filter((ilan: IlanRecord) => {
        if (!ilan.ilan_tarihi) return false;
        const d = new Date(ilan.ilan_tarihi);
        return !isNaN(d.getTime()) && d >= validated.dateStart!;
      });
    }
    if (validated.dateEnd && !isNaN(validated.dateEnd.getTime())) {
      userIlanlar = userIlanlar.filter((ilan: IlanRecord) => {
        if (!ilan.ilan_tarihi) return false;
        const d = new Date(ilan.ilan_tarihi);
        return !isNaN(d.getTime()) && d <= validated.dateEnd!;
      });
    }

    // Sıralama
    switch (validated.sort) {
      case 'date_desc':
        userIlanlar.sort((a: IlanRecord, b: IlanRecord) => new Date(b.ilan_tarihi || 0).getTime() - new Date(a.ilan_tarihi || 0).getTime());
        break;
      case 'date_asc':
        userIlanlar.sort((a: IlanRecord, b: IlanRecord) => new Date(a.ilan_tarihi || 0).getTime() - new Date(b.ilan_tarihi || 0).getTime());
        break;
      case 'price_desc':
        userIlanlar.sort((a: IlanRecord, b: IlanRecord) => parseFloat(String(b.fiyat || 0)) - parseFloat(String(a.fiyat || 0)));
        break;
      case 'price_asc':
        userIlanlar.sort((a: IlanRecord, b: IlanRecord) => parseFloat(String(a.fiyat || 0)) - parseFloat(String(b.fiyat || 0)));
        break;
    }

    // Sayfalama
    const start = (validated.page - 1) * validated.limit;
    const paginated = userIlanlar.slice(start, start + validated.limit);

    return {
      success: true,
      message: 'Kullanıcı ilanları başarıyla getirildi',
      data: {
        listings: paginated,
        pagination: {
          total: userIlanlar.length,
          page: validated.page,
          pageSize: validated.limit,
          totalPages: Math.ceil(userIlanlar.length / validated.limit) || 1
        },
        filters: {
          status: validated.status,
          category: validated.category,
          priceRange: { min: validated.priceMin, max: validated.priceMax },
          dateRange: { start: validated.dateStart, end: validated.dateEnd },
          sort: validated.sort
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message || 'İlanlar yüklenirken bir hata oluştu',
      error: { code: 'SERVICE_ERROR', details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined },
      data: null
    };
  }
};

const configureApi = (config: Partial<ApiConfig> = {}): void => {
  Object.assign(API_CONFIG, config);
  console.log('[UserIlanService] API yapılandırması güncellendi');
};

const userIlanService = {
  getUserIlanlar,
  configureApi,
  _dev: {
    loadAllData: async (): Promise<IlanRecord[]> => {
      if (process.env.NODE_ENV !== 'production') {
        return (urunData as unknown as IlanDataFile).ilanlari || [];
      }
      return [];
    }
  }
};

export default userIlanService;
