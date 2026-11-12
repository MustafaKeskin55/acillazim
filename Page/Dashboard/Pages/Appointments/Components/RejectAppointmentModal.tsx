"use client";

import React, { memo, useEffect, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  FaTimes,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaCheck,
  FaInfoCircle,
} from "react-icons/fa";
import toast from "react-hot-toast";
import { approveAppointment, rejectAppointment } from "@/services/appointment/appointmentService";
import type { ProviderAppointmentRecord } from "@/services/appointment/appointmentService";
import "./RejectAppointmentModal.css";

interface RejectAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: ProviderAppointmentRecord;
  onAppointmentUpdate: (
    appointmentId: string | number,
    newStatus: string,
    updatedData?: Partial<ProviderAppointmentRecord> | null
  ) => void;
  action?: string;
}

const RejectAppointmentModal = memo(
  ({ isOpen, onClose, appointment, onAppointmentUpdate, action = "reject" }: RejectAppointmentModalProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [changeDateTime, setChangeDateTime] = useState(false);
    const [confirmedDate, setConfirmedDate] = useState(appointment?.date || "");
    const [confirmedTime, setConfirmedTime] = useState(appointment?.time || "");

    useEffect(() => {
      if (isOpen) {
        setIsProcessing(false);
        setChangeDateTime(false);
        setConfirmedDate(appointment?.date || "");
        setConfirmedTime(appointment?.time || "");
      }
    }, [isOpen, appointment?.date, appointment?.time]);

    const handleAction = async () => {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        let result;
        let newStatus: string;
        if (action === "approve") {
          result = await approveAppointment(appointment.id, {
            notes: changeDateTime
              ? "Hizmet veren yeni tarih/saat belirleyerek onayladı"
              : "Randevu onaylandı",
            confirmedDate: changeDateTime && confirmedDate ? confirmedDate : undefined,
            confirmedTime: changeDateTime && confirmedTime ? confirmedTime : undefined,
          });
          newStatus = "confirmed";
          if (result.success) {
            onAppointmentUpdate(appointment.id, newStatus, {
              date: changeDateTime && confirmedDate ? confirmedDate : appointment.date,
              time: changeDateTime && confirmedTime ? confirmedTime : appointment.time,
            });
            toast.success(
              changeDateTime
                ? "Randevu yeni tarih ve saat ile onaylandı."
                : "Randevu başarıyla onaylandı."
            );
            onClose();
          }
        } else {
          result = await rejectAppointment(appointment.id, {
            reason: "Randevu reddedildi",
            notes: "Randevu reddedildi",
          });
          newStatus = "rejected";
          if (result.success) {
            onAppointmentUpdate(appointment.id, newStatus);
            toast.success("Randevu talebi reddedildi.");
            onClose();
          }
        }
      } catch (error) {
        console.error(`Randevu ${action === "approve" ? "onaylanırken" : "reddedilirken"} hata:`, error);
        const message = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
        toast.error(`Randevu ${action === "approve" ? "onaylanamadı" : "reddedilemedi"}: ${message}`);
      } finally {
        setIsProcessing(false);
      }
    };

    const handleClose = () => {
      if (isProcessing) return;
      onClose();
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLDivElement).className === "reject-modal-overlay") handleClose();
    };

    if (!isOpen) return null;

    const isApprove = action === "approve";

    return (
      <div className="reject-modal-overlay" onClick={handleBackdropClick} role="presentation">
        <div
          className={`reject-modal ${isApprove ? "reject-modal--approve" : "reject-modal--reject"}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="reject-modal-header">
            <div className="reject-modal-title">
              <div className={`ram-header-icon ${isApprove ? "ram-header-icon--approve" : "ram-header-icon--reject"}`}>
                {isApprove ? (
                  <FaCheckCircle className="approve-icon" />
                ) : (
                  <FaExclamationTriangle className="reject-icon" />
                )}
              </div>
              <div className="ram-header-text">
                <span className={`ram-eyebrow ${isApprove ? "ram-eyebrow--approve" : "ram-eyebrow--reject"}`}>
                  {isApprove ? "Randevu Onay İşlemi" : "Randevu Red İşlemi"}
                </span>
                <h3>{isApprove ? "Randevuyu Onayla" : "Randevuyu Reddet"}</h3>
              </div>
            </div>
            <button type="button" className="reject-modal-close" onClick={handleClose} aria-label="Kapat">
              <FaTimes />
            </button>
          </div>

          <div className="reject-modal-body">
            <div className={`reject-info ${isApprove ? "reject-info--approve" : "reject-info--reject"}`}>
              <span className="ram-info-kicker">Talep Edilen Hizmet Özeti</span>
              <h4>{appointment.title}</h4>
              <div className="ram-meta-chips">
                <div className="ram-meta-chip ram-meta-chip--datetime">
                  <FaCalendarAlt className="ram-meta-chip-icon" />
                  <span>
                    <strong>Talep Edilen:</strong>{" "}
                    {appointment.date
                      ? format(new Date(appointment.date), "dd MMMM yyyy", { locale: tr })
                      : "—"}{" "}
                    • {appointment.time}
                  </span>
                </div>
                {appointment.location && (
                  <div className="ram-meta-chip ram-meta-chip--location">
                    <FaMapMarkerAlt className="ram-meta-chip-icon" />
                    <span className="reject-location">{appointment.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hizmet Veren için Onay Aşamasında Saat Değiştirme Seçeneği */}
            {isApprove && (
              <div className={`approve-custom-schedule ${changeDateTime ? "is-active" : ""}`}>
                <label className="approve-custom-checkbox">
                  <input
                    type="checkbox"
                    checked={changeDateTime}
                    onChange={(e) => setChangeDateTime(e.target.checked)}
                  />
                  <span className="ram-checkbox-visual" aria-hidden="true">
                    <FaCheck />
                  </span>
                  <div className="ram-checkbox-copy">
                    <span className="ram-checkbox-title">Randevu tarih veya saatini değiştirerek onayla</span>
                    <span className="ram-checkbox-sub">
                      Müşteriye uygun yeni bir randevu günü ve saati belirleyin
                    </span>
                  </div>
                </label>

                {changeDateTime && (
                  <div className="approve-schedule-inputs">
                    <div className="approve-input-group">
                      <label>
                        <FaCalendarAlt className="ram-input-label-icon ram-input-label-icon--date" /> Onaylanan Tarih
                      </label>
                      <input
                        type="date"
                        value={confirmedDate}
                        onChange={(e) => setConfirmedDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                    <div className="approve-input-group">
                      <label>
                        <FaClock className="ram-input-label-icon ram-input-label-icon--time" /> Onaylanan Saat
                      </label>
                      <input
                        type="time"
                        value={confirmedTime}
                        onChange={(e) => setConfirmedTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              className={`reject-confirmation ${
                isApprove
                  ? changeDateTime
                    ? "reject-confirmation--reschedule"
                    : "reject-confirmation--approve"
                  : "reject-confirmation--reject"
              }`}
            >
              <div className="ram-confirm-icon" aria-hidden="true">
                {isApprove ? (
                  changeDateTime ? (
                    <FaInfoCircle />
                  ) : (
                    <FaCheckCircle />
                  )
                ) : (
                  <FaExclamationTriangle />
                )}
              </div>
              <p>
                {isApprove
                  ? changeDateTime
                    ? "Randevu belirlediğiniz yeni tarih ve saat ile onaylanacaktır. Devam etmek istiyor musunuz?"
                    : "Bu randevuyu talep edilen saatte onaylamak istediğinizden emin misiniz?"
                  : "Bu randevuyu reddetmek istediğinizden emin misiniz?"}
              </p>
            </div>
          </div>

          <div className="reject-modal-footer">
            <button type="button" className="reject-cancel-btn" onClick={handleClose} disabled={isProcessing}>
              İptal
            </button>
            <button
              type="button"
              className={`reject-confirm-btn ${isApprove ? "approve-btn" : ""}`}
              onClick={handleAction}
              disabled={isProcessing}
            >
              {isApprove ? <FaCheckCircle className="ram-btn-icon" /> : <FaExclamationTriangle className="ram-btn-icon" />}
              <span>
                {isProcessing
                  ? isApprove
                    ? "Onaylanıyor..."
                    : "Reddediliyor..."
                  : isApprove
                    ? "Randevuyu Onayla"
                    : "Randevuyu Reddet"}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);

RejectAppointmentModal.displayName = "RejectAppointmentModal";

export default RejectAppointmentModal;
