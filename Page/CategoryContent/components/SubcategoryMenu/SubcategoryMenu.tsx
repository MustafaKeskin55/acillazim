"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './SubcategoryMenu.css';
import categoryService from '@/services/category/categoryService';

interface CategoryItem {
  category_id?: string | number;
  id?: string | number;
  name?: string;
  label?: string;
  slug?: string;
  [key: string]: unknown;
}

interface SubcategoryMenuProps {
  category?: CategoryItem;
  subcategories?: CategoryItem[];
  loading?: boolean;
  onSubcategoryClick?: (item: CategoryItem) => void;
  onGoBack?: () => void;
  /** Tıklanınca doğrudan /kategoriler/[slug] adresine yönlendir */
  navigateOnClick?: boolean;
  /** Mobilde her zaman "← Kategoriler" geri butonu göster */
  showBackToCategories?: boolean;
}

const createSlug = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const SubcategoryMenu: React.FC<SubcategoryMenuProps> = ({
  category,
  subcategories = [],
  loading: externalLoading,
  onSubcategoryClick,
  onGoBack,
  navigateOnClick = false,
  showBackToCategories = false,
}) => {
  const router = useRouter();
  const isFirstRender = useRef(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedSubcategories, setLoadedSubcategories] = useState<CategoryItem[]>(subcategories || []);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const [categoryCache, setCategoryCache] = useState<Record<string, { subcategories: CategoryItem[]; name?: string; timestamp: number }>>({});

  const initialCategoryId = category?.category_id ? String(category.category_id) : null;

  const normalizeSubcats = (list: CategoryItem[]): CategoryItem[] =>
    (list || []).map((s) => ({ ...s, name: s.label || s.name, id: s.category_id || s.id }));

  const loadSubcategoriesForId = async (categoryId: string): Promise<CategoryItem[]> => {
    try {
      const strId = String(categoryId);
      setCurrentCategoryId(strId);

      if (categoryCache[strId]?.subcategories) {
        setLoadedSubcategories(categoryCache[strId].subcategories);
        return categoryCache[strId].subcategories;
      }

      setLoading(true);
      const subcats = await (categoryService as { getSubcategoriesByParentId: (id: string) => Promise<CategoryItem[]> }).getSubcategoriesByParentId(strId);
      const normalized = normalizeSubcats(subcats);
      setLoadedSubcategories(normalized);
      setCategoryCache((prev) => ({ ...prev, [strId]: { subcategories: normalized, name: category?.name as string, timestamp: Date.now() } }));
      return normalized;
    } catch (err) {
      setError((err as Error).message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (item: CategoryItem) => {
    const categoryId = item.category_id ? String(item.category_id) : String(item.id);
    const slug = item.slug || createSlug(String(item.name || item.label || ''));
    
    // Her tıklamada önce alt kategori var mı kontrol et
    setLoading(true);
    let subcats: CategoryItem[] = [];
    let fetchError = false;

    try {
      if (categoryCache[categoryId]?.subcategories) {
        subcats = categoryCache[categoryId].subcategories;
      } else {
        const fetched = await (categoryService as { getSubcategoriesByParentId: (id: string) => Promise<CategoryItem[]> }).getSubcategoriesByParentId(categoryId);
        subcats = normalizeSubcats(fetched);
        setCategoryCache((prev) => ({ ...prev, [categoryId]: { subcategories: subcats, name: item.name as string, timestamp: Date.now() } }));
      }
    } catch (err) {
      setError((err as Error).message);
      fetchError = true;
    }
    
    setLoading(false);

    if (fetchError) return;

    // Alt kategori yoksa, doğrudan filtreye yönlendir!
    if (subcats.length === 0) {
      if (navigateOnClick) {
        const filterUrl = (urlService as { createFilterUrlFromCategoryId: (id: string | number | undefined) => string })
          .createFilterUrlFromCategoryId(categoryId);
        const finalUrl = filterUrl === '/filtrele' ? `/filtrele/${slug}` : filterUrl;
        router.push(finalUrl);
        return;
      } else {
        if (onSubcategoryClick) {
          onSubcategoryClick({ ...item, subcategories: [], preventNavigation: true });
        }
        return;
      }
    }

    // Alt kategori VARSA ve navigateOnClick modundaysa doğrudan /kategoriler/[slug] sayfasına git
    if (navigateOnClick) {
      if (slug) {
        router.push(`/kategoriler/${slug}`);
        return;
      }
    }

    // Alt kategori varsa, menü geçmişini ve listeyi güncelle
    let updatedHistory = [...navigationHistory];
    const existingIndex = updatedHistory.indexOf(categoryId);
    if (existingIndex !== -1) {
      updatedHistory = updatedHistory.slice(0, existingIndex + 1);
    } else {
      updatedHistory.push(categoryId);
    }
    setNavigationHistory(updatedHistory);
    setCurrentCategoryId(categoryId);
    setLoadedSubcategories(subcats);

    if (onSubcategoryClick) {
      onSubcategoryClick({ ...item, subcategories: subcats, preventNavigation: true });
    }
  };

  const handleBack = async () => {
    if (navigationHistory.length < 2 || !currentCategoryId) return;
    const currentIndex = navigationHistory.indexOf(currentCategoryId);
    if (currentIndex <= 0) return;

    const parentId = navigationHistory[currentIndex - 1];
    const parentSubcategories = await (categoryService as { getSubcategoriesByParentId: (id: string) => Promise<CategoryItem[]> }).getSubcategoriesByParentId(parentId);
    const normalized = normalizeSubcats(parentSubcategories);
    setLoadedSubcategories(normalized);
    setCurrentCategoryId(parentId);
    setNavigationHistory(navigationHistory.slice(0, currentIndex));

    if (onSubcategoryClick) {
      const parentName = categoryCache[parentId]?.name || 'Üst Kategori';
      onSubcategoryClick({
        category_id: parentId,
        id: parentId,
        name: parentName,
        subcategories: parentSubcategories,
        preventNavigation: true,
        isBackNavigation: true,
        slug: createSlug(parentName),
      });
    }
  };

  useEffect(() => {
    if (initialCategoryId && isFirstRender.current) {
      if (subcategories && subcategories.length > 0) {
        const normalized = normalizeSubcats(subcategories);
        setLoadedSubcategories(normalized);
        setCategoryCache((prev) => ({ ...prev, [initialCategoryId]: { subcategories: normalized, name: category?.name as string, timestamp: Date.now() } }));
      } else {
        loadSubcategoriesForId(initialCategoryId);
      }
      setNavigationHistory([initialCategoryId]);
      setCurrentCategoryId(initialCategoryId);
      isFirstRender.current = false;
    }
  }, [initialCategoryId]);

  useEffect(() => {
    if (Array.isArray(subcategories) && subcategories.length > 0 && initialCategoryId) {
      const normalized = normalizeSubcats(subcategories);
      setLoadedSubcategories(normalized);
      setCategoryCache((prev) => ({ ...prev, [initialCategoryId]: { subcategories: normalized, timestamp: Date.now() } }));
    }
  }, [subcategories, initialCategoryId]);

  const isMenuLoading = loading || Boolean(externalLoading);

  return (
    <div className="subcategory-container">
      <div className="subcategory-menu">
        <div className="subcategory-header simple-header">
          {/* Alt-alt kategori geçişlerinde geri */}
          {navigationHistory.length > 1 && (
            <button className="back-button-simple back-button-highlight" onClick={handleBack} aria-label="Geri git">
              <svg className="back-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}
          {/* Ana kategoriler sayfasına geri (mobil) */}
          {showBackToCategories && navigationHistory.length <= 1 && (
            <button className="back-button-simple back-button-highlight" onClick={() => router.push('/kategoriler')} aria-label="Kategorilere dön">
              <svg className="back-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}
          <div className="category-name-title">{category?.name || 'Kategoriler'}</div>
        </div>

        <div className="subcategory-list-simple">
          {error ? (
            <div className="error-display">
              <button className="retry-button" onClick={() => { setError(null); if (initialCategoryId) loadSubcategoriesForId(initialCategoryId); }}>
                Tekrar Dene
              </button>
            </div>
          ) : isMenuLoading ? (
            <div className="loading-subcategories">
              <span className="minimal-loader">Yükleniyor</span>
            </div>
          ) : loadedSubcategories.length > 0 ? (
            <ul>
              {loadedSubcategories.map((item) => (
                <li
                  key={String(item.id || item.category_id)}
                  className="subcategory-item-simple"
                  onClick={() => handleCategoryClick(item)}
                >
                  <span className="subcategory-name">{item.name}</span>
                  <span className="subcategory-chevron">›</span>
                </li>
              ))}
            </ul>
          ) : category ? (
            <div className="no-subcategories">Bu kategoride alt kategori bulunmamaktadır.</div>
          ) : (
            <div className="loading-subcategories">
              <span className="minimal-loader">Yükleniyor</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubcategoryMenu;
