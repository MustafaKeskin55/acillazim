"use client";

import React, { useState } from 'react';
import './ProductDescription.css';

const ProductDescription = ({ description }) => {
  // Açıklama için başlangıçta 300 karakter göster
  const previewLength = 300;
  
  // Tam içeriğin görüntülenip görüntülenmediğini takip et
  const [isExpanded, setIsExpanded] = useState(false);
  
  // İçeriği kısalt veya tam göster
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Açıklama yok veya boş ise
  if (!description || description.trim() === '') {
    return (
      <div className="product-detail-product-description">
        <p className="product-detail-description-content">Bu ürün için henüz bir açıklama bulunmamaktadır.</p>
      </div>
    );
  }
  
  // Açıklama yeteri kadar kısaysa, direkt göster
  if (description.length <= previewLength) {
    return (
      <div className="product-detail-product-description">
        <div className="product-detail-description-content" dangerouslySetInnerHTML={{ __html: description }} />
      </div>
    );
  }
  
  // Uzun açıklama için kısaltma göster
  const previewText = isExpanded ? description : `${description.substring(0, previewLength)}...`;
  
  return (
    <div className="product-detail-product-description">
      <div className="product-detail-description-content" dangerouslySetInnerHTML={{ __html: previewText }} />
      
      <button 
        type="button" 
        className="product-detail-description-toggle" 
        onClick={toggleExpand}
      >
        {isExpanded ? (
          <><i className="fas fa-chevron-up"></i> Daha Az Göster</>
        ) : (
          <><i className="fas fa-chevron-down"></i> Devamını Oku</>
        )}
      </button>
    </div>
  );
};

export default ProductDescription; 