import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './config';

// Axios instance oluştur
const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 saniye
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor
client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (typeof window !== 'undefined') {
            // Kullanıcı auth token'ı
            const token = localStorage.getItem('auth_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // Panel oturumu varsa operatör anahtar kodu ekle.
            // Backend bu header'a bakarak işlemi hesap sahibine değil,
            // anahtar kodunu kullanan operatöre atfeder.
            const operatorKey = sessionStorage.getItem('operator_key_code');
            if (operatorKey) {
                config.headers['X-Operator-Key'] = operatorKey;
            }

            // Panel token'ı varsa panel istekleri için ekle
            const panelToken = sessionStorage.getItem('panel_auth_token');
            if (panelToken) {
                config.headers['X-Panel-Token'] = panelToken;
            }
        }
        return config;
    },
    (error: unknown) => {
        return Promise.reject(error);
    }
);

// Response interceptor
client.interceptors.response.use(
    (response) => {
        return response;
    },
    (error: { response?: { status: number } }) => {
        if (error.response && typeof window !== 'undefined') {
            // Sunucu hata yanıtı döndürdü
            switch (error.response.status) {
                case 401:
                    // Oturum süresi dolmuş
                    localStorage.removeItem('auth_token');
                    window.location.href = '/giris';
                    break;
                case 403:
                    // Yetkisiz erişim
                    window.location.href = '/erisim-yok';
                    break;
                case 404:
                    // Kaynak bulunamadı (sayfa yönlendirmesi yapılmaz, component bazlı yönetilir)
                    console.warn('[API Client] 404 Kaynak bulunamadı');
                    break;
                case 500:
                    // Sunucu hatası (sayfa yönlendirmesi yapılmaz, component bazlı yönetilir)
                    console.error('[API Client] 500 Sunucu hatası');
                    break;
                default:
                    // Diğer hatalar
                    break;
            }
        }
        return Promise.reject(error);
    }
);

export default client;
