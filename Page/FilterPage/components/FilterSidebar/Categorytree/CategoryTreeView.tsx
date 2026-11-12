"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './CategoryTreeView.css';
import { getCategoryTree, getSubCategories, updateCategoryInUrl } from '@/services/filters/categoryTreeService';
import categoryService from '@/services/category/categoryService';

interface CategoryPathNode {
  id: number | string;
  name: string;
  slug?: string;
  depth?: number;
  count?: number;
}

interface SubCategoryNode {
  id: number | string;
  name: string;
  slug?: string;
  parentId?: number | string | null;
  count?: number;
}

interface CategoryTreeViewProps {
  categoryId?: number | string | null;
  onSelectCategory?: (id: number | string, name: string) => void;
}

const CategoryTreeView: React.FC<CategoryTreeViewProps> = ({ categoryId, onSelectCategory }) => {
  const router = useRouter();
  const navigate = (to: string, opts?: { replace?: boolean }) => {
    if (opts?.replace) router.replace(to);
    else router.push(to);
  };
  const [loading, setLoading] = useState(true);
  const [categoryPath, setCategoryPath] = useState<CategoryPathNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [subCategories, setSubCategories] = useState<SubCategoryNode[]>([]);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => setIsMobileLayout(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    setMobileTreeOpen(false);
  }, [categoryId]);

  useEffect(() => {
    const fetchCategoryData = async () => {
      const catIdNum = categoryId ? Number(categoryId) : 0;

      // Kök durum: Tüm İlanlar (categoryId == 0 veya belirtilmemişse)
      if (catIdNum === 0) {
        try {
          setLoading(true);
          setCategoryPath([{ id: 0, name: 'Tüm İlanlar', depth: 0, slug: 'tum-ilanlar' }]);
          setActiveIndex(0);
          setError(null);

          const mainCats = await categoryService.getMainCategories();
          const normalized: SubCategoryNode[] = (mainCats || []).map((cat: any) => ({
            id: cat.category_id || cat.id,
            name: cat.label || cat.name,
            slug: cat.slug,
            parentId: null,
            count: cat.count || 0
          }));
          setSubCategories(normalized);
        } catch (err) {
          console.error('Ana kategoriler yüklenirken hata:', err);
          setError('Kategoriler yüklenemedi');
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);

        const result = await getCategoryTree(catIdNum);

        if (result.success && result.data && result.data.categoryPath) {
          const rawPath = result.data.categoryPath;
          const fullPath: CategoryPathNode[] = [
            { id: 0, name: 'Tüm İlanlar', depth: 0, slug: 'tum-ilanlar' },
            ...rawPath.map((p: any, idx: number) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              depth: idx + 1,
              count: p.count
            }))
          ];
          setCategoryPath(fullPath);
          setActiveIndex(fullPath.length - 1);
          setError(null);

          fetchSubCategories(catIdNum);
        } else {
          setError('Kategori bilgisi alınamadı');
          setCategoryPath([{ id: 0, name: 'Tüm İlanlar', depth: 0, slug: 'tum-ilanlar' }]);
          setSubCategories([]);
        }
      } catch (error) {
        console.error('Kategori ağacı yüklenirken hata:', error);
        setError('Kategori bilgileri yüklenirken bir hata oluştu');
        setCategoryPath([{ id: 0, name: 'Tüm İlanlar', depth: 0, slug: 'tum-ilanlar' }]);
        setSubCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [categoryId]);

  const fetchSubCategories = async (parentId: number | string) => {
    if (!parentId || Number(parentId) === 0) return;

    try {
      setLoadingSubCategories(true);
      const result = await getSubCategories(parentId);

      if (result.success && result.data) {
        const subcats = result.data.subcategories || result.data.subCategories || [];
        setSubCategories(subcats);
      } else {
        setSubCategories([]);
      }
    } catch (error) {
      console.error('Alt kategoriler yüklenirken hata:', error);
      setSubCategories([]);
    } finally {
      setLoadingSubCategories(false);
    }
  };

  const handleCategoryClick = async (index: number, category: CategoryPathNode) => {
    if (!category) return;

    try {
      console.log(`Kategori seçildi: ${category.name} (${category.id})`);
      setActiveIndex(index);

      if (!category.id || Number(category.id) === 0) {
        if (onSelectCategory) {
          onSelectCategory(0, 'Tüm İlanlar');
        }
        navigate('/filtrele/tum-ilanlar');
        return;
      }

      await fetchSubCategories(category.id);

      if (onSelectCategory) {
        onSelectCategory(category.id, category.name);
      }

      await updateCategoryInUrl(category.id, navigate, false);
    } catch (error) {
      console.error('Kategori seçiminde hata:', error);
    }
  };

  const handleSubCategoryClick = async (category: SubCategoryNode) => {
    if (!category || !category.id) return;

    try {
      console.log(`Alt kategori seçildi: ${category.name} (${category.id})`);

      if (onSelectCategory) {
        onSelectCategory(category.id, category.name);
      }

      await updateCategoryInUrl(category.id, navigate, false);
    } catch (error) {
      console.error('Alt kategori seçiminde hata:', error);
    }
  };

  const breadcrumbCompact = categoryPath.map((c) => c.name).join(' › ');

  const treeInner = (
    <div className="ctv-tree">
      {categoryPath.map((category, index) => (
        <div
          key={`path-${category.id}-${index}`}
          className={`ctv-item ${index === activeIndex ? 'ctv-active' : ''}`}
          onClick={() => handleCategoryClick(index, category)}
          style={{ paddingLeft: `${Math.min(index * 12 + 8, 48)}px` }}
        >
          <span className="ctv-name">{category.name}</span>
          {category.count ? (
            <span className="ctv-count">({category.count})</span>
          ) : null}
        </div>
      ))}

      {loadingSubCategories && (
        <div className="ctv-subcategories-loading">Alt kategoriler yükleniyor...</div>
      )}

      {!loadingSubCategories &&
        subCategories.length > 0 &&
        subCategories.map((category) => (
          <div
            key={`sub-${category.id}`}
            className="ctv-subcategory-item"
            onClick={() => handleSubCategoryClick(category)}
            style={{ paddingLeft: `${Math.min((activeIndex + 1) * 12 + 8, 60)}px` }}
          >
            <span className="ctv-name">{category.name}</span>
            {category.count > 0 ? (
              <span className="ctv-count">({category.count})</span>
            ) : null}
          </div>
        ))}
    </div>
  );

  return (
    <div className={`ctv-container ${isMobileLayout ? 'ctv-container--mobile-expandable' : ''}`}>
      {loading ? (
        <div className="ctv-loading">Kategoriler yükleniyor...</div>
      ) : (
        <>
          {isMobileLayout ? (
            <button
              type="button"
              className="ctv-mobile-breadcrumb-toggle"
              onClick={() => setMobileTreeOpen((o) => !o)}
              aria-expanded={mobileTreeOpen}
              aria-controls="ctv-expandable-tree"
              id="ctv-breadcrumb-toggle"
            >
              <span className="ctv-mobile-breadcrumb-label">Kategori</span>
              <span className="ctv-mobile-breadcrumb-trail" title={breadcrumbCompact}>
                {breadcrumbCompact || 'Tüm İlanlar'}
              </span>
              <span className="ctv-mobile-breadcrumb-chevron" aria-hidden>
                {mobileTreeOpen ? '▲' : '▼'}
              </span>
            </button>
          ) : (
            <div className="ctv-header">
              <span className="ctv-header-icon">&#128193;</span>
              <span className="ctv-header-title">Kategori</span>
            </div>
          )}
          <div
            id="ctv-expandable-tree"
            className={
              isMobileLayout
                ? `ctv-expandable-panel ${mobileTreeOpen ? 'ctv-expandable-panel--open' : ''}`
                : undefined
            }
            hidden={isMobileLayout ? !mobileTreeOpen : false}
          >
            {treeInner}
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryTreeView;
