/**
 * URL Güvenlik Servisi
 * Bu servis, URL'lerin güvenliğini sağlayan fonksiyonları içerir
 */

// Tip tanımları
interface SanitizedParams {
  [key: string]: string | number;
}

interface SecureUrlResult {
  url: string;
  hash?: string;
  error?: string;
}

// Web Crypto API ile güvenli hash oluşturma
export const generateHash = async (text: string): Promise<string> => {
  try {
    if (typeof window === 'undefined') {
      // SSR guard
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(16);
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('Hash oluşturma hatası:', error);
    // Fallback olarak basit bir hash
    return Array.from(text)
      .reduce((hash: number, char: string) => {
        const charCode = char.charCodeAt(0);
        return ((hash << 5) - hash) + charCode | 0;
      }, 0)
      .toString(16);
  }
};

// Rate Limiter implementasyonu
export const rateLimiter = {
  requests: new Map<string, number[]>(),
  windowMs: 30 * 60 * 1000, // 30 dakikalık pencere (15 dakikadan 30'a çıkarıldı)
  maxRequests: 300, // Her pencere için maksimum istek sayısı (100'den 300'e çıkarıldı)
  
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
  }
};

/**
 * URL parametrelerini temizler ve doğrular
 * @param params - URL parametreleri
 * @returns Temizlenmiş parametreler
 */
export const sanitizeUrlParams = (params: Record<string, any>): SanitizedParams => {
  const sanitizedParams: SanitizedParams = {};
  
  // İzin verilen parametrelerin listesi
  const allowedParams: string[] = [
    'il', 'ilce', 'fiyat-min', 'fiyat-max', 'durum', 'm2-min', 'm2-max',
    'oda', 'kat', 'bina-yasi', 'esyali', 'marka', 'model', 'yil-min',
    'yil-max', 'km-min', 'km-max', 'yakit', 'vites', 'renk', 'sayfa',
    'siralama', 'categoryId', 'kimden'
  ];
  
  // Sayısal alanlar
  const numericFields: string[] = [
    'fiyat-min', 'fiyat-max', 'm2-min', 'm2-max', 'yil-min', 'yil-max', 
    'km-min', 'km-max', 'sayfa', 'categoryId'
  ];
  
  // Sadece izin verilen parametreleri dahil et
  Object.keys(params).forEach(key => {
    if (allowedParams.includes(key)) {
      // Değeri temizle ve sanitize et
      let value = params[key];
      
      // Veri doğrulama ve sanitizasyon
      if (typeof value === 'string') {
        // XSS koruması için özel karakterleri temizle
        value = value
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/`/g, '&#96;')
          .replace(/\//g, '&#x2F;')
          .trim();

        // SQL Injection koruması için tehlikeli karakterleri temizle
        value = value.replace(/['";\\]/g, '');
      }
      
      // Numerik alanlar için sayı kontrolü ve doğrulama
      if (numericFields.includes(key)) {
        const numValue = Number(value);
        if (!isNaN(numValue) && numValue >= 0 && isFinite(numValue)) {
          sanitizedParams[key] = numValue;
        }
      } else {
        // String uzunluk kontrolü
        if (typeof value === 'string' && value.length > 100) {
          value = value.substring(0, 100);
        }
        sanitizedParams[key] = value;
      }
    }
  });
  
  return sanitizedParams;
};

/**
 * URL'yi güvenli hale getirir
 * @param url - Güvenli hale getirilecek URL
 * @returns Güvenli URL
 */
export const secureUrl = async (url: string): Promise<SecureUrlResult> => {
  try {
    // Rate limit kontrolü
    rateLimiter.checkLimit();

    // URL yapısını kontrol et ve sanitize et
    if (!url || typeof url !== 'string') {
      return { url: '' };
    }
    
    // URL'yi parçalara ayır
    let [basePath, queryString] = url.split('?');
    
    // Base path kontrolü ve sanitizasyonu
    basePath = basePath.replace(/[<>"']/g, '');
    if (!basePath.startsWith('/')) {
      basePath = '/' + basePath;
    }
    
    // Query parametrelerini parse et
    const searchParams = new URLSearchParams(queryString || '');
    const params: Record<string, string> = {};
    
    // Parametreleri nesneye dönüştür
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    
    // Parametreleri sanitize et
    const sanitizedParams = sanitizeUrlParams(params);
    
    // Yeni search params oluştur
    const newSearchParams = new URLSearchParams();
    
    // Sanitize edilmiş parametreleri ekle
    Object.keys(sanitizedParams).forEach(key => {
      if (sanitizedParams[key] !== null && sanitizedParams[key] !== undefined) {
        newSearchParams.append(key, String(sanitizedParams[key]));
      }
    });
    
    // URL'yi hash ile imzala
    const urlHash = await generateHash(basePath + newSearchParams.toString());
    
    // Yeni URL oluştur
    const queryPart = newSearchParams.toString();
    const securedUrl = queryPart ? `${basePath}?${queryPart}` : basePath;
    
    return {
      url: securedUrl,
      hash: urlHash
    };
  } catch (error: any) {
    console.error('URL güvenliği sağlanırken hata oluştu:', error);
    return {
      url: '',
      error: error.message
    };
  }
};

/**
 * URL'nin geçerli bir filtre URL'si olup olmadığını kontrol eder
 * @param url - Kontrol edilecek URL
 * @returns URL geçerli mi
 */
export const isValidFilterUrl = (url: string): boolean => {
  try {
    // URL yapısını kontrol et
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    // Zararlı karakterler için kontrol
    if (/[<>"'`;]/.test(url)) {
      return false;
    }
    
    // Filtre URL'sinin temel yapısı: /filtrele/{categoryId}
    const filterUrlRegex = /^\/filtrele\/\d+/;
    if (!filterUrlRegex.test(url)) {
      return false;
    }
    
    // URL uzunluk kontrolü
    if (url.length > 2000) { // Maximum URL length
      return false;
    }
    
    // Query parametrelerini kontrol et
    if (url.includes('?')) {
      const [, queryString] = url.split('?');
      const params = new URLSearchParams(queryString);
      
      // Her bir parametreyi kontrol et
      for (const [key, value] of params.entries()) {
        // Parametre adı kontrolü
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
          return false;
        }
        
        // Parametre değeri kontrolü
        if (value.length > 100) {
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('URL doğrulanırken hata oluştu:', error);
    return false;
  }
};

export default {
  sanitizeUrlParams,
  secureUrl,
  isValidFilterUrl,
  rateLimiter
};
