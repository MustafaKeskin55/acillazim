# dashboardReviewsService Entegrasyon Planı

`dashboardReviewsService.ts` dashboard (hizmet alanı) yorum yönetimini sağlar: tüm/ilan/sağlayıcı yorumları, yanıtlama, yanıt silme, istatistik. Şu an `reviews_database.json` + `user_database2.json` mock; yanıtlar `localStorage` (`review_response_{id}`).

**Kapsam:** Web (`services/reviews`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/reviews`, `/dashboard/reviews` ham path kullanılmaz).

**İlgili sözleşmeler:**
*   Profil kullanıcı yorumları → `profileService` / `reviewService`: `GET /api/v1/users/{userId}/reviews`
*   İlan yorumları (public detay) → `productDetailService`: `GET /api/v1/listings/{listingId}/reviews`
*   Yorum oluşturma (müşteri) → `POST /api/v1/reviews` (profile `submitReview`)

**BE routing notu:** `/stats` gibi statik path’ler `{reviewId}` dinamik route’larından **önce** eşleşmelidir.

---

## 1. API Yolları (Endpoints)

### A. Dashboard — Sağlayıcıya Gelen Yorumlar
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}/reviews`  
    veya oturum kullanıcısı için `GET /api/v1/reviews/inbox` (token’dan user)
*   **Açıklama:** `commented_user_id` = sağlayıcı olan yorumlar (+ yanıt alanı). FE `getServiceReviews` / `getAllReviews` bunu kullanmalı (tüm DB dump değil).
*   **Query (opsiyonel):** `page`, `page_size`, `rating`, `has_response`
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu — kendi yorumları)
    *   `Content-Type: application/json`
*   **Kullanan FE:** `ServiceReviewResponse` → `getAllReviews` (şimdilik tüm mock); `getServiceReviews`
*   **Mock:** `reviews_database.json` filtre `commented_user_id`

---

### B. İlana Göre Yorumlar
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}/reviews`
*   **Açıklama:** Belirli hizmet/ilan yorumları. productDetail ile aynı.
*   **Kullanan FE:** `getIlanReviews` (`ServiceEdit` vb.)
*   **Mock:** `ilan_id` filtresi

---

### C. Yoruma Yanıt Ver
*   **Yol (Endpoint):** `POST /api/v1/reviews/{reviewId}/response`
*   **Açıklama:** Sağlayıcı yorumuna resmi yanıt. localStorage kaldırılacak.
*   **İstek Gövdesi (Body):**
    ```json
    { "response": "Teşekkürler, memnun kaldığınıza sevindik." }
    ```
    `service_id` / sahip kontrolü token’dan; body’de zorunlu değil.
*   **Örnek yanıt data:**
    ```json
    {
      "reviewId": 12,
      "serviceId": 42,
      "response": "Teşekkürler...",
      "timestamp": "2026-07-20T00:00:00.000Z"
    }
    ```
*   **Kullanan FE:** `respondToReview`

---

### D. Yanıtı Sil
*   **Yol (Endpoint):** `DELETE /api/v1/reviews/{reviewId}/response`
*   **Kullanan FE:** `deleteReviewResponse`
*   **Mock:** `localStorage.removeItem('review_response_{id}')`

---

### E. Yanıt Getir
*   **Mevcut FE:** `getReviewResponse` — senkron localStorage (client-only).
*   **Gerçek API:** Yanıt A/B listesinde `response` alanı olarak gelmeli; ayrı GET gerekmez.
*   **Opsiyonel:** `GET /api/v1/reviews/{reviewId}/response`

---

### F. Yorum İstatistikleri
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}/reviews/stats`  
    veya `GET /api/v1/reviews/stats?user_id={userId}`
*   **Örnek data:**
    ```json
    {
      "totalReviews": 24,
      "averageRating": 4.5,
      "ratingDistribution": [
        { "rating": 1, "count": 0 },
        { "rating": 5, "count": 12 }
      ]
    }
    ```
*   **Kullanan FE:** `getReviewStats`

---

### G. Tüm Yorumlar (admin / legacy)
*   **Mevcut:** `getAllReviews` tüm mock DB’yi döner — production’da kullanılmamalı.
*   **Önerilen:** A (inbox) veya admin-only `GET /api/v1/admin/reviews` (bu plan dışı).

---

## 2. Veri Modelleri (Request & Response)

### Standart API Yanıt Yapısı
```json
{
  "success": true,
  "data": <Veri>,
  "message": "OK",
  "timestamp": "2026-07-20T00:00:00.000Z"
}
```

### TransformedReview (FE)
```typescript
interface TransformedReview {
  id: number | string;
  ilan_id?: number | string;
  user: string;                 // yorumcu adı
  rating: number;
  comment?: string;
  date?: string;
  time?: string;
  response: string | null;      // sağlayıcı yanıtı
  commentedUserId?: number | string;
  commenterId: number | string;
}
```

### ReviewResponseData
```typescript
interface ReviewResponseData {
  reviewId: number | string;
  serviceId: number | string;
  response: string;
  timestamp: string; // ISO
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` → `/api/v1/reviews/...`, `/api/v1/listings/{id}/reviews`, `/api/v1/users/{id}/reviews`.
2.  **Mock kaldırma:** JSON + `simulateApiDelay` → gerçek `fetch` + `auth_token`.
3.  **localStorage yanıtlar:** `review_response_*` → C/D endpoint’leri; liste yanıtında `response` embed.
4.  **getAllReviews:** Dashboard’da sağlayıcı inbox (A) ile değiştir; tüm DB dump kaldır.
5.  **serviceId vs userId:** `getServiceReviews` `commented_user_id` kullanıyor — BE’de netleştir (user mı listing mi).
6.  **Çakışma:** profile `reviewService` + productDetail reviews + bu servis — okuma yolları paylaşılmalı; yanıt (reply) bu servisin eklentisi.
7.  **SSR:** `getReviewResponse` localStorage kullanır; window guard eklenmeli.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getAllReviews` / `respondToReview` / `deleteReviewResponse` | `ServiceReviewResponse` |
| `getIlanReviews` / `getServiceReviews` / `getReviewStats` | `ServiceEdit`, dashboard hizmet alanı |

---

## 5. Notlar

*   Mock: `data/reviews_database.json`, `data/user_database2.json`; response key `review_response_{reviewId}`.
*   Müşteri yorum yazma bu dosyada yok → `POST /api/v1/reviews` (profile).
*   Mobil reviews bu planın kapsamı dışındadır.
