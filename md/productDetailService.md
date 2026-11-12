# productDetailService Entegrasyon Planı

`services/productDetail` ürün/hizmet detay sayfası verisini yönetir:
*   `productDetailService.ts` — ilan detay, benzer ilanlar, satıcı, FAQ/paket/çalışma saatleri, yorumlar, favori toggle (mock JSON + `simulateApiRequest`)
*   `carDamageService.ts` — araç hasar/boya durumu (ilan `ozellikler` + statik config; client parse ağırlıklı)

**Kapsam:** Web (`services/productDetail`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/v1/ilanlar`, `/api/ilanlar`, `/hizmetler/...` Türkçe path kullanılmaz).

**İlgili sözleşmeler:**
*   İlan detay / liste → `listingsService`: `GET /api/v1/listings/{id}`, `GET /api/v1/listings?...`
*   Favori → `favoriteService`: `POST /api/v1/favorites/add`, `DELETE .../remove/{listingId}`
*   Kullanıcı özeti → `GET /api/v1/users/{userId}` (`messageService` ile aynı)
*   Randevu → `appointmentService` (çalışma saatleri randevu slotlarından ayrı olabilir)

**Mock kaynaklar:** `üründat.json`, `user_database2.json`, `faq_database.json`, `pricing_database.json`, `working_hours_database.json`, `reviews_database.json`.

---

## 1. API Yolları (Endpoints)

### A. İlan Detayı
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}`
*   **Açıklama:** Ürün/hizmet detay. FE medya (`resimler_bilgi`), satıcı, FAQ, paketler, çalışma saatlerini birleştirebilir veya BE embed döner.
*   **Eski sim path:** `/ilanlar/{id}` → kaldırıldı.
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `useProductDetailController` → `getProductDetail`
*   **Embed (önerilen BE `data` alanları):** `seller` / `ilan_sahibi`, `faq[]`, `packages[]`, `workingHours`, `reviews` (veya alt endpoint’ler)

---

### B. Benzer İlanlar
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}/similar`
*   **Açıklama:** Aynı kategori (veya BE skor) benzer ilanlar. Query: `limit` (varsayılan `5`).
*   **Eski sim path:** `/ilanlar/{id}/benzer-ilanlar` → kaldırıldı.
*   **Alternatif:** `GET /api/v1/listings?category_id={id}&exclude_id={listingId}&page_size=5`
*   **Kullanan FE:** `getSimilarProducts` (`SimilarProducts` bileşeni ayrıca `similarProductsService` kullanabilir — tek yola indirgenecek)

---

### C. Favori Toggle
*   **Yol (Endpoint):** `favoriteService` sözleşmesi — bu serviste ayrı path yok.
*   **Eski sim:** `POST|DELETE /ilanlar/{id}/favorite` → kaldırılacak; `favoriteService.addToFavorites` / `removeFromFavorites` kullanılmalı.
*   **Kullanan FE:** `toggleFavorite` (varsa) → favoriteService’e delege

---

### D. Satıcı / Kullanıcı Özeti
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}`
*   **Açıklama:** İlan sahibi kartı (ad, avatar, telefon, doğrulama, konum, diğer ilan sayısı).
*   **Eski sim path:** `/kullanicilar/{id}` → kaldırıldı.
*   **Kullanan FE:** `getSellerInfo` (detay içinde çağrılır)

---

### E. Çalışma Saatleri
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}/working-hours`
*   **Açıklama:** Haftalık açık/kapalı saatler. Yoksa `404` / boş; hizmet ilanlarında anlamlı.
*   **Alternatif:** Detay yanıtında `workingHours` embed.
*   **Kullanan FE:** `ServiceDetailPage`, `AppointmentModal`, `getServiceDetailData` → `getWorkingHoursByIlanId`
*   **Mock:** `working_hours_database.json` (+ `is_today` FE’de hesaplanır — client kalabilir)

---

### F. SSS (FAQ)
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}/faq`
*   **Alternatif:** Detay embed `faq[]`.
*   **Mock:** `faq_database.json`

---

