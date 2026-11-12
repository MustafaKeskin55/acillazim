# sidebarService Entegrasyon Planı

`sidebarService.ts` ana sidebar için kategori yükleme + ikon/renk/ad yardımcılarıdır. HTTP çağrısı yok; `categoryService.getMainCategories()` üzerine ince facade.

**Kapsam:** Web (`services/sidebar`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/sidebar`, `/categories/main` ham path kullanılmaz).

**İlgili sözleşmeler:**
*   Ana kategoriler → `categoryService`: `GET /api/v1/categories?parent_id=null`
*   Hizmet menüsü → `categoryService.getServiceCategories` (`GET /api/v1/categories?is_service=true`) — `Sidebar` `categorySource='service'` iken doğrudan `categoryService` çağırır (bu facade değil)
*   Alt kategori / filtre navigasyon → `categoryService.hasSubCategories`, `categoryApi`

**Client-only:** React Icons `iconMap`, `getIconComponent` / `getCategoryColor` / `getCategoryName` / `getCategoryId` (API yok).

---

## 1. API Yolları (Endpoints)

### A. Sidebar Ana Kategoriler
*   **Yol (Endpoint):** `GET /api/v1/categories`
*   **Açıklama:** Kök (parent’siz) ana kategoriler. FE `sidebarService.loadCategories` → `categoryService.getMainCategories`.
*   **Query:** `parent_id=null` (veya BE’nin kök semantiği)
*   **Örnek:** `GET /api/v1/categories?parent_id=null`
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `components/Sidebar/Sidebar.tsx` (`categorySource='all'`)
*   **Mock:** `categoryService` JSON / `USE_API` bayrağı

---

### B. Sidebar Hizmet Kategorileri (aynı bileşen, farklı kaynak)
*   **Yol (Endpoint):** `GET /api/v1/categories?is_service=true`
*   **Açıklama:** `Sidebar` `categorySource='service'` — `categoryService.getServiceCategories` (sidebarService bypass).
*   **Sözleşme:** `categoryService.md` / `serviceCategoriesService.md`
*   **Kullanan FE:** mobil hizmet sayfası menüsü

---

### C. İkon / Renk / Label Helpers
*   **API yok** — FE `getIconComponent`, `getCategoryColor`, `getCategoryName`, `getCategoryId`.
*   BE kategori `icon` string’i (örn. `FaCar`) → FE `iconMap` ile React component.

---

## 2. Veri Modelleri (Request & Response)

`categoryService` Category modeli ile aynı:

```typescript
interface CategoryItem {
  category_id?: number | string;
  id?: number | string;
  label?: string;
  name?: string;
  bgColor?: string;
  icon?: string; // React Icons adı veya FA class
  slug?: string;
  type?: string;
  hasCustomPage?: boolean;
  webUrl?: string;
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** Bu serviste fetch yok; `categoryService` zaten `{host}/api/v1/categories`.
2.  **Alias yok:** Ayrı `/api/sidebar` endpoint eklenmez.
3.  **Tip temizliği:** `as unknown as { getMainCategories }` cast → düz `categoryService.getMainCategories()`.
4.  **İsteğe bağlı:** Hizmet kaynağını da facade’e taşı (`loadServiceCategories`) — tek giriş noktası.
5.  **İkon map:** BE yeni icon adları dönerse `iconMap` güncellenir (deploy FE).

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `loadCategories` | `Sidebar` (`categorySource='all'`) |
| `getIconComponent` / renk / ad / id | `Sidebar` render |
| `categoryService.getServiceCategories` | `Sidebar` (`categorySource='service'`) — doğrudan |

---

## 5. Notlar

*   Ayrı sidebar BE resource’u yok; categories yeter.
*   `categoriesUpdated` window event ile yeniden yükleme (client).
*   Mobil sidebar bu planın kapsamı dışındadır.
