"use client";

import React, { useState, useEffect } from 'react';
import { FaStar, FaReply, FaChevronDown, FaPen, FaCheckCircle, FaStore } from 'react-icons/fa';
import { maskUserName } from '@/services/userService';
import { getReviewsByIlanId } from '@/services/productDetail/productDetailService';
import reviewService from '@/services/profile/reviewService';
import RateAppointmentModal from '@/Page/Dashboard/Pages/Appointments/Components/RateAppointmentModal';
import toast from 'react-hot-toast';
import './ServiceDetailReviews.css';

interface ServiceDetailReviewsProps {
  serviceId?: string | number;
  initialReviews?: unknown[];
  providerName?: string;
}

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function formatReviewDate(rawDate: string): string {
  if (!rawDate) return '';
  const trimmed = rawDate.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (monthIdx >= 0 && monthIdx < 12 && day >= 1 && day <= 31) {
      return `${day} ${TURKISH_MONTHS[monthIdx]} ${year}`;
    }
  }
  return trimmed;
}

function getInitials(name: string): string {
  const cleaned = String(name || 'Müşteri').replace(/\*/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const ServiceDetailReviews: React.FC<ServiceDetailReviewsProps> = ({
  serviceId = 1,
  initialReviews = [],
  providerName = 'Hizmet Sağlayıcı',
}) => {
  const [serviceReviews, setServiceReviews] = useState<any[]>([]);
  const [visibleReviews, setVisibleReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [canReview, setCanReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const initialItemCount = 6;
  const pageSize = 6;

  const resolvedProviderName =
    providerName && String(providerName).trim() !== ''
      ? String(providerName).trim()
      : 'Hizmet Sağlayıcı';

  const fetchServiceDetailReviews = async () => {
    try {
      setLoading(true);
      const rawReviews = await getReviewsByIlanId(
        typeof serviceId === 'number' ? serviceId : parseInt(String(serviceId), 10),
      );
      const sourceList =
        Array.isArray(rawReviews) && rawReviews.length > 0
          ? rawReviews
          : Array.isArray(initialReviews)
            ? initialReviews
            : [];

      const reviewsData = sourceList.map((r: any, idx: number) => ({
        ...r,
        id: r?.id ?? r?.comment_id ?? idx,
        user: String(
          r?.user || r?.user_name || r?.userName || r?.reviewerName || r?.reviewer_name || r?.customerName || 'Müşteri',
        ),
        rating: Number(r?.rating) || 5,
        date: String(r?.date || (typeof r?.createdAt === 'string' ? r.createdAt.split('T')[0] : '') || ''),
        comment: String(r?.comment || r?.comment_text || r?.content || ''),
        response: r?.response || r?.reply || r?.seller_response || r?.providerResponse || null,
      }));

      setServiceReviews(reviewsData);
      setVisibleReviews(reviewsData.slice(0, initialItemCount));
      setLoading(false);
    } catch (error) {
      console.error('ServiceDetail yorumları yüklenirken hata:', error);
      setLoading(false);
    }
  };

  const checkUserEligibility = async () => {
    if (!serviceId) return;
    const elig = await reviewService.checkEligibility(serviceId);
    setCanReview(elig.canReview);
    setAlreadyReviewed(elig.alreadyReviewed);
    setTargetUserId(elig.targetUserId ?? null);
  };

  useEffect(() => {
    if (serviceId) {
      fetchServiceDetailReviews();
      checkUserEligibility();
    }
  }, [serviceId]);

  const handleRateSubmit = async (rating: number, comment: string) => {
    if (!serviceId) throw new Error('İlan bilgisi bulunamadı');
    const res = await reviewService.submitReview({
      listingId: serviceId,
      targetUserId,
      rating,
      comment,
    });
    if (!res.success) {
      throw new Error(res.message || 'Değerlendirme gönderilemedi');
    }
    toast.success('Değerlendirmeniz başarıyla yayınlandı!');
    await fetchServiceDetailReviews();
    await checkUserEligibility();
  };

  const loadMoreReviews = () => {
    const nextPage = page + 1;
    const startIndex = initialItemCount + (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    if (startIndex < serviceReviews.length) {
      const newVisibleReviews = [
        ...visibleReviews,
        ...serviceReviews.slice(startIndex, endIndex),
      ];
      setVisibleReviews(newVisibleReviews);
      setPage(nextPage);
    }
  };

  const calculateAverageRating = (): number => {
    if (!serviceReviews || serviceReviews.length === 0) return 0;
    const totalRating = serviceReviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
    return Math.round((totalRating / serviceReviews.length) * 10) / 10;
  };

  const avgRating = calculateAverageRating();
  const formattedAvgRating = avgRating > 0 ? avgRating.toFixed(1) : '0.0';

  if (loading) {
    return (
      <div className="sd-reviews-loading">
        <div className="sd-reviews-loading-spinner"></div>
        <p>Yorumlar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="sd-service-reviews">
      <div className="sd-reviews-header">
        <div className="sd-reviews-title-group">
          <span className="sd-reviews-eyebrow">
            <FaCheckCircle size={11} />
            <span>DOĞRULANMIŞ HİZMET DENEYİMLERİ</span>
          </span>
          <h3>Müşteri Yorumları</h3>
          <span className="sd-reviews-subtitle">
            Bu hizmet için yapılan gerçek müşteri değerlendirmeleri ve hizmet sağlayıcı yanıtları
          </span>
        </div>

        <div className="sd-reviews-header-right">
          {serviceReviews.length > 0 && (
            <div className="sd-reviews-summary">
              <div className="sd-rating-overview">
                <div className="sd-rating-score">
                  <div className="sd-score-badge">
                    <span className="sd-score">{formattedAvgRating}</span>
                    <span className="sd-score-max">/ 5.0</span>
                  </div>
                  <div className="sd-rating-meta">
                    <div className="sd-stars">
                      {[...Array(5)].map((_, i) => (
                        <FaStar
                          key={i}
                          className={i < Math.round(avgRating) ? 'filled' : 'empty'}
                        />
                      ))}
                    </div>
                    <span className="sd-review-count">
                      Toplam {serviceReviews.length} değerlendirme
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {canReview && (
            <button
              type="button"
              className="sd-write-review-btn"
              onClick={() => setIsRateModalOpen(true)}
            >
              <FaPen size={12} />
              <span>Değerlendirme Yap</span>
            </button>
          )}
        </div>
      </div>

      {visibleReviews.length > 0 ? (
        <>
          <div
            className={`sd-reviews-grid ${
              visibleReviews.length === 1 ? 'sd-reviews-grid--single' : ''
            }`}
          >
            {visibleReviews.map((review) => {
              const maskedName = maskUserName(review.user || 'Müşteri');
              const initials = getInitials(maskedName);
              const readableDate = formatReviewDate(review.date);
              const numericRating = Number(review.rating) || 5;

              return (
                <div key={review.id} className="sd-review-item">
                  <div className="sd-review-header">
                    <div className="sd-review-user">
                      <div className="sd-review-avatar" aria-hidden="true">
                        <span>{initials}</span>
                      </div>
                      <div className="sd-review-user-info">
                        <div className="sd-review-user-top">
                          <span className="sd-review-username">{maskedName}</span>
                          <span className="sd-review-verified-pill">
                            <FaCheckCircle size={10} />
                            <span>Doğrulanmış Müşteri</span>
                          </span>
                        </div>
                        {readableDate && (
                          <span className="sd-review-date">{readableDate}</span>
                        )}
                      </div>
                    </div>

                    <div className="sd-review-rating">
                      <div className="sd-review-stars">
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            className={i < numericRating ? 'star-filled' : 'star-empty'}
                          />
                        ))}
                      </div>
                      <span className="sd-review-rating-num">
                        {numericRating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="sd-review-content">
                    <p className="sd-review-comment-text">{review.comment}</p>
                  </div>

                  {review.response && (
                    <div className="sd-review-response">
                      <div className="sd-response-content">
                        <div className="sd-response-top">
                          <div className="sd-response-provider">
                            <span className="sd-response-provider-avatar" aria-hidden="true">
                              <FaStore size={12} />
                            </span>
                            <div className="sd-response-provider-meta">
                              <span className="sd-response-provider-name">
                                {resolvedProviderName}
                              </span>
                              <span className="sd-response-provider-role">
                                İlan Sahibi & Hizmet Sağlayıcı
                              </span>
                            </div>
                          </div>

                          <div
                            className="sd-response-indicator"
                            style={{
                              background: '#ffffff',
                              color: '#0f766e',
                              border: '1px solid #5eead4',
                            }}
                          >
                            <FaReply size={11} />
                            <span>Hizmet Sağlayıcı Yanıtı</span>
                          </div>
                        </div>

                        <div className="sd-response-text">{review.response}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {visibleReviews.length < serviceReviews.length && (
            <div className="sd-load-more-container">
              <button className="sd-load-more-button" onClick={loadMoreReviews}>
                <FaChevronDown />
                <span>
                  Daha Fazla Göster ({serviceReviews.length - visibleReviews.length} yorum daha)
                </span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="sd-no-reviews">
          <FaStar size={36} />
          <h4>Henüz değerlendirme bulunmuyor</h4>
          <p>Bu hizmet için henüz müşteri yorumu yapılmamış.</p>
          {canReview && (
            <button
              type="button"
              className="sd-write-review-btn"
              onClick={() => setIsRateModalOpen(true)}
              style={{ marginTop: '14px' }}
            >
              <FaPen size={12} />
              <span>İlk Değerlendirmeyi Siz Yapın</span>
            </button>
          )}
        </div>
      )}

      <RateAppointmentModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        onSubmit={handleRateSubmit}
      />
    </div>
  );
};

export default ServiceDetailReviews;
