# usersService (services/users/userService) Entegrasyon Planı

`services/users/userService.ts` oturum kullanıcısı özeti, konum/şehir ve id ile kullanıcı lookup (üyelik tarihi) sağlar. Şu an senkron mock: `userData.json` + `user_database2.json`.

**Kapsam:** Web (`services/users`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/users` v1’siz, `/kullanicilar/{id}` Türkçe path kullanılmaz).

**İlgili sözleşmeler:**
*   Tam profil → `profileService`: `GET /api/v1/users/{userId}` (+ stats, listings, reviews)
*   İlan satıcı kartı → `productDetailService` / `messageService`: aynı `GET /api/v1/users/{userId}`
*   Auth oturum → `authService` (`/api/v1/auth/me` veya token’dan user)
*   Maskeleme yardımcıları → kök `services/userService.ts` (`maskUserName` vb.) — **API yok**, bu planın dışında; birleştirilebilir

**Client-only:** Adres → şehir/ilçe extract (`getUserLocation` / `getUserCity`).

---

## 1. API Yolları (Endpoints)

### A. Oturum Kullanıcısı (me)
*   **Yol (Endpoint):** `GET /api/v1/users/me`  
    veya `GET /api/v1/auth/me` (`authService` ile tek kaynak)
*   **Açıklama:** Giriş yapmış kullanıcı özeti (adres, şehir dahil). FE `getCurrentUser`.
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (**Zorunlu**)
*   **Kullanan FE:** `getUserLocation` / `getUserCity` → ProductDetail konum
*   **Mock:** `data/userData.json`

---

### B. Kullanıcı ID ile Getir
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}`
*   **Açıklama:** Public/özet kullanıcı kaydı. FE `getUserById`, `getUserMemberSince` (`member_since` / `uyelik_tarihi`).
*   **Örnek:** `GET /api/v1/users/42`
*   **İstek Başlıkları:**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel; hassas alanlar için zorunlu)
*   **Eski / yasak:** `/kullanicilar/{id}`, `/api/users/{id}` (v1’siz)
*   **Kullanan FE:** `SellerInfo` → `getUserMemberSince`
*   **Mock:** `data/user_database2.json` find by `user_id`

---

### C. Üyelik Tarihi (alan)
*   Ayrı endpoint yok — B yanıtında `member_since` (veya `uyelik_tarihi` legacy map).
*   FE `getUserMemberSince(userId)`.

---

### D. Konum / Şehir (alan)
*   Ayrı endpoint yok — A veya B yanıtında `address.city` / `il` / `city`.
*   FE `getUserLocation`, `getUserCity` (client extract).

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

### User (özet)
```typescript
interface User {
  user_id?: number | string;
  id?: number | string;
  ad_soyad?: string;
  display_name?: string;
  uyelik_tarihi?: string;   // legacy
  member_since?: string;    // BE tercih
  address?: { city?: string; district?: string };
  il?: string;
  ilce?: string;
  is_verified?: boolean;
  avatar_url?: string;
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` → `/users/...`.
2.  **getCurrentUser / getUserById:** Senkron JSON → async `fetch` + `USE_MOCK`.
3.  **Caller güncelle:** `SellerInfo` / `ProductDetail` → `await` (veya hook).
4.  **Tek kaynak:** `profileService` / `authService` ile çakışan fetch’leri birleştir; bu modül ince facade kalsın.
5.  **Kök `services/userService.ts`:** Maskeleme burada kalabilir veya `users/` altına taşınır (opsiyonel).

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getUserCity` | `ProductDetailPage` |
| `getUserMemberSince` | `SellerInfo` |
| `getCurrentUser` / `getUserById` / `getUserLocation` | İç kullanım / ileride profil özet |

*Kök `services/userService.maskUserName`:* `ServiceDetailReviews`, `ServiceReviewResponse` (API yok).

---

## 5. Notlar

*   Mock: `userData.json`, `user_database2.json`.
*   Auth token: `auth_token`.
*   `profileService` ile aynı BE resource — duplicate cache önlenmeli.
*   Mobil users bu planın kapsamı dışındadır.
