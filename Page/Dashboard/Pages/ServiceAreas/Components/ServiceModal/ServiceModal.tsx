"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaStar,
  FaUsers,
  FaClock,
  FaThumbsUp,
  FaImage,
  FaHome,
  FaComments,
  FaMapMarkerAlt,
  FaEllipsisH,
  FaPen,
  FaTimes,
  FaBriefcase,
  FaLayerGroup,
  FaChartLine,
} from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type {
  MyDashboardService,
  DashboardServiceReview,
  DashboardServiceLocation,
  DashboardGalleryImage,
  DashboardServiceOverview,
} from "@/services/serviceAreas/myServicesDashboardService";
import ServiceReviews from "./ServiceReviews/ServiceReviews";
import authService from "@/services/auth/authService";
import ServiceGallery from "./ServiceGallery/ServiceGallery";
import ServiceLocations from "./ServiceLocations/ServiceLocations";
import "./ServiceModal.css";
import "./ServiceModal.mobile.css";

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: MyDashboardService;
}

function fmt(v: number | undefined, fallback = "—"): string {
  if (v == null || Number.isNaN(v)) return fallback;
  return String(v);
}

const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, service }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [chartHeight, setChartHeight] = useState(280);
  const [imgFailed, setImgFailed] = useState(false);
  const router = useRouter();

  // Canlı (SSOT) durum değişkenleri
  const [liveReviews, setLiveReviews] = useState<DashboardServiceReview[]>(service.reviewList || []);
  const [liveLocations, setLiveLocations] = useState<DashboardServiceLocation[]>(service.locations || []);
  const [liveGallery, setLiveGallery] = useState<DashboardGalleryImage[]>(service.gallery || []);
  const [liveRating, setLiveRating] = useState<number>(service.rating || 0);
  const [liveReviewsCount, setLiveReviewsCount] = useState<number>(service.reviews || 0);
  const [liveCategory, setLiveCategory] = useState<string>(service.category || "Genel Hizmet");
  const [liveDescription, setLiveDescription] = useState<string>(service.description || "");
  const [liveImage, setLiveImage] = useState<string>(service.image || "");
  const [liveOverview, setLiveOverview] = useState<DashboardServiceOverview>(service.overview || {});
  const [livePerformance, setLivePerformance] = useState<DashboardPerformancePoint[]>(service.performance || []);

  useEffect(() => {
    setImgFailed(false);
    setLiveReviews(service.reviewList || []);
    setLiveLocations(service.locations || []);
    setLiveGallery(service.gallery || []);
    setLiveRating(service.rating || 0);
    setLiveReviewsCount(service.reviews || 0);
    setLiveCategory(service.category || "Genel Hizmet");
    setLiveDescription(service.description || "");
    setLiveImage(service.image || "");
    setLiveOverview(service.overview || {});
    setLivePerformance(service.performance || []);
  }, [service]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setChartHeight(mq.matches ? 210 : 280);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Modal açıldığında canlı veritabanı verilerini arka plandan çek ve senkronize et
  useEffect(() => {
    if (!isOpen) return;
    const targetId = service.ilanId || service.id;
    if (!targetId) return;

    let isMounted = true;
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const headers: HeadersInit = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // 1. Canlı Yorumları Çek
    fetch(`/api/v1/listings/${targetId}/reviews`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted || !json) return;
        const data = json.data && typeof json.data === "object" ? json.data : json;
        const rawReviews = Array.isArray(data.reviews) ? data.reviews : Array.isArray(data) ? data : [];
        if (rawReviews.length > 0) {
          const mapped: DashboardServiceReview[] = rawReviews.map((r: Record<string, unknown>, idx: number) => ({
            id: (r.id as string | number) ?? idx,
            user: String(r.user || r.reviewerName || r.reviewer_name || "Kullanıcı"),
            rating: typeof r.rating === "number" ? r.rating : parseInt(String(r.rating || 5), 10) || 5,
            date: r.date ? String(r.date) : (r.createdAt ? String(r.createdAt).split("T")[0] : undefined),
            comment: r.comment ? String(r.comment) : "",
            response:
              r.response || r.reply || r.seller_response || r.providerResponse
                ? String(r.response || r.reply || r.seller_response || r.providerResponse)
                : undefined,
          }));
          setLiveReviews(mapped);
          setLiveReviewsCount(mapped.length);
          const sum = mapped.reduce((acc, r) => acc + r.rating, 0);
          const avg = Math.round((sum / mapped.length) * 10) / 10;
          setLiveRating(avg);
          setLiveOverview((prev) => ({
            ...prev,
            satisfactionPercent: Math.min(100, Math.round((avg / 5) * 100)),
          }));
        }
      })
      .catch(() => {});

    // 2. Canlı Hizmet Bölgelerini Çek
    fetch(`/api/v1/listings/${targetId}/service-areas`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted || !json) return;
        const data = json.data && typeof json.data === "object" ? json.data : json;
        let rawAreas: unknown[] = [];
        if (Array.isArray(data)) {
          rawAreas = data;
        } else if (Array.isArray(data.items)) {
          rawAreas = data.items;
        } else if (Array.isArray(data.manual) || Array.isArray(data.map)) {
          rawAreas = [...(data.manual || []), ...(data.map || [])];
        } else if (Array.isArray(data.serviceAreas)) {
          rawAreas = data.serviceAreas;
        }
        if (rawAreas.length > 0) {
          const mapped: DashboardServiceLocation[] = rawAreas.map((a: Record<string, unknown>, idx: number) => {
            const district = a.districtName || a.district_name || a.district || "";
            const city = a.cityName || a.city_name || a.city || "";
            const name = String(
              a.name || (district && city ? `${district} - ${city}` : (district || city)) || (a.type === "circle" ? "Dairesel Hizmet Alanı" : "Hizmet Bölgesi")
            ).trim();
            const nh = a.neighborhoods || a.neighborhood_ids || a.neighborhoodIds;
            return {
              id: (a.id as string | number) ?? idx,
              district: name,
              neighborhoods: Array.isArray(nh) ? nh.map(String) : [],
              isActive: a.isActive !== false,
            };
          });
          setLiveLocations(mapped);
        }
      })
      .catch(() => {});

    // 3. Canlı İlan Detaylarını (Kategori, Açıklama, Galeri, Kapak, Yorumlar, Overview) Çek
    fetch(`/api/v1/listings/${targetId}`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted || !json) return;
        const data = json.data && typeof json.data === "object" ? json.data : json;
        if (data.categoryName || data.category_name) {
          setLiveCategory(String(data.categoryName || data.category_name));
        }
        if (data.description || data.aciklama) {
          setLiveDescription(String(data.description || data.aciklama));
        }
        const imgList = data.imageUrls || data.photos || data.images || data.resimler;
        if (Array.isArray(imgList) && imgList.length > 0) {
          const mappedGallery: DashboardGalleryImage[] = imgList
            .map((url: string | Record<string, string>, idx: number) => {
              const u = typeof url === "string" ? url : url?.url || url?.preview || "";
              return { id: idx, url: u };
            })
            .filter((g) => g.url);
          if (mappedGallery.length > 0) {
            setLiveGallery(mappedGallery);
          }
          const userUploadedInGallery = mappedGallery.find(g => g.url.includes('/uploads/profiles/') || g.url.includes('cover_u') || g.url.includes('avatar_u'))?.url;
          const candidateImg = data.seller?.profileImage || data.ilan_sahibi?.profileImage || data.seller?.avatar || data.userPhotoUrl || data.user_photo_url || data.profileImage;
          const candidateCover = data.seller?.coverImage || data.coverImage;
          const bestImg = mappedGallery.find(g => !g.url.includes('cover') && !g.url.includes('kapak') && !g.url.includes('img_3afeac') && !g.url.includes('img_3dcef'))?.url;

          if (userUploadedInGallery) {
            setLiveImage(userUploadedInGallery);
          } else if (candidateCover && !candidateCover.includes('kapak-fotografi') && !candidateCover.includes('img_284_cover')) {
            setLiveImage(candidateCover);
          } else if (candidateImg) {
            setLiveImage(String(candidateImg));
          } else if (bestImg) {
            setLiveImage(bestImg);
          } else if (mappedGallery[0]?.url) {
            setLiveImage(mappedGallery[0].url);
          }
        } else {
          const candidateImg = data.seller?.profileImage || data.ilan_sahibi?.profileImage || data.seller?.avatar || data.userPhotoUrl || data.user_photo_url || data.profileImage;
          if (candidateImg) {
            setLiveImage(String(candidateImg));
          }
        }
        const rawReviews = Array.isArray(data.reviews) ? data.reviews : [];
        if (rawReviews.length > 0) {
          const mappedReviews: DashboardServiceReview[] = rawReviews.map((r: Record<string, unknown>, idx: number) => ({
            id: (r.id as string | number) ?? idx,
            user: String(r.user || r.userName || r.reviewerName || r.reviewer_name || "Kullanıcı"),
            rating: typeof r.rating === "number" ? r.rating : parseInt(String(r.rating || 5), 10) || 5,
            date: r.date ? String(r.date) : (r.createdAt ? String(r.createdAt).split("T")[0] : undefined),
            comment: r.comment ? String(r.comment) : "",
            response:
              r.response || r.reply || r.seller_response || r.providerResponse
                ? String(r.response || r.reply || r.seller_response || r.providerResponse)
                : undefined,
          }));
          setLiveReviews(mappedReviews);
          setLiveReviewsCount(mappedReviews.length);
          const sum = mappedReviews.reduce((acc, r) => acc + r.rating, 0);
          const avg = Math.round((sum / mappedReviews.length) * 10) / 10;
          setLiveRating(avg);
        } else if (data.rating != null) {
          setLiveRating(Number(data.rating));
          if (data.reviewCount != null) {
            setLiveReviewsCount(Number(data.reviewCount));
          }
        }
        if (data.overview && typeof data.overview === "object") {
          setLiveOverview((prev) => ({ ...prev, ...data.overview }));
        } else if (data.totalCustomers != null || data.completedJobs != null) {
          setLiveOverview((prev) => ({
            ...prev,
            totalCustomers: data.totalCustomers != null ? Number(data.totalCustomers) : prev.totalCustomers,
            completedJobs: data.completedJobs != null ? Number(data.completedJobs) : prev.completedJobs,
            satisfactionPercent: data.satisfactionPercent != null ? Number(data.satisfactionPercent) : prev.satisfactionPercent,
            experienceYears: data.experienceYears != null ? Number(data.experienceYears) : prev.experienceYears,
          }));
        }
        if (Array.isArray(data.performance) && data.performance.length > 0) {
          setLivePerformance(data.performance);
        }
        const areasCandidate = data.serviceAreas || data.service_areas || data.locations;
        let candidateList: unknown[] = [];
        if (Array.isArray(areasCandidate)) {
          candidateList = areasCandidate;
        } else if (areasCandidate && typeof areasCandidate === 'object') {
          const candObj = areasCandidate as Record<string, unknown>;
          candidateList = [...(Array.isArray(candObj.manual) ? candObj.manual : []), ...(Array.isArray(candObj.map) ? candObj.map : [])];
        }
        if (candidateList.length > 0) {
          const mappedAreas: DashboardServiceLocation[] = candidateList.map((a: Record<string, unknown>, idx: number) => {
            const district = a.districtName || a.district_name || a.district || "";
            const city = a.cityName || a.city_name || a.city || "";
            const name = String(
              a.name || (district && city ? `${district} - ${city}` : (district || city)) || (a.type === "circle" ? "Dairesel Hizmet Alanı" : "Hizmet Bölgesi")
            ).trim();
            const nh = a.neighborhoods || a.neighborhood_ids || a.neighborhoodIds;
            return {
              id: (a.id as string | number) ?? idx,
              district: name,
              neighborhoods: Array.isArray(nh) ? nh.map(String) : [],
              isActive: a.isActive !== false,
            };
          });
          setLiveLocations((prev) => (prev.length > 0 ? prev : mappedAreas));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isOpen, service.id, service.ilanId]);

  if (!isOpen) return null;

  const performanceData = (livePerformance && livePerformance.length > 0) ? livePerformance : (service.performance || []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <>
            <div className="service-modal__stats">
              <div className="modal-stat modal-stat--rating">
                <div className="modal-stat__icon">
                  <FaStar />
                </div>
                <div className="modal-stat__body">
                  <div className="modal-stat__label">Ortalama Puan</div>
                  <div className="modal-stat__value">{liveRating}</div>
                  <div className="modal-stat__stars">
                    {[...Array(5)].map((_, index) => (
                      <FaStar
                        key={index}
                        className={index < Math.floor(liveRating) ? "star-filled" : "star-empty"}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-stat modal-stat--customers">
                <div className="modal-stat__icon">
                  <FaUsers />
                </div>
                <div className="modal-stat__body">
                  <div className="modal-stat__label">Toplam Müşteri</div>
                  <div className="modal-stat__value">{fmt(liveOverview.totalCustomers, "0")}</div>
                  <div className="modal-stat__trend">{liveOverview.customersTrend ?? "—"}</div>
                </div>
              </div>

              <div className="modal-stat modal-stat--jobs">
                <div className="modal-stat__icon">
                  <FaClock />
                </div>
                <div className="modal-stat__body">
                  <div className="modal-stat__label">Tamamlanan İş</div>
                  <div className="modal-stat__value">{fmt(liveOverview.completedJobs, "0")}</div>
                  <div className="modal-stat__trend">{liveOverview.jobsTrend ?? "—"}</div>
                </div>
              </div>

              <div className="modal-stat modal-stat--satisfaction">
                <div className="modal-stat__icon">
                  <FaThumbsUp />
                </div>
                <div className="modal-stat__body">
                  <div className="modal-stat__label">Memnuniyet</div>
                  <div className="modal-stat__value">
                    {liveOverview.satisfactionPercent != null ? `%${liveOverview.satisfactionPercent}` : "—"}
                  </div>
                  <div className="modal-stat__trend">{liveOverview.satisfactionTrend ?? "—"}</div>
                </div>
              </div>
            </div>

            <div className="service-modal__sections">
              <div className="service-modal__section overview-section">
                <div className="overview-item">
                  <h3>Hizmet Açıklaması</h3>
                  <p>{liveDescription || "Bu hizmet için henüz detaylı açıklama girilmemiştir."}</p>
                </div>

                <div className="overview-item">
                  <h3>Uzmanlık & Deneyim</h3>
                  <div className="experience-badge">
                    <div className="experience-badge__icon">
                      <span>{liveOverview.experienceYears != null ? `${liveOverview.experienceYears}+` : "—"}</span>
                      <span>Yıl</span>
                    </div>
                    <div className="experience-badge__text">Sektör Deneyimi ve Uzmanlık</div>
                  </div>
                </div>

                <div className="overview-item performance-item">
                  <div className="performance-item__header">
                    <span className="performance-item__icon" aria-hidden="true">
                      <FaChartLine />
                    </span>
                    <div>
                      <h3>Performans Analizi</h3>
                      <p className="performance-item__subtitle">Aylık memnuniyet ve tamamlanan iş dağılımı</p>
                    </div>
                  </div>
                  <div className="performance-chart">
                    {performanceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={chartHeight}>
                        <LineChart data={performanceData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="ay" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} />
                          <YAxis
                            yAxisId="left"
                            stroke="#ea580c"
                            tick={{ fill: "#ea580c", fontSize: 12 }}
                            domain={[80, 100]}
                            label={{
                              value: "Memnuniyet (%)",
                              angle: -90,
                              position: "insideLeft",
                              fill: "#ea580c",
                            }}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#059669"
                            tick={{ fill: "#059669", fontSize: 12 }}
                            label={{
                              value: "Tamamlanan İş",
                              angle: 90,
                              position: "insideRight",
                              fill: "#059669",
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "#0f172a",
                              color: "#ffffff",
                              border: "1px solid rgba(255, 255, 255, 0.12)",
                              borderRadius: "10px",
                              boxShadow: "0 10px 24px -6px rgba(15, 23, 42, 0.3)",
                            }}
                            itemStyle={{ color: "#e2e8f0" }}
                            labelStyle={{ color: "#ffffff", fontWeight: 700 }}
                            formatter={(value, name) => {
                              if (name === "memnuniyet") return [`%${value}`, "Memnuniyet"];
                              return [value, "Tamamlanan İş"];
                            }}
                          />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="memnuniyet"
                            stroke="#f97316"
                            strokeWidth={2.75}
                            dot={{ fill: "#ea580c", strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: "#ea580c" }}
                            name="memnuniyet"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="tamamlanan"
                            stroke="#10b981"
                            strokeWidth={2.75}
                            dot={{ fill: "#059669", strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: "#059669" }}
                            name="tamamlanan"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="service-modal__chart-empty">Grafik için yeterli performans verisi bulunmuyor.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case "reviews":
        return (
          <ServiceReviews
            reviews={liveReviews}
            providerName={authService.getCurrentUser()?.name || (service as any)?.ad_soyad || 'Hizmet Sağlayıcı'}
          />
        );
      case "gallery":
        return <ServiceGallery images={liveGallery} />;
      case "locations":
        return <ServiceLocations locations={liveLocations} />;
      default:
        return null;
    }
  };

  const goEdit = () => {
    onClose();
    router.push(`/dashboard/hizmet-alanlari/duzenle/${service.id}`);
  };

  return (
    <div className="service-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="service-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Üst Kurumsal Başlık Barı (Şeritsiz) */}
        <div className="service-modal__top-bar">
          <div className="service-modal__top-badges">
            <span className="service-modal__report-pill">Hizmet Performans Detayı</span>
            <span className="service-modal__status-pill">Aktif</span>
          </div>
          <div className="service-modal__top-actions">
            <button type="button" className="service-modal__edit-btn" onClick={goEdit}>
              <FaPen className="service-modal__edit-icon" aria-hidden />
              <span>Düzenle</span>
            </button>
            <button type="button" className="service-modal__close" onClick={onClose} aria-label="Kapat">
              <FaTimes />
            </button>
          </div>
        </div>

        {/* 2. Kaydırılabilir İçerik Gövdesi */}
        <div className="service-modal__scroll-container">
          {/* Hizmet Özeti Başlık Kartı (Görsel + Meta Bento) */}
          <div className="service-modal__hero">
            <div className="service-modal__image">
              {liveImage && !imgFailed ? (
                <img src={liveImage} alt={service.title} onError={() => setImgFailed(true)} />
              ) : (
                <div className="service-modal__image-fallback" role="presentation" aria-hidden="true">
                  <FaBriefcase />
                </div>
              )}
            </div>

            <div className="service-modal__heading">
              <h1 id="service-modal-title" className="service-modal__title">
                {service.title}
              </h1>

              <div className="service-modal__meta-grid">
                <div className="service-modal__meta-item">
                  <span className="service-modal__meta-icon service-modal__meta-icon--navy" aria-hidden="true">
                    <FaLayerGroup />
                  </span>
                  <div className="service-modal__meta-copy">
                    <span className="service-modal__meta-label">Kategori</span>
                    <span className="service-modal__meta-value">{liveCategory}</span>
                  </div>
                </div>

                <div className="service-modal__meta-item">
                  <span className="service-modal__meta-icon service-modal__meta-icon--amber" aria-hidden="true">
                    <FaStar />
                  </span>
                  <div className="service-modal__meta-copy">
                    <span className="service-modal__meta-label">Değerlendirme</span>
                    <span className="service-modal__meta-value">
                      {liveRating} Puan ({liveReviewsCount} Yorum)
                    </span>
                  </div>
                </div>

                <div className="service-modal__meta-item">
                  <span className="service-modal__meta-icon service-modal__meta-icon--teal" aria-hidden="true">
                    <FaMapMarkerAlt />
                  </span>
                  <div className="service-modal__meta-copy">
                    <span className="service-modal__meta-label">Hizmet Bölgesi</span>
                    <span className="service-modal__meta-value">
                      {liveLocations.length > 0 ? `${liveLocations.length} Kayıtlı Bölge` : "Tüm Bölgeler"}
                    </span>
                  </div>
                </div>

                <div className="service-modal__meta-item">
                  <span className="service-modal__meta-icon service-modal__meta-icon--indigo" aria-hidden="true">
                    <FaImage />
                  </span>
                  <div className="service-modal__meta-copy">
                    <span className="service-modal__meta-label">Portföy / Galeri</span>
                    <span className="service-modal__meta-value">{liveGallery.length} Görsel</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Sekme Kontrolleri ve Aktif Sekme İçeriği */}
          <div className="service-modal__content">
            <div className="service-modal__tabs-sticky">
              <div className="service-modal__tabs">
                <button
                  type="button"
                  className={`service-modal__tab ${activeTab === "overview" ? "active" : ""}`}
                  onClick={() => setActiveTab("overview")}
                >
                  <FaHome className="service-modal__tab-icon" />
                  <span>Genel Bakış</span>
                </button>
                <button
                  type="button"
                  className={`service-modal__tab ${activeTab === "reviews" ? "active" : ""}`}
                  onClick={() => setActiveTab("reviews")}
                >
                  <FaComments className="service-modal__tab-icon" />
                  <span>Müşteri Yorumları</span>
                  {liveReviewsCount > 0 && <span className="service-modal__tab-badge">{liveReviewsCount}</span>}
                </button>
                <button
                  type="button"
                  className={`service-modal__tab ${activeTab === "gallery" ? "active" : ""}`}
                  onClick={() => setActiveTab("gallery")}
                >
                  <FaImage className="service-modal__tab-icon" />
                  <span>Galeri</span>
                  {liveGallery.length > 0 && <span className="service-modal__tab-badge">{liveGallery.length}</span>}
                </button>
                <button
                  type="button"
                  className={`service-modal__tab ${activeTab === "locations" ? "active" : ""}`}
                  onClick={() => setActiveTab("locations")}
                >
                  <FaMapMarkerAlt className="service-modal__tab-icon" />
                  <span>Hizmet Bölgeleri</span>
                  {liveLocations.length > 0 && <span className="service-modal__tab-badge">{liveLocations.length}</span>}
                </button>
                <button type="button" className="service-modal__tab" onClick={goEdit}>
                  <FaEllipsisH className="service-modal__tab-icon" />
                  <span>Daha Fazla</span>
                </button>
              </div>
            </div>

            <div className="service-modal__tab-body">{renderTabContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceModal;
