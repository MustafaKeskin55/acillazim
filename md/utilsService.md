# utilsService Entegrasyon Planı

`services/utils` yardımcı modüller:

*   `urlService.ts` — SEO slug, ilan/filtre URL oluşturma-çözümleme, kategori path (client)
*   `speechRecognition.ts` — tarayıcı Web Speech API (SesAlgilama); **HTTP yok**

**Kapsam:** Web (`services/utils`). Mobil servislere dokunulmayacak.

**API versiyonu:** Bu klasörde **ayrı BE resource yok** (`/api/utils`, `/api/url` tanımlanmaz).  
Opsiyonel bağımlılıklar mevcut sözleşmelere gider:

*   Kategori path → `categoryService`: `GET /api/v1/categories/{categoryId}/path`
*   İlan doğrulama (route) → `listingsService` / `productDetail`: `GET /api/v1/listings/{listingId}`
*   Frontend route’lar (`/ilan/{id}`, `/filtrele/...`) **Next.js sayfa path’leri**dir; REST API değildir

**Client-only:** `createSlug`, SEO URL parse, Web Speech Recognition, `categories-data.json` / `üründat.json` mock walk.

---

## 1. API Yolları (Endpoints)

### A. Mevcut durum — utils’e özel endpoint yok

| FE fonksiyon | Davranış |
|--------------|----------|
| `createSlug` / `createSeoUrl` / `getIlanUrl` | Client string; API yok |
| `extractIlanId` / `extractCategoryFromUrl` | URL parse; API yok |
| `validateCategoryMatch` | Client path vs slug |
| `createFilterUrlFromPath` / `createFilterUrlFromCategoryId` | `/filtrele/...` FE route |
| `routeIlanDetay` | Mock: `üründat.json`; canlıda listings GET |
| `getCategoryPathById` | Mock: `categories-data.json` walk |
| `SesAlgilama` (speech) | `window.SpeechRecognition`; API yok |

---

### B. Opsiyonel — Kategori Path (urlService bağımlılığı)
*   **Yol (Endpoint):** `GET /api/v1/categories/{categoryId}/path`
*   **Açıklama:** `getCategoryPathById` ağaç traverse yerine tek istek. Sözleşme: `categoryService.md`.
*   **Kullanan FE:** `getIlanUrl`, `validateCategoryMatch`, `createFilterUrlFromCategoryId`
*   **Mock:** `categories-data.json` + `require` walk

---

### C. Opsiyonel — İlan varlık / kategori doğrulama
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}`
*   **Açıklama:** `routeIlanDetay` içinde mock find yerine; kategori slug uyumu FE’de veya BE redirect.
*   **Mock:** `üründat.json` `ilanlari.find`

---

### D. Speech Recognition
*   **Endpoint yok** — tarayıcı native API (`tr-TR`).
*   Ağ hatası (`network` error) Speech API’nin kendi servisidir; Acıllazım backend değildir.

---

## 2. Veri Modelleri

SEO URL örneği (FE route, API değil):

```
/{kategori-slug}/{baslik-slug}-{listingId}
/filtrele/{ana}/{alt}/{alt-alt}
/ilan/{listingId}
```

`RouteResult`: `{ ilanId, path, isValid }`

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Alias ekleme:** `/api/utils` **eklenmez**.
2.  **getCategoryPathById:** JSON require → `categoryService.getCategoryPath` / `GET .../categories/{id}/path`.
3.  **routeIlanDetay:** `üründat` → `GET /api/v1/listings/{id}` (async).
4.  **require → import:** SSR/webpack uyumu için dinamik import.
5.  **speechRecognition:** Değişiklik yok (client-only).

---

## 4. FE Kullanım Haritası

| Modül / Fonksiyon | Sayfa / Bileşen |
|-------------------|-----------------|
| `urlService.getIlanUrl` | `ProductCard`, `FilterResults`, `ProductList`, `useSuggestions` |
| `urlService` (slug/extract) | `SearchBox`, `CategoryPage`, `useProductDetailController` |
| `speechRecognition` | Doğrudan import yok / legacy |

---

## 5. Notlar

*   Mock: `categories-data.json`, `üründat.json`.
*   `/ilan/...` ve `/filtrele/...` App Router path; REST ile karıştırılmamalı.
*   previewService gibi “API yok” klasörü; yalnızca opsiyonel categories/listings bağımlılığı.
*   Mobil utils bu planın kapsamı dışındadır.
