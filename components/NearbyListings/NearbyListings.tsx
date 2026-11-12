"use client";

import React, { useState, useEffect } from "react";
import "./NearbyListings.css";
import CardCategory from "@/components/CardCategory/CardCategory";
import nearbyListingsService from "@/services/listings/nearby-listings/nearbyListingsService";
import { useLocation } from "@/context/LocationContext";
import { useAuth } from "@/context/AuthContext";

interface NearbyListingsProps {
  itemLimit?: number;
  customTitle?: string | null;
  onItemClick?: ((item: unknown) => void) | null;
}

const NearbyListings: React.FC<NearbyListingsProps> = ({
  itemLimit = 15,
  customTitle = null,
  onItemClick = null,
}) => {
  const { location, hasLocation } = useLocation();
  const { isAuthenticated } = useAuth();

  const [listings, setListings] = useState<unknown[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [noListingsFound, setNoListingsFound] = useState<boolean>(false);

  const formatCityName = (cityName: string): string => {
    if (!cityName) return "";
    return cityName
      .split(" ")
      .map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR"))
      .join(" ");
  };

  useEffect(() => {
    if (!isAuthenticated || !hasLocation || !location?.city) {
      setLoading(false);
      setNoListingsFound(true);
      setListings([]);
      return;
    }

    const fetchNearbyListings = async () => {
      setLoading(true);
      try {
        let nearbyListings: unknown[] = [];

        if (location.district) {
          nearbyListings = nearbyListingsService.getListingsByDistrict(location.district, itemLimit);
          if (nearbyListings.length < itemLimit) {
            const cityListings = nearbyListingsService.getListingsByCity(location.city, itemLimit - nearbyListings.length);
            nearbyListings = [...nearbyListings, ...cityListings];
          }
        } else {
          nearbyListings = nearbyListingsService.getListingsByCity(location.city, itemLimit);
        }

        if (!nearbyListings || nearbyListings.length === 0) {
          setNoListingsFound(true);
          setListings([]);
        } else {
          setNoListingsFound(false);
          setListings(nearbyListings);
        }
      } catch (error) {
        console.error("[NearbyListings] İlanlar yüklenirken hata:", error);
        setNoListingsFound(true);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyListings();
  }, [location, hasLocation, isAuthenticated, itemLimit]);

  if (!isAuthenticated || !hasLocation || !location?.city) return null;

  if (loading) {
    return (
      <div className="nearby-listings-container">
        <div className="nearby-listings-loading">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="nearby-listings-container">
      {!noListingsFound && listings.length > 0 ? (
        <CardCategory
          cardCategoryData={listings as never}
          selectedLocation={formatCityName(location.city)}
          isLoggedIn={isAuthenticated}
          cardCategoryText={
            customTitle ||
            `${formatCityName(location.city)}${location.district ? " - " + formatCityName(location.district) : ""} İlindeki İlanlar`
          }
        />
      ) : (
        <div className="nearby-listings-empty">
          <h2 className="nearby-listings-title">
            {formatCityName(location.city)}{location.district ? " - " + formatCityName(location.district) : ""} İlinde İlan Bulunamadı
          </h2>
          <div className="nearby-listings-message">
            Bu bölgede henüz ilan bulunmamaktadır. Daha sonra tekrar kontrol edebilirsiniz.
          </div>
        </div>
      )}
    </div>
  );
};

export default NearbyListings;
