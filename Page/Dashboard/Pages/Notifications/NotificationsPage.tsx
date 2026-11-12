"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FaCheck,
  FaChevronRight,
  FaCalendarAlt,
  FaComments,
  FaHeart,
  FaTag,
  FaStar,
  FaBullhorn,
  FaExclamationTriangle,
  FaCog,
  FaBriefcase,
  FaTimesCircle,
  FaArrowLeft,
  FaClock,
  FaExternalLinkAlt,
} from 'react-icons/fa';
import { BsBellFill, BsCheck2All } from 'react-icons/bs';
import {
  normalizeNotificationType,
  getNotificationTypeLabel,
  toTrLower,
} from '@/utils/notificationUtils';
import notificationService from '@/services/notification/notificationService';
import './NotificationsPage.css';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt?: string;
  date?: string;
  link?: string;
  actionLink?: string;
  actionText?: string;
}

type NotifSvc = {
  getNotifications: (opts: Record<string, unknown>) => Promise<{ notifications?: Notification[] }>;
  markAllAsRead: (userId: number) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
};

const renderTypeVectorIcon = (
  normType: string,
  isCompleted: boolean,
  isCancelled: boolean
): React.ReactNode => {
  if (isCompleted) return <FaCheck />;
  if (isCancelled) return <FaTimesCircle />;

  switch (normType) {
    case 'appointment-request':
      return <FaCalendarAlt />;
    case 'new-message':
      return <FaComments />;
    case 'new-favorite':
      return <FaHeart />;
    case 'price-drop':
      return <FaTag />;
    case 'seller-review':
      return <FaStar />;
    case 'listing-published':
      return <FaBullhorn />;
    case 'expiring-soon':
    case 'listing-expired':
      return <FaExclamationTriangle />;
    case 'system-update':
      return <FaCog />;
    default:
      return <FaBriefcase />;
  }
};

