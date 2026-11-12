/**
 * Kategori Ağaç Servisi (Dinamik Backend API Entegrasyonu)
 * 
 * Bu servis, kategori ağaç yapısı ve kategori yolu (breadcrumb) işlemlerini yönetir.
 * Statik JSON (categories-data.json) KULLANMAZ, tüm verileri doğrudan
 * categoryService üzerinden backend API'sinden (/api/v1/categories) çeker.
 */

import categoryService from '../category/categoryService';
import CategoryUtils from '../category/CategoryUtils';

// Bellek içi hızlı önbellek
const pathMemoryCache = new Map<string, Array<{ id: number; name: string; slug?: string; parentId?: number | null; count?: number }>>();
const subcatsMemoryCache = new Map<string, Array<{ id: number; name: string; slug?: string; parentId?: number | null; count?: number }>>();

/**
 * Kategori ID'sini doğrular ve sayıya çevirir
 */
export const sanitizeCategoryId = (id: unknown): number | null => {
  if (id === null || id === undefined || id === '') return null;
  const num = Number(id);
  return isNaN(num) ? null : num;
};

/**
 * Kategori adını SEO dostu slug formatına dönüştürür
 */
export const createCategorySlug = (categoryName: string): string => {
  if (!categoryName) return '';
  return CategoryUtils.slugify(categoryName);
};

/**
 * Belirli bir kategori ID'sinin bağlı olduğu tam kategori yolunu bulur
 * Doğrudan categoryService.getCategoryPath API'sini kullanır.
 * 
 * @param categoryId - Kategori ID'si
 * @returns Kategori yolu (en üst ana kategoriden hedef kategoriye doğru)
 */
export const findCategoryPath = async (
  categoryId: number | string
): Promise<Array<{ id: number; name: string; slug?: string; parentId?: number | null; count?: number }>> => {
  const validId = sanitizeCategoryId(categoryId);
  if (validId === null) return [];

  const cacheKey = `path_${validId}`;
  if (pathMemoryCache.has(cacheKey)) {
    return pathMemoryCache.get(cacheKey)!;
  }

  try {
    console.log(`🔍 [CategoryTreeService] Kategori ${validId} için dinamik yol alınıyor...`);
    const path = await categoryService.getCategoryPath(validId);

    if (path && Array.isArray(path) && path.length > 0) {
      const normalizedPath = path.map((cat: any) => ({
        id: Number(cat.category_id || cat.id),
        name: cat.label || cat.name || '',
        slug: cat.slug || createCategorySlug(cat.label || cat.name || ''),
        parentId: cat.parent_id !== undefined ? (cat.parent_id ? Number(cat.parent_id) : null) : null,
        count: cat.count || 0
      }));

      pathMemoryCache.set(cacheKey, normalizedPath);
      return normalizedPath;
    }

    // Tek kategori olarak dön (fallback)
    const singleCat = await categoryService.getCategoryById(validId);
    if (singleCat) {
      const singlePath = [{
        id: Number(singleCat.category_id || singleCat.id),
        name: singleCat.label || singleCat.name || '',
        slug: singleCat.slug || createCategorySlug(singleCat.label || singleCat.name || ''),
        parentId: singleCat.parent_id ? Number(singleCat.parent_id) : null,
        count: singleCat.count || 0
      }];
      pathMemoryCache.set(cacheKey, singlePath);
      return singlePath;
    }

    return [];
  } catch (error) {
    console.error(`[CategoryTreeService] Kategori yolu alınamadı (CategoryID=${categoryId}):`, error);
    return [];
  }
};

/**
 * Kategori ID'sine göre ağaç yapısını getirir (CategoryTreeView & CategoryPathDisplay için)
 */
export const getCategoryTree = async (categoryId: number | string) => {
  const validId = sanitizeCategoryId(categoryId);
  if (validId === null) {
    return {
      success: false,
      message: 'Geçersiz kategori ID\'si',
      data: null
    };
  }

  try {
    const categoryPath = await findCategoryPath(validId);

    if (!categoryPath || categoryPath.length === 0) {
      return {
        success: false,
        message: `Kategori yolu bulunamadı: CategoryID=${validId}`,
        data: null
      };
    }

    return {
      success: true,
      message: 'Kategori ağacı başarıyla getirildi',
      data: {
        categoryId: validId,
        categoryPath: categoryPath
      },
      hash: `signed_${validId}_${Date.now()}`
    };
  } catch (error: any) {
    console.error('Kategori ağacı getirilemedi:', error);
    return {
      success: false,
      message: error?.message || 'Kategori ağacı getirilemedi',
      data: null
    };
  }
};

