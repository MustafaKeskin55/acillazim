# adBannerService Entegrasyon Planı

`adBannerService.ts` dosyası, reklam banner'larını çekmek, bunları sayfa/bölüm/kategori bazında filtrelemek ve istemci tarafında basit bir önbellek (LRU Cache) mekanizmasıyla yönetmek için tasarlanmıştır.

**API versiyonu:** Yalnızca `GET /api/v1/banners`. Path alias yoktur (`/api/advertisements/filter` kullanılmaz).

---

## 1. Servis Tarafından Sağlanan Fonksiyonlar

Bu servis, uygulamanın arayüzünde reklam alanlarını beslemek için şu fonksiyonları dışa aktarır:

### A. Çoklu Reklam Filtreleme (`getAdvertisements`)
*   **Açıklama:** Belirtilen sayfa, bölüm ve (opsiyonel) kategoriye göre filtreleme yapıp limit kadar reklam döner.
*   **Girdi Parametreleri:**
    ```typescript
    interface GetAdvertisementsOptions {
      page: string;         // Örn: 'category', 'home', 'listing-detail'
      section: string;      // Örn: 'header', 'sidebar', 'content', 'footer'
      categoryId?: number | null; // Opsiyonel Kategori ID
      limit?: number;       // Opsiyonel Limit (Varsayılan: 1)
    }
    ```

### B. Tekil Reklam Filtreleme (`getAdvertisement`)
*   **Açıklama:** `getAdvertisements` fonksiyonunu limit = 1 ile çağırarak eşleşen ilk reklam nesnesini veya `null` döner.

### C. Kategoriye Özel Reklam Getirme (`getCategoryAdvertisements`)
*   **Açıklama:** Kategori sayfası için belirli bir kategorinin ve bölümün reklamlarını getirir.

### D. Sayfa Genelindeki Tüm Reklamları Getirme (`getPageAdvertisements`)
*   **Açıklama:** Tek bir sayfadaki tüm standart bölümler (`header`, `sidebar`, `content`, `footer`) için reklamları tek bir obje içinde döner.
*   **Dönüş Tipi:** `Promise<Record<string, Advertisement[]>>`

---

## 2. API Entegrasyon Gereksinimleri

Bu servisin doğrudan backend'e bağlanması için backend tarafında şu API endpoint'i sağlanmalıdır:

### Çoklu Filtreli Banner Getirme
*   **Yol (Endpoint):** `GET /api/v1/banners`
*   **Query Parametreleri:**
    *   `page`: sayfa adı (string, zorunlu)
    *   `section`: bölüm adı (string, zorunlu)
    *   `categoryId`: kategori kimliği (number, opsiyonel)
    *   `limit`: limit sayısı (number, opsiyonel)
*   **Örnek İstek URL'i:** `GET /api/v1/banners?page=category&section=sidebar&categoryId=499&limit=1`
*   **Örnek Yanıt:**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "title": "GeForce NOW Ultimate",
          "description": "Bulut oyun deneyiminin gücünü keşfet!",
          "mediaType": "video",
          "src": "https://cdn.pixabay.com/video/2024/08/07/224581_large.mp4",
          "poster": "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib...",
          "link": "https://www.nvidia.com/tr-tr/geforce-now/",
          "page": "category",
          "section_code": "KB1",
          "categoryId": 499,
          "categoryName": "Elektronik",
          "isActive": true
        }
      ]
    }
    ```

---

## 3. Frontend Tarafında Yapılacak Değişiklikler

1.  **Veri Çekme Fonksiyonunun Değiştirilmesi:** `fetchAdvertisementData` fonksiyonunun içerisindeki simüle edilmiş Promise yapısı ve `advertisementBannersData` statik JSON dosyasının import edilmesi kaldırılacaktır.
2.  **Gerçek API Çağrısı:** `fetchAdvertisementData` içinde ortak API client'ı (`api/client.ts`) kullanılarak istek backend'e yönlendirilecektir:
    ```typescript
    const fetchAdvertisementData = async (): Promise<unknown[]> => {
      // Önbellek kontrolü aynen kalabilir
      const cachedData = adCache.get();
      if (cachedData) return cachedData;
      
      // Gerçek API Çağrısı (yalnızca v1 banners):
      const response = await client.get('/api/v1/banners');
      const secureAds = filterSecureAds(response.data.data);
      adCache.set(secureAds);
      return secureAds;
    };
    ```
