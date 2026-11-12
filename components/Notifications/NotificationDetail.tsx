"use client";

import React, { useEffect, useState } from 'react';
import notificationService from '@/services/notification/notificationService';
import { IoArrowBack } from 'react-icons/io5';
import './NotificationDetail.css';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';

interface Notification {
  id: number;
  title: string;
  read: boolean;
  [key: string]: unknown;
}

interface NotificationDetailProps {
  id: string;
}

const NotificationDetail: React.FC<NotificationDetailProps> = ({ id }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const userId = parseInt(localStorage.getItem('userId') || '123') || 123;
        const response = await notificationService.getNotifications({ userId });
        const notifs: Notification[] = response.notifications || [];
        setNotifications(notifs);
        const found = notifs.find((n) => n.id === parseInt(id));
        setNotification(found || null);
      } catch (err) {
        console.error('Bildirimler yüklenirken hata:', err);
      }
    };
    loadNotifications();
  }, [id]);

  useEffect(() => {
    const markNotificationAsRead = async () => {
      if (notification && !notification.read) {
        try {
          await notificationService.markAsRead(notification.id);
          setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
          );
          setNotification((prev) => (prev ? { ...prev, read: true } : null));
        } catch (err) {
          console.error('Bildirim güncellenirken hata:', err);
        }
      }
    };
    markNotificationAsRead();
  }, [notification]);

  if (!notification) {
    return (
      <>
        <Navbar />
        <div className="notification-detail">
          <div className="notification-detail-header">
            <button onClick={() => { window.location.href = '/notifications'; }} className="back-button">
              <IoArrowBack /> Bildirimlere Dön
            </button>
          </div>
          <div className="notification-not-found">Bildirim bulunamadı</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="notification-detail">
        <div className="back-section">
          <a href="/notifications" className="back-link">
            <IoArrowBack /> Bildirimlere Dön
          </a>
        </div>

        <div className="notification-detail-content">
          <div className="alert-banner price">
            <span>Fırsat! Bu ilan için kaçırılmayacak bir fiyat düşüşü gerçekleşti.</span>
          </div>

          <div className="property-info">
            <h3>Favorinizdeki &apos;{notification.title}&apos; ilanının fiyatı düştü!</h3>
            <div className="price-info">
              <div className="price-comparison">
                <div className="price-item">
                  <span className="price-label">Eski Fiyat</span>
                  <span className="old-price">2.200.000 TL</span>
                </div>
                <div className="price-arrow">→</div>
                <div className="price-item">
                  <span className="price-label">Yeni Fiyat</span>
                  <span className="new-price">2.100.000 TL</span>
                </div>
              </div>
            </div>
            <div className="action-section">
              <p className="opportunity-text">
                Bu fiyat düşüşü son 30 günün en iyi fırsatı! Benzer konumdaki ilanların ortalama fiyatının altında.
              </p>
              <button className="view-listing-btn">İlanı İncele</button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default NotificationDetail;
