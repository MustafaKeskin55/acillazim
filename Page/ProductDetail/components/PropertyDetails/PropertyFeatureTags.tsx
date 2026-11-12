"use client";

import React from 'react';
import './PropertyFeatureTags.css';

/**
 * Emlak ilanı özelliklerini gösteren etiketler bileşeni
 * TAMAMEN DİNAMİK - sessionStorage'dan alan başlıklarını alır
 */
const PropertyFeatureTags = ({ features, propertyType, category }) => {
  if (!features) return null;
  
  // Formatlı etiket değerini oluştur
  const formatTagValue = (value) => {
    // Boolean değerleri Evet/Hayır olarak göster
    if (typeof value === 'boolean') {
      return value ? 'Evet' : 'Hayır';
    }
    
    // Sayı ve string değerleri olduğu gibi döndür
    return value;
  };
  
  // sessionStorage'dan kategori alan başlıklarını al (TAMAMEN DİNAMİK)
  let categoryFieldLabels = {};
  try {
    const labelsData = sessionStorage.getItem('categoryFieldLabels');
    if (labelsData) {
      categoryFieldLabels = JSON.parse(labelsData);
      console.log('📋 PropertyFeatureTags: Kategori alan başlıkları yüklendi:', categoryFieldLabels);
    }
  } catch (error) {
    console.error('❌ PropertyFeatureTags: Kategori alan başlıkları yüklenemedi:', error);
  }
  
  // features objesindeki tüm özellikleri kontrol et ve başlığı olan (categoryFieldLabels'da var olan) özellikleri al
  const availableFeatures = Object.entries(features)
    .filter(([key, value]) => {
      // Değer boş olmamalı
      if (value === undefined || value === null || value === '') return false;
      
      // Bu key categoryFieldLabels'da var mı?
      return categoryFieldLabels.hasOwnProperty(key);
    })
    .map(([key, value]) => ({
      key,
      label: categoryFieldLabels[key], // sessionStorage'dan gelen başlık
      value: formatTagValue(value)
    }));
  
  console.log('✅ PropertyFeatureTags: Mevcut özellikler:', availableFeatures);
  
  // İlk 4 özelliği al
  let limitedFeatures = availableFeatures.slice(0, 4);

  // Veri varsa ve liste oluşturulduysa göster
  return limitedFeatures.length > 0 ? (
    <div className="product-detail-feature-tags">
      {limitedFeatures.map((featureItem, index) => (
        <div key={index} className="product-detail-property-tag">
          <span className="product-detail-property-tag-text">{featureItem.label}</span>
          <span className="product-detail-property-tag-value">{featureItem.value}</span>
        </div>
      ))}
    </div>
  ) : null;
};

export default PropertyFeatureTags; 