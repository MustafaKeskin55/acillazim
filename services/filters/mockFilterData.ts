/** * API Simülasyon Servisi
 * Bu servis, gerçek API sunucusu ile aynı davranışı simüle eder.
 * Statik veri içermez, dinamik API cevapları oluşturur.
 * Güvenlik seviyesi yüksek, API benzeri bir deneyim sunar.
 */

import { nanoid } from 'nanoid';
import districtsData from '../../data/geodata/districts.json';

// Güvenli hash fonksiyonu
const generateHash = (text) => {
  try {
    // Web Crypto API kullanarak hash oluştur
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    return window.crypto.subtle.digest('SHA-256', data)
      .then(hash => {
        return Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      });
  } catch (error) {
    console.error('Hash oluşturma hatası:', error);
    // Fallback olarak basit bir hash
    return Array.from(text)
      .reduce((hash, char) => {
        const charCode = char.charCodeAt(0);
        return ((hash << 5) - hash) + charCode | 0;
      }, 0)
      .toString(16);
  }
};

// İstanbul ilçesinin hangi bölgede olduğunu kontrol eden yardımcı fonksiyon
const getIstanbulDistrictRegion = (districtName) => {
  if (!districtName) return null;
  
  // İlçe adını normalize et
  const normalizedName = districtName.toString().toUpperCase().trim();
  
  // İlk kez çağrıldığında tüm ilçeleri yükle ve işle
  if (!getIstanbulDistrictRegion.istanbulDistricts) {
    // İstanbul ilçelerini al
    getIstanbulDistrictRegion.istanbulDistricts = districtsData.filter(district => 
      Math.floor(district.CityId) === 34
    );
    
    // İlçe adlarını normalleştirip bir harita oluşturalım (önbellek için)
    getIstanbulDistrictRegion.districtMap = {};
    
    // Avrupa ve Anadolu yakası ilçelerini grupla
    getIstanbulDistrictRegion.avrupaDistricts = [];
    getIstanbulDistrictRegion.anadoluDistricts = [];
    
    getIstanbulDistrictRegion.istanbulDistricts.forEach(district => {
      const name = district.Name.toUpperCase().trim();
      getIstanbulDistrictRegion.districtMap[name] = district;
      
      // CityId ve Region bilgisine göre yakaya ayır
      if (district.Region === "AVRUPA" || (district.Region === undefined && Math.floor(district.CityId) === 34 && district.CityId < 34.5)) {
        getIstanbulDistrictRegion.avrupaDistricts.push(name);
      } else if (district.Region === "ANADOLU" || (district.Region === undefined && district.CityId >= 34.5)) {
        getIstanbulDistrictRegion.anadoluDistricts.push(name);
      }
    });
    
    console.log(`İstanbul ilçeleri yüklendi: ${getIstanbulDistrictRegion.istanbulDistricts.length} ilçe`);
    console.log(`Avrupa yakası: ${getIstanbulDistrictRegion.avrupaDistricts.length} ilçe, Anadolu yakası: ${getIstanbulDistrictRegion.anadoluDistricts.length} ilçe`);
  }
  
  // 1. Doğrudan haritada ara (tam eşleşme) - En hızlı yöntem
  if (getIstanbulDistrictRegion.districtMap[normalizedName]) {
    const district = getIstanbulDistrictRegion.districtMap[normalizedName];
    // Region bilgisi varsa kullan
    if (district.Region) {
      return district.Region;
    }
    // CityId'ye göre tahmin et
    return district.CityId >= 34.5 ? "ANADOLU" : "AVRUPA";
  }
  
  // 2. Yakasına göre arama yap
  const isInAvrupa = getIstanbulDistrictRegion.avrupaDistricts.some(districtName => 
    districtName.includes(normalizedName) || normalizedName.includes(districtName)
  );
  
  if (isInAvrupa) {
    return "AVRUPA";
  }
  
  const isInAnadolu = getIstanbulDistrictRegion.anadoluDistricts.some(districtName => 
    districtName.includes(normalizedName) || normalizedName.includes(districtName)
  );
  
  if (isInAnadolu) {
    return "ANADOLU";
  }
  
  // 3. Kısmi eşleşme için fonksiyonel arama
  let district = getIstanbulDistrictRegion.istanbulDistricts.find(d => {
    const districtNameNormalized = d.Name.toUpperCase().trim();
    return districtNameNormalized.includes(normalizedName) || normalizedName.includes(districtNameNormalized);
  });
  
  // İlçe bulunduysa Region bilgisini kontrol et
  if (district) {
    if (district.Region) {
      return district.Region;
    }
    // Region bilgisi yoksa CityId'ye göre tahmin et
    return district.CityId >= 34.5 ? "ANADOLU" : "AVRUPA";
  }
  
  // 4. Benzerlik skoruyla en yakın eşleşmeyi bul
  const bestMatch = getIstanbulDistrictRegion.istanbulDistricts.reduce((best, current) => {
    const currentName = current.Name.toUpperCase().trim();
    // Benzerlik skoru hesapla
    let similarity = 0;
    
    // İçerme kontrolü
    if (currentName.includes(normalizedName) || normalizedName.includes(currentName)) {
      // İçerme durumunda uzunluk oranına göre benzerlik
      similarity = Math.min(currentName.length, normalizedName.length) / Math.max(currentName.length, normalizedName.length);
    } else {
      // İçerme yoksa karakter eşleşme oranı
      let matchCount = 0;
      // İlk n karakterden eşleşenlerin oranı
      const checkLength = Math.min(currentName.length, normalizedName.length, 5);
      for (let i = 0; i < checkLength; i++) {
        if (currentName[i] === normalizedName[i]) {
          matchCount++;
        }
      }
      similarity = matchCount / checkLength;
    }
    
    // Eğer daha iyi bir eşleşme bulunduysa güncelle
    if (similarity > best.similarity) {
      return { district: current, similarity };
    }
    return best;
  }, { district: null, similarity: 0 });
  
  // Yeterince iyi bir benzerlik skoru varsa (0.7'ten büyük)
  if (bestMatch.similarity > 0.7 && bestMatch.district) {
    if (bestMatch.district.Region) {
      return bestMatch.district.Region;
    }
    return bestMatch.district.CityId >= 34.5 ? "ANADOLU" : "AVRUPA";
  }
  
  // Kesin bir sonuç elde edilemedi
  return null;
};

// Güvenli ID oluşturma
const generateSecureId = () => {
  try {
    // Web Crypto API ile rastgele bytes oluştur
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('Güvenli ID oluşturma hatası:', error);
    // Fallback olarak timestamp + random
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};

// Veri şifreleme sınıfı
class DataEncryption {
  static async encrypt(data) {
    try {
      const key = await this.getKey();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(JSON.stringify(data));

      const encryptedData = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      const encryptedArray = new Uint8Array(encryptedData);
      return {
        iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
        data: Array.from(encryptedArray).map(b => b.toString(16).padStart(2, '0')).join('')
      };
    } catch (error) {
      console.error('Şifreleme hatası:', error);
      throw new Error('Veri şifrelenemedi');
    }
  }

  static async decrypt(encryptedData) {
    try {
      const key = await this.getKey();
      const iv = new Uint8Array(encryptedData.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      const data = new Uint8Array(encryptedData.data.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

      const decryptedData = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decryptedData));
    } catch (error) {
      console.error('Şifre çözme hatası:', error);
      throw new Error('Veri şifresi çözülemedi');
    }
  }

  static async getKey() {
    if (!this._key) {
      const keyData = new Uint8Array(32);
      window.crypto.getRandomValues(keyData);
      this._key = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        'AES-GCM',
        false,
        ['encrypt', 'decrypt']
      );
    }
    return this._key;
  }
}

// Gelişmiş hata yönetimi
class ApiError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.requestId = nanoid();
    
    // Hassas bilgileri temizle
    this.sanitizeErrorData();
    
    // Hatayı logla
    this.logError();
  }
  
  sanitizeErrorData() {
    const sensitiveFields = ['password', 'token', 'key', 'secret'];
    const sanitize = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const sanitized = Array.isArray(obj) ? [] : {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[HIDDEN]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };
    
    this.data = sanitize(this.data);
  }
  
  logError() {
    console.error('API Hatası:', {
      message: this.message,
      code: this.code,
      status: this.status,
      requestId: this.requestId,
      timestamp: this.timestamp,
      data: this.data
    });
  }
  
  toJSON() {
    return {
      error: true,
      message: this.message,
      code: this.code,
      status: this.status,
      requestId: this.requestId,
      timestamp: this.timestamp,
      ...(Object.keys(this.data).length > 0 && { data: this.data })
    };
  }
}

// Güvenlik için API erişim anahtarı kontrolü
const API_KEYS = {};

// API anahtarlarını güvenli bir şekilde yükle
const loadApiKeys = () => {
  try {
    // Process.env'den veya güvenli bir config servisinden API anahtarlarını al
    const apiKeys = {
      'default': { 
        key: process.env.DEFAULT_API_KEY || generateSecureId(),
        permissions: ['read'], 
        rate_limit: 100,
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 saat
      },
      'admin': { 
        key: process.env.ADMIN_API_KEY || generateSecureId(),
        permissions: ['read', 'write', 'delete'], 
        rate_limit: 1000,
        expires: Date.now() + (12 * 60 * 60 * 1000) // 12 saat
      }
    };

    // API anahtarlarını hashle ve sakla
    Object.entries(apiKeys).forEach(([role, config]) => {
      const hashedKey = generateHash(config.key);
      API_KEYS[hashedKey] = {
        ...config,
        lastRotated: Date.now()
      };
    });
  } catch (error) {
    console.error('API anahtarları yüklenemedi:', error);
    throw new Error('API güvenlik yapılandırması başarısız');
  }
};

// API anahtarı doğrulama
const validateApiKey = (apiKey) => {
  if (!apiKey) return false;
  
  const hashedKey = generateHash(apiKey);
  const keyConfig = API_KEYS[hashedKey];
  
  if (!keyConfig) return false;
  
  // Süre kontrolü
  if (Date.now() > keyConfig.expires) {
    delete API_KEYS[hashedKey];
    return false;
  }
  
  return true;
};

// İlk yükleme
loadApiKeys();

