/**
 * reviewService.ts - Kullanıcı değerlendirmelerini API'den çekmek için servis
 * Mock data: reviews_database.json, user_database2.json
 *
 * Path alias yok:
 *   GET  /api/v1/users/{userId}/reviews
 *   GET  /api/v1/reviews/{reviewId}
 *   GET  /api/v1/users/{userId}/reviews/pending
 *   POST /api/v1/reviews
 */

import reviewsData from '@/data/reviews_database.json';
import usersData from '@/data/user_database2.json';

/** Host normalize → {host}/api/v1 */
function resolveReviewsApiBase(): string {
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

const API_BASE_URL = resolveReviewsApiBase();
const USE_MOCK = false; // Canlı BE

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token =
      sessionStorage.getItem('auth_token') ||
      localStorage.getItem('auth_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function unwrap<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

// ---- TİP TANIMLARI ----
interface ReviewRecord {
  comment_id: number;
  commenter_id: number | string;
  commented_user_id: number | string;
  rating: number;
  comment_text: string;
  comment_date: string;
  comment_time: string;
  [key: string]: unknown;
}

interface UserRecord {
  user_id: number | string;
  ad_soyad: string;
  profil_fotografi?: string;
  dogrulanmis_hesap?: boolean;
  [key: string]: unknown;
}

interface FormattedReview {
  id: number;
  userId: number;
  userName: string;
  userNameFull: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
  isVerified: boolean;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingCounts: Record<number, number>;
  categoriesAverage: {
    communication: number;
    accuracy: number;
    value: number;
    reliability: number;
  };
}

interface ReviewsResult {
  success: boolean;
  message: string;
  data: {
    reviews: FormattedReview[];
    stats: ReviewStats;
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
  } | null;
}

interface ReviewDetailResult {
  success: boolean;
  message: string;
  data: unknown;
}

interface ReviewParams {
  rating?: string;
  page?: string | number;
  limit?: string | number;
  sort?: string;
  [key: string]: unknown;
}

// ---- YARDIMCI ----
const getMaskedName = (fullName: string): string => {
  if (!fullName) return 'Anonim Kullanıcı';
  const parts = fullName.split(' ');
  return parts.map(part => {
    if (part.length <= 1) return part;
    return part.charAt(0) + ''.padEnd(part.length - 1, '*');
  }).join(' ');
};

const findUserById = (id: number): UserRecord | undefined => {
  for (const user of usersData as UserRecord[]) {
    const uid = typeof user.user_id === 'string' ? parseInt(user.user_id, 10) : user.user_id;
    if (uid === id) return user;
  }
  return undefined;
};

// ---- ANA FONKSİYONLAR ----

const getUserReviews = async (userId: string | number, params: ReviewParams = {}): Promise<ReviewsResult> => {
  try {
    if (!userId || isNaN(parseInt(String(userId)))) throw new Error('Geçersiz kullanıcı kimliği');
    const userIdNumber = parseInt(String(userId), 10);

    if (!USE_MOCK) {
      const query = new URLSearchParams();
      if (params.rating) query.set('rating', String(params.rating));
      if (params.sort) query.set('sort', params.sort);
      query.set('page', String(parseInt(String(params.page)) || 1));
      query.set('page_size', String(parseInt(String(params.limit)) || 10));

      const url = `${API_BASE_URL}/users/${userId}/reviews?${query.toString()}`;
      console.log(`[Reviews API] GET ${url}`);
      const response = await fetch(url, { headers: authHeaders() });
      if (!response.ok) throw new Error(`Değerlendirmeler alınamadı (HTTP ${response.status})`);

      const body = unwrap<{
        reviews?: Record<string, unknown>[]; items?: Record<string, unknown>[];
        stats?: ReviewStats; total?: number; totalPages?: number;
      }>(await response.json());
      const raw = body?.reviews || body?.items || [];
      const page = parseInt(String(params.page)) || 1;
      const limit = parseInt(String(params.limit)) || 10;

      const formattedReviews: FormattedReview[] = raw.map((r) => {
        const fullName = String(r.userNameFull || r.userName || r.commenterName || 'Anonim Kullanıcı');
        return {
          id: Number(r.id ?? r.comment_id ?? 0),
          userId: Number(r.userId ?? r.commenterId ?? 0),
          userName: String(r.userName || getMaskedName(fullName)),
          userNameFull: fullName,
          userAvatar: String(r.userAvatar || r.commenterAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg'),
          rating: Number(r.rating || 0),
          comment: String(r.comment || r.comment_text || ''),
          date: String(r.date || r.comment_date || ''),
          isVerified: !!r.isVerified,
        };
      });

      const total = body?.total ?? formattedReviews.length;
      const avgFromList = formattedReviews.length
        ? parseFloat((formattedReviews.reduce((s, r) => s + r.rating, 0) / formattedReviews.length).toFixed(1))
        : 0;

      return {
        success: true,
        message: 'Kullanıcı değerlendirmeleri başarıyla getirildi',
        data: {
          reviews: formattedReviews,
          stats: body?.stats || {
            averageRating: avgFromList,
            totalReviews: total,
            ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            categoriesAverage: { communication: avgFromList, accuracy: avgFromList, value: avgFromList, reliability: avgFromList },
          },
          pagination: { total, page, pageSize: limit, totalPages: body?.totalPages ?? (Math.ceil(total / limit) || 1) },
        },
      };
    }

    // ---- MOCK MOD ----
    // TÜM kullanıcı yorumları
    let allUserReviews = (reviewsData as ReviewRecord[]).filter(review => {
      const rid = typeof review.commented_user_id === 'string'
        ? parseInt(review.commented_user_id, 10)
        : review.commented_user_id;
      return rid === userIdNumber;
    });

    // İstatistikler
    const totalRating = allUserReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
    const averageRating = allUserReviews.length > 0 ? totalRating / allUserReviews.length : 0;

    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allUserReviews.forEach(r => {
      const rounded = Math.round(Number(r.rating || 0));
      if (rounded >= 1 && rounded <= 5) ratingCounts[rounded]++;
    });

    // Filtrele
    let filtered = [...allUserReviews];
    if (params.rating && params.rating !== '') {
      const filterRating = parseInt(params.rating, 10);
      filtered = filtered.filter(r => Math.round(Number(r.rating) || 0) === filterRating);
    }

    // Sayfalama
    const page = parseInt(String(params.page)) || 1;
    const limit = parseInt(String(params.limit)) || 10;

    // Sıralama
    const sortType = params.sort || 'date_desc';
    const sorted = [...filtered];

    switch (sortType) {
      case 'date_desc':
        sorted.sort((a, b) => new Date(b.comment_date).getTime() - new Date(a.comment_date).getTime());
        break;
      case 'date_asc':
        sorted.sort((a, b) => new Date(a.comment_date).getTime() - new Date(b.comment_date).getTime());
        break;
      case 'rating_desc':
        sorted.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        break;
      case 'rating_asc':
        sorted.sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0));
        break;
      default:
        sorted.sort((a, b) => new Date(b.comment_date).getTime() - new Date(a.comment_date).getTime());
    }

    const startIdx = (page - 1) * limit;
    const paginated = sorted.slice(startIdx, startIdx + limit);

    // Formatla
    const formattedReviews: FormattedReview[] = paginated.map(review => {
      const commenterId = typeof review.commenter_id === 'string'
        ? parseInt(review.commenter_id, 10)
        : review.commenter_id as number;
      const rating = Number(review.rating) || 0;
      const commenter = findUserById(commenterId);
      const commenterName = commenter ? (commenter as UserRecord).ad_soyad : 'Anonim Kullanıcı';

      return {
        id: review.comment_id,
        userId: commenterId,
        userName: getMaskedName(commenterName),
        userNameFull: commenterName,
        userAvatar: commenter?.profil_fotografi || 'https://randomuser.me/api/portraits/lego/1.jpg',
        rating,
        comment: review.comment_text,
        date: review.comment_date,
        isVerified: commenter ? !!commenter.dogrulanmis_hesap : false
      };
    });

    const avg = parseFloat(averageRating.toFixed(1));

    return {
      success: true,
      message: 'Kullanıcı değerlendirmeleri başarıyla getirildi',
      data: {
        reviews: formattedReviews,
        stats: {
          averageRating: avg,
          totalReviews: allUserReviews.length,
          ratingCounts,
          categoriesAverage: { communication: avg, accuracy: avg, value: avg, reliability: avg }
        },
        pagination: {
          total: filtered.length,
          page,
          pageSize: limit,
          totalPages: Math.ceil(filtered.length / limit)
        }
      }
    };
  } catch (error) {
    return { success: false, message: (error as Error).message || 'Değerlendirmeler yüklenirken bir hata oluştu', data: null };
  }
};

const getReviewDetails = async (reviewId: string | number): Promise<ReviewDetailResult> => {
  try {
    if (!reviewId) throw new Error('Geçersiz değerlendirme kimliği');

    if (!USE_MOCK) {
      const url = `${API_BASE_URL}/reviews/${reviewId}`;
      console.log(`[Reviews API] GET ${url}`);
      const response = await fetch(url, { headers: authHeaders() });
      if (!response.ok) throw new Error(`Değerlendirme alınamadı (HTTP ${response.status})`);
      const data = unwrap<unknown>(await response.json());
      return { success: true, message: 'Değerlendirme detayı başarıyla getirildi', data };
    }

    // ---- MOCK MOD ----
    const rid = typeof reviewId === 'string' ? parseInt(reviewId, 10) : reviewId;
    const review = (reviewsData as ReviewRecord[]).find(r => r.comment_id === rid);
    if (!review) throw new Error('Değerlendirme bulunamadı');

    const commenterId = typeof review.commenter_id === 'string' ? parseInt(review.commenter_id, 10) : review.commenter_id as number;
    const commentedId = typeof review.commented_user_id === 'string' ? parseInt(review.commented_user_id, 10) : review.commented_user_id as number;
    const rating = Number(review.rating || 0);

    const commenter = findUserById(commenterId);
    const commented = findUserById(commentedId);

    const commenterFullName = commenter ? commenter.ad_soyad : 'Anonim Kullanıcı';
    const commentedFullName = commented ? commented.ad_soyad : 'Bilinmeyen Kullanıcı';

    return {
      success: true,
      message: 'Değerlendirme detayı başarıyla getirildi',
      data: {
        id: review.comment_id,
        commenterId,
        commenterName: getMaskedName(commenterFullName),
        commenterNameFull: commenterFullName,
        commenterAvatar: commenter?.profil_fotografi || 'https://randomuser.me/api/portraits/lego/1.jpg',
        commentedId,
        commentedName: getMaskedName(commentedFullName),
        commentedNameFull: commentedFullName,
        rating,
        comment: review.comment_text,
        date: review.comment_date,
        fullDate: `${review.comment_date} ${review.comment_time}`,
        isVerified: commenter ? !!commenter.dogrulanmis_hesap : false
      }
    };
  } catch (error) {
    return { success: false, message: (error as Error).message, data: null };
  }
};

const getPendingReviews = async (userId: string | number): Promise<ReviewDetailResult> => {
  try {
    if (!userId) throw new Error('Geçersiz kullanıcı kimliği');
    const url = `${API_BASE_URL}/users/${userId}/reviews/pending`;
    console.log(`[Reviews API] GET ${url}`);
    const response = await fetch(url, { headers: authHeaders() });
    if (!response.ok) throw new Error(`Bekleyen değerlendirmeler alınamadı (HTTP ${response.status})`);
    const data = unwrap<unknown[]>(await response.json());
    return { success: true, message: 'Yapılabilecek değerlendirmeler başarıyla getirildi', data: Array.isArray(data) ? data : [] };
  } catch (error) {
    console.error('[ReviewService] Bekleyen değerlendirmeler alınamadı:', error);
    return { success: false, message: (error as Error).message, data: [] };
  }
};

const submitReview = async (reviewData: {
  listingId?: string | number;
  targetUserId?: string | number | null;
  rating: number;
  comment: string;
  userId?: string | number;
  targetId?: string | number;
  [key: string]: unknown;
}): Promise<ReviewDetailResult> => {
  try {
    const listingId = reviewData.listingId ?? reviewData.serviceId;
    const targetUserId = reviewData.targetUserId ?? reviewData.targetId;
    if (!listingId) throw new Error('İlan bilgisi bulunamadı');
    const url = `${API_BASE_URL}/reviews`;
    const payload: Record<string, unknown> = {
      listingId: Number(listingId),
      rating: Number(reviewData.rating),
      comment: reviewData.comment,
    };
    if (targetUserId != null && !Number.isNaN(Number(targetUserId))) {
      payload.targetUserId = Number(targetUserId);
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const msg =
        (json && typeof json === 'object' && 'message' in json && typeof (json as { message?: string }).message === 'string'
          ? (json as { message: string }).message
          : null) || `Değerlendirme gönderilemedi (HTTP ${response.status})`;
      throw new Error(msg);
    }
    const data = unwrap<unknown>(json);
    return { success: true, message: 'Değerlendirme başarıyla gönderildi', data };
  } catch (error) {
    console.error('[ReviewService] Değerlendirme gönderilemedi:', error);
    return { success: false, message: (error as Error).message, data: null };
  }
};

export interface ReviewEligibility {
  canReview: boolean;
  alreadyReviewed: boolean;
  completedAppointments: number;
  existingReviews: number;
  targetUserId?: number | null;
}

const checkEligibility = async (listingId: string | number): Promise<ReviewEligibility> => {
  try {
    const headers = authHeaders();
    if (!headers.Authorization || !listingId) {
      return { canReview: false, alreadyReviewed: false, completedAppointments: 0, existingReviews: 0 };
    }
    const url = `${API_BASE_URL}/reviews/eligibility?listing_id=${encodeURIComponent(String(listingId))}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return { canReview: false, alreadyReviewed: false, completedAppointments: 0, existingReviews: 0 };
    }
    const data = unwrap<Partial<ReviewEligibility>>(await response.json());
    return {
      canReview: Boolean(data?.canReview),
      alreadyReviewed: Boolean(data?.alreadyReviewed),
      completedAppointments: Number(data?.completedAppointments ?? 0),
      existingReviews: Number(data?.existingReviews ?? 0),
      targetUserId: data?.targetUserId != null ? Number(data.targetUserId) : null,
    };
  } catch {
    return { canReview: false, alreadyReviewed: false, completedAppointments: 0, existingReviews: 0 };
  }
};

const reviewService = { getUserReviews, getReviewDetails, getPendingReviews, submitReview, checkEligibility };
export default reviewService;
