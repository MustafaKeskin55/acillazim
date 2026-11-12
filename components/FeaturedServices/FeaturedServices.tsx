"use client";

import React, { useState, useEffect } from "react";
import "./FeaturedServices.css";
import ProductCard from "@/components/ProductCard/ProductCard";
import { IoNewspaperOutline } from "react-icons/io5";
import { FaHandshakeSimple } from "react-icons/fa6";
import { useRouter } from "next/navigation";

interface Service {
  id?: string | number;
  [key: string]: unknown;
}

interface FeaturedServicesProps {
  services?: Service[];
}

function FeaturedServices({ services }: FeaturedServicesProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // window erişimi client-side'da
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 880);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const hasValidData = (): boolean => {
    return !!(services && Array.isArray(services) && services.length > 0 && services.some((s) => s && typeof s === "object"));
  };

  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 300);
  }, [services]);

  const handleFavoriteToggle = (id: string | number) => console.log(`Favorilere eklendi/çıkarıldı: ${id}`);
  const handleProductClick = (id: string | number) => console.log(`Hizmet tıklandı: ${id}`);

  const renderLoading = () => (
    <div className="featured-services-loading">
      <div className="loading-spinner"></div>
      <p>Hizmetler yükleniyor...</p>
    </div>
  );

  const renderEmptyState = () => (
    <div className="empty-state-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', margin: '0 auto', textAlign: 'center' }}>
      <div className="empty-state-minimal" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', textAlign: 'center', margin: '0 auto', padding: '36px 0 20px' }}>
        <div className="empty-state-column" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', margin: '0 auto', width: '100%', maxWidth: '480px', gap: '18px' }}>
          <h3 style={{ textAlign: 'center', margin: 0, width: '100%' }}>Henüz öne çıkan hizmet bulunmuyor</h3>
          <button type="button" onClick={() => { window.location.href = "/ilan-ver"; }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <FaHandshakeSimple className="button-handshake-icon" />
            <span>Hizmet Vermek İstiyorum</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderCards = () => {
    const totalCards = Math.min(20, (services || []).length);
    const limitedServices = (services || []).slice(0, totalCards);

    return limitedServices.map((service, index) => (
      <div className="featured-service-card-wrapper" key={`service-${service.id || index}`}>
        <ProductCard
          product={service}
          onFavoriteToggle={handleFavoriteToggle}
          onProductClick={handleProductClick}
        />
      </div>
    ));
  };

  const renderContent = () => {
    if (loading) return renderLoading();
    if (!hasValidData()) return renderEmptyState();
    return <div className="featured-services-container">{renderCards()}</div>;
  };

  return (
    <div className="service-page-one-cikan-hizmetler-scope">
      <div className="featured-services">
        <div className="featured-services-header">
          <h3>Öne Çıkan Hizmetler</h3>
          <button onClick={() => router.push("/filtrele/tum-ilanlar?vitrin_durumu=one_cikan")}>
            <IoNewspaperOutline className="button-icon" /> Tümünü Gör
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}

export default FeaturedServices;