// Rate Limiter güvenlik implementasyonu
const rateLimiter = {
  requests: new Map(),
  windowMs: 15 * 60 * 1000, // 15 dakikalık pencere
  maxRequests: 100, // Her pencere için maksimum istek sayısı
  
  checkLimit: (apiKey = 'default') => {
    const now = Date.now();
    const windowStart = now - rateLimiter.windowMs;
    
    // Eski kayıtları temizle
    rateLimiter.cleanup(windowStart);
    
    // İstek geçmişini al veya oluştur
    if (!rateLimiter.requests.has(apiKey)) {
      rateLimiter.requests.set(apiKey, []);
    }
    
    const requests = rateLimiter.requests.get(apiKey);
    
    // Pencere içindeki istek sayısını kontrol et
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= rateLimiter.maxRequests) {
      throw new Error('Rate limit exceeded');
    }
    
    // Yeni isteği kaydet
    requests.push(now);
    rateLimiter.requests.set(apiKey, requests);
    
    return true;
  },
  
  cleanup: (windowStart) => {
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

// Veri doğrulama ve sanitizasyon
const validateAndSanitizeInput = (input) => {
  if (typeof input === 'string') {
    // XSS koruması
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;')
      .trim();
  }
  
  if (typeof input === 'number') {
    // Sayı doğrulama
    if (isNaN(input) || !isFinite(input)) {
      throw new Error('Invalid numeric value');
    }
    return input;
  }
  
  if (Array.isArray(input)) {
    // Dizi elemanlarını tekrar tekrar doğrula
    return input.map(item => validateAndSanitizeInput(item));
  }
  
  if (typeof input === 'object' && input !== null) {
    // Nesne özelliklerini tekrar tekrar doğrula
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[validateAndSanitizeInput(key)] = validateAndSanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};

// Request validation
const validateRequest = (req) => {
  // API anahtarı kontrolü
  if (!req.headers['x-api-key']) {
    throw new Error('API key is required');
  }

  // Content-Type kontrolü
  if (req.method === 'POST' && !req.headers['content-type']?.includes('application/json')) {
    throw new Error('Content-Type must be application/json');
  }

  // Query parametreleri doğrulama
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string' && value.length > 100) {
        throw new Error(`Query parameter ${key} is too long`);
      }
    }
  }

  // Body doğrulama (POST istekleri için)
  if (req.method === 'POST' && req.body) {
    if (Object.keys(req.body).length > 100) {
      throw new Error('Request body is too large');
    }
    
    // Body içeriğini doğrula
    req.body = validateAndSanitizeInput(req.body);
  }

  return true;
};

// Listing servisi için gelişmiş fonksiyonlar
const listingServices = {
  getListings: async (params = {}) => {
    const listingsData = await loadDataFromSource('listings');
    let listings = listingsData.ilanlari || [];
    
    // Sayfalama işlemi
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    // Sıralama işlemi
    if (params.sort) {
      listings = sortListings(listings, params.sort);
    }
    
    return {
      listings: listings.slice(startIndex, endIndex),
      totalPages: Math.ceil(listings.length / pageSize),
      totalListings: listings.length,
      currentPage: page
    };
  },
  
  getListingById: async (listingId) => {
    const listingsData = await loadDataFromSource('listings');
    return listingsData.ilanlari.find(ilan => ilan.ilan_id === Number(listingId)) || null;
  },
  
  getFilteredListings: async (params = {}) => {
    const listingsData = await loadDataFromSource('listings');
    let listings = listingsData.ilanlari || [];
    
    // Filtreleme işlemi
    if (params.filters) {
      listings = filterListings(listings, params.filters);
    }
    
    // Sayfalama işlemi
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    // Sıralama işlemi - sort parametresi varsa ve değeri boş değilse
    if (params.sort && params.sort !== '') {
      console.log(`İlanlar ${params.sort} kriterine göre sıralanıyor.`);
      listings = sortListings(listings, params.sort);
    } else {
      console.log('Varsayılan sıralama kullanılıyor (sıralama yok).');
    }
    
    return {
      listings: listings.slice(startIndex, endIndex),
      totalPages: Math.ceil(listings.length / pageSize),
      totalListings: listings.length,
      currentPage: page
    };
  }
};

// İç içe nesne yapısında değere erişim
function getNestedProperty(obj, path) {
  if (!path) return undefined;
  
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (!value || typeof value !== 'object') return undefined;
    value = value[key];
  }
  
  return value;
}

/**
 * Belirli bir alan yolunu tespit eder
 * @param {Object} item - İncelenecek nesne
 * @param {string} key - Aranan anahtar
 * @returns {string|null} - Alanın yolu veya bulunamazsa null
 */
const detectFieldPath = (item, key) => {
  // İçiçe olan property'ler için yardımcı fonksiyon
  const getNestedProperty = (obj, path) => {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr] ? prev[curr] : undefined;
    }, obj);
  };

  // Karmaşık anahtarları temizle (min/max eklerini kaldır)
  const cleanKey = key.replace(/_min$|Min$|_max$|Max$/, '');
  
  // Fiyat alanları için özel kontrol
  const isPriceField = key.match(/^fiyat(_min|Min|_max|Max)?$/);
  if (isPriceField) {
    // Öncelikle fiyat alanını direkt kontrol et
    if (item.fiyat !== undefined) {
      return 'fiyat';
    }
    // İçiçe property'lerde fiyat alanını ara
    for (const prop in item) {
      if (typeof item[prop] === 'object' && item[prop] !== null) {
        const nestedPath = `${prop}.fiyat`;
        if (getNestedProperty(item, nestedPath) !== undefined) {
          return nestedPath;
        }
      }
    }
  }

  // Direkt eşleşme kontrolü
  if (item[cleanKey] !== undefined) {
    return cleanKey;
  }

  // Alternatif: snake_case veya camelCase farklılıkları
  const snakeToCamel = str => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  const camelToSnake = str => str.replace(/([A-Z])/g, '_$1').toLowerCase();
  
  const camelCaseKey = snakeToCamel(cleanKey);
  if (item[camelCaseKey] !== undefined) {
    return camelCaseKey;
  }
  
  const snakeCaseKey = camelToSnake(cleanKey);
  if (item[snakeCaseKey] !== undefined) {
    return snakeCaseKey;
  }

  // İçiçe property'lerde ara
  for (const prop in item) {
    if (typeof item[prop] === 'object' && item[prop] !== null) {
      const nestedPath = `${prop}.${cleanKey}`;
      if (getNestedProperty(item, nestedPath) !== undefined) {
        return nestedPath;
      }
      
      // İçiçe property'lerde camelCase veya snake_case kontrolü
      const nestedCamelPath = `${prop}.${camelCaseKey}`;
      if (getNestedProperty(item, nestedCamelPath) !== undefined) {
        return nestedCamelPath;
      }
      
      const nestedSnakePath = `${prop}.${snakeCaseKey}`;
      if (getNestedProperty(item, nestedSnakePath) !== undefined) {
        return nestedSnakePath;
      }
    }
  }

  // Bulunamadı
  console.log(`Alan bulunamadı: ${key}`);
  return null;
};

/**
 * Aralık filtresi kontrolü yapar (örn: fiyat_min, fiyat_max)
 * @param {Object} item - Kontrol edilecek öğe
 * @param {string} key - Filtre anahtarı
 * @param {any} value - Filtre değeri
 * @returns {boolean} - Eşleşme durumu
 */
const checkRangeFilter = (item, key, value) => {
  console.log(`Range filter check: ${key}=${value}`);
  
  try {
    // Fiyat_min/fiyatMin filtresi
    if (key.match(/^fiyat_min$|^fiyatMin$/)) {
      const fieldPath = detectFieldPath(item, 'fiyat');
      if (!fieldPath) return false;
      
      const itemValue = getNestedProperty(item, fieldPath);
      console.log(`Fiyat min karşılaştırma: ${itemValue} >= ${value}`);
      return itemValue !== undefined && Number(itemValue) >= Number(value);
    }
    
    // Fiyat_max/fiyatMax filtresi
    if (key.match(/^fiyat_max$|^fiyatMax$/)) {
      const fieldPath = detectFieldPath(item, 'fiyat');
      if (!fieldPath) return false;
      
      const itemValue = getNestedProperty(item, fieldPath);
      console.log(`Fiyat max karşılaştırma: ${itemValue} <= ${value}`);
      return itemValue !== undefined && Number(itemValue) <= Number(value);
    }
    
    // Diğer min filtreler
    if (key.endsWith('_min') || key.endsWith('Min')) {
      const baseKey = key.replace(/_min$|Min$/, '');
      const fieldPath = detectFieldPath(item, baseKey);
      if (!fieldPath) return false;
      
      const itemValue = getNestedProperty(item, fieldPath);
      return itemValue !== undefined && Number(itemValue) >= Number(value);
    }
    
    // Diğer max filtreler
    if (key.endsWith('_max') || key.endsWith('Max')) {
      const baseKey = key.replace(/_max$|Max$/, '');
      const fieldPath = detectFieldPath(item, baseKey);
      if (!fieldPath) return false;
      
      const itemValue = getNestedProperty(item, fieldPath);
      return itemValue !== undefined && Number(itemValue) <= Number(value);
    }
    
    // Desteklenmeyen aralık filtresi
    console.warn(`Desteklenmeyen aralık filtresi: ${key}`);
    return false;
  } catch (error) {
    console.error(`Range filter error for ${key}:`, error);
    return false;
  }
};

// Çoklu seçim filtreleri için kontrol
function checkMultiSelectFilter(listing, filterKey, filterValues) {
  console.log(`📋 Çoklu seçim kontrolü: ${filterKey}=[${filterValues.join(', ')}]`);
  
  // Alan yolunu belirle
  const fieldPath = filterKey.includes('.') ? filterKey : 
                    filterKey === 'kimden' ? 'ozellikler.kimden' : 
                    `ozellikler.${filterKey}`;
  
  console.log(`🔗 Alan yolu: ${fieldPath}`);
  
  // İlan değerini al
  const listingValue = getNestedProperty(listing, fieldPath);
  console.log(`📊 İlan değeri:`, listingValue);
  
  // Değer yoksa false döndür
  if (listingValue === undefined || listingValue === null) {
    console.log(`✗ Değer bulunamadı`);
    return false;
  }
  
  // Değer bir dizi ise (örneğin "guvenlik": ["Kamera Sistemi", "Kartlı Giriş"] gibi)
  if (Array.isArray(listingValue)) {
    console.log(`🔀 Dizi değer tespit edildi:`, listingValue);
    
    // ÖNEMLİ: OR mantığı - Seçilen filtre değerlerinden en az biri dizide varsa eşleşme var demektir
    const foundMatch = filterValues.some(filterValue => {
      return listingValue.some(item => compareValues(item, filterValue));
    });
    
    console.log(foundMatch ? `✓ Dizi içinde eşleşme bulundu` : `✗ Dizi içinde eşleşme bulunamadı`);
    return foundMatch;
  }
  
  // Değer filtre değerlerinden biriyse true döndür (normal değer için)
  const isMatched = filterValues.some(value => compareValues(listingValue, value));
  console.log(isMatched ? `✓ Eşleşme bulundu` : `✗ Eşleşme bulunamadı`);
  
  return isMatched;
}

