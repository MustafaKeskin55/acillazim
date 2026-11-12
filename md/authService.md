# authService Entegrasyon Planı

`authService.ts` dosyası, web uygulamasının merkezi oturum yönetimini sağlar: e-posta/şifre girişi, Google girişi, token yenileme, çıkış, şifre değiştirme ve e-posta güncelleme. Varsayılan `API_MODE=mock` iken simüle yanıtlar kullanılır; `real*` metodları gerçek path’lere bağlanmaya hazırdır.

**Kapsam:** Web (`services/auth`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/auth/...` altındadır. Path alias yoktur (`/api/auth/...` kullanılmaz).

---

## 1. API Yolları (Endpoints)

### A. E-posta / Şifre ile Giriş
*   **Yol (Endpoint):** `POST /api/v1/auth/login`
*   **Açıklama:** Kullanıcı adı (e-posta) ve şifre ile oturum açar.
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "username": "demo@acillazim.com",
      "password": "Acillazim.com1",
      "recaptchaToken": "recaptcha-token-string"
    }
    ```
*   **Notlar:**
    *   `recaptchaToken` gerçek API modunda zorunlu (FE `realLogin` kontrol eder).
*   **Kullanan FE:** `Login` → `authService.login`

---

### B. Google ile Giriş
*   **Yol (Endpoint):** `POST /api/v1/auth/google`
*   **Açıklama:** Google credential ile oturum açar / hesap bağlar.
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "credential": "google-id-token",
      "userData": {
        "email": "user@gmail.com",
        "firstName": "Ahmet",
        "lastName": "Yılmaz",
        "picture": "https://..."
      }
    }
    ```
*   **Kullanan FE:** `authService.loginWithGoogle`

---

### C. Token Yenileme
*   **Yol (Endpoint):** `POST /api/v1/auth/refresh`
*   **Açıklama:** Refresh token ile access token yeniler. 401 sonrası `apiRequest` otomatik dener.
*   **İstek Başlıkları (Headers):**
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "refreshToken": "refresh-token-string"
    }
    ```
*   **Kullanan FE:** `authService.refreshToken`

---

### D. Çıkış
*   **Yol (Endpoint):** `POST /api/v1/auth/logout`
*   **Açıklama:** Sunucu tarafı oturumu sonlandırır (token invalidate).
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu — cookie modunda cookie yeterli olabilir)
    *   `X-CSRF-Token: <csrf>` (varsa)
*   **İstek Gövdesi (Body):** Boş
*   **Kullanan FE:** `authService.logout` (yalnızca `API_MODE !== 'mock'`)

---

### E. Mevcut Şifre Doğrula
*   **Yol (Endpoint):** `POST /api/v1/auth/password/verify`
*   **Açıklama:** Şifre değiştirme akışının ilk adımı; mevcut şifreyi doğrular.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "password": "mevcut-sifre"
    }
    ```
*   **Kullanan FE:** `PasswordAndSecurity` → `verifyCurrentPassword`

---

### F. Şifre Değiştirme Doğrulama Kodu Gönder
*   **Yol (Endpoint):** `POST /api/v1/auth/password/send-code`
*   **Açıklama:** Kayıtlı e-postaya 6 haneli doğrulama kodu gönderir.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "email": "ahmet@gmail.com"
    }
    ```
*   **Kullanan FE:** `sendVerificationCode`

---

### G. Şifre Değiştirme Kodunu Doğrula
*   **Yol (Endpoint):** `POST /api/v1/auth/password/verify-code`
*   **Açıklama:** Gönderilen 6 haneli kodu doğrular.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "code": "123456",
      "token": "verification-session-token"
    }
    ```
*   **Kullanan FE:** `verifyCode`

---

### H. Şifre Değiştir
*   **Yol (Endpoint):** `POST /api/v1/auth/password/change`
*   **Açıklama:** Doğrulama sonrası yeni şifreyi kaydeder.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "currentPassword": "eski-sifre",
      "newPassword": "yeni-sifre",
      "token": "verification-session-token"
    }
    ```
*   **Kullanan FE:** `changePassword`

---

### I. Mevcut E-postayı Doğrula
*   **Yol (Endpoint):** `POST /api/v1/auth/email/verify-current`
*   **Açıklama:** E-posta güncelleme akışında mevcut e-postayı doğrular.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "email": "ahmet@gmail.com"
    }
    ```
*   **Kullanan FE:** `verifyExistingEmail`

---

### J. Yeni E-postaya Doğrulama Kodu Gönder
*   **Yol (Endpoint):** `POST /api/v1/auth/email/send-code`
*   **Açıklama:** Yeni e-posta adresine doğrulama kodu gönderir.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "newEmail": "yeni@gmail.com"
    }
    ```
