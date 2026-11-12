/**
 * Kategori Güvenlik Servisi
 * Bu servis, kategori ağaç yapısı işlemlerindeki güvenliği sağlar
 */

import cryptoService from './cryptoService';

// Tip tanımları
interface CategoryPathItem {
  id: number | null;
  name: string;
  slug: string;
  parentId: number | null;
  [key: string]: any;
}

interface SignedCategoryData {
  data: any;
  hash: string;
}

// Rate Limiter implementasyonu - localStorage desteği ile güncellenmiş
const rateLimiter = {
  // Yerel istekler
  _requests: null as Map<string, number[]> | null,
  
  get requests(): Map<string, number[]> {
    // Mevcut Map yapısı
    if (!this._requests) {
      this._requests = new Map<string, number[]>();
      
      // SSR guard
      if (typeof window === 'undefined') return this._requests;
      
      // LocalStorage'dan rate limiter durumunu al
      try {
        const storedRequests = localStorage.getItem('rateLimiterRequests');
        if (storedRequests) {
          const parsedRequests = JSON.parse(storedRequests);
          // Object'ten Map'e dönüştür
          Object.keys(parsedRequests).forEach(key => {
            this._requests!.set(key, parsedRequests[key]);
          });
        }
      } catch (error) {
        console.warn('Rate limiter verisi alınamadı:', error);
      }
    }
    return this._requests;
  },
  
  // Yerel istekleri ayarla ve localStorage'a kaydet
  set requests(value: Map<string, number[]>) {
    this._requests = value;
    
    // SSR guard
    if (typeof window === 'undefined') return;
    
    // LocalStorage'a kaydet
    try {
      // Map'i Object'e dönüştür
      const requestsObj: Record<string, number[]> = {};
      for (const [key, val] of this._requests.entries()) {
        requestsObj[key] = val;
      }
      localStorage.setItem('rateLimiterRequests', JSON.stringify(requestsObj));
    } catch (error) {
      console.warn('Rate limiter verisi kaydedilemedi:', error);
    }
  },
  
  windowMs: 30 * 60 * 1000, // 30 dakikalık pencere
  maxRequests: 300, // Her pencere için maksimum istek sayısı
  
  checkLimit: (clientId: string = 'default'): boolean => {
    const now = Date.now();
    const windowStart = now - rateLimiter.windowMs;
    
    // Eski kayıtları temizle
    rateLimiter.cleanup(windowStart);
    
    // İstek geçmişini al veya oluştur
    if (!rateLimiter.requests.has(clientId)) {
      rateLimiter.requests.set(clientId, []);
    }
    
    const requests = rateLimiter.requests.get(clientId)!;
    
    // Pencere içindeki istek sayısını kontrol et
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= rateLimiter.maxRequests) {
      throw new Error('Rate limit exceeded');
    }
    
    // Yeni isteği kaydet
    requests.push(now);
    rateLimiter.requests.set(clientId, requests);
    
    return true;
  },
  
  cleanup: (windowStart: number): void => {
    for (const [key, requests] of rateLimiter.requests.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      if (validRequests.length === 0) {
        rateLimiter.requests.delete(key);
      } else {
        rateLimiter.requests.set(key, validRequests);
      }
    }
  },
  
  // Rate limiter durumunu sıfırla
  reset: (): void => {
    rateLimiter._requests = new Map<string, number[]>();
    if (typeof window !== 'undefined') {
      localStorage.setItem('rateLimiterRequests', JSON.stringify({}));
    }
    console.log('Rate limiter sıfırlandı.');
  }
};

/**
 * Kategori ID'sini temizler ve doğrular
 * @param categoryId - Doğrulanacak kategori ID'si
 * @returns Temizlenmiş ve doğrulanmış kategori ID'si veya null
 */
export const sanitizeCategoryId = (categoryId: string | number | null | undefined): number | null => {
  if (!categoryId) return null;
  
  // String ise sayıya dönüştür
  let parsedId = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId;
  
  // Geçerli bir sayı değilse null döndür
  if (isNaN(parsedId) || parsedId <= 0 || !isFinite(parsedId)) {
    return null;
  }
  
  return parsedId;
};

