# previewService Entegrasyon Planı

`previewService.ts` ilan önizleme akışını yönetir: form verisini localStorage’a kaydet/oku/temizle, görselleri base64’e çevir, session geçerliliği, kategori tipi (ürün/hizmet), debug bilgisi.

**Kapsam:** Web (`services/preview`). Mobil servislere dokunulmayacak.

**API versiyonu:** Bu serviste **BE endpoint yok**. Hiçbir `/api/v1/...` çağrısı yapılmaz. Path alias tanımlanmaz.

**İlgili sözleşmeler:**
*   İlan yayınlama / CRUD → `CreateListingService` (`POST /api/v1/listings...`)
*   Taslak → CreateListing `sessionStorage` (ayrı client-only)
*   CreateListing içinde benzer metotlar var (`transformFormDataForPreview`, `markListingAsPublished`) — tek kaynak tercih edilmeli

**Client-only storage:**
*   localStorage: `previewFormData`, `previewTimestamp`, `previewCategoryType` (+ temizlikte `productDetailData`, `cachedProductData`)
*   sessionStorage: `formSessionId`, `lastFormState`, `listingPublished`, `editingMode`, konum (`selectedCity` / …), `categoryFieldLabels`, `currentFormData`

---

## 1. API Yolları (Endpoints)

### A. Mevcut durum — endpoint yok
Tüm işlemler tarayıcı deposunda:

| FE fonksiyon | Depo / davranış |
|--------------|-----------------|
| `savePreviewData` | localStorage `previewFormData` (+ timestamp); max ~5MB |
| `getPreviewData` | Oku; session geçersiz veya 24s süre dolmuşsa temizle |
| `clearPreviewData` | Preview + ilgili session/cache key’leri sil |
| `transformFormDataForPreview` | Form → preview modeli; File→base64 (max ~2MB/görsel) |
| `detectCategoryType` | `hizmet` \| `urun` |
| `isPreviewDataValid` | title zorunlu |
| `markListingAsPublished` | session `listingPublished` + clear |
| `markAsEditingMode` | session `editingMode` |
| `startNewFormSession` | Yeni form session (edit modunda no-op) |
| `getPreviewDebugInfo` | Debug meta |

### B. Opsiyonel BE (şu an yok — istenirse)
Sunucu tarafı önizleme / paylaşılan preview linki gerekirse (CreateListing taslak ile hizalı):

*   **Önerilen:** `POST /api/v1/listings/previews` — geçici preview kaydı (TTL)
*   **Önerilen:** `GET /api/v1/listings/previews/{previewId}`
*   Alias yok; `/api/preview` kullanılmaz.

Şu an FE buna bağlı değildir; eklenene kadar client-only kalır.

---

## 2. Veri Modelleri (Request & Response)

### PreviewFormData (localStorage)
```typescript
interface PreviewFormData {
  title: string;
  description?: string;
  price?: number | null;
  currency?: string;
  condition?: string;
  exchange?: boolean;
  city?: string;
  district?: string;
  neighborhood?: string;
  address?: string;
  selectedCategory?: unknown;
  categoryType?: string;       // "hizmet" | "urun"
  images?: unknown[];          // File | { file: File } | base64 string
  categoryFields?: Record<string, unknown>;
  createdAt?: number;
  previewVersion?: string;
  savedAt?: number;
  version?: string;
  [key: string]: unknown;      // category_* alanları
}
```

### PreviewDebugInfo
```typescript
interface PreviewDebugInfo {
  hasData: boolean;
  dataSize?: number;
  savedAt?: string | null;
  categoryType?: string;
  isValid?: boolean;
  expiresAt?: string | null;
  error?: string;
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **API yok:** `resolveApiBase` / `USE_MOCK` eklenmez; bu servis network çağırmaz.
2.  **Çift implementasyon:** CreateListing’teki preview/session yardımcıları ile birleştir veya tek modülden re-export et.
3.  **Kullanım:** Repo’da doğrudan import bulunamadı; CreateListing / önizleme sayfası bu servise bağlanmalı veya dead code temizlenmeli.
4.  **Opsiyonel BE:** Paylaşılabilir preview istenirse B endpoint’leri + TTL; görseller CreateListing `POST /listings/images` ile yüklenmeli (base64 localStorage kotası riskli).
5.  **SSR:** Mevcut `typeof window` guard’ları korunmalı.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Beklenen kullanım |
|-----------|-------------------|
| `transformFormDataForPreview` / `savePreviewData` / `getPreviewData` | İlan formu → önizleme sayfası |
| `markListingAsPublished` / `clearPreviewData` | Yayın sonrası temizlik |
| `markAsEditingMode` / `startNewFormSession` | Yeni ilan vs düzenle |
| `detectCategoryType` | Ürün / hizmet önizleme UI |

*Not: Grep’te `services/preview` import’u yok; CreateListing kendi kopyasını kullanıyor olabilir.*

---

## 5. Notlar

*   Süre: `DATA_EXPIRY_TIME` = 24 saat.
*   Büyük görseller QuotaExceeded riski; gerçek akışta CDN/image upload tercih edilmeli.
*   Mobil preview bu planın kapsamı dışındadır.
