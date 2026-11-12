/**
 * Merkezi 401 (Kimlik Doğrulama Gerekli) Yakalayıcı
 * ==================================================
 *
 * Sorun: Uygulamadaki 25+ servis dosyasında 85+ ayrı `fetch`/`axios` çağrısı var.
 * Her biri kendi `if (!response.ok) throw ...` mantığını kullanıyor; backend 401
 * döndüğünde bunu özel olarak yakalayıp kullanıcıyı `/giris`'e atan HİÇBİR yer
 * yoktu (eski `api/client.ts` axios instance'ı bunu yapıyordu ama hiç import
 * edilmiyordu — ölü kod).
 *
 * Çözüm: Her dosyayı tek tek değiştirmek yerine, uygulama başlangıcında BİR KEZ
 * çalışan bu modül:
 *   1. `window.fetch`'i sarmalar → tüm `fetch()` çağrılarını kapsar.
 *   2. Global `axios` instance'ına response interceptor ekler → doğrudan
 *      `axios.get/post(...)` kullanan servisleri kapsar.
 *
 * `/auth/...` endpoint'leri hariç tutulur — `authService.apiRequest` zaten
 * kendi refresh + retry + logout mantığına sahip; bu interceptor onunla aynı
 * anda çakışıp (rotating refresh token senaryosunda) çifte refresh isteği
 * göndermesin diye auth çağrılarına karışmıyor.
 *
 * Diğer tüm servis çağrıları (mesajlar, favoriler, ilanlar, kategoriler...)
 * için: 401 alınca önce TEK SEFERLİK (eşzamanlı 401'ler için paylaşılan/dedupe
 * edilmiş) token yenileme denenir; yenileme başarısız olursa oturum temizlenip
 * kullanıcı `/giris`'e yönlendirilir.
 */

import axios from 'axios';
import authService from '@/services/auth/authService';

let initialized = false;
let redirecting = false;
let refreshPromise: Promise<boolean> | null = null;

function isAuthEndpoint(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.includes('/auth/');
}

/** Eşzamanlı 401'ler tek bir refresh isteğini paylaşır (rotating refresh token güvenliği). */
function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = authService
      .refreshToken()
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/** Oturumu temizler ve kullanıcıyı (bir kez) giriş sayfasına yönlendirir. */
function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  if (redirecting) return;
  if (window.location.pathname.startsWith('/giris')) return;

  redirecting = true;
  console.warn('[ApiInterceptor] Oturum geçersiz, giriş sayfasına yönlendiriliyor.');

  try {
    authService.logout();
  } catch (error) {
    console.error('[ApiInterceptor] Oturum temizlenirken hata:', error);
  }

  const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/giris?redirect_after=${returnUrl}`;
}

/** 401 yakalandığında çağrılır: refresh dener, olmazsa login'e atar. */
async function handleUnauthorized(url: string | undefined | null): Promise<void> {
  if (isAuthEndpoint(url)) return; // authService.apiRequest kendi akışını yönetiyor
  if (typeof window === 'undefined') return;
  if (redirecting) return;

  // Kullanıcının zaten hiç token'ı yoksa (misafir/anonim gezinme), bu 401 tamamen
  // beklenen bir durumdur (örn. bildirim/mesaj sayısı gibi opsiyonel-auth uçları).
  // Böyle bir durumda oturum "geçersiz" değil, zaten yok — logout + /giris'e
  // yönlendirme YAPILMAMALI, aksi halde anonim kullanıcılar herhangi bir sayfada
  // arka planda atılan auth'lu bir isteğin 401 dönmesiyle zorla girişe atılır.
  if (!authService.getToken()) {
    return;
  }

  const refreshed = await refreshOnce();
  if (!refreshed) {
    redirectToLogin();
  } else {
    console.log('[ApiInterceptor] Token yenilendi — bir sonraki istek yeni token ile gidecek.');
  }
}

/** `window.fetch`'i sarmalayıp 401 yanıtlarını merkezi olarak yakalar. */
function patchGlobalFetch(): void {
  if (typeof window === 'undefined') return;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const response = await originalFetch(...args);
    if (response.status === 401) {
      const requestUrl = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url;
      void handleUnauthorized(requestUrl);
    }
    return response;
  };
}

/** Global `axios` instance'ına 401 yakalayan response interceptor ekler. */
function patchAxios(): void {
  axios.interceptors.response.use(
    (response) => response,
    (error: { response?: { status?: number }; config?: { url?: string } }) => {
      if (error?.response?.status === 401) {
        void handleUnauthorized(error.config?.url);
      }
      return Promise.reject(error);
    }
  );
}

/** Uygulama başlangıcında bir kez çağrılmalı (bkz. ClientProviders.tsx). */
export function initApiInterceptors(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  patchGlobalFetch();
  patchAxios();
  console.log('[ApiInterceptor] 401 yakalayıcı aktif.');
}
