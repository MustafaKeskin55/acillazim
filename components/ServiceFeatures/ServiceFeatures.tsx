"use client";

import React, { useState, useEffect, useLayoutEffect } from 'react';
import './ServiceFeatures.css';

const SF_MOBILE_MEDIA = '(max-width: 768px)';
/** Mobilde 2×2 grid: sayfa başına 4 kart; 4’ten fazla avantaj olursa nokta + otomatik geçiş */
const SF_MOBILE_PAGE_SIZE = 4;
const SF_MOBILE_AUTOPLAY_MS = 5200;

// ---- Statik veri data/ klasörüne çıkarıldı ----
// ServiceFeatures içindeki advantages dizisi bileşenin UI mantığıyla
// iç içe geçmiş (SVG iconlar içeriyor). Veri ayrı tutulabilir
// ama SVG'li içerik olduğu için component içinde kalması doğru.

interface Advantage {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradientClass: string;
}

const advantages: Advantage[] = [
  {
    title: "Hızlı Çözüm",
    description: "Kolayca ihtiyacını belirle. Yanını aç ve hizmet sağlayıcıların seni bulmasını bekle.",
    icon: (
      <svg className="sf-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
      </svg>
    ),
    gradientClass: "sf-gradient-purple",
  },
  {
    title: "Hizmet Sana Gelsin",
    description: "Yakınındaki hizmet sağlayıcılarla zahmetsizce iletişim kur, teklif al ve sana en uygun olanı seç.",
    icon: (
      <svg className="sf-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
      </svg>
    ),
    gradientClass: "sf-gradient-yellow",
  },
  {
    title: "Konum Bazlı Hizmet",
    description: "Sadece kendi bölgede hizmet verenleri gör, gereksiz vakit kaybetme.",
    icon: (
      <svg className="sf-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    ),
    gradientClass: "sf-gradient-red",
  },
  {
    title: "Randevunu Ayarla",
    description: "Müsait gününü seç, planlı şekilde hizmet al ve kafan rahat olsun.",
    icon: (
      <svg className="sf-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
    ),
    gradientClass: "sf-gradient-blue",
  },
];

// Reusable AdvantageCard component
interface AdvantageCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradientClass: string;
}

const AdvantageCard: React.FC<AdvantageCardProps> = ({ title, description, icon, gradientClass }) => {
  return (
    <div className="sf-advantage-card">
      <div className={`sf-icon-wrapper ${gradientClass}`}>{icon}</div>
      <h3 className="sf-card-title">{title}</h3>
      <p className="sf-card-description">{description}</p>
    </div>
  );
};

const ServiceFeatures: React.FC = () => {
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [activePage, setActivePage] = useState(0);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(SF_MOBILE_MEDIA);
    const apply = () => setIsMobileLayout(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const totalPages = Math.max(1, Math.ceil(advantages.length / SF_MOBILE_PAGE_SIZE));
  const safePage = Math.min(activePage, totalPages - 1);
  const visibleAdvantages = isMobileLayout
    ? advantages.slice(safePage * SF_MOBILE_PAGE_SIZE, (safePage + 1) * SF_MOBILE_PAGE_SIZE)
    : advantages;

  useEffect(() => {
    if (!isMobileLayout) return;
    setActivePage((p) => Math.min(p, totalPages - 1));
  }, [isMobileLayout, totalPages]);

  useEffect(() => {
    if (!isMobileLayout || totalPages <= 1) return;
    const id = window.setInterval(() => {
      setActivePage((p) => (p + 1) % totalPages);
    }, SF_MOBILE_AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [isMobileLayout, totalPages]);

  const showDots = isMobileLayout && totalPages > 1;

  return (
    <section className="sf-advantages-section">
      <h2 className="sf-section-title">
        <span className="sf-block">Acillazım ile hizmet almanın</span>
        <span className="sf-section-title-highlight sf-indented-title">Avantajları</span>
      </h2>
      <div className="sf-cards-grid-wrap" key={isMobileLayout ? safePage : 'all'}>
        <div
          className={`sf-cards-grid${isMobileLayout ? ' sf-cards-grid--mobile-2x2' : ''}`}
        >
          {visibleAdvantages.map((advantage, index) => (
            <AdvantageCard
              key={`${advantage.title}-${isMobileLayout ? safePage : 'd'}-${index}`}
              title={advantage.title}
              description={advantage.description}
              icon={advantage.icon}
              gradientClass={advantage.gradientClass}
            />
          ))}
        </div>
      </div>
      {showDots ? (
        <div className="sf-pagination-controls" role="tablist" aria-label="Avantaj sayfaları">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              className={`sf-page-indicator ${safePage === index ? 'sf-page-indicator--active' : ''}`}
              onClick={() => setActivePage(index)}
              aria-label={`Sayfa ${index + 1}`}
              aria-selected={safePage === index}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ServiceFeatures;
