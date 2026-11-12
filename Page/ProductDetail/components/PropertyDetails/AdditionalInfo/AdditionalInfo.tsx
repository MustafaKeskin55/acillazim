"use client";

import React from 'react';
import './AdditionalInfo.css';

const AdditionalInfo = ({ additionalInfo }) => {
  // Bilgi yoksa gösterme
  if (!additionalInfo || Object.keys(additionalInfo).length === 0) {
    return null;
  }
  
  // sessionStorage'dan kategori alan başlıklarını al (TAMAMEN DİNAMİK)
  const getFieldLabel = (fieldKey) => {
    try {
      const labelsData = sessionStorage.getItem('categoryFieldLabels');
      if (labelsData) {
        const categoryFieldLabels = JSON.parse(labelsData);
        if (categoryFieldLabels[fieldKey]) {
          return categoryFieldLabels[fieldKey];
        }
      }
    } catch (error) {
      console.error('❌ Alan başlığı alınamadı:', error);
    }
    
    // sessionStorage'da yoksa, formatlanmış versiyonunu döndür
    return fieldKey
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  return (
    <div className="product-detail-additional-info">
      {Object.entries(additionalInfo).map(([sectionKey, section], sectionIndex) => (
        <div key={sectionIndex} className="product-detail-info-section">
          <h3 className="product-detail-section-title">{section.title || sectionKey}</h3>
          
          <div className="product-detail-info-items">
            {Object.entries(section.items || {}).map(([itemKey, value], itemIndex) => (
              <div key={itemIndex} className="product-detail-info-item">
                <div className="product-detail-info-label">{getFieldLabel(itemKey)}</div>
                <div className="product-detail-info-value">
                  {typeof value === 'boolean' ? (value ? 'Evet' : 'Hayır') : value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdditionalInfo; 