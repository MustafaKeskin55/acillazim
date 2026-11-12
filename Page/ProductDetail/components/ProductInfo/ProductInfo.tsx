"use client";

import React from 'react';
import './ProductInfo.css';

const ProductInfo = ({ product, onContactClick }) => {
  // Ürün fiyatını formatla
  const formatPrice = (price) => {
    return new Intl.NumberFormat('tr-TR').format(price);
  };
  
  // Tarihi formatla
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
  };
  
  // Telefon numarasını formatla
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  };
  
  if (!product) {
    return (
      <div className="product-detail-product-info">
        <p>Ürün bilgisi yükleniyor...</p>
      </div>
    );
  }
  
  return (
    <div className="product-detail-product-info">
      {product.isPromoted && (
        <div className="product-detail-product-promoted">
          <div className="product-detail-promoted-badge">
            <i className="fas fa-star"></i>
            <span>Öne Çıkan İlan</span>
          </div>
        </div>
      )}
      
      <div className="product-detail-product-price">
        <h2>{formatPrice(product.price)} TL</h2>
      </div>
      
      <div className="product-detail-product-metadata">
        <div className="product-detail-metadata-item">
          <i className="fas fa-map-marker-alt"></i>
          <span>{product.location?.district}, {product.location?.city}</span>
        </div>
        
        <div className="product-detail-metadata-item">
          <i className="far fa-calendar-alt"></i>
          <span>İlan Tarihi: {formatDate(product.createdAt || product.date)}</span>
        </div>
        
        <div className="product-detail-metadata-item">
          <i className="fas fa-tag"></i>
          <span>İlan No: {product.id}</span>
        </div>
      </div>
      
      {onContactClick && (
        <div className="product-detail-product-contact-buttons">
          <button 
            className="product-detail-contact-button phone"
            onClick={() => onContactClick('phone', product.sellerPhone || '555-123-4567')}
          >
            <i className="fas fa-phone-alt"></i>
            <span>Telefon Numarasını Göster</span>
          </button>
          
          <button 
            className="product-detail-contact-button message"
            onClick={() => onContactClick('message', product.sellerId)}
          >
            <i className="fas fa-envelope"></i>
            <span>Mesaj Gönder</span>
          </button>
        </div>
      )}
      
      <div className="product-detail-product-quick-info">
        {product.features?.roomCount && (
          <div className="product-detail-quick-info-item">
            <i className="fas fa-bed"></i>
            <div className="product-detail-quick-info-text">
              <h4>Oda Sayısı</h4>
              <p>{product.features.roomCount}</p>
            </div>
          </div>
        )}
        
        {product.features?.squareMeters && (
          <div className="product-detail-quick-info-item">
            <i className="fas fa-ruler-combined"></i>
            <div className="product-detail-quick-info-text">
              <h4>Metrekare</h4>
              <p>{product.features.squareMeters} m²</p>
            </div>
          </div>
        )}
        
        {product.features?.buildingAge && (
          <div className="product-detail-quick-info-item">
            <i className="fas fa-building"></i>
            <div className="product-detail-quick-info-text">
              <h4>Bina Yaşı</h4>
              <p>{product.features.buildingAge} Yıl</p>
            </div>
          </div>
        )}
        
        {product.features?.floorNumber && (
          <div className="product-detail-quick-info-item">
            <i className="fas fa-layer-group"></i>
            <div className="product-detail-quick-info-text">
              <h4>Kat</h4>
              <p>{product.features.floorNumber}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductInfo; 