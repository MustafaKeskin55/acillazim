/**
 * İlan Önizleme Servisi
 * LocalStorage / sessionStorage yönetimi ve form → preview dönüşümü.
 * BE endpoint yok — /api/v1 çağrısı yapılmaz (bkz. md/previewService.md).
 * Opsiyonel ileride: POST|GET /api/v1/listings/previews (şu an yok).
 * CreateListingService içinde benzer metotlar var; tek kaynak tercih edilmeli.
 * SSR uyumlu — typeof window === 'undefined' kontrolleri mevcut.
 */

// LocalStorage anahtarları
const STORAGE_KEYS = {
  FORM_DATA: 'previewFormData',
  TIMESTAMP: 'previewTimestamp',
  CATEGORY_TYPE: 'previewCategoryType'
} as const;

// Veri saklama süresi - sadece browser session süresince
const DATA_EXPIRY_TIME = 24 * 60 * 60 * 1000; // ms

// Session durumu kontrol anahtarları
const SESSION_KEYS = {
  FORM_SESSION_ID: 'formSessionId',
  LAST_FORM_STATE: 'lastFormState',
  LISTING_PUBLISHED: 'listingPublished',
  EDITING_MODE: 'editingMode'
} as const;

// ---- TİP TANIMLARI ----
interface PreviewFormData {
  title: string;
  description?: string;
  price?: number | null;
  currency?: string;
  condition?: string;
  exchange?: boolean;
  city?: string;
  district?: string;
  neighborhood?: string;
  address?: string;
  selectedCategory?: unknown;
  categoryType?: string;
  images?: unknown[];
  categoryFields?: Record<string, unknown>;
  createdAt?: number;
  previewVersion?: string;
  savedAt?: number;
  version?: string;
  [key: string]: unknown;
}

interface LocationSession {
  city: string;
  district: string;
  neighborhood: string;
}

interface PreviewDebugInfo {
  hasData: boolean;
  dataSize?: number;
  savedAt?: string | null;
  categoryType?: string;
  isValid?: boolean;
  expiresAt?: string | null;
  error?: string;
}

// ---- YARDIMCI FONKSİYONLAR ----

/**
 * File objesini base64'e çevir
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
};

/**
 * Dosya objelerini base64'e çevir
 */
const convertImagesToBase64 = async (images: unknown[]): Promise<string[]> => {
  if (!Array.isArray(images) || images.length === 0) return [];

  const converted: string[] = [];

  for (const imageItem of images) {
    try {
      let file: File | null = null;

      if (imageItem instanceof File) {
        file = imageItem;
      } else if ((imageItem as { file?: File }).file instanceof File) {
        file = (imageItem as { file: File }).file;
      } else if (typeof imageItem === 'string') {
        converted.push(imageItem);
        continue;
      }

      if (file) {
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
          console.warn(`Resim çok büyük (${(file.size / (1024 * 1024)).toFixed(2)}MB), atlanıyor:`, file.name);
          continue;
        }

        const base64 = await fileToBase64(file);
        const base64Size = new Blob([base64]).size;

        if (base64Size > maxSize * 1.5) {
          console.warn(`Base64 resim çok büyük (${(base64Size / (1024 * 1024)).toFixed(2)}MB), atlanıyor`);
          continue;
        }

        converted.push(base64);
      }
    } catch (error) {
      console.error('Görsel dönüştürme hatası:', error);
    }
  }

  return converted;
};

/**
 * SessionStorage'dan konum bilgilerini al
 */
