# CreateListingService Entegrasyon Planı

`CreateListingService.ts` dosyası, ilan verme akışını yönetir: kategori seçimi, kategori filtreleri, form/taslak/session, görsel yükleme, ilan CRUD. `USE_MOCK_DATA = true` iken API çağrıları mock’a düşer; `false` olunca gerçek v1 endpoint’leri kullanılır.

**Kapsam:** Web (`services/createListing`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/listings`, `/listings` ham path kullanılmaz).

**Not:** Ana/alt kategori listesi bu serviste `categoryService` üzerinden gider (`/api/v1/categories`). Taslak (`saveDraft` / `getDraft`) yalnızca client `sessionStorage` — BE endpoint’i yok.

---

## 1. API Yolları (Endpoints)

### A. Kategori Filtrelerini Getir
*   **Yol (Endpoint):** `GET /api/v1/categories/{categoryId}/filters`
*   **Açıklama:** İlan formu için kategoriye bağlı dinamik alanları (filtreleri) döner. Banner filtreleri (`/api/v1/banner/filters`) ile karıştırılmamalıdır.
*   **Parametreler:** `categoryId` (path)
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **Kullanan FE:** `IlanForm` / `ServiceListingForm` → `getCategoryFilters`
*   **Mock:** `data/realty_filter.json` (`category_dependency`)

---

### B. İlan Oluştur
*   **Yol (Endpoint):** `POST /api/v1/listings`
*   **Açıklama:** Yeni ilan kaydı oluşturur.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):** Form alanları (başlık, fiyat, konum, kategori alanları, görsel id’leri vb.) — FE `listingData` objesini olduğu gibi gönderir.
*   **Kullanan FE:** `createListing`

---

### C. İlan Güncelle
*   **Yol (Endpoint):** `PUT /api/v1/listings/{listingId}`
*   **Açıklama:** Mevcut ilanı günceller.
*   **Parametreler:** `listingId` (path)
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **Kullanan FE:** `updateListing`

---

### D. İlan Sil
*   **Yol (Endpoint):** `DELETE /api/v1/listings/{listingId}`
*   **Açıklama:** İlanı siler.
*   **Parametreler:** `listingId` (path)
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
*   **Kullanan FE:** `deleteListing`

---

### E. İlan Detayı (Düzenleme için)
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}`
*   **Açıklama:** Düzenleme formunu doldurmak için ilan detayını getirir.
*   **Parametreler:** `listingId` (path)
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
*   **Kullanan FE:** `fetchListingDetails`

---

### F. Görsel Yükle
*   **Yol (Endpoint):** `POST /api/v1/listings/images`
*   **Açıklama:** Multipart ile ilan görselleri yükler (max 10, her biri max 5MB — FE validasyonu).
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: multipart/form-data` (boundary otomatik)
*   **İstek Gövdesi (FormData):**
    *   `images` — dosya(lar)
    *   `order_{index}` — sıra (örn. `order_0`, `order_1`)
*   **Kullanan FE:** `uploadImages`

---

### G. Görsel Sil
*   **Yol (Endpoint):** `DELETE /api/v1/listings/images/{imageId}`
*   **Açıklama:** Yüklenmiş bir görseli siler.
*   **Parametreler:** `imageId` (path)
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
*   **Kullanan FE:** `deleteImage`

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

### FormattedFilter (kategori filtreleri)
```typescript
interface FormattedFilter {
  id: number | string;
  label: string;
  type: string;              // text | checkbox | multi-select | range | ...
  db_field: string | null;
  unit?: string | null;
  display_location?: string;
  priority?: boolean;
  options?: Array<{ label?: string; value?: string | number }>;
  category_id?: number;
}
```

### Filtre listesi yanıtı
```json
{
  "success": true,
  "data": [ /* FormattedFilter[] */ ],
  "message": "OK"
}
```

### İlan oluşturma başarı yanıtı
```json
{
  "success": true,
  "data": {
    "listing_id": 1001,
    "status": "pending",
    "created_at": "2026-07-18T00:00:00.000Z",
    "updated_at": "2026-07-18T00:00:00.000Z"
  },
  "message": "İlan oluşturuldu"
}
```

### Görsel yükleme başarı yanıtı
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "image_id": "img_123",
        "url": "https://cdn.example.com/...",
        "thumbnail": "https://cdn.example.com/.../thumb",
        "original_name": "photo.jpg",
        "size": 102400,
        "order": 0,
        "uploaded_at": "2026-07-18T00:00:00.000Z"
      }
    ]
  },
  "message": "Görseller yüklendi"
}
```

### Düzenleme detay alanları (FE mock şekli — BE uyumlu olmalı)
```typescript
{
  baslik: string;
  fiyat: string | number;
  paraBirimi: string;       // örn: "TL"
  il: string;
  ilce: string;
  mahalle: string;
  acikAdres: string;
  takas: boolean;
  durum: string;            // ikinci el / sıfır vb.
  kategori0?: string;
  kategori1?: string;
  // ...
  photos: unknown[];
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` (default relative `/api/v1`). Alias yok.
2.  **Mock kapatma:** Backend hazır olunca `USE_MOCK_DATA = false`.
3.  **Kategori filtre mock:** `realty_filter.json` yalnızca mock; API açıkken `GET /api/v1/categories/{id}/filters` kullanılır.
4.  **Ortak client (opsiyonel):** Ham `fetch` yerine `@/api/client` (multipart için Content-Type override dikkat).
5.  **`api/config` / `listingEndpoints`:** `/listings` v1’siz path’ler bu sözleşmenin alias’ı değildir; CreateListing v1 kullanır.
6.  **Taslak:** Client-only; sunucu taslağı istenirse ayrı endpoint (örn. `POST /api/v1/listings/drafts`) tanımlanmalı — şu an yok.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getMainCategories` / `getSubCategories` / `saveSelectedCategory` | `PostAdCategories`, `CategorySelection` |
| `getCategoryFilters` / `groupFiltersByPriority` / `createDefaultFormData` | `IlanForm`, `ServiceListingForm`, `ServiceListingFormMobile` |
| `createListing` / `updateListing` / `uploadImages` | İlan yayınlama / düzenleme akışı |
| `fetchListingDetails` | Düzenleme modu |
| `saveDraft` / `getDraft` / session helpers | `IlanForm` (client storage) |
| `categoryService` delegasyonu | Ana/alt kategori (ayrı md: `categoryService.md`) |

---

## 5. Notlar

*   Auth token: `localStorage` / `sessionStorage` → `auth_token`.
*   Görsel kuralları (FE): max 10 dosya, max 5MB, yalnızca `image/*`.
*   `shouldShowItemCondition`: emlak vb. kategorilerde ikinci el/takas gizleme — mock `realty_filter` dependency setine bağlı; BE filtre meta ile de yönetilebilir.
*   Mobil create-listing servisleri bu planın kapsamı dışındadır.