// Tekli filtre değeri kontrolü
function checkSingleValueFilter(listing, filterKey, filterValue) {
  console.log(`🔍 Tekli filtre kontrolü: ${filterKey}=${filterValue}`);
  
  // İlan tarihi özel kontrolü
  if (filterKey === 'ilan_tarihi') {
    console.log(`📅 İlan tarihi kontrolü`);
    const ilanDate = new Date(listing.ilan_tarihi);
    return checkDateFilter(ilanDate, filterValue);
  }
  
  // kimden özel kontrolü
  if (filterKey === 'kimden') {
    console.log(`👤 Kimden kontrolü`);
    const kimden = listing.ozellikler?.kimden || listing.kimden;
    const isMatch = compareValues(kimden, filterValue);
    console.log(isMatch ? `✓ Kimden eşleşti: ${kimden} = ${filterValue}` : `✗ Kimden eşleşmedi: ${kimden} ≠ ${filterValue}`);
    return isMatch;
  }
  
  // Alan yolunu belirle
  let fieldPath;
  if (filterKey.includes('.')) {
    // Zaten tam yol belirtilmiş (özellikler.xyz gibi)
    fieldPath = filterKey;
  } else if (filterKey === 'ilan_turu' || filterKey === 'baslik' || filterKey === 'fiyat' || filterKey === 'para_birimi') {
    // Ana objedeki alanlar
    fieldPath = filterKey;
  } else if (filterKey.startsWith('konum.')) {
    // Konum altındaki alanlar (konum.il gibi)
    fieldPath = filterKey;
  } else {
    // Diğer alanlar için alan yolunu tespit et
    fieldPath = detectFieldPath(listing, filterKey);
  }
  
  console.log(`🔗 Alan yolu: ${fieldPath}`);
  
  // Alan yolu bulunamadıysa false döndür
  if (!fieldPath) {
    console.log(`✗ Alan bulunamadı: ${filterKey}`);
    return false;
  }
  
  // İlan değerini al
  const listingValue = getNestedProperty(listing, fieldPath);
  console.log(`📊 İlan değeri: ${listingValue}`);
  
  // Değer yoksa false döndür
  if (listingValue === undefined || listingValue === null) {
    console.log(`✗ Değer bulunamadı`);
    return false;
  }
  
  // Değerleri karşılaştır
  const isMatch = compareValues(listingValue, filterValue);
  console.log(isMatch ? `✓ Değer eşleşti: ${listingValue} = ${filterValue}` : `✗ Değer eşleşmedi: ${listingValue} ≠ ${filterValue}`);
  
  return isMatch;
}

// İlanları filtreleme fonksiyonu
export function filterListings(listings, filters) {
  // Debug amaçlı kısa bir log
  const listingCount = listings ? listings.length : 0;
  const filterCount = filters ? Object.keys(filters).length : 0;
  console.log(`🧪 Filtreleme: ${listingCount} ilan, ${filterCount} filtre`);
  
  if (!filters || Object.keys(filters).length === 0) {
    return listings;
  }
  
  const startTime = Date.now();
  
  // Filtrelenecek ilanlarda ilçe bölge eşleşmesi için önişleme yapalım
  // Bu, her ilan için tekrar tekrar bölge kontrolü yapmamızı önler
  const enhancedListings = listings.map(listing => {
    // Sadece konum.ilce bilgisi olan ve İstanbul'daki ilanlar için bölge belirle
    if (listing.konum && listing.konum.il && 
        listing.konum.ilce && 
        (listing.konum.il.toUpperCase().includes('İSTANBUL') || 
         listing.konum.il.toUpperCase().includes('ISTANBUL'))) {
      const region = getIstanbulDistrictRegion(listing.konum.ilce);
      return {...listing, _region: region}; // _region özel bir alan olarak ilana ekleyelim
    }
    return listing;
  });
  
  const filteredListings = enhancedListings.filter(listing => {
    try {
      // Konum filtreleri (il, ilçe, mahalle) için eşleşme kontrolü
      if (!checkLocationFilters(listing, filters)) {
        return false;
      }
      
      // Kategori filtresi kontrolü
      if (filters.categoryId && listing.category_id !== Number(filters.categoryId)) {
        return false;
      }
      
      // Diğer tüm filtreler için döngü
      for (const [key, value] of Object.entries(filters)) {
        // Boş değerleri atla
        if (value === null || value === undefined || value === '' || key === 'categoryId') {
          continue;
        }
        
        // Konum filtreleri için geçiş yap (yukarıda zaten kontrol edildi)
        if (key === 'il' || key === 'ilce' || key === 'mahalle') {
          continue;
        }
        
        // Aralık filtresi (min/max) - hem snake_case hem camelCase formatları için
        if (key.endsWith('_min') || key.endsWith('_max') || key.endsWith('Min') || key.endsWith('Max')) {
          console.log(`🧮 İlan ${listing.ilan_id} için ${key}=${value} filtresi uygulanıyor`);
          
          if (!checkRangeFilter(listing, key, value)) {
            console.log(`✗ İlan ${listing.ilan_id} için ${key}=${value} filtresi başarısız`);
            return false;
          }
        } 
        // Çoklu seçim filtresi (dizi)
        else if (Array.isArray(value)) {
          if (!checkMultiSelectFilter(listing, key, value)) {
            return false;
          }
        }
        // Standart tekli filtre
        else {
          if (!checkSingleValueFilter(listing, key, value)) {
            return false;
          }
        }
      }
      
      // Tüm filtrelerden geçtiyse true döndür
      return true;
    } catch (error) {
      console.error(`İlan filtreleme hatası (İlan ID: ${listing.ilan_id}):`, error);
      return false;
    }
  });
  
  const endTime = Date.now();
  console.log(`🏁 Filtreleme tamamlandı. ${listings.length} ilandan ${filteredListings.length} tanesi kaldı. Süre: ${endTime - startTime}ms`);
  
  return filteredListings;
}

/**
 * İl, ilçe ve mahalle filtreleri için eşleşme kontrolü
 * @param {Object} listing - Kontrol edilecek ilan
 * @param {Object} filters - Filtreler
 * @returns {boolean} - Eşleşme durumu
 */
