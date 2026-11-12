/**
 * isServiceListing.ts
 *
 * Backend API'den gelen dinamik verilere göre ilanın bir "Hizmet" (Ustalar ve Hizmetler)
 * ilanı mı, yoksa "Satış ve Kiralama" (Emlak, Vasıta, vb.) ilanı mı olduğunu belirler.
 *
 * Dinamik kaynaklar:
 * 1. categoryPath: /api/v1/categories/{categoryId}/path hiyerarşisi (Kök 12540: "Ustalar ve Hizmetler")
 * 2. pathname / URL: /ustalar-ve-hizmetler-... SEO yolu veya /hizmet rotası
 * 3. listing: categoryId/category_id === 12540, is_service, isService, ilan_tip === 'hizmet'
 */

export interface CategoryPathItemLike {
  id?: number | string;
  name?: string;
  label?: string;
  slug?: string;
  [key: string]: unknown;
}

// Hizmet kategorileri kök ID ve aralığı
export const SERVICE_ROOT_CATEGORY_ID = 12540;

/**
 * Verilen kategori ID'sinin Hizmet / Usta kategorisi olup olmadığını kontrol eder.
 * 12540 kök kategori ve 12541-12850 arasındaki tüm alt dallar Hizmet kategorisidir.
 */
export function isServiceCategoryId(catId: number | string | undefined | null): boolean {
  if (catId === undefined || catId === null) return false;
  const num = Number(catId);
  if (isNaN(num)) return false;
  return num === SERVICE_ROOT_CATEGORY_ID || (num >= 12540 && num <= 12850);
}

export function isServiceListing(
  product?: Record<string, unknown> | null,
  categoryPath?: CategoryPathItemLike[] | null,
  pathname?: string | null
): boolean {
  // 1. URL / Pathname kontrolü (En hızlı ve güvenilir: SEO URL örn: /ustalar-ve-hizmetler-...)
  const currentPath =
    pathname ||
    (typeof window !== 'undefined' ? `${window.location.pathname} ${window.location.href}` : '');
  if (currentPath) {
    const lower = currentPath.toLowerCase();
    if (
      lower.includes('ustalar-ve-hizmetler') ||
      lower.includes('ustalar_ve_hizmetler') ||
      lower.includes('/ustalar-') ||
      lower.includes('/hizmet') ||
      lower.includes('/service')
    ) {
      return true;
    }
  }

  // 2. Dinamik Kategori Yolu kontrolü (Backend /api/v1/categories/{categoryId}/path)
  if (Array.isArray(categoryPath) && categoryPath.length > 0) {
    const isServicePath = categoryPath.some((cat) => {
      const catId = Number(cat.id);
      if (isServiceCategoryId(catId)) return true;
      const label = String(cat.label || cat.name || cat.slug || '').toLowerCase();
      if (
        label.includes('ustalar') ||
        label.includes('hizmet') ||
        label.includes('servis') ||
        label.includes('tadilat') ||
        label.includes('tesisat') ||
        label.includes('usta')
      ) {
        return true;
      }
      return false;
    });
    if (isServicePath) return true;
  }

  // 3. İlan verisi özellikleri kontrolü (Backend'den dönen alanlar)
  if (product && typeof product === 'object') {
    const catId = Number(
      product.category_id ?? product.categoryId ?? product.root_category_id ?? product.rootCategoryId ?? 0
    );
    if (isServiceCategoryId(catId)) return true;

    if (product.is_service === true || product.isService === true) return true;

    const tip = String(product.ilan_tip || product.ilanTipi || product.type || '').toLowerCase().trim();
    if (tip.includes('hizmet') || tip.includes('service')) return true;

    // Kategori objesi varsa (örn. form / preview verisi)
    const category = product.category as Record<string, unknown> | undefined;
    const kategori = product.kategori as Record<string, unknown> | undefined;
    const rootCategory = product.rootCategory as Record<string, unknown> | undefined;

    const rootId = Number(rootCategory?.id || category?.parent_id || kategori?.parent_id || 0);
    if (isServiceCategoryId(rootId)) return true;

    const catName = String(
      category?.name || category?.label || kategori?.name || kategori?.label || rootCategory?.name || ''
    ).toLowerCase();
    if (
      catName.includes('ustalar') ||
      catName.includes('hizmet') ||
      catName.includes('service') ||
      catName.includes('tesisat') ||
      catName.includes('usta')
    ) {
      return true;
    }

    // Hizmet ilişkisel tabloları (service_packages, service_areas, service_working_hours, service_faqs)
    if (Array.isArray(product.service_packages) && product.service_packages.length > 0) return true;
    if (Array.isArray(product.packages) && product.packages.length > 0) return true;
    if (Array.isArray(product.service_areas) && product.service_areas.length > 0) return true;
    if (Array.isArray(product.serviceAreas) && product.serviceAreas.length > 0) return true;
    if (product.service_working_hours && typeof product.service_working_hours === 'object') return true;
    if (product.workingHours && typeof product.workingHours === 'object') return true;
    if (Array.isArray(product.service_faqs) && product.service_faqs.length > 0) return true;
    if (Array.isArray(product.serviceFaqs) && product.serviceFaqs.length > 0) return true;

    // Kategori adı veya kategori yolu metin kontrolü
    const directCat = String(product.categoryName || (typeof product.kategori === 'string' ? product.kategori : '') || '').toLowerCase();
    if (directCat.includes('ustalar') || directCat.includes('hizmet')) return true;

    if (Array.isArray(product.kategoriYolu)) {
      const isPathService = product.kategoriYolu.some((p) => {
        const str = String(p || '').toLowerCase();
        return str.includes('ustalar') || str.includes('hizmet');
      });
      if (isPathService) return true;
    }

    if (product.previewProvider) return true;
  }

  return false;
}
