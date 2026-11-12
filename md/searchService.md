# searchService (SearchcategoryService) Entegrasyon Planı

`SearchcategoryService.ts` navbar/arama kutusu için kategori önerileri, slug/id lookup, alt kategori, breadcrumb zinciri ve ürün aramasını yönetir. Şu an kategori araması client-side (`categories-data.json` + fuzzy); `searchProducts` boş dizi döner.

**Kapsam:** Web (`services/search`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/search`, `/data/categories-data.json` production path kullanılmaz).

**İlgili sözleşmeler:**
*   Kategori arama / slug / alt / path → `categoryService`: `GET /api/v1/categories/search`, `by-slug`, `?parent_id=`, `{id}/path`
*   İlan arama → `listingsService` / `filterService`: `GET /api/v1/listings?q=...`
*   Fuzzy skorlama client kalabilir; BE search tercih edilir

**Client-only:** In-memory category cache (5 dk), `sanitizeSearchQuery`, `calculateSimilarity` / `searchCategories` (fallback).

---

## 1. API Yolları (Endpoints)

### A. Kategori Önerileri (autocomplete)
*   **Yol (Endpoint):** `GET /api/v1/categories/search`
*   **Açıklama:** `q` ile kategori label araması; skorlu / limitli sonuç. FE `getSuggestions` bunu kullanmalı (ağaç traverse kaldırılabilir veya fallback).
*   **Query:**
    *   `q` (string, zorunlu, min 2 karakter)
    *   `limit` (number, varsayılan `10`)
*   **Örnek:** `GET /api/v1/categories/search?q=klima&limit=10`
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `useSuggestions` → `getSuggestions`
*   **Mock:** `fetchCategories` + `searchCategories` (fuzzy)

---

### B. İlan / Ürün Arama
*   **Yol (Endpoint):** `GET /api/v1/listings`
*   **Query:**
    *   `q` (string, zorunlu arama için)
    *   `page`, `page_size` / `limit`
    *   opsiyonel: `category_id`, `il`, …
*   **Örnek:** `GET /api/v1/listings?q=iphone&page=1&page_size=20`
*   **Kullanan FE:** `searchProducts` (şu an `[]`); `useSuggestions` listing önerileri
*   **Not:** Ayrı `/api/v1/search` alias’ı yok; listings query yeterli. İstenirse opsiyonel `GET /api/v1/search?q=` aggregate (kategori+ilan) — yoksa FE iki istek (A+B).

---

### C. Kategori ID ile Getir
*   **Yol (Endpoint):** `GET /api/v1/categories?category_id={id}`  
    veya `GET /api/v1/categories` listesinden resolve
*   **Kullanan FE:** `getCategoryById` (şimdilik ağaç walk)
*   **Sözleşme:** `categoryService.md`

---

### D. Slug ile Kategori
*   **Yol (Endpoint):** `GET /api/v1/categories/by-slug/{slug}`
*   **Kullanan FE:** `getCategoryBySlug`
*   **Mock:** Client slugify path join

---

### E. Alt Kategoriler
*   **Yol (Endpoint):** `GET /api/v1/categories?parent_id={categoryId}`
*   **Kullanan FE:** `getSubcategories`

---

### F. Kategori Zinciri (breadcrumb)
*   **Yol (Endpoint):** `GET /api/v1/categories/{categoryId}/path` (opsiyonel; `categoryService.md`)
*   **Mevcut FE:** Client `getCategoryChain` walk
*   **Kullanan FE:** breadcrumb / search path

---

### G. Özel Özellik Flag
*   **Mevcut:** `hasSpecialFeature` — hardcoded ID listeleri (banner/filter/promo).
*   **Önerilen:** Kategori meta’da BE flag (`has_banner`, …) veya ayrı config endpoint yok; category item alanları yeterli.
*   Client hardcode kaldırılmalı.

---

### H. Kategori Ağacı Yükleme
*   **Mevcut:** `fetchCategories` → JSON import / `/data/categories-data.json`.
*   **Hedef:** `categoryService.getAllCategories` / `GET /api/v1/categories` — search servisi ağaç cache’i tutabilir.

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

### CategoryResult (FE suggestion)
```typescript
interface CategoryResult {
  id: number | string | null;
  name: string;
  type: 'category';
  path: string[];
  pathString: string;
  parent_id: number | string | null;
  score: number;
}
```

### SuggestionsResponse
```json
{
  "query": "klima",
  "suggestions": [ /* CategoryResult[] */ ],
  "timestamp": 1720000000000
}
```

### Unified search (opsiyonel BE)
```json
{
  "categories": [ /* CategoryResult[] */ ],
  "listings": [ /* Listing özet[] */ ]
}
```
Yoksa FE A + B birleştirir (`useSuggestions`).

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1`.
2.  **getSuggestions:** Client fuzzy → `GET /api/v1/categories/search?q=`; fuzzy yalnızca offline fallback.
3.  **searchProducts:** Boş dizi kaldır → `GET /api/v1/listings?q=`.
4.  **fetchCategories:** JSON / `/data/...` → `categoryService` / categories API.
5.  **getCategoryById / Slug / Sub / Chain:** `categoryService` metotlarına delege.
6.  **hasSpecialFeature:** Hardcoded listeler → kategori meta.
7.  **Cache:** 5 dk in-memory kalabilir; BE search sonuçları için kısa TTL.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getSuggestions` / `searchProducts` | `useSuggestions` → SearchBox |
| `getCategoryBySlug` / `getSubcategories` / `getCategoryChain` / `getCategoryById` | Arama / navigasyon yardımcıları |
| `fetchCategories` / `searchCategories` | İç kullanım / fallback |
| `hasSpecialFeature` | Banner/filtre flag (legacy) |

---

## 5. Notlar

*   Mock: `data/categories-data.json`.
*   Min query uzunluğu: 2 karakter (FE).
*   `categoryService.searchCategories` ile aynı endpoint — tek client paylaşılmalı.
*   Mobil search bu planın kapsamı dışındadır.