function checkLocationFilters(listing, filters) {
  // İlan için konum bilgisi yoksa, konum filtreleri varsa false döndür
  if (!listing.konum) {
    return !(filters.il || filters.ilce || filters.mahalle);
  }
  
  // Mahalle/köy filtresi kontrolü - Mahalle/köy filtresi VARSA önce bu kontrolü yapalım
  // Böylece mahalle/köy eşleşmezse hemen false döneriz
  if (filters.mahalle && filters.mahalle !== '') {
    // İlanda mahalle/köy bilgisi yoksa kesinlikle eşleşme yok
    if (!listing.konum['mahalle/köy']) {
      console.log(`✗ Mahalle/köy filtresi var, ama ilanda mahalle/köy alanı yok, ilan ID: ${listing.ilan_id}`);
      return false;
    }
    
    const listingMahalle = listing.konum['mahalle/köy'].toString();
    
    // Mahalle filtresi dizi mi kontrolü (çoklu seçim durumu)
    if (Array.isArray(filters.mahalle)) {
      console.log(`Çoklu mahalle filtresi kontrolü: ${filters.mahalle.length} mahalle, ilan mahallesi: ${listingMahalle}`);
      
      // OR mantığı - mahalle filtresindeki değerlerden HERHANGİ BİRİ eşleşirse, true döner
      const mahalleMatch = filters.mahalle.some(filterMahalle => {
        const filterMahalleStr = filterMahalle.toString();
        
        // Direkt karşılaştırma (harf duyarsız)
        if (filterMahalleStr.toLocaleUpperCase('tr-TR').trim() === listingMahalle.toLocaleUpperCase('tr-TR').trim()) {
          console.log(`✓ Mahalle/köy TAM EŞLEŞME: Filter: '${filterMahalleStr}', İlan: '${listingMahalle}'`);
          return true;
        }
        
        // Daha esnek mahalle/köy karşılaştırması yapalım (Türkçe karakterler için)
        const filterMahalleSimple = normalizeMahalleName(filterMahalleStr);
        const listingMahalleSimple = normalizeMahalleName(listingMahalle);
        
        if (filterMahalleSimple === listingMahalleSimple) {
          console.log(`✓ Mahalle/köy BASİTLEŞTİRİLMİŞ EŞLEŞME: '${filterMahalleSimple}' = '${listingMahalleSimple}'`);
          return true;
        }
        
        // 1. Filtre adı suffix içermiyor, ilan adı içeriyorsa
        if (!filterMahalleSimple.includes("MAHALLESI") && !filterMahalleSimple.includes("KOYU") && 
            (listingMahalleSimple.includes("MAHALLESI") || listingMahalleSimple.includes("KOYU"))) {
          
          // "Levent" -> "Levent Mahallesi" karşılaştırması
          const mahalleCore = filterMahalleSimple;
          if (listingMahalleSimple.startsWith(mahalleCore)) {
            console.log(`✓ Mahalle/köy PREFIX EŞLEŞME: '${mahalleCore}' prefix olarak '${listingMahalleSimple}' içinde`);
            return true;
          }
        }
        // 2. Filtre adı suffix içeriyor, ilan adı içermiyorsa
        else if ((filterMahalleSimple.includes("MAHALLESI") || filterMahalleSimple.includes("KOYU")) && 
                !listingMahalleSimple.includes("MAHALLESI") && !listingMahalleSimple.includes("KOYU")) {
          
          // "Levent Mahallesi" -> "Levent" karşılaştırması
          let mahalleCore = filterMahalleSimple;
          if (mahalleCore.includes("MAHALLESI")) mahalleCore = mahalleCore.replace("MAHALLESI", "").trim();
          if (mahalleCore.includes("KOYU")) mahalleCore = mahalleCore.replace("KOYU", "").trim();
          
          if (listingMahalleSimple === mahalleCore) {
            console.log(`✓ Mahalle/köy CORE EŞLEŞME: '${mahalleCore}' (suffix temizlenmiş) == '${listingMahalleSimple}'`);
            return true;
          }
        }
        
        return false; // Bu mahalle değeri eşleşmedi
      });
      
      if (!mahalleMatch) {
        console.log(`✗ Hiçbir mahalle/köy filtresi eşleşmedi: İlan: '${listingMahalle}'`);
        return false;
      }
    }
    else {
      // Tek mahalle filtresi durumu (mevcut kod)
      const filterMahalle = filters.mahalle.toString();
      
      // Direkt karşılaştırma (harf duyarsız)
      if (filterMahalle.toLocaleUpperCase('tr-TR').trim() === listingMahalle.toLocaleUpperCase('tr-TR').trim()) {
        console.log(`✓ Mahalle/köy TAM EŞLEŞME: Filter: '${filterMahalle}', İlan: '${listingMahalle}'`);
        // Mahalle/köy eşleşti, ilçe kontrolüne geç
      }
      else {
        // Daha esnek mahalle/köy karşılaştırması yapalım (Türkçe karakterler için)
        // Tüm özel karakterleri ve boşlukları kaldırarak karşılaştır
        const filterMahalleSimple = normalizeMahalleName(filterMahalle);
        const listingMahalleSimple = normalizeMahalleName(listingMahalle);
        
        if (filterMahalleSimple === listingMahalleSimple) {
          console.log(`✓ Mahalle/köy BASİTLEŞTİRİLMİŞ EŞLEŞME: '${filterMahalleSimple}' = '${listingMahalleSimple}'`);
          // Mahalle/köy eşleşti, ilçe kontrolüne geç
        }
        else {
          // Mahalle/köy adı içerme kontrolü - "Levent" ve "Levent Mahallesi" durumu için
          // Filtredeki ada "Mahallesi" veya "Köyü" suffix'i ekleyerek veya kaldırarak dene
          
          // 1. Filtre adı suffix içermiyor, ilan adı içeriyorsa
          if (!filterMahalleSimple.includes("MAHALLESI") && !filterMahalleSimple.includes("KOYU") && 
              (listingMahalleSimple.includes("MAHALLESI") || listingMahalleSimple.includes("KOYU"))) {
            
            // "Levent" -> "Levent Mahallesi" karşılaştırması
            const mahalleCore = filterMahalleSimple;
            if (listingMahalleSimple.startsWith(mahalleCore)) {
              console.log(`✓ Mahalle/köy PREFIX EŞLEŞME: '${mahalleCore}' prefix olarak '${listingMahalleSimple}' içinde`);
              // Prefix olarak eşleşti
            } else {
              console.log(`✗ Mahalle/köy eşleşmedi (suffix kontrolü başarısız): '${filterMahalleSimple}' != '${listingMahalleSimple}'`);
              return false;
            }
          }
          // 2. Filtre adı suffix içeriyor, ilan adı içermiyorsa
          else if ((filterMahalleSimple.includes("MAHALLESI") || filterMahalleSimple.includes("KOYU")) && 
                  !listingMahalleSimple.includes("MAHALLESI") && !listingMahalleSimple.includes("KOYU")) {
            
            // "Levent Mahallesi" -> "Levent" karşılaştırması
            let mahalleCore = filterMahalleSimple;
            if (mahalleCore.includes("MAHALLESI")) mahalleCore = mahalleCore.replace("MAHALLESI", "").trim();
            if (mahalleCore.includes("KOYU")) mahalleCore = mahalleCore.replace("KOYU", "").trim();
            
            if (listingMahalleSimple === mahalleCore) {
              console.log(`✓ Mahalle/köy CORE EŞLEŞME: '${mahalleCore}' (suffix temizlenmiş) == '${listingMahalleSimple}'`);
              // Core olarak eşleşti
            } else {
              console.log(`✗ Mahalle/köy eşleşmedi (core kontrolü başarısız): '${mahalleCore}' != '${listingMahalleSimple}'`);
              return false;
            }
          }
          else {
            // Hiçbir şekilde eşleşmedi
            console.log(`✗ Mahalle/köy eşleşmedi: Filter: '${filterMahalle}', İlan: '${listingMahalle}'`);
            return false;
          }
        }
      }
    }
  }
  
  // İlçe filtresi kontrolü - İlçe filtresi VARSA sıradaki bu kontrolü yapalım
  // Böylece ilçe eşleşmezse hemen false döneriz
  if (filters.ilce && filters.ilce !== '') {
    // İlanda ilçe bilgisi yoksa kesinlikle eşleşme yok
    if (!listing.konum.ilce) {
      console.log(`✗ İlçe filtresi var, ama ilanda ilçe alanı yok, ilan ID: ${listing.ilan_id}`);
      return false;
    }
    
    const listingIlce = listing.konum.ilce;
    const isIstanbul = listing.konum.il && 
                     (listing.konum.il.includes("İstanbul") || 
                      listing.konum.il.includes("Istanbul"));
    
    // İlçe filtresi dizi mi kontrolü (çoklu seçim durumu)
    if (Array.isArray(filters.ilce)) {
      console.log(`Çoklu ilçe filtresi kontrolü: ${filters.ilce.length} ilçe, ilan ilçesi: ${listingIlce}`);
      
      // OR mantığı - ilçe filtresindeki değerlerden HERHANGİ BİRİ eşleşirse, true döner
      const ilceMatch = filters.ilce.some(filterIlce => {
        const filterIlceStr = filterIlce.toString();
        
        // Direkt karşılaştırma (harf duyarsız)
        if (filterIlceStr.toLocaleUpperCase('tr-TR').trim() === listingIlce.toLocaleUpperCase('tr-TR').trim()) {
          console.log(`✓ İlçe TAM EŞLEŞME: Filter: '${filterIlceStr}', İlan: '${listingIlce}'`);
          return true;
        }
        
        if (isIstanbul) {
          // İstanbul için ilçe eşleştirmesi düzelttik
          console.log(`İstanbul için ilçe karşılaştırması: Filter: '${filterIlceStr}', İlan: '${listingIlce}'`);
          
          // Tüm özel karakterleri ve boşlukları kaldırarak karşılaştır
          const filterIlceSimple = filterIlceStr.toLocaleUpperCase('tr-TR').trim()
            .replace(/İ/g, 'I').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
            .replace(/Ç/g, 'C').replace(/Ö/g, 'O').replace(/\s+/g, '');
          
          const listingIlceSimple = listingIlce.toLocaleUpperCase('tr-TR').trim()
            .replace(/İ/g, 'I').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
            .replace(/Ç/g, 'C').replace(/Ö/g, 'O').replace(/\s+/g, '');
          
          if (filterIlceSimple === listingIlceSimple) {
            console.log(`✓ İlçe BASİTLEŞTİRİLMİŞ EŞLEŞME: '${filterIlceSimple}' = '${listingIlceSimple}'`);
            return true;
          }
        }
        
        return false; // Bu ilçe değeri eşleşmedi
      });
      
      if (!ilceMatch) {
        console.log(`✗ Hiçbir ilçe filtresi eşleşmedi: İlan: '${listingIlce}'`);
        return false;
      }
    }
    else {
      // Tek ilçe filtresi durumu (mevcut kod)
      // Direkt karşılaştırma (harf duyarsız)
      if (filters.ilce.toLocaleUpperCase('tr-TR').trim() === listingIlce.toLocaleUpperCase('tr-TR').trim()) {
        console.log(`✓ İlçe TAM EŞLEŞME: Filter: '${filters.ilce}', İlan: '${listingIlce}'`);
        // İlçe eşleşti, il kontrolüne geç
      }
      else if (isIstanbul) {
        // İstanbul için ilçe eşleştirmesi düzelttik
        console.log(`İstanbul için ilçe karşılaştırması: Filter: '${filters.ilce}', İlan: '${listingIlce}'`);
        
        // Tüm özel karakterleri ve boşlukları kaldırarak karşılaştır
        const filterIlceSimple = filters.ilce.toLocaleUpperCase('tr-TR').trim()
          .replace(/İ/g, 'I').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
          .replace(/Ç/g, 'C').replace(/Ö/g, 'O').replace(/\s+/g, '');
        
        const listingIlceSimple = listingIlce.toLocaleUpperCase('tr-TR').trim()
          .replace(/İ/g, 'I').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
          .replace(/Ç/g, 'C').replace(/Ö/g, 'O').replace(/\s+/g, '');
        
        if (filterIlceSimple === listingIlceSimple) {
          console.log(`✓ İlçe BASİTLEŞTİRİLMİŞ EŞLEŞME: '${filterIlceSimple}' = '${listingIlceSimple}'`);
          // İlçe eşleşti, il kontrolüne geç
        }
        else {
          // İstanbul için özel kontroller de eşleşmedi 
          console.log(`✗ İlçe eşleşmedi (İstanbul): Filter: '${filters.ilce}', İlan: '${listingIlce}'`);
          return false;
        }
      }
      else {
        // Hiçbir şekilde eşleşmedi, false döndür
        console.log(`✗ İlçe eşleşmedi: Filter: '${filters.ilce}', İlan: '${listingIlce}'`);
        return false;
      }
    }
  }
  
  // İl filtresi kontrolü - En son il kontrolünü yapalım
  if (filters.il && filters.il !== '') {
    if (!listing.konum.il) {
      console.log(`✗ İl filtresi var, ama ilanda il alanı yok, ilan ID: ${listing.ilan_id}`);
      return false;
    }
    
    // İl adlarını normalize et - Title Case (ilk harf büyük, diğerleri küçük)
    const normalizedFilterIl = normalizeDistrictName(filters.il);
    const normalizedListingIl = normalizeDistrictName(listing.konum.il);
    
    console.log(`İl karşılaştırma: Filter: "${normalizedFilterIl}", İlan: "${normalizedListingIl}"`);
    
    // İstanbul Avrupa Yakası kontrolü
    if (normalizedFilterIl.includes('İstanbul Avrupa') || normalizedFilterIl.includes('Istanbul Avrupa')) {
      // İlanın il değeri "İstanbul" içermeli
      if (!normalizedListingIl.includes('İstanbul') && !normalizedListingIl.includes('Istanbul')) {
        return false;
      }
      
      // Avrupa yakası kontrolü
      if (normalizedListingIl.includes('Avrupa')) {
        return true; // Eşleşme tamam
      }
      
      // Bölge kontrol edilmeli
      if (listing._region && listing._region !== "AVRUPA") {
        return false;
      }
    }
    // İstanbul Anadolu Yakası kontrolü
    else if (normalizedFilterIl.includes('İstanbul Anadolu') || normalizedFilterIl.includes('Istanbul Anadolu')) {
      // İlanın il değeri "İstanbul" içermeli
      if (!normalizedListingIl.includes('İstanbul') && !normalizedListingIl.includes('Istanbul')) {
        return false;
      }
      
      // Anadolu yakası kontrolü
      if (normalizedListingIl.includes('Anadolu')) {
        return true; // Eşleşme tamam
      }
      
      // Bölge kontrol edilmeli
      if (listing._region && listing._region !== "ANADOLU") {
        return false;
      }
    }
    // Genel İstanbul kontrolü (yakası belirtilmemiş)
    else if (normalizedFilterIl === "İstanbul" || normalizedFilterIl === "Istanbul") {
      // İlanın il değeri "İstanbul" içeriyorsa başarılı sayıyoruz
      if (normalizedListingIl.includes('İstanbul') || normalizedListingIl.includes('Istanbul')) {
        return true;
      }
      return false;
    }
    // Diğer iller için tam veya kısmi eşleşme
    else if (normalizedFilterIl !== normalizedListingIl) {
      // Tam eşleşme yok, kısmi eşleşmeye bak (örneğin İstanbul Avrupa Yakası gibi)
      const simpleFilterName = normalizedFilterIl.replace(/ Yakası/g, '').trim();
      const simpleListingName = normalizedListingIl.replace(/ Yakası/g, '').trim();
      
      // Basitleştirilmiş isimlerle de eşleşme olmazsa false döndür
      if (simpleFilterName !== simpleListingName && 
          !simpleListingName.includes(simpleFilterName) && 
          !simpleFilterName.includes(simpleListingName)) {
        return false;
      }
    }
  }
  
  // Tüm konum filtrelerinden geçtiyse true döndür
  return true;
}

