/**
 * ServiceAreasContext / harita akışı için servis bölgeleri API'si.
 *
 * Path alias yok: /api/service-areas kullanılmaz
 *   → GET    /api/v1/listings/{listingId}/service-areas
 *   → PUT    /api/v1/listings/{listingId}/service-areas
 *   → DELETE /api/v1/listings/{listingId}/service-areas
 *
 * Not: Bu modül listingId taşımıyor (global store); listing bazlı path henüz
 * ilan context'inden geçirilmiyor — canlıya geçişte ilan ID'si eklenmeli.
 * USE_MOCK=false iken çağıranlar listingId'yi de sağlamalıdır (bkz. TODO aşağıda).
 */

const USE_MOCK = false; // Canlı BE

/** Host normalize → {host}/api/v1 (canlı fetch için) */
function resolveServiceAreasStoreApiBase(): string {
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

const API_BASE_URL = resolveServiceAreasStoreApiBase();

interface ServiceAreasStore {
  map?: unknown[];
  manual?: unknown[];
  [key: string]: unknown[] | undefined;
}

interface APIResult {
  success: boolean;
  message: string;
  data?: ServiceAreasStore;
}

interface APIError {
  error: string;
}

// Bellek içi veri deposu — yalnızca USE_MOCK=true iken kullanılır
let serviceAreas: ServiceAreasStore = { map: [], manual: [] };

// Token kontrolü (mock mod)
const validateToken = (token: string): boolean => {
  return Boolean(token && typeof token === 'string' && token.startsWith('service_'));
};

// API isteklerini simüle eden yardımcı fonksiyon (mock mod)
const simulateAPICall = <T>(token: string, callback: () => T): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (!validateToken(token)) {
      reject({ error: 'Geçersiz token. Oturum süresi dolmuş olabilir. Lütfen tekrar giriş yapın.' });
      return;
    }
    try {
      resolve(callback());
    } catch (error: unknown) {
      reject({ error: (error as Error).message || 'Bir hata oluştu.' });
    }
  });
};

function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// NOT: Gerçek listingId zorunlu — eskiden "current" placeholder default'u vardı,
// bu da GET /api/v1/listings/current/service-areas gibi geçersiz isteklere ve
// backend'de NumberFormatException (500) hatasına yol açıyordu. Artık listingId
// eksikse istek gönderilmeden hemen anlaşılır bir hata fırlatılıyor.
const LISTING_PATH = (listingId?: string | number) => {
  if (listingId == null || listingId === '') {
    throw new Error(
      '[ServiceAreas API] listingId zorunludur (örn. /api/v1/listings/{listingId}/service-areas).'
    );
  }
  return `${API_BASE_URL}/listings/${listingId}/service-areas`;
};

// Tüm hizmet bölgelerini getir
// Hedef: GET /api/v1/listings/{listingId}/service-areas
export const getServiceAreas = async (token: string, listingId: string | number): Promise<ServiceAreasStore> => {
  if (!USE_MOCK) {
    const url = LISTING_PATH(listingId);
    console.log(`[ServiceAreas API] GET ${url}`);
    const response = await fetch(url, { headers: authHeaders(token) });
    if (!response.ok) throw new Error(`Hizmet bölgeleri alınamadı (HTTP ${response.status})`);
    const json = await response.json();
    return (json && typeof json === 'object' && 'data' in json ? json.data : json) as ServiceAreasStore;
  }
  return simulateAPICall(token, () => ({ ...serviceAreas }));
};

// Yeni hizmet bölgesi ekle/güncelle
// Hedef: PUT /api/v1/listings/{listingId}/service-areas
export const saveServiceAreas = async (
  token: string,
  type: string,
  areas: unknown[],
  listingId: string | number
): Promise<APIResult> => {
  if (!USE_MOCK) {
    const url = LISTING_PATH(listingId);
    console.log(`[ServiceAreas API] PUT ${url}`);
    const response = await fetch(url, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ type, areas }),
    });
    if (!response.ok) throw new Error(`Hizmet bölgeleri kaydedilemedi (HTTP ${response.status})`);
    const json = await response.json();
    const data = (json && typeof json === 'object' && 'data' in json ? json.data : json) as ServiceAreasStore;
    return { success: true, message: 'Hizmet bölgeleri başarıyla kaydedildi.', data };
  }
  return simulateAPICall(token, () => {
    serviceAreas[type] = [...areas];
    return { success: true, message: 'Hizmet bölgeleri başarıyla kaydedildi.', data: { ...serviceAreas } };
  });
};

// Hizmet bölgelerini sil
// Hedef: DELETE /api/v1/listings/{listingId}/service-areas?type=
export const deleteServiceAreas = async (
  token: string,
  type: string,
  listingId: string | number
): Promise<APIResult> => {
  if (!USE_MOCK) {
    const url = `${LISTING_PATH(listingId)}?type=${encodeURIComponent(type)}`;
    console.log(`[ServiceAreas API] DELETE ${url}`);
    const response = await fetch(url, { method: 'DELETE', headers: authHeaders(token) });
    if (!response.ok) throw new Error(`Hizmet bölgeleri silinemedi (HTTP ${response.status})`);
    return { success: true, message: `${type === 'map' ? 'Harita' : 'Manuel'} hizmet bölgeleri başarıyla silindi.` };
  }
  return simulateAPICall(token, () => {
    if (serviceAreas[type]) {
      serviceAreas[type] = [];
      return { success: true, message: `${type === 'map' ? 'Harita' : 'Manuel'} hizmet bölgeleri başarıyla silindi.` };
    } else {
      throw new Error('Belirtilen türde hizmet bölgesi bulunamadı.');
    }
  });
};

// Tüm hizmet bölgelerini sil
// Hedef: DELETE /api/v1/listings/{listingId}/service-areas
export const deleteAllServiceAreas = async (token: string, listingId: string | number): Promise<APIResult> => {
  if (!USE_MOCK) {
    const url = LISTING_PATH(listingId);
    console.log(`[ServiceAreas API] DELETE ${url}`);
    const response = await fetch(url, { method: 'DELETE', headers: authHeaders(token) });
    if (!response.ok) throw new Error(`Hizmet bölgeleri silinemedi (HTTP ${response.status})`);
    return { success: true, message: 'Tüm hizmet bölgeleri başarıyla silindi.' };
  }
  return simulateAPICall(token, () => {
    serviceAreas = { map: [], manual: [] };
    return { success: true, message: 'Tüm hizmet bölgeleri başarıyla silindi.' };
  });
};

// Örnek token oluşturucu - gerçek uygulamada bu sunucu tarafında yapılır
export const generateToken = (): string => {
  return `service_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
};
