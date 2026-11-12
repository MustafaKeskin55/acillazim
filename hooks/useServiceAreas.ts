'use client';

import { useState, useEffect, useCallback } from 'react';
import ServiceAreasClient from '@/services/serviceAreas/serviceAreasClient';

interface Category {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

interface Provider {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface FilterParams {
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

const useServiceAreas = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 });

  const serviceClient = new ServiceAreasClient();

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await serviceClient.getCategories();
      if (response.success) {
        setCategories(response.data);
      } else {
        setError('Kategoriler yüklenirken bir hata oluştu');
      }
    } catch (err: unknown) {
      setError(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      console.error('Kategoriler yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubcategories = useCallback(async (categoryId: string | number) => {
    if (!categoryId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await serviceClient.getSubcategories(categoryId);
      if (response.success) {
        setSubcategories(response.data);
      } else {
        setError('Alt kategoriler yüklenirken bir hata oluştu');
      }
    } catch (err: unknown) {
      setError(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      console.error('Alt kategori yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProviders = useCallback(async (categoryId: string | number, params: FilterParams = {}) => {
    if (!categoryId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await serviceClient.getProviders(categoryId, params);
      if (response.success) {
        setProviders(response.data.providers);
        setPagination({ page: response.data.page, pages: response.data.pages, total: response.data.total, limit: pagination.limit });
      } else {
        setError('Hizmet sağlayıcıları yüklenirken bir hata oluştu');
      }
    } catch (err: unknown) {
      setError(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      console.error('Hizmet sağlayıcı yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  const loadProvidersByRegion = useCallback(async (region: string, params: FilterParams = {}) => {
    if (!region) return;
    setLoading(true);
    setError(null);
    try {
      const response = await serviceClient.getProvidersByRegion(region, params);
      if (response.success) {
        setProviders(response.data.items);
        setPagination(response.data.pagination);
      } else {
        setError('Bölgedeki hizmet sağlayıcıları yüklenirken bir hata oluştu');
      }
    } catch (err: unknown) {
      setError(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      console.error('Bölge bazlı sağlayıcı yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectCategory = useCallback(async (category: Category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setLoading(true);
    setError(null);
    try {
      const subResponse = await serviceClient.getSubcategories(category.id);
      if (subResponse.success) setSubcategories(subResponse.data);

      const providerResponse = await serviceClient.getProviders(category.id);
      if (providerResponse.success) {
        setProviders(providerResponse.data.providers);
        setPagination({ page: providerResponse.data.page, pages: providerResponse.data.pages, total: providerResponse.data.total, limit: pagination.limit });
      } else {
        setError('Hizmet sağlayıcıları yüklenirken bir hata oluştu');
      }
    } catch (err: unknown) {
      setError(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      console.error('Kategori detayları yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  const selectSubcategory = useCallback((subcategory: Category) => {
    setSelectedSubcategory(subcategory);
    if (subcategory?.id) {
      loadProviders(subcategory.id, { page: 1, limit: pagination.limit });
    }
  }, [loadProviders, pagination.limit]);

  const changePage = useCallback(async (page: number) => {
    if (!selectedCategory) return;
    setLoading(true);
    setError(null);
    try {
      const response = await serviceClient.getProviders(selectedCategory.id, { page });
      if (response.success) {
        setProviders(response.data.providers);
        setPagination({ page: response.data.page, pages: response.data.pages, total: response.data.total, limit: pagination.limit });
      } else {
        setError('Sayfa değiştirilirken bir hata oluştu');
      }
    } catch (err: unknown) {
      setError(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      console.error('Sayfa değiştirilirken hata:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, pagination.limit]);

  const changePageSize = useCallback((limit: number) => {
    const categoryId = selectedSubcategory?.id || selectedCategory?.id;
    if (categoryId) loadProviders(categoryId, { page: 1, limit });
  }, [loadProviders, selectedCategory, selectedSubcategory]);

  const filterProviders = useCallback(async (filters: FilterParams = {}) => {
    if (!selectedCategory) return;
    setLoading(true);
    setError(null);
    try {
      const response = await serviceClient.getProviders(selectedCategory.id, { ...filters });
      if (response.success) {
        setProviders(response.data.providers);
        setPagination({ page: response.data.page, pages: response.data.pages, total: response.data.total, limit: pagination.limit });
      } else {
        setError('Filtreler uygulanırken bir hata oluştu');
      }
    } catch (err: unknown) {
      setError(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      console.error('Filtreler uygulanırken hata:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, pagination.limit]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    categories, subcategories, providers, selectedCategory, selectedSubcategory,
    loading, error, pagination,
    loadCategories, loadSubcategories, loadProviders, loadProvidersByRegion,
    selectCategory, selectSubcategory, changePage, changePageSize, filterProviders
  };
};

export default useServiceAreas;
