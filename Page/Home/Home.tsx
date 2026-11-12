"use client";

import React, { useState, useEffect } from 'react';
import './Home.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import PopularCategories from '@/components/PopularCategories/PopularCategories';
import VitrinListings from '@/components/VitrinListings/VitrinListings';
import homeService from '@/services/home/homeService';
import PopularLocation from '@/components/PopularLocations/PopularLocation';
import FeaturedListings from '@/components/FeaturedListings/FeaturedListings';
import HeroSection from '@/components/HeroSection/HeroSection';
import LocationModal from '@/components/Navbar/LocationModal/LocationModal';
import NearbyListings from '@/components/NearbyListings/NearbyListings';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/context/LocationContext';
import locationService from '@/services/location/locationService';

interface LocationData {
  city?: string;
  district?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
}

interface LocationContextValue {
  location: LocationData | null;
  loading: boolean;
  handleModalLocationChange: (city: string, district?: string) => void;
  clearLocation: () => void;
}

const formatCityName = (cityName: string): string => {
  if (!cityName) return '';
  const turkishChars: Record<string, string> = {
    'i': 'İ', 'ı': 'I', 'g': 'G', 'ğ': 'Ğ', 'u': 'U',
    'ü': 'Ü', 's': 'S', 'ş': 'Ş', 'o': 'O', 'ö': 'Ö', 'c': 'C', 'ç': 'Ç',
  };
  const formatted = cityName.toLowerCase().trim();
  const first = turkishChars[formatted.charAt(0)] || formatted.charAt(0).toUpperCase();
  const rest = formatted.slice(1).split('').map((ch) => turkishChars[ch] || ch.toUpperCase()).join('');
  return first + rest;
};

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth() as AuthContextValue;
  const { location: locationData, loading: locationLoading, handleModalLocationChange, clearLocation } = useLocation() as LocationContextValue;

  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [currentCity, setCurrentCity] = useState<string>('');
  const [allListings, setAllListings] = useState<unknown[]>([]);
  const [featuredListings, setFeaturedListings] = useState<unknown[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      const userLocation = (locationService as { getUserLocation: () => LocationData | null }).getUserLocation();
      const modalSeen = (locationService as { isLocationModalSeen: () => boolean }).isLocationModalSeen();
      setShowLocationModal(!userLocation && !modalSeen);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    (async () => {
      try {
        const { featuredListings: featured, vitrinListings } = await (homeService as { getHomePageData: () => Promise<{ featuredListings: unknown[]; vitrinListings: unknown[] }> }).getHomePageData();
        setAllListings(vitrinListings);
        setFeaturedListings(featured);
      } catch { setAllListings([]); setFeaturedListings([]); }
    })();
  }, []);

  useEffect(() => {
    if (locationData && !locationLoading && locationData.city) {
      setCurrentCity(locationData.city);
    } else if (!locationLoading) {
      setShowLocationModal(true);
      setCurrentCity('');
    }
  }, [locationData, locationLoading]);

  const handleLocationSelect = (city: string, district?: string) => {
    handleModalLocationChange(city, district);
    setShowLocationModal(false);
  };

  const handleLocationClear = () => {
    clearLocation();
    setCurrentCity('');
    setShowLocationModal(false);
  };

  return (
    <div className="home">
      <div className="home-container">
        <div className="home-body">
          <div className="home-left">
            <Sidebar />
          </div>
          <div className="home-right">
            <PopularCategories mode="slider" />
            <VitrinListings listings={allListings} />
          </div>
        </div>

        <NearbyListings
          city={currentCity}
          isAuthenticated={isAuthenticated}
          itemLimit={15}
          customTitle={`${currentCity ? formatCityName(currentCity) : ''} Çevresindeki İlanlar`}
        />

        {isAuthenticated && <PopularLocation />}

        <FeaturedListings cardCategoryData={featuredListings} />
        <HeroSection />
      </div>

      {!isAuthenticated && (
        <LocationModal
          showModal={showLocationModal}
          closeModal={() => setShowLocationModal(false)}
          onLocationSelect={handleLocationSelect}
          onLocationClear={handleLocationClear}
        />
      )}
    </div>
  );
};

export default Home;
