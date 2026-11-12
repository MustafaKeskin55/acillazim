/**
 * Dashboard "Sifre ve Guvenlik" - dogrulama secenekleri ve guvenlik sorulari
 * icin gercek backend API'si.
 *
 *   GET/PATCH /api/v1/mobile/users/verification-settings
 *   GET/PUT   /api/v1/mobile/users/security-questions
 *
 * Not: "/mobile/" oneki sadece isimlendirme kuralidir; endpoint'ler ayni
 * Bearer JWT ile web dashboard'dan da guvenle cagrilabilir.
 */

function resolveApiBase(): string {
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

const API_BASE_URL = resolveApiBase();

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
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

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });
  if (!res.ok) {
    let message = `API hatasi: ${res.status}`;
    try {
      const errJson = await res.json();
      message = errJson?.message || errJson?.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return unwrapData<T>(await res.json());
}

export interface VerificationSettings {
  emailVerification: boolean;
  securityQuestionVerification: boolean;
}

export interface SecurityQuestions {
  securityQuestion1: string | null;
  hasAnswer1: boolean;
  securityQuestion2: string | null;
  hasAnswer2: boolean;
}

export interface SaveSecurityQuestionsPayload {
  securityQuestion1?: string;
  securityAnswer1?: string;
  securityQuestion2?: string;
  securityAnswer2?: string;
}

export const userSecurityApi = {
  async getVerificationSettings(): Promise<VerificationSettings> {
    const data = await request<Partial<VerificationSettings>>(
      `${API_BASE_URL}/mobile/users/verification-settings`
    );
    return {
      emailVerification: Boolean(data?.emailVerification),
      securityQuestionVerification: Boolean(data?.securityQuestionVerification),
    };
  },

  async updateVerificationSettings(
    partial: Partial<VerificationSettings>
  ): Promise<VerificationSettings> {
    const data = await request<Partial<VerificationSettings>>(
      `${API_BASE_URL}/mobile/users/verification-settings`,
      { method: 'PATCH', body: JSON.stringify(partial) }
    );
    return {
      emailVerification: Boolean(data?.emailVerification),
      securityQuestionVerification: Boolean(data?.securityQuestionVerification),
    };
  },

  async getSecurityQuestions(): Promise<SecurityQuestions> {
    const data = await request<Partial<SecurityQuestions>>(
      `${API_BASE_URL}/mobile/users/security-questions`
    );
    return {
      securityQuestion1: data?.securityQuestion1 ?? null,
      hasAnswer1: Boolean(data?.hasAnswer1),
      securityQuestion2: data?.securityQuestion2 ?? null,
      hasAnswer2: Boolean(data?.hasAnswer2),
    };
  },

  async saveSecurityQuestions(
    payload: SaveSecurityQuestionsPayload
  ): Promise<SecurityQuestions> {
    const data = await request<Partial<SecurityQuestions>>(
      `${API_BASE_URL}/mobile/users/security-questions`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
    return {
      securityQuestion1: data?.securityQuestion1 ?? null,
      hasAnswer1: Boolean(data?.hasAnswer1),
      securityQuestion2: data?.securityQuestion2 ?? null,
      hasAnswer2: Boolean(data?.hasAnswer2),
    };
  },
};

export default userSecurityApi;