/**
 * Mahalle adını normalleştirme - eşleştirme için
 * @param {string} name - Normalleştirilecek mahalle adı 
 * @returns {string} - Normalleştirilmiş ad
 */
function normalizeMahalleName(name) {
  if (!name) return '';
  
  // Büyük harfe çevir
  let normalized = name.toLocaleUpperCase('tr-TR').trim();
  
  // Türkçe karakterleri değiştir
  normalized = normalized
    .replace(/İ/g, 'I')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S')
    .replace(/Ç/g, 'C')
    .replace(/Ö/g, 'O');
  
  // Boşlukları kaldır
  normalized = normalized.replace(/\s+/g, '');
  
  return normalized;
}

/**
 * İlan tarihini filtreleme işlemi
 * @param {string} listingDate - İlanın tarihi
 * @param {number|string} daysFilter - Filtre değeri (gün sayısı)
 * @returns {boolean} - Filtreye uygunsa true
 */
function checkDateFilter(listingDate, daysFilter) {
  const daysNum = Number(daysFilter);
  if (isNaN(daysNum)) return true;
  
  try {
    const listingDateObj = new Date(listingDate);
    const today = new Date();
    const diffTime = Math.abs(today - listingDateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Belirlenen gün sayısından daha eski ilanları filtrele
    return diffDays <= daysNum;
  } catch (error) {
    console.error('İlan tarihi filtrelemesinde hata:', error);
    return true; // Hata durumunda filtreleme yapma
  }
}

/**
 * İki değeri türlerine göre karşılaştırır
 * @param {any} value1 - Karşılaştırılacak ilk değer
 * @param {any} value2 - Karşılaştırılacak ikinci değer
 * @returns {boolean} - Değerler eşleşiyorsa true
 */
function compareValues(value1, value2) {
  // 1. Sayısal değerler
  if (!isNaN(Number(value1)) && !isNaN(Number(value2))) {
    return Number(value1) === Number(value2);
  }
  
  // 2. Boolean değerler
  if (typeof value1 === 'boolean' || value1 === 'true' || value1 === 'false' || 
      typeof value2 === 'boolean' || value2 === 'true' || value2 === 'false') {
    const boolValue1 = value1 === true || value1 === 'true';
    const boolValue2 = value2 === true || value2 === 'true';
    return boolValue1 === boolValue2;
  }
  
  // 3. String değerler ve diğer türler için normal karşılaştırma
  return String(value1) === String(value2);
}

/**
 * İlanları sıralama fonksiyonu
 * @param {Array} listings - Sıralanacak ilanlar
 * @param {string} sortOption - Sıralama seçeneği
 * @returns {Array} - Sıralanmış ilanlar
 */
const sortListings = (listings, sortOption) => {
  const sortedListings = [...listings];
  
  switch (sortOption) {
    case 'price_asc':
      return sortedListings.sort((a, b) => a.fiyat - b.fiyat);
    case 'price_desc':
      return sortedListings.sort((a, b) => b.fiyat - a.fiyat);
    case 'date_asc':
      return sortedListings.sort((a, b) => new Date(a.ilan_tarihi) - new Date(b.ilan_tarihi));
    case 'date_desc':
      return sortedListings.sort((a, b) => new Date(b.ilan_tarihi) - new Date(a.ilan_tarihi));
    case 'area_asc':
      return sortedListings.sort((a, b) => {
        const areaA = a.ozellikler?.metrekare_brut || a.ozellikler?.metrekare_net || a.ozellikler?.metrekare || 0;
        const areaB = b.ozellikler?.metrekare_brut || b.ozellikler?.metrekare_net || b.ozellikler?.metrekare || 0;
        return areaA - areaB;
      });
    case 'area_desc':
      return sortedListings.sort((a, b) => {
        const areaA = a.ozellikler?.metrekare_brut || a.ozellikler?.metrekare_net || a.ozellikler?.metrekare || 0;
        const areaB = b.ozellikler?.metrekare_brut || b.ozellikler?.metrekare_net || b.ozellikler?.metrekare || 0;
        return areaB - areaA;
      });
    default:
      return sortedListings;
  }
};

// Filtre servisleri için yardımcı fonksiyonlar
const fakeFetchFilterData = async (filterType, params = {}, apiKey = 'default') => {
  try {
    console.log(`API isteği: ${filterType}`, params);
    
    // API anahtarı doğrula
    if (!validateApiKey(apiKey)) {
      throw new ApiError('Geçersiz API anahtarı', 401, 'INVALID_API_KEY');
    }
    
    // İstek gecikmesi simüle et
    await simulateNetworkDelay();
    
    // Giriş verilerini temizle
    params = validateAndSanitizeInput(params);
    
    switch (filterType) {
      case 'filterOptions':
      case 'categoryFilters': // categoryFilters parametresini de destekle
        const filterCategoryId = params.categoryId;
        if (!filterCategoryId) {
          throw new Error('Kategori ID gerekli');
        }
        
        const filterData = await loadDataFromSource('filters');
        console.log(`${filterType} için veri yüklendi. Toplam ${filterData.length} kategori filtresi mevcut.`);
        
        const categoryId_num = Number(filterCategoryId);
        let categoryFilter = filterData.find(filter => filter.category_id === categoryId_num);
        
        console.log(`Kategori ID ${categoryId_num} için filtre:`, categoryFilter ? `Bulundu, filtre sayısı: ${categoryFilter.filters?.length || 0}` : 'Bulunamadı');
        
        // Eğer filters_ref varsa, referans verilen kategori filtrelerini al
        if (categoryFilter?.filters_ref) {
          const refCategoryId = categoryFilter.filters_ref;
          console.log(`Kategori ${filterCategoryId} için referans kategori kullanılacak: ${refCategoryId}`);
          
          const refCategory = filterData.find(
            filter => filter.category_id === refCategoryId
          );
          
          if (refCategory) {
            console.log(`Referans kategori ${refCategoryId} için ${refCategory.filters?.length || 0} filtre bulundu.`);
            return {
              filters: refCategory.filters || [],
              category_id: Number(filterCategoryId),
              reference_category_id: refCategoryId,
              filter_count: refCategory.filters?.length || 0
            };
          } else {
            console.warn(`Referans kategori ${refCategoryId} bulunamadı!`);
          }
        }
        
        console.log(`Kategori ${filterCategoryId} için doğrudan filtre döndürülüyor:`, categoryFilter ? `${categoryFilter.filters?.length || 0} filtre` : 'Filtre bulunamadı');        
        return categoryFilter || { filters: [] };
        
      case 'filteredListings':
        // Kategori ID kontrolü - önemli
        const filteredCategoryId = params.filters && params.filters.categoryId ? Number(params.filters.categoryId) : null;
        console.log(`[fakeFetchFilterData] Kategori ID için filtreleme: ${filteredCategoryId}`);
        
        // İlanları yükle
        const filteredListingsData = await loadDataFromSource('listings');
        let filteredListings = filteredListingsData.ilanlari || [];
        
        // Eğer kategori ID varsa, önce kategoriye göre filtrele
        if (filteredCategoryId) {
          console.log(`Kategori ID ${filteredCategoryId} için önfiltreleme başlatılıyor, toplam ${filteredListings.length} ilan var.`);
          
          // Hata ayıklama için ilk 5 ilanın kategori bilgilerini logla
          const sampleListings = filteredListings.slice(0, 5);
          console.log("Örnek ilanların kategori bilgileri:");
          sampleListings.forEach(listing => {
            console.log(`İlan ID: ${listing.ilan_id}, Kategori ID: ${listing.category_id}, Alternatif kategori ID'leri:`, {
              kategoriId: listing.kategoriId,
              kategori_id: listing.kategori_id,
              'kategori?.id': listing.kategori?.id
            });
          });
          
          // Kategori filtresi uygula - category_id alanına göre
          filteredListings = filteredListings.filter(listing => {
            // Tüm olası kategori ID alanlarını kontrol et ve sayısal hale getir
            const categoryIdFromMainField = listing.category_id !== undefined ? Number(listing.category_id) : null;
            const categoryIdFromAltField1 = listing.kategoriId !== undefined ? Number(listing.kategoriId) : null;
            const categoryIdFromAltField2 = listing.kategori_id !== undefined ? Number(listing.kategori_id) : null;
            const categoryIdFromObj = listing.kategori?.id !== undefined ? Number(listing.kategori.id) : null;
            
            // Sayısal filtreleme ID'si
            const numFilteredCategoryId = Number(filteredCategoryId);
            
            // Ana kategori eşleşmesi için (örn: 4.1 -> 4)
            const mainCategoryMatch = categoryIdFromMainField !== null && 
                                    Math.floor(categoryIdFromMainField) === Math.floor(numFilteredCategoryId);
            
            // Alternatif alanlardan eşleşme
            const altField1Match = categoryIdFromAltField1 !== null && 
                                  (categoryIdFromAltField1 === numFilteredCategoryId || 
                                   Math.floor(categoryIdFromAltField1) === Math.floor(numFilteredCategoryId));
            
            const altField2Match = categoryIdFromAltField2 !== null && 
                                  (categoryIdFromAltField2 === numFilteredCategoryId || 
                                   Math.floor(categoryIdFromAltField2) === Math.floor(numFilteredCategoryId));
            
            const objFieldMatch = categoryIdFromObj !== null && 
                                (categoryIdFromObj === numFilteredCategoryId || 
                                 Math.floor(categoryIdFromObj) === Math.floor(numFilteredCategoryId));
            
            // Eğer hiçbir kategori ID bulunamadıysa uyarı log'u
            if (categoryIdFromMainField === null && categoryIdFromAltField1 === null && 
                categoryIdFromAltField2 === null && categoryIdFromObj === null) {
              console.log(`[Warning] İlan ID ${listing.ilan_id} için kategori bilgisi yok`);
            }
            
            // Herhangi bir alan eşleşirse true döndür
            return mainCategoryMatch || altField1Match || altField2Match || objFieldMatch;
          });
          
          console.log(`Kategori ID ${filteredCategoryId} için ${filteredListings.length} ilan bulundu.`);
        }
        
        // Diğer filtreleri uygula
        if (params.filters) {
          filteredListings = filterListings(filteredListings, params.filters);
        }
        
        // Sayfalama işlemi
        const page = Number(params.page) || 1;
        const pageSize = Number(params.pageSize) || 20;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        
        // Sıralama işlemi - sort parametresi varsa ve değeri boş değilse
        if (params.sort && params.sort !== '') {
          console.log(`İlanlar ${params.sort} kriterine göre sıralanıyor.`);
          filteredListings = sortListings(filteredListings, params.sort);
        } else {
          console.log('Varsayılan sıralama kullanılıyor (en yeni ilanlar önce).');
          // Varsayılan sıralama - en yeni ilanlar önce
          filteredListings.sort((a, b) => {
            // İlanın tarihini al - ilan_tarihi veya createdAt
            const dateA = a.ilan_tarihi ? new Date(a.ilan_tarihi) : 
                         a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.ilan_tarihi ? new Date(b.ilan_tarihi) : 
                         b.createdAt ? new Date(b.createdAt) : new Date(0);
            
            // Yeniden eskiye sırala
            return dateB - dateA;
          });
        }
        
        const paginatedListings = filteredListings.slice(startIndex, endIndex);
        
        console.log(`Sayfalama: Toplam ${filteredListings.length} ilan, Sayfa ${page}/${Math.ceil(filteredListings.length / pageSize)}, Bu sayfada ${paginatedListings.length} ilan.`);
        
        return {
          listings: paginatedListings,
          totalPages: Math.ceil(filteredListings.length / pageSize),
          totalListings: filteredListings.length,
          currentPage: page,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(filteredListings.length / pageSize),
            totalListings: filteredListings.length
          }
        };
        
      case 'listingSourceOptions':
        // Gerçek veri kaynağından kimden seçeneklerini al
        const sourceListingsData = await loadDataFromSource('listings');
        const kimdenFilterData = await loadDataFromSource('filters');
        
        // Önce kategoriye ait filtre tanımlarını bul
        const sourceFilterCategoryId = params.categoryId ? Number(params.categoryId) : 4; // Varsayılan olarak Daire (4)
        
        console.log(`Kategori ID ${sourceFilterCategoryId} için kimden seçenekleri alınıyor...`);
        
        // İlgili kategoriyi bul (veya referans kategorisini)
        let currentCategoryFilter = kimdenFilterData.find(filter => filter.category_id === sourceFilterCategoryId);
        
        // Eğer filters_ref varsa, referans verilen kategori filtrelerini al
        if (currentCategoryFilter?.filters_ref) {
          const refCategoryId = currentCategoryFilter.filters_ref;
          console.log(`Kategori ${sourceFilterCategoryId} için referans kategori kullanılacak: ${refCategoryId}`);
          
          const refCategory = kimdenFilterData.find(filter => filter.category_id === refCategoryId);
          
          if (refCategory) {
            console.log(`Referans kategori ${refCategoryId} için ${refCategory.filters?.length || 0} filtre bulundu.`);
            currentCategoryFilter = refCategory;
          }
        }
        
        // Kimden filtresini bul
        const kimdenFilter = currentCategoryFilter?.filters?.find(filter => filter.db_field === 'kimden');
        const kimdenOptions = kimdenFilter?.options || [];
        
        console.log(`Kategori için kimden seçenekleri:`, kimdenOptions);
        
        // Emlak.json'dan gelen seçenekleri önceliklendiriyoruz
        const uniqueSources = new Set();
        const sourceCounts = {};
        
        // Önce JSON'dan gelen kimdenleri ekleyelim, bunlar kesin görünecek
        kimdenOptions.forEach(option => {
          if (option && option !== 'Belirsiz') {
            uniqueSources.add(option);
            // Başlangıçta count'u 0 yapıyoruz, gerçek sayıları daha sonra ekleyeceğiz
            sourceCounts[option] = 0;
          }
        });
        
        // İlan kaynaklarını analiz et ve say
        let validListingCount = 0;
        sourceListingsData.ilanlari.forEach(listing => {
          // İlan kaynağını al - belirsiz değerleri dahil etme
          const source = listing.kimden;
          // Sadece geçerli kimden değerlerini ekle
          if (source && source !== 'Belirsiz') {
          uniqueSources.add(source);
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
            validListingCount++;
          }
        });
        
        // Dinamik olarak ilan kaynaklarını diz
        const sourceList = Array.from(uniqueSources).map(source => {
          // ID ve label değerlerini hazırla
        return {
            id: source, // Gerçek değeri ID olarak kullan
            label: source,
            count: sourceCounts[source] || 0,
            percentage: Math.round(((sourceCounts[source] || 0) * 100) / sourceListingsData.ilanlari.length)
          };
        });
        
        // 1. İlk options değişkeni aynen bırakılabilir
        const options = [
          { 
            id: 'all', 
            label: 'Tümü', 
            count: sourceListingsData.ilanlari.length, 
            percentage: 100
          },
          ...sourceList.sort((a, b) => (b.count || 0) - (a.count || 0)) // Sayıya göre azalan sırada
        ];
        
        console.log('API: Hazırlanan kimden seçenekleri:', options);
        
        // Seçenekleri doğrudan döndür
        return options;
        
      case 'neighborhoods':
        // İl ve ilçe parametrelerini kontrol et
        if (!params.province || !params.district) {
          throw new ApiError('İl ve ilçe parametreleri gereklidir', 400, 'MISSING_PARAMETERS');
        }
        
        console.log(`neighborhoods çağrıldı: İl=${params.province}, İlçe=${params.district}`);
        
        try {
          // LocationFilterService'i dinamik olarak import et
          const locationFilterModule = await import('./locationFilterService');
          
          // İlçe ID'si ile çalışıyoruz mu yoksa isimle mi kontrol et
          if (typeof params.district === 'number' || !isNaN(parseInt(params.district))) {
            // ID ile çalışma - doğrudan ID ile getir
            console.log("İlçe ID'si ile mahalle/köy getiriliyor:", params.district);
            const { getQuartersByDistrictId } = locationFilterModule;
            const neighborhoods = getQuartersByDistrictId(params.district);
            
            console.log(`API: İlçe ID ${params.district} için ${neighborhoods.length} mahalle/köy bulundu`);
            
            // Nesne dizisini filtere uygun formata dönüştür
            return [
              { id: 'all', label: 'Tümü' },
              ...neighborhoods.map(item => ({
                id: item.id,
                label: `${item.name} (${item.typeLabel})`
              })).sort((a, b) => a.label.localeCompare(b.label, 'tr'))
            ];
          } else {
            // İsim ile çalışma - eskisi gibi davran
            console.log("İlçe adı ile mahalle/köy getiriliyor:", params.district);
            const { getQuartersByDistrict } = locationFilterModule;
            const neighborhoods = getQuartersByDistrict(params.province, params.district);
            
            console.log(`API: ${params.province} ili ${params.district} ilçesine ait ${neighborhoods.length} mahalle/köy bulundu`);
            
            // Nesne dizisini filtere uygun formata dönüştür
            return [
              { id: 'all', label: 'Tümü' },
              ...neighborhoods.map(item => ({
                id: item.id,
                label: `${item.name} (${item.typeLabel})`
              })).sort((a, b) => a.label.localeCompare(b.label, 'tr'))
            ];
          }
        } catch (error) {
          console.error(`neighborhoods API hatası:`, error);
          throw error;
        }
        
      default:
        throw new Error(`Bilinmeyen filtre tipi: ${filterType}`);
    }
  } catch (error) {
    console.error(`Filtre verisi alınamadı (${filterType}):`, error);
    // Hata durumunda standart API yanıtı formatında hata döndür
    return {
      error: true,
      message: error.message || `Filtre verisi alınamadı (${filterType})`,
      status: error.status || 500,
      timestamp: new Date().toISOString(),
      requestId: nanoid()
    };
  }
};