### G. Fiyat Paketleri (hizmet)
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}/packages`
*   **Alternatif:** Detay embed `packages[]`.
*   **Mock:** `pricing_database.json`

---

### H. Yorumlar / Değerlendirmeler
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}/reviews`
*   **Query (opsiyonel):** `page`, `page_size`
*   **Kullanan FE:** `ServiceDetailReviews`, `ServiceEdit` → `getReviewsByIlanId`
*   **Mock:** `reviews_database.json` + kullanıcı adı `user_database2`

---

### I. Hizmet Detay Aggregate (opsiyonel)
*   **Mevcut FE:** `getServiceDetailData` = `getProductDetail` + working hours (ayrı `/hizmetler/{id}` sim).
*   **Önerilen:** A + E yeterli; ayrı `/api/v1/services/{id}` yok (alias değil). Eski `/hizmetler/{id}` kaldırıldı.

---

### J. Araç Hasar Config
*   **Yol (Endpoint) — önerilen:** `GET /api/v1/listings/vehicle-damage/config`  
    veya statik FE config (renk/etiket nadiren değişir).
*   **Kullanan FE:** `carDamageService.getDamageStatusConfig`
*   **Şu an:** Hardcoded mock yanıt (network yok)

---

### K. Araç Hasar Parse — client-only
*   **Endpoint yok.** `processCarDamageInfo(productData)` ilan `ozellikler.hasar_durumlari` / `parca_durumlari` üzerinden çalışır.
*   Hasar verisi ilan detayından (A) gelmeli.

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

### SellerData (FE)
```typescript
interface SellerData {
  id: number | string;
  name: string;
  profileImage?: string;
  phone?: string;
  email?: string;
  isVerified?: boolean;
  bio?: string | null;
  location: { city?: string; district?: string };
  memberSince: string;      // ISO
  otherListings: number;
}
```

### PricingPackage (FE)
```typescript
interface PricingPackage {
  title: string;
  price: number;
  currency: string;
  price_type: string;
  deliveryDays: number;
  features: string[];
  popular: boolean;
  discount_percentage?: number;
  original_price?: number;
}
```

### Review (FE formatlı)
```typescript
interface ReviewItem {
  id: number;
  ilan_id: number;
  user: string;
  rating: number;
  comment: string;
  date: string;
  time: string;
  response: string | null;
  commentedUserId: number;
  commenterId: number;
}
```

### DamageStatusConfig
```typescript
interface DamageStatusConfig {
  title: string;
  statusTypes: Record<string, { label: string; color: string }>;
  partTranslations: Record<string, string>;
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` (eski `https://api.acillazim.com/v1` api’siz kaldırıldı).
2.  **Simülasyon:** `simulateApiRequest` + sahte `API_TOKEN` → gerçek `fetch` + `auth_token`.
3.  **Path’ler:** Türkçe `/ilanlar`, `/kullanicilar`, `/hizmetler`, `/benzer-ilanlar` → yukarıdaki v1 İngilizce path’ler.
4.  **Favori:** `toggleFavorite` → `favoriteService`.
5.  **Benzer ilanlar:** `similarProductsService` / `productService` ile tek endpoint.
6.  **carDamage:** Config isteğe bağlı endpoint veya FE const; parse client kalır.
7.  **`is_today`:** Çalışma saatlerinde FE hesaplaması kalabilir.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getProductDetail` / `getSimilarProducts` | `useProductDetailController` |
| `getWorkingHoursByIlanId` | `ServiceDetailPage`, `AppointmentModal` |
| `getReviewsByIlanId` | `ServiceDetailReviews`, `ServiceEdit` |
| `getServiceDetailData` | Hizmet detay (aggregate) |
| `processCarDamageInfo` / `getDamageStatusConfig` | `VehicleDamageDisplay` |

---

## 5. Notlar

*   Detay yanıtı zengin embed dönerse F/G/E/H ayrı istekler azalır.
*   `memberSince` mock’ta sentetik üretiliyor; BE gerçek kayıt tarihi dönmeli.
*   Mobil product-detail bu planın kapsamı dışındadır.
