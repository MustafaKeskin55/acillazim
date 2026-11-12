"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import "@/components/CardCategory/CardCategory.css";
import ProductCard from "@/components/ProductCard/ProductCard";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { GrFormPreviousLink, GrFormNextLink } from "react-icons/gr";
import BaseListingsService from "@/services/listings/base/baseListingsService";

interface IlanData {
  ilan_id?: string | number;
  vitrin_durumu?: string | string[];
  category_id?: string | number;
  baslik?: string;
  fiyat?: number;
  para_birimi?: string;
  konum?: { il: string; ilce: string };
  resimler?: string[];
  aciklama?: string;
  ilan_turu?: string;
  ozellikler?: unknown;
  kategori?: string;
  alt_kategori?: string;
  kategoriYolu?: string[];
  categories?: string;
  subcategory?: string;
  [key: string]: unknown;
}

interface FeaturedListingsProps {
  cardCategoryData?: IlanData[];
}

const FeaturedListings = React.memo(function FeaturedListings({ cardCategoryData }: FeaturedListingsProps) {
  const sliderRef = useRef<Slider>(null);
  const [filteredData, setFilteredData] = useState<IlanData[]>([]);
  const listingsService = useMemo(() => new BaseListingsService(), []);

  const ilanZenginlestir = async (ilan: IlanData): Promise<IlanData> => {
    try {
      const categoryInfo = await listingsService.getCategoryPath(ilan.category_id);
      return {
        ...ilan,
        kategori: categoryInfo?.mainCategory?.name || ilan.categories || "",
        categories: categoryInfo?.mainCategory?.name || ilan.categories || "",
        kategoriYolu: categoryInfo?.fullCategoryPath ? categoryInfo.fullCategoryPath.split(" > ") : [],
        alt_kategori: categoryInfo?.subCategory?.name || "",
        subcategory: categoryInfo?.subCategory?.name || "",
      };
    } catch (error) {
      console.error("İlan zenginleştirme hatası:", error);
      return ilan;
    }
  };

  useEffect(() => {
    if (!cardCategoryData || !Array.isArray(cardCategoryData)) {
      setFilteredData([]);
      return;
    }

    const featured = cardCategoryData.filter((ilan) => {
      if (!ilan.vitrin_durumu) return false;
      if (typeof ilan.vitrin_durumu === "string") return ilan.vitrin_durumu === "one_cikan";
      if (Array.isArray(ilan.vitrin_durumu)) return ilan.vitrin_durumu.includes("one_cikan");
      return false;
    });

    Promise.all(featured.map((ilan) => ilanZenginlestir(ilan)))
      .then((ilanlar) => setFilteredData(ilanlar))
      .catch((error) => {
        console.error("İlan zenginleştirme hatası:", error);
        setFilteredData([]);
      });
  }, [cardCategoryData]);

  const settings = useMemo(
    () => ({
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
        { breakpoint: 823, settings: { slidesToShow: 3, slidesToScroll: 1, infinite: filteredData.length > 3 } },
        { breakpoint: 620, settings: { slidesToShow: 2, slidesToScroll: 1, infinite: filteredData.length > 2 } },
        {
          breakpoint: 768,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
            infinite: filteredData.length > 1,
            centerMode: false,
            autoplay: filteredData.length > 1,
          },
        },
      ],
    }),
    [filteredData.length]
  );

  const nextSlide = () => sliderRef.current?.slickNext();
  const prevSlide = () => sliderRef.current?.slickPrev();

  if (!filteredData || filteredData.length === 0) return null;

  return (
    <div className="featured-listings">
      <h2 className="featured-listings-header">Öne Çıkan İlanlar</h2>

      <div className="featured-slider-wrapper">
        <Slider ref={sliderRef} {...settings} className="featured-slider">
          {filteredData.map((ilan, index) => (
            <div key={ilan.ilan_id || index} className="featured-card-wrapper">
              <ProductCard
                product={{
                  id: ilan.ilan_id,
                  title: ilan.baslik,
                  price: ilan.fiyat,
                  currency: ilan.para_birimi,
                  location: ilan.konum ? `${ilan.konum.il}, ${ilan.konum.ilce}` : "",
                  images: ilan.resimler,
                  description: ilan.aciklama,
                  listingType: ilan.ilan_turu,
                  features: ilan.ozellikler,
                  category: ilan.kategori,
                  subcategory: ilan.alt_kategori,
                  categoryPath: ilan.kategoriYolu,
                  ...ilan,
                }}
              />
            </div>
          ))}
        </Slider>
      </div>

      {filteredData.length > 1 && (
        <>
          <button onClick={prevSlide} className="featured-prev">
            <GrFormPreviousLink className="icons" />
          </button>
          <button onClick={nextSlide} className="featured-next">
            <GrFormNextLink className="icons" />
          </button>
        </>
      )}
    </div>
  );
});

export default FeaturedListings;
