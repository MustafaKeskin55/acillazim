"use client";

import React, { useEffect } from 'react';
import {
  FaEye,
  FaHeart,
  FaComments,
  FaTimes,
  FaTag,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaChartBar,
} from 'react-icons/fa';
import { Bar } from 'react-chartjs-2';
import './ListingDetailModal.css';

interface ListingStats {
  views?: number;
  favorites?: number;
  messages?: number;
  monthlyViews?: number[];
  monthlyLabels?: string[];
}

interface Listing {
  id: string | number;
  title: string;
  img?: string;
  price?: number | string;
  category?: string;
  status: string;
  city?: string;
  createdAt?: string;
  stats?: ListingStats;
  [key: string]: unknown;
}

interface ListingDetailModalProps {
  listing: Listing | null;
  onClose: () => void;
}

const formatModalDate = (rawDate?: string): string => {
  if (!rawDate) return 'Belirtilmemiş';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate;
  return parsed.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatModalPrice = (rawPrice?: number | string): string => {
  if (rawPrice === undefined || rawPrice === null || rawPrice === '') return '0 TL';
  const num = Number(rawPrice);
  if (!Number.isNaN(num)) {
    return `${num.toLocaleString('tr-TR')} TL`;
  }
  return `${rawPrice} TL`;
};

const ListingDetailModal: React.FC<ListingDetailModalProps> = ({ listing, onClose }) => {
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).className === 'listing-detail-modal-overlay'
    ) {
      onClose();
    }
  };

  if (!listing) return null;

  const fallbackMonthLabels = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  const monthlyViewsData = listing.stats?.monthlyViews || Array(12).fill(0);
  const maxMonthlyView = Math.max(...monthlyViewsData, 0);

  const chartData = {
    labels:
      listing.stats?.monthlyLabels && listing.stats.monthlyLabels.length === monthlyViewsData.length
        ? listing.stats.monthlyLabels
        : fallbackMonthLabels,
    datasets: [
      {
        label: 'Görüntülenme',
        data: monthlyViewsData,
        backgroundColor: 'rgba(249, 115, 22, 0.85)',
        hoverBackgroundColor: '#ea580c',
        borderColor: '#ea580c',
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 28,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        displayColors: false,
        callbacks: {
          label: (ctx: any) =>
            `${Number(ctx.parsed?.y ?? 0).toLocaleString('tr-TR')} görüntülenme`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: maxMonthlyView < 5 ? 5 : undefined,
        grid: { color: 'rgba(148, 163, 184, 0.14)' },
        ticks: {
          precision: 0,
          stepSize: maxMonthlyView < 5 ? 1 : undefined,
          font: { size: 12 },
          color: '#64748b',
          callback: (v: number | string) => Number(v).toLocaleString('tr-TR'),
        },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 12 }, color: '#64748b' },
      },
    },
  };

  const statItems = [
    {
      key: 'views',
      label: 'Görüntülenme',
      sublabel: 'Toplam ilan ziyareti',
      icon: <FaEye size={18} />,
      value: listing.stats?.views,
    },
    {
      key: 'favorites',
      label: 'Favoriye Eklenme',
      sublabel: 'Kaydedilen kullanıcı sayısı',
      icon: <FaHeart size={18} />,
      value: listing.stats?.favorites,
    },
    {
      key: 'messages',
      label: 'Mesaj',
      sublabel: 'Gelen iletişim talebi',
      icon: <FaComments size={18} />,
      value: listing.stats?.messages,
    },
  ];

  return (
    <div className="listing-detail-modal-overlay" onClick={handleOverlayClick}>
      <div className="listing-detail-modal" role="dialog" aria-modal="true" aria-labelledby="ldm-title">
        {/* Üst Kurumsal Başlık Barı */}
        <div className="ldm-topbar">
          <div className="ldm-topbar-badges">
            <span className="ldm-report-pill">İlan Performans Detayı</span>
            <span className={`status-badge ${listing.status}`}>
              {listing.status === 'active' ? 'Aktif' : 'Pasif'}
            </span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Kapat"
          >
            <FaTimes />
          </button>
        </div>

        {/* İlan Görseli ve Temel Bilgiler */}
        <div className="modal-header">
          {listing.img && (
            <div className="ldm-image-frame">
              <img src={listing.img} alt={listing.title} className="listing-image" />
            </div>
          )}

          <div className="listing-info">
            <h2 id="ldm-title" className="listing-title">{listing.title}</h2>

            <div className="listing-details-container">
              <div className="listing-details-row">
                <div className="detail-item">
                  <span className="detail-icon price-icon" aria-hidden="true">
                    <FaTag />
                  </span>
                  <div className="detail-text-group">
                    <span className="detail-label">Fiyat</span>
                    <span className="detail-value price">{formatModalPrice(listing.price)}</span>
                  </div>
                </div>

                <div className="detail-item">
                  <span className="detail-icon category-icon" aria-hidden="true">
                    <FaLayerGroup />
                  </span>
                  <div className="detail-text-group">
                    <span className="detail-label">Kategori</span>
                    <span className="detail-value category">
                      {listing.category || listing.categories || (listing as any).categoryName || 'Belirtilmemiş'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="listing-details-row">
                <div className="detail-item">
                  <span className="detail-icon location-icon" aria-hidden="true">
                    <FaMapMarkerAlt />
                  </span>
                  <div className="detail-text-group">
                    <span className="detail-label">İl / Konum</span>
                    <span className="detail-value location">
                      {listing.city || 'Belirtilmemiş'}
                    </span>
                  </div>
                </div>

                <div className="detail-item">
                  <span className="detail-icon date-icon" aria-hidden="true">
                    <FaCalendarAlt />
                  </span>
                  <div className="detail-text-group">
                    <span className="detail-label">İlan Tarihi</span>
                    <span className="detail-value date">
                      {formatModalDate(listing.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3'lü Performans Özeti Kartları */}
        <div className="stats-overview">
          {statItems.map(({ key, label, sublabel, icon, value }) => (
            <div key={key} className={`stat-card stat-card--${key}`}>
              <div className="stat-content">
                <div className="stat-header">
                  <div className="stat-icon-wrapper">{icon}</div>
                  <div className="stat-label-group">
                    <span className="stat-label">{label}</span>
                    <span className="stat-sublabel">{sublabel}</span>
                  </div>
                </div>
                <div className="stat-value">{(value ?? 0).toLocaleString('tr-TR')}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Aylık Görüntülenme Grafiği */}
        <div className="modal-chart-wrapper">
          <div className="modal-chart-head">
            <div className="modal-chart-title-wrap">
              <span className="modal-chart-icon" aria-hidden="true">
                <FaChartBar />
              </span>
              <div>
                <h3 className="modal-chart-title">İlan Görüntülenme Grafiği</h3>
                <p className="modal-chart-subtitle">Aylık bazda ziyaretçi etkileşim dağılımı</p>
              </div>
            </div>
          </div>
          <div className="modal-chart-container">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetailModal;
