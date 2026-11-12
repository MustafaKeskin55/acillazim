import defaultCardData from '@/data/cardData';

// API URL'leri
const API_BASE_URL = 'https://api.acillazım.net';
const API_ENDPOINTS = {
  PRODUCTS: '/products',
  CATEGORIES: '/kategoriler',
  FAVORITES: '/favorites'
};

// Sahte token işlemleri
let authToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

interface CardItem {
  id?: number | string;
  title?: string;
  price?: string | number;
  discountedPrice?: string | number;
  categories?: string;
  city?: string;
  img?: string;
  listingType?: string;
  status?: string;
  description?: string;
  date?: string;
  [key: string]: unknown;
}

interface ProductItem {
  id?: number | string;
  title?: string;
  price: number;
  discountedPrice: number | null;
  category?: string;
  location?: string;
  image?: string;
  isFavorite: boolean;
  isNew: boolean;
  isUrgent: boolean;
  isFeatured: boolean;
  viewCount: number;
  description: string;
  date: string;
}

interface ApiFilter {
  category?: string;
  city?: string;
  listingType?: string;
  status?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

// --- Dashboard Profil API (gerçek backend) -------------------------------
// BasicInfo formu (Ad Soyad, Telefon, Şehir, İlçe, Hakkımda) burada
// GET/PUT /api/dashboard/profile uçlarına bağlanır. Şirket/sosyal medya/
// doğum tarihi/açık adres alanları backend'de henüz desteklenmediği için
// yalnızca form state'inde tutulur, kaydedilmez.

interface DashboardProfileResponse {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  address?: string;
  companyName?: string;
  businessType?: string;
  activityArea?: string;
  taxOffice?: string;
  taxNumber?: string;
  identityNumber?: string;
  birthDate?: string;
  birth_date?: string;
  bio?: string;
  profileImage?: string;
  coverImage?: string;
  cover_image?: string;
  profile_image?: string;
  profilePicture?: string;
  website?: string;
  socialMediaFacebook?: string;
  socialMediaInstagram?: string;
  socialMediaTwitter?: string;
  socialMediaLinkedin?: string;
  socialMediaGithub?: string;
  socialMediaYoutube?: string;
  socialMediaBehance?: string;
  headline?: string;
  skills?: string;
  serviceAreas?: Array<{ categoryId: number; name?: string; years: number }>;
  skillItems?: Array<{ id: number; name?: string }>;
}

interface BasicInfoFormData {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: {
    fullAddress?: string;
    city?: string;
    district?: string;
    neighborhood?: string;
  };
  additionalInfo?: { bio?: string };
  companyInfo?: {
    isCompany?: boolean;
    companyType?: string;
    companyName?: string;
    taxOffice?: string;
    taxNumber?: string;
    identityNumber?: string;
    activityArea?: string;
  };
  [key: string]: unknown;
}

function resolveDashboardApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api';
  // Base URL genelde .../api/v1 şeklinde geliyor; dashboard endpoint'leri
  // /api/dashboard altında (v1 öneki olmadan) tanımlı.
  const host = raw
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/v1\/?$/i, '');
  return `${host}/api`;
}

const DASHBOARD_API_BASE = resolveDashboardApiBase();

function getDashboardAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}


export interface MissingProfileField {
  key: string;
  label: string;
  category: 'personal' | 'address' | 'corporate';
}

export interface ProfileCompletenessResult {
  isComplete: boolean;
  missingFields: MissingProfileField[];
  data?: BasicInfoFormData;
}

