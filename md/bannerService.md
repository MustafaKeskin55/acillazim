# bannerService Entegrasyon Planı

`bannerService.ts` dosyası, **kategori sayfası banner filtrelerini** yönetir (`CategoryBanner`). Reklam banner’ları (`adBannerService` → `/api/v1/banners`) ile karıştırılmamalıdır.

**Kapsam:** Web (`services/banner`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/banner/...` altındadır. Path alias yoktur (`/api/banner/...` veya `/api/v1/banners/filters` kullanılmaz).

**Mod:** `USE_API = false` → `data/banner.json` + `data/realty_filter.json`. `USE_API = true` → gerçek API.

---

## 1. API Yolları (Endpoints)

### A. Kategori Banner Filtrelerini Getir
*   **Yol (Endpoint):** `GET /api/v1/banner/filters`
*   **Açıklama:** Belirli kategori ID için banner’da gösterilecek filtre listesini, meta bilgileri ve arka plan alanlarını döner. Kategori için banner yoksa `404` veya `null` eşdeğeri.
*   **Query Parametreleri:**
    *   `categoryId` (number, zorunlu)
*   **Örnek İstek:** `GET /api/v1/banner/filters?categoryId=1`
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `CategoryBanner` → `getBannerFiltersForCategory`

---

### B. Banner Var mı? (HEAD)
*   **Yol (Endpoint):** `HEAD /api/v1/banner/filters`
*   **Açıklama:** Body olmadan kategori için banner varlığını kontrol eder. `200` → var, `404` → yok.
*   **Query Parametreleri:**
    *   `categoryId` (number, zorunlu)
*   **Örnek İstek:** `HEAD /api/v1/banner/filters?categoryId=1`
*   **Kullanan FE:** `CategoryBanner` → `hasBanner`

---

## 2. Veri Modelleri (Request & Response)

### Başarılı Yanıt (`BannerResponse`)
FE `validateBannerResponse` şu alanları bekler (düz obje; isteğe bağlı `{ success, data }` sarmalayıcı kullanılacaksa FE unwrap edilmeli):

```json
{
  "success": true,
  "categoryId": 1,
  "hasBanner": true,
  "filterCount": 3,
  "filters": [
    {
      "id": 10,
      "label": "Oda Sayısı",
      "type": "multi-select",
      "db_field": "room_count",
      "display_location": "banner",
      "priority": true,
      "options": [
        { "label": "1+1", "value": "1+1" },
        { "label": "2+1", "value": "2+1" }
      ],
      "unit": null,
      "category_dependency": []
    }
  ],
  "backgroundImage": null,
  "title": null,
  "subtitle": null,
  "metadata": {
    "source": "api",
    "timestamp": "2026-07-15T21:00:00.000Z",
    "version": "2.0.0"
  }
}
```

### FilterItem Modeli
```typescript
interface FilterItem {
  id: number | string;          // Zorunlu (validasyon)
  label: string;                // Zorunlu
  type: string;                 // Zorunlu (örn: multi-select, range, checkbox, text)
  db_field?: string | null;
  display_location?: string;
  priority?: boolean;
  options?: Array<{ label?: string; value?: string | number }>;
  unit?: string | null;
  category_dependency?: (number | string)[];
}
```

### Hata Yanıtı (FE hata eşlemesi)
```json
{
  "success": false,
  "error": "HTTP 400",
  "message": "categoryId gerekli",
  "statusCode": 400
}
```

*   `404` → FE `null` / `hasBanner: false` döner (banner yok sayılır).
*   `5xx` → `error: "Internal Server Error"`.
*   Network → `error: "Network Error"`, `statusCode: 0`.

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** Axios `baseURL` = `{host}/api/v1`, endpoint = `/banner/filters` (tam yol: `/api/v1/banner/filters`). Alias yok.
2.  **Mock kaldırma:** `USE_API = true` olduğunda `banner.json` / `realty_filter.json` kullanılmaz; cache yalnızca API yanıtlarını tutar.
3.  **Wrapper kararı:** BE `{ success, data, message }` dönerse `validateBannerResponse` öncesi `response.data.data` unwrap edilmeli.
4.  **Ortak client (opsiyonel):** Yerel axios instance yerine `@/api/client` kullanılabilir; cache ve validasyon aynı kalır.
5.  **Cache:** TTL 5 dk; `clearCache` / `invalidateCache` API yanıt önbelleğini temizler.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getBannerFiltersForCategory` | `CategoryBanner` |
| `hasBanner` | `CategoryBanner` |
| `clearCache` / `invalidateCache` | Servis içi / debug |

---

## 5. Notlar

*   Bu servis **kategori filtre banner’ı**dır. Reklam medya banner’ları için `services/advertisement` ve `GET /api/v1/banners` kullanılır.
*   Mock kaynak: `data/banner.json` (`banner_categories[].banner_category_id` + `filter_id[]`) ve `data/realty_filter.json`.
*   Mobil banner servisleri bu planın kapsamı dışındadır.