const getLocationFromSession = (): LocationSession => {
  if (typeof window === 'undefined') return { city: '', district: '', neighborhood: '' };
  try {
    const city =
      sessionStorage.getItem('selectedCity') ||
      sessionStorage.getItem('selected_city') ||
      sessionStorage.getItem('city_name') || '';

    const district =
      sessionStorage.getItem('selectedDistrict') ||
      sessionStorage.getItem('selected_district') ||
      sessionStorage.getItem('district_name') || '';

    const neighborhood =
      sessionStorage.getItem('selectedNeighborhood') ||
      sessionStorage.getItem('selected_neighborhood') ||
      sessionStorage.getItem('neighborhood_name') || '';

    console.log('SessionStorage Konum Verileri:', { city, district, neighborhood });
    return { city, district, neighborhood };
  } catch (error) {
    console.error('SessionStorage konum verileri alınırken hata:', error);
    return { city: '', district: '', neighborhood: '' };
  }
};

/**
 * Session ID oluştur ve kaydet
 */
const generateSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  const sessionId = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem(SESSION_KEYS.FORM_SESSION_ID, sessionId);
  console.log('Yeni form session ID oluşturuldu:', sessionId);
  return sessionId;
};

/**
 * Mevcut session'ın geçerli olup olmadığını kontrol et
 */
const isSessionValid = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const isPublished = sessionStorage.getItem(SESSION_KEYS.LISTING_PUBLISHED);
    if (isPublished === 'true') {
      console.log('Session geçersiz: İlan yayınlandı');
      return false;
    }

    const isEditing = sessionStorage.getItem(SESSION_KEYS.EDITING_MODE);
    if (isEditing === 'true') {
      console.log('Düzenleme modu aktif, ancak session geçerli sayılıyor');
    }

    const sessionId = sessionStorage.getItem(SESSION_KEYS.FORM_SESSION_ID);
    const isEditMode =
      window.location.pathname.includes('/duzenle') ||
      window.location.pathname.includes('/edit') ||
      sessionStorage.getItem('editingListingId') !== null;

    if (!sessionId && !isEditMode) {
      console.log('Session geçersiz: Session ID yok (yeni ilan modunda)');
      return false;
    }

    console.log(isEditMode ? 'Session geçerli: Düzenleme modu' : 'Session geçerli: ' + sessionId);
    return true;
  } catch (error) {
    console.error('Session kontrol hatası:', error);
    return false;
  }
};

/**
 * Form durumunu kaydet ve değişiklik kontrolü yap
 */
const checkFormStateChange = (formData: PreviewFormData): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const currentFormHash = JSON.stringify(formData);
    const lastFormState = sessionStorage.getItem(SESSION_KEYS.LAST_FORM_STATE);

    if (lastFormState && lastFormState !== currentFormHash) {
      console.log('Form değişikliği tespit edildi, session sıfırlanacak');
      return true;
    }

    sessionStorage.setItem(SESSION_KEYS.LAST_FORM_STATE, currentFormHash);
    return false;
  } catch (error) {
    console.error('Form durum kontrol hatası:', error);
    return false;
  }
};

// ============================================================================
// DIŞA AKTARILAN FONKSİYONLAR
// ============================================================================

/**
 * İlan yayınlandığında session'ı temizle
 */
export const markListingAsPublished = (): void => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEYS.LISTING_PUBLISHED, 'true');
    console.log('İlan yayınlandı olarak işaretlendi, preview verileri temizlenecek');
    clearPreviewData();
  } catch (error) {
    console.error('İlan yayınlama işaretleme hatası:', error);
  }
};

/**
 * Düzenleme moduna geçildiğinde işaretle
 */
export const markAsEditingMode = (): void => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEYS.EDITING_MODE, 'true');
    console.log('Düzenleme modu aktif olarak işaretlendi (preview verileri korunuyor)');
  } catch (error) {
    console.error('Düzenleme modu işaretleme hatası:', error);
  }
};

/**
 * Yeni form session'ı başlat (düzenleme modunda çalışmaz)
 */