export async function checkProfileCompleteness(): Promise<ProfileCompletenessResult> {
  const missing: MissingProfileField[] = [];
  try {
    const info = await fetchBasicInfo();
    const fullName = (info.fullName || '').trim();
    if (!fullName || fullName.length < 3) {
      missing.push({ key: 'fullName', label: 'Ad ve Soyad', category: 'personal' });
    }

    const phone = (info.phone || '').trim().replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      missing.push({ key: 'phone', label: 'Geçerli Bir Telefon Numarası', category: 'personal' });
    }

    const city = (info.address?.city || '').trim();
    if (!city) {
      missing.push({ key: 'city', label: 'Şehir (İl) Bilgisi', category: 'address' });
    }

    const district = (info.address?.district || '').trim();
    if (!district) {
      missing.push({ key: 'district', label: 'İlçe Bilgisi', category: 'address' });
    }

    // Kurumsal kontrolü: Eğer kurumsal bir hesap ise şirket ve vergi bilgileri zorunludur
    const comp = info.companyInfo;
    if (comp && comp.isCompany) {
      if (!comp.companyName || !comp.companyName.trim()) {
        missing.push({ key: 'companyName', label: 'Şirket / Firma Ünvanı', category: 'corporate' });
      }
      if (!comp.taxOffice || !comp.taxOffice.trim()) {
        missing.push({ key: 'taxOffice', label: 'Vergi Dairesi', category: 'corporate' });
      }
      if (!comp.taxNumber || !comp.taxNumber.trim()) {
        missing.push({ key: 'taxNumber', label: 'Vergi Numarası / TCKN', category: 'corporate' });
      }
      if (!comp.activityArea || !comp.activityArea.trim()) {
        missing.push({ key: 'activityArea', label: 'Faaliyet Alanı', category: 'corporate' });
      }
    }

    return {
      isComplete: missing.length === 0,
      missingFields: missing,
      data: info,
    };
  } catch (err) {
    console.error('[checkProfileCompleteness] Hata:', err);
    return {
      isComplete: false,
      missingFields: [{ key: 'auth_error', label: 'Profil bilgilerinize ulaşılamadı. Lütfen giriş yapıp tekrar deneyin.', category: 'personal' }],
    };
  }
}

async function fetchBasicInfo(): Promise<BasicInfoFormData> {
  const token = getDashboardAuthToken();
  if (!token) {
    throw new Error('Oturum bulunamadı, lütfen tekrar giriş yapın');
  }

  const res = await fetch(`${DASHBOARD_API_BASE}/dashboard/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Profil bilgileri alınamadı (${res.status})`);
  }
  const raw = await res.json();
  const data: DashboardProfileResponse =
    raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw;

  return {
    fullName: [data.firstName, data.lastName].filter(Boolean).join(' ').trim(),
    email: data.email || '',
    phone: data.phone || '',
    address: {
      fullAddress: data.address || '',
      city: data.city || '',
      district: data.district || '',
      neighborhood: data.neighborhood || '',
    },
    birthDate: data.birthDate || data.birth_date || '',
    personalInfo: {
      birthDate: data.birthDate || data.birth_date || ''
    },
    additionalInfo: { bio: data.bio || '' },
    headline: data.headline || '',
    skills: data.skills || '',
    serviceAreas: Array.isArray(data.serviceAreas) ? data.serviceAreas : [],
    skillItems: Array.isArray(data.skillItems) ? data.skillItems : [],
    website: data.website || '',
    socialMedia: {
      linkedin: data.socialMediaLinkedin || '',
      website: data.website || '',
      instagram: data.socialMediaInstagram || '',
      github: data.socialMediaGithub || '',
      youtube: data.socialMediaYoutube || '',
      behance: data.socialMediaBehance || '',
      facebook: data.socialMediaFacebook || '',
      twitter: data.socialMediaTwitter || ''
    },
    profileImage: data.profileImage || data.profile_image || data.profilePicture || '',
    coverImage: data.coverImage || data.cover_image || '',
    companyInfo: {
      isCompany: Boolean(data.companyName || data.taxNumber || data.businessType),
      companyType: data.businessType || '',
      companyName: data.companyName || '',
      activityArea: data.activityArea || '',
      taxOffice: data.taxOffice || '',
      taxNumber: data.taxNumber || '',
      identityNumber: data.identityNumber || '',
    },
  };
}

