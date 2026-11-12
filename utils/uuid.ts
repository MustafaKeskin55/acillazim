import { v4 as uuidv4 } from 'uuid';

/**
 * Güvenli ve her ortamda (HTTP, HTTPS, SSR, Localhost) çalışan UUID üreteci.
 * Modern tarayıcılarda `crypto.randomUUID` yalnızca Secure Context (HTTPS veya localhost) altında
 * tanımlıdır; HTTP üzerinden alan adı ile erişildiğinde undefined döner ve TypeError verir.
 */
export function safeRandomUUID(): string {
  try {
    if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Güvenlik kısıtlaması varsa fallback'e geç
  }

  try {
    return uuidv4();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
