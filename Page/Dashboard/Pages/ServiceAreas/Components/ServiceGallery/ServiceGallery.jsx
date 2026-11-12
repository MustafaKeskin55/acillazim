import React, { useState, useEffect } from 'react';
import { FaImage, FaEdit, FaSave, FaTimes, FaPlus, FaTrash, FaCamera, FaExpand } from 'react-icons/fa';
import { ListingService } from '@/services/listingService';
import './ServiceGallery.css';

const ServiceGallery = ({ images, onUpdate, onImageClick }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedImages, setEditedImages] = useState(images ?? []);
  const [uploadError, setUploadError] = useState(null);
  const [totalFileSize, setTotalFileSize] = useState(0);

  const MAX_IMAGES = 10;
  const MAX_TOTAL_SIZE_MB = 5; // 5 MB toplam dosya boyutu sınırı
  const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024; // MB'yi byte'a çevir
  const isEditable = onUpdate !== null;

  // Sayfa yüklendiğinde resimlerin indirilmesini engellemek için
  useEffect(() => {
    // Sağ tıklama menüsünü engelleme
    const preventContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Klavye kısayollarını engelleme (Ctrl+S, Ctrl+P vb.)
    const preventKeyboardShortcuts = (e) => {
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P')) ||
        (e.key === 'PrintScreen')
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Sürükleme işlemlerini engelleme
    const preventDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyboardShortcuts);
    document.addEventListener('dragstart', preventDragStart);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
      document.removeEventListener('dragstart', preventDragStart);
    };
  }, []);

  useEffect(() => {
    setEditedImages(images ?? []);
  }, [images]);

  // Dosya boyutunu kontrol eden yardımcı fonksiyon
  const getExistingImagesSize = () => {
    // Base64 formatında saklanan resimlerin boyutunu hesapla
    return editedImages.reduce((total, imageSrc) => {
      // Base64 string'in boyutunu hesapla
      if (typeof imageSrc === 'string' && imageSrc.startsWith('data:')) {
        // Base64 kısmını al (data:image/jpeg;base64, kısmını çıkar)
        const base64 = imageSrc.split(',')[1];
        if (base64) {
          // Base64 encoding, her 4 karakter 3 byte veri içerir
          const sizeInBytes = (base64.length * 3) / 4;
          return total + sizeInBytes;
        }
      }
      // Eğer URL ise, tahmini boyut ekle (örneğin 200 KB)
      return total + 200 * 1024;
    }, 0);
  };

  const handleAddImage = (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    // Mevcut dosyaların toplam boyutunu hesapla
    const currentTotalSize = getExistingImagesSize();
    
    // Calculate how many more images we can add
    const remainingSlots = MAX_IMAGES - editedImages.length;
    
    if (remainingSlots <= 0) {
      setUploadError(`En fazla ${MAX_IMAGES} fotoğraf yükleyebilirsiniz.`);
      setTimeout(() => setUploadError(null), 3000);
      return;
    }
    
    // Dosya boyutu kontrolü
    const filesTooLarge = [];
    let newTotalSize = currentTotalSize;
    const filesToProcess = [];
    
    // Önce tüm dosyaları kontrol et
    for (const file of files) {
      if (newTotalSize + file.size > MAX_TOTAL_SIZE_BYTES) {
        filesTooLarge.push(file.name);
      } else if (filesToProcess.length < remainingSlots) {
        filesToProcess.push(file);
        newTotalSize += file.size;
      }
    }
    
    // Yükleme hatası kontrolü
    if (filesTooLarge.length > 0) {
      setUploadError(`Toplam dosya boyutu ${MAX_TOTAL_SIZE_MB} MB'yi aşamaz. ${filesTooLarge.length} dosya çok büyük.`);
      setTimeout(() => setUploadError(null), 3000);
      
      if (filesToProcess.length === 0) {
        return; // Hiçbir dosya işlenmeyecekse dön
      }
    }
    
    // Boş yer kontrolü
    if (files.length > remainingSlots) {
      const skippedCount = files.length - filesToProcess.length;
      if (skippedCount > 0) {
        setUploadError(`Sadece ${remainingSlots} fotoğraf daha eklenebilir. ${skippedCount} fotoğraf eklenmedi.`);
        setTimeout(() => setUploadError(null), 3000);
      }
    }
    
    // Dosyaları önce sunucuya fiziksel dosya olarak yükle (/uploads/listings/img_xxx.jpg)
    const newImages = [...editedImages];
    ListingService.uploadListingImages(filesToProcess)
      .then((uploaded) => {
        const imagesArr = Array.isArray(uploaded) ? uploaded : uploaded?.images;
        const urls = Array.isArray(imagesArr)
          ? imagesArr.map((img) => img?.url).filter(Boolean)
          : [];
        if (urls.length > 0) {
          setEditedImages([...newImages, ...urls]);
          setTotalFileSize(getExistingImagesSize() + newTotalSize);
          return;
        }
        throw new Error('Yüklenen görsel URL listesi boş');
      })
      .catch(() => {
        let processedCount = 0;
        filesToProcess.forEach((file) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            newImages.push(reader.result);
            processedCount++;
            if (processedCount === filesToProcess.length) {
              setEditedImages(newImages);
              setTotalFileSize(getExistingImagesSize() + newTotalSize);
            }
          };
          reader.readAsDataURL(file);
        });
      });
  };

  const handleRemoveImage = (index) => {
    const newImages = [...editedImages];
    newImages.splice(index, 1);
    setEditedImages(newImages);
  };

  const handleSave = () => {
    onUpdate?.(editedImages);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedImages(images || editedImages);
    setIsEditing(false);
  };

  // Sağ tıklama ve sürükleme işlemlerini engelleme
  const preventImageDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // Resim tıklama işlemi
  const handleImageClick = (index) => {
    if (!isEditing && onImageClick) {
      onImageClick(index);
    }
  };

  return (
    <div className="service-gallery-section">
      <div className="service-gallery-header">
        <h2>
          Çalışma Örnekleri
        </h2>
        {isEditable && !isEditing ? (
          <button className="gallery-edit-button" onClick={() => setIsEditing(true)}>
            <FaEdit size={18} />
            <span>Düzenle</span>
          </button>
        ) : isEditable && isEditing ? (
          <div className="gallery-action-buttons">
            <button className="gallery-cancel-button" onClick={handleCancel}>
              <FaTimes size={18} />
              <span>İptal</span>
            </button>
            <button className="gallery-save-button" onClick={handleSave}>
              <FaSave size={18} />
              <span>Kaydet</span>
            </button>
          </div>
        ) : null}
      </div>
      
      <div className={`service-gallery-grid ${isEditing ? 'editing' : ''}`}>
        {uploadError && (
          <div className="gallery-upload-error">
            {uploadError}
          </div>
        )}
        {editedImages.map((image, index) => (
          <div key={index} className="service-gallery-item">
            <img 
              src={image} 
              alt={`Hizmet Görseli ${index + 1}`} 
              loading="lazy" 
              onContextMenu={preventImageDownload}
              draggable="false"
              onDragStart={preventImageDownload}
              onMouseDown={preventImageDownload}
              className="protected-image"
              width="1399"
              height="803"
            />
            <div className="watermark-container">
              <div className="watermark">Acillazım.com</div>
            </div>
            <div className="service-gallery-overlay">
              {isEditing ? (
                <button 
                  className="remove-image-button"
                  onClick={() => handleRemoveImage(index)}
                >
                  <FaTrash size={20} />
                </button>
              ) : (
                <button 
                  className="service-gallery-zoom"
                  onClick={() => handleImageClick(index)}
                >
                  <FaExpand size={20} />
                </button>
              )}
            </div>
          </div>
        ))}
        
        {isEditing && editedImages.length < MAX_IMAGES && (
          <div className="service-gallery-add-item">
            <label className="service-gallery-add-button">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleAddImage}
                style={{ display: 'none' }}
              />
              <FaPlus size={24} />
              <span>Fotoğraf Ekle</span>
              <div className="gallery-count-info">
                {editedImages.length}/{MAX_IMAGES} fotoğraf
              </div>
              <div className="gallery-size-info">
                Toplam {MAX_TOTAL_SIZE_MB} MB görsel yükleme sınırı
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceGallery; 