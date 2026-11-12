/**
 * userListingsService.ts - Kullanıcı ilanlarını API'den çekmek için mock servis
 * defaultCardData — legacy; userIlanService ile birleştirilmeli.
 *
 * Hedef: GET /api/v1/users/{userId}/listings veya /api/v1/listings?user_id=...
 */


/** Host normalize → {host}/api/v1 */
function resolveUserListingsApiBase(): string {
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

const API_BASE_URL = resolveUserListingsApiBase();

// ---- TİP TANIMLARI ----
interface ListingRecord {
  user_id?: number;
  userId?: number;
  status?: string;
  category?: string;
  categoryId?: string | number;
  categoryName?: string;
  price?: number | string;
  date?: string;
  createdAt?: string;
  publishDate?: string;
  views?: number;
  [key: string]: unknown;
}

interface ListingParams {
  status?: string;
  category?: string;
  priceMin?: string | number;
  priceMax?: string | number;
  dateStart?: string;
  dateEnd?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface ListingsResult {
  success: boolean;
  message: string;
  data: {
    listings: ListingRecord[];
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
    filters: {
      status: string;
      category: string;
      priceRange: { min: string | number | null; max: string | number | null };
      dateRange: { start: string | null; end: string | null };
      sort: string;
    };
  } | null;
}

// ---- ANA FONKSİYONLAR ----

const getUserListings = async (
  userId: string | number,
  params: ListingParams = {}
): Promise<ListingsResult> => {
  try {
    if (!userId || isNaN(parseInt(String(userId)))) throw new Error('Geçersiz kullanıcı kimliği');

    const page = params.page || 1;
    const limit = params.limit || 20;

    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.category) query.set('category', String(params.category));
    if (params.priceMin !== undefined && params.priceMin !== null) query.set('price_min', String(params.priceMin));
    if (params.priceMax !== undefined && params.priceMax !== null) query.set('price_max', String(params.priceMax));
    if (params.dateStart) query.set('date_start', params.dateStart);
    if (params.dateEnd) query.set('date_end', params.dateEnd);
    if (params.sort) query.set('sort', params.sort);
    query.set('page', String(page));
    query.set('page_size', String(limit));

    const url = `${API_BASE_URL}/users/${userId}/listings?${query.toString()}`;
    console.log(`[UserListings API] GET ${url}`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Kullanıcı ilanları alınamadı (HTTP ${response.status})`);

    const json = await response.json();
    const body = (json && typeof json === 'object' && 'data' in json ? json.data : json) as {
      listings?: ListingRecord[]; items?: ListingRecord[];
      total?: number; totalListings?: number; totalPages?: number;
    };
    const listings = body?.listings || body?.items || [];
    const total = body?.total ?? body?.totalListings ?? listings.length;

    return {
      success: true,
      message: 'Kullanıcı ilanları başarıyla getirildi',
      data: {
        listings,
        pagination: {
          total,
          page,
          pageSize: limit,
          totalPages: body?.totalPages ?? (Math.ceil(total / limit) || 1)
        },
        filters: {
          status: params.status || 'all',
          category: params.category || 'all',
          priceRange: { min: params.priceMin || null, max: params.priceMax || null },
          dateRange: { start: params.dateStart || null, end: params.dateEnd || null },
          sort: params.sort || 'date_desc'
        }
      }
    };
  } catch (error) {
    console.error('[UserListingsService] Kullanıcı ilanları alınamadı:', error);
    return { success: false, message: (error as Error).message || 'Kullanıcı ilanları yüklenirken bir hata oluştu', data: null };
  }
};

const getActiveListings = async (userId: string | number, params: ListingParams = {}): Promise<ListingsResult> => {
  return getUserListings(userId, { ...params, status: 'active' });
};

const getSoldListings = async (userId: string | number, params: ListingParams = {}): Promise<ListingsResult> => {
  return getUserListings(userId, { ...params, status: 'sold' });
};

const userListingsService = { getUserListings, getActiveListings, getSoldListings };
export default userListingsService;
