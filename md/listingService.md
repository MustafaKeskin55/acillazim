# listingService (kök) Entegrasyon Planı

Kök `services/listingService.ts` ince CRUD facade: oluştur / güncelle / sil + görsel yükle/sil. `validateListingData` client; HTTP hedefi `/api/v1/listings...`.

**Kapsam:** Web (`services/listingService.ts`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/listings`, `/api/listings` v1’siz kullanılmaz).

**İlgili sözleşmeler:**
*   Ana ilan verme akışı → `CreateListingService` (aynı CRUD path’ler; **tercih edilen kaynak**)
*   Liste/okuma → `listingsService` (`GET /api/v1/listings`)
*   Detay → `productDetailService`
*   Eski `api/endpoints/listingEndpoints` + `api/config` `/listings` ham path → v1’e çekilmeli / bu servisten bağımsızlaştırılmalı

**Not:** Doğrudan FE import şu an yok; CreateListing kullanılıyor. Legacy veya alternatif entry — birleştirilmeli.

---

## 1. API Yolları (Endpoints)

### A. İlan Oluştur
*   **Yol (Endpoint):** `POST /api/v1/listings`
*   **Auth:** Bearer zorunlu
*   **Kullanan FE:** `ListingService.createListing`
*   **Sözleşme:** `CreateListingService.md` §B

---

### B. İlan Güncelle
*   **Yol (Endpoint):** `PUT /api/v1/listings/{listingId}`
*   **Kullanan FE:** `ListingService.updateListing`

---

### C. İlan Sil
*   **Yol (Endpoint):** `DELETE /api/v1/listings/{listingId}`
*   **Kullanan FE:** `ListingService.deleteListing`

---

### D. Görsel Yükle
*   **Yol (Endpoint):** `POST /api/v1/listings/images`
*   **Body:** multipart (`images` / `image{n}`)
*   **Kullanan FE:** `ListingService.uploadListingImages`

---

### E. Görsel Sil
*   **Yol (Endpoint):** `DELETE /api/v1/listings/images/{imageId}`
*   **Kullanan FE:** `ListingService.deleteImage`

---

## 2. Veri Modelleri

Standart `{ success, data, message }`. Body alanları CreateListing ile aynı.

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `{host}/api/v1` → `/listings...`.
2.  **listingEndpoints / API_CONFIG:** `/listings` → `/api/v1/listings` (veya client baseURL zaten v1 ise relative `/listings` OK — host+`/api/v1` birleşimi doğrulanmalı).
3.  **Birleştirme:** Bu class’ı `CreateListingService` CRUD’una delege et veya sil.
4.  **USE_MOCK:** CreateListing `USE_MOCK_DATA` ile hizala.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Kullanım |
|-----------|----------|
| `ListingService.*` | Doğrudan import yok / legacy |
| `createListingService` | CreateListing UI (aktif) |

---

## 5. Notlar

*   `listingsService.md` = okuma/liste klasörü; bu dosya = kök CRUD class — karıştırılmamalı.
*   Mobil listing CRUD bu planın kapsamı dışındadır.
