"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FaAd, FaEye, FaHeart, FaComments,
  FaPlus, FaTools, FaChartLine, FaBookmark,
  FaCalendarAlt, FaMapMarkerAlt, FaClock, FaCheckCircle, FaHourglassHalf,
  FaArrowRight, FaCalendarCheck
} from 'react-icons/fa';
import styles from './Overview.module.css';
import { useAuth } from '@/context/AuthContext';
import { getProviderAppointments } from '@/services/appointment/appointmentService';
import { ListingService } from '@/services/listingService';
import * as messageService from '@/services/message/messageService';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface AuthContextValue {
  currentUser: { name?: string; id?: number | string } | null;
  isAuthenticated: boolean;
}

interface UserListing {
  id: number | string;
  title: string;
  categoryName?: string;
  price?: number | null;
  currency?: string;
  viewCount?: number;
  favoriteCount?: number;
  active?: boolean;
  createdAt?: string;
}

interface AppointmentItem {
  title?: string;
  date: string;
  time?: string;
  status: string;
  location?: string;
  service?: { image?: string };
}

function getUserId(currentUser: { id?: number | string } | null): number {
  if (currentUser?.id && !Number.isNaN(Number(currentUser.id))) return Number(currentUser.id);
  if (typeof window !== 'undefined') {
    const stored = parseInt(localStorage.getItem('userId') || '0', 10);
    if (stored) return stored;
  }
  return 0;
}

function formatPrice(price?: number | null, currency?: string): string {
  if (price === null || price === undefined) return 'Belirtilmemiş';
  const cur = currency === 'TRY' ? 'TL' : (currency || 'TL');
  return `${price.toLocaleString('tr-TR')} ${cur}`;
}