async function saveBasicInfo(
  submitData: BasicInfoFormData & {
    city?: string;
    district?: string;
    headline?: string;
    skills?: string;
    serviceAreas?: Array<{ categoryId: number; years: number }>;
    skillItems?: Array<{ id: number }>;
    website?: string;
    socialMedia?: Record<string, string>;
  }
): Promise<{ success: boolean; message: string }> {
  const token = getDashboardAuthToken();
  if (!token) {
    throw new Error('Oturum bulunamadı, lütfen tekrar giriş yapın');
  }

  const comp = submitData.companyInfo || {};
  const addr = submitData.address || {};
  const soc = (submitData.socialMedia || {}) as Record<string, string>;

  const body: Record<string, any> = {};

  if (submitData.fullName && String(submitData.fullName).trim()) {
    const fullName = String(submitData.fullName).trim();
    const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);
    body.firstName = firstName;
    body.lastName = rest.join(' ');
  }

  if (submitData.phone !== undefined) body.phone = submitData.phone;
  if (submitData.city || addr.city) body.city = submitData.city || addr.city;
  if (submitData.district || addr.district) body.district = submitData.district || addr.district;
  if (submitData.neighborhood || addr.neighborhood || (submitData as any).neighborhood) {
    body.neighborhood = (submitData as any).neighborhood || addr.neighborhood || '';
  }
  if ((submitData as any).addressText || addr.fullAddress) {
    body.address = (submitData as any).addressText || addr.fullAddress || '';
  }

  if (comp.companyName !== undefined) body.companyName = comp.companyName;
  if (comp.companyType !== undefined) body.businessType = comp.companyType;
  if (comp.activityArea !== undefined) body.activityArea = comp.activityArea;
  if (comp.taxOffice !== undefined) body.taxOffice = comp.taxOffice;
  if (comp.taxNumber !== undefined) body.taxNumber = comp.taxNumber;
  if (comp.identityNumber !== undefined) body.identityNumber = comp.identityNumber;

  if (submitData.birthDate !== undefined || (submitData.personalInfo as any)?.birthDate !== undefined) {
    body.birthDate = (submitData.birthDate as string) || (submitData.personalInfo as any)?.birthDate || null;
  }

  if (submitData.additionalInfo?.bio !== undefined || (submitData as any).bio !== undefined) {
    body.bio = submitData.additionalInfo?.bio || (submitData as any).bio || '';
  }

  if (submitData.headline !== undefined) body.headline = submitData.headline;
  if (submitData.skills !== undefined) body.skills = submitData.skills;
  // Yapılandırılmış hizmet alanları / yetenekler: yalnızca ID gönderilir, isimler backend'de çözülür.
  if (submitData.serviceAreas !== undefined) {
    body.serviceAreas = submitData.serviceAreas.map((a) => ({ categoryId: a.categoryId, years: a.years }));
  }
  if (submitData.skillItems !== undefined) {
    body.skillItems = submitData.skillItems.map((s) => ({ id: s.id }));
  }

  if (submitData.website !== undefined || soc.website !== undefined) {
    body.website = submitData.website || soc.website || '';
  }

  if (soc.linkedin !== undefined) body.socialMediaLinkedin = soc.linkedin;
  if (soc.github !== undefined) body.socialMediaGithub = soc.github;
  if (soc.instagram !== undefined) body.socialMediaInstagram = soc.instagram;
  if (soc.youtube !== undefined) body.socialMediaYoutube = soc.youtube;
  if (soc.behance !== undefined) body.socialMediaBehance = soc.behance;
  if (soc.facebook !== undefined) body.socialMediaFacebook = soc.facebook;
  if (soc.twitter !== undefined) body.socialMediaTwitter = soc.twitter;

  const res = await fetch(`${DASHBOARD_API_BASE}/dashboard/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null as { message?: string } | null);
    throw new Error(errBody?.message || `Profil kaydedilemedi (${res.status})`);
  }
  const raw = await res.json().catch(() => null as { message?: string } | null);
  return { success: true, message: raw?.message || 'Profil bilgileriniz güncellendi' };
}

export async function uploadAvatar(file: File): Promise<{ success: boolean; url: string; message: string }> {
  const token = getDashboardAuthToken();
  if (!token) {
    throw new Error('Oturum bulunamadı, lütfen tekrar giriş yapın');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${DASHBOARD_API_BASE}/dashboard/profile/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || `Profil fotoğrafı yüklenemedi (${res.status})`);
  }
  return data;
}

export async function uploadCover(file: File): Promise<{ success: boolean; url: string; message: string }> {
  const token = getDashboardAuthToken();
  if (!token) {
    throw new Error('Oturum bulunamadı, lütfen tekrar giriş yapın');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${DASHBOARD_API_BASE}/dashboard/profile/cover`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || `Kapak fotoğrafı yüklenemedi (${res.status})`);
  }
  return data;
}