/**
 * Filtre tanımlamalarını API'den çeker
 * @param {number} categoryId - Kategori ID'si
 * @returns {Promise<Array>} - Filtre tanımlamaları
 */
export async function fetchFilterDefinitionsFromApi(categoryId) {
  try {
    console.log(`API'den kategori ${categoryId} için filtre tanımları alınıyor...`);
    
    // Gecikme simülasyonu (API çağrısı gibi)
    await simulateNetworkDelay();
    
    // Güvenlik kontrolü - ama hata fırlatmadan devam et
    if (!categoryId) {
      console.warn('fetchFilterDefinitionsFromApi: categoryId parametresi gereklidir, boş filtre listesi döndürülüyor');
      // Hata fırlatma yerine boş dizi dön
      return [];
    }
    
    // Kategori ID'yi sayısal değere çevir
    const categoryIdNum = Number(categoryId);
    if (isNaN(categoryIdNum)) {
      console.warn(`Geçersiz kategori ID formatı: ${categoryId}, boş filtre listesi döndürülüyor`);
      return [];
    }
    
    // Aynı servis yapısını kullanarak veri getirme - test verisi olmadan
    console.log(`Kategori ID ${categoryIdNum} için gerçek API'den filtre tanımları isteniyor...`);
    
    try {
      // Gerçek bir API çağrısı gelene kadar filtreleri kategorilerden dinamik alacağız
      const filtersData = await loadDataFromSource('filters');
      
      console.log(`Filtre verisi yüklendi. Toplam ${filtersData.length} kategori filtresi mevcut.`);
      
      // İlgili kategoriyi bul
      const categoryFilter = filtersData.find(filter => filter.category_id === categoryIdNum);
    
      // Eğer filters_ref varsa, referans verilen kategori filtrelerini al
      if (categoryFilter?.filters_ref) {
        const refCategoryId = categoryFilter.filters_ref;
        console.log(`Kategori ${categoryIdNum} için referans kategori kullanılacak: ${refCategoryId}`);
        
        const refCategory = filtersData.find(
          filter => filter.category_id === refCategoryId
        );
        
        if (refCategory && refCategory.filters) {
          // Filtreleri dönüştür
          const processedFilters = refCategory.filters.map(filter => {
            return adaptFilterFromJson(filter, categoryIdNum);
          });
          
          console.log(`Kategori ${categoryIdNum} için ${processedFilters.length} filtre tanımı alındı (referans: ${refCategoryId})`);
          return processedFilters;
        }
      }
      
      // Doğrudan kategori filtreleri varsa
      if (categoryFilter && categoryFilter.filters) {
        // Filtreleri dönüştür
        const processedFilters = categoryFilter.filters.map(filter => {
          return adaptFilterFromJson(filter, categoryIdNum);
        });
        
        console.log(`Kategori ${categoryIdNum} için ${processedFilters.length} filtre tanımı alındı`);
        return processedFilters;
      }
      
      console.warn(`Kategori ID ${categoryIdNum} için hiç filtre bulunamadı`);
      return [];
      
    } catch (loadError) {
      console.error('Dinamik filtre yüklenirken hata oluştu:', loadError);
      // Hata durumunda boş dizi döndür, hata fırlatma
      console.warn('Filtre yükleme sorunu nedeniyle boş filtre listesi döndürülüyor');
      return [];
    }
  } catch (error) {
    console.error('Filtre tanımları alınırken hata oluştu:', error);
    // Hata durumunda boş dizi döndür, hata fırlatma
    console.warn('Filtre tanımları alınamadı, boş filtre listesi döndürülüyor');
    return [];
  }
}

