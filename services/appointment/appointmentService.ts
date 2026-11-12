/**
 * Randevu Servisi
 * Randevu alma ve talep gönderme işlemlerini yönetir
 */

import { STORAGE_KEYS } from '@/config/constants';

// Host + /api/v1 — path alias yok (ör. /api/appointments kullanılmaz)
const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'https://api.acillazım.net').replace(
  /\/$/,
  ''
);
const API_V1_BASE = `${API_HOST}/api/v1`;

/** Hizmet sağlayıcı paneli randevu listesi (GET, Bearer zorunlu) */
const PROVIDER_APPOINTMENTS_PATH =
  process.env.NEXT_PUBLIC_APPOINTMENTS_PROVIDER_PATH || 'appointments/provider';

export interface ProviderAppointmentRecord {
  id: string | number;
  serviceId?: string | number;
  title: string;
  date: string;
  time: string;
  location: string;
  price: string | number;
  status: string;
  category?: string;
  arrivedAt?: string;
  arrivalConfirmedAt?: string;
  completionRequestedAt?: string;
  completedAt?: string;
  disputeReason?: string;
  suggestedDate?: string;
  suggestedTime?: string;
  rescheduledBy?: number | string;
  rescheduleReason?: string;
  rescheduledAt?: string;
  client: { name: string; phone: string; email: string };
  service: { title: string; image?: string; description?: string };
  notes?: string;
}

function pickClient(raw: Record<string, unknown>): ProviderAppointmentRecord['client'] {
  const c = (raw.client ?? raw.customer ?? {}) as Record<string, unknown>;
  return {
    name: String(c.name ?? c.full_name ?? ''),
    phone: String(c.phone ?? c.phone_number ?? ''),
    email: String(c.email ?? ''),
  };
}

function pickService(raw: Record<string, unknown>): ProviderAppointmentRecord['service'] {
  const s = (raw.service ?? {}) as Record<string, unknown>;
  const title = String(s.title ?? s.name ?? raw.service_title ?? raw.service_name ?? '');
  const image = s.image != null ? String(s.image) : raw.service_image != null ? String(raw.service_image) : undefined;
  const description =
    s.description != null ? String(s.description) : raw.service_description != null ? String(raw.service_description) : undefined;
  return { title, image, description };
}

/** API yanıtını (camelCase / snake_case) panel randevu modeline çevirir */
export function normalizeProviderAppointment(raw: unknown): ProviderAppointmentRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = r.id ?? r.appointment_id;
  if (id == null) return null;
  const serviceId = (r.service_id ?? r.serviceId) as string | number | undefined;
  const service = pickService(r);
  const title = String(r.title ?? service.title ?? 'Randevu');
  return {
    id: id as string | number,
    serviceId,
    title,
    date: String(r.date ?? r.appointment_date ?? r.scheduled_date ?? ''),
    time: String(r.time ?? r.appointment_time ?? r.scheduled_time ?? ''),
    location: String(r.location ?? r.address ?? ''),
    price: (r.price ?? r.final_price ?? 0) as string | number,
    status: String(r.status ?? 'pending').toLowerCase(),
    category: r.category != null ? String(r.category) : undefined,
    arrivedAt: r.arrived_at != null ? String(r.arrived_at) : r.arrivedAt != null ? String(r.arrivedAt) : undefined,
    arrivalConfirmedAt: r.arrival_confirmed_at != null ? String(r.arrival_confirmed_at) : r.arrivalConfirmedAt != null ? String(r.arrivalConfirmedAt) : undefined,
    completionRequestedAt: r.completion_requested_at != null ? String(r.completion_requested_at) : r.completionRequestedAt != null ? String(r.completionRequestedAt) : undefined,
    completedAt: r.completed_at != null ? String(r.completed_at) : r.completedAt != null ? String(r.completedAt) : undefined,
    disputeReason: r.dispute_reason != null ? String(r.dispute_reason) : r.disputeReason != null ? String(r.disputeReason) : undefined,
    suggestedDate: r.suggested_date != null ? toDateString(r.suggested_date) : r.suggestedDate != null ? toDateString(r.suggestedDate) : undefined,
    suggestedTime: r.suggested_time != null ? toTimeString(r.suggested_time) : r.suggestedTime != null ? toTimeString(r.suggestedTime) : undefined,
    rescheduledBy: (r.rescheduled_by ?? r.rescheduledBy) as number | string | undefined,
    rescheduleReason: r.reschedule_reason != null ? String(r.reschedule_reason) : r.rescheduleReason != null ? String(r.rescheduleReason) : undefined,
    rescheduledAt: r.rescheduled_at != null ? String(r.rescheduled_at) : r.rescheduledAt != null ? String(r.rescheduledAt) : undefined,
    client: pickClient(r),
    service: {
      title: service.title || title,
      image: service.image,
      description: service.description,
    },
    notes: r.notes != null ? String(r.notes) : undefined,
  };
}

