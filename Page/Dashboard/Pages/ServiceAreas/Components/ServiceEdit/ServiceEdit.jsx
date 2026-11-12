'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  FaCheckCircle, 
  FaPaperPlane, 
  FaFileContract, 
  FaClock, 
  FaTimes, 
  FaExternalLinkAlt, 
  FaExclamationTriangle 
} from 'react-icons/fa';
import ServicePricing from '../ServicePricing/ServicePricing';
import ServiceDescription from '../ServiceDescription/ServiceDescription';
import ServiceFeatures from '../ServiceFeatures/ServiceFeatures';
import ServiceGallery from '../ServiceGallery/ServiceGallery';
import ServiceReviewResponse from '../ServiceReviewResponse/ServiceReviewResponse';
import ServiceWorkingHours from '../ServiceWorkingHours/ServiceWorkingHours';
import ServiceCertificates from '../ServiceCertificates/ServiceCertificates';
import ServiceFAQ from '../ServiceFAQ/ServiceFAQ';
import ServiceAreaSelector from '../ServiceAreaSelector/ServiceAreaSelector';
import ServiceDetailPage from '@/Page/ServiceDetail/ServiceDetailPage';
import ServiceOwnerEditModal from './ServiceOwnerEditModal';
import './ServiceEdit.css';
import { dashboardReviewsAPI } from '@/services/reviews/dashboardReviewsService';
import { getServiceAreas, saveServiceAreas, deleteServiceAreas } from '@/services/serviceAreas/serviceAreasAPI';
import { listingEditAPI, userCertificatesAPI } from '@/services/serviceAreas/serviceEditApi';
import userService from '@/services/users/userService';
import { getMyDashboardServiceById } from '@/services/serviceAreas/myServicesDashboardService';
import { getReviewsByIlanId } from '@/services/productDetail/productDetailService';
import { useAuth } from '@/context/AuthContext';
import { STORAGE_KEYS } from '@/config/constants';
import api from '@/services/api/ürapi';
import { ListingService } from '@/services/listingService';

/** Oturumdaki hesabın profil görseli (API / Google / user_data / user_profile) */
function getAccountProfileImageUrl(user) {
  const candidates = [];
  if (user && typeof user === 'object') {
    const keys = ['picture', 'profileImage', 'avatar', 'photo', 'profile_photo', 'imageUrl', 'profile_photo_url'];
    for (const k of keys) {
      const v = user[k];
      if (typeof v === 'string' && v.trim()) candidates.push(v.trim());
    }
  }
  if (typeof window !== 'undefined') {
    try {
      const profRaw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (profRaw) {
        const p = JSON.parse(profRaw);
        if (p && typeof p.picture === 'string' && p.picture.trim()) candidates.push(p.picture.trim());
      }
      const dataRaw = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (dataRaw) {
        const d = JSON.parse(dataRaw);
        if (d && typeof d === 'object') {
          ['picture', 'profileImage', 'avatar'].forEach((k) => {
            const v = d[k];
            if (typeof v === 'string' && v.trim()) candidates.push(v.trim());
          });
        }
      }
    } catch {
      /* ignore */
    }
  }
  return candidates[0] ?? null;
}

const emptyWorkingHours = {
      monday: { start: '09:00', end: '18:00', isActive: true },
      tuesday: { start: '09:00', end: '18:00', isActive: true },
      wednesday: { start: '09:00', end: '18:00', isActive: true },
      thursday: { start: '09:00', end: '18:00', isActive: true },
      friday: { start: '09:00', end: '18:00', isActive: true },
      saturday: { start: '10:00', end: '15:00', isActive: true },
  sunday: { start: '10:00', end: '15:00', isActive: false },
};

const defaultQuickActionPrefs = {
  whatsapp: true,
  message: true,
  phone: true,
  appointment: true,
};

const defaultService = {
  title: '',
  description: '',
  rating: 0,
  user: { name: '', profileImage: null },
  reviews: [],
  customers: null,
  completedJobs: null,
  experience: '',
  satisfaction: null,
  features: [],
  workingHours: { ...emptyWorkingHours },
  certificates: [],
  pricing: [],
  faq: [],
  gallery: [],
  responseRate: '1 saat',
  quickActionPrefs: { ...defaultQuickActionPrefs },
};

/** Oturum token'ı (Bearer) — serviceAreasAPI'ye geçirilir; public GET'te boşsa da sorun değil. */
function getAuthToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || '';
}

/**
 * Hizmet bölgeleri backend endpoint'i (`/api/v1/listings/{listingId}/service-areas`)
 * gerçek `Listing.id` bekler; dashboard route id'si ile ilan_id bazı durumlarda
 * farklı olabildiğinden (bkz. reviewIlanId), öncelik: gerçek ilanId → sayısal route id.
 */
function resolveServiceAreasListingId(routeId, ilanId) {
  if (ilanId != null && !Number.isNaN(Number(ilanId))) return Number(ilanId);
  if (routeId != null && routeId !== '' && !Number.isNaN(Number(routeId))) return Number(routeId);
  return null;
}

/**
 * ServiceAreasManual.jsx alan şekli: { cityId, cityName, districtId, districtName }.
 * Backend (SaveServiceAreasRequest.AreaItem) snake_case bekler: city_name, district_id,
 * district_name, neighborhood_ids. FE'de cityId her zaman cityName ile aynı değerdir
 * (bkz. ServiceAreasManual.jsx handleAddArea — il listesinden seçilen isim id olarak kullanılıyor).
 */
