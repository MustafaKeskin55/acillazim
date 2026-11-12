"use client";

import React, { useState } from "react";
import { FaStar, FaTimes, FaSpinner, FaCheckCircle } from "react-icons/fa";
import "./CancelBookingModal.css";

interface RateAppointmentModalProps {
  isOpen: boolean;
  serviceTitle?: string;
  providerName?: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

const RATING_LABELS: Record<number, string> = {
  1: "1 Yıldız - Çok Kötü",
  2: "2 Yıldız - Kötü",
  3: "3 Yıldız - Orta",
  4: "4 Yıldız - İyi",
  5: "5 Yıldız - Mükemmel",
};

const RateAppointmentModal: React.FC<RateAppointmentModalProps> = ({
  isOpen,
  serviceTitle,
  providerName,
  onClose,
  onSubmit,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeStar = hoverRating || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError("Lütfen 1 ile 5 arasında bir yıldız puanı seçin.");
      return;
    }
    if (!comment.trim()) {
      setError("Lütfen aldığınız hizmetle ilgili deneyiminizi kısaca yazın.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(rating, comment.trim());
      setComment("");
      setRating(5);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Değerlendirme gönderilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cbm-overlay" role="dialog" aria-modal="true">
      <div className="cbm-backdrop" onClick={!submitting ? onClose : undefined} />
      <div className="cbm-dialog">
        <button
          type="button"
          className="cbm-close-btn"
          onClick={onClose}
          disabled={submitting}
          aria-label="Kapat"
        >
          <FaTimes />
        </button>

        <div className="cbm-icon-wrap" style={{ color: "#f59e0b", background: "#fffbeb" }}>
          <FaStar />
        </div>

        <h3 className="cbm-title">Hizmeti Değerlendir</h3>
        <p className="cbm-desc">
          {serviceTitle ? <strong>{serviceTitle}</strong> : "Aldığınız hizmet"}{" "}
          {providerName ? `(${providerName})` : ""} için puanınızı ve yorumunuzu paylaşın.
        </p>

        {error && <div className="cbm-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="cbm-form">
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <div
              style={{
                display: "inline-flex",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = activeStar >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={submitting}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: submitting ? "default" : "pointer",
                      padding: "4px",
                      fontSize: "28px",
                      color: filled ? "#f59e0b" : "#cbd5e1",
                      transition: "transform 0.15s ease, color 0.15s ease",
                      transform: hoverRating === star ? "scale(1.15)" : "scale(1)",
                    }}
                    aria-label={`${star} Yıldız`}
                  >
                    <FaStar />
                  </button>
                );
              })}
            </div>
            <div
              style={{
                marginTop: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#475569",
              }}
            >
              {RATING_LABELS[activeStar] || "Puan Seçin"}
            </div>
          </div>

          <label htmlFor="review-comment" className="cbm-label">
            Yorumunuz (Zorunlu)
          </label>
          <textarea
            id="review-comment"
            rows={4}
            className="cbm-textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Hizmet kalitesi, zamanlama ve iletişim hakkındaki deneyiminizi yazın..."
            disabled={submitting}
            maxLength={500}
            required
          />

          <div className="cbm-actions">
            <button
              type="button"
              className="cbm-btn cbm-btn--secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="cbm-btn"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#ffffff",
                border: "none",
              }}
              disabled={submitting || !comment.trim()}
            >
              {submitting ? (
                <>
                  <FaSpinner className="cbm-spinner" />
                  <span>Gönderiliyor…</span>
                </>
              ) : (
                <>
                  <FaCheckCircle style={{ marginRight: 6 }} />
                  <span>Değerlendirmeyi Gönder</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RateAppointmentModal;

