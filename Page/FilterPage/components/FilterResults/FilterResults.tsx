"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard/ProductCard';
import Loader from '@/components/Loader/Loader';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import mapLocationService from '@/services/filters/mapLocationService';
import './FilterResults.css';
import urlService from '@/services/utils/urlService';
import { decodeHtmlEntities } from '@/services/listings/util/listingUtils';
import ResultsHeader from './ResultsHeader';

/**
 * Filtreleme Sayfası'nın ilan sonuçları bileşeni
 * Kategori ID'sine göre filtrelenen ilanları ProductCard ile gösterir
 */
const FilterResults = ({ listings, loading, viewMode, pagination, onPageChange, filters }) => {
  // Harita konumları için state
  const [mapLocations, setMapLocations] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false); // Tam ekran modu için
  
  // Önbellekleme için
  const [cachedLocations, setCachedLocations] = useState({});
  const [lastListingIds, setLastListingIds] = useState([]);
  
  // Ref'ler
  const locationFetchRef = useRef(null);
  const prevViewModeRef = useRef(null);
  const hasLoadedMapRef = useRef(false); // Harita ilk kez yüklendiğinde true olacak
  const isLoadingMapRef = useRef(false); // Harita yükleniyor mu ref
  
  // Session Storage Key
  const sessionStorageKey = 'acillazim_map_locations_cache';

  // Sıralama durumu
  const [sortState, setSortState] = useState({ field: '', direction: '' });
  const [sortedListings, setSortedListings] = useState([]);

  // Harita merkezini güncelleyen komponent
  const MapUpdater = ({ center, zoom }) => {
    const map = useMap();
    
    useEffect(() => {
      if (center) {
        map.setView(center, zoom);
      }
    }, [center, map, zoom]);
    
    // Harita hareket ettiğinde veya zoom değiştiğinde çağrılacak işlev
    const handleMapViewChange = () => {
      // Tam ekran modunda işlemleri sınırlandır
      if (document.body.classList.contains('map-fullscreen-active')) {
        // Eğer son işlemden bu yana 3 saniyeden az zaman geçtiyse, hiçbir şey yapma
        const now = Date.now();
        if (window._lastMapOperation && (now - window._lastMapOperation) < 3000) {
          // console.log('Son işlem üzerinden yeterli zaman geçmedi, işlem yapılmıyor');
          return;
        }
        
        // Son işlem zamanını kaydet
        window._lastMapOperation = now;
        
        // Önemli değişiklik - Son koordinatlar ile şu anki koordinatlar arasında büyük fark varsa işlem yap
        const currentCenter = map.getCenter();
        const lastCenter = map._lastCenter || { lat: 0, lng: 0 };
        const currentZoom = map.getZoom();
        const lastZoom = map._lastZoom || 0;
        
        // Haritanın merkezi veya zoom seviyesi önemli ölçüde değiştiyse işlem yap
        const centerChanged = Math.abs(currentCenter.lat - lastCenter.lat) > 0.5 || 
                             Math.abs(currentCenter.lng - lastCenter.lng) > 0.5;
        const zoomChanged = Math.abs(currentZoom - lastZoom) >= 2;
        
        if (centerChanged || zoomChanged) {
          // Son durumu kaydet
          map._lastCenter = currentCenter;
          map._lastZoom = currentZoom;
          
          // Gecikmeyi artır ve sadece gerçekten büyük değişikliklerde yükle
          if (window.mapViewChangeTimeout) {
            clearTimeout(window.mapViewChangeTimeout);
          }
          window.mapViewChangeTimeout = setTimeout(() => {
            // Pencere aktif değilse yükleme yapmayı atla
            if (document.hidden) return;
            
            console.log('Önemli harita değişikliği, yeni konumlar yükleniyor...');
            
            // Görünen alandaki konumları yükle
            const bounds = map.getBounds();
            if (bounds) {
              const visibleArea = {
                minLat: bounds.getSouthWest().lat,
                maxLat: bounds.getNorthEast().lat,
                minLng: bounds.getSouthWest().lng,
                maxLng: bounds.getNorthEast().lng
              };
              
              // Koordinat değişimini daha katı kontrol et
              const lastCoords = window._lastLoadedCoords || {};
              const coordsChanged = !lastCoords.minLat || 
                                 Math.abs(lastCoords.minLat - visibleArea.minLat) > 0.5 ||
                                 Math.abs(lastCoords.maxLat - visibleArea.maxLat) > 0.5 ||
                                 Math.abs(lastCoords.minLng - visibleArea.minLng) > 0.5 ||
                                 Math.abs(lastCoords.maxLng - visibleArea.maxLng) > 0.5;
              
              if (coordsChanged) {
                window._lastLoadedCoords = visibleArea;
                loadVisibleLocations(bounds);
              }
            }
          }, 1500); // Çok daha uzun gecikme ile yükleme yap
        }
      }
    };
    
    // Harita olaylarını dinle - Tam ekran moduna özel olarak kontrol ekle
    useEffect(() => {
      // İlk başlangıçta değerleri ata
      map._lastCenter = map.getCenter();
      map._lastZoom = map.getZoom();
      window._lastMapOperation = Date.now();
      
      // Olayları dinle
      const moveEndHandler = () => {
        if (document.body.classList.contains('map-fullscreen-active')) {
          handleMapViewChange();
        }
      };
      
      const zoomEndHandler = () => {
        if (document.body.classList.contains('map-fullscreen-active')) {
          handleMapViewChange();
        }
      };
      
      map.on('moveend', moveEndHandler);
      map.on('zoomend', zoomEndHandler);
      
      return () => {
        map.off('moveend', moveEndHandler);
        map.off('zoomend', zoomEndHandler);
      };
    }, [map]);
    
    return null;
  };

  // Görünen alandaki konumları yükleme fonksiyonu güncellendi
  const loadVisibleLocations = async (bounds) => {
    if (!bounds) return;
    
    // Tam ekran modunda çok daha sıkı kontroller uygula
    if (document.body.classList.contains('map-fullscreen-active')) {
      // Son yapılan istek üzerinden en az 5 saniye geçmiş olmalı
      const now = Date.now();
      if (window._lastLocationsLoadTime && (now - window._lastLocationsLoadTime) < 5000) {
        console.log('Son konum yüklemesi üzerinden yeterli zaman geçmedi, işlem iptal ediliyor.');
        return;
      }
      
      // Kullanıcı sayfada aktif değilse işlem yapma (sekme arkaplanda)
      if (document.hidden) {
        console.log('Sayfa görünür değil, konum yüklemesi yapılmıyor.');
        return;
      }
    }
    
    // Eğer harita yükleniyor veya hata varsa, işlemi atlayalım
    if (mapLoading || mapError) return;
    
    // Görünen alan sınırlarını al
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    
    // API'ye gönderilecek koordinat sınırları
    const visibleArea = {
      minLat: southWest.lat,
      maxLat: northEast.lat,
      minLng: southWest.lng,
      maxLng: northEast.lng
    };
    
    // Son yüklenen koordinatlarla karşılaştır (gereksiz API çağrılarını önlemek için)
    const lastCoords = window._lastLoadedCoords || {};
    
    // Tam ekran modunda çok daha büyük fark olması gerekli
    const minCoordDiff = document.body.classList.contains('map-fullscreen-active') ? 0.5 : 0.1;
    
    const coordsChanged = !lastCoords.minLat || 
                        Math.abs(lastCoords.minLat - visibleArea.minLat) > minCoordDiff ||
                        Math.abs(lastCoords.maxLat - visibleArea.maxLat) > minCoordDiff ||
                        Math.abs(lastCoords.minLng - visibleArea.minLng) > minCoordDiff ||
                        Math.abs(lastCoords.maxLng - visibleArea.maxLng) > minCoordDiff;
    
    // Koordinatlar değişmediyse, işlemi atla
    if (!coordsChanged) {
      console.log('Koordinat farkı çok az, konum yüklemesi yapılmıyor.');
      return;
    }
    
    // Yeni koordinatları kaydet
    window._lastLoadedCoords = visibleArea;
    window._lastLocationsLoadTime = Date.now();
    
    console.log('Görünen alan koordinatları:', visibleArea);
    
    try {
      // Yükleme durumunu güncelle
      setMapLoading(true);
      
      // Görünen alandaki konumları yükle
      const visibleLocations = await mapLocationService.getLocationsInBounds(visibleArea);
      
      // Tam ekran modunda iken işlemi iptal et (gerçek bir veri almak istiyorsak bu kısmı kaldırabiliriz)
      if (document.body.classList.contains('map-fullscreen-active')) {
        console.log('Tam ekran modunda konum güncellemesi yapılmıyor.');
        setMapLoading(false);
        return;
      }
      
      if (visibleLocations && visibleLocations.length > 0) {
        // Yeni konumları mevcut konumlara ekle (duplicate kontrolü yaparak)
        setMapLocations((prevLocations) => {
          // Mevcut konum ID'lerini al
          const existingIds = new Set(prevLocations.map(loc => loc.id));
          
          // Sadece yeni konumları filtreleyip ekle
          const newLocations = visibleLocations.filter(loc => !existingIds.has(loc.id));
          
          console.log(`${newLocations.length} yeni konum ekleniyor`);
          
          // Tüm konumları birleştir
          return [...prevLocations, ...newLocations];
        });
        
        // Harita tam ekran modunda DEĞİLSE önbelleğe ekle
        if (!document.body.classList.contains('map-fullscreen-active')) {
          const locationCache = {};
          visibleLocations.forEach(loc => {
            if (loc.id) {
              locationCache[loc.id] = loc;
            }
          });
          
          // Önbelleğe ekle
          setCachedLocations(prev => ({...prev, ...locationCache}));
          
          // Session storage'a da ekleyelim
          try {
            const existingCache = JSON.parse(sessionStorage.getItem(sessionStorageKey) || '{"locations":{}}');
            const updatedCache = {
              locations: {...existingCache.locations, ...locationCache},
              timestamp: Date.now()
            };
            sessionStorage.setItem(sessionStorageKey, JSON.stringify(updatedCache));
          } catch (error) {
            console.warn("Session storage'a veri kaydedilemedi:", error);
          }
        }
      }
      
      setMapLoading(false);
    } catch (error) {
      console.error('Görünen alandaki konumlar yüklenirken hata:', error);
      setMapLoading(false);
    }
  };

  // İlan listesi değişip değişmediğini kontrol et
  const hasListingsChanged = useCallback((newListings) => {
    if (!newListings || !newListings.length) return true;
    
    // ID'leri çıkart
    const newIds = newListings.map(item => item.id || item.ilan_id).sort().join(',');
    const oldIds = lastListingIds.join(',');
    
    return newIds !== oldIds;
  }, [lastListingIds]);
  
  // Session Storage'dan konum verilerini al
  const getLocationsFromSessionStorage = useCallback(() => {
    try {
      const cachedData = sessionStorage.getItem(sessionStorageKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const timestamp = parsedData.timestamp || 0;
        const now = Date.now();
        
        // 30 dakika geçerliliği olan önbellek
        if (now - timestamp < 30 * 60 * 1000) {
          console.log("Session storage'dan konum bilgileri alındı");
          return parsedData.locations || {};
        } else {
          console.log("Session storage'daki konum bilgileri süresi dolmuş");
        }
      }
    } catch (error) {
      console.warn("Session storage'dan veri alınamadı:", error);
    }
    return {};
  }, []);
  
  // Session Storage'a konum verilerini kaydet
  const saveLocationsToSessionStorage = useCallback((locations) => {
    try {
      const dataToSave = {
        locations,
        timestamp: Date.now()
      };
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(dataToSave));
      console.log("Konum bilgileri session storage'a kaydedildi");
    } catch (error) {
      console.warn("Session storage'a veri kaydedilemedi:", error);
    }
  }, []);

  // Harita modu etkinleştiğinde konumları yükle
  useEffect(() => {
    if (viewMode !== 'map') {
      // Harita modundan çıkıldığında ref'i güncelle
      prevViewModeRef.current = viewMode;
      return;
    }
    
    // Önceden harita modundaysak ve hala harita modundaysak, tekrar yükleme yapma
    if (prevViewModeRef.current === 'map') {
      return;
    }
    
    // Yükleme işlemi halihazırda devam ediyorsa çık
    if (isLoadingMapRef.current === true) {
      return;
    }
    
    // Referansları güncelle
    prevViewModeRef.current = 'map';
    
    // Önceden harita yüklendiyse ve konumlar varsa tekrar yükleme
    if (hasLoadedMapRef.current && mapLocations.length > 0) {
      return;
    }
    
    // Harita yükleme işlemini bir kere yapacağımızı işaretle
    hasLoadedMapRef.current = true;
    isLoadingMapRef.current = true;
    
    console.log('Harita modu ilk kez aktifleştirildi, konumlar yükleniyor...');
    
    // Varsa önceki isteği iptal et
    if (locationFetchRef.current) {
      locationFetchRef.current.cancelled = true;
      locationFetchRef.current = null;
    }
    
    // Asenkron fonksiyonu hemen çağırmak yerine, setTimeout ile mikro gecikme ekle
    // Bu React'in render döngüsünden kaçınmaya yardımcı olur
    setTimeout(() => {
      const loadLocationsWithTimeout = async () => {
        try {
          // Sadece bir kez yükleme yapacağımızı işaretle
          setIsMapInitialized(true);
          
          // API çağrısı için zaman aşımı ekle
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Konum yükleme zaman aşımı')), 5000)
          );
          
          // Konum yükleme işlemini başlat
          await Promise.race([
            prepareMapLocations(),
            timeoutPromise
          ]);
          
        } catch (error) {
          console.warn('Konum yükleme zaman aşımı veya hata:', error);
        } finally {
          // İşlem bitti, yükleme bayrağını temizle
          isLoadingMapRef.current = false;
        }
      };
      
      loadLocationsWithTimeout();
    }, 0);
    
    // Bileşen unmount olduğunda temizlik yap
    return () => {
      if (locationFetchRef.current) {
        locationFetchRef.current.cancelled = true;
      }
    };
  }, [viewMode]); // Sadece viewMode değiştiğinde çalış

  // İlan listesi değiştiğinde konumları güncelle - Bu useEffect'i ayrı tutarak bağımlılık çakışmalarını önleyelim
  useEffect(() => {
    // Eğer harita modu aktif değilse veya hiç yüklenmemişse, veya halihazırda bir yükleme yapılıyorsa işlemi atla
    if (viewMode !== 'map' || !hasLoadedMapRef.current || isLoadingMapRef.current) {
      return;
    }
    
    // İlan ID'leri değiştiyse ve yükleme yapılmıyorsa
    const listingIdsChanged = (() => {
      if (!listings || !listings.length) return false;
      // Basit bir kontrol: ilan sayısı değişti mi?
      if (listings.length !== lastListingIds.length) return true;
      
      // Daha detaylı karşılaştırma için ID'leri string olarak karşılaştır
      const newIds = listings.map(item => item.id || item.ilan_id).sort().join(',');
      const oldIds = lastListingIds.join(',');
      return newIds !== oldIds;
    })();
    
    if (listingIdsChanged && !mapLoading) {
      console.log('İlan listesi değişti, harita konumları güncelleniyor');
      // Önceki isteği iptal et
      if (locationFetchRef.current) {
        locationFetchRef.current.cancelled = true;
      }
      
      // Gecikme ekleyerek peş peşe render'ları engelle
      setTimeout(() => {
        isLoadingMapRef.current = true;
        prepareMapLocations().finally(() => {
          isLoadingMapRef.current = false;
        });
      }, 0);
    }
  }, [listings, lastListingIds.length, mapLoading, viewMode]);

  // İlan konumlarını hazırlama (Promise tabanlı yeni servis yapısı ile)
  const prepareMapLocations = useCallback(async () => {
    // Önceki isteği iptal et (eğer varsa)
    if (locationFetchRef.current) {
      console.log('Önceki konum yükleme isteği iptal edildi');
      locationFetchRef.current.cancelled = true;
    }
    
    // Yeni istek referansı oluştur
    const currentFetchRef = { cancelled: false };
    locationFetchRef.current = currentFetchRef;
    
    if (!listings || listings.length === 0) {
      return [];
    }

    setMapLoading(true);
    setMapError(null);
    
    try {
      // Session Storage'dan veri almayı dene
      const sessionCache = getLocationsFromSessionStorage();
      
      // İlan ID'lerini al
      const listingIds = listings.map(item => item.id || item.ilan_id);
      
      // İlanlara göre session cache filtrele
      const cachedLocationsFromSession = {};
      let hasAllLocationsInCache = true;
      
      // Tüm ilanlar önbellekte var mı kontrol et
      for (const id of listingIds) {
        if (sessionCache[id]) {
          cachedLocationsFromSession[id] = sessionCache[id];
        } else {
          hasAllLocationsInCache = false;
        }
      }
      
      // Tüm konumlar önbellekteyse, onları kullan
      if (hasAllLocationsInCache && Object.keys(cachedLocationsFromSession).length > 0) {
        // Burada setMapLocations'ı çağırmadan önce kontrol edelim çünkü bu çağrı render tetikleyebilir
        if (currentFetchRef.cancelled) {
          console.log('İstek iptal edildi, state güncellenmeyecek');
          return [];
        }
        
        console.log("Tüm konumlar session storage'dan alındı");
        
        // Locations dizisini oluştur
        const cachedLocationArray = Object.values(cachedLocationsFromSession);
        
        // State'leri güncelle (render tetiklenir)
        setLastListingIds(listingIds);
        setCachedLocations(cachedLocationsFromSession);
        setMapLocations(cachedLocationArray);
        setMapLoading(false);
        
        return cachedLocationArray;
      }
      
      // İstek iptal edilmiş mi kontrol et
      if (currentFetchRef.cancelled) {
        console.log('Konum yükleme isteği iptal edildi');
        return [];
      }
      
      // Yeni geliştirilen asenkron servis metodu ile konum bilgilerini al
      const locationsWithCoordinates = await mapLocationService.getListingLocations(listings, false);
      
      // İstek iptal edilmiş mi tekrar kontrol et
      if (currentFetchRef.cancelled) {
        console.log('Konum yükleme isteği tamamlandıktan sonra iptal edildi');
        return [];
      }
      
      // ID listesini güncelle
      setLastListingIds(listingIds);
      
      // Konum bilgisi olan ilanları filtreleyip harita için hazırla
      const locations = locationsWithCoordinates
        .filter(listing => listing.latitude && listing.longitude)
        .map((listing) => {
          // İlan görselini servisten al
          const imageUrl = mapLocationService.getListingImageUrl(listing);
          
          const listingId = listing.id || listing.ilan_id;
          
          const locationObj = {
            id: listingId,
            latitude: parseFloat(listing.latitude),
            longitude: parseFloat(listing.longitude),
            title: listing.title || listing.baslik || 'İlan',
            price: listing.price || listing.fiyat || 0,
            address: formatAddress(listing),
            locationSource: listing.locationSource || 'unknown',
            image: imageUrl,
            // Filtreleme için orijinal ilan verisi
            originalData: listing
          };
          
          return locationObj;
        });
      
      // İstek iptal edilmiş mi son kez kontrol et
      if (currentFetchRef.cancelled) {
        console.log('İşlenmiş konum verileri kullanılmadan iptal edildi');
        return [];
      }
      
      // Önbelleğe ekle (hem state hem session storage)
      const locationCache = {};
      locations.forEach(loc => {
        locationCache[loc.id] = loc;
      });
      
      // Session storage'a kaydet
      saveLocationsToSessionStorage({
        ...sessionCache,
        ...locationCache
      });
      
      setCachedLocations(locationCache);
      
      // State'i güncelle
      setMapLocations(locations);
      setMapLoading(false);
      return locations;
    } catch (error) {
      // İstek iptal edilmediyse hata göster
      if (!currentFetchRef.cancelled) {
        console.error('Harita lokasyonları hazırlanırken hata:', error);
        setMapError('Harita konumları yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        setMapLoading(false);
      }
      return [];
    }
  }, [listings, getLocationsFromSessionStorage, saveLocationsToSessionStorage]);

  // Adres bilgisini formatla
  const formatAddress = (listing) => {
    if (listing.konum) {
      const parts = [];
      
      if (listing.konum.mahalle) parts.push(listing.konum.mahalle);
      if (listing.konum.koy) parts.push(listing.konum.koy);
      if (listing.konum.ilce) parts.push(listing.konum.ilce);
      if (listing.konum.il) parts.push(listing.konum.il);
      
      if (parts.length > 0) return parts.join(', ');
    }
    
    // İlanın ozellikler kısmında konum var mı kontrol et
    if (listing.ozellikler) {
      const parts = [];
      
      if (listing.ozellikler.mahalle) parts.push(listing.ozellikler.mahalle);
      if (listing.ozellikler.koy) parts.push(listing.ozellikler.koy);
      if (listing.ozellikler.ilce) parts.push(listing.ozellikler.ilce); 
      if (listing.ozellikler.il) parts.push(listing.ozellikler.il);
      
      if (parts.length > 0) return parts.join(', ');
    }
    
    // Adres, il, ilçe gibi direkt alanları kontrol et
    return (
      listing.address || 
      listing.adres || 
      `${listing.il || ''} ${listing.ilce || ''}`.trim() || 
      'Konum bilgisi yok'
    );
  };

  /**
   * Özel marker ikonu oluşturur
   * @param {string} imageUrl - İlan resmi URL
   * @param {string} source - Konum kaynağı
   * @param {number} count - Aynı konumdaki ilan sayısı (opsiyonel)
   * @returns {Object} - Leaflet icon nesnesi
   */
  const createCustomMarkerIcon = (imageUrl, source, count = 0) => {
    // Görsel URL'i kontrol et
    const validImageUrl = imageUrl || 'https://via.placeholder.com/50?text=?';
    
    // Birden fazla ilan varsa
    if (count > 1) {
      // Konum işareti (pin) şeklinde marker oluştur - içinde resim yerine sayı göster
      return L.divIcon({
        html: `
          <div class="map-pin-container">
            <div class="map-pin-head multiple-listings">
              <div class="listing-count">+${count}</div>
            </div>
            <div class="map-pin-tail"></div>
          </div>
        `,
        className: 'custom-pin-marker',
        iconSize: [40, 56],  // Pin boyutu (en, boy)
        iconAnchor: [20, 56], // Pin alt orta noktası
        popupAnchor: [0, -50] // Popup konumu
      });
    }
    
    // Tek ilan için normal resimli işaretçi
    return L.divIcon({
      html: `
        <div class="map-pin-container">
          <div class="map-pin-head">
            <img src="${validImageUrl}" alt="İlan" class="map-pin-image" />
          </div>
          <div class="map-pin-tail"></div>
        </div>
      `,
      className: 'custom-pin-marker',
      iconSize: [40, 56],  // Pin boyutu (en, boy)
      iconAnchor: [20, 56], // Pin alt orta noktası
      popupAnchor: [0, -50] // Popup konumu
    });
  };

  // Filtrelere göre harita konumlarını filtrele
  const filteredMapLocations = useMemo(() => {
    // Harita konumları boşsa, boş dizi dön
    if (!mapLocations || mapLocations.length === 0) return [];
    
    // Filtre yoksa ve listings varsa, tüm konumları göster
    if ((!filters || Object.keys(filters).length === 0) && listings && listings.length > 0) {
      return mapLocations;
    }
    
    // Listings boşsa, hiçbir marker gösterme
    if (!listings || listings.length === 0) {
      return [];
    }
    
    // Filtrelenmiş markerleri hesapla
    const filtered = mapLocations.filter(location => {
      const listing = location.originalData;
      if (!listing) return false; // Orijinal veri yoksa gösterme
      
      // Filtreleri kontrol et
      let matchesFilters = true;
      
      // Fiyat filtresi
      if (filters.minPrice && (!listing.price || listing.price < filters.minPrice)) {
        matchesFilters = false;
      }
      if (filters.maxPrice && listing.price > filters.maxPrice) {
        matchesFilters = false;
      }
      
      // İl/ilçe filtresi
      if (filters.province && listing.il && listing.il.toLocaleUpperCase('tr-TR') !== filters.province.toLocaleUpperCase('tr-TR')) {
        matchesFilters = false;
      }
      if (filters.district && listing.ilce && listing.ilce.toLocaleUpperCase('tr-TR') !== filters.district.toLocaleUpperCase('tr-TR')) {
        matchesFilters = false;
      }
      
      // Kategori filtresi
      if (filters.category && listing.kategori_id && listing.kategori_id !== filters.category) {
        matchesFilters = false;
      }
      
      return matchesFilters;
    });

    // Eşleşen varsa onları döndür, yoksa boş dizi döndür
    return filtered;
  }, [mapLocations, filters, listings]);

  // İlanları sırala
  useEffect(() => {
    if (!listings || !listings.length) {
      setSortedListings([]);
      return;
    }
    
    // Sıralama yoksa orijinal listeleri kullan
    if (!sortState.field) {
      setSortedListings([...listings]);
      return;
    }
    
    // İlanları kopyala (orjinal listeyi değiştirmemek için)
    const listingsCopy = [...listings];
    
    // Sıralama yap
    if (sortState.field === 'date') {
      // Tarih sıralaması
      listingsCopy.sort((a, b) => {
        const dateA = a.date || a.tarih || a.created_at || a.ilan_tarihi || '';
        const dateB = b.date || b.tarih || b.created_at || b.ilan_tarihi || '';
        
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        const timeA = new Date(dateA).getTime();
        const timeB = new Date(dateB).getTime();
        
        // En yeniden en eskiye doğru (desc) veya tersine (asc)
        return sortState.direction === 'desc' ? timeB - timeA : timeA - timeB;
      });
    } else if (sortState.field === 'location') {
      // Konum sıralaması (il/ilçe)
      listingsCopy.sort((a, b) => {
        // Önce il alanlarını kontrol et
        const ilA = a.il || (a.konum && a.konum.il) || (a.ozellikler && a.ozellikler.il) || '';
        const ilB = b.il || (b.konum && b.konum.il) || (b.ozellikler && b.ozellikler.il) || '';
        
        // İl alanları farklı ise karşılaştır
        if (ilA !== ilB) {
          return sortState.direction === 'desc' 
            ? ilB.localeCompare(ilA, 'tr-TR') 
            : ilA.localeCompare(ilB, 'tr-TR');
        }
        
        // İl alanları aynı ise ilçeleri karşılaştır
        const ilceA = a.ilce || (a.konum && a.konum.ilce) || (a.ozellikler && a.ozellikler.ilce) || '';
        const ilceB = b.ilce || (b.konum && b.konum.ilce) || (b.ozellikler && b.ozellikler.ilce) || '';
        
        return sortState.direction === 'desc' 
          ? ilceB.localeCompare(ilceA, 'tr-TR') 
          : ilceA.localeCompare(ilceB, 'tr-TR');
      });
    } else if (sortState.field === 'price') {
      // Fiyat sıralaması
      listingsCopy.sort((a, b) => {
        const priceA = parseFloat(a.price || a.fiyat || 0);
        const priceB = parseFloat(b.price || b.fiyat || 0);
        
        // Düşükten yükseğe (asc) veya yüksekten düşüğe (desc)
        return sortState.direction === 'desc' ? priceB - priceA : priceA - priceB;
      });
    }
    
    // Sıralanmış sonuçları ayarla
    setSortedListings(listingsCopy);
  }, [listings, sortState]);
  
  // Sıralama işleyicisi
  const handleSort = (field, direction) => {
    setSortState({ field, direction });
    console.log(`İlanlar ${field} alanına göre ${direction === 'asc' ? 'artan' : 'azalan'} sırada sıralanıyor`);
  };

  // Sayfalama butonları oluştur
  const renderPagination = () => {
    const { currentPage, totalPages } = pagination;
    
    // Eğer toplam sayfa sayısı 1 ise, sayfalama gösterme
    if (totalPages <= 1) {
      return null;
    }
    
    // Sayfa butonları için dizi oluştur
    let pageButtons = [];
    
    // Sayfalama mantığı
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // Başa git
    if (currentPage > 1) {
      pageButtons.push(
        <button 
          key="prev" 
          className="pagination-btn prev" 
          onClick={() => onPageChange(currentPage - 1)}
        >
          &laquo;
        </button>
      );
    }
    
    // İlk sayfa
    if (startPage > 1) {
      pageButtons.push(
        <button 
          key="1" 
          className={`pagination-btn ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => onPageChange(1)}
        >
          1
        </button>
      );
      
      // Aradaki sayfalar çok ise, üç nokta göster
      if (startPage > 2) {
        pageButtons.push(
          <span key="dots1" className="pagination-dots">...</span>
        );
      }
    }
    
    // Orta sayfalar
    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <button 
          key={i} 
          className={`pagination-btn ${currentPage === i ? 'active' : ''}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      );
    }
    
    // Son sayfa
    if (endPage < totalPages) {
      // Aradaki sayfalar çok ise, üç nokta göster
      if (endPage < totalPages - 1) {
        pageButtons.push(
          <span key="dots2" className="pagination-dots">...</span>
        );
      }
      
      pageButtons.push(
        <button 
          key={totalPages} 
          className={`pagination-btn ${currentPage === totalPages ? 'active' : ''}`}
          onClick={() => onPageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }
    
    // İleri git
    if (currentPage < totalPages) {
      pageButtons.push(
        <button 
          key="next" 
          className="pagination-btn next" 
          onClick={() => onPageChange(currentPage + 1)}
        >
          &raquo;
        </button>
      );
    }
    
    return (
      <div className="filter-pagination">
        {pageButtons}
      </div>
    );
  };
  
  // Favoriye ekle/çıkar işlevi
  const handleFavoriteToggle = (productId, isFavorite) => {
    console.log(`Ürün ${productId} favori durumu: ${isFavorite ? 'Eklendi' : 'Çıkarıldı'}`);
    // Burada favorilere ekleme/çıkarma işlemi yapılabilir
  };
  
  // Ürün tıklama işlevi - Artık yönlendirme yapmıyor
  const handleProductClick = (productId) => {
    console.log(`Ürün ${productId} tıklandı - İşlem Link bileşeni tarafından gerçekleştiriliyor`);
    // Link bileşeni yönlendirmeyi kendisi yapacak
  };

  // Aynı koordinattaki ilanları grupla
  const groupLocationsByCoordinates = (locations) => {
    const groups = {};
    
    if (!locations || !locations.length) return [];
    
    // Koordinatlara göre grupla
    locations.forEach(location => {
      // Koordinatları yuvarla (aynı konumda olsalar bile küçük farklar olabilir)
      const lat = parseFloat(parseFloat(location.latitude).toFixed(5));
      const lng = parseFloat(parseFloat(location.longitude).toFixed(5));
      
      // Gruplama anahtarı
      const key = `${lat},${lng}`;
      
      if (!groups[key]) {
        groups[key] = {
          latitude: lat,
          longitude: lng,
          listings: []
        };
      }
      
      groups[key].listings.push(location);
    });
    
    // Grupları diziye dönüştür
    return Object.values(groups);
  };

  // Kaydırmalı Popup içeriği (aynı konumdaki çoklu ilanlar için)
  const SliderPopup = ({ listings }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const totalListings = listings.length;
    const currentListing = listings[currentIndex];
    
    const goToPrevious = () => {
      setCurrentIndex(prevIndex => 
        prevIndex === 0 ? totalListings - 1 : prevIndex - 1
      );
    };
    
    const goToNext = () => {
      setCurrentIndex(prevIndex => 
        prevIndex === totalListings - 1 ? 0 : prevIndex + 1
      );
    };
    
    return (
      <div className="map-popup slider-popup">
        <div className="popup-counter">
          <span>{currentIndex + 1}</span> / {totalListings}
        </div>
        
        {currentListing.image && (
          <div className="map-popup-image-container">
            <img 
              src={currentListing.image} 
              alt={currentListing.title} 
              className="map-popup-image"
            />
          </div>
        )}
        
        <div className="map-popup-content">
          <h4>{currentListing.title ? decodeHtmlEntities(currentListing.title) : ''}</h4>
          <p className="map-popup-price">{currentListing.price.toLocaleString('tr-TR')} ₺</p>
          <p className="map-popup-address">{currentListing.address}</p>
          
          <div className="popup-buttons">
            <Link 
              href={urlService.getIlanUrl(currentListing.originalData || { 
                id: currentListing.id, 
                ilan_id: currentListing.id, 
                baslik: decodeHtmlEntities(currentListing.title) 
              })}
              className="map-popup-link primary"
              onClick={() => handleProductClick(currentListing.id)}
            >
              İlanı Görüntüle
            </Link>
            
            {totalListings > 1 && (
              <div className="popup-thumbnails">
                {listings.map((listing, index) => (
                  <div 
                    key={listing.id} 
                    className={`popup-thumbnail ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(index)}
                    style={{ backgroundImage: `url(${listing.image})` }}
                    title={listing.title}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Harita render etme işlevi güncellendi
  const renderMap = () => {
    // Harita yüklenme durumu
    if (mapLoading) {
      return (
        <div className="map-container">
          <div className="map-loading">
            <div className="map-loading-content">
              <i className="fas fa-map-marked-alt"></i>
              <h3>Harita Yükleniyor</h3>
              <p>Konumlar hazırlanıyor, lütfen bekleyin...</p>
            </div>
          </div>
        </div>
      );
    }
    
    // Hata durumu
    if (mapError) {
      return (
        <div className="map-container">
          <div className="map-error">
            <div className="map-error-content">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Harita Yüklenemedi</h3>
              <p>{mapError}</p>
            </div>
          </div>
        </div>
      );
    }
    
    // Konumları koordinatlara göre grupla
    const locationGroups = groupLocationsByCoordinates(filteredMapLocations);
    
    // Varsayılan konum ve zoom
    let centerPosition = [39.0, 35.0]; // Türkiye'nin ortası
    let zoomLevel = 6; // Sabit zoom seviyesi - Türkiye'nin tamamı görünecek şekilde
    
    // Konum varsa ortalama konum hesapla
    if (locationGroups && locationGroups.length > 0) {
      // Tüm konumların ortalaması
      let sumLat = 0;
      let sumLng = 0;
      
      locationGroups.forEach(group => {
        sumLat += parseFloat(group.latitude);
        sumLng += parseFloat(group.longitude);
      });
      
      // Sadece merkezi hesapla, zoom seviyesini değiştirme
      centerPosition = [sumLat / locationGroups.length, sumLng / locationGroups.length];
      
      // Not: Zoom seviyesi sabit tutuldu (zoomLevel = 6)
    }
    
    // Toplam ilan ve haritadaki konum sayısı
    const totalListings = pagination?.totalListings || 0;
    const totalLocationsInMap = filteredMapLocations?.length || 0;
    const totalGroupsInMap = locationGroups?.length || 0;
    
    // Tam ekran moduna geçiş/çıkış işlevi güncellendi
    const toggleFullscreen = () => {
      // Tam ekran modunu değiştir
      const newFullscreenState = !isFullscreen;
      setIsFullscreen(newFullscreenState);
      
      // Tam ekran moduna geçilirse body'ye class ekle
      if (newFullscreenState) {
        document.body.classList.add('map-fullscreen-active');
        
        // Harita referansını al ve tam ekran moduna geçildiğinde ilk kez görünen konumları yükle
        // Bu kısmı setTimeout ile erteleyerek haritanın tam boyutunu almasını bekleyebiliriz
        setTimeout(() => {
          const mapInstance = document.querySelector('.leaflet-container')?._leaflet_map;
          if (mapInstance) {
            // Haritanın yeniden boyutlandırılmasını tetikle
            mapInstance.invalidateSize();
            
            // Önceki koordinat kontrolünü sıfırla, böylece yeni boyuta göre ilk kontrolde mutlaka yükleme yapar
            if (window._lastLoadedCoords) {
              window._lastLoadedCoords = null;
            }
            
            // Son merkez ve zoom bilgilerini de sıfırla
            mapInstance._lastCenter = null;
            mapInstance._lastZoom = null;
            
            // Gecikme ekleyerek UI'nin tam oluşmasını bekleyelim
            setTimeout(() => {
              // Tam ekrana geçtikten sonra, merkez ve zoom seviyesini daha geniş bir görünüm için ayarla
              const bounds = mapInstance.getBounds();
              if (bounds) {
                // Bu kontrolle sadece ihtiyaç duyulduğunda konumları yükleriz
                const center = mapInstance.getCenter();
                if (!window._lastFullscreenCenter || 
                    Math.abs(center.lat - window._lastFullscreenCenter.lat) > 0.1 ||
                    Math.abs(center.lng - window._lastFullscreenCenter.lng) > 0.1) {
                  
                  window._lastFullscreenCenter = center;
                  console.log('Tam ekran moda geçildi, görünen konumlar yükleniyor...');
                  loadVisibleLocations(bounds);
                } else {
                  console.log('Tam ekran moda geçildi, ancak konum değişmediği için yükleme yapılmıyor.');
                }
              }
            }, 600);
          }
        }, 200); // Haritanın tam ekran boyutuna geçmesi için kısa bir süre bekle
      } else {
        document.body.classList.remove('map-fullscreen-active');
        
        // Tam ekrandan çıkıldığında, gereksiz işlemleri önlemek için mevcut koordinat bilgilerini sıfırla
        window._lastLoadedCoords = null;
        window._lastFullscreenCenter = null;
        
        // Harita referansını al ve boyutu yeniden hesapla
        setTimeout(() => {
          const mapInstance = document.querySelector('.leaflet-container')?._leaflet_map;
          if (mapInstance) {
            mapInstance.invalidateSize();
          }
        }, 200);
      }
    };
    
    return (
      <div className={`map-container ${isFullscreen ? 'map-fullscreen' : ''}`}>
        <MapContainer 
          center={centerPosition} 
          zoom={zoomLevel} 
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <ZoomControl position="bottomright" />
          <MapUpdater center={centerPosition} zoom={zoomLevel} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {locationGroups && locationGroups.length > 0 && 
            locationGroups.map(group => {
              const numListings = group.listings.length;
              // İlk ilanın resmini al
              const firstListing = group.listings[0];
              const imageUrl = firstListing.image;
              
              return (
            <Marker 
                  key={`group-${group.latitude}-${group.longitude}`} 
                  position={[group.latitude, group.longitude]}
                  icon={createCustomMarkerIcon(imageUrl, firstListing.locationSource, numListings)}
                >
                  {numListings > 1 ? (
                    <Popup maxWidth={300} minWidth={300}>
                      <SliderPopup listings={group.listings} />
                    </Popup>
                  ) : (
              <Popup>
                <div className="map-popup">
                        {firstListing.image && (
                      <div className="map-popup-image-container">
                    <img 
                              src={firstListing.image} 
                              alt={firstListing.title} 
                      className="map-popup-image"
                    />
                      </div>
                    )}
                    <div className="map-popup-content">
                          <h4>{firstListing.title ? decodeHtmlEntities(firstListing.title) : ''}</h4>
                          <p className="map-popup-price">{firstListing.price.toLocaleString('tr-TR')} ₺</p>
                          <p className="map-popup-address">{firstListing.address}</p>
                      <Link 
                            href={urlService.getIlanUrl(firstListing.originalData || { 
                              id: firstListing.id, 
                              ilan_id: firstListing.id, 
                              baslik: decodeHtmlEntities(firstListing.title) 
                            })}
                        className="map-popup-link"
                            onClick={() => handleProductClick(firstListing.id)}
                      >
                        İlanı Görüntüle
                      </Link>
                    </div>
                </div>
              </Popup>
                  )}
            </Marker>
              );
            })
          }
        </MapContainer>
        
        {/* Büyütme/Küçültme butonu */}
        <button 
          className="map-fullscreen-toggle" 
          onClick={toggleFullscreen}
          title={isFullscreen ? "Küçült" : "Büyüt"}
        >
          {isFullscreen ? (
            <i className="fas fa-compress-alt"></i> 
          ) : (
            <i className="fas fa-expand-alt"></i>
          )}
        </button>
        
        {/* İstatistik bilgileri */}
        <div className="map-info-overlay">
          <div className="map-info-stats">
            <span>Toplam: {totalListings} ilan</span>
            <span>Haritada: {totalLocationsInMap} ilan / {totalGroupsInMap} konum</span>
          </div>
        </div>
      </div>
    );
  };
  
  // Sonuç içeriği render et
  const renderResults = () => {
    // Harita görünümü aktifse
    if (viewMode === 'map') {
      return renderMap();
    }

    // Sonuç bulunamadı durumu - Sadece harita modu dışındaki modlarda göster
    if (!listings || listings.length === 0) {
      return (
        <div className="filter-results-empty">
          <div className="empty-icon">🔍</div>
          <h3>Sonuç Bulunamadı</h3>
          <p>Filtreleri değiştirerek tekrar arama yapabilirsiniz.</p>
        </div>
      );
    }
    
    // Normal sonuç listeleme
    return (
      <>
        {/* Başlık satırını sadece liste görünümünde göster */}
        {viewMode === 'list' && 
          <ResultsHeader 
            viewMode={viewMode} 
            sortState={sortState}
            onSort={handleSort}
          />
        }
        
        <div className={`filter-results ${viewMode}`}>
          {sortedListings.map(listing => (
            <div key={listing.id || listing.ilan_id} className="filter-result-item">
              <ProductCard 
                product={listing}
                onFavoriteToggle={handleFavoriteToggle}
                onProductClick={handleProductClick}
                viewType={viewMode}
              />
            </div>
          ))}
        </div>
        
        {/* Sayfalama */}
        {renderPagination()}
      </>
    );
  };
  
  return (
    <div className="filter-results-container">
      {/* Sonuç içeriği */}
      {renderResults()}
      
      {/* Yükleme durumu overlay olarak gösteriliyor - Loader bileşeni eklendi */}
      {loading && (
        <div className="filter-results-loading">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default FilterResults; 