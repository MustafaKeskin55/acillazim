import BaseListingsService from '@/services/listings/base/baseListingsService';
import categoryService from '@/services/category/categoryService';

/**
 * Hizmet sayfası için dinamik veri servis sınıfı
 *
 * Backend endpoint'leri:
 * - GET /api/v1/listings?vitrin_durumu=one_cikan&category_id=12540&include_descendants=true
 * - GET /api/v1/listings?vitrin_durumu=vitrin&category_id=12540&include_descendants=true
 * - GET /api/v1/listings?il=...&category_id=12540&include_descendants=true
 * - GET /api/v1/categories?parent_id=12540
 */

const HIZMET_ROOT_CATEGORY_ID = 12540;

interface IlanKonum {
  il?: string;
  ilce?: string;
  [key: string]: unknown;
}

interface IlanItem {
  ilan_id?: number | string;
  baslik?: string;
  category_id?: number | string;
  vitrin_durumu?: string | string[];
  ilan_turu?: string;
  ilan_tarihi?: string;
  konum?: IlanKonum;
  [key: string]: unknown;
}

interface ServicePageData {
  featuredListings: IlanItem[];
  vitrinListings: IlanItem[];
  totalServiceCount: number;
}

class ServiceHomeService extends BaseListingsService {
  constructor() {
    super();
    console.log('🔧 ServiceHomeService başlatıldı (Dinamik Backend API Modu).');
  }

  /**
   * Öne çıkan hizmet ilanlarını getirir (vitrin_durumu: "one_cikan")
   */
  async getFeaturedServiceListings(): Promise<IlanItem[]> {
    try {
      console.log(`📡 [serviceHomeService] Öne çıkan hizmet ilanları API'den alınıyor...`);
      const result = await this.getListings({
        page: 1,
        pageSize: 30,
        vitrin_durumu: 'one_cikan',
        categoryId: HIZMET_ROOT_CATEGORY_ID,
        includeSubcategories: true,
      });
      return (result?.listings || []) as unknown as IlanItem[];
    } catch (error) {
      console.error('❌ [serviceHomeService] Öne çıkan hizmet ilanları API hatası:', error);
      return [];
    }
  }

  /**
   * Vitrin hizmet ilanlarını getirir (vitrin_durumu: "vitrin")
   */
  async getVitrinServiceListings(): Promise<IlanItem[]> {
    try {
      console.log(`📡 [serviceHomeService] Vitrin hizmet ilanları API'den alınıyor...`);
      const result = await this.getListings({
        page: 1,
        pageSize: 55,
        vitrin_durumu: 'vitrin',
        categoryId: HIZMET_ROOT_CATEGORY_ID,
        includeSubcategories: true,
      });
      return (result?.listings || []) as unknown as IlanItem[];
    } catch (error) {
      console.error('❌ [serviceHomeService] Vitrin hizmet ilanları API hatası:', error);
      return [];
    }
  }

  /**
   * Şehre göre yakındaki hizmet ilanlarını getirir
   * @param city - Şehir adı
   * @param limit - Maksimum sonuç sayısı
   */
  async getNearbyServices(city: string, limit = 15): Promise<IlanItem[]> {
    try {
      console.log(`📡 [serviceHomeService] ${city} için yakındaki hizmetler API'den alınıyor...`);
      const result = await this.getListings({
        page: 1,
        pageSize: limit,
        categoryId: HIZMET_ROOT_CATEGORY_ID,
        includeSubcategories: true,
        il: city || undefined,
      });
      return (result?.listings || []) as unknown as IlanItem[];
    } catch (error) {
      console.error(`❌ [serviceHomeService] ${city} için yakındaki hizmetler alınamadı:`, error);
      return [];
    }
  }

  /**
   * Hizmetler ana kategorisi altındaki alt kategori ID'lerini dinamik olarak getirir
   */
  async getServiceCategories(): Promise<(number | string)[]> {
    try {
      console.log(`📡 [serviceHomeService] Hizmet kategorileri API'den alınıyor (Parent: ${HIZMET_ROOT_CATEGORY_ID})...`);
      const subcategories = await categoryService.getSubCategories(HIZMET_ROOT_CATEGORY_ID);
      const categoryIds = (subcategories || [])
        .map((cat) => cat.category_id || (cat as unknown as { id: number | string }).id)
        .filter((id): id is number | string => id !== undefined && id !== null);

      return categoryIds;
    } catch (error) {
      console.error('❌ [serviceHomeService] Hizmet kategorileri API hatası:', error);
      return [];
    }
  }

  /**
   * Hizmet sayfasının tüm verilerini getirir
   */
  async getServicePageData(): Promise<ServicePageData> {
    try {
      console.log('📡 [serviceHomeService] Hizmet sayfası verileri hazırlanıyor...');
      const [featured, vitrin, countResult] = await Promise.all([
        this.getFeaturedServiceListings(),
        this.getVitrinServiceListings(),
        this.getListings({
          page: 1,
          pageSize: 1,
          categoryId: HIZMET_ROOT_CATEGORY_ID,
          includeSubcategories: true,
        }).catch(() => null),
      ]);

      return {
        featuredListings: featured,
        vitrinListings: vitrin,
        totalServiceCount: countResult?.totalListings || featured.length + vitrin.length,
      };
    } catch (error) {
      console.error('❌ [serviceHomeService] Hizmet sayfası verileri alınamadı:', error);
      return {
        featuredListings: [],
        vitrinListings: [],
        totalServiceCount: 0,
      };
    }
  }
}

// Singleton pattern
const serviceHomeService = new ServiceHomeService();
export default serviceHomeService;
