"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import './ServiceDetailPage.css';
import './ServiceDetailPage.mobile.css';
import {
  FaStar, FaUsers, FaClock, FaThumbsUp, FaPhone, FaWhatsapp, FaEnvelope,
  FaCheckCircle, FaMapMarkerAlt, FaArrowLeft, FaUserCircle, FaUser,
  FaCalendarAlt, FaQuestionCircle, FaChevronDown, FaChevronRight, FaHeart,
  FaShare, FaShieldAlt, FaAward, FaChartLine, FaGlobe, FaExpand,
  FaChevronLeft, FaTimes, FaEdit, FaFlag, FaReply,
} from 'react-icons/fa';

import Breadcrumb2 from '@/components/Breadcrumb2/Breadcrumb2';
import Loader from '@/components/Loader/Loader';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage';
import ServiceDetailReviews from './components/ServiceDetailReviews/ServiceDetailReviews';
import ServiceDetailGallery from './components/ServiceDetailGallery/ServiceDetailGallery';
import AdBanner from '@/components/AdvertisementBanner/AdBanner';
import AppointmentModal from './components/AppointmentModal/AppointmentModal';
import useCategoryPath from '@/hooks/useCategoryPath';
import * as messageService from '@/services/message/messageService';
import authService from '@/services/auth/authService';
import useProductDetailController from '@/Page/ProductDetail/useProductDetailController';
import { decodeHtmlEntities, safeParseArray } from '@/services/listings/util/listingUtils';
import favoriteService from '@/services/favorites/favoriteService';
import { useFavorites } from '@/context/FavoritesContext';
import { useAuth } from '@/context/AuthContext';
import { getWorkingHoursByIlanId, getReviewsByIlanId } from '@/services/productDetail/productDetailService';
import { submitAppointmentRequest } from '@/services/appointment/appointmentService';
import ComplaintModal from '@/components/ComplaintModal/ComplaintModal';
import { getIconForTitle } from '@/Page/Dashboard/Pages/ServiceAreas/Components/ServiceFeatures/ServiceFeaturesList';
import {
  SERVICE_LISTING_COVER_PLACEHOLDER,
  SERVICE_LISTING_COVER_PLACEHOLDER_MOBILE,
} from '@/lib/serviceListingAssets';

/** Panelde ilan detayı görünümünde içerik düzenleme */
export type ServiceOwnerEditSection =
  | 'cover'
  | 'description'
  | 'packages'
  | 'features'
  | 'gallery'
  | 'reviews'
  | 'workingHours'
  | 'certificates'
  | 'faq'
  | 'serviceAreas'
  /** Bu ilanda hangi iletişim kanalları görünsün (numara içeriği profilden) */
  | 'contactChannels';

interface ServiceDetailPageProps {
  initialProduct?: Record<string, unknown> | null;
  previewData?: Record<string, unknown>;
  /** Panel içinde (dashboard) tam genişlik önizleme */
  embedInDashboard?: boolean;
  /** Hizmet sahibi düzenleme: ilan detayı aynı kalır, bölümler için düzenle tetiklenir */
  ownerEditMode?: boolean;
  /**
   * Panelde düzenlerken: Ara / Mesaj / Randevu ve paket randevu düğmelerini gizler.
   * Numara/WhatsApp içeriği profil → İletişim bilgileri; hangi kanalların açık olduğu bu sayfadan düzenlenir.
   */
  suppressContactActions?: boolean;
  onOwnerEdit?: (section: ServiceOwnerEditSection) => void;
  onOwnerBack?: () => void;
  /** Panel düzenleme: kapak sağ üst — tam ekran müşteri ön izlemesi */
  onOwnerPublicPreview?: () => void;
  /** Hizmet düzenleme: düzenlemeleri yönetici onayına gönderme */
  onOwnerSubmitForApproval?: () => void;
  /**
   * Tam sayfa müşteri ön izlemesi: taslak veriyle bile /ilan/[id] ile aynı 3 sütunlu düzen
   * (sol reklam + ana + sağ sidebar). `preview-mode` (780+340) kullanılmaz.
   */
  publishedPreviewChrome?: boolean;
  /**
   * Dashboard hizmet düzenleme: sekme state üstte tutulur; alt önizleme yeniden mount olsa bile
   * (veri güncellemesi, Strict Mode vb.) aktif sekme korunur.
   */
  ownerNavTab?: string;
  onOwnerNavTabChange?: (tab: string) => void;
  /** Hizmet ilanı devre dışı: aynı disabled mesajı göster */
  serviceDisabled?: boolean;
}

interface AuthContextValue { isAuthenticated: boolean; }

interface PackageItem {
  title: string;
  price: number | string;
  popular?: boolean;
  deliveryDays?: number;
  features: Array<string | Record<string, string>>;
}

interface FaqItem { question: string; answer: string; }
interface CertificateItem { name: string; date: string; }
interface ModalContent { title?: string; message?: string; type?: string; }

interface QuickActionPrefs {
  whatsapp: boolean;
  message: boolean;
  phone: boolean;
  appointment: boolean;
}

function normalizeQuickActionPrefs(raw: unknown): QuickActionPrefs {
  const d: QuickActionPrefs = { whatsapp: true, message: true, phone: true, appointment: true };
  if (!raw) return d;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeQuickActionPrefs(parsed);
      } catch {
        if (trimmed.includes('whatsapp=false')) d.whatsapp = false;
        if (trimmed.includes('message=false')) d.message = false;
        if (trimmed.includes('phone=false')) d.phone = false;
        if (trimmed.includes('appointment=false')) d.appointment = false;
        return d;
      }
    }
  }
  if (typeof raw !== 'object') return d;
  const o = raw as Record<string, unknown>;
  if (o.whatsapp === false || o.whatsapp === 'false') d.whatsapp = false;
  if (o.message === false || o.message === 'false') d.message = false;
  if (o.phone === false || o.phone === 'false') d.phone = false;
  if (o.appointment === false || o.appointment === 'false') d.appointment = false;
  return d;
}

const dayNames: Record<string, string> = {
  monday: 'Pazartesi', tuesday: 'Salı', wednesday: 'Çarşamba',
  thursday: 'Perşembe', friday: 'Cuma', saturday: 'Cumartesi', sunday: 'Pazar',
};

function formatReviewerDisplayName(name: unknown): string {
  const cleaned = String(name ?? '').trim();
  if (!cleaned) return 'Müşteri';
  if (cleaned.includes('*')) return cleaned;
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (part.length <= 1 ? part : part[0] + '*'.repeat(Math.min(Math.max(part.length - 1, 2), 6))))
    .join(' ');
}

function OwnerEditTrigger({
  section,
  ownerEditMode,
  onOwnerEdit,
  label,
  layout = 'inline',
}: {
  section: ServiceOwnerEditSection;
  ownerEditMode?: boolean;
  onOwnerEdit?: (s: ServiceOwnerEditSection) => void;
  /** Varsayılan: Düzenle; yorumlar için örn. "Düzenle / Yanıtla" */
  label?: string;
  /** Kapak: foto üzerinde (masaüstü). Mobil için ayrıca header içinde `headerMobile` kopyası gösterilir. */
  layout?: 'inline' | 'cover' | 'headerMobile';
}) {
  if (!ownerEditMode || !onOwnerEdit) return null;
  const text = label ?? (section === 'reviews' ? 'Düzenle / Yanıtla' : 'Düzenle');
  const layoutClass =
    layout === 'cover'
      ? ' service-detail__owner-edit-trigger--on-cover'
      : layout === 'headerMobile'
        ? ' service-detail__owner-edit-trigger--header-mobile'
        : '';
  return (
    <button
      type="button"
      className={`service-detail__owner-edit-trigger${layoutClass}`}
      onClick={() => onOwnerEdit(section)}
    >
      <FaEdit size={14} aria-hidden />
      <span>{text}</span>
    </button>
  );
}

