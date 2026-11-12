/**
 * Merkezi Oturum Yönetim Servisi - Gelişmiş Güvenlik
 * Tüm uygulama genelinde oturum işlemlerini merkezi olarak yönetir
 */

// API ve güvenlik ayarları
// API_URL = {host}/api/v1 — path alias yok (/api/auth kullanılmaz)
function resolveAuthApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api/v1';
  if (/\/api\/v1$/i.test(raw)) return raw;
  const host = raw
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/v1\/?$/i, '');
  return `${host}/api/v1`;
}

/** BE `{ success, data, message }` sarmalayıcısını açar; sarmalı değilse olduğu gibi döner. */
function unwrapAuthResponse<T>(json: unknown): T {
  if (
    json &&
    typeof json === 'object' &&
    'data' in (json as Record<string, unknown>) &&
    (json as Record<string, unknown>).data &&
    typeof (json as Record<string, unknown>).data === 'object'
  ) {
    return (json as { data: T }).data;
  }
  return json as T;
}

const CONFIG = {
  API_MODE: process.env.NEXT_PUBLIC_API_MODE || 'real',
  API_URL: resolveAuthApiBase(),
  USE_SECURE_COOKIES: process.env.NODE_ENV === 'production', // Sadece production'da secure cookie
  COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || (typeof window !== 'undefined' ? window.location.hostname : '')
};

// Storage anahtarları
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  USER_PROFILE: 'user_profile',
  REFRESH_TOKEN: 'refresh_token',
  CSRF_TOKEN: 'csrf_token'
} as const;

interface AuthResult {
  success: boolean;
  token?: string;
  message?: string;
}

/**
 * Şifre/e-posta değişikliği — gerçek backend (Bearer zorunlu):
 *   POST /api/v1/auth/password/verify | send-code | verify-code | change
 *   POST /api/v1/auth/email/verify-current | send-code | verify-code | update
 * `authService.apiRequest` zaten Authorization header + 401 refresh akışını yönetir.
 */
async function authActionRequest(endpoint: string, body: Record<string, unknown>, fallbackMessage: string): Promise<AuthResult> {
  const raw = await authService.apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = unwrapAuthResponse<AuthResult>(raw);
  if (!data?.success) {
    throw new Error(data?.message || fallbackMessage);
  }
  return data;
}

// Şifre doğrulama servisi
export const verifyCurrentPassword = async (password: string): Promise<AuthResult> =>
  authActionRequest('/auth/password/verify', { password }, 'Mevcut şifre yanlış');

// E-posta doğrulama kodu gönderme servisi
export const sendVerificationCode = async (email: string): Promise<AuthResult> =>
  authActionRequest('/auth/password/send-code', { email }, 'Doğrulama kodu gönderilemedi');

// Doğrulama kodu kontrolü
export const verifyCode = async (code: string, token: string): Promise<AuthResult> =>
  authActionRequest('/auth/password/verify-code', { code, token }, 'Geçersiz doğrulama kodu');

// Şifre değiştirme servisi
export const changePassword = async (currentPassword: string, newPassword: string, token: string): Promise<AuthResult> =>
  authActionRequest('/auth/password/change', { currentPassword, newPassword, token }, 'Şifre güncellenemedi');

// E-posta güncelleme servisleri
export const verifyExistingEmail = async (email: string): Promise<AuthResult> =>
  authActionRequest('/auth/email/verify-current', { email }, 'Mevcut e-posta adresi yanlış');

export const sendEmailVerificationCode = async (newEmail: string): Promise<AuthResult> =>
  authActionRequest('/auth/email/send-code', { newEmail }, 'Doğrulama kodu gönderilemedi');

export const verifyEmailCode = async (code: string, token: string): Promise<AuthResult> =>
  authActionRequest('/auth/email/verify-code', { code, token }, 'Geçersiz doğrulama kodu');

export const updateEmail = async (newEmail: string, token: string): Promise<AuthResult> =>
  authActionRequest('/auth/email/update', { newEmail, token }, 'E-posta güncellenemedi');

