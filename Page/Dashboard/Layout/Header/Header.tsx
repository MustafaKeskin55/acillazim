"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './Header.css';
import {
  IoSearchOutline,
  IoMenuOutline,
  IoCloseOutline,
  IoNotificationsOutline,
  IoMailOutline,
  IoHeartOutline,
} from 'react-icons/io5';
import notificationService from '@/services/notification/notificationService';
import NotifyDropdown from '@/components/NotifyDropdown/NotifyDropdown';
import { useSidebar } from '@/context/SidebarContext';
import * as messageService from '@/services/message/messageService';
import { useAuth } from '@/context/AuthContext';
import authService from '@/services/auth/authService';
import api from '@/services/api/ürapi';

interface AuthContextValue {
  currentUser: { name?: string; email?: string; picture?: string; profilePic?: string; profilePicture?: string } | null;
  isAuthenticated: boolean;
}

interface SidebarContextValue { isSidebarExpanded: boolean; }

export interface DashboardHeaderProps {
  /** Mobil/tablet: yan menüyü aç/kapat (DashboardLayout state) */
  onMobileNavToggle?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onMobileNavToggle }) => {
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);

  const { isSidebarExpanded } = useSidebar() as SidebarContextValue;
  const { currentUser, isAuthenticated } = useAuth() as AuthContextValue;
  const [liveAvatar, setLiveAvatar] = useState<string | null>(null);

  // Arama açıldığında input'a otomatik odaklan
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Escape tuşu ile aramayı kapat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchTerm('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Dışarı tıklandığında arama veya bildirim panelini kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      window.location.href = `/arama?q=${encodeURIComponent(searchTerm.trim())}`;
    }
  };

  useEffect(() => {
    const p = currentUser?.profilePicture || currentUser?.picture || currentUser?.profilePic;
    if (p) setLiveAvatar(p);
  }, [currentUser]);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newPic = customEvent?.detail?.profilePicture || customEvent?.detail?.picture || customEvent?.detail?.profilePic;
      if (newPic) setLiveAvatar(newPic);
    };
    window.addEventListener('userProfileUpdated', handleUpdate);

    let isMounted = true;
    api.fetchBasicInfo().then((profile) => {
      if (!isMounted) return;
      const pic = profile?.profileImage || (profile as unknown as Record<string, string>)?.profilePicture;
      if (pic) {
        setLiveAvatar(pic);
        authService.updateCurrentUserProfile({
          profilePicture: pic,
          picture: pic,
          profilePic: pic,
          coverImage: profile.coverImage
        });
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
      window.removeEventListener('userProfileUpdated', handleUpdate);
    };
  }, []);

  const loadUnreadCount = async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const userId = parseInt(localStorage.getItem('userId') || '0') || 123;
      const svc = notificationService as { getNotifications: (opts: Record<string, unknown>) => Promise<{ notifications?: unknown[] }> };
      const response = await svc.getNotifications({ userId, unreadOnly: true });
      setUnreadCount(response.notifications?.length || 0);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadUnreadCount(); }, [isAuthenticated]);

  useEffect(() => {
    const handleUpdate = () => loadUnreadCount();
    window.addEventListener('notificationsUpdated', handleUpdate);
    return () => window.removeEventListener('notificationsUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadMessages(0);
      return;
    }
    const updateUnreadCount = async () => {
      try {
        const svc = messageService as { getUnreadCount?: () => Promise<number> };
        const count = await svc.getUnreadCount?.() ?? 0;
        setUnreadMessages(count);
      } catch { setUnreadMessages(0); }
    };
    updateUnreadCount();
    const interval = setInterval(updateUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <header className={`dashboard-header ${isSidebarExpanded ? 'sidebar-expanded' : ''} ${isSearchOpen ? 'header-search-open' : ''}`}>
      <div className="header-content">
        {/* Sol Kısım: Yalnızca mobilde görünen tek hamburger butonu (Masaüstünde asla görünmez) */}
        <div className="header-left">
          {onMobileNavToggle && (
            <button
              type="button"
              className="header-action-btn header-nav-toggle-btn"
              onClick={onMobileNavToggle}
              aria-label="Menüyü Aç"
              title="Menüyü Aç"
            >
              <IoMenuOutline className="action-btn-icon text-[21px]" />
            </button>
          )}
        </div>

        {/* Sağ Kısım: Arama İkonu / Açılır Arama, Aksiyon Butonları & Profil */}
        <div className="header-right" ref={searchContainerRef}>
          {/* Arama Alanı: Açıldığında şık, yumuşak genişleyen SaaS input kutusu */}
          {isSearchOpen ? (
            <form className="header-search-form" onSubmit={handleSearchSubmit}>
              <IoSearchOutline className="header-search-form-icon text-[17px]" />
              <input
                ref={searchInputRef}
                type="text"
                className="header-search-form-input"
                placeholder="İlan, kategori veya konum ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="button"
                className="header-search-form-close"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchTerm('');
                }}
                aria-label="Aramayı Kapat"
                title="Aramayı Kapat (Esc)"
              >
                <IoCloseOutline size={18} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="header-action-btn header-search-trigger"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Arama Yap"
              title="Arama Yap"
            >
              <IoSearchOutline className="action-btn-icon" />
            </button>
          )}

          {/* Mesajlar (Mobilde arama açıkken gizlenir) */}
          <div
            className={`header-action-btn ${isSearchOpen ? 'hide-on-mobile-search' : ''}`}
            onClick={() => { window.location.href = '/dashboard/mesajlar'; }}
            title="Mesajlar"
            role="button"
            tabIndex={0}
          >
            <IoMailOutline className="action-btn-icon" />
            {unreadMessages > 0 && <span className="action-badge">{unreadMessages}</span>}
          </div>

          {/* Favoriler (Mobilde arama açıkken gizlenir) */}
          <div
            className={`header-action-btn ${isSearchOpen ? 'hide-on-mobile-search' : ''}`}
            onClick={() => { window.location.href = '/dashboard/favoriler'; }}
            title="Favoriler"
            role="button"
            tabIndex={0}
          >
            <IoHeartOutline className="action-btn-icon" />
          </div>

          {/* Bildirimler (Mobilde arama açıkken gizlenir) */}
          <div
            className={`header-action-btn notifications-btn-wrapper ${isSearchOpen ? 'hide-on-mobile-search' : ''}`}
            ref={notificationsRef}
            title="Bildirimler"
          >
            <button
              type="button"
              className="notifications-trigger-btn"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              aria-label="Bildirimler"
            >
              <IoNotificationsOutline className="action-btn-icon" />
              {unreadCount > 0 && <span className="action-badge">{unreadCount}</span>}
            </button>
            <NotifyDropdown isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
          </div>

          {/* Kullanıcı Profili — Her zaman sabit kalır */}
          <div
            className="header-user-profile"
            onClick={() => { window.location.href = '/dashboard/profil'; }}
            role="button"
            tabIndex={0}
          >
            <div className="user-avatar-wrap">
              <img
                src={liveAvatar || currentUser?.profilePicture || currentUser?.picture || currentUser?.profilePic || '/images/profile-default.png'}
                alt={currentUser?.name || 'Profil'}
                className="user-avatar-img"
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/profile-default.png'; }}
              />
              <span className="user-status-dot" />
            </div>
            <div className="user-info-text">
              <span className="user-name-span">{currentUser?.name || 'Admin User'}</span>
              <span className="user-email-span">{currentUser?.email || 'admin@acillazim.com'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
