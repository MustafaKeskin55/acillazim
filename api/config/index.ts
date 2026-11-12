// API yapılandırma dosyası

// API temel URL'i
export const API_BASE_URL: string =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

// API endpoint'leri
export const API_ENDPOINTS = {
    // Kategori endpoint'leri
    categories: {
        main: '/categories/main',
        sub: '/categories/sub',
        details: '/categories/details',
        path: '/categories/path'
    },

    // İlan endpoint'leri
    listings: {
        create: '/listings',
        update: '/listings/:id',
        delete: '/listings/:id',
        details: '/listings/:id',
        images: '/listings/images',
        deleteImage: '/listings/images/:id'
    },

    // Kullanıcı endpoint'leri
    users: {
        profile: '/users/profile',
        listings: '/users/:id/listings'
    }
};

// API istek yapılandırması
export const API_CONFIG = {
    timeout: 30000, // 30 saniye
    headers: {
        'Content-Type': 'application/json'
    }
};
