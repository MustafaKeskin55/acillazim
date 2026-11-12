"use client";

import React, { useState, useEffect, useRef } from 'react';
import './UserInfo.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faMapMarkerAlt,
  faEnvelope,
  faPhone,
  faQuoteLeft,
  faExclamationTriangle,
  faStore,
  faIdCard,
  faGlobe,
  faMapMarked
} from '@fortawesome/free-solid-svg-icons';
import userProfileService from '@/services/profile/userProfileService';

/**
 * Kullanıcı bilgileri bileşeni
 * @param {Object} props - Bileşen özellikleri
 * @param {string} props.userId - Kullanıcı ID
 * @returns {JSX.Element} - Kullanıcı bilgileri bileşeni
 */
const UserInfo = ({ userId }) => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapInitializedRef = useRef(false);

  // Harita temizleme fonksiyonu
  const cleanupMap = () => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        console.error('Harita temizlenirken hata:', e);
      }
      mapInstanceRef.current = null;
      mapInitializedRef.current = false;
    }
  };

  // Komponent unmount olduğunda temizleme işlemi
  useEffect(() => {
    return () => {
      cleanupMap();
    };
  }, []);

  // Kullanıcı verilerini getirme
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const response = await userProfileService.getUserInfoData(userId);
        
        if (!response.success) {
          throw new Error(response.message || 'Kullanıcı bilgileri alınamadı');
        }
        
        setUserData(response.data);
        setError(null);
      } catch (err) {
        console.error('Kullanıcı bilgileri yüklenirken hata:', err);
        setError(err.message || 'Kullanıcı bilgileri yüklenirken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  // Leaflet CSS ve JS dosyalarını yükleme
  const loadLeafletResources = async () => {
    // Leaflet kütüphanesi zaten yüklenmişse işlem yapma
    if (window.L) return Promise.resolve(true);
    
    // Leaflet CSS dosyasını yükle (eğer yoksa)
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const leafletCSS = document.createElement('link');
      leafletCSS.rel = 'stylesheet';
      leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(leafletCSS);
    }

    // Leaflet JavaScript kütüphanesini yükle
    return new Promise((resolve) => {
      const leafletScript = document.createElement('script');
      leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      leafletScript.onload = () => resolve(true);
      document.body.appendChild(leafletScript);
    });
  };

  // Haritayı oluşturma işlemi
  const createMap = async (location) => {
    if (!mapRef.current || mapInitializedRef.current || !window.L) return;

    // Eğer mevcut bir harita varsa önce temizleyelim
    cleanupMap();
    
    // Önbellek anahtarı oluştur
    const cacheKey = `map_coords_${location.replace(/\s+/g, '_')}`;
    
    // Daha önce bu konum için koordinat hesaplanmış mı kontrol et
    let lat, lng;
    const cachedCoords = sessionStorage.getItem(cacheKey);
    
    if (cachedCoords) {
      try {
        const coords = JSON.parse(cachedCoords);
        lat = coords.lat;
        lng = coords.lng;
      } catch (e) {
        console.warn('Önbellekteki koordinat formatı hatalı');
      }
    }
    
    // Önbellekte yoksa koordinatları API'den al
    if (!lat || !lng) {
      try {
        const encodedLocation = encodeURIComponent(location);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedLocation}&limit=1`);
        const data = await response.json();
        
        // Eğer koordinat bulunamazsa haritayı oluşturma
        if (!data || data.length === 0) {
          console.warn('Konum için koordinat bulunamadı:', location);
          return;
        }
        
        // Koordinatları datadan al
        lat = parseFloat(data[0].lat);
        lng = parseFloat(data[0].lon);
        
        // Koordinatları önbelleğe al
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({lat, lng}));
        } catch (e) {
          console.warn('Koordinatlar önbelleğe alınamadı:', e);
        }
      } catch (err) {
        console.error('Konum koordinatları alınamadı:', err);
        return;
      }
    }
    
    // Harita elementini kontrol et
    if (!mapRef.current) return;

    try {
      // Yeni harita oluştur (minimal konfigürasyonla)
      mapInstanceRef.current = window.L.map(mapRef.current).setView([lat, lng], 13);
      
      // OpenStreetMap katmanını ekle
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(mapInstanceRef.current);
      
      // Satıcı işaretçisini oluştur
      const sellerIcon = window.L.divIcon({
        className: 'profile-map-custom-marker',
        html: `
          <div class="profile-map-seller-icon">
            <img src="${userData.imageUrl || 'https://randomuser.me/api/portraits/men/1.jpg'}" 
                 alt="${userData.fullName || 'Satıcı'}" 
                 onerror="this.onerror=null; this.src='https://randomuser.me/api/portraits/men/1.jpg';" />
            <div class="profile-map-seller-name">${userData.fullName || 'Satıcı'}</div>
          </div>
        `,
        iconSize: [50, 70],
        iconAnchor: [25, 55],
        popupAnchor: [0, -45]
      });
      
      // İşaretçiyi haritaya ekle
      window.L.marker([lat, lng], { icon: sellerIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${userData.fullName || 'Satıcı'}</b><br>${location}`)
        .openPopup();
      
      // Haritanın doğru boyutta görüntülenmesi için
      requestAnimationFrame(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });

      mapInitializedRef.current = true;
    } catch (err) {
      cleanupMap();
    }
  };

  // Haritayı oluştur
  useEffect(() => {
    if (!userData || !userData.location || !mapRef.current) return;
    
    // Mevcut haritayı temizle
    if (mapInitializedRef.current) {
      cleanupMap();
    }

    // Harita oluşturma işlemini geciktirmeden başlat
    const initializeMap = async () => {
      try {
        await loadLeafletResources();
        
        // Sadece harita gösterilirken oluşturmayı dene
        if (mapRef.current && mapRef.current.clientHeight > 0) {
          createMap(userData.location);
        }
      } catch (err) {
        console.error('Harita başlatılırken hata:', err);
      }
    };
    
    // Harita oluşturma işlemini hemen başlat
    initializeMap();

    return () => {
      // Bu spesifik effect için cleanup - ana cleanup komponentin unmount olmasında yapılıyor
    };
  }, [userData]);

  // Kullanıcı verisi yoksa ve yükleme/hata durumu da yoksa
  if (!userData && !isLoading && !error) {
    return (
      <div className="profile-user-info-container">
        <div className="profile-user-info-error">
          <FontAwesomeIcon icon={faExclamationTriangle} className="profile-error-icon" />
          <h3>Kullanıcı bilgileri bulunamadı</h3>
          <p>Görüntülemek istediğiniz kullanıcı bilgileri mevcut değil veya erişim izniniz bulunmuyor.</p>
        </div>
      </div>
    );
  }

  // Yükleniyor durumu
  if (isLoading) {
    return (
      <div className="profile-user-info-container">
        <div className="profile-user-info-skeleton">
          <div className="profile-skeleton-header"></div>
          <div className="profile-skeleton-line"></div>
          <div className="profile-skeleton-line short"></div>
          <div className="profile-skeleton-line long"></div>
          <div className="profile-skeleton-line short"></div>
        </div>
      </div>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <div className="profile-user-info-container">
        <div className="profile-user-info-error">
          <FontAwesomeIcon icon={faExclamationTriangle} className="profile-error-icon" />
          <h3>Bir hata oluştu</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Kullanıcı bilgileri görünümü
  return (
    <div className="profile-user-info-container">
      {/* Hakkımda Kartı */}
      <div className="profile-card profile-about-card">
        <div className="profile-card-header">
          <div className="profile-header-icon">
            <FontAwesomeIcon icon={faIdCard} />
          </div>
          <h2 className="profile-card-title">Hakkımda</h2>
        </div>

        <div className="profile-about-me-content">
          {/* Biyografi */}
          <div className="profile-about-me-bio">
            {userData.bio ? (
              <div className="profile-bio-text">
                <p className="profile-bio-paragraph">{userData.bio}</p>
              </div>
            ) : (
              <div className="profile-bio-empty">
                <p>Henüz bir biyografi eklenmemiş.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Satıcı Bilgileri Kartı */}
      <div className="profile-card profile-seller-card">
        <div className="profile-card-header">
          <div className="profile-header-icon">
            <FontAwesomeIcon icon={faStore} />
          </div>
          <h2 className="profile-card-title">Satıcı Bilgileri</h2>
        </div>

        <div className="profile-info-grid">
          {/* Ad Soyad */}
          <div className="profile-info-item">
            <div className="profile-info-label">
              <FontAwesomeIcon icon={faUser} />
              İsim
            </div>
            <div className="profile-info-value">
              {userData.fullName || 'Belirtilmemiş'}
            </div>
          </div>

          {/* Lokasyon */}
          <div className="profile-info-item">
            <div className="profile-info-label">
              <FontAwesomeIcon icon={faMapMarkerAlt} />
              Konum
            </div>
            <div className="profile-info-value">
              {userData.location || 'Belirtilmemiş'}
            </div>
          </div>

        {/* E-posta */}
          <div className="profile-info-item">
            <div className="profile-info-label">
              <FontAwesomeIcon icon={faEnvelope} />
              E-posta
            </div>
            <div className="profile-info-value profile-email-value">
              {userData.email ? (
                <a href={`mailto:${userData.email}`} className="profile-contact-link">
                  {userData.email}
                </a>
              ) : (
                'Belirtilmemiş'
              )}
          </div>
        </div>

        {/* Telefon */}
          <div className="profile-info-item">
            <div className="profile-info-label">
              <FontAwesomeIcon icon={faPhone} />
              Telefon
          </div>
            <div className="profile-info-value">
              {userData.phone ? (
                <a href={`tel:${userData.phone.replace(/\s+/g, '')}`} className="profile-contact-link">
                  {userData.phone}
                </a>
              ) : (
                'Belirtilmemiş'
              )}
            </div>
          </div>

          {/* Hizmet Bölgeleri */}
          {userData.service_areas && userData.service_areas.length > 0 && (
            <div className="profile-info-item profile-info-item-full">
              <div className="profile-info-label">
                <FontAwesomeIcon icon={faGlobe} />
                Hizmet Bölgeleri
              </div>
              <div className="profile-info-value">
                <div className="profile-service-areas">
                  {userData.service_areas.map((area, index) => (
                    <span key={index} className="profile-service-area-tag">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Konum Haritası Kartı */}
      {userData.location && (
        <div className="profile-card profile-location-card">
          <div className="profile-card-header">
            <div className="profile-header-icon">
              <FontAwesomeIcon icon={faMapMarked} />
            </div>
            <h2 className="profile-card-title">Satıcı Konumu</h2>
          </div>
          
          <div className="profile-map-container">
            {/* Harita yerleşimi - OpenStreetMap ile Leaflet */}
            <div className="profile-location-map">
              <div id="seller-map" className="profile-map" ref={mapRef}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInfo; 