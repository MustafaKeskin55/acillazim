"use client";

import React, { useState, useEffect, useRef } from 'react';
import './SimilarProducts.css';
import { getSimilarProducts } from '@/services/products/similarProductsService';
import ProductCard from '@/components/ProductCard/ProductCard';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

/**
 * Benzer ilanları gösteren bileşen
 * @param {Object} props - Bileşen özellikleri
 * @param {Number} props.productId - Aktif ilan ID'si
 * @param {Number} props.categoryId - Aktif ilanın kategori ID'si
 * @param {Number} props.limit - Gösterilecek benzer ilan sayısı
 */
const SimilarProducts = ({ productId, categoryId, limit = 50 }) => {
  // State tanımlamaları
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const sliderRef = useRef(null);

  // Debug: parametre kontrolü için console log
  console.log("SimilarProducts bileşenine gelen parametreler:", {
    productId, 
    categoryId, 
    limit, 
    productIdType: typeof productId,
    categoryIdType: typeof categoryId
  });

  // Benzer ürünleri yükle
  useEffect(() => {
    // Parametreler yoksa işlem yapma
    if (!productId || !categoryId) {
      console.warn('Benzer ürünler için productId ve categoryId gereklidir');
      setLoading(false);
      setError("Benzer ilanlar için gerekli parametreler eksik");
      return;
    }

    // Benzer ürünleri getir
    const fetchSimilarProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Benzer ürünler getiriliyor:", productId, categoryId, limit);

        // Servisten benzer ürünleri getir
        const result = await getSimilarProducts(productId, categoryId, limit);
        console.log("Benzer ürünler sonucu:", result);

        if (!result.success) {
          throw new Error(result.error || 'Benzer ürünler yüklenemedi');
        }

        // ID'lere göre benzersiz ürünleri filtrele
        // Eğer servisten gelen veriler arasında duplicate varsa burada da filtreliyoruz
        const uniqueProducts = filterUniqueProducts(result.data || []);
        
        // Başarıyla alınan ürünleri state'e kaydet
        setSimilarProducts(uniqueProducts);
      } catch (err) {
        console.error('Benzer ürünler yüklenirken hata oluştu:', err);
        setError(err.message || 'Benzer ürünler yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarProducts();
  }, [productId, categoryId, limit]); // Dependency array
  
  // Benzersiz ürünleri filtreleme fonksiyonu
  const filterUniqueProducts = (products) => {
    // Ürünleri ID'lerine göre filtrelemek için bir Set kullanıyoruz
    const uniqueIds = new Set();
    const uniqueProducts = [];
    
    for (const product of products) {
      const productId = String(product.id || product.ilan_id);
      
      if (!uniqueIds.has(productId) && productId) {
        uniqueIds.add(productId);
        uniqueProducts.push(product);
      } else {
        console.log(`Duplicate ürün filtrelendi: ${productId}`);
      }
    }
    
    console.log(`${products.length} üründen ${uniqueProducts.length} benzersiz ürün bulundu`);
    return uniqueProducts;
  };
  
  // Slider'ı başlat ve durdur
  useEffect(() => {
    // Slider bileşeni hazır olduğunda ve veri yüklendiğinde
    if (sliderRef.current && similarProducts.length > 0 && !loading) {
      console.log("Slider başlatılıyor...");
      
      // Slider'ı yeniden başlat
      sliderRef.current.slickPlay();
      
      // Component unmount olduğunda slider'ı durdur
      return () => {
        if (sliderRef.current) {
          sliderRef.current.slickPause();
        }
      };
    }
  }, [similarProducts, loading]);

  // Slider ayarları
  const settings = {
    dots: false,
    infinite: similarProducts.length > 3, // 3'ten fazla ilan varsa sonsuz döngü yap
    speed: 500,
    slidesToShow: 4, // 4 kartı yan yana göster
    slidesToScroll: 1,
    autoplay: similarProducts.length > 3, // Sadece yeterli ilan varsa otomatik oynat
    autoplaySpeed: 3000,
    pauseOnHover: true,
    cssEase: 'linear',
    swipe: true,
    arrows: true,
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

  // Debug için bileşen durumunu yazdır
  console.log("SimilarProducts bileşen durumu:", {
    loading,
    error,
    productsCount: similarProducts.length
  });

  // İçerik yoksa gösterme
  if (!loading && (!similarProducts || similarProducts.length === 0)) {
    console.log("Benzer ürün bulunamadı, bileşen null döndürüyor");
    return null;
  }
  
  return (
    <div className="related-products-container">
      <h2 className="related-listings-header">Benzer İlanlar</h2>
      
      {loading && (
        <div className="product-detail-similar-listings-loading">
          Benzer ilanlar yükleniyor...
        </div>
      )}
              
      {error && (
        <div className="product-detail-similar-listings-error">
          {error}
        </div>
      )}
      
      {!loading && similarProducts.length > 0 && (
        <div className="related-slider-wrapper">
          <Slider ref={sliderRef} {...settings} className="related-slider">
            {similarProducts.map((product) => {
              // Benzersiz key değeri için product.id mevcut değilse yedek değer kullan
              const uniqueKey = `similar-product-${product.id || product.ilan_id || Math.random()}`;
              
              return (
                <div key={uniqueKey} className="related-card-wrapper">
                  {console.log("Product for card:", {
                    id: product.id,
                    title: product.title,
                    ilan_turu: product.ilan_turu,
                    listingType: product.listingType
                  })}
                  <ProductCard
                    product={{
                      ...product,
                      ilan_id: product.id || product.ilan_id,
                      title: product.title,
                      price: product.price,
                      kategori: product.topCategory || (product.categories && product.categories.toUpperCase()) || 'Diğer',
                      city: product.city || product.location || 'Belirtilmemiş',
                      img: product.image || (product.images && product.images.length > 0 ? product.images[0] : null),
                      category_id: product.category_id,
                      ilan_turu: product.ilan_turu || 'normal',
                      listingType: product.ilan_turu || 'normal'
                    }}
                    onFavoriteToggle={handleFavoriteToggle}
                    onProductClick={handleProductClick}
                  />
                </div>
              );
            })}
          </Slider>
        </div>
      )}
      
      {/* İlerletme butonları sadece ilanlar çok ise göster */}
      {similarProducts.length > 3 && (
        <>
          <button onClick={prevSlide} className="related-prev">
            <div className="icon-container">
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" className="icons" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <path fill="none" stroke-width="2" d="M18,12.4 L6,12.4 M11.4,7 L6,12.4 L11.4,17.8"></path>
              </svg>
            </div>
          </button>
          <button onClick={nextSlide} className="related-next">
            <div className="icon-container">
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" className="icons" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <path fill="none" stroke-width="2" d="M6,12.4 L18,12.4 M12.6,7 L18,12.4 L12.6,17.8"></path>
              </svg>
            </div>
          </button>
        </>
      )}
    </div>
  );
}

export default SimilarProducts; 