# profileService Entegrasyon Planı

`services/profile` kullanıcı profil sayfasını yönetir:
*   `profileService.ts` — profil + istatistik (mock `user_database2` + card/reviews)
*   `userProfileService.ts` — UserInfo / header / telefon görünürlük / doğrulama facade
*   `reviewService.ts` — kullanıcı yorumları, detay, pending, submit
*   `userIlanService.ts` — profil ilan listesi (`üründat.json`, `USE_MOCK`)
*   `userListingsService.ts` — alternatif ilan listesi (`cardData`) — **birleştirilmeli**
*   `categoryService.ts` (profil) — kullanıcı kategorileri (şu an boş dizi); ana `services/category` ile karıştırılmamalı

**Kapsam:** Web (`services/profile`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/users`, `/api/profile` v1’siz kullanılmaz).

**İlgili sözleşmeler:**
*   Kullanıcı özeti → `messageService` / `productDetail`: `GET /api/v1/users/{userId}`
*   İlan listesi → `listingsService`: `GET /api/v1/listings?user_id=...` veya `GET /api/v1/users/{userId}/listings`
*   İlan yorumları (ilan bazlı) → `productDetailService` `.../reviews` — profil yorumları kullanıcı bazlıdır

---

## 1. API Yolları (Endpoints)

### A. Kullanıcı Profili
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}`
*   **Açıklama:** Profil alanları (ad, foto, kapak, telefon, email, doğrulama, il/ilçe, bio, rol, service_areas).
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel public; hassas alanlar için zorunlu)
*   **Kullanan FE:** `ProfilePage` → `profileService.fetchUserProfile`; `userProfileService.getUserInfoData` / `getProfileHeaderData`
*   **Mock:** `data/user_database2.json`

---

### B. Profil İstatistikleri
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}/stats`
*   **Açıklama:** Aktif/satılan ilan sayısı, görüntülenme, güven skoru, üyelik tarihi, yorum sayısı, yanıt süresi vb.
*   **Alternatif:** A yanıtında `stats` embed.
*   **Kullanan FE:** `fetchUserStats` (profil içinde)
*   **Örnek data:**
    ```json
    {
      "listingCounts": { "active": 5, "sold": 2, "total": 7 },
      "responseTime": "1 saat",
      "totalViews": 1200,
      "trustScore": 85,
      "completedTransactions": 10,
      "memberSince": "2020-05-10",
      "totalReviews": 12
    }
    ```

---

### C. Kullanıcı İlanları
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}/listings`  
    veya `GET /api/v1/listings?user_id={userId}`
*   **Query:** `status` (`active`|`sold`|…), `category_id`, `fiyat_min`/`fiyat_max`, `date_start`/`date_end`, `sort`, `page`, `page_size`
*   **Kullanan FE:** `UserIlanlar` → `userIlanService.getUserIlanlar`; `userListingsService` (duplicate — tek servise indirgenecek)
*   **Mock:** `üründat.json` / `cardData`

---

### D. Kullanıcı Yorumları (profil)
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}/reviews`
*   **Query:** `rating`, `page`, `page_size` / `limit`, `sort`
*   **Yanıt:** `reviews[]` + `stats` (averageRating, ratingCounts, …) + pagination
*   **Kullanan FE:** `ProfilePage` → `reviewService.getUserReviews`
*   **Mock:** `reviews_database.json`

---

### E. Yorum Detayı
*   **Yol (Endpoint):** `GET /api/v1/reviews/{reviewId}`
*   **Kullanan FE:** `getReviewDetails`

---

### F. Bekleyen Değerlendirmeler
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}/reviews/pending`
*   **Açıklama:** Kullanıcının henüz yapmadığı (işlem sonrası) değerlendirmeler.
*   **Kullanan FE:** `getPendingReviews` (şu an boş dizi)

---

### G. Değerlendirme Gönder
*   **Yol (Endpoint):** `POST /api/v1/reviews`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "target_user_id": 42,
      "listing_id": 1001,
      "rating": 5,
      "comment": "Çok ilgili satıcı"
    }
    ```
    `user_id` (yorumcu) token’dan.
*   **Kullanan FE:** `submitReview`

---

### H. Telefon Görünürlük İzni
*   **Yol (Endpoint):** `POST /api/v1/users/{userId}/phone-visibility`
*   **Açıklama:** Profilde telefon gösterme izni / unlock (rate-limit BE’de).
*   **Örnek yanıt data:** `{ "isVisible": true }`
*   **Kullanan FE:** `requestPhoneVisibility`

---

### I. Doğrulama Durumu
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}/verification`
*   **Alternatif:** A profilinde `dogrulanmis_hesap` / email / phone flag’leri.
*   **Kullanan FE:** `checkVerificationStatus`

---

### J. Kullanıcının İlan Kategorileri (filtre)
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}/categories`
*   **Açıklama:** Kullanıcının ilanlarındaki benzersiz kategoriler (profil filtre dropdown).
*   **Not:** Profil klasöründeki `categoryService` şu an boş döner; gerçek veri C’den türetilebilir veya bu endpoint.
*   **Tüm kategoriler:** Ana `categoryService` → `GET /api/v1/categories` (profil `getAllCategories` buraya delege)

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

### Profile + Stats (FE)
```typescript
interface ProfileResultData {
  profile: {
    user_id: number;
    ad_soyad: string;
    profil_fotografi?: string;
    kapak_fotografi?: string;
    telefon?: string;
    email?: string;
    dogrulanmis_hesap?: boolean;
    email_dogrulandi?: boolean;
    telefon_dogrulandi?: boolean;
    il?: string;
    ilce?: string;
    bio?: string;
    rol?: string;
    service_areas?: unknown[];
  };
  stats: UserStats;
}
```

### UserIlanResult / ListingsResult
```json
{
  "success": true,
  "data": {
    "listings": [ /* IlanRecord[] */ ],
    "pagination": { "total": 10, "page": 1, "pageSize": 20, "totalPages": 1 },
    "filters": { /* uygulanan filtreler */ }
  }
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` → `/api/v1/users/...`, `/api/v1/reviews`, `/api/v1/listings?...`.
2.  **Mock kaldırma:** JSON + `fakeFetch` / `USE_MOCK` → gerçek `fetch` + `auth_token`.
3.  **Birleştirme:** `userListingsService` + `userIlanService` tek listings yolu; profil `categoryService` → ana category veya J.
4.  **Hassas alanlar:** Telefon/email maskeleme BE veya FE; public profilde token’sız kısıtlı alan.
5.  **Naming:** BE snake_case (`target_user_id`); FE map.
6.  **Ortak client (opsiyonel):** `@/api/client`.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `fetchUserProfile` / `fetchUserStats` | `ProfilePage` |
| `getUserInfoData` | `UserInfo` |
| `getProfileHeaderData` / `requestPhoneVisibility` / `checkVerificationStatus` | Header / UserInfo |
| `getUserReviews` | `ProfilePage` / ReviewList |
| `getUserIlanlar` | `UserIlanlar` |
| `userListingsService` | Kullanım az / legacy |
| Profil `categoryService` | Filtre (boş) |

---

## 5. Notlar

*   Mock: `user_database2.json`, `reviews_database.json`, `üründat.json`, `cardData`.
*   Profil `categoryService` ≠ `services/category/categoryService`.
*   İlan yorumları (`productDetail`) ile kullanıcı yorumları (`reviewService`) ayrı resource’lar olabilir; BE netleştirmeli.
*   Mobil profil bu planın kapsamı dışındadır.
