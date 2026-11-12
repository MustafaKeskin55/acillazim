-- ============================================================================
-- Acillazım Bildirim Veritabanı Tohumlama (Seed Script)
-- Her çeşitten en az 1'er adet olmak üzere 12 dinamik bildirim çeşidi
-- Hedef kullanıcılar: User ID 8 (Mustafa Keskin / admin) ve User ID 1 (Ahmet Yılmaz)
-- ============================================================================

DELETE FROM notifications WHERE user_id IN (1, 8);

-- 1. WELCOME
INSERT INTO notifications (user_id, type, title, message, details, is_read, created_at, updated_at, priority, action_text, action_link)
VALUES 
(8, 'WELCOME', 'Acillazım Ailesine Hoş Geldiniz!', 'Hesabınız başarıyla aktive edildi. Hemen aradığınız hizmeti bulun veya ilanınızı verin.', 
'{"features": [{"title": "Güvenilir Ustalar", "description": "Doğrulanmış uzman ve servis sağlayıcılar"}, {"title": "Hızlı Randevu", "description": "Dakikalar içinde müsait saatleri belirleyip randevu oluşturun"}, {"title": "Güvenli İletişim", "description": "Platform içi mesajlaşma ile anında görüşün"}], "ctaButtons": [{"text": "Hemen İlan Ver", "link": "/ilan-ver", "primary": true}, {"text": "Hizmetleri Keşfet", "link": "/Ustalar-ve-Hizmetler", "primary": false}]}'::jsonb,
false, NOW() - INTERVAL '1 hour', NOW(), 'NORMAL', 'Profili Tamamla', '/dashboard/profil'),

-- 2. APPOINTMENT_REQUEST
(8, 'APPOINTMENT_REQUEST', 'Yeni Randevu Talebi', 'Ayşe Demir adlı müşteri 2026-11-15 tarihinde 14:30 saatinde Acil Su Tesisatı Tamiri hizmetiniz için yeni bir randevu talebi oluşturdu.',
'{"appointment": {"id": 101, "requester": {"name": "Ayşe Demir", "phone": "0532 987 65 43", "verified": true}, "listing": {"id": 501, "title": "Acil Su Tesisatı & Kaçak Tespiti", "category": "Sıhhi Tesisat", "price": 1250, "address": "İzmir / Bornova"}, "requestedDates": [{"date": "15 Kasım 2026", "time": "14:30", "available": true}, {"date": "16 Kasım 2026", "time": "10:00", "available": true}], "message": "Banyodaki borudan su sızıyor, acil kontrol edilmesi gerekiyor."}}'::jsonb,
false, NOW() - INTERVAL '3 hours', NOW(), 'HIGH', 'Randevuyu İncele', '/dashboard/randevular'),

-- 3. APPOINTMENT_COMPLETED
(8, 'APPOINTMENT_COMPLETED', 'Randevu Başarıyla Tamamlandı', 'Mehmet Kaya adlı müşteri ile olan Kombi Bakımı randevunuz başarıyla tamamlandı olarak işaretlendi.',
'{"appointment": {"id": 102, "requester": {"name": "Mehmet Kaya", "phone": "0544 123 45 67", "verified": true}, "listing": {"id": 502, "title": "Kombi & Petek Yıllık Bakım Hizmeti", "category": "Isıtma & Soğutma", "price": 950, "address": "İzmir / Karşıyaka"}}}'::jsonb,
true, NOW() - INTERVAL '1 day', NOW(), 'NORMAL', 'Detayları Görüntüle', '/dashboard/randevular/gecmis'),

-- 4. APPOINTMENT_CANCELLED
(8, 'APPOINTMENT_CANCELLED', 'Randevu İptal Edildi', 'Can Öztürk adlı müşteri tarafından planlanan Boya Badana randevusu iptal edildi. Sebep: Müşteri seyahat nedeniyle ertelemek istedi.',
'{"appointment": {"id": 103, "requester": {"name": "Can Öztürk", "phone": "0555 456 78 90", "verified": false}, "listing": {"id": 503, "title": "3+1 Ev Boya & Badana İşleri", "category": "Boya & Badana"}, "reason": "Müşteri şehir dışına çıkmak zorunda kaldığını bildirdi."}}'::jsonb,
true, NOW() - INTERVAL '2 days', NOW(), 'NORMAL', 'Randevulara Git', '/dashboard/randevular'),

-- 5. NEW_MESSAGE
(8, 'NEW_MESSAGE', 'Fatma Öz size yeni bir mesaj gönderdi', 'Fatma Öz adlı kullanıcı size mesaj gönderdi: "Merhabalar, Karataş mahallesindeki elektrik panosu değişimi için yarın gelebilir misiniz?"',
'{"conversation": {"id": 201, "sender": {"id": 4, "name": "Fatma Öz"}}, "listingTitle": "Elektrik Arıza & Pano Yenileme"}'::jsonb,
false, NOW() - INTERVAL '30 minutes', NOW(), 'HIGH', 'Mesajı Yanıtla', '/dashboard/mesajlar'),

-- 6. PRICE_DROP
(8, 'PRICE_DROP', 'Takip Ettiğiniz İlanda Fiyat Düştü', 'Favorilerinize eklediğiniz "İzmir Bornova 2+1 Doğalgazlı Daire" ilanının fiyatı 24.500 ₺ yerine 21.000 ₺ olarak güncellendi.',
'{"listing": {"id": 401, "title": "İzmir Bornova 2+1 Doğalgazlı Daire", "subtitle": "Metroya 3 dakika yürüme mesafesinde, geniş balkonlu", "image": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400", "location": {"city": "İzmir", "district": "Bornova", "neighborhood": "Kazımdirik Mah."}, "price": {"old": 24500, "new": 21000, "currency": "TRY", "savings": 3500}}}'::jsonb,
false, NOW() - INTERVAL '5 hours', NOW(), 'NORMAL', 'İlanı İncele', '/ilan/401'),

