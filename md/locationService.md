# locationService Entegrasyon Planı

`locationService.ts` birleşik konum servisidir: il/ilçe/mahalle (GeoData), kullanıcı konum (localStorage), şehir bazlı ilan filtreleme, OSM geocode. `USE_REAL_API = false` iken `data/geodata/*.json`; `true` iken gerçek v1 location endpoint’leri.

**Kapsam:** Web (`services/location`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/locations/...` altındadır. Path alias yoktur (`/api/locations/...`, `https://api.acillazim.com/api/locations/...` v1’siz kullanılmaz).

**İlgili sözleşmeler:**
*   Popüler şehirler → `listingsService`: `GET /api/v1/locations/popular` (`popularLocationsService`)
*   Şehir/ilçe ilan listesi → `listingsService`: `GET /api/v1/listings?il=...&ilce=...`
*   Filtre konum seçenekleri → `filterService.getLocationFilterOptions` bu servisi kullanır

**Client-only (BE endpoint yok):** `saveUserLocation` / `getUserLocation` / `clearUserLocation`, modal seen flag’leri, `normalizeCity` / `normalizeProvinceForMap`, `getOpenStreetMapUrl`, in-memory geo cache.

---

## 1. API Yolları (Endpoints)

### A. İller (Provinces / Cities)
*   **Yol (Endpoint):** `GET /api/v1/locations/provinces`
*   **Açıklama:** Türkiye il listesini döner.
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `getProvinces`, `getCities`, `getAllCities` (isim dizisi)
*   **Mock:** `data/geodata/cities.json`

---

### B. İlçeler
*   **Yol (Endpoint):** `GET /api/v1/locations/districts`
*   **Açıklama:** İlçeleri döner; genelde il’e göre filtrelenir.
*   **Query Parametreleri:**
    *   `province_id` (number, önerilen) — FE bugün `provinceId` gönderiyor; v1’de `province_id`
*   **Örnek:** `GET /api/v1/locations/districts?province_id=34`
*   **Kullanan FE:** `getDistricts`, `getDistrictsByCityId`, `getDistrictsByCity` (isim→id resolve)
*   **Mock:** `data/geodata/districts.json`

---

### C. Mahalleler (+ köyler birleşik)
*   **Yol (Endpoint):** `GET /api/v1/locations/neighborhoods`
*   **Açıklama:** İlçeye ait mahalle ve köy listesini döner (FE `type` / `typeLabel`: `quarter`|`village`).
*   **Query Parametreleri:**
    *   `district_id` (number, zorunlu) — FE bugün `districtId`
*   **Örnek:** `GET /api/v1/locations/neighborhoods?district_id=1234`
*   **Kullanan FE:** `getNeighborhoods`, `getQuartersByDistrict`, `getQuartersByMultipleDistrictIds`
*   **Mock:** `quarters.json` + `villages.json` birleşimi

---

### D. Mahalleler (yalnız quarters) — opsiyonel
*   **Yol (Endpoint):** `GET /api/v1/locations/quarters`
*   **Açıklama:** Sadece mahalle kayıtları. FE birleşik liste için C’yi tercih eder; BE ayrı tutuyorsa C `neighborhoods` köy+mahalle döndürmeli.
*   **Query:** `district_id`
*   **Mock path:** `fetchGeoData('quarters')` — UI’da az kullanılıyor

---

### E. Popüler Lokasyonlar
*   **Yol (Endpoint):** `GET /api/v1/locations/popular`
*   **Açıklama:** Bu dosyada değil; `popularLocationsService` (`listingsService.md`). Burada tekrar implement edilmez.

---

### F. Şehre Göre İlanlar
*   **Yol (Endpoint):** `GET /api/v1/listings?il={city}&page_size={limit}`
*   **Açıklama:** `getListingsByCity` / `getNearbyListings` artık `apiService.fetchListingsByCity` veya `defaultCardData` yerine listings sözleşmesini kullanmalı.
*   **Kullanan FE:** LocationModal / nearby akışları (kısmen `nearbyListingsService` de aynı işi yapar — tek yola indirgenebilir)

---

### G. Öne Çıkan / Önerilen İlanlar
*   **Yol (Endpoint):** `GET /api/v1/listings?vitrin_durumu=one_cikan&page_size={limit}`
*   **Açıklama:** `getRecommendedListings` → `apiService.fetchFeaturedListings` / `defaultCardData` yerine listings/home sözleşmesi.
*   **Not:** Konum servisinin sorumluluğu olmamalı; `featuredListingsService` tercih edilmeli.

---

### H. Geocode (koordinat)
*   **Mevcut FE:** Doğrudan Nominatim (`nominatim.openstreetmap.org`) — BE endpoint yok.
*   **Önerilen BE (opsiyonel):** `GET /api/v1/locations/geocode?q=...` veya `city`/`district`/`neighborhood` query — rate-limit ve User-Agent BE’de yönetilir.
*   Alias yok; `/api/geocode` kullanılmaz.
*   **Kullanan FE:** `getCoordinates` (mapLocationService / form harita)

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
FE `data` unwrap etmeli (dizi doğrudan veya `{ success, data: [...] }`).

### Province
```typescript
interface Province {
  id: number;
  name: string;
  osmId: string; // BE yoksa FE `city_${id}` üretebilir
}
```

### District
```typescript
interface District {
  id: number;
  name: string;
  provinceId: number;
  osmId: string;
}
```

### Neighborhood
```typescript
interface Neighborhood {
  id: string;           // örn. "{districtId}_mah_{id}" | "{districtId}_koy_{id}"
  name: string;
  districtId: number;
  villageId?: number;
  typeCode: number;
  typeLabel?: string;   // "Mahalle" | "Köy"
  type?: string;        // "quarter" | "village"
  osmId: string;
}
```

### Kullanıcı konum (localStorage — client-only)
```typescript
interface LocationData {
  city: string;
  district: string | null;
  savedAt: string; // ISO
}
```
Keys: `user_location`, `location_modal_seen`.

### Coordinates (Nominatim / opsiyonel BE)
```typescript
interface Coordinates {
  lat: number;
  lon: number;
  displayName: string;
  osmId: string;
  osmType: string;
  boundingBox: { north: number; south: number; east: number; west: number } | null;
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` → tam yol `/api/v1/locations/...`. Eski `https://api.acillazim.com/api` (v1’siz) kaldırıldı.
2.  **Query isimleri:** `provinceId`→`province_id`, `districtId`→`district_id`.
3.  **Mock kapatma:** Backend hazır olunca `USE_REAL_API = true`.
4.  **İlan metotları:** `getListingsByCity` / `getRecommendedListings` → `GET /api/v1/listings...`; `apiService` + `defaultCardData` fallback kaldırılmalı veya listings servisine delege.
5.  **Geocode:** İsteğe bağlı BE proxy; yoksa Nominatim client kalır (rate-limit riski).
6.  **Cache:** In-memory; BE değişince `clearCache()`.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getProvinces` / `getDistricts` / `getNeighborhoods` | `IlanForm*`, `ServiceListingForm*`, `FilterSidebar`, register `Individual` / `Corporate` |
| `getAllCities` / `getDistrictsByCity` / `getQuartersByDistrict` | `FilterSidebar`, `filterService.getLocationFilterOptions` |
| `getUserLocation` / `saveUserLocation` / modal seen | `Home`, `LocationModal`, `CategoryPage`, `ServiceBanner`, `ServiceSearch`, `CategoryBanner` |
| `getListingsByCity` / `getNearbyListings` | Nearby / modal akışları |
| `getCoordinates` | Harita / form konum |

---

## 5. Notlar

*   Mock: `data/geodata/cities.json`, `districts.json`, `quarters.json`, `villages.json`.
*   Mahalle id formatı (`{districtId}_mah_{id}`) FE/mock sözleşmesi; BE stabil string/number id dönebilir — FE adapt etmeli.
*   `MERKEZ` / `typeCode === 3` kayıtları mock’ta elenir; BE aynı filtreyi uygulayabilir veya ham veri döner FE filtreler.
*   Popüler şehirler bu serviste değil (`popularLocationsService`).
*   Mobil location servisleri bu planın kapsamı dışındadır.
