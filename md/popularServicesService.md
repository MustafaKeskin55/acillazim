# popularServicesService Entegrasyon Planı

`services/popularServices` popüler hizmet ilanları / carousel verisini yönetir:
*   `popularServicesService.ts` — önbellekli facade (`getPopularServices`, kategori/şehir/fiyat, carousel)
*   `popularServicesAPI.ts` — mock: `üründat.json` + `categories-data.json` Hizmetler ağacı üzerinden client-side filtre

**Kapsam:** Web (`services/popularServices`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/popular-services`, `/api/services/popular` ham path kullanılmaz).

**İlgili sözleşmeler:**
*   İlan listesi → `listingsService` / `homeService`: `GET /api/v1/listings?...` (`is_service` veya `category_id=12540&include_descendants=true`)
*   Popüler hizmet kategorileri → `categoryService.getPopularServiceCategories` (`GET /api/v1/categories...`)
*   `serviceHomeService` aynı mock kaynağı kullanır; tek listings yoluna indirgenebilir

**Client-only:** In-memory cache (`clearCache`, `getStats`); normalize map (ProductCard alanları).

---

## 1. API Yolları (Endpoints)

### A. Popüler Hizmet İlanları
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Açıklama:** Hizmet kapsamındaki ilanları popülerlik / tarih / fiyat sıralı döner. Mock’taki vitrin+tarih skoru BE `sort` ile karşılanmalı.
*   **Query Parametreleri:**
    *   `category_id` = hizmet kökü (`12540`) **veya** `is_service=true`
    *   `include_descendants` = `true`
    *   `page` = `1`
    *   `page_size` / `limit` (örn. `10`–`50`)
    *   `sort` — `popular` | `date` | `price` (FE `sortBy`)
    *   `il` — şehir (FE `city`)
    *   `fiyat_min` / `fiyat_max` — FE `minPrice` / `maxPrice`
*   **Örnek:** `GET /api/v1/listings?is_service=true&include_descendants=true&sort=popular&page_size=15&il=İstanbul`
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `ServiceCardCategory` → `getServicesForCarousel`; `getPopularServices`, `getPopularServicesByCity`, `getPopularServicesByPriceRange`
*   **Mock:** `fetchPopularServices` + `üründat.json`

---

### B. Kategoriye Göre Popüler Hizmetler
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Query:** A ile aynı + `category_id={categoryId}` (+ `include_descendants` ihtiyaca göre)
*   **Örnek:** `GET /api/v1/listings?category_id=12541&include_descendants=true&sort=popular&page_size=10`
*   **Kullanan FE:** `getPopularServicesByCategory`
*   **Mock:** `fetchPopularServicesByCategory`

---

### C. Popüler Hizmet Kategorileri (ilan sayısına göre)
*   **Yol (Endpoint) — önerilen:** `GET /api/v1/categories/popular-services`  
    veya mevcut `categoryService` popüler hizmet endpoint’i.
*   **Açıklama:** En çok ilanı olan hizmet alt kategorileri + `listingCount`. Ayrı `/api/popular-services/categories` alias’ı yok.
*   **Query:** `limit` (varsayılan `8`)
*   **Örnek yanıt data:**
    ```json
    [
      { "categoryId": 12541, "listingCount": 42 },
      { "categoryId": 12542, "listingCount": 30 }
    ]
    ```
*   **Alternatif:** Listings aggregate yoksa FE/BE `categoryService` + count; mock’taki `fetchPopularServiceCategories` kaldırılır.
*   **Kullanan FE:** `getPopularServiceCategories` (şu an UI’da az bağlı)

---

### D. Dedicated popular-services (opsiyonel BE)
*   **Önerilen (opsiyonel):** `GET /api/v1/services/popular` → normalize edilmiş carousel payload.
*   Alias yok; yoksa A yeterli. FE facade aynı kalır.

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

### NormalizedService (FE kart modeli — mock çıktısı)
```typescript
interface NormalizedService {
  id: number | string;
  title?: string;
  price?: number;
  currency?: string;
  city?: string;
  district?: string;
  image: string | null;
  date?: string;
  isVitrin: boolean;
  category_id?: number | string;
  location?: { il?: string; ilce?: string };
  description?: string;
  images: string[];
}
```
API düz listing dönerse FE mevcut normalize map’i uygular (`ilan_id`→`id`, `baslik`→`title`, …).

### PopularCategory
```typescript
interface PopularCategory {
  categoryId: number;
  listingCount: number;
}
```

### Listings list yanıtı
`listingsService` / `filterService` ile aynı: `{ listings, totalListings, ... }` veya `{ success, data }`.

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` → `/api/v1/listings?...`. Alias yok.
2.  **Mock kaldırma:** `popularServicesAPI` JSON + `setTimeout` → gerçek fetch; `USE_MOCK` bayrağı.
3.  **Hizmet kökü:** Hardcoded Hizmetler ağacı parse → `is_service` / kategori API (`12540` fallback).
4.  **Delege:** Mümkünse `listings` base / `homeService` ile paylaş; çift mock (`serviceHomeService`) birleştirilsin.
5.  **Kategoriler:** C için `categoryService` tercih; ayrı count endpoint yoksa BE’den gelmeli.
6.  **Cache:** 5 dk in-memory kalabilir; BE değişince `clearCache()`.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getServicesForCarousel` | `ServiceCardCategory` |
| `getPopularServices` / ByCity / ByPriceRange / ByCategory | Facade; Service sayfası kısmen `serviceHomeService` kullanıyor |
| `getPopularServiceCategories` | Tanımlı; popüler kategori grid’i çoğu yerde JSON / `categoryService` |

---

## 5. Notlar

*   Mock: `data/üründat.json`, `data/categories-data.json`.
*   `Service.tsx` featured için `serviceHomeService.getFeaturedServiceListings` kullanır — bu klasörle örtüşür; tek sözleşme listings olmalı.
*   `sort=popular` BE semantiği netleştirilmeli (vitrin ağırlıklı / view count / manuel score).
*   Mobil popular-services bu planın kapsamı dışındadır.
