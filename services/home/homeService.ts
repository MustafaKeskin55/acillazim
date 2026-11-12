// homeService.ts - Ana sayfa ilan facade'ı
// Gerçek API: listings alt servisleri → GET /api/v1/listings?vitrin_durumu=...
// Path alias yok: /api/home veya /api/listings/featured kullanılmaz

import { featuredListingsService, vitrinListingsService } from '@/services/listings';

/** Host normalize → {host}/api/v1 */
function resolveHomeApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  if (!raw) return '/api/v1';
  const host = raw
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/v1\/?$/, '');
  return `${host}/api/v1`;
}

const API_BASE_URL = resolveHomeApiBase();
// Hedef path'ler (listings servisleri USE_API=true iken):
// `${API_BASE_URL}/listings?vitrin_durumu=one_cikan&page_size=20`
// `${API_BASE_URL}/listings?vitrin_durumu=vitrin&page_size=24`

interface HomePageData {
  featuredListings: unknown[];
  vitrinListings: unknown[];
}

/**
 * İlanları ilgili verilerle birlikte getiren ana servis
 * Geriye dönük uyumluluk için yeniden yapılandırılmış servisler kullanılıyor
 */
const homeService = {
  /**
   * Öne çıkan ilanları getirir
   * @param limit - Maksimum ilan sayısı
   * @returns Öne çıkan ilanlar dizisi
   */
  async getFeaturedListings(limit = 20): Promise<unknown[]> {
    try {
      console.log(`[Home API] Hedef path: ${API_BASE_URL}/listings?vitrin_durumu=one_cikan`);
      return await (featuredListingsService as unknown as { getFeaturedListings: (l: number) => Promise<unknown[]> }).getFeaturedListings(limit);
    } catch (error) {
      console.error('❌ Öne çıkan ilanlar alınırken hata:', error);
      return [];
    }
  },

  /**
   * Vitrin ilanlarını getirir
   * @param limit - Maksimum ilan sayısı
   * @returns Vitrin ilanları
   */
  async getVitrinListings(limit = 24): Promise<unknown[]> {
    try {
      console.log(`[Home API] Hedef path: ${API_BASE_URL}/listings?vitrin_durumu=vitrin`);
      return await (vitrinListingsService as unknown as { getVitrinListings: (l: number) => Promise<unknown[]> }).getVitrinListings(limit);
    } catch (error) {
      console.error('❌ Vitrin ilanları alınırken hata:', error);
      return [];
    }
  },

  /**
   * Tüm ana sayfa verilerini tek seferde getirir
   * @returns Ana sayfa verileri
   */
  async getHomePageData(): Promise<HomePageData> {
    try {
      const [featured, vitrin] = await Promise.all([
        this.getFeaturedListings(),
        this.getVitrinListings()
      ]);

      return {
        featuredListings: featured,
        vitrinListings: vitrin
      };
    } catch (error) {
      console.error('❌ Ana sayfa verileri alınırken hata:', error);
      return {
        featuredListings: [],
        vitrinListings: []
      };
    }
  }
};

export default homeService;
