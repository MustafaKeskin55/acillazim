# messageService Entegrasyon Planı

`messageService.ts` mesajlaşma akışını yönetir: konuşma listesi, mesaj gönder/oku, okundu, sil, rapor, okunmamış sayısı, kullanıcıyla konuşma bul/oluştur. Şu an in-memory mock (`data/messageData` + `üründat` / `user_database2`); gerçek API’de mock kaldırılır.

**Kapsam:** Web (`services/message`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/conversations`, `/api/messages` v1’siz kullanılmaz).

**BE routing notu:** Statik path’ler (`/unread-count`, `/with/{userId}`) `{conversationId}` dinamik route’larından **önce** eşleşmelidir.

**İlgili sözleşmeler:**
*   İlan özeti → `listingsService`: `GET /api/v1/listings/{listingId}` (`getListingById`)
*   Kullanıcı özeti → `GET /api/v1/users/{userId}` (auth/profile ile hizalanmalı; bu serviste ayrı mock var)

---

## 1. API Yolları (Endpoints)

### A. Konuşma Listesi
*   **Yol (Endpoint):** `GET /api/v1/conversations`
*   **Açıklama:** Oturum açmış kullanıcının konuşmalarını döner.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **Kullanan FE:** `Messaging`, `DashboardMessages` → `getConversations`

---

### B. Konuşma Oluştur
*   **Yol (Endpoint):** `POST /api/v1/conversations`
*   **Açıklama:** Yeni konuşma başlatır; aynı kullanıcıyla mevcut konuşma varsa onu dönebilir (idempotent önerilir).
*   **İstek Gövdesi (Body):**
    ```json
    { "to_user_id": 42, "listing_id": 1001 }
    ```
    `listing_id` opsiyonel (`null` olabilir — profil mesajı).
*   **Kullanan FE:** `ListingPriceCard`, `MobileListingDetail`, `ProfileHeader` → `createConversation`

---

### C. Kullanıcıyla Konuşma Bul
*   **Yol (Endpoint):** `GET /api/v1/conversations/with/{userId}`
*   **Açıklama:** Mevcut kullanıcı ile `userId` arasındaki konuşmayı döner; yoksa `null` / `404`.
*   **Kullanan FE:** `getConversationWithUser` (mesaj göndermeden önce)

---

### D. Okunmamış Sayısı
*   **Yol (Endpoint):** `GET /api/v1/conversations/unread-count`
*   **Açıklama:** Okunmamış konuşma/mesaj sayısı.
*   **Örnek yanıt data:** `{ "count": 3 }` veya düz number — FE unwrap etmeli.
*   **Kullanan FE:** `Navbar`, `Dashboard Header` → `getUnreadCount`

---

### E. Konuşma Mesajları
*   **Yol (Endpoint):** `GET /api/v1/conversations/{conversationId}/messages`
*   **Açıklama:** Konuşmadaki mesajları (kronolojik) döner.
*   **Kullanan FE:** `Messaging`, `DashboardMessages` → `getMessagesByConversationId`

---

### F. Mesaj Gönder
*   **Yol (Endpoint):** `POST /api/v1/conversations/{conversationId}/messages`
*   **İstek Gövdesi (Body):**
    ```json
    { "content": "Merhaba, ilan hâlâ satılık mı?" }
    ```
*   **Kullanan FE:** `sendMessage`

---

### G. Konuşmayı Okundu İşaretle
*   **Yol (Endpoint):** `PUT /api/v1/conversations/{conversationId}/read`
*   **Açıklama:** Konuşmayı / mesajları okundu yapar.
*   **Kullanan FE:** `markConversationAsRead`

---

### H. Konuşmayı Sil
*   **Yol (Endpoint):** `DELETE /api/v1/conversations/{conversationId}`
*   **Açıklama:** Konuşmayı (ve mesajlarını) siler — soft-delete BE kararı.
*   **Kullanan FE:** `deleteConversation`

---

### I. Mesaj Detayı
*   **Yol (Endpoint):** `GET /api/v1/messages/{messageId}`
*   **Açıklama:** Tek mesaj. FE’de az kullanılıyor; rapor öncesi doğrulama için.
*   **Kullanan FE:** `getMessageById`

---

### J. Mesajı Raporla
*   **Yol (Endpoint):** `POST /api/v1/messages/{messageId}/report`
*   **İstek Gövdesi (Body):**
    ```json
    { "reason": "Uygunsuz içerik" }
    ```
*   **Kullanan FE:** `reportMessage`
*   **Bug:** `Messaging.tsx` şu an `reportMessage(conversation_id, ...)` çağırıyor — `message_id` olmalı.

---

### K. Kullanıcı Özeti (mesaj UI)
*   **Yol (Endpoint):** `GET /api/v1/users/{userId}`
*   **Açıklama:** Konuşma listesinde karşı taraf adı/avatar. Auth profil sözleşmesi ile aynı veya public özet.
*   **Kullanan FE:** `getUserById`
*   **Mock:** `data/user_database2.json`

---

### L. İlan Özeti (mesaj UI)
*   **Yol (Endpoint):** `GET /api/v1/listings/{listingId}`
*   **Açıklama:** Konuşmaya bağlı ilan kartı (başlık, fiyat, görsel). `listingsService` ile aynı.
*   **Kullanan FE:** `getListingById`
*   **Mock:** `data/üründat.json`

---

## 2. Veri Modelleri (Request & Response)

### Standart API Yanıt Yapısı
```json
{
  "success": true,
  "data": <Veri>,
  "message": "İşlem başarıyla gerçekleştirildi"
}
```

### Conversation
```typescript
interface Conversation {
  conversation_id: number | string;
  from_user_id: number | string;
  to_user_id: number | string;
  listing_id?: number | string | null;
  timestamp?: string;   // ISO — son aktivite
  isRead?: boolean;
}
```

### Message
```typescript
interface Message {
  message_id: number | string;
  conversation_id: number | string;
  sender_id: number | string;
  receiver_id?: number | string;
  content: string;
  timestamp: string;    // ISO
  status?: string;      // sent | delivered | read | ...
}
```

### UserInfo (mesaj UI özeti)
```typescript
interface UserInfo {
  id: number | string;
  name: string | null;
  avatar: string | null;
  phone?: string;
  email?: string;
}
```

### ListingInfo (mesaj UI özeti)
```typescript
interface ListingInfo {
  id: number | string;
  title: string | null;
  price: string | null;   // FE formatlı string de olabilir; BE number + currency tercih
  image: string | null;
  location?: string | null;
  category?: number | string;
}
```

### ReportResult
```json
{ "success": true, "message": "Rapor alındı" }
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` → `/api/v1/conversations/...`, `/api/v1/messages/...`. Eski `/api/conversations` yorumları güncellendi.
2.  **Mock kaldırma:** In-memory `conversations` / `messages` + `setTimeout` → gerçek `fetch` / `@/api/client` + Bearer token.
3.  **Auth:** `from_user_id` / `sender_id` body’den kalkmalı; token’dan alınmalı.
4.  **Rapor bug:** `Messaging` → `reportMessage(message_id, reason)`.
5.  **getUserById / getListingById:** Ayrı mock JSON yerine users + listings v1; veya konuşma yanıtına embed özet.
6.  **Ortak client (opsiyonel):** `@/api/client`.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getConversations` / `getMessagesByConversationId` / `sendMessage` / `markConversationAsRead` / `deleteConversation` / `reportMessage` | `Messaging`, `DashboardMessages` |
| `getUnreadCount` | `Navbar`, `Dashboard Header` |
| `getConversationWithUser` / `createConversation` | `ListingPriceCard`, `MobileListingDetail`, `ProfileHeader` |
| `getUserById` / `getListingById` | `Messaging` (liste zenginleştirme) |

---

## 5. Notlar

*   Mock: `data/messageData` (`conversationsData`, `messagesData`), `user_database2.json`, `üründat.json`.
*   Realtime (WebSocket/SSE) bu planda yok; polling FE’de kalabilir veya ayrı sözleşme.
*   Bildirim okunmamış sayısı (`notificationService.getUnreadCount`) mesaj sayısından ayrıdır.
*   Mobil mesaj servisleri bu planın kapsamı dışındadır.
