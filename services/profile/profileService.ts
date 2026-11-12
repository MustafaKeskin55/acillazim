/**
 * profileService.ts - Profil verilerini API'den çekmek için mock servis
 * Kullanıcı profil bilgileri, istatistikler, doğrulama durumları
 *
 * Path alias yok: /api/users (v1’siz) kullanılmaz
 *   → GET /api/v1/users/{userId}
 *   → GET /api/v1/users/{userId}/stats
 */

import { toast } from 'react-toastify';
import usersData from '@/data/user_database2.json';
import { defaultCardData } from '@/data/cardData';
import reviewsData from '@/data/reviews_database.json';

/** Host normalize → {host}/api/v1 */
function resolveProfileApiBase(): string {
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

const API_BASE_URL = resolveProfileApiBase();
const USE_MOCK = false; // Canlı BE

function authHeaders(token: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (typeof window !== 'undefined') {
    const t = localStorage.getItem('auth_token');
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  return headers;
}

function unwrapData<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

// ---- TİP TANIMLARI ----
interface UserRecord {
  user_id: number;
  ad_soyad: string;
  profil_fotografi?: string;
  kapak_fotografi?: string;
  telefon?: string;
  email?: string;
  dogrulanmis_hesap?: boolean;
  email_dogrulandi?: boolean;
  telefon_dogrulandi?: boolean;
  il?: string;
  ilce?: string;
  bio?: string;
  rol?: string;
  service_areas?: unknown[];
  [key: string]: unknown;
}

interface ReviewRecord {
  commented_user_id: number | string;
  rating: number;
  [key: string]: unknown;
}

interface ListingRecord {
  user_id?: number;
  userId?: number;
  status?: string;
  views?: number;
  [key: string]: unknown;
}

interface UserStats {
  listingCounts: { active: number; sold: number; total: number };
  responseTime: string;
  totalViews: number;
  trustScore: number;
  completedTransactions: number;
  memberSince: string;
  totalReviews: number;
}

interface ProfileResult {
  success: boolean;
  message: string;
  data: { profile: UserRecord; stats: UserStats } | null;
}

// ---- YARDIMCI FONKSİYONLAR ----

const validateToken = (token: string | null): boolean => {
  return !!token && token.length > 20 && token.includes('.');
};

const maskPhoneNumber = (phone: string, _isSecure = false): string => {
  return phone || '';
};

const maskEmail = (email: string): string => {
  return email || '';
};

const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;

  try {
    const urlObj = new URL(url);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const lowerUrl = url.toLowerCase();

    const directImageHosts = [
      'picsum.photos', 'randomuser.me', 'imgur.com', 'i.imgur.com',
      'images.unsplash.com', 'cloudinary.com', 'res.cloudinary.com', 'pexels.com'
    ];

    if (directImageHosts.some(host => urlObj.hostname.includes(host))) return true;
    if (validExtensions.some(ext => lowerUrl.endsWith(ext))) return true;
    if (lowerUrl.includes('/image/') || lowerUrl.includes('/images/') || lowerUrl.includes('/img/') || lowerUrl.includes('/photos/')) return true;
    if (urlObj.hostname.includes('canva.com') || urlObj.hostname.includes('figma.com') || url.includes('design?create')) return false;

    console.warn("[ProfileService] Şüpheli kapak fotoğrafı URL'si:", url);
    return false;
  } catch {
    return false;
  }
};

// ---- SERVİS FONKSİYONLARI ----

const fetchUserStats = async (userId: string | number): Promise<UserStats> => {
  try {
    console.log(`[Profile API] Hedef path: GET ${API_BASE_URL}/users/${userId}/stats`);

    if (!USE_MOCK) {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/stats`, {
        headers: authHeaders(null),
      });
      if (!response.ok) throw new Error(`Stats API ${response.status}`);
      const data = unwrapData<UserStats | Record<string, unknown>>(await response.json());
      const s = data as Record<string, unknown>;
      return {
        listingCounts: (s.listingCounts as UserStats['listingCounts']) || {
          active: Number(s.active ?? 0),
          sold: Number(s.sold ?? 0),
          total: Number(s.total ?? 0),
        },
        responseTime: String(s.responseTime ?? s.response_time ?? ''),
        totalViews: Number(s.totalViews ?? s.total_views ?? 0),
        trustScore: Number(s.trustScore ?? s.trust_score ?? 0),
        completedTransactions: Number(s.completedTransactions ?? s.completed_transactions ?? 0),
        memberSince: String(s.memberSince ?? s.member_since ?? s.uyelik_tarihi ?? ''),
        totalReviews: Number(s.totalReviews ?? s.total_reviews ?? 0),
      };
    }

    const userIdNum = parseInt(String(userId));

    const userListings = (defaultCardData as ListingRecord[]).filter(
      listing => listing.user_id === userIdNum || listing.userId === userIdNum
    );

    const activeListings = userListings.filter(l => l.status === 'active');
    const soldListings = userListings.filter(l => l.status === 'sold');

    const userReviews = (reviewsData as ReviewRecord[]).filter(review => {
      const rid = typeof review.commented_user_id === 'string'
        ? parseInt(review.commented_user_id, 10)
        : review.commented_user_id;
      return rid === userIdNum;
    });

    const totalViews = userListings.reduce(
      (sum, listing) => sum + (listing.views || Math.floor(Math.random() * 1000)),
      0
    );

    const randomResponseHours = Math.floor(Math.random() * 48);
    const responseTime =
      randomResponseHours <= 2
        ? `Genellikle ${randomResponseHours} saat içinde yanıt verir`
        : randomResponseHours <= 24
          ? 'Genellikle aynı gün içinde yanıt verir'
          : 'Genellikle 1-2 gün içinde yanıt verir';

    const trustScore =
      userReviews.length > 0
        ? parseFloat(
            (
              userReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
              userReviews.length
            ).toFixed(1)
          )
        : 0;

    return {
      listingCounts: { active: activeListings.length, sold: soldListings.length, total: userListings.length },
      responseTime,
      totalViews,
      trustScore,
      completedTransactions: soldListings.length,
      memberSince: '2022',
      totalReviews: userReviews.length
    };
  } catch (error) {
    console.error('[ProfileService] İstatistik hatası:', error);
    return {
      listingCounts: { active: 0, sold: 0, total: 0 },
      responseTime: 'Bilinmiyor',
      totalViews: 0,
      trustScore: 0,
      completedTransactions: 0,
      memberSince: 'Bilinmiyor',
      totalReviews: 0
    };
  }
};

const fetchUserProfile = async (
  userId: string | number,
  token: string | null = null
): Promise<ProfileResult> => {
  const isSecureRequest = validateToken(token);
  console.log(`[Profile API] Hedef path: GET ${API_BASE_URL}/users/${userId}`);
  void isSecureRequest;

  try {
    if (!userId || isNaN(parseInt(String(userId)))) {
      console.error('[ProfileService] Geçersiz kullanıcı ID:', userId);
      throw new Error('Geçersiz kullanıcı kimliği');
    }

    if (!USE_MOCK) {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: authHeaders(token),
      });
      if (!response.ok) throw new Error(`Profil API ${response.status}`);
      const profileData = unwrapData<UserRecord>(await response.json());
      const stats = await fetchUserStats(userId);
      return {
        success: true,
        message: 'Profil bilgileri başarıyla getirildi',
        data: { profile: profileData, stats },
      };
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    const userIdNum = parseInt(String(userId));
    const user = (usersData as UserRecord[]).find(u => u.user_id === userIdNum);

    if (!user) {
      console.error('[ProfileService] Kullanıcı bulunamadı:', userId);
      throw new Error('Kullanıcı bulunamadı');
    }

    let kapakFotografi: string | null = null;
    if (user.kapak_fotografi && isValidImageUrl(user.kapak_fotografi)) {
      kapakFotografi = user.kapak_fotografi;
    }

    const profileData: UserRecord = {
      ...user,
      telefon: user.telefon,
      email: user.email,
      kapak_fotografi: kapakFotografi as string | undefined
    };

    const stats = await fetchUserStats(userId);

    return {
      success: true,
      message: 'Profil bilgileri başarıyla getirildi',
      data: { profile: profileData, stats }
    };
  } catch (error) {
    console.error('[ProfileService] Hata:', error);
    toast.error((error as Error).message || 'Profil bilgileri yüklenirken bir hata oluştu');

    return {
      success: false,
      message: (error as Error).message || 'Profil bilgileri yüklenirken bir hata oluştu',
      data: null
    };
  }
};

const profileService = {
  fetchUserProfile,
  fetchUserStats
};

export default profileService;
