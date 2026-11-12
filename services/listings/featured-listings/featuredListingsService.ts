/**
 * Featured Listings Service (Öne Çıkan İlanlar Servisi)
 *
 * USE_API = false  → data/üründat.json'dan öne çıkan ilanları çeker
 * USE_API = true   → GET /api/v1/listings?vitrin_durumu=one_cikan
 *
 * Path alias yok: /api/listings/featured kullanılmaz.
 * Geçiş: api/config.ts dosyasındaki USE_API flag'ini değiştir.
 */
import BaseListingsService from '@/services/listings/base/baseListingsService';
import { USE_API } from '@/api/config';
import urunData from '@/data/üründat.json';

interface IlanItem {
  ilan_id?: number | string;
  baslik?: string;
  fiyat?: number;
  konum?: Record<string, unknown>;
  vitrin_durumu?: string | string[];
  isOneCikan?: boolean;
  isVitrin?: boolean;
  [key: string]: unknown;
}

interface IlanData {
  ilanlari?: IlanItem[];
}

interface Cache {
  featuredListings: IlanItem[] | null;
  lastFetch: number | null;
  expiryTime: number;
}

class FeaturedListingsService extends BaseListingsService {
  _cache: Cache = {
    featuredListings: null,
    lastFetch: null,
    expiryTime: 5 * 60 * 1000
  };

  _isOneCikan(vitrinDurumu: string | string[] | undefined): boolean {
    if (!vitrinDurumu) return false;
    if (typeof vitrinDurumu === 'string') return vitrinDurumu === 'one_cikan';
    if (Array.isArray(vitrinDurumu)) return vitrinDurumu.includes('one_cikan');
    return false;
  }

  _validateIlan(ilan: IlanItem): boolean {
    try {
      const requiredFields = ['ilan_id', 'baslik', 'fiyat', 'konum'];
      const hasAllRequired = requiredFields.every((field) => ilan[field] !== undefined);
      if (!hasAllRequired) return false;
      if (typeof ilan.fiyat !== 'number' || ilan.fiyat < 0) return false;
      if (!ilan.vitrin_durumu) return false;
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // MOCK: JSON'dan öne çıkan ilanlar
  // ============================================================

  async _fetchFeaturedListingsMock(): Promise<IlanItem[]> {
    const tumIlanlar = (urunData as IlanData).ilanlari || [];
    const oneCikanIlanlar = tumIlanlar.filter((ilan) => {
      if (!this._validateIlan(ilan)) return false;
      return this._isOneCikan(ilan.vitrin_durumu);
    });

    return oneCikanIlanlar.map((ilan) => ({
      ...ilan,
      isOneCikan: true,
      isVitrin: Array.isArray(ilan.vitrin_durumu)
        ? ilan.vitrin_durumu.includes('vitrin')
        : ilan.vitrin_durumu === 'vitrin'
    }));
  }

  // ============================================================
  // API: Gerçek endpoint'ten öne çıkan ilanlar
  // ============================================================

  async _fetchFeaturedListingsApi(): Promise<IlanItem[]> {
    const result = await this.getListings({
      page: 1,
      pageSize: 100,
      vitrin_durumu: 'one_cikan',
    });
    const raw = result?.listings || [];

    return raw.map((ilan) => ({
      ...ilan,
      isOneCikan: true,
      isVitrin: Array.isArray(ilan.vitrin_durumu)
        ? (ilan.vitrin_durumu as string[]).includes('vitrin')
        : ilan.vitrin_durumu === 'vitrin',
    })) as IlanItem[];
  }

  _isCacheValid(): boolean {
    return (
      this._cache.featuredListings !== null &&
      this._cache.lastFetch !== null &&
      Date.now() - this._cache.lastFetch < this._cache.expiryTime
    );
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  async getFeaturedListings(limit = 20, onlyVitrin = false): Promise<IlanItem[]> {
    try {
      // Önbellek kontrolü
      if (this._isCacheValid()) {
        const cachedIlanlar = this._cache.featuredListings!;
        const filtered = onlyVitrin ? cachedIlanlar.filter((i) => i.isVitrin) : cachedIlanlar;
        return filtered.slice(0, limit);
      }

      // Mock veya API'den çek
      const ilanlar = !USE_API
        ? await this._fetchFeaturedListingsMock()
        : await this._fetchFeaturedListingsApi();

      const karisikIlanlar = this._shuffleArray(ilanlar) as IlanItem[];

      // Önbelleğe kaydet
      this._cache.featuredListings = karisikIlanlar;
      this._cache.lastFetch = Date.now();

      const filtered = onlyVitrin ? karisikIlanlar.filter((i) => i.isVitrin) : karisikIlanlar;
      return filtered.slice(0, limit);
    } catch (error) {
      console.error('❌ Öne çıkan ilanlar getirilirken hata:', error);
      if (this._cache.featuredListings) {
        const cachedIlanlar = this._cache.featuredListings;
        const filtered = onlyVitrin ? cachedIlanlar.filter((i) => i.isVitrin) : cachedIlanlar;
        return filtered.slice(0, limit);
      }
      throw error;
    }
  }

  clearCache(): void {
    this._cache = { featuredListings: null, lastFetch: null, expiryTime: 5 * 60 * 1000 };
  }
}

const featuredListingsService = new FeaturedListingsService();
export default featuredListingsService;
