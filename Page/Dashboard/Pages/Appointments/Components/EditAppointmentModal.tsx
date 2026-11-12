"use client";

import React, { memo, useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  FaTimes,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
  FaMoneyBillWave,
  FaInfoCircle,
} from "react-icons/fa";
import toast from "react-hot-toast";
import { rescheduleAppointment, getAvailableTimeSlots } from "@/services/appointment/appointmentService";
import type { ProviderAppointmentRecord } from "@/services/appointment/appointmentService";
import "./EditAppointmentModal.css";

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: ProviderAppointmentRecord;
  onUpdate: (updated: ProviderAppointmentRecord) => void;
  isReadOnly?: boolean;
}

const EditAppointmentModal = memo(
  ({ isOpen, onClose, appointment, onUpdate, isReadOnly = false }: EditAppointmentModalProps) => {
    const [newDate, setNewDate] = useState(appointment?.date || "");
    const [newTime, setNewTime] = useState(appointment?.time || "");
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const serviceId = appointment?.serviceId || (appointment as { service_id?: string | number })?.service_id;

    useEffect(() => {
      if (isOpen && appointment) {
        setNewDate(appointment.date || "");
        setNewTime(appointment.time || "");
        setIsSubmitting(false);
      }
    }, [isOpen, appointment?.id, appointment?.date, appointment?.time]);

    // Seçilen tarihe göre sağlayıcının müsait saatlerini çek
    useEffect(() => {
      if (!isOpen || !newDate) {
        setAvailableSlots([]);
        return;
      }

      if (!serviceId) {
        const fallback = Array.from({ length: 19 }, (_, i) => {
          const hour = Math.floor(i / 2) + 9;
          const minute = i % 2 === 0 ? "00" : "30";
          return `${hour.toString().padStart(2, "0")}:${minute}`;
        });
        setAvailableSlots(fallback);
        return;
      }

      let isMounted = true;
      setLoadingSlots(true);

      getAvailableTimeSlots(serviceId, newDate)
        .then((slots) => {
          if (!isMounted) return;
          const slotList = slots || [];
          setAvailableSlots(slotList);
          setNewTime((prev) => (slotList.includes(prev) ? prev : slotList[0] || ""));
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Müsait saatler yüklenirken hata:", err);
          setAvailableSlots([]);
          setNewTime("");
        })
        .finally(() => {
          if (isMounted) setLoadingSlots(false);
        });

      return () => {
        isMounted = false;
      };
    }, [isOpen, newDate, serviceId]);

    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
          if (newDate !== appointment.date || newTime !== appointment.time) {
            await rescheduleAppointment(appointment.id, {
              newDate,
              newTime,
              reason: "Randevu tarihi ve saati değişikliği talep edildi",
              notes: "Modal üzerinden yeni tarih seçimi",
            });
            toast.success(
              "Tarih değişikliği talebiniz iletildi. Karşı taraf onaylayana kadar randevunuz mevcut saatinde kalacaktır.",
              { duration: 4500 }
            );
            onUpdate({
              ...appointment,
              status: appointment.status === "confirmed" ? "reschedule_requested" : appointment.status,
              suggestedDate: newDate,
              suggestedTime: newTime,
            });
          }
          onClose();
        } catch (error) {
          console.error("Randevu güncellenirken hata:", error);
          const message = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
          toast.error(`Randevu güncellenirken bir hata oluştu: ${message}`);
        } finally {
          setIsSubmitting(false);
        }
      },
      [appointment, newDate, newTime, onUpdate, onClose]
    );

    const handleBackdropClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLDivElement).className === "ed-modal-backdrop") onClose();
      },
      [onClose]
    );

    if (!isOpen) return null;

    const getStatusMessage = () => {
      switch (appointment?.status) {
        case "confirmed":
          return "Bu randevu onaylanmıştır. Kabul edilen son değerler:";
        case "rejected":
          return "Bu randevu reddedilmiştir. Teklif edilen değerler:";
        default:
          return "Randevu detaylarını güncelleyebilirsiniz.";
      }
    };

    const getStatusBadge = (s: string) => {
      switch (s) {
        case "confirmed":
          return "Onaylandı";
        case "pending":
          return "Onay Bekliyor";
        case "reschedule_requested":
          return "Tarih Değişikliği Bekliyor";
        case "completed":
          return "Tamamlandı";
        case "rejected":
        case "cancelled":
          return "Reddedildi / İptal";
        default:
          return s;
      }
    };

    const serviceTitle = appointment?.service?.title || appointment?.title || "Hizmet";
    const serviceImage =
      appointment?.service?.image?.trim() || (appointment as { image?: string })?.image?.trim() || "";
    const serviceDescription =
      appointment?.service?.description?.trim() || (appointment as { packageName?: string })?.packageName || "";
    const formattedDate = appointment.date
      ? format(new Date(appointment.date), "dd MMMM yyyy", { locale: tr })
      : "—";

    return (
      <div className="ed-modal-backdrop" onClick={handleBackdropClick} role="presentation">
        <div className="ed-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="ed-close" onClick={onClose} aria-label="Kapat">
            <FaTimes />
          </button>

          <div className="ed-sidebar">
            <div className="ed-preview">
              <img
                src={serviceImage || "https://via.placeholder.com/400x200"}
                alt={serviceTitle}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x200";
                }}
              />
              <div className="ed-status" data-status={appointment.status}>
                {getStatusBadge(appointment.status)}
              </div>
            </div>

            <div className="ed-info">
              <div className="ed-mobile-meta-row">
                <span className="ed-status ed-status--inline" data-status={appointment.status}>
                  {getStatusBadge(appointment.status)}
                </span>
                <div className="ed-price">
                  <FaMoneyBillWave />
                  <span>{appointment.price} ₺</span>
                </div>
              </div>

              <h3>{serviceTitle}</h3>

              {serviceDescription && (
                <div className="ed-desc">
                  <h4>
                    <FaInfoCircle /> Hizmet Detayı
                  </h4>
                  <p>{serviceDescription}</p>
                </div>
              )}

              <div className="ed-details">
                <div className="ed-detail">
                  <FaCalendarAlt />
                  <span>{formattedDate}</span>
                </div>
                <div className="ed-detail">
                  <FaClock />
                  <span>{appointment.time || "—"}</span>
                </div>
                {appointment.location && (
                  <div className="ed-detail">
                    <FaMapMarkerAlt />
                    <span>{appointment.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="ed-main">
            <div className="ed-content">
              <div className="ed-header">
                <span className="ed-header-eyebrow">
                  <FaCalendarAlt /> {isReadOnly ? "RANDEVU ÖZETİ" : "TARİH & SAAT PLANLAMA"}
                </span>
                <h2>Randevu {isReadOnly ? "Detayları" : "Tarih Düzenleme"}</h2>
                <p>
                  {isReadOnly
                    ? getStatusMessage()
                    : "Randevu tarih ve saatini değiştirebilirsiniz. Değişiklik yapıldığında karşı tarafa onay bildirimi gönderilecektir."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="ed-form">
                <div className="ed-section">
                  <h3>
                    <FaCalendarAlt />
                    Randevu Zamanı
                  </h3>
                  <div className="ed-datetime">
                    {isReadOnly ? (
                      <div className="ed-readonly">
                        <div className="ed-info-item">
                          <label>Tarih</label>
                          <span>{formattedDate}</span>
                        </div>
                        <div className="ed-info-item">
                          <label>Saat</label>
                          <span>{appointment.time}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="ed-group">
                          <label htmlFor="ed-appt-date">Tarih</label>
                          <input
                            id="ed-appt-date"
                            type="date"
                            value={newDate}
                            onChange={(ev) => setNewDate(ev.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                          />
                        </div>
                        <div className="ed-group">
                          <label htmlFor="ed-appt-time">Saat</label>
                          {loadingSlots ? (
                            <div className="ed-slots-status ed-slots-status--loading">
                              Müsait saatler yükleniyor...
                            </div>
                          ) : availableSlots.length === 0 && newDate ? (
                            <div className="ed-slots-status ed-slots-status--empty">
                              Bu tarihte hizmet sağlayıcının müsait saati bulunmamaktadır.
                            </div>
                          ) : (
                            <select
                              id="ed-appt-time"
                              value={newTime}
                              onChange={(ev) => setNewTime(ev.target.value)}
                              disabled={availableSlots.length === 0}
                            >
                              <option value="">Saat seçiniz</option>
                              {availableSlots.map((timeValue) => (
                                <option key={timeValue} value={timeValue}>
                                  {timeValue}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="ed-section">
                  <h3>
                    <FaUser />
                    {appointment.client ? "Müşteri Bilgileri" : "Hizmet Veren Bilgileri"}
                  </h3>
                  <div className="ed-client-grid">
                    <div className="ed-client-card">
                      <FaUser className="ed-icon" />
                      <div className="ed-client-content">
                        <label>İsim</label>
                        <span>
                          {appointment.client?.name ||
                            (appointment as { providerName?: string })?.providerName ||
                            "—"}
                        </span>
                      </div>
                    </div>
                    {appointment.client?.phone && (
                      <div className="ed-client-card">
                        <FaPhone className="ed-icon" />
                        <div className="ed-client-content">
                          <label>Telefon</label>
                          <span>{appointment.client.phone}</span>
                        </div>
                      </div>
                    )}
                    {appointment.client?.email && (
                      <div className="ed-client-card">
                        <FaEnvelope className="ed-icon" />
                        <div className="ed-client-content">
                          <label>E-posta</label>
                          <span>{appointment.client.email}</span>
                        </div>
                      </div>
                    )}
                    <div className="ed-client-card">
                      <FaMapMarkerAlt className="ed-icon" />
                      <div className="ed-client-content">
                        <label>Adres</label>
                        <span>{appointment.location || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ed-actions">
                  <button type="button" className="ed-btn ed-btn-cancel" onClick={onClose}>
                    Kapat
                  </button>
                  {!isReadOnly && (
                    <button
                      type="submit"
                      className="ed-btn ed-btn-save"
                      disabled={
                        isSubmitting ||
                        !newDate ||
                        !newTime ||
                        (availableSlots.length === 0 && Boolean(serviceId))
                      }
                    >
                      {isSubmitting ? "Güncelleniyor..." : "Tarihi Güncelle"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

EditAppointmentModal.displayName = "EditAppointmentModal";

export default EditAppointmentModal;