export const startNewFormSession = (): void => {
  if (typeof window === 'undefined') return;
  try {
    const currentPath = window.location.pathname;
    const editingId = sessionStorage.getItem('editingListingId');
    const hasExistingFormData = localStorage.getItem(STORAGE_KEYS.FORM_DATA);

    const isEditMode =
      currentPath.includes('/duzenle') ||
      currentPath.includes('/edit') ||
      editingId !== null ||
      (hasExistingFormData && sessionStorage.getItem(SESSION_KEYS.EDITING_MODE));

    if (isEditMode) {
      console.log('Düzenleme modu tespit edildi, yeni session başlatılmıyor');
      return;
    }

    sessionStorage.removeItem(SESSION_KEYS.LISTING_PUBLISHED);
    sessionStorage.removeItem(SESSION_KEYS.EDITING_MODE);
    sessionStorage.removeItem(SESSION_KEYS.LAST_FORM_STATE);

    generateSessionId();
    console.log('Yeni form session başlatıldı');
  } catch (error) {
    console.error('Yeni session başlatma hatası:', error);
  }
};

/**
 * Form verilerini localStorage'a kaydet
 */
export const savePreviewData = (formData: PreviewFormData): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    if (!formData || typeof formData !== 'object') {
      console.error('Geçersiz form verisi:', formData);
      return false;
    }

    if (!formData.title || formData.title.trim() === '') {
      console.error('İlan başlığı gerekli');
      return false;
    }

    const dataToSave = { ...formData, savedAt: Date.now(), version: '1.0' };
    const jsonData = JSON.stringify(dataToSave);
    const dataSize = new Blob([jsonData]).size;
    const dataSizeMB = (dataSize / (1024 * 1024)).toFixed(2);

    console.log('Önizleme verisi boyutu:', dataSizeMB, 'MB');
    console.log('Resim sayısı:', formData.images ? (formData.images as unknown[]).length : 0);

    if (dataSize > 5 * 1024 * 1024) {
      console.error('Veri boyutu çok büyük:', dataSizeMB, 'MB');
      return false;
    }

    localStorage.setItem(STORAGE_KEYS.FORM_DATA, jsonData);
    localStorage.setItem(STORAGE_KEYS.TIMESTAMP, Date.now().toString());

    console.log('Önizleme verisi başarıyla kaydedildi:', {
      title: formData.title,
      size: dataSizeMB + ' MB',
      imageCount: formData.images ? (formData.images as unknown[]).length : 0,
      timestamp: new Date().toLocaleString('tr-TR')
    });

    return true;
  } catch (error) {
    console.error('Önizleme verisi kaydedilirken hata:', error);
    if ((error as { name: string; code: number }).name === 'QuotaExceededError' ||
        (error as { name: string; code: number }).code === 22) {
      console.error('LocalStorage dolu! Daha az resim ekleyin veya resim boyutlarını küçültün');
    }
    return false;
  }
};

/**
 * localStorage'dan önizleme verilerini oku
 */
export const getPreviewData = (): PreviewFormData | null => {
  if (typeof window === 'undefined') return null;
  try {
    if (!isSessionValid()) {
      console.log('Session geçersiz, önizleme verileri temizleniyor');
      clearPreviewData();
      return null;
    }

    const storedData = localStorage.getItem(STORAGE_KEYS.FORM_DATA);
    const timestamp = localStorage.getItem(STORAGE_KEYS.TIMESTAMP);

    if (!storedData) {
      console.log("LocalStorage'da önizleme verisi bulunamadı");
      return null;
    }

    if (timestamp) {
      const savedTime = parseInt(timestamp);
      if (Date.now() - savedTime > DATA_EXPIRY_TIME) {
        console.log('Önizleme verisi süresi dolmuş, temizleniyor...');
        clearPreviewData();
        return null;
      }
    }

    const parsedData: PreviewFormData = JSON.parse(storedData);

    if (!parsedData.title) {
      console.error('Bozuk önizleme verisi tespit edildi');
      clearPreviewData();
      return null;
    }

    console.log('Önizleme verisi başarıyla okundu:', {
      title: parsedData.title,
      savedAt: parsedData.savedAt ? new Date(parsedData.savedAt as number).toLocaleString('tr-TR') : 'Bilinmiyor'
    });

    return parsedData;
  } catch (error) {
    console.error('Önizleme verisi okunurken hata:', error);
    clearPreviewData();
    return null;
  }
};

