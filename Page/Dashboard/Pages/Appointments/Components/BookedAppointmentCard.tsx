"use client";

import React, { memo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  FaMapMarkerAlt,
  FaClock,
  FaUserTie,
  FaExternalLinkAlt,
  FaBan,
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle,
  FaCalendarAlt,
  FaTools,
  FaCheck,
  FaExclamationTriangle,
  FaSpinner,
  FaStar,
} from "react-icons/fa";
import {
  type BookedAppointmentRecord,
  confirmArrival,
  confirmCompletion,
  respondToReschedule,
} from "@/services/appointment/appointmentService";
import toast from "react-hot-toast";
import "./BookedAppointmentCard.css";

interface BookedAppointmentCardProps {
  appointment: BookedAppointmentRecord;
  onCancelRequest: (appointment: BookedAppointmentRecord) => void;
  onRescheduleRequest?: (appointment: BookedAppointmentRecord) => void;
  onAppointmentUpdate?: (
    appointmentId: number | string,
    newStatus: string,
    updatedData?: Partial<BookedAppointmentRecord>
  ) => void;
  onDisputeRequest?: (appointment: BookedAppointmentRecord) => void;
  onRateRequest?: (appointment: BookedAppointmentRecord) => void;
}

const BookedAppointmentCard: React.FC<BookedAppointmentCardProps> = memo(
  ({ appointment, onCancelRequest, onRescheduleRequest, onAppointmentUpdate, onDisputeRequest, onRateRequest }) => {
    const {
      id,
      serviceId,
      providerName,
      title,
      image,
      location,
      date,
      time,
      status,
      price,
      packageName,
      notes,
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

    const formattedDate = date
      ? (() => {
          try {
            return format(new Date(date), "dd MMMM yyyy, EEEE", { locale: tr });
          } catch {
            return date;
          }
        })()
      : "Tarih Belirtilmedi";

    const getStatusBadge = () => {
      switch (status) {
        case "reschedule_requested":
          return (
            <span className="bac-status-badge bac-status-pending" style={{ backgroundColor: "#fef3c7", color: "#b45309", borderColor: "#fcd34d" }}>
              <FaHourglassHalf className="bac-badge-icon" /> Saat Onayı Bekleniyor
            </span>
          );
        case "confirmed":
          return (
            <span className="bac-status-badge bac-status-confirmed">
              <FaCheckCircle className="bac-badge-icon" /> Onaylandı
            </span>
          );
        case "in_progress":
          return (
            <span className="bac-status-badge bac-status-inprogress">
              <FaTools className="bac-badge-icon" /> Hizmet Sürüyor
            </span>
          );
        case "pending":
          return (
            <span className="bac-status-badge bac-status-pending">
              <FaHourglassHalf className="bac-badge-icon" /> Onay Bekliyor
            </span>
          );
        case "cancelled":
          return (
            <span className="bac-status-badge bac-status-cancelled">
              <FaTimesCircle className="bac-badge-icon" /> İptal Edildi
            </span>
          );
        case "rejected":
          return (
            <span className="bac-status-badge bac-status-rejected">
              <FaTimesCircle className="bac-badge-icon" /> Reddedildi
            </span>
          );
        case "completed":
          return (
            <span className="bac-status-badge bac-status-completed">
              <FaCheckCircle className="bac-badge-icon" /> Tamamlandı
            </span>
          );
        case "disputed":
          return (
            <span className="bac-status-badge bac-status-disputed">
              <FaExclamationTriangle className="bac-badge-icon" /> İtiraz Edildi
            </span>
          );
        default:
          return (
            <span className="bac-status-badge bac-status-neutral">
              {status}
            </span>
          );
      }
    };

    // Usta geldi onayı
    const handleConfirmArrival = async () => {
      try {
        setActionLoading(true);
        await confirmArrival(id);
        toast.success("Ustanın adrese gelişi onaylandı, işlem başladı.");
        if (onAppointmentUpdate) {
          onAppointmentUpdate(id, "in_progress", {
            status: "in_progress",
            arrivalConfirmedAt: new Date().toISOString(),
          });
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Onay verilemedi.");
      } finally {
        setActionLoading(false);
      }
    };

    // Hizmet tamamlandı onayı
    const handleConfirmCompletion = async () => {
      try {
        setActionLoading(true);
        await confirmCompletion(id);
        toast.success("Hizmet tamamlanması onaylandı. Teşekkür ederiz!");
        if (onAppointmentUpdate) {
          onAppointmentUpdate(id, "completed", {
            status: "completed",
            completedAt: new Date().toISOString(),
          });
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Tamamlama onaylanamadı.");
      } finally {
        setActionLoading(false);
      }
    };

    // Tarih değişikliği onayı (Kabul et)
    const handleApproveReschedule = async () => {
      try {
        setActionLoading(true);
        await respondToReschedule(id, true);
        toast.success("Yeni randevu tarihi ve saati onaylandı.");
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

    // Tarih değişikliğini reddet (Eski saatte kalsın)
    const handleRejectReschedule = async () => {
      try {
        setActionLoading(true);
        await respondToReschedule(id, false);
        toast.success("Tarih değişikliği teklifi reddedildi, eski randevu saatiniz geçerlidir.");
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

    // İptal edilebilir mi? Sadece beklemedeyken veya onaylı olup henüz usta gelmemişken
    const canCancel =
      status === "pending" ||
      (status === "confirmed" && !arrivedAt);

    // Tarih değiştirilebilir mi? Henüz usta adrese gelmemiş ve hizmet tamamlanmamışsa
    const canReschedule =
      (status === "pending" || status === "confirmed") && !arrivedAt;

    return (
      <article className={`bac-card bac-card--${status}`}>
        {/* Görsel ve Durum Rozeti */}
        <div className="bac-media">
          {!imageLoaded && <div className="bac-image-placeholder" />}
          <img
            src={image || "/placeholder-service.jpg"}
            alt={title}
            className={`bac-image ${imageLoaded ? "is-loaded" : ""}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'><rect width='300' height='200' fill='%23003466'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-size='15' font-weight='bold'>Acillazım Randevu</text></svg>";
              setImageLoaded(true);
            }}
          />
          <div className="bac-badge-overlay">{getStatusBadge()}</div>
        </div>

        {/* Gövde Bilgileri */}
        <div className="bac-body">
          <div className="bac-header-row">
            <h3 className="bac-title" title={title}>
              {title}
            </h3>
          </div>

          {/* Hizmet Sağlayıcı / Usta */}
          <div className="bac-provider-pill">
            <span className="bac-provider-avatar">
              <FaUserTie />
            </span>
            <div className="bac-provider-meta">
              <span className="bac-provider-label">Hizmet Sağlayıcı</span>
              <span className="bac-provider-name">{providerName || "Usta / İşletme"}</span>
            </div>
          </div>

          {/* Randevu Ayrıntıları */}
          <div className="bac-details-grid">
            <div className="bac-detail-item">
              <FaCalendarAlt className="bac-detail-icon text-primary" />
              <div className="bac-detail-content">
                <span className="bac-detail-label">Tarih</span>
                <span className="bac-detail-val">{formattedDate}</span>
              </div>
            </div>

            <div className="bac-detail-item">
              <FaClock className="bac-detail-icon text-orange" />
              <div className="bac-detail-content">
                <span className="bac-detail-label">Saat</span>
                <span className="bac-detail-val">{time || "—"}</span>
              </div>
            </div>

            {location && (
              <div className="bac-detail-item bac-detail-item--full">
                <FaMapMarkerAlt className="bac-detail-icon text-muted" />
                <div className="bac-detail-content">
                  <span className="bac-detail-label">Konum / Hizmet Yeri</span>
                  <span className="bac-detail-val">{location}</span>
                </div>
              </div>
            )}
          </div>

          {/* Paket veya Not varsa */}
          {(packageName || notes) && (
            <div className="bac-notes-strip">
              {packageName && (
                <span className="bac-package-badge">Paket: {packageName}</span>
              )}
              {notes && <p className="bac-notes-text">Not: {notes}</p>}
            </div>
          )}

          {/* ── İKİ TARAFLI TARİH / SAAT DEĞİŞİKLİĞİ BİLDİRİMİ VE ONAY ALANI ── */}
          {status === "reschedule_requested" && (
            <div className="bac-action-card bac-action-card--arrival" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
              <div className="bac-action-card__header">
                <FaCalendarAlt className="text-orange" />
                <strong style={{ color: "#92400e" }}>Tarih / Saat Değişikliği Bildirimi</strong>
              </div>
              <p className="bac-action-card__text" style={{ color: "#78350f" }}>
                Önerilen Yeni Zaman: <strong>{suggestedDate} {suggestedTime}</strong>
                {rescheduleReason && <span> (Gerekçe: &ldquo;{rescheduleReason}&rdquo;)</span>}
              </p>
              <p className="bac-action-card__text" style={{ fontSize: 13, color: "#92400e", marginBottom: 10 }}>
                Hizmet sağlayıcı yeni bir randevu zamanı önerdi. Kabul ederseniz randevunuz yeni saate alınır; reddederseniz mevcut saatinde ({formattedDate} - {time}) kalacaktır.
              </p>
              <div className="bac-action-card__buttons">
                <button
                  type="button"
                  className="bac-action-btn bac-action-btn--complete"
                  disabled={actionLoading}
                  onClick={handleApproveReschedule}
                >
                  {actionLoading ? <FaSpinner className="bac-spinner" /> : <FaCheck />}
                  <span>Yeni Saati Onayla</span>
                </button>
                <button
                  type="button"
                  className="bac-action-btn bac-action-btn--dispute"
                  disabled={actionLoading}
                  onClick={handleRejectReschedule}
                >
                  <FaTimes />
                  <span>Reddet (Eski Saatte Kalsın)</span>
                </button>
              </div>
            </div>
          )}

          {/* ── İKİ TARAFLI HANDSHAKE (USTA GELDİ / TAMAMLADI) BİLGİLENDİRME VE ONAY ALANLARI ── */}
          {arrivedAt && !arrivalConfirmedAt && status !== "completed" && status !== "cancelled" && status !== "rejected" && (
            <div className="bac-action-card bac-action-card--arrival">
              <div className="bac-action-card__header">
                <FaMapMarkerAlt className="text-orange" />
                <strong>Usta Adrese Geldiğini Bildirdi</strong>
              </div>
              <p className="bac-action-card__text">
                Usta adresinize ulaştı. Hizmetin başladığını onaylamak için lütfen butona tıklayın.
              </p>
              <button
                type="button"
                className="bac-action-btn bac-action-btn--arrival"
                disabled={actionLoading}
                onClick={handleConfirmArrival}
              >
                {actionLoading ? <FaSpinner className="bac-spinner" /> : <FaCheck />}
                <span>Ustanın Geldiğini Onayla</span>
              </button>
            </div>
          )}

          {completionRequestedAt && status !== "completed" && status !== "cancelled" && status !== "rejected" && status !== "disputed" && (
            <div className="bac-action-card bac-action-card--completion">
              <div className="bac-action-card__header">
                <FaCheckCircle className="text-success" />
                <strong>Usta Hizmeti Tamamladığını Bildirdi</strong>
              </div>
              <p className="bac-action-card__text">
                Lütfen yapılan işi kontrol edin. Hizmeti onaylayabilir veya sorun varsa itiraz edebilirsiniz (48 saat içinde onaylanmazsa sistem otomatik tamamlayacaktır).
              </p>
              <div className="bac-action-card__buttons">
                <button
                  type="button"
                  className="bac-action-btn bac-action-btn--complete"
                  disabled={actionLoading}
                  onClick={handleConfirmCompletion}
                >
                  {actionLoading ? <FaSpinner className="bac-spinner" /> : <FaCheckCircle />}
                  <span>Hizmeti Onayla</span>
                </button>
                <button
                  type="button"
                  className="bac-action-btn bac-action-btn--dispute"
                  disabled={actionLoading}
                  onClick={() => onDisputeRequest && onDisputeRequest(appointment)}
                >
                  <FaExclamationTriangle />
                  <span>İtiraz Et</span>
                </button>
              </div>
            </div>
          )}

          {status === "disputed" && (
            <div className="bac-action-card bac-action-card--disputed">
              <div className="bac-action-card__header">
                <FaExclamationTriangle style={{ color: "#ef4444" }} />
                <strong style={{ color: "#b91c1c" }}>Hizmete İtiraz Edildi</strong>
              </div>
              <p className="bac-action-card__text">
                İtiraz gerekçeniz: &ldquo;{disputeReason || "Belirtilmedi"}&rdquo;.
                Konu incelemeye alınmıştır. Destek ekibimiz gerekirse sizinle iletişime geçecektir.
              </p>
            </div>
          )}

          {/* Alt Kısım: Ücret & Aksiyonlar */}
          <div className="bac-footer">
            <div className="bac-price-box">
              <span className="bac-price-label">Randevu Bedeli</span>
              <span className="bac-price-val">
                {price != null && !Number.isNaN(price) ? `${price.toLocaleString("tr-TR")} ₺` : "Belirtilmedi"}
              </span>
            </div>

            <div className="bac-actions">
              {status === "completed" && serviceId && onRateRequest && (
                <button
                  type="button"
                  className="bac-btn bac-btn--rate"
                  onClick={() => onRateRequest(appointment)}
                  title="Hizmeti Değerlendir ve Yorum Yap"
                >
                  <FaStar />
                  <span>Değerlendir</span>
                </button>
              )}

              {serviceId && (
                <Link
                  href={`/ilan/${serviceId}`}
                  target="_blank"
                  className="bac-btn bac-btn--view"
                  title="Hizmet İlanını Gör"
                >
                  <FaExternalLinkAlt />
                  <span>İlanı İncele</span>
                </Link>
              )}

              {canReschedule && onRescheduleRequest && (
                <button
                  type="button"
                  className="bac-btn bac-btn--view"
                  onClick={() => onRescheduleRequest(appointment)}
                  title="Randevu Tarih veya Saatini Değiştir"
                >
                  <FaCalendarAlt />
                  <span>Tarih Değiştir</span>
                </button>
              )}

              {canCancel && (
                <button
                  type="button"
                  className="bac-btn bac-btn--cancel"
                  onClick={() => onCancelRequest(appointment)}
                  title="Randevuyu İptal Et"
                >
                  <FaBan />
                  <span>İptal Et</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }
);

BookedAppointmentCard.displayName = "BookedAppointmentCard";

export default BookedAppointmentCard;
