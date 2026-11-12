/**
 * CREATE LISTING SERVICE (İlan Verme Servisi)
 *
 * Tüm ilan verme sürecini yöneten ana servis
 * - Kategori seçimi
 * - Form yönetimi
 * - Görsel yükleme
 * - İlan kaydetme
 * - Session yönetimi
 * - Form state yönetimi
 * - Önizleme dönüşümü
 *
 * API ENTEGRASYONU HAZIR - Geçici Mock Data Kullanılıyor
 * Backend hazır olduğunda sadece USE_MOCK_DATA = false yapılacak
 *
 * Path alias yok: /api/listings veya v1’siz /listings kullanılmaz.
 * Base: /api/v1 → /api/v1/listings, /api/v1/categories/{id}/filters, ...
 *
 * BEKLEME SİMÜLASYONU YOK - Mock veriler anında döner (setTimeout kullanılmaz)
 */

import categoryService from '@/services/category/categoryService';
import realtyFilters from '@/data/realty_filter.json';

interface FilterOption {
  label?: string;
  value?: string | number;
  [key: string]: unknown;
}

interface FilterItem {
  id?: number | string;
  category_dependency?: (number | string)[];
  options?: {
    label?: string;
    type?: string;
    db_field?: string | null;
    options?: FilterOption[];
    unit?: string | null;
    display_location?: string;
    priority?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface FormattedFilter {
  id?: number | string;
  label?: string;
  type?: string;
  db_field?: string | null;
  unit?: string | null;
  display_location?: string;
  priority?: boolean;
  options?: FilterOption[];
  category_id?: number;
  [key: string]: unknown;
}

interface ProcessedImage {
  success: boolean;
  error?: string;
  file?: File | null;
  preview?: string;
  id?: string;
}

interface ProcessImageResult {
  success: boolean;
  errors: string[];
  images: ProcessedImage[];
}

interface UploadedImage {
  image_id: string;
  url: string;
  thumbnail: string;
  original_name: string;
  size: number;
  order: number;
  uploaded_at: string;
}

interface MockListing {
  listing_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  views: number;
  favorites: number;
  [key: string]: unknown;
}

interface SessionKeys {
  FORM_SESSION_ID: string;
  LAST_FORM_STATE: string;
  LISTING_PUBLISHED: string;
  EDITING_MODE: string;
  CURRENT_FORM_DATA: string;
  LISTING_FORM_DATA: string;
  SELECTED_CITY: string;
  SELECTED_DISTRICT: string;
  SELECTED_DISTRICTS: string;
  SELECTED_NEIGHBORHOOD: string;
  CATEGORY_FIELD_LABELS: string;
  FORM_EXIT_TIME: string;
  LAST_FORM_CATEGORY: string;
}

interface LocationData {
  city: string;
  district: string;
  districts: string[];
  neighborhood: string;
}

interface TransformedData {
  title: string;
  description: string;
  price: number | null;
  currency: string;
  condition: string;
  exchange: boolean;
  city: string;
  district: string;
  districts: string[];
  neighborhood: string;
  address: string;
  selectedCategory: unknown;
  images: unknown[];
  categoryFields: Record<string, { value: unknown; label: string }>;
  createdAt: number;
  previewVersion: string;
  [key: string]: unknown;
}

interface ValidateFieldResult {
  newErrors: Record<string, string>;
  isValid: boolean;
}

/** Host normalize → {host}/api/v1 */
function resolveCreateListingApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  if (!raw) return '/api/v1';
  const host = raw
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '');
  return `${host}/api/v1`;
}

class CreateListingService {
  private API_BASE_URL: string;
  private USE_MOCK_DATA: boolean;
  private CACHE_PREFIX: string;
  private mockListings: MockListing[];
  private mockListingIdCounter: number;
  private filterData: FilterItem[];

  constructor() {
    // API yapılandırması — full paths: /api/v1/listings, /api/v1/categories/{id}/filters
    this.API_BASE_URL = resolveCreateListingApiBase();
    this.USE_MOCK_DATA = false; // Canlı BE

    // Cache prefix
    this.CACHE_PREFIX = 'acillazim_create_listing_';

    // Mock data
    this.mockListings = [];
    this.mockListingIdCounter = 1000;

    // Filtre verileri (geçici mock data)
    this.filterData = realtyFilters as FilterItem[];
  }

  // ==================== CACHE YÖNETİMİ ====================

  getCacheItem(key: string): unknown {
    if (typeof window === 'undefined') return null;
    try {
      const item = sessionStorage.getItem(this.CACHE_PREFIX + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`❌ Cache okuma hatası (${key}):`, error);
      return null;
    }
  }

