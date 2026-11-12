# Acillazım 2026 UI/UX & Kurumsal Tasarım Kuralları (Sözleşme)

Bu belge, Acillazım platformunun (Dashboard, Header, Sidebar, Sayfalar) kurumsal tasarım kimliğini, 2026 UI/UX standartlarını ve kullanıcının verdiği kesin talimatları bağlayıcı kural olarak tanımlar. **Kullanıcı açıkça onay vermedikçe veya yeni kural belirtmedikçe bu kurallardan ASLA ayrılınamaz.**

---

## 1. Kurumsal Marka Kimliği: Lacivert ve Turuncu Uyumu

* **Ana Renk 1 — Kurumsal Lacivert (`--brand-deep: #003466` / `#00274d`):**
  * Platformun kurumsal güven, prestij ve oturmuş kimlik rengidir.
  * **Dashboard Sidebar arka planı her zaman LACİVERT kalacaktır.** Beyaza veya açık renge ASLA çevrilmeyecektir.
* **Ana Renk 2 — Enerjik Kurumsal Turuncu (`--brand-accent: #FF6B00` / `#FF8A00`):**
  * Acillazım'ın logosundaki hız ve dinamizmi temsil eden temel eşlikçi ana renktir.
  * Sidebar aktif menü belirteçlerinde, aktif ve hover ikon vurgularında, üst "Ana Sayfa" butonunda, bildirim rozetlerinde, buton hover durumlarında ve primary aksiyonlarda canlı bir şekilde kullanılır.
  * Lacivert zemin üzerinde turuncu etkileşimlerle kurumsal kimliğin iki ana rengi tam dengeli olarak yaşatılır.
* **Gövde & Zemin (`--brand-bg: #F5F6F8`):**
  * Hastane beyazı yerine gözü yormayan dinlendirici gri-bej soft zemin.
* **Kartlar (`#FFFFFF`):**
  * 1px `#E2E8F0` sınır çizgili, ferah, modern beyaz kartlar.

---

## 2. Header (Üst Menü) Kuralları — Sıfır Çift Menü, Sıfır Fazlalık

1. **Çift Menü KESİNLİKLE YASAKTIR:**
   * Masaüstü ekranlarda (>1024px) sidebar'ın kendi toggle butonu zaten bulunduğu için **Header içinde ASLA ikinci bir hamburger menü butonu gösterilemez** (`display: none !important;`).
   * Hamburger menü butonu **YALNIZCA mobilde** (≤1024px) sidebar kapalıyken çekmeceyi açmak için kullanılır.
2. **Gereksiz Başlık/Yazı YASAKTIR:**
   * Header içine sonradan eklenen kafa karıştırıcı ve alanı daraltan breadcrumb veya başlık metinleri eklenmez.
3. **Arama İkonu Konumu:**
   * Arama butonu (`[🔍]`) **SAĞ TARAFTA**, diğer eşit köşeli butonlarla (`[✉] [♡] [🔔] [Admin User Profile]`) bir arada yer alır.
4. **Gizlenebilir / Açılır Arama:**
   * Navbar'da boydan boya uzanan statik boşluk yaratan kutu yerine, sağdaki `[🔍]` butonuna basıldığında yumuşakça açılan `340px` form yer alır. `[✕]` veya Escape ile kapanır.

---

## 3. Sidebar (Yan Menü) Kuralları

1. **Zemin:** Zengin kurumsal lacivert (`#003466` to `#00274d`).
2. **Yazı Tipi:** `Inter` (500 normal, 600 aktif).
3. **Etkileşim & Turuncu Vurgu:**
   * **Hover:** `background: rgba(255, 107, 0, 0.12)`, ikon `color: #FF6B00`, yazı beyaz.
   * **Aktif:** `background: rgba(255, 107, 0, 0.16)`, sol kenarda `3.5px solid #FF6B00`, ikon `#FF6B00`, yazı beyaz bold.
4. **Sıfır Rengarenklik & Sıfır Eski Etiket:**
   * Rastgele pembe (`#ff8a8a`), camgöbeği (`#4eb5ff`) veya modası geçmiş "New"/"Yakında" etiketleri KESİNLİKLE YASAKTIR.
   * Yalnızca gerçek verili turuncu sayı rozetleri (`unreadCount`) kullanılır.
5. **Kaydırma Çubuğu (Scrollbar):**
   * Sidebar'da scrollbar görsel olarak tamamen gizlenmiştir (`scrollbar-width: none; -ms-overflow-style: none; ::-webkit-scrollbar { display: none; }`).
   * Menü fare tekerleği, trackpad ve dokunmatik ile pürüzsüzce kaymaya devam eder, ancak hiçbir scrollbar izi veya çubuğu görünmez.
6. **Çıkış Yap:**
   * Lacivert zemin üzerinde kurumsal turuncu-amber çerçeveli (`#FF8A00`), üzerine gelince netleşen özel buton.

---

## 4. Kesin Taahhüt

Bu kurallar kullanıcının açık onayı veya yeni talimatı olmaksızın ASLA değiştirilemez.