const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({
  initialProduct,
  previewData,
  embedInDashboard = false,
  ownerEditMode = false,
  suppressContactActions = false,
  onOwnerEdit,
  onOwnerBack,
  onOwnerPublicPreview,
  onOwnerSubmitForApproval,
  publishedPreviewChrome = false,
  ownerNavTab,
  onOwnerNavTabChange,
  serviceDisabled = false,
}) => {
  const params = useParams();
  const router = useRouter();
  const ilanId = params?.ilanId as string | undefined;
  const isPreview = !!previewData;
  const usePublishedPreviewLayout = Boolean(isPreview && publishedPreviewChrome);
  const { isAuthenticated } = useAuth() as AuthContextValue;

  // Hizmet ilanı devre dışı - basit mesaj göster
  // SADECE serviceDisabled prop'u true ise devre dışı mesajı göster
  if (serviceDisabled === true && !isPreview) {
    return (
      <div className="service-disabled-container" style={{
        maxWidth: '600px',
        margin: '40px auto',
        padding: '40px 24px',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>
          Hizmet İlanı
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 4px 0', lineHeight: 1.5 }}>
          Bu hizmet ilanı şu anda devre dışıdır.
        </p>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
          İlanınız onay sonrasında doğru formatta yayınlanacaktır.
        </p>
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px',
          textAlign: 'left',
        }}>
          {previewData?.title && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Başlık:</span>
              <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>{String(previewData.title)}</span>
            </div>
          )}
          {previewData?.category && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Kategori:</span>
              <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>{String((previewData.category as Record<string, unknown>)?.name || previewData.category)}</span>
            </div>
          )}
          {(previewData?.city || previewData?.district) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Konum:</span>
              <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>{[previewData.city, previewData.district].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {previewData?.images && Array.isArray(previewData.images) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Fotoğraf:</span>
              <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>{previewData.images.length} adet</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const [localActiveTab, setLocalActiveTab] = useState<string>('overview');
  const navControlled = typeof onOwnerNavTabChange === 'function';
  const activeTab = navControlled ? (ownerNavTab ?? 'overview') : localActiveTab;
  const setActiveTab = (key: string) => {
    if (navControlled) onOwnerNavTabChange!(key);
    else setLocalActiveTab(key);
  };
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalContent, setModalContent] = useState<ModalContent>({});
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [miniReviews, setMiniReviews] = useState<Array<{ id: unknown; user: string; rating: number; comment: string; date: string; response?: string | null }>>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState<boolean>(false);
  const [appointmentData, setAppointmentData] = useState<Record<string, unknown>>({});
  const [complaintModalOpen, setComplaintModalOpen] = useState<boolean>(false);

  const { product: apiProduct, loading: controllerLoading, error, seller: sellerFromApi } = useProductDetailController(isPreview || initialProduct ? null : ilanId);
  const loading = !initialProduct && controllerLoading;
  const seller = (initialProduct?.ilan_sahibi || initialProduct?.seller || sellerFromApi) as Record<string, unknown> | undefined;

  const [isOwner, setIsOwner] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentUser = authService.getCurrentUser();
    const currentUserId = (currentUser as any)?.id || (currentUser as any)?.user_id || (currentUser as any)?.userId;
    const targetSellerId = seller?.id || seller?.user_id || (apiProduct as any)?.user_id || (apiProduct as any)?.ilan_sahibi?.user_id || (apiProduct as any)?.ilan_sahibi?.id;
    if (currentUserId && targetSellerId && String(currentUserId) === String(targetSellerId)) {
      setIsOwner(true);
    } else {
      setIsOwner(false);
    }
  }, [seller, apiProduct]);

  const product = isPreview ? (() => {
    const pd = previewData!;
    const converted: Record<string, unknown> = { ...pd };
    converted.ilan_id = pd.id || pd.ilan_id || 'preview';
    converted.ilan_tip = 'hizmet';
    if (!converted.ilan_tarihi) converted.ilan_tarihi = new Date().toISOString();
    if (pd.title && !pd.baslik) converted.baslik = pd.title;
    if (pd.description && !pd.aciklama) converted.aciklama = pd.description;
    if (pd.price !== undefined && pd.fiyat === undefined) converted.fiyat = pd.price;
    if (pd.city && !pd.il) converted.il = pd.city;
    if (pd.district && !pd.ilce) converted.ilce = pd.district;
    if (pd.images && !pd.resimler) {
      converted.resimler = (pd.images as Array<unknown>).map((img) => {
        if (typeof img === 'object' && img !== null) { const o = img as Record<string, string>; return o.url || o.preview || ''; }
        return img as string;
      }).filter(Boolean);
    }
    if (pd.category && !pd.kategori) converted.kategori = pd.category;
    if (pd.category_name && !converted.category_name) converted.category_name = pd.category_name;
    if (pd.konum && !converted.konum) converted.konum = pd.konum;
    if (pd.previewProvider) converted.previewProvider = pd.previewProvider;
    if (pd.bio) {
      const pp = (converted.previewProvider || {}) as Record<string, unknown>;
      converted.previewProvider = { ...pp, bio: String(pd.bio) };
    }
    if (Array.isArray(pd.previewReviews)) converted.previewReviews = pd.previewReviews;
    if (pd.user_id != null && converted.user_id == null) converted.user_id = pd.user_id;
    if (pd.quickActionPrefs != null) converted.quickActionPrefs = pd.quickActionPrefs;
    if (!converted.ozellikler) {
      converted.ozellikler = {};
      try {
        const labelsData = sessionStorage.getItem('categoryFieldLabels');
        if (labelsData) {
          const labels = JSON.parse(labelsData) as Record<string, unknown>;
          Object.keys(labels).forEach((key) => {
            const value = pd[key];
            if (value !== null && value !== undefined && value !== '' && value !== false) {
              (converted.ozellikler as Record<string, unknown>)[key] = value;
            }
          });
        }
      } catch { /* ignore */ }
    }
    return converted;
  })() : (((initialProduct || apiProduct) ?? {}) as Record<string, unknown>);

  const apiCategoryData = useCategoryPath(
    isPreview ? '' : String((product as Record<string, unknown>)?.ilan_id ?? ''),
  );
  const categoryPath = isPreview ? (() => { try { const p = sessionStorage.getItem('previewCategoryPath'); return p ? JSON.parse(p) : []; } catch { return []; } })() : apiCategoryData?.categoryPath;
  const adTitle = isPreview ? (() => { try { return sessionStorage.getItem('previewAdTitle') || (product as Record<string, unknown>)?.baslik || ''; } catch { return (product as Record<string, unknown>)?.baslik || ''; } })() : apiCategoryData?.adTitle;
  const categoryLoading = isPreview ? false : apiCategoryData?.loading;

  const p = product as Record<string, unknown>;

  useEffect(() => {
    const mapRawReview = (r: Record<string, unknown>, idx: number) => {
      const rawUser =
        r.user ??
        r.user_name ??
        r.userName ??
        r.reviewerName ??
        r.reviewer_name ??
        r.customerName ??
        'Müşteri';
      const rawDate =
        r.date ??
        r.serviceDate ??
        (typeof r.createdAt === 'string' ? r.createdAt.split('T')[0] : '') ??
        '';
      const rawResponse =
        r.response ?? r.reply ?? r.seller_response ?? r.providerResponse ?? null;
      return {
        id: r.id ?? r.comment_id ?? idx,
        user: String(rawUser || 'Müşteri').trim() || 'Müşteri',
        rating: Number(r.rating) || 5,
        comment: String(r.comment ?? r.comment_text ?? r.content ?? ''),
        date: String(rawDate || ''),
        response:
          rawResponse != null && String(rawResponse).trim() !== ''
            ? String(rawResponse).trim()
            : null,
      };
    };

    if (isPreview) {
      const prevRev = p?.previewReviews as unknown[] | undefined;
      if (Array.isArray(prevRev)) {
        setReviewCount(prevRev.length);
        setMiniReviews(
          (prevRev as Array<Record<string, unknown>>).map((r, idx) => mapRawReview(r, idx))
        );
      } else if (previewData?.reviewCount != null) {
        setReviewCount(Number(previewData.reviewCount));
        setMiniReviews([]);
      } else {
        setReviewCount(0);
        setMiniReviews([]);
      }
      return;
    }
    if (p?.ilan_id) {
      void (async () => {
        try {
          const revs = await getReviewsByIlanId(parseInt(String(p.ilan_id), 10));
          setReviewCount(revs.length);
          setMiniReviews(
            (revs as Array<Record<string, unknown>>).map((r, idx) => mapRawReview(r, idx))
          );
        } catch {
          setReviewCount(0);
          setMiniReviews([]);
        }
      })();
    }
  }, [p?.ilan_id, isPreview, p?.previewReviews, previewData?.reviewCount]);

  useEffect(() => {
    if (selectedImageIndex === null) return;
    const images = (serviceData.gallery || []) as string[];
    if (!images.length) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : (prev as number) - 1));
      else if (e.key === 'ArrowRight') setSelectedImageIndex((prev) => ((prev as number) === images.length - 1 ? 0 : (prev as number) + 1));
      else if (e.key === 'Escape') setSelectedImageIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = 'auto'; };
  }, [selectedImageIndex]);

  if (!isPreview && loading) return <div className="service-detail-loading"><Loader /></div>;
  if (!isPreview && error) return <ErrorMessage type="error" message={error} initialCountdown={5} onCountdownEnd={() => { window.location.href = '/'; }} />;
  if (!isPreview && !product) return <ErrorMessage type="not-found" message="Hizmet bulunamadı" initialCountdown={5} onCountdownEnd={() => { window.location.href = '/'; }} />;

  const handleToggleFavorite = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push(`/giris?redirect_after=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const btn = e.currentTarget;
    btn.classList.add('heart-clicked');
    setTimeout(() => btn.classList.remove('heart-clicked'), 800);

    const currentFav = isFavorite || (p?.ilan_id ? checkIsFavorite(p.ilan_id) : false);

    if (currentFav) {
      setIsFavorite(false);
      window.dispatchEvent(new CustomEvent('acillazim-favorite-update', { detail: { listingId: p?.ilan_id, isFavorite: false } }));
      if (p?.ilan_id) void favoriteService.removeFromFavorites(p.ilan_id as string | number);
    } else {
      if (p?.ilan_id && typeof openFavoriteModal === 'function') {
        openFavoriteModal(p.ilan_id as string | number, serviceData);
      } else if (p?.ilan_id) {
        window.dispatchEvent(new CustomEvent('acillazim-open-favorite-modal', { detail: { listingId: p.ilan_id, listingData: serviceData } }));
      }
    }
  };

  const navigateToUserProfile = () => {
    if (isPreview) return;
    const userId = p?.user_id || seller?.id;
    if (userId) window.location.href = `/profile/${userId}`;
  };

  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: String(p.baslik || ''), text: `${serviceData.user.name} - ${String(p.baslik || '')}`, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); alert('Link kopyalandı!'); }
    } catch { try { await navigator.clipboard.writeText(window.location.href); alert('Link kopyalandı!'); } catch { /* ignore */ } }
  };

  const getDayName = (day: string): string => dayNames[day] || day;

  const openAppointmentModal = (selectedPackage: PackageItem | null = null) => {
    if (!isAuthenticated) { alert('Randevu almak için giriş yapmanız gerekmektedir.'); window.location.href = '/giris'; return; }
    setAppointmentData({ service: serviceData, selectedPackage });
    setShowAppointmentModal(true);
  };

  const closeAppointmentModal = () => { setShowAppointmentModal(false); setAppointmentData({}); };
  const handleAppointmentSubmit = async (apptData: unknown) => {
    const result = await (submitAppointmentRequest as (d: unknown) => Promise<unknown>)(apptData);
    return result;
  };

  const getWorkingHours = () => {
    const rawWh = p.workingHours || p.working_hours || (hveri as any)?.workingHours || (hveri as any)?.working_hours;
    if (rawWh) {
      if (Array.isArray(rawWh)) {
        const map: Record<string, Record<string, unknown>> = {};
        const todayIndex = new Date().getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = dayNames[todayIndex];
        rawWh.forEach((item: any) => {
          if (item && (item.dayOfWeek || item.day)) {
            const day = String(item.dayOfWeek || item.day).toLowerCase();
            map[day] = {
              start: item.startTime || item.start || '',
              end: item.endTime || item.end || '',
              is_active: item.isActive !== undefined ? Boolean(item.isActive) : (item.is_active !== undefined ? Boolean(item.is_active) : true),
              is_today: day === todayName,
            };
          }
        });
        return map;
      }
      return rawWh;
    }
    try { return (getWorkingHoursByIlanId as (id: number) => unknown)(parseInt(String(p.ilan_id))); }
    catch { return null; }
  };

    const handleServiceMessageClick = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    closeModal();

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        router.push(`/giris?redirect_after=${encodeURIComponent(currentPath)}`);
      } else {
        router.push('/giris');
      }
      return;
    }

    const currentUserId = (currentUser as any)?.id || (currentUser as any)?.user_id || (currentUser as any)?.userId;
    const targetSellerId = seller?.id || seller?.user_id || (p as any)?.user_id || (p as any)?.ilan_sahibi?.user_id || (p as any)?.ilan_sahibi?.id;
    const sellerIdNum = parseInt(String(targetSellerId), 10);

    if (!sellerIdNum || isNaN(sellerIdNum)) {
      alert('Hizmet sağlayıcısının kullanıcı bilgisi bulunamadı.');
      return;
    }

    if (currentUserId && String(currentUserId) === String(sellerIdNum)) {
      alert('Kendi hizmet ilanınıza mesaj gönderemezsiniz.');
      return;
    }

    try {
      let conversation = await messageService.getConversationWithUser(sellerIdNum);
      if (!conversation) {
        conversation = await messageService.createConversation(sellerIdNum, (p as any)?.ilan_id);
      }

      if (!conversation || !conversation.conversation_id) {
        throw new Error('Konuşma başlatılamadı');
      }

      try {
        sessionStorage.setItem(
          'message_thread_context',
          JSON.stringify({
            conversation_id: conversation.conversation_id,
            listing_id: (p as any)?.ilan_id,
            seller_id: sellerIdNum,
            listingInfo: {
              title: String((p as any)?.baslik || 'Hizmet İlanı'),
              price: (p as any)?.fiyat ? `${(p as any)?.fiyat} TL` : '',
              image: (serviceData.gallery && serviceData.gallery[0]) || null,
              location: (p as any)?.konum,
            },
          })
        );
      } catch {
        /* ignore */
      }
      router.push(`/dashboard/mesajlar/${conversation.conversation_id}`);
    } catch (error) {
      console.error(error);
      alert('Mesaj sayfasına yönlendirilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const openWhatsAppModal = () => { setModalContent({ title: 'WhatsApp İletişimi', message: 'WhatsApp üzerinden yazın! Genellikle birkaç dakika içinde yanıtlarım. Randevu alırsanız çok daha verimli görüşürüz.', type: 'whatsapp' }); setShowModal(true); };
  const openMessageModal = () => { setModalContent({ title: 'Mesaj Gönderme', message: 'Mesaj göndermek istediğiniz için teşekkürler! Ayrıntılı sorularınızı yanıtlamaktan memnuniyet duyarım.', type: 'message' }); setShowModal(true); };
  const openPhoneModal = () => { setModalContent({ title: 'Telefon İletişimi', message: 'Aramak istediğiniz için teşekkürler! Ön randevu alarak çok daha verimli görüşebiliriz.', type: 'phone' }); setShowModal(true); };
  const closeModal = () => setShowModal(false);
  const openGalleryModal = (index: number) => setSelectedImageIndex(index);
  const closeGalleryModal = () => setSelectedImageIndex(null);
  const handlePrevImage = (e: React.MouseEvent) => { e.stopPropagation(); const imgs = (serviceData.gallery || []) as string[]; setSelectedImageIndex((prev) => prev === 0 ? imgs.length - 1 : (prev as number) - 1); };
  const handleNextImage = (e: React.MouseEvent) => { e.stopPropagation(); const imgs = (serviceData.gallery || []) as string[]; setSelectedImageIndex((prev) => (prev as number) === imgs.length - 1 ? 0 : (prev as number) + 1); };
  const handleThumbnailClick = (index: number) => setSelectedImageIndex(index);

  const hveri = (p.hizmet_verileri || {}) as Record<string, unknown>;
  const rawPreviewProv = p.previewProvider ?? p.preview_provider;
  const previewProv = typeof rawPreviewProv === 'string'
    ? (() => { try { return JSON.parse(rawPreviewProv); } catch { return undefined; } })()
    : (rawPreviewProv as Record<string, unknown> | undefined);

  const rawQa = hveri.quickActionPrefs ?? hveri.quick_action_prefs ?? p.quickActionPrefs ?? p.quick_action_prefs;
  const quickActionPrefs = normalizeQuickActionPrefs(rawQa);

  const resolveServiceGallery = (): string[] => {
    const asStrings = (arr: unknown): string[] =>
      Array.isArray(arr)
        ? (arr as unknown[]).filter((x): x is string => typeof x === 'string' && Boolean(x))
        : [];
    const top = asStrings(p.resimler);
    if (top.length) return top;
    const nested = asStrings(hveri.resimler);
    if (nested.length) return nested;
    const rawImgs = p.images || p.photos || p.imageUrls || hveri.images;
    const imgs = safeParseArray(rawImgs);
    if (Array.isArray(imgs) && imgs.length > 0) {
      return (imgs as unknown[])
        .map((img) => {
          if (typeof img === 'string') return img;
          if (img && typeof img === 'object') {
            const o = img as Record<string, string>;
            return o.url || o.preview || o.resim_url || '';
          }
          return '';
        })
        .filter(Boolean);
    }
    return [];
  };

  const serviceData = {
    ...p, ...hveri,
    gallery: resolveServiceGallery(),
    quickActionPrefs,
    user: {
      name:
        isPreview && previewProv?.name != null
          ? String(previewProv.name)
          : String(seller?.name || 'Hizmet Sağlayıcı'),
      profileImage:
        isPreview && previewProv
          ? (previewProv.profileImage as string | null) ?? null
          : ((seller?.profileImage || (seller as any)?.avatar || (seller as any)?.userPhoto || (seller as any)?.user_photo || (seller as any)?.profile_photo || null) as string | null),
      responseRate:
        isPreview && previewProv?.responseRate != null
          ? String(previewProv.responseRate)
          : String(
              (hveri as Record<string, unknown>)?.responseRate
                ?? seller?.responseRate
                ?? '1 saat',
            ),
      bio:
        isPreview && previewProv?.bio != null
          ? String(previewProv.bio)
          : String(seller?.bio ?? ''),
    },
    packages: safeParseArray(hveri.packages || p.packages || p.pricingPackages || (p.ozellikler as any)?.packages) as PackageItem[],
    features: safeParseArray(hveri.features || p.features || p.service_features || p.serviceFeatures || (p.ozellikler as any)?.features || (p.ozellikler as any)?.service_features) as Array<string | Record<string, unknown>>,
    rating: hveri.rating || p.rating || null,
    reviewCount: hveri.reviewCount || p.reviewCount || 0,
    customers:
      hveri.customers ??
      p.customers ??
      p.totalCustomers ??
      (p.overview as Record<string, unknown> | undefined)?.totalCustomers ??
      (p.overview as Record<string, unknown> | undefined)?.customers ??
      null,
    completedJobs:
      hveri.completedJobs ??
      p.completedJobs ??
      (p.overview as Record<string, unknown> | undefined)?.completedJobs ??
      null,
    experience:
      hveri.experience ??
      p.experience ??
      p.experienceYears ??
      (p.overview as Record<string, unknown> | undefined)?.experienceYears ??
      (p.overview as Record<string, unknown> | undefined)?.experience ??
      null,
    satisfaction:
      hveri.satisfaction ??
      p.satisfaction ??
      p.satisfactionPercent ??
      (p.overview as Record<string, unknown> | undefined)?.satisfactionPercent ??
      (p.overview as Record<string, unknown> | undefined)?.satisfaction ??
      null,
    workingHours: getWorkingHours(),
    serviceAreas: (() => {
      const rawA = hveri.serviceAreas || p.serviceAreas || p.service_areas || (p.ozellikler as any)?.serviceAreas || (p.ozellikler as any)?.service_areas;
      if (Array.isArray(rawA)) return rawA;
      if (rawA && typeof rawA === 'object') {
        const o = rawA as Record<string, unknown>;
        return [...(Array.isArray(o.manual) ? o.manual : []), ...(Array.isArray(o.map) ? o.map : [])];
      }
      return safeParseArray(rawA);
    })() as Array<string | Record<string, string>>,
    certificates: safeParseArray(hveri.certificates || p.certificates || p.sertifikalar || (p.ozellikler as any)?.certificates || (p.ozellikler as any)?.sertifikalar) as CertificateItem[],
    faq: safeParseArray(hveri.faq || p.faq || p.faq_items || p.faqs || (p.ozellikler as any)?.faq || (p.ozellikler as any)?.faq_items) as FaqItem[],
    memberSince: (p.memberSince ?? seller?.memberSince ?? null) as string | null,
  };

  const providerBioText = String((serviceData.user as { bio?: string }).bio || '').trim();
  const sellerLoc =
    !isPreview && seller?.location && typeof seller.location === 'object'
      ? (seller.location as { city?: string; district?: string })
      : null;
  const providerLocationLabel = sellerLoc
    ? [sellerLoc.district, sellerLoc.city].filter(Boolean).join(', ')
    : '';
  const listingKonum = (p.konum as Record<string, string>) || {};
  const headerLocationLine = [listingKonum.il, listingKonum.ilce, listingKonum.mahalle].filter(Boolean).join(', ');
  const memberSinceDisplay =
    serviceData.memberSince
      ? (() => {
          try {
            const d = new Date(String(serviceData.memberSince));
            return Number.isNaN(d.getTime())
              ? String(serviceData.memberSince)
              : d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
          } catch {
            return String(serviceData.memberSince);
          }
        })()
      : null;

  const qa = serviceData.quickActionPrefs as QuickActionPrefs;
  const hidePublicContact = ownerEditMode && suppressContactActions;
  const anyQuickContact = !hidePublicContact && (qa.whatsapp || qa.message);
  const anyHeaderAction = !hidePublicContact && (qa.phone || qa.appointment);
  const anyMobileSticky = !hidePublicContact && (qa.phone || qa.message || qa.appointment);

  const decodeHtml = decodeHtmlEntities as (s: string) => string;

  /** Kapak üstü geri: panel önizlemesinde owner akışı; aksi halde tarayıcı geçmişinde bir önceki sayfa */
  const handleHeroBack = () => {
    if (onOwnerBack) {
      onOwnerBack();
      return;
    }
    router.back();
  };

  /** Panel üstü: tam genişlik kapak + dar ortalanmış profil kartı */
  const dashboardOwnerHero = Boolean(embedInDashboard && ownerEditMode);

  return (
    <>
      {!isPreview && (
        <div className="desktop-only-breadcrumb service-detail-breadcrumb-wrapper">
          <Breadcrumb2 className="service-detail-breadcrumb" categoryPath={categoryPath} adTitle={decodeHtml(String(p.baslik || adTitle || ''))} isLoading={categoryLoading} />
        </div>
      )}

      <div
        className={`service-detail${embedInDashboard ? ' service-detail--embed-dashboard' : ''}${
          ownerEditMode ? ' service-detail--owner-edit' : ''
        }`}
      >
        <div className="service-detail__hero">
          <div className="service-detail__cover">
            <button
              className="service-detail__back-btn-modern"
              onClick={handleHeroBack}
              aria-label="Geri dön"
              type="button"
            >
              <FaArrowLeft size={16} /><span>Geri Dön</span>
            </button>
            {dashboardOwnerHero ? (
              <button
                type="button"
                className="service-detail__cover-submit-btn"
                onClick={onOwnerSubmitForApproval || onOwnerPublicPreview}
                title="Onaya Gönder"
              >
                <FaCheckCircle size={15} />
                <span>Onaya Gönder</span>
              </button>
            ) : null}
            {!isPreview && !ownerEditMode && (
              <div className="service-detail__social-actions">
                {isOwner && (
                  <button
                    type="button"
                    className="service-detail__owner-quick-edit-btn"
                    onClick={() => router.push(`/dashboard/ilan-duzenle/${p.id || p.ilan_id || serviceId}`)}
                    aria-label="İlanı Düzenle / Revize Et"
                    title="İlanı Düzenle / Revize Et"
                  >
                    <FaEdit size={16} />
                    <span>İlanı Düzenle</span>
                  </button>
                )}
                <button className="service-detail__share-btn" onClick={handleShare} aria-label="Paylaş"><FaShare size={18} /></button>
                <button className={`service-detail__favorite-btn ${isFavorite ? 'active' : ''}`} onClick={handleToggleFavorite} aria-label="Favorilere ekle"><FaHeart size={18} /></button>
                <button className="service-detail__report-btn" onClick={() => setComplaintModalOpen(true)} aria-label="İlanı Şikayet Et" title="İlanı Şikayet Et"><FaFlag size={18} /></button>
              </div>
            )}
            <OwnerEditTrigger
              section="cover"
              ownerEditMode={ownerEditMode}
              onOwnerEdit={onOwnerEdit}
              layout="cover"
              label={dashboardOwnerHero ? 'Kapak fotoğrafı' : undefined}
            />
            <div className="service-detail__cover-image">
              {(() => {
                const coverImageId = p.coverImageId || hveri.coverImageId;
                let coverImageUrl: string | null = null;
                if (coverImageId) {
                  if (Array.isArray(p.images)) {
                    const ci = (p.images as Array<Record<string, string>>).find((img) => typeof img === 'object' && String(img.id) === String(coverImageId));
                    if (ci) coverImageUrl = ci.url || ci.preview || null;
                  }
                  if (!coverImageUrl && serviceData.gallery?.length) {
                    const idx = parseInt(String(coverImageId));
                    if (!isNaN(idx) && (serviceData.gallery as string[])[idx]) coverImageUrl = (serviceData.gallery as string[])[idx];
                  }
                }
                // coverImageId yok veya eşleşmiyorsa: ilanın ilk galeri görseli kapak (önizleme + yayınlanmış ilan)
                if (!coverImageUrl && Array.isArray(serviceData.gallery) && (serviceData.gallery as string[])[0]) {
                  coverImageUrl = (serviceData.gallery as string[])[0];
                }
                const sellerCover = (seller?.coverImage || seller?.cover_image || (p as any)?.coverImage || (p as any)?.cover_image) as string | undefined;
                if ((!coverImageUrl || coverImageUrl.includes('kapak-fotografi') || coverImageUrl.includes('img_284_cover')) && sellerCover) {
                  coverImageUrl = sellerCover;
                }
                const coverSrc = coverImageUrl || sellerCover || SERVICE_LISTING_COVER_PLACEHOLDER;
                const altText = coverImageUrl ? 'Hizmet kapak görseli' : 'Varsayılan hizmet kapak görseli';
                if (coverImageUrl) {
                  return (
                    <img src={coverSrc} alt={altText} className="service-detail__cover-img" />
                  );
                }
                return (
                  <picture>
                    <source
                      media="(max-width: 1023px)"
                      srcSet={SERVICE_LISTING_COVER_PLACEHOLDER_MOBILE}
                    />
                    <img
                      src={SERVICE_LISTING_COVER_PLACEHOLDER}
                      alt={altText}
                      className="service-detail__cover-img"
                    />
                  </picture>
                );
              })()}
            </div>
          </div>

          <div
            className={`service-detail__header${
              dashboardOwnerHero ? ' service-detail__header--dashboard-owner' : ''
            }`}
          >
            <div className="service-detail__header-background"><div className="service-detail__header-gradient" /></div>
            <div className="service-detail__header-content">
              <OwnerEditTrigger
                section="cover"
                ownerEditMode={ownerEditMode}
                onOwnerEdit={onOwnerEdit}
                layout="headerMobile"
                label={dashboardOwnerHero ? 'Kapak fotoğrafı' : undefined}
              />
              <div className="service-detail__profile-section">
                <div className="service-detail__avatar-wrapper">
                  <div className="service-detail__avatar-container clickable-avatar" onClick={navigateToUserProfile} style={{ cursor: 'pointer' }}>
                    {serviceData.user.profileImage ? (
                      <img src={String(serviceData.user.profileImage)} alt={String(serviceData.user.name)} className="service-detail__user-avatar" />
                    ) : (
                      <div className="service-detail__avatar-placeholder"><FaUserCircle size={32} /></div>
                    )}
                  </div>
                  <div className="service-detail__avatar-glow" />
                </div>
                <div className="service-detail__profile-info">
                  <div className="service-detail__category-badge"><span className="service-detail__badge-icon">✨</span>{String(p.category_name || 'Hizmet')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h1 className="service-detail__title clickable-title" onClick={navigateToUserProfile} style={{ cursor: 'pointer', margin: 0 }}>{decodeHtml(String(p.baslik || ''))}</h1>
                    <OwnerEditTrigger section="title" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                  </div>
                  <div className="service-detail__provider">
                    <span className="service-detail__provider-name clickable-name" onClick={navigateToUserProfile} style={{ cursor: 'pointer' }}>
                      <FaUser size={14} />{String(serviceData.user.name)}
                    </span>
                    <div className="service-detail__provider-meta">
                      <span
                        className={`service-detail__location${headerLocationLine ? '' : ' service-detail__location--empty'}`}
                      >
                        <FaMapMarkerAlt size={12} />
                        {headerLocationLine || 'Konum belirtilmedi'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {anyHeaderAction ? (
                <div className="service-detail__action-buttons">
                  {qa.phone ? (
                    <button type="button" className="service-detail__action-btn primary" onClick={openPhoneModal}><FaPhone size={16} /><span>Hemen Ara</span></button>
                  ) : null}
                  {qa.appointment ? (
                    <button type="button" className="service-detail__action-btn secondary" onClick={() => openAppointmentModal()}><FaCalendarAlt size={16} /><span>Randevu Al</span></button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={`service-detail__content${isPreview && !usePublishedPreviewLayout ? ' preview-mode' : ''}`}
        >
          {(!isPreview || usePublishedPreviewLayout) && (
            <div className="service-detail__vitrin-sidebar">
              <AdBanner pageId={3} sectionId={1} sectionCode="İD1" categoryId={p?.category_id ? Number(p.category_id) : null} className="service-detail__vertical-vitrin" useSlider={true} sliderInterval={8000} limit={5} />
            </div>
          )}

          <div className="service-detail__main">
            <nav
              className="service-detail__nav service-detail__nav--panel-simple"
              aria-label="Hizmet bölümleri"
            >
              <div className="service-detail__nav-tabs">
                {[
                  { key: 'overview', label: 'Özet' },
                  { key: 'packages', label: 'Paketler' },
                  { key: 'features', label: 'Özellikler' },
                  { key: 'portfolio', label: 'Galeri' },
                  { key: 'reviews', label: 'Yorumlar' },
                  { key: 'about', label: 'Hakkında' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`service-detail__nav-tab ${activeTab === key ? 'active' : ''}`}
                    onClick={() => setActiveTab(key)}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="service-detail__tab-content">
              {activeTab === 'overview' && (
                <div className="service-detail__overview">
                  <div className="service-detail__stats-card service-detail__modern-card">
                    <div className="service-detail__card-header"><h3>Performans İstatistikleri</h3><FaChartLine className="service-detail__header-icon" /></div>
                    <div className="service-detail__stats-grid">
                      {serviceData.customers != null && (<div className="service-detail__stat-item"><div className="service-detail__stat-icon service-detail__bg-blue"><FaUsers size={24} /></div><div className="service-detail__stat-content"><span className="service-detail__stat-number">{String(serviceData.customers)}</span><span className="service-detail__stat-label">Mutlu Müşteri</span></div></div>)}
                      {serviceData.completedJobs != null && (<div className="service-detail__stat-item"><div className="service-detail__stat-icon service-detail__bg-green"><FaCheckCircle size={24} /></div><div className="service-detail__stat-content"><span className="service-detail__stat-number">{String(serviceData.completedJobs)}</span><span className="service-detail__stat-label">Tamamlanan İş</span></div></div>)}
                      {serviceData.experience != null && (<div className="service-detail__stat-item"><div className="service-detail__stat-icon service-detail__bg-yellow"><FaClock size={24} /></div><div className="service-detail__stat-content"><span className="service-detail__stat-number">{String(serviceData.experience).replace(/\+$/, '')}+</span><span className="service-detail__stat-label">Yıl Deneyim</span></div></div>)}
                      {serviceData.satisfaction != null && (<div className="service-detail__stat-item"><div className="service-detail__stat-icon service-detail__bg-purple"><FaThumbsUp size={24} /></div><div className="service-detail__stat-content"><span className="service-detail__stat-number">%{String(serviceData.satisfaction)}</span><span className="service-detail__stat-label">Memnuniyet</span></div></div>)}
                      {serviceData.customers == null && serviceData.completedJobs == null && serviceData.experience == null && serviceData.satisfaction == null && (<div className="service-detail__no-stats"><p>İstatistik verileri henüz mevcut değil.</p></div>)}
                    </div>
                  </div>

                  <div className="service-detail__description-card service-detail__modern-card">
                    <div className="service-detail__card-header service-detail__card-header--row">
                      <h3>Hizmet Açıklaması</h3>
                      <OwnerEditTrigger section="description" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                    </div>
                    <div className="service-detail__description-text" dangerouslySetInnerHTML={{ __html: String(p.aciklama || '') }} />
                  </div>

                  {(serviceData.gallery as string[]).length > 0 && (
                    <div className="service-detail__gallery-preview service-detail__modern-card">
                      <div className="service-detail__section-header">
                        <h3>Portföy Galerisi</h3>
                        <div className="service-detail__section-header-actions">
                          <OwnerEditTrigger section="gallery" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                          <button className="service-detail__view-all-btn" onClick={() => setActiveTab('portfolio')}>Tümünü Gör ({(serviceData.gallery as string[]).length}) <FaChevronRight size={16} /></button>
                        </div>
                      </div>
                      <div className="service-detail__gallery-preview-grid">
                        {(serviceData.gallery as string[]).slice(0, 6).map((image, index) => (
                          <div key={index} className="service-detail__gallery-preview-item">
                            <img src={image} alt={`Portföy Görseli ${index + 1}`} loading="lazy" draggable={false} className="protected-image" onContextMenu={(e) => e.preventDefault()} style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties} />
                            <div className="service-detail__gallery-preview-watermark-container"><div className="service-detail__gallery-preview-watermark">Acillazım.com</div></div>
                            <div className="service-detail__gallery-preview-overlay">
                              <button className="service-detail__gallery-preview-zoom" onClick={() => openGalleryModal(index)} aria-label="Görseli büyüt"><FaExpand size={18} /></button>
                            </div>
                          </div>
                        ))}
                        {(serviceData.gallery as string[]).length > 6 && (
                          <div className="service-detail__gallery-preview-more">
                            <button className="service-detail__gallery-more-btn" onClick={() => openGalleryModal(6)}>
                              <span className="service-detail__more-count">+{(serviceData.gallery as string[]).length - 6}</span>
                              <span className="service-detail__more-text">Daha fazla</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="service-detail__packages-preview service-detail__modern-card">
                    <div className="service-detail__section-header">
                      <h3>Hizmet Paketleri</h3>
                      <div className="service-detail__section-header-actions">
                        <OwnerEditTrigger section="packages" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                        <button className="service-detail__view-all-btn" onClick={() => setActiveTab('packages')}>Tümünü Gör <FaChevronRight size={16} /></button>
                      </div>
                    </div>
                    <div className="service-detail__pricing-grid">
                      {(serviceData.packages as PackageItem[]).map((pkg, index) => (
                        <div key={index} className={`service-detail__pricing-card ${pkg.popular ? 'popular' : ''}`}>
                          {pkg.popular && <div className="service-detail__popular-badge">En Popüler</div>}
                          <div className="service-detail__package-header">
                            <h4>{pkg.title}</h4>
                            <div className="service-detail__price"><span className="service-detail__currency">₺</span><span className="service-detail__amount">{String(pkg.price)}</span></div>
                            {pkg.deliveryDays && <p className="service-detail__delivery-time"><FaClock size={16} />{pkg.deliveryDays} gün teslimat</p>}
                          </div>
                          <div className="service-detail__package-features">
                            {safeParseArray(pkg?.features).map((feature, fi) => (
                              <div key={fi} className="service-detail__feature">
                                <FaCheckCircle size={16} className="service-detail__check-icon" />
                                <span>{typeof feature === 'string' ? feature : ((feature as Record<string, string>).title || (feature as Record<string, string>).text || JSON.stringify(feature))}</span>
                              </div>
                            ))}
                          </div>
                          {!hidePublicContact ? (
                            <button type="button" className="service-detail__select-package-btn" onClick={() => openAppointmentModal(pkg)}><FaCalendarAlt size={16} />Randevu Al</button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="service-detail__reviews-preview service-detail__modern-card">
                    <div className="service-detail__section-header">
                      <h3>Müşteri Yorumları</h3>
                      <div className="service-detail__section-header-actions">
                        <OwnerEditTrigger section="reviews" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                        <button className="service-detail__view-all-btn" onClick={() => setActiveTab('reviews')}>Tümünü Gör <FaChevronRight size={16} /></button>
                      </div>
                    </div>
                    {reviewCount > 0 && (
                      <div className="service-detail__reviews-summary-mini">
                        <div className="service-detail__rating-display">
                          <div className="service-detail__rating-stars">{[...Array(5)].map((_, i) => <FaStar key={i} className="filled" />)}</div>
                          <span className="service-detail__rating-text">{reviewCount} değerlendirme</span>
                        </div>
                      </div>
                    )}
                    <div className="service-detail__reviews-grid-preview">
                      {miniReviews.slice(0, 4).map((review, index) => (
                        <div key={String(review.id ?? index)} className="service-detail__review-card-mini">
                          <div className="service-detail__review-header-mini">
                            <div className="service-detail__review-user-mini">
                              <span className="service-detail__review-avatar-mini" aria-hidden>
                                <FaUser size={15} />
                              </span>
                              <div className="service-detail__review-user-meta-mini">
                                <span className="service-detail__review-username-mini">
                                  {formatReviewerDisplayName(review.user)}
                                </span>
                                {review.date ? (
                                  <span className="service-detail__review-date-mini">{review.date}</span>
                                ) : null}
                              </div>
                            </div>
                            <div className="service-detail__review-rating-mini">
                              <div className="service-detail__review-stars-mini">
                                {[...Array(5)].map((_, i) => (
                                  <FaStar key={i} className={i < review.rating ? 'filled' : 'empty'} />
                                ))}
                              </div>
                              <span className="service-detail__review-score-mini">
                                {Number(review.rating || 5).toFixed(1)}
                              </span>
                            </div>
                          </div>
                          <div className="service-detail__review-content-mini">{review.comment}</div>
                          {review.response ? (
                            <div className="service-detail__review-response-mini">
                              <div className="service-detail__review-response-top-mini">
                                <span className="service-detail__review-response-badge-mini">
                                  <FaReply size={11} />
                                  <span>Hizmet Sağlayıcı Yanıtı</span>
                                </span>
                                {ownerEditMode && onOwnerEdit ? (
                                  <button
                                    type="button"
                                    className="service-detail__review-inline-edit-btn"
                                    onClick={() => onOwnerEdit('reviews')}
                                  >
                                    <FaEdit size={12} />
                                    <span>Yanıtı Düzenle</span>
                                  </button>
                                ) : null}
                              </div>
                              <div className="service-detail__review-response-box-mini">
                                <div className="service-detail__review-response-provider-mini">
                                  <span className="service-detail__review-response-provider-icon" aria-hidden>
                                    <FaUser size={11} />
                                  </span>
                                  <span className="service-detail__review-response-provider-name">
                                    {String(serviceData.user.name || 'Hizmet Sağlayıcı')}
                                  </span>
                                </div>
                                <p className="service-detail__review-response-text-mini">{review.response}</p>
                              </div>
                            </div>
                          ) : ownerEditMode && onOwnerEdit ? (
                            <div className="service-detail__review-no-response-actions">
                              <button
                                type="button"
                                className="service-detail__review-inline-reply-btn"
                                onClick={() => onOwnerEdit('reviews')}
                              >
                                <FaReply size={12} />
                                <span>Bu Yoruma Yanıt Yaz</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {reviewCount === 0 && (<div className="service-detail__no-reviews-preview"><FaStar size={24} /><p>Henüz müşteri yorumu bulunmuyor.</p></div>)}
                  </div>
                </div>
              )}

              {activeTab === 'packages' && (
                <div className="service-detail__packages service-detail__modern-card">
                  <div className="service-detail__tab-title-row">
                    <h3>Hizmet Paketleri</h3>
                    <OwnerEditTrigger section="packages" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                  </div>
                  <div className="service-detail__pricing-grid">
                    {(serviceData.packages as PackageItem[]).map((pkg, index) => (
                      <div key={index} className={`service-detail__pricing-card ${pkg.popular ? 'popular' : ''}`}>
                        {pkg.popular && <div className="service-detail__popular-badge">En Popüler</div>}
                        <div className="service-detail__package-header">
                          <h4>{pkg.title}</h4>
                          <div className="service-detail__price"><span className="service-detail__currency">₺</span><span className="service-detail__amount">{String(pkg.price)}</span></div>
                          {pkg.deliveryDays && <p className="service-detail__delivery-time"><FaClock size={16} />{pkg.deliveryDays} gün teslimat</p>}
                        </div>
                        <div className="service-detail__package-features">
                          {safeParseArray(pkg?.features).map((f, fi) => (
                            <div key={fi} className="service-detail__feature"><FaCheckCircle size={16} className="service-detail__check-icon" /><span>{typeof f === 'string' ? f : ((f as Record<string, string>).title || JSON.stringify(f))}</span></div>
                          ))}
                        </div>
                        {!hidePublicContact ? (
                          <button type="button" className="service-detail__select-package-btn" onClick={() => openAppointmentModal(pkg)}><FaCalendarAlt size={16} />Randevu Al</button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'features' && (
                <div className="service-detail__features">
                  <div className="service-detail__tab-title-row">
                    <h3>Hizmet Özellikleri</h3>
                    <OwnerEditTrigger section="features" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                  </div>
                  <div className="service-detail__features-grid">
                    {(serviceData.features as Array<string | Record<string, unknown>>).map((feature, index) => {
                      const fo = typeof feature === 'object' && feature !== null ? (feature as Record<string, unknown>) : null;
                      const title = typeof feature === 'string' ? feature : String(fo?.title || fo?.text || '');
                      const desc = fo ? String(fo.description || '') : '';
                      const storedIcon = fo?.icon;
                      const iconEl = React.isValidElement(storedIcon) ? storedIcon : getIconForTitle(title);
                      return (
                        <div key={index} className="service-detail__feature-item">
                          <div className="service-detail__feature-icon">{iconEl}</div>
                          <div className="service-detail__feature-content">
                            <h4 className="service-detail__feature-title">{title}</h4>
                            {desc ? <p className="service-detail__feature-description">{desc}</p> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'portfolio' && (
                (serviceData.gallery as string[]).length > 0 ? (
                  <div>
                    <div className="service-detail__tab-title-row">
                      <h3>Galeri</h3>
                      <OwnerEditTrigger section="gallery" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                    </div>
                    <ServiceDetailGallery images={serviceData.gallery as string[]} />
                  </div>
                ) : (
                  <div className="service-detail__modern-card">
                    <div className="service-detail__tab-title-row">
                      <h3>Galeri</h3>
                      <OwnerEditTrigger section="gallery" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                    </div>
                    <p style={{ padding: '20px', color: '#666' }}>{isPreview ? 'Önizleme modunda galeri görüntüleri eklenmemiş.' : 'Bu hizmet için henüz galeri görüntüsü eklenmemiş.'}</p>
                  </div>
                )
              )}

              {activeTab === 'reviews' && (
                isPreview ? (
                  <div className="service-detail__modern-card">
                    <div className="service-detail__tab-title-row">
                      <h3>Müşteri Yorumları</h3>
                      <OwnerEditTrigger section="reviews" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                    </div>
                    {miniReviews.length > 0 ? (
                      <div className="service-detail__reviews-grid-preview service-detail__reviews-grid-preview--full">
                        {miniReviews.map((review, index) => (
                          <div key={String(review.id ?? index)} className="service-detail__review-card-mini">
                            <div className="service-detail__review-header-mini">
                              <div className="service-detail__review-user-mini">
                                <span className="service-detail__review-avatar-mini" aria-hidden>
                                  <FaUser size={15} />
                                </span>
                                <div className="service-detail__review-user-meta-mini">
                                  <span className="service-detail__review-username-mini">
                                    {formatReviewerDisplayName(review.user)}
                                  </span>
                                  {review.date ? (
                                    <span className="service-detail__review-date-mini">{review.date}</span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="service-detail__review-rating-mini">
                                <div className="service-detail__review-stars-mini">
                                  {[...Array(5)].map((_, i) => (
                                    <FaStar key={i} className={i < (Number(review.rating) || 0) ? 'filled' : 'empty'} />
                                  ))}
                                </div>
                                <span className="service-detail__review-score-mini">
                                  {Number(review.rating || 5).toFixed(1)}
                                </span>
                              </div>
                            </div>
                            <div className="service-detail__review-content-mini">{String(review.comment || '')}</div>
                            {review.response ? (
                              <div className="service-detail__review-response-mini">
                                <div className="service-detail__review-response-top-mini">
                                  <span className="service-detail__review-response-badge-mini">
                                    <FaReply size={11} />
                                    <span>Hizmet Sağlayıcı Yanıtı</span>
                                  </span>
                                  {ownerEditMode && onOwnerEdit ? (
                                    <button
                                      type="button"
                                      className="service-detail__review-inline-edit-btn"
                                      onClick={() => onOwnerEdit('reviews')}
                                    >
                                      <FaEdit size={12} />
                                      <span>Yanıtı Düzenle</span>
                                    </button>
                                  ) : null}
                                </div>
                                <div className="service-detail__review-response-box-mini">
                                  <div className="service-detail__review-response-provider-mini">
                                    <span className="service-detail__review-response-provider-icon" aria-hidden>
                                      <FaUser size={11} />
                                    </span>
                                    <span className="service-detail__review-response-provider-name">
                                      {String(serviceData.user.name || 'Hizmet Sağlayıcı')}
                                    </span>
                                  </div>
                                  <p className="service-detail__review-response-text-mini">{review.response}</p>
                                </div>
                              </div>
                            ) : ownerEditMode && onOwnerEdit ? (
                              <div className="service-detail__review-no-response-actions">
                                <button
                                  type="button"
                                  className="service-detail__review-inline-reply-btn"
                                  onClick={() => onOwnerEdit('reviews')}
                                >
                                  <FaReply size={12} />
                                  <span>Bu Yoruma Yanıt Yaz</span>
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="service-detail__no-reviews-preview">
                        <FaStar size={24} />
                        <p>Henüz müşteri yorumu bulunmuyor.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <ServiceDetailReviews
                    serviceId={String(p.ilan_id ?? '')}
                    initialReviews={((serviceData as Record<string, unknown>).reviews as unknown[] | undefined) ?? []}
                    providerName={String(serviceData.user.name || 'Hizmet Sağlayıcı')}
                  />
                )
              )}

              {activeTab === 'about' && (
                <div className="service-detail__about">
                  <div className="service-detail__about-card service-detail__modern-card">
                    <div className="service-detail__provider-header service-detail__provider-header--about">
                      <div
                        className="service-detail__provider-avatar service-detail__provider-avatar--about clickable-avatar"
                        onClick={navigateToUserProfile}
                        style={{ cursor: isPreview ? 'default' : 'pointer' }}
                        role={isPreview ? undefined : 'button'}
                        tabIndex={isPreview ? undefined : 0}
                        onKeyDown={isPreview ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateToUserProfile(); } }}
                      >
                        {serviceData.user.profileImage ? (
                          <img src={String(serviceData.user.profileImage)} alt={String(serviceData.user.name)} />
                        ) : (
                          <span className="service-detail__provider-avatar-fallback" aria-hidden>
                            <FaUser className="service-detail__provider-avatar-fallback-icon" />
                          </span>
                        )}
                      </div>
                      <div className="service-detail__provider-details service-detail__provider-details--about">
                        <h4
                          className={`service-detail__provider-name ${!isPreview ? 'clickable-name' : ''}`}
                          onClick={isPreview ? undefined : navigateToUserProfile}
                          style={{ cursor: isPreview ? 'default' : 'pointer' }}
                        >
                          {String(serviceData.user.name)}
                        </h4>
                        <p className="service-detail__provider-role">{String(p.meslek || 'Hizmet Sağlayıcı')}</p>
                        {providerLocationLabel ? (
                          <p className="service-detail__provider-location">
                            <FaMapMarkerAlt size={14} aria-hidden />
                            <span>{providerLocationLabel}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="service-detail__about-bio">
                      {providerBioText ? (
                        <p className="service-detail__about-bio-text">{providerBioText}</p>
                      ) : (
                        <p className="service-detail__about-bio-empty">
                          {ownerEditMode
                            ? 'Henüz bir tanıtım metni eklenmemiş. Profil ayarlarından «Hakkımda» alanını doldurabilirsiniz.'
                            : 'Bu hizmet sağlayıcı henüz bir tanıtım metni eklememiş.'}
                        </p>
                      )}
                    </div>

                    <div className="service-detail__provider-stats service-detail__provider-stats--about">
                      <div className="service-detail__provider-stat">
                        <span className="service-detail__stat-label">Yanıt süresi</span>
                        <span className="service-detail__stat-value">{String(serviceData.user.responseRate)}</span>
                      </div>
                      {memberSinceDisplay ? (
                        <div className="service-detail__provider-stat">
                          <span className="service-detail__stat-label">Üyelik</span>
                          <span className="service-detail__stat-value">{memberSinceDisplay}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="service-detail__sidebar">
              {hidePublicContact ? (
                <div className="service-detail__sidebar-card service-detail__contact-card service-detail__contact-card--owner-hint">
                  <div className="service-detail__owner-hint-title-row">
                    <h4 className="service-detail__owner-hint-title">Müşteriye görünen kanallar</h4>
                    <OwnerEditTrigger section="contactChannels" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                  </div>
                  <p className="service-detail__owner-hint-text">
                    <strong>Telefon, WhatsApp vb. bilgiler</strong> hesabınızda İletişim bilgilerinden güncellenir. Burada
                    yalnızca bu ilanda <strong>hangi kısayolların görüneceğini</strong> (Ara, Mesaj, Randevu, WhatsApp)
                    seçersiniz.
                  </p>
                  <p className="service-detail__owner-hint-text service-detail__owner-hint-text--muted">
                    Düzenlemeleri tamamladıktan sonra yukarıdaki <strong>Onaya Gönder</strong> butonuna tıklayarak yönetici onayına gönderebilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="service-detail__sidebar-card service-detail__contact-card">
                  <div className="service-detail__sidebar-card-title">
                    <h4>Hızlı İşlem</h4>
                  </div>
                  {anyQuickContact ? (
                    <div className="service-detail__contact-options">
                      {qa.whatsapp ? (
                        <button type="button" className="service-detail__contact-option whatsapp" onClick={openWhatsAppModal}><FaWhatsapp size={24} /><span>WhatsApp</span></button>
                      ) : null}
                      {qa.message ? (
                        <button type="button" className="service-detail__contact-option primary" onClick={handleServiceMessageClick}><FaEnvelope size={22} /><span>Mesaj Gönder</span></button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="service-detail__contact-empty">Bu ilan için hızlı iletişim kısayolu tanımlanmamış.</p>
                  )}
                  {anyQuickContact ? (
                    <div className="service-detail__response-info"><div className="service-detail__response-time"><FaClock size={16} /><span>Genelde {String(serviceData.user.responseRate)} içinde yanıtlar</span></div></div>
                  ) : null}
                </div>
              )}

              <div className="service-detail__sidebar-card service-detail__hours-card">
                <div className="service-detail__sidebar-card-title">
                  <h4>Çalışma Saatleri</h4>
                  <OwnerEditTrigger section="workingHours" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                </div>
                <div className="service-detail__hours-list">
                  {serviceData.workingHours
                    ? Object.entries(serviceData.workingHours as Record<string, Record<string, unknown>>).map(([day, hours]) => {
                        if (typeof hours === 'object' && hours !== null && hours.start && hours.end) {
                          const isToday = Boolean(hours.is_today);
                          const isActive = hours.is_active !== undefined ? Boolean(hours.is_active) : (hours.isActive !== undefined ? Boolean(hours.isActive) : true);
                          return (
                            <div key={day} className={`service-detail__hour-item ${isToday ? 'today' : ''}`}>
                              <span className="service-detail__day">{getDayName(day)}</span>
                              <span className={`service-detail__time ${isActive ? 'active' : 'closed'}`}>
                                {isActive ? `${String(hours.start)} - ${String(hours.end)}` : 'Kapalı'}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })
                    : null}
                </div>
              </div>

              <div className="service-detail__sidebar-card service-detail__areas-card">
                <div className="service-detail__sidebar-card-title">
                  <h4>Hizmet Bölgeleri</h4>
                  <OwnerEditTrigger section="serviceAreas" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                </div>
                <div className="service-detail__areas-list">
                  {(safeParseArray(serviceData.serviceAreas) as Array<string | Record<string, string>>).length > 0
                    ? (safeParseArray(serviceData.serviceAreas) as Array<string | Record<string, string>>).map((area, i) => (<div key={i} className="service-detail__area-item"><FaMapMarkerAlt size={14} /><span>{(() => {
                        if (typeof area === 'string') return area;
                        if (!area || typeof area !== 'object') return '';
                        const a = area as Record<string, any>;
                        if (a.name && typeof a.name === 'string' && a.name.trim()) return a.name.trim();
                        if (a.title && typeof a.title === 'string' && a.title.trim()) return a.title.trim();
                        const d = (a.district || a.district_name || a.districtName || '').toString().trim();
                        const c = (a.city || a.city_name || a.cityName || '').toString().trim();
                        if (d && c) return d + ' - ' + c;
                        return d || c || '';
                      })()}</span></div>))
                    : <div className="service-detail__no-areas"><p>Hizmet bölgesi bilgisi mevcut değil.</p></div>}
                </div>
              </div>

              <div className="service-detail__sidebar-card service-detail__certificates-card">
                <div className="service-detail__sidebar-card-title">
                  <h4>Sertifikalar</h4>
                  <OwnerEditTrigger section="certificates" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                </div>
                <div className="service-detail__certificates-list">
                  {(safeParseArray(serviceData.certificates) as CertificateItem[]).length > 0
                    ? (safeParseArray(serviceData.certificates) as CertificateItem[]).map((cert, i) => {
                        const cObj = typeof cert === 'object' && cert !== null ? (cert as Record<string, unknown>) : null;
                        const certName = typeof cert === 'string' ? cert : String(cObj?.name || '');
                        const certYear = cObj ? String(cObj?.date || '') : '';
                        return (
                          <div key={i} className="service-detail__certificate-item">
                            <FaAward size={16} />
                            <div className="service-detail__certificate-info">
                              <span className="service-detail__certificate-name">{certName}</span>
                              {certYear ? <span className="service-detail__certificate-year">{certYear}</span> : null}
                            </div>
                          </div>
                        );
                      })
                    : <div className="service-detail__no-certificates"><p>Sertifika bilgisi mevcut değil.</p></div>}
                </div>
              </div>

              <div className="service-detail__sidebar-card service-detail__faq-card">
                <div className="service-detail__sidebar-card-title">
                  <h4>Sıkça Sorulan Sorular</h4>
                  <OwnerEditTrigger section="faq" ownerEditMode={ownerEditMode} onOwnerEdit={onOwnerEdit} />
                </div>
                <div className="service-detail__faq-list">
                  {(safeParseArray(serviceData.faq) as FaqItem[]).length > 0 ? (
                    (safeParseArray(serviceData.faq) as FaqItem[]).map((item, i) => {
                      const fObj = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : null;
                      const q = typeof item === 'string' ? item : String(fObj?.question || '');
                      const a = fObj ? String(fObj?.answer || '') : '';
                      return (
                        <div key={i} className="service-detail__faq-item">
                          <div className="service-detail__faq-question"><FaQuestionCircle size={14} /><span>{q}</span></div>
                          {a ? <div className="service-detail__faq-answer">{a}</div> : null}
                        </div>
                      );
                    })
                  ) : (
                    <div className="service-detail__no-faq"><p>Sıkça sorulan soru bilgisi mevcut değil.</p></div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {anyMobileSticky ? (
          <div className="service-detail__mobile-sticky-bar">
            {qa.phone ? (
              <button type="button" className="service-detail__mobile-action-btn call" onClick={openPhoneModal}><FaPhone size={18} /><span>Ara</span></button>
            ) : null}
            {qa.message ? (
              <button type="button" className="service-detail__mobile-action-btn message" onClick={handleServiceMessageClick}><FaEnvelope size={18} /><span>Mesaj</span></button>
            ) : null}
            {qa.appointment ? (
              <button type="button" className="service-detail__mobile-action-btn book primary" onClick={() => openAppointmentModal()}><FaCalendarAlt size={18} /><span>Randevu Al</span></button>
            ) : null}
          </div>
        ) : null}
      </div>

      {showModal && (
        <div className="service-detail__modal-overlay" onClick={closeModal}>
          <div className="service-detail__modal" onClick={(e) => e.stopPropagation()}>
            <div className="service-detail__modal-header">
              <h3>{modalContent.title}</h3>
              <button className="service-detail__modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="service-detail__modal-body">
              <div className="service-detail__modal-icon">
                {modalContent.type === 'whatsapp' && <FaWhatsapp size={56} />}
                {modalContent.type === 'message' && <FaEnvelope size={52} />}
                {modalContent.type === 'phone' && <FaPhone size={52} />}
              </div>
              <p className="service-detail__modal-message">{modalContent.message}</p>
            </div>
            <div className="service-detail__modal-actions">
              <button className="service-detail__modal-btn primary" onClick={() => { closeModal(); openAppointmentModal(); }}><FaCalendarAlt size={16} />Randevu Al</button>
              <button className="service-detail__modal-btn secondary" onClick={closeModal}>
                {modalContent.type === 'whatsapp' && <><FaWhatsapp size={16} />WhatsApp'ta Devam Et</>}
                {modalContent.type === 'message' && <><FaEnvelope size={16} />Mesaj Gönder</>}
                {modalContent.type === 'phone' && <><FaPhone size={16} />Hemen Ara</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedImageIndex !== null && (serviceData.gallery as string[]).length > 0 && (
        <div className="service-detail__gallery-modal" onClick={closeGalleryModal}>
          <div className="service-detail__gallery-modal-header">
            <button className="service-detail__gallery-modal-close" onClick={closeGalleryModal} aria-label="Kapat"><FaTimes /></button>
          </div>
          <div className="service-detail__gallery-modal-main">
            <button className="service-detail__gallery-modal-nav prev" onClick={handlePrevImage} aria-label="Önceki görsel"><FaChevronLeft /></button>
            <div className="service-detail__gallery-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="service-detail__gallery-modal-image-container">
                <img src={(serviceData.gallery as string[])[selectedImageIndex]} alt={`Portföy Görseli ${selectedImageIndex + 1}`} draggable={false} className="protected-image" loading="lazy" onContextMenu={(e) => e.preventDefault()} style={{ userSelect: 'none' }} />
                <div className="service-detail__gallery-modal-watermark">Acillazım.com</div>
              </div>
            </div>
            <button className="service-detail__gallery-modal-nav next" onClick={handleNextImage} aria-label="Sonraki görsel"><FaChevronRight /></button>
          </div>
          <div className="service-detail__gallery-modal-footer">
            <div className="service-detail__gallery-modal-thumbnails">
              {(serviceData.gallery as string[]).map((image, index) => (
                <div key={index} className={`service-detail__gallery-modal-thumbnail ${index === selectedImageIndex ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); handleThumbnailClick(index); }}>
                  <img src={image} alt={`Thumbnail ${index + 1}`} loading="lazy" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                  <div className="service-detail__gallery-modal-thumbnail-watermark">Acillazım.com</div>
                </div>
              ))}
            </div>
            <div className="service-detail__gallery-modal-counter">{selectedImageIndex + 1} / {(serviceData.gallery as string[]).length}</div>
          </div>
        </div>
      )}

      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={closeAppointmentModal}
        serviceData={appointmentData.service as Record<string, unknown> | undefined}
        selectedPackage={
          (appointmentData.selectedPackage ?? null) as Record<string, unknown> | null | undefined
        }
        onAppointmentSubmit={handleAppointmentSubmit}
      />

      <ComplaintModal
        isOpen={complaintModalOpen}
        onClose={() => setComplaintModalOpen(false)}
        tip="ilan"
        hedefId={String(p.ilan_id || '')}
        hedefAdi={String(p.baslik || '')}
      />
    </>
  );
};

export default ServiceDetailPage;
