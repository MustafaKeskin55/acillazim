"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FaFileExcel,
  FaCalendarAlt,
  FaClock,
  FaTimesCircle,
  FaCalendarCheck,
  FaRegCalendarAlt,
  FaShieldAlt,
  FaBolt,
  FaArrowRight,
  FaCog,
  FaCheckCircle,
  FaUserCheck,
  FaBriefcase,
  FaCompass,
} from "react-icons/fa";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import * as XLSX from "xlsx";
import AppointmentCard from "../Components/AppointmentCard";
import BookedAppointmentCard from "../Components/BookedAppointmentCard";
import CancelBookingModal from "../Components/CancelBookingModal";
import DisputeAppointmentModal from "../Components/DisputeAppointmentModal";
import RateAppointmentModal from "../Components/RateAppointmentModal";
import EditAppointmentModal from "../Components/EditAppointmentModal";
import RejectAppointmentModal from "../Components/RejectAppointmentModal";
import "./MyAppointments.css";
import {
  getProviderAppointments,
  getMyBookedAppointments,
  cancelAppointment,
  disputeCompletion,
  type ProviderAppointmentRecord,
  type BookedAppointmentRecord,
} from "@/services/appointment/appointmentService";
import reviewService from "@/services/profile/reviewService";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

type ProviderAppointment = ProviderAppointmentRecord;
type BookedAppointment = BookedAppointmentRecord;
type ModeType = "booked" | "provider";

const ITEMS_PER_PAGE = 12;

function resolveUserId(currentUser: unknown): number | null {
  if (currentUser && typeof currentUser === "object") {
    const userObj = currentUser as Record<string, unknown>;
    const raw = userObj.id ?? userObj.user_id ?? userObj.userId;
    if (raw != null && !Number.isNaN(Number(raw))) return Number(raw);
  }

  if (typeof window !== "undefined") {
    const keys = ["user_data", "user_profile", "user", "currentUser"];
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of keys) {
        try {
          const stored = storage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            const parsedId = parsed?.id ?? parsed?.user_id ?? parsed?.userId ?? parsed?.data?.id;
            if (parsedId != null && !Number.isNaN(Number(parsedId))) return Number(parsedId);
          }
        } catch {
          // ignore
        }
      }
    }
  }
  return null;
}

const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "Bekliyor",
    confirmed: "Onaylandı",
    in_progress: "Hizmet Sürüyor",
    rejected: "Reddedildi",
    cancelled: "İptal Edildi",
    completed: "Tamamlandı",
    disputed: "İtiraz Edildi",
    reschedule_requested: "Tarih Değişikliği Bekliyor",
  };
  return statusMap[status] || status;
};

