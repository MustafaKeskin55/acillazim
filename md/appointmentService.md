# appointmentService Entegrasyon Planı

`appointmentService.ts` dosyası, randevu talebi, müsait saatler, sağlayıcı paneli listesi ve onay/red/erteleme/iptal işlemlerini yönetir. Bir kısım uçlar gerçek `fetch` ile tanımlı olsa da hata durumunda **fake başarılı yanıt** veya boş dizi döndürülmektedir. Gerçek backend entegrasyonu için endpoint, istek/yanıt sözleşmesi ve FE değişiklikleri aşağıdadır.

**Kapsam:** Web (`services/appointment`). Mobil servislere dokunulmayacak.

**API versiyonu:** Tüm yollar `/api/v1/appointments/...` altındadır. Path alias yoktur (`/api/appointments` kullanılmaz).

---

## 1. API Yolları (Endpoints)

### A. Randevu Talebi Oluştur
*   **Yol (Endpoint):** `POST /api/v1/appointments/request`
*   **Açıklama:** Müşteri hizmet ilanından randevu talebi gönderir.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "service_id": 123,
      "service_name": "Klima Bakımı",
      "appointment_type": "regular",
      "requested_date": "2026-07-20",
      "requested_time": "14:00",
      "notes": "Öğleden sonra uygun",
      "package_id": 5,
      "package_name": "Standart Paket",
      "price": 1500
    }
    ```
*   **Notlar:**
    *   `appointment_type`: `"regular"` | `"package"`
    *   `package_id`, `package_name`, `price` yalnızca paket seçiminde gönderilir.
*   **Kullanan FE:** `ServiceDetailPage` → `submitAppointmentRequest`

---

### B. Kullanıcı Randevuları
*   **Yol (Endpoint):** `GET /api/v1/appointments/user/{userId}`
*   **Açıklama:** Belirli kullanıcının randevu geçmişini listeler.
*   **Parametreler:** `userId` (path)
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
*   **Kullanan FE:** `getUserAppointments` (serviste tanımlı; panel history ayrı `appointmentHistoryApi` kullanabilir)

---

### C. Sağlayıcı Randevu Listesi
*   **Yol (Endpoint):** `GET /api/v1/appointments/provider`
*   **Açıklama:** Oturum açmış hizmet sağlayıcının randevularını getirir.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
*   **Env override (FE):** `NEXT_PUBLIC_APPOINTMENTS_PROVIDER_PATH` (varsayılan: `appointments/provider`)
*   **Kullanan FE:** `MyAppointments` → `getProviderAppointments`

---

### D. Onaylı Randevular (Tarih + Hizmet)
*   **Yol (Endpoint):** `POST /api/v1/appointments/confirmed`
*   **Açıklama:** Belirli hizmet ve tarihte onaylanmış (`confirmed`) randevuları döner; müsait saat hesabında kullanılır.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Opsiyonel / Zorunlu — BE kararı)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "service_id": 123,
      "date": "2026-07-20"
    }
    ```
---

### E. Müsait Saatler
*   **Yol (Endpoint):** `GET /api/v1/appointments/available-slots`
*   **Açıklama:** Hizmet + tarih için müsait saat dilimlerini döner. İdeal olarak dolu slotları BE hesaplar.
*   **Query Parametreleri:**
    *   `serviceId` (zorunlu)
    *   `date` (zorunlu, `YYYY-MM-DD`)
*   **Örnek:** `GET /api/v1/appointments/available-slots?serviceId=123&date=2026-07-20`
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **Kullanan FE:** `AppointmentModal` → `getAvailableTimeSlots`
*   **Mevcut FE davranışı:** Confirmed listesini çekip istemcide 09:00–20:30 / 30 dk dilimlerden çıkarır. BE bu endpoint’i sağlarsa istemci hesabı kaldırılır.

---

### F. Randevu Detayı
*   **Yol (Endpoint):** `GET /api/v1/appointments/{appointmentId}`
*   **Açıklama:** Tek randevu detayını getirir.
*   **Parametreler:** `appointmentId` (path)
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
*   **Kullanan FE:** `getAppointmentDetails`

---

### G. Durum Güncelle
*   **Yol (Endpoint):** `PATCH /api/v1/appointments/{appointmentId}/status`
*   **Açıklama:** Randevu durumunu günceller.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "status": "pending"
    }
    ```
*   **Olası `status` değerleri:** `pending` | `confirmed` | `rejected` | `completed` | `cancelled`
*   **Kullanan FE:** `EditAppointmentModal` → `updateAppointmentStatus` (ertekleme sonrası `pending`)

---

### H. Onayla
*   **Yol (Endpoint):** `PATCH /api/v1/appointments/{appointmentId}/approve`
*   **Açıklama:** Sağlayıcı randevuyu onaylar.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "approval_notes": "Randevu onaylandı",
      "final_price": 1500
    }
    ```
*   **Kullanan FE:** `RejectAppointmentModal` (action = approve) → `approveAppointment`

---