// Mock kullanıcı verileri - sadece geliştirme aşamasında
const mockUsers = [
  {
    id: '1',
    email: 'test@acillazim.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    token: 'mock-jwt-token-123',
    refreshToken: 'mock-refresh-token-123',
    roles: ['USER']
  }
];

interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

/**
 * Token içeriğini analiz et (JWT)
 * @param token - JWT token
 * @returns Token içeriği veya null
 */
function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    try {
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return JSON.parse(atob(base64));
    }
  } catch (e) {
    return null;
  }
}

/**
 * Token'ın süresi dolmuş mu kontrol et
 * @param token - JWT token
 * @returns Token süresi dolmuşsa true
 */
function isTokenExpired(token: string): boolean {
  const tokenData = parseJwt(token);
  if (!tokenData || !tokenData.exp) return false;

  const expirationTime = tokenData.exp * 1000;
  const currentTime = Date.now();

  return currentTime >= expirationTime;
}

interface UserData {
  id?: string;
  email?: string;
  username?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  googleCredential?: string;
  roles?: string[];
  [key: string]: unknown;
}

interface Credentials {
  username: string;
  password: string;
  recaptchaToken?: string;
}

interface GoogleParams {
  credential: string;
  userData: {
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
  };
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserData | null;
  authSource: string | null;
}

interface ApiRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  secure?: boolean;
  sameSite?: string;
}

class AuthService {
  isAuthenticated: boolean;
  currentUser: UserData | null;
  authSource: string | null;
  subscribers: ((authState: AuthState) => void)[];
  csrfToken: string | null;

  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.authSource = null;
    this.subscribers = [];
    this.csrfToken = null;

    // Sayfa yüklendiğinde oturum durumunu kontrol et
    this.checkAuth();

