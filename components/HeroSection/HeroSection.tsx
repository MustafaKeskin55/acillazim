"use client";

import React from "react";
import "./HeroSection.css";
import Link from "next/link";
import { FaPlus, FaSearch, FaBolt, FaUsers, FaShieldAlt } from "react-icons/fa";
import { useAuth } from "@/context/AuthContext";

function HeroSection() {
  const { isAuthenticated } = useAuth();

  const handlePostAdClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("openAuthPromptModal"));
    }
  };

  return (
    <section className="hero-section">
      <div className="hero-content">
        <div className="hero-left">
          <h1>
            Hemen İlan Ver,
            <br />
            Hızlıca Sat!
          </h1>
          <p>
            Milyonlarca aktif kullanıcıya ulaşın, ürünlerinizi hızlıca satın.
          </p>
          <div className="hero-buttons">
            <Link
              href="/ilan-ver"
              onClick={handlePostAdClick}
              className="primary-button"
            >
              <FaPlus /> Ücretsiz İlan Ver
            </Link>
            <Link href="/filtrele/tum-ilanlar" className="secondary-button">
              <FaSearch /> İlanları Keşfet
            </Link>
          </div>
        </div>

        <div className="hero-right">
          <div className="feature-item">
            <div className="feature-icon">
              <FaBolt />
            </div>
            <div className="feature-text">
              <h4>Hızlı İlan Verme</h4>
              <p>30 saniyede ilanınızı yayınlayın</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <FaUsers />
            </div>
            <div className="feature-text">
              <h4>Geniş Kitle</h4>
              <p>Milyonlarca aktif kullanıcıya ulaşın</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <FaShieldAlt />
            </div>
            <div className="feature-text">
              <h4>Güvenli Alışveriş</h4>
              <p>%100 Alıcı ve satıcı koruması</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