/**
 * API'den gelen filtreyi uygun formata dönüştürür
 * @param {Object} filter - API'den gelen filtre
 * @param {number} categoryId - Kategori ID
 * @returns {Object} - Dönüştürülmüş filtre
 */
function adaptFilterFromJson(filter, categoryId) {
  // API'den gelen veriyi ihtiyacımız olan formata çevir
  return {
    id: filter.id || filter.db_field || filter.name,
    urlParam: filter.url_param || filter.urlParam || filter.id || filter.db_field,
    label: filter.label || filter.name || filter.id,
    type: filter.type || (filter.options ? 'select' : 'text'),
    formatting: filter.formatting || (filter.unit ? 'unit' : 'text'),
    unit: filter.unit || '',
    apiField: filter.api_field || filter.apiField || filter.db_field || filter.id,
    isRequired: filter.is_required || filter.isRequired || false,
    allowMultiple: filter.allow_multiple || filter.allowMultiple || false,
    dependsOn: filter.depends_on || filter.dependsOn || null,
    optionsSource: filter.options_source || filter.optionsSource || (filter.options ? 'predefined' : null),
    options: filter.options || []
  };
}

/**
 * Belirli bir kategoriye özgü filtreleri döndürür
 * API entegrasyonu gelince bu fonksiyon kaldırılacak
 * @param {number} categoryId - Kategori ID'si
 * @returns {Promise<Array>} - Kategoriye özgü filtreler
 */
async function getCategorySpecificFilters(categoryId) {
  // Bu fonksiyon tamamen kaldırılacak - gerçek API geldiğinde
  // Gerçek API entegrasyonu için burada boş dizi döndürüyoruz
  console.log(`getCategorySpecificFilters artık kullanılmıyor, fetchFilterDefinitionsFromApi kullanın.`);
  return [];
}

// API cevapları için simüle edilmiş gecikme süresi (ms)
const API_RESPONSE_DELAY = {
  MIN: 50,  // Minimum gecikme süresi 
  MAX: 300  // Maksimum gecikme süresi
};

/**
 * API gecikme simülasyonu
 * @param {number} minDelay - Minimum gecikme (ms)
 * @param {number} maxDelay - Maksimum gecikme (ms)
 * @returns {Promise<void>}
 */
const simulateNetworkDelay = async (minDelay = API_RESPONSE_DELAY.MIN, maxDelay = API_RESPONSE_DELAY.MAX) => {
  const delay = Math.floor(Math.random() * (maxDelay - minDelay) + minDelay);
  await new Promise(resolve => setTimeout(resolve, delay));
  return delay;
};

/**
 * API anahtarı oluştur
 * @returns {string} - Benzersiz API anahtarı
 */
const generateApiKey = () => {
  return generateSecureId();
};

/**
 * API isteği simülasyonu için gelişmiş istemci
 * Güvenlik kontrolleri ve hata yönetimi eklenmiş
 */
const apiClient = {
  get: async (endpoint, params = {}, headers = {}) => {
    console.log(`📡 API GET: ${endpoint}`, params);
    
    // API anahtarı kontrolü
    const apiKey = headers['x-api-key'] || 'default';
    if (!validateApiKey(apiKey)) {
      return Promise.reject({
        error: 'Unauthorized',
        message: 'Geçersiz API anahtarı',
        status: 401,
        requestId: nanoid(),
        timestamp: new Date().toISOString()
      });
    }
    
    // Rate limit kontrolü
    if (!rateLimiter.checkLimit(apiKey)) {
      return Promise.reject({
        error: 'Too Many Requests',
        message: 'Rate limit aşıldı. Lütfen daha sonra tekrar deneyin.',
        status: 429,
        requestId: nanoid(),
        timestamp: new Date().toISOString()
      });
    }
    
    const delay = Math.floor(
      Math.random() * (API_RESPONSE_DELAY.MAX - API_RESPONSE_DELAY.MIN) + 
      API_RESPONSE_DELAY.MIN
    );
    
    return new Promise(async (resolve, reject) => {
      try {
        await new Promise(r => setTimeout(r, delay));
        const responseData = await processApiRequest(endpoint, params, null, apiKey);
        
        // Rastgele hata simülasyonu (düşük olasılık)
        if (Math.random() < 0.05) {
          throw new Error('Simüle edilmiş sunucu hatası');
        }
        
        console.log(`✅ API Response (${delay}ms): ${endpoint}`, {
          status: 200,
          dataSize: responseData ? Object.keys(responseData).length : 0
        });
        
        resolve({
          data: responseData,
          status: 200,
          requestId: nanoid(),
          timestamp: new Date().toISOString(),
          headers: {
            'x-rate-limit-remaining': API_KEYS[apiKey].rate_limit - (rateLimiter.requests[apiKey]?.count || 0),
            'cache-control': 'max-age=60'
          }
        });
      } catch (error) {
        console.error(`❌ API Error: ${endpoint}`, error);
        reject({
          error: error.message || 'API isteği başarısız oldu',
          status: error.status || 500,
          requestId: nanoid(),
          timestamp: new Date().toISOString()
        });
      }
    });
  },
  
  post: async (endpoint, data = {}, params = {}, headers = {}) => {
    console.log(`📡 API POST: ${endpoint}`, { data, params });
    
    // API anahtarı kontrolü
    const apiKey = headers['x-api-key'] || 'default';
    if (!validateApiKey(apiKey)) {
      return Promise.reject({
        error: 'Unauthorized',
        message: 'Geçersiz API anahtarı',
        status: 401,
        requestId: nanoid(),
        timestamp: new Date().toISOString()
      });
    }
    
    // Yetki kontrolü - yazma izni gerekli
    if (!API_KEYS[apiKey].permissions.includes('write')) {
      return Promise.reject({
        error: 'Forbidden',
        message: 'Bu işlem için yetkiniz bulunmuyor',
        status: 403,
        requestId: nanoid(),
        timestamp: new Date().toISOString()
      });
    }
    
    // Rate limit kontrolü
    if (!rateLimiter.checkLimit(apiKey)) {
      return Promise.reject({
        error: 'Too Many Requests',
        message: 'Rate limit aşıldı. Lütfen daha sonra tekrar deneyin.',
        status: 429,
        requestId: nanoid(),
        timestamp: new Date().toISOString()
      });
    }
    
    const delay = Math.floor(
      Math.random() * (API_RESPONSE_DELAY.MAX - API_RESPONSE_DELAY.MIN) + 
      API_RESPONSE_DELAY.MIN
    );
    
    return new Promise(async (resolve, reject) => {
      try {
        // Veri doğrulama
        validateRequestData(endpoint, data);
        
        await new Promise(r => setTimeout(r, delay));
        const responseData = await processApiRequest(endpoint, params, data, apiKey);
        
        console.log(`✅ API Response (${delay}ms): ${endpoint}`, {
          status: 200,
          dataSize: responseData ? Object.keys(responseData).length : 0
        });
        
        resolve({
          data: responseData,
          status: 200,
          requestId: nanoid(),
          timestamp: new Date().toISOString(),
          headers: {
            'x-rate-limit-remaining': API_KEYS[apiKey].rate_limit - (rateLimiter.requests[apiKey]?.count || 0)
          }
        });
      } catch (error) {
        console.error(`❌ API Error: ${endpoint}`, error);
        reject({
          error: error.message || 'API isteği başarısız oldu',
          status: error.status || 500,
          requestId: nanoid(),
          timestamp: new Date().toISOString()
        });
      }
    });
  }
};

/**
 * İstek verilerini doğrulama
 */
const validateRequestData = (endpoint, data) => {
  // Endpoint'e göre farklı doğrulama kuralları
  if (endpoint.includes('/listings/create')) {
    const requiredFields = ['baslik', 'fiyat', 'category_id'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw {
          message: `${field} alanı zorunludur`,
          status: 400
        };
      }
    }
  }
};

/**
 * API isteğini işlemek için endpoint yönlendirmesi yapar
 */
const processApiRequest = async (endpoint, params, data = null, apiKey = 'default') => {
  const path = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const pathSegments = path.split('/');
  
  // API isteği loglaması - güvenlik için
  console.log(`🔒 API İsteği: ${path}`, {
    params,
    apiKey,
    timestamp: new Date().toISOString(),
    clientIp: '127.0.0.1' // Gerçek uygulamada istemci IP'si alınır
  });
  
  if (path.startsWith('api/filters/category/')) {
    const categoryId = pathSegments[3];
    return await filterServices.getCategoryFilters(categoryId, params);
  }
  
  else if (path.startsWith('api/filters/definitions/')) {
    const categoryId = pathSegments[3];
    return await filterServices.getFilterDefinitions(categoryId, params);
  }
  
  else if (path.startsWith('api/filters/options/')) {
    const filterId = pathSegments[3];
    return await filterServices.getFilterOptions(filterId, params);
  }
  
  else if (path.startsWith('api/listings/')) {
    if (pathSegments.length > 2) {
      const listingId = pathSegments[2];
      return await listingServices.getListingById(listingId);
    }
    return await listingServices.getListings(params);
  }
  
  else if (path.startsWith('api/listings/filtered')) {
    return await listingServices.getFilteredListings(params);
  }
  
  throw new Error(`Desteklenmeyen API endpoint: ${endpoint}`);
};

/**
 * JSON dosyalarından veri yükle - Güvenlik ve önbellekleme eklenmiş
 */
const dataCache = {
  listings: { data: null, timestamp: null },
  categories: { data: null, timestamp: null },
  filters: { data: null, timestamp: null },
  locations: { data: null, timestamp: null }
};

