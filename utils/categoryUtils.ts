/**
 * @file: categoryUtils.ts
 * @description: Kategori işlemleri için yardımcı fonksiyonlar
 */

interface RawCategory {
  category_id?: number | string;
  name?: string;
  parent_id?: number | string | null;
  icon?: string;
  bgColor?: string;
  subCategories?: RawCategory[];
}

interface TransformedCategory {
  id: number | string | undefined;
  name: string | undefined;
  parentId: number | string | null | undefined;
  icon: string | undefined;
  bgColor: string | undefined;
  subCategories: RawCategory[] | undefined;
  hasChildren: boolean;
}

interface CategoryNode {
  id: number | string;
  name: string;
  parentId?: number | string | null;
  level?: number;
  [key: string]: unknown;
}

/**
 * API'den gelen kategori verilerini dönüştürür
 */
export const transformCategoryData = (categoryData: RawCategory[]): TransformedCategory[] => {
  if (!Array.isArray(categoryData)) {
    return [];
  }

  return categoryData.map(category => ({
    id: category.category_id,
    name: category.name,
    parentId: category.parent_id,
    icon: category.icon,
    bgColor: category.bgColor,
    subCategories: category.subCategories,
    hasChildren: Array.isArray(category.subCategories) && category.subCategories.length > 0
  }));
};

/**
 * Kategori yolunu oluşturur
 */
export const buildCategoryPath = (categories: CategoryNode[], categoryId: number | string): CategoryNode[] => {
  const path: CategoryNode[] = [];
  let currentCategory = categories.find(c => c.id === categoryId);

  while (currentCategory) {
    path.unshift(currentCategory);
    currentCategory = categories.find(c => c.id === currentCategory!.parentId);
  }

  return path;
};

/**
 * Kategori adını SEO dostu URL formatına dönüştürür
 */
export const createCategorySlug = (categoryName: string): string => {
  if (!categoryName) return '';

  const turkishChars: Record<string, string> = {
    'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c',
    'İ': 'I', 'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'Ö': 'O', 'Ç': 'C'
  };

  let slug = categoryName.toString().toLowerCase();
  slug = slug.replace(/[ıİğĞüÜşŞöÖçÇ]/g, char => turkishChars[char] || char);
  slug = slug
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return slug;
};

/**
 * Alt kategorilerin özetini oluşturur
 */
export const createSubCategorySummary = (subCategories: { name: string }[]): string => {
  if (!Array.isArray(subCategories) || subCategories.length === 0) {
    return '';
  }

  const summary = subCategories
    .slice(0, 3)
    .map(cat => cat.name)
    .join(', ');

  return subCategories.length > 3 ? `${summary}, ...` : summary;
};

/**
 * Kategori ağacını düzleştirir
 */
export const flattenCategoryTree = (category: CategoryNode & { subCategories?: CategoryNode[] }, result: CategoryNode[] = []): CategoryNode[] => {
  result.push({
    id: category.id,
    name: category.name,
    parentId: category.parentId,
    level: category.level || 0
  });

  if (Array.isArray(category.subCategories)) {
    category.subCategories.forEach(subCategory => {
      subCategory.level = (category.level || 0) + 1;
      flattenCategoryTree(subCategory as CategoryNode & { subCategories?: CategoryNode[] }, result);
    });
  }

  return result;
};