const Overview: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth() as AuthContextValue;
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentItem[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState<boolean>(true);
  const [totalAppointmentsCount, setTotalAppointmentsCount] = useState<number>(0);

  const [listings, setListings] = useState<UserListing[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [listingsLoading, setListingsLoading] = useState<boolean>(true);

  const userName = currentUser?.name || 'Kullanıcı';

  const getCurrentDate = () =>
    new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  const getCurrentDay = () =>
    ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][new Date().getDay()];

  // Backend API çağrıları — %100 orijinal ve dokunulmadı
  useEffect(() => {
    if (!isAuthenticated) {
      setListings([]);
      setListingsLoading(false);
      return;
    }
    const userId = getUserId(currentUser);
    if (!userId) {
      setListingsLoading(false);
      return;
    }
    setListingsLoading(true);
    ListingService.getUserListings(userId, 100)
      .then((data) => setListings((data as UserListing[]) || []))
      .finally(() => setListingsLoading(false));
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadMessages(0);
      return;
    }
    const svc = messageService as { getUnreadCount?: () => Promise<number> };
    svc.getUnreadCount?.().then(setUnreadMessages).catch(() => setUnreadMessages(0));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUpcomingAppointments([]);
      setTotalAppointmentsCount(0);
      setAppointmentsLoading(false);
      return;
    }
    const fetchAppointments = async () => {
      try {
        const data = (await getProviderAppointments()) as unknown as AppointmentItem[];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const allUpcoming = data
          .filter((app) => {
            const d = new Date(app.date);
            return d >= today && (app.status === 'confirmed' || app.status === 'pending');
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setTotalAppointmentsCount(allUpcoming.length);
        setUpcomingAppointments(allUpcoming.slice(0, 3));
      } catch {
        setUpcomingAppointments([]);
      } finally {
        setAppointmentsLoading(false);
      }
    };
    fetchAppointments();
  }, [isAuthenticated]);

  const activeCount = listings.filter((l) => l.active !== false).length;
  const passiveCount = listings.filter((l) => l.active === false).length;
  const totalViews = listings.reduce((sum, l) => sum + (l.viewCount || 0), 0);
  const totalFavorites = listings.reduce((sum, l) => sum + (l.favoriteCount || 0), 0);

  // 4 Temel KPI Kartı — Doğal, kurumsal, tek tip sakin renk paleti (Göz yormayan kurumsal lacivert & slate)
  const stats = [
    {
      id: 'listings',
      title: 'Aktif İlanlarım',
      value: String(activeCount),
      subtext: `${passiveCount} pasif • ${listings.length} toplam ilan`,
      icon: <FaAd />,
    },
    {
      id: 'views',
      title: 'Toplam Görüntülenme',
      value: totalViews.toLocaleString('tr-TR'),
      subtext: 'Tüm ilanlar genelinde',
      icon: <FaEye />,
    },
    {
      id: 'favorites',
      title: 'Favoriye Eklenme',
      value: totalFavorites.toLocaleString('tr-TR'),
      subtext: 'Kullanıcı ilgisi & takibi',
      icon: <FaHeart />,
    },
    {
      id: 'messages',
      title: 'Okunmamış Mesajlar',
      value: String(unreadMessages),
      subtext: unreadMessages > 0 ? `${unreadMessages} yanıt bekliyor` : 'Bekleyen yeni mesaj yok',
      icon: <FaComments />,
    },
  ];

  const recentListings = [...listings]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  const quickNav = [
    {
      title: 'Hizmet Alanlarım',
      desc: 'Uzmanlık kategorileri',
      href: '/dashboard/hizmet-alanlari',
      icon: <FaTools />,
    },
    {
      title: 'İlan İstatistikleri',
      desc: 'Detaylı analiz raporları',
      href: '/dashboard/ilan-istatistikleri',
      icon: <FaChartLine />,
    },
    {
      title: 'Favori İlanlarım',
      desc: 'Kaydedilen hizmetler',
      href: '/dashboard/favoriler',
      icon: <FaBookmark />,
    },
    {
      title: 'Randevu Takvimi',
      desc: 'Müşteri görüşmeleri',
      href: '/dashboard/randevular',
      icon: <FaCalendarAlt />,
    },
  ];

  return (
    <div className={styles['overview-container']}>
      {/* 1. Üst Başlık & Aksiyon Alanı (Şık, Minimalist, Abartısız) */}
      <div className={styles['overview-header']}>
        <div className={styles['welcome-meta']}>
          <span className={styles['greeting-welcome']}>Tekrar hoş geldiniz,</span>
          <h1 className={styles['greeting-name']}>{userName}</h1>
          <p className={styles['greeting-sub']}>
            İlanlarınızın performansını, müşteri etkileşimlerini ve randevu durumunuzu buradan yönetebilirsiniz.
          </p>
        </div>

        <div className={styles['header-actions']}>
          <div className={styles['date-chip']}>
            <FaCalendarCheck className={styles['date-icon']} />
            <span className={styles['date-text']}>
              {getCurrentDate()} • {getCurrentDay()}
            </span>
          </div>
          <Link href="/ilan-ver" className={styles['primary-cta']}>
            <FaPlus className={styles['cta-icon']} />
            <span>Yeni İlan Ekle</span>
          </Link>
        </div>
      </div>

      {/* 2. Hızlı İşlem Kartları - Doğal, Tutarlı ve Sade Kurumsal Butonlar */}
      <div className={styles['quick-bar']}>
        {quickNav.map((item, idx) => (
          <Link key={idx} href={item.href} className={styles['quick-card']}>
            <div className={styles['quick-icon-box']}>
              {item.icon}
            </div>
            <div className={styles['quick-text-group']}>
              <span className={styles['quick-title']}>{item.title}</span>
              <span className={styles['quick-desc']}>{item.desc}</span>
            </div>
            <div className={styles['quick-hover-arrow']}>
              <FaArrowRight />
            </div>
          </Link>
        ))}
      </div>

      {/* 3. KPI Metrik Kartları (4 Kolon - Tek Tip Kurumsal Şıklık, Sıfır Yapay Zeka Gökkuşağı) */}
      <div className={styles['stats-grid']}>
        {stats.map((stat) => (
          <div key={stat.id} className={styles['stat-card']}>
            <div className={styles['stat-card-header']}>
              <span className={styles['stat-title']}>{stat.title}</span>
              <div className={styles['stat-icon-wrapper']}>
                {stat.icon}
              </div>
            </div>

            <div className={styles['stat-value-row']}>
              <span className={styles['stat-value']}>
                {listingsLoading ? '—' : stat.value}
              </span>
            </div>

            <div className={styles['stat-footer']}>
              <span className={styles['stat-subtext']}>{stat.subtext}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 4. İki Kolonlu Gövde Grid: Sol (Son İlanlar Tablosu) & Sağ (Randevular) */}
      <div className={styles['main-grid']}>
        {/* Sol Kolon: Son İlanlar */}
        <div className={styles['card-panel']}>
          <div className={styles['panel-header']}>
            <div className={styles['panel-header-text']}>
              <h2 className={styles['panel-title']}>Son Eklenen İlanlarım</h2>
              <span className={styles['panel-subtitle']}>Hesabınıza kayıtlı güncel ilan listesi</span>
            </div>
            <Link href="/dashboard/aktif-ilanlar" className={styles['panel-action-link']}>
              <span>Tümünü Gör</span>
              <FaArrowRight className={styles['link-arrow']} />
            </Link>
          </div>

          <div className={styles['table-wrapper']}>
            <table className={styles['table']}>
              <thead>
                <tr>
                  <th className={styles['th-title']}>İlan Başlığı</th>
                  <th className={styles['th-category']}>Kategori</th>
                  <th className={styles['th-price']}>Fiyat</th>
                  <th className={styles['th-views']}>İzlenme</th>
                  <th className={styles['th-status']}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {listingsLoading ? (
                  <tr>
                    <td colSpan={5} className={styles['table-loading']}>
                      <span>İlanlar yükleniyor...</span>
                    </td>
                  </tr>
                ) : recentListings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles['table-empty']}>
                      <p>Henüz aktif bir ilanınız bulunmuyor.</p>
                      <Link href="/ilan-ver" className={styles['table-cta-btn']}>
                        Hemen İlk İlanını Ekle
                      </Link>
                    </td>
                  </tr>
                ) : (
                  recentListings.map((listing) => (
                    <tr key={listing.id} className={styles['table-row']}>
                      <td className={styles['title-cell']}>
                        <span className={styles['listing-title-text']} title={listing.title}>
                          {listing.title}
                        </span>
                      </td>
                      <td className={styles['category-cell']}>
                        <span className={styles['category-pill']}>
                          {listing.categoryName || 'Genel'}
                        </span>
                      </td>
                      <td className={styles['price-cell']}>
                        {formatPrice(listing.price, listing.currency)}
                      </td>
                      <td className={styles['view-cell']}>
                        <div className={styles['view-count-badge']}>
                          <FaEye className={styles['view-icon']} />
                          <span>{listing.viewCount || 0}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles['status-badge']} ${
                            listing.active !== false ? styles['status-active'] : styles['status-passive']
                          }`}
                        >
                          <span className={styles['status-dot']} />
                          {listing.active !== false ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sağ Kolon: Yaklaşan Randevular */}
        <div className={styles['card-panel']}>
          <div className={styles['panel-header']}>
            <div className={styles['panel-header-text']}>
              <h2 className={styles['panel-title']}>Yaklaşan Randevular</h2>
              <span className={styles['panel-subtitle']}>Takviminizdeki müşteri görüşmeleri</span>
            </div>
            {totalAppointmentsCount > 3 && (
              <Link href="/dashboard/randevular" className={styles['panel-action-link']}>
                <span>Tümü ({totalAppointmentsCount})</span>
                <FaArrowRight className={styles['link-arrow']} />
              </Link>
            )}
          </div>

          <div className={styles['appointments-container']}>
            {appointmentsLoading ? (
              <div className={styles['table-loading']}>
                <span>Randevu kayıtları alınıyor...</span>
              </div>
            ) : upcomingAppointments.length > 0 ? (
              <div className={styles['appointments-list']}>
                {upcomingAppointments.map((appt, idx) => (
                  <div key={idx} className={styles['appointment-card']}>
                    <div className={styles['appointment-card-top']}>
                      <h4 className={styles['appointment-name']}>{appt.title || 'Hizmet Talebi'}</h4>
                      <span
                        className={`${styles['appointment-status-pill']} ${
                          appt.status === 'confirmed'
                            ? styles['badge-confirmed']
                            : styles['badge-pending']
                        }`}
                      >
                        {appt.status === 'confirmed' ? (
                          <>
                            <FaCheckCircle /> Onaylandı
                          </>
                        ) : (
                          <>
                            <FaHourglassHalf /> Beklemede
                          </>
                        )}
                      </span>
                    </div>

                    <div className={styles['appointment-details-list']}>
                      {appt.location && (
                        <div className={styles['detail-row']}>
                          <FaMapMarkerAlt className={styles['detail-icon-loc']} />
                          <span className={styles['detail-text']}>{appt.location}</span>
                        </div>
                      )}
                      <div className={styles['detail-row']}>
                        <FaClock className={styles['detail-icon-time']} />
                        <span className={styles['detail-text']}>
                          {format(new Date(appt.date), 'dd MMMM yyyy', { locale: tr })}
                          {appt.time && ` • ${appt.time}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles['empty-appointment-state']}>
                <div className={styles['empty-graphic-circle']}>
                  <FaCalendarAlt className={styles['empty-graphic-icon']} />
                </div>
                <h3 className={styles['empty-title']}>Henüz Planlanmış Randevu Yok</h3>
                <p className={styles['empty-desc']}>
                  Müşterileriniz profilinizden veya ilanlarınızdan randevu aldığında burada listelenecektir.
                </p>
                <Link href="/dashboard/randevular" className={styles['empty-action-btn']}>
                  Randevu Takvimine Git
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
