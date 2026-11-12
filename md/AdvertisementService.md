# AdvertisementService Entegrasyon Planı

`AdvertisementService.ts` dosyası, uygulamanın reklam yönetimi için kullanılan temel servis sınıflarından biridir. Şu anda geçici/simüle edilmiş (`fakeFetch`) veriler kullanmaktadır. Gerçek backend entegrasyonu için bu dosya üzerinde yapılacak değişiklikler ve backend tarafındaki gereksinimler aşağıda listelenmiştir.

**API versiyonu:** Tüm yollar `/api/v1/...` altındadır. Path alias yoktur (`/api/advertisements` kullanılmaz).

---

## 1. API Yolları (Endpoints)

Backend tarafında bu servis için aşağıdaki endpoints'lerin tanımlanması veya mevcut olanların bu yapılara göre güncellenmesi gerekmektedir:

### A. Tüm Reklamları Getir
*   **Yol (Endpoint):** `GET /api/v1/advertisements`
*   **Açıklama:** Sistemdeki tüm reklamları listeler.
*   **İstek Başlıkları (Headers):** 
    *   `Authorization: Bearer <token>` (Opsiyonel)

### B. Aktif Reklamları Getir
*   **Yol (Endpoint):** `GET /api/v1/advertisements/active`
*   **Açıklama:** Sadece aktif olan (başlangıç/bitiş tarihleri uygun ve `isActive: true` olan) reklamları getirir.
*   **İstek Başlıkları (Headers):** 
    *   `Authorization: Bearer <token>` (Opsiyonel)

### C. Kategoriye Göre Reklamları Getir
*   **Yol (Endpoint):** `GET /api/v1/advertisements/category/{categoryId}`
*   **Açıklama:** Belirli bir kategori ID'sine ait reklamları getirir.
*   **Parametreler:** `categoryId` (Kategori ID)
*   **İstek Başlıkları (Headers):** 
    *   `Authorization: Bearer <token>` (Opsiyonel)

### D. Reklam Bölgesine (Zone) Göre Getir
*   **Yol (Endpoint):** `GET /api/v1/advertisements/zone/{zone}`
*   **Açıklama:** Reklamın gösterileceği bölgeye (örneğin: `banner`, `sidebar`, `header`, `footer`) göre filtreler.
*   **Parametreler:** `zone` (Bölge Kodu)
*   **İstek Başlıkları (Headers):** 
    *   `Authorization: Bearer <token>` (Opsiyonel)

### E. ID'ye Göre Tek Reklam Getir
*   **Yol (Endpoint):** `GET /api/v1/advertisements/{adId}`
*   **Açıklama:** Belirli bir reklamın detaylarını getirir.
*   **Parametreler:** `adId` (Reklam ID)
*   **İstek Başlıkları (Headers):** 
    *   `Authorization: Bearer <token>` (Opsiyonel)

### F. Reklam Tıklama Takibi (Click Track)
*   **Yol (Endpoint):** `POST /api/v1/advertisements/{adId}/click`
*   **Açıklama:** Reklama tıklandığında istatistik kaydetmek için çağrılır.
*   **Parametreler:** `adId` (Reklam ID)
*   **İstek Başlıkları (Headers):** 
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **İstek Gövdesi (Body):** Boş

### G. Reklam Görüntülenme Takibi (View Track)
*   **Yol (Endpoint):** `POST /api/v1/advertisements/{adId}/view`
*   **Açıklama:** Reklam ekranda görüntülendiğinde istatistik kaydetmek için çağrılır.
*   **Parametreler:** `adId` (Reklam ID)
*   **İstek Başlıkları (Headers):** 
    *   `Authorization: Bearer <token>` (Opsiyonel)
*   **İstek Gövdesi (Body):** Boş

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

### Reklam Verisi Modeli (Advertisement Data Model)
Backend'den dönen reklam objesi aşağıdaki alanlara sahip olmalıdır:

```typescript
interface Advertisement {
  id: number;                  // Reklam benzersiz kimliği
  title: string;               // Reklam başlığı
  description: string;         // Reklam açıklaması
  mediaType: "image" | "video";// Medya türü
  src: string;                 // Medya URL'i (resim veya video linki)
  poster?: string;             // Video ise önizleme resmi (opsiyonel)
  link: string;                // Tıklandığında yönlendirilecek adres
  pageId: number;              // Sayfa ID (1: Kategori, 2: Anasayfa, 3: Detay, 4: Tüm Sayfalar)
  sectionId: number;           // Bölge ID (1: Üst Banner, 2: Sidebar, 3: İçerik, 4: Tüm Bölümler)
  categoryId: number | null;   // İlişkili Kategori ID
  categoryName: string | null; // Kategori Adı
  listingType: string | null;  // İlan Tipi (Satılık, Kiralık vb.)
  regions: string[];           // Gösterileceği bölgeler (örn: ["Istanbul"] veya ["all"])
  requiresLogin: boolean;      // Giriş yapma zorunluluğu var mı?
  startDate: string;           // Yayın başlangıç tarihi (YYYY-MM-DD)
  endDate: string;             // Yayın bitiş tarihi (YYYY-MM-DD)
  isActive: boolean;           // Reklam yayında mı?
}
```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

Gerçek API entegrasyonu tamamlandığında, `AdvertisementService.ts` dosyasında şu adımlar gerçekleştirilecektir:

1.  **Axios Entegrasyonu:** `apiRequest` fonksiyonunda simüle edilmiş `fakeFetch` kapatılacak ve Axios çağrısı aktif hale getirilecektir:
    ```typescript
    // Eski satır kapatılacak:
    // const response = (await fakeFetch(endpoint, options)) as FakeResponse;
    
    // Yeni satır (API_URL = '/api/v1'):
    const response = await axios({ method, url: `${API_URL}${endpoint}`, data, headers });
    // Örnek: GET /api/v1/advertisements/active
    ```
2.  **Dosyadaki `fakeFetch` ve `FAKE_DELAY` Tanımlarının Kaldırılması:** Simülasyon kodları dosyadan tamamen temizlenecektir.
