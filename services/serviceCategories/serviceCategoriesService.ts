/**
 * Hizmet Kategorileri Servisi
 *
 * Path alias yok: /api/service-categories kullanılmaz
 *   → GET /api/v1/categories?is_service=true
 *   → GET /api/v1/categories?parent_id=12540 (fallback)
 *   → by-slug / category_id → categoryService sözleşmesi
 *
 * Tercih edilen kaynak: services/category/categoryService
 */

interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  image: string;
  count: number;
  color: string;
  description: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

/** Host normalize → {host}/api/v1 */
function resolveServiceCategoriesApiBase(): string {
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

const USE_MOCK = false; // Canlı BE

class ServiceCategoriesService {
  private serviceCategories: ServiceCategory[];
  private isLoaded: boolean;
  private CACHE_KEY: string;
  private CACHE_EXPIRY_KEY: string;
  private CACHE_DURATION: number;
  private API_BASE_URL: string;

  constructor() {
    this.serviceCategories = [];
    this.isLoaded = false;
    this.CACHE_KEY = 'acillazim_service_categories';
    this.CACHE_EXPIRY_KEY = 'acillazim_service_categories_expiry';
    this.CACHE_DURATION = 3600000; // 1 saat
    this.API_BASE_URL = resolveServiceCategoriesApiBase();
  }

  /**
   * Önbellekteki verilerin geçerli olup olmadığını kontrol eder
   */
  isCacheValid(): boolean {
    if (typeof window === 'undefined') return false;
    const expiryTimestamp = localStorage.getItem(this.CACHE_EXPIRY_KEY);

    if (!expiryTimestamp) return false;

    const now = new Date().getTime();
    return now < parseInt(expiryTimestamp);
  }

  /**
   * Verileri önbelleğe kaydeder
   */
  saveToCache(data: ServiceCategory[]): void {
    if (typeof window === 'undefined') return;
    if (!data || !Array.isArray(data)) {
      console.error('❌ Önbelleğe kaydedilecek veri geçerli bir dizi değil:', data);
      return;
    }

    try {
      const now = new Date().getTime();
      const expiryTime = now + this.CACHE_DURATION;

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(this.CACHE_EXPIRY_KEY, expiryTime.toString());

      console.log(
        `✅ ${data.length} hizmet kategorisi önbelleğe kaydedildi. Geçerlilik süresi:`,
        new Date(expiryTime).toLocaleTimeString()
      );
    } catch (error) {
      console.error('❌ Hizmet kategorileri önbelleğe kaydedilemedi:', error);
    }
  }

  /**
   * Önbellekten verileri getirir
   */
  getFromCache(): ServiceCategory[] | null {
    if (typeof window === 'undefined') return null;
    if (!this.isCacheValid()) {
      console.log('⚠️ Hizmet kategorileri önbelleği geçersiz veya bulunamadı');
      return null;
    }

    try {
      const cachedData = localStorage.getItem(this.CACHE_KEY);

      if (!cachedData) {
        console.log('⚠️ Hizmet kategorileri önbellekte bulunamadı');
        return null;
      }

      const parsedData: ServiceCategory[] = JSON.parse(cachedData);
      console.log(`✅ ${parsedData.length} hizmet kategorisi önbellekten yüklendi`);
      return parsedData;
    } catch (error) {
      console.error('❌ Önbellekten veri alınırken hata oluştu:', error);
      return null;
    }
  }

  /**
   * Hedef: GET /api/v1/categories?is_service=true
   */
  async fetchFromAPI(): Promise<Response> {
    const url = `${this.API_BASE_URL}/categories?is_service=true`;
    console.log(`[ServiceCategories API] Hedef path: GET ${url}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
  }

  /**
   * API yanıtını işler — { categories }, { data }, veya dizi
   */
  async processAPIResponse(response: Response): Promise<ServiceCategory[]> {
    if (!response.ok) {
      throw new Error(`API hatası: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const list = Array.isArray(data)
      ? data
      : data?.categories ||
        data?.data?.categories ||
        (Array.isArray(data?.data) ? data.data : null);

    if (!list || !Array.isArray(list)) {
      throw new Error('API geçersiz veri formatı döndürdü');
    }

    return list.map((raw: Record<string, unknown>, index: number) =>
      this.normalizeCategory(raw, index)
    );
  }

  private normalizeCategory(raw: Record<string, unknown>, index: number): ServiceCategory {
    return {
      id: Number(raw.id ?? raw.category_id ?? index + 1),
      name: String(raw.name ?? raw.label ?? ''),
      slug: String(raw.slug ?? ''),
      image: String(raw.image ?? raw.image_url ?? raw.icon ?? ''),
      count: Number(raw.count ?? raw.listing_count ?? raw.provider_count ?? 0),
      color: String(raw.color ?? raw.bgColor ?? '#cccccc'),
      description: String(raw.description ?? ''),
      created_at: String(raw.created_at ?? new Date().toISOString()),
      updated_at: String(raw.updated_at ?? new Date().toISOString()),
    };
  }

  /**
   * Mock simülasyon — yalnızca USE_MOCK=true iken kullanılır.
   * API hatasında artık buna düşülmez.
   */
  async simulateAPIRequest(): Promise<ServiceCategory[]> {
    const responseTime = Math.random() * 800 + 200;
    await new Promise((resolve) => setTimeout(resolve, responseTime));

    const categories: ServiceCategory[] = [
      {
        id: 1,
        name: 'Ev Temizliği',
        slug: 'ev-temizligi',
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600&auto=format',
        count: 112,
        color: '#4A90E2',
        description: 'Profesyonel ev temizliği hizmetleriyle evinizi pırıl pırıl yapın',
        created_at: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Nakliyat',
        slug: 'nakliyat',
        image: 'https://images.unsplash.com/photo-1616432043562-3e119c3d6b53?q=80&w=600&auto=format',
        count: 96,
        color: '#50C878',
        description: 'Güvenilir nakliyat hizmetleriyle eşyalarınızı güvenle taşıyın',
        created_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'Yaşlı Bakımı',
        slug: 'yasli-bakimi',
        image: 'https://images.unsplash.com/photo-1576765608866-5b51046452be?q=80&w=600&auto=format',
        count: 90,
        color: '#FF6B6B',
        description: 'Sevdiklerinize özel ilgi ve profesyonel bakım hizmetleri',
        created_at: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 4,
        name: 'Tadilat',
        slug: 'tadilat',
        image: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?q=80&w=600&auto=format',
        count: 63,
        color: '#FFB366',
        description: 'Evinizi yenileyin, profesyonel tadilat ve yenileme hizmetleri',
        created_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 5,
        name: 'Evcil Hayvan Bakımı',
        slug: 'evcil-hayvan-bakimi',
        image: 'https://images.unsplash.com/photo-1560743641-3914f2c45636?q=80&w=600&auto=format',
        count: 101,
        color: '#9370DB',
        description: 'Evcil hayvanlarınız için profesyonel bakım ve hizmetler',
        created_at: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 6,
        name: 'Su Tesisatı',
        slug: 'su-tesisati',
        image: 'https://images.unsplash.com/photo-1609799585862-541c47f8dfe4?q=80&w=600&auto=format',
        count: 84,
        color: '#4682B4',
        description: 'Su tesisatı tamir, bakım ve yenileme hizmetleri',
        created_at: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 7,
        name: 'Mobilya Montaj',
        slug: 'mobilya-montaj',
        image: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?q=80&w=600&auto=format',
        count: 52,
        color: '#8B4513',
        description: 'Profesyonel mobilya montaj ve kurulum hizmetleri',
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 8,
        name: 'Sosyal Medya Yönetimi',
        slug: 'sosyal-medya-yonetimi',
        image: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?q=80&w=600&auto=format',
        count: 46,
        color: '#4267B2',
        description: 'Profesyonel sosyal medya içerik ve hesap yönetimi',
        created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 9,
        name: 'Grafik Tasarım',
        slug: 'grafik-tasarim',
        image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=600&auto=format',
        count: 41,
        color: '#E6425E',
        description: 'Kurumsal kimlik, logo ve grafik tasarım hizmetleri',
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 10,
        name: 'Seo Hizmetleri',
        slug: 'seo-hizmetleri',
        image: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?q=80&w=600&auto=format',
        count: 25,
        color: '#00A170',
        description: 'Arama motoru optimizasyonu ve dijital pazarlama hizmetleri',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 11,
        name: 'Web Tasarım',
        slug: 'web-tasarim',
        image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?q=80&w=600&auto=format',
        count: 37,
        color: '#3498DB',
        description: 'Profesyonel web tasarım ve geliştirme hizmetleri',
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 12,
        name: 'Araç Bakımı',
        slug: 'arac-bakimi',
        image: 'https://images.unsplash.com/photo-1599256621730-535171e28e50?q=80&w=600&auto=format',
        count: 93,
        color: '#2C3E50',
        description: 'Araç bakım, tamir ve yedek parça hizmetleri',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    return categories;
  }

  /**
   * Hizmet kategorilerini API'den alır veya önbellekten yükler
   */
  async fetchServiceCategories(): Promise<ServiceCategory[]> {
    try {
      console.log(
        `🔍 Hizmet kategorileri — hedef: GET ${this.API_BASE_URL}/categories?is_service=true`
      );

      const cachedData = this.getFromCache();
      if (cachedData) {
        this.serviceCategories = cachedData;
        this.isLoaded = true;
        return this.serviceCategories;
      }

      if (USE_MOCK) {
        console.warn('⚠️ USE_MOCK=true — simülasyon kullanılıyor');
        const simulatedData = await this.simulateAPIRequest();
        this.serviceCategories = simulatedData;
        this.isLoaded = true;
        this.saveToCache(simulatedData);
        return simulatedData;
      }

      const response = await this.fetchFromAPI();
      const categories = await this.processAPIResponse(response);

      this.serviceCategories = categories;
      this.isLoaded = true;
      this.saveToCache(categories);

      console.log(`✅ ${categories.length} hizmet kategorisi API'den başarıyla alındı`);
      return categories;
    } catch (error) {
      // BE hatası sessizce simülasyona düşürülmez — hata görünür kalsın.
      console.error('❌ Hizmet kategorileri API hatası:', error);
      return [];
    }
  }

  async getServiceCategories(): Promise<ServiceCategory[]> {
    if (!this.isLoaded || this.serviceCategories.length === 0) {
      return this.fetchServiceCategories();
    }
    return this.serviceCategories;
  }

  /**
   * Hedef (doğrudan): GET /api/v1/categories?category_id={id}
   */
  async getCategoryById(id: number): Promise<ServiceCategory | null> {
    console.log(
      `[ServiceCategories API] Hedef path: GET ${this.API_BASE_URL}/categories?category_id=${id}`
    );
    const categories = await this.getServiceCategories();
    return categories.find((category) => category.id === id) || null;
  }

  /**
   * Hedef (doğrudan): GET /api/v1/categories/by-slug/{slug}
   */
  async getCategoryBySlug(slug: string): Promise<ServiceCategory | null> {
    console.log(
      `[ServiceCategories API] Hedef path: GET ${this.API_BASE_URL}/categories/by-slug/${encodeURIComponent(slug)}`
    );
    const categories = await this.getServiceCategories();
    return categories.find((category) => category.slug === slug) || null;
  }

  async refreshCategories(): Promise<ServiceCategory[]> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CACHE_EXPIRY_KEY);
    }
    this.isLoaded = false;
    return this.fetchServiceCategories();
  }
}

const serviceCategoriesService = new ServiceCategoriesService();

export default serviceCategoriesService;
