"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './Breadcrumb2.css';
import { decodeHtmlEntities } from '@/services/listings/util/listingUtils';
import { updateCategoryInUrl } from '@/services/filters/categoryTreeService';

/**
 * Kategori adını SEO dostu slug formatına dönüştürür
 */
const createCategorySlug = (categoryName: string): string => {
  if (!categoryName) return '';

  const turkishChars: Record<string, string> = {
    'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c',
    'İ': 'I', 'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'Ö': 'O', 'Ç': 'C'
  };
  let slug = categoryName.toString().toLowerCase();

  slug = slug.replace(/[ıİğĞüÜşŞöÖçÇ]/g, (char) => turkishChars[char] || char);

  slug = slug
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return slug;
};

interface CategoryPathItem {
  label?: string;
  name?: string;
  category_id?: number | string;
  id?: number | string;
  url?: string;
  slug?: string;
  isClickable?: boolean;
  categoryLevel?: number;
  isSpecialPage?: boolean;
}

interface BreadcrumbItem {
  id: string | number;
  name: string;
  url: string;
  isHome?: boolean;
  isLast?: boolean;
  slug?: string;
  isClickable?: boolean;
  categoryLevel?: number;
  isSpecialPage?: boolean;
}

interface Breadcrumb2Props {
  className?: string;
  containerClass?: string;
  categoryPath?: CategoryPathItem[];
  adTitle?: string;
  isLoading?: boolean;
  onCategoryClick?: ((item: BreadcrumbItem, index: number) => void) | null;
}

/**
 * Breadcrumb2 bileşeni - Hiyerarşik kategori yolu gösterir
 * İlan detay sayfalarında kullanılır
 */
const Breadcrumb2: React.FC<Breadcrumb2Props> = ({
  className,
  containerClass,
  categoryPath = [],
  adTitle = '',
  isLoading = false,
  onCategoryClick = null
}) => {
  const pathname = usePathname();
  const router = useRouter();

  // Doğrudan ana sayfaya gitme işlevi
  const goToHomePage = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/');
  };

  // Kategori sayfasına gitme işlevi
  const goToCategoryPage = (
    e: React.MouseEvent,
    categoryId: string | number | undefined,
    slug: string | undefined
  ) => {
    e.preventDefault();

    if (categoryId) {
      updateCategoryInUrl(categoryId, (path: string) => { router.push(path); });
    } else if (slug) {
      router.push(`/kategoriler/${slug}`);
    } else {
      router.push('/kategoriler');
    }
  };

  // Debug: categoryPath'i logla
  React.useEffect(() => {
    if (categoryPath && categoryPath.length > 0) {
      console.log('🔍 [Breadcrumb2] categoryPath:', categoryPath);
    }
  }, [categoryPath]);

  // Diğer sayfalar için yönlendirme
  const handleNavigation = (
    e: React.MouseEvent,
    path: string,
    item: BreadcrumbItem,
    index: number
  ) => {
    if (path === '/') {
      goToHomePage(e);
      return;
    }

    e.preventDefault();

    if (item.id === 'ilan-ver') {
      router.push('/ilan-ver');
      return;
    }

    if (onCategoryClick && typeof onCategoryClick === 'function' && !item.isLast) {
      onCategoryClick(item, index);
      return;
    }

    const isFilterPage = pathname.includes('/filtrele') || pathname.includes('/filter');
    const isProductDetailPage = pathname.includes('/ilan/') || pathname.includes('/product/');

    if ((isFilterPage || isProductDetailPage) && !item.isHome && !item.isLast && item.id !== 'ilan-ver') {
      goToCategoryPage(e, item.id, item.slug);
      return;
    }
  };

  // Yükleniyor veya boşsa gösterme
  if (isLoading || (!categoryPath.length && !adTitle)) {
    return null;
  }

  // Tüm breadcrumb öğelerini oluştur
  const items: BreadcrumbItem[] = [
    {
      id: 'home',
      name: 'Ana Sayfa',
      url: '/',
      isHome: true
    },
    ...categoryPath.map((category, index) => {
      const categoryName = category.label || category.name || '';
      const categoryId = category.category_id || category.id;

      console.log(`📊 [Breadcrumb2] Kategori ${index}:`, { categoryName, categoryId, category });

      return {
        id: categoryId || `category-${index}`,
        name: decodeHtmlEntities(categoryName),
        url: category.url || `/filtrele/${category.slug || createCategorySlug(categoryName)}`,
        isLast: false,
        slug: category.slug || createCategorySlug(categoryName),
        isClickable: category.isClickable,
        categoryLevel: category.categoryLevel,
        isSpecialPage: category.isSpecialPage
      };
    }),
    ...(adTitle ? [{
      id: 'ad-title',
      name: decodeHtmlEntities(adTitle),
      url: pathname,
      isLast: true
    }] : [])
  ];

  // Son kategoriyi işaretle
  if (items.length > 0 && !adTitle) {
    items[items.length - 1].isLast = true;
  }

  const renderHomeItem = () => {
    const homeItem = items.find((item) => item.isHome);
    if (!homeItem) return null;

    return (
      <div className="breadcrumb2-home-wrapper">
        <a
          href="/"
          className="breadcrumb2-link breadcrumb2-home-link"
          onClick={(e) => handleNavigation(e, '/', homeItem, 0)}
          title="Ana Sayfa"
        >
          {homeItem.name}
        </a>
        {items.length > 1 && <span className="breadcrumb2-separator">&#62;</span>}
      </div>
    );
  };

  const renderOtherItems = () => {
    const otherItems = items.filter((item) => !item.isHome);

    return otherItems.map((item, index) => (
      <React.Fragment key={`breadcrumb-${item.id || index}`}>
        {index > 0 && <span className="breadcrumb2-separator">&#62;</span>}
        {item.isLast || item.isClickable === false ? (
          <span className="breadcrumb2-current">{item.name}</span>
        ) : (
          <a
            href={item.url || '/'}
            className="breadcrumb2-link"
            onClick={(e) => handleNavigation(e, item.url || '/', item, index + 1)}
          >
            {item.name}
          </a>
        )}
      </React.Fragment>
    ));
  };

  return (
    <div className={`breadcrumb2-container ${className || ''} ${containerClass || ''}`}>
      <div className="breadcrumb2-content">
        {renderHomeItem()}
        {renderOtherItems()}
      </div>
    </div>
  );
};

export default Breadcrumb2;
