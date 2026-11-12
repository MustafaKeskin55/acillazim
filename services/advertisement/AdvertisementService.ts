import axios from 'axios';

/** Host normalize → {host}/api/v1 */
function resolveAdvertisementApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api/v1';
  if (/\/api\/v1$/i.test(raw)) return raw;
  const host = raw
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/v1\/?$/i, '');
  return `${host}/api/v1`;
}

// API v1 — path alias yok (ör. /api/advertisements kullanılmaz)
const API_URL = resolveAdvertisementApiBase();
const USE_MOCK = false; // Canlı BE
const FAKE_DELAY = 800; // API simülasyonu için gecikme süresi

interface FetchOptions {
  token?: string;
  [key: string]: unknown;
}

interface FakeResponse {
  data: {
    success: boolean;
    data: unknown;
    message: string;
  };
  status: number;
  statusText: string;
}

interface AdvertisementModule {
  getActiveAdvertisements?: (token: string) => unknown;
  getAdvertisementsByCategory?: (token: string, categoryId: string) => unknown;
  advertisements?: unknown[];
  [key: string]: unknown;
}

/**
 * Gerçek API olana kadar JSON dosyasından veri çeken simüle fonksiyon
 * Gerçek API entegrasyonunda bu fonksiyon kaldırılır
 */
const fakeFetch = async (endpoint: string, options: FetchOptions = {}): Promise<FakeResponse> => {
  return new Promise((resolve, reject) => {
    // Gerçek API simülasyonu için gecikme
    setTimeout(async () => {
      try {
        // Gerçek API'ye geçişte kolaylık olması için axios benzeri yapı
        const response = await import('@/data/advertisementData').then(
          (module: AdvertisementModule) => {
            // advertisementData içindeki verilere erişiyoruz
            if (endpoint.includes('active')) {
              // Sadece aktif reklamları getirme
              return module.getActiveAdvertisements?.(options?.token || '');
            } else if (endpoint.includes('category')) {
              // Kategori ID'sine göre reklamları getirme
              const categoryId = endpoint.split('/').pop() || '';
              return module.getAdvertisementsByCategory?.(options?.token || '', categoryId);
            } else {
              // Tüm reklamları getirme
              return module.advertisements || [];
            }
          }
        );

        // API formatında cevap döndür
        resolve({
          data: {
            success: true,
            data: response || [],
            message: 'Advertisements fetched successfully'
          },
          status: 200,
          statusText: 'OK'
        });
      } catch (error: unknown) {
        console.error('[Advertisement Service] Error fetching data:', error);
        reject({
          data: {
            success: false,
            data: null,
            message: (error as Error).message || 'Failed to fetch advertisements'
          },
          status: 500,
          statusText: 'Internal Server Error'
        });
      }
    }, FAKE_DELAY);
  });
};

/**
 * API isteklerini yönetecek fonksiyon
 * Şu anda fakeFetch kullanıyor ama gerçek API geldiğinde axios'a geçilecek
 */
const apiRequest = async (
  method: string,
  endpoint: string,
  data: unknown = null,
  options: FetchOptions = {}
): Promise<unknown> => {
  // Authorization token'ı varsa header'a ekle
  const headers: Record<string, string> = {};
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  try {
    if (!USE_MOCK) {
      console.log(`[Advertisement Service] ${method.toUpperCase()} ${API_URL}${endpoint}`);
      const response = await axios({
        method,
        url: `${API_URL}${endpoint}`,
        data,
        headers,
      });
      const body = response.data;
      if (body && typeof body === 'object' && 'success' in body) {
        if (body.success) return body;
        throw new Error(body.message || 'Bir hata oluştu');
      }
      return { success: true, data: body?.data ?? body, message: 'OK' };
    }

    const response = (await fakeFetch(endpoint, options)) as FakeResponse;

    // API yanıtını işle
    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.message || 'Bir hata oluştu');
    }
  } catch (error) {
    console.error(`[Advertisement Service] ${method.toUpperCase()} ${endpoint} failed:`, error);
    throw error;
  }
};

/**
 * Reklam servisi sınıfı
 * API modeline uygun tasarlandı
 */
class AdvertisementService {
  /**
   * Tüm reklamları getir
   * @param options - İstek seçenekleri
   * @returns Reklam listesi
   */
  async getAllAdvertisements(options: FetchOptions = {}): Promise<unknown> {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') || undefined : undefined;
    return await apiRequest('get', '/advertisements', null, { ...options, token });
  }

  /**
   * Aktif reklamları getir
   * @param options - İstek seçenekleri
   * @returns Aktif reklam listesi
   */
  async getActiveAdvertisements(options: FetchOptions = {}): Promise<unknown> {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') || undefined : undefined;
    return await apiRequest('get', '/advertisements/active', null, { ...options, token });
  }

  /**
   * Kategoriye göre reklamları getir
   * @param categoryId - Kategori ID
   * @param options - İstek seçenekleri
   * @returns Kategoriye ait reklam listesi
   */
  async getAdvertisementsByCategory(
    categoryId: string | number,
    options: FetchOptions = {}
  ): Promise<unknown> {
    if (!categoryId) {
      throw new Error('Kategori ID gerekli');
    }

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') || undefined : undefined;
    return await apiRequest('get', `/advertisements/category/${categoryId}`, null, {
      ...options,
      token
    });
  }

  /**
   * Özel bölge reklamlarını getir
   * @param zone - Reklam bölgesi (banner, sidebar, vb.)
   * @param options - İstek seçenekleri
   * @returns Bölgeye ait reklam listesi
   */
  async getAdvertisementsByZone(zone: string, options: FetchOptions = {}): Promise<unknown> {
    if (!zone) {
      throw new Error('Reklam bölgesi belirtilmedi');
    }

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') || undefined : undefined;
    return await apiRequest('get', `/advertisements/zone/${zone}`, null, { ...options, token });
  }

  /**
   * Tek bir reklamı getir
   * @param adId - Reklam ID
   * @param options - İstek seçenekleri
   * @returns Reklam detayları
   */
  async getAdvertisementById(
    adId: string | number,
    options: FetchOptions = {}
  ): Promise<unknown> {
    if (!adId) {
      throw new Error('Reklam ID gerekli');
    }

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') || undefined : undefined;
    return await apiRequest('get', `/advertisements/${adId}`, null, { ...options, token });
  }

  /**
   * Reklam tıklama takibi
   * @param adId - Reklam ID
   * @returns İşlem sonucu
   */
  async trackAdvertisementClick(adId: string | number): Promise<unknown> {
    if (!adId) {
      throw new Error('Reklam ID gerekli');
    }

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') || undefined : undefined;
    return await apiRequest('post', `/advertisements/${adId}/click`, null, { token });
  }

  /**
   * Reklam görüntülenme takibi
   * @param adId - Reklam ID
   * @returns İşlem sonucu
   */
  async trackAdvertisementView(adId: string | number): Promise<unknown> {
    if (!adId) {
      throw new Error('Reklam ID gerekli');
    }

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') || undefined : undefined;
    return await apiRequest('post', `/advertisements/${adId}/view`, null, { token });
  }
}

// Singleton pattern - tek bir servis örneği oluştur
const advertisementService = new AdvertisementService();
export default advertisementService;
