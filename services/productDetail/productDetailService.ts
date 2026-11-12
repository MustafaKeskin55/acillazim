/**
 * productDetailService.ts - Ürün detay sayfası için API simülasyonu
 * Mock JSON + simulateApiRequest; gerçek API'de mock kaldırılacak.
 * Path alias yok: /v1/ilanlar, /kullanicilar, /hizmetler kullanılmaz
 *   → GET /api/v1/listings/{id}
 *   → GET /api/v1/listings/{id}/similar
 *   → GET /api/v1/users/{userId}
 *   → GET /api/v1/listings/{id}/working-hours|faq|packages|reviews
 * Favori → favoriteService (/api/v1/favorites/...).
 */

import ilanData from '@/data/üründat.json';
import userData from '@/data/user_database2.json';
import faqDatabase from '@/data/faq_database.json';
import pricingDatabase from '@/data/pricing_database.json';
import workingHoursDatabase from '@/data/working_hours_database.json';
import reviewsDatabase from '@/data/reviews_database.json';
import { decodeHtmlEntities, safeParseArray } from '@/services/listings/util/listingUtils';

/** Host normalize → {host}/api/v1 */
function resolveProductDetailApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api/v1';
  const host = raw
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/v1\/?$/, '');
  return `${host}/api/v1`;
}

// ---- TİP TANIMLARI ----
interface ApiResult<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiError {
  code: string;
  message: string;
  timestamp: string;
}

interface MediaInfo { url: string; tur: 'video' | 'image'; }

interface IlanItem {
  ilan_id: number;
  category_id?: number;
  user_id?: number;
  baslik?: string;
  video_url?: string;
  video_thumbnail?: string;
  resimler?: string[];
  resimler_bilgi?: MediaInfo[];
  medya_turu?: string;
  ilan_sahibi?: SellerData;
  api_error?: ApiError;
  faq?: { question: string; answer: string; question_type: string }[];
  packages?: PricingPackage[];
  workingHours?: WorkingHoursRecord;
  [key: string]: unknown;
}

interface IlanDataFile {
  ilanlari: IlanItem[];
}

interface UserRecord {
  user_id: number | string;
  ad_soyad: string;
  profil_fotografi?: string;
  telefon?: string;
  email?: string;
  dogrulanmis_hesap?: boolean;
  il?: string;
  ilce?: string;
  [key: string]: unknown;
}

interface FaqRecord {
  ilan_id: number;
  is_active: boolean;
  display_order: number;
  question: string;
  answer: string;
  question_type: string;
  [key: string]: unknown;
}

interface PricingRecord {
  ilan_id: number;
  is_active: boolean;
  display_order: number;
  package_title: string;
  price: number;
  currency: string;
  price_type: string;
  delivery_days: number;
  features: string[];
  is_popular: boolean;
  discount_percentage?: number;
  original_price?: number;
  [key: string]: unknown;
}

interface DaySchedule {
  open?: string;
  close?: string;
  is_open?: boolean;
  is_today?: boolean;
  [key: string]: unknown;
}

interface WorkingHoursRecord {
  ilan_id?: number;
  is_active?: boolean;
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
  [key: string]: unknown;
}

interface ReviewRecord {
  comment_id: number;
  ilan_id: number;
  commenter_id: number;
  commented_user_id: number;
  rating: number;
  comment_text: string;
  comment_date: string;
  comment_time: string;
  [key: string]: unknown;
}

interface SellerData {
  id: number | string;
  /** BE'nin bazı endpoint'leri user_id, bazıları id kullanıyor — ikisini de saklıyoruz */
  user_id?: number | string;
  name: string;
  profileImage?: string;
  phone?: string;
  /** Bazı bileşenler telefon (TR) alan adını okuyor */
  telefon?: string;
  email?: string;
  isVerified?: boolean;
  /** Profil «Hakkımda» metni (varsa) */
  bio?: string | null;
  location: { city?: string; district?: string };
  memberSince: string;
  otherListings: number;
}

interface PricingPackage {
  title: string;
  price: number;
  currency: string;
  price_type: string;
  deliveryDays: number;
  features: string[];
  popular: boolean;
  discount_percentage?: number;
  original_price?: number;
}