*   **Kullanan FE:** `sendEmailVerificationCode`

---

### K. E-posta Doğrulama Kodunu Kontrol Et
*   **Yol (Endpoint):** `POST /api/v1/auth/email/verify-code`
*   **Açıklama:** Yeni e-postaya giden kodu doğrular.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "code": "123456",
      "token": "verification-session-token"
    }
    ```
*   **Kullanan FE:** `verifyEmailCode`

---

### L. E-postayı Güncelle
*   **Yol (Endpoint):** `POST /api/v1/auth/email/update`
*   **Açıklama:** Doğrulama sonrası e-posta adresini günceller.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "newEmail": "yeni@gmail.com",
      "token": "verification-session-token"
    }
    ```
*   **Kullanan FE:** `updateEmail`

---

## 2. Veri Modelleri (Request & Response)

### Standart API Yanıt Yapısı (Response Wrapper)
```json
{
  "success": true,
  "data": <Veri Tipi>,
  "message": "İşlem başarıyla gerçekleştirildi"
}
```

Giriş / Google / refresh için FE şu an düz `{ user, token, refreshToken }` bekliyor. BE wrapper kullanıyorsa FE `data` unwrap edecek şekilde güncellenmelidir; önerilen tutarlı format:

```json
{
  "success": true,
  "data": {
    "user": { "...": "..." },
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  },
  "message": "Giriş başarılı"
}
```

### Kullanıcı Modeli (`UserData`)
```typescript
interface UserData {
  id?: string;
  email?: string;
  username?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  googleCredential?: string;
  roles?: string[]; // örn: ["USER"]
}
```

### Auth Sonuç Modeli (şifre / e-posta yardımcıları)
```typescript
interface AuthResult {
  success: boolean;
  token?: string;   // doğrulama oturum token'ı (kod gönderiminde)
  message?: string;
}
```

### Login Başarı Yanıtı
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "email": "demo@acillazim.com",
      "username": "demo@acillazim.com",
      "roles": ["USER"]
    },
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  },
  "message": "Giriş başarılı"
}
```

### Refresh Başarı Yanıtı
```json
{
  "success": true,
  "data": {
    "token": "new-jwt-access-token",
    "refreshToken": "new-or-same-refresh-token",
    "user": { "id": "1", "email": "demo@acillazim.com", "roles": ["USER"] }
  },
  "message": "Token yenilendi"
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `CONFIG.API_URL` → `/api/v1` (tamamlandı). Endpoint’ler `/auth/...` kalır; tam yol `/api/v1/auth/...`.
2.  **Mock kaldırma:** `API_MODE=mock` dalı, `mockLogin` / `mockGoogleLogin` / `mockUser` ve `MOCK_API_DELAY` production’da kapatılacak.
3.  **Şifre / e-posta yardımcıları:** `verifyCurrentPassword`, `sendVerificationCode`, `verifyCode`, `changePassword`, `verifyExistingEmail`, `sendEmailVerificationCode`, `verifyEmailCode`, `updateEmail` mock delay yerine `apiRequest` / `client` ile v1 endpoint’lere bağlanacak.
4.  **Response unwrap:** BE `{ success, data, message }` dönerse `realLogin` / `realGoogleLogin` / `refreshToken` `data` alanını okuyacak.
5.  **CSRF:** Yanıt header `X-CSRF-Token` FE’de saklanıyor; BE bu header’ı (veya cookie) sağlamalı.
6.  **Ortak client (opsiyonel):** Ham `fetch` yerine `@/api/client` kullanılabilir; 401 → refresh akışı korunmalı.

---

## 4. FE Kullanım Haritası

| Fonksiyon / Metod | Sayfa / Bileşen |
|-------------------|-----------------|
| `login` | `Login` |
| `loginWithGoogle` | Google giriş bileşenleri |
| `logout` / `checkAuth` / `getCurrentUser` / `getToken` | `AuthContext`, `ProtectedRoute`, `AuthOnlyRoute`, `UserDropdown`, `AuthStatus` |
| `verifyCurrentPassword` / `sendVerificationCode` / `verifyCode` / `changePassword` | `PasswordAndSecurity` |
| `verifyExistingEmail` / `sendEmailVerificationCode` / `verifyEmailCode` / `updateEmail` | `PasswordAndSecurity` |
| `isUserLoggedIn` / `getToken` | `messageService`, `Messaging`, `DashboardMessages`, `ReviewList`, `Individual` |

---

## 5. Notlar

*   Storage anahtarları: `auth_token`, `user_data`, `user_profile`, `refresh_token`, `csrf_token`.
*   Production’da secure cookie (`USE_SECURE_COOKIES`) BE HttpOnly cookie ile uyumlu olmalı.
*   Mobil auth servisleri bu planın kapsamı dışındadır.
