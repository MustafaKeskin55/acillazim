/**
 * CATEGORY UTILITIES
 * Kategori servisi için yardımcı fonksiyonlar
 * - Slug oluşturma
 * - Veri formatlama
 * - Validasyon
 * - Dönüşüm fonksiyonları
 */

interface CategoryItem {
  category_id?: number | string;
  parent_id?: number | string | null;
  label?: string;
  name?: string;
  type?: string;
  slug?: string;
  order?: number;
  hasCustomPage?: boolean;
  children?: CategoryItem[];
  [key: string]: unknown;
}

interface CategoryTreeNode extends CategoryItem {
  children: CategoryTreeNode[];
}

interface CategoryStats {
  total: number;
  mainCategories: number;
  subCategories: number;
  leafCategories: number;
  withCustomPage: number;
}

class CategoryUtils {
  /**
   * Metni URL-dostu slug formatına dönüştür
   * Örnek: "Ustalar ve Hizmetler" → "ustalar-ve-hizmetler"
   */
  static slugify(text: string): string {
    if (!text || typeof text !== 'string') return '';

    return text
      .toString()
      .normalize('NFD')                    // Unicode normalleştir
      .replace(/[\u0300-\u036f]/g, '')     // Aksanlı karakterleri kaldır
      .toLowerCase()                        // Küçük harfe çevir
      .trim()                              // Baş/son boşlukları kaldır
      .replace(/\s+/g, '-')                // Boşlukları tire ile değiştir
      .replace(/&/g, '-')                  // & işaretini tire ile değiştir
      .replace(/[^\w\-]+/g, '')            // Alfanumerik olmayan karakterleri kaldır
      .replace(/\-\-+/g, '-')              // Çift tireleri tek tire yap
      .replace(/^-+/, '')                  // Baştaki tireleri kaldır
      .replace(/-+$/, '');                 // Sondaki tireleri kaldır
  }

  /**
   * Kategori objesini formatla (slug ekle)
   */
  static formatCategory(category: CategoryItem): CategoryItem | null {
    if (!category || typeof category !== 'object') {
      return null;
    }

    return {
      ...category,
      slug: this.slugify(category.label || '')
    };
  }

  /**
   * Kategori listesini formatla
   */
  static formatCategories(categories: CategoryItem[]): CategoryItem[] {
    if (!Array.isArray(categories)) {
      return [];
    }

    return categories.map((cat) => this.formatCategory(cat)).filter(Boolean) as CategoryItem[];
  }

  /**
   * Kategori ID'sini validate et
   */
  static validateCategoryId(category_id: number | string | undefined | null): boolean {
    if (!category_id) {
      console.warn('CategoryUtils: category_id boş');
      return false;
    }

    if (typeof category_id !== 'number' && typeof category_id !== 'string') {
      console.warn('CategoryUtils: category_id geçersiz tip:', typeof category_id);
      return false;
    }

    return true;
  }

  /**
   * Kategori objesini validate et
   */
  static validateCategory(category: CategoryItem | null | undefined): boolean {
    if (!category || typeof category !== 'object') {
      return false;
    }

    // Zorunlu alanlar
    const requiredFields = ['category_id', 'label', 'type'];

    for (const field of requiredFields) {
      if (!(field in category)) {
        console.warn(`CategoryUtils: ${field} alanı eksik`);
        return false;
      }
    }

    return true;
  }

  /**
   * Kategori tipini kontrol et
   */
  static isMainCategory(category: CategoryItem | null | undefined): boolean {
    return Boolean(category && category.type === 'category');
  }

  static isSubCategory(category: CategoryItem | null | undefined): boolean {
    return Boolean(category && category.type === 'subcategory');
  }

  static isLeafCategory(category: CategoryItem | null | undefined): boolean {
    return Boolean(category && category.type === 'leaf');
  }