// ---- API YAPILANDIRMASI ----
const API_BASE_URL = resolveProductDetailApiBase();
const USE_MOCK = false;
const API_TOKEN = 'sim-api-xxxxx-token-12345'; // Yalnızca USE_MOCK=true; Bearer auth_token

// ---- YARDIMCI FONKSİYONLAR ----

const prepareApiRequest = (endpoint: string, options: Record<string, unknown> = {}) => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;
  const rawToken =
    typeof window !== 'undefined'
      ? localStorage.getItem('auth_token')
      : null;
  const token = rawToken && rawToken.trim() ? rawToken.trim() : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return { url, options: { ...options, headers } };
};

const unwrapApiData = (json: unknown): unknown => {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: unknown }).data;
  }
  return json;
};

const simulateApiRequest = async (
  endpoint: string,
  options: Record<string, unknown> = {}
): Promise<unknown> => {
  const { url, options: fetchOptions } = prepareApiRequest(endpoint, options);
  console.log(`[ProductDetail API] ${String(options.method || 'GET')} ${url}`);

  if (!USE_MOCK) {
    const res = await fetch(url, fetchOptions as RequestInit);
    if (!res.ok) {
      throw new Error(
        `ProductDetail API ${res.status}: ${String(options.method || 'GET')} ${endpoint}`
      );
    }
    if (res.status === 204) return null;
    const json = await res.json().catch(() => null);
    return unwrapApiData(json);
  }

  const delay = (options.delay as number) || Math.floor(300 + Math.random() * 500);
  await new Promise(resolve => setTimeout(resolve, delay));
  return fetchOptions;
};

const fetchApiResult = async <T>(
  endpoint: string,
  options: Record<string, unknown> = {}
): Promise<ApiResult<T>> => {
  const { url, options: fetchOptions } = prepareApiRequest(endpoint, options);
  console.log(`[ProductDetail API] ${String(options.method || 'GET')} ${url}`);
  const res = await fetch(url, fetchOptions as RequestInit);
  if (!res.ok) {
    throw new Error(
      `ProductDetail API ${res.status}: ${String(options.method || 'GET')} ${endpoint}`
    );
  }
  const json = await res.json();
  if (json && typeof json === 'object' && 'success' in (json as object)) {
    return json as ApiResult<T>;
  }
  return { success: true, message: 'OK', data: json as T };
};

/**
 * BE'nin GET /listings/{id} (tekil ilan detay) yanıtı, GET /listings (liste) yanıtından
 * FARKLI bir şema kullanıyor: id/categoryId/currency/photos/imageUrls/seller (camelCase/İngilizce)
 * vs. ilan_id/category_id/para_birimi/resimler/konum/ilan_sahibi (liste endpoint'inde).
 * Bu fonksiyon, hangi şema gelirse gelsin FE'nin beklediği Türkçe alan adlarına normalize eder.
 * (Örn: "İlan No: undefined" hatası, p.ilan_id yerine BE'nin sadece "id" döndürmesinden kaynaklanıyordu.)
 */
