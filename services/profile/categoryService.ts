/**
 * categoryService.ts - Kategori verilerini işleyen servis (Profil modülü)
 * Ana services/category/categoryService ile karıştırılmamalı.
 *
 * Hedef:
 *   GET /api/v1/users/{userId}/categories
 *   GET /api/v1/categories  (getAllCategories → ana categoryService'e delege)
 */

import mainCategoryService from '@/services/category/categoryService';

/** Host normalize → {host}/api/v1 */
function resolveProfileCategoryApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api/v1';
  const host = raw
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/v1\/?$/, '');
  return `${host}/api/v1`;
}

const API_BASE_URL = resolveProfileCategoryApiBase();

interface ApiResult<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Kullanıcı ilanlarında mevcut olan kategorileri getirir
 */
const getUserCategories = async (userId: string | number): Promise<ApiResult<unknown[]>> => {
  try {
    const url = `${API_BASE_URL}/users/${userId}/categories`;
    console.log(`[ProfileCategory API] GET ${url}`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Kategoriler alınamadı (HTTP ${response.status})`);
    const json = await response.json();
    const data = (json && typeof json === 'object' && 'data' in json ? json.data : json) || [];

    return {
      success: true,
      message: 'Kategoriler başarıyla getirildi',
      data: Array.isArray(data) ? data : []
    };
  } catch (error) {
    console.error('[CategoryService] Kategoriler getirilirken hata:', error);
    return {
      success: false,
      message: (error as Error).message || 'Kategoriler getirilirken bir hata oluştu',
      data: []
    };
  }
};

/**
 * Tüm kategorileri getirir (Filtreleme için kullanılabilir)
 * Ana categoryService'e (services/category/categoryService.ts) delege eder —
 * o servis USE_API flag'ine göre gerçek BE'ye (/api/v1/categories) veya mock'a gider.
 */
const getAllCategories = async (): Promise<ApiResult<unknown[]>> => {
  try {
    console.log('[ProfileCategory API] GET /api/v1/categories (ana categoryService üzerinden)');
    const categories = await mainCategoryService.getAllCategories();

    return {
      success: true,
      message: 'Tüm kategoriler başarıyla getirildi',
      data: categories
    };
  } catch (error) {
    console.error('[CategoryService] Kategoriler getirilirken hata:', error);
    return {
      success: false,
      message: (error as Error).message || 'Kategoriler getirilirken bir hata oluştu',
      data: []
    };
  }
};

const categoryService = {
  getUserCategories,
  getAllCategories
};

export default categoryService;
