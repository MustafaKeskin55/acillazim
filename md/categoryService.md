# categoryService Entegrasyon Planı

`categoryService.ts` dosyası, kategori ağacı (ana/alt), slug/id lookup, arama, breadcrumb yolu ve popüler/hizmet kategorilerini yönetir. `CategoryUtils.ts` yalnızca slug/format yardımcılarıdır (API çağrısı yok).

**Kapsam:** Web (`services/category`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/categories/...` altındadır. Path alias yoktur (`/api/categories/...`, `/categories/main`, `/categories/sub` kullanılmaz).

**Mod:** `USE_API = false` → `data/categroies_data.json`. `USE_API = true` → gerçek API.

---

## 1. API Yolları (Endpoints)

### A. Kategori Listesi (filtreli)
*   **Yol (Endpoint):** `GET /api/v1/categories`
*   **Açıklama:** Query parametrelerine göre kategori listesi döner. Parametre yoksa tüm kategoriler.
*   **Query Parametreleri (hepsi opsiyonel):**
    *   `parent_id`: `null` → ana kategoriler; sayı → o parent’ın çocukları
    *   `category_id`: tek kategori (id ile)
*   **Örnekler:**
    *   Ana kategoriler: `GET /api/v1/categories?parent_id=null`
    *   Alt kategoriler: `GET /api/v1/categories?parent_id=12540`
    *   Tek kategori: `GET /api/v1/categories?category_id=1`
    *   Tümü: `GET /api/v1/categories`
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `getMainCategories`, `getSubCategories`, `getCategoryById`, `getAllCategories`, `getPopularServiceCategories`

---

### B. Slug ile Kategori
*   **Yol (Endpoint):** `GET /api/v1/categories/by-slug/{slug}`
*   **Açıklama:** Slug’a göre kategori bulur.
*   **Parametreler:** `slug` (path)
*   **Örnek:** `GET /api/v1/categories/by-slug/emlak`
*   **Kullanan FE:** `getCategoryBySlug`

---

### C. Kategori Ara
*   **Yol (Endpoint):** `GET /api/v1/categories/search`
*   **Açıklama:** Label içinde metin araması.
*   **Query Parametreleri:**
    *   `q` (string, zorunlu) — arama terimi
*   **Örnek:** `GET /api/v1/categories/search?q=klima`
*   **Kullanan FE:** `searchCategories`

---

### D. Kategori Yolu (Breadcrumb) — FE şu an client-side
*   **Mevcut FE:** `getCategoryPath` parent zincirini `getCategoryById` ile dolaşır (ek endpoint yok).
*   **Önerilen BE (opsiyonel, tek istek):** `GET /api/v1/categories/{categoryId}/path`
*   **Açıklama:** Kökten ilgili kategoriye kadar path dizisi. Alias yok; `/api/categories/path` kullanılmaz.
*   Bağlanırsa FE client-side walk kaldırılabilir.

---

## 2. Veri Modelleri (Request & Response)

### Standart API Yanıt Yapısı
```json
{
  "success": true,
  "data": [ /* CategoryItem[] */ ],
  "message": "İşlem başarılı"
}
```

### CategoryItem Modeli
```typescript
interface CategoryItem {
  category_id: number;
  label: string;
  parent_id: number | null;
  type?: string;              // örn: "leaf" | "branch" — leaf ise alt kategori yok
  slug?: string;              // BE dönmezse FE CategoryUtils.slugify(label) üretir
  order?: number;
  isServiceCategory?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  hasCustomPage?: boolean;
  img_url?: string;
  count?: number;
  position?: string;          // popüler kartlar için (örn: "center")
}
```

### Path Item (breadcrumb)
```typescript
interface CategoryPathItem {
  id: number;
  label: string;
  slug: string;
  type?: string;
}
```

### Örnek Liste Yanıtı
```json
{
  "success": true,
  "data": [
    {
      "category_id": 1,
      "label": "Emlak",
      "parent_id": null,
      "type": "branch",
      "order": 1,
      "isServiceCategory": false,
      "img_url": null
    }
  ],
  "message": "OK"
}
```

### Örnek Slug Yanıtı
```json
{
  "success": true,
  "data": [
    {
      "category_id": 1,
      "label": "Emlak",
      "parent_id": null,
      "type": "branch"
    }
  ]
}
```
*   Bulunamazsa: `{ "success": true, "data": [] }` veya `404`.

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1/categories` (relative default: `/api/v1/categories`). Alias yok.
2.  **Mock kaldırma:** `USE_API = true` iken `categroies_data.json` fallback kullanılmaz; hata UI’a yansır.
3.  **Path endpoint (opsiyonel):** BE `GET /api/v1/categories/{id}/path` sağlarsa `getCategoryPath` tek isteğe bağlanır.
4.  **Ortak client (opsiyonel):** Ham `fetch` yerine `@/api/client` kullanılabilir.
5.  **`api/config.ts` eski path’ler:** `/categories/main`, `/categories/sub` vb. bu servisin sözleşmesi değildir; kullanılmamalı / v1’e çekilmeli.
6.  **Cache:** `localStorage` prefix `acillazim_category_`; BE değişince `clearCache()` gerekir.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getMainCategories` / `getSubCategories` | `Sidebar`, `CategoryPage`, `SubcategoryMenu`, `CreateListingService` |
| `getCategoryById` / `getCategoryBySlug` / `getCategoryPath` | `CategoryPage`, `FilterHeader`, `CategoryBanner` |
| `getServiceCategories` / `getPopularServiceCategories` | `ServiceSidebar`, `PopularCategories`, `ServiceSidebarOption` |
| `searchCategories` / `getAllCategories` | Çeşitli arama / listing akışları |
| `CategoryUtils.slugify` | `PopularCategories`, `Service` (API yok) |

---

## 5. Notlar

*   Hizmet ana kategori id’si FE’de fallback olarak `12540` kullanılıyor; BE `isServiceCategory: true` dönmeli.
*   `type === 'leaf'` → alt kategori yok (`hasSubCategories`).
*   `categoryPathApi` (`services/api`) ilan bazlı path içindir; bu servisten ayrıdır.
*   Mobil kategori servisleri bu planın kapsamı dışındadır.
