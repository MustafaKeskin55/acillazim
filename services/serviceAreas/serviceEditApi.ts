/**
 * Dashboard "Hizmet Alanlarım" (ServiceEdit) — ilan bazlı düzenleme sekmeleri için
 * gerçek backend API'si.
 *
 * Path alias yok:
 *   GET/PUT  /api/v1/listings/{listingId}/packages
 *   GET/PUT  /api/v1/listings/{listingId}/working-hours
 *   GET/PUT  /api/v1/listings/{listingId}/faq
 *   GET/PUT  /api/v1/listings/{listingId}/features
 *   GET/PUT  /api/v1/users/me/certificates
 */

/** Host normalize → {host}/api/v1 */
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
    let message = `API hatası: ${res.status}`;
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

export interface PricingPackage {
  id?: number | string;
  title: string;
  package_title?: string;
  description?: string;
  price?: number | string;
  currency?: string;
  price_type?: 'per_package' | 'one_time' | 'per_month' | 'per_hour' | 'per_day' | string;
  deliveryDays?: number | null;
  delivery_days?: number | string | null;
  discount_percentage?: number | string;
  features?: string[];
  popular?: boolean;
  is_popular?: boolean;
}

export interface WorkingHoursDay {
  start: string;
  end: string;
  isActive: boolean;
}
export type WorkingHoursMap = Record<string, WorkingHoursDay>;

export interface FaqItem {
  id?: number | string;
  question: string;
  answer: string;
}

export interface FeatureItem {
  id?: number | string;
  icon?: unknown;
  title: string;
  description?: string;
}

export interface CertificateItem {
  id?: number | string;
  title: string;
  name?: string;
  date?: string;
  imageUrl?: string;
  isVerified?: boolean;
}

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function toHHmm(value?: string | null): string {
  if (!value) return '00:00';
  return String(value).slice(0, 5);
}

/** Backend { dayOfWeek, startTime, endTime, isActive }[] → FE { monday: {start,end,isActive}, ... } */
function fromBackendWorkingHours(days: unknown): WorkingHoursMap | null {
  if (!days) return null;
  const list: Array<Record<string, unknown>> = Array.isArray(days)
    ? days
    : (typeof days === 'object' && days !== null
      ? (((days as Record<string, unknown>).days ||
         (days as Record<string, unknown>).working_hours ||
         (days as Record<string, unknown>).workingHours ||
         []) as Array<Record<string, unknown>>)
      : []);

  if (!Array.isArray(list) || list.length === 0) return null;
  const result: WorkingHoursMap = {};
  list.forEach((d) => {
    if (!d || typeof d !== 'object') return;
    const day = String(d.dayOfWeek || d.day_of_week || d.day || '').toLowerCase();
    if (!day) return;
    const rawStart = (d.startTime ?? d.start_time ?? d.start ?? '09:00') as string;
    const rawEnd = (d.endTime ?? d.end_time ?? d.end ?? '18:00') as string;
    const rawActive = d.isActive !== undefined ? d.isActive : (d.is_active !== undefined ? d.is_active : true);
    result[day] = {
      start: toHHmm(rawStart),
      end: toHHmm(rawEnd),
      isActive: rawActive !== false,
    };
  });
  return Object.keys(result).length > 0 ? result : null;
}

/** FE { monday: {start,end,isActive}, ... } → backend { dayOfWeek, startTime, endTime, isActive }[] */
function toBackendWorkingHours(hours: WorkingHoursMap): Array<Record<string, unknown>> {
  if (!hours) return [];
  return DAY_KEYS.filter((day) => hours[day]).map((day) => {
    const dayData = hours[day];
    const isAct = dayData.isActive !== false;
    const startStr = toHHmm(dayData.start);
    const endStr = toHHmm(dayData.end);
    return {
      dayOfWeek: day,
      day_of_week: day,
      day: day,
      startTime: startStr,
      start_time: startStr,
      start: startStr,
      endTime: endStr,
      end_time: endStr,
      end: endStr,
      isActive: isAct,
      is_active: isAct,
    };
  });
}

export const listingEditAPI = {
  /** GET /api/v1/listings/{listingId}/packages */
  async getPackages(listingId: string | number): Promise<PricingPackage[]> {
    const data = await request<unknown>(`${API_BASE_URL}/listings/${listingId}/packages`);
    if (Array.isArray(data)) return data as PricingPackage[];
    if (data && typeof data === 'object') {
      const p = (data as Record<string, unknown>).packages;
      if (Array.isArray(p)) return p as PricingPackage[];
    }
    return [];
  },

  /** PUT /api/v1/listings/{listingId}/packages */
  async savePackages(listingId: string | number, packages: PricingPackage[]): Promise<PricingPackage[]> {
    const payload = (packages || []).map((p) => ({
        title: p.title || p.package_title || '',
        package_title: p.title || p.package_title || '',
        description: p.description || '',
        price: Number(p.price) || 0,
        currency: p.currency || 'TRY',
        price_type: p.price_type || 'per_package',
        deliveryDays: (p.deliveryDays != null && p.deliveryDays !== '') ? Number(p.deliveryDays) : ((p.delivery_days != null && p.delivery_days !== '') ? Number(p.delivery_days) : null),
        delivery_days: (p.deliveryDays != null && p.deliveryDays !== '') ? Number(p.deliveryDays) : ((p.delivery_days != null && p.delivery_days !== '') ? Number(p.delivery_days) : null),
        discount_percentage: Number(p.discount_percentage) || 0,
        popular: !!(p.popular ?? p.is_popular),
        is_popular: !!(p.popular ?? p.is_popular),
        features: Array.isArray(p.features) ? p.features : [],
      }));
    const data = await request<unknown>(`${API_BASE_URL}/listings/${listingId}/packages`, {
      method: 'PUT',
      body: JSON.stringify({ packages: payload, items: payload }),
    });
    if (Array.isArray(data)) return data as PricingPackage[];
    return [];
  },

  /** GET /api/v1/listings/{listingId}/working-hours */
  async getWorkingHours(listingId: string | number): Promise<WorkingHoursMap | null> {
    const data = await request<unknown>(
      `${API_BASE_URL}/listings/${listingId}/working-hours`
    );
    return fromBackendWorkingHours(data);
  },

  /** PUT /api/v1/listings/{listingId}/working-hours */
  async saveWorkingHours(listingId: string | number, hours: WorkingHoursMap): Promise<WorkingHoursMap | null> {
    const daysArr = toBackendWorkingHours(hours);
    const data = await request<unknown>(
      `${API_BASE_URL}/listings/${listingId}/working-hours`,
      {
        method: 'PUT',
        body: JSON.stringify({
          days: daysArr,
          working_hours: daysArr,
          workingHours: daysArr,
        }),
      }
    );
    return fromBackendWorkingHours(data) || hours;
  },

  /** GET /api/v1/listings/{listingId}/faq */
  async getFaq(listingId: string | number): Promise<FaqItem[]> {
    const data = await request<unknown>(`${API_BASE_URL}/listings/${listingId}/faq`);
    if (Array.isArray(data)) return data as FaqItem[];
    if (data && typeof data === 'object') {
      const f = (data as Record<string, unknown>).faq ||
                (data as Record<string, unknown>).faqs ||
                (data as Record<string, unknown>).items;
      if (Array.isArray(f)) return f as FaqItem[];
    }
    return [];
  },

  /** PUT /api/v1/listings/{listingId}/faq */
  async saveFaq(listingId: string | number, faq: FaqItem[]): Promise<FaqItem[]> {
    const cleanFaq = (faq || []).map((f) => ({
      question: f.question || '',
      answer: f.answer || '',
    }));
    const data = await request<unknown>(`${API_BASE_URL}/listings/${listingId}/faq`, {
      method: 'PUT',
      body: JSON.stringify({
        faq: cleanFaq,
        faqs: cleanFaq,
        items: cleanFaq,
      }),
    });
    if (Array.isArray(data)) return data as FaqItem[];
    return cleanFaq;
  },

  /** GET /api/v1/listings/{listingId}/features */
  async getFeatures(listingId: string | number): Promise<FeatureItem[]> {
    const data = await request<unknown>(`${API_BASE_URL}/listings/${listingId}/features`);
    if (Array.isArray(data)) return data as FeatureItem[];
    if (data && typeof data === 'object') {
      const f = (data as Record<string, unknown>).features || (data as Record<string, unknown>).items;
      if (Array.isArray(f)) return f as FeatureItem[];
    }
    return [];
  },

  /** PUT /api/v1/listings/{listingId}/features */
  async saveFeatures(listingId: string | number, features: FeatureItem[]): Promise<FeatureItem[]> {
    const cleanFeatures = (features || []).map((f) => ({
      title: f.title || '',
      description: f.description || '',
    }));
    const data = await request<unknown>(`${API_BASE_URL}/listings/${listingId}/features`, {
      method: 'PUT',
      body: JSON.stringify({
        features: cleanFeatures,
        items: cleanFeatures,
      }),
    });
    if (Array.isArray(data)) return data as FeatureItem[];
    return cleanFeatures;
  },
};

export const userCertificatesAPI = {
  /** GET /api/v1/users/me/certificates */
  async getCertificates(): Promise<CertificateItem[]> {
    const data = await request<unknown>(`${API_BASE_URL}/users/me/certificates`);
    const list: Array<Record<string, unknown>> = Array.isArray(data)
      ? (data as Array<Record<string, unknown>>)
      : (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).certificates)
        ? ((data as Record<string, unknown>).certificates as Array<Record<string, unknown>>)
        : []);
    return list.map((c) => ({
      id: c.id as number | string | undefined,
      title: (c.name as string) || (c.title as string) || '',
      name: (c.issuer as string) || (c.name as string) || '',
      date: (c.issueDate as string) || (c.date as string) || '',
      imageUrl: (c.imageUrl as string) || '',
      isVerified: !!c.isVerified,
    }));
  },

  /** PUT /api/v1/users/me/certificates */
  async saveCertificates(certificates: CertificateItem[]): Promise<CertificateItem[]> {
    const payload = (certificates || []).map((c) => {
      let isoDate: string | null = c.date || null;
      if (isoDate && /^\d{4}$/.test(isoDate)) {
        isoDate = `${isoDate}-01-01`;
      }
      return {
        name: c.title || c.name || '',
        title: c.title || '',
        issuer: c.name || '',
        issueDate: isoDate,
        date: isoDate,
        issue_date: isoDate,
        imageUrl: c.imageUrl || null,
      };
    });
    const data = await request<unknown>(`${API_BASE_URL}/users/me/certificates`, {
      method: 'PUT',
      body: JSON.stringify({
        certificates: payload,
        items: payload,
      }),
    });
    const list: Array<Record<string, unknown>> = Array.isArray(data)
      ? (data as Array<Record<string, unknown>>)
      : payload;
    return list.map((c) => ({
      id: c.id as number | string | undefined,
      title: (c.name as string) || (c.title as string) || '',
      name: (c.issuer as string) || (c.name as string) || '',
      date: (c.issueDate as string) || (c.date as string) || '',
      imageUrl: (c.imageUrl as string) || '',
      isVerified: !!c.isVerified,
    }));
  },
};

export default listingEditAPI;
