/**
 * Benzer İlanlar Servis Modülü
 *
 * USE_API = false  → data/üründat.json'dan benzer ilanları çeker (mock)
 * USE_API = true   → GET /api/v1/listings/{id}/similar
 *
 * Path alias yok: /api/products/{id}/similar kullanılmaz.
 * Geçiş: api/config.ts USE_API flag.
 */

import axios from 'axios';
import { USE_API } from '@/api/config';
import categoryPathApi from '@/services/api/categoryPathApi';

/** Host normalize → {host}/api/v1 */
function resolveSimilarProductsApiBase(): string {
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

const API_BASE_URL = resolveSimilarProductsApiBase();

// ---- TİP TANIMLARI ----

interface AdItem {
  ilan_id: number;
  baslik?: string;
  fiyat?: number;
  para_birimi?: string;
  resimler?: string[];
  konum?: {
    il?: string;
    ilce?: string;
  };
  ilan_tarihi?: string;
  category_id?: number;
  ilan_turu?: string;
  [key: string]: unknown;
}

interface SimilarProductResult {
  id: number;
  ilan_id: number;
  title: string | undefined;
  price: number | undefined;
  para_birimi: string;
  image: string | null;
  images: string[];
  city: string;
  location: string;
  date: string | undefined;
  category_id: number | undefined;
  ilan_turu: string;
  listingType: string;
  topCategory: string;
}

interface SimilarProductsResponse {
  success: boolean;
  error?: string;
  data: SimilarProductResult[];
  hasFewItems?: boolean;
}

// ---- YARDIMCI ----

const formatIlanTuru = (ilanTuru: string | undefined): string => {
  if (!ilanTuru) return 'normal';
  const tur = ilanTuru.toLowerCase();
  if (tur.includes('acil')) return 'acil';
  if (tur.includes('jet')) return 'jet';
  if (tur.includes('yeni')) return 'yeni';
  return 'normal';
};

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const buildResult = async (ad: AdItem): Promise<SimilarProductResult> => {
  let topCategoryName = 'Diğer';
  try {
    const categoryResponse = await categoryPathApi.fetchCategoryPath(ad.ilan_id);
    if (
      categoryResponse.success &&
      (categoryResponse.data as { categoryPath?: { name: string }[] }).categoryPath?.length
    ) {
      topCategoryName = (categoryResponse.data as { categoryPath: { name: string }[] }).categoryPath[0].name;
    }
  } catch {
    // kategori bilgisi alınamazsa Diğer kullan
  }

  return {
    id: ad.ilan_id,
    ilan_id: ad.ilan_id,
    title: ad.baslik,
    price: ad.fiyat,
    para_birimi: ad.para_birimi || 'TL',
    image: ad.resimler && ad.resimler.length > 0 ? ad.resimler[0] : null,
    images: ad.resimler || [],
    city: ad.konum?.il || 'Belirtilmemiş',
    location: (ad.konum?.il || '') + (ad.konum?.ilce ? ', ' + ad.konum.ilce : ''),
    date: ad.ilan_tarihi,
    category_id: ad.category_id,
    ilan_turu: formatIlanTuru(ad.ilan_turu),
    listingType: formatIlanTuru(ad.ilan_turu),
    topCategory: topCategoryName
  };
};

// ---- ANA FONKSİYON ----

const getSimilarProducts = async (
  productId: number | string,
  categoryId: number | string,
  limit = 50
): Promise<SimilarProductsResponse> => {
  try {
    if (!productId || !categoryId) {
      return { success: false, error: 'Geçersiz parametre', data: [] };
    }

    // ============================================================
    // Mock mod
    // ============================================================
    if (!USE_API) {
      const adsModule = await import('@/data/üründat.json');
      const allAds: AdItem[] = (adsModule.default as { ilanlari: AdItem[] })?.ilanlari || [];

      if (!allAds.length) {
        return { success: false, error: 'İlan verileri bulunamadı', data: [] };
      }

      let similarAds = allAds.filter(ad =>
        String(ad.ilan_id) !== String(productId) &&
        ad.category_id?.toString() === categoryId.toString()
      );

      const shuffled = [...similarAds].sort(() => 0.5 - Math.random());
      const uniqueMap = new Map<string, AdItem>();
      for (const ad of shuffled) {
        const key = String(ad.ilan_id);
        if (!uniqueMap.has(key)) uniqueMap.set(key, ad);
        if (uniqueMap.size >= limit) break;
      }

      const uniqueAds = Array.from(uniqueMap.values());
      if (uniqueAds.length === 0) return { success: true, data: [], hasFewItems: true };

      const results = await Promise.all(uniqueAds.map(buildResult));
      return { success: true, data: results, hasFewItems: results.length < 3 };
    }

    // ============================================================
    // Gerçek API — GET /api/v1/listings/{id}/similar
    // ============================================================
    console.log(`[SimilarProducts API] GET ${API_BASE_URL}/listings/${productId}/similar`);
    const response = await axios.get(`${API_BASE_URL}/listings/${productId}/similar`, {
      params: { category_id: categoryId, limit },
      headers: getAuthHeaders(),
      timeout: 30000,
    });

    const rawData = response.data?.data || response.data || [];
    const results: SimilarProductResult[] = Array.isArray(rawData)
      ? rawData.map((item: AdItem) => ({
          id: item.ilan_id,
          ilan_id: item.ilan_id,
          title: item.baslik,
          price: item.fiyat,
          para_birimi: item.para_birimi || 'TL',
          image: item.resimler && item.resimler.length > 0 ? item.resimler[0] : null,
          images: item.resimler || [],
          city: item.konum?.il || 'Belirtilmemiş',
          location: (item.konum?.il || '') + (item.konum?.ilce ? ', ' + item.konum.ilce : ''),
          date: item.ilan_tarihi,
          category_id: item.category_id,
          ilan_turu: formatIlanTuru(item.ilan_turu),
          listingType: formatIlanTuru(item.ilan_turu),
          topCategory: 'Diğer'
        }))
      : [];

    return { success: true, data: results, hasFewItems: results.length < 3 };
  } catch (error) {
    console.error('Benzer ürünler getirilirken beklenmeyen hata:', error);
    return { success: false, error: 'Benzer ürünler getirilirken beklenmeyen hata oluştu', data: [] };
  }
};

export { getSimilarProducts };
