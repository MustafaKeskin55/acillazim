import serviceFilterData from '@/data/service_filter.json';
import hizmetCategoriesData from '@/data/categroies__hiz_data.json';
import categoryService from '@/services/category/categoryService';

export interface ServiceFieldConfig {
  quick_action: boolean;
  service_description: boolean;
  portfolio_gallery: boolean;
  service_areas: boolean;
  working_hours: boolean;
  certificates: boolean;
  faq: boolean;
  service_packages: boolean;
  service_features: boolean;
  about: boolean;
}

export interface ServiceFieldDefinition {
  label: string;
  description: string;
  type: string;
  db_field: string;
  required?: boolean;
  min_length?: number;
  max_length?: number;
  max_files?: number;
  max_items?: number;
  min_packages?: number;
  max_packages?: number;
  accepted_types?: string[];
}

const defaultFields: ServiceFieldConfig = {
  quick_action: true,
  service_description: true,
  portfolio_gallery: true,
  service_areas: true,
  working_hours: true,
  certificates: false,
  faq: true,
  service_packages: true,
  service_features: true,
  about: true
};

interface CachedCategoryInfo {
  category_id: number;
  type?: string;
  parent_id: number | null;
}

/**
 * categoryService'in localStorage önbelleğinden gerçek BE kategori verisini okur.
 * Senkron kalabilmek için ağ isteği yapmaz; sadece önceden ısıtılmış önbelleğe bakar.
 */
function getCachedCategory(categoryId: number): CachedCategoryInfo | null {
  try {
    const cached = categoryService.getCacheItem(`category_${categoryId}`) as CachedCategoryInfo | null;
    if (cached && cached.category_id !== undefined) return cached;
  } catch {
    // localStorage erişilemezse yoksay, statik yedeğe düş
  }
  return null;
}

/** Önbellekte olmayan kategoriyi arka planda BE'den çekip önbelleği ısıtır (sonraki çağrılar için). */
function warmCategoryCache(categoryId: number): void {
  categoryService.getCategoryById(categoryId).catch(() => {
    // Sessizce yoksay — bir sonraki render statik yedekle çalışmaya devam eder
  });
}

export function getParentSubcategoryId(categoryId: number): number | null {
  // Önce gerçek BE verisini (önbellekten) dene
  const cachedCategory = getCachedCategory(categoryId);
  if (cachedCategory) {
    if (cachedCategory.type === 'subcategory') {
      return cachedCategory.parent_id;
    }
    if (cachedCategory.parent_id) {
      const cachedParent = getCachedCategory(cachedCategory.parent_id);
      if (cachedParent) {
        return cachedParent.type === 'subcategory' ? cachedParent.category_id : null;
      }
      warmCategoryCache(cachedCategory.parent_id);
    }
  } else {
    warmCategoryCache(categoryId);
  }

  // Yedek: statik kategori ağacı (BE önbelleği ısınana kadar kullanılır)
  const category = hizmetCategoriesData.find(
    (c) => c.category_id === categoryId
  );
  if (!category) return null;

  if (category.type === 'subcategory') {
    return category.parent_id;
  }

  const parent = hizmetCategoriesData.find(
    (c) => c.category_id === category.parent_id
  );
  if (!parent) return null;

  if (parent.type === 'subcategory') {
    return parent.category_id;
  }

  return null;
}

export function getServiceFieldsForCategory(
  categoryId: number
): ServiceFieldConfig {
  const subcategoryId = getParentSubcategoryId(categoryId);

  let fields = { ...defaultFields };

  if (
    subcategoryId &&
    serviceFilterData.subcategory_defaults[
      subcategoryId.toString()
    ]
  ) {
    fields = {
      ...fields,
      ...serviceFilterData.subcategory_defaults[subcategoryId.toString()].fields
    };
  }

  const overrides =
    serviceFilterData.category_overrides[categoryId.toString()];
  if (overrides) {
    fields = { ...fields, ...overrides };
  }

  return fields;
}

export function getServiceFieldDefinitions(): Record<
  string,
  ServiceFieldDefinition
> {
  return serviceFilterData.field_definitions;
}

export function getActiveFieldKeys(
  fields: ServiceFieldConfig
): string[] {
  return Object.entries(fields)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key);
}

export function getFeatureOptionsForCategory(
  categoryId: number
): string[] {
  const subcategoryId = getParentSubcategoryId(categoryId);

  if (
    subcategoryId &&
    serviceFilterData.feature_options[subcategoryId.toString()]
  ) {
    return serviceFilterData.feature_options[subcategoryId.toString()].options;
  }

  if (serviceFilterData.feature_options[categoryId.toString()]) {
    return serviceFilterData.feature_options[categoryId.toString()].options;
  }

  return [];
}