/**
 * Belirli bir kategorinin alt kategorilerini getirir
 * Doğrudan categoryService.getSubCategories API'sini kullanır.
 * 
 * @param categoryId - Üst kategori ID'si
 */
export const getSubCategories = async (categoryId: number | string) => {
  const validId = sanitizeCategoryId(categoryId);
  if (validId === null) {
    return {
      success: false,
      message: 'Geçersiz kategori ID\'si',
      data: { categoryId: 0, subcategories: [], subCategories: [] }
    };
  }

  const cacheKey = `subcats_${validId}`;
  if (subcatsMemoryCache.has(cacheKey)) {
    const cached = subcatsMemoryCache.get(cacheKey)!;
    return {
      success: true,
      message: 'Alt kategoriler önbellekten alındı',
      data: {
        categoryId: validId,
        subcategories: cached,
        subCategories: cached
      },
      source: 'cache'
    };
  }

  try {
    console.log(`🔍 [CategoryTreeService] Kategori ${validId} için dinamik alt kategoriler getiriliyor...`);
    const subcategories = await categoryService.getSubCategories(validId);

    const normalized = (subcategories || []).map((cat: any) => ({
      id: Number(cat.category_id || cat.id),
      name: cat.label || cat.name || '',
      slug: cat.slug || createCategorySlug(cat.label || cat.name || ''),
      parentId: cat.parent_id !== undefined ? (cat.parent_id ? Number(cat.parent_id) : null) : validId,
      count: cat.count || 0
    }));

    subcatsMemoryCache.set(cacheKey, normalized);

    return {
      success: true,
      message: 'Alt kategoriler başarıyla getirildi',
      data: {
        categoryId: validId,
        subcategories: normalized,
        subCategories: normalized
      },
      source: 'categoryService'
    };
  } catch (error: any) {
    console.error(`Alt kategoriler getirilemedi (CategoryID=${categoryId}):`, error);
    return {
      success: false,
      message: error?.message || 'Alt kategoriler getirilemedi',
      data: {
        categoryId: validId,
        subcategories: [],
        subCategories: []
      }
    };
  }
};

/**
 * Kategori yolunu formatlar
 * Hem { categories: Array } şeklinde destructure edilmeye hem de string olarak yazdırılmaya uygundur.
 */
export const formatCategoryPath = (categoryPath: any) => {
  const categories = Array.isArray(categoryPath) ? categoryPath : [];
  const text = categories.map((cat: any) => cat.name || cat.label || '').filter(Boolean).join(' > ');

  return {
    categories,
    text,
    toString: () => text
  };
};

/**
 * Kategori önbelleğini temizler
 */
export const clearCategoryCache = async () => {
  pathMemoryCache.clear();
  subcatsMemoryCache.clear();
  return {
    success: true,
    message: 'Kategori önbelleği temizlendi'
  };
};

/**
 * Kategori ID'sine göre URL'i günceller (/filtrele/ana-kategori/alt-kategori)
 */