const normalizeListingDetail = (raw: Record<string, unknown>): IlanItem => {
  if (!raw || typeof raw !== 'object') return raw as IlanItem;

  const rawKonum = raw.konum as { il?: string; ilce?: string } | undefined;
  const rawIl = (rawKonum?.il ?? raw.il ?? raw.locationCity ?? '') as string;
  const rawIlce = (rawKonum?.ilce ?? raw.ilce ?? raw.locationDistrict ?? '') as string;
  const konum = {
    il: decodeHtmlEntities(rawIl),
    ilce: decodeHtmlEntities(rawIlce),
  };

  const rawSeller = (raw.ilan_sahibi ?? raw.seller) as Record<string, unknown> | undefined;
  const sellerId = rawSeller?.id ?? rawSeller?.user_id ?? raw.userId ?? raw.user_id;
  const sellerName = rawSeller?.name ?? rawSeller?.ad_soyad ?? raw.username ?? raw.user_name ?? '';
  const sellerPic = rawSeller?.profileImage ?? rawSeller?.profil_fotografi ?? raw.userPhotoUrl ?? raw.user_photo_url ?? raw.profileImage ?? null;
  const sellerPhone = rawSeller?.phone ?? rawSeller?.telefon ?? raw.contactPhone ?? raw.phone;

  const ilanSahibi: SellerData | undefined = (rawSeller || sellerId || sellerName) ? {
    id: (sellerId || '') as number | string,
    user_id: (sellerId || '') as number | string,
    name: decodeHtmlEntities(String(sellerName || 'Hizmet Sağlayıcı')),
    profileImage: (sellerPic || null) as string | undefined,
    phone: sellerPhone as string | undefined,
    telefon: sellerPhone as string | undefined,
    email: (rawSeller?.email ?? raw.email ?? '') as string,
    isVerified: !!(rawSeller?.isVerified ?? rawSeller?.dogrulanmis_hesap),
    bio: rawSeller?.bio ? decodeHtmlEntities(String(rawSeller.bio)) : null,
    location: {
      city: decodeHtmlEntities(String((rawSeller?.location as { city?: string })?.city || rawSeller?.il || raw.locationCity || '')),
      district: decodeHtmlEntities(String((rawSeller?.location as { district?: string })?.district || rawSeller?.ilce || raw.locationDistrict || '')),
    },
    memberSince: (rawSeller?.memberSince ?? '') as string,
    otherListings: Number(rawSeller?.otherListings ?? 0),
  } as unknown as SellerData : undefined;

  const resimler = (raw.resimler as string[])
    || (raw.photos as string[])
    || (raw.imageUrls as string[])
    || [];

  const rawBaslik = (raw.baslik ?? raw.title ?? '') as string;
  const rawAciklama = (raw.aciklama ?? raw.description ?? raw.acikAdres ?? '') as string;

  const rawAttributes = (raw.ozellikler ?? raw.attributes ?? {}) as Record<string, unknown>;
  const rawServiceAreas = raw.serviceAreas ?? raw.service_areas ?? rawAttributes.serviceAreas ?? rawAttributes.service_areas;
  let serviceAreas: unknown[] = [];
  if (Array.isArray(rawServiceAreas)) {
    serviceAreas = rawServiceAreas;
  } else if (rawServiceAreas && typeof rawServiceAreas === 'object') {
    const candObj = rawServiceAreas as Record<string, unknown>;
    serviceAreas = [...(Array.isArray(candObj.manual) ? candObj.manual : []), ...(Array.isArray(candObj.map) ? candObj.map : [])];
  } else {
    serviceAreas = safeParseArray(rawServiceAreas);
  }
  const certificates = safeParseArray(raw.certificates ?? raw.sertifikalar ?? rawAttributes.certificates ?? rawAttributes.sertifikalar);
  const faq = safeParseArray(raw.faq ?? raw.faq_items ?? rawAttributes.faq ?? rawAttributes.faq_items);
  const features = safeParseArray(raw.features ?? raw.service_features ?? rawAttributes.features ?? rawAttributes.service_features);
  const packages = safeParseArray(raw.packages ?? raw.pricingPackages ?? rawAttributes.packages);

  const rawWorkingHours = raw.workingHours ?? raw.working_hours ?? rawAttributes.workingHours ?? rawAttributes.working_hours;
  let workingHours = rawWorkingHours;
  if (Array.isArray(rawWorkingHours)) {
    const map: Record<string, unknown> = {};
    const todayIndex = new Date().getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[todayIndex];

    rawWorkingHours.forEach((item: Record<string, unknown>) => {
      if (item && (item.dayOfWeek || item.day)) {
        const day = String(item.dayOfWeek || item.day).toLowerCase();
        map[day] = {
          start: item.startTime || item.start || '',
          end: item.endTime || item.end || '',
          is_active: item.isActive !== undefined ? Boolean(item.isActive) : (item.is_active !== undefined ? Boolean(item.is_active) : true),
          is_today: day === todayName,
        };
      }
    });
    workingHours = map;
  }

  return {
    ...raw,
    ilan_id: Number(raw.ilan_id ?? raw.id),
    baslik: decodeHtmlEntities(rawBaslik),
    aciklama: decodeHtmlEntities(rawAciklama),
    fiyat: Number(raw.fiyat ?? raw.price ?? 0),
    para_birimi: (raw.para_birimi ?? raw.currency ?? 'TL') as string,
    category_id: Number(raw.category_id ?? raw.categoryId),
    category_name: (raw.category_name ?? raw.categoryName ?? raw.kategori ?? '') as string,
    kategori: (raw.category_name ?? raw.categoryName ?? raw.kategori ?? '') as string,
    resimler,
    konum,
    serviceAreas,
    certificates,
    faq,
    features,
    packages,
    workingHours,
    working_hours: workingHours,
    ozellikler: rawAttributes,
    seller: ilanSahibi,
    ilan_sahibi: ilanSahibi,
  } as IlanItem;
};

