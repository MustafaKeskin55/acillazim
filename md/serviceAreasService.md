# serviceAreasService Entegrasyon Planı

`services/serviceAreas` hizmet alanları paneli + public vitrin + harita/manuel bölge kaydını yönetir:

*   `myServicesDashboardService.ts` — Panel “Hizmet Alanlarım” listesi / istatistik / tek satır
*   `serviceAreasClient.ts` — Public kategori / sağlayıcı / bölge keşif (şu an random generate)
*   `serviceAreasAPI.ts` — Context harita/manuel store (bellek + sahte token)
*   `mockServiceAreaApi.ts` — Harita CRUD (`localStorage` `serviceAreas`)
*   `serviceAreasListingMock.ts` — İlan bazlı bölge mock (`localStorage`)

**Kapsam:** Web (`services/serviceAreas`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/service-areas`, `services/dashboard/mine`, `https://api.acillazim.com/api/...` v1’siz kullanılmaz).

**İlgili sözleşmeler:**
*   Hizmet ilanları → `listingsService` / `popularServicesService`: `GET /api/v1/listings?is_service=true`
*   Hizmet kategorileri → `categoryService`: `GET /api/v1/categories?...`
*   İl/ilçe/mahalle seçici → `locationService`: `/api/v1/locations/...`
*   Dashboard yorumlar → `dashboardReviewsService`
*   Profil `service_areas` alanları → `profileService` (kullanıcı geneli; ilan bazlı alanlar ayrı)

**Client-only:** `localStorage` mock store’lar; harita geometri (circle/polygon) FE çizimi.

---

## 1. API Yolları (Endpoints)

### A. Panel — Benim Hizmet İlanlarım
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Açıklama:** Oturum kullanıcısının hizmet ilanları + özet istatistik. FE `fetchMyServicesDashboard` / `getMyDashboardServiceById`.
*   **Query:**
    *   `mine=true` **veya** token’dan user (Bearer zorunlu)
    *   `is_service=true`
    *   `page`, `page_size`
    *   `include` = `gallery,stats,reviews,service_areas` (opsiyonel embed)
*   **Alternatif:** `GET /api/v1/users/me/listings?is_service=true`
*   **Örnek:** `GET /api/v1/listings?mine=true&is_service=true&page_size=30`
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (**Zorunlu**)
*   **Eski FE path:** `{API_BASE}/services/dashboard/mine` (`NEXT_PUBLIC_MY_SERVICES_PATH`) → kaldırılacak
*   **Mock:** `ServiceAreasClient` yedek generate

---

### B. Panel — Tek Hizmet Özeti
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}`
*   **Açıklama:** Galeri, overview, performance, reviewList, locations embed veya ayrı çağrılar.
*   **Kullanan FE:** `getMyDashboardServiceById`
*   **Not:** Ownership: yalnızca sahibi (403).

---

### C. İlan Hizmet Bölgeleri (CRUD)
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}/service-areas`
*   **Açıklama:** `map` (circle/polygon) + `manual` (ilçe/mahalle) koleksiyonları. FE `serviceAreasListingMock` / `mockServiceAreaApi` / `serviceAreasAPI` bunu kullanmalı.
*   **Örnek yanıt:**
```json
{
  "success": true,
  "data": {
    "map": [
      { "id": 1, "type": "circle", "center": { "lat": 41.0, "lng": 29.0 }, "radius": 5000 }
    ],
    "manual": [
      { "id": 2, "district_id": "1234", "district_name": "Kadıköy", "neighborhood_ids": ["1","2"] }
    ]
  }
}
```
*   **İstek Başlıkları:** `Authorization: Bearer <token>` (yazma zorunlu; public okuma ürün kararına bağlı)

---

### D. Hizmet Bölgelerini Kaydet / Değiştir
*   **Yol (Endpoint):** `PUT /api/v1/listings/{listingId}/service-areas`
*   **Body:**
```json
{
  "type": "map",
  "areas": [ /* circle | polygon */ ]
}
```
veya
```json
{
  "type": "manual",
  "areas": [ /* district / neighborhood refs */ ]
}
```
*   **Davranış:** Panel seçici ile uyumlu — bir tür kaydedilince diğeri temizlenebilir (`persistListingServiceAreas` davranışı).
*   **Kullanan FE:** `saveServiceAreas`, `persistListingServiceAreas`, `mockServiceAreaApi.bulkUpdate` / `add` / `update`
*   **Alternatif:** `PATCH` kısmi; `POST .../service-areas` tek alan ekleme