export const updateCategoryInUrl = async (
  newCategoryId: number | string,
  navigate: (url: string, opts?: { replace?: boolean }) => void,
  preserveParams = false
): Promise<boolean> => {
  try {
    const validId = sanitizeCategoryId(newCategoryId);
    if (!validId && validId !== 0) {
      console.error('updateCategoryInUrl: Geçersiz kategori ID\'si:', newCategoryId);
      return false;
    }

    if (validId === 0) {
      const targetUrl = preserveParams && typeof window !== 'undefined'
        ? `/filtrele/tum-ilanlar${window.location.search}`
        : '/filtrele/tum-ilanlar';
      if (navigate) navigate(targetUrl, { replace: true });
      return true;
    }

    const categoryPath = await findCategoryPath(validId);
    let pathSegments = ['filtrele'];

    if (categoryPath && categoryPath.length > 0) {
      categoryPath.forEach((cat) => {
        if (cat?.name) {
          pathSegments.push(createCategorySlug(cat.name));
        }
      });
    } else {
      pathSegments.push(String(validId));
    }

    let newPath = '/' + pathSegments.join('/');
    let query = '';
    if (preserveParams && typeof window !== 'undefined') {
      query = window.location.search || '';
    }

    const fullUrl = `${newPath}${query}`;
    if (navigate) {
      navigate(fullUrl, { replace: true });
    }
    return true;
  } catch (error) {
    console.error('URL güncellenirken hata:', error);
    return false;
  }
};

/**
 * Verilen kategori ID'sine bağlı tüm alt (leaf) kategori ID'lerini bulur
 */
export const getLeafCategoryIds = async (categoryId: number | string): Promise<number[]> => {
  const validId = sanitizeCategoryId(categoryId);
  if (!validId || validId === 0) return [0];

  const leafCategoryIds: number[] = [];
  const visited = new Set<number>();

  const traverse = async (parentId: number) => {
    if (visited.has(parentId)) return;
    visited.add(parentId);

    try {
      const result = await getSubCategories(parentId);
      const subcats = result.data?.subcategories || result.data?.subCategories || [];

      if (!subcats || subcats.length === 0) {
        leafCategoryIds.push(parentId);
      } else {
        await Promise.all(
          subcats.map((sub: any) => {
            const subId = Number(sub.id || sub.category_id);
            return traverse(subId);
          })
        );
      }
    } catch {
      leafCategoryIds.push(parentId);
    }
  };

  await traverse(validId);
  return leafCategoryIds.length > 0 ? Array.from(new Set(leafCategoryIds)) : [validId];
};

/**
 * Ön yükleme fonksiyonu
 */
export const preloadCategoryData = async (): Promise<boolean> => {
  try {
    await categoryService.getMainCategories();
    return true;
  } catch {
    return false;
  }
};

/**
 * Popüler kategorileri önceden hazırlar
 */
export const preloadPopularCategories = async (categoryIds: (number | string)[]): Promise<boolean> => {
  try {
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) return false;
    await Promise.all(categoryIds.map((id) => getSubCategories(id)));
    return true;
  } catch {
    return false;
  }
};

/**
 * URL'deki kategori slug'ından (veya hiyerarşik yolundan) kategori ID'sini bulur
 */
export const getCategoryIdBySlug = async (categorySlug: string): Promise<number | null> => {
  if (!categorySlug) return null;

  try {
    const leafSlug = categorySlug.includes('/')
      ? categorySlug.split('/').filter(Boolean).pop() || categorySlug
      : categorySlug;

    const normalizedLeafSlug = leafSlug.toLowerCase().trim();
    if (normalizedLeafSlug === 'tum-ilanlar') return 0;

    // 1. Doğrudan API'den slug sorgula
    const category = await categoryService.getCategoryBySlug(normalizedLeafSlug);
    if (category) {
      const id = category.category_id || (category as any).id;
      if (id !== undefined && id !== null) {
        return Number(id);
      }
    }

    // 2. Ana kategoriler içinde ara
    const mainCategories = await categoryService.getMainCategories();
    const foundMain = (mainCategories || []).find(
      (c) => (c.slug && c.slug.toLowerCase() === normalizedLeafSlug) ||
             (c.label && createCategorySlug(c.label).toLowerCase() === normalizedLeafSlug)
    );
    if (foundMain) {
      return Number(foundMain.category_id || foundMain.id);
    }

    return null;
  } catch (error) {
    console.error('[CategoryTreeService] Slug\'dan kategori ID\'si bulma hatası:', error);
    return null;
  }
};

export default {
  sanitizeCategoryId,
  createCategorySlug,
  findCategoryPath,
  getCategoryTree,
  getSubCategories,
  formatCategoryPath,
  clearCategoryCache,
  updateCategoryInUrl,
  getLeafCategoryIds,
  preloadCategoryData,
  preloadPopularCategories,
  getCategoryIdBySlug
};