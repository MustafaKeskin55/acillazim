/**
 * Popüler Lokasyonlar Servisi
 * USE_API yok — GET /api/v1/locations/popular. Hata durumunda mock'a
 * düşülmez; hata yukarı fırlatılır ki BE sorunları gizlenmesin.
 * Path alias yok: /api/locations/popular kullanılmaz.
 */

/** Host normalize → {host}/api/v1 */
function resolveLocationsApiBase(): string {
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

const API_BASE_URL = resolveLocationsApiBase();

interface City {
  id?: number | string;
  name?: string;
  slug?: string;
  [key: string]: unknown;
}

/**
 * Popüler Lokasyonlar Servisi
 */
class PopularLocationsService {
  private cities: City[];
  private isLoaded: boolean;

  constructor() {
    this.cities = [];
    this.isLoaded = false;
  }

  /**
   * Popüler şehirleri API'den alır. BE hata verirse (network/4xx/5xx)
   * sessizce mock'a düşmez — hatayı yukarı fırlatır.
   * @returns Şehir listesi
   */
  async fetchPopularCities(): Promise<City[]> {
    const apiUrl = `${API_BASE_URL}/locations/popular`;
    console.log(`[PopularLocations API] GET ${apiUrl}`);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Popüler şehirler API hatası: HTTP ${response.status}`);
    }

    const data = await response.json();
    const payload = data?.data && typeof data.data === 'object' ? data.data : data;
    this.cities = payload.popularCities || [];
    this.isLoaded = true;
    console.log("✅ Popüler şehirler API'den başarıyla alındı:", this.cities.length);
    return this.cities;
  }

  /**
   * Tüm popüler şehirleri getirir, eğer yüklenmemişse önce yükler
   * @returns Şehir listesi
   */
  async getPopularCities(): Promise<City[]> {
    if (!this.isLoaded) {
      return await this.fetchPopularCities();
    }
    return this.cities;
  }

  /**
   * ID'ye göre şehir arar
   * @param id - Şehir ID
   * @returns Şehir nesnesi veya null
   */
  async getCityById(id: number | string): Promise<City | null> {
    const cities = await this.getPopularCities();
    return cities.find((city) => city.id === id) || null;
  }

  /**
   * URL uyumlu seo-slug'a göre şehir arar
   * @param slug - Şehir slug
   * @returns Şehir nesnesi veya null
   */
  async getCityBySlug(slug: string): Promise<City | null> {
    const cities = await this.getPopularCities();
    return cities.find((city) => city.slug === slug) || null;
  }

  /**
   * İsme göre şehir arar
   * @param name - Şehir adı
   * @returns Şehir nesnesi veya null
   */
  async getCityByName(name: string): Promise<City | null> {
    const cities = await this.getPopularCities();
    return (
      cities.find((city) => city.name && city.name.toLowerCase() === name.toLowerCase()) || null
    );
  }
}

const popularLocationsService = new PopularLocationsService();

export default popularLocationsService;
