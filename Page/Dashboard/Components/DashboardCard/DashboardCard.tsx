"use client";

import React from "react";
import { FaEdit, FaPause, FaTrash, FaMapMarkerAlt, FaPlay, FaCheckCircle, FaPauseCircle, FaClock } from "react-icons/fa";
import "./DashboardCard.css";

// Dış ağa (CDN) erişim engellenmiş ortamlarda da her zaman görünen,
// ağ isteği gerektirmeyen yerel SVG placeholder.
const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">' +
      '<rect width="100%" height="100%" fill="#f1f5f9"/>' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
      'fill="#64748b" font-family="sans-serif" font-size="15" font-weight="600">Görsel Bulunmuyor</text>' +
      "</svg>"
  );

export interface DashboardCardData {
  id: string | number;
  title: string;
  categories: string;
  city: string;
  img?: string;
  listingType?: string;
  status: string;
  /** Yayındaki ilanda admin onayı bekleyen bir düzenleme var mı. */
  hasPendingEdit?: boolean;
}

interface DashboardCardProps {
  data: DashboardCardData;
  onEdit: (id: string | number) => void;
  onPause: (id: string | number) => void;
  onActivate: (id: string | number) => void;
  onDelete: (id: string | number) => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ data, onEdit, onPause, onActivate, onDelete }) => {
  const { id, title, categories, city, img, listingType, status, hasPendingEdit } = data;
  const isActive = status === "active";

  const renderListingBadge = () => {
    switch (listingType) {
      case "acil":
        return <span className="acil-ilan">Acil İlan</span>;
      case "jet":
        return <span className="jet-ilan">Jet İlan</span>;
      case "yeni":
        return <span className="yeni-ilan">Yeni İlan</span>;
      default:
        return null;
    }
  };

  return (
    <article className={`dashboard-card ${!isActive ? "paused" : ""}`}>
      <div className="dashboard-card-img-container">
        <img
          src={img || FALLBACK_IMAGE}
          className="dashboard-card-img"
          alt={title}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== FALLBACK_IMAGE) {
              target.src = FALLBACK_IMAGE;
            }
          }}
        />
        <div className="dashboard-card-img-overlay" />
        {renderListingBadge()}

        {hasPendingEdit ? (
          <span className="onayda-ilan">
            <FaClock /> Düzenleme Onayda
          </span>
        ) : (
          <span className={`dashboard-card-status-pill ${isActive ? "is-active" : "is-passive"}`}>
            {isActive ? <FaCheckCircle /> : <FaPauseCircle />}
            {isActive ? "Yayında" : "Pasif"}
          </span>
        )}
      </div>

      <div className="dashboard-card-content">
        <div className="dashboard-card-meta-top">
          <span className="dashboard-card-category">{categories}</span>
        </div>
        <h3 className="dashboard-card-title" title={title}>{title}</h3>
        <div className="dashboard-card-location">
          <FaMapMarkerAlt />
          <span>{city}</span>
        </div>
      </div>

      <div className="dashboard-card-actions">
        <button
          type="button"
          className="action-btn edit"
          onClick={() => onEdit(id)}
          title="İlanı Düzenle"
        >
          <FaEdit />
          <span>Düzenle</span>
        </button>
        {isActive ? (
          <button
            type="button"
            className="action-btn pause"
            onClick={() => onPause(id)}
            title="İlanı Pasifleştir"
          >
            <FaPause />
            <span>Pasifleştir</span>
          </button>
        ) : (
          <button
            type="button"
            className="action-btn activate"
            onClick={() => onActivate(id)}
            title="İlanı Aktifleştir"
          >
            <FaPlay />
            <span>Yayınla</span>
          </button>
        )}
        <button
          type="button"
          className="action-btn delete"
          onClick={() => onDelete(id)}
          title="İlanı Sil"
          aria-label="İlanı Sil"
        >
          <FaTrash />
        </button>
      </div>
    </article>
  );
};

export default DashboardCard;