function toBackendManualAreas(areas) {
  return (areas || []).map((a) => ({
    city_name: a.cityName ?? a.cityId ?? null,
    district_id: a.districtId != null ? String(a.districtId) : null,
    district_name: a.districtName ?? null,
    ...(Array.isArray(a.neighborhoodIds) ? { neighborhood_ids: a.neighborhoodIds } : {}),
  }));
}

/** Backend yanıtı (ManualAreaDTO, snake_case) → ServiceAreasManual.jsx'in beklediği şekil. */
function fromBackendManualAreas(areas) {
  return (areas || []).map((a) => ({
    id: a.id,
    cityId: a.city_name ?? '',
    cityName: a.city_name ?? '',
    districtId: a.district_id ?? '',
    districtName: a.district_name ?? '',
    ...(Array.isArray(a.neighborhood_ids) ? { neighborhoodIds: a.neighborhood_ids } : {}),
  }));
}

/**
 * ServiceAreasMap.jsx alan şekli (`{id, type, center:{lat,lng}, radius, points:[{lat,lng}], name, bounds}`)
 * zaten backend (`SaveServiceAreasRequest.AreaItem`) ile aynı alan adlarını kullanıyor;
 * sadece FE'ye özgü (id, name, bounds) alanları temizlenir.
 */
function toBackendMapAreas(areas) {
  return (areas || []).map((a) => ({
    type: a.type,
    ...(a.center ? { center: { lat: a.center.lat, lng: a.center.lng } } : {}),
    ...(a.radius != null ? { radius: a.radius } : {}),
    ...(Array.isArray(a.points) ? { points: a.points.map((p) => ({ lat: p.lat, lng: p.lng })) } : {}),
  }));
}

