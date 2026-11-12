/**
 * API Yapılandırma Dosyası
 *
 * Bu dosya, tüm API istekleri için temel yapılandırma bilgilerini içerir.
 * Ortam değişkenlerine göre API URL'leri ve diğer yapılandırma ayarları burada tanımlanır.
 */

type Environment = 'development' | 'staging' | 'production';

// Ortam değişkenine göre API baz URL'ini belirle
const ENVIRONMENTS: Record<Environment, string> = {
  development: 'https://dev-api.acillazım.net',
  staging: 'https://staging-api.acillazım.net',
  production: 'https://api.acillazım.net'
};

// Şu anki ortamı belirle (default: development)
const CURRENT_ENV = (process.env.NEXT_PUBLIC_ENV || 'development') as Environment;

// API baz URL'ini ve diğer yapılandırmaları dışa aktar
export const API_BASE_URL = ENVIRONMENTS[CURRENT_ENV];

// API endpoint'leri
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  CATEGORIES: '/categories',
  PRODUCTS: '/products',
  SERVICES: '/services',
  SERVICE_AREAS: '/service-areas',
  LOCATIONS: '/locations',
  SEARCH: '/search'
} as const;

// API istek yapılandırmaları
export const API_CONFIG = {
  // Default istek zaman aşımı (ms)
  TIMEOUT: 30000,

  // Retry yapılandırması
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    RETRY_STATUS_CODES: [408, 500, 502, 503, 504]
  },

  // Cache yapılandırması
  CACHE: {
    ENABLE: true,
    TTL: 300000 // 5 dakika
  }
} as const;

// API hata kodları
export const API_ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
} as const;

// API yetkilendirme başlıkları oluşturucu
export const getAuthHeaders = (token: string): Record<string, string> => {
  return {
    Authorization: `Bearer ${token}`
  };
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  API_CONFIG,
  API_ERROR_CODES,
  getAuthHeaders
};
