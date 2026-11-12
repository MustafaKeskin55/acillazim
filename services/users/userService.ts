/**
 * Kullanıcı servisi — özet / konum / üyelik tarihi
 *
 * Path alias yok: /kullanicilar/{id}, /api/users (v1’siz) kullanılmaz
 *   → GET /api/v1/users/me
 *   → GET /api/v1/users/{userId}
 *
 * Tam profil → profileService; maskeleme → services/userService.ts (API yok)
 *
 * Not: Mevcut FE caller’lar sync; USE_MOCK=true iken JSON. Canlıda *Async kullanın.
 */

import userData from '@/data/userData.json';
import userDatabase from '@/data/user_database2.json';

interface UserAddress {
  city?: string;
  district?: string;
  [key: string]: unknown;
}

interface User {
  user_id?: number | string;
  id?: number | string;
  uyelik_tarihi?: string;
  member_since?: string;
  ad_soyad?: string;
  address?: UserAddress;
  il?: string;
  ilce?: string;
  [key: string]: unknown;
}

interface UserLocation {
  city?: string;
  district?: string;
}

/** Host normalize → {host}/api/v1 */
function resolveUsersApiBase(): string {
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

const API_BASE_URL = resolveUsersApiBase();
const USE_MOCK = false; // Canlı BE — caller’ları *Async kullanın

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function unwrapData<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

function normalizeUser(raw: Record<string, unknown> | null | undefined): User | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    ...raw,
    user_id: (raw.user_id ?? raw.id) as number | string | undefined,
    // Backend (SellerSummaryDTO) camelCase "memberSince" döndürüyor; snake_case/legacy alan adlarıyla birlikte destekleniyor.
    member_since: (raw.member_since ?? raw.uyelik_tarihi ?? raw.memberSince) as string | undefined,
    uyelik_tarihi: (raw.uyelik_tarihi ?? raw.member_since ?? raw.memberSince) as string | undefined,
  } as User;
}

function findUserInMock(userId: number | string): User | null {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('user_data') || localStorage.getItem('user_profile');
      if (stored) {
        const u = JSON.parse(stored);
        if (String(u.id ?? u.userId ?? u.user_id) === String(userId)) {
          return u as User;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Giriş yapmış kullanıcı (sync) — DB / localStorage esaslı
 * Hedef: GET /api/v1/users/me
 */
const getCurrentUser = (): unknown => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('user_data') || localStorage.getItem('user_profile');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[Users] localStorage parse error:', e);
    }
  }
  return null;
};

/** Canlı: GET /api/v1/users/me */
const getCurrentUserAsync = async (): Promise<unknown> => {
  console.log(`[Users API] Hedef path: GET ${API_BASE_URL}/users/me`);
  try {
    let response = await fetch(`${API_BASE_URL}/users/me`, { headers: authHeaders() });
    if (!response.ok && response.status === 404) {
      response = await fetch(`${API_BASE_URL}/user/me`, { headers: authHeaders() });
    }
    if (response.ok) {
      const data = unwrapData(await response.json());
      if (typeof window !== 'undefined' && data) {
        localStorage.setItem('user_data', JSON.stringify(data));
      }
      return data;
    }
  } catch (err) {
    console.warn('[Users API] getCurrentUserAsync fallback to local user:', err);
  }
  return getCurrentUser();
};

const getUserLocation = (): UserLocation | null => {
  const user = getCurrentUser() as User;
  if (user?.address) {
    return {
      city: user.address.city ?? user.il,
      district: user.address.district ?? user.ilce,
    };
  }
  if (user?.il) return { city: user.il, district: user.ilce };
  return null;
};

const getUserCity = (): string | null | undefined => {
  const location = getUserLocation();
  return location ? location.city : null;
};

/**
 * Kullanıcı ID ile getir (sync mock)
 * Hedef: GET /api/v1/users/{userId}
 */
const getUserById = (userId: number | string): User | null => {
  console.log(`[Users API] Hedef path: GET ${API_BASE_URL}/users/${userId} (mock=${USE_MOCK})`);
  return normalizeUser(findUserInMock(userId) as Record<string, unknown> | null);
};

/** Canlı: GET /api/v1/users/{userId} */
const getUserByIdAsync = async (userId: number | string): Promise<User | null> => {
  console.log(`[Users API] Hedef path: GET ${API_BASE_URL}/users/${userId}`);
  if (USE_MOCK) return getUserById(userId);
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, { headers: authHeaders() });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Kullanıcı bulunamadı: ${response.status}`);
  }
  return normalizeUser(unwrapData(await response.json()) as Record<string, unknown>);
};

const getUserMemberSince = (userId: number | string): string | null | undefined => {
  const user = getUserById(userId);
  return user ? user.member_since ?? user.uyelik_tarihi : null;
};

const getUserMemberSinceAsync = async (
  userId: number | string
): Promise<string | null | undefined> => {
  const user = await getUserByIdAsync(userId);
  return user ? user.member_since ?? user.uyelik_tarihi : null;
};

export default {
  getCurrentUser,
  getCurrentUserAsync,
  getUserLocation,
  getUserCity,
  getUserById,
  getUserByIdAsync,
  getUserMemberSince,
  getUserMemberSinceAsync,
};
