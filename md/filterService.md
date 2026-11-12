# filterService Entegrasyon Planı

`services/filters` klasörü, filtre sayfası (`FilterPage`) için filtre tanımları, filtrelenmiş ilan listesi, URL parse/build, kategori ağacı ve harita konumunu yönetir. Ana giriş `filterService.ts`; veri şu an `mockFilterData.fakeFetchFilterData` + lokal JSON üzerinden simüle edilir.

**Kapsam:** Web (`services/filters`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/filters/...`, `/listings/search` ham path kullanılmaz).

**İlgili sözleşmeler (tekrar tanımlama):**
*   Kategori filtre tanımları → `CreateListingService` / `categoryService` ile aynı: `GET /api/v1/categories/{categoryId}/filters`
*   Kategori ağacı → `categoryService`: `GET /api/v1/categories...`
*   Banner filtreleri (`/api/v1/banner/filters`) bu servisin konusu değildir.

**Client-only (BE endpoint yok):** `buildFilterUrl`, `parseFilterFromUrl`, `getFilterTags`, `createFilterTags`, `formatFilterLabel` / `formatFilterValue` / `formatPrice`, `normalizeLocationFilters`, `urlSecurityService`.

---

## 1. API Yolları (Endpoints)

### A. Kategori Filtre Tanımlarını Getir
*   **Yol (Endpoint):** `GET /api/v1/categories/{categoryId}/filters`
*   **Açıklama:** Filtre sidebar’ı için kategoriye bağlı dinamik alan tanımlarını döner (label, type, options, unit, urlParam). İlan formu filtreleri ile aynı endpoint; banner filtreleri ile karıştırılmamalıdır.
*   **Parametreler:** `categoryId` (path)
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `getFilterOptions`, `getFilterTags`, `buildFilterUrl`, `parseFilterFromUrl` → `fetchFilterDefinitionsFromApi`
*   **Mock:** `mockFilterData` → `loadDataFromSource('filters')` / `data/filtre/*.json`

---

### B. Filtrelenmiş İlan Listesi
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Açıklama:** Kategori + filtre query’lerine göre sayfalanmış ilan listesi. Filtreleme ve sıralama **BE tarafında** yapılır; FE client-side leaf-kategori batch + `window._listingsCache` kaldırılacak.
*   **Query Parametreleri:**
    *   `category_id` (number, opsiyonel) — `0` veya yok → tüm ilanlar (`/filtrele/tum-ilanlar`)
    *   `include_descendants` (boolean, varsayılan `true`) — üst kategori seçildiğinde alt leaf’leri dahil et
    *   `page` (number, varsayılan `1`)
    *   `page_size` (number, varsayılan `20`)
    *   `sort` (string, opsiyonel) — örn. `fiyat_artan`, `fiyat_azalan`, `tarih_artan`, `tarih_azalan`
    *   Dinamik filtreler: `fiyat_min`, `fiyat_max`, `para_birimi`, `il`, `ilce`, `mahalle`, `ilan_tarihi`, `vitrin_durumu`, `kimden`, `net_m2_min` / `net_m2_max`, … (filtre tanımındaki `urlParam` / `db_field` ile uyumlu)
*   **Örnek İstek:** `GET /api/v1/listings?category_id=4&page=1&page_size=20&sort=fiyat_artan&fiyat_min=1000000&il=İstanbul`
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `FilterPage` → `getFilteredListings`
*   **Mock:** `fakeFetchFilterData('filteredListings', …)` + leaf kategori paralel istekleri

---

### C. İlan Kaynağı Seçenekleri (kimden)
*   **Yol (Endpoint):** Ayrı endpoint yok (önerilen).
*   **Açıklama:** `kimden` seçenekleri filtre tanımındaki `options` / `optionsSource` ile gelir (endpoint A). FE `getListingSourceOptions` gerçek API’de A yanıtından türetilmeli veya kaldırılmalı.
*   **Mevcut mock:** `fakeFetchFilterData('listingSourceOptions', { categoryId })`
*   **Kullanan FE:** `getFilterTags` (etiket label), sidebar kimden UI

---

### D. Konum Filtre Seçenekleri
*   **Yol (Endpoint):** `locationService` sözleşmesi (il / ilçe / mahalle). Bu klasörde ek path yok.
*   **Kullanan FE:** `getLocationFilterOptions` → `locationService.getAllCities` / `getDistrictsByCity` / `getQuartersByDistrict`
*   **Not:** `locationFilterService` yalnızca mock köprüsü; senkron mahalle listesi boş döner — gerçek veri `locationService` async API’den gelmeli.

---

### E. Kategori Ağacı / Leaf ID’ler
*   **Yol (Endpoint):** `categoryService` → `GET /api/v1/categories...`
*   **Açıklama:** `categoryTreeService` path/breadcrumb/leaf hesapları client-side; veri kaynağı kategori API’si olmalı (`data/categories-data.json` kaldırılacak).
*   **Kullanan FE:** `FilterPage`, `CategoryTreeView`, `CategoryPathDisplay` → `getCategoryTree`, `findCategoryPath`, `getLeafCategoryIds`, `getCategoryIdBySlug`
*   **Gerçek API’de:** `getFilteredListings` leaf batch’i kaldırılır; BE `include_descendants=true` ile tek istekte çözer (endpoint B).

---

### F. Harita Konumları
*   **Yol (Endpoint):** Bu sözleşmede yok (harici geocode / lokal önbellek).
*   **Açıklama:** `mapLocationService` ilanlara lat/lng ekler; `localStorage` (`acillazim_koordinat_onbellek`) + `üründat.json` preload. Listings API konum döndürürse FE geocode ihtiyacı azalır.
*   **Kullanan FE:** `FilterResults` → `getListingLocations`

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

### AdaptedDynamicFilter (filtre tanımı — FE normalize)
```typescript
interface AdaptedDynamicFilter {
  id: string | number;
  urlParam: string | number;
  label: string;
  type: string;              // multi-select | checkbox | radio | select | range | price | ...
  formatting: string;
  unit: string;
  apiField: string;
  isRequired: boolean;
  allowMultiple: boolean;
  dependsOn: unknown;
  optionsSource: string | null;
  options: string[] | Array<{ id?: string; value?: string | number; label?: string }>;
}
```

### getFilterOptions yanıt şekli (FE bugün bekler)
```json
{
  "filters": [ /* AdaptedDynamicFilter[] */ ],
  "categoryFilters": [ /* aynı dizi */ ],
  "dynamicFiltersCount": 0,
  "timestamp": "2026-07-20T00:00:00.000Z",
  "category_id": 4
}
```
API `{ success, data: AdaptedDynamicFilter[] }` dönerse FE unwrap + bu şekle map etmeli.

### getFilteredListings yanıt şekli
```json
{
  "listings": [ /* Listing özet[] */ ],
  "totalPages": 5,
  "totalListings": 100,
  "currentPage": 1,
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalListings": 100
  }
}
```
API `{ success, data: { listings, pagination } }` dönerse FE unwrap etmeli.

### FilterTag (client-only)
```typescript
interface FilterTag {
  id: string;
  label: string;
  value: string;
  original?: unknown;
  originalId?: string;
  isMultiValue?: boolean;
  valueIndex?: number;
  paraBirimi?: string;
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` (tam yol: `/api/v1/listings`, `/api/v1/categories/{id}/filters`). Alias yok.
2.  **Mock kaldırma:** `fakeFetchFilterData` / `mockFilterData` → gerçek `fetch` veya `@/api/client`. `USE_API` / `USE_MOCK_DATA` bayrağı eklenebilir.
3.  **Client-side filtreleme:** Leaf kategori paralel istekleri + `filterListings` + `window._listingsCache` kaldırılacak; tek `GET /api/v1/listings` yeterli.
4.  **URL’den kategori tespiti:** `window.location` parse’ı `FilterPage`’de kalabilir; servise taşınmamalı. Servis `categoryId`’yi parametre olarak almalı.
5.  **kimden:** Ayrı mock endpoint yerine filtre tanımlarından türet.
6.  **categoryTreeService:** `categories-data.json` + crypto/security simülasyonu → `categoryService` API.
7.  **Konum:** `getCityNameById` vb. `require('../../data/location data/...')` → `locationService`.
8.  **Ortak client (opsiyonel):** `@/api/client`.

---

## 4. FE Kullanım Haritası

| Fonksiyon / Modül | Sayfa / Bileşen |
|-------------------|-----------------|
| `getFilterOptions` / `getFilteredListings` / `parseFilterFromUrl` / `buildFilterUrl` | `FilterPage` |
| `fakeFetchFilterData` (geçici) | `FilterSidebar` |
| `getCategoryTree` / `findCategoryPath` / `getCategoryIdBySlug` / `getLeafCategoryIds` | `FilterPage`, `CategoryTreeView`, `CategoryPathDisplay` |
| `getListingLocations` | `FilterResults` |
| `secureUrl` / `isValidFilterUrl` | `FilterPage` |
| `getLocationFilterOptions` | Konum filtre UI |
| `getFilterTags` / `createFilterTags` | Aktif filtre rozetleri |

---

## 5. Notlar

*   Mock kaynaklar: `data/filtre/*.json`, listings JSON, `data/categories-data.json`, `data/üründat.json`.
*   `filters_ref`: Mock’ta bir kategori başka kategorinin filtrelerini referans eder; BE aynı semantiği `GET .../filters` içinde çözmeli veya FE’ye düz liste dönmeli.
*   `vitrin_durumu=vitrin` bugün FE’de `vitrinService`’e sapıyor; gerçek API’de query param olarak B endpoint’inde çözülmeli.
*   Security alt klasörü (`cryptoService`, `categorySecurityService`, `urlSecurityService`) mock/güvenlik simülasyonu; URL güvenlik yardımcıları kalabilir, kategori şifreleme gerçek API’de gerekli değil.
*   `FilterSidebar` hâlâ `fetchFilterLocation` / `formatCurrency` import ediyor; `filterService` export etmiyor — entegrasyon sırasında düzeltilmeli (formatCurrency local veya `formatPrice`).
*   Mobil filtre servisleri bu planın kapsamı dışındadır.
