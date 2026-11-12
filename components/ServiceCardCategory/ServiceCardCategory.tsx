"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import "./ServiceCardCategory.css";
import ProductCard from "@/components/ProductCard/ProductCard";
import popularServicesService from "@/services/popularServices/popularServicesService";

interface CardData {
  id?: string | number;
  ilan_id?: string | number;
  title?: string;
  baslik?: string;
  city?: string;
  konum?: { il: string; ilce: string };
  image?: string;
  img?: string;
  resimler?: string[];
  price?: number;
  fiyat?: number;
  [key: string]: unknown;
}

interface ServiceCardCategoryProps {
  cardCategoryData?: CardData[];
  cardCategoryText?: string;
  usePopularServices?: boolean;
  carouselOptions?: Record<string, unknown>;
}

const ServiceCardCategory: React.FC<ServiceCardCategoryProps> = ({
  cardCategoryData,
  cardCategoryText,
  usePopularServices = false,
  carouselOptions = {},
}) => {
  const [services, setServices] = useState<CardData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPopularServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await popularServicesService.getServicesForCarousel({ limit: 50, ...carouselOptions });
      setServices(data);
    } catch (err) {
      console.error("❌ Popüler hizmetler yükleme hatası:", err);
      setError("Hizmetler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [carouselOptions]);

  useEffect(() => {
    if (usePopularServices) loadPopularServices();
  }, [usePopularServices, loadPopularServices]);

  const isValidCard = (card: CardData): boolean => {
    if (!card) return false;
    const hasValidId = card.id || card.ilan_id;
    if (!hasValidId) return false;
    const title = card.title || card.baslik || "";
    if (!title.trim().length) return false;
    const price = card.price ?? card.fiyat;
    if (price === undefined || price === null || price < 0) return false;
    return true;
  };

  const hasValidData = (): boolean => {
    const dataToCheck = usePopularServices ? services : cardCategoryData;
    if (!Array.isArray(dataToCheck) || dataToCheck.length === 0) return false;
    return dataToCheck.filter(isValidCard).length > 0;
  };

  const updateScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const getSingleCardScrollStep = useCallback((): number => {
    const container = scrollContainerRef.current;
    if (!container) return 212;
    const cards = container.querySelectorAll<HTMLElement>(".service-card-category-horizontal-wrapper");
    if (cards.length >= 2) {
      const diff = cards[1].offsetLeft - cards[0].offsetLeft;
      if (diff > 0) return diff;
    }
    const firstCard = cards[0];
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 200;
    const track = container.querySelector<HTMLElement>(".service-card-category-horizontal-track");
    let gap = 12;
    if (track && typeof window !== "undefined") {
      const computed = window.getComputedStyle(track);
      const parsedGap = parseFloat(computed.columnGap || computed.gap || "12");
      if (!Number.isNaN(parsedGap)) gap = parsedGap;
    }
    return Math.round(cardWidth + gap);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) { clearInterval(autoScrollIntervalRef.current); autoScrollIntervalRef.current = null; }
    if (autoScrollTimeoutRef.current) { clearTimeout(autoScrollTimeoutRef.current); autoScrollTimeoutRef.current = null; }
    setIsAutoScrolling(false);
  }, []);

  const startAutoScroll = useCallback(() => {
    if (!scrollContainerRef.current || isAutoScrolling) return;
    const dataToCheck = usePopularServices ? services : cardCategoryData;
    const validCards = (dataToCheck || []).filter(isValidCard);
    if (validCards.length < 5) return;
    setIsAutoScrolling(true);
    autoScrollIntervalRef.current = setInterval(() => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const step = getSingleCardScrollStep();
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= maxScrollLeft - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const currentIndex = Math.round(container.scrollLeft / step);
        const nextLeft = Math.min(maxScrollLeft, (currentIndex + 1) * step);
        container.scrollTo({ left: nextLeft, behavior: "smooth" });
      }
    }, 3000);
  }, [isAutoScrolling, usePopularServices, services, cardCategoryData, getSingleCardScrollStep]);

  const pauseAutoScroll = () => {
    stopAutoScroll();
    autoScrollTimeoutRef.current = setTimeout(() => startAutoScroll(), 5000);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    updateScrollButtons();
    container.addEventListener("scroll", updateScrollButtons);
    return () => container.removeEventListener("scroll", updateScrollButtons);
  }, [services, cardCategoryData]);

  useEffect(() => {
    if (hasValidData()) {
      const startTimeout = setTimeout(() => startAutoScroll(), 2000);
      return () => { clearTimeout(startTimeout); stopAutoScroll(); };
    } else {
      stopAutoScroll();
    }
  }, [services, cardCategoryData, usePopularServices]);

  useEffect(() => () => stopAutoScroll(), []);

  const scrollLeftFn = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    pauseAutoScroll();
    const step = getSingleCardScrollStep();
    const currentIndex = Math.round(container.scrollLeft / step);
    const targetLeft = Math.max(0, (currentIndex - 1) * step);
    container.scrollTo({ left: targetLeft, behavior: "smooth" });
  };

  const scrollRightFn = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    pauseAutoScroll();
    const step = getSingleCardScrollStep();
    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    const currentIndex = Math.round(container.scrollLeft / step);
    const targetLeft = Math.min(maxScrollLeft, (currentIndex + 1) * step);
    container.scrollTo({ left: targetLeft, behavior: "smooth" });
  };

  const handleFavoriteToggle = (id: string | number) => console.log("Favori toggle:", id);
  const handleProductClick = (id: string | number) => console.log("Ürün tıklandı:", id);

  if (loading) {
    return (
      <div className="service-page-populer-hizmetler-scope">
      <div className="service-card-category-container">
        <div className="service-card-category-header-wrapper">
          <h2 className="service-card-category-header">{cardCategoryText || "Popüler Hizmetler"}</h2>
        </div>
        <div className="service-card-category-loading-state">
          <div className="service-card-category-loading-spinner"></div>
          <p>Hizmetler yükleniyor...</p>
        </div>
      </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="service-page-populer-hizmetler-scope">
      <div className="service-card-category-container">
        <div className="service-card-category-header-wrapper">
          <h2 className="service-card-category-header">{cardCategoryText || "Popüler Hizmetler"}</h2>
        </div>
        <div className="service-card-category-error-state">
          <p>{error}</p>
          <button onClick={loadPopularServices} className="service-card-category-retry-button">Tekrar Dene</button>
        </div>
      </div>
      </div>
    );
  }

  if (!hasValidData()) return null;

  const dataSource = usePopularServices ? services : (cardCategoryData || []);
  const validData = dataSource.filter(isValidCard);

  return (
    <div className="service-page-populer-hizmetler-scope">
    <div className="service-card-category-container">
      <div className="service-card-category-header-wrapper">
        <h2 className="service-card-category-header">{cardCategoryText || "Popüler Hizmetler"}</h2>
      </div>
      <div
        className="service-card-category-scroll-section"
        onMouseEnter={stopAutoScroll}
        onMouseLeave={() => {
          if (validData.length >= 5) {
            autoScrollTimeoutRef.current = setTimeout(() => startAutoScroll(), 1000);
          }
        }}
      >
        <div className="service-card-category-scroll-controls">
          <button
            className={`service-card-category-scroll-button service-card-category-scroll-left ${!canScrollLeft ? "service-card-category-scroll-disabled" : ""}`}
            onClick={scrollLeftFn}
            disabled={!canScrollLeft}
            aria-label="Sola kaydır"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className={`service-card-category-scroll-button service-card-category-scroll-right ${!canScrollRight ? "service-card-category-scroll-disabled" : ""}`}
            onClick={scrollRightFn}
            disabled={!canScrollRight}
            aria-label="Sağa kaydır"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="service-card-category-horizontal-container" ref={scrollContainerRef}>
          <div className="service-card-category-horizontal-track">
            {validData.map((card, index) => {
              const normalizedCard = {
                ...card,
                id: card.id || card.ilan_id,
                title: card.title || card.baslik,
                city: card.city || (card.konum ? card.konum.il : null),
                image: card.image || card.img || (card.resimler && card.resimler.length > 0 ? card.resimler[0] : null),
                price: card.price || card.fiyat,
              };
              return (
                <div key={normalizedCard.id || index} className="service-card-category-horizontal-wrapper">
                  <ProductCard product={normalizedCard} onFavoriteToggle={handleFavoriteToggle} onProductClick={handleProductClick} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ServiceCardCategory;
