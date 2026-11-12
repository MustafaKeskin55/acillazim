"use client";

import React, { useState, useEffect, useRef } from 'react';
import './MapSection.css';

const MapSection = ({ coordinates, address }) => {
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapContainerRef = useRef(null);
  const googleMapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    // Google Maps API yükleme işlemi
    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const googleMapsApiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; // Gerçek anahtarınızla değiştirin
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
      script.async = true;
      document.head.appendChild(script);
      script.onload = initMap;
    };

    loadGoogleMapsScript();

    return () => {
      // Cleanup
    };
  }, [coordinates]);

  // Haritayı başlat
  const initMap = () => {
    if (!mapContainerRef.current || !coordinates) return;

    try {
      // Varsayılan konum (İstanbul)
      const defaultPosition = { lat: 41.0082, lng: 28.9784 };
      
      // API'den gelen koordinatları kullan veya varsayılan konumu kullan
      const position = coordinates.lat && coordinates.lng 
        ? { lat: parseFloat(coordinates.lat), lng: parseFloat(coordinates.lng) } 
        : defaultPosition;

      // Haritayı oluştur
      googleMapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: position,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: false
      });

      // Marker ekle
      markerRef.current = new window.google.maps.Marker({
        position: position,
        map: googleMapRef.current,
        animation: window.google.maps.Animation.DROP,
        title: address || 'Konum'
      });

      setIsMapLoaded(true);
    } catch (error) {
      console.error('Google Maps yüklenirken hata:', error);
    }
  };

  // Adres metni formatla
  const formatAddress = () => {
    if (!address) return 'Adres bilgisi bulunamadı';
    if (showFullAddress || address.length <= 100) return address;
    return address.substring(0, 100) + '...';
  };

  // Google Maps URL oluştur
  const getGoogleMapsUrl = () => {
    if (!coordinates || !coordinates.lat || !coordinates.lng) return '#';
    return `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
  };

  return (
    <div className="product-detail-map-section">
      <div className="product-detail-address-section">
        <div className="product-detail-address-icon">
          <i className="fas fa-map-marker-alt"></i>
        </div>
        <div className="product-detail-address-text">
          <p className="product-detail-address-content">{formatAddress()}</p>
          {address && address.length > 100 && (
            <button 
              className="product-detail-address-toggle"
              onClick={() => setShowFullAddress(!showFullAddress)}
            >
              {showFullAddress ? 'Kısalt' : 'Tam adresi göster'}
            </button>
          )}
        </div>
      </div>

      <div className="product-detail-map-container">
        <div 
          ref={mapContainerRef} 
          className="product-detail-map-element"
        ></div>
        {!isMapLoaded && (
          <div className="product-detail-map-loading">
            <div className="product-detail-loading-spinner"></div>
            <p>Harita yükleniyor...</p>
          </div>
        )}
        <div className="product-detail-map-actions">
          <a 
            href={getGoogleMapsUrl()} 
            target="_blank"
            rel="noopener noreferrer"
            className="product-detail-map-action-button"
            title="Google Haritalar'da Aç"
          >
            <i className="fas fa-external-link-alt"></i>
            <span>Haritada Göster</span>
          </a>
          
          <button 
            className="product-detail-map-action-button"
            title="Yol Tarifi Al"
            onClick={() => {
              if (coordinates) {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`, '_blank');
              }
            }}
          >
            <i className="fas fa-directions"></i>
            <span>Yol Tarifi</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapSection; 