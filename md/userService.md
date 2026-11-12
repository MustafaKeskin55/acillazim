# userService (kök — maskeleme) Entegrasyon Planı

Kök `services/userService.ts` gizlilik yardımcılarıdır: ad / telefon / email maskeleme + stub `getUserBasicInfo`.

**Kapsam:** Web (`services/userService.ts`). Mobil servislere dokunulmayacak.

**API versiyonu:** Bu dosyada **çoğu fonksiyon için BE endpoint yok**. `/api/user`, `/api/mask` tanımlanmaz.  
Tek opsiyonel bağımlılık:

*   `getUserBasicInfo` → `GET /api/v1/users/{userId}` (`usersService` / `profileService` ile aynı)

**İlgili sözleşmeler:**
*   Kullanıcı özeti / me → `md/usersService.md` (`services/users/userService.ts`)
*   Profil → `profileService` (kendi `maskPhoneNumber` / `maskEmail` kopyası var — **birleştirilmeli**)
*   Path alias yok: `/kullanicilar/{id}` kullanılmaz

**Client-only:** `maskUserName`, `maskPhoneNumber`, `maskEmail` (saf string dönüşümü).

---

## 1. API Yolları (Endpoints)

### A. Mevcut — endpoint yok (maskeleme)
| FE fonksiyon | Davranış |
|--------------|----------|
| `maskUserName` | `Ali Veli` → `A** V***` |
| `maskPhoneNumber` | rakam temizle → kısmi maske |
| `maskEmail` | local-part maske |

---

### B. Temel kullanıcı özeti
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}`
*   **Açıklama:** `displayName` / `isVerified` (ve avatar vb.). FE `getUserBasicInfo` stub’ı bunu kullanmalı.
*   **Örnek:** `GET /api/v1/users/42`
*   **İstek Başlıkları:**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Mock:** `{ id, displayName: "Kullanıcı {id}", isVerified: false }`
*   **Tercih:** `services/users/userService.getUserById` / `*Async` — tek kaynak

---

## 2. Veri Modelleri

```typescript
interface UserBasicInfo {
  id: number | string;
  displayName: string;
  isVerified: boolean;
}
```

BE map: `display_name` | `ad_soyad` → `displayName`; `is_verified` → `isVerified`.

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Maskeleme:** API eklenmez; profildeki duplicate mask fonksiyonları buraya veya paylaşılan `utils/mask`’e taşınır.
2.  **getUserBasicInfo:** Sync stub → `users` servisi `getUserByIdAsync` veya `GET /api/v1/users/{id}`.
3.  **İsim çakışması:** Kök `userService` vs `users/userService` — kökü `userMaskService` veya `users/` altına taşı.
4.  **Alias yok:** Ayrı mask/user path açılmaz.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `maskUserName` | `ServiceDetailReviews`, `ServiceReviewResponse` |
| `maskPhoneNumber` / `maskEmail` / `getUserBasicInfo` | Export var; profil kendi kopyasını kullanıyor |

---

## 5. Notlar

*   `usersService.md` = `services/users` HTTP; bu plan = kök mask + stub.
*   Mobil bu planın kapsamı dışındadır.
