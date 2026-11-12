// dashboardReviewsService.ts - Dashboard için reviews servisi
// Mock: reviews_database.json + localStorage yanıtlar
// Path alias yok:
//   GET  /api/v1/users/{userId}/reviews  (inbox / getServiceReviews)
//   GET  /api/v1/listings/{listingId}/reviews
//   POST /api/v1/reviews/{reviewId}/response
//   DELETE /api/v1/reviews/{reviewId}/response
//   GET  /api/v1/users/{userId}/reviews/stats

import reviewsDatabase from '@/data/reviews_database.json';
import userData from '@/data/user_database2.json';

/** Host normalize → {host}/api/v1 */
function resolveDashboardReviewsApiBase(): string {
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

const API_BASE_URL = resolveDashboardReviewsApiBase();
const USE_MOCK = false; // Canlı BE

interface Review {
  comment_id: number | string;
  ilan_id?: number | string;
  commenter_id: number | string;
  commented_user_id?: number | string;
  rating: number;
  comment_text?: string;
  comment_date?: string;
  comment_time?: string;
  [key: string]: unknown;
}

interface User {
  user_id?: number | string;
  ad_soyad?: string;
  [key: string]: unknown;
}

interface TransformedReview {
  id: number | string;
  ilan_id?: number | string;
  user: string;
  rating: number;
  comment?: string;
  date?: string;
  time?: string;
  response: string | null;
  commentedUserId?: number | string;
  commenterId: number | string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

interface ReviewResponseData {
  reviewId: number | string;
  serviceId: number | string;
  response: string;
  timestamp: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { rating: number; count: number }[];
}

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const unwrapData = <T>(json: unknown): T => {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: T }).data;
  }
  return json as T;
};

/**
 * API gecikme simülasyonu
 */
const simulateApiDelay = (delay = 300): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * API yanıt formatını simüle eden wrapper
 */