// Token ayarlama fonksiyonu
export const setAuthToken = (token: string | null): void => {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }
};

// API istekleri için temel fonksiyon
const apiRequest = async (
  endpoint: string,
  method = 'GET',
  data: unknown = null
): Promise<unknown> => {
  // Token yoksa hata fırlat
  if (!authToken && endpoint !== '/auth/login') {
    throw new Error('Authentication token is required');
  }

  // İstek seçenekleri
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` })
    }
  };

  // POST, PUT gibi istekler için body ekle
  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    // Gerçek bir API isteği yapmak yerine, sahte bir gecikme ve yanıt oluştur
    return await mockApiResponse(endpoint, method, data);
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Sahte API yanıtı oluşturan fonksiyon
const mockApiResponse = (
  endpoint: string,
  method: string,
  data: unknown
): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    // Gerçekçi bir gecikme ekle (300ms - 1000ms arası)
    const delay = 300 + Math.random() * 700;

    setTimeout(() => {
      const cards = (defaultCardData as unknown as CardItem[]) || [];

      // Endpoint'e göre yanıt oluştur
      if (endpoint.includes(API_ENDPOINTS.PRODUCTS)) {
        // Ürün listesi veya detayı
        const productId = endpoint.split('/').pop();

        if (productId && !isNaN(Number(productId))) {
          // Tek bir ürün detayı
          const product = cards.find(
            (p) => p.id === parseInt(productId)
          );
          if (product) {
            resolve({
              success: true,
              data: mapCardToProduct(product)
            });
          } else {
            reject({ success: false, message: 'Product not found' });
          }
        } else {
          // Ürün listesi
          // URL parametrelerini analiz et (örn: kategori, şehir, vb.)
          const params = new URLSearchParams(endpoint.split('?')[1] || '');
          let filteredProducts = [...cards];

          // Kategori filtresi
          if (params.has('category')) {
            const category = params.get('category')!;
            filteredProducts = filteredProducts.filter(
              (p) => p.categories && p.categories.toLowerCase() === category.toLowerCase()
            );
          }

          // Şehir filtresi
          if (params.has('city')) {
            const city = params.get('city')!;
            filteredProducts = filteredProducts.filter(
              (p) => p.city && p.city.toLowerCase().includes(city.toLowerCase())
            );
          }

          // İlan tipi filtresi
          if (params.has('listingType')) {
            const listingType = params.get('listingType')!;
            filteredProducts = filteredProducts.filter(
              (p) => p.listingType === listingType
            );
          }

          // Durum filtresi
          if (params.has('status')) {
            const status = params.get('status')!;
            filteredProducts = filteredProducts.filter((p) => p.status === status);
          }

          // Sayfalama
          const page = params.has('page') ? parseInt(params.get('page')!) : 1;
          const limit = params.has('limit') ? parseInt(params.get('limit')!) : 10;
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

          resolve({
            success: true,
            data: {
              products: paginatedProducts.map(mapCardToProduct),
              pagination: {
                total: filteredProducts.length,
                page,
                limit,
                totalPages: Math.ceil(filteredProducts.length / limit)
              }
            }
          });
        }
      } else if (endpoint.includes(API_ENDPOINTS.FAVORITES)) {
        // Favori işlemleri
        if (method === 'POST') {
          // Favori ekleme
          resolve({ success: true, message: 'Product added to favorites' });
        } else if (method === 'DELETE') {
          // Favori çıkarma
          resolve({ success: true, message: 'Product removed from favorites' });
        } else {
          // Favori listesi
          const favoriteProducts = cards
            .filter((_, index) => index % 5 === 0) // Örnek olarak her 5. ürünü favori olarak işaretle
            .map(mapCardToProduct);

          resolve({ success: true, data: { favorites: favoriteProducts } });
        }
      } else {
        // Desteklenmeyen endpoint
        reject({ success: false, message: 'Endpoint not supported' });
      }
    }, delay);
  });
};

// Card verisini Product formatına dönüştüren yardımcı fonksiyon
const mapCardToProduct = (card: CardItem): ProductItem => {
  return {
    id: card.id,
    title: card.title,
    price: parseInt(String(card.price)),
    discountedPrice: card.discountedPrice ? parseInt(String(card.discountedPrice)) : null,
    category: card.categories,
    location: card.city,
    image: card.img,
    isFavorite: false, // Varsayılan olarak favori değil
    isNew: card.listingType === 'yeni',
    isUrgent: card.listingType === 'acil',
    isFeatured: card.listingType === 'jet',
    viewCount: Math.floor(Math.random() * 1000) + 50, // Rastgele görüntülenme sayısı
    description: (card.description as string) || '',
    date: (card.date as string) || new Date().toISOString().split('T')[0]
  };
};

/** Yetenek havuzunda arama (herkese açık). Boş sorgu ilk kelimeleri döner. */
async function searchSkills(q: string, limit = 12): Promise<Array<{ id: number; name: string; group?: string }>> {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  params.set('limit', String(limit));
  const res = await fetch(`${DASHBOARD_API_BASE}/v1/skills?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Hizmet alanı seçimi için YALNIZCA Ustalar ve Hizmetler (12540) altındaki tüm yaprak kategorileri getirir. */
async function fetchServiceCategories(): Promise<Array<{ id: number; label: string; parentName?: string }>> {
  // 1. Yeni backend endpoint'ini dene (/api/v1/skills/categories)
  try {
    const res = await fetch(`${DASHBOARD_API_BASE}/v1/skills/categories`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((c: any) => ({
          id: Number(c.id),
          label: String(c.label || ''),
          parentName: c.parentName || undefined,
        }));
      }
    }
  } catch (err) {
    console.debug('fetchServiceCategories endpoint check failed, falling back to service tree', err);
  }

  // 2. Fallback: /api/v1/categories?is_service=true ile 12540 altındaki 20 ana hizmet kategorisini ve yapraklarını çek
  try {
    const res = await fetch(`${DASHBOARD_API_BASE}/v1/categories?is_service=true`);
    if (res.ok) {
      const raw = await res.json();
      const subs = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
      const promises = subs.map(async (sub: any) => {
        const subId = sub.category_id || sub.id;
        const subName = sub.label || sub.name || '';
        try {
          const leafRes = await fetch(`${DASHBOARD_API_BASE}/v1/categories?parent_id=${subId}`);
          if (!leafRes.ok) return [];
          const leafRaw = await leafRes.json();
          const leaves = Array.isArray(leafRaw?.data) ? leafRaw.data : [];
          return leaves.map((l: any) => ({
            id: Number(l.category_id || l.id),
            label: String(l.label || l.name || ''),
            parentName: subName,
          }));
        } catch {
          return [];
        }
      });
      const results = await Promise.all(promises);
      const flat = results.flat().filter((x: any) => x.id && x.label);
      if (flat.length > 0) return flat;
    }
  } catch (err) {
    console.warn('Hizmet kategorileri ağacı çekilemedi:', err);
  }
  return [];
}

