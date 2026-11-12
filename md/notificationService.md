# notificationService Entegrasyon Planı

`notificationService.ts` kullanıcı bildirimlerini yönetir: liste (sayfalı), detay, okundu / tümünü okundu, okunmamış sayısı, sil / toplu sil, tercihler, açınca okundu (`openNotification`). `USE_MOCK_API = true` iken `data/notifications.json` + `localStorage` (`mockNotifications`); `false` olunca gerçek v1.

**Kapsam:** Web (`services/notification`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/notifications/...` altındadır. Path alias yoktur (`/api/notifications`, `https://api.acillazim.com/api/notifications` v1’siz kullanılmaz).

**BE routing notu:** Statik path’ler (`/unread-count`, `/mark-all-read`, `/bulk-delete`, `/preferences`) `{notificationId}` dinamik route’larından **önce** eşleşmelidir.

**İlgili sözleşmeler:**
*   Mesaj okunmamış sayısı → `messageService` (`/api/v1/conversations/unread-count`) — bu servisten ayrıdır
*   Bildirim `details.listing` / `conversation` / `appointment` → ilgili listing / message / appointment kaynakları

**Client-only yardımcı:** `filterByType`, `filterUnread`, `sortByDate` (API çağrısı yok).

---

## 1. API Yolları (Endpoints)

### A. Bildirim Listesi
*   **Yol (Endpoint):** `GET /api/v1/notifications`
*   **Açıklama:** Oturum kullanıcısının bildirimlerini sayfalı döner. Filtreleme BE’de.
*   **Query Parametreleri:**
    *   `page` (number, varsayılan `1`)
    *   `limit` (number, varsayılan `20`, max `50`) — veya `page_size`
    *   `type` (string, opsiyonel) — örn. `welcome`, `price-drop`, `message`, `appointment`
    *   `unread_only` (boolean) — FE bugün `unreadOnly`
*   **Not:** `userId` query’de gönderilmemeli; kullanıcı token’dan alınmalı. (FE mock hâlâ `userId` zorunlu tutuyor.)
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **Kullanan FE:** `NotifyDropdown`, `Navbar`, `NotificationsPage`, `Sidebar`, `NotificationDetail`, `DashboardNotificationDetailPage` → `getNotifications`

---

### B. Bildirim Detayı
*   **Yol (Endpoint):** `GET /api/v1/notifications/{notificationId}`
*   **Açıklama:** Tek bildirim (+ `details` payload).
*   **Kullanan FE:** `getNotificationById`, `openNotification`

---

### C. Okundu İşaretle
*   **Yol (Endpoint):** `PUT /api/v1/notifications/{notificationId}/read`
*   **Açıklama:** Bildirimi okundu yapar.
*   **Örnek yanıt data:** `{ "notificationId": 1, "read": true, "readAt": "2026-07-20T00:00:00.000Z" }`
*   **Kullanan FE:** `markAsRead`, `openNotification`

---

### D. Tümünü Okundu Yap
*   **Yol (Endpoint):** `PUT /api/v1/notifications/mark-all-read`
*   **Açıklama:** Kullanıcının tüm okunmamışlarını okundu yapar. Body’de `userId` gerekmez (token).
*   **Örnek yanıt data:** `{ "markedCount": 5 }`
*   **Kullanan FE:** `NotificationsPage`, `NotifyDropdown` → `markAllAsRead`

---

### E. Okunmamış Sayısı
*   **Yol (Endpoint):** `GET /api/v1/notifications/unread-count`
*   **Açıklama:** Badge için sayı.
*   **Örnek yanıt data:** `{ "count": 3 }`
*   **Kullanan FE:** `getUnreadCount` (Navbar şu an liste + `unreadOnly` ile sayıyor; bu endpoint tercih edilmeli)

---

### F. Bildirim Sil
*   **Yol (Endpoint):** `DELETE /api/v1/notifications/{notificationId}`
*   **Kullanan FE:** `deleteNotification`

---

### G. Toplu Sil
*   **Yol (Endpoint):** `DELETE /api/v1/notifications/bulk-delete`
*   **İstek Gövdesi (Body):**
    ```json
    { "notification_ids": [1, 2, 3] }
    ```
    FE bugün `notificationIds` + `userId` gönderiyor; `userId` token’dan, body snake_case önerilir.
*   **Örnek yanıt data:** `{ "deletedCount": 3 }`
*   **Kullanan FE:** `bulkDelete`

---

### H. Tercihleri Getir
*   **Yol (Endpoint):** `GET /api/v1/notifications/preferences`
*   **Açıklama:** Kullanıcı bildirim tercihleri (email/push/tip bazlı).
*   **Kullanan FE:** `getPreferences`

---

### I. Tercihleri Güncelle
*   **Yol (Endpoint):** `PUT /api/v1/notifications/preferences`
*   **İstek Gövdesi (Body):**
    ```json
    { "preferences": { /* tip / kanal ayarları */ } }
    ```
*   **Kullanan FE:** `updatePreferences`

---

### J. Bildirimi Aç (FE orchestration)
*   **Endpoint yok.** `openNotification` = `getNotificationById` + gerekirse `markAsRead`. Client-only.

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

### NotificationItem
```typescript
interface NotificationItem {
  id: number;
  userId: number;           // BE user_id dönebilir — FE map
  type: string;
  title?: string;
  message?: string;
  read: boolean;
  readAt?: string;          // ISO
  createdAt: string;        // ISO
  link?: string;
  actionText?: string;
  actionLink?: string;
  details?: {
    listing?: { id?: number | string; title?: string; /* ... */ };
    conversation?: { id?: number | string };
    appointment?: { id?: number | string };
    [key: string]: unknown;
  };
}
```

### PaginatedResult (FE beklediği şekil)
```json
{
  "notifications": [ /* NotificationItem[] */ ],
  "pagination": {
    "total": 40,
    "page": 1,
    "pageSize": 20,
    "totalPages": 2,
    "unreadCount": 5
  }
}
```
API `{ success, data: { notifications, pagination } }` dönerse FE unwrap etmeli.

### Preferences
```typescript
type NotificationPreferences = Record<string, unknown>;
// Mock: notifications.json → preferences objesi
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` → `/api/v1/notifications/...`. Eski `https://api.acillazim.com/api` kaldırıldı.
2.  **Auth token key:** `localStorage.token` → `auth_token` (diğer servislerle aynı).
3.  **Mock kaldırma:** `USE_MOCK_API = false`; `mockNotifications` localStorage kaldırılacak.
4.  **userId:** Query/body’den kalkmalı; Bearer token. Mock validasyonu geçici kalabilir.
5.  **Query:** `unreadOnly` → `unread_only`; bulk body `notification_ids`.
6.  **Badge:** Navbar `getUnreadCount` kullanmalı (şu an `getNotifications({ unreadOnly: true })`).
7.  **Ortak client (opsiyonel):** `@/api/client`.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getNotifications` | `NotifyDropdown`, `Navbar`, `NotificationsPage`, `Sidebar`, detay sayfaları |
| `markAsRead` / `markAllAsRead` | `NotificationsPage`, `NotifyDropdown`, `NotificationDetail` |
| `getUnreadCount` | Tanımlı; Navbar henüz tam kullanmıyor |
| `deleteNotification` / `bulkDelete` | Dashboard bildirim UI (opsiyonel) |
| `getPreferences` / `updatePreferences` | Tercih ayarları (bağlıysa) |
| `openNotification` | Detay açılışı |

---

## 5. Notlar

*   Mock: `data/notifications.json`; persistence key `mockNotifications`.
*   Mesaj badge’i (`messageService.getUnreadCount`) bildirim badge’inden ayrıdır.
*   Push/WebSocket bu planda yok; polling FE’de kalabilir.
*   Mobil bildirim servisleri bu planın kapsamı dışındadır.
