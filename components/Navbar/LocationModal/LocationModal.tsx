"use client";

import React, { useState, useEffect } from 'react';
import styles from "./LocationModal.module.css";
import { useLocation } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';
import { IoLocationSharp, IoClose } from 'react-icons/io5';
import locationService from '@/services/location/locationService';
import nearbyListingsService from '@/services/listings/nearby-listings/nearbyListingsService';

interface City {
  id: number;
  name: string;
}

interface LocationData {
  city: string;
}

interface LocationModalProps {
  showModal: boolean;
  closeModal: () => void;
  onLocationSelect?: (city: string, district: string) => void;
  onLocationClear?: () => void;
}

const LocationModal: React.FC<LocationModalProps> = ({ 
  showModal, 
  closeModal, 
  onLocationSelect, 
  onLocationClear 
}) => {
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [cities, setCities] = useState<City[]>([]);
  const [savedLocation, setSavedLocation] = useState<LocationData | null>(null);
  const { location, handleModalLocationChange } = useLocation() as { location: LocationData | null; handleModalLocationChange: (city: string, district: string) => void };
  const { isAuthenticated } = useAuth() as { isAuthenticated: boolean };
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log("[LocationModal] Modal gösterim durumu:", showModal);
    console.log("[LocationModal] Kullanıcı giriş durumu:", isAuthenticated);
  }, [showModal, isAuthenticated]);

  useEffect(() => {
    const loadCities = async (): Promise<void> => {
      try {
        console.log("[LocationModal] Şehirler yükleniyor...");
        setIsLoading(true);
        
        const citiesData = await (locationService as { getProvinces: () => Promise<City[]> }).getProvinces();
        console.log("[LocationModal] Şehir verileri alındı:", citiesData?.length || 0);
        
        if (citiesData && citiesData.length > 0) {
          const formattedCities: City[] = citiesData.map(city => ({
            id: city.id,
            name: city.name
          }));
          
          const popularCities = ['İSTANBUL AVRUPA YAKASI', 'İSTANBUL ANADOLU YAKASI', 'ANKARA', 'İZMİR', 'SAMSUN', 'TEKİRDAĞ'];
          
          const popularList: City[] = [];
          const otherCities: City[] = [];
          
          formattedCities.forEach(city => {
            if (popularCities.includes(city.name.toUpperCase())) {
              popularList.push(city);
            } else {
              otherCities.push(city);
            }
          });
          
          const sortedPopularList = popularCities
            .map(popularName => popularList.find(city => city.name.toUpperCase() === popularName))
            .filter(city => city !== undefined) as City[];
          
          const sortedOtherCities = otherCities.sort((a, b) => 
            a.name.localeCompare(b.name, 'tr-TR')
          );
          
          const finalCityList = [
            ...sortedPopularList,
            ...sortedOtherCities
          ];
          
          setCities(finalCityList);
          console.log("[LocationModal] Şehir verileri işlendi, toplam:", finalCityList.length);
        } else {
          console.warn("[LocationModal] Şehir verisi bulunamadı veya boş.");
          setCities([]);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("[LocationModal] Şehir verileri yüklenirken hata:", error);
        setCities([]);
        setIsLoading(false);
      }
    };

    loadCities();
  }, []);

  useEffect(() => {
    const locationData = (locationService as { getUserLocation: () => LocationData | null }).getUserLocation();
    if (locationData && cities.length > 0) {
      setSavedLocation(locationData);
      setSelectedCity(locationData.city || '');
    }
  }, [cities]);

  useEffect(() => {
    if (location && cities.length > 0) {
      setSelectedCity(location.city || '');
      setSavedLocation({
        city: location.city
      });
    }
  }, [location, cities]);

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const cityName = e.target.value;
    setSelectedCity(cityName);
    console.log("[LocationModal] İl seçildi:", cityName);
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedCity) {
      alert('Lütfen bir il seçin');
      return;
    }

    console.log("[LocationModal] Konum kaydediliyor:", selectedCity);

    const normalizedCity = (locationService as { normalizeCity: (city: string) => string }).normalizeCity(selectedCity);

    (locationService as { saveUserLocation: (city: string, district: string) => void }).saveUserLocation(normalizedCity, '');
    (locationService as { setLocationModalSeen: (seen: boolean) => void }).setLocationModalSeen(true);
    
    const locationData = {
      city: normalizedCity
    };
    setSavedLocation(locationData);

    handleModalLocationChange(normalizedCity, '');

    try {
      console.log("[LocationModal] Konum bilgisine göre ilanlar getiriliyor - Şehir:", selectedCity);
      
      const listings = (nearbyListingsService as { getListingsByCity: (city: string, limit: number) => unknown[] }).getListingsByCity(selectedCity, 30);
      
      const nearbyListings = {
        success: true,
        data: listings,
        total: listings.length,
        city: selectedCity
      };
      
      console.log("[LocationModal] İlanlar sonucu:", 
                 `Toplam: ${nearbyListings.success ? nearbyListings.total || 0 : 0} ilan, `,
                 `Filtreler: İl=${selectedCity}`);
    } catch (error) {
      console.error("[LocationModal] Yakın ilanlar getirilirken hata:", error);
    }

    if (typeof onLocationSelect === 'function') {
      onLocationSelect(selectedCity, '');
    } else {
      console.warn('LocationModal: onLocationSelect prop is not provided or not a function');
    }
    
    closeModal();
  };

  const handleClearLocation = (): void => {
    console.log("[LocationModal] Konum temizleniyor");
    
    setSelectedCity('');
    setSavedLocation(null);

    (locationService as { clearUserLocation: () => void }).clearUserLocation();
    (locationService as { setLocationModalSeen: (seen: boolean) => void }).setLocationModalSeen(true);

    handleModalLocationChange('', '');

    if (typeof onLocationClear === 'function') {
      onLocationClear();
    } else {
      if (typeof onLocationSelect === 'function') {
        onLocationSelect('', '');
      }
    }

    closeModal();
  };

  useEffect(() => {
    if (showModal) {
      (locationService as { setLocationModalSeen: (seen: boolean) => void }).setLocationModalSeen(true);
      
      const locationData = (locationService as { getUserLocation: () => LocationData | null }).getUserLocation();
      if (locationData && cities.length > 0) {
        setSelectedCity(locationData.city || '');
        setSavedLocation({
          city: locationData.city
        });
      }
    }
  }, [showModal, cities]);
  
  useEffect(() => {
    const handleLocationChange = async (event: Event): Promise<void> => {
      const customEvent = event as CustomEvent;
      const locationData = customEvent.detail;
      console.log("[LocationModal] Konum değişikliği algılandı:", locationData);
      
      if (!locationData) {
        console.log("[LocationModal] Konum temizlendi, ilanlar sıfırlanıyor");
        return;
      }
      
      try {
        console.log(`[LocationModal] Konum değişimi: ${locationData.city || ''} için ilanlar getiriliyor`);
        
        const cityListings = (nearbyListingsService as { getListingsByCity: (city: string, limit: number) => unknown[] }).getListingsByCity(locationData.city, 30);
        const listings = {
          success: true,
          data: cityListings,
          total: cityListings.length,
          city: locationData.city
        };
        
        console.log(`[LocationModal] Konum için ilanlar alındı:`, 
                   `Toplam: ${listings.success ? listings.total || 0 : 0} ilan`, 
                   `Filtreler: İl=${listings.city || '-'}`);
      } catch (error) {
        console.error("[LocationModal] Konum değişikliği sonrası ilanlar getirilirken hata:", error);
      }
    };
    
    window.addEventListener('userLocationChanged', handleLocationChange);
    
    return () => {
      window.removeEventListener('userLocationChanged', handleLocationChange);
    };
  }, []);

  if (!isAuthenticated || !showModal) {
    console.log("[LocationModal] Modal gösterilmiyor. Auth:", isAuthenticated, "ShowModal:", showModal);
    return null;
  }

  return (
    <div className={styles.wrapper} onClick={closeModal}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.title}>
              <IoLocationSharp className={styles.icon} />
              <h2>Konum Seç</h2>
            </div>
            <button className={styles.close} onClick={closeModal} aria-label="Kapat">
              <IoClose />
            </button>
          </div>

          <div className={styles.body}>
            {isLoading ? (
              <div className={styles.loading}>Yükleniyor...</div>
            ) : (
              <div className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>İl</label>
                  <select 
                    className={styles.select}
                    value={selectedCity}
                    onChange={handleCityChange}
                  >
                    <option value="">İl seçiniz</option>
                    
                    <optgroup label="⭐ Popüler Şehirler">
                      {cities
                        .filter(city => ['İSTANBUL AVRUPA YAKASI', 'İSTANBUL ANADOLU YAKASI', 'ANKARA', 'İZMİR', 'SAMSUN', 'TEKİRDAĞ'].includes(city.name.toUpperCase()))
                        .map((city) => (
                          <option 
                            key={city.id} 
                            value={city.name}
                            data-popular="true"
                          >
                            {city.name}
                          </option>
                        ))}
                    </optgroup>
                    
                    <optgroup label="📍 Tüm Şehirler">
                      {cities
                        .filter(city => 
                          !['İSTANBUL AVRUPA YAKASI', 'İSTANBUL ANADOLU YAKASI', 'ANKARA', 'İZMİR', 'SAMSUN', 'TEKİRDAĞ'].includes(city.name.toUpperCase())
                        )
                        .map((city) => (
                          <option key={city.id} value={city.name}>
                            {city.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            )}

            {savedLocation && (
              <div className={styles.savedLocation}>
                <h4>Mevcut Konum</h4>
                <p>
                  <IoLocationSharp className={styles.iconSmall} />
                  {savedLocation.city}
                </p>
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button 
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={handleClearLocation}
            >
              Temizle
            </button>
            
            <button 
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={handleSave}
              disabled={!selectedCity || isLoading}
            >
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationModal;
