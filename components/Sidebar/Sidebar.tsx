"use client";

import React, { useState, useEffect, useCallback } from 'react';
import './Sidebar.css';
import sidebarService from '@/services/sidebar/sidebarService';
import categoryService from '@/services/category/categoryService';
import categoryApi from '@/api/categoryApi';
import { usePathname, useRouter } from 'next/navigation';

interface Category {
  category_id?: string | number;
  id?: string | number;
  label?: string;
  name?: string;
  slug?: string;
  bgColor?: string;
  icon?: string;
  hasCustomPage?: boolean;
  webUrl?: string;
  type?: string;
}

export type SidebarCategorySource = 'all' | 'service';

interface SidebarProps {
  forceOpen?: boolean;
  /** `service`: yalnızca Ustalar-ve-Hizmetler alt kategorileri (mobil menü bu sayfadayken) */
  categorySource?: SidebarCategorySource;
}

const Sidebar: React.FC<SidebarProps> = ({ forceOpen = false, categorySource = 'all' }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 880);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const normalizeServiceCategories = useCallback((raw: Record<string, unknown>[]): Category[] => {
    return raw.map((category, index) => {
      const categoryName = (category.label || category.name || 'İsimsiz Kategori') as string;
      return {
        id: (category.id || category.category_id || index + 1) as string | number,
        category_id: (category.category_id || category.id) as string | number | undefined,
        label: categoryName,
        name: categoryName,
        icon: (category.icon || 'fa-cog') as string,
        bgColor: (category.bgColor || '#cccccc') as string,
        slug: (category.slug ||
          categoryName.toLowerCase().replace(/\s+/g, '-').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        ) as string,
        webUrl: category.webUrl as string | undefined,
        hasCustomPage: (category.hasCustomPage || false) as boolean,
        type: category.type as string | undefined,
      };
    });
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      if (categorySource === 'service') {
        const svc = await categoryService.getServiceCategories();
        const asRecords = (Array.isArray(svc) ? svc : []) as Record<string, unknown>[];
        if (asRecords.length === 0) {
          setCategories([]);
          setError('Henüz hizmet kategorisi bulunmuyor.');
          return;
        }
        setCategories(normalizeServiceCategories(asRecords));
      } else {
        const data = await (sidebarService as { loadCategories: () => Promise<Category[]> }).loadCategories();
        setCategories(data);
      }
    } catch (err) {
      setError((err as Error).message || 'Kategoriler yüklenirken bir hata oluştu');
    } finally { setLoading(false); }
  }, [categorySource, normalizeServiceCategories]);

  useEffect(() => {
    loadCategories();
    const handleCategoryUpdate = () => loadCategories();
    window.addEventListener('categoriesUpdated', handleCategoryUpdate);
    return () => window.removeEventListener('categoriesUpdated', handleCategoryUpdate);
  }, [loadCategories]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleServiceCategoryClick = async (category: Category) => {
    const categoryId = category.category_id || category.id;
    const categoryName = category.label || category.name || '';
    const categorySlug =
      category.slug ||
      categoryName.replace(/&/g, '-').replace(/\s+/g, '-').replace(/--+/g, '-').toLowerCase();

    if (category.webUrl && category.webUrl.includes('/filtrele')) {
      router.push(category.webUrl);
      return;
    }
    if (category.hasCustomPage === true && category.webUrl) {
      router.push(category.webUrl);
      return;
    }

    try {
      const cat = { category_id: categoryId, type: category.type, name: categoryName, slug: category.slug };
      const hasSubcats = (categoryService as { hasSubCategories: (cat: unknown) => boolean }).hasSubCategories(cat);
      if (!hasSubcats) {
        router.push(`/filtrele/${categorySlug}`);
        return;
      }
    } catch { /* devam */ }

    try {
      await (categoryApi as { initialize: () => Promise<void> }).initialize();
      await (categoryApi as { getCategoryById: (id: unknown) => Promise<{ success: boolean }> }).getCategoryById(categoryId);
    } catch { /* yine de kategori sayfasına git */ }

    router.push(`/kategoriler/${categorySlug}`);
  };

  const handleCategoryClick = async (category: Category) => {
    if (categorySource === 'service') {
      await handleServiceCategoryClick(category);
      return;
    }

    const categoryName = category.label || category.name || '';
    const categoryId = category.category_id || category.id;

    if (category.webUrl && category.webUrl.includes('/filtrele')) {
      window.location.href = category.webUrl; return;
    }
    if (category.hasCustomPage === true && category.webUrl) {
      window.location.href = category.webUrl; return;
    }
    if (category.slug === 'hizmetler' || category.slug === 'ustalar-ve-hizmetler') {
      window.location.href = '/hizmetler'; return;
    }

    const categorySlug = category.slug || categoryName
      .replace(/&/g, '-').replace(/\s+/g, '-').replace(/--+/g, '-').toLowerCase();

    try {
      if (category.type === 'leaf') {
        window.location.href = `/filtrele/${categorySlug}`; return;
      }
      const hasSubcats = (categoryService as { hasSubCategories: (c: Category) => boolean }).hasSubCategories(category);
      if (!hasSubcats) { window.location.href = `/filtrele/${categorySlug}`; return; }
    } catch { /* hata durumunda kategori sayfasına git */ }

    window.location.href = `/kategoriler/${categorySlug}`;
  };

  const isCategoryActive = (category: Category): boolean => {
    const currentPath = pathname || '';
    if (category.slug === 'hizmetler' && currentPath === '/hizmetler') return true;
    const categoryName = category.label || category.name || '';
    const categorySlug = category.slug || categoryName
      .replace(/&/g, '-').replace(/\s+/g, '-').replace(/--+/g, '-').toLowerCase();
    if (category.type === 'leaf' && currentPath.includes(`/filtrele/${categorySlug}`)) return true;
    return currentPath.includes(`/kategoriler/${categorySlug}`);
  };

  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = (sidebarService as { getIconComponent: (n: string) => React.ComponentType<{ size: number; color: string }> }).getIconComponent(iconName);
    return <IconComponent size={22} color="white" />;
  };

  if (error) {
    return (
      <div className="sidebar-error">
        <p>Kategoriler yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      {isMobile && !forceOpen && (
        <div className="hamburger-menu" onClick={toggleSidebar}>
          <div className={`hamburger ${isOpen ? 'open' : ''}`}>
            <span /><span /><span />
          </div>
        </div>
      )}
      <div
        className={`sidebar ${isMobile && !forceOpen ? 'mobile' : ''} ${isOpen || forceOpen ? 'open' : ''} ${forceOpen ? 'sidebar-fullpage' : ''} ${categorySource === 'service' ? 'sidebar--service' : ''}`}
      >
        {loading ? (
          <div className="sidebar-loading">Kategoriler yükleniyor...</div>
        ) : categories && Array.isArray(categories) ? (
          categories.map((category) => {
            const isActive = isCategoryActive(category);
            const categoryId = category.category_id || category.id;
            const categoryName = category.label || category.name;
            return (
              <div key={String(categoryId)} className="sidebar-options">
                <div
                  className={`sidebar-option${categorySource === 'service' ? ' sidebar-option--no-icon' : ''}`}
                >
                  {categorySource !== 'service' && (
                    <i className="icon" style={{ backgroundColor: category.bgColor }}>
                      {renderIcon(category.icon)}
                    </i>
                  )}
                  {categorySource === 'service' && (
                    <span className="sidebar-option-accent" aria-hidden />
                  )}
                  <p className="category-text">
                    <span
                      className={`sidebar-option-link ${isActive ? 'active' : ''}`}
                      onClick={() => handleCategoryClick(category)}
                      style={
                        categorySource === 'service'
                          ? { textDecoration: 'none', cursor: 'pointer' }
                          : { textDecoration: 'none', color: isActive ? '#0d6efd' : '#2a2a2a', cursor: 'pointer' }
                      }
                    >
                      {categoryName}
                    </span>
                  </p>
                  {categorySource === 'service' && (
                    <span className="sidebar-option-chevron" aria-hidden />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="sidebar-error">Kategoriler yüklenemedi. Veri formatı uygun değil.</div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
