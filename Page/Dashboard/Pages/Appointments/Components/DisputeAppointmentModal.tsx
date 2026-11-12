"use client";

import React, { useState } from "react";
import { FaExclamationTriangle, FaTimes, FaSpinner } from "react-icons/fa";
import type { BookedAppointmentRecord } from "@/services/appointment/appointmentService";
import "./CancelBookingModal.css"; // Reuse modal styling for consistency

interface DisputeAppointmentModalProps {
  isOpen: boolean;
  appointment: BookedAppointmentRecord | null;
  onClose: () => void;
  onConfirm: (appointmentId: number | string, reason: string) => Promise<void>;
}

const DisputeAppointmentModal: React.FC<DisputeAppointmentModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Lütfen itiraz gerekçenizi açıklayınız.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(appointment.id, reason.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İtiraz iletilirken bir hata oluştu.");
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

        <div className="cbm-icon-wrap" style={{ color: "#ef4444", background: "#fef2f2" }}>
          <FaExclamationTriangle />
        </div>

        <h3 className="cbm-title">Hizmet Tamamlanmasına İtiraz Et</h3>
        <p className="cbm-desc">
          <strong>{appointment.title}</strong> randevusu için ustanın tamamlama bildirimine itiraz ediyorsunuz.
          Lütfen işin neden tamamlanmadığını veya yaşanan sorunu açıklayın.
        </p>

        {error && <div className="cbm-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="cbm-form">
          <label htmlFor="dispute-reason" className="cbm-label">
            İtiraz Gerekçesi (Zorunlu)
          </label>
          <textarea
            id="dispute-reason"
            rows={4}
            className="cbm-textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Örn: Hizmet henüz bitirilmedi / eksik işlemler var / anlaşılan kriterler karşılanmadı..."
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
              className="cbm-btn cbm-btn--danger"
              disabled={submitting || !reason.trim()}
            >
              {submitting ? (
                <>
                  <FaSpinner className="cbm-spinner" />
                  <span>İletiliyor…</span>
                </>
              ) : (
                "İtirazı Gönder"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisputeAppointmentModal;

