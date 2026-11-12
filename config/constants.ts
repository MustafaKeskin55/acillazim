/**
 * Uygulama genelinde kullanÄ±lan sabitler
 */

// LocalStorage ve SessionStorage anahtarlarÄ± â€” KullanÄ±cÄ± (public site)
export const STORAGE_KEYS = {
  AUTH_TOKEN:    'auth_token',
  USER_DATA:     'user_data',
  USER_PROFILE:  'user_profile',
  REFRESH_TOKEN: 'refresh_token',
  CSRF_TOKEN:    'csrf_token',
} as const;

// Panel (admin) oturumu iÃ§in ayrÄ± storage anahtarlarÄ±
// KullanÄ±cÄ± oturumuyla karÄ±ÅŸmaz; tÃ¼mÃ¼ sessionStorage'da tutulur.
export const PANEL_STORAGE_KEYS = {
  PANEL_TOKEN:   'panel_auth_token',
  PANEL_USER:    'panel_user_data',
  OPERATOR_KEY:  'operator_key_code',
  OPERATOR_ID:   'operator_id',
  OPERATOR_ROLE: 'operator_role',
  OPERATOR_NAME: 'operator_name',
} as const;

// API ile ilgili sabitler
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  TIMEOUT: 30000, // 30 saniye
  RETRY_COUNT: 3
} as const;

// reCAPTCHA ayarlarÄ±
export const RECAPTCHA = {
  SITE_KEY: '6Lfd8eMtAAAAAPRYD1RxzTw9WzaF9TQMz4SxeZWZ',
  HTML_KEY: '6Lfd8eMtAAAAAPRYD1RxzTw9WzaF9TQMz4SxeZWZ',
  SECRET_KEY: '6Lfd8eMtAAAAAMg5BAN3pJcHJ4Lxe-r3vY--w2uC',
  ACTION_LOGIN: 'login',
  ACTION_REGISTER: 'register',
  ACTION_PASSWORD_RESET: 'password_reset',
  MIN_SCORE: 0.5 // 0.0 (bot) - 1.0 (insan) arasÄ±nda minimum kabul edilebilir skor
} as const;

// KullanÄ±cÄ± rolleri
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  SELLER: 'seller'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// DoÄŸrulama kurallarÄ±
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
} as const;

