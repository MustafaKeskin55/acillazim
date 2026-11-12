"use client";

import React, { useState, useEffect } from "react";
import "./ServiceBanner.css";
import locationService from "@/services/location/locationService";

interface City {
  id?: number | string;
  name: string;
}

/**
 * Hizmetler sayfası için üst banner bileşeni
 * Arama kutusu, lokasyon ve kategori seçimi içerir
 */
function ServiceBanner() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [cities, setCities] = useState<City[]>([]);

  // Sayfa yüklendiğinde şehir verilerini yükle
  useEffect(() => {
    const loadCities = async () => {
      try {
        const citiesData = await locationService.getCities();
        setCities(citiesData);
      } catch (error) {
        console.error("Şehirler yüklenirken hata oluştu:", error);
        setCities([]);
      }
    };

    loadCities();
  }, []);

  // Arama formunu gönder
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/filtrele/tum-ilanlar?q=${searchTerm}&location=${selectedCity}`;
  };

  return (
    <div className="service-banner">
      <form className="service-banner-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="service-banner-input"
          placeholder="Ne arıyorsunuz?"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="service-banner-select"
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
        >
          <option value="">Tüm Şehirler</option>
          {cities.map((city, index) => (
            <option key={city.id ?? index} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>
        <button type="submit" className="service-banner-button">
          <i className="fas fa-search"></i> Ara
        </button>
      </form>
    </div>
  );
}

export default ServiceBanner;
