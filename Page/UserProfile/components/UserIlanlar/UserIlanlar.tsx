"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import './UserIlanlar.css';

// İlan kartı bileşeni
import ProductCard from '@/components/ProductCard/ProductCard';

// Servisler
import userIlanService from '@/services/profile/userIlanService';
import BaseListingsService from '@/services/listings/base/baseListingsService';

/**
 * Kullanıcı ilanlarını sergileyen bileşen
 * @param {Object} props - Bileşen özellikleri
 * @param {string} props.userId - Kullanıcı ID'si
 * @param {Object} props.filters - İlan filtreleri
 * @param {Function} props.onFilterChange - Filtre değiştiğinde çalışacak fonksiyon
 * @param {string} props.viewMode - Görünüm modu (grid, list)
 * @param {Function} props.onListingCountChange - İlan sayısı değiştiğinde çağrılan fonksiyon
 */
const UserIlanlar = ({ userId, filters, onFilterChange, viewMode = 'grid', onListingCountChange }) => {
  // Durumlar
  const [ilanlar, setIlanlar] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [kategoriler, setKategoriler] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0
  });
  
  // Kategori servisini oluştur
  const listingService = useMemo(() => new BaseListingsService(), []);

  // İlanları yükle
  useEffect(() => {
    const loadIlanlar = async () => {
      if (!userId) {
        setError('Kullanıcı kimliği bulunamadı');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        console.log('[UserIlanlar] İlanlar yükleniyor, ID:', userId);
        console.log('[UserIlanlar] Filtreler:', filters);
        
        // userIlanService ile ilanları getir
        const response = await userIlanService.getUserIlanlar(userId, filters);
        
        if (response.success) {
          const listings = response.data.listings || [];
          setIlanlar(listings);
          setPagination(response.data.pagination || {});
          setIsEmpty(listings.length === 0);
          console.log('[UserIlanlar] Yüklenen ilan sayısı:', listings.length);
          
          // İlan sayısını üst bileşene bildir
          if (onListingCountChange && typeof onListingCountChange === 'function') {
            // Toplam ilan sayısını gönder
            onListingCountChange(response.data.pagination?.total || listings.length || 0);
          }
          
          // Ana kategorileri çıkar - sadece istatistik için, filtreleme için kullanılmayacak
          await extractCategories(listings);
        } else {
          setError(response.message || 'İlanlar yüklenemedi');
          setIsEmpty(true);
          console.error('[UserIlanlar] Yükleme hatası:', response.message);
          
          // İlan sayısını sıfırla
          if (onListingCountChange && typeof onListingCountChange === 'function') {
            onListingCountChange(0);
          }
        }
      } catch (error) {
        console.error('[UserIlanlar] Hata:', error);
        setError('İlanlar yüklenirken bir hata oluştu');
        setIsEmpty(true);
        
        // İlan sayısını sıfırla
        if (onListingCountChange && typeof onListingCountChange === 'function') {
          onListingCountChange(0);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadIlanlar();
  }, [userId, filters, listingService]);
  
  // İlanlardan ana kategorileri çıkarır ve sayılarını hesaplar
  const extractCategories = async (listings) => {
    try {
      // Her ilanın kategori bilgilerini al
      const kategoriBilgileri = {};
      const toplamIlanSayisi = listings.length;
      
      // Tüm ilanlar içindeki kategorilerin sayılarını hesapla
      // Bu bize toplam mevcut kategorileri verir, filtre uygulandığında bile
      const tumKategoriler = await userIlanService._dev.loadAllData(); 
      const tumKategoriBilgileri = {};
      
      // Orijinal kategorileri topla
      for (const ilan of tumKategoriler) {
        if (!ilan.category_id || ilan.user_id !== parseInt(userId)) continue;
        
        // Kategori yolundan ana kategori alınır
        let anaKategori = null;
        
        // 1. Kategori yolu varsa ilk eleman ana kategoridir
        if (ilan.kategoriYolu && Array.isArray(ilan.kategoriYolu) && ilan.kategoriYolu.length > 0) {
          anaKategori = ilan.kategoriYolu[0];
        } 
        // 2. Kategori yolu yoksa diğer alanları kontrol et
        else {
          anaKategori = ilan.kategori || ilan.categories || 
                       (ilan.display_category) || 
                       listingService.getKategoriAdi(ilan.category_id);
        }
        
        if (anaKategori) {
          if (!tumKategoriBilgileri[anaKategori]) {
            tumKategoriBilgileri[anaKategori] = 1;
          } else {
            tumKategoriBilgileri[anaKategori]++;
          }
        }
      }
      
      // Filtre sonrası aktif kategorileri topla (istatistik için)
      for (const ilan of listings) {
        if (!ilan.category_id) continue;
        
        let anaKategori = null;
        
        if (ilan.kategoriYolu && Array.isArray(ilan.kategoriYolu) && ilan.kategoriYolu.length > 0) {
          anaKategori = ilan.kategoriYolu[0];
        } else {
          anaKategori = ilan.kategori || ilan.categories || 
                       (ilan.display_category) || 
                       listingService.getKategoriAdi(ilan.category_id);
        }
        
        if (anaKategori) {
          if (!kategoriBilgileri[anaKategori]) {
            kategoriBilgileri[anaKategori] = 1;
          } else {
            kategoriBilgileri[anaKategori]++;
          }
        }
      }
      
      // Kategori dizisini oluştur (önce "Tümü" kategorisi)
      const kategorilerDizisi = [
        { id: 'all', name: 'Tüm Kategoriler', count: toplamIlanSayisi }
      ];
      
      // Toplam kategorileri ekle, filtre sonrası sayılarla güncelle
      Object.keys(tumKategoriBilgileri).forEach(kategoriAdi => {
        // Filtre sonrası bu kategoride kaç ilan kaldı?
        const aktifSayi = kategoriBilgileri[kategoriAdi] || 0;
        
        kategorilerDizisi.push({
          id: kategoriAdi,
          name: kategoriAdi,
          count: aktifSayi, // Mevcut filtrelere göre kalan ilan sayısı
          totalCount: tumKategoriBilgileri[kategoriAdi] // Toplam ilan sayısı (filtresiz)
        });
      });
      
      console.log('[UserIlanlar] Kategoriler çıkarıldı:', kategorilerDizisi);
      setKategoriler(kategorilerDizisi);
      
      // Mevcut filter-bar__category-filter bölümünü bulup içeriğini güncelle
      updateCategoryFilterSection(kategorilerDizisi);
    } catch (error) {
      console.error('[UserIlanlar] Kategoriler çıkarılırken hata:', error);
    }
  };
  
  // Mevcut filter-bar__category-filter bölümünü güncelle
  const updateCategoryFilterSection = (kategoriler) => {
    try {
      // Sayfadaki mevcut kategori filtre bölümünü bul
      const filterSection = document.querySelector('.filter-bar__category-filter');
      
      // Eğer böyle bir eleman yoksa işlemi atla
      if (!filterSection) {
        console.warn('Kategori filtre bölümü bulunamadı');
        return;
      }
      
      // Kategori seçenekleri container'ını bul veya oluştur
      let optionsContainer = filterSection.querySelector('.filter-bar__category-options');
      
      // Eğer container yoksa oluştur
      if (!optionsContainer) {
        optionsContainer = document.createElement('div');
        optionsContainer.className = 'filter-bar__category-options';
        filterSection.appendChild(optionsContainer);
      } else {
        // Varsa içeriğini temizle
        optionsContainer.innerHTML = '';
      }
      
      // Kategori butonlarını oluştur
      kategoriler.forEach(kategori => {
        // Aktif kategori kontrolü - her türlü kategori bilgisini kontrol et
        const isActive = (() => {
          // Tüm kategoriler durumu
          if (kategori.id === 'all' && (!filters.categoryName && !filters.mainCategory && (filters.category === 'all' || !filters.category))) {
            return true;
          }
          
          // Kategori ID, isim veya ana kategori eşleşmesi (büyük-küçük harf duyarsız)
          if (kategori.id !== 'all') {
            const kategoriId = kategori.id.toString().toLowerCase();
            const kategoriName = kategori.name.toString().toLowerCase();
            
            const filterCategoryName = filters.categoryName ? filters.categoryName.toString().toLowerCase() : '';
            const filterMainCategory = filters.mainCategory ? filters.mainCategory.toString().toLowerCase() : '';
            const filterCategory = filters.category && filters.category !== 'all' ? filters.category.toString().toLowerCase() : '';
            
            return kategoriId === filterCategoryName || 
                   kategoriId === filterMainCategory || 
                   kategoriId === filterCategory ||
                   kategoriName === filterCategoryName || 
                   kategoriName === filterMainCategory || 
                   kategoriName === filterCategory;
          }
          
          return false;
        })();
        
        const categoryOption = document.createElement('div');
        categoryOption.className = `filter-bar__category-option ${isActive ? 'active' : ''}`;
        
        // İlan sayısı 0 olan kategoriler için özel stil
        const ilanSayisi = kategori.count || 0;
        const toplamIlanSayisi = kategori.totalCount || ilanSayisi;
        
        if (ilanSayisi === 0 && kategori.id !== 'all') {
          categoryOption.classList.add('empty-category');
        }
        
        categoryOption.innerHTML = kategori.name;
        
        // Kategori sayısını ekle (Tüm Kategoriler hariç)
        if (kategori.id !== 'all') {
          const countSpan = document.createElement('span');
          countSpan.className = 'kategori-count';
          
          // Eğer filtreleme sonucu sayı değiştiyse, değişimi göster
          if (ilanSayisi !== toplamIlanSayisi && toplamIlanSayisi > 0) {
            countSpan.textContent = `(${ilanSayisi}/${toplamIlanSayisi})`;
          } else {
            countSpan.textContent = `(${toplamIlanSayisi})`;
          }
          
          categoryOption.appendChild(countSpan);
        }
        
        // Tıklama olayını ekle
        categoryOption.addEventListener('click', () => {
          // Aktif kategoriyi değiştir ve filtrele
          if (kategori.id === 'all') {
            // Tüm kategoriler seçildiyse filtre temizlenir
            onFilterChange({ ...filters, category: 'all', categoryName: null, mainCategory: null });
          } else {
            // Kategori ismini kullanarak filtreleme yapalım
            onFilterChange({ 
              ...filters, 
              category: 'all',  // category parametresi sıfırlanır
              categoryName: kategori.name, // Direkt kategori adını kullan
              mainCategory: null 
            });
            
            // Kategori seçildiğini konsola kaydet
            console.log(`[UserIlanlar] '${kategori.name}' kategorisi seçildi`);
          }
        });
        
        // Butonu container'a ekle
        optionsContainer.appendChild(categoryOption);
      });
      
      console.log('[UserIlanlar] Kategori filtre bölümü güncellendi');
    } catch (error) {
      console.error('[UserIlanlar] Kategori filtre bölümü güncellenirken hata:', error);
    }
  };

  // Favori durumu değiştiğinde
  const handleFavoriteToggle = (ilanId, isFavorite) => {
    console.log(`[UserIlanlar] İlan ${ilanId} favori durumu: ${isFavorite}`);
    // Gerçek API'de burada favorilere ekleme/çıkarma işlemi yapılacak
  };

  // İlana tıklandığında
  const handleProductClick = (ilanId) => {
    console.log(`[UserIlanlar] İlan tıklandı: ${ilanId}`);
    // Gerçek uygulamada analitik veya tıklama takibi için kullanılabilir
  };

  // Yükleniyor durumu
  if (isLoading) {
    return (
      <div className="ilanlar-grid">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="ilan-card-skeleton">
            <div className="ilan-image-skeleton"></div>
            <div className="ilan-content-skeleton">
              <div className="ilan-title-skeleton"></div>
              <div className="ilan-price-skeleton"></div>
              <div className="ilan-meta-skeleton"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <div className="ilanlar-error">
        <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
        <h3>Bir hata oluştu</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Tekrar Dene
        </button>
      </div>
    );
  }

  // İlan yok durumu
  if (isEmpty || ilanlar.length === 0) {
    return (
      <div className="ilanlar-empty">
        <FontAwesomeIcon icon={faInfoCircle} className="info-icon" />
        <h3>İlan Bulunamadı</h3>
        <p>Bu kriterlere uygun ilan bulunmamaktadır.</p>
      </div>
    );
  }

  // Ana içerik
    return (
    <div>
      <div className={`ilanlar-${viewMode}`}>
        {ilanlar.map((ilan) => (
          <div key={ilan.ilan_id} className={viewMode === 'grid' ? 'ilan-card-wrapper' : 'ilan-list-item'}>
            <ProductCard
              product={ilan}
              viewType={viewMode as 'grid' | 'list'}
              onFavoriteToggle={handleFavoriteToggle}
              onProductClick={handleProductClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserIlanlar; 