const ServiceEdit = () => {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const { currentUser } = useAuth();
  const [coverImage, setCoverImage] = useState(null);
  const [editSection, setEditSection] = useState(null);
  const [service, setService] = useState(defaultService);
  const [selectedServiceAreas, setSelectedServiceAreas] = useState({ type: null, areas: [] });
  const [serviceId, setServiceId] = useState(1);
  /** Yorum JSON / API eşlemesi: dashboard kart id’si ile ilan_id farklı olabilir */
  const [reviewIlanId, setReviewIlanId] = useState(null);
  const [dashboardRowLoaded, setDashboardRowLoaded] = useState(false);
  const [serviceReviews, setServiceReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [publicPreviewOpen, setPublicPreviewOpen] = useState(false);
  /** Önizleme sekmeleri — state burada; ServiceDetailPage remount olsa bile sıfırlanmaz */
  const [ownerDetailNavTab, setOwnerDetailNavTab] = useState('overview');

  useEffect(() => {
    setOwnerDetailNavTab('overview');
  }, [id]);

  useEffect(() => {
    if (id == null || id === '') return;
    const n = Number(id);
    setServiceId(Number.isNaN(n) ? id : n);
  }, [id]);

  /**
   * Hizmet bölgesi seçimini gerçek backend'den yükler
   * (`GET /api/v1/listings/{listingId}/service-areas`) — hem "manual" (il/ilçe)
   * hem de "map" (harita çizimi) verisi buradan gelir.
   */
  const loadServiceAreasSelection = async (routeId, ilanId) => {
    const backendListingId = resolveServiceAreasListingId(routeId, ilanId);
    if (backendListingId == null) {
      setSelectedServiceAreas({ type: null, areas: [] });
      return;
    }
    try {
      const store = await getServiceAreas(getAuthToken(), backendListingId);
      if (store?.manual?.length > 0) {
        setSelectedServiceAreas({ type: 'manual', areas: fromBackendManualAreas(store.manual) });
        return;
      }
      if (store?.map?.length > 0) {
        setSelectedServiceAreas({ type: 'map', areas: store.map });
        return;
      }
      setSelectedServiceAreas({ type: null, areas: [] });
    } catch (err) {
      console.error('[ServiceEdit] Hizmet bölgeleri (backend) alınamadı:', err);
      setSelectedServiceAreas({ type: null, areas: [] });
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (id == null || id === '') return undefined;
    setDashboardRowLoaded(false);
    (async () => {
      try {
      const row = await getMyDashboardServiceById(id);
      if (cancelled) return;
      if (!row) {
        setReviewIlanId(null);
        await loadServiceAreasSelection(id, null);
        return;
      }
      const rowIlan =
        row.ilanId != null && !Number.isNaN(Number(row.ilanId)) ? Number(row.ilanId) : null;
      setReviewIlanId(rowIlan);
      const galleryUrls = row.gallery?.length > 0 ? row.gallery.map((g) => g.url).filter(Boolean) : null;
      const mappedReviews =
        row.reviewList?.length > 0
          ? row.reviewList.map((r) => ({
              id: r.id ?? r.comment_id,
              ilan_id: r.ilan_id != null ? Number(r.ilan_id) : rowIlan ?? Number(id),
              customerName: r.user,
              user: r.user,
              date: r.serviceDate || r.date,
              comment: r.comment,
              rating: r.rating,
              response: r.response ?? null,
            }))
          : null;
      setService((prev) => ({
        ...prev,
        title: row.title || prev.title,
        description: row.description ?? prev.description,
        rating: row.rating ?? prev.rating,
        ...(galleryUrls ? { gallery: galleryUrls } : {}),
        customers: row.overview?.totalCustomers ?? prev.customers,
        completedJobs: row.overview?.completedJobs ?? prev.completedJobs,
        experience:
          row.overview?.experienceYears != null ? `${row.overview.experienceYears}+` : prev.experience,
        satisfaction: row.overview?.satisfactionPercent ?? prev.satisfaction,
        ...(mappedReviews ? { reviews: mappedReviews } : {}),
      }));
      await loadServiceAreasSelection(id, rowIlan);
      } finally {
        if (!cancelled) setDashboardRowLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!dashboardRowLoaded) return undefined;
    const loadReviews = async () => {
      const targetIlan = reviewIlanId != null ? reviewIlanId : serviceId;
      let ilanReviews = [];
      try {
        ilanReviews = await dashboardReviewsAPI.getIlanReviews(targetIlan);
      } catch {
        ilanReviews = [];
      }
      let allReviews = [];
      try {
        allReviews = await dashboardReviewsAPI.getAllReviews();
      } catch {
        allReviews = [];
      }
      setService((prev) => {
        const merged =
          Array.isArray(ilanReviews) && ilanReviews.length > 0
            ? ilanReviews
            : prev.reviews && prev.reviews.length > 0
              ? prev.reviews
              : Array.isArray(allReviews) && allReviews.length > 0
                ? allReviews
                : [];
        setServiceReviews(merged);
        return {
          ...prev,
          reviews: merged,
          reviewCount: merged.length,
        };
      });
      setLoading(false);
    };
    loadReviews();
    return undefined;
  }, [serviceId, reviewIlanId, dashboardRowLoaded]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await api.fetchBasicInfo();
        if (profile) {
          setUserData({
            ...profile,
            name: profile.fullName,
            profileImage: profile.profileImage,
            coverImage: profile.coverImage
          });
        }
      } catch (err) {
        console.error('[ServiceEdit] Kullanıcı profili alınamadı:', err);
      }
    };
    loadProfile();

    const handleProfileUpdate = () => {
      loadProfile();
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, []);

  /**
   * Paketler / çalışma saatleri / SSS / özellikler / sertifikalar — gerçek backend'den
   * yüklenir (bkz. serviceEditApi.ts). Sertifikalar kullanıcı bazlıdır (listingId'siz).
   */
  useEffect(() => {
    if (!dashboardRowLoaded) return undefined;
    const listingId = resolveServiceAreasListingId(id, reviewIlanId);
    let cancelled = false;
    (async () => {
      try {
        const [packages, workingHours, faq, features, certificates] = await Promise.all([
          listingId != null ? listingEditAPI.getPackages(listingId).catch(() => []) : Promise.resolve([]),
          listingId != null ? listingEditAPI.getWorkingHours(listingId).catch(() => null) : Promise.resolve(null),
          listingId != null ? listingEditAPI.getFaq(listingId).catch(() => []) : Promise.resolve([]),
          listingId != null ? listingEditAPI.getFeatures(listingId).catch(() => []) : Promise.resolve([]),
          userCertificatesAPI.getCertificates().catch(() => []),
        ]);
        if (cancelled) return;
        setService((prev) => ({
          ...prev,
          pricing: packages,
          workingHours: workingHours || emptyWorkingHours,
          faq,
          features,
          certificates,
        }));
      } catch (err) {
        console.error('[ServiceEdit] Düzenleme verileri yüklenemedi:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dashboardRowLoaded, id, reviewIlanId]);

  useEffect(() => {
    if (!publicPreviewOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [publicPreviewOpen]);

  const calculateAverageRating = (reviews) => {
    if (!reviews?.length) return 0;
    const total = reviews.reduce((s, r) => s + r.rating, 0);
    return Math.round((total / reviews.length) * 10) / 10;
  };

  const handleCoverImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImage(reader.result);
      try {
        localStorage.setItem('serviceCoverImage', reader.result);
      } catch {
        /* ignore */
      }
    };
    reader.readAsDataURL(file);

    const listingId = resolveServiceAreasListingId(id, reviewIlanId);
    if (listingId != null) {
      ListingService.uploadListingImage(Number(listingId), file, true).catch((err) => {
        console.warn('[ServiceEdit] Kapak görseli backend yükleme bildirimi:', err);
      });
    }
  };

  const handlePricingUpdate = (newPricing) => {
    setService((prev) => ({ ...prev, pricing: newPricing }));
    const listingId = resolveServiceAreasListingId(id, reviewIlanId);
    if (listingId == null) return;
    listingEditAPI
      .savePackages(listingId, newPricing)
      .then((saved) => setService((prev) => ({ ...prev, pricing: saved })))
      .catch((err) => console.error('[ServiceEdit] Paketler kaydedilemedi:', err));
  };
  const handleFeaturesUpdate = (newFeatures) => {
    setService((prev) => ({ ...prev, features: newFeatures }));
    const listingId = resolveServiceAreasListingId(id, reviewIlanId);
    if (listingId == null) return;
    listingEditAPI
      .saveFeatures(listingId, newFeatures)
      .catch((err) => console.error('[ServiceEdit] Özellikler kaydedilemedi:', err));
  };
  const handleGalleryUpdate = (newGallery) =>
    setService((prev) => ({ ...prev, gallery: (newGallery || []).slice(0, 10) }));
  const handleReviewsUpdate = (updatedReviews) => {
    const list = updatedReviews || [];
    setServiceReviews(list);
    const ilanKey = reviewIlanId != null ? reviewIlanId : serviceId;
    const forThisListing = list.filter(
      (r) => r.ilan_id == null || Number(r.ilan_id) === Number(ilanKey)
    );
    setService((prev) => ({
      ...prev,
      reviews: forThisListing.length ? forThisListing : list,
      rating: calculateAverageRating(forThisListing.length ? forThisListing : list),
      reviewCount: (forThisListing.length ? forThisListing : list).length,
    }));
  };
  const handleWorkingHoursUpdate = (newHours) => {
    setService((prev) => ({ ...prev, workingHours: newHours }));
    const listingId = resolveServiceAreasListingId(id, reviewIlanId);
    if (listingId == null) return;
    listingEditAPI
      .saveWorkingHours(listingId, newHours)
      .catch((err) => console.error('[ServiceEdit] Çalışma saatleri kaydedilemedi:', err));
  };
  const handleCertificatesUpdate = (certificates) => {
    setService((prev) => ({ ...prev, certificates }));
    userCertificatesAPI
      .saveCertificates(certificates)
      .then((saved) => setService((prev) => ({ ...prev, certificates: saved })))
      .catch((err) => console.error('[ServiceEdit] Sertifikalar kaydedilemedi:', err));
  };
  const handleFAQUpdate = (faq) => {
    setService((prev) => ({ ...prev, faq }));
    const listingId = resolveServiceAreasListingId(id, reviewIlanId);
    if (listingId == null) return;
    listingEditAPI
      .saveFaq(listingId, faq)
      .catch((err) => console.error('[ServiceEdit] SSS kaydedilemedi:', err));
  };

  const handleServiceAreasUpdate = async (areasPayload) => {
    if (!areasPayload) return;
    let nextType;
    let nextAreas;
    if (areasPayload.type != null && Array.isArray(areasPayload.areas)) {
      nextType = areasPayload.type;
      nextAreas = areasPayload.areas;
    } else if (Array.isArray(areasPayload)) {
      nextType = 'manual';
      nextAreas = areasPayload;
    } else {
      nextType = 'map';
      nextAreas = Array.isArray(areasPayload) ? areasPayload : [areasPayload];
    }

    const backendListingId = resolveServiceAreasListingId(id, reviewIlanId);
    if (backendListingId != null) {
      try {
        if (nextType === 'manual') {
          // Manuel (il/ilçe) seçim → gerçek backend (bkz. serviceAreasService.md D).
          await saveServiceAreas(
            getAuthToken(),
            'manual',
            toBackendManualAreas(nextAreas),
            backendListingId
          );
        } else if (nextAreas.length === 0) {
          // Backend boş areas dizisini kabul etmiyor (@NotEmpty) → tümünü sil.
          await deleteServiceAreas(getAuthToken(), 'map', backendListingId);
        } else {
          await saveServiceAreas(
            getAuthToken(),
            'map',
            toBackendMapAreas(nextAreas),
            backendListingId
          );
        }
      } catch (err) {
        console.error(
          `[ServiceEdit] Hizmet bölgeleri (${nextType}) backend’e kaydedilemedi:`,
          err
        );
      }
    }

    setSelectedServiceAreas({ type: nextType, areas: nextAreas });
  };

  const buildServicePreviewPayload = useCallback(() => {
    const gallery = Array.isArray(service.gallery) ? [...service.gallery] : [];
    const activeCover = coverImage || userData?.coverImage || currentUser?.coverImage;
    const images = activeCover ? [activeCover, ...gallery.filter((u) => u !== activeCover)] : gallery;
    const expRaw = service.experience != null ? String(service.experience).replace(/\+$/, '').trim() : '';
    const areas = [];
    if (selectedServiceAreas?.areas?.length) {
      if (selectedServiceAreas.type === 'manual') {
        selectedServiceAreas.areas.forEach((a) => {
          const label = [a.cityName, a.districtName].filter(Boolean).join(' - ');
          if (label) areas.push(label);
        });
      } else {
        areas.push('Harita üzerinde tanımlı bölge');
      }
    }
    let workingHoursNorm = service.workingHours;
    if (workingHoursNorm && typeof workingHoursNorm === 'object') {
      workingHoursNorm = Object.fromEntries(
        Object.entries(workingHoursNorm).map(([day, h]) => [
          day,
          { start: h.start, end: h.end, is_active: h.isActive !== false, is_today: false },
        ])
      );
    }
    let konum;
    if (selectedServiceAreas?.type === 'manual' && selectedServiceAreas.areas?.[0]) {
      const a0 = selectedServiceAreas.areas[0];
      konum = { il: a0.cityName || '', ilce: a0.districtName || '', mahalle: '' };
    }
    const mapToPreview = (arr) =>
      (arr || []).map((r, i) => ({
        id: r.id ?? r.comment_id ?? i,
        user: String(
          r.customerName ||
            r.user ||
            r.user_name ||
            r.userName ||
            r.reviewerName ||
            r.reviewer_name ||
            'Müşteri'
        ),
        rating: Number(r.rating) || 0,
        comment: String(r.comment || r.comment_text || r.content || ''),
        date: String(
          r.date ||
            r.serviceDate ||
            (typeof r.createdAt === 'string' ? r.createdAt.split('T')[0] : '') ||
            ''
        ),
        response:
          r.response ||
          r.reply ||
          r.seller_response ||
          r.providerResponse ||
          null,
      }));

    const ilanKey = reviewIlanId != null ? reviewIlanId : serviceId;
    let reviewSource = Array.isArray(service.reviews) ? [...service.reviews] : [];
    if (!reviewSource.length) {
      try {
        const fromProduct = getReviewsByIlanId(ilanKey);
        if (Array.isArray(fromProduct) && fromProduct.length) reviewSource = fromProduct;
      } catch {
        /* ignore */
      }
    }
    if (!reviewSource.length && Array.isArray(serviceReviews) && serviceReviews.length) {
      const filtered = serviceReviews.filter((r) => Number(r.ilan_id) === Number(ilanKey));
      reviewSource = filtered.length ? filtered : serviceReviews;
    }
    const previewReviews = mapToPreview(reviewSource);

    return {
      id: serviceId,
      title: service.title,
      description: service.description,
      images,
      packages: (service.pricing || []).map((pkg) => ({
        title: pkg.title,
        price: pkg.price,
        features: pkg.features || [],
        popular: pkg.popular,
        deliveryDays: pkg.deliveryDays,
      })),
      features: service.features || [],
      rating: service.rating,
      reviewCount: previewReviews.length || service.reviewCount || service.reviews?.length || 0,
      customers: service.customers,
      completedJobs: service.completedJobs,
      experience: expRaw || null,
      satisfaction: service.satisfaction,
      workingHours: workingHoursNorm,
      certificates: service.certificates || [],
      faq: service.faq || [],
      serviceAreas: areas,
      category_name: 'Hizmet',
      konum,
      user_id: userData?.id ?? userData?.user_id,
      quickActionPrefs: service.quickActionPrefs
        ? { ...defaultQuickActionPrefs, ...service.quickActionPrefs }
        : { ...defaultQuickActionPrefs },
      previewProvider: {
        name: userData?.fullName || userData?.name || currentUser?.name || service.user?.name || 'Hizmet Sağlayıcı',
        profileImage:
          userData?.profileImage ||
          userData?.profilePicture ||
          currentUser?.profileImage ||
          currentUser?.profilePicture ||
          currentUser?.picture ||
          getAccountProfileImageUrl(currentUser) ||
          service.user?.profileImage ||
          null,
        responseRate: service.responseRate || '1 saat',
        bio: userData?.bio || service.user?.bio || '',
      },
      previewReviews,
    };
  }, [service, serviceId, coverImage, selectedServiceAreas, userData, serviceReviews, reviewIlanId, currentUser]);

  const onOwnerEdit = (section) => setEditSection(section);
  const closeEditor = useCallback(() => setEditSection(null), []);

  const modalFooterBtn = useCallback(
    (label) => (
      <div className="soe-modal__footer-actions">
        <button type="button" className="soe-modal__btn soe-modal__btn--primary" onClick={closeEditor}>
          {label}
        </button>
        </div>
    ),
    [closeEditor],
      );

  const [showContractModal, setShowContractModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [contractError, setContractError] = useState('');

  const handleOwnerSubmitForApproval = () => {
    setContractError('');
    setShowContractModal(true);
  };

  const handleConfirmSubmitForApproval = async () => {
    if (!acceptedTerms || !acceptedContract) {
      setContractError('Lütfen devam etmek için tüm sözleşmeleri onaylayın.');
      return;
    }
    const backendListingId = resolveServiceAreasListingId(id, reviewIlanId);
    if (!backendListingId) {
      setContractError('İlan ID bulunamadı.');
      return;
    }
    try {
      setSubmittingApproval(true);
      setContractError('');

      // 1. Alt kaynakları (paketler, çalışma saatleri, SSS, özellikler) sadece doluysa kaydet
      const subTasks = [];
      if (Array.isArray(service.pricing) && service.pricing.length > 0) {
        subTasks.push(listingEditAPI.savePackages(backendListingId, service.pricing));
      }
      if (service.workingHours && typeof service.workingHours === 'object') {
        subTasks.push(listingEditAPI.saveWorkingHours(backendListingId, service.workingHours));
      }
      if (Array.isArray(service.faq) && service.faq.length > 0) {
        subTasks.push(listingEditAPI.saveFaq(backendListingId, service.faq));
      }
      if (Array.isArray(service.features) && service.features.length > 0) {
        subTasks.push(listingEditAPI.saveFeatures(backendListingId, service.features));
      }
      if (subTasks.length > 0) {
        await Promise.allSettled(subTasks);
      }

      // 2. Ana ilanı onaya gönder (kısmi güncellemede boş diziler mevcut veriyi ezmesin)
      const payload = {
        title: service.title,
        baslik: service.title,
        description: service.description,
        aciklama: service.description,
        ...(Array.isArray(service.pricing) && service.pricing.length > 0 ? { pricing_packages: service.pricing } : {}),
        ...(Array.isArray(service.features) && service.features.length > 0 ? { features: service.features } : {}),
        ...(Array.isArray(service.faq) && service.faq.length > 0 ? { faq: service.faq } : {}),
        ...(service.workingHours ? { working_hours: service.workingHours } : {}),
        certificates: service.certificates || [],
        photos: coverImage ? [coverImage, ...(service.gallery || [])] : (service.gallery || []),
        quick_action_prefs: service.quickActionPrefs,
        status: 'pending_approval',
        onay_durumu: 'duzenleme_onay_bekliyor',
        terms_accepted: true,
        contract_accepted: true,
      };

      await ListingService.updateListing(Number(backendListingId), payload);
      toast.success('Hizmet düzenlemeniz başarıyla kaydedildi ve yönetici onayına gönderildi.', { duration: 5000 });
      setShowContractModal(false);
      router.push('/dashboard/onay-bekleyen-ilanlar');
    } catch (err) {
      console.error('[ServiceEdit] Onaya gönderme hatası:', err);
      const errMsg = err?.message || 'Düzenleme onaya gönderilirken bir hata oluştu. Lütfen tekrar deneyin.';
      setContractError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmittingApproval(false);
    }
  };

  if (loading && !service.title && !(service.gallery || []).length) {
    return <div className="soe-loading">Yükleniyor…</div>;
    }

    return (
    <>
    <div className="service-dashboard-editor-root">
      <ServiceDetailPage
        key={`owner-sd-${id ?? 'edit'}`}
        previewData={buildServicePreviewPayload()}
        embedInDashboard
        ownerEditMode
        suppressContactActions
        onOwnerEdit={onOwnerEdit}
        onOwnerBack={() => {
          if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
          } else if (
            typeof window !== 'undefined' &&
            (window.location.pathname.includes('/ilan-duzenle') || window.location.pathname.includes('/ilanlar/duzenle'))
          ) {
            router.push('/dashboard/aktif-ilanlar');
          } else {
            router.push('/dashboard/hizmet-alanlari');
          }
        }}
        onOwnerSubmitForApproval={handleOwnerSubmitForApproval}
        onOwnerPublicPreview={() => setPublicPreviewOpen(true)}
        ownerNavTab={ownerDetailNavTab}
        onOwnerNavTabChange={setOwnerDetailNavTab}
      />

      {editSection === 'title' && (
        <ServiceOwnerEditModal title="İlan Başlığı" onClose={closeEditor}>
          <div style={{ padding: '0.5rem 0' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              İlan Başlığı * (En fazla 70 karakter)
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                fontSize: '0.95rem',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                boxSizing: 'border-box'
              }}
              value={service.title || ''}
              onChange={(e) => setService((prev) => ({ ...prev, title: e.target.value.slice(0, 70) }))}
              placeholder="Örn: Profesyonel Mobil Uygulama ve Yazılım Geliştirme Hizmeti"
              maxLength={70}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
              <span>Arama sonuçlarında ve ilan kartlarında görünür.</span>
              <span>{(service.title || '').length}/70 karakter</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={closeEditor}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const title = (service.title || '').trim();
                  if (!title) {
                    alert('İlan başlığı boş olamaz.');
                    return;
                  }
                  const listingId = resolveServiceAreasListingId(id, reviewIlanId);
                  if (listingId != null) {
                    try {
                      await ListingService.updateListing(Number(listingId), { title, baslik: title });
                      toast.success('İlan başlığı güncellendi');
                    } catch (e) {
                      console.warn('[ServiceEdit] Başlık güncellenirken bildirim:', e);
                    }
                  }
                  closeEditor();
                }}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#6366f1',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </ServiceOwnerEditModal>
      )}

      {editSection === 'cover' && (
        <ServiceOwnerEditModal title="Kapak fotoğrafı" onClose={closeEditor} footer={modalFooterBtn('Tamam')}>
          <p className="soe-cover-hint">Yeni kapak yükleyin; önizlemede ilk görsel olarak kullanılır.</p>
          <label className="soe-cover-upload">
            <input type="file" accept="image/*" onChange={handleCoverImageChange} />
            Kapak görseli seç
          </label>
        {coverImage ? (
            <div className="soe-cover-preview">
              <img src={coverImage} alt="" />
          </div>
          ) : null}
        </ServiceOwnerEditModal>
      )}

      {editSection === 'description' && (
        <ServiceOwnerEditModal title="Hizmet açıklaması" onClose={closeEditor}>
          <ServiceDescription
            description={service.description}
            onUpdate={async (newDesc) => {
              setService((prev) => ({ ...prev, description: newDesc }));
              const listingId = resolveServiceAreasListingId(id, reviewIlanId);
              if (listingId != null) {
                try {
                  await ListingService.updateListing(Number(listingId), { description: newDesc, aciklama: newDesc });
                } catch (e) {
                  console.warn('[ServiceEdit] Açıklama güncellenirken bildirim:', e);
                }
              }
              closeEditor();
            }}
          />
        </ServiceOwnerEditModal>
      )}

      {editSection === 'packages' && (
        <ServiceOwnerEditModal title="Paketler ve fiyatlandırma" onClose={closeEditor}>
      <ServicePricing
        pricing={service.pricing}
            onViewAllPackages={closeEditor}
            onUpdate={(p) => {
              handlePricingUpdate(p);
              closeEditor();
            }}
          />
        </ServiceOwnerEditModal>
      )}

      {editSection === 'features' && (
        <ServiceOwnerEditModal title="Hizmet özellikleri" onClose={closeEditor}>
          <ServiceFeatures
            features={service.features}
            onUpdate={(f) => {
              handleFeaturesUpdate(f);
              closeEditor();
            }}
          />
        </ServiceOwnerEditModal>
      )}

      {editSection === 'gallery' && (
        <ServiceOwnerEditModal title="Galeri" onClose={closeEditor} footer={modalFooterBtn('Kapat')}>
          <ServiceGallery images={service.gallery} onUpdate={handleGalleryUpdate} onImageClick={null} />
        </ServiceOwnerEditModal>
      )}

      {editSection === 'reviews' && (
        <ServiceOwnerEditModal title="Müşteri Yorumları ve Yanıt Yönetimi" onClose={closeEditor} footer={modalFooterBtn('Kapat')}>
          <ServiceReviewResponse
            reviews={service.reviews?.length ? service.reviews : serviceReviews}
            onUpdate={handleReviewsUpdate}
            serviceId={reviewIlanId != null ? reviewIlanId : serviceId}
            ownerModalEmbed
          />
        </ServiceOwnerEditModal>
      )}

      {editSection === 'workingHours' && (
        <ServiceOwnerEditModal title="Çalışma saatleri" onClose={closeEditor} footer={modalFooterBtn('Kapat')}>
          <ServiceWorkingHours workingHours={service.workingHours} onUpdate={handleWorkingHoursUpdate} />
        </ServiceOwnerEditModal>
      )}

      {editSection === 'certificates' && (
        <ServiceOwnerEditModal title="Sertifikalar" onClose={closeEditor} footer={modalFooterBtn('Kapat')}>
          <ServiceCertificates certificates={service.certificates} onUpdate={handleCertificatesUpdate} />
        </ServiceOwnerEditModal>
      )}

      {editSection === 'faq' && (
        <ServiceOwnerEditModal title="Sıkça sorulan sorular" onClose={closeEditor} footer={modalFooterBtn('Kapat')}>
          <ServiceFAQ faq={service.faq} onUpdate={handleFAQUpdate} />
        </ServiceOwnerEditModal>
      )}

      {editSection === 'serviceAreas' && (
        <ServiceOwnerEditModal title="Hizmet bölgeleri" onClose={closeEditor}>
          <ServiceAreaSelector
            embedded
            listingId={id}
            existingAreas={selectedServiceAreas}
            onSave={(payload) => handleServiceAreasUpdate(payload)}
          />
        </ServiceOwnerEditModal>
      )}

      {editSection === 'contactChannels' && (
        <ServiceOwnerEditModal title="Müşteri iletişim kanalları" onClose={closeEditor} footer={modalFooterBtn('Kapat')}>
          <div className="soe-prefs">
            <p className="soe-prefs__hint">
              <strong>İletişim bilgileri</strong> (telefon, WhatsApp numarası vb.) hesabınızda{' '}
              <strong>İletişim bilgileri</strong> ekranından değişir. Burada sadece bu hizmet ilanında{' '}
              <strong>hangi kısayolların görüneceğini</strong> işaretlersiniz.
            </p>
            <ul className="soe-prefs__list">
              <li>
                <label className="soe-prefs__row">
                  <input
                    type="checkbox"
                    checked={!!service.quickActionPrefs?.whatsapp}
                    onChange={() =>
                      setService((prev) => ({
                        ...prev,
                        quickActionPrefs: {
                          ...defaultQuickActionPrefs,
                          ...prev.quickActionPrefs,
                          whatsapp: !prev.quickActionPrefs?.whatsapp,
                        },
                      }))
                    }
                  />
                  <span>WhatsApp kısayolu (özet yan sütun)</span>
                </label>
              </li>
              <li>
                <label className="soe-prefs__row">
                  <input
                    type="checkbox"
                    checked={!!service.quickActionPrefs?.message}
                    onChange={() =>
                      setService((prev) => ({
                        ...prev,
                        quickActionPrefs: {
                          ...defaultQuickActionPrefs,
                          ...prev.quickActionPrefs,
                          message: !prev.quickActionPrefs?.message,
                        },
                      }))
                    }
                  />
                  <span>Site içi mesaj (özet + mobil alt çubuk)</span>
                </label>
              </li>
              <li>
                <label className="soe-prefs__row">
                  <input
                    type="checkbox"
                    checked={!!service.quickActionPrefs?.phone}
                    onChange={() =>
                      setService((prev) => ({
                        ...prev,
                        quickActionPrefs: {
                          ...defaultQuickActionPrefs,
                          ...prev.quickActionPrefs,
                          phone: !prev.quickActionPrefs?.phone,
                        },
                      }))
                    }
                  />
                  <span>Telefon — Hemen Ara (üst başlık + mobil)</span>
                </label>
              </li>
              <li>
                <label className="soe-prefs__row">
                  <input
                    type="checkbox"
                    checked={!!service.quickActionPrefs?.appointment}
                    onChange={() =>
                      setService((prev) => ({
                        ...prev,
                        quickActionPrefs: {
                          ...defaultQuickActionPrefs,
                          ...prev.quickActionPrefs,
                          appointment: !prev.quickActionPrefs?.appointment,
                        },
                      }))
                    }
                  />
                  <span>Randevu al (üst başlık, paketler ve mobil)</span>
                </label>
              </li>
            </ul>
            <label className="soe-prefs__field">
              <span className="soe-prefs__label">Yanıt süresi ifadesi</span>
              <input
                type="text"
                className="soe-prefs__input"
                value={service.responseRate || ''}
                onChange={(e) => setService((prev) => ({ ...prev, responseRate: e.target.value }))}
                placeholder="örn. 1 saat"
                autoComplete="off"
              />
            </label>
            <p className="soe-prefs__note">“Genelde … içinde yanıtlar” metninde kullanılır.</p>
          </div>
        </ServiceOwnerEditModal>
      )}

    </div>

      {publicPreviewOpen ? (
        <div className="service-edit-public-preview" role="dialog" aria-modal="true" aria-label="Müşteri ön izlemesi">
          <div className="service-edit-public-preview__bar">
            <span className="service-edit-public-preview__label">Ön izleme — müşterilerin göreceği sayfa (taslak veriler)</span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button type="button" className="service-edit-public-preview__close" onClick={() => setPublicPreviewOpen(false)}>
                Düzenlemeye dön
              </button>
              <button
                type="button"
                className="service-detail__cover-submit-btn"
                style={{ position: 'static' }}
                onClick={() => {
                  setPublicPreviewOpen(false);
                  handleOwnerSubmitForApproval();
                }}
              >
                <FaCheckCircle size={14} />
                <span>Onaya Gönder</span>
              </button>
            </div>
          </div>
          <div className="service-edit-public-preview__scroll">
            <ServiceDetailPage
              previewData={buildServicePreviewPayload()}
              publishedPreviewChrome
              onOwnerBack={() => setPublicPreviewOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {/* ── SÖZLEŞMELER & ONAYA GÖNDERME MODALI (iOS Kurumsal Tasarım) ── */}
      {showContractModal && (
        <div
          className="soe-contract-overlay"
          onClick={() => !submittingApproval && setShowContractModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="soe-contract-title"
        >
          <div className="soe-contract-modal" onClick={(e) => e.stopPropagation()}>
            {/* iOS Sheet Handle (Tutma Çizgisi) */}
            <div className="soe-contract-sheet-handle" />

            {/* Kapat butonu */}
            <button
              type="button"
              className="soe-contract-close-btn"
              onClick={() => !submittingApproval && setShowContractModal(false)}
              aria-label="Kapat"
              title="Kapat"
            >
              <FaTimes size={14} />
            </button>

            {/* iOS Rozet / İkon */}
            <div className="soe-contract-badge-wrapper">
              <div className="soe-contract-badge-squircle">
                <FaFileContract className="soe-contract-badge-svg" />
              </div>
            </div>

            {/* Başlık & Alt Metin */}
            <div className="soe-contract-header">
              <h2 id="soe-contract-title" className="soe-contract-title">Sözleşmeler & Kurallar</h2>
              <p className="soe-contract-sub">
                Hizmet ilanı düzenlemelerinizi yönetici onayına göndermeden önce aşağıdaki sözleşmeleri onaylayın.
              </p>
            </div>

            {/* iOS Inset Grouped Sözleşme Seçimleri */}
            <div className="soe-contract-inset-group">
              <label className={`soe-contract-item-row ${acceptedTerms ? 'is-selected' : ''}`}>
                <div className="soe-contract-check-wrap">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="soe-contract-hidden-checkbox"
                  />
                  <div className={`soe-contract-ios-checkbox ${acceptedTerms ? 'checked' : ''}`}>
                    <FaCheckCircle className="soe-contract-check-icon" />
                  </div>
                </div>
                <div className="soe-contract-item-content">
                  <span className="soe-contract-item-text">
                    <Link
                      href="/kullanim-sartlari"
                      target="_blank"
                      className="soe-contract-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Kullanım Şartları
                      <FaExternalLinkAlt className="soe-contract-link-icon" />
                    </Link>
                    &apos;nı okudum ve kabul ediyorum
                    <span className="soe-contract-required" title="Zorunlu alan"> *</span>
                  </span>
                </div>
              </label>

              <div className="soe-contract-divider" />

              <label className={`soe-contract-item-row ${acceptedContract ? 'is-selected' : ''}`}>
                <div className="soe-contract-check-wrap">
                  <input
                    type="checkbox"
                    checked={acceptedContract}
                    onChange={(e) => setAcceptedContract(e.target.checked)}
                    className="soe-contract-hidden-checkbox"
                  />
                  <div className={`soe-contract-ios-checkbox ${acceptedContract ? 'checked' : ''}`}>
                    <FaCheckCircle className="soe-contract-check-icon" />
                  </div>
                </div>
                <div className="soe-contract-item-content">
                  <span className="soe-contract-item-text">
                    <Link
                      href="/ilan-sozlesmesi"
                      target="_blank"
                      className="soe-contract-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      İlan Yayınlama Sözleşmesi
                      <FaExternalLinkAlt className="soe-contract-link-icon" />
                    </Link>
                    &apos;ni okudum ve kabul ediyorum
                    <span className="soe-contract-required" title="Zorunlu alan"> *</span>
                  </span>
                </div>
              </label>
            </div>

            {/* iOS Bilgilendirme Notu (Callout) */}
            <div className="soe-contract-notice-box">
              <div className="soe-contract-notice-icon-box">
                <FaClock className="soe-contract-notice-icon" />
              </div>
              <div className="soe-contract-notice-content">
                <p>
                  Düzenlemeniz <strong>24 saat içinde</strong> ekibimizce incelenerek
                  onay sonrasında yayına alınacaktır.
                </p>
              </div>
            </div>

            {/* Hata Bildirimi (Varsa) */}
            {contractError && (
              <div className="soe-contract-error-box">
                <FaExclamationTriangle className="soe-contract-error-icon" />
                <span>{contractError}</span>
              </div>
            )}

            {/* iOS Aksiyon Butonları */}
            <div className="soe-contract-actions">
              <button
                type="button"
                className="soe-contract-btn-secondary"
                onClick={() => setShowContractModal(false)}
                disabled={submittingApproval}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="soe-contract-btn-primary"
                onClick={handleConfirmSubmitForApproval}
                disabled={!acceptedTerms || !acceptedContract || submittingApproval}
              >
                {submittingApproval ? (
                  <>
                    <span className="soe-contract-spinner" />
                    <span>Gönderiliyor...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="soe-contract-btn-icon" />
                    <span>Onayla ve Onaya Gönder</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServiceEdit; 
