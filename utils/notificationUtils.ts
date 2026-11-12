import React from 'react';
import {
  FaCalendarAlt,
  FaComments,
  FaHeart,
  FaTag,
  FaStar,
  FaBullhorn,
  FaRegClock,
  FaTimesCircle,
  FaCheckCircle,
  FaCog,
  FaBell,
  FaBriefcase,
} from 'react-icons/fa';

/**
 * Bildirim yardımcı fonksiyonları
 * Bildirim tiplerini kullanıcıya anlamlı Türkçe ifadelerle gösterir
 */

export type NotificationType =
  | 'welcome'
  | 'price-drop'
  | 'listing-published'
  | 'expiring-soon'
  | 'system-update'
  | 'new-favorite'
  | 'new-message'
  | 'appointment-request'
  | 'seller-review'
  | 'listing-expired';

interface Notification {
  id?: number;
  title?: string;
  message?: string;
  type?: string;
  createdAt?: string;
  date?: string;
}

/**
 * Türkçe karakterleri (İ -> i, I -> ı) bozmadan güvenli küçük harfe çevirir.
 * Standart .toLowerCase() çağrısı 'İ' karakterini 'i\u0307' yaptığı için
 * .includes('iptal') gibi aramaların başarısız olmasını önler.
 */
export const toTrLower = (val?: string | null): string =>
  (val || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFC');

/**
 * Backend'den gelen farklı formatlardaki bildirim tiplerini (örn: new_message, message, appointment_request)
 * ve başlık/mesaj içeriklerini standart kurumsal bildirim tipine dönüştürür.
 */
export const normalizeNotificationType = (
  type?: string | null,
  title?: string | null,
  message?: string | null
): string => {
  const raw = toTrLower(type).trim().replace(/_/g, '-');
  const combined = toTrLower(`${title || ''} ${message || ''}`);

  if (
    raw === 'new-message' ||
    raw === 'message' ||
    raw === 'messages' ||
    raw === 'chat' ||
    raw.includes('message') ||
    raw.includes('mesaj') ||
    combined.includes('mesaj')
  ) {
    return 'new-message';
  }

  if (
    raw === 'appointment-request' ||
    raw === 'appointment' ||
    raw === 'appointments' ||
    raw.includes('appointment') ||
    raw.includes('randevu') ||
    combined.includes('randevu')
  ) {
    return 'appointment-request';
  }

  if (
    raw === 'seller-review' ||
    raw === 'review' ||
    raw === 'reviews' ||
    raw.includes('review') ||
    raw.includes('rating') ||
    combined.includes('değerlendirme') ||
    combined.includes('yorum')
  ) {
    return 'seller-review';
  }

  if (
    raw === 'new-favorite' ||
    raw === 'favorite' ||
    raw.includes('favorite') ||
    raw.includes('favori') ||
    combined.includes('favori')
  ) {
    return 'new-favorite';
  }

  if (
    raw === 'price-drop' ||
    raw.includes('price') ||
    raw.includes('fiyat') ||
    combined.includes('fiyat')
  ) {
    return 'price-drop';
  }

  if (
    raw === 'listing-expired' ||
    raw.includes('expired') ||
    combined.includes('süresi doldu')
  ) {
    return 'listing-expired';
  }

  if (
    raw === 'expiring-soon' ||
    raw.includes('expiring') ||
    combined.includes('süresi doluyor') ||
    combined.includes('sona eriyor')
  ) {
    return 'expiring-soon';
  }

  if (
    raw === 'listing-published' ||
    raw === 'listing-approved' ||
    raw.includes('published') ||
    raw.includes('approved') ||
    combined.includes('yayınlandı') ||
    combined.includes('yayına alındı')
  ) {
    return 'listing-published';
  }

  if (raw === 'welcome' || combined.includes('hoş geldiniz') || combined.includes('hos geldiniz')) {
    return 'welcome';
  }

  if (raw === 'system-update' || raw.includes('system') || raw.includes('update')) {
    return 'system-update';
  }

  return raw || 'system-update';
};

/**
 * Bildirim tipini Türkçe'ye çevirir
 */
export const getNotificationTypeLabel = (
  type?: string | null,
  title?: string | null,
  message?: string | null
): string => {
  const norm = normalizeNotificationType(type, title, message);
  const combined = toTrLower(`${title || ''} ${message || ''}`);

  if (norm === 'appointment-request') {
    if (combined.includes('tamamland')) return 'Randevu Tamamlandı';
    if (combined.includes('iptal')) return 'Randevu İptali';
    if (
      combined.includes('reddedildi') ||
      combined.includes('reddetti') ||
      combined.includes('red edildi')
    ) {
      return 'Randevu Reddedildi';
    }
    if (combined.includes('onayland') || combined.includes('kabul edildi')) {
      return 'Randevu Onaylandı';
    }
    if (
      combined.includes('değiştirildi') ||
      combined.includes('yeni tarih') ||
      combined.includes('ertele') ||
      combined.includes('revize')
    ) {
      return 'Randevu Güncellemesi';
    }
  }

  const typeLabels: Record<string, string> = {
    'welcome': 'Hoş Geldiniz',
    'price-drop': 'Fiyat Düşüşü',
    'listing-published': 'İlan Yayınlandı',
    'expiring-soon': 'Süresi Doluyor',
    'system-update': 'Sistem Güncellemesi',
    'new-favorite': 'Yeni Favori',
    'new-message': 'Yeni Mesaj',
    'appointment-request': 'Randevu Talebi',
    'seller-review': 'Değerlendirme',
    'listing-expired': 'İlan Süresi Doldu',
  };
  return typeLabels[norm] || 'Sistem Bildirimi';
};

/**
 * Bildirim tipine göre kurumsal SVG vektör ikon döndürür (Sıfır Raw Emoji Kuralı)
 */
export const getNotificationVectorIcon = (
  type?: string | null,
  title?: string | null,
  message?: string | null
): React.ReactNode => {
  const norm = normalizeNotificationType(type, title, message);
  switch (norm) {
    case 'welcome':
      return React.createElement(FaCheckCircle);
    case 'price-drop':
      return React.createElement(FaTag);
    case 'listing-published':
      return React.createElement(FaBullhorn);
    case 'expiring-soon':
      return React.createElement(FaRegClock);
    case 'system-update':
      return React.createElement(FaCog);
    case 'new-favorite':
      return React.createElement(FaHeart);
    case 'new-message':
      return React.createElement(FaComments);
    case 'appointment-request':
      return React.createElement(FaCalendarAlt);
    case 'seller-review':
      return React.createElement(FaStar);
    case 'listing-expired':
      return React.createElement(FaTimesCircle);
    default:
      return React.createElement(FaBell);
  }
};

/**
 * Geriye dönük uyumluluk için ikon fonksiyonu (Vektör ikonu render eder)
 */
export const getNotificationIcon = (
  type?: string | null,
  title?: string | null,
  message?: string | null
): React.ReactNode => {
  return getNotificationVectorIcon(type, title, message);
};

/**
 * Bildirim tipine göre kurumsal renk döndürür (60-30-10 Kurumsal Semantik Palet: Lacivert #003466, Turuncu #FF6B00)
 */
export const getNotificationColor = (
  type?: string | null,
  title?: string | null,
  message?: string | null
): string => {
  const norm = normalizeNotificationType(type, title, message);
  const colors: Record<string, string> = {
    'welcome': '#16a34a',           // Başarılı / Yeşil
    'price-drop': '#FF6B00',        // Fırsat / Kurumsal Turuncu
    'listing-published': '#003466', // Kurumsal Lacivert
    'expiring-soon': '#d97706',     // Dikkat / Kehribar
    'system-update': '#003466',     // Kurumsal Lacivert
    'new-favorite': '#e11d48',      // Beğeni / Gül
    'new-message': '#003466',       // İletişim / Kurumsal Lacivert
    'appointment-request': '#FF6B00', // Aksiyon / Kurumsal Turuncu
    'seller-review': '#d97706',     // Yıldız / Altın Kehribar
    'listing-expired': '#dc2626',   // Süre Sonu / Kırmızı
  };
  return colors[norm] || '#003466';
};

/**
 * Bildirim tarihini güvenli şekilde formatlar
 */
export const formatNotificationDate = (
  date: string | Date | null,
  notification: Notification | null = null
): Date | string => {
  const dateStr = date || notification?.createdAt || notification?.date;
  if (!dateStr) return 'Tarih bilgisi yok';

  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return 'Tarih bilgisi yok';

  return dateObj;
};

/**
 * Bildirim başlığından URL-friendly slug oluşturur
 */
export const createNotificationSlug = (title: string): string => {
  if (!title) return '';

  let slug = title
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c')
    .toLowerCase();

  slug = slug
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug;
};

/**
 * Slug'dan bildirim ID'sini bulur
 */
export const getNotificationIdFromSlug = (slug: string, notifications: Notification[]): number | null => {
  if (!slug || !notifications || notifications.length === 0) return null;
  const notification = notifications.find((n) => createNotificationSlug(n.title || '') === slug);
  return notification?.id ?? null;
};

/**
 * Bildirim ID'sinden slug'ı bulur
 */
export const getNotificationSlugFromId = (id: number, notifications: Notification[]): string | null => {
  if (!id || !notifications || notifications.length === 0) return null;
  const notification = notifications.find((n) => n.id === parseInt(String(id)));
  return notification ? createNotificationSlug(notification.title || '') : null;
};
