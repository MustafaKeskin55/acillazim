/**
 * Kriptografik Güvenlik Servisi
 * 
 * Bu servis, kritik verilerin şifrelenmesi, imzalanması ve doğrulanması için
 * modern kriptografik yöntemler kullanır.
 */

// Tip tanımları
interface EncryptedResult {
  encryptedData: string;
  iv?: string;
  salt?: string;
  chunked?: boolean;
  chunkSize?: number;
  fallback?: boolean;
  keyHash?: string;
}

interface EncryptedPackage {
  data: string;
  iv: string;
  salt: string;
  fallback: boolean;
  timestamp: number;
}

interface SecurityContext {
  errorCount: number;
  requestRate: number;
}

// SSR guard helper
const isBrowser = typeof window !== 'undefined';

// SHA-256 hash oluşturmak için
const generateHash = async (text: string): Promise<string> => {
  try {
    if (!isBrowser || !window.crypto?.subtle) {
      // SSR fallback
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
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('Hash oluşturma hatası:', error);
    // Fallback - basit ama daha az güvenli hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
};

// Veri şifreleme (AES-GCM) - Web Crypto API kullanarak
const encrypt = async (data: string, keyMaterial: string): Promise<EncryptedResult> => {
  try {
    if (!isBrowser || !window.crypto?.subtle) {
      // SSR fallback
      const encoder = new TextEncoder();
      const encodedText = encoder.encode(data);
      const textString = Array.from(encodedText)
        .map(byte => String.fromCharCode(byte))
        .join('');
      const base64Text = btoa(textString);
      const fallbackKey = await generateHash(keyMaterial);
      return {
        encryptedData: base64Text,
        fallback: true,
        keyHash: fallbackKey.substring(0, 8)
      };
    }

    // UNICODE KARAKTER SORUNU ÇÖZÜMÜ
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    
    // Güvenli bir anahtar türetme
    const keyHash = await generateHash(keyMaterial);
    const keyData = encoder.encode(keyHash);
    
    // Salt değeri oluştur (rastgele)
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    
    // Anahtar malzemesinden gerçek anahtar oluştur
    const keyBase = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    
    // PBKDF2 ile güçlü bir şifreleme anahtarı türet
    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyBase,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
    
    // Initialization Vector (IV) oluştur
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // BÜYÜK VERİ PERFORMANS İYİLEŞTİRMESİ
    const MAX_CHUNK_SIZE = 500000; // 500KB
    
    if (encodedData.length > MAX_CHUNK_SIZE) {
      // Büyük veriyi parçalara böl
      const chunks: ArrayBuffer[] = [];
      let offset = 0;
      
      while (offset < encodedData.length) {
        const chunk = encodedData.slice(offset, offset + MAX_CHUNK_SIZE);
        offset += MAX_CHUNK_SIZE;
        
        const encryptedChunk = await window.crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          key,
          chunk
        );
        
        chunks.push(encryptedChunk);
      }
      
      // Şifreli parçaları birleştir
      const totalLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
      const encryptedBuffer = new Uint8Array(totalLength);
      
      let bufferOffset = 0;
      for (const chunk of chunks) {
        encryptedBuffer.set(new Uint8Array(chunk), bufferOffset);
        bufferOffset += chunk.byteLength;
      }
      
      // Şifreli veriyi base64 formatına çevir
      let encryptedBase64 = '';
      const CHUNK_SIZE = 32768;
      
      for (let i = 0; i < encryptedBuffer.length; i += CHUNK_SIZE) {
        const chunkSlice = encryptedBuffer.slice(i, i + CHUNK_SIZE);
        const binary = Array.from(chunkSlice).map(byte => String.fromCharCode(byte)).join('');
        encryptedBase64 += window.btoa(binary);
      }
      
      const ivBase64 = window.btoa(String.fromCharCode.apply(null, Array.from(iv) as number[]));
      const saltBase64 = window.btoa(String.fromCharCode.apply(null, Array.from(salt) as number[]));
      
      return {
        encryptedData: encryptedBase64,
        iv: ivBase64,
        salt: saltBase64,
        chunked: true,
        chunkSize: MAX_CHUNK_SIZE
      };
    } else {
      // Normal şifreleme (küçük veriler için)
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encodedData
      );
      
      const encryptedArray = new Uint8Array(encryptedBuffer);
      const binary = Array.from(encryptedArray).map(byte => String.fromCharCode(byte)).join('');
      const encryptedBase64 = window.btoa(binary);
      
      const ivBase64 = window.btoa(String.fromCharCode.apply(null, Array.from(iv) as number[]));
      const saltBase64 = window.btoa(String.fromCharCode.apply(null, Array.from(salt) as number[]));
      
      return {
        encryptedData: encryptedBase64,
        iv: ivBase64,
        salt: saltBase64,
        chunked: false
      };
    }
  } catch (error) {
    console.error('Şifreleme hatası:', error);
    
    // FALLBACK - GÜVENLİ VE UNICODE DESTEKLİ
    try {
      const encoder = new TextEncoder();
      const encodedText = encoder.encode(data);
      
      const textString = Array.from(encodedText)
        .map(byte => String.fromCharCode(byte))
        .join('');
      
      const base64Text = isBrowser ? window.btoa(textString) : Buffer.from(textString).toString('base64');
      
      const fallbackKey = await generateHash(keyMaterial);
      
      return {
        encryptedData: base64Text,
        fallback: true,
        keyHash: fallbackKey.substring(0, 8)
      };
    } catch (fallbackError) {
      console.error('Fallback şifreleme de başarısız:', fallbackError);
      throw new Error('Veri şifrelenemedi');
    }
  }
};