// Dışa aktarılan API fonksiyonları
const api = {
  // Ürün listesi getir
  getProducts: async (filters: ApiFilter = {}): Promise<unknown> => {
    const queryParams = new URLSearchParams();

    // Filtreleri URL parametrelerine dönüştür
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiRequest(`${API_ENDPOINTS.PRODUCTS}${queryString}`);
  },

  // Tek ürün detayı getir
  getProductById: async (productId: number | string): Promise<unknown> => {
    return apiRequest(`${API_ENDPOINTS.PRODUCTS}/${productId}`);
  },

  // Favori ürünleri getir
  getFavorites: async (): Promise<unknown> => {
    return apiRequest(API_ENDPOINTS.FAVORITES);
  },

  // Favorilere ekle
  addToFavorites: async (productId: number | string): Promise<unknown> => {
    return apiRequest(API_ENDPOINTS.FAVORITES, 'POST', { productId });
  },

  // Favorilerden çıkar
  removeFromFavorites: async (productId: number | string): Promise<unknown> => {
    return apiRequest(`${API_ENDPOINTS.FAVORITES}/${productId}`, 'DELETE');
  },

  // Dashboard > Profil sayfası: temel bilgileri getir/kaydet (gerçek backend)
  fetchBasicInfo,
  saveBasicInfo,
  searchSkills,
  fetchServiceCategories,
  uploadAvatar,
  uploadCover
};

export default api;
