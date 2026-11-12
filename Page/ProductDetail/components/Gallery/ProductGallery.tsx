"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ProductGallery.css';
import ListingBadge from '@/components/common/ListingBadge/ListingBadge';
import { FaChevronLeft, FaChevronRight, FaTimes, FaPlay, FaPause, FaExpand, FaCompress } from 'react-icons/fa';

// product parametresi ile tüm ilan verisini alabiliriz
const ProductGallery = ({ product }) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lightboxImageLoaded, setLightboxImageLoaded] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const videoRef = useRef(null);
  const lightboxRef = useRef(null);

  // Varsayılan resim URL'si
  const defaultImage = '/placeholder-property.jpg';
  
  // Medya içeriğini normalize et (resim veya video olabilir)
  const normalizeMedia = () => {
    const mediaItems = [];
    
    // Video kontrolü - API'den gelen video alanlarını kontrol et
    if (product?.video_url) {
      // YouTube URL'si mi kontrol et
      const isYouTube = product.video_url.includes('youtube.com') || product.video_url.includes('youtu.be');
      
      mediaItems.push({
        type: isYouTube ? 'youtube' : 'video',
        url: product.video_url,
        // Video thumbnail yoksa, ilk resmi veya varsayılan resmi kullan
        thumbnail: product.resimler && product.resimler.length > 0 ? product.resimler[0] : defaultImage
      });
    }
    
    // Resimler dizisini kontrol et
    if (product?.resimler && product.resimler.length > 0) {
      // Resimleri diziye ekle
      product.resimler.filter(img => img).forEach(img => {
        mediaItems.push({
          type: 'image',
          url: img
        });
      });
    } else if (product?.images && product.images.length > 0) {
      // Alternatif anahtar adı kullanıldıysa
      product.images.filter(img => img).forEach(img => {
        mediaItems.push({
          type: 'image',
          url: img
        });
      });
    }
    
    // Hiçbir medya bulunamazsa varsayılan resmi göster
    if (mediaItems.length === 0) {
      mediaItems.push({
        type: 'image',
        url: defaultImage
      });
    }
    
    return mediaItems;
  };
  
  const normalizedMedia = normalizeMedia();
  
  // YouTube video ID'sini çıkar
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    
    // YouTube URL formatlarını kontrol et
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  };
  
  // Video kontrolü
  useEffect(() => {
    // Video oynatma/durdurma özelliği
    const currentMedia = normalizedMedia[currentMediaIndex];
    if (currentMedia.type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentMediaIndex, normalizedMedia]);
  
  // ESC tuşuna basıldığında lightbox'ı kapat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isLightboxOpen) {
        closeLightbox();
      } else if (e.key === 'ArrowLeft' && isLightboxOpen) {
        handlePrevious();
      } else if (e.key === 'ArrowRight' && isLightboxOpen) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, currentMediaIndex]);

  // Lightbox açıldığında dokunmatik kaydırma için etkinleştir
  useEffect(() => {
    if (isLightboxOpen && lightboxRef.current) {
      let touchStartX = 0;
      let touchEndX = 0;

      const handleTouchStart = (e) => {
        touchStartX = e.changedTouches[0].screenX;
      };

      const handleTouchEnd = (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      };

      const handleSwipe = () => {
        if (touchEndX < touchStartX - 70) {
          // Sola kaydırma
          handleNext();
        } else if (touchEndX > touchStartX + 70) {
          // Sağa kaydırma
          handlePrevious();
        }
      };

      const lightboxElement = lightboxRef.current;
      lightboxElement.addEventListener('touchstart', handleTouchStart);
      lightboxElement.addEventListener('touchend', handleTouchEnd);

      return () => {
        lightboxElement.removeEventListener('touchstart', handleTouchStart);
        lightboxElement.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isLightboxOpen, lightboxRef.current]);
  
  // Video oynatma işlemleri
  const togglePlayPause = (e) => {
    e.stopPropagation(); // Ana konteyner tıklamasını engelle
    setIsPlaying(!isPlaying);
  };

  // Önceki medyaya geçiş
  const handlePrevious = () => {
    setLightboxImageLoaded(false);
    setAnimationClass('slide-right');
    setTimeout(() => {
      setCurrentMediaIndex((prevIndex) => {
        const newIndex = prevIndex === 0 ? normalizedMedia.length - 1 : prevIndex - 1;
        // Video oynatılıyorsa durdur (yeni medyaya geçerken)
        setIsPlaying(false);
        return newIndex;
      });
      setAnimationClass('');
    }, 300);
  };

  // Sonraki medyaya geçiş
  const handleNext = () => {
    setLightboxImageLoaded(false);
    setAnimationClass('slide-left');
    setTimeout(() => {
      setCurrentMediaIndex((prevIndex) => {
        const newIndex = prevIndex === normalizedMedia.length - 1 ? 0 : prevIndex + 1;
        // Video oynatılıyorsa durdur (yeni medyaya geçerken)
        setIsPlaying(false);
        return newIndex;
      });
      setAnimationClass('');
    }, 300);
  };

  // Lightbox modunu aç/kapat
  const openLightbox = () => {
    setIsLightboxOpen(true);
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    setIsPlaying(false); // Lightbox kapanırken videoyu durdur
  };

  const getListingType = (product) => {
    if (product?.ilan_turu) {
      return product.ilan_turu;
    }
    return null;
  };
  
  // Medya türüne göre içeriği render et
  const renderMedia = (media, inLightbox = false) => {
    if (media.type === 'youtube') {
      const videoId = getYouTubeVideoId(media.url);
      if (!videoId) return <div>Video yüklenemedi</div>;
      
      return (
        <div className="product-detail-gallery-video-container">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? '1' : '0'}&rel=0`}
            title="YouTube video"
            className="product-detail-gallery-video"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            width="100%"
            height="100%"
            frameBorder="0"
          ></iframe>
        </div>
      );
    } else if (media.type === 'video') {
      return (
        <div className="product-detail-gallery-video-container">
          <video
            ref={videoRef}
            src={media.url}
            className="product-detail-gallery-video"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause(e);
            }}
            controls={inLightbox}
            poster={media.thumbnail}
            preload="metadata"
          />
          {!inLightbox && (
            <div className="product-detail-gallery-video-controls">
              <button
                className="product-detail-gallery-video-control"
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Duraklat" : "Oynat"}
              >
                {isPlaying ? <FaPause /> : <FaPlay />}
              </button>
            </div>
          )}
        </div>
      );
    }
    
    // Resim içeriği için
    if (inLightbox) {
      return (
        <div 
          className={`lightbox-image-container ${animationClass}`}
        >
          <img 
            src={media.url} 
            alt={product?.title || 'Ürün'} 
            className="product-detail-gallery-lightbox-image"
            onLoad={() => setLightboxImageLoaded(true)}
          />
        </div>
      );
    }
    
    return (
      <img 
        src={media.url} 
        alt={product?.title || 'Ürün'} 
        className="product-detail-gallery-main-preview-image"
      />
    );
  };

  return (
    <div className="product-detail-product-gallery">
      <div className="product-detail-gallery-main-image-container">
        <div 
          className={`product-detail-gallery-main-image ${normalizedMedia[currentMediaIndex].type === 'video' ? 'video-content' : ''}`} 
          onClick={normalizedMedia[currentMediaIndex].type === 'video' ? undefined : openLightbox}
        >
          {renderMedia(normalizedMedia[currentMediaIndex])}
          
          {getListingType(product) && (
            <div className="listing-badge-container">
              <ListingBadge type={getListingType(product)} isCard={false} />
            </div>
          )}
          
          {normalizedMedia[currentMediaIndex].type === 'video' && (
            <div className="media-type-indicator video">
              <FaPlay />
            </div>
          )}
          
          {normalizedMedia[currentMediaIndex].type !== 'video' && (
            <button 
              className="expand-button" 
              onClick={openLightbox}
              aria-label="Resmi büyüt"
            >
              <FaExpand />
            </button>
          )}
        </div>
        
        {normalizedMedia.length > 1 && (
          <>
            <button 
              className="navigation-button prev" 
              onClick={handlePrevious}
              aria-label="Önceki medya"
            >
              <FaChevronLeft />
            </button>
            
            <button 
              className="navigation-button next" 
              onClick={handleNext}
              aria-label="Sonraki medya"
            >
              <FaChevronRight />
            </button>
            
            <div className="product-detail-gallery-image-counter">
              {currentMediaIndex + 1} / {normalizedMedia.length}
            </div>
          </>
        )}
      </div>
      
      {normalizedMedia.length > 1 && (
        <div className="product-detail-gallery-thumbnails">
          {normalizedMedia.map((media, index) => (
            <div
              key={index}
              className={`product-detail-gallery-thumbnail ${index === currentMediaIndex ? 'active' : ''} ${media.type === 'video' ? 'video-thumbnail' : ''}`}
              onClick={() => {
                setCurrentMediaIndex(index);
                setIsPlaying(false);
              }}
            >
              {media.type === 'video' ? (
                <>
                  <img 
                    src={media.thumbnail} 
                    alt={`Video küçük resim ${index + 1}`} 
                    onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = defaultImage;
                    }}
                  />
                  <div className="thumbnail-play-icon">
                    <FaPlay />
                  </div>
                </>
              ) : (
                <img src={media.url} alt={`Küçük resim ${index + 1}`} />
              )}
            </div>
          ))}
        </div>
      )}
      
      {isLightboxOpen && (
        createPortal(
          <div 
            className="modern-lightbox-overlay fade-in"
            onClick={closeLightbox}
            ref={lightboxRef}
          >
            <div 
              className="modern-lightbox-container slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modern-lightbox-header">
                <div className="modern-lightbox-counter">
                  {currentMediaIndex + 1} / {normalizedMedia.length}
                </div>
                <button 
                  className="modern-lightbox-close" 
                  onClick={closeLightbox}
                  aria-label="Lightbox'ı kapat"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="modern-lightbox-content">
                {renderMedia(normalizedMedia[currentMediaIndex], true)}
                
                {normalizedMedia.length > 1 && (
                  <>
                    <button
                      className="modern-lightbox-nav-button prev"
                      onClick={handlePrevious}
                      aria-label="Önceki medya"
                    >
                      <FaChevronLeft />
                    </button>
                    
                    <button
                      className="modern-lightbox-nav-button next"
                      onClick={handleNext}
                      aria-label="Sonraki medya"
                    >
                      <FaChevronRight />
                    </button>
                  </>
                )}
              </div>
              
              {normalizedMedia.length > 1 && (
                <div className="modern-lightbox-thumbnails">
                  {normalizedMedia.map((media, index) => (
                    <div
                      key={index}
                      className={`modern-lightbox-thumbnail ${index === currentMediaIndex ? 'active' : ''}`}
                      onClick={() => {
                        setLightboxImageLoaded(false);
                        setCurrentMediaIndex(index);
                      }}
                    >
                      {media.type === 'video' || media.type === 'youtube' ? (
                        <div className="video-thumbnail-indicator">
                          <img 
                            src={media.thumbnail || media.url} 
                            alt={`Thumbnail ${index + 1}`}
                            onError={(e) => { e.target.onerror = null; e.target.src = defaultImage; }}
                          />
                          <FaPlay className="thumbnail-play-icon" />
                        </div>
                      ) : (
                        <img src={media.url} alt={`Thumbnail ${index + 1}`} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
};

export default ProductGallery; 