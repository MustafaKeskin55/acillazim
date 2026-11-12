'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import productDetailService from '@/services/productDetail/productDetailService';
import urlService from '@/services/utils/urlService';
import { decodeHtmlEntities } from '@/services/listings/util/listingUtils';
import favoriteService from '@/services/favorites/favoriteService';
import { useAuth } from '@/context/AuthContext';

/**
 * Ürün detay sayfası için iş mantığını yöneten custom hook
 * @param {string|number} initialProductId - URL'den çıkarılan ürün ID'si 
 * @returns {Object} Ürün detay sayfası için gerekli tüm state ve fonksiyonlar
 */
const useProductDetailController = (initialProductId) => {
  // State tanımları
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(undefined);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname() || '';
  const { isAuthenticated } = useAuth();
  
  // Ürün ID'sini elde etme fonksiyonu
  const getProductId = () => {
    // initialProductId açıkça null ise (önizleme / düzenleme modu), URL'den ID çıkarma
    if (initialProductId === null) {
      return null;
    }

    // 1. Doğrudan URL parametresinden alma
    if (initialProductId) {
      console.log("Doğrudan URL parametresinden ilan ID alındı:", initialProductId);
      return initialProductId;
    }
    
    // 2. URL servisinden ID çıkarma
    const extractedId = urlService.extractIlanId(pathname);
    if (extractedId) {
      console.log("urlService ile ilan ID çıkarıldı:", extractedId);
      return extractedId;
    }
    
    // 3. Eski yöntem - slug'dan çıkarma (yedek)
    const pathParts = pathname.split('/');
    const slug = pathParts[pathParts.length - 1];
    
    if (slug) {
      // Slug'ın sonundaki sayıyı regex ile bul
      const match = slug.match(/-(\d+)$/);
      if (match && match[1]) {
        console.log("Slug'dan ilan ID çıkarıldı:", match[1]);
        return match[1];
      }
      
      // Son kısmı sayı mı diye kontrol et
      const lastPart = slug.split('-').pop();
      if (lastPart && !isNaN(lastPart)) {
        console.log("Slug'dan ilan ID çıkarıldı (son kısım):", lastPart);
        return lastPart;
      }
    }
    
    // URL'den ID çıkarma denemelerimiz başarısız olduysa
    console.log("URL:", pathname);
    console.log("URL'den ilan ID çıkarılamadı!");
    
    return null;
  };
  
  // URL'den kategori ve ilan ID kontrolü yapma fonksiyonu
  const validateUrlIntegrity = (product) => {
    try {
      if (!product) return true; // Ürün yoksa validasyon gerekmiyor

      // Dashboard, düzenleme, önizleme veya standart ilan rotalarında kategori bütünlük kontrolü atlanır
      if (
        pathname.includes('/ilan/') ||
        pathname.startsWith('/dashboard') ||
        pathname.includes('/dashboard/') ||
        pathname.includes('/duzenle') ||
        pathname.includes('/hizmet-alanlari')
      ) {
        return true;
      }
      
      // URL'den kategori kısmını çıkar
      const urlCategory = urlService.extractCategoryFromUrl(pathname);
      
      // Kategori kısmı yoksa sorun yok
      if (!urlCategory) {
        return true;
      }
      
      // İlanın kategori ID'si varsa kontrol et (kullanıcıyı 404'e fırlatma, sadece logla)
      if (product.category_id) {
        const isValid = urlService.validateCategoryMatch(urlCategory, product.category_id);
        if (!isValid) {
          console.warn(`URL'deki kategori (${urlCategory}) ile ilan kategorisi (ID: ${product.category_id}) eşleşmiyor`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('URL bütünlük kontrolü sırasında hata:', error);
      return true; // Hata durumunda varsayılan olarak geçerli kabul et
    }
  };
  
  const productId = getProductId();
  console.log("Kullanılan ilan ID:", productId);
  
  // Ürün detaylarını yükleme
  useEffect(() => {
    // Komponent unmount edildiğinde state güncellemelerini önlemek için flag
    let isMounted = true;
    
    const loadProductDetails = async () => {
      if (!productId) {
        // Preview modunda productId null olabilir, bu durumda loading'i false yap
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      
      // Eski hata kontrolü - artık sadece productId yoksa return ediyoruz
      if (!productId) {
        console.error("Geçersiz ürün ID. URL kontrolü yapılmalı.");
        setError('Geçersiz ürün ID');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log("Ürün detayları yükleniyor, ID:", productId);
        
        // Komponent unmount edildiyse işlemi durdur
        if (!isMounted) return;
        
        // Ürün verilerini API'den yükleme (normal mod)
        const response = await productDetailService.getProductDetail(productId);
        
        // Komponent unmount edildiyse işlemi durdur
        if (!isMounted) return;
        
        console.log("Ürün detayları yanıtı:", response);
        
        if (response.success && response.data) {
          const productData = response.data;
          
          // URL bütünlük kontrolü yap
          const isUrlValid = validateUrlIntegrity(productData);
          
          // URL yönlendirmesi yapıldıysa, state güncellemeyi durdur
          if (!isUrlValid || !isMounted) {
            return;
          }
          
          setProduct(productData);
          
          console.log("Ürün verisi:", productData);
          
          // İlan favorilerde mi kontrolü - sadece giriş yapılmışsa (favoriler auth gerektirir,
          // misafir kullanıcı için token olmadan istek atılırsa backend 401 döner)
          if (isAuthenticated) {
            checkFavoriteStatus(productId);
          } else {
            setIsFavorite(false);
          }
          
          // Sayfa başlığını API'den gelen veriye göre ayarla (istenilen forma göre güncellendi)
          document.title = productData.baslik ? decodeHtmlEntities(productData.baslik) : 'ilan başlığı';
          
          // Artık API yanıtında ilan_sahibi bilgisi doğrudan geliyor
          if (productData.ilan_sahibi) {
            console.log("İlan sahibi bilgisi alındı:", productData.ilan_sahibi);
            console.log("İlan sahibi adı:", productData.ilan_sahibi.name, 
                       "ID:", productData.ilan_sahibi.id, 
                       "Veri tipi (name):", typeof productData.ilan_sahibi.name);
            setSeller(productData.ilan_sahibi);
          } else {
            // Geliştirme aşamasında bir uyarı olarak konsola yazdıralım
            console.warn("API: İlana ait satıcı bilgisi bulunamadı.");
            // Varsa vardır yoksa yoktur prensibi - seller undefined olarak kalacak
          }
          
          // Benzer ürünleri yükleme kısmını aşağıda ayrı bir kısımda yapacağız
        } else {
          if (isMounted) {
            setError(response.message || 'Ürün bilgileri yüklenirken bir hata oluştu.');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Ürün detay yükleme hatası:', err);
          setError('Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadProductDetails();
    
    // Benzer ürünleri ayrı bir asenkron işlemde yükle
    const loadSimilarProducts = async () => {
      if (!productId || !isMounted) return;
      
      try {
        const similarResponse = await productDetailService.getSimilarProducts(productId);
        if (similarResponse.success && similarResponse.data && isMounted) {
          setSimilarProducts(similarResponse.data);
        }
      } catch (err) {
        console.error('Benzer ürün yükleme hatası:', err);
      }
    };
    
    loadSimilarProducts();
    
    // Cleanup fonksiyonu - unmount durumunda state güncellemelerini önle
    return () => {
      isMounted = false;
    };
  }, [productId, pathname, isAuthenticated]); // URL değiştiğinde veya giriş durumu değişince yeniden yükle
  
  // Favori durumunu kontrol et
  const checkFavoriteStatus = async (listingId) => {
    try {
      const response = await favoriteService.checkFavoriteStatus(listingId);
      if (response.success) {
        setIsFavorite(response.data.isFavorite);
      }
    } catch (err) {
      console.error('Favori durum kontrolü hatası:', err);
    }
  };
  
  // LocalStorage değişikliklerini dinle (aynı tab veya farklı tab)
  useEffect(() => {
    if (!productId) return;
    
    // Performans optimizasyonu: Sadece bu ilan için event'leri işle
    const handleFavoriteUpdate = (e) => {
      // Sadece bu ilanın favorisi değiştiyse güncelle
      if (e.detail && e.detail.listingId && e.detail.listingId.toString() === productId.toString()) {
        console.log(`🔥 İlan Detay ${productId}: Favori durumu güncellendi`);
        setIsFavorite(e.detail.isFavorite);
      }
    };
    
    // Storage event listener (farklı tab'lardaki değişiklikler için)
    const handleStorageChange = (e) => {
      if (e.key === 'acillazim_favorite_items') {
        checkFavoriteStatus(productId);
      }
    };
    
    window.addEventListener('acillazim-favorite-update', handleFavoriteUpdate);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('acillazim-favorite-update', handleFavoriteUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [productId]);
  
  // Favorilere ekleme/çıkarma işlemi (ProductCard gibi basit çalışır)
  const handleToggleFavorite = async () => {
    // Giriş kontrolü - Oturum açık değilse giriş sayfasına yönlendir
    if (!isAuthenticated) {
      console.log('⚠️ Favorileme için giriş gerekli. Kullanıcı giriş sayfasına yönlendiriliyor.');
      router.push('/giris');
      return;
    }
    
    try {
      if (isFavorite) {
        // Favorilerden çıkar
        const response = await favoriteService.removeFromFavorites(productId);
        if (response.success) {
          setIsFavorite(false);
          
          // Diğer bileşenleri bilgilendir
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('acillazim-favorite-update', { 
              detail: { listingId: productId, isFavorite: false }
            }));
          }, 50);
        }
      } else {
        // Favorilere ekle: Liste seçim modalını tetikle
        window.dispatchEvent(
          new CustomEvent('acillazim-open-favorite-modal', {
            detail: { listingId: productId, listingData: product }
          })
        );
      }
    } catch (err) {
      console.error('Favori işlemi hatası:', err);
    }
  };
  
  // Telefon numarasını göster/gizle
  const togglePhoneNumber = () => {
    setShowPhoneNumber(!showPhoneNumber);
  };
  
  // Emlak özellikleri için etiket render fonksiyonu
  const renderPropertyTag = (tagText, tagValue) => {
    if (!tagValue) return null;
    
    return {
      tagText,
      tagValue
    };
  };
  
  // Alan adını formatlayan fonksiyon
  const formatPropertyName = (key) => {
    if (!key) return '';
    
    // Bazı özel durumlar için kontrol
    if (key.toLowerCase() === 'm2' || key.toLowerCase() === 'metrekare') return 'm²';
    
    // Snake case (oda_sayisi) veya camelCase (odaSayisi) formatını normal metne çevirme
    return key
      .replace(/_/g, ' ') // oda_sayisi -> oda sayisi
      .replace(/([A-Z])/g, ' $1') // odaSayisi -> oda Sayisi
      .replace(/^\w/, c => c.toUpperCase()) // İlk harfi büyük yap
      .replace(/\s\w/g, match => match.toUpperCase()); // Boşluktan sonra gelen harfleri büyük yap
  };
  
  // Telefon numarasını formatla
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    // Sadece rakamları al
    const numbers = phone.replace(/\D/g, '');
    
    // İlk karakterleri kontrol et ve gereken şekilde "+90" ekle
    let formattedNumber = '';
    if (numbers.startsWith('90')) {
      // Eğer 90 ile başlıyorsa, doğrudan "+90" formatla
      formattedNumber = `+90 (${numbers.substring(2, 5)}) ${numbers.substring(5, 8)} ${numbers.substring(8, 10)} ${numbers.substring(10, 12)}`;
    } else if (numbers.startsWith('0')) {
      // 0 ile başlıyorsa, 0'ı kaldır ve "+90" ekle
      formattedNumber = `+90 (${numbers.substring(1, 4)}) ${numbers.substring(4, 7)} ${numbers.substring(7, 9)} ${numbers.substring(9, 11)}`;
    } else {
      // Direkt ulusal format, "+90" ekle
      formattedNumber = `+90 (${numbers.substring(0, 3)}) ${numbers.substring(3, 6)} ${numbers.substring(6, 8)} ${numbers.substring(8, 10)}`;
    }
    
    return formattedNumber;
  };
  
  // Formatlanmış fiyat
  const getFormattedPrice = () => {
    if (!product || !product.fiyat) return "0";
    return new Intl.NumberFormat('tr-TR').format(product.fiyat);
  };

  return {
    // State'ler
    product,
    seller,
    similarProducts,
    loading,
    error,
    isFavorite,
    activeTab,
    showPhoneNumber,
    
    // Actions/Setters
    setActiveTab,
    
    // İşlem fonksiyonları
    handleToggleFavorite,
    togglePhoneNumber,
    formatPhoneNumber,
    formatPropertyName,
    renderPropertyTag,
    getFormattedPrice,

    router,
  };
};

export default useProductDetailController; 