-- 7. LISTING_PUBLISHED
(8, 'LISTING_PUBLISHED', 'İlanınız Yayına Alındı', '"Profesyonel Evden Eve Nakliyat & Asansörlü Taşıma" başlıklı ilanınız editör onayından geçti ve yayına alındı.',
'{"listing": {"id": 505, "title": "Profesyonel Evden Eve Nakliyat & Asansörlü Taşıma", "price": 6500, "currency": "TRY", "location": {"city": "İzmir", "district": "Karaburun"}, "image": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400"}, "tips": ["İlanınıza ait fotoğrafları güncel tutun", "Gelen mesajlara 15 dakika içinde yanıt vermek arama sıralamanızı yükseltir"]}'::jsonb,
true, NOW() - INTERVAL '18 hours', NOW(), 'NORMAL', 'İlanı Görüntüle', '/ilan/505'),

-- 8. NEW_FAVORITE
(8, 'NEW_FAVORITE', 'İlanınız Favorilere Eklendi', '"Acil Oto Çekici & Yol Yardım" ilanınız son 24 saat içinde 6 farklı kullanıcı tarafından favorilere eklendi.',
'{"stats": {"favoriteCount": 6, "weeklyIncrease": 14, "viewCount": 248}, "listingTitle": "Acil Oto Çekici & Yol Yardım"}'::jsonb,
false, NOW() - INTERVAL '2 hours', NOW(), 'LOW', 'İstatistikleri Gör', '/dashboard/ilan-istatistikleri'),

-- 9. SELLER_REVIEW
(8, 'SELLER_REVIEW', 'Yeni Müşteri Değerlendirmesi', 'Ahmet Yılmaz sunduğunuz Elektrik Tesisatı Tamiri hizmetini 5 yıldız vererek değerlendirdi.',
'{"review": {"rating": 5, "comment": "Mustafa Bey tam vaktinde geldi ve sigorta arızasını yarım saatte profesyonelce çözdü. Çok teşekkürler, kesinlikle tavsiye ederim.", "reviewer": {"name": "Ahmet Yılmaz", "memberSince": "2024"}}, "transactionListing": {"title": "Elektrik Tesisatı Tamiri", "soldPrice": 850}}'::jsonb,
false, NOW() - INTERVAL '4 hours', NOW(), 'NORMAL', 'Yorumları İncele', '/dashboard/hizmet-alanlari'),

-- 10. EXPIRING_SOON
(8, 'EXPIRING_SOON', 'İlanınızın Süresi 3 Gün İçinde Doluyor', '"Garantili Çatı İzolasyon ve Onarım" ilanınızın 30 günlük yayın süresi 3 gün sonra sona erecek.',
'{"listing": {"id": 506, "title": "Garantili Çatı İzolasyon ve Onarım", "subtitle": "Su ve ısı izolasyonu, 5 yıl firma garantisi", "daysRemaining": 3, "location": {"city": "İzmir", "district": "Çeşme"}}, "renewalOptions": [{"label": "Standart Yenileme (30 Gün)", "price": 0, "recommended": false}, {"label": "Öne Çıkan Vitrin Paketi", "price": 199, "recommended": true}]}'::jsonb,
false, NOW() - INTERVAL '6 hours', NOW(), 'HIGH', 'İlanı Yenile', '/dashboard/aktif-ilanlar'),

-- 11. LISTING_EXPIRED
(8, 'LISTING_EXPIRED', 'İlanınızın Yayın Süresi Doldu', '"Klima Montaj ve Gaz Dolumu" ilanınızın süresi dolduğu için pasife alındı. Tek tıkla yeniden aktif edebilirsiniz.',
'{"listing": {"id": 507, "title": "Klima Montaj ve Gaz Dolumu", "price": 1500}, "stats": {"totalViews": 420, "totalFavorites": 18, "totalContacts": 9}, "renewalOptions": [{"label": "Ücretsiz Yeniden Yayınla (30 Gün)", "price": 0, "recommended": true}]}'::jsonb,
true, NOW() - INTERVAL '3 days', NOW(), 'HIGH', 'Hemen Yeniden Yayınla', '/dashboard/pasif-ilanlar'),

-- 12. SYSTEM_UPDATE
(8, 'SYSTEM_UPDATE', 'Sistem Güncellemesi ve Bakım Bildirimi', 'Platformumuzun altyapısı ve randevu optimizasyon modülü 2026.4 sürümüne yükseltildi.',
'{"updateInfo": {"title": "Acillazım v2026.4 Performans & Randevu İyileştirmesi", "version": "2026.4.1", "description": "Randevu takvim hızlandırması, SMS bildirim entegrasyonu ve mobil bildirim merkezi optimizasyonları tamamlandı."}}'::jsonb,
true, NOW() - INTERVAL '4 days', NOW(), 'LOW', 'Tüm Bildirimler', '/dashboard/bildirimler');

-- Aynısını User ID 1 için de ekle (Ahmet Yılmaz)
INSERT INTO notifications (user_id, type, title, message, details, is_read, created_at, updated_at, priority, action_text, action_link)
SELECT 1, type, title, message, details, is_read, created_at, updated_at, priority, action_text, action_link
FROM notifications WHERE user_id = 8;

