# BE İstek: Trend / Popüler Hizmetler Endpoint'i

**Durum:** Frontend hazır, gerçek API'yi bekliyor.
**Sayfa:** Hizmet Ana Sayfası (`/Ustalar-ve-Hizmetler`) → "Trend — Şu sıralar tercih ediliyor" bölümü.
**FE dosyaları:** `Page/Service/Service.tsx` → `components/ServiceCardCategory/ServiceCardCategory.tsx` → `services/popularServices/popularServicesService.ts` → `services/popularServices/popularServicesAPI.ts`

---

## 1. Ne değişti (FE tarafı)

`Service.tsx` içindeki `ServiceCardCategory` componenti artık **mock veri değil, gerçek API'yi** çağıracak şekilde ayarlandı:

```tsx
<ServiceCardCategory
  cardCategoryText="Popüler Hizmetler"
  usePopularServices
/>
```

Bu prop, `popularServicesAPI.ts` içindeki `USE_MOCK = false` bayrağıyla birleşince component mount olduğunda otomatik olarak aşağıdaki endpoint'e istek atar:

```
GET {API_BASE_URL}/listings?is_service=true&include_descendants=true&sort=popular&page=1&page_size=50
```

`API_BASE_URL`, `NEXT_PUBLIC_API_URL` (veya `NEXT_PUBLIC_API_BASE_URL`) env değişkeninden `{host}/api/v1` şeklinde türetiliyor.

**Backend bu endpoint'i sağlamıyorsa** kullanıcı sayfada "Hizmetler yüklenirken bir hata oluştu" mesajı ve "Tekrar Dene" butonu görecek (sessizce mock'a düşülmüyor — bu bilinçli bir tercih, sorunlar gizlenmesin diye).

---

## 2. Backend'den Beklenen Endpoint

### `GET /api/v1/listings`

**Query Parametreleri:**

| Parametre | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `is_service` | boolean | Evet (veya `category_id`) | `true` → sadece hizmet ilanları |
| `category_id` | number | Alternatif | Hizmet kök kategori ID'si (örn. `12540`) — `is_service` yerine kullanılabilir |
| `include_descendants` | boolean | Evet | `true` → alt kategorilerdeki ilanlar da dahil edilsin |
| `sort` | string | Evet | `popular` \| `date` \| `price` — sıralama kriteri |
| `page` | number | Evet | Sayfa numarası (varsayılan `1`) |
| `page_size` | number | Evet | Sayfa boyutu (FE `50` gönderiyor) |
| `il` | string | Hayır | Şehir filtresi (opsiyonel, FE bazı çağrılarda gönderebilir) |
| `fiyat_min` / `fiyat_max` | number | Hayır | Fiyat aralığı filtresi (opsiyonel) |

**Örnek istek:**
```
GET /api/v1/listings?is_service=true&include_descendants=true&sort=popular&page=1&page_size=50
```

**İstek Başlıkları:**
```
Content-Type: application/json
Authorization: Bearer <token>   (opsiyonel — giriş yapmamış kullanıcı da bu bölümü görebilir)
```

### `sort=popular` semantiği

FE'nin mock implementasyonunda kullandığı puanlama mantığı (backend bunu birebir uygulamak zorunda değil, örnek referans):
- `vitrin_durumu === 'vitrin'` olan ilanlara öncelik (+100 puan)
- Geri kalanlar `ilan_tarihi`'ne göre (yeni → eski)

Backend gerçek "popülerlik" verisine sahipse (görüntülenme sayısı, tıklanma, favori sayısı vb.) onu kullanabilir — FE sıralamayı olduğu gibi kabul eder, kendi tarafında yeniden sıralamaz.

---

## 3. Beklenen Response Formatı

```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "ilan_id": 2049,
        "baslik": "7/24 Usta Elektrikçi - Acil Müdahale",
        "fiyat": 750,
        "para_birimi": "TL",
        "category_id": 12542,
        "vitrin_durumu": "vitrin",
        "ilan_tarihi": "2025-06-30",
        "konum": {
          "il": "Ankara",
          "ilce": "Keçiören"
        },
        "resimler": [
          "https://.../image1.jpg"
        ],
        "aciklama": "Kısa açıklama metni..."
      }
    ],
    "totalListings": 42,
    "currentPage": 1,
    "totalPages": 1
  },
  "message": "OK"
}
```

> Not: API düz `{ listings: [...] }` de dönebilir (üstteki `data` sarmalayıcısı olmadan) — FE her iki formatı da unwrap edecek şekilde yazıldı (`unwrapListings` fonksiyonu, `services/popularServices/popularServicesAPI.ts`).

### Zorunlu alanlar (FE bunları normalize edip kart olarak gösteriyor)

| Alan | Tip | Açıklama |
|---|---|---|
| `ilan_id` (veya `id`) | number \| string | İlan ID — kart key'i, detay linki için |
| `baslik` (veya `title`) | string | İlan başlığı — boşsa kart FE'de otomatik elenir |
| `fiyat` (veya `price`) | number | Fiyat — `null`/`undefined`/negatif olursa kart FE'de elenir, **hizmet ilanlarında bile bu alan dolu gönderilmeli** (0 dahi olabilir, ama eksik olmamalı) |
| `para_birimi` (veya `currency`) | string | Varsayılan `"TL"` |
| `category_id` | number | Kategori ID |
| `vitrin_durumu` | string | `"vitrin"` \| `"one_cikan"` \| diğer |
| `konum.il` / `konum.ilce` | string | Şehir/ilçe |
| `resimler` | string[] | Görsel URL listesi — ilk eleman kapak görseli olarak kullanılıyor |
| `ilan_tarihi` | string (ISO) | Tarih sıralaması ve "yeni ilan" rozeti için |

---

## 4. Kabul Kriterleri (Definition of Done)

- [ ] `GET /api/v1/listings?is_service=true&include_descendants=true&sort=popular&page=1&page_size=50` gerçek veri döndürüyor
- [ ] Auth token olmadan da (misafir kullanıcı) 200 dönüyor
- [ ] `fiyat` alanı hizmet ilanlarında da dolu geliyor (boş/`null` gelirse FE o kartı otomatik olarak listeden çıkarır — sessiz veri kaybı riski)
- [ ] `resimler` dizisindeki URL'ler herkese açık (CORS/hotlink engeli yok)
- [ ] Response `success`/`data` sarmalayıcılı veya düz `{ listings, totalListings, ... }` formatlarından biri
- [ ] `il` / `fiyat_min` / `fiyat_max` query parametreleri de (opsiyonel olarak) filtreleme yapıyor — bu parametreler diğer FE ekranlarında (`ServiceSearch`, filtre sayfası) da kullanılacak

---

## 5. İlgili Diğer Dosyalar

- `md/popularServicesService.md` — bu endpoint'in geniş kapsamlı entegrasyon planı (kategori bazlı, şehir bazlı, fiyat aralığı varyantları dahil)
- `md/homeService.md` — aynı `/api/v1/listings` endpoint'inin ana sayfa (Home) ve Vitrin Hizmetler kullanımları