---

### E. Hizmet Bölgesi Sil
*   **Yol (Endpoint):** `DELETE /api/v1/listings/{listingId}/service-areas`
*   **Query / body:** `type=map|manual` veya `id={areaId}`
*   **Kullanan FE:** `deleteServiceAreas`, `clearListingServiceAreasType`, `mockServiceAreaApi.delete`

---

### F. Public — Hizmet Kategorileri
*   **Yol (Endpoint):** `GET /api/v1/categories`
*   **Query:** `is_service=true` veya hizmet kök `parent_id` / `category_id`
*   **Eski FE:** `ServiceAreasClient` → `/api/service-areas` (alias yok)
*   **Kullanan FE:** `getServiceCategories`, `getSubcategories` → `GET /api/v1/categories?parent_id=`

---

### G. Public — Hizmet Sağlayıcı Listesi
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Query:** `is_service=true`, `category_id`, `il` / `district`, `page`, `page_size`, `sort`, fiyat/rating filtreleri
*   **Kullanan FE:** `getServiceProviders`, `getProvidersByRegion`
*   **Mock:** Random generate (`_generateServiceProviders`)

---

### H. Public — Sağlayıcı / İlan Detay
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}`
*   **İlgili:** reviews → `GET /api/v1/listings/{listingId}/reviews` (`productDetailService`)
*   **Kullanan FE:** `getProviderDetails`

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

### MyDashboardService (FE normalize)
```typescript
interface MyDashboardService {
  id: string | number;
  ilanId?: number;
  title: string;
  description: string;
  image: string;
  rating: number;
  reviews: number;
  category?: string;
  price?: string;
  gallery: { id: string | number; url: string; title?: string }[];
  performance: { ay: string; memnuniyet: number; tamamlanan: number }[];
  overview: DashboardServiceOverview;
  reviewList: DashboardServiceReview[];
  locations: DashboardServiceLocation[];
}
```

### ServiceArea (map)
```typescript
interface MapServiceArea {
  id: number;
  type: 'circle' | 'polygon';
  areaType?: 'map';
  center?: { lat: number; lng: number };
  radius?: number; // metre
  points?: { lat: number; lng: number }[];
}
```

### Manual area
```typescript
interface ManualServiceArea {
  id?: number | string;
  cityId?: string;
  cityName?: string;
  districtId: string;
  districtName: string;
  neighborhood_ids?: string[];
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1`.
2.  **serviceAreasClient:** `/api/service-areas` kaldır → categories + listings.
3.  **myServicesDashboardService:** `services/dashboard/mine` → `GET /api/v1/listings?mine=true&is_service=true`.
4.  **serviceAreasListingMock / mockServiceAreaApi / serviceAreasAPI:** localStorage → `.../listings/{id}/service-areas`.
5.  **Auth:** `auth_token` / `STORAGE_KEYS.AUTH_TOKEN`; sahte `service_*` token kaldırılacak.
6.  **Random generate** public client’ta production’da kapatılmalı (`USE_MOCK`).

---

## 4. FE Kullanım Haritası

| Modül / Fonksiyon | Sayfa / Bileşen |
|-------------------|-----------------|
| `fetchMyServicesDashboard` | `ServiceAreas.tsx` (panel) |
| `getMyDashboardServiceById` | `ServiceEdit`, modal |
| `ServiceAreasClient` | `useServiceAreas`, dashboard yedek |
| `serviceAreasAPI` | `ServiceAreasContext` |
| `mockServiceAreaApi` | `ServiceAreasMap` |
| `serviceAreasListingMock` | `ServiceAreaSelector`, `ServiceEdit` |

---

## 5. Notlar

*   Mock: in-memory + `localStorage` (`serviceAreas`, `acillazim_service_areas_listing_mock_v1`).
*   Geo JSON / polygon validasyonu BE’de; FE sadece çizim.
*   `locationService` ilçe/mahalle id’leri manual alanlarla uyumlu olmalı.
*   Mobil service-areas bu planın kapsamı dışındadır.
