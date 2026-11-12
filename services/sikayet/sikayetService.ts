/**
 * Şikayet (Complaints) Servisi
 *
 * Path alias yok: /api/sikayet/... Türkçe path kullanılmaz
 *   → GET  /api/v1/complaints/categories|priorities|statuses|mine|stats
 *   → POST /api/v1/complaints
 *   → GET/PUT /api/v1/complaints/{id}
 *   → POST /api/v1/complaints/{id}/messages
 *   → PUT  /api/v1/complaints/{id}/read
 *
 * BE routing: /categories, /mine, /stats → {id} dinamik route'tan önce.
 *
 * BE wire formatı (snake_case, İngilizce) burada FE'nin kullandığı Türkçe
 * alan adlarına çevrilir (map* fonksiyonları). Renk bilgisi backend'de
 * tutulmadığı için sabit bir renk paleti (STATUS_COLORS/PRIORITY_COLORS)
 * ile eşlenir; tüm diğer alanlar gerçek backend verisidir.
 */

export interface SikayetKategorisi {
  id: string;
  adi: string;
  hedefTipi: 'kullanici' | 'ilan';
}

export interface OncelikSeviyesi {
  id: string;
  adi: string;
  renk: string;
}

export interface DurumDegeri {
  id: string;
  adi: string;
  renk: string;
}

export interface SikayetMesaji {
  id: string;
  gonderenId: string;
  icerik: string;
  olusturmaTarihi: string;
}

export interface Sikayet {
  id: string;
  hedefTipi: 'kullanici' | 'ilan';
  hedefId: string;
  hedefAdi: string;
  sikayetEdenId: string;
  kategoriId: string;
  kategoriAdi: string;
  oncelik: string;
  durum: string;
  baslik: string;
  aciklama: string;
  kanitDosyalari: string[];
  okunmadi: boolean;
  mesajSayisi: number;
  olusturmaTarihi: string;
  guncellemeTarihi: string;
  mesajlar: SikayetMesaji[];
}

export interface CreateSikayetPayload {
  sikayetEdilenId: string;
  kategoriId: string;
  baslik: string;
  aciklama: string;
  kanitDosyalari?: File[];
  /** listing | user — wire: target_type */
  targetType: 'listing' | 'user';
}

export interface UpdateSikayetPayload {
  durum?: string;
  oncelik?: string;
  notlar?: string;
}

export interface SikayetStats {
  toplam: number;
  acik: number;
  inceleniyor: number;
  beklemede: number;
  cozuldu: number;
  kapatildi: number;
}

/** Backend'de renk saklanmadığı için sabit görsel eşleme (tasarım korunur). */
const STATUS_COLORS: Record<string, string> = {
  pending: '#9b59b6',
  reviewing: '#f39c12',
  resolved: '#27ae60',
  rejected: '#e74c3c',
  dismissed: '#7f8c8d',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#95a5a6',
  medium: '#3498db',
  high: '#e67e22',
  urgent: '#e74c3c',
};

