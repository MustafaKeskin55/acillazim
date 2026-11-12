# adService Entegrasyon Planı

Kök `services/adService.ts` sayısal `pageId` / `sectionId` ile reklam çeker + `adFilterEngine` ile client filtreler. Mock: `advertisement/fakeBannerAPI`.

**Not — çift kopya:** Aktif UI `services/advertisement/adService.ts` kullanır (`useAdBanner`). Kök dosya legacy/duplicate; canlıda tek kaynak (`advertisement/adService`) kalmalı, kök re-export veya silinmeli.

**Kapsam:** Web. Mobil servislere dokunulmayacak.

**API versiyonu:** Yalnızca `GET /api/v1/advertisements/context`. Path alias yoktur (`/api/ads`, `/api/advertisements` v1’siz, `/api/banner` kullanılmaz).

**İlgili sözleşmeler:**
*   `adBannerService` / `AdvertisementService` / `categoryAdService` → aynı advertisements ailesi
*   Banner vitrin → `bannerService`

**Client-only:** `adFilterEngine` (aktiflik, tarih, kategori, bölge, login, limit) — BE context filtrelerse kaldırıabilir.

---

## 1. Sayısal Parametre Eşlemeleri

### Sayfa (`pageId`)
| ID | Sayfa |
|----|--------|
| 1 | Kategori |
| 2 | Ana sayfa |
| 3 | İlan detay |
| 4 | Tüm sayfalar |

### Bölüm (`sectionId`)
| ID | Bölüm |
|----|--------|
| 1 | Üst banner |
| 2 | Sidebar |
| 3 | İçerik |
| 4 | Tüm bölümler |

---

## 2. API Yolları (Endpoints)

### A. Context Reklamları
*   **Yol (Endpoint):** `GET /api/v1/advertisements/context`
*   **Açıklama:** Sayfa/bölüm/kategori/bölge bağlamında reklam listesi. FE `fetchAdvertisements` / `getAdvertisements`.
*   **Query:**
    *   `pageId`, `sectionId`
    *   `categoryId`, `listingType`, `region`
    *   `isUserLoggedIn`, `limit`
*   **Örnek:** `GET /api/v1/advertisements/context?pageId=1&sectionId=2&categoryId=1&limit=1`
*   **İstek Başlıkları:**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `getAdvertisements`, `getCategoryAdvertisements` (`pageId=1`), `getListingDetailAdvertisements` (`pageId=3`)
*   **Mock:** `fakeBannerAPI.fetchAdvertisements`

---

## 3. Veri Modelleri

Standart `{ success, data, message }`. `data` reklam dizisi veya `{ advertisements: [] }`.

```typescript
interface AdFilterOptions {
  pageId?: number;
  sectionId?: number;
  categoryId?: number | string | null;
  listingType?: string | null;
  region?: string | null;
  isUserLoggedIn?: boolean;
  limit?: number;
}
```

---

## 4. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `{host}/api/v1` → `/advertisements/context`.
2.  **fakeBannerAPI kaldır** → real `fetch` (`USE_MOCK=false`).
3.  **Kök vs advertisement:** Tek modül; kök `@/services/adService` → re-export `advertisement/adService`.
4.  **Client filtre:** BE tam filtre dönerse `getFilteredAds` opsiyonel.
5.  **Broken import (kök):** `@/services/fakeBannerAPI` yok → `@/services/advertisement/fakeBannerAPI`.

---

## 5. FE Kullanım Haritası

| Kaynak | Kullanım |
|--------|----------|
| `advertisement/adService` | `useAdBanner` (aktif) |
| kök `services/adService` | Doğrudan import yok / legacy |

---

## 6. Notlar

*   Mock: `services/advertisement/fakeBannerAPI.ts`.
*   `adBannerService` string page/section kullanabilir — sayısal map ile hizala.
*   Mobil ads bu planın kapsamı dışındadır.
