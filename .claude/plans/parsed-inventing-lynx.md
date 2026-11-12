# Proje Ana Sayfa Arayüz Redesign Planı - acillazim.com

## Context (Bağlam)
Bu çalışma, `acillazim.com` platformunun ana sayfa tasarımını günümüz modern tasarım trendlerine (şık, minimalist, yumuşak geçişler, gölgeler, cam morfolojisi / glassmorphism ve uyumlu renk paletleri) adapte etmek için yapılmaktadır. Redesign işlemi gerçekleştirilirken arka plandaki veri yapıları, API istekleri, React context'leri, durum (state) yönetimi ve dinamik reklam yönetim mekanizması tamamen korunarak sadece sunum/görsel katmanı (UI/UX) iyileştirilecektir. Hizmetler ve Ustalar sayfasındaki modern ızgara yerleşimi ve şık tasarım çizgisi ana sayfaya taşınarak tüm cihazlarda (mobil, tablet, desktop) tam uyumlu bir kullanıcı deneyimi hedeflenmektedir.

## Önerilen Yaklaşım (Recommended Approach)

1. **Ana Sayfa Yapısı (`Page/Home/Home.tsx` ve `Page/Home/Home.css`)**:
   - Mevcut sidebar ve sağ içerik düzeni flexbox ile modernleştirilecek.
   - Masaüstünde sidebar'a yumuşak gölgeler, border radius ve arka plan gradyanları eklenecek.
   - Mobilde ve tablette sidebar'ın ve reklamların gizlenme davranışı korunacak, ancak düzen boşlukları (gap, padding, margin) daha akıcı ve esnek (gap: 24px/16px) hale getirilecek.
   - Grid sınırları ve kartlar arasındaki mesafe modern CSS değişkenleriyle (`--alz-listing-card-gap` vb.) senkronize edilecek.

2. **Hero Section İyileştirmesi (`components/HeroSection/HeroSection.tsx` ve `.css`)**:
   - Sol taraftaki başlık ve butonlar daha modern font boyutları, buton içi ikonlar ve hover animasyonları ile güncellenecek.
   - Sağ taraftaki özellik kartları (feature-item) cam animasyonu (glassmorphism), renkli hafif border'lar, yumuşak gölgeler ve daha estetik ikon kaplayıcıları ile canlandırılacak.
   - Tamamen responsive (mobilde dikey kartlar yerine daha şık 1 veya 2 sütunlu yerleşim) olacak şekilde adapte edilecek.

3. **Kategori ve İlan Listelemeleri**:
   - `PopularCategories`, `VitrinListings` ve `FeaturedListings` bölümlerinde kullanılan başlıkların alt çizgileri ve renkleri `Ustalar ve Hizmetler` sayfasında kullanılan gradyanlı turuncu çizgili yapı ile uyumlu hale getirilecek.
   - Kartların hover durumlarında (hover zoom, shadow expansion) yumuşak geçiş efektleri (transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)) uygulanacak.

## Değiştirilecek Kritik Dosyalar
- `Page/Home/Home.css` -> Tam genişlik, akıcı boşluklar ve genel gövde stil optimizasyonları.
- `Page/Home/Home.tsx` -> JSX yapısında herhangi bir state veya handler bozulmadan sadece modern container class'ları eklenecek.
- `components/HeroSection/HeroSection.css` -> Neon turuncu vurgular, gradyanlı arka planlar, geçiş efektleri, cam efektli özellik kartları.
- `components/HeroSection/HeroSection.tsx` -> buton sınıfları ve kapsayıcı düzeni güncellenecek.

## Yeniden Kullanılacak Fonksiyonlar ve Bileşenler
- `useAuth` ve `useLocation` Context'leri, `locationService` ve `homeService` veri çekme metotları olduğu gibi korunacaktır (`Page/Home/Home.tsx`).
- `AdBanner`, `NearbyListings`, `PopularLocation`, `VitrinListings` ve `FeaturedListings` bileşenlerinin prop yapıları değiştirilmeden kullanılacaktır.

## Doğrulama ve Test Planı
1. **Görsel Kontrol**: Next.js geliştirme sunucusu başlatılıp tarayıcıda ana sayfa, mobil görünüm (Responsive Mode), tablet görünümü ve geniş ekran masaüstü görünümü test edilecek.
2. **Fonksiyonellik Kontrolleri**: 
   - Konum seçildiğinde `NearbyListings` bileşeninin dinamik başlığının doğru güncellendiği doğrulanacak.
   - Kategorilere tıklandığındaki yönlendirmeler kontrol edilecek.
   - Reklam banner'larının kayma özellikleri kontrol edilecek.
   - Giriş yapıldığında `PopularLocation` bileşeninin doğru şekilde render olduğu görülecek.
