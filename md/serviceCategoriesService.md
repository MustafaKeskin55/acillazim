# serviceCategoriesService Entegrasyon Planı

`serviceCategoriesService.ts` hizmet kategorileri listesi (id/slug/refresh + localStorage cache) sağlar. Şu an `/api/service-categories` dener; başarısız olunca hardcoded Unsplash simülasyonu döner.

**Kapsam:** Web (`services/serviceCategories`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/service-categories`, `https://api.acillazim.com/api/service-categories` kullanılmaz).

**İlgili sözleşmeler (tercih edilen kaynak):**
*   Ana sözleşme → `categoryService`: `GET /api/v1/categories` (`getServiceCategories`, `getPopularServiceCategories`)
*   Public keşif yedek → `serviceAreasClient.getServiceCategories` (aynı categories path)
*   Hizmet ilanları → `listingsService` / `popularServicesService`: `is_service=true`

**Not:** UI bugün çoğunlukla `categoryService` kullanır (`ServiceSidebar`, `PopularCategories`). Bu modül legacy/paralel; canlıda `categoryService`’e delege edilmeli veya kaldırılmalı.

**Client-only:** localStorage cache (`acillazim_service_categories`, 1 saat).

---

## 1. API Yolları (Endpoints)

### A. Hizmet Kategorileri Listesi
*   **Yol (Endpoint):** `GET /api/v1/categories`
*   **Açıklama:** Hizmet kökünün çocukları veya `is_service` işaretli kategoriler. FE `fetchServiceCategories` / `getServiceCategories`.
*   **Query:**
    *   `is_service=true` **veya**
    *   `parent_id=12540` (hizmet kök fallback; BE `isServiceCategory` tercih)
    *   opsiyonel: `include_counts=true` (ilan/provider sayısı → FE `count`)
*   **Örnek:** `GET /api/v1/categories?is_service=true`  
    veya `GET /api/v1/categories?parent_id=12540`
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Accept: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Eski FE path:** `{host}/api/service-categories` → kaldırıldı
*   **Mock:** `simulateAPIRequest` (hardcoded 12 kategori)

---

### B. Kategori ID ile Getir
*   **Yol (Endpoint):** `GET /api/v1/categories?category_id={id}`
*   **Mevcut FE:** Client listeden `find` (`getCategoryById`)
*   **Tercih:** Doğrudan BE query veya `categoryService.getCategoryById`

---

### C. Slug ile Getir
*   **Yol (Endpoint):** `GET /api/v1/categories/by-slug/{slug}`
*   **Mevcut FE:** Client listeden `find` (`getCategoryBySlug`)
*   **Sözleşme:** `categoryService.md`

---

### D. Cache Yenile
*   **API yok** — FE `refreshCategories` localStorage siler + A’yı tekrar çağırır.

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

### FE ServiceCategory (mevcut)
```typescript
interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  image: string;
  count: number;
  color: string;
  description: string;
  created_at: string;
  updated_at: string;
}
```

### BE → FE map (öneri)
| BE alan | FE alan |
|---------|---------|
| `category_id` / `id` | `id` |
| `label` / `name` | `name` |
| `slug` | `slug` |
| `image_url` / `icon` | `image` |
| `listing_count` / `provider_count` | `count` |
| `bgColor` / `color` | `color` |
| `description` | `description` |

Eski yanıt `{ categories: [] }` veya standart `{ data: [] }` — her ikisi parse edilmeli.

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1`; endpoint `/categories?is_service=true`.
2.  **Alias kaldırma:** `/api/service-categories` → `/api/v1/categories?...`.
3.  **USE_MOCK:** Simülasyon bayraklı; API hazırken `false`.
4.  **Birleştirme (öneri):** Bu singleton’ı `categoryService.getServiceCategories` üzerine ince facade yap veya import’ları `categoryService`’e taşı.
5.  **SSR:** `localStorage` erişimi `typeof window` guard (SSR crash önleme).
6.  **Yanıt parse:** `data.categories` | `data` array | `success.data`.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `serviceCategoriesService` (default) | Doğrudan import şu an yok / legacy |
| `categoryService.getServiceCategories` | `ServiceSidebar`, `Sidebar` (aktif) |
| `categoryService.getPopularServiceCategories` | `PopularCategories` |
| `Service` sayfası | `categroies__hiz_data.json` (bu servisi kullanmıyor) |

---

## 5. Notlar

*   Mock: hardcoded Unsplash listesi + localStorage.
*   Hizmet kök id fallback: `12540` (`categoryService.md`).
*   `serviceAreasClient` / `popularServices` ile tek categories sözleşmesi paylaşılmalı.
*   Mobil service-categories bu planın kapsamı dışındadır.