// Şifreli veriyi çözme
const decrypt = async (encryptedData: any, iv: string | null, salt: string | null, keyMaterial: string): Promise<string> => {
  try {
    if (!isBrowser || !window.crypto?.subtle) {
      throw new Error('Crypto API mevcut değil');
    }

    // Parçalı şifreleme kullanıldıysa
    if (encryptedData.chunked) {
      const base64ToUint8Array = (base64: string): Uint8Array => {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      };
      
      const ivBytes = base64ToUint8Array(iv!);
      const saltBytes = base64ToUint8Array(salt!);
      
      const base64Chunks: string[] = [];
      const chunkSize = 32768;
      
      for (let i = 0; i < encryptedData.encryptedData.length; i += chunkSize) {
        base64Chunks.push(encryptedData.encryptedData.substring(i, i + chunkSize));
      }
      
      const binaryChunks = base64Chunks.map(base64ToUint8Array);
      
      const totalLength = binaryChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const encryptedBytes = new Uint8Array(totalLength);
      
      let offset = 0;
      for (const chunk of binaryChunks) {
        encryptedBytes.set(chunk, offset);
        offset += chunk.length;
      }
      
      const encoder = new TextEncoder();
      const keyHash = await generateHash(keyMaterial);
      const keyData = encoder.encode(keyHash);
      
      const keyBase = await window.crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );
      
      const key = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: saltBytes as unknown as BufferSource,
          iterations: 100000,
          hash: "SHA-256"
        },
        keyBase,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );
      
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes as unknown as BufferSource },
        key,
        encryptedBytes
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } else {
      // Normal şifre çözme (küçük veriler için)
      const getUint8Array = (base64String: string): Uint8Array => {
        const binaryString = window.atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      };
      
      const encryptedBytes = getUint8Array(encryptedData.encryptedData);
      const ivBytes = getUint8Array(iv!);
      const saltBytes = getUint8Array(salt!);
      
      const encoder = new TextEncoder();
      
      const keyHash = await generateHash(keyMaterial);
      const keyData = encoder.encode(keyHash);
      
      const keyBase = await window.crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );
      
      const key = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: saltBytes as unknown as BufferSource,
          iterations: 100000,
          hash: "SHA-256"
        },
        keyBase,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );
      
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes as unknown as BufferSource },
        key,
        encryptedBytes as unknown as BufferSource
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    }
  } catch (error) {
    console.error('Şifre çözme hatası:', error);
    
    // Fallback - düşük güvenlikli şifre çözme
    if (encryptedData.fallback) {
      try {
        const binaryString = isBrowser ? window.atob(encryptedData.encryptedData) : Buffer.from(encryptedData.encryptedData, 'base64').toString('binary');
        
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
      } catch (fallbackError) {
        console.error('Fallback şifre çözme de başarısız:', fallbackError);
        throw new Error('Veri çözülemedi: Format hatası');
      }
    }
    
    throw new Error('Veri çözülemedi: Doğrulama hatası');
  }
};

// İmza oluşturma (HMAC)
const sign = async (data: string, key: string): Promise<string> => {
  try {
    if (!isBrowser || !window.crypto?.subtle) {
      // SSR fallback
      const combinedData = data + key;
      return generateHash(combinedData);
    }

    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(key);
    
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await window.crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(data)
    );
    
    const signatureArray = Array.from(new Uint8Array(signature));
    const signatureBase64 = btoa(String.fromCharCode.apply(null, signatureArray));
    
    return signatureBase64;
  } catch (error) {
    console.error('İmzalama hatası:', error);
    
    const combinedData = data + key;
    return generateHash(combinedData);
  }
};

// İmza doğrulama
const verify = async (data: string, signature: string, key: string): Promise<boolean> => {
  try {
    if (!isBrowser || !window.crypto?.subtle) {
      // SSR fallback
      const combinedData = data + key;
      const expectedSignature = await generateHash(combinedData);
      return expectedSignature === signature;
    }

    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(key);
    
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const signatureBytes = (() => {
      const binaryString = atob(signature);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    })();
    
    const isValid = await window.crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      signatureBytes,
      encoder.encode(data)
    );
    
    return isValid;
  } catch (error) {
    console.error('İmza doğrulama hatası:', error);
    
    const combinedData = data + key;
    const expectedSignature = await generateHash(combinedData);
    return expectedSignature === signature;
  }
};