  setCacheItem(key: string, value: unknown): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.error(`❌ Cache yazma hatası (${key}):`, error);
    }
  }

  removeCacheItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(this.CACHE_PREFIX + key);
    } catch (error) {
      console.error(`❌ Cache silme hatası (${key}):`, error);
    }
  }

  clearAllCache(): void {
    if (typeof window === 'undefined') return;
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
      console.log('✅ İlan verme cache temizlendi');
    } catch (error) {
      console.error('❌ Cache temizleme hatası:', error);
    }
  }

  // ==================== KATEGORİ YÖNETİMİ ====================

  async getCategoryFilters(categoryId: number | string): Promise<FormattedFilter[]> {
    try {
      console.log(`🔍 Kategori filtreleri isteniyor (ID: ${categoryId})...`);

      if (!categoryId) {
        console.warn('⚠️ Kategori ID yok, boş array döndürülüyor');
        return [];
      }

      // Cache kontrolü
      const cacheKey = `category_filters_${categoryId}`;
      const cached = this.getCacheItem(cacheKey) as FormattedFilter[] | null;
      if (cached) {
        console.log(`✅ Kategori filtreleri cache'den alındı (ID: ${categoryId})`);
        return cached;
      }

      if (this.USE_MOCK_DATA) {
        console.log("📦 Filtreler mock data'dan alınıyor...");
        console.log(`🔍 Aranan Kategori ID: ${categoryId} (tip: ${typeof categoryId})`);

        const numCategoryId = Number(categoryId);
        console.log(`🔍 Number'a çevrildi: ${numCategoryId}`);

        if (this.filterData && this.filterData.length > 0) {
          console.log('📋 Örnek filtre:', {
            id: this.filterData[0].id,
            category_dependency: this.filterData[0].category_dependency,
            label: this.filterData[0].options?.label
          });
        }

        const categoryFilters = this.filterData.filter((filter) => {
          if (!filter.category_dependency || !Array.isArray(filter.category_dependency)) {
            return false;
          }

          const hasCategory = filter.category_dependency.includes(numCategoryId);

          if (hasCategory) {
            console.log(`✅ Eşleşme bulundu: Filtre #${filter.id} - ${filter.options?.label}`);
          }

          return hasCategory;
        });

        console.log(`🔎 Toplam ${this.filterData.length} filtre tarandı`);
        console.log(`✅ ${categoryFilters.length} filtre eşleşti`);

        if (categoryFilters.length === 0) {
          console.warn(`⚠️ Kategori ID ${numCategoryId} için hiç filtre bulunamadı!`);
          const allCategoryIds = new Set<number | string>();
          this.filterData.forEach((filter) => {
            if (filter.category_dependency && Array.isArray(filter.category_dependency)) {
              filter.category_dependency.forEach((id) => allCategoryIds.add(id));
            }
          });
          console.log(
            `📊 Mevcut kategori ID'leri (${allCategoryIds.size} adet):`,
            Array.from(allCategoryIds)
              .sort((a, b) => Number(a) - Number(b))
              .slice(0, 20)
          );
        }

        const formattedFilters: FormattedFilter[] = categoryFilters.map((filter) => ({
          id: filter.id,
          ...filter.options,
          category_id: numCategoryId
        }));

        this.setCacheItem(cacheKey, formattedFilters);

        return formattedFilters;
      }

      // Gerçek API çağrısı
      const response = await fetch(`${this.API_BASE_URL}/categories/${categoryId}/filters`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Filtreler alınamadı');
      }

      const filters: FormattedFilter[] = (result.data || []).map((f: any) => ({
        ...f,
        options: (f.options || []).map((opt: any) =>
          typeof opt === 'object' && opt !== null ? (opt.label ?? opt.value) : opt
        )
      }));
      console.log(`✅ ${filters.length} filtre alındı (API)`);

      this.setCacheItem(cacheKey, filters);

      return filters;
    } catch (error) {
      console.error('❌ Kategori filtreleri alınırken hata:', error);
      throw error;
    }
  }

  getDefaultValueForFilter(filter: FormattedFilter): unknown {
    if (!filter || !filter.type) return '';

    switch (filter.type) {
      case 'checkbox':
        return '';
      case 'multi-select':
        return [];
      case 'range':
        return { min: '', max: '' };
      default:
        return '';
    }
  }

  createDefaultFormData(filters: FormattedFilter[]): Record<string, unknown> {
    if (!filters || !Array.isArray(filters)) return {};

    const formData: Record<string, unknown> = {};
    filters.forEach((filter) => {
      if (filter.db_field) {
        formData[filter.db_field] = this.getDefaultValueForFilter(filter);
      }
    });

    return formData;
  }

  /**
   * Kategori için "İkinci El / Sıfır" ve "Takas" alanlarının gösterilip
   * gösterilmeyeceğini döndürür.
   *
   * Kural: realty_filter.json'daki category_dependency listelerinde yer alan
   * kategori ID'leri emlak kategorisidir — bu kategorilerde condition/exchange
   * gösterilmez. Veri eklendikçe aynı mantık vasıta vb. için de çalışır.
   */
  shouldShowItemCondition(categoryId: number | string): boolean {
    const numId = Number(categoryId);
    if (!numId) return true;
    const excluded = new Set<number>();
    (this.filterData as FilterItem[]).forEach((f) => {
      if (Array.isArray(f.category_dependency)) {
        f.category_dependency.forEach((id) => excluded.add(Number(id)));
      }
    });
    return !excluded.has(numId);
  }

  groupFiltersByPriority(filters: FormattedFilter[]): {
    priority: FormattedFilter[];
    more: FormattedFilter[];
  } {
    if (!filters || !Array.isArray(filters)) {
      return { priority: [], more: [] };
    }

    const priority = filters.filter((f) => f.priority === true);
    const more = filters.filter((f) => f.priority === false);

    return { priority, more };
  }

  async getMainCategories(): Promise<unknown[]> {
    try {
      console.log('🔍 Ana kategoriler isteniyor...');

      const categories = await (categoryService as { getMainCategories: () => Promise<Array<{
        category_id: number | string;
        label: string;
        icon?: string;
        bgColor?: string;
        slug?: string;
        type?: string;
      }>> }).getMainCategories();

      const formattedCategories = categories.map((cat) => ({
        id: cat.category_id,
        category_id: cat.category_id,
        name: cat.label,
        label: cat.label,
        icon: cat.icon,
        bgColor: cat.bgColor,
        slug: cat.slug,
        type: cat.type
      }));

      console.log(`✅ ${formattedCategories.length} ana kategori alındı`);
      return formattedCategories;
    } catch (error) {
      console.error('❌ Ana kategoriler alınırken hata:', error);
      throw error;
    }
  }

  async getSubCategories(parentId: number | string): Promise<unknown[]> {
    try {
      console.log(`🔍 Alt kategoriler isteniyor (parent: ${parentId})...`);

      if (!parentId) {
        throw new Error('Parent ID gerekli');
      }

      const subCategories = await (categoryService as { getSubCategories: (id: number | string) => Promise<Array<{
        category_id: number | string;
        label: string;
        parent_id?: number | string;
        type?: string;
        slug?: string;
        icon?: string | null;
      }>> }).getSubCategories(parentId);

      const formattedSubCategories = subCategories.map((cat) => ({
        id: cat.category_id,
        category_id: cat.category_id,
        name: cat.label,
        label: cat.label,
        parent_id: cat.parent_id,
        type: cat.type,
        hasChildren: cat.type !== 'leaf',
        slug: cat.slug,
        icon: (cat as { icon?: string | null }).icon || null,
      }));

      console.log(`✅ ${formattedSubCategories.length} alt kategori alındı`);
      return formattedSubCategories;
    } catch (error) {
      console.error('❌ Alt kategoriler alınırken hata:', error);
      throw error;
    }
  }

  saveSelectedCategory(level: number, categoryId: string | number, categoryName: string): void {
    if (typeof window === 'undefined') return;
    try {
      const key = `selected_category_level_${level}`;
      const data = {
        level,
        id: categoryId,
        name: categoryName,
        timestamp: Date.now()
      };

      this.setCacheItem(key, data);

      localStorage.setItem(`level${level}_id`, String(categoryId));
      localStorage.setItem(`level${level}_name`, categoryName);

      console.log(`✅ Kategori kaydedildi: Level ${level} - ${categoryName}`);
    } catch (error) {
      console.error('❌ Kategori kaydetme hatası:', error);
    }
  }

  getSelectedCategories(): Record<string, { level: number; id: string | number; name: string }> {
    if (typeof window === 'undefined') return {};
    try {
      const categories: Record<string, { level: number; id: string | number; name: string }> = {};

      for (let i = 1; i <= 6; i++) {
        const cachedData = this.getCacheItem(`selected_category_level_${i}`) as {
          level: number;
          id: string | number;
          name: string;
        } | null;

        if (cachedData) {
          categories[`level${i}`] = cachedData;
        } else {
          const id = localStorage.getItem(`level${i}_id`);
          const name = localStorage.getItem(`level${i}_name`);

          if (id && name) {
            categories[`level${i}`] = { level: i, id, name };
          }
        }
      }

      return categories;
    } catch (error) {
      console.error('❌ Seçili kategoriler alınırken hata:', error);
      return {};
    }
  }

  clearSelectedCategories(): void {
    if (typeof window === 'undefined') return;
    try {
      for (let i = 1; i <= 6; i++) {
        this.removeCacheItem(`selected_category_level_${i}`);
        localStorage.removeItem(`level${i}_id`);
        localStorage.removeItem(`level${i}_name`);
      }

      sessionStorage.removeItem('selectedMainCategory');
      sessionStorage.removeItem('selectedMainCategoryId');
      localStorage.removeItem('currentMainCategory');
      localStorage.removeItem('currentMainCategoryId');

      console.log('✅ Kategori seçimi temizlendi');
    } catch (error) {
      console.error('❌ Kategori temizleme hatası:', error);
    }
  }

  // ==================== İLAN OLUŞTURMA ====================

  async createListing(listingData: Record<string, unknown>): Promise<MockListing | unknown> {
    try {
      console.log('📤 İlan oluşturuluyor...', listingData);

      if (this.USE_MOCK_DATA) {
        return this.mockCreateListing(listingData);
      }

      const response = await fetch(`${this.API_BASE_URL}/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(listingData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'İlan oluşturulamadı');
      }

      console.log('✅ İlan başarıyla oluşturuldu:', result.data.listing_id);

      const createdId = result.data?.listing_id || result.data?.id || result.data?.listingId;
      if (createdId) {
        try {
          const hours = (listingData.workingHours || listingData.working_hours) as Record<string, unknown> | undefined;
          if (hours && typeof hours === 'object') {
            const daysKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const daysArr = daysKeys.filter((k) => hours[k]).map((day) => {
              const d = (hours[day] || {}) as Record<string, unknown>;
              const s = String(d.start || '09:00').slice(0, 5);
              const e = String(d.end || '18:00').slice(0, 5);
              const isAct = d.is_active !== undefined ? !!d.is_active : (d.isActive !== undefined ? !!d.isActive : true);
              return {
                dayOfWeek: day,
                day_of_week: day,
                startTime: s,
                start_time: s,
                endTime: e,
                end_time: e,
                isActive: isAct,
                is_active: isAct,
              };
            });
            if (daysArr.length > 0) {
              fetch(`${this.API_BASE_URL}/listings/${createdId}/working-hours`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ days: daysArr, working_hours: daysArr, workingHours: daysArr })
              }).catch(() => {});
            }
          }

          const faqItems = (listingData.faq || listingData.faq_items || listingData.service_faqs) as Array<{ question?: string; answer?: string }> | undefined;
          if (Array.isArray(faqItems) && faqItems.length > 0) {
            const cleanFaq = faqItems.filter(f => f.question?.trim()).map(f => ({ question: f.question || '', answer: f.answer || '' }));
            if (cleanFaq.length > 0) {
              fetch(`${this.API_BASE_URL}/listings/${createdId}/faq`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ faq: cleanFaq, faqs: cleanFaq, items: cleanFaq })
              }).catch(() => {});
            }
          }
        } catch {
          // Ikincil senkronizasyon sessizce gecilir
        }
      }

      this.clearAllCache();

      return result.data;
    } catch (error) {
      console.error('❌ İlan oluşturma hatası:', error);
      throw error;
    }
  }

  async updateListing(
    listingId: number | string,
    listingData: Record<string, unknown>
  ): Promise<unknown> {
    try {
      console.log(`📤 İlan güncelleniyor (ID: ${listingId})...`, listingData);

      if (this.USE_MOCK_DATA) {
        return this.mockUpdateListing(listingId, listingData);
      }

      const response = await fetch(`${this.API_BASE_URL}/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(listingData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'İlan güncellenemedi');
      }

      console.log('✅ İlan başarıyla güncellendi');

      return result.data;
    } catch (error) {
      console.error('❌ İlan güncelleme hatası:', error);
      throw error;
    }
  }

  async deleteListing(listingId: number | string): Promise<boolean> {
    try {
      console.log(`🗑️ İlan siliniyor (ID: ${listingId})...`);

      if (this.USE_MOCK_DATA) {
        return this.mockDeleteListing(listingId);
      }

      const response = await fetch(`${this.API_BASE_URL}/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'İlan silinemedi');
      }

      console.log('✅ İlan başarıyla silindi');

      return true;
    } catch (error) {
      console.error('❌ İlan silme hatası:', error);
      throw error;
    }
  }

  // ==================== GÖRSEL YÖNETİMİ ====================

  processImageFiles(files: FileList | File[]): ProcessImageResult {
    if (files.length > 10) {
      return {
        success: false,
        error: 'En fazla 10 fotoğraf yükleyebilirsiniz!',
        images: [],
        errors: ['En fazla 10 fotoğraf yükleyebilirsiniz!']
      };
    }

    const processedImages: ProcessedImage[] = Array.from(files).map((file) => {
      if (!file.type.startsWith('image/')) {
        return {
          success: false,
          error: 'Lütfen sadece resim dosyası yükleyin!',
          file: null
        };
      }

      if (file.size > 5 * 1024 * 1024) {
        return {
          success: false,
          error: 'Her bir fotoğraf en fazla 5MB olabilir!',
          file: null
        };
      }

      return {
        success: true,
        file,
        preview: URL.createObjectURL(file),
        id: `image-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      };
    });

    const errors = [...new Set(
      processedImages.filter((img) => !img.success).map((img) => img.error!)
    )];

    const validImages = processedImages.filter((img) => img.success);

    return {
      success: errors.length === 0,
      errors,
      images: validImages
    };
  }

  reorderImages(images: ProcessedImage[], sourceIndex: number, destinationIndex: number): ProcessedImage[] {
    if (!images || images.length === 0) return images;

    const result = Array.from(images);
    const [removed] = result.splice(sourceIndex, 1);
    result.splice(destinationIndex, 0, removed);

    return result;
  }

  prepareImagesForUpload(images: ProcessedImage[]): File[] {
    if (!images || images.length === 0) return [];

    return images.filter((image) => image.file).map((image) => image.file!);
  }

  async uploadImages(files: File[]): Promise<UploadedImage[]> {
    try {
      console.log(`📤 ${files.length} görsel yükleniyor...`);

      if (this.USE_MOCK_DATA) {
        return this.mockUploadImages(files);
      }

      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('images', file);
        formData.append(`order_${index}`, String(index));
      });

      const response = await fetch(`${this.API_BASE_URL}/listings/images`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Görseller yüklenemedi');
      }

      console.log(`✅ ${result.data.images.length} görsel yüklendi`);

      return result.data.images;
    } catch (error) {
      console.error('❌ Görsel yükleme hatası:', error);
      throw error;
    }
  }

  async deleteImage(imageId: number | string): Promise<boolean> {
    try {
      console.log(`🗑️ Görsel siliniyor (ID: ${imageId})...`);

      if (this.USE_MOCK_DATA) {
        console.log('✅ Görsel silindi (mock)');
        return true;
      }

      const response = await fetch(`${this.API_BASE_URL}/listings/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Görsel silinemedi');
      }

      console.log('✅ Görsel silindi');

      return true;
    } catch (error) {
      console.error('❌ Görsel silme hatası:', error);
      throw error;
    }
  }

  // ==================== FORM VALIDASYON ====================

  validateField(
    fieldName: string,
    value: unknown,
    errors: Record<string, string> = {}
  ): ValidateFieldResult {
    let newErrors = { ...errors };

    switch (fieldName) {
      case 'baslik':
      case 'title':
        if (!(value as string)?.trim()) {
          newErrors[fieldName] = 'İlanınız için dikkat çekici bir başlık girin';
        } else {
          delete newErrors[fieldName];
        }
        break;

      case 'fiyat':
      case 'price':
        if (!value) {
          newErrors[fieldName] = 'Fiyat alanı boş bırakılamaz';
        } else if (isNaN(Number(value)) || Number(value) <= 0) {
          newErrors[fieldName] = 'Geçerli bir fiyat giriniz';
        } else {
          delete newErrors[fieldName];
        }
        break;

      case 'paraBirimi':
      case 'currency':
        if (!(value as string)?.trim()) {
          newErrors[fieldName] = 'Para birimi seçilmelidir';
        } else {
          delete newErrors[fieldName];
        }
        break;

      case 'acikAdres':
      case 'address':
        if (!(value as string)?.trim()) {
          newErrors[fieldName] = 'Açık adres alanı boş bırakılamaz';
        } else {
          delete newErrors[fieldName];
        }
        break;

      case 'durum':
      case 'condition':
        if (!(value as string)?.trim()) {
          newErrors[fieldName] = 'Ürün durumunu seçmelisiniz';
        } else {
          delete newErrors[fieldName];
        }
        break;

      case 'il':
      case 'ilce':
      case 'mahalle':
      case 'city':
      case 'district':
      case 'neighborhood': {
        if (!(value as string)?.trim()) {
          const fieldLabel: Record<string, string> = {
            il: 'İl',
            ilce: 'İlçe',
            mahalle: 'Mahalle',
            city: 'İl',
            district: 'İlçe',
            neighborhood: 'Mahalle'
          };
          newErrors[fieldName] = `${fieldLabel[fieldName] || fieldName} alanı boş bırakılamaz`;
        } else {
          delete newErrors[fieldName];
        }
        break;
      }

      default:
        if (!value && value !== 0 && value !== false) {
          newErrors[fieldName] = 'Bu alan boş bırakılamaz';
        } else {
          delete newErrors[fieldName];
        }
    }

    return { newErrors, isValid: Object.keys(newErrors).length === 0 };
  }

  validateForm(
    formData: Record<string, unknown>,
    requiredFields: string[] | null = null
  ): { errors: Record<string, string>; isValid: boolean } {
    let errors: Record<string, string> = {};
    let isValid = true;

    const defaultRequiredFields = [
      'baslik',
      'fiyat',
      'paraBirimi',
      'il',
      'ilce',
      'mahalle',
      'acikAdres',
      'durum'
    ];

    const fieldsToValidate = requiredFields || defaultRequiredFields;

    fieldsToValidate.forEach((field) => {
      const { newErrors, isValid: fieldValid } = this.validateField(
        field,
        formData[field],
        errors
      );
      errors = newErrors;

      if (!fieldValid) {
        isValid = false;
      }
    });

    return { errors, isValid };
  }

  checkFormValidity(
    formData: Record<string, unknown>,
    isRulesAccepted = true,
    imagesLength = 0
  ): boolean {
    const requiredFields = [
      'baslik',
      'fiyat',
      'paraBirimi',
      'il',
      'ilce',
      'mahalle',
      'acikAdres',
      'durum'
    ];

    const isAllFieldsFilled = requiredFields.every(
      (field) => formData[field] && String(formData[field]).trim() !== ''
    );

    return isAllFieldsFilled && isRulesAccepted && imagesLength > 0;
  }

  // ==================== FORM TASLAK YÖNETİMİ ====================

  saveDraft(formData: Record<string, unknown>): boolean {
    try {
      const draft = {
        data: formData,
        timestamp: Date.now(),
        categories: this.getSelectedCategories()
      };

      this.setCacheItem('form_draft', draft);
      console.log('✅ Form taslağı kaydedildi');

      return true;
    } catch (error) {
      console.error('❌ Taslak kaydetme hatası:', error);
      return false;
    }
  }

  getDraft(): { data: Record<string, unknown>; timestamp: number; categories: unknown } | null {
    try {
      const draft = this.getCacheItem('form_draft') as {
        data: Record<string, unknown>;
        timestamp: number;
        categories: unknown;
      } | null;

      if (!draft) {
        return null;
      }

      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (draft.timestamp < oneDayAgo) {
        this.removeCacheItem('form_draft');
        console.log('⚠️ Eski taslak silindi');
        return null;
      }

      console.log('✅ Form taslağı bulundu');
      return draft;
    } catch (error) {
      console.error('❌ Taslak okuma hatası:', error);
      return null;
    }
  }

  clearDraft(): boolean {
    try {
      this.removeCacheItem('form_draft');
      console.log('✅ Form taslağı silindi');
      return true;
    } catch (error) {
      console.error('❌ Taslak silme hatası:', error);
      return false;
    }
  }

  // ==================== YARDIMCI FONKSİYONLAR ====================

  async fetchListingDetails(id: number | string): Promise<Record<string, unknown>> {
    try {
      console.log(`📥 İlan detayları getiriliyor (ID: ${id})...`);

      if (this.USE_MOCK_DATA) {
        console.warn('⚠️ fetchListingDetails: Mock data döndürülüyor');

        return {
          baslik: '',
          fiyat: '',
          paraBirimi: 'TL',
          il: '',
          ilce: '',
          mahalle: '',
          acikAdres: '',
          takas: false,
          durum: '',
          kategori0: '',
          kategori1: '',
          kategori2: '',
          kategori3: '',
          photos: []
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/listings/${id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'İlan detayları alınamadı');
      }

      return result.data;
    } catch (error) {
      console.error('❌ İlan detayları getirilirken hata:', error);
      throw error;
    }
  }

  getAuthToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // ==================== MOCK DATA FONKSİYONLARI (Geçici) ====================

  mockCreateListing(listingData: Record<string, unknown>): Promise<MockListing> {
    const newListing: MockListing = {
      listing_id: this.mockListingIdCounter++,
      ...listingData,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      views: 0,
      favorites: 0
    };

    this.mockListings.push(newListing);

    console.log('✅ İlan oluşturuldu (mock):', newListing.listing_id);
    return Promise.resolve(newListing);
  }

  mockUpdateListing(
    listingId: number | string,
    listingData: Record<string, unknown>
  ): Promise<MockListing> {
    const index = this.mockListings.findIndex((l) => l.listing_id === listingId);

    if (index === -1) {
      return Promise.reject(new Error('İlan bulunamadı'));
    }

    this.mockListings[index] = {
      ...this.mockListings[index],
      ...listingData,
      updated_at: new Date().toISOString()
    };

    console.log('✅ İlan güncellendi (mock):', listingId);
    return Promise.resolve(this.mockListings[index]);
  }

  mockDeleteListing(listingId: number | string): Promise<boolean> {
    const index = this.mockListings.findIndex((l) => l.listing_id === listingId);

    if (index === -1) {
      return Promise.reject(new Error('İlan bulunamadı'));
    }

    this.mockListings.splice(index, 1);

    console.log('✅ İlan silindi (mock):', listingId);
    return Promise.resolve(true);
  }

  mockUploadImages(files: File[]): Promise<UploadedImage[]> {
    const uploadedImages: UploadedImage[] = files.map((file, index) => ({
      image_id: `img_${Date.now()}_${index}`,
      url: URL.createObjectURL(file),
      thumbnail: URL.createObjectURL(file),
      original_name: file.name,
      size: file.size,
      order: index,
      uploaded_at: new Date().toISOString()
    }));

    console.log(`✅ ${uploadedImages.length} görsel yüklendi (mock)`);
    return Promise.resolve(uploadedImages);
  }

  // ==================== İLAN VERME SÜRECİ YÖNETİMİ ====================

  getSessionKeys(): SessionKeys {
    return {
      FORM_SESSION_ID: 'formSessionId',
      LAST_FORM_STATE: 'lastFormState',
      LISTING_PUBLISHED: 'listingPublished',
      EDITING_MODE: 'editingMode',
      CURRENT_FORM_DATA: 'currentFormData',
      LISTING_FORM_DATA: 'listingFormData',
      SELECTED_CITY: 'selectedCity',
      SELECTED_DISTRICT: 'selectedDistrict',
      SELECTED_DISTRICTS: 'selectedDistricts',
      SELECTED_NEIGHBORHOOD: 'selectedNeighborhood',
      CATEGORY_FIELD_LABELS: 'categoryFieldLabels',
      FORM_EXIT_TIME: 'formExitTime',
      LAST_FORM_CATEGORY: 'lastFormCategory'
    };
  }

  startNewFormSession(): void {
    if (typeof window === 'undefined') return;
    try {
      const keys = this.getSessionKeys();

      const currentPath = window.location.pathname;
      const editingId = sessionStorage.getItem('editingListingId');
      const hasExistingFormData = sessionStorage.getItem('currentFormData');

      const isEditMode =
        currentPath.includes('/duzenle') ||
        currentPath.includes('/edit') ||
        editingId !== null ||
        (hasExistingFormData && sessionStorage.getItem(keys.EDITING_MODE));

      if (isEditMode) {
        console.log('📝 Düzenleme modu tespit edildi, yeni session başlatılmıyor');
        return;
      }

      sessionStorage.removeItem(keys.LISTING_PUBLISHED);
      sessionStorage.removeItem(keys.EDITING_MODE);
      sessionStorage.removeItem(keys.LAST_FORM_STATE);

      const sessionId = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(keys.FORM_SESSION_ID, sessionId);

      console.log('✅ Yeni form session başlatıldı:', sessionId);
    } catch (error) {
      console.error('❌ Yeni session başlatma hatası:', error);
    }
  }

  isSessionValid(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const keys = this.getSessionKeys();

      const isPublished = sessionStorage.getItem(keys.LISTING_PUBLISHED);
      if (isPublished === 'true') {
        console.log('⚠️ Session geçersiz: İlan yayınlandı');
        return false;
      }

      const isEditing = sessionStorage.getItem(keys.EDITING_MODE);
      if (isEditing === 'true') {
        console.log('📝 Düzenleme modu aktif, session geçerli sayılıyor');
      }

      const sessionId = sessionStorage.getItem(keys.FORM_SESSION_ID);
      const isEditMode =
        window.location.pathname.includes('/duzenle') ||
        window.location.pathname.includes('/edit') ||
        sessionStorage.getItem('editingListingId') !== null;

      if (!sessionId && !isEditMode) {
        console.log('⚠️ Session geçersiz: Session ID yok (yeni ilan modunda)');
        return false;
      }

      if (isEditMode) {
        console.log('✅ Session geçerli: Düzenleme modu');
      } else {
        console.log('✅ Session geçerli:', sessionId);
      }

      return true;
    } catch (error) {
      console.error('❌ Session kontrol hatası:', error);
      return false;
    }
  }

  checkFormStateChange(formData: Record<string, unknown>): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const keys = this.getSessionKeys();
      const currentFormHash = JSON.stringify(formData);
      const lastFormState = sessionStorage.getItem(keys.LAST_FORM_STATE);

      if (lastFormState && lastFormState !== currentFormHash) {
        console.log('🔄 Form değişikliği tespit edildi');
        return true;
      }

      sessionStorage.setItem(keys.LAST_FORM_STATE, currentFormHash);
      return false;
    } catch (error) {
      console.error('❌ Form durum kontrol hatası:', error);
      return false;
    }
  }

  markListingAsPublished(): void {
    if (typeof window === 'undefined') return;
    try {
      const keys = this.getSessionKeys();
      sessionStorage.setItem(keys.LISTING_PUBLISHED, 'true');
      console.log('✅ İlan yayınlandı olarak işaretlendi');
      this.clearFormSession();
    } catch (error) {
      console.error('❌ İlan yayınlama işaretleme hatası:', error);
    }
  }

  markAsEditingMode(): void {
    if (typeof window === 'undefined') return;
    try {
      const keys = this.getSessionKeys();
      sessionStorage.setItem(keys.EDITING_MODE, 'true');
      console.log('📝 Düzenleme modu aktif olarak işaretlendi');
    } catch (error) {
      console.error('❌ Düzenleme modu işaretleme hatası:', error);
    }
  }

  clearFormSession(): void {
    if (typeof window === 'undefined') return;
    try {
      const keys = this.getSessionKeys();

      sessionStorage.removeItem(keys.FORM_SESSION_ID);
      sessionStorage.removeItem(keys.LAST_FORM_STATE);
      sessionStorage.removeItem(keys.CURRENT_FORM_DATA);
      sessionStorage.removeItem(keys.LISTING_FORM_DATA);
      sessionStorage.removeItem(keys.SELECTED_CITY);
      sessionStorage.removeItem(keys.SELECTED_DISTRICT);
      sessionStorage.removeItem(keys.SELECTED_DISTRICTS);
      sessionStorage.removeItem(keys.SELECTED_NEIGHBORHOOD);
      sessionStorage.removeItem(keys.CATEGORY_FIELD_LABELS);
      sessionStorage.removeItem(keys.FORM_EXIT_TIME);
      sessionStorage.removeItem(keys.LAST_FORM_CATEGORY);

      console.log('✅ Form session verileri temizlendi');
    } catch (error) {
      console.error('❌ Form session temizleme hatası:', error);
    }
  }

  markFormExit(): void {
    if (typeof window === 'undefined') return;
    try {
      const keys = this.getSessionKeys();
      const exitTime = Date.now();
      sessionStorage.setItem(keys.FORM_EXIT_TIME, exitTime.toString());

      const currentCategory = this.getCurrentCategoryId();
      if (currentCategory) {
        sessionStorage.setItem(keys.LAST_FORM_CATEGORY, currentCategory.toString());
      }

      console.log('✅ Form çıkış zamanı kaydedildi:', new Date(exitTime).toLocaleString('tr-TR'));
    } catch (error) {
      console.error('❌ Form çıkış zamanı kaydetme hatası:', error);
    }
  }

  getCurrentCategoryId(): number | null {
    if (typeof window === 'undefined') return null;
    try {
      for (let i = 6; i >= 1; i--) {
        const levelId = sessionStorage.getItem(`level${i}_id`);
        if (levelId) {
          return parseInt(levelId, 10);
        }
      }

      const selectedCategoryId = sessionStorage.getItem('selectedCategoryId');
      if (selectedCategoryId) {
        return parseInt(selectedCategoryId, 10);
      }

      return null;
    } catch (error) {
      console.error('❌ Kategori ID alma hatası:', error);
      return null;
    }
  }

  checkFormShouldClear(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const keys = this.getSessionKeys();
      const exitTime = sessionStorage.getItem(keys.FORM_EXIT_TIME);
      const lastCategory = sessionStorage.getItem(keys.LAST_FORM_CATEGORY);
      const currentCategory = this.getCurrentCategoryId();

      if (!exitTime) {
        console.log('ℹ️ İlk form girişi, veriler korunuyor');
        return false;
      }

      const timeDiff = Date.now() - parseInt(exitTime, 10);
      const thirtySeconds = 30 * 1000;

      if (timeDiff > thirtySeconds) {
        console.log(
          `⏰ 30 saniyeden fazla geçti (${Math.round(timeDiff / 1000)} saniye), form verileri temizlenecek`
        );
        return true;
      }

      if (lastCategory && currentCategory && lastCategory !== currentCategory.toString()) {
        console.log(
          `🔄 Farklı kategori seçildi (önceki: ${lastCategory}, şimdiki: ${currentCategory}), form verileri temizlenecek`
        );
        return true;
      }

      console.log(
        `✅ 30 saniyeden az geçti (${Math.round(timeDiff / 1000)} saniye) ve aynı kategori, form verileri korunuyor`
      );
      return false;
    } catch (error) {
      console.error('❌ Form temizleme kontrolü hatası:', error);
      return true;
    }
  }

  saveFormData(formData: Record<string, unknown>): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const keys = this.getSessionKeys();
      sessionStorage.setItem(keys.CURRENT_FORM_DATA, JSON.stringify(formData));
      console.log("✅ Form verileri sessionStorage'a kaydedildi");
      return true;
    } catch (error) {
      console.error('❌ Form verileri kaydedilirken hata:', error);
      return false;
    }
  }

  getFormData(): Record<string, unknown> | null {
    if (typeof window === 'undefined') return null;
    try {
      const keys = this.getSessionKeys();
      const formData = sessionStorage.getItem(keys.CURRENT_FORM_DATA);
      return formData ? JSON.parse(formData) : null;
    } catch (error) {
      console.error('❌ Form verileri okunurken hata:', error);
      return null;
    }
  }

  saveListingFormData(listingData: Record<string, unknown>): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const keys = this.getSessionKeys();
      sessionStorage.setItem(keys.LISTING_FORM_DATA, JSON.stringify(listingData));
      console.log("✅ İlan form verileri sessionStorage'a kaydedildi");
      return true;
    } catch (error) {
      console.error('❌ İlan form verileri kaydedilirken hata:', error);
      return false;
    }
  }

  getListingFormData(): Record<string, unknown> | null {
    if (typeof window === 'undefined') return null;
    try {
      const keys = this.getSessionKeys();
      const listingData = sessionStorage.getItem(keys.LISTING_FORM_DATA);
      return listingData ? JSON.parse(listingData) : null;
    } catch (error) {
      console.error('❌ İlan form verileri okunurken hata:', error);
      return null;
    }
  }

  getLocationFromSession(): LocationData {
    if (typeof window === 'undefined')
      return { city: '', district: '', districts: [], neighborhood: '' };
    try {
      const keys = this.getSessionKeys();

      const city =
        sessionStorage.getItem(keys.SELECTED_CITY) ||
        sessionStorage.getItem('selected_city') ||
        sessionStorage.getItem('city_name') ||
        '';

      const district =
        sessionStorage.getItem(keys.SELECTED_DISTRICT) ||
        sessionStorage.getItem('selected_district') ||
        sessionStorage.getItem('district_name') ||
        '';

      const districts = sessionStorage.getItem(keys.SELECTED_DISTRICTS);
      const districtsArray = districts ? JSON.parse(districts) : [];

      const neighborhood =
        sessionStorage.getItem(keys.SELECTED_NEIGHBORHOOD) ||
        sessionStorage.getItem('selected_neighborhood') ||
        sessionStorage.getItem('neighborhood_name') ||
        '';

      return {
        city,
        district,
        districts: districtsArray,
        neighborhood
      };
    } catch (error) {
      console.error('❌ Konum verileri alınırken hata:', error);
      return {
        city: '',
        district: '',
        districts: [],
        neighborhood: ''
      };
    }
  }

  getCategoryFieldLabels(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    try {
      const keys = this.getSessionKeys();
      const labels = sessionStorage.getItem(keys.CATEGORY_FIELD_LABELS);
      return labels ? JSON.parse(labels) : {};
    } catch (error) {
      console.error('❌ Kategori alan başlıkları okunurken hata:', error);
      return {};
    }
  }

  saveCategoryFieldLabels(labels: Record<string, string>): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const keys = this.getSessionKeys();
      sessionStorage.setItem(keys.CATEGORY_FIELD_LABELS, JSON.stringify(labels));
      console.log('✅ Kategori alan başlıkları kaydedildi');
      return true;
    } catch (error) {
      console.error('❌ Kategori alan başlıkları kaydedilirken hata:', error);
      return false;
    }
  }

  async transformFormDataForPreview(
    formData: Record<string, unknown>
  ): Promise<TransformedData | null> {
    try {
      console.log('🔄 Form verisi önizleme formatına dönüştürülüyor...');

      if (!formData) {
        throw new Error('Form verisi bulunamadı');
      }

      if (this.checkFormStateChange(formData)) {
        console.log('🔄 Form değişikliği tespit edildi, yeni session başlatılıyor');
        this.startNewFormSession();
      }

      if (!this.isSessionValid()) {
        console.log('⚠️ Session geçersiz, yeni session başlatılıyor');
        this.startNewFormSession();
      }

      const location = this.getLocationFromSession();
      const fieldLabels = this.getCategoryFieldLabels();
      const currentFormData = this.getFormData();
      const allFormData = { ...formData, ...(currentFormData || {}) };

      const transformedData: TransformedData = {
        title: (allFormData.title as string) || '',
        description: (allFormData.description as string) || '',
        price: (allFormData.price as number) || null,
        currency: (allFormData.currency as string) || 'TL',
        condition: (allFormData.condition as string) || '',
        exchange: (allFormData.exchange as boolean) || false,

        city: location.city || (allFormData.city as string) || '',
        district: location.district || (allFormData.district as string) || '',
        districts: location.districts || (allFormData.districts as string[]) || [],
        neighborhood: location.neighborhood || (allFormData.neighborhood as string) || '',
        address: (allFormData.address as string) || '',

        selectedCategory: allFormData.selectedCategory || null,

        images: (allFormData.images as unknown[]) || [],

        categoryFields: {},

        createdAt: Date.now(),
        previewVersion: '1.0'
      };

      Object.keys(allFormData).forEach((key) => {
        if (key.startsWith('category_') && allFormData[key]) {
          transformedData.categoryFields[key] = {
            value: allFormData[key],
            label: fieldLabels[key] || key.replace('category_', '').replace('_', ' ')
          };
          transformedData[key] = allFormData[key];
        }
      });

      console.log('✅ Form verisi önizleme formatına dönüştürüldü:', {
        title: transformedData.title,
        imageCount: transformedData.images.length,
        categoryFieldsCount: Object.keys(transformedData.categoryFields).length
      });

      return transformedData;
    } catch (error) {
      console.error('❌ Form verisi dönüştürülürken hata:', error);
      return null;
    }
  }
}

// Singleton instance
const createListingService = new CreateListingService();

// Export
export default createListingService;
export { CreateListingService };