const detectMediaType = (url: string): 'video' | 'image' => {
  if (!url) return 'image';
  const ext = url.split('.').pop()?.toLowerCase() || '';
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'm4v'];
  return videoExtensions.includes(ext) ? 'video' : 'image';
};

// ---- YARDIMCI VERİ FONKSİYONLARI ----

const getFaqByIlanId = (ilanId: number): FaqRecord[] => {
  return (faqDatabase as FaqRecord[])
    .filter(faq => faq.ilan_id === ilanId && faq.is_active)
    .sort((a, b) => a.display_order - b.display_order);
};

const getPricingByIlanId = (ilanId: number): PricingRecord[] => {
  return (pricingDatabase as PricingRecord[])
    .filter(p => p.ilan_id === ilanId && p.is_active)
    .sort((a, b) => a.display_order - b.display_order);
};

// ============================================================================
// DIŞA AKTARILAN SERVİS FONKSİYONLARI
// ============================================================================

/**
 * Çalışma saatlerini dinamik olarak hesaplayarak getiren fonksiyon
 */
export const getWorkingHoursByIlanId = (ilanId: number): WorkingHoursRecord | null => {
  // Hedef: GET /api/v1/listings/{listingId}/working-hours (veya detay embed)
  console.log(`[ProductDetail API] Hedef path: ${API_BASE_URL}/listings/${ilanId}/working-hours`);
  const workingHours = (workingHoursDatabase as WorkingHoursRecord[]).find(
    h => h.ilan_id === ilanId && h.is_active
  );
  if (!workingHours) return null;

  const today = new Date().getDay(); // 0: Pazar
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayName = dayNames[today];

  const updated = { ...workingHours };

  dayNames.forEach(day => {
    if (updated[day] && typeof updated[day] === 'object') {
      updated[day] = { ...(updated[day] as DaySchedule), is_today: day === todayName };
    }
  });

  console.log(`[WorkingHours] İlan ID: ${ilanId} için çalışma saatleri getirildi. Bugün: ${todayName}`);
  return updated;
};

/**
 * İlan detaylarını getiren API simülasyonu
 */