/**
 * Önizleme verilerini temizle
 */
export const clearPreviewData = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.FORM_DATA);
    localStorage.removeItem(STORAGE_KEYS.TIMESTAMP);
    localStorage.removeItem(STORAGE_KEYS.CATEGORY_TYPE);

    sessionStorage.removeItem(SESSION_KEYS.FORM_SESSION_ID);
    sessionStorage.removeItem(SESSION_KEYS.LAST_FORM_STATE);

    localStorage.removeItem('productDetailData');
    localStorage.removeItem('cachedProductData');

    console.log('Önizleme verileri, session verileri ve cache temizlendi');
  } catch (error) {
    console.error('Önizleme verileri temizlenirken hata:', error);
  }
};

/**
 * Kategori tipini algıla (hizmet/ürün)
 */
export const detectCategoryType = (): string => {
  if (typeof window === 'undefined') return 'urun';
  try {
    const cachedType = localStorage.getItem(STORAGE_KEYS.CATEGORY_TYPE);
    if (cachedType) return cachedType;

    const mainCategory = sessionStorage.getItem('selectedMainCategory');
    if (mainCategory) {
      const cl = mainCategory.toLowerCase();
      const serviceKeywords = ['hizmet', 'hızmet', 'service', 'servis'];
      if (serviceKeywords.some(k => cl.includes(k))) {
        localStorage.setItem(STORAGE_KEYS.CATEGORY_TYPE, 'hizmet');
        return 'hizmet';
      }
    }

    const formData = getPreviewData();
    if ((formData?.selectedCategory as { name?: string })?.name) {
      const cn = ((formData!.selectedCategory as { name: string }).name).toLowerCase();
      const serviceKeywords = ['hizmet', 'hızmet', 'service', 'servis'];
      if (serviceKeywords.some(k => cn.includes(k))) {
        localStorage.setItem(STORAGE_KEYS.CATEGORY_TYPE, 'hizmet');
        return 'hizmet';
      }
    }

    localStorage.setItem(STORAGE_KEYS.CATEGORY_TYPE, 'urun');
    return 'urun';
  } catch (error) {
    console.error('Kategori tipi algılanırken hata:', error);
    return 'urun';
  }
};

/**
 * Önizleme verilerinin geçerli olup olmadığını kontrol et
 */
export const isPreviewDataValid = (): boolean => {
  try {
    const data = getPreviewData();
    if (!data) return false;
    if (!data.title || data.title.trim() === '') return false;
    return true;
  } catch (error) {
    console.error('Önizleme verisi doğrulaması sırasında hata:', error);
    return false;
  }
};

/**
 * Form verilerini önizleme formatına dönüştür
 */