  /**
   * Kategori hiyerarşisini oluştur (parent → child ilişkisi)
   */
  static buildCategoryTree(categories: CategoryItem[]): CategoryTreeNode[] {
    if (!Array.isArray(categories)) {
      return [];
    }

    const categoryMap = new Map<number | string, CategoryTreeNode>();
    const rootCategories: CategoryTreeNode[] = [];

    // Tüm kategorileri map'e ekle
    categories.forEach((category) => {
      if (category.category_id !== undefined) {
        categoryMap.set(category.category_id, {
          ...category,
          children: []
        });
      }
    });

    // Hiyerarşiyi oluştur
    categories.forEach((category) => {
      if (category.category_id === undefined) return;
      const node = categoryMap.get(category.category_id);
      if (!node) return;

      if (category.parent_id === null) {
        // Ana kategori
        rootCategories.push(node);
      } else if (category.parent_id !== undefined && categoryMap.has(category.parent_id)) {
        // Alt kategori
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return rootCategories;
  }

  /**
   * Kategori yolunu string olarak oluştur
   * Örnek: "Emlak > Konut > Satılık > Daire"
   */
  static buildCategoryPathString(path: CategoryItem[], separator = ' > '): string {
    if (!Array.isArray(path)) {
      return '';
    }

    return path.map((item) => item.label).join(separator);
  }

  /**
   * URL oluştur (slug'lardan)
   */
  static buildCategoryUrl(path: CategoryItem[], baseUrl = '/kategori'): string {
    if (!Array.isArray(path) || path.length === 0) {
      return baseUrl;
    }

    const slugs = path.map((item) => item.slug || this.slugify(item.label || ''));
    return `${baseUrl}/${slugs.join('/')}`;
  }

  /**
   * Kategori ara (Client-side filtre - Sadece yüklü veriler için)
   *
   * NOT: Bu fonksiyon SADECE client-side filtreleme için!
   * Ana arama categoryService.searchCategories() kullanılmalı (Backend API'ye gider)
   *
   * Kullanım Senaryosu: Zaten yüklenmiş kategori listesini client'ta filtrelemek
   * Örnek: Dropdown'da yazmaya başladıkça seçenekleri daraltmak
   *
   * @param categories - Zaten yüklenmiş kategori listesi (Backend'den gelen)
   * @param searchTerm - Filtreleme terimi
   * @returns Filtrelenmiş kategoriler (ID'leri ile)
   */
  static searchInCategories(categories: CategoryItem[], searchTerm: string): CategoryItem[] {
    if (!Array.isArray(categories) || !searchTerm) {
      return [];
    }

    const term = searchTerm.toLowerCase().trim();

    // Sadece client'ta filtreleme (backend'den gelen objeleri filtreliyor)
    return categories.filter(
      (cat) => cat.label && cat.label.toLowerCase().includes(term)
    );
  }

  /**
   * Kategorileri sırala (order'a göre)
   */
  static sortCategories(categories: CategoryItem[]): CategoryItem[] {
    if (!Array.isArray(categories)) {
      return [];
    }

    return [...categories].sort((a, b) => {
      const orderA = a.order || 0;
      const orderB = b.order || 0;
      return orderA - orderB;
    });
  }

  /**
   * Kategorileri filtrele (tip'e göre)
   */
  static filterByType(categories: CategoryItem[], type: string): CategoryItem[] {
    if (!Array.isArray(categories) || !type) {
      return [];
    }

    return categories.filter((cat) => cat.type === type);
  }

  /**
   * Kategorileri filtrele (parent_id'ye göre)
   */
  static filterByParentId(categories: CategoryItem[], parent_id: number | string | null): CategoryItem[] {
    if (!Array.isArray(categories)) {
      return [];
    }

    return categories.filter((cat) => cat.parent_id === parent_id);
  }

  /**
   * Özel sayfası olan kategorileri filtrele
   */
  static filterCustomPageCategories(categories: CategoryItem[]): CategoryItem[] {
    if (!Array.isArray(categories)) {
      return [];
    }

    return categories.filter((cat) => cat.hasCustomPage === true);
  }

  /**
   * Kategori istatistikleri
   */
  static getCategoryStats(categories: CategoryItem[]): CategoryStats {
    if (!Array.isArray(categories)) {
      return {
        total: 0,
        mainCategories: 0,
        subCategories: 0,
        leafCategories: 0,
        withCustomPage: 0
      };
    }

    return {
      total: categories.length,
      mainCategories: categories.filter((cat) => cat.type === 'category').length,
      subCategories: categories.filter((cat) => cat.type === 'subcategory').length,
      leafCategories: categories.filter((cat) => cat.type === 'leaf').length,
      withCustomPage: categories.filter((cat) => cat.hasCustomPage === true).length
    };
  }

  /**
   * Hata mesajı formatla
   */
  static formatError(error: Error | unknown, context = 'Kategori işlemi'): string {
    const timestamp = new Date().toLocaleString('tr-TR');
    const message = (error as Error).message || 'Bilinmeyen hata';

    return `[${timestamp}] ${context}: ${message}`;
  }
}

export default CategoryUtils;
