# BE İstek (Konsolide): Hizmet Ana Sayfası

**Sayfa:** `/Ustalar-ve-Hizmetler` → `Page/Service/Service.tsx`
**Amaç:** Bu sayfadaki tüm bölümlerin backend'e bağlanması için gereken endpoint'lerin tek yerde özeti. Her bölümün ayrıntılı sözleşmesi zaten `md/` klasöründe var — burada tekrar yazmak yerine referans veriyoruz ve **öncelik/durum** ekliyoruz.

---

## 0. Ön Koşul — Önce Bu Çözülmeli

Frontend'de `NEXT_PUBLIC_API_URL` (veya `NEXT_PUBLIC_API_BASE_URL`) ortam değişkeni **tanımlı değil**. Bu değişken set edilmeden aşağıdaki endpoint'lerin hiçbiri gerçekten test edilemez — FE tüm istekleri kendi origin'ine (`/api/v1/...` relative path) atar ve backend'e hiç ulaşmaz (404).

**Yapılacak:** Backend URL'i netleştiğinde `.env.local` dosyasına eklenecek:
```
NEXT_PUBLIC_API_URL=https://<backend-host>
```

---

## 1. Trend / Popüler Hizmetler ✅ FE hazır, BE bekleniyor

- **Detay doküman:** `md/BE-Istek-TrendPopulerHizmetler.md`
- **Endpoint:** `GET /api/v1/listings?is_service=true&include_descendants=true&sort=popular&page=1&page_size=50`
- **Durum:** Frontend kodu düzeltildi (`Service.tsx` → `ServiceCardCategory usePopularServices`), gerçek API'yi çağırıyor. Backend endpoint'i sağlamıyorsa hata state'i gösteriliyor.

---

## 2. Öne Çıkan Hizmetler (Vitrin Hizmetler bölümü) ✅ FE hazır, BE bekleniyor

- **Detay doküman:** `md/homeService.md` (Bölüm D) + `md/listingsService.md` (Bölüm C)
- **Endpoint:** `GET /api/v1/listings?vitrin_durumu=one_cikan&category_id=12540&include_descendants=true`
- **FE kodu:** `services/home/serviceHomeService.ts` → `getFeaturedServiceListings()` artık `featuredListingsService.ts` ile birebir aynı deseni kullanıyor: `BaseListingsService.getListings()` üzerinden, `USE_API` (api/config.ts) `true` olduğunda gerçek isteği atıyor, `false` ise eski mock davranışına düşüyor. API hata verirse boş dizi döner, sayfa kırılmaz.

---

## 3. Vitrin Hizmet İlanları ✅ FE hazır, BE bekleniyor (hâlâ sayfada kullanılmıyor)

- **Detay doküman:** `md/homeService.md` (Bölüm E)
- **Endpoint:** `GET /api/v1/listings?vitrin_durumu=vitrin&category_id=12540&include_descendants=true`
- **FE kodu:** `serviceHomeService.getVitrinServiceListings()` artık aynı şekilde gerçek API'ye bağlı, ancak `Service.tsx` içinde hâlâ hiçbir yerde çağrılmıyor (dead code — UI'da bir bölüm karşılığı yok). Backend hazır olunca sayfaya eklenip eklenmeyeceğine karar verilmeli.

---

## 4. Hizmet Kategorileri (Tüm Kategoriler grid + "Profesyonel Hizmet Ağı" marquee) ⚠️ Kısmen tamamlandı

- **Detay doküman:** `md/categoryService.md`
- **Endpoint:** `GET /api/v1/categories?parent_id=12540` (alt kategoriler)
- **"Tüm Kategoriler" grid — ✅ Yapıldı:** `Service.tsx` artık `categoryService.getSubCategories(12540)` çağırıyor (`USE_API=true` olduğunda gerçek API, `false` ise `data/categroies_data.json` mock). Statik `categroies__hiz_data.json` import'u sadece ilk render / API hatası fallback'i olarak kalıyor. Kategori isim/ikon/ID seti iki dosyada birebir aynı olduğu için görsel değişiklik yok.
- **"Profesyonel Hizmet Ağı" marquee — ⛔ Bilerek dokunulmadı:** `categoryService`'in beslendiği gerçek kategori şeması (`data/categroies_data.json`, backend'in muhtemel kaynağı) **`img_url`/`position` alanı içermiyor**. Marquee görselleri şu an sadece ayrı ve backend'de karşılığı olmayan `data/popularCategories.json` dosyasında var. `categoryService.getPopularServiceCategories()` bu alanları bekliyor ama boş dönüyor — şu an geçilirse marquee görselsiz kalır. **Backend, kategori response'una `img_url` (ve opsiyonel `position`) alanı eklemeden bu bölüm migrate edilmemeli** (kullanıcı onaylı — id 5 beklemede).
- **Küçük FE bug'ı (BE'yi ilgilendirmez):** Marquee'deki `<img>` etiketine `object-position` (kadraj) stili uygulanmıyor — kategori verisindeki `position` alanı kullanılmıyor. Ayrı fix, hâlâ beklemede.

---

## 5. Popüler Şehirler ⚠️ Gerçek API çağrılıyor, canlılığı doğrulanmalı