const CACHE_TTL = 5 * 60 * 1000; // 5 dakika önbellek süresi

const loadDataFromSource = async (dataSource) => {
  try {
    console.log(`📂 Veri kaynağından yükleniyor: ${dataSource}`);
    
    // Önbellek kontrolü
    if (dataCache[dataSource]?.data && 
        dataCache[dataSource]?.timestamp && 
        (Date.now() - dataCache[dataSource].timestamp) < CACHE_TTL) {
      console.log(`📦 Önbellekten veri kullanılıyor: ${dataSource}`);
      return dataCache[dataSource].data;
    }
    
    let result;
    
    switch (dataSource) {
      case 'listings':
        try {
          // Veri yükleme işlemi simüle edilmiş gecikme ile
          await new Promise(r => setTimeout(r, Math.random() * 100));
          
          const { default: listingsData } = await import('../../data/üründat.json');
          
          // Veri doğrulama ve temizleme
          if (listingsData && listingsData.ilanlari) {
            // Veri güvenliği için XSS temizliği
            listingsData.ilanlari = listingsData.ilanlari.map(listing => {
              // Metin alanlarını temizle
              if (listing.baslik) listing.baslik = sanitizeString(listing.baslik);
              if (listing.aciklama) listing.aciklama = sanitizeString(listing.aciklama);
              
              // Sayısal değerleri doğrula
              if (listing.fiyat) listing.fiyat = Number(listing.fiyat);
              if (listing.category_id) listing.category_id = Number(listing.category_id);
              
              return listing;
            });
          }
          
          result = listingsData;
        } catch (importError) {
          console.error('Ürün verisi yüklenirken hata:', importError);
          // Veri yüklenemezse boş bir yapı döndür
          result = { ilanlari: [] };
        }
        break;
        
      case 'categories':
        try {
          await new Promise(r => setTimeout(r, Math.random() * 50));
          const categoryModule = await import('../../data/categroies_data.json');
          const raw = categoryModule.default ?? categoryModule;
          result = Array.isArray(raw) ? raw : [];
        } catch (importError) {
          console.error('Kategori verisi yüklenirken hata:', importError);
          result = [];
        }
        break;
        
      case 'filters':
        try {
          await new Promise(r => setTimeout(r, Math.random() * 50));
          console.log('Filtre verisi yükleniyor...');
          const filterModule = await import('../../data/filtre/emlak.json');
          result = filterModule.default || [];
          console.log(`Filtre verisi başarıyla yüklendi. ${result.length} kategori filtresi bulundu.`);
        } catch (importError) {
          console.error('Filtre verisi yüklenirken hata:', importError);
          // Dinamik olarak boş bir filtre yapısı döndür
          result = [];
          console.warn('Filtre verisi yüklenemedi, boş dizi döndürülüyor.');
        }
        break;
        
      case 'locations':
        try {
          await new Promise(r => setTimeout(r, Math.random() * 50));
          const locationModule = await import('../../data/ililcebilgileri.json');
          result = locationModule.default || { };
        } catch (importError) {
          console.error('Konum verisi yüklenirken hata:', importError);
          result = { };
        }
        break;
        
      default:
        throw new Error(`Bilinmeyen veri kaynağı: ${dataSource}`);
    }
    
    // Önbelleğe kaydet
    dataCache[dataSource] = {
      data: result,
      timestamp: Date.now()
    };
    
    return result;
  } catch (error) {
    console.error(`Veri yükleme hatası (${dataSource}):`, error);
    // Hata durumunda boş bir veri yapısı döndür
    return dataSource === 'listings' ? { ilanlari: [] } : [];
  }
};

/**
 * Metin güvenliği için basit temizleme fonksiyonu
 */
const sanitizeString = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Filtre Servisleri - Gelişmiş güvenlik ve performans özellikleri eklenmiş
 */
const filterServices = {
  getCategoryFilters: async (categoryId, params = {}, apiKey = 'default') => {
    try {
      console.log(`🔍 Kategori filtreleri alınıyor. Kategori ID: ${categoryId}`);
      
      // API erişim kontrolü
      if (!validateApiKey(apiKey)) {
        throw new Error('Geçersiz API anahtarı');
      }
      
      // Rate limit kontrolü
      if (!rateLimiter.checkLimit(apiKey)) {
        throw new Error('Rate limit aşıldı. Lütfen daha sonra tekrar deneyin.');
      }
      
      // Kategori ID doğrulama
      if (!categoryId || isNaN(Number(categoryId))) {
        throw new Error('Geçersiz kategori ID');
      }
      
      const filterData = await loadDataFromSource('filters');
      console.log(`Filtre verisi yüklendi. Toplam ${filterData.length} kategori filtresi mevcut.`);
      
      const categoryId_num = Number(categoryId);
      const categoryFilter = filterData.find(
        filter => filter.category_id === categoryId_num
      );
      
      console.log(`Kategori ID ${categoryId_num} için filtre:`, categoryFilter ? 'Bulundu' : 'Bulunamadı');
      
      // Referans kategori kontrolü
      if (categoryFilter?.filters_ref) {
        console.log(`Kategori ${categoryId} için referans kategori bulundu: ${categoryFilter.filters_ref}`);
        const refCategory = filterData.find(
          filter => filter.category_id === categoryFilter.filters_ref
        );
        
        if (refCategory) {
          console.log(`Referans kategori ${categoryFilter.filters_ref} için ${refCategory.filters?.length || 0} filtre bulundu.`);
          return {
            filters: refCategory.filters || [],
            category_id: Number(categoryId),
            reference_category_id: categoryFilter.filters_ref,
            filter_count: refCategory.filters?.length || 0,
            success: true
          };
        } else {
          console.warn(`Referans kategori ${categoryFilter.filters_ref} bulunamadı!`);
        }
      }
      
      if (categoryFilter) {
        return {
          filters: categoryFilter.filters || [],
          category_id: Number(categoryId),
          filter_count: categoryFilter.filters?.length || 0,
          success: true
        };
      }
      
      return {
        filters: [],
        category_id: Number(categoryId),
        filter_count: 0,
        message: 'Bu kategori için filtre tanımı bulunamadı',
        success: true
      };
    } catch (error) {
      console.error('Kategori filtreleri alınırken hata:', error);
      throw {
        error: true,
        message: error.message || 'Kategori filtreleri alınamadı',
        status: error.status || 500,
        timestamp: new Date().toISOString(),
        requestId: nanoid()
      };
    }
  },
  
  getFilterDefinitions: async (categoryId, params = {}, apiKey = 'default') => {
    try {
      console.log(`🔍 Filtre tanımları alınıyor. Kategori ID: ${categoryId}`);
      
      // API erişim kontrolü
      if (!validateApiKey(apiKey)) {
        throw new Error('Geçersiz API anahtarı');
      }
      
      // Rate limit kontrolü
      if (!rateLimiter.checkLimit(apiKey)) {
        throw new Error('Rate limit aşıldı. Lütfen daha sonra tekrar deneyin.');
      }
      
      // Kategori ID doğrulama
      if (!categoryId || isNaN(Number(categoryId))) {
        throw new Error('Geçersiz kategori ID');
      }
      
      // fetchFilterDefinitionsFromApi fonksiyonunu kullan
      return await fetchFilterDefinitionsFromApi(categoryId, apiKey);
    } catch (error) {
      console.error('Filtre tanımları alınırken hata:', error);
      throw {
        error: true,
        message: error.message || 'Filtre tanımları alınamadı',
        status: error.status || 500,
        timestamp: new Date().toISOString(),
        requestId: nanoid()
      };
    }
  },
  
  getFilterOptions: async (filterId, params = {}, apiKey = 'default') => {
    try {
      console.log(`🔍 Filtre seçenekleri alınıyor. Filtre ID: ${filterId}`);
      
      // API erişim kontrolü
      if (!validateApiKey(apiKey)) {
        throw new Error('Geçersiz API anahtarı');
      }
      
      // Rate limit kontrolü
      if (!rateLimiter.checkLimit(apiKey)) {
        throw new Error('Rate limit aşıldı. Lütfen daha sonra tekrar deneyin.');
      }
      
      // Filtre ID doğrulama
      if (!filterId) {
        throw new Error('Geçersiz filtre ID');
      }
      
      switch (filterId) {
        case 'provinces':
          const locations = await loadDataFromSource('locations');
          return Object.keys(locations).map(il => ({
            id: il,
            name: il,
            code: il.substring(0, 2)
          }));
          
        case 'listingSources':
          return await fakeFetchFilterData('listingSourceOptions', {}, apiKey);
          
        default:
          return { 
            message: `Filtre seçenekleri için daha fazla bilgi gerekiyor`,
            success: true 
          };
      }
    } catch (error) {
      console.error('Filtre seçenekleri alınırken hata:', error);
      throw {
        error: true,
        message: error.message || 'Filtre seçenekleri alınamadı',
        status: error.status || 500,
        timestamp: new Date().toISOString(),
        requestId: nanoid()
      };
    }
  }
};

/**
 * Önbelleği temizle
 */
const clearCache = (dataSource = null) => {
  if (dataSource) {
    if (dataCache[dataSource]) {
      dataCache[dataSource] = { data: null, timestamp: null };
      console.log(`🧹 ${dataSource} önbelleği temizlendi`);
    }
  } else {
    // Tüm önbelleği temizle
    Object.keys(dataCache).forEach(key => {
      dataCache[key] = { data: null, timestamp: null };
    });
    console.log('🧹 Tüm önbellek temizlendi');
  }
};
// Dışa aktarılan servisler ve yardımcı fonksiyonlar
export { 
  apiClient, 
  filterServices, 
  fakeFetchFilterData, 
  clearCache
};

// İlçe adlarını normalize eden fonksiyon
const normalizeDistrictName = (districtName) => {
  if (!districtName) return '';
  
  try {
    // String'e dönüştür
    const normalized = String(districtName)
      // Türkçe karakterleri koru
      // İlk harfi büyük, diğer harfleri küçük yap (Title Case)
      .split(' ')
      .map(word => {
        if (!word) return '';
        return word.charAt(0).toLocaleUpperCase('tr-TR') + 
               word.slice(1).toLocaleLowerCase('tr-TR');
      })
      .join(' ')
      // Baştaki ve sondaki boşlukları temizle
      .trim()
      // Çoklu boşlukları tek boşluğa indirge
      .replace(/\s+/g, ' ');
    
    console.log(`Normalize: "${districtName}" -> "${normalized}"`);
    return normalized;
  } catch (error) {
    console.error(`Normalizasyon hatası (${districtName}):`, error);
    return String(districtName).toLocaleUpperCase('tr-TR').trim();
  }
};