export const transformFormDataForPreview = async (
  formData: PreviewFormData
): Promise<PreviewFormData | null> => {
  if (typeof window === 'undefined') return null;
  try {
    console.log('transformFormDataForPreview başladı');

    if (!formData) throw new Error('Form verisi bulunamadı');

    if (checkFormStateChange(formData)) {
      console.log('Form değişikliği tespit edildi, yeni session başlatılıyor');
      startNewFormSession();
    }

    if (!isSessionValid()) {
      console.log('Session geçersiz, yeni session başlatılıyor');
      startNewFormSession();
    }

    console.log('Konum bilgileri alınıyor...');
    const locationFromSession = getLocationFromSession();
    console.log('Konum bilgileri alındı:', locationFromSession);

    const transformedData: PreviewFormData = {
      title: formData.title || '',
      description: (formData.description as string) || '',
      price: (formData.price as number) || null,
      currency: (formData.currency as string) || 'TL',
      condition: (formData.condition as string) || '',
      exchange: (formData.exchange as boolean) || false,

      city: locationFromSession.city || (formData.city as string) || '',
      district: locationFromSession.district || (formData.district as string) || '',
      neighborhood: locationFromSession.neighborhood || (formData.neighborhood as string) || '',
      address: (formData.address as string) || '',

      selectedCategory: formData.selectedCategory || null,
      categoryType: detectCategoryType(),

      images: [],
      categoryFields: {},

      createdAt: Date.now(),
      previewVersion: '1.0'
    };

    // Kategori alanları
    try {
      console.log('Kategori alanları işleniyor...');
      const categoryFieldLabels = sessionStorage.getItem('categoryFieldLabels');
      const fieldLabels: Record<string, string> = categoryFieldLabels
        ? JSON.parse(categoryFieldLabels)
        : {};

      const currentFormData = sessionStorage.getItem('currentFormData');
      let allFormData = { ...formData };

      if (currentFormData) {
        try {
          const parsed = JSON.parse(currentFormData);
          allFormData = { ...formData, ...parsed };
        } catch (parseError) {
          console.error('SessionStorage form verileri parse edilemedi:', parseError);
        }
      }

      Object.keys(allFormData).forEach(key => {
        if (key.startsWith('category_') && allFormData[key]) {
          (transformedData.categoryFields as Record<string, unknown>)[key] = {
            value: allFormData[key],
            label: fieldLabels[key] || key.replace('category_', '').replace('_', ' ')
          };
          transformedData[key] = allFormData[key];
        }
      });
    } catch (error) {
      console.error('Kategori alanları işlenirken hata:', error);
      Object.keys(formData).forEach(key => {
        if (key.startsWith('category_') && formData[key]) {
          (transformedData.categoryFields as Record<string, unknown>)[key] = formData[key];
          transformedData[key] = formData[key];
        }
      });
    }

    // Resimleri dönüştür
    console.log('Resimler dönüştürülüyor...');
    try {
      transformedData.images = await convertImagesToBase64(
        (formData.images as unknown[]) || []
      );
      console.log('Resim dönüştürme tamamlandı. Resim sayısı:', transformedData.images.length);
    } catch (imageError) {
      console.error('Resim dönüştürme hatası:', imageError);
      transformedData.images = [];
    }

    console.log('Form verisi önizleme formatına dönüştürüldü:', {
      title: transformedData.title,
      categoryType: transformedData.categoryType,
      imageCount: (transformedData.images as unknown[]).length,
      categoryFieldsCount: Object.keys(transformedData.categoryFields as Record<string, unknown>).length
    });

    return transformedData;
  } catch (error) {
    console.error('Form verisi dönüştürülürken hata:', error);
    return null;
  }
};

/**
 * Önizleme sayfası için debug bilgileri
 */
export const getPreviewDebugInfo = (): PreviewDebugInfo => {
  if (typeof window === 'undefined') return { hasData: false };
  try {
    const data = getPreviewData();
    const timestamp = localStorage.getItem(STORAGE_KEYS.TIMESTAMP);

    return {
      hasData: !!data,
      dataSize: data ? JSON.stringify(data).length : 0,
      savedAt: timestamp ? new Date(parseInt(timestamp)).toLocaleString('tr-TR') : null,
      categoryType: detectCategoryType(),
      isValid: isPreviewDataValid(),
      expiresAt: timestamp
        ? new Date(parseInt(timestamp) + DATA_EXPIRY_TIME).toLocaleString('tr-TR')
        : null
    };
  } catch (error) {
    return { hasData: false, error: (error as Error).message };
  }
};

// Default export
const previewService = {
  savePreviewData,
  getPreviewData,
  clearPreviewData,
  detectCategoryType,
  isPreviewDataValid,
  transformFormDataForPreview,
  getPreviewDebugInfo,
  markListingAsPublished,
  markAsEditingMode,
  startNewFormSession
};

export default previewService;