- **Detay doküman:** `md/listingsService.md` (Bölüm F) + `md/locationService.md` (Bölüm E — burada implement edilmiyor, referans veriyor)
- **Endpoint:** `GET /api/v1/locations/popular`
- **Beklenen response:** `{ "popularCities": [ { "id": 1, "name": "İstanbul", "slug": "istanbul" } ] }`
- **FE kodu:** `popularLocationsService.ts` zaten gerçek `fetch` yapıyor, **mock fallback yok** — hata olursa kullanıcıya direkt "Popüler şehirler yüklenemedi" gösteriliyor. Bu endpoint'in backend'de gerçekten ayakta olması gerekiyor.

---

## 6. İl / İlçe Arama (ServiceSearch dropdown'ları) ✅ FE hazır, BE bekleniyor — ⚠️ Site geneli etkiliyor

- **Detay doküman:** `md/locationService.md` (Bölüm A, B)
- **Endpoint'ler:**
  - `GET /api/v1/locations/provinces`
  - `GET /api/v1/locations/districts?province_id={id}`
  - `GET /api/v1/locations/neighborhoods?district_id={id}`
- **FE kodu:** `services/location/locationService.ts` içindeki `USE_REAL_API` artık `true` — gerçek API'ye geçti.
- **⚠️ Kapsam uyarısı:** Bu servis sadece `ServiceSearch` değil; `IlanForm`, `ServiceListingForm`, `FilterSidebar`, kayıt (bireysel/kurumsal) sayfaları gibi **sitedeki tüm il/ilçe/mahalle dropdown'larını** besliyor. Yukarıdaki 3 endpoint backend'de canlı değilse, sadece bu sayfa değil **tüm site genelinde** il/ilçe seçimleri boş gelir. Backend'in bu üç endpoint'i tam olarak bu response şemasıyla (`md/locationService.md`) sağladığından emin olun.

---

## 7. Yakındaki Hizmetler (NearbyListings) ⚠️ Karar bekleniyor

- **Detay doküman:** `md/listingsService.md` (Bölüm E)
- **Endpoint:** `GET /api/v1/listings?il={city}&ilce={district}&page_size={limit}` (hizmet kapsamı eklenmeli: `category_id=12540&include_descendants=true`)
- **Davranış notu:** Component, **giriş yapmamış** veya **konum seçmemiş** kullanıcıya bu bölümü tamamen gizliyor (`return null`). Bu tasarım gereği mi yoksa değiştirilmeli mi netleştirilmedi.
- **Bilinen bug (`listingsService.md`'de not düşülmüş):** `Page/ProductDetail/.../NearbyListings.tsx` içinde kırık import var — `getCurrentUserNearbyListings` export'u mevcut değil.

---

## 8. Mesaj Okunmamış Sayaç (Navbar) ⏳ Zaten dokümante, backend bekleniyor

- **Detay doküman:** `md/messageService.md` (Bölüm D)
- **Endpoint:** `GET /api/v1/conversations/unread-count`
- **Beklenen response:** `{ "count": 3 }` veya düz `number`
- **Not:** Bu sayfaya özel değil, tüm sitede Navbar'da çalışıyor; şu an 404 (backend yok).

---

## 9. Genel / Yapısal Notlar

- **Çift config sistemi:** `api/config.ts` (`USE_API`) ile `config/apiConfig.ts` arasında tutarsızlık var — hangisinin "tek doğru kaynak" olacağı netleşmeli. Çoğu servis kendi `USE_MOCK`/`USE_API` bayrağını taşıyor (merkezi değil).
- **Standart response zarfı:** Tüm endpoint'ler için tercih edilen format:
  ```json
  { "success": true, "data": <Veri>, "message": "OK" }
  ```
  FE genelde hem bu zarfı hem düz veri dönüşünü unwrap edecek şekilde yazılmış, ama backend tek bir formatta tutarlı kalmalı.
- **Auth:** Bu sayfadaki endpoint'lerin çoğu misafir kullanıcı için de çalışmalı (`Authorization` header opsiyonel) — sadece favoriler/mesajlaşma gibi kullanıcıya özel akışlar zorunlu token ister.

---

## 10. Öncelik Sırası (Önerilen)

| # | Bölüm | Durum | Öncelik |
|---|---|---|---|
| 1 | Trend / Popüler Hizmetler | ✅ FE hazır, BE bekleniyor | 🔴 Yüksek |
| 2 | Popüler Şehirler | ⚠️ BE canlılığı doğrulanmalı | 🔴 Yüksek |
| 3 | Öne Çıkan Hizmetler (Vitrin) | ✅ FE hazır, BE bekleniyor | 🟠 Orta |
| 4 | Hizmet Kategorileri (grid) | ✅ FE hazır, BE bekleniyor | 🟠 Orta |
| 4b | Profesyonel Hizmet Ağı (marquee görselleri) | ⛔ BE'de `img_url` alanı yok, bekliyor | 🟡 Düşük |
| 5 | İl/İlçe Arama | ✅ FE hazır, BE bekleniyor (site geneli) | 🟡 Düşük-Orta |
| 6 | Vitrin Hizmet İlanları | ✅ FE hazır, sayfada kullanılmıyor | 🟡 Düşük |
| 7 | Yakındaki Hizmetler | Karar bekleniyor | 🟡 Düşük-Orta |
| 8 | Mesaj Okunmamış Sayaç | Sitede genel, dokümante | 🟠 Orta |

**Kalan tek engel:** `NEXT_PUBLIC_API_URL` set edilmeden (bkz. Bölüm 0) yukarıdaki ✅ işaretli hiçbir bağlantı gerçekten çalışmaz — hepsi kodda hazır, sadece env değişkenini bekliyor.
