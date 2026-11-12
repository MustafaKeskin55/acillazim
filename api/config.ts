// API yapılandırma dosyası

// API temel URL'i
export const API_BASE_URL: string =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

// Gelistirme: false (mock data) | Uretim: true (gercek API)
export const USE_API: boolean = true;

// Endpoint yapısı
interface CategoriesEndpoints {
    main: string;
    sub: string;
    details: string;
    path: string;
}

interface ListingsEndpoints {
    create: string;
    update: string;
    delete: string;
    details: string;
    images: string;
    deleteImage: string;
}

interface UsersEndpoints {
    profile: string;
    listings: string;
}

interface ApiEndpoints {
    categories: CategoriesEndpoints;
    listings: ListingsEndpoints;
    users: UsersEndpoints;
}

// API endpoint'leri
export const API_ENDPOINTS: ApiEndpoints = {
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
interface ApiConfig {
    timeout: number;
    headers: {
        'Content-Type': string;
    };
}

export const API_CONFIG: ApiConfig = {
    timeout: 30000, // 30 saniye
    headers: {
        'Content-Type': 'application/json'
    }
};
