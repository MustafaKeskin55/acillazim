import {
  fetchPopularServices,
  fetchPopularServicesByCategory,
  fetchPopularServiceCategories
} from '@/services/popularServices/popularServicesAPI';

/**
 * Popüler Hizmetler Servis Sınıfı
 * Üst düzey API yönetimi ve önbellekleme işlemleri.
 * Gerçek veri: popularServicesAPI → GET /api/v1/listings?is_service=true&...
 * Path alias yok: /api/popular-services kullanılmaz.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PopularServicesOptions {
  limit?: number;
  sortBy?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  [key: string]: unknown;
}

interface ServiceStats {
  cacheSize: number;
  cacheTimeout: number;
}

class PopularServicesService {
  private cache: Map<string, CacheEntry<unknown>>;
  private cacheTimeout: number;

  constructor() {
    // Basit önbellek sistemi
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 dakika

    console.log('🎯 PopularServicesService başlatıldı');
  }

  /**
   * Önbellek anahtarı oluşturur
   * @private
   */
  _getCacheKey(method: string, params: Record<string, unknown> = {}): string {
    return `${method}_${JSON.stringify(params)}`;
  }

  /**
   * Önbellekten veri al
   * @private
   */
  _getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`📦 Önbellekten veri alındı: ${key}`);
      return cached.data;
    }
    return null;
  }

  /**
   * Veriyi önbelleğe kaydet
   * @private
   */
  _setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`💾 Veri önbelleğe kaydedildi: ${key}`);
  }

  /**
   * Popüler hizmetleri getirir (önbellekli)
   * @param options - Filtreleme seçenekleri
   * @returns Popüler hizmetler
   */
  async getPopularServices(options: PopularServicesOptions = {}): Promise<unknown[]> {
    const cacheKey = this._getCacheKey('popularServices', options as Record<string, unknown>);

    // Önce önbellekten kontrol et
    const cached = this._getFromCache<unknown[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('🚀 PopularServicesService.getPopularServices çağrıldı:', options);

      const services = await fetchPopularServices(options);

      // Başarılı sonucu önbelleğe kaydet
      this._setCache(cacheKey, services);

      return services;
    } catch (error) {
      console.error('❌ PopularServicesService.getPopularServices hatası:', error);
      throw error;
    }
  }

  /**
   * Kategoriye göre popüler hizmetleri getirir
   * @param categoryId - Kategori ID
   * @param options - Filtreleme seçenekleri
   * @returns Kategoriye ait popüler hizmetler
   */
  async getPopularServicesByCategory(categoryId: number, options: PopularServicesOptions = {}): Promise<unknown[]> {
    const cacheKey = this._getCacheKey('servicesByCategory', { categoryId, ...options });

    // Önce önbellekten kontrol et
    const cached = this._getFromCache<unknown[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log(`🎯 PopularServicesService.getPopularServicesByCategory çağrıldı: ${categoryId}`);

      const services = await fetchPopularServicesByCategory(categoryId, options);

      // Başarılı sonucu önbelleğe kaydet
      this._setCache(cacheKey, services);

      return services;
    } catch (error) {
      console.error('❌ PopularServicesService.getPopularServicesByCategory hatası:', error);
      throw error;
    }
  }

  /**
   * En popüler hizmet kategorilerini getirir
   * @param limit - Getirilecek kategori sayısı
   * @returns Popüler kategoriler
   */
  async getPopularServiceCategories(limit = 8): Promise<unknown[]> {
    const cacheKey = this._getCacheKey('popularCategories', { limit });

    // Önce önbellekten kontrol et
    const cached = this._getFromCache<unknown[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('📊 PopularServicesService.getPopularServiceCategories çağrıldı');

      const categories = await fetchPopularServiceCategories(limit);

      // Başarılı sonucu önbelleğe kaydet
      this._setCache(cacheKey, categories);

      return categories;
    } catch (error) {
      console.error('❌ PopularServicesService.getPopularServiceCategories hatası:', error);
      throw error;
    }
  }

  /**
   * Kaydırma için popüler hizmetleri getirir (özel optimizasyon)
   * @param options - Kaydırma seçenekleri
   * @returns Kaydırma için optimize edilmiş hizmetler
   */
  async getServicesForCarousel(options: PopularServicesOptions = {}): Promise<unknown[]> {
    const carouselOptions: PopularServicesOptions = {
      limit: 15, // Carousel için daha fazla ilan
      sortBy: 'popular',
      ...options
    };

    return await this.getPopularServices(carouselOptions);
  }

  /**
   * Şehre göre popüler hizmetleri getirir
   * @param city - Şehir adı
   * @param options - Ek filtreleme seçenekleri
   * @returns Şehre göre popüler hizmetler
   */
  async getPopularServicesByCity(city: string, options: PopularServicesOptions = {}): Promise<unknown[]> {
    const cityOptions: PopularServicesOptions = {
      city,
      limit: 10,
      sortBy: 'popular',
      ...options
    };

    return await this.getPopularServices(cityOptions);
  }

  /**
   * Fiyat aralığına göre popüler hizmetleri getirir
   * @param minPrice - Minimum fiyat
   * @param maxPrice - Maksimum fiyat
   * @param options - Ek filtreleme seçenekleri
   * @returns Fiyat aralığına göre popüler hizmetler
   */
  async getPopularServicesByPriceRange(
    minPrice: number,
    maxPrice: number,
    options: PopularServicesOptions = {}
  ): Promise<unknown[]> {
    const priceOptions: PopularServicesOptions = {
      minPrice,
      maxPrice,
      limit: 10,
      sortBy: 'price',
      ...options
    };

    return await this.getPopularServices(priceOptions);
  }

  /**
   * Önbelleği temizler
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 PopularServicesService önbelleği temizlendi');
  }

  /**
   * Servis istatistiklerini getirir
   * @returns İstatistik bilgileri
   */
  getStats(): ServiceStats {
    return {
      cacheSize: this.cache.size,
      cacheTimeout: this.cacheTimeout
    };
  }
}

// Singleton instance oluştur
const popularServicesService = new PopularServicesService();

export default popularServicesService;
