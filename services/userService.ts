/**
 * User Service (kök) — gizlilik maskeleme + stub özet
 *
 * Maskeleme: API yok (/api/user, /api/mask kullanılmaz).
 * getUserBasicInfo hedefi:
 *   → GET /api/v1/users/{userId}
 *
 * Tercih edilen kullanıcı HTTP: services/users/userService.ts
 * Profildeki mask* kopyaları buraya birleştirilebilir.
 */

interface UserBasicInfo {
  id: number | string;
  displayName: string;
  isVerified: boolean;
}

/** Dokümantasyon / async fetch — mask fonksiyonları HTTP kullanmaz */
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
const USE_MOCK = false; // Canlı BE

/**
 * Kullanıcı adını maskeler (güvenlik/gizlilik için)
 */
export const maskUserName = (fullName: string): string => {
  if (!fullName || typeof fullName !== 'string') return 'Anonim Kullanıcı';

  const nameParts = fullName.trim().split(' ');
  const maskedParts = nameParts.map((part) => {
    if (part.length <= 1) return part;
    return part[0] + '*'.repeat(part.length - 1);
  });

  return maskedParts.join(' ');
};

/**
 * Sync stub — mevcut caller uyumu
 * Hedef (canlı): GET /api/v1/users/{userId} → getUserBasicInfoAsync
 */
export const getUserBasicInfo = (userId: number | string): UserBasicInfo => {
  console.log(
    `[userService] Hedef path: GET ${API_BASE_URL}/users/${userId} (sync mock=${USE_MOCK})`
  );
  return {
    id: userId,
    displayName: `Kullanıcı ${userId}`,
    isVerified: false,
  };
};

/**
 * Canlı: GET /api/v1/users/{userId}
 */
export const getUserBasicInfoAsync = async (
  userId: number | string
): Promise<UserBasicInfo> => {
  console.log(`[userService] Hedef path: GET ${API_BASE_URL}/users/${userId}`);

  if (USE_MOCK) {
    return getUserBasicInfo(userId);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/users/${userId}`, { headers });
  if (!response.ok) throw new Error(`Kullanıcı özeti alınamadı: ${response.status}`);
  const json = await response.json();
  const raw =
    json && typeof json === 'object' && 'data' in json
      ? (json as { data: Record<string, unknown> }).data
      : (json as Record<string, unknown>);

  return {
    id: (raw.user_id ?? raw.id ?? userId) as number | string,
    displayName: String(
      raw.display_name ?? raw.displayName ?? raw.ad_soyad ?? raw.name ?? `Kullanıcı ${userId}`
    ),
    isVerified: Boolean(raw.is_verified ?? raw.isVerified ?? false),
  };
};

/**
 * Telefon numarasını maskeler — API yok
 */
export const maskPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber || typeof phoneNumber !== 'string') return '';

  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    const last2 = cleaned.slice(-2);
    const first3 = cleaned.slice(0, 3);
    return `${first3} *** ** ${last2}`;
  }

  return '*** *** ****';
};

/**
 * Email adresini maskeler — API yok
 */
export const maskEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';

  const [username, domain] = email.split('@');
  if (!username || !domain) return '***@***.com';

  const maskedUsername =
    username.length > 2
      ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
      : username[0] + '*';

  return `${maskedUsername}@${domain}`;
};

export default {
  maskUserName,
  getUserBasicInfo,
  getUserBasicInfoAsync,
  maskPhoneNumber,
  maskEmail,
};
