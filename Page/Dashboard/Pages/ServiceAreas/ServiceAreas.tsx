"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaChartLine,
  FaUsers,
  FaStar,
  FaPlus,
  FaBriefcase,
  FaArrowRight,
  FaShieldAlt,
  FaBolt,
  FaCheckCircle,
} from "react-icons/fa";
import ServiceCard from "./Components/ServiceCard";
import "./Styles/ServiceAreas.css";
import "./Styles/ServiceAreas.mobile.css";
import {
  fetchMyServicesDashboard,
  type MyDashboardService,
  type MyServicesDashboardStats,
} from "@/services/serviceAreas/myServicesDashboardService";

const emptyStats: MyServicesDashboardStats = {
  activeServices: 0,
  completedJobs: 0,
  averageRating: null,
};

const ServiceAreas: React.FC = () => {
  const [services, setServices] = useState<MyDashboardService[]>([]);
  const [stats, setStats] = useState<MyServicesDashboardStats>(emptyStats);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const result = await fetchMyServicesDashboard();
        if (cancelled) return;
        setServices(result.services);
        setStats(result.stats);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ratingDisplay =
    stats.averageRating != null && !Number.isNaN(stats.averageRating)
      ? stats.averageRating
      : "—";

  return (
    <div className="service-areas">
      {/* ── ÜST BAŞLIK & AKSİYON ── */}
      <div className="service-areas__header-wrap">
        <div className="service-areas__header">
          <div className="service-areas__badge">
            <span className="service-areas__badge-dot" />
            <span>Hizmet & Performans Paneli</span>
          </div>
          <h1>Hizmet Alanlarım</h1>
          <p>Hizmet verdiğiniz uzmanlık alanları ve güncel performans istatistikleriniz</p>
        </div>

        <Link href="/ilan-ver" className="service-areas__add-btn">
          <FaPlus className="service-areas__add-icon" />
          <span>Yeni Hizmet Ekle</span>
        </Link>
      </div>

      {/* ── İSTATİSTİK KARTLARI ── */}
      <div className="sa-stats-grid">
        <div className="sa-stat-card sa-active">
          <div className="sa-stat-icon">
            <FaChartLine />
          </div>
          <div className="sa-stat-content">
            <div className="sa-stat-title">Aktif Hizmet</div>
            <div className="sa-stat-value">
              {isLoading ? "—" : stats.activeServices}
            </div>
          </div>
        </div>

        <div className="sa-stat-card sa-completed">
          <div className="sa-stat-icon">
            <FaUsers />
          </div>
          <div className="sa-stat-content">
            <div className="sa-stat-title">Hizmet Verilen İş</div>
            <div className="sa-stat-value">
              {isLoading ? "—" : stats.completedJobs}
            </div>
          </div>
        </div>

        <div className="sa-stat-card sa-rating">
          <div className="sa-stat-icon">
            <FaStar />
          </div>
          <div className="sa-stat-content">
            <div className="sa-stat-title">Ortalama Puan</div>
            <div className="sa-stat-value">
              {isLoading ? "—" : ratingDisplay}
            </div>
          </div>
        </div>
      </div>

      {/* ── İÇERİK BÖLÜMÜ (YÜKLENİYOR / KARTLAR / BOŞ DURUM) ── */}
      <div className="service-areas__content">
        {isLoading ? (
          <div className="service-areas__loading">
            <div className="service-areas__spinner" />
            <p>Hizmet alanlarınız yükleniyor…</p>
          </div>
        ) : services.length > 0 ? (
          <div className="service-areas__grid">
            {services.map((service) => (
              <ServiceCard key={String(service.id)} service={service} />
            ))}
          </div>
        ) : (
          <div className="service-areas__empty-state">
            <div className="sa-empty-icon-wrap">
              <div className="sa-empty-icon">
                <FaBriefcase />
              </div>
            </div>

            <h2 className="sa-empty-title">Henüz Bir Hizmet Alanınız Bulunmuyor</h2>
            <p className="sa-empty-desc">
              Uzman olduğunuz kategorilerde ilan açarak Acillazım üzerinden çevrenizdeki
              müşterilerden anında acil ve planlı talepler almaya başlayabilirsiniz.
            </p>

            <Link href="/ilan-ver" className="sa-empty-btn">
              <FaPlus />
              <span>İlk Hizmet Alanını Ekle</span>
              <FaArrowRight className="sa-empty-arrow" />
            </Link>

            <div className="sa-empty-badges">
              <div className="sa-empty-badge">
                <FaBolt className="sa-empty-badge-icon" />
                <span>Ücretsiz & Hızlı Yayın</span>
              </div>
              <div className="sa-empty-badge">
                <FaShieldAlt className="sa-empty-badge-icon" />
                <span>Güvenli İletişim</span>
              </div>
              <div className="sa-empty-badge">
                <FaCheckCircle className="sa-empty-badge-icon" />
                <span>Doğrulanmış Profil</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceAreas;
