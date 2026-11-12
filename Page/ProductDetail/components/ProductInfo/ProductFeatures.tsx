"use client";

import React, { useState, useEffect } from 'react';
import './ProductFeatures.css';

const ProductFeatures = ({ features }) => {
  // Açık bölümleri takip eden state - hooks must be called before any conditional returns
  const [expandedSections, setExpandedSections] = useState({});
  
  // Component yüklendiğinde bölümleri başlat
  useEffect(() => {
    if (features) {
      // Var/yok özellikleri bölümü için bir state başlat (varsayılan olarak açık)
      setExpandedSections({
        presenceFeatures: true,
      });
    }
  }, [features]);
  
  if (!features || Object.keys(features).length === 0) {
    return null;
  }
  
  // Bir değerin obje olup olmadığını kontrol eden yardımcı fonksiyon
  const isObjectWithProperties = (value) => {
    return typeof value === 'object' && 
           value !== null && 
           !Array.isArray(value) && 
           Object.keys(value).length > 0;
  };
  
  // Bölüm açma/kapama işlevi
  const toggleSection = (e, sectionKey) => {
    e.stopPropagation(); // Event propagation'ı durdur
    
    setExpandedSections(prevState => ({
      ...prevState,
      [sectionKey]: !prevState[sectionKey]
    }));
  };
  
  // Bir bölümün açık olup olmadığını kontrol et
  const isSectionExpanded = (sectionKey) => {
    return !!expandedSections[sectionKey];
  };
  
  const getDisplayName = (key) => {
    // sessionStorage'dan kategori alan başlıklarını al (TAMAMEN DİNAMİK)
    let categoryFieldLabels = {};
    try {
      const labelsData = sessionStorage.getItem('categoryFieldLabels');
      if (labelsData) {
        categoryFieldLabels = JSON.parse(labelsData);
      }
    } catch (error) {
      console.error('❌ Kategori alan başlıkları yüklenemedi:', error);
    }
    
    // Önce sessionStorage'dan kontrol et
    if (categoryFieldLabels[key]) {
      return categoryFieldLabels[key];
    }
    
    let formattedKey = key.replace(/_/g, ' ');
    
    formattedKey = formattedKey.replace(/([A-Z])/g, ' $1');
    
    formattedKey = formattedKey
      .split(' ')
      .map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
    
    const turkishFixes = {
      'Bina Yasi': 'Bina Yaşı',
      'Yas': 'Yaş',
      'Isitma': 'Isıtma',
      'Dis Cephe': 'Dış Cephe',
      'Icinde': 'İçinde',
      'Alani': 'Alanı',
      'Sayisi': 'Sayısı',
      'M2': 'm²',
      'Kardio': 'Kardio',
      'Muzik': 'Müzik',
      'Ozellikleri': 'Özellikleri',
      'Donatilar': 'Donatılar',
      'Yakinligi': 'Yakınlığı'
    };
    
    Object.keys(turkishFixes).forEach(incorrect => {
      if (formattedKey.includes(incorrect)) {
        formattedKey = formattedKey.replace(incorrect, turkishFixes[incorrect]);
      }
    });
    
    return formattedKey;
  };
  
  // Değer formatlama fonksiyonu
  const formatFeatureValue = (value) => {
    if (value === undefined || value === null) return '';
    
    // Boolean değerler için
    if (typeof value === 'boolean') {
      return value ? 'Evet' : 'Hayır';
    }
    
    // Dizi değerler için
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    // Obje değerler için
    if (typeof value === 'object') {
      return 'Detaylı Bilgi';
    }
    
    // Diğer değerler için
    return value.toString();
  };
  
  // Bir değerin varsayılan olarak "var/yok" tipinde olup olmadığını kontrol et
  const isPresenceFeature = (key, value) => {
    // Anahtarın isminde 'has' varsa veya boolean ise
    if (key.startsWith('has') || typeof value === 'boolean') {
      return true;
    }
    
    // Eğer değer "var", "yok", "evet", "hayır" gibi değerlerse
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      return ['var', 'yok', 'evet', 'hayır', 'yes', 'no'].includes(lowerValue);
    }
    
    // Bazı anahtar isimlerini varsayılan olarak var/yok kabul et
    const presenceKeys = [
      'bayan_wc', 'bay_wc', 'restoran', 'yikama', 'yaglama', 'magaza', 
      'hirsiz_alarmi', 'hava_su_kompresoru', 'market', 'yangin_alarmi',
      'guvenlik_kamerasi', 'asansor', 'otopark', 'havuz', 'bahce', 
      'alarm', 'guvenlik', 'wifi', 'internet'
    ];
    
    return presenceKeys.includes(key.toLowerCase());
  };
  
  // Bir değerin "olumlu" olup olmadığını kontrol et (var/evet/true gibi)
  const isPositiveValue = (value) => {
    if (value === undefined || value === null) return false;
    
    // Boolean değerler için
    if (typeof value === 'boolean') {
      return value === true;
    }
    
    // String değerler için
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      return ['var', 'evet', 'yes', 'true', '1'].includes(lowerValue);
    }
    
    // Sayısal değerler için
    if (typeof value === 'number') {
      return value > 0;
    }
    
    return false;
  };
  
  // Özellikleri var/yok ve normal olarak iki gruba ayır
  const separateFeatures = (data) => {
    const presenceFeatures = {};
    const normalFeatures = {};
    
    // Düz yapı için tüm özellikleri tara
    const processFeatures = (obj, targetPresence, targetNormal, parentKey = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.entries(obj).forEach(([key, value]) => {
        const currentKey = parentKey ? `${parentKey}.${key}` : key;
        
        // Bazı alanları atla
        if (key.toLowerCase().includes('id') || 
            ['baslik', 'aciklama', 'description', 'title'].includes(key.toLowerCase())) {
          return;
        }
        
        // Eğer bir obje ise içindeki özellikleri de işle
        if (isObjectWithProperties(value)) {
          processFeatures(value, targetPresence, targetNormal, currentKey);
        } 
        // Var/yok tipinde özellik
        else if (isPresenceFeature(key, value)) {
          targetPresence[currentKey] = {
            key: key,
            displayName: getDisplayName(key),
            value: value,
            isPositive: isPositiveValue(value)
          };
        }
        // Normal özellik
        else {
          targetNormal[currentKey] = {
            key: key,
            displayName: getDisplayName(key),
            value: value
          };
        }
      });
    };
    
    processFeatures(data, presenceFeatures, normalFeatures);
    
    return { presenceFeatures, normalFeatures };
  };
  
  // Tıklı özellik listesi oluştur
  const renderChecklistFeatures = (features) => {
    // Pozitif (var) özelliklerini öne çıkar ve alfabetik sırala
    const sortedFeatures = Object.values(features).sort((a, b) => {
      // Önce var olanları göster
      if (a.isPositive && !b.isPositive) return -1;
      if (!a.isPositive && b.isPositive) return 1;
      
      // Aynı durumdaki özellikleri alfabetik sırala
      return a.displayName.localeCompare(b.displayName);
    });
    
    // Grid içinde feature item'ları düzenle
    return (
      <div className="product-detail-features-checklist">
        {sortedFeatures.map(feature => (
          <div key={feature.key} className={`product-detail-feature-checklist-item ${feature.isPositive ? 'active' : 'inactive'}`}>
            <span className="product-detail-feature-check-icon">
              {feature.isPositive ? 
                <i className="fas fa-check-circle"></i> : 
                <i className="fas fa-times-circle"></i>}
            </span>
            <span className="product-detail-feature-check-label">{feature.displayName}</span>
          </div>
        ))}
      </div>
    );
  };
  
  // Normal özellikleri göster
  const renderNormalFeatures = (features) => {
    // Normal özellikleri alfabetik sırala
    const sortedFeatures = Object.values(features).sort((a, b) => {
      return a.displayName.localeCompare(b.displayName);
    });
    
    return (
      <div className="product-detail-features-grid">
        {sortedFeatures.map(feature => (
          <div className="product-detail-feature-item" key={feature.key}>
            <span className="product-detail-feature-label">{feature.displayName}</span>
              <span className="product-detail-feature-value">
              {formatFeatureValue(feature.value)}
              </span>
            </div>
        ))}
      </div>
    );
  };
  
  // Ana render fonksiyonu
  return (
    <div className="product-detail-product-features">
      {(() => {
        // Özellikleri var/yok ve normal olarak ayır
        const { presenceFeatures, normalFeatures } = separateFeatures(features);
        const hasPresenceFeatures = Object.keys(presenceFeatures).length > 0;
        const hasNormalFeatures = Object.keys(normalFeatures).length > 0;
        
        return (
          <>
            {/* Normal özellikler için bölüm - ÜSTTE (açılır-kapanır değil) */}
            {hasNormalFeatures && (
              <div className="product-detail-features-info-block">
                <div className="product-detail-features-info-header">
                  <h4 className="product-detail-features-section-title">Temel bilgiler</h4>
                </div>
                <div className="product-detail-features-normal-block">
                  {renderNormalFeatures(normalFeatures)}
                </div>
              </div>
            )}
            
            {/* Var/yok tipindeki özellikler için açılır-kapanır bölüm - ALTTA */}
            {hasPresenceFeatures && (
              <div className="product-detail-features-section-block">
                <div 
                  className={`product-detail-features-section-header ${isSectionExpanded('presenceFeatures') ? 'expanded' : 'collapsed'}`}
                  onClick={(e) => toggleSection(e, 'presenceFeatures')}
                >
                  <h4 className="product-detail-features-section-title">Donanım ve olanaklar</h4>
                  <div className="product-detail-features-section-toggle">
                    <i className={`fas fa-chevron-down ${isSectionExpanded('presenceFeatures') ? 'rotated' : ''}`}></i>
                  </div>
                </div>
                
                {isSectionExpanded('presenceFeatures') && renderChecklistFeatures(presenceFeatures)}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};

export default ProductFeatures; 