/**
 * Oturum açmış hizmet sağlayıcının randevularını API'den getirir.
 * Statik demo veri kullanılmaz; yanıt boş veya hata ise [] döner.
 */
export async function getProviderAppointments(): Promise<ProviderAppointmentRecord[]> {
  try {
    const token = getAuthToken();
    if (!token) return [];

    const path = PROVIDER_APPOINTMENTS_PATH.replace(/^\//, '');
    const response = await fetch(`${API_V1_BASE}/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) return [];

    const body: unknown = await response.json();
    const list: unknown[] = Array.isArray(body)
      ? body
      : body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)
        ? ((body as { data: unknown[] }).data)
        : [];

    return list
      .map(normalizeProviderAppointment)
      .filter((x): x is ProviderAppointmentRecord => x != null);
  } catch {
    return [];
  }
}

interface AppointmentData {
  serviceId?: number | string;
  serviceName?: string;
  type?: string;
  date?: string;
  time?: string;
  notes?: string;
  packageId?: number | string;
  packageName?: string;
  price?: number;
  [key: string]: unknown;
}

interface ApprovalData {
  notes?: string;
  finalPrice?: number;
  confirmedDate?: string;
  confirmedTime?: string;
  [key: string]: unknown;
}

interface RejectionData {
  reason?: string;
  notes?: string;
  [key: string]: unknown;
}

interface RescheduleData {
  newDate?: string;
  newTime?: string;
  reason?: string;
  notes?: string;
  [key: string]: unknown;
}

interface CancellationData {
  reason?: string;
  notes?: string;
  [key: string]: unknown;
}

interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
}

const getAuthToken = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || '';
};

/** BE hata gövdesinden (ApiResponse.error) kullanıcıya gösterilecek mesajı çıkarır */
const extractErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body: unknown = await response.clone().json();
    if (body && typeof body === 'object' && typeof (body as { message?: unknown }).message === 'string') {
      return (body as { message: string }).message;
    }
  } catch {
    // JSON olmayan hata gövdesi — fallback mesaj kullanılır
  }
  return `${fallback} (HTTP ${response.status})`;
};

/**
 * Randevu talebini API'ye gönderir
 * @param appointmentData - Randevu verileri
 * @returns API yanıtı
 */
export const submitAppointmentRequest = async (
  appointmentData: AppointmentData
): Promise<ApiResult> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        service_id: appointmentData.serviceId,
        service_name: appointmentData.serviceName,
        appointment_type: appointmentData.type,
        requested_date: appointmentData.date,
        requested_time: appointmentData.time,
        notes: appointmentData.notes,
        ...(appointmentData.packageId && {
          package_id: appointmentData.packageId,
          package_name: appointmentData.packageName,
          price: appointmentData.price
        }),
        created_at: new Date().toISOString(),
        status: 'pending'
      })
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Randevu talebi gönderilemedi'));
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
      message: 'Randevu talebiniz başarıyla gönderildi'
    };
  } catch (error) {
    console.error('Randevu talebi gönderilirken hata:', error);
    // Hata gizlenmez — çağıran taraf gerçek başarısızlığı kullanıcıya göstermelidir
    throw error instanceof Error ? error : new Error('Randevu talebi gönderilirken bir sorun oluştu');
  }
};

/**
 * Kullanıcının randevu geçmişini getirir
 * @param userId - Kullanıcı ID'si
 * @returns Randevu listesi
 */
export const getUserAppointments = async (userId: number | string): Promise<unknown[]> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const appointments = await response.json();
    return appointments;
  } catch (error) {
    console.error('Randevular getirilirken hata:', error);

    // Fake data return - gerçek API'de error handle edilecek
    return [];
  }
};

/**
 * Hizmet sağlayıcının onaylı randevularını getirir
 * @param serviceId - Hizmet ID'si
 * @param date - Tarih (YYYY-MM-DD formatında)
 * @returns Onaylı randevu listesi
 */
export const getConfirmedAppointments = async (
  serviceId: number | string,
  date: string
): Promise<unknown[]> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/confirmed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        service_id: serviceId,
        date: date
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const appointments = await response.json();
    return appointments;
  } catch (error) {
    console.error('Onaylı randevular getirilirken hata:', error);

    // API hatası durumunda boş liste döndür
    return [];
  }
};

/**
 * Hizmet sağlayıcının müsait saatlerini getirir (onaylı randevuları çıkararak)
 * @param serviceId - Hizmet ID'si
 * @param date - Tarih (YYYY-MM-DD formatında)
 * @returns Müsait saat listesi
 */
export const getAvailableTimeSlots = async (
  serviceId: number | string,
  date: string
): Promise<string[]> => {
  try {
    const res = await fetch(`${API_V1_BASE}/appointments/available-slots?serviceId=${serviceId}&date=${date}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn('[appointmentService] available-slots API returned status:', res.status);
      return [];
    }

    const body: unknown = await res.json();
    if (body && typeof body === 'object') {
      const data = (body as { data?: unknown }).data;
      if (Array.isArray(data)) {
        return data.map((s) => String(s));
      }
      if (Array.isArray(body)) {
        return (body as unknown[]).map((s) => String(s));
      }
    }
    return [];
  } catch (error) {
    console.error('Müsait saatler getirilirken hata:', error);
    return [];
  }
};

/**
 * Randevu durumunu günceller
 * @param appointmentId - Randevu ID'si
 * @param status - Yeni durum (confirmed, rejected, completed)
 * @returns Güncelleme sonucu
 */
export interface StatusUpdatePayload {
  status: string;
  confirmedDate?: string;
  confirmedTime?: string;
  rejectionReason?: string;
  adminNotes?: string;
  [key: string]: unknown;
}

export const updateAppointmentStatus = async (
  appointmentId: number | string,
  statusOrPayload: string | StatusUpdatePayload
): Promise<unknown> => {
  try {
    const payload: StatusUpdatePayload =
      typeof statusOrPayload === 'string'
        ? { status: statusOrPayload }
        : statusOrPayload;

    const response = await fetch(`${API_V1_BASE}/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        ...payload,
        status: String(payload.status).toUpperCase(),
        confirmed_date: payload.confirmedDate || null,
        confirmed_time: payload.confirmedTime || null,
        confirmedDate: payload.confirmedDate || null,
        confirmedTime: payload.confirmedTime || null,
        rejection_reason: payload.rejectionReason || null,
        admin_notes: payload.adminNotes || null,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Randevu durumu güncellenemedi'));
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Randevu durumu güncellenirken hata:', error);
    throw error instanceof Error ? error : new Error('Randevu durumu güncellenirken bir sorun oluştu');
  }
};

/**
 * Randevuyu onaylar
 * @param appointmentId - Randevu ID'si
 * @param approvalData - Onay bilgileri
 * @returns Onay sonucu
 */
export const approveAppointment = async (
  appointmentId: number | string,
  approvalData: ApprovalData = {}
): Promise<ApiResult> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/${appointmentId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        approval_notes: approvalData.notes || '',
        final_price: approvalData.finalPrice || null,
        confirmed_date: approvalData.confirmedDate || null,
        confirmed_time: approvalData.confirmedTime || null,
        confirmedDate: approvalData.confirmedDate || null,
        confirmedTime: approvalData.confirmedTime || null,
        ...approvalData
      })
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Randevu onaylanamadı'));
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
      message: 'Randevu başarıyla onaylandı'
    };
  } catch (error) {
    console.error('Randevu onaylanırken hata:', error);
    throw error instanceof Error ? error : new Error('Randevu onaylanırken bir sorun oluştu');
  }
};

/**
 * Randevuyu reddeder
 * @param appointmentId - Randevu ID'si
 * @param rejectionData - Red bilgileri
 * @returns Red sonucu
 */
export const rejectAppointment = async (
  appointmentId: number | string,
  rejectionData: RejectionData = {}
): Promise<ApiResult> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/${appointmentId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        rejection_reason: rejectionData.reason || 'Uygun değil',
        rejection_notes: rejectionData.notes || '',
        ...rejectionData
      })
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Randevu reddedilemedi'));
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
      message: 'Randevu reddedildi'
    };
  } catch (error) {
    console.error('Randevu reddedilirken hata:', error);
    throw error instanceof Error ? error : new Error('Randevu reddedilirken bir sorun oluştu');
  }
};

/**
 * Randevu tarihini değiştirir (sadece onaylanmamış randevular için)
 * @param appointmentId - Randevu ID'si
 * @param rescheduleData - Yeni tarih bilgileri
 * @returns Tarih değiştirme sonucu
 */
export const rescheduleAppointment = async (
  appointmentId: number | string,
  rescheduleData: RescheduleData
): Promise<ApiResult> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/${appointmentId}/reschedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        new_date: rescheduleData.newDate,
        new_time: rescheduleData.newTime,
        reschedule_reason: rescheduleData.reason || 'Tarih değişikliği',
        reschedule_notes: rescheduleData.notes || '',
        ...rescheduleData
      })
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Randevu tarihi değiştirilemedi'));
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
      message: 'Randevu tarihi başarıyla değiştirildi'
    };
  } catch (error) {
    console.error('Randevu tarihi değiştirilirken hata:', error);
    throw error instanceof Error ? error : new Error('Randevu tarihi değiştirilirken bir sorun oluştu');
  }
};

/**
 * Randevu iptal eder (sadece onaylanmamış randevular için)
 * @param appointmentId - Randevu ID'si
 * @param cancellationData - İptal bilgileri
 * @returns İptal sonucu
 */
export const cancelAppointment = async (
  appointmentId: number | string,
  cancellationData: CancellationData = {}
): Promise<ApiResult> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        cancellation_reason: cancellationData.reason || 'İptal edildi',
        cancellation_notes: cancellationData.notes || '',
        ...cancellationData
      })
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Randevu iptal edilemedi'));
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
      message: 'Randevu iptal edildi'
    };
  } catch (error) {
    console.error('Randevu iptal edilirken hata:', error);
    throw error instanceof Error ? error : new Error('Randevu iptal edilirken bir sorun oluştu');
  }
};

/**
 * Randevu detaylarını getirir
 * @param appointmentId - Randevu ID'si
 * @returns Randevu detayları
 */
export const getAppointmentDetails = async (appointmentId: number | string): Promise<unknown> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/${appointmentId}`, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Randevu detayları alınamadı'));
    }

    const appointment = await response.json();
    return appointment;
  } catch (error) {
    console.error('Randevu detayları getirilirken hata:', error);
    throw error instanceof Error ? error : new Error('Randevu detayları getirilirken bir sorun oluştu');
  }
};


/* ------------------------------------------------------------------ */
/*  Müşteri (hizmet alan) tarafı: kullanıcının KENDİ aldığı randevular  */
/* ------------------------------------------------------------------ */

export interface BookedAppointmentRecord {
  id: number | string;
  serviceId: number | string | null;
  providerId: number | string | null;
  /** Hizmet başlığı (ilandan canlı okunur) */
  title: string;
  /** Hizmet verenin adı (ilandan canlı okunur) */
  providerName: string;
  image?: string;
  location: string;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm */
  time: string;
  status: string;
  price: number | null;
  packageName?: string;
  notes?: string;
  arrivedAt?: string;
  arrivalConfirmedAt?: string;
  completionRequestedAt?: string;
  completedAt?: string;
  disputeReason?: string;
  suggestedDate?: string;
  suggestedTime?: string;
  rescheduledBy?: number | string;
  rescheduleReason?: string;
  rescheduledAt?: string;
}

const pad2 = (n: unknown): string => String(n).padStart(2, '0');

/** Jackson LocalDate: "2026-11-05" ya da [2026, 11, 5] olabilir */
const toDateString = (v: unknown): string => {
  if (Array.isArray(v) && v.length >= 3) return `${v[0]}-${pad2(v[1])}-${pad2(v[2])}`;
  return typeof v === 'string' ? v.slice(0, 10) : '';
};

/** Jackson LocalTime: "09:00:00" ya da [9, 0] olabilir */
const toTimeString = (v: unknown): string => {
  if (Array.isArray(v) && v.length >= 2) return `${pad2(v[0])}:${pad2(v[1])}`;
  return typeof v === 'string' ? v.slice(0, 5) : '';
};

interface ListingSummary {
  title: string;
  providerName: string;
  image?: string;
  location: string;
}

/** İlan detayını (public GET /listings/{id}) okuyup kart için gereken özeti çıkarır */
async function fetchListingSummary(serviceId: number | string): Promise<ListingSummary | null> {
  try {
    const res = await fetch(`${API_V1_BASE}/listings/${serviceId}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const body = (await res.json()) as Record<string, unknown>;
    const d = ((body.data as Record<string, unknown> | undefined) ?? body) as Record<string, unknown>;
    const seller = (d.seller ?? d.ilan_sahibi ?? {}) as Record<string, unknown>;
    const images = Array.isArray(d.imageUrls) ? (d.imageUrls as unknown[]) : [];
    const city = String(d.locationCity ?? d.il ?? '');
    const district = String(d.locationDistrict ?? d.ilce ?? '');
    return {
      title: String(d.title ?? d.baslik ?? ''),
      providerName: String(seller.name ?? ''),
      image: images[0] != null ? String(images[0]) : undefined,
      location: `${city} ${district}`.trim(),
    };
  } catch {
    return null;
  }
}

/**
 * Kullanıcının müşteri olarak aldığı randevuları getirir (GET /appointments/user/{userId}).
 * Backend yalnızca ID döndürdüğü için hizmet başlığı/usta adı ilan detayından canlı çözülür;
 * statik veri kullanılmaz. Hata durumunda boş liste DÖNMEZ, hata fırlatılır
 * (aksi halde kullanıcı yanlışlıkla "randevunuz yok" görür).
 */
export async function getMyBookedAppointments(userId: number | string): Promise<BookedAppointmentRecord[]> {
  const token = getAuthToken();
  if (!token || !userId) return [];

  const res = await fetch(`${API_V1_BASE}/appointments/user/${userId}?size=100`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, 'Randevularınız alınamadı'));

  const body = (await res.json()) as { data?: unknown };
  const payload = body?.data;
  const rows: Record<string, unknown>[] = Array.isArray(payload)
    ? (payload as Record<string, unknown>[])
    : Array.isArray((payload as { content?: unknown } | undefined)?.content)
      ? ((payload as { content: Record<string, unknown>[] }).content)
      : [];

  const serviceIds = Array.from(
    new Set(rows.map((r) => r.serviceId).filter((v): v is number | string => v != null))
  );
  const summaries = new Map<string, ListingSummary | null>();
  await Promise.all(
    serviceIds.map(async (id) => {
      summaries.set(String(id), await fetchListingSummary(id));
    })
  );

  return rows.map((r): BookedAppointmentRecord => {
    const summary = r.serviceId != null ? summaries.get(String(r.serviceId)) ?? null : null;
    const price = r.price != null && r.price !== '' ? Number(r.price) : null;
    return {
      id: r.id as number | string,
      serviceId: (r.serviceId as number | string | null | undefined) ?? null,
      providerId: (r.serviceProviderId as number | string | null | undefined) ?? null,
      title: summary?.title || String(r.packageName ?? 'Hizmet'),
      providerName: summary?.providerName || 'Hizmet veren',
      image: summary?.image,
      location: summary?.location ?? '',
      date: toDateString(r.confirmedDate ?? r.requestedDate),
      time: toTimeString(r.confirmedTime ?? r.requestedTime),
      status: String(r.status ?? 'pending').toLowerCase(),
      price: Number.isFinite(price as number) ? (price as number) : null,
      packageName: r.packageName != null ? String(r.packageName) : undefined,
      notes: r.notes != null && String(r.notes) !== '' ? String(r.notes) : undefined,
      arrivedAt: r.arrived_at != null ? String(r.arrived_at) : r.arrivedAt != null ? String(r.arrivedAt) : undefined,
      arrivalConfirmedAt: r.arrival_confirmed_at != null ? String(r.arrival_confirmed_at) : r.arrivalConfirmedAt != null ? String(r.arrivalConfirmedAt) : undefined,
      completionRequestedAt: r.completion_requested_at != null ? String(r.completion_requested_at) : r.completionRequestedAt != null ? String(r.completionRequestedAt) : undefined,
      completedAt: r.completed_at != null ? String(r.completed_at) : r.completedAt != null ? String(r.completedAt) : undefined,
      disputeReason: r.dispute_reason != null ? String(r.dispute_reason) : r.disputeReason != null ? String(r.disputeReason) : undefined,
      suggestedDate: r.suggested_date != null ? toDateString(r.suggested_date) : r.suggestedDate != null ? toDateString(r.suggestedDate) : undefined,
      suggestedTime: r.suggested_time != null ? toTimeString(r.suggested_time) : r.suggestedTime != null ? toTimeString(r.suggestedTime) : undefined,
      rescheduledBy: (r.rescheduled_by ?? r.rescheduledBy) as number | string | undefined,
      rescheduleReason: r.reschedule_reason != null ? String(r.reschedule_reason) : r.rescheduleReason != null ? String(r.rescheduleReason) : undefined,
      rescheduledAt: r.rescheduled_at != null ? String(r.rescheduled_at) : r.rescheduledAt != null ? String(r.rescheduledAt) : undefined,
    };
  });
}

/**
 * Randevu tarih değişikliği önerisini kabul veya reddet
 */
export async function respondToReschedule(
  appointmentId: number | string,
  approve: boolean
): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error('Oturum açılmamış');
  const res = await fetch(`${API_V1_BASE}/appointments/${appointmentId}/reschedule-response`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({ approve }),
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Tarih değişikliği yanıtlanamadı'));
  }
}

/**
 * Usta adrese geldi bildirimi
 */
export const notifyArrival = async (appointmentId: number | string): Promise<ApiResult> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/${appointmentId}/arrive`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Varış bildirimi yapılamadı'));
    }
    const result = await response.json();
    return { success: true, message: result?.message || 'Varış bildirildi', data: result?.data };
  } catch (error) {
    console.error('Varış bildirme hatası:', error);
    throw error;
  }
};

/**
 * Müşteri usta varış onayı
 */
export const confirmArrival = async (appointmentId: number | string): Promise<ApiResult> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/${appointmentId}/confirm-arrival`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Varış onaylanamadı'));
    }
    const result = await response.json();
    return { success: true, message: result?.message || 'Usta varışı onaylandı', data: result?.data };
  } catch (error) {
    console.error('Varış onaylama hatası:', error);
    throw error;
  }
};

/**
 * Usta hizmet tamamlama talebi (48 saatlik onay süreci başlar)
 */
export const requestCompletion = async (appointmentId: number | string): Promise<ApiResult> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/${appointmentId}/complete-request`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Tamamlama talebi gönderilemedi'));
    }
    const result = await response.json();
    return { success: true, message: result?.message || 'Tamamlama talebi iletildi', data: result?.data };
  } catch (error) {
    console.error('Tamamlama talep hatası:', error);
    throw error;
  }
};

/**
 * Müşteri hizmet tamamlama onayı
 */
export const confirmCompletion = async (appointmentId: number | string): Promise<ApiResult> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/${appointmentId}/confirm-completion`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Hizmet tamamlanamadı'));
    }
    const result = await response.json();
    return { success: true, message: result?.message || 'Hizmet tamamlandı', data: result?.data };
  } catch (error) {
    console.error('Hizmet tamamlama onayı hatası:', error);
    throw error;
  }
};

/**
 * Müşteri hizmet tamamlama itirazı
 */
export const disputeCompletion = async (appointmentId: number | string, reason?: string): Promise<ApiResult> => {
  try {
    const response = await fetch(`${API_V1_BASE}/appointments/${appointmentId}/dispute`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ reason: reason || 'Müşteri itiraz etti' }),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'İtiraz iletilemedi'));
    }
    const result = await response.json();
    return { success: true, message: result?.message || 'İtirazınız kaydedildi', data: result?.data };
  } catch (error) {
    console.error('İtiraz hatası:', error);
    throw error;
  }
};
