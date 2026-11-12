"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './NotifyDropdown.css';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  FaBell,
  FaCheckDouble,
  FaComments,
  FaCalendarAlt,
  FaHeart,
  FaTag,
  FaStar,
  FaCheckCircle,
  FaTimesCircle,
  FaRegClock,
  FaCog,
} from 'react-icons/fa';
import notificationService from '@/services/notification/notificationService';
import {
  normalizeNotificationType,
  toTrLower,
} from '@/utils/notificationUtils';

interface Notification {
  id: string | number;
  title: string;
  message?: string;
  type?: string;
  read: boolean;
  createdAt?: string;
  date?: string;
}

const getNotificationBadgeConfig = (notification: Notification) => {
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

  if (isCancelled || normType === 'listing-expired') {
    return {
      className: 'notify-icon--danger',
      icon: <FaTimesCircle size={13} />,
    };
  }

  if (isCompleted || normType === 'welcome' || normType === 'listing-published') {
    return {
      className: 'notify-icon--success',
      icon: <FaCheckCircle size={13} />,
    };
  }

  if (normType === 'new-message') {
    return {
      className: 'notify-icon--message',
      icon: <FaComments size={13} />,
    };
  }

  if (normType === 'new-favorite') {
    return {
      className: 'notify-icon--favorite',
      icon: <FaHeart size={13} />,
    };
  }

  if (normType === 'appointment-request') {
    return {
      className: 'notify-icon--appointment',
      icon: <FaCalendarAlt size={13} />,
    };
  }

  if (normType === 'price-drop') {
    return {
      className: 'notify-icon--price',
      icon: <FaTag size={13} />,
    };
  }

  if (normType === 'seller-review') {
    return {
      className: 'notify-icon--review',
      icon: <FaStar size={13} />,
    };
  }

  if (normType === 'expiring-soon') {
    return {
      className: 'notify-icon--warning',
      icon: <FaRegClock size={13} />,
    };
  }

  if (normType === 'system-update') {
    return {
      className: 'notify-icon--default',
      icon: <FaCog size={13} />,
    };
  }

  return {
    className: 'notify-icon--default',
    icon: <FaBell size={13} />,
  };
};

interface NotifyDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotifyDropdown: React.FC<NotifyDropdownProps> = ({ isOpen, onClose }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [mounted, setMounted] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const userId = parseInt(localStorage.getItem('userId') || '123') || 123;
      const response = await notificationService.getNotifications({ userId, limit: 50 });
      const notifs: Notification[] = response.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    } catch (err) {
      console.error('Bildirimler yüklenirken hata:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadNotifications();
  }, [isOpen, loadNotifications]);

  useEffect(() => {
    const handleNotificationUpdate = () => { if (isOpen) loadNotifications(); };
    window.addEventListener('notificationsUpdated', handleNotificationUpdate);
    return () => window.removeEventListener('notificationsUpdated', handleNotificationUpdate);
  }, [isOpen, loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const userId = parseInt(localStorage.getItem('userId') || '123') || 123;
      await notificationService.markAllAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('notificationsUpdated'));
    } catch (err) {
      console.error('Tüm bildirimleri okundu işaretleme hatası:', err);
    }
  };

  const handleItemClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await notificationService.markAsRead(notification.id);
        window.dispatchEvent(new CustomEvent('notificationsUpdated'));
      } catch (err) {
        console.error('Bildirim okundu işaretleme hatası:', err);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  const recentNotifications = [...notifications]
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || '');
      const dateB = new Date(b.createdAt || b.date || '');
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);

  const totalCount = notifications.length;

  const dropdownMarkup = (
    <>
      <div className="notify-dropdown-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="notify-dropdown-container" ref={dropdownRef}>
        {/* ── Üst Başlık (Kurumsal Lacivert & Turuncu Rozet) ── */}
        <div className="notify-dropdown-header">
          <div className="notify-dropdown-title">
            <FaBell className="notify-bell-icon" />
            <h3>Bildirimler</h3>
            {unreadCount > 0 && (
              <span className="notify-unread-badge">{unreadCount} yeni</span>
            )}
          </div>
          <div className="notify-dropdown-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="notify-dropdown-mark-all-read"
                onClick={handleMarkAllAsRead}
                title="Tümünü okundu olarak işaretle"
              >
                <FaCheckDouble size={11} />
                <span>Okundu</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Bildirimler Akış Listesi ── */}
        <div className="notify-dropdown-list">
          {recentNotifications.map((notification) => {
            const badge = getNotificationBadgeConfig(notification);
            return (
              <a
                href={`/dashboard/bildirimler?id=${notification.id}`}
                key={notification.id}
                className={`notify-dropdown-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => handleItemClick(notification)}
              >
                <div className={`notify-dropdown-item__icon ${badge.className}`}>
                  {badge.icon}
                </div>
                <div className="notify-dropdown-item__content">
                  <div className="notify-dropdown-item__title">{notification.title}</div>
                  {notification.message && (
                    <div className="notify-dropdown-item__message">{notification.message}</div>
                  )}
                  <div className="notify-dropdown-item__date">
                    {(() => {
                      const dateStr = notification.createdAt || notification.date;
                      const date = new Date(dateStr || '');
                      if (isNaN(date.getTime())) return 'Tarih bilgisi yok';
                      return formatDistanceToNow(date, { addSuffix: true, locale: tr });
                    })()}
                  </div>
                </div>
              </a>
            );
          })}

          {recentNotifications.length === 0 && (
            <div className="notify-dropdown-empty">
              <p>Henüz bir bildiriminiz bulunmuyor.</p>
            </div>
          )}

          {/* ── Listenin en altında sade, altı çizgili ve hafif soluk "Tümünü Gör" ── */}
          {totalCount > 0 && (
            <div className="notify-dropdown-inline-footer">
              <a
                href="/dashboard/bildirimler"
                className="notify-dropdown-subtle-link"
                onClick={onClose}
              >
                <span>Tümünü Gör ({totalCount})</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Mobilde ve tabletlerde (<= 1024px) portal kullanarak body'ye bağla; sıfır taşma, tam ortalama
  if (mounted && isMobile && typeof document !== 'undefined') {
    return createPortal(dropdownMarkup, document.body);
  }

  return dropdownMarkup;
};

export default NotifyDropdown;
