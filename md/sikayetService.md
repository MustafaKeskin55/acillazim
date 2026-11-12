# sikayetService (complaints) Entegrasyon Planı

`sikayetService.ts` şikayet kategorileri, oluşturma, liste, detay, güncelleme, mesajlaşma ve istatistik sağlar. UI şu an çoğunlukla `sikayet-kategorileri.json` doğrudan import eder; servis henüz az bağlı.

**Kapsam:** Web (`services/sikayet`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/sikayet/...`, `/api/sikayet/olustur` Türkçe path kullanılmaz).

**İlgili sözleşmeler:**
*   İlan detay şikayet → `productDetail` / `ComplaintModal` (listing target)
*   Kullanıcı şikayet → profil / `sikayet/kullanici`
*   Auth → `authService` (`auth_token`)

**BE routing notu:** `/categories`, `/priorities`, `/statuses`, `/mine`, `/stats` statik path’ler `{complaintId}` dinamik route’larından **önce** eşleşmelidir.

**Client-only / mock:** `data/sikayet-kategorileri.json` (ilan + kullanıcı kategorileri).

---

## 1. API Yolları (Endpoints)

### A. Şikayet Kategorileri
*   **Yol (Endpoint):** `GET /api/v1/complaints/categories`
*   **Açıklama:** Aktif kategori listesi (+ isteğe bağlı form alanları). FE `getKategoriler`.
*   **Query (opsiyonel):** `target_type=listing|user` (ilan vs kullanıcı şikayetleri)
*   **Örnek:** `GET /api/v1/complaints/categories?target_type=listing`
*   **İstek Başlıkları:** `Content-Type: application/json`
*   **Eski FE path:** `/api/sikayet/kategoriler` → kaldırıldı
*   **Mock:** `sikayet-kategorileri.json` (`ilanSikayetleri` / kullanıcı listeleri)

---

### B. Öncelik Seviyeleri
*   **Yol (Endpoint):** `GET /api/v1/complaints/priorities`
*   **Eski:** `/api/sikayet/oncelik-seviyeleri`
*   **Kullanan FE:** `getOncelikSeviyeleri`

---

### C. Durum Değerleri
*   **Yol (Endpoint):** `GET /api/v1/complaints/statuses`
*   **Eski:** `/api/sikayet/durum-degerleri`
*   **Kullanan FE:** `getDurumDegerleri`

---

### D. Şikayet Oluştur
*   **Yol (Endpoint):** `POST /api/v1/complaints`
*   **Açıklama:** Multipart (kanıt dosyaları) veya JSON. FE `createSikayet`.
*   **Body (FormData / JSON — İngilizce alanlar):**
    *   `reported_id` — şikayet edilen kullanıcı veya ilan id
    *   `target_type` — `listing` | `user`
    *   `category_id`
    *   `title`
    *   `description`
    *   `evidence` — file[] (opsiyonel)
    *   opsiyonel ekstra form alanları (kategoriye göre)
*   **İstek Başlıkları:**
    *   `Authorization: Bearer <token>` (**Zorunlu**)
    *   (multipart: Content-Type boundary otomatik)
*   **Eski:** `POST /api/sikayet/olustur` + Türkçe alan adları

---

### E. Benim Şikayetlerim
*   **Yol (Endpoint):** `GET /api/v1/complaints/mine`
*   **Query:** `page`, `page_size`, `status`
*   **Auth:** Zorunlu
*   **Eski:** `/api/sikayet/benim-sikayetlerim`
*   **Kullanan FE:** Dashboard `Complaints` (şimdilik local/mock)

---

### F. Şikayet Detay
*   **Yol (Endpoint):** `GET /api/v1/complaints/{complaintId}`
*   **Auth:** Zorunlu (sahip veya admin)
*   **Eski:** `GET /api/sikayet/{id}`

---

### G. Şikayet Güncelle (admin / durum)
*   **Yol (Endpoint):** `PUT /api/v1/complaints/{complaintId}`
*   **Body:** `{ "status"?, "priority"?, "notes"? }`
*   **Auth:** Admin veya yetkili
*   **Eski:** `PUT /api/sikayet/{id}` + `durum` / `oncelik` / `notlar`

---

### H. Mesaj Ekle
*   **Yol (Endpoint):** `POST /api/v1/complaints/{complaintId}/messages`
*   **Body:** `{ "content": "..." }`
*   **Eski:** `POST /api/sikayet/{id}/mesaj` + `{ icerik }`

---

### I. Okundu İşaretle
*   **Yol (Endpoint):** `PUT /api/v1/complaints/{complaintId}/read`
*   **Eski:** `PUT /api/sikayet/{id}/okundu`

---

### J. İstatistikler
*   **Yol (Endpoint):** `GET /api/v1/complaints/stats`
*   **Auth:** Zorunlu
*   **Eski:** `/api/sikayet/istatistikler`
*   **Örnek data:** `{ total, open, reviewing, pending, resolved, closed }`

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

### Complaint (FE `Sikayet` — alan map)
| FE (TR) | BE (EN) |
|---------|---------|
| `sikayetEdilenId` | `reported_id` |
| `sikayetEdenId` | `reporter_id` |
| `kategoriId` | `category_id` |
| `baslik` / `aciklama` | `title` / `description` |
| `durum` / `oncelik` | `status` / `priority` |
| `kanitDosyalari` | `evidence_urls` |
| `mesajlar` | `messages` |

FE tip isimleri TR kalabilir; wire format EN.

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Base path:** `API_BASE_URL` = `{host}/api/v1` → `/complaints/...`.
2.  **Türkçe path kaldır:** `/api/sikayet/*` → İngilizce `/api/v1/complaints/*`.
3.  **ComplaintModal / sayfalar:** JSON import → `sikayetService.getKategoriler`.
4.  **Dashboard Complaints:** Local liste → `getSikayetlerim`.
5.  **Payload:** FormData TR anahtarlar → EN (`reported_id`, …); normalize katmanı.
6.  **USE_MOCK:** Kategoriler JSON; create/list API hazır olana kadar kontrollü fallback.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `getKategoriler` (hedef) | `ComplaintModal`, `app/sikayet/...`, Dashboard |
| `createSikayet` | İlan/kullanıcı şikayet formları |
| `getSikayetlerim` / stats | `Page/Dashboard/Pages/Complaints` |
| `getSikayetById` / `addMessage` / `markAsRead` | Şikayet detay thread |

*Şu an UI çoğunlukla JSON; servis bağlanacak.*

---

## 5. Notlar

*   Mock: `data/sikayet-kategorileri.json`.
*   Auth token: `auth_token`.
*   Dosya upload boyutu/limit BE’de.
*   Mobil şikayet bu planın kapsamı dışındadır.
