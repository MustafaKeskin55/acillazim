/**
 * userProfileService.ts - Kullanıcı profil servisi
 * UserInfo bileşeni için gerekli verileri yönetir
 *
 * Hedef path'ler (profileService üzerinden):
 *   GET  /api/v1/users/{userId}
 *   POST /api/v1/users/{userId}/phone-visibility
 *   GET  /api/v1/users/{userId}/verification
 */

import { toast } from 'react-toastify';
import profileService from './profileService';

/** Host normalize → {host}/api/v1 */
function resolveUserProfileApiBase(): string {
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

const API_BASE_URL = resolveUserProfileApiBase();

// ---- TİP TANIMLARI ----
interface ApiResult<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

interface UserInfoData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  isVerified: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  memberSince: string;
  imageUrl: string | null;
  coverImageUrl: string | null;
  bio: string | null;
  service_areas: unknown[];
}

interface ProfileHeaderData {
  profile: {
    id: number;
    ad_soyad: string;
    profil_fotografi?: string;
    kapak_fotografi?: string;
    il?: string;
    ilce?: string;
    uyelik_tarihi: string;
    dogrulanmis_hesap: boolean;
    rol: string;
  };
  stats: {
    responseTime: string;
    trustScore: number;
    totalReviews: number;
  };
}

interface VerificationData {
  account: boolean;
  email: boolean;
  phone: boolean;
  tips: {
    account: string | null;
    email: string | null;
    phone: string | null;
  };
}

// ---- YARDIMCI ----
const fakeFetch = <T>(data: T, delay = 800, shouldFail = false): Promise<T> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) reject(new Error('API çağrısı başarısız oldu'));
      else resolve(data);
    }, delay);
  });
};

// ---- SERVİS FONKSİYONLARI ----

const getUserInfoData = async (userId: string | number): Promise<ApiResult<UserInfoData | null>> => {
  try {
    const profileResponse = await profileService.fetchUserProfile(userId);
    if (!profileResponse.success || !profileResponse.data) throw new Error(profileResponse.message);

    const p = profileResponse.data.profile;

    const data: UserInfoData = {
      fullName: p.ad_soyad,
      email: p.email || '',
      phone: p.telefon || '',
      location: `${p.il}, ${p.ilce}`,
      isVerified: p.dogrulanmis_hesap || false,
      isEmailVerified: p.email_dogrulandi || false,
      isPhoneVerified: p.telefon_dogrulandi || false,
      memberSince: profileResponse.data.stats.memberSince,
      imageUrl: p.profil_fotografi || null,
      coverImageUrl: (p.kapak_fotografi as string) || null,
      bio: p.bio || null,
      service_areas: p.service_areas || []
    };

    return await fakeFetch({
      success: true,
      message: 'Kullanıcı bilgileri başarıyla getirildi',
      data
    });
  } catch (error) {
    console.error('[UserProfileService] Hata:', error);
    toast.error((error as Error).message || 'Kullanıcı bilgileri yüklenirken bir hata oluştu');
    return { success: false, message: (error as Error).message, data: null };
  }
};

const getProfileHeaderData = async (userId: string | number): Promise<ApiResult<ProfileHeaderData | null>> => {
  try {
    const profileResponse = await profileService.fetchUserProfile(userId);
    if (!profileResponse.success || !profileResponse.data) throw new Error(profileResponse.message);

    const p = profileResponse.data.profile;
    const s = profileResponse.data.stats;

    const data: ProfileHeaderData = {
      profile: {
        id: p.user_id,
        ad_soyad: p.ad_soyad,
        profil_fotografi: p.profil_fotografi,
        kapak_fotografi: p.kapak_fotografi,
        il: p.il,
        ilce: p.ilce,
        uyelik_tarihi: s.memberSince,
        dogrulanmis_hesap: p.dogrulanmis_hesap || false,
        rol: p.rol || 'normal'
      },
      stats: {
        responseTime: s.responseTime,
        trustScore: s.trustScore,
        totalReviews: s.totalReviews
      }
    };

    return await fakeFetch({ success: true, message: 'Profil başlık bilgileri başarıyla getirildi', data });
  } catch (error) {
    console.error('[UserProfileService] Hata:', error);
    toast.error((error as Error).message || 'Profil başlık bilgileri yüklenirken bir hata oluştu');
    return { success: false, message: (error as Error).message, data: null };
  }
};

const requestPhoneVisibility = async (userId: string | number): Promise<ApiResult<{ isVisible: boolean } | null>> => {
  try {
    const url = `${API_BASE_URL}/users/${userId}/phone-visibility`;
    console.log(`[UserProfile API] POST ${url}`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: 'POST', headers });
    if (!response.ok) throw new Error(`Telefon görüntüleme izni alınamadı (HTTP ${response.status})`);

    const json = await response.json();
    const data = (json && typeof json === 'object' && 'data' in json ? json.data : json) as { isVisible?: boolean } | null;

    return {
      success: true,
      message: 'Telefon numarası görüntüleme izni alındı',
      data: { isVisible: data?.isVisible ?? true }
    };
  } catch (error) {
    console.error('[UserProfileService] Telefon görüntüleme izni alınamadı:', error);
    return {
      success: false,
      message: 'Telefon numarası görüntüleme izni alınamadı. Lütfen daha sonra tekrar deneyin.',
      data: null
    };
  }
};

const checkVerificationStatus = async (userId: string | number): Promise<ApiResult<VerificationData | null>> => {
  try {
    console.log(`[UserProfile API] Hedef path: GET /api/v1/users/${userId}/verification`);
    const profileResponse = await profileService.fetchUserProfile(userId);
    if (!profileResponse.success || !profileResponse.data) throw new Error(profileResponse.message);

    const p = profileResponse.data.profile;

    const data: VerificationData = {
      account: p.dogrulanmis_hesap || false,
      email: p.email_dogrulandi || false,
      phone: p.telefon_dogrulandi || false,
      tips: {
        account: p.dogrulanmis_hesap ? null : 'Hesabınızı doğrulamak için kimlik bilgilerinizi gönderebilirsiniz.',
        email: p.email_dogrulandi ? null : 'E-posta adresinize gönderilen doğrulama bağlantısına tıklayarak doğrulayabilirsiniz.',
        phone: p.telefon_dogrulandi ? null : 'Telefonunuza gönderilen kodu girerek doğrulayabilirsiniz.'
      }
    };

    return await fakeFetch({ success: true, message: 'Doğrulama durumları başarıyla getirildi', data });
  } catch (error) {
    return { success: false, message: (error as Error).message, data: null };
  }
};

const userProfileService = {
  getUserInfoData,
  getProfileHeaderData,
  requestPhoneVisibility,
  checkVerificationStatus
};

export default userProfileService;
