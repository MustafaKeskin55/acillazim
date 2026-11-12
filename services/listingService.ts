/**
 * @file: listingService.ts
 * @description: İlan CRUD + görsel (kök facade).
 *
 * Path alias yok: /listings, /api/listings (v1’siz) kullanılmaz
 *   → POST   /api/v1/listings
 *   → PUT    /api/v1/listings/{id}
 *   → DELETE /api/v1/listings/{id}
 *   → POST   /api/v1/listings/images
 *   → DELETE /api/v1/listings/images/{imageId}
 *
 * Tercih edilen kaynak: services/createListing (CreateListingService)
 */

import { validateListingData } from '@/utils/formUtils';

interface ListingData {
  [key: string]: unknown;
}

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

const API_BASE_URL = resolveListingsApiBase();
const USE_MOCK = false; // Canlı BE

function authHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (json) headers['Content-Type'] = 'application/json';
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function unwrapData(json: unknown): unknown {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: unknown }).data;
  }
  return json;
}

export class ListingService {
  /**
   * Yeni ilan oluşturur
   * Hedef: POST /api/v1/listings
   */
  static async createListing(listingData: ListingData): Promise<unknown> {
    try {
      validateListingData(listingData);
      console.log(`[ListingService] Hedef path: POST ${API_BASE_URL}/listings`);

      if (USE_MOCK) {
        console.warn('USE_MOCK=true — createListing simüle edildi');
        return { id: `mock_${Date.now()}`, ...listingData };
      }

      const response = await fetch(`${API_BASE_URL}/listings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify((() => { const p = { ...listingData }; if ('packages' in p) { if (!p.pricing_packages && !p.pricingPackages) p.pricing_packages = p.packages; delete p.packages; } return p; })()),
      });
      if (!response.ok) throw new Error(`İlan oluşturulamadı: ${response.status}`);
      return unwrapData(await response.json());
    } catch (error) {
      console.error('İlan oluşturulurken hata:', error);
      throw error;
    }
  }

  /**
   * İlan resimlerini yükler
   * Hedef: POST /api/v1/listings/images
   */
  static async uploadListingImages(images: File[]): Promise<unknown> {
    try {
      console.log(`[ListingService] Hedef path: POST ${API_BASE_URL}/listings/images`);

      if (USE_MOCK) {
        console.warn('USE_MOCK=true — uploadListingImages simüle edildi');
        return images.map((_, i) => ({ id: `img_mock_${Date.now()}_${i}`, url: '' }));
      }

      const formData = new FormData();
      images.forEach((image, index) => {
        formData.append('images', image);
        formData.append(`order_${index}`, String(index));
      });

      const response = await fetch(`${API_BASE_URL}/listings/images`, {
        method: 'POST',
        headers: authHeaders(false),
        body: formData,
      });
      if (!response.ok) throw new Error(`Görsel yüklenemedi: ${response.status}`);
      return unwrapData(await response.json());
    } catch (error) {
      console.error('Resimler yüklenirken hata:', error);
      throw error;
    }
  }

  /**
   * İlan günceller
   * Hedef: PUT /api/v1/listings/{listingId}
   */
  static async updateListing(listingId: number, listingData: ListingData): Promise<unknown> {
    try {
      if (
        listingData.baslik &&
        listingData.aciklama &&
        listingData.fiyat !== undefined &&
        listingData.il
      ) {
        try {
          validateListingData(listingData as any);
        } catch (valErr) {
          console.warn('[ListingService] validation warning on update:', valErr);
        }
      }
      console.log(`[ListingService] Hedef path: PUT ${API_BASE_URL}/listings/${listingId}`);

      if (USE_MOCK) {
        console.warn('USE_MOCK=true — updateListing simüle edildi');
        return { id: listingId, ...listingData };
      }

      const response = await fetch(`${API_BASE_URL}/listings/${listingId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify((() => { const p = { ...listingData }; if ('packages' in p) { if (!p.pricing_packages && !p.pricingPackages) p.pricing_packages = p.packages; delete p.packages; } return p; })()),
      });
      if (!response.ok) {
        let msg = `İlan güncellenemedi: ${response.status}`;
        try {
          const errJson = await response.json();
          msg = errJson?.message || errJson?.error || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      return unwrapData(await response.json());
    } catch (error) {
      console.error('İlan güncellenirken hata:', error);
      throw error;
    }
  }

  /**
   * İlan siler
   * Hedef: DELETE /api/v1/listings/{listingId}
   */
  static async deleteListing(listingId: number): Promise<void> {
    try {
      console.log(`[ListingService] Hedef path: DELETE ${API_BASE_URL}/listings/${listingId}`);

      if (USE_MOCK) {
        console.warn('USE_MOCK=true — deleteListing no-op');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/listings/${listingId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error(`İlan silinemedi: ${response.status}`);
    } catch (error) {
      console.error('İlan silinirken hata:', error);
      throw error;
    }
  }

  /**
   * İlan resmi siler
   * Hedef: DELETE /api/v1/listings/images/{imageId}
   */
  static async deleteImage(imageId: number): Promise<void> {
    try {
      console.log(`[ListingService] Hedef path: DELETE ${API_BASE_URL}/listings/images/${imageId}`);

      if (USE_MOCK) {
        console.warn('USE_MOCK=true — deleteImage no-op');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/listings/images/${imageId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error(`Görsel silinemedi: ${response.status}`);
    } catch (error) {
      console.error('Resim silinirken hata:', error);
      throw error;
    }
  }

  /**
   * Giriş yapmış kullanıcının kendi ilanlarını getirir (dashboard için).
   * Not: Bu endpoint /api/v1/listings altında değil, mobil/legacy ListingController'da
   * (/api/listings) tanımlı — DTO şekli (categoryName, viewCount, favoriteCount, active, createdAt)
   * dashboard ihtiyaçlarıyla birebir örtüştüğü için burası kullanılıyor.
   * Hedef: GET /api/listings/user/{userId}
   */
  static async getUserListings(userId: number, size = 50): Promise<unknown[]> {
    try {
      const legacyBase = API_BASE_URL.replace(/\/api\/v1$/, '/api');
      console.log(`[ListingService] Hedef path: GET ${legacyBase}/listings/user/${userId}`);

      const response = await fetch(`${legacyBase}/listings/user/${userId}?size=${size}`, {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error(`Kullanıcı ilanları alınamadı: ${response.status}`);
      const data = unwrapData(await response.json()) as { content?: unknown[] } | unknown[];
      if (Array.isArray(data)) return data;
      return data?.content ?? [];
    } catch (error) {
      console.error('Kullanıcı ilanları alınırken hata:', error);
      return [];
    }
  }
}
