'use client';

import { useState, useEffect } from 'react';
import categoryPathApi from '@/services/api/categoryPathApi';

interface CategoryPathItem {
  id: number | string;
  name: string;
  slug?: string;
  [key: string]: unknown;
}

interface UseCategoryPathResult {
  categoryPath: CategoryPathItem[];
  loading: boolean;
  error: string | null;
  adTitle: string;
  refreshCategoryPath: () => Promise<void>;
}

/**
 * İlan ID'sine göre kategori yolunu getiren hook
 */
const useCategoryPath = (adId: string | number): UseCategoryPathResult => {
  const [categoryPath, setCategoryPath] = useState<CategoryPathItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adTitle, setAdTitle] = useState('');

  useEffect(() => {
    if (!adId) { setLoading(false); return; }

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await categoryPathApi.fetchCategoryPath(adId);

        if (isMounted) {
          if (response.success && response.data) {
            setCategoryPath(response.data.categoryPath || []);
            if (response.data.ad?.title) {
              setAdTitle(response.data.ad.title);
            }
          } else {
            setError('Kategori yolu alınamadı');
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error('Kategori yolu çekilirken hata:', err);
          setError(err instanceof Error ? err.message : 'Kategori yolu alınamadı');
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [adId]);

  const refreshCategoryPath = async (): Promise<void> => {
    if (!adId) return;

    try {
      setLoading(true);
      categoryPathApi.clearCache(adId);
      const response = await categoryPathApi.fetchCategoryPath(adId);

      if (response.success && response.data) {
        setCategoryPath(response.data.categoryPath || []);
        if (response.data.ad?.title) setAdTitle(response.data.ad.title);
      } else {
        setError('Kategori yolu alınamadı');
      }
    } catch (err: unknown) {
      console.error('Kategori yolu çekilirken hata:', err);
      setError(err instanceof Error ? err.message : 'Kategori yolu alınamadı');
    } finally {
      setLoading(false);
    }
  };

  return { categoryPath, loading, error, adTitle, refreshCategoryPath };
};

export default useCategoryPath;