/** Host normalize → {host}/api/v1 */
function resolveComplaintsApiBase(): string {
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

const API_BASE_URL = resolveComplaintsApiBase();

function unwrapData<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/** BE: { id, label, targetType } → FE: SikayetKategorisi */
interface RawCategory {
  id: string;
  label: string;
  targetType?: string;
  target_type?: string;
}

function mapCategory(raw: RawCategory): SikayetKategorisi {
  const targetType = raw.targetType || raw.target_type;
  return {
    id: raw.id,
    adi: raw.label,
    hedefTipi: targetType === 'listing' ? 'ilan' : 'kullanici',
  };
}

/** BE: { id, label } → FE lookup (öncelik/durum) */
interface RawLookup {
  id: string;
  label: string;
}

function mapPriority(raw: RawLookup): OncelikSeviyesi {
  return { id: raw.id, adi: raw.label, renk: PRIORITY_COLORS[raw.id] || '#3498db' };
}

function mapStatus(raw: RawLookup): DurumDegeri {
  return { id: raw.id, adi: raw.label, renk: STATUS_COLORS[raw.id] || '#7f8c8d' };
}

/** BE ComplaintDTO (snake_case) → FE Sikayet */
interface RawComplaint {
  id: number | string;
  target_type: 'user' | 'listing';
  reported_id: number | string;
  reported_name?: string;
  reporter_id: number | string;
  category_id: string;
  category_label?: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  evidence_urls?: string[];
  unread?: boolean;
  message_count?: number;
  created_at: string;
  updated_at: string;
  messages?: RawMessage[];
}

interface RawMessage {
  id: number | string;
  senderId: number | string;
  content: string;
  createdAt: string;
}

function mapMessage(raw: RawMessage): SikayetMesaji {
  return {
    id: String(raw.id),
    gonderenId: String(raw.senderId),
    icerik: raw.content,
    olusturmaTarihi: raw.createdAt,
  };
}

function mapComplaint(raw: RawComplaint): Sikayet {
  return {
    id: String(raw.id),
    hedefTipi: raw.target_type === 'listing' ? 'ilan' : 'kullanici',
    hedefId: String(raw.reported_id),
    hedefAdi: raw.reported_name || '',
    sikayetEdenId: String(raw.reporter_id),
    kategoriId: raw.category_id,
    kategoriAdi: raw.category_label || raw.category_id,
    oncelik: raw.priority,
    durum: raw.status,
    baslik: raw.title,
    aciklama: raw.description,
    kanitDosyalari: raw.evidence_urls || [],
    okunmadi: !!raw.unread,
    mesajSayisi: raw.message_count ?? (raw.messages ? raw.messages.length : 0),
    olusturmaTarihi: raw.created_at,
    guncellemeTarihi: raw.updated_at,
    mesajlar: (raw.messages || []).map(mapMessage),
  };
}

class SikayetService {
  private baseUrl = `${API_BASE_URL}/complaints`;

  /** GET /api/v1/complaints/categories */
  async getKategoriler(targetType?: 'listing' | 'user'): Promise<SikayetKategorisi[]> {
    const qs = targetType ? `?target_type=${targetType}` : '';
    try {
      const response = await fetch(`${this.baseUrl}/categories${qs}`);
      if (!response.ok) throw new Error('Kategoriler yüklenemedi');
      const data = unwrapData<RawCategory[]>(await response.json());
      return (Array.isArray(data) ? data : []).map(mapCategory);
    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error);
      throw error;
    }
  }

  /** GET /api/v1/complaints/priorities */
  async getOncelikSeviyeleri(): Promise<OncelikSeviyesi[]> {
    try {
      const response = await fetch(`${this.baseUrl}/priorities`);
      if (!response.ok) throw new Error('Öncelik seviyeleri yüklenemedi');
      const data = unwrapData<RawLookup[]>(await response.json());
      return (Array.isArray(data) ? data : []).map(mapPriority);
    } catch (error) {
      console.error('Öncelik seviyeleri yüklenirken hata:', error);
      throw error;
    }
  }

  /** GET /api/v1/complaints/statuses */
  async getDurumDegerleri(): Promise<DurumDegeri[]> {
    try {
      const response = await fetch(`${this.baseUrl}/statuses`);
      if (!response.ok) throw new Error('Durum değerleri yüklenemedi');
      const data = unwrapData<RawLookup[]>(await response.json());
      return (Array.isArray(data) ? data : []).map(mapStatus);
    } catch (error) {
      console.error('Durum değerleri yüklenirken hata:', error);
      throw error;
    }
  }

  /** POST /api/v1/complaints (JSON, kanıt dosyasız) veya multipart (kanıtlı) */
  async createSikayet(payload: CreateSikayetPayload, token: string): Promise<Sikayet> {
    try {
      let response: Response;
      if (payload.kanitDosyalari && payload.kanitDosyalari.length > 0) {
        const formData = new FormData();
        formData.append('target_type', payload.targetType);
        formData.append('reported_id', payload.sikayetEdilenId);
        formData.append('category_id', payload.kategoriId);
        formData.append('title', payload.baslik);
        if (payload.aciklama) formData.append('description', payload.aciklama);
        payload.kanitDosyalari.forEach((dosya) => formData.append('evidence', dosya));

        response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            target_type: payload.targetType,
            reported_id: Number(payload.sikayetEdilenId),
            category_id: payload.kategoriId,
            title: payload.baslik,
            description: payload.aciklama,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as { message?: string }).message || 'Şikayet oluşturulamadı');
      }

      return mapComplaint(unwrapData<RawComplaint>(await response.json()));
    } catch (error) {
      console.error('Şikayet oluşturulurken hata:', error);
      throw error;
    }
  }

  /** GET /api/v1/complaints (admin - tum sikayetler, sikayet yonetimi paneli) */
  async getTumSikayetler(token: string, status?: string, pageSize = 200): Promise<Sikayet[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}&page_size=${pageSize}` : `?page_size=${pageSize}`;
    try {
      const response = await fetch(`${this.baseUrl}${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Şikayetler yüklenemedi');
      const data = unwrapData<{ complaints?: RawComplaint[] }>(await response.json());
      return (data.complaints || []).map(mapComplaint);
    } catch (error) {
      console.error('Tüm şikayetler yüklenirken hata:', error);
      throw error;
    }
  }

  /** GET /api/v1/complaints/mine */
  async getSikayetlerim(token: string, status?: string): Promise<Sikayet[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}&page_size=100` : '?page_size=100';
    try {
      const response = await fetch(`${this.baseUrl}/mine${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Şikayetler yüklenemedi');
      const data = unwrapData<{ complaints?: RawComplaint[] }>(await response.json());
      return (data.complaints || []).map(mapComplaint);
    } catch (error) {
      console.error('Şikayetler yüklenirken hata:', error);
      throw error;
    }
  }

  /** GET /api/v1/complaints/{complaintId} */
  async getSikayetById(sikayetId: string, token: string): Promise<Sikayet> {
    try {
      const response = await fetch(`${this.baseUrl}/${sikayetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Şikayet bulunamadı');
      return mapComplaint(unwrapData<RawComplaint>(await response.json()));
    } catch (error) {
      console.error('Şikayet yüklenirken hata:', error);
      throw error;
    }
  }

  /** PUT /api/v1/complaints/{complaintId} — sadece admin */
  async updateSikayet(
    sikayetId: string,
    payload: UpdateSikayetPayload,
    token: string
  ): Promise<Sikayet> {
    try {
      const body = {
        ...(payload.durum != null ? { status: payload.durum } : {}),
        ...(payload.oncelik != null ? { priority: payload.oncelik } : {}),
        ...(payload.notlar != null ? { notes: payload.notlar } : {}),
      };
      const response = await fetch(`${this.baseUrl}/${sikayetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Şikayet güncellenemedi');
      return mapComplaint(unwrapData<RawComplaint>(await response.json()));
    } catch (error) {
      console.error('Şikayet güncellenirken hata:', error);
      throw error;
    }
  }

  /** POST /api/v1/complaints/{complaintId}/messages  body: { content } */
  async addMessage(sikayetId: string, icerik: string, token: string): Promise<Sikayet> {
    try {
      const response = await fetch(`${this.baseUrl}/${sikayetId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: icerik }),
      });
      if (!response.ok) throw new Error('Mesaj gönderilemedi');
      return mapComplaint(unwrapData<RawComplaint>(await response.json()));
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      throw error;
    }
  }

  /** PUT /api/v1/complaints/{complaintId}/read */
  async markAsRead(sikayetId: string, token: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/${sikayetId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Okundu olarak işaretlenirken hata:', error);
    }
  }

  /** GET /api/v1/complaints/stats */
  async getSikayetStats(token: string): Promise<SikayetStats> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('İstatistikler yüklenemedi');
      const data = unwrapData<Record<string, number>>(await response.json());
      return {
        toplam: data.total ?? 0,
        acik: data.open ?? 0,
        inceleniyor: data.reviewing ?? 0,
        beklemede: data.pending ?? 0,
        cozuldu: data.resolved ?? 0,
        kapatildi: data.closed ?? 0,
      };
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
      throw error;
    }
  }
}

export const sikayetService = new SikayetService();
export default sikayetService;