    // Pencereler arası oturum senkronizasyonu
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange);
    }
  }

  /**
   * LocalStorage değişikliklerini dinle
   * @private
   */
  handleStorageChange = (event: StorageEvent): void => {
    if (event.key === STORAGE_KEYS.AUTH_TOKEN) {
      // Token değiştiyse oturum durumunu güncelle
      if (event.newValue) {
        this.checkAuth();
      } else {
        this.clearSession();
      }
      // Değişikliği abone olan bileşenlere bildir
      this.notifySubscribers();
    }
  };

  /**
   * Oturum değişiklik aboneliği ekle
   * @param callback - Oturum durumu değiştiğinde çağrılacak fonksiyon
   * @returns Aboneliği iptal etmek için kullanılacak fonksiyon
   */
  subscribe = (callback: (authState: AuthState) => void): (() => void) => {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((sub) => sub !== callback);
    };
  };

  /**
   * Tüm abonelere değişikliği bildir
   * @private
   */
  notifySubscribers = (): void => {
    const authState: AuthState = {
      isAuthenticated: this.isAuthenticated,
      user: this.currentUser,
      authSource: this.authSource
    };

    this.subscribers.forEach((callback) => callback(authState));
  };

  /**
   * API isteği gönder
   * @param endpoint - API endpoint'i
   * @param options - Fetch options
   * @returns API yanıtı
   */
  async apiRequest(endpoint: string, options: ApiRequestOptions = {}): Promise<unknown> {
    const defaultOptions: ApiRequestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // CSRF token'ı ekle
    if (this.csrfToken && mergedOptions.headers) {
      mergedOptions.headers['X-CSRF-Token'] = this.csrfToken;
    }

    // Authentication token'ı ekle - Spring Boot backend Bearer header bekler
    const authToken = this.getToken();
    if (authToken && mergedOptions.headers) {
      mergedOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }

    // API isteği yap
    try {
      const response = await fetch(`${CONFIG.API_URL}${endpoint}`, mergedOptions as RequestInit);

      // 401 hatası alındığında (token süresi dolmuş)
      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Token yenilendiyse isteği tekrarla
          return this.apiRequest(endpoint, options);
        } else {
          // Token yenilenemezse çıkış yap
          this.logout();
          throw new Error('Oturum süresi doldu');
        }
      }

      // CSRF token'ı header'dan al
      const newCsrfToken = response.headers.get('X-CSRF-Token');
      if (newCsrfToken) {
        this.csrfToken = newCsrfToken;
        localStorage.setItem(STORAGE_KEYS.CSRF_TOKEN, newCsrfToken);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API isteği başarısız');
      }

      return response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  /**
   * Google ile giriş yapma
   * @param params - Giriş parametreleri
   * @returns Kullanıcı bilgileri ve token
   */
  async loginWithGoogle(params: GoogleParams): Promise<{ user: UserData; token: string }> {
    try {
      if (CONFIG.API_MODE === 'mock') {
        const result = await this.mockGoogleLogin(params);
        this.notifySubscribers();
        return result;
      } else {
        const result = await this.realGoogleLogin(params);
        this.notifySubscribers();
        return result;
      }
    } catch (error) {
      console.error('Google login error:', error);
      throw new Error('Google ile giriş yapılamadı');
    }
  }

  /**
   * Normal kullanıcı adı ve şifre ile giriş
   * @param credentials - Kullanıcı adı ve şifre
   * @returns Kullanıcı bilgileri ve token
   */
  async login(credentials: Credentials): Promise<{ user: UserData; token: string }> {
    try {
      // reCAPTCHA token'ı ekle
      let loginData = { ...credentials };

      // Eğer grecaptcha yüklenmişse token ekle
      if (typeof window !== 'undefined' && (window as unknown as { grecaptcha?: { execute?: () => void } }).grecaptcha?.execute) {
        try {
          const recaptchaToken = await this.getRecaptchaToken('login');
          loginData.recaptchaToken = recaptchaToken;
        } catch (error) {
          console.error('reCAPTCHA token alınamadı:', error);
          // Token alınamasa bile giriş denemesine devam et
        }
      }

      if (CONFIG.API_MODE === 'mock') {
        const result = await this.mockLogin(loginData);
        this.notifySubscribers();
        return result;
      } else {
        const result = await this.realLogin(loginData);
        this.notifySubscribers();
        return result;
      }
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Giriş yapılamadı');
    }
  }

  /**
   * reCAPTCHA token'ı al
   * @param action - reCAPTCHA aksiyonu (login, register, vb.)
   * @returns reCAPTCHA token'ı
   */
  async getRecaptchaToken(action: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const grecaptcha = (window as unknown as { grecaptcha?: { getResponse?: () => string } }).grecaptcha;
        if (grecaptcha && grecaptcha.getResponse) {
          // Normal reCAPTCHA için
          const response = grecaptcha.getResponse();
          if (response) {
            resolve(response);
          } else {
            reject(new Error('reCAPTCHA doğrulanamadı'));
          }
        } else {
          reject(new Error('reCAPTCHA yüklenemedi'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Mock normal giriş
   * @private
   */
  async mockLogin(credentials: Credentials): Promise<{ user: UserData; token: string }> {
    // Demo kullanıcı bilgileri - gerçek API geldiğinde kaldırılacak
    const demoUsers = [
      {
        username: 'demo@acillazim.com',
        password: 'Acillazim.com1',
        token: 'fake-jwt-token-12345',
        refreshToken: 'fake-refresh-token-12345',
        roles: ['USER']
      }
    ];

    return new Promise((resolve, reject) => {
      // API davranışını simüle etmek için küçük bir gecikme
      setTimeout(() => {
        // Demo kullanıcı kontrolü
        const user = demoUsers.find(
          (u) => u.username === credentials.username && u.password === credentials.password
        );

        if (user) {
          const userData: UserData = {
            id: user.username,
            username: user.username,
            roles: user.roles
          };

          this.saveAuthData(userData, user.token, user.refreshToken, 'email');

          resolve({
            user: userData,
            token: user.token
          });
        } else {
          reject(new Error('Giriş bilgileri geçersiz'));
        }
      }, 500);
    });
  }

  /**
   * Gerçek API ile normal giriş
   * @private
   */
  async realLogin(credentials: Credentials): Promise<{ user: UserData; token: string }> {
    try {
      // reCAPTCHA: production'da zorunlu; local/dev'de yoksa yine BE'ye git
      if (!credentials.recaptchaToken && process.env.NODE_ENV === 'production') {
        throw new Error('Robot doğrulaması yapılamadı, lütfen tekrar deneyin');
      }
      if (!credentials.recaptchaToken) {
        console.warn('[Auth] reCAPTCHA token yok — local/dev login devam ediyor');
      }

      console.log(`[Auth API] Hedef path: POST ${CONFIG.API_URL}/auth/login`);

      // Eğer credentials içinde recaptchaToken varsa, bunu API isteğine ekle
      const raw = await this.apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      const data = unwrapAuthResponse<{ user: UserData; token: string; refreshToken: string }>(raw);

      if (!data?.token) {
        console.error('[Auth] Login yanıtında token bulunamadı:', raw);
        throw new Error('Sunucudan geçerli bir oturum token\'ı alınamadı');
      }

      this.saveAuthData(data.user, data.token, data.refreshToken, 'email');
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Mock Google girişi
   * @private
   */
  async mockGoogleLogin(params: GoogleParams): Promise<{ user: UserData; token: string }> {
    const { credential, userData } = params;

    // Google'dan gelen bilgilerle zenginleştirilmiş mock kullanıcı
    const mockUserData: UserData = {
      id: userData.email.split('@')[0] + '_' + Date.now().toString(36),
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      name: `${userData.firstName} ${userData.lastName}`,
      picture: userData.picture,
      googleCredential: credential,
      roles: ['USER']
    };

    // Mock token oluştur
    const mockToken = this.generateMockToken(mockUserData);
    const mockRefreshToken = this.generateMockToken(mockUserData, '30d');

    // LocalStorage ve cookie'lere kaydet
    this.saveAuthData(mockUserData, mockToken, mockRefreshToken, 'google');

    return {
      user: mockUserData,
      token: mockToken
    };
  }

  /**
   * Gerçek Google girişi
   * @private
   */
  async realGoogleLogin(params: GoogleParams): Promise<{ user: UserData; token: string }> {
    try {
      const raw = await this.apiRequest('/auth/google', {
        method: 'POST',
        body: JSON.stringify(params)
      });
      const data = unwrapAuthResponse<{ user: UserData; token: string; refreshToken: string }>(raw);

      if (!data?.token) {
        console.error('[Auth] Google login yanıtında token bulunamadı:', raw);
        throw new Error('Sunucudan geçerli bir oturum token\'ı alınamadı');
      }

      this.saveAuthData(data.user, data.token, data.refreshToken, 'google');
      return data;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  /**
   * Token yenileme
   * @returns Token yenilendiyse true
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken =
        localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ||
        this.getCookie(STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        return false;
      }

      // Mock API modunda
      if (CONFIG.API_MODE === 'mock') {
        // Mock yenileme
        const userData = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_DATA) || '{}');
        const newToken = this.generateMockToken(userData);

        this.saveAuthData(userData, newToken, refreshToken, this.authSource ?? 'email');
        return true;
      } else {
        // Gerçek API ile token yenile
        const raw = await this.apiRequest('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
        const data = unwrapAuthResponse<{ token: string; user?: UserData; refreshToken?: string }>(raw);

        if (data.token) {
          this.saveAuthData(
            data.user || this.currentUser || {},
            data.token,
            data.refreshToken || refreshToken,
            this.authSource ?? 'email'
          );
          return true;
        }

        return false;
      }
    } catch (error) {
      console.error('Token yenileme hatası:', error);
      return false;
    }
  }

  /**
   * Mock token oluştur
   * @private
   */
  generateMockToken(user: UserData, expiry = '1h'): string {
    // Gerçek uygulamada JWT token oluşturulacak
    const expiryTime = expiry === '1h' ? 3600 : 30 * 24 * 3600; // 1 saat veya 30 gün
    const expDate = Math.floor(Date.now() / 1000) + expiryTime;

    return `mock-jwt-token-${user.id}-${Date.now()}-exp-${expDate}`;
  }

  /**
   * Auth verilerini kaydet
   * @private
   */
  saveAuthData(user: UserData, token: string, refreshToken: string, source = 'email'): void {
    // LocalStorage'a kaydet (backward compatibility için)
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    const rawPic = user.picture || (user as Record<string, unknown>).profilePicture as string || (user as Record<string, unknown>).profilePic as string;
    if (rawPic) {
      user.picture = rawPic;
      user.profilePic = rawPic;
      (user as Record<string, unknown>).profilePicture = rawPic;
    }
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    if (user && (user.id || (user as unknown as Record<string, unknown>).userId)) {
      localStorage.setItem('userId', String(user.id || (user as unknown as Record<string, unknown>).userId));
    }

    if (source === 'google' && user.picture) {
      localStorage.setItem(
        STORAGE_KEYS.USER_PROFILE,
        JSON.stringify({
          name: user.name || `${user.firstName} ${user.lastName}`,
          email: user.email,
          picture: user.picture
        })
      );
    }

    // Secure cookies kullan (üretim ortamında)
    if (CONFIG.USE_SECURE_COOKIES) {
      // HttpOnly flag sadece backend tarafından ayarlanabilir
      // Backend tarafından otomatik ayarlanacağı için burada bir şey yapmıyoruz
      // Buradaki kod sadece geliştirme aşamasında veya eski sistemle uyumluluk için
      this.setCookie(STORAGE_KEYS.AUTH_TOKEN, token, {
        secure: true,
        sameSite: 'strict',
        maxAge: 3600 // 1 saat
      });

      this.setCookie(STORAGE_KEYS.REFRESH_TOKEN, refreshToken, {
        secure: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 3600 // 30 gün
      });
    } else {
      // Geliştirme ortamında normal cookie'ler
      document.cookie = `${STORAGE_KEYS.AUTH_TOKEN}=${token}; path=/; max-age=3600`; // 1 saat
      document.cookie = `${STORAGE_KEYS.REFRESH_TOKEN}=${refreshToken}; path=/; max-age=${30 * 24 * 3600}`; // 30 gün
    }

    // SessionStorage'a da kaydet - sayfa yenilemelerinde daha güvenli
    sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    sessionStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

    // State'i güncelle
    this.isAuthenticated = true;
    this.currentUser = user;
    this.authSource = source;

    // CSRF token'ı oluştur (gerçek projede backend tarafından sağlanacak)
    if (!this.csrfToken) {
      this.csrfToken = 'mock-csrf-' + Math.random().toString(36).substring(2);
      localStorage.setItem(STORAGE_KEYS.CSRF_TOKEN, this.csrfToken);
    }
  }

  /**
   * Cookie ayarla (gelişmiş)
   * @private
   */
  setCookie(name: string, value: string, options: CookieOptions = {}): void {
    const defaults: CookieOptions = {
      path: '/',
      maxAge: 3600, // 1 saat
      secure: CONFIG.USE_SECURE_COOKIES,
      sameSite: 'lax'
    };

    const opts = { ...defaults, ...options };
    let cookieStr = `${name}=${encodeURIComponent(value)}`;

    if (opts.path) cookieStr += `; path=${opts.path}`;
    if (opts.domain) cookieStr += `; domain=${opts.domain}`;
    if (opts.maxAge) cookieStr += `; max-age=${opts.maxAge}`;
    if (opts.secure) cookieStr += '; secure';
    if (opts.sameSite) cookieStr += `; samesite=${opts.sameSite}`;

    document.cookie = cookieStr;
  }

  /**
   * Oturum durumunu kontrol et
   * @returns Kullanıcı giriş yapmış mı
   */
  checkAuth(): boolean {
    if (typeof window === 'undefined') return false;

    // LocalStorage, sessionStorage ve cookie'den token kontrolü
    const token =
      localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
      sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
      this.getCookie(STORAGE_KEYS.AUTH_TOKEN);

    // User data kontrolü
    const userData =
      sessionStorage.getItem(STORAGE_KEYS.USER_DATA) ||
      localStorage.getItem(STORAGE_KEYS.USER_DATA);

    this.csrfToken = localStorage.getItem(STORAGE_KEYS.CSRF_TOKEN) || this.csrfToken;

    if (token && userData) {
      try {
        const userDataObj: UserData = typeof userData === 'string' ? JSON.parse(userData) : userData;

        this.currentUser = userDataObj;
        if (userDataObj && (userDataObj as Record<string, unknown>).profilePicture) {
          const pic = (userDataObj as Record<string, unknown>).profilePicture as string;
          userDataObj.picture = pic;
          userDataObj.profilePic = pic;
        }
        this.isAuthenticated = true;

        if (this.currentUser.googleCredential) {
          this.authSource = 'google';
        } else {
          this.authSource = 'email';
        }

        // Arka planda token süresi dolmuşsa yenilemeyi dene, ancak oturumu hemen sonlandırma
        if (isTokenExpired(token)) {
          this.refreshToken().catch((err) => {
            console.warn('[AuthService] Arka planda token yenilenemedi:', err);
          });
        }

        return true;
      } catch (error) {
        console.error('Auth veri çözme hatası:', error);
        this.clearSession();
        return false;
      }
    }

    this.isAuthenticated = false;
    this.currentUser = null;
    return false;
  }

  /**
   * Cookie'den değer al
   * @private
   */
  getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + '=')) {
        return decodeURIComponent(cookie.substring(name.length + 1));
      }
    }
    return null;
  }

  /**
   * Çıkış yap
   */
  logout(): { success: boolean; error?: string } {
    try {
      console.log('Çıkış işlemi başlatılıyor...');

      // API çıkış isteği gönder (gerçek API modunda)
      if (CONFIG.API_MODE !== 'mock') {
        // Async çağrı, sonucu beklemeden devam ediyoruz
        this.apiRequest('/auth/logout', { method: 'POST' }).catch((error) =>
          console.error('Logout API hatası:', error)
        );
      }

      // Önce tüm oturum verilerini temizle
      this.clearSession();

      // Abonelere bildir
      this.notifySubscribers();

      // Tüm önbellekleri zorla temizle
      localStorage.clear();
      sessionStorage.clear();

      // Service worker'ı resetle (varsa)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }

      // Event listener'ı geçici olarak kaldır
      window.removeEventListener('storage', this.handleStorageChange);

      // React Router tarafından yönlendirme yapılacağı için burada yönlendirme yapmıyoruz
      // window.location.replace('/') satırını kaldırdık

      return {
        success: true
      };
    } catch (error: unknown) {
      console.error('Çıkış yapılırken hata:', error);
      // Hata durumunu dön, yönlendirmeyi React Router yapacak
      return {
        success: false,
        error: (error as Error).message || 'Çıkış yapılırken bir hata oluştu'
      };
    }
  }

  /**
   * Oturum verilerini temizle
   * @private
   */
  clearSession(): void {
    try {
      console.log('Oturum verileri temizleniyor...');

      // Tüm oturum anahtarlarını bir dizide topla
      const AUTH_KEYS = [
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.CSRF_TOKEN,
        'userToken',
        'isAuthenticated',
        'user_info',
        'user_preferences'
      ];

      // LocalStorage temizle
      AUTH_KEYS.forEach((key) => {
        localStorage.removeItem(key);
      });

      // SessionStorage temizle
      AUTH_KEYS.forEach((key) => {
        sessionStorage.removeItem(key);
      });

      // Cookie'leri temizle
      const pastDate = 'Thu, 01 Jan 1970 00:00:00 GMT';

      AUTH_KEYS.forEach((key) => {
        document.cookie = `${key}=; path=/; max-age=0; expires=${pastDate}`;

        // Secure cookie'ler için domain ayarlı temizleme
        if (CONFIG.COOKIE_DOMAIN) {
          document.cookie = `${key}=; path=/; domain=${CONFIG.COOKIE_DOMAIN}; max-age=0; expires=${pastDate}`;
        }

        // Secure ve SameSite özelliklerini de ekle
        document.cookie = `${key}=; path=/; max-age=0; expires=${pastDate}; secure; samesite=strict`;
      });

      // State'i sıfırla
      this.isAuthenticated = false;
      this.currentUser = null;
      this.authSource = null;
      this.csrfToken = null;

      console.log('Tüm oturum verileri temizlendi');
    } catch (error) {
      console.error('Oturum temizleme hatası:', error);
    }
  }

  /**
   * Kullanıcının belirli bir role sahip olup olmadığını kontrol et
   * @param roles - Kontrol edilecek rol veya roller
   * @returns Kullanıcı role sahip mi
   */
  hasRole(roles: string | string[]): boolean {
    if (!this.isAuthenticated || !this.currentUser || !this.currentUser.roles) {
      return false;
    }

    if (Array.isArray(roles)) {
      return roles.some((role) => this.currentUser!.roles!.includes(role));
    }

    return this.currentUser.roles.includes(roles);
  }

  /**
   * Kullanıcının oturum açıp açmadığını kontrol et
   * @returns Kullanıcı giriş yapmış mı
   */
  isUserLoggedIn(): boolean {
    if (!this.isAuthenticated && typeof window !== 'undefined') {
      this.checkAuth();
    }
    return this.isAuthenticated;
  }

  /**
   * Geçerli kullanıcıyı getir
   * @returns Geçerli kullanıcı
   */
    /**
   * Kullanıcı profil bilgilerini (avatar, kapak vb.) istemcide hemen günceller ve tüm bileşenlere yayınlar
   */
  updateCurrentUserProfile(partial: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;
    try {
      const rawUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      const currentUser = rawUser ? JSON.parse(rawUser) : this.currentUser || {};
      const updatedUser = { ...currentUser, ...partial };
      if (partial.name || partial.fullName) {
        const resolvedName = String(partial.fullName || partial.name).trim();
        updatedUser.name = resolvedName;
        const parts = resolvedName.split(/\s+/);
        updatedUser.firstName = parts[0] || '';
        updatedUser.lastName = parts.slice(1).join(' ') || '';
      }
      const pic = partial.profilePicture || partial.profileImage || partial.picture;
      if (pic) {
        updatedUser.picture = pic;
        updatedUser.profilePic = pic;
        updatedUser.profilePicture = pic;
        updatedUser.profileImage = pic;
      }
      if (partial.coverImage) {
        updatedUser.coverImage = partial.coverImage;
      }
      this.currentUser = updatedUser;
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
      localStorage.setItem(
        STORAGE_KEYS.USER_PROFILE,
        JSON.stringify({
          name: updatedUser.name || `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim(),
          email: updatedUser.email,
          picture: updatedUser.picture || updatedUser.profilePicture || updatedUser.profileImage,
          profilePicture: updatedUser.profilePicture || updatedUser.picture || updatedUser.profileImage,
          profileImage: updatedUser.profileImage || updatedUser.profilePicture || updatedUser.picture,
          coverImage: updatedUser.coverImage
        })
      );
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: updatedUser }));
      this.notifySubscribers();
    } catch (err) {
      console.warn('[authService] updateCurrentUserProfile error:', err);
    }
  }

  getCurrentUser(): UserData | null {
    if (!this.currentUser && typeof window !== 'undefined') {
      this.checkAuth();
    }
    return this.currentUser;
  }

  /**
   * Geçerli auth kaynağını getir
   * @returns Auth kaynağı ('email', 'google', etc.)
   */
  getAuthSource(): string | null {
    return this.authSource;
  }

  /**
   * Auth token'ını getir
   * @returns Auth token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
      this.getCookie(STORAGE_KEYS.AUTH_TOKEN)
    );
  }
}

// Singleton instance
const authService = new AuthService();

export default authService;
