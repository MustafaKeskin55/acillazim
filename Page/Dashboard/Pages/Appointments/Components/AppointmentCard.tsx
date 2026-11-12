"use client";

import React, { memo, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  FaMapMarkerAlt,
  FaClock,
  FaPen,
  FaCheck,
  FaTimes,
  FaCheckCircle,
  FaHourglassHalf,
  FaEye,
  FaTools,
  FaExclamationTriangle,
  FaSpinner,
} from "react-icons/fa";
import {
  type ProviderAppointmentRecord,
  notifyArrival,
  requestCompletion,
  respondToReschedule,
} from "@/services/appointment/appointmentService";
import toast from "react-hot-toast";
import "./AppointmentCard.css";

export type AppointmentCardAppointment = ProviderAppointmentRecord;

interface AppointmentCardProps {
  appointment: AppointmentCardAppointment;
  onEdit: (appointment: AppointmentCardAppointment, readOnly?: boolean) => void;
  onOpenActionModal: (appointment: AppointmentCardAppointment, action: string) => void;
  onAppointmentUpdate?: (
    appointmentId: string | number,
    newStatus: string,
    updatedData?: Partial<AppointmentCardAppointment>
  ) => void;
}

const AppointmentCard = memo(
  ({ appointment, onEdit, onOpenActionModal, onAppointmentUpdate }: AppointmentCardProps) => {
    const {
      id,
      title,
      date,
      time,
      location,
      price,
      status,
      arrivedAt,
      arrivalConfirmedAt,
      completionRequestedAt,
      disputeReason,
      suggestedDate,
      suggestedTime,
      rescheduledBy,
      rescheduleReason,
    } = appointment;

    const [imageLoaded, setImageLoaded] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const getStatusBadge = () => {
      switch (status) {
        case "reschedule_requested":
          return (
            <div className="appt-status-badge pending" style={{ backgroundColor: "#fef3c7", color: "#b45309", borderColor: "#fcd34d" }}>
              <FaHourglassHalf /> Saat Değişikliği Bekleniyor
            </div>
          );
        case "confirmed":
          return (
            <div className="appt-status-badge confirmed">
              <FaCheckCircle /> Onaylandı
            </div>
          );
        case "in_progress":
          return (
            <div className="appt-status-badge in_progress">
              <FaTools /> Hizmet Sürüyor
            </div>
          );
        case "pending":
          return (
            <div className="appt-status-badge pending">
              <FaHourglassHalf /> Onay Bekliyor
            </div>
          );
        case "rejected":
          return (
            <div className="appt-status-badge rejected">
              <FaTimes /> Reddedildi
            </div>
          );
        case "completed":
          return (
            <div className="appt-status-badge completed">
              <FaCheckCircle /> Tamamlandı
            </div>
          );
        case "disputed":
          return (
            <div className="appt-status-badge disputed">
              <FaExclamationTriangle /> İtiraz Edildi
            </div>
          );
        default:
          return null;
      }
    };

    // "Adrese Geldim" işlemi
    const handleNotifyArrival = async () => {
      try {
        setActionLoading(true);
        await notifyArrival(id);
        toast.success("Müşteriye adrese geldiğiniz bildirildi. Müşteri onayı bekleniyor.");
        if (onAppointmentUpdate) {
          onAppointmentUpdate(id, status, {
            arrivedAt: new Date().toISOString(),
          });
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Bildirim iletilemedi.");
      } finally {
        setActionLoading(false);
      }
    };

    // "Hizmeti Tamamladım" işlemi
    const handleRequestCompletion = async () => {
      try {
        setActionLoading(true);
        await requestCompletion(id);
        toast.success("Müşteriye hizmet tamamlama talebi iletildi (48 saatlik otomatik onay devrede).");
        if (onAppointmentUpdate) {
          onAppointmentUpdate(id, status, {
            completionRequestedAt: new Date().toISOString(),
          });
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Tamamlama talebi iletilemedi.");
      } finally {
        setActionLoading(false);
      }
    };

    const handleActionClick = () => {
      if (status === "pending") {
        onEdit(appointment);
      } else {
        onEdit(appointment, true);
      }
    };

    const handleApproveClick = () => {
      onOpenActionModal(appointment, "approve");
    };

    const handleRejectClick = () => {
      onOpenActionModal(appointment, "reject");
    };

    const handleApproveReschedule = async () => {
      try {
        setActionLoading(true);
        await respondToReschedule(id, true);
        toast.success("Yeni tarih ve saat onaylandı");
        if (onAppointmentUpdate) {
          onAppointmentUpdate(id, "confirmed", {
            status: "confirmed",
            date: suggestedDate || date,
            time: suggestedTime || time,
            suggestedDate: undefined,
            suggestedTime: undefined,
          });
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Onay verilemedi.");
      } finally {
        setActionLoading(false);
      }
    };

    const handleRejectReschedule = async () => {
      try {
        setActionLoading(true);
        await respondToReschedule(id, false);
        toast.success("Tarih değişikliği reddedildi, eski saat korundu");
        if (onAppointmentUpdate) {
          onAppointmentUpdate(id, "confirmed", {
            status: "confirmed",
            suggestedDate: undefined,
            suggestedTime: undefined,
          });
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "İşlem yapılamadı.");
      } finally {
        setActionLoading(false);
      }
    };

    const renderActionButtons = () => {
      switch (status) {
        case "pending":
          return (
            <>
              <button
                type="button"
                className="appt-action-btn edit"
                onClick={handleActionClick}
                title="Düzenle"
              >
                <FaPen />
              </button>
              <button
                type="button"
                className="appt-action-btn confirm"
                onClick={handleApproveClick}
                title="Onayla"
              >
                <FaCheck />
              </button>
              <button
                type="button"
                className="appt-action-btn delete"
                onClick={handleRejectClick}
                title="Reddet"
              >
                <FaTimes />
              </button>
            </>
          );
        case "confirmed":
        case "in_progress":
        case "completed":
        case "disputed":
        case "rejected":
          return (
            <button
              type="button"
              className="appt-action-btn view"
              onClick={handleActionClick}
              title="Detayları İncele"
            >
              <FaEye style={{ marginRight: 6 }} />
              <span>Detayları İncele</span>
            </button>
          );
        default:
          return null;
      }
    };

    const imageSrc = appointment.service?.image?.trim() || "";

    return (
      <div className={`appt-service-card ${status}`}>
        <div className="appt-service-img-container">
          {!imageLoaded && <div className="image-placeholder" />}
          <img
            src={imageSrc || "https://via.placeholder.com/300x200"}
            alt={title}
            className={`appt-service-image ${imageLoaded ? "loaded" : ""}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x200";
              setImageLoaded(true);
            }}
          />
        </div>

        {getStatusBadge()}

        <div className="appt-service-content">
          <h3 className="appt-service-title">{title}</h3>

          <div className="appt-service-info">
            <div className="appt-info-row">
              <FaMapMarkerAlt className="appt-info-icon" />
              <span>{location}</span>
            </div>
            <div className="appt-info-row">
              <FaClock className="appt-info-icon" />
              <span>
                {date ? format(new Date(date), "dd MMMM yyyy", { locale: tr }) : "—"} - {time}
              </span>
            </div>
          </div>

          {/* ── İKİ TARAFLI SAAT DEĞİŞİKLİĞİ ONAY BİLDİRİMİ (USTA GÖRÜNÜMÜ) ── */}
          {status === "reschedule_requested" && (
            <div className="appt-workflow-banner appt-workflow-banner--arrived" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
              <div className="appt-workflow-title" style={{ color: "#92400e" }}>
                <FaCalendarAlt />
                <span>Saat Değişikliği Talebi</span>
              </div>
              <p style={{ margin: "0 0 8px 0", color: "#78350f" }}>
                Önerilen Zaman: <strong>{suggestedDate} {suggestedTime}</strong>
                {rescheduleReason && <span> (Gerekçe: &ldquo;{rescheduleReason}&rdquo;)</span>}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="appt-workflow-btn appt-workflow-btn--arrive"
                  style={{ background: "#10b981", margin: 0, padding: "6px 12px", fontSize: 13 }}
                  disabled={actionLoading}
                  onClick={handleApproveReschedule}
                >
                  <FaCheck /> Yeni Saati Onayla
                </button>
                <button
                  type="button"
                  className="appt-workflow-btn appt-workflow-btn--arrive"
                  style={{ background: "#ef4444", margin: 0, padding: "6px 12px", fontSize: 13 }}
                  disabled={actionLoading}
                  onClick={handleRejectReschedule}
                >
                  <FaTimes /> Reddet (Eski Saatte Kalsın)
                </button>
              </div>
            </div>
          )}

          {/* ── İKİ TARAFLI USTA İŞ AKIŞI: ADRESE GELDİM / HİZMETİ TAMAMLADIM ── */}
          {status === "confirmed" && !arrivedAt && (
            <button
              type="button"
              className="appt-workflow-btn appt-workflow-btn--arrive"
              disabled={actionLoading}
              onClick={handleNotifyArrival}
            >
              {actionLoading ? <FaSpinner className="bac-spinner" /> : <FaMapMarkerAlt />}
              <span>Adrese Geldim</span>
            </button>
          )}

          {status === "confirmed" && arrivedAt && !arrivalConfirmedAt && !completionRequestedAt && (
            <div className="appt-workflow-banner appt-workflow-banner--arrived">
              <div className="appt-workflow-title">
                <FaHourglassHalf />
                <span>Müşteri Geliş Onayı Bekleniyor</span>
              </div>
              <p style={{ margin: "0 0 8px 0" }}>
                Adrese vardığınız bildirildi. Müşteri ekrandan onayladığında hizmet süreci başlayacaktır.
              </p>
              <button
                type="button"
                className="appt-workflow-btn appt-workflow-btn--complete"
                disabled={actionLoading}
                onClick={handleRequestCompletion}
              >
                {actionLoading ? <FaSpinner className="bac-spinner" /> : <FaCheckCircle />}
                <span>Hizmeti Tamamladım</span>
              </button>
            </div>
          )}

          {status === "in_progress" && !completionRequestedAt && (
            <button
              type="button"
              className="appt-workflow-btn appt-workflow-btn--complete"
              disabled={actionLoading}
              onClick={handleRequestCompletion}
            >
              {actionLoading ? <FaSpinner className="bac-spinner" /> : <FaCheckCircle />}
              <span>Hizmeti Tamamladım</span>
            </button>
          )}

          {(status === "in_progress" || status === "confirmed") && completionRequestedAt && (
            <div className="appt-workflow-banner appt-workflow-banner--completed">
              <div className="appt-workflow-title">
                <FaHourglassHalf />
                <span>Müşteri Tamamlama Onayı Bekleniyor</span>
              </div>
              <p style={{ margin: 0 }}>
                Tamamlama talebiniz iletildi. Müşteri onaylamasa dahi 48 saat sonra sistem otomatik onaylayacaktır.
              </p>
            </div>
          )}

          {status === "disputed" && (
            <div className="appt-workflow-banner appt-workflow-banner--disputed">
              <div className="appt-workflow-title">
                <FaExclamationTriangle />
                <span>Müşteri İtirazı</span>
              </div>
              <p style={{ margin: 0 }}>
                Gerekçe: &ldquo;{disputeReason || "Belirtilmedi"}&rdquo;
              </p>
            </div>
          )}

          <div className="appt-service-price">
            <span>Hizmet Bedeli</span>
            <strong>{price} ₺</strong>
          </div>
        </div>

        <div className="appt-service-actions">{renderActionButtons()}</div>
      </div>
    );
  },
  (prev, next) =>
    prev.appointment.id === next.appointment.id &&
    prev.appointment.status === next.appointment.status &&
    prev.appointment.arrivedAt === next.appointment.arrivedAt &&
    prev.appointment.arrivalConfirmedAt === next.appointment.arrivalConfirmedAt &&
    prev.appointment.completionRequestedAt === next.appointment.completionRequestedAt &&
    prev.appointment.disputeReason === next.appointment.disputeReason
);

AppointmentCard.displayName = "AppointmentCard";

export default AppointmentCard;
