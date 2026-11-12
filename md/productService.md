# productService Entegrasyon Planı

`services/products` kategori sayfası / ürün listesi facade’ıdır:
*   `productService.ts` — sayfalı ürün listesi, kategori/şehir/tip filtre, popüler, benzer, favori; `USE_API` ile mock↔API
*   `similarProductsService.ts` — detay sayfası benzer ilanlar (`SimilarProducts`)

**Kapsam:** Web (`services/products`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/products`, `http://localhost:3000/api/products` kullanılmaz).

**İlgili sözleşmeler:**
*   Liste / detay / benzer → `listingsService` / `productDetailService`: `GET /api/v1/listings...`
*   Favori → `favoriteService` (`/api/v1/favorites/add|remove/...`) — `/favorites/toggle` yok
*   Kategori ağacı → `categoryService`

**Mod:** `api/config.ts` → `USE_API = false` mock (`üründat.json` + `categories-data.json`); `true` → gerçek API.

---

## 1. API Yolları (Endpoints)

### A. Ürün / İlan Listesi
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Açıklama:** Kategori sayfası ürün grid’i. Filtreleme BE’de; `include_descendants` ile alt kategoriler.
*   **Eski FE path:** `/products` → kaldırıldı.
*   **Query Parametreleri:**
    *   `category_id` (number)
    *   `include_descendants` = `true` (varsayılan kategori sayfasında)
    *   `page`, `page_size` (FE `limit` → `page_size`)
    *   `il` (FE `city`)
    *   `listing_type` / `vitrin_durumu` (FE `listingType`)
    *   `fiyat_min` / `fiyat_max` (FE `minPrice` / `maxPrice`)
    *   `q` (FE `searchQuery`)
*   **Örnek:** `GET /api/v1/listings?category_id=4&include_descendants=true&page=1&page_size=10&il=İstanbul`
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `CategoryPage` → `getProducts` / `getProductsByCategory`

---

### B. İlan Detayı
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}`
*   **Eski FE path:** `/products/{id}` → kaldırıldı.
*   **Kullanan FE:** `getProductById`, `fetchProductDetail` (fake product generator mock’ta — gerçekte listings/productDetail)

---

### C. Benzer İlanlar
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}/similar`
*   **Query:** `limit` (veya `page_size`), opsiyonel `category_id`
*   **Eski FE path:** `/products/{id}/similar` → kaldırıldı.
*   **Kullanan FE:** `similarProductsService.getSimilarProducts`, `productService.getSimilarProducts` / `fetchSimilarProducts` — tek yola indirgenecek

---

### D. Popüler Ürünler
*   **Yol (Endpoint):** `GET /api/v1/listings?sort=popular&page_size={limit}`  
    veya `vitrin_durumu=one_cikan` (`homeService` / listings ile aynı).
*   **Eski FE path:** `/products/popular` → kaldırıldı (alias değil).
*   **Kullanan FE:** `getPopularProducts`

---

### E. Favori Ekle / Çıkar
*   **Yol (Endpoint):** `favoriteService` — `POST /api/v1/favorites/add`, `DELETE /api/v1/favorites/remove/{listingId}`
*   **Eski FE:** `POST /favorites`, `DELETE /favorites/{id}`, `POST /favorites/toggle` → kaldırıldı.
*   **Body (add):** `{ "listing_id": 123 }`
*   **Kullanan FE:** `addToFavorites` / `removeFromFavorites` / `toggleFavorite` → favoriteService’e delege

---

### F. Şehir / İlan tipi
*   A ile aynı listings query (`il`, `listing_type`). Ayrı path yok.
*   **Kullanan FE:** `getProductsByCity`, `getProductsByListingType`

---

## 2. Veri Modelleri (Request & Response)

### Standart API Yanıt Yapısı
```json
{
  "success": true,
  "data": <Veri>,
  "message": "OK"
}
```

### ProductsResult (FE beklediği şekil)
```json
{
  "success": true,
  "source": "api",
  "data": {
    "products": [ /* ProductItem[] */ ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```
API `{ listings, totalListings, ... }` dönerse FE `products` / `total` map etmeli.

### ProductItem (normalize)
```typescript
interface ProductItem {
  id: number;
  product_id: number;
  title: string;
  price: number;
  para_birimi: string;
  description: string;
  images: string[];
  image: string | null;
  location: string;
  city: string;
  district: string;
  date: string;
  seller: string;
  categories: string;
  category_id: number | null;
  status: string;
  isUrgent: boolean;
  isFeatured: boolean;
  isNew: boolean;
}
```

### SimilarProductResult (`similarProductsService`)
```typescript
interface SimilarProductResult {
  id: number;
  ilan_id: number;
  title?: string;
  price?: number;
  para_birimi: string;
  image: string | null;
  images: string[];
  city: string;
  location: string;
  date?: string;
  category_id?: number;
  ilan_turu: string;
  listingType: string;
  topCategory: string;
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `apiBaseUrl` = `{host}/api/v1` (eski `api/config` `.../api` + `/products` kaldırıldı).
2.  **Path’ler:** `/products` → `/listings`; similar → `/listings/{id}/similar`.
3.  **Query:** `limit`→`page_size`, `city`→`il`, `minPrice`→`fiyat_min`, `searchQuery`→`q`, `include_descendants=true`.
4.  **Favori:** `favoriteService`; toggle endpoint yok.
5.  **Çift benzer servis:** `productService` + `similarProductsService` + `productDetail.getSimilarProducts` birleştirilsin.
6.  **Fake detail:** `generateFakeProduct` / picsum mock yalnızca `USE_API=false`; API’de listings detay.
7.  **categoryPathApi:** Benzer kart `topCategory` için; kategori path → `categoryService`.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getProducts` / `getProductsByCategory` | `CategoryPage` |
| `addToFavorites` / `removeFromFavorites` | `CategoryPage` |
| `getSimilarProducts` | `SimilarProducts` (`similarProductsService`) |
| `getProductById` / `fetchProductDetail` / `getPopularProducts` | Facade / legacy export’lar |

---

## 5. Notlar

*   Mock: `data/üründat.json`, `data/categories-data.json`.
*   `listingsService` / `filterService` / `productDetailService` ile aynı listings kaynağı — tek BE sözleşmesi.
*   Mobil products bu planın kapsamı dışındadır.
