# ContentGuideService Entegrasyon Planı

`ContentGuideService.ts` dosyası, kategori sayfalarındaki **içerik rehberlerini** (tips, sections, video rehber) yönetir. `USE_API = false` iken `data/categoryGuides.json` + `fakeFetch`; `USE_API = true` iken axios ile gerçek API.

**Kapsam:** Web (`services/content`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/content-guides/...` altındadır. Path alias yoktur (`/api/content-guides/...`, `/api/category-guides` kullanılmaz).

---

## 1. API Yolları (Endpoints)

### A. Tüm Rehberleri Getir
*   **Yol (Endpoint):** `GET /api/v1/content-guides`
*   **Açıklama:** Sistemdeki tüm kategori rehberlerini listeler.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `getAllContentGuides`

---

### B. ID ile Rehber Getir
*   **Yol (Endpoint):** `GET /api/v1/content-guides/{guideId}`
*   **Açıklama:** Rehber kimliğine göre tek rehber döner.
*   **Parametreler:** `guideId` (path)
*   **Kullanan FE:** `getContentGuideById`

---

### C. Kategori ID ile Rehber Getir
*   **Yol (Endpoint):** `GET /api/v1/content-guides/categories/{categoryId}`
*   **Açıklama:** Belirli kategoriye ait rehberi getirir. Yoksa BE genel rehber (`categoryId: 0`) dönebilir veya `404`.
*   **Parametreler:** `categoryId` (path)
*   **Örnek:** `GET /api/v1/content-guides/categories/1`
*   **Kullanan FE:** `CategoryGuide` → `getContentByCategoryId`

---

### D. Kategori Adı ile Rehber Getir
*   **Yol (Endpoint):** `GET /api/v1/content-guides/category-names/{categoryName}`
*   **Açıklama:** Kategori adına göre rehber bulur (case-insensitive önerilir).
*   **Parametreler:** `categoryName` (path, URL-encoded)
*   **Örnek:** `GET /api/v1/content-guides/category-names/Emlak`
*   **Kullanan FE:** `getContentByCategoryName`

---

### E. Kategori Video Rehberi
*   **Yol (Endpoint):** `GET /api/v1/content-guides/videos/categories/{categoryId}`
*   **Açıklama:** Kategoriye özel video rehber içeriğini döner.
*   **Parametreler:** `categoryId` (path)
*   **Kullanan FE:** `getVideoGuideByCategory`

---

## 2. Veri Modelleri (Request & Response)

### Standart API Yanıt Yapısı
```json
{
  "success": true,
  "data": <Guide | Guide[] | null>,
  "message": "Content guide fetched successfully"
}
```

### Guide Modeli
```typescript
interface GuideSection {
  id: number | string;
  title: string;
  icon?: string;           // örn: "faHome", "faFileContract" (FE iconMap)
  description?: string;
  tips?: string[];
}

interface Guide {
  id: number | string;
  categoryId: number | string;  // 0 = genel / fallback rehber
  label?: string;
  categoryName?: string;
  icon?: string;
  sections?: GuideSection[];
  // video rehber alanları (endpoint E):
  videoUrl?: string;
  thumbnailUrl?: string;
  title?: string;
}
```

### Örnek Tek Rehber Yanıtı
```json
{
  "success": true,
  "data": {
    "id": 1,
    "categoryId": 1,
    "label": "Emlak",
    "categoryName": "Emlak",
    "icon": "faHome",
    "sections": [
      {
        "id": 1,
        "title": "Tapu ve Yasal Durum",
        "icon": "faFileContract",
        "description": "Tapu bilgilerini ve mülkün yasal durumunu kontrol edin.",
        "tips": [
          "Tapu kayıtlarını e-Devlet üzerinden sorgulayın"
        ]
      }
    ]
  },
  "message": "OK"
}
```

### Örnek Liste Yanıtı
```json
{
  "success": true,
  "data": [ /* Guide[] */ ],
  "message": "OK"
}
```

*   Bulunamazsa: `{ "success": false, "data": null, "message": "..." }` veya `404`.
*   FE mock’ta kategori yoksa `categoryId === 0` genel rehbere düşer; BE aynı davranışı sağlayabilir.

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_URL` = `/api/v1` (veya `{host}/api/v1`). Tam yollar `/api/v1/content-guides/...`.
2.  **Alias kaldırma:** `loadCategoryGuides` içindeki `/api/category-guides` → `GET /api/v1/content-guides` olacak (tamamlandı).
3.  **Mock kaldırma:** `USE_API = true` ve API başarılıysa `categoryGuides.json` / `fakeFetch` kullanılmaz; production’da sessiz JSON fallback isteğe bağlı kapatılır.
4.  **Ortak client (opsiyonel):** Yerel axios yerine `@/api/client` kullanılabilir.
5.  **Cache:** `localStorage` anahtarları `acillazim_category_guides` (+ timestamp); BE güncellemesinde `clearCache()` gerekir.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getContentByCategoryId` | `CategoryGuide` |
| `getContentByCategoryName` | Hazır (UI bağları kısmi) |
| `getVideoGuideByCategory` | Hazır (UI bağları kısmi) |
| `getAllContentGuides` / `getContentGuideById` | Hazır / önbellek yükleme |
| `clearCache` | Servis içi |

---

## 5. Notlar

*   Mock kaynak: `data/categoryGuides.json` (`guides[]`).
*   `categoryId: 0` genel fallback rehberdir.
*   Section `icon` string’leri FE’deki FontAwesome `iconMap` ile eşleşmelidir.
*   Mobil content servisleri bu planın kapsamı dışındadır.
