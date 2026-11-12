# favoriteService Entegrasyon Planı

`favoriteService.ts` dosyası, favori listeleri ve ilan favori işlemlerini yönetir. Şu an `simulateApiRequest` + `localStorage` ile çalışır; gerçek API’de simülasyon ve localStorage kalıcı depolama kaldırılır.

**Kapsam:** Web (`services/favorites`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/favorites/...` altındadır. Path alias yoktur (`/v1/favorites`, `/api/favorites` kullanılmaz).

**BE routing notu:** Statik path’ler (`/add`, `/remove/...`, `/status/...`, `/user`, `/user/listings`) `{listId}` dinamik route’larından **önce** eşleşmelidir.

---

## 1. API Yolları (Endpoints)

### A. Favori Listesi Oluştur
*   **Yol (Endpoint):** `POST /api/v1/favorites`
*   **Açıklama:** Yeni favori listesi oluşturur.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    { "name": "Yazlık İlanlar" }
    ```
*   **Kullanan FE:** `createList`

---

### B. Favori Listesini Güncelle
*   **Yol (Endpoint):** `PUT /api/v1/favorites/{listId}`
*   **Açıklama:** Liste adını günceller.
*   **İstek Gövdesi (Body):**
    ```json
    { "name": "Yeni Liste Adı" }
    ```
*   **Kullanan FE:** `updateList`

---

### C. Favori Listesini Sil
*   **Yol (Endpoint):** `DELETE /api/v1/favorites/{listId}`
*   **Açıklama:** Listeyi ve içindeki item’ları siler. Varsayılan (`isDefault`) liste silinemez.
*   **Kullanan FE:** `deleteList`

---

### D. Favori Listesi Detayı
*   **Yol (Endpoint):** `GET /api/v1/favorites/{listId}`
*   **Açıklama:** Liste meta + item’ları döner.
*   **Kullanan FE:** `getListDetails`

---

### E. Liste Paylaş
*   **Yol (Endpoint):** `POST /api/v1/favorites/{listId}/share`
*   **Açıklama:** Paylaşılabilir link üretir.
*   **Örnek yanıt data:** `{ "shareUrl": "https://acillazim.com/favorites/{listId}" }`
*   **Kullanan FE:** `shareList`

---

### F. Kullanıcının Tüm Listeleri
*   **Yol (Endpoint):** `GET /api/v1/favorites/user`
*   **Açıklama:** Oturum açmış kullanıcının favori listelerini döner. Yoksa BE varsayılan liste oluşturabilir.
*   **Kullanan FE:** `getUserLists`, `FavoritesList`, `DashboardFavorite`, `FavoriteListSelectModal`

---

### G. Kullanıcının Tüm Favori İlanları
*   **Yol (Endpoint):** `GET /api/v1/favorites/user/listings`
*   **Açıklama:** Tüm listelerdeki benzersiz favori ilanları döner.
*   **Kullanan FE:** `getUserFavoriteListings`

---

### H. İlanı Favorilere Ekle
*   **Yol (Endpoint):** `POST /api/v1/favorites/add`
*   **Açıklama:** İlanı default veya belirtilen listeye ekler. `user_id` token’dan alınmalı (body’de zorunlu değil).
*   **İstek Gövdesi (Body):**
    ```json
    {
      "listing_id": 12345,
      "list_id": "list_xxx"
    }
    ```
*   **Kullanan FE:** `ProductCard`, `VitrinListings`, `useProductDetailController` → `addToFavorites`

---

### I. İlanı Tüm Listelerden Çıkar
*   **Yol (Endpoint):** `DELETE /api/v1/favorites/remove/{listingId}`
*   **Açıklama:** İlanı kullanıcının tüm favori listelerinden kaldırır.
*   **Kullanan FE:** `removeFromFavorites`

---

### J. Favori Durumu
*   **Yol (Endpoint):** `GET /api/v1/favorites/status/{listingId}`
*   **Açıklama:** İlanın favoride olup olmadığını döner.
*   **Örnek yanıt data:** `{ "isFavorite": true, "listingId": 12345 }`
*   **Kullanan FE:** `checkFavoriteStatus`

---

### K. Listeye İlan Ekle
*   **Yol (Endpoint):** `POST /api/v1/favorites/{listId}/items`
*   **Açıklama:** Belirli listeye ilan ekler.
*   **İstek Gövdesi (Body):**
    ```json
    { "listing_id": 12345 }
    ```
*   **Kullanan FE:** `addToList`

---

### L. Listeden İlan Çıkar
*   **Yol (Endpoint):** `DELETE /api/v1/favorites/{listId}/items/{listingId}`
*   **Açıklama:** Belirli listeden ilanı çıkarır.
*   **Kullanan FE:** `removeFromList`

---

### M. Liste Item’larını Getir
*   **Yol (Endpoint):** `GET /api/v1/favorites/{listId}/items`
*   **Açıklama:** Listenin favori item’larını (ilan özetleriyle) döner.
*   **Kullanan FE:** `getListItems`

---

## 2. Veri Modelleri (Request & Response)

### Standart API Yanıt Yapısı
```json
{
  "success": true,
  "message": "İşlem başarıyla gerçekleştirildi",
  "data": <Veri veya null>
}
```

### FavoriteList
```typescript
interface FavoriteList {
  id: string;
  name: string;
  itemCount: number;
  isDefault: boolean;
  createdAt: string;       // ISO
  updatedAt?: string;
  userId: string;
}
```

### FavoriteItem
```typescript
interface FavoriteItem {
  id: string;
  listingId: string | number;
  listId: string;
  addedAt: string;         // ISO
  userId: string;
  listingData: Record<string, unknown>; // BE ilan özeti (title, price, image, ...)
}
```

### Liste detay yanıtı
```json
{
  "success": true,
  "message": "Liste detayları getirildi",
  "data": {
    "id": "list_xxx",
    "name": "Favori İlanlarım",
    "itemCount": 2,
    "isDefault": true,
    "createdAt": "2026-07-18T00:00:00.000Z",
    "userId": "user_1",
    "items": [ /* FavoriteItem[] */ ]
  }
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` (tam yol: `/api/v1/favorites/...`). Eski `https://api.acillazim.com/v1` (api’siz) kaldırıldı.
2.  **Simülasyon kaldırma:** `simulateApiRequest` + localStorage kalıcı depo → gerçek `fetch` / `@/api/client`.
3.  **Auth:** `user_id` body’den kalkmalı; `Authorization: Bearer <token>` kullanılmalı. Sahte `API_TOKEN` kaldırılacak.
4.  **listingData:** Favori eklerken FE tam ilan objesi göndermemeli; liste/görüntüleme yanıtında BE ilan özeti dönmeli.
5.  **Varsayılan liste:** `ensureDefaultList` BE tarafında (ilk `GET /favorites/user` ile) sağlanmalı.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `addToFavorites` / `removeFromFavorites` / `checkFavoriteStatus` | `ProductCard`, `VitrinListings`, `useProductDetailController` |
| `getUserLists` / `createList` / `updateList` / `deleteList` | `FavoritesList`, `DashboardFavorite`, `FavoriteListSelectModal` |
| `addToList` / `getListItems` / `getListDetails` | Liste seçimi / içerik |
| `shareList` / `getUserFavoriteListings` | Paylaşım / toplu favoriler |

---

## 5. Notlar

*   Mock storage keys: `acillazim_favorite_lists`, `acillazim_favorite_items`, `acillazim_user_id`.
*   `ürapi.ts` içindeki ürün favorileri ayrı/eski yoldur; bu servisin sözleşmesi değildir.
*   Mobil favori servisleri bu planın kapsamı dışındadır.