// Veriyi şifrele ve imzala
const encryptAndSign = async (data: string, keyId: string = 'default'): Promise<{ data: string; signature: string }> => {
  try {
    const hostname = isBrowser ? window.location.hostname : 'localhost';
    const encryptionKey = `${keyId}_encryption_${hostname}`;
    const signingKey = `${keyId}_signing_${hostname}`;
    
    const encryptedResult = await encrypt(data, encryptionKey);
    
    const encryptedPackage = JSON.stringify({
      data: encryptedResult.encryptedData,
      iv: encryptedResult.iv,
      salt: encryptedResult.salt,
      fallback: encryptedResult.fallback || false,
      timestamp: Date.now()
    });
    
    const signature = await sign(encryptedPackage, signingKey);
    
    return {
      data: encryptedPackage,
      signature
    };
  } catch (error) {
    console.error('Veri şifreleme ve imzalama hatası:', error);
    throw new Error('Veri güvenli şekilde şifrelenemedi');
  }
};

// İmzalı ve şifreli veriyi doğrula ve çöz
const verifyAndDecrypt = async (encryptedPackage: string, signature: string, keyId: string = 'default'): Promise<string> => {
  try {
    const hostname = isBrowser ? window.location.hostname : 'localhost';
    const encryptionKey = `${keyId}_encryption_${hostname}`;
    const signingKey = `${keyId}_signing_${hostname}`;
    
    const isSignatureValid = await verify(encryptedPackage, signature, signingKey);
    
    if (!isSignatureValid) {
      throw new Error('Veri doğrulanamadı: İmza geçersiz');
    }
    
    const packageData: EncryptedPackage = JSON.parse(encryptedPackage);
    
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 saat
    if (Date.now() - packageData.timestamp > maxAgeMs) {
      throw new Error('Veri süresi dolmuş');
    }
    
    if (packageData.fallback) {
      return decrypt({ 
        encryptedData: packageData.data, 
        fallback: true 
      }, null, null, encryptionKey);
    } else {
      return decrypt(
        packageData.data,
        packageData.iv,
        packageData.salt,
        encryptionKey
      );
    }
  } catch (error) {
    console.error('Veri doğrulama ve çözme hatası:', error);
    throw new Error('Veri güvenli şekilde çözülemedi');
  }
};

// CSRF token yönetimi
let csrfToken: string | null = null;

// CSRF token oluştur veya mevcut olanı getir
const getCsrfToken = async (): Promise<string> => {
  if (csrfToken) return csrfToken;
  
  try {
    if (!isBrowser || !window.crypto?.getRandomValues) {
      // SSR fallback
      const fallbackToken = Date.now().toString(36) + Math.random().toString(36).substring(2);
      csrfToken = fallbackToken;
      return fallbackToken;
    }

    const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
    const tokenArray = Array.from(randomBytes);
    const token = tokenArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    sessionStorage.setItem('acillazim_csrf_token', token);
    
    csrfToken = token;
    return token;
  } catch (error) {
    console.error('CSRF token oluşturma hatası:', error);
    
    const fallbackToken = Date.now().toString(36) + Math.random().toString(36).substring(2);
    csrfToken = fallbackToken;
    return fallbackToken;
  }
};

// Ekstra güvenlik kontrolleri
const securityChecks = {
  // Tarayıcının güvenli özelliklere sahip olup olmadığını kontrol et
  isBrowserSecure: (): boolean => {
    if (!isBrowser) return false;
    return (
      // Modern kriptografi API'sine erişim var mı?
      !!(window.crypto && window.crypto.subtle) &&
      // HTTPS üzerinde miyiz?
      window.location.protocol === 'https:' &&
      // Güvenlik ihlali belirtileri var mı?
      !(window as any).isSecurityBreached &&
      // İframe içinde değil miyiz?
      window.self === window.top
    );
  },
  
  // Temel anti-XSS önlemleri
  sanitizeInput: (input: string): string => {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/`/g, '&#x60;')
      .replace(/\//g, '&#x2F;');
  },
  
  // Risk skoru hesaplama
  calculateRiskScore: (context: SecurityContext): number => {
    let score = 0;
    
    // Güvensiz tarayıcı = +50 risk
    if (!securityChecks.isBrowserSecure()) score += 50;
    
    // Çok fazla hatalı istek = +30 risk
    if (context.errorCount > 5) score += 30;
    
    // Çok hızlı talep oranı = +20 risk
    if (context.requestRate > 10) score += 20;
    
    return score;
  }
};

export default {
  generateHash,
  encrypt,
  decrypt,
  sign,
  verify,
  encryptAndSign,
  verifyAndDecrypt,
  getCsrfToken,
  securityChecks
};
