"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import "./CardCategory.css";
import ProductCard from "@/components/ProductCard/ProductCard";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { GrFormPreviousLink, GrFormNextLink } from "react-icons/gr";
import BaseListingsService from "@/services/listings/base/baseListingsService";

// Yedek resim URL'si
const FALLBACK_IMAGE = "https://picsum.photos/300/200?text=Acillazim.com";

interface CardData {
  id?: string | number;
  ilan_id?: string | number;
  city?: string;
  category_id?: string | number;
  kategori?: string;
  categories?: string;
  kategoriYolu?: string[];
  alt_kategori?: string;
  subcategory?: string;
  vitrin_durumu?: string | string[];
  [key: string]: unknown;
}

interface CardCategoryProps {
  cardCategoryData?: CardData[];
  selectedLocation?: string;
  isLoggedIn?: boolean;
  cardCategoryText?: string;
}

function CardCategory({ cardCategoryData, selectedLocation, isLoggedIn, cardCategoryText }: CardCategoryProps) {
  const sliderRef = useRef<Slider>(null);
  const [filteredData, setFilteredData] = useState<CardData[]>([]);
  const listingsService = useMemo(() => new BaseListingsService(), []);

  const normalizeCity = (cityName: string): string => {
    if (!cityName) return "";
    return cityName
      .toLocaleLowerCase("tr-TR")
      .normalize("NFKD")
      .replace(/[\u0307]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const enrichCardWithCategories = async (card: CardData): Promise<CardData> => {
    try {
      const categoryInfo = await listingsService.getCategoryPath(card.category_id);
      return {
        ...card,
        kategori: categoryInfo.mainCategory.name,
        categories: categoryInfo.mainCategory.name,
        kategoriYolu: categoryInfo.fullCategoryPath.split(" > "),
        alt_kategori: categoryInfo.subCategory.name,
        subcategory: categoryInfo.subCategory.name,
      };
    } catch (error) {
      console.error("İlan zenginleştirme hatası:", error);
      return card;
    }
  };

  const isNeighboringCity = (city1: string, city2: string): boolean => {
    const neighboringCities: Record<string, string[]> = {
      istanbul: ["kocaeli", "tekirdag", "kirklareli"],
      ankara: ["eskisehir", "konya", "kirikkale", "cankiri", "bolu"],
      izmir: ["aydin", "manisa", "balikesir"],
    };
    const nc1 = normalizeCity(city1);
    const nc2 = normalizeCity(city2);
    return (
      !!neighboringCities[nc1]?.includes(nc2) ||
      !!neighboringCities[nc2]?.includes(nc1)
    );
  };

  useEffect(() => {
    if (!cardCategoryData || !selectedLocation) {
      setFilteredData([]);
      return;
    }

    const normalizedLocation = normalizeCity(selectedLocation);

    let filtered = cardCategoryData.filter((card) => {
      if (!card.city) return false;
      const cardCity = normalizeCity(card.city);
      if (normalizedLocation.startsWith("istanbul")) {
        return cardCity.startsWith("istanbul");
      }
      return cardCity === normalizedLocation;
    });

    if (filtered.length < 6) {
      if (!isLoggedIn) {
        const nearbyListings = cardCategoryData.filter((card) => {
          if (!card.city || filtered.includes(card)) return false;
          const cardCity = normalizeCity(card.city);
          return (
            cardCity.includes(normalizedLocation) ||
            normalizedLocation.includes(cardCity) ||
            isNeighboringCity(normalizedLocation, cardCity)
          );
        });
        if (nearbyListings.length > 0) {
          filtered = [...filtered, ...nearbyListings];
        }
      }
    }

    Promise.all(filtered.map((card) => enrichCardWithCategories(card)))
      .then((enrichedCards) => setFilteredData(enrichedCards))
      .catch((error) => {
        console.error("İlan zenginleştirme hatası:", error);
        setFilteredData([]);
      });
  }, [cardCategoryData, selectedLocation, isLoggedIn]);

  const settings = {
    speed: 500,
    slidesToShow: 6,
    slidesToScroll: 1,
    autoplay: filteredData.length > 6,
    autoplaySpeed: 3000,
    arrows: false,
    infinite: filteredData.length > 6,
    swipe: true,
    touchMove: true,
    dots: false,
    variableWidth: false,
    cssEase: "linear",
    initialSlide: 0,
    useCSS: true,
    useTransform: true,
    pauseOnHover: true,
    focusOnSelect: false,
    accessibility: false,
    responsive: [
      { breakpoint: 1300, settings: { slidesToShow: 5, slidesToScroll: 1, infinite: filteredData.length > 5 } },
      { breakpoint: 1033, settings: { slidesToShow: 4, slidesToScroll: 1, infinite: filteredData.length > 4 } },
      { breakpoint: 823,  settings: { slidesToShow: 3, slidesToScroll: 1, infinite: filteredData.length > 3 } },
      { breakpoint: 620,  settings: { slidesToShow: 2, slidesToScroll: 1, infinite: filteredData.length > 2 } },
    ],
  };

  const nextSlide = () => sliderRef.current?.slickNext();
  const prevSlide = () => sliderRef.current?.slickPrev();

  const handleFavoriteToggle = (id: string | number) => console.log(`Favorilere eklendi/çıkarıldı: ${id}`);
  const handleProductClick = (id: string | number) => console.log(`Ürün tıklandı: ${id}`);

  const getHeaderText = (): string => {
    if (!selectedLocation) return cardCategoryText || "";
    const cityName = selectedLocation.charAt(0).toUpperCase() + selectedLocation.slice(1).toLowerCase();
    return cardCategoryText || (isLoggedIn ? `${cityName} İlindeki İlanlar` : `${cityName} Çevresindeki İlanlar`);
  };

  if (!filteredData || filteredData.length === 0) return null;

  return (
    <div className="card-category-container">
      <h2 className="nearby-listings-header">{getHeaderText()}</h2>

      <div className="nearby-slider-wrapper">
        <Slider ref={sliderRef} {...settings} className="nearby-slider">
          {filteredData.map((card, index) => (
            <div key={(card.id ?? card.ilan_id) || index} className="nearby-card-wrapper">
              <ProductCard
                product={card}
                onFavoriteToggle={handleFavoriteToggle}
                onProductClick={handleProductClick}
              />
            </div>
          ))}
        </Slider>
      </div>

      {filteredData.length > settings.slidesToShow && (
        <>
          <button onClick={prevSlide} className="nearby-prev">
            <GrFormPreviousLink className="icons" />
          </button>
          <button onClick={nextSlide} className="nearby-next">
            <GrFormNextLink className="icons" />
          </button>
        </>
      )}
    </div>
  );
}

export default CardCategory;
