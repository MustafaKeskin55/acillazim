# listingsService Entegrasyon Planı

`services/listings` klasörü ilan okuma/listeleme alt servislerini barındırır:
*   `base/baseListingsService.ts` — ortak liste/detay, mock↔API, kategori map, ilan normalize
*   `featured-listings` — öne çıkan (`one_cikan`)
*   `vitrin-listings` — vitrin
*   `nearby-listings` — şehir/ilçe/geo’ya göre yakın ilanlar
*   `popular-locations` — popüler şehirler
*   `util/listingUtils.ts` — client-only (HTML decode, görsel URL) — BE endpoint yok

**Kapsam:** Web (`services/listings`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/listings`, `http://localhost:3000/api/listings`, `/api/locations/popular` v1’siz kullanılmaz).

**İlgili sözleşmeler:**
*   İlan CRUD / görsel → `CreateListingService` (`POST|PUT|DELETE /api/v1/listings...`)
*   Filtreli arama → `filterService` (`GET /api/v1/listings?...`)
*   Ana/hizmet facade → `homeService`
*   Kategori ağacı → `categoryService` (`GET /api/v1/categories...`); base içindeki `categroies_data.json` map’i kaldırılacak

**Mod:** `api/config.ts` → `USE_API = false` mock (`üründat.json`); `true` → gerçek API.

---

## 1. API Yolları (Endpoints)

### A. İlan Listesi
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Açıklama:** Sayfalanmış ilan listesi. Filtreleme/sıralama BE’de.
*   **Query Parametreleri (hepsi opsiyonel):**
    *   `category_id` (number)
    *   `include_descendants` (boolean, varsayılan `true`) — FE bugün `includeSubcategories`
    *   `page` (number, varsayılan `1`)
    *   `page_size` (number, varsayılan `30`) — FE bugün `pageSize`
    *   `vitrin_durumu` — `vitrin` | `one_cikan`
    *   `il` / `ilce` — konum (nearby)
    *   `lat` / `lng` — geo nearby (opsiyonel)
    *   diğer filtreler → `filterService` ile aynı
*   **Örnekler:**
    *   `GET /api/v1/listings?category_id=4&page=1&page_size=30&include_descendants=true`
    *   `GET /api/v1/listings?vitrin_durumu=one_cikan&page_size=20`
    *   `GET /api/v1/listings?vitrin_durumu=vitrin&page_size=55`
    *   `GET /api/v1/listings?il=İstanbul&page_size=15`
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `BaseListingsService.getListings`, `ProductList`, `CardCategory`, `FeaturedListings` (normalize), `UserIlanlar` / profil listing display, featured/vitrin/nearby alt servisleri
*   **Mock:** `üründat.json` (`USE_API = false`)

---

### B. İlan Detayı
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}`
*   **Açıklama:** Tek ilan detayı (görüntüleme / zenginleştirme). CreateListing düzenleme detayı ile aynı path.
*   **Parametreler:** `listingId` (path)
*   **Kullanan FE:** `BaseListingsService.getListing`
*   **Not:** Ürün detay sayfası ayrı controller/API kullanabilir; bu base metod aynı sözleşmeye bağlanmalı.

---

### C. Öne Çıkan İlanlar
*   **Yol (Endpoint):** `GET /api/v1/listings?vitrin_durumu=one_cikan`
*   **Açıklama:** Ayrı `/featured` path yok. FE `featuredListingsService.getFeaturedListings(limit)`.
*   **Bugün (API mod):** Tüm listings çekilip client-side filtreleniyor → query’ye `vitrin_durumu=one_cikan` taşınmalı.
*   **Kullanan FE:** `homeService`, `FeaturedListings`

---

### D. Vitrin İlanları
*   **Yol (Endpoint):** `GET /api/v1/listings?vitrin_durumu=vitrin`
*   **Açıklama:** Ayrı `/vitrin` path yok. `getVitrinListings`, `getOneCikanVitrinListings` (`vitrin`+`one_cikan`), `getVitrinListingsByCategory` (ek `category_id`).
*   **Kullanan FE:** `homeService`, `VitrinListings`, `filterService` (vitrin sapması)

---

### E. Yakın / Şehir İlanları
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Query:** `il`, `ilce`, opsiyonel `lat`/`lng`, `page_size`
*   **Açıklama:** FE bugün tüm ilanları çekip client-side şehir/ilçe filtreler; geo için `Math.random` skoru var (geçici). BE konum/mesafe çözmeli.
*   **Kullanan FE:** `nearbyListingsService` → `NearbyListings`, `LocationModal`
*   **Kırık import:** `Page/ProductDetail/.../NearbyListings.tsx` → `@/services/listings/nearbyListingsService` + `getCurrentUserNearbyListings` (dosya/export yok). Doğru path: `nearby-listings/nearbyListingsService`.

---

### F. Popüler Lokasyonlar (şehirler)
*   **Yol (Endpoint):** `GET /api/v1/locations/popular`
*   **Açıklama:** Ana sayfa / PopularLocation için popüler şehir listesi.
*   **Örnek yanıt data:**
    ```json
    { "popularCities": [ { "id": 1, "name": "İstanbul", "slug": "istanbul" } ] }
    ```
*   **Kullanan FE:** `popularLocationsService.fetchPopularCities` / `getPopularCities`
*   **Mock:** `data/listing/popularLocations/cities.json`
*   **Eski FE path:** `/api/locations/popular` → v1’e çekilecek. Alias yok.

---

### G. Kategori Path (ilan kartı breadcrumb) — FE client-side
*   **Mevcut:** `getCategoryPath` JSON map üzerinden.
*   **Hedef:** `categoryService` / `GET /api/v1/categories/{id}/path` (opsiyonel; `categoryService.md`).

---

## 2. Veri Modelleri (Request & Response)

### Standart API Yanıt Yapısı
```json
{
  "success": true,
  "data": <Veri>,
  "message": "İşlem başarıyla gerçekleştirildi"
}
```

### ListingsResult (FE beklediği düz şekil)
```json
{
  "listings": [ /* DuzenlenmisIlan[] */ ],
  "totalListings": 100,
  "currentPage": 1,
  "totalPages": 4,
  "pageSize": 30
}
```
API `{ success, data: { listings, pagination } }` dönerse FE unwrap etmeli (`base` zaten `data.listings || data.data` deniyor).

### DuzenlenmisIlan (normalize sonrası kart modeli)
```typescript
interface DuzenlenmisIlan {
  id?: number | string;
  ilan_id?: number | string;
  category_id?: number | string;
  baslik?: string;
  title?: string;
  fiyat?: number;
  price?: number;
  para_birimi?: string;
  currency?: string;
  kategori?: string;
  kategoriYolu?: string[];
  il?: string;
  ilce?: string;
  mahalle?: string;
  city?: string;
  location?: string;
  resim?: string | null;
  img?: string | null;
  resimler?: string[];
  images?: string[];
  vitrin_durumu?: string | string[];
  ilan_tarihi?: string;
  ozellikler?: Record<string, unknown>;
}
```

### PopularCity
```typescript
interface PopularCity {
  id: number | string;
  name: string;
  slug: string;
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `apiBaseUrl` = `{host}/api/v1` (relative default `/api/v1`). Eski `api/config` `http://localhost:3000/api` + `/listings` bu sözleşmenin alias’ı değildir.
2.  **Query isimleri:** `categoryId`→`category_id`, `pageSize`→`page_size`, `includeSubcategories`→`include_descendants`.
3.  **Featured/vitrin/nearby:** Client-side full-scan yerine A query’sinde `vitrin_durumu` / `il` / `ilce`.
4.  **Popular locations:** `/api/locations/popular` → `/api/v1/locations/popular`.
5.  **Kategori map:** `categroies_data.json` → `categoryService` API.
6.  **Kırık nearby import:** ProductDetail `NearbyListings` düzeltilmeli.
7.  **listingUtils:** API yok; kalır.
8.  **index.ts:** `categoryService` re-export’u listings sözleşmesi değildir; tüketiciler `@/services/category` kullanmalı.

---

## 4. FE Kullanım Haritası

| Modül / Fonksiyon | Sayfa / Bileşen |
|-------------------|-----------------|
| `getListings` / `getListing` / `_ilanDuzenle` | `ProductList`, `CardCategory`, `UserIlanlar`, `ListingGrid` / `ListingList`, `userIlanService` |
| `featuredListingsService` | `homeService`, `FeaturedListings` |
| `vitrinListingsService` | `homeService`, `VitrinListings`, `filterService` |
| `nearbyListingsService` | `NearbyListings`, `LocationModal` |
| `popularLocationsService` | `PopularLocation` |
| `listingUtils` | `ProductCard`, `ProductDetail*`, `SearchBox`, `Breadcrumb2`, `FilterResults` |

---

## 5. Notlar

*   Mock: `data/üründat.json`, `data/categroies_data.json`, `data/listing/popularLocations/cities.json`.
*   `USE_API` tek bayrak (`api/config.ts`); CreateListing’in `USE_MOCK_DATA`’sından bağımsız — hizalanmalı.
*   `vitrin_durumu` string veya dizi olabilir.
*   CreateListing yazma endpoint’leri bu planın tekrarı değildir; okuma listesi burada netleşir.
*   Mobil listings servisleri bu planın kapsamı dışındadır.