const createApiResponse = <T>(data: T, success = true, message = ''): ApiResponse<T> => {
  return {
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Gerçek kullanıcı adını getiren yardımcı
 */
const getRealUserName = (commenterId: number | string): string => {
  const user = (userData as User[]).find(
    (u) => Number(u.user_id) === Number(commenterId)
  );
  return user ? user.ad_soyad || `Kullanıcı ${commenterId}` : `Kullanıcı ${commenterId}`;
};

const mapReview = (
  review: Review,
  getResponse: (id: number | string) => string | null
): TransformedReview => ({
  id: review.comment_id,
  ilan_id: review.ilan_id,
  user: getRealUserName(review.commenter_id),
  rating: review.rating,
  comment: review.comment_text,
  date: review.comment_date,
  time: review.comment_time,
  response: getResponse(review.comment_id),
  commentedUserId: review.commented_user_id,
  commenterId: review.commenter_id,
});

const normalizeLiveReview = (r: Record<string, unknown>): TransformedReview => {
  const reviewer = String(
    r.reviewerName ||
    r.reviewer_name ||
    r.user ||
    r.userName ||
    r.user_name ||
    r.author ||
    r.commenterName ||
    ''
  ).trim();

  let createdAtDate = '';
  let createdAtTime = '';
  if (r.createdAt) {
    const parts = String(r.createdAt).split('T');
    createdAtDate = parts[0] || '';
    createdAtTime = parts[1]?.slice(0, 5) || '';
  }

  return {
    id: (r.id ?? r.comment_id) as number | string,
    ilan_id: (r.listingId ?? r.ilan_id) as number | string | undefined,
    user: reviewer || 'Anonim Kullanıcı',
    rating: typeof r.rating === 'number' ? r.rating : parseInt(String(r.rating || 5), 10) || 5,
    comment: String(r.comment || r.comment_text || ''),
    date: r.date ? String(r.date) : (createdAtDate || (r.comment_date ? String(r.comment_date) : '')),
    time: r.time ? String(r.time) : (createdAtTime || (r.comment_time ? String(r.comment_time) : '')),
    response: r.response != null ? String(r.response) : null,
    commentedUserId: (r.commentedUserId ?? r.commented_user_id) as number | string | undefined,
    commenterId: (r.reviewerId ?? r.commenter_id ?? '') as number | string,
  };
};

/**
 * Dashboard Reviews API Service
 */
export const dashboardReviewsAPI = {
  /**
   * Tüm yorumları getirir (mock dump — production'da inbox kullanılmalı)
   * Hedef: GET /api/v1/reviews/inbox veya GET /api/v1/users/{userId}/reviews
   */
  async getAllReviews(): Promise<TransformedReview[]> {
    console.log('[Dashboard Reviews] Tüm yorumlar getiriliyor...');
    console.log(`[DashboardReviews API] Hedef path: GET ${API_BASE_URL}/reviews/inbox`);

    if (!USE_MOCK) {
      const res = await fetch(`${API_BASE_URL}/reviews/inbox`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`API hatası: ${res.status}`);
      const data = unwrapData<TransformedReview[] | { reviews: TransformedReview[] }>(
        await res.json()
      );
      const list = Array.isArray(data) ? data : data.reviews || [];
      return list.map((item) => normalizeLiveReview(item as unknown as Record<string, unknown>));
    }

    await simulateApiDelay();

    try {
      const transformedReviews: TransformedReview[] = (reviewsDatabase as Review[]).map((review) =>
        mapReview(review, (id) => this.getReviewResponse(id))
      );

      console.log(`[Dashboard Reviews] ${transformedReviews.length} yorum başarıyla getirildi`);
      return transformedReviews;
    } catch (error) {
      console.error('[Dashboard Reviews] Yorumlar getirilirken hata:', error);
      throw new Error('Yorumlar yüklenirken bir hata oluştu');
    }
  },

  /**
   * Belirli bir ilan için yorumları getirir
   * Hedef: GET /api/v1/listings/{listingId}/reviews
   */
  async getIlanReviews(ilanId: number | string): Promise<TransformedReview[]> {
    console.log(`[Dashboard Reviews] İlan ${ilanId} için yorumlar getiriliyor...`);
    console.log(`[DashboardReviews API] Hedef path: GET ${API_BASE_URL}/listings/${ilanId}/reviews`);

    if (!USE_MOCK) {
      const res = await fetch(`${API_BASE_URL}/listings/${ilanId}/reviews`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`API hatası: ${res.status}`);
      const data = unwrapData<TransformedReview[] | { reviews: TransformedReview[] }>(
        await res.json()
      );
      const list = Array.isArray(data) ? data : data.reviews || [];
      return list.map((item) => normalizeLiveReview(item as unknown as Record<string, unknown>));
    }

    await simulateApiDelay();

    try {
      const ilanNum = Number(ilanId);
      const ilanReviews: TransformedReview[] = (reviewsDatabase as Review[])
        .filter((review) => Number(review.ilan_id) === ilanNum)
        .map((review) => mapReview(review, (id) => this.getReviewResponse(id)));

      console.log(`[Dashboard Reviews] İlan ${ilanId} için ${ilanReviews.length} yorum getirildi`);
      return ilanReviews;
    } catch (error) {
      console.error(`[Dashboard Reviews] İlan ${ilanId} yorumları getirilirken hata:`, error);
      throw new Error('İlan yorumları yüklenirken bir hata oluştu');
    }
  },

  /**
   * Belirli bir servise / sağlayıcıya ait yorumları getirir
   * Hedef: GET /api/v1/users/{userId}/reviews
   */
  async getServiceReviews(serviceId: number | string): Promise<TransformedReview[]> {
    console.log(`[Dashboard Reviews] Servis ${serviceId} için yorumlar getiriliyor...`);
    console.log(`[DashboardReviews API] Hedef path: GET ${API_BASE_URL}/users/${serviceId}/reviews`);

    if (!USE_MOCK) {
      const res = await fetch(`${API_BASE_URL}/users/${serviceId}/reviews`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`API hatası: ${res.status}`);
      const data = unwrapData<TransformedReview[] | { reviews: TransformedReview[] }>(
        await res.json()
      );
      const list = Array.isArray(data) ? data : data.reviews || [];
      return list.map((item) => normalizeLiveReview(item as unknown as Record<string, unknown>));
    }

    await simulateApiDelay();

    try {
      const serviceReviews: TransformedReview[] = (reviewsDatabase as Review[])
        .filter((review) => review.commented_user_id === serviceId)
        .map((review) => mapReview(review, (id) => this.getReviewResponse(id)));

      console.log(
        `[Dashboard Reviews] Servis ${serviceId} için ${serviceReviews.length} yorum getirildi`
      );
      return serviceReviews;
    } catch (error) {
      console.error(`[Dashboard Reviews] Servis ${serviceId} yorumları getirilirken hata:`, error);
      throw new Error('Servis yorumları yüklenirken bir hata oluştu');
    }
  },

  /**
   * Yoruma yanıt ekler
   * Hedef: POST /api/v1/reviews/{reviewId}/response
   */
  async respondToReview(
    serviceId: number | string,
    reviewId: number | string,
    response: string
  ): Promise<ApiResponse<ReviewResponseData>> {
    console.log(`[Dashboard Reviews] Yorum ${reviewId} için yanıt ekleniyor...`);
    console.log(
      `[DashboardReviews API] Hedef path: POST ${API_BASE_URL}/reviews/${reviewId}/response`
    );

    if (!USE_MOCK) {
      const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/response`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ response }),
      });
      if (!res.ok) throw new Error(`API hatası: ${res.status}`);
      const json = await res.json();
      const data = unwrapData<ReviewResponseData>(json);
      return createApiResponse(data, true, (json as { message?: string }).message || 'Yanıt eklendi');
    }

    await simulateApiDelay(500);

    try {
      if (typeof window === 'undefined') {
        throw new Error('localStorage yalnızca tarayıcıda kullanılabilir');
      }
      const storageKey = `review_response_${reviewId}`;
      const responseData: ReviewResponseData = {
        reviewId,
        serviceId,
        response,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(responseData));

      console.log(`[Dashboard Reviews] Yorum ${reviewId} için yanıt başarıyla eklendi`);
      return createApiResponse(responseData, true, 'Yanıt başarıyla eklendi');
    } catch (error) {
      console.error(`[Dashboard Reviews] Yorum ${reviewId} yanıtı eklenirken hata:`, error);
      throw new Error('Yanıt eklenirken bir hata oluştu');
    }
  },

  /**
   * Yorum yanıtını siler
   * Hedef: DELETE /api/v1/reviews/{reviewId}/response
   */
  async deleteReviewResponse(
    serviceId: number | string,
    reviewId: number | string
  ): Promise<ApiResponse<null>> {
    console.log(`[Dashboard Reviews] Yorum ${reviewId} yanıtı siliniyor...`);
    console.log(
      `[DashboardReviews API] Hedef path: DELETE ${API_BASE_URL}/reviews/${reviewId}/response`
    );
    void serviceId;

    if (!USE_MOCK) {
      const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/response`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`API hatası: ${res.status}`);
      return createApiResponse(null, true, 'Yanıt başarıyla silindi');
    }

    await simulateApiDelay();

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`review_response_${reviewId}`);
      }

      console.log(`[Dashboard Reviews] Yorum ${reviewId} yanıtı başarıyla silindi`);
      return createApiResponse(null, true, 'Yanıt başarıyla silindi');
    } catch (error) {
      console.error(`[Dashboard Reviews] Yorum ${reviewId} yanıtı silinirken hata:`, error);
      throw new Error('Yanıt silinirken bir hata oluştu');
    }
  },

  /**
   * Yorum yanıtını getirir (mock: localStorage; API'de liste embed tercih)
   */
  getReviewResponse(reviewId: number | string): string | null {
    try {
      if (typeof window === 'undefined') return null;
      const storageKey = `review_response_${reviewId}`;
      const responseData = localStorage.getItem(storageKey);

      if (responseData) {
        const parsed: ReviewResponseData = JSON.parse(responseData);
        return parsed.response;
      }

      return null;
    } catch (error) {
      console.error(`[Dashboard Reviews] Yorum ${reviewId} yanıtı getirilirken hata:`, error);
      return null;
    }
  },

  /**
   * Yorum istatistiklerini getirir
   * Hedef: GET /api/v1/users/{userId}/reviews/stats
   */
  async getReviewStats(serviceId: number | string | null = null): Promise<ApiResponse<ReviewStats>> {
    console.log(`[Dashboard Reviews] Yorum istatistikleri getiriliyor...`);
    if (serviceId != null) {
      console.log(
        `[DashboardReviews API] Hedef path: GET ${API_BASE_URL}/users/${serviceId}/reviews/stats`
      );
    } else {
      console.log(`[DashboardReviews API] Hedef path: GET ${API_BASE_URL}/reviews/stats`);
    }

    if (!USE_MOCK) {
      const url =
        serviceId != null
          ? `${API_BASE_URL}/users/${serviceId}/reviews/stats`
          : `${API_BASE_URL}/reviews/stats`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`API hatası: ${res.status}`);
      const data = unwrapData<ReviewStats>(await res.json());
      return createApiResponse(data);
    }

    await simulateApiDelay();

    try {
      let targetReviews = reviewsDatabase as Review[];

      if (serviceId) {
        targetReviews = targetReviews.filter((review) => review.commented_user_id === serviceId);
      }

      const totalReviews = targetReviews.length;
      const averageRating =
        totalReviews > 0
          ? targetReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
          : 0;

      const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: targetReviews.filter((review) => review.rating === rating).length,
      }));

      const stats: ReviewStats = {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
      };

      console.log(`[Dashboard Reviews] İstatistikler başarıyla getirildi:`, stats);
      return createApiResponse(stats);
    } catch (error) {
      console.error('[Dashboard Reviews] İstatistikler getirilirken hata:', error);
      throw new Error('İstatistikler yüklenirken bir hata oluştu');
    }
  },
};

export default dashboardReviewsAPI;
