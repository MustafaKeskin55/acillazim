"use client";

import React, { useState } from "react";
import { FaExclamationTriangle, FaTimes, FaSpinner } from "react-icons/fa";
import type { BookedAppointmentRecord } from "@/services/appointment/appointmentService";
import "./CancelBookingModal.css";

interface CancelBookingModalProps {
  isOpen: boolean;
  appointment: BookedAppointmentRecord | null;
  onClose: () => void;
  onConfirm: (appointmentId: number | string, reason: string) => Promise<void>;
}

const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState<string>("Plan değişikliği");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(appointment.id, reason.trim() || "Müşteri tarafından iptal edildi");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Randevu iptal edilirken bir hata oluştu.");
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

        <div className="cbm-icon-wrap">
          <FaExclamationTriangle />
        </div>

        <h3 className="cbm-title">Randevuyu İptal Et</h3>
        <p className="cbm-desc">
          <strong>{appointment.title}</strong> randevunuzu iptal etmek istediğinize emin misiniz?
          Bu işlem sonrasında hizmet veren usta bilgilendirilecektir.
        </p>

        {error && <div className="cbm-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="cbm-form">
          <label htmlFor="cancel-reason" className="cbm-label">
            İptal Gerekçesi (Opsiyonel)
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            className="cbm-textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="İptal sebebinizi belirtebilirsiniz..."
            disabled={submitting}
            maxLength={250}
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
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <FaSpinner className="cbm-spinner" />
                  <span>İptal Ediliyor…</span>
                </>
              ) : (
                <span>Evet, Randevuyu İptal Et</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelBookingModal;