/**
 * Kategori yolu için güvenlik kontrolü yapar
 * @param categoryPath - Kontrol edilecek kategori yolu dizisi
 * @returns Temizlenmiş kategori yolu dizisi
 */
export const sanitizeCategoryPath = (categoryPath: any[]): CategoryPathItem[] => {
  if (!Array.isArray(categoryPath)) return [];
  
  return categoryPath.map(category => {
    if (!category || typeof category !== 'object') return null;
    
    // Sadece gerekli alanları içeren temiz obje oluştur
    return {
      id: sanitizeCategoryId(category.id),
      name: typeof category.name === 'string' 
        ? category.name.replace(/[<>"'`]/g, '') // XSS koruması için
        : '',
      slug: typeof category.slug === 'string' 
        ? category.slug.replace(/[<>"'`]/g, '') // XSS koruması için
        : '',
      parentId: category.parentId !== undefined 
        ? sanitizeCategoryId(category.parentId) 
        : null
    };
  }).filter(Boolean) as CategoryPathItem[]; // null olanları filtrele
};

/**
 * Kategori işlemlerini imzalar ve doğrular
 * @param categoryData - İmzalanacak kategori verisi
 * @returns İmzalanmış kategori verisi
 */
export const signCategoryData = async (categoryData: any): Promise<SignedCategoryData> => {
  try {
    // Rate limit kontrolü - hata toleranslı hale getirildi
    try {
      rateLimiter.checkLimit();
    } catch (rateLimitError: any) {
      // Rate limit aşıldığında hata fırlatmak yerine sadece uyarı log'u
      console.warn('Rate limit aşıldı, ancak işleme devam ediliyor:', rateLimitError.message);
      
      // SSR guard
      if (typeof window !== 'undefined') {
        // LocalStorage'da rate limiter durumunu kontrol et ve sıfırlanması gerekip gerekmediğini belirle
        const lastReset = localStorage.getItem('rateLimiterLastReset');
        const now = Date.now();
        
        // 30 dakikadan fazla zaman geçtiyse otomatik sıfırla
        if (!lastReset || now - parseInt(lastReset) > 30 * 60 * 1000) {
          rateLimiter.reset();
          localStorage.setItem('rateLimiterLastReset', now.toString());
          console.log('Rate limiter otomatik olarak sıfırlandı.');
        }
      }
    }
    
    if (!categoryData) {
      throw new Error('Geçersiz kategori verisi');
    }
    
    // Veriyi temizle
    const sanitizedData = JSON.parse(JSON.stringify(categoryData));
    
    // Kategori yolunu sanitize et
    if (sanitizedData.categoryPath) {
      sanitizedData.categoryPath = sanitizeCategoryPath(sanitizedData.categoryPath);
    }
    
    // Kategori ID'sini sanitize et
    if (sanitizedData.categoryId) {
      sanitizedData.categoryId = sanitizeCategoryId(sanitizedData.categoryId);
    }
    
    // Hash hesapla - cryptoService kullanarak
    const dataString = JSON.stringify(sanitizedData);
    const hash = await cryptoService.generateHash(dataString);
    
    return {
      data: sanitizedData,
      hash
    };
  } catch (error) {
    console.error('Kategori verisi imzalanırken hata oluştu:', error);
    throw error;
  }
};

/**
 * İmzalı kategori verisini doğrular
 * @param signedData - İmzalı veri
 * @param expectedHash - Beklenen hash
 * @returns Doğrulama sonucu
 */
export const verifyCategoryData = async (signedData: any, expectedHash: string): Promise<boolean> => {
  try {
    if (!signedData || !expectedHash) {
      return false;
    }
    
    // Hash'i yeniden hesapla - cryptoService kullanarak
    const dataString = JSON.stringify(signedData.data);
    const actualHash = await cryptoService.generateHash(dataString);
    
    // Hash'leri karşılaştır
    return actualHash === expectedHash;
  } catch (error) {
    console.error('Kategori verisi doğrulanırken hata oluştu:', error);
    return false;
  }
};

export default {
  sanitizeCategoryId,
  sanitizeCategoryPath,
  signCategoryData,
  verifyCategoryData,
  rateLimiter // Rate limiter'ı da dışa açtık
};
