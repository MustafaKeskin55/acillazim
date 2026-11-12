"use client";

import React from "react";
import { FaStar, FaQuoteLeft, FaUser, FaReply } from "react-icons/fa";
import { maskUserName } from "@/services/userService";
import type { DashboardServiceReview } from "@/services/serviceAreas/myServicesDashboardService";
import "./ServiceReviews.css";

interface ServiceReviewsProps {
  reviews?: DashboardServiceReview[];
  providerName?: string;
}

const ServiceReviews: React.FC<ServiceReviewsProps> = ({ reviews = [], providerName }) => {
  const renderStars = (rating: number) =>
    [...Array(5)].map((_, index) => (
      <FaStar
        key={index}
        className={index < rating ? "service-review__star--filled" : "service-review__star--empty"}
      />
    ));

  const calculateAverageRating = (): string => {
    if (reviews.length === 0) return "0";
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const getReviewCountForRating = (rating: number) => reviews.filter((review) => review.rating === rating).length;

  const getPercentageForRating = (rating: number): string => {
    if (reviews.length === 0) return "0%";
    const count = getReviewCountForRating(rating);
    return `${Math.round((count / reviews.length) * 100)}%`;
  };

  const avgNum = parseFloat(calculateAverageRating()) || 0;

  return (
    <div className="service-reviews">
      <div className="service-reviews__summary">
        <div className="service-reviews__stats">
          <div className="service-reviews__overall">
            <span className="service-reviews__overall-score">{calculateAverageRating()}</span>
            <div className="service-reviews__overall-stars">
              {renderStars(Math.round(avgNum))}
              <span className="service-reviews__overall-count">({reviews.length} değerlendirme)</span>
            </div>
          </div>
          <div className="service-reviews__distribution">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="service-reviews__bar">
                <div className="service-reviews__bar-label">{stars}</div>
                <div className="service-reviews__bar-container">
                  <div className="service-reviews__bar-fill" style={{ width: getPercentageForRating(stars) }} />
                </div>
                <div className="service-reviews__bar-count">{getReviewCountForRating(stars)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {reviews.length > 0 ? (
        <div className="service-reviews__list">
          {reviews.map((review) => (
            <div key={String(review.id)} className="service-review">
              <div className="service-review__header">
                <div className="service-review__user">
                  <div className="service-review__avatar">
                    <FaUser />
                  </div>
                  <div className="service-review__user-info">
                    <div className="service-review__username">
                      {maskUserName(review.user || (review as any).reviewerName || (review as any).reviewer_name)}
                    </div>
                    <div className="service-review__date">
                      Hizmet Tarihi:{" "}
                      {review.serviceDate
                        ? new Date(review.serviceDate).toLocaleDateString("tr-TR")
                        : review.date ?? "—"}
                    </div>
                  </div>
                </div>
                <div className="service-review__rating">{renderStars(review.rating)}</div>
              </div>
              <div className="service-review__content">
                <FaQuoteLeft className="service-review__quote-icon" />
                <p className="service-review__text">{review.comment ?? ""}</p>
              </div>
              {review.response ? (
                <div className="service-review__response">
                  <div className="service-review__response-badge">
                    <FaReply size={11} />
                    <span>{providerName ? `${providerName} — Yanıtı` : "Hizmet Sağlayıcı Yanıtı"}</span>
                  </div>
                  <div className="service-review__response-box">
                    <p className="service-review__response-text">
                      {typeof (review as any).response === "string"
                        ? (review as any).response
                        : (review as any).response?.comment || (review as any).response?.text || ""}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="service-reviews__empty">
          <p>Henüz değerlendirme bulunmamaktadır.</p>
        </div>
      )}
    </div>
  );
};

export default ServiceReviews;
