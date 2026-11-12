/**
 * Hizmet Alanları API İstemcisi (public keşif + panel yedek)
 *
 * Path alias yok: /api/service-areas kullanılmaz
 *   → GET /api/v1/categories?is_service=true
 *   → GET /api/v1/categories?parent_id=
 *   → GET /api/v1/listings?is_service=true&category_id=
 *   → GET /api/v1/listings/{id}
 */

/** Host normalize → {host}/api/v1 */
function resolveServiceAreasApiBase(): string {
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

const API_BASE_URL = resolveServiceAreasApiBase();
const USE_MOCK = false; // Canlı BE

/** Panel yedeği: kart id’si ile yorumların ilan_id’si ayrı; ön izleme reviews_database ile eşlensin. */
const DASHBOARD_DEMO_ILAN_IDS = [
  1036, 1037, 1062, 1028, 1030, 1050, 1042, 1043, 1044, 1045, 1046, 1047, 1048, 1049,
];

// Tip tanımları
interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
  image_url: string;
  provider_count: number;
}

interface SubCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
  image_url: string;
  provider_count: number;
}

interface ServiceProvider {
  id: number;
  category_id: number;
  category_name: string;
  category_slug: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  price: number;
  rating: number;
  location: string;
  created_at: string;
  experience: number;
  ilan_id: number;
  isFavorite: boolean;
  img: string;
  fiyat: number;
  baslik: string;
  tarih: string;
}

interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  date: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface PaginatedProviders {
  items: ServiceProvider[];
  pagination: PaginationInfo;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ServiceAreasClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Tüm hizmet kategorilerini getirir
   * Hedef: GET /api/v1/categories?is_service=true
   */
  async getServiceCategories(params: Record<string, any> = {}): Promise<ApiResponse<ServiceCategory[]>> {
    try {
      console.log(`[ServiceAreas API] Hedef path: GET ${this.baseUrl}/categories?is_service=true`);
      if (!USE_MOCK) {
        const qs = new URLSearchParams({ is_service: 'true', ...Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        ) });
        const res = await fetch(`${this.baseUrl}/categories?${qs}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`Kategoriler API hatası: ${res.status}`);
        const json = await res.json();
        const data = json?.data ?? json;
        return { success: true, data: Array.isArray(data) ? data : data?.categories || [] };
      }
      return this._simulateApiCall('getServiceCategories', params) as Promise<ApiResponse<ServiceCategory[]>>;
    } catch (error) {
      console.error('Hizmet kategorileri getirilemedi:', error);
      throw error;
    }
  }

  /**
   * Belirli bir kategoriye ait alt kategorileri getirir
   * Hedef: GET /api/v1/categories?parent_id={categoryId}
   */
  async getSubcategories(categoryId: string | number, params: Record<string, any> = {}): Promise<ApiResponse<SubCategory[]>> {
    try {
      console.log(`[ServiceAreas API] Hedef path: GET ${this.baseUrl}/categories?parent_id=${categoryId}`);
      if (!USE_MOCK) {
        const qs = new URLSearchParams({ parent_id: String(categoryId), ...Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        ) });
        const res = await fetch(`${this.baseUrl}/categories?${qs}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`Alt kategoriler API hatası: ${res.status}`);
        const json = await res.json();
        const data = json?.data ?? json;
        return { success: true, data: Array.isArray(data) ? data : data?.categories || [] };
      }
      return this._simulateApiCall('getSubcategories', { categoryId, ...params }) as Promise<ApiResponse<SubCategory[]>>;
    } catch (error) {
      console.error(`${categoryId} kategorisinin alt kategorileri getirilemedi:`, error);
      throw error;
    }
  }

  /**
   * Belirli bir kategorideki hizmet sağlayıcılarını getirir
   * Hedef: GET /api/v1/listings?is_service=true&category_id=
   */
  async getServiceProviders(categoryId: string | number, params: Record<string, any> = {}): Promise<ApiResponse<PaginatedProviders>> {
    try {
      console.log(
        `[ServiceAreas API] Hedef path: GET ${this.baseUrl}/listings?is_service=true&category_id=${categoryId}`
      );
      if (!USE_MOCK) {
        const qs = new URLSearchParams({
          is_service: 'true',
          category_id: String(categoryId),
          page: String(params.page ?? 1),
          page_size: String(params.limit ?? params.page_size ?? 10),
        });
        Object.entries(params).forEach(([k, v]) => {
          if (v != null && !['page', 'limit', 'page_size'].includes(k)) qs.set(k, String(v));
        });
        const res = await fetch(`${this.baseUrl}/listings?${qs}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`Sağlayıcılar API hatası: ${res.status}`);
        const json = await res.json();
        const body = json?.data ?? json;
        const items = body?.listings || body?.items || (Array.isArray(body) ? body : []);
        const pagination = body?.pagination || {
          total: items.length,
          page: Number(params.page ?? 1),
          limit: Number(params.limit ?? 10),
          pages: 1,
        };
        return { success: true, data: { items, pagination } };
      }
      return this._simulateApiCall('getServiceProviders', { categoryId, ...params }) as Promise<ApiResponse<PaginatedProviders>>;
    } catch (error) {
      console.error('Hizmet sağlayıcıları getirilemedi:', error);
      throw error;
    }
  }

  /**
   * Bölgeye göre hizmet sağlayıcıları getirir
   * Hedef: GET /api/v1/listings?is_service=true&il=
   */
  async getProvidersByRegion(region: string, params: Record<string, any> = {}): Promise<ApiResponse<PaginatedProviders>> {
    try {
      console.log(
        `[ServiceAreas API] Hedef path: GET ${this.baseUrl}/listings?is_service=true&il=${encodeURIComponent(region)}`
      );
      if (!USE_MOCK) {
        const qs = new URLSearchParams({
          is_service: 'true',
          il: region,
          page: String(params.page ?? 1),
          page_size: String(params.limit ?? params.page_size ?? 10),
        });
        if (params.category_id != null) qs.set('category_id', String(params.category_id));
        const res = await fetch(`${this.baseUrl}/listings?${qs}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`Bölge sağlayıcıları API hatası: ${res.status}`);
        const json = await res.json();
        const body = json?.data ?? json;
        const items = body?.listings || body?.items || (Array.isArray(body) ? body : []);
        const pagination = body?.pagination || {
          total: items.length,
          page: Number(params.page ?? 1),
          limit: Number(params.limit ?? 10),
          pages: 1,
        };
        return { success: true, data: { items, pagination } };
      }
      return this._simulateApiCall('getProvidersByRegion', { region, ...params }) as Promise<ApiResponse<PaginatedProviders>>;
    } catch (error) {
      console.error(`${region} bölgesindeki hizmet sağlayıcıları getirilemedi:`, error);
      throw error;
    }
  }

  /**
   * Hizmet sağlayıcı detaylarını getirir
   * Hedef: GET /api/v1/listings/{providerId}
   */
  async getProviderDetails(providerId: string | number): Promise<ApiResponse<any>> {
    try {
      console.log(`[ServiceAreas API] Hedef path: GET ${this.baseUrl}/listings/${providerId}`);
      if (!USE_MOCK) {
        const res = await fetch(`${this.baseUrl}/listings/${providerId}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`Sağlayıcı detay API hatası: ${res.status}`);
        const json = await res.json();
        return { success: true, data: json?.data ?? json };
      }
      return this._simulateApiCall('getProviderDetails', { providerId }) as Promise<ApiResponse<any>>;
    } catch (error) {
      console.error(`${providerId} ID'li sağlayıcı detayları getirilemedi:`, error);
      throw error;
    }
  }

  /**
   * API çağrılarını simüle eder (geliştirme aşamasında kullanılır)
   * @private
   */
  private _simulateApiCall(endpoint: string, params: Record<string, any> = {}): Promise<ApiResponse<any>> {
    return new Promise((resolve) => {
      switch (endpoint) {
        case 'getServiceCategories':
          resolve({
            success: true,
            data: this._generateServiceCategories(params),
          });
          break;

        case 'getSubcategories':
          resolve({
            success: true,
            data: this._generateSubcategories(params.categoryId, params),
          });
          break;

        case 'getServiceProviders':
          resolve({
            success: true,
            data: this._generateServiceProviders(params.categoryId, params),
          });
          break;

        case 'getProvidersByRegion':
          resolve({
            success: true,
            data: this._generateProvidersByRegion(params.region, params),
          });
          break;

        case 'getProviderDetails':
          resolve({
            success: true,
            data: this._generateProviderDetails(params.providerId),
          });
          break;

        default:
          resolve({
            success: false,
            error: 'Bilinmeyen endpoint',
          });
      }
    });
  }

  /**
   * Kategori yapısı oluşturur - API simülasyonu
   * @private
   */
  private _generateServiceCategories(_params?: Record<string, any>): ServiceCategory[] {
    return this._getBaseCategories().sort(() => Math.random() - 0.5);
  }

  /**
   * Alt kategori yapısı oluşturur - API simülasyonu
   * @private
   */
  private _generateSubcategories(categoryId: string | number, _params?: Record<string, any>): SubCategory[] {
    const baseCategories = this._getBaseCategories();
    const category = baseCategories.find(cat => cat.id === parseInt(String(categoryId)));
    
    if (!category) {
      return [];
    }
    
    const subcategoryCount = Math.floor(Math.random() * 6) + 3;
    
    return Array(subcategoryCount).fill(null).map((_, index) => ({
      id: parseInt(`${categoryId}${index + 1}`),
      name: `${category.name} - Alt Kategori ${index + 1}`,
      slug: `${category.slug}-alt-kategori-${index + 1}`,
      icon: category.icon,
      image_url: `https://source.unsplash.com/random/300x200?${category.slug},service,${index}`,
      provider_count: Math.floor(Math.random() * 50) + 5
    }));
  }

  /**
   * Hizmet sağlayıcıları oluşturur - API simülasyonu
   * @private
   */
  private _generateServiceProviders(categoryId: string | number, params: Record<string, any> = {}): PaginatedProviders {
    const { page = 1, limit = 10, rating, price_min, price_max, sort_by } = params;
    
    const offset = (page - 1) * limit;
    
    let providers = this._getBaseProviders(categoryId);
    
    if (rating) {
      providers = providers.filter(p => p.rating >= parseFloat(rating));
    }
    
    if (price_min) {
      providers = providers.filter(p => p.price >= parseFloat(price_min));
    }
    
    if (price_max) {
      providers = providers.filter(p => p.price <= parseFloat(price_max));
    }
    
    if (sort_by) {
      switch (sort_by) {
        case 'price_asc':
          providers.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          providers.sort((a, b) => b.price - a.price);
          break;
        case 'rating_desc':
          providers.sort((a, b) => b.rating - a.rating);
          break;
        case 'newest':
          providers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
      }
    }
    
    const paginatedProviders = providers.slice(offset, offset + limit);
    
    return {
      items: paginatedProviders,
      pagination: {
        total: providers.length,
        page: parseInt(String(page)),
        limit: parseInt(String(limit)),
        pages: Math.ceil(providers.length / limit)
      }
    };
  }

  /**
   * Bölgeye göre hizmet sağlayıcıları oluşturur - API simülasyonu
   * @private
   */
  private _generateProvidersByRegion(region: string, params: Record<string, any> = {}): PaginatedProviders {
    const { page = 1, limit = 10, category_id } = params;
    
    let providers: ServiceProvider[] = [];
    
    if (category_id) {
      providers = this._getBaseProviders(category_id);
    } else {
      const categories = this._getBaseCategories();
      providers = categories.flatMap(cat => this._getBaseProviders(cat.id));
    }
    
    providers = providers.filter(p => {
      const providerRegion = p.location.split(', ')[0].toLowerCase();
      return providerRegion === region.toLowerCase();
    });
    
    const offset = (page - 1) * limit;
    const paginatedProviders = providers.slice(offset, offset + limit);
    
    return {
      items: paginatedProviders,
      pagination: {
        total: providers.length,
        page: parseInt(String(page)),
        limit: parseInt(String(limit)),
        pages: Math.ceil(providers.length / limit)
      }
    };
  }

  /**
   * Hizmet sağlayıcı detayları oluşturur - API simülasyonu
   * @private
   */
  private _generateProviderDetails(providerId: string | number): any {
    const categories = this._getBaseCategories();
    const allProviders = categories.flatMap(cat => this._getBaseProviders(cat.id));
    
    const provider = allProviders.find(p => p.id === parseInt(String(providerId)));
    
    if (!provider) {
      return null;
    }
    
    return {
      ...provider,
      description: `${provider.title} olarak ${provider.experience} yıllık deneyimimizle hizmet vermekteyiz. Müşteri memnuniyeti odaklı çalışmalarımızla ${provider.location} bölgesinde en kaliteli hizmeti sunuyoruz.`,
      services: [
        { name: 'Standart Hizmet', price: provider.price },
        { name: 'Premium Hizmet', price: provider.price * 1.5 },
        { name: 'Acil Servis', price: provider.price * 2 }
      ],
      working_hours: {
        monday: '09:00 - 18:00',
        tuesday: '09:00 - 18:00',
        wednesday: '09:00 - 18:00',
        thursday: '09:00 - 18:00',
        friday: '09:00 - 18:00',
        saturday: '10:00 - 14:00',
        sunday: 'Kapalı'
      },
      reviews: this._generateReviews(providerId, provider.rating),
      gallery: Array(5).fill(null).map((_, index) => ({
        id: index + 1,
        url: `https://source.unsplash.com/random/800x600?${provider.category_slug},service,${index}`
      }))
    };
  }

  /**
   * Yorumlar oluşturur - API simülasyonu
   * @private
   */
  private _generateReviews(providerId: string | number, avgRating: number): Review[] {
    const reviewCount = Math.floor(Math.random() * 11) + 5;
    
    return Array(reviewCount).fill(null).map((_, index) => {
      let rating = avgRating + (Math.random() * 2 - 1);
      rating = Math.max(1, Math.min(5, Math.round(rating * 2) / 2));
      
      const date = new Date();
      date.setMonth(date.getMonth() - Math.floor(Math.random() * 6));
      
      return {
        id: parseInt(`${providerId}${index}`),
        user_name: `Kullanıcı${Math.floor(Math.random() * 1000)}`,
        rating,
        comment: this._getRandomReviewText(rating),
        date: date.toISOString()
      };
    });
  }
  
  /**
   * Baz kategori verilerini getirir - API simülasyonu
   * @private
   */
  private _getBaseCategories(): ServiceCategory[] {
    return [
      {
        id: 1,
        name: 'Temizlik',
        slug: 'temizlik',
        icon: 'fa-broom',
        image_url: 'https://source.unsplash.com/random/300x200?cleaning',
        provider_count: 127
      },
      {
        id: 2,
        name: 'Tamir ve Bakım',
        slug: 'tamir-bakim',
        icon: 'fa-wrench',
        image_url: 'https://source.unsplash.com/random/300x200?repair',
        provider_count: 98
      },
      {
        id: 3,
        name: 'Nakliyat',
        slug: 'nakliyat',
        icon: 'fa-truck',
        image_url: 'https://source.unsplash.com/random/300x200?moving',
        provider_count: 54
      },
      {
        id: 4,
        name: 'Sağlık',
        slug: 'saglik',
        icon: 'fa-heart-pulse',
        image_url: 'https://source.unsplash.com/random/300x200?healthcare',
        provider_count: 78
      },
      {
        id: 5,
        name: 'Eğitim',
        slug: 'egitim',
        icon: 'fa-graduation-cap',
        image_url: 'https://source.unsplash.com/random/300x200?education',
        provider_count: 112
      },
      {
        id: 6,
        name: 'Güzellik ve Bakım',
        slug: 'guzellik-bakim',
        icon: 'fa-spa',
        image_url: 'https://source.unsplash.com/random/300x200?beauty',
        provider_count: 85
      },
      {
        id: 7,
        name: 'Ev Yardımcıları',
        slug: 'ev-yardimcilari',
        icon: 'fa-house-user',
        image_url: 'https://source.unsplash.com/random/300x200?housekeeper',
        provider_count: 63
      },
      {
        id: 8,
        name: 'Özel Ders',
        slug: 'ozel-ders',
        icon: 'fa-chalkboard-teacher',
        image_url: 'https://source.unsplash.com/random/300x200?tutor',
        provider_count: 92
      }
    ];
  }
  
  /**
   * Baz hizmet sağlayıcı verilerini getirir - API simülasyonu
   * @private
   */
  private _getBaseProviders(categoryId: string | number): ServiceProvider[] {
    const categories = this._getBaseCategories();
    const category = categories.find(cat => cat.id === parseInt(String(categoryId)));
    
    if (!category) {
      return [];
    }
    
    const providerCount = Math.floor(Math.random() * 21) + 20;
    const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya'];
    
    return Array(providerCount).fill(null).map((_, index) => {
      const city = cities[Math.floor(Math.random() * cities.length)];
      const district = `${city} ${['Merkez', 'Batı', 'Doğu', 'Kuzey', 'Güney'][Math.floor(Math.random() * 5)]}`;
      
      let basePrice: number;
      switch (category.slug) {
        case 'temizlik': basePrice = 100; break;
        case 'tamir-bakim': basePrice = 150; break;
        case 'nakliyat': basePrice = 500; break;
        case 'saglik': basePrice = 300; break;
        case 'egitim': basePrice = 200; break;
        case 'guzellik-bakim': basePrice = 250; break;
        case 'ev-yardimcilari': basePrice = 180; break;
        case 'ozel-ders': basePrice = 120; break;
        default: basePrice = 100;
      }
      
      const price = basePrice + Math.floor(Math.random() * basePrice * 0.6);
      const rating = parseFloat((3.5 + Math.random() * 1.5).toFixed(1));
      
      const date = new Date();
      date.setMonth(date.getMonth() - Math.floor(Math.random() * 24));
      
      const experience = Math.floor(Math.random() * 15) + 1;
      const imageUrl = `https://source.unsplash.com/random/400x300?${category.slug},service,${index}`;
      const providerName = `${category.name} Hizmet ${index + 1}`;
      
      const rowId = parseInt(`${categoryId}${1000 + index}`, 10);
      const demoIlanId = DASHBOARD_DEMO_ILAN_IDS[index % DASHBOARD_DEMO_ILAN_IDS.length];
      return {
        id: rowId,
        category_id: parseInt(String(categoryId)),
        category_name: category.name,
        category_slug: category.slug,
        title: providerName,
        slug: `${category.slug}-hizmet-${index + 1}`,
        description: `${city} bölgesinde profesyonel ${category.name.toLowerCase()} hizmetleri`,
        image: imageUrl,
        price,
        rating,
        location: `${city}, ${district}`,
        created_at: date.toISOString(),
        experience,
        ilan_id: demoIlanId,
        isFavorite: Math.random() > 0.8,
        img: imageUrl,
        fiyat: price,
        baslik: providerName,
        tarih: date.toISOString()
      };
    });
  }
  
  /**
   * Rastgele yorum metni döndürür - API simülasyonu
   * @private
   */
  private _getRandomReviewText(rating: number): string {
    const positiveReviews = [
      'Çok memnun kaldım, kesinlikle tavsiye ederim.',
      'Profesyonel bir hizmet aldık, teşekkürler.',
      'Zamanında ve kaliteli iş yaptılar.',
      'Fiyat-performans açısından çok iyi.',
      'Güler yüzlü ve işini iyi yapan bir ekip.'
    ];
    
    const neutralReviews = [
      'Fena değildi, beklentilerimi karşıladı.',
      'Normal bir hizmetti, ne iyi ne kötü.',
      'İşini yaptı ama daha iyisi olabilirdi.',
      'Biraz gecikmeli geldiler ama iş kalitesi iyiydi.',
      'Ortalama bir hizmet aldık.'
    ];
    
    const negativeReviews = [
      'Memnun kalmadım, tekrar tercih etmem.',
      'Çok geç geldiler ve işi aceleye getirdiler.',
      'Fiyatı hizmet kalitesine göre yüksekti.',
      'İletişim sorunları yaşadık.',
      'Daha profesyonel olabilirlerdi.'
    ];
    
    if (rating >= 4) {
      return positiveReviews[Math.floor(Math.random() * positiveReviews.length)];
    } else if (rating >= 3) {
      return neutralReviews[Math.floor(Math.random() * neutralReviews.length)];
    } else {
      return negativeReviews[Math.floor(Math.random() * negativeReviews.length)];
    }
  }
}

export default ServiceAreasClient;