const getNotificationAction = (notification: Notification) => {
  const normType = normalizeNotificationType(
    notification.type,
    notification.title,
    notification.message
  );
  const textLower = toTrLower(`${notification.title || ''} ${notification.message || ''}`);
  const isCompleted = textLower.includes('tamamland');
  const isCancelled = textLower.includes('iptal');

  if (notification.actionLink || notification.link) {
    return {
      label: notification.actionText || 'İlgili Sayfaya Git',
      href: notification.actionLink || notification.link || '#',
      icon: <FaExternalLinkAlt size={13} />,
    };
  }

  if (normType === 'appointment-request') {
    if (isCompleted) {
      return {
        label: 'Randevu Geçmişini Görüntüle',
        href: '/dashboard/randevular/gecmis',
        icon: <FaCalendarAlt size={13} />,
      };
    }
    if (isCancelled) {
      return {
        label: 'Randevuları Yönet',
        href: '/dashboard/randevular',
        icon: <FaCalendarAlt size={13} />,
      };
    }
    return {
      label: 'Randevu Detayını İncele',
      href: '/dashboard/randevular',
      icon: <FaCalendarAlt size={13} />,
    };
  }

  if (normType === 'new-message') {
    return {
      label: 'Mesajlara Git ve Yanıtla',
      href: '/dashboard/mesajlar',
      icon: <FaComments size={13} />,
    };
  }

  if (normType === 'price-drop') {
    return {
      label: 'Favori İlanları İncele',
      href: '/dashboard/favoriler',
      icon: <FaTag size={13} />,
    };
  }

  if (normType === 'new-favorite' || normType === 'listing-published' || normType === 'expiring-soon' || normType === 'listing-expired') {
    return {
      label: 'İlanlarımı Yönet',
      href: '/dashboard/ilanlarim',
      icon: <FaBullhorn size={13} />,
    };
  }

  return null;
};

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Az önce';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Az önce';

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return 'Az önce';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} gün önce`;
  return `${Math.floor(diffDays / 7)} hafta önce`;
}

function formatFullDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

function renderCleanMessage(message: string): React.ReactNode {
  if (!message) return null;
  const quoteMatch = message.match(/"([^"]+)"/);
  if (!quoteMatch) {
    return message;
  }
  const before = message.slice(0, quoteMatch.index);
  const quote = quoteMatch[1];
  const after = message.slice((quoteMatch.index || 0) + quoteMatch[0].length);

  return (
    <>
      {before}
      <span className="notifications-quoted-text">&ldquo;{quote}&rdquo;</span>
      {after}
    </>
  );
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const userId = parseInt(localStorage.getItem('userId') || '123') || 123;
      const svc = notificationService as unknown as NotifSvc;
      const response = await svc.getNotifications({ userId, limit: 100 });
      const notifs: Notification[] = response.notifications || [];
      setNotifications(notifs);

      // URL'deki ?id parametresine göre hedef bildirimi seç
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('id');
        if (targetId) {
          const found = notifs.find((n) => String(n.id) === targetId);
          if (found) {
            setSelectedNotification(found);
            if (!found.read) {
              await svc.markAsRead(found.id);
              found.read = true;
              window.dispatchEvent(new CustomEvent('notificationsUpdated'));
            }
            if (window.innerWidth < 900) {
              setMobileView('detail');
            }
            return;
          }
        }
      }

      // Varsayılan olarak ilk bildirimi seç
      if (notifs.length > 0 && !selectedNotification) {
        setSelectedNotification(notifs[0]);
      }
    } catch (err) {
      console.error('Bildirimler yüklenirken hata oluştu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSelectNotification = async (notif: Notification) => {
    setSelectedNotification(notif);
    setMobileView('detail');

    if (!notif.read) {
      try {
        const svc = notificationService as unknown as NotifSvc;
        await svc.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        window.dispatchEvent(new CustomEvent('notificationsUpdated'));
      } catch (err) {
        console.error('Bildirim okundu işaretleme hatası:', err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const userId = parseInt(localStorage.getItem('userId') || '123') || 123;
      const svc = notificationService as unknown as NotifSvc;
      await svc.markAllAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      if (selectedNotification) {
        setSelectedNotification({ ...selectedNotification, read: true });
      }
      window.dispatchEvent(new CustomEvent('notificationsUpdated'));
    } catch (err) {
      console.error('Tümünü okundu işaretleme hatası:', err);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (readFilter === 'unread') return !notif.read;
    if (readFilter === 'read') return notif.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;
  const totalCount = notifications.length;

  return (
    <div className="notifications-page">
      {/* ── 1. ÜST BAŞLIK VE KONTROL BARI ── */}
      <div className="notifications-header-bar">
        <div className="notifications-header-info">
          <div className="notifications-title-row">
            <h1 className="notifications-page-title">Bildirimler</h1>
            {unreadCount > 0 && (
              <span className="notifications-count-badge">
                {unreadCount} yeni
              </span>
            )}
          </div>
          <p className="notifications-page-desc">
            İlan, mesaj, randevu ve hesap hareketlerinize ait güncellemeler
          </p>
        </div>

        <div className="notifications-header-controls">
          <button
            type="button"
            className="notifications-mark-read-btn"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            title="Tüm okunmamış bildirimleri okundu olarak işaretle"
          >
            <BsCheck2All size={15} />
            <span>Tümünü Okundu Say</span>
          </button>
        </div>
      </div>

      {/* ── 2. İKİ KOLONLU MASTER-DETAIL AKIŞ KARTI ── */}
      <div
        className={`notifications-split-card ${
          mobileView === 'detail' ? 'show-mobile-detail' : 'show-mobile-list'
        }`}
      >
        {/* ════════════ SOL KOLON: BİLDİRİM LİSTESİ ════════════ */}
        <aside className="notifications-list-column">
          {/* Liste Üstü Filtre Butonları */}
          <div className="notifications-list-header">
            <div className="notifications-tabs-group" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={readFilter === 'all'}
                className={`notifications-tab-btn ${readFilter === 'all' ? 'active' : ''}`}
                onClick={() => setReadFilter('all')}
              >
                Tümü ({totalCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={readFilter === 'unread'}
                className={`notifications-tab-btn ${readFilter === 'unread' ? 'active' : ''}`}
                onClick={() => setReadFilter('unread')}
              >
                Okunmamış ({unreadCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={readFilter === 'read'}
                className={`notifications-tab-btn ${readFilter === 'read' ? 'active' : ''}`}
                onClick={() => setReadFilter('read')}
              >
                Okunmuş ({readCount})
              </button>
            </div>
          </div>

          {/* Liste İçeriği (Görünmez Scroll ile Akıcı Kaydırma) */}
          <div className="notifications-list-scroll">
            {loading ? (
              <div className="notifications-loading-state">
                <div className="notifications-spinner" />
                <p>Bildirimler getiriliyor...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="notifications-empty-state">
                <div className="notifications-empty-icon">
                  <BsBellFill size={20} />
                </div>
                <h4 className="notifications-empty-title">Bildirim Bulunamadı</h4>
                <p className="notifications-empty-desc">
                  {readFilter !== 'all'
                    ? 'Seçtiğiniz filtreye uygun bildirim yok.'
                    : 'Henüz hesabınıza ulaşmış aktif bir bildirim bulunmuyor.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const normType = normalizeNotificationType(
                  notification.type,
                  notification.title,
                  notification.message
                );
                const textLower = toTrLower(
                  `${notification.title || ''} ${notification.message || ''}`
                );
                const isCompleted = textLower.includes('tamamland');
                const isCancelled = textLower.includes('iptal');
                const isUrgent =
                  normType === 'expiring-soon' || normType === 'listing-expired' || isCancelled;
                const isSuccess =
                  isCompleted || normType === 'listing-published' || normType === 'welcome';

                let iconClass = 'icon--neutral';
                if (isUrgent) iconClass = 'icon--urgent';
                else if (isSuccess) iconClass = 'icon--success';
                else if (normType === 'price-drop' || normType === 'new-favorite')
                  iconClass = 'icon--accent';

                const isSelected = selectedNotification?.id === notification.id;

                return (
                  <div
                    key={notification.id}
                    className={`notifications-row ${
                      notification.read ? 'is-read' : 'is-unread'
                    } ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelectNotification(notification)}
                  >
                    {/* Sol İkon (36px) */}
                    <div className={`notifications-row-icon ${iconClass}`}>
                      {renderTypeVectorIcon(normType, isCompleted, isCancelled)}
                    </div>

                    {/* Başlık ve Kısa Özet */}
                    <div className="notifications-row-body">
                      <div className="notifications-row-title-wrap">
                        <span className="notifications-row-title">
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <span
                            className="notifications-inline-unread-dot"
                            title="Okunmamış"
                          />
                        )}
                      </div>
                      <p className="notifications-row-snippet">
                        {notification.message}
                      </p>
                    </div>

                    {/* Sağ Zaman */}
                    <div className="notifications-row-meta">
                      <span className="notifications-row-time">
                        {formatRelativeTime(notification.createdAt || notification.date)}
                      </span>
                      <FaChevronRight size={10} className="notifications-row-chevron" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ════════════ SAĞ KOLON: BİLDİRİM DETAY PANELİ ════════════ */}
        <section className="notifications-detail-column">
          {selectedNotification ? (
            (() => {
              const normType = normalizeNotificationType(
                selectedNotification.type,
                selectedNotification.title,
                selectedNotification.message
              );
              const textLower = toTrLower(
                `${selectedNotification.title || ''} ${selectedNotification.message || ''}`
              );
              const isCompleted = textLower.includes('tamamland');
              const isCancelled = textLower.includes('iptal');
              const isUrgent =
                normType === 'expiring-soon' || normType === 'listing-expired' || isCancelled;
              const isSuccess =
                isCompleted || normType === 'listing-published' || normType === 'welcome';

              let iconClass = 'icon--neutral';
              let badgeClass = 'badge--neutral';
              if (isUrgent) {
                iconClass = 'icon--urgent';
                badgeClass = 'badge--urgent';
              } else if (isSuccess) {
                iconClass = 'icon--success';
                badgeClass = 'badge--success';
              } else if (normType === 'price-drop' || normType === 'new-favorite') {
                iconClass = 'icon--accent';
                badgeClass = 'badge--accent';
              }

              const typeLabel = isCompleted
                ? 'Randevu Tamamlandı'
                : isCancelled
                ? 'Randevu İptali'
                : getNotificationTypeLabel(
                    selectedNotification.type,
                    selectedNotification.title,
                    selectedNotification.message
                  );

              const action = getNotificationAction(selectedNotification);

              return (
                <div className="notifications-detail-container">
                  {/* Detay Üst Barı (Kategori & Tarih) */}
                  <div className="notifications-detail-topbar">
                    <div className="notifications-detail-topbar-left">
                      {/* Mobilde Listeye Geri Dön Butonu */}
                      <button
                        type="button"
                        className="notifications-mobile-back-btn"
                        onClick={() => setMobileView('list')}
                      >
                        <FaArrowLeft size={12} />
                        <span>Listeye Dön</span>
                      </button>

                      <span className={`notifications-detail-badge ${badgeClass}`}>
                        {typeLabel}
                      </span>
                      <span className="notifications-detail-date">
                        <FaClock size={11} />
                        <span>{formatFullDate(selectedNotification.createdAt || selectedNotification.date)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Detay Başlığı & İkon */}
                  <div className="notifications-detail-hero">
                    <div className={`notifications-detail-icon-box ${iconClass}`}>
                      {renderTypeVectorIcon(normType, isCompleted, isCancelled)}
                    </div>
                    <div className="notifications-detail-heading">
                      <h2 className="notifications-detail-title">
                        {selectedNotification.title}
                      </h2>
                      <div className="notifications-detail-meta-row">
                        <span className="notifications-detail-relative">
                          {formatRelativeTime(selectedNotification.createdAt || selectedNotification.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detay Ana Mesajı */}
                  <div className="notifications-detail-content">
                    <h4 className="notifications-detail-content-heading">
                      Bildirim Açıklaması
                    </h4>
                    <div className="notifications-detail-message-box">
                      <p className="notifications-detail-message-text">
                        {renderCleanMessage(selectedNotification.message)}
                      </p>
                    </div>

                    {/* Bento Bilgi Kartları */}
                    <div className="notifications-detail-bento">
                      <div className="notifications-bento-card">
                        <span className="bento-label">Bildirim Türü</span>
                        <strong className="bento-value">{typeLabel}</strong>
                      </div>
                      <div className="notifications-bento-card">
                        <span className="bento-label">İşlem Zamanı</span>
                        <strong className="bento-value">
                          {formatRelativeTime(selectedNotification.createdAt || selectedNotification.date)}
                        </strong>
                      </div>
                      <div className="notifications-bento-card">
                        <span className="bento-label">Durum</span>
                        <strong className="bento-value" style={{ color: '#16a34a' }}>
                          Okundu
                        </strong>
                      </div>
                    </div>

                    {/* İlgili Sayfaya Hızlı Geçiş Butonu (Ana Aksiyon) */}
                    {action && (
                      <div className="notifications-detail-action-bar">
                        <Link
                          href={action.href}
                          className="notifications-detail-primary-btn"
                        >
                          {action.icon}
                          <span>{action.label}</span>
                          <FaExternalLinkAlt size={11} className="notifications-btn-arrow" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="notifications-detail-empty-state">
              <div className="notifications-detail-empty-icon">
                <BsBellFill size={28} />
              </div>
              <h3 className="notifications-detail-empty-title">Bir Bildirim Seçin</h3>
              <p className="notifications-detail-empty-desc">
                Ayrıntıları, ilgili işlem bağlantılarını ve bildirim içeriğini görüntülemek için sol taraftaki listeden bir bildirime tıklayın.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default NotificationsPage;