export const getProductDetail = async (ilanId: number | string): Promise<ApiResult<IlanItem | null>> => {
  try {
    console.log(`[API] İlan detayları için API isteği yapıldı. İlan ID: ${ilanId}`);

    if (!USE_MOCK) {
      try {
        const result = await fetchApiResult<Record<string, unknown> | null>(`/listings/${ilanId}`, { method: 'GET' });
        if (result.success && result.data) {
          return { ...result, data: normalizeListingDetail(result.data) };
        }
      } catch (err) {
        console.warn(`[API] /listings/${ilanId} fetch failed, falling back to local mock data:`, err);
      }
    }

    // Hedef: GET /api/v1/listings/{listingId}
    await simulateApiRequest(`/listings/${ilanId}`, { method: 'GET', delay: 500 });

    const numericIlanId = Number(ilanId);
    const typedData = ilanData as IlanDataFile;

    console.log(`[API] Numeric İlan ID: ${numericIlanId}`);

    const ilan = typedData.ilanlari.find(item => item.ilan_id === numericIlanId);

    if (!ilan) {
      console.error(`[API] İlan bulunamadı. İlan ID: ${ilanId}`);
      console.log(`[API] Mevcut ilan ID'leri:`, typedData.ilanlari.map(i => i.ilan_id));
      return { success: false, message: 'İlan bulunamadı', data: null };
    }

    const processedIlan: IlanItem = {
      ...ilan,
      medya_turu: ilan.video_url ? 'video' : 'image'
    };

    if (processedIlan.video_url && !processedIlan.video_thumbnail) {
      processedIlan.video_thumbnail = `/thumbnails/video-${processedIlan.ilan_id}.jpg`;
    }

    if (processedIlan.resimler && processedIlan.resimler.length > 0) {
      processedIlan.resimler_bilgi = processedIlan.resimler.map(url => ({
        url,
        tur: detectMediaType(url)
      }));
    }

    console.log(`[API] İlan bulundu:`, processedIlan.baslik);
    console.log(`[API] İlan veren ID:`, processedIlan.user_id);

    if (processedIlan.user_id) {
      const userId = Number(processedIlan.user_id);
      const sellerResponse = await getSellerInfo(userId);
      if (sellerResponse.success && sellerResponse.data) {
        processedIlan.ilan_sahibi = sellerResponse.data;
      }
    } else {
      processedIlan.api_error = {
        code: 'USER_ID_MISSING',
        message: 'İlanda user_id bilgisi bulunamadı',
        timestamp: new Date().toISOString()
      };
    }

    // FAQ
    const faqItems = getFaqByIlanId(numericIlanId);
    if (faqItems.length > 0) {
      processedIlan.faq = faqItems.map(f => ({
        question: f.question,
        answer: f.answer,
        question_type: f.question_type
      }));
    }

    // Fiyatlandırma
    const pricingItems = getPricingByIlanId(numericIlanId);
    if (pricingItems.length > 0) {
      processedIlan.packages = pricingItems.map(p => ({
        title: p.package_title,
        price: p.price,
        currency: p.currency,
        price_type: p.price_type,
        deliveryDays: p.delivery_days,
        features: p.features,
        popular: p.is_popular,
        discount_percentage: p.discount_percentage,
        original_price: p.original_price
      }));
    }

    // Çalışma saatleri
    const workingHoursData = getWorkingHoursByIlanId(numericIlanId);
    if (workingHoursData) {
      processedIlan.workingHours = {
        monday: workingHoursData.monday,
        tuesday: workingHoursData.tuesday,
        wednesday: workingHoursData.wednesday,
        thursday: workingHoursData.thursday,
        friday: workingHoursData.friday,
        saturday: workingHoursData.saturday,
        sunday: workingHoursData.sunday
      };
    }

    return {
      success: true,
      message: 'İlan detayları başarıyla getirildi',
      data: processedIlan
    };
  } catch (error) {
    console.error('[API] İlan detayları getirilirken hata:', error);
    return { success: false, message: 'İlan detayları getirilirken bir hata oluştu', data: null };
  }
};

/**
 * Benzer ilanları getiren API simülasyonu
 */
export const getSimilarProducts = async (ilanId: number | string): Promise<ApiResult<IlanItem[]>> => {
  try {
    console.log(`[API] Benzer ilanlar için API isteği yapıldı. İlan ID: ${ilanId}`);

    if (!USE_MOCK) {
      return await fetchApiResult<IlanItem[]>(`/listings/${ilanId}/similar`, { method: 'GET' });
    }

    // Hedef: GET /api/v1/listings/{listingId}/similar
    await simulateApiRequest(`/listings/${ilanId}/similar`, { method: 'GET', delay: 700 });

    const numericIlanId = Number(ilanId);
    const typedData = ilanData as IlanDataFile;
    const mevcutIlan = typedData.ilanlari.find(item => item.ilan_id === numericIlanId);

    if (!mevcutIlan) {
      return { success: false, message: 'Benzer ilanlar için mevcut ilan bulunamadı', data: [] };
    }

    const categoryId = mevcutIlan.category_id;

    const benzerIlanlar: IlanItem[] = typedData.ilanlari
      .filter(item => item.category_id === categoryId && item.ilan_id !== numericIlanId)
      .slice(0, 5)
      .map(ilan => ({ ...ilan, medya_turu: ilan.video_url ? 'video' : 'image' }));

    console.log(`[API] Bulunan benzer ilan sayısı: ${benzerIlanlar.length}`);

    return { success: true, message: 'Benzer ilanlar başarıyla getirildi', data: benzerIlanlar };
  } catch (error) {
    console.error('[API] Benzer ilanlar getirilirken hata:', error);
    return { success: false, message: 'Benzer ilanlar getirilirken bir hata oluştu', data: [] };
  }
};

