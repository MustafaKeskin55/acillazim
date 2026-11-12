"use client";

import React, { useState, useEffect, useRef } from 'react';
import './NearbyListings.css';
import { getCurrentUserNearbyListings } from '@/services/listings/nearbyListingsService';
import ProductCard from '@/components/ProductCard/ProductCard';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";
import { useLocation } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';

/**
 * Kullanıcının konumuna (ilçe) göre yakındaki ilanları gösteren bileşen
 * @param {Object} props - Bileşen özellikleri
 * @param {Number} props.limit - Gösterilecek maksimum ilan sayısı (varsayılan: 30)
 * @param {String|Number} props.currentProductId - Mevcut görüntülenen ürünün ID'si
 */
const NearbyListings = ({ limit = 30, currentProductId }) => {
  // Context'lerden veri al
  const { location, hasLocation } = useLocation();
  const { isAuthenticated } = useAuth();
  
  // State tanımlamaları
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [listings, setListings] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [detailedError, setDetailedError] = useState(null);
  const [shouldRender, setShouldRender] = useState(true); // Bileşenin gösterilip gösterilmeyeceği
  const sliderRef = useRef(null);

  // Debug için
  console.log("[NearbyListings] Bileşen yükleniyor - ProductID:", currentProductId, "Konum:", location);

  // Giriş yapmış kullanıcının auth token'ını localStorage'dan al
  const getToken = () => {
    return localStorage.getItem('auth_token');
  };

  // Yakındaki ilanları yükle
  useEffect(() => {
    // Kullanıcı giriş yapmamışsa veya konum yoksa çalışma
    if (!isAuthenticated || !hasLocation || !location?.city) {
      setLoading(false);
      setShouldRender(false);
      return;
    }
    
    const fetchNearbyListings = async () => {
      try {
        setLoading(true);
        setError(null);
        setDetailedError(null);
        
        const token = getToken();
        console.log("Token alındı:", token ? "Geçerli" : "Geçersiz");
        console.log("Kullanıcı konumu:", location);
        
        // Token kontrolü
        if (!token) {
          throw new Error('Oturum bilgisi bulunamadı. Lütfen giriş yapın.');
        }
        
        // LocationContext'ten alınan konum bilgileri ile ilanları getir
        const result = await getCurrentUserNearbyListings(token, location.district, location.city, limit, currentProductId);
        console.log("API cevabı:", result);
        
        // Konum bilgisini LocationContext'ten ayarla
        setUserLocation(`${location.city}${location.district ? ', ' + location.district : ''}`);
        
        if (!result.success) {
          // Detaylı hata bilgisi için
          const errorDetails = {
            message: result.error || 'Yakındaki ilanlar yüklenemedi',
            apiResponse: JSON.stringify(result),
            locationUsed: `${location.city}${location.district ? ', ' + location.district : ''}`,
            time: new Date().toLocaleTimeString()
          };
          setDetailedError(errorDetails);
          
          console.warn('[NearbyListings] API hatası:', result.error);
          
          // Hata olsa bile bileşeni göster (hata mesajı ile)
          setShouldRender(true);
          setError(result.error || 'Yakındaki ilanlar yüklenemedi');
          setListings([]);
        } else {
          // Başarıyla alınan ilanları state'e kaydet
          setListings(result.data || []);
          setError(null);
          
          // İlan sayısına göre render durumunu belirle
          if (!result.data || result.data.length === 0) {
            console.log('[NearbyListings] Konum için ilan bulunamadı, bileşen gizleniyor');
            setShouldRender(false);
          } else {
            console.log(`[NearbyListings] ${result.data.length} ilan bulundu, bileşen gösteriliyor`);
            setShouldRender(true);
          }
        }
      } catch (err) {
        console.error('Yakındaki ilanlar yüklenirken hata oluştu:', err);
        setError(err.message || 'Yakındaki ilanlar yüklenemedi');
        setShouldRender(false); // Hata durumunda da gösterme
      } finally {
        setLoading(false);
      }
    };
    
    fetchNearbyListings();
  }, [limit, currentProductId, location, hasLocation, isAuthenticated]);
  
  // Eğer gösterilmemesi gerekiyorsa null döndür
  if (!shouldRender || (listings.length === 0 && !loading)) {
    return null;
  }
  
  // Slider ayarları
  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    prevArrow: <button className="nrb-nearby-prev"><BsArrowLeft /></button>,
    nextArrow: <button className="nrb-nearby-next"><BsArrowRight /></button>,
    responsive: [
      {
        breakpoint: 1900,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 1700,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 1500,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 1300,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 576,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  };
  
  // Slider kontrolleri
  const nextSlide = () => {
    if (sliderRef.current) {
      sliderRef.current.slickNext();
    }
  };
  
  const prevSlide = () => {
    if (sliderRef.current) {
      sliderRef.current.slickPrev();
    }
  };
  
  // Favori değiştirme işlemi
  const handleFavoriteToggle = (productId, isFavorite) => {
    console.log(`Favori durumu değişti: ${productId}, Yeni durum: ${isFavorite}`);
  };
  
  // Ürüne tıklama işlemi
  const handleProductClick = (productId) => {
    console.log(`Ürüne tıklandı: ${productId}`);
  };
  
  // İlan türüne göre badge'ları render et
  const renderBadges = (listingType) => {
    return (
      <div className="nrb-nearby-badges">
        {listingType === 'acil' && (
          <span className="nrb-nearby-badge nrb-nearby-badge-urgent">Acil İlan</span>
        )}
        {listingType === 'yeni' && (
          <span className="nrb-nearby-badge nrb-nearby-badge-new">Yeni İlan</span>
        )}
        {listingType === 'jet' && (
          <span className="nrb-nearby-badge nrb-nearby-badge-featured">Jet İlan</span>
        )}
      </div>
    );
  };
  
  // Eğer yükleme devam ediyorsa ve henüz gösterilecek bir şey yoksa loading gösterme
  if (loading && listings.length === 0) {
    return null;
  }
  
  // İçerik render edilecekse
  return (
    <div className="nrb-nearby-products-container">
      <h2 className="nrb-nearby-listings-header">
        {location.district 
          ? `${location.district}, ${location.city} Çevresindeki İlanlar`
          : `${location.city} Çevresindeki İlanlar`
        }
      </h2>
      
      {loading && listings.length === 0 && (
        <div className="nrb-nearby-listings-loading">
          Çevremdeki ilanlar yükleniyor...
        </div>
      )}
      
      {error && (
        <div className="nrb-nearby-listings-error">
          <p><strong>{userLocation} için ilanlar yüklenemedi:</strong> {error}</p>
          <p className="nrb-error-suggestion">
            Lütfen konum seçiminizi kontrol edin veya daha sonra tekrar deneyin.
          </p>
          {detailedError && (
            <div className="nrb-error-details">
              <details>
                <summary>Teknik Detaylar</summary>
                <pre>{JSON.stringify(detailedError, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      )}
      
      {!loading && listings.length > 0 && (
        <div className="nrb-nearby-slider-wrapper">
          <Slider ref={sliderRef} {...settings} className="nrb-nearby-slider">
            {listings.map((listing) => {
              // listingType küçük harfe çevrilip temizleniyor
              const listingType = (listing.listingType || listing.ilan_turu || 'normal').toLowerCase().trim();
              
              // İlan türü debug (sadece geliştirme ortamında)
              if (process.env.NODE_ENV === 'development') {
                console.log(`[NearbyListings] İlan ${listing.id} türü: ${listingType}`);
              }
              
              return (
                <div key={listing.id} className="nrb-nearby-card-wrapper">
                  <div className="nrb-nearby-card-content">
                    <ProductCard
                      product={{
                        ilan_id: listing.ilan_id,
                        title: listing.baslik || listing.title,
                        price: listing.fiyat || listing.price,
                        kategori: listing.kategori || "DİĞER",
                        city: listing.city || listing.location || 'Belirtilmemiş',
                        ilce: listing.ilce || listing.district || '',
                        img: listing.img || listing.image,
                        category_id: listing.category_id,
                        ilan_turu: listingType, // küçük harfli temiz değeri geç
                        listingType: listingType, // küçük harfli temiz değeri geç
                        para_birimi: listing.para_birimi || "TL"
                      }}
                      onFavoriteToggle={handleFavoriteToggle}
                      onProductClick={handleProductClick}
                    />
                  </div>
                </div>
              );
            })}
          </Slider>
        </div>
      )}
      
      {/* İlerletme butonları her zaman görünsün */}
      <button onClick={prevSlide} className="nrb-nearby-prev">
        <div className="nrb-icon-container">
          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="icons" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
            <path fill="none" strokeWidth="2" d="M18,12.4 L6,12.4 M11.4,7 L6,12.4 L11.4,17.8"></path>
          </svg>
        </div>
      </button>
      <button onClick={nextSlide} className="nrb-nearby-next">
        <div className="nrb-icon-container">
          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="icons" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
            <path fill="none" strokeWidth="2" d="M6,12.4 L18,12.4 M12.6,7 L18,12.4 L12.6,17.8"></path>
          </svg>
        </div>
      </button>
    </div>
  );
};

export default NearbyListings; 