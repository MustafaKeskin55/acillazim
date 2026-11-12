# categoryAdService Entegrasyon Planı

`categoryAdService.ts` dosyası, **Kategori Sayfalarına özel** reklam alanlarını (`KB1` ve `KS1` kodlarıyla) yönetmek için tasarlanmış özel bir simüle API servisidir.

**API versiyonu:** Yalnızca `/api/v1/advertisements/category/{categoryId}/all-sections`. Path alias yoktur.

---

## 1. Reklam Bölüm Kodları (Section Codes)

Kategori sayfalarında kullanılan iki ana reklam alanı vardır:
*   `KB1` (Kategori Üst Banner): Kategori sayfasının en üstünde yer alan yatay reklam alanı. (Eski kod desteği: `B1`)
*   `KS1` (Kategori Sidebar): Kategori sayfasının sol/sağ yan menüsünde (sidebar) yer alan dikey reklam alanı. (Eski kod desteği: `S1`)

---

## 2. Servis Fonksiyonları ve Yanıt Yapısı

Servis, kategori sayfalarını beslemek için şu fonksiyonları sunar:

### A. Bölüme Göre Reklam Getirme (`getAdvertisementBySection`)
*   **Açıklama:** Belirli bir kategori ID ve bölüm koduna (`KB1` veya `KS1`) göre reklamları çeker. Kategoriye özel reklam bulamazsa genel (`categoryId: null`) reklamları, o da yoksa tüm sayfalar (`page: 'all'`) için geçerli genel reklamı döner.
*   **Girdi:** `categoryId: number | string`, `sectionCode: string`

### B. Kategori Banner Getirme (`getCategoryBanner`)
*   **Açıklama:** Belirtilen kategori için `KB1` (Kategori Üst Banner) reklamını döner.

### C. Kategori Sidebar Getirme (`getCategorySidebar`)
*   **Açıklama:** Belirtilen kategori için `KS1` (Kategori Sidebar) reklamını döner.

### D. Tüm Kategori Reklamlarını Getirme (`getAllCategoryAds`)
*   **Açıklama:** Hem `KB1` hem de `KS1` alanlarının reklamlarını paralel (`Promise.all`) çekerek bir arada döner.
*   **Dönüş Yapısı (Response):**
    ```json
    {
      "success": true,
      "data": {
        "KB1": { ... }, // Banner reklamı veya null
        "KS1": { ... }  // Sidebar reklamı veya null
      },
      "message": "Kategori reklamları yüklendi."
    }
    ```

---

## 3. Backend Entegrasyon Gereksinimleri

Kategori sayfası yüklendiğinde tek bir istek ile tüm sayfa reklamlarını çekmek (network trafiğini azaltmak) amacıyla backend tarafında şu API endpoint'inin bulunması idealdir:

*   **Yol (Endpoint):** `GET /api/v1/advertisements/category/{categoryId}/all-sections`
*   **Query/Path Parametreleri:**
    *   `categoryId` (kategori ID, path parametresi olarak)
*   **Örnek İstek:** `GET /api/v1/advertisements/category/499/all-sections`
*   **Örnek Yanıt:**
    ```json
    {
      "success": true,
      "data": {
        "KB1": {
          "id": 1,
          "title": "GeForce NOW Ultimate",
          "mediaType": "video",
          "src": "https://...",
          "link": "https://..."
        },
        "KS1": {
          "id": 2,
          "title": "Emlak Fırsatları",
          "mediaType": "video",
          "src": "https://...",
          "link": "https://..."
        }
      },
      "message": "Kategori reklamları yüklendi."
    }
    ```

---

## 4. Frontend Tarafında Yapılacak Değişiklikler

1.  **JSON Dosya Bağımlılığının Kaldırılması:** `advertisementBanners.json` import'u kaldırılacaktır.
2.  **API Client Entegrasyonu:** `getAdvertisementBySection` veya `getAllCategoryAds` doğrudan backend API'sine bağlanacak şekilde güncellenecektir:
    ```typescript
    import client from '@/api/client';
    
    const CATEGORY_ADS_ALL_SECTIONS_PATH = (categoryId: number | string) =>
      `/api/v1/advertisements/category/${categoryId}/all-sections`;
    
    const getAllCategoryAds = async (
      categoryId: number
    ): Promise<ApiResponse<AllCategoryAdsData>> => {
      try {
        const response = await client.get(CATEGORY_ADS_ALL_SECTIONS_PATH(categoryId));
        return response.data;
      } catch (error) {
        console.error('Kategori reklamları yüklenirken hata oluştu:', error);
        return {
          success: false,
          data: null,
          message: 'API hatası'
        };
      }
    };
    ```