/**
 * İlan favorilere ekleme/çıkarma API simülasyonu
 */
export const toggleFavorite = async (
  ilanId: number | string,
  isFavorite: boolean
): Promise<ApiResult<{ isFavorite: boolean } | null>> => {
  try {
    console.log(`[API] Favori durumu güncelleme. İlan ID: ${ilanId}, Durum: ${isFavorite ? 'Eklendi' : 'Çıkarıldı'}`);

    if (!USE_MOCK) {
      const endpoint = isFavorite ? '/favorites/add' : `/favorites/remove/${ilanId}`;
      const method = isFavorite ? 'POST' : 'DELETE';
      const body = isFavorite ? JSON.stringify({ listing_id: ilanId }) : undefined;
      const result = await fetchApiResult<{ isFavorite: boolean } | null>(endpoint, {
        method,
        body,
      });
      if (result.success && result.data && typeof result.data === 'object' && 'isFavorite' in result.data) {
        return result;
      }
      return {
        success: result.success,
        message: result.message,
        data: { isFavorite },
      };
    }

    // Hedef: favoriteService — POST /api/v1/favorites/add | DELETE /favorites/remove/{id}
    await simulateApiRequest(
      isFavorite ? '/favorites/add' : `/favorites/remove/${ilanId}`,
      {
        method: isFavorite ? 'POST' : 'DELETE',
        body: isFavorite ? JSON.stringify({ listing_id: ilanId }) : undefined,
        delay: 300,
      }
    );

    return {
      success: true,
      message: isFavorite ? 'İlan favorilere eklendi' : 'İlan favorilerden çıkarıldı',
      data: { isFavorite }
    };
  } catch (error) {
    console.error('[API] Favori durumu güncellenirken hata:', error);
    return { success: false, message: 'Favori durumu güncellenirken bir hata oluştu', data: null };
  }
};

/**
 * İlan sahibi bilgilerini getiren API simülasyonu
 */
export const getSellerInfo = async (
  userId: number | string
): Promise<ApiResult<SellerData | null>> => {
  try {
    console.log('getSellerInfo çağrıldı, userId:', userId, 'veri tipi:', typeof userId);

    if (!USE_MOCK) {
      try {
        const res = await fetchApiResult<SellerData | null>(`/users/${userId}`, { method: 'GET' });
        if (res.success && res.data) return res;
      } catch (e) {
        console.warn(`[API] /users/${userId} fetch failed, falling back to mock:`, e);
      }
    }

    // Hedef: GET /api/v1/users/{userId}
    await simulateApiRequest(`/users/${userId}`, { method: 'GET', delay: 300 });

    const numericUserId = Number(userId);
    const typedData = ilanData as IlanDataFile;
    const userItem = (userData as UserRecord[]).find(
      user => Number(user.user_id) === numericUserId
    );

    if (userItem) {
      console.log(`[API] Kullanıcı veritabanında bulundu: ${userItem.ad_soyad}`);

      const userOtherListingsCount = typedData.ilanlari.filter(
        item => Number(item.user_id) === numericUserId
      ).length;

      return {
        success: true,
        message: 'Kullanıcı bilgileri başarıyla getirildi',
        data: {
          id: userItem.user_id,
          name: userItem.ad_soyad,
          profileImage: userItem.profil_fotografi,
          phone: userItem.telefon,
          email: userItem.email,
          isVerified: userItem.dogrulanmis_hesap,
          bio: typeof userItem.bio === 'string' ? userItem.bio : null,
          location: { city: userItem.il, district: userItem.ilce },
          memberSince: new Date(2020, 0, 1 + (Number(userItem.user_id) % 365)).toISOString(),
          otherListings: userOtherListingsCount
        }
      };
    } else {
      console.log(`[API] Kullanıcı veritabanında bulunamadı. ID: ${userId}`);
      return { success: false, message: 'Kullanıcı bulunamadı', data: null };
    }
  } catch (error) {
    console.error('Satıcı bilgileri alınırken hata:', error);
    return { success: false, message: 'Hata oluştu', data: null };
  }
};

