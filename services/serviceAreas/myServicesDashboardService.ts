/**
 * Panel: Hizmet Alanlarım — veri yalnızca burada/API’den; bileşenlerde sabit iş verisi yok.
 *
 * Path alias yok: services/dashboard/mine kullanılmaz
 *   → GET /api/v1/listings?mine=true&is_service=true
 *   → GET /api/v1/listings/{id}
 */

import { STORAGE_KEYS } from '@/config/constants';
import ServiceAreasClient from '@/services/serviceAreas/serviceAreasClient';

/** Host normalize → {host}/api/v1 */
function resolveMyServicesApiBase(): string {
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

const API_BASE = resolveMyServicesApiBase();
/** Eski: services/dashboard/mine — kaldırıldı; listings mine + is_service */
const MY_SERVICES_PATH =
  process.env.NEXT_PUBLIC_MY_SERVICES_PATH || 'listings?mine=true&is_service=true';
const USE_MOCK_FALLBACK = false; // Canlı BE — mock yedek kapalı

export interface DashboardGalleryImage {
  id: string | number;
  url: string;
  title?: string;
}

export interface DashboardPerformancePoint {
  ay: string;
  memnuniyet: number;
  tamamlanan: number;
}

export interface DashboardServiceOverview {
  totalCustomers?: number;
  customersTrend?: string;
  completedJobs?: number;
  jobsTrend?: string;
  satisfactionPercent?: number;
  satisfactionTrend?: string;
  experienceYears?: number;
}

export interface DashboardServiceReview {
  id: string | number;
  user: string;
  rating: number;
  date?: string;
  serviceDate?: string;
  comment?: string;
  response?: string;
}

export interface DashboardServiceLocation {
  id: string | number;
  district: string;
  neighborhoods: string[];
  isActive?: boolean;
}

/** Modal + kart için tek model */
export interface MyDashboardService {
  id: string | number;
  /** Ürün / ilan kimliği (yorumlar reviews_database.json ile bu id üzerinden eşleşir) */
  ilanId?: number;
  title: string;
  description: string;
  image: string;
  rating: number;
  reviews: number;
  category?: string;
  price?: string;
  gallery: DashboardGalleryImage[];
  performance: DashboardPerformancePoint[];
  overview: DashboardServiceOverview;
  reviewList: DashboardServiceReview[];
  locations: DashboardServiceLocation[];
}

export interface MyServicesDashboardStats {
  activeServices: number;
  completedJobs: number;
  averageRating: number | null;
}

export interface MyServicesDashboardResult {
  services: MyDashboardService[];
  stats: MyServicesDashboardStats;
}

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function normalizeService(raw: Record<string, unknown>, index: number): MyDashboardService {
  const id = raw.id ?? raw.ilan_id ?? index;
  const rawIlan =
    raw.ilan_id ?? raw.ilanId ?? raw.listing_id ?? raw.listingId ?? raw.ad_id ?? raw.adId;
  const ilanId =
    rawIlan != null
      ? Number(rawIlan)
      : typeof id === 'number'
        ? id
        : typeof id === 'string' && /^\d+$/.test(id)
          ? Number(id)
          : undefined;
  const rawList = asArray<unknown>(
    raw.gallery ?? raw.imageUrls ?? raw.photos ?? raw.resimler ?? raw.images
  );
  const gallery = rawList.map((g, i) => {
    if (typeof g === 'string') {
      return { id: i, url: g, title: undefined };
    }
    const o = (g || {}) as Record<string, unknown>;
    return {
      id: o.id ?? i,
      url: String(o.url ?? o.src ?? o.image_id ?? ''),
      title: o.title != null ? String(o.title) : undefined,
    };
  }).filter((g) => g.url);

  const title = String(raw.baslik ?? raw.title ?? '');
  const description = String(raw.description ?? raw.aciklama ?? '');
  const userPhoto = (raw.user_photo ?? raw.userPhoto ?? raw.userPhotoUrl ?? (raw.seller as any)?.profileImage ?? (raw.ilan_sahibi as any)?.profileImage ?? '') as string;
  const userUploadedInGallery = gallery.find(g => g.url.includes('/uploads/profiles/') || g.url.includes('cover_u') || g.url.includes('avatar_u'))?.url;
  const sellerCover = (raw.seller as any)?.coverImage;
  const image = String(
    raw.img ??
    raw.image ??
    (userUploadedInGallery || (gallery[0]?.url && !gallery[0]?.url.includes('img_3dcef') && !gallery[0]?.url.includes('kapak-fotografi') && !gallery[0]?.url.includes('img_284_cover') ? gallery[0].url : null) || sellerCover || userPhoto || gallery[0]?.url || '')
  );
  const rating = typeof raw.rating === 'number' ? raw.rating : parseFloat(String(raw.rating ?? raw.puan ?? raw.averageRating ?? 0)) || 0;
  const reviews = typeof raw.review_count === 'number' ? raw.review_count : parseInt(String(raw.reviews ?? raw.reviewCount ?? raw.review_count ?? 0), 10) || 0;
  const category = raw.category_name != null ? String(raw.category_name) : raw.categoryName != null ? String(raw.categoryName) : raw.category != null ? String(raw.category) : undefined;
  const price = raw.price != null ? String(raw.price) : raw.fiyat != null ? String(raw.fiyat) : undefined;

  const performance = asArray<DashboardPerformancePoint>(raw.performance ?? raw.performance_series).map((p) => {
    const o = p as Record<string, unknown>;
    return {
      ay: String(o.ay ?? o.month ?? ''),
      memnuniyet: typeof o.memnuniyet === 'number' ? o.memnuniyet : parseFloat(String(o.memnuniyet ?? 0)) || 0,
      tamamlanan: typeof o.tamamlanan === 'number' ? o.tamamlanan : parseFloat(String(o.tamamlanan ?? o.completed ?? 0)) || 0,
    };
  });

  const ov = (raw.overview ?? {}) as Record<string, unknown>;
  const overview: DashboardServiceOverview = {
    totalCustomers: ov.totalCustomers != null ? Number(ov.totalCustomers) : (raw.totalCustomers != null ? Number(raw.totalCustomers) : undefined),
    customersTrend: ov.customersTrend != null ? String(ov.customersTrend) : undefined,
    completedJobs: ov.completedJobs != null ? Number(ov.completedJobs) : (raw.completedJobs != null ? Number(raw.completedJobs) : undefined),
    jobsTrend: ov.jobsTrend != null ? String(ov.jobsTrend) : undefined,
    satisfactionPercent: ov.satisfactionPercent != null ? Number(ov.satisfactionPercent) : (raw.satisfactionPercent != null ? Number(raw.satisfactionPercent) : undefined),
    satisfactionTrend: ov.satisfactionTrend != null ? String(ov.satisfactionTrend) : undefined,
    experienceYears: ov.experienceYears != null ? Number(ov.experienceYears) : (raw.experienceYears != null ? Number(raw.experienceYears) : undefined),
  };

  const reviewList = asArray<DashboardServiceReview>(raw.reviews_list ?? raw.reviewList).map((r, i) => {
    const o = r as Record<string, unknown>;
    return {
      id: o.id ?? i,
      user: String(o.user ?? o.reviewerName ?? o.reviewer_name ?? o.user_name ?? o.commenterName ?? ''),
      rating: typeof o.rating === 'number' ? o.rating : parseInt(String(o.rating ?? 0), 10) || 0,
      date: o.date != null ? String(o.date) : (o.createdAt ? String(o.createdAt).split('T')[0] : undefined),
      serviceDate: o.serviceDate != null ? String(o.serviceDate) : undefined,
      comment: o.comment != null ? String(o.comment) : undefined,
      response: o.response != null ? String(o.response) : undefined,
    };
  });

  const rawLocs = raw.locations ?? raw.serviceAreas ?? raw.service_areas;
  let locList: unknown[] = [];
  if (Array.isArray(rawLocs)) {
    locList = rawLocs;
  } else if (rawLocs && typeof rawLocs === 'object') {
    const candObj = rawLocs as Record<string, unknown>;
    locList = [...(Array.isArray(candObj.manual) ? candObj.manual : []), ...(Array.isArray(candObj.map) ? candObj.map : [])];
  }
  const locations = locList.map((l, i) => {
    const o = l as Record<string, unknown>;
    const district = o.districtName || o.district_name || o.district || o.ilce || '';
    const city = o.cityName || o.city_name || o.city || o.il || '';
    const name = String(
      o.name || (district && city ? `${district} - ${city}` : (district || city)) || (o.type === 'circle' ? 'Dairesel Hizmet Alanı' : 'Hizmet Bölgesi')
    ).trim();
    const nh = o.neighborhoods || o.neighborhood_ids || o.neighborhoodIds;
    return {
      id: o.id ?? i,
      district: name,
      neighborhoods: Array.isArray(nh) ? nh.map(String) : [],
      isActive: o.isActive !== false,
    };
  });

  return {
    id: id as string | number,
    ...(ilanId != null && !Number.isNaN(ilanId) ? { ilanId } : {}),
    title,
    description,
    image,
    rating,
    reviews,
    category,
    price,
    gallery,
    performance,
    overview,
    reviewList,
    locations,
  };
}

function normalizeStats(body: Record<string, unknown> | null): MyServicesDashboardStats {
  if (!body || typeof body !== 'object') {
    return { activeServices: 0, completedJobs: services.reduce((acc, s) => acc + (s.overview?.completedJobs || 0), 0), averageRating: null };
  }
  const s = (body.stats ?? body.dashboard_stats ?? {}) as Record<string, unknown>;
  return {
    activeServices: typeof s.activeServices === 'number' ? s.activeServices : parseInt(String(s.activeServices ?? 0), 10) || 0,
    completedJobs: typeof s.completedJobs === 'number' ? s.completedJobs : parseInt(String(s.completedJobs ?? 0), 10) || 0,
    averageRating:
      s.averageRating != null
        ? typeof s.averageRating === 'number'
          ? s.averageRating
          : parseFloat(String(s.averageRating))
        : null,
  };
}

/**
 * Önce gerçek dashboard endpoint’i; yoksa boş. İsteğe bağlı: vitrin client ile yedek liste (tasarım dolu kalsın diye değil, sadece API yoksa).
 */
/** Tek ilan/hizmet satırı — düzenleme sayfası için (veri yalnızca servis katmanından). */
export async function getMyDashboardServiceById(serviceId: string | number): Promise<MyDashboardService | null> {
  const sid = String(serviceId);
  try {
    const { services } = await fetchMyServicesDashboard();
    const found = services.find((s) => String(s.id) === sid || String(s.ilanId) === sid);
    if (found) return found;
  } catch (err) {
    console.warn('[myServicesDashboardService] fetchMyServicesDashboard error, trying direct fetch:', err);
  }

  // Doğrudan GET /api/v1/listings/{id} dene (Aktif İlanlar / genel ilan id ile gelindiğinde)
  try {
    const url = `${API_BASE}/listings/${serviceId}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (res.ok) {
      const body = (await res.json()) as Record<string, unknown>;
      const raw =
        body && typeof body === 'object' && body.data && typeof body.data === 'object' && !Array.isArray(body.data)
          ? (body.data as Record<string, unknown>)
          : body;
      if (raw && typeof raw === 'object') {
        return normalizeService(raw as Record<string, unknown>, 0);
      }
    }
  } catch (err) {
    console.error('[myServicesDashboardService] Direct listing fetch error:', err);
  }

  return null;
}

export async function fetchMyServicesDashboard(): Promise<MyServicesDashboardResult> {
  try {
    // Hedef: GET /api/v1/listings?mine=true&is_service=true
    const path = MY_SERVICES_PATH.replace(/^\//, '');
    const url = path.includes('?') ? `${API_BASE}/${path}` : `${API_BASE}/${path}`;
    console.log(`[ServiceAreas Dashboard] Hedef path: GET ${url}`);
    const res = await fetch(url, { headers: authHeaders() });
    if (res.ok) {
      const body = (await res.json()) as Record<string, unknown>;
      const data =
        body.data && typeof body.data === 'object' && !Array.isArray(body.data)
          ? (body.data as Record<string, unknown>)
          : body;
      const list = asArray<Record<string, unknown>>(
        data.listings ?? data.services ?? data.items ?? (Array.isArray(body.data) ? body.data : [])
      );
      const services = list.map((row, i) => normalizeService(row, i));
      const stats = normalizeStats(body);
      if (stats.activeServices === 0 && stats.completedJobs === 0 && services.length > 0) {
        const avg =
          services.length > 0
            ? Math.round((services.reduce((a, s) => a + s.rating, 0) / services.length) * 10) / 10
            : null;
        return {
          services,
          stats: {
            activeServices: services.length,
            completedJobs: 0,
            averageRating: avg,
          },
        };
      }
      return { services, stats };
    }
    console.error(`[ServiceAreas Dashboard] API hatası: HTTP ${res.status}`);
  } catch (error) {
    console.error('[ServiceAreas Dashboard] API isteği başarısız:', error);
  }

  if (!USE_MOCK_FALLBACK) {
    return { services: [], stats: { activeServices: 0, completedJobs: 0, averageRating: null } };
  }

  try {
    const client = new ServiceAreasClient();
    const cats = await client.getServiceCategories();
    if (!cats.success || !cats.data?.length) {
      return { services: [], stats: { activeServices: 0, completedJobs: 0, averageRating: null } };
    }
    const prov = await client.getServiceProviders(cats.data[0].id, { limit: 30 });
    const items = (prov.data?.items ?? []) as Record<string, unknown>[];
    const services = items.map((row, i) => normalizeService(row, i));
    const avg =
      services.length > 0
        ? Math.round((services.reduce((a, s) => a + s.rating, 0) / services.length) * 10) / 10
        : null;
    return {
      services,
      stats: {
        activeServices: services.length,
        completedJobs: 0,
        averageRating: avg,
      },
    };
  } catch {
    return { services: [], stats: { activeServices: 0, completedJobs: 0, averageRating: null } };
  }
}
