'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from '@/context/AuthContext';

interface LocationData {
  city: string;
  source: 'modal' | 'gps' | 'saved';
}

interface LocationContextType {
  location: LocationData | null;
  loading: boolean;
  hasLocation: boolean;
  isModalVisible: boolean;
  updateLocation: (city: string) => void;
  handleModalLocationChange: (city: string) => void;
  clearLocation: () => void;
  openLocationModal: () => void;
  closeLocationModal: () => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLocation, setHasLocation] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    try {
      const savedLocationData = localStorage.getItem('location_data');
      if (savedLocationData) {
        const parsedLocation = JSON.parse(savedLocationData);
        if (parsedLocation?.city) {
          setLocation({ city: parsedLocation.city, source: 'modal' });
          setHasLocation(true);
        } else {
          setHasLocation(false);
        }
      } else {
        setHasLocation(false);
      }
    } catch (error) {
      console.error('Konum bilgisi yüklenirken hata:', error);
      setHasLocation(false);
    }
    setIsModalVisible(false);
    setLoading(false);
  }, [isAuthenticated]);

  const updateLocation = (city: string): void => {
    if (!city) { clearLocation(); return; }

    let normalizedCity = city;
    if (city === 'İstanbul Avrupa Yakası' || city === 'İstanbul Anadolu Yakası') {
      normalizedCity = 'İstanbul';
    }

    const locationData = { city: normalizedCity };
    localStorage.setItem('location_data', JSON.stringify(locationData));
    setLocation({ city: normalizedCity, source: 'modal' });
    setHasLocation(true);
    console.log(`[LocationContext] Konum güncellendi: ${normalizedCity}`);
    setIsModalVisible(false);
  };

  const handleModalLocationChange = (city: string): void => {
    updateLocation(city);
  };

  const clearLocation = (): void => {
    setLocation(null);
    setHasLocation(false);
    localStorage.removeItem('location_data');
    console.log('[LocationContext] Konum bilgisi temizlendi');
  };

  const openLocationModal = (): void => {
    if (isAuthenticated === true) {
      console.log('[LocationContext] Konum modalı açılıyor: Kullanıcı giriş yapmış');
      setIsModalVisible(true);
    } else {
      console.log('[LocationContext] Konum modalı açılamaz: Kullanıcı giriş yapmamış');
    }
  };

  const closeLocationModal = (): void => {
    console.log('[LocationContext] Konum modalı kapatılıyor');
    setIsModalVisible(false);
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        loading,
        hasLocation,
        isModalVisible,
        updateLocation,
        handleModalLocationChange,
        clearLocation,
        openLocationModal,
        closeLocationModal
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation hook'u LocationProvider içinde kullanılmalıdır.");
  }
  return context;
};

export default LocationContext;