/**
 * İlan ID'sine göre yorumları getiren fonksiyon
 */
export const getReviewsByIlanId = async (ilanId: number | string): Promise<unknown[]> => {
  try {
    // Hedef: GET /api/v1/listings/{listingId}/reviews
    console.log(`[Reviews] İlan ${ilanId} için yorumlar getiriliyor...`);
    console.log(`[ProductDetail API] Hedef path: ${API_BASE_URL}/listings/${ilanId}/reviews`);

    if (!USE_MOCK) {
      const result = await fetchApiResult<unknown>(`/listings/${ilanId}/reviews`, { method: 'GET' });
      if (!result.success || !result.data) return [];
      if (Array.isArray(result.data)) return result.data;
      const obj = result.data as { reviews?: unknown[] };
      return Array.isArray(obj.reviews) ? obj.reviews : [];
    }

    const ilanNum = parseInt(String(ilanId), 10);
    const filtered = (reviewsDatabase as ReviewRecord[]).filter(
      (review) => Number(review.ilan_id) === ilanNum
    );

    const formatted = filtered.map(review => {
      const commenter = (userData as UserRecord[]).find(
        user => Number(user.user_id) === Number(review.commenter_id)
      );
      const realUserName = commenter
        ? commenter.ad_soyad
        : `Kullanıcı ${review.commenter_id}`;

      return {
        id: review.comment_id,
        ilan_id: review.ilan_id,
        user: realUserName,
        rating: review.rating,
        comment: review.comment_text,
        date: review.comment_date,
        time: review.comment_time,
        response: null,
        commentedUserId: review.commented_user_id,
        commenterId: review.commenter_id
      };
    });

    console.log(`[Reviews] İlan ${ilanId} için ${formatted.length} yorum getirildi`);
    return formatted;
  } catch (error) {
    console.error(`[Reviews] İlan ${ilanId} yorumları getirilirken hata:`, error);
    return [];
  }
};

/**
 * ServiceDetail sayfası için özel hizmet bilgileri
 */
export const getServiceDetailData = async (ilanId: number | string): Promise<unknown> => {
  try {
    console.log(`[ServiceDetail] Hizmet detayları için API isteği yapıldı. İlan ID: ${ilanId}`);

    if (!USE_MOCK) {
      const serviceData = await getProductDetail(ilanId);
      let workingHours: WorkingHoursRecord | null = null;
      try {
        const wh = await simulateApiRequest(`/listings/${ilanId}/working-hours`, { method: 'GET' });
        workingHours = (wh as WorkingHoursRecord) || null;
      } catch (whError) {
        console.warn('[ServiceDetail] Çalışma saatleri alınamadı:', whError);
      }
      console.log('[ServiceDetail] Hizmet detayları başarıyla getirildi. Çalışma saatleri dahil edildi.');
      return { ...serviceData, working_hours: workingHours };
    }

    // Ayrı /services path yok — listings detay + working-hours
    await simulateApiRequest(`/listings/${ilanId}`, { method: 'GET', delay: 400 });

    const serviceData = await getProductDetail(ilanId);
    const workingHours = getWorkingHoursByIlanId(Number(ilanId));

    const enhanced = { ...serviceData, working_hours: workingHours };

    console.log('[ServiceDetail] Hizmet detayları başarıyla getirildi. Çalışma saatleri dahil edildi.');
    return enhanced;
  } catch (error) {
    console.error('[ServiceDetail] Hizmet detayları getirme hatası:', error);
    throw new Error('Hizmet detayları yüklenirken bir hata oluştu');
  }
};

// Default export
const productDetailService = {
  getProductDetail,
  getSimilarProducts,
  toggleFavorite,
  getSellerInfo,
  getWorkingHoursByIlanId,
  getServiceDetailData,
  getReviewsByIlanId
};

export default productDetailService;
