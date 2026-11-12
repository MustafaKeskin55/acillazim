"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import "./PopularLocations.css";
import Slider from "react-slick";
import { IoLocationOutline } from "react-icons/io5";
import { useAuth } from "@/context/AuthContext";
import { popularLocationsService } from "@/services/listings";

interface City {
  id: string | number;
  name: string;
  slug?: string;
}

const PopularLocation = React.memo(function PopularLocation() {
  const sliderRef = useRef<Slider>(null);
  const { isAuthenticated } = useAuth();

  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPopularCities = async () => {
      try {
        setLoading(true);
        const data = await popularLocationsService.getPopularCities();
        setCities(data);
        setError(null);
      } catch (err) {
        console.error("Popüler şehir yükleme hatası:", err);
        setError("Popüler şehirler yüklenemedi");
      } finally {
        setLoading(false);
      }
    };

    fetchPopularCities();
  }, []);

  const settings = useMemo(
    () => ({
      dots: false,
      infinite: true,
      slidesToShow: 5,
      slidesToScroll: 1,
      autoplay: true,
      speed: 2000,
      autoplaySpeed: 2000,
      draggable: true,
      swipeToSlide: true,
      pauseOnHover: true,
      arrows: false,
      cssEase: "linear",
      focusOnSelect: false,
      accessibility: false,
      responsive: [
        { breakpoint: 1400, settings: { slidesToShow: 5, slidesToScroll: 1 } },
        { breakpoint: 1150, settings: { slidesToShow: 4, slidesToScroll: 1 } },
        { breakpoint: 900, settings: { slidesToShow: 3, slidesToScroll: 1 } },
        {
          breakpoint: 768,
          settings: {
            variableWidth: true,
            slidesToScroll: 1,
            swipeToSlide: true,
          },
        },
        {
          breakpoint: 620,
          settings: {
            variableWidth: true,
            slidesToScroll: 1,
            swipeToSlide: true,
          },
        },
      ],
    }),
    []
  );

  const handleCityClick = (city: City) => {
    console.log(`Popüler şehir tıklandı: ${city.name} (${city.slug})`);
  };

  if (cities.length === 0 && !loading && !error) return null;

  const header = (
    <header className="popular-location__header">
      <h2 id="popular-locations-heading" className="popular-locationText">
        Popüler Lokasyonlar
      </h2>
    </header>
  );

  if (loading) {
    return (
      <section className="popular-location" aria-labelledby="popular-locations-heading">
        <div className="popular-locationContainer">
          <div className="popular-location__surface">
            {header}
            <div className="popular-locations-loading">Yükleniyor...</div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="popular-location" aria-labelledby="popular-locations-heading">
        <div className="popular-locationContainer">
          <div className="popular-location__surface">
            {header}
            <div className="popular-locations-error">{error}</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="popular-location" aria-labelledby="popular-locations-heading">
      <div className="popular-locationContainer">
        <div className="popular-location__surface">
          {header}
          <div className="popular-location__slider-wrap">
            <Slider {...settings} ref={sliderRef} className="popular-location-slider">
              {cities.map((city) => (
                <div className="button-containers" key={city.id}>
                  <button
                    type="button"
                    className="popular-locationBtn"
                    onClick={() => handleCityClick(city)}
                  >
                    <span className="popular-locationBtn__icon" aria-hidden>
                      <IoLocationOutline />
                    </span>
                    <span className="popular-locationBtn__label">{city.name}</span>
                  </button>
                </div>
              ))}
            </Slider>
          </div>
        </div>
      </div>
    </section>
  );
});

export default PopularLocation;