const MyAppointments: React.FC = () => {
  const auth = useAuth() as { currentUser?: unknown } | null;
  const userId = useMemo(() => resolveUserId(auth?.currentUser), [auth?.currentUser]);

  const [activeMode, setActiveMode] = useState<ModeType>("booked");
  const [hasAutoSwitched, setHasAutoSwitched] = useState<boolean>(false);

  // Müşteri olarak aldığım randevular
  const [bookedAppointments, setBookedAppointments] = useState<BookedAppointment[]>([]);
  const [loadingBooked, setLoadingBooked] = useState<boolean>(true);

  // Usta olarak gelen randevular
  const [providerAppointments, setProviderAppointments] = useState<ProviderAppointment[]>([]);
  const [loadingProvider, setLoadingProvider] = useState<boolean>(true);

  // Filtreler & Sayfalama
  const [filter, setFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // İptal, İtiraz & Değerlendirme Modal State (Müşteri için)
  const [cancellingAppointment, setCancellingAppointment] = useState<BookedAppointment | null>(null);
  const [disputingAppointment, setDisputingAppointment] = useState<BookedAppointment | null>(null);
  const [ratingAppointment, setRatingAppointment] = useState<BookedAppointment | null>(null);

  // Usta Aksiyon Modalları (Edit & Reject)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ProviderAppointment | null>(null);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [actionAppointment, setActionAppointment] = useState<ProviderAppointment | null>(null);
  const [modalAction, setModalAction] = useState<string>("reject");

  // Randevuları çek ve canlı senkronize tut (sekme odaklandığında + 10sn periyodik)
  useEffect(() => {
    let isMounted = true;

    const loadData = async (silent = false) => {
      if (!silent) {
        setLoadingProvider(true);
        setLoadingBooked(true);
      }

      const effectiveUserId = userId ?? resolveUserId(null);

      const [pRes, bRes] = await Promise.allSettled([
        getProviderAppointments(),
        effectiveUserId ? getMyBookedAppointments(effectiveUserId) : Promise.resolve([]),
      ]);

      if (!isMounted) return;

      let pList: ProviderAppointment[] = [];
      let bList: BookedAppointment[] = [];

      if (pRes.status === "fulfilled") {
        pList = pRes.value || [];
        setProviderAppointments(pList);
      } else if (!silent) {
        console.warn("Gelen randevular alınamadı:", pRes.reason);
        setProviderAppointments([]);
      }
      if (!silent) setLoadingProvider(false);

      if (bRes.status === "fulfilled") {
        bList = bRes.value || [];
        setBookedAppointments(bList);
      } else if (!silent) {
        console.warn("Aldığım randevular alınamadı:", bRes.reason);
        setBookedAppointments([]);
      }
      if (!silent) setLoadingBooked(false);

      // Akıllı varsayılan mod seçimi:
      // Kullanıcının aldığı randevu varsa veya usta olarak gelen randevusu yoksa 'booked' modunda kalır.
      if (!hasAutoSwitched && effectiveUserId) {
        if (bList.length > 0) {
          setActiveMode("booked");
        } else if (pList.length > 0) {
          setActiveMode("provider");
        }
        setHasAutoSwitched(true);
      }
    };

    loadData(false);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadData(true);
      }
    }, 10000);

    const handleFocus = () => {
      loadData(true);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [userId, hasAutoSwitched]);

  // Sekme değiştiğinde filtre ve sayfayı sıfırla
  const handleModeChange = (mode: ModeType) => {
    setActiveMode(mode);
    setFilter("all");
    setCurrentPage(1);
  };

  // İstatistikler: Aldığım Randevular
  const bookedStats = useMemo(
    () => ({
      total: bookedAppointments.length,
      confirmed: bookedAppointments.filter(
        (a) => a.status === "confirmed" || a.status === "in_progress"
      ).length,
      completed: bookedAppointments.filter((a) => a.status === "completed").length,
      pending: bookedAppointments.filter((a) => a.status === "pending").length,
      cancelled: bookedAppointments.filter(
        (a) => a.status === "cancelled" || a.status === "rejected" || a.status === "disputed"
      ).length,
    }),
    [bookedAppointments]
  );

  // İstatistikler: Gelen Randevular
  const providerStats = useMemo(
    () => ({
      total: providerAppointments.length,
      pending: providerAppointments.filter((a) => a.status === "pending").length,
      confirmed: providerAppointments.filter(
        (a) => a.status === "confirmed" || a.status === "in_progress"
      ).length,
      completed: providerAppointments.filter((a) => a.status === "completed").length,
      rejected: providerAppointments.filter(
        (a) => a.status === "rejected" || a.status === "cancelled" || a.status === "disputed"
      ).length,
    }),
    [providerAppointments]
  );

  // Filtrelenmiş liste: Aldığım
  const filteredBooked = useMemo(() => {
    return bookedAppointments.filter((a) => {
      if (filter === "all") return true;
      if (filter === "confirmed") return a.status === "confirmed" || a.status === "in_progress";
      if (filter === "completed") return a.status === "completed";
      if (filter === "cancelled")
        return a.status === "cancelled" || a.status === "rejected" || a.status === "disputed";
      return a.status === filter;
    });
  }, [bookedAppointments, filter]);

  // Filtrelenmiş liste: Gelen
  const filteredProvider = useMemo(() => {
    return providerAppointments.filter((a) => {
      if (filter === "all") return true;
      if (filter === "confirmed") return a.status === "confirmed" || a.status === "in_progress";
      if (filter === "completed") return a.status === "completed";
      if (filter === "rejected")
        return a.status === "rejected" || a.status === "cancelled" || a.status === "disputed";
      return a.status === filter;
    });
  }, [providerAppointments, filter]);

  // Sayfalanmış listeler
  const totalPagesBooked = useMemo(
    () => Math.ceil(filteredBooked.length / ITEMS_PER_PAGE),
    [filteredBooked]
  );
  const currentBooked = useMemo(
    () => filteredBooked.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredBooked, currentPage]
  );

  const totalPagesProvider = useMemo(
    () => Math.ceil(filteredProvider.length / ITEMS_PER_PAGE),
    [filteredProvider]
  );
  const currentProvider = useMemo(
    () => filteredProvider.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredProvider, currentPage]
  );

  // Müşteri İptal İşlemi
  const handleConfirmCancelBooking = async (appointmentId: number | string, reason: string) => {
    await cancelAppointment(appointmentId, { reason });
    setBookedAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: "cancelled" } : a))
    );
  };

  // Müşteri İtiraz İşlemi
  const handleConfirmDispute = async (appointmentId: number | string, reason: string) => {
    await disputeCompletion(appointmentId, reason);
    setBookedAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? { ...a, status: "disputed", disputeReason: reason }
          : a
      )
    );
  };

  // Müşteri Değerlendirme İşlemi
  const handleConfirmRate = async (rating: number, comment: string) => {
    if (!ratingAppointment || !ratingAppointment.serviceId) {
      throw new Error("Değerlendirilecek hizmet bulunamadı.");
    }
    const res = await reviewService.submitReview({
      listingId: ratingAppointment.serviceId,
      targetUserId: ratingAppointment.providerId,
      rating,
      comment,
    });
    if (!res.success) {
      throw new Error(res.message || "Değerlendirme gönderilemedi.");
    }
    toast.success("Değerlendirmeniz başarıyla yayınlandı!");
  };

  // Usta Modal İşlemleri
  const handleEditAppointment = useCallback((appointment: ProviderAppointment, readOnly = false) => {
    setSelectedAppointment(appointment);
    setIsReadOnly(readOnly);
    setIsModalOpen(true);
  }, []);

  const handleUpdateAppointment = useCallback((updatedAppointment: ProviderAppointment) => {
    setProviderAppointments((prev) =>
      prev.map((a) => (a.id === updatedAppointment.id ? { ...a, ...updatedAppointment } : a))
    );
    setBookedAppointments((prev) =>
      prev.map((a) => (a.id === updatedAppointment.id ? { ...a, ...updatedAppointment } : a))
    );
    setIsModalOpen(false);
  }, []);

  const handleAppointmentUpdate = useCallback(
    (appointmentId: string | number, newStatus: string, updatedData: Partial<ProviderAppointment> | null = null) => {
      setProviderAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus, ...(updatedData || {}) } : a))
      );
    },
    []
  );

  const handleOpenActionModal = useCallback((appointment: ProviderAppointment, action: string) => {
    setActionAppointment(appointment);
    setModalAction(action);
    setIsActionModalOpen(true);
  }, []);

  const handleCloseActionModal = useCallback(() => {
    setIsActionModalOpen(false);
    setActionAppointment(null);
    setModalAction("reject");
  }, []);

  // Excel Dışa Aktarım
  const handleExportExcel = () => {
    if (activeMode === "booked") {
      if (!bookedAppointments.length) return;
      const data = bookedAppointments.map((a) => ({
        Hizmet: a.title,
        "Hizmet Veren": a.providerName,
        Durum: getStatusText(a.status),
        Tarih: a.date,
        Saat: a.time,
        Fiyat: a.price != null ? `${a.price} ₺` : "—",
        Konum: a.location || "—",
        Paket: a.packageName || "—",
        Not: a.notes || "—",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Aldigim_Randevular");
      XLSX.writeFile(wb, `Aldigim_Randevular_${format(new Date(), "dd_MM_yyyy")}.xlsx`);
    } else {
      if (!providerAppointments.length) return;
      const data = providerAppointments.map((a) => ({
        Hizmet: a.service?.title || a.title,
        Durum: getStatusText(a.status),
        Tarih: a.date ? format(new Date(a.date), "dd MMMM yyyy", { locale: tr }) : "—",
        Saat: a.time,
        Fiyat: `${a.price} ₺`,
        "Müşteri Adı": a.client.name,
        Telefon: a.client.phone,
        "E-posta": a.client.email,
        Konum: a.location,
        Not: a.notes || "—",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Gelen_Randevular");
      XLSX.writeFile(wb, `Gelen_Randevular_${format(new Date(), "dd_MM_yyyy")}.xlsx`);
    }
  };

  const isCurrentLoading = activeMode === "booked" ? loadingBooked : loadingProvider;

  return (
    <div className="my-appointments">
      {/* ── ÜST BAŞLIK & HIZLI EYLEMLER ── */}
      <div className="my-appointments__header-wrap">
        <div className="my-appointments__header">
          <div className="my-appointments__badge">
            <span className="my-appointments__badge-dot" />
            <span>Randevu &amp; Takvim Yönetimi</span>
          </div>
          <h1>Randevularım</h1>
          <p>
            {activeMode === "booked"
              ? "Hizmet veren ustalardan aldığınız randevular, onay durumları ve takvim özetiniz"
              : "Müşterilerinizden gelen randevu talepleri, durumlar ve usta takvim özetiniz"}
          </p>
        </div>

        <div className="my-appointments__actions">
          {activeMode === "provider" && (
            <Link href="/dashboard/randevular/musait-saatler" className="ma-action-btn ma-action-btn--secondary">
              <FaCog className="ma-action-icon" />
              <span>Müsait Saatleri Yönet</span>
            </Link>
          )}

          {((activeMode === "booked" && bookedAppointments.length > 0) ||
            (activeMode === "provider" && providerAppointments.length > 0)) && (
              <button type="button" className="ma-action-btn ma-action-btn--excel" onClick={handleExportExcel}>
                <FaFileExcel className="ma-action-icon" />
                <span>Excel&apos;e Aktar</span>
              </button>
            )}
        </div>
      </div>

      {/* ── MOD SEÇİCİ SEKMELER: ALDIĞIM RANDEVULAR vs. GELEN TALEPLER ── */}
      <div className="ma-mode-switcher-wrap">
        <div className="ma-mode-switcher" role="tablist" aria-label="Randevu modu seçimi">
          <button
            type="button"
            className={`ma-mode-tab ${activeMode === "booked" ? "active" : ""}`}
            onClick={() => handleModeChange("booked")}
            role="tab"
            aria-selected={activeMode === "booked"}
          >
            <FaUserCheck className="ma-mode-tab-icon" />
            <span>Aldığım Randevular (Hizmet Alan)</span>
            {bookedAppointments.length > 0 && (
              <span className="ma-mode-tab-count">{bookedAppointments.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`ma-mode-tab ${activeMode === "provider" ? "active" : ""}`}
            onClick={() => handleModeChange("provider")}
            role="tab"
            aria-selected={activeMode === "provider"}
          >
            <FaBriefcase className="ma-mode-tab-icon" />
            <span>Gelen Talepler (Hizmet Veren)</span>
            {providerAppointments.length > 0 && (
              <span className="ma-mode-tab-count">{providerAppointments.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── 3'LÜ İSTATİSTİK KARTLARI ── */}
      <div className="ma-stats-grid">
        <div className="ma-stat-card ma-total">
          <div className="ma-stat-icon">
            <FaCalendarAlt />
          </div>
          <div className="ma-stat-content">
            <div className="ma-stat-title">
              {activeMode === "booked" ? "Toplam Aldığım Randevu" : "Toplam Gelen Randevu"}
            </div>
            <div className="ma-stat-value">
              {isCurrentLoading
                ? "—"
                : activeMode === "booked"
                  ? bookedStats.total
                  : providerStats.total}
            </div>
          </div>
        </div>

        <div className="ma-stat-card ma-pending">
          <div className="ma-stat-icon">
            <FaClock />
          </div>
          <div className="ma-stat-content">
            <div className="ma-stat-title">
              {activeMode === "booked" ? "Onay Bekleyenler" : "Onay Bekleyen Talepler"}
            </div>
            <div className="ma-stat-value">
              {isCurrentLoading
                ? "—"
                : activeMode === "booked"
                  ? bookedStats.pending
                  : providerStats.pending}
            </div>
          </div>
        </div>

        <div className="ma-stat-card ma-rejected">
          <div className="ma-stat-icon">
            <FaTimesCircle />
          </div>
          <div className="ma-stat-content">
            <div className="ma-stat-title">
              {activeMode === "booked" ? "İptal Edilen / Geçmiş" : "Reddedilen / İptal"}
            </div>
            <div className="ma-stat-value">
              {isCurrentLoading
                ? "—"
                : activeMode === "booked"
                  ? bookedStats.cancelled
                  : providerStats.rejected}
            </div>
          </div>
        </div>
      </div>

      {/* ── FİLTRE & ARAÇ ÇUBUĞU (KAYIT VARSA) ── */}
      {((activeMode === "booked" && bookedAppointments.length > 0) ||
        (activeMode === "provider" && providerAppointments.length > 0)) && (
          <div className="appointments-toolbar">
            <div className="filter-buttons" role="tablist" aria-label="Randevu filtreleri">
              {activeMode === "booked"
                ? [
                  ["all", "Tümü", bookedStats.total],
                  ["confirmed", "Onaylı / Sürüyor", bookedStats.confirmed],
                  ["completed", "Tamamlanan", bookedStats.completed],
                  ["pending", "Bekleyen", bookedStats.pending],
                  ["cancelled", "İptal / İtiraz", bookedStats.cancelled],
                ].map(([val, label, count]) => (
                  <button
                    key={val as string}
                    type="button"
                    className={`filter-btn ${filter === val ? "active" : ""}`}
                    onClick={() => {
                      setFilter(val as string);
                      setCurrentPage(1);
                    }}
                  >
                    <span>{label as string}</span>
                    <span className="count">{count as number}</span>
                  </button>
                ))
                : [
                  ["all", "Tümü", providerStats.total],
                  ["confirmed", "Onaylı / Sürüyor", providerStats.confirmed],
                  ["completed", "Tamamlanan", providerStats.completed],
                  ["pending", "Bekleyen", providerStats.pending],
                  ["rejected", "Reddedilen / İptal", providerStats.rejected],
                ].map(([val, label, count]) => (
                  <button
                    key={val as string}
                    type="button"
                    className={`filter-btn ${filter === val ? "active" : ""}`}
                    onClick={() => {
                      setFilter(val as string);
                      setCurrentPage(1);
                    }}
                  >
                    <span>{label as string}</span>
                    <span className="count">{count as number}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

      {/* ── İÇERİK: YÜKLENİYOR / KARTLAR / BOŞ DURUM ── */}
      <div className="my-appointments__content">
        {isCurrentLoading ? (
          <div className="my-appointments__loading">
            <div className="my-appointments__spinner" />
            <p>
              {activeMode === "booked"
                ? "Aldığınız randevular yükleniyor…"
                : "Gelen randevu talepleri yükleniyor…"}
            </p>
          </div>
        ) : activeMode === "booked" ? (
          /* ──────── ALDIĞIM RANDEVULAR MODU ──────── */
          !bookedAppointments.length ? (
            /* HİÇ ALINAN RANDEVU YOKSA */
            <div className="my-appointments__empty-state">
              <div className="ma-empty-icon-wrap">
                <div className="ma-empty-icon">
                  <FaCalendarCheck />
                </div>
              </div>

              <h2 className="ma-empty-title">Henüz Bir Hizmet Randevusu Almadınız</h2>
              <p className="ma-empty-desc">
                İhtiyacınız olan alanlarda doğrulanmış uzman ustalardan ve profesyonel işletmelerden
                tek tıkla online randevu alabilir, tüm randevularınızı bu sayfadan yönetebilirsiniz.
              </p>

              <div className="ma-empty-actions">
                <Link href="/kategoriler" className="ma-empty-btn ma-empty-btn--primary">
                  <FaCompass />
                  <span>Hizmetleri ve Ustaları Keşfet</span>
                  <FaArrowRight className="ma-empty-arrow" />
                </Link>
                {providerAppointments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleModeChange("provider")}
                    className="ma-empty-btn ma-empty-btn--secondary"
                  >
                    <span>Gelen Taleplerime Git ({providerAppointments.length})</span>
                  </button>
                )}
              </div>

              <div className="ma-empty-badges">
                <div className="ma-empty-badge">
                  <FaBolt className="ma-empty-badge-icon" />
                  <span>Hızlı &amp; Kolay Rezervasyon</span>
                </div>
                <div className="ma-empty-badge">
                  <FaCheckCircle className="ma-empty-badge-icon" />
                  <span>Onaylı Randevu Güvencesi</span>
                </div>
                <div className="ma-empty-badge">
                  <FaShieldAlt className="ma-empty-badge-icon" />
                  <span>Doğrudan Usta ile İletişim</span>
                </div>
              </div>
            </div>
          ) : !filteredBooked.length ? (
            /* FİLTREDE SONUÇ YOKSA */
            <div className="my-appointments__filter-empty">
              <div className="ma-filter-empty-icon">
                <FaClock />
              </div>
              <h3>Seçilen Filtreye Uygun Randevu Bulunamadı</h3>
              <p>Bu filtre kriterine uyan randevu kaydı bulunmuyor.</p>
              <button type="button" className="ma-filter-clear-btn" onClick={() => setFilter("all")}>
                Tüm Randevularımı Göster
              </button>
            </div>
          ) : (
            /* ALDIĞIM RANDEVU KARTLARI LİSTESİ */
            <>
              <div className="appt-cards-grid-container">
                {currentBooked.map((appointment) => (
                  <BookedAppointmentCard
                    key={String(appointment.id)}
                    appointment={appointment}
                    onCancelRequest={setCancellingAppointment}
                    onRescheduleRequest={(apt) => handleEditAppointment(apt as unknown as ProviderAppointment, false)}
                    onAppointmentUpdate={(id, newStatus, updatedData) => {
                      setBookedAppointments((prev) =>
                        prev.map((a) =>
                          a.id === id ? { ...a, status: newStatus, ...(updatedData || {}) } : a
                        )
                      );
                    }}
                    onDisputeRequest={setDisputingAppointment}
                    onRateRequest={setRatingAppointment}
                  />
                ))}
              </div>

              {totalPagesBooked > 1 && (
                <div className="pagination">
                  <button
                    type="button"
                    className={`pagination-btn ${currentPage === 1 ? "disabled" : ""}`}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Önceki
                  </button>
                  {Array.from({ length: totalPagesBooked }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`pagination-btn ${currentPage === totalPagesBooked ? "disabled" : ""}`}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPagesBooked, prev + 1))}
                    disabled={currentPage === totalPagesBooked}
                  >
                    Sonraki
                  </button>
                </div>
              )}
            </>
          )
        ) : (
          /* ──────── GELEN RANDEVU TALEPLERİ MODU (USTA) ──────── */
          !providerAppointments.length ? (
            /* USTANIN HİÇ RANDEVU TALEBİ YOKSA */
            <div className="my-appointments__empty-state">
              <div className="ma-empty-icon-wrap">
                <div className="ma-empty-icon">
                  <FaCalendarCheck />
                </div>
              </div>

              <h2 className="ma-empty-title">Henüz Bir Randevu Talebiniz Yok</h2>
              <p className="ma-empty-desc">
                Hizmet alanlarınız ve profiliniz üzerinden müşterileriniz randevu talebi oluşturduğunda
                burada listelenecek ve anında bildirim alacaksınız.
              </p>

              <div className="ma-empty-actions">
                <Link href="/dashboard/randevular/musait-saatler" className="ma-empty-btn ma-empty-btn--primary">
                  <FaRegCalendarAlt />
                  <span>Müsait Saatlerinizi Belirleyin</span>
                  <FaArrowRight className="ma-empty-arrow" />
                </Link>
                <Link href="/dashboard/hizmet-alanlari" className="ma-empty-btn ma-empty-btn--secondary">
                  <span>Hizmet Alanlarınızı İnceleyin</span>
                </Link>
              </div>

              <div className="ma-empty-badges">
                <div className="ma-empty-badge">
                  <FaBolt className="ma-empty-badge-icon" />
                  <span>Anında Müşteri Bildirimi</span>
                </div>
                <div className="ma-empty-badge">
                  <FaCheckCircle className="ma-empty-badge-icon" />
                  <span>Tek Tıkla Onay &amp; Ret</span>
                </div>
                <div className="ma-empty-badge">
                  <FaShieldAlt className="ma-empty-badge-icon" />
                  <span>Güvenli İletişim Detayları</span>
                </div>
              </div>
            </div>
          ) : !filteredProvider.length ? (
            /* FİLTREDE SONUÇ YOKSA */
            <div className="my-appointments__filter-empty">
              <div className="ma-filter-empty-icon">
                <FaClock />
              </div>
              <h3>Seçilen Filtreye Uygun Randevu Bulunamadı</h3>
              <p>Bu kategoride şu anda listelenecek bir randevu kaydı yok.</p>
              <button type="button" className="ma-filter-clear-btn" onClick={() => setFilter("all")}>
                Tüm Randevuları Göster
              </button>
            </div>
          ) : (
            /* GELEN RANDEVU KARTLARI LİSTESİ */
            <>
              <div className="appt-cards-grid-container">
                {currentProvider.map((appointment) => (
                  <AppointmentCard
                    key={String(appointment.id)}
                    appointment={appointment}
                    onEdit={handleEditAppointment}
                    onOpenActionModal={handleOpenActionModal}
                    onAppointmentUpdate={handleAppointmentUpdate}
                  />
                ))}
              </div>

              {totalPagesProvider > 1 && (
                <div className="pagination">
                  <button
                    type="button"
                    className={`pagination-btn ${currentPage === 1 ? "disabled" : ""}`}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Önceki
                  </button>
                  {Array.from({ length: totalPagesProvider }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`pagination-btn ${currentPage === totalPagesProvider ? "disabled" : ""}`}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPagesProvider, prev + 1))}
                    disabled={currentPage === totalPagesProvider}
                  >
                    Sonraki
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>

      {/* ── MÜŞTERİ İPTAL MODALI ── */}
      <CancelBookingModal
        isOpen={Boolean(cancellingAppointment)}
        appointment={cancellingAppointment}
        onClose={() => setCancellingAppointment(null)}
        onConfirm={handleConfirmCancelBooking}
      />

      {/* ── MÜŞTERİ İTİRAZ MODALI ── */}
      <DisputeAppointmentModal
        isOpen={Boolean(disputingAppointment)}
        appointment={disputingAppointment}
        onClose={() => setDisputingAppointment(null)}
        onConfirm={handleConfirmDispute}
      />

      {/* ── MÜŞTERİ DEĞERLENDİRME MODALI ── */}
      <RateAppointmentModal
        isOpen={Boolean(ratingAppointment)}
        serviceTitle={ratingAppointment?.title}
        providerName={ratingAppointment?.providerName}
        onClose={() => setRatingAppointment(null)}
        onSubmit={handleConfirmRate}
      />

      {/* ── USTA MODALLARI ── */}
      {isModalOpen && selectedAppointment && (
        <EditAppointmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          appointment={selectedAppointment}
          onUpdate={handleUpdateAppointment}
          isReadOnly={isReadOnly}
        />
      )}
      {isActionModalOpen && actionAppointment && (
        <RejectAppointmentModal
          isOpen={isActionModalOpen}
          onClose={handleCloseActionModal}
          appointment={actionAppointment}
          onAppointmentUpdate={handleAppointmentUpdate}
          action={modalAction}
        />
      )}
    </div>
  );
};

export default MyAppointments;
