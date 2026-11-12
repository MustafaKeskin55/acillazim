/**
 * Nearby Listings Service (Çevremdeki İlanlar Servisi)
 *
 * USE_API = false  → getAllListings() ile JSON mock data kullanır (synchronous)
 * USE_API = true   → GET /api/v1/listings?il=...&ilce=... (filtre BE'de olmalı)
 *
 * Path alias yok: /api/listings/nearby kullanılmaz.
 * Geçiş: api/config.ts dosyasındaki USE_API flag'ini değiştir.
 */
import BaseListingsService from '@/services/listings/base/baseListingsService';
import { USE_API } from '@/api/config';

interface KonumListing {
  id?: number | string;
  city?: string;
  il?: string;
  ilce?: string;
  konum?: { il?: string; ilce?: string };
  location?: string;
  sehir?: string;
  [key: string]: unknown;
}

interface GeoLocation {
  lat?: number;
  lng?: number;
}

class NearbyListingsService extends BaseListingsService {

  // ============================================================
  // ORTAK YARDIMCI: tüm ilanları mock veya API'den getirir
  // ============================================================

  async _getAllListingsAsync(limit = 1000): Promise<KonumListing[]> {
    if (!USE_API) {
      // Mock mod: synchronous JSON okuma
      return this.getAllListings(limit, false) as KonumListing[];
    }
    // API mod
    try {
      const result = await this.getListings({ page: 1, pageSize: limit });
      return (result?.listings || []) as KonumListing[];
    } catch {
      return [];
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  async getListingsByCity(sehir: string, limit = 15): Promise<KonumListing[]> {
    if (!sehir) return [];

    if (USE_API) {
      const result = await this.getListings({ page: 1, pageSize: limit, il: sehir });
      return (this._shuffleArray(result?.listings || []) as KonumListing[]).slice(0, limit);
    }

    const tumIlanlar = await this._getAllListingsAsync(1000);
    const normalSehir = sehir.toLowerCase();

    const sehirIlanlari = tumIlanlar.filter((ilan) => {
      if (!ilan.city) return false;
      const normalIlanSehir = ilan.city.toLowerCase();
      if (normalSehir.includes('istanbul')) {
        if (normalSehir === 'istanbul') return normalIlanSehir.includes('istanbul');
        return normalIlanSehir.includes(normalSehir) || normalSehir.includes(normalIlanSehir);
      }
      return normalIlanSehir === normalSehir;
    });

    return (this._shuffleArray(sehirIlanlari) as KonumListing[]).slice(0, limit);
  }

  async getListingsByDistrict(ilce: string, limit = 10): Promise<KonumListing[]> {
    if (!ilce) return [];

    if (USE_API) {
      const result = await this.getListings({ page: 1, pageSize: limit, ilce });
      return (this._shuffleArray(result?.listings || []) as KonumListing[]).slice(0, limit);
    }

    const tumIlanlar = await this._getAllListingsAsync(100);
    const normalIlce = ilce.toLowerCase();

    const ilceIlanlari = tumIlanlar.filter(
      (ilan) => ilan.ilce && ilan.ilce.toLowerCase() === normalIlce
    );

    return (this._shuffleArray(ilceIlanlari) as KonumListing[]).slice(0, limit);
  }

  async getNearbyListingsByLocation(konum: GeoLocation, limit = 20): Promise<KonumListing[]> {
    if (!konum || !konum.lat || !konum.lng) return [];

    if (USE_API) {
      const result = await this.getListings({
        page: 1,
        pageSize: limit,
        lat: konum.lat,
        lng: konum.lng,
      });
      return (result?.listings || []) as KonumListing[];
    }

    const tumIlanlar = await this._getAllListingsAsync(100);
    const ilanlarYakinlikSkoru = tumIlanlar.map((ilan) => ({
      ...ilan,
      yakinlikSkoru: Math.random()
    }));

    const sirali = ilanlarYakinlikSkoru
      .sort((a, b) => b.yakinlikSkoru - a.yakinlikSkoru)
      .slice(0, limit)
      .map(({ yakinlikSkoru: _, ...ilan }) => ilan as KonumListing);

    return sirali;
  }

  async getRecommendedListings(sehir: string, limit = 15): Promise<KonumListing[]> {
    if (!sehir) {
      const tumIlanlar = await this._getAllListingsAsync(limit);
      return this._shuffleArray(tumIlanlar).slice(0, limit) as KonumListing[];
    }

    const sehirIlanlari = await this.getListingsByCity(sehir, limit);

    if (sehirIlanlari.length < limit) {
      const eksikSayi = limit - sehirIlanlari.length;
      const tumIlanlar = await this._getAllListingsAsync(100);
      const diger = tumIlanlar.filter(
        (ilan) => !sehirIlanlari.some((s) => s.id === ilan.id)
      );
      return [...sehirIlanlari, ...(this._shuffleArray(diger) as KonumListing[]).slice(0, eksikSayi)];
    }

    return sehirIlanlari;
  }
}

const nearbyListingsService = new NearbyListingsService();
export default nearbyListingsService;
