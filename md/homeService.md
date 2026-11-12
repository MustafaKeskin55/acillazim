# homeService Entegrasyon Planı

`services/home` klasörü iki facade içerir:
*   `homeService.ts` — ana sayfa (`Home`): öne çıkan + vitrin ilanları (`listings` alt servislerine delege).
*   `serviceHomeService.ts` — hizmet sayfası (`Service`): hizmet kategorilerindeki öne çıkan / vitrin / yakındaki ilanlar (şu an `üründat.json` + `categories-data.json` client-side filtre).

**Kapsam:** Web (`services/home`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/home/...`, `/api/listings/featured` ham path kullanılmaz).

**İlgili sözleşmeler:**
*   İlan listesi → `filterService` / listings: `GET /api/v1/listings?...`
*   Hizmet kategorileri → `categoryService`: `GET /api/v1/categories` (`isServiceCategory` / parent `12540`)
*   Yakın ilanlar bileşeni (`NearbyListings`) → `nearbyListingsService` (`services/listings`); `homeService` içinde import var ama kullanılmıyor.

---

## 1. API Yolları (Endpoints)

### A. Öne Çıkan İlanlar (ana sayfa)
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Açıklama:** `vitrin_durumu=one_cikan` olan ilanları döner. Filtreleme BE’de; FE client-side `üründat` taraması kaldırılacak.
*   **Query Parametreleri:**
    *   `vitrin_durumu` = `one_cikan` (zorunlu bu kullanım için)
    *   `page` (number, varsayılan `1`)
    *   `page_size` / `limit` (number, örn. `20`)
*   **Örnek:** `GET /api/v1/listings?vitrin_durumu=one_cikan&page=1&page_size=20`
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `Home` → `homeService.getFeaturedListings` → `featuredListingsService`
*   **Mock:** `featuredListingsService` + `data/üründat.json` (`USE_API = false`)

---

### B. Vitrin İlanları (ana sayfa)
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Açıklama:** `vitrin_durumu=vitrin` olan ilanları döner.
*   **Query Parametreleri:**
    *   `vitrin_durumu` = `vitrin`
    *   `page`, `page_size` / `limit` (örn. `24`)
*   **Örnek:** `GET /api/v1/listings?vitrin_durumu=vitrin&page=1&page_size=24`
*   **Kullanan FE:** `Home` → `homeService.getVitrinListings` → `vitrinListingsService`
*   **Mock:** `vitrinListingsService` + `üründat.json`

---

### C. Ana Sayfa Toplu Veri (opsiyonel BE)
*   **Mevcut FE:** `getHomePageData` = `Promise.all([getFeaturedListings, getVitrinListings])` — iki istek.
*   **Önerilen BE (opsiyonel):** `GET /api/v1/home` → `{ featuredListings, vitrinListings }`. Alias yok; `/api/homepage` kullanılmaz.
*   Bağlanmazsa A + B yeterli.

---

### D. Öne Çıkan Hizmet İlanları
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Açıklama:** Hizmet ağacı altındaki `one_cikan` ilanlar.
*   **Query Parametreleri:**
    *   `vitrin_durumu` = `one_cikan`
    *   `category_id` = hizmet kökü (`12540` veya BE’nin hizmet root id’si)
    *   `include_descendants` = `true`
    *   alternatif: `is_service` = `true` (BE desteklerse)
*   **Örnek:** `GET /api/v1/listings?vitrin_durumu=one_cikan&category_id=12540&include_descendants=true`
*   **Kullanan FE:** `Service` → `serviceHomeService.getFeaturedServiceListings`
*   **Mock:** `üründat.json` + `categories-data.json` Hizmetler ağacı

---

### E. Vitrin Hizmet İlanları
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Query:** `vitrin_durumu=vitrin` + hizmet `category_id` / `is_service=true` + `include_descendants=true`
*   **Kullanan FE:** `getVitrinServiceListings` / `getServicePageData` (şu an Service sayfasında doğrudan çağrılmıyor; API hazır olunca kullanılabilir)

---

### F. Yakındaki Hizmetler
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Query:**
    *   `il` (veya `city`) — şehir adı
    *   hizmet kapsamı (`category_id=12540&include_descendants=true` veya `is_service=true`)
    *   opsiyonel: `vitrin_durumu`, `page_size` / `limit`
*   **Örnek:** `GET /api/v1/listings?il=İstanbul&category_id=12540&include_descendants=true&page_size=15`
*   **Kullanan FE:** `getNearbyServices` (Service sayfasında henüz bağlı değil; NearbyListings ayrı listings servisi kullanır)

---

### G. Hizmet Kategori ID Listesi
*   **Yol (Endpoint):** `categoryService` → `GET /api/v1/categories` (hizmet ağacı / `getServiceCategories`)
*   **Açıklama:** `serviceHomeService.getServiceCategories` ve `_getServiceCategoryIds` client-side JSON parse yerine kategori API’sini kullanmalı.
*   **Not:** Ayrı `/api/v1/home/service-categories` yok.

---

### H. Hizmet Sayfası Toplu Veri (opsiyonel BE)
*   **Mevcut FE:** `getServicePageData` = featured + vitrin + `totalServiceCount`.
*   **Önerilen (opsiyonel):** `GET /api/v1/home/services` → `{ featuredListings, vitrinListings, totalServiceCount }`.
*   Yoksa D + E + count için listings `totalListings` yeterli.

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

### Listings list yanıtı (A/B/D/E/F)
`filterService` ile aynı şekil; FE `listings` + pagination bekler:

```json
{
  "listings": [ /* Listing özet[] */ ],
  "totalPages": 1,
  "totalListings": 24,
  "currentPage": 1,
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalListings": 24
  }
}
```
API `{ success, data: { listings, ... } }` dönerse FE unwrap etmeli.

### HomePageData (FE facade)
```typescript
interface HomePageData {
  featuredListings: unknown[];
  vitrinListings: unknown[];
}
```

### ServicePageData (FE facade)
```typescript
interface ServicePageData {
  featuredListings: IlanItem[];
  vitrinListings: IlanItem[];
  totalServiceCount: number;
}
```

### Listing özet (ana/hizmet kartları)
```typescript
interface HomeListingSummary {
  ilan_id: number | string;
  baslik: string;
  fiyat: number;
  para_birimi?: string;
  category_id: number | string;
  vitrin_durumu?: string | string[]; // "vitrin" | "one_cikan" | [...]
  konum?: { il?: string; ilce?: string; mahalle?: string };
  resimler?: string[];
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` → `/api/v1/listings?...`. Alias yok. Eski `api/config` `http://localhost:3000/api` + `/listings` v1’siz path bu sözleşmenin alias’ı değildir.
2.  **homeService:** Facade kalabilir; asıl geçiş `featuredListingsService` / `vitrinListingsService` içinde `USE_API = true` + query’de `vitrin_durumu` (şu an API modunda tüm listings çekilip client-side filtreleniyor — düzeltilmeli).
3.  **serviceHomeService:** `üründat.json` / `categories-data.json` + `setTimeout` simülasyonu kaldırılacak; A/D/E/F query’leri + `categoryService` kullanılacak.
4.  **Hizmet kökü:** Hardcoded `12540` yerine BE `isServiceCategory` / kategori API.
5.  **Unused import:** `homeService` içindeki `nearbyListingsService` kullanılmıyor — temizlenebilir.
6.  **Ortak client (opsiyonel):** `@/api/client` / listings base servisi.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getHomePageData` / `getFeaturedListings` / `getVitrinListings` | `Home` → `FeaturedListings`, `VitrinListings` |
| `getFeaturedServiceListings` | `Service` → `FeaturedServices` / popularServices |
| `getVitrinServiceListings` / `getServicePageData` / `getNearbyServices` / `getServiceCategories` | Tanımlı; Service sayfasında kısmen kullanılmıyor |
| Kategori grid (JSON) | `Service` hâlâ `popularCategories.json` + `categroies__hiz_data.json` — bu servisin dışı; `categoryService`’e taşınmalı |

---

## 5. Notlar

*   Mock: `data/üründat.json`, `data/categories-data.json`; listings `USE_API` flag’i `api/config.ts`.
*   `vitrin_durumu` string veya dizi olabilir; BE tek string veya array dönebilir — FE her ikisini de kabul etmeli.
*   Ana sayfa NearbyListings / konum modal → `locationService` + `nearbyListingsService` (ayrı plan).
*   Mobil home/hizmet servisleri bu planın kapsamı dışındadır.