### I. Reddet
*   **Yol (Endpoint):** `PATCH /api/v1/appointments/{appointmentId}/reject`
*   **Açıklama:** Sağlayıcı randevuyu reddeder.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "rejection_reason": "Uygun değil",
      "rejection_notes": "O gün doluyuz"
    }
    ```
*   **Kullanan FE:** `RejectAppointmentModal` → `rejectAppointment`

---

### J. Tarih Değiştir (Reschedule)
*   **Yol (Endpoint):** `PATCH /api/v1/appointments/{appointmentId}/reschedule`
*   **Açıklama:** Onaylanmamış (veya BE kurallarına göre izin verilen) randevunun tarih/saatini değiştirir. Değişiklik sonrası durum genelde `pending` olur.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "new_date": "2026-07-22",
      "new_time": "16:30",
      "reschedule_reason": "Randevu tarihi değiştirildi",
      "reschedule_notes": ""
    }
    ```
*   **Kullanan FE:** `EditAppointmentModal` → `rescheduleAppointment`

---

### K. İptal Et
*   **Yol (Endpoint):** `PATCH /api/v1/appointments/{appointmentId}/cancel`
*   **Açıklama:** Randevuyu iptal eder.
*   **İstek Başlıkları (Headers):**
    *   `Authorization: Bearer <token>` (Zorunlu)
    *   `Content-Type: application/json`
*   **İstek Gövdesi (Body):**
    ```json
    {
      "cancellation_reason": "İptal edildi",
      "cancellation_notes": ""
    }
    ```
*   **Kullanan FE:** `cancelAppointment`

---

## 2. Veri Modelleri (Request & Response)

### Standart API Yanıt Yapısı (Response Wrapper)
Tüm isteklerin yanıtları aşağıdaki standart formatta olmalıdır:

```json
{
  "success": true,
  "data": <Veri Tipi veya Dizisi>,
  "message": "İşlem başarıyla gerçekleştirildi"
}
```

### Provider Randevu Modeli (Panel Listesi)
FE `normalizeProviderAppointment` ile hem camelCase hem snake_case kabul eder. BE tercihen şu alanları dönmelidir:

```typescript
interface ProviderAppointment {
  id: number | string;
  title: string;
  date: string;                 // YYYY-MM-DD (veya appointment_date / scheduled_date)
  time: string;                 // HH:mm (veya appointment_time / scheduled_time)
  location: string;             // veya address
  price: number | string;       // veya final_price
  status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled";
  category?: string;
  notes?: string;
  client: {                     // veya customer
    name: string;               // veya full_name
    phone: string;              // veya phone_number
    email: string;
  };
  service: {
    title: string;              // veya name / service_title
    image?: string;             // veya service_image
    description?: string;       // veya service_description
  };
}
```

### Müsait Saat Yanıtı
```json
{
  "success": true,
  "data": ["09:00", "09:30", "10:00", "14:00"],
  "message": "Müsait saatler yüklendi"
}
```

### Onaylı Randevu Özeti (slot hesabı için)
```json
{
  "success": true,
  "data": [
    { "id": 1, "time": "14:00", "status": "confirmed" }
  ],
  "message": "Onaylı randevular"
}
```

### Randevu Talebi Başarı Yanıtı
```json
{
  "success": true,
  "data": {
    "id": 987,
    "status": "pending"
  },
  "message": "Randevu talebiniz başarıyla gönderildi"
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

Gerçek API entegrasyonu tamamlandığında `appointmentService.ts` içinde şu adımlar yapılacaktır:

1.  **Fake başarı yanıtlarının kaldırılması:** `submitAppointmentRequest`, `approveAppointment`, `rejectAppointment`, `rescheduleAppointment`, `cancelAppointment` catch bloklarında `success: true` dönülmeyecek; gerçek hata UI’a yansıtılacak.
2.  **Ortak API client:** Ham `fetch` yerine projedeki `api/client.ts` (axios) kullanılacak; token interceptor’dan gelecek.
3.  **Base URL:** `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_BASE_URL` tek kaynağa bağlanacak (`@/api/config`).
4.  **Müsait saatler:** BE `available-slots` sağlarsa istemci tarafı `generateAllTimeSlots` + confirmed çıkarımı kaldırılacak (veya BE yoksa fallback olarak kalacak).
5.  **Response unwrap:** `{ success, data, message }` sarmalayıcısından `data` okunacak; dizi yanıtlar hem düz array hem `data` array desteklenmeye devam edebilir (`getProviderAppointments` zaten her iki formatı normalize ediyor).
6.  **`getAppointmentDetails` fake fallback:** Hata durumunda sahte pending obje dönülmeyecek; hata fırlatılacak veya `null` dönecek.

---

## 4. FE Kullanım Haritası

| Fonksiyon | Sayfa / Bileşen |
|-----------|-----------------|
| `submitAppointmentRequest` | `ServiceDetailPage` |
| `getAvailableTimeSlots` | `AppointmentModal` |
| `getProviderAppointments` | `MyAppointments` |
| `approveAppointment` / `rejectAppointment` | `RejectAppointmentModal` |
| `rescheduleAppointment` / `updateAppointmentStatus` | `EditAppointmentModal` |
| `getUserAppointments` / `getConfirmedAppointments` / `getAppointmentDetails` / `cancelAppointment` | Serviste hazır; UI bağları kısmi |

---

## 5. Notlar

*   `api/appointmentHistoryApi.ts` ve `data/appointmentData` bu dosyanın dışında; history/stats ayrı sözleşmedir.
*   Mobil randevu servisleri bu planın kapsamı dışındadır.
