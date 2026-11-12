"use client";

import React, { useState, useEffect } from 'react';
import { FaExpand, FaChevronLeft, FaChevronRight, FaTimes, FaDownload } from 'react-icons/fa';
import './ServiceDetailGallery.css';

interface ServiceDetailGalleryProps {
  images?: string[];
  title?: string;
}

const ServiceDetailGallery: React.FC<ServiceDetailGalleryProps> = ({
  images = [],
  title = 'Portföy Galerisi',
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  // Klavye ile gezinme için useEffect
  useEffect(() => {
    if (selectedImageIndex === null) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        setSelectedImageIndex(prev => 
          prev === 0 ? images.length - 1 : prev - 1
        );
      } else if (e.key === 'ArrowRight') {
        setSelectedImageIndex(prev => 
          prev === images.length - 1 ? 0 : prev + 1
        );
      } else if (e.key === 'Escape') {
        setSelectedImageIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Scroll'u engelle
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Scroll'u geri aç
      document.body.style.overflow = 'auto';
    };
  }, [selectedImageIndex, images.length]);

  // Sağ tıklama ve sürükleme işlemlerini engelleme
  const preventImageDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // Klavye kısayollarını engelleme
  useEffect(() => {
    const preventKeyboardShortcuts = (e) => {
      // Ctrl+S, Ctrl+P, Ctrl+Shift+I, F12, Ctrl+U vb. engelle
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P' || e.key === 'u' || e.key === 'U')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.key === 'F12') ||
        (e.key === 'PrintScreen')
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Seçim işlemlerini engelleme
    const preventSelection = (e) => {
      if (e.target.tagName === 'IMG') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('keydown', preventKeyboardShortcuts);
    document.addEventListener('selectstart', preventSelection);

    return () => {
      document.removeEventListener('keydown', preventKeyboardShortcuts);
      document.removeEventListener('selectstart', preventSelection);
    };
  }, []);

  // Resim tıklama işlemi
  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
  };

  const closeModal = () => {
    setSelectedImageIndex(null);
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setSelectedImageIndex(prev => 
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setSelectedImageIndex(prev => 
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const handleThumbnailClick = (index) => {
    setSelectedImageIndex(index);
  };

  // Görsel büyütme modalı
  const renderImageModal = () => {
    if (selectedImageIndex === null) return null;
    
    const currentImage = images[selectedImageIndex];
    
    return (
      <div className="sd-gallery-modal" onClick={closeModal}>
        <div className="sd-gallery-modal-header">
          <button 
            className="sd-gallery-modal-close" 
            onClick={closeModal} 
            aria-label="Kapat"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="sd-gallery-modal-main">
          <button 
            className="sd-gallery-modal-nav prev" 
            onClick={handlePrevImage}
            aria-label="Önceki görsel"
          >
            <FaChevronLeft />
          </button>
          
          <div className="sd-gallery-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sd-gallery-modal-image-container">
              <img 
                src={currentImage} 
                alt={`Portföy Görseli ${selectedImageIndex + 1}`} 
                onContextMenu={preventImageDownload}
                draggable="false"
                onDragStart={preventImageDownload}
                onMouseDown={preventImageDownload}
                className="protected-image"
                loading="lazy"
              />
              <div className="sd-gallery-watermark">Acillazım.com</div>
            </div>
          </div>
          
          <button 
            className="sd-gallery-modal-nav next" 
            onClick={handleNextImage}
            aria-label="Sonraki görsel"
          >
            <FaChevronRight />
          </button>
        </div>
        
        <div className="sd-gallery-modal-footer">
          <div className="sd-gallery-modal-thumbnails">
            {images.map((image, index) => (
              <div 
                key={index} 
                className={`sd-gallery-modal-thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleThumbnailClick(index);
                }}
              >
                <img 
                  src={image} 
                  alt={`Thumbnail ${index + 1}`} 
                  loading="lazy"
                  onContextMenu={preventImageDownload}
                  draggable="false"
                />
                <div className="sd-gallery-thumbnail-watermark">Acillazım.com</div>
              </div>
            ))}
          </div>
          <div className="sd-gallery-modal-counter">
            {selectedImageIndex + 1} / {images.length}
          </div>
        </div>
      </div>
    );
  };

  if (!images || images.length === 0) {
    return (
      <div className="sd-gallery-empty">
        <div className="sd-gallery-empty-content">
          <FaExpand size={48} />
          <h3>Henüz görsel eklenmemiş</h3>
          <p>Bu hizmet için henüz portföy görseli bulunmuyor.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sd-service-gallery">
        <div className="sd-gallery-header">
          <h3>{title}</h3>
          <span className="sd-gallery-count">{images.length} görsel</span>
        </div>
        
        <div className="sd-gallery-grid">
          {images.map((image, index) => (
            <div key={index} className="sd-gallery-item">
              <img 
                src={image} 
                alt={`Portföy Görseli ${index + 1}`} 
                loading="lazy" 
                onContextMenu={preventImageDownload}
                draggable="false"
                onDragStart={preventImageDownload}
                onMouseDown={preventImageDownload}
                className="protected-image"
              />
              <div className="sd-gallery-watermark-container">
                <div className="sd-gallery-watermark">Acillazım.com</div>
              </div>
              <div className="sd-gallery-overlay">
                <button 
                  className="sd-gallery-zoom"
                  onClick={() => handleImageClick(index)}
                  aria-label="Görseli büyüt"
                >
                  <FaExpand size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {renderImageModal()}
    </>
  );
};

export default ServiceDetailGallery; 