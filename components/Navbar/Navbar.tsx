"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import LocationModal from "./LocationModal/LocationModal";
import {
  IoHomeOutline, IoHome, IoPersonOutline, IoPerson, IoAdd,
  IoNotifications, IoCreate, IoLocationSharp,
  IoSearchOutline
} from "react-icons/io5";
import { BiCategoryAlt } from "react-icons/bi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faEnvelope, faHeart, faBell } from "@fortawesome/free-solid-svg-icons";
import "./Navbar.css";
import locationButtonStyles from "./LocationButton/LocationButton.module.css";
import { useAuth } from "@/context/AuthContext";
import { useLocation as useLocationContext } from "@/context/LocationContext";
import SearchBox from "@/components/search/SearchBox";
import notificationService from "@/services/notification/notificationService";
import UserDropdown from "./UserDropdown/UserDropdown";
import NotifyDropdown from "@/components/NotifyDropdown/NotifyDropdown";
import * as messageService from "@/services/message/messageService";
import { isListingDetailPagePathname } from "@/lib/listingDetailRoute";
import IlanVerAuthModal from "@/components/auth/IlanVerAuthModal/IlanVerAuthModal";
import api from "@/services/api/ürapi";
import authService from "@/services/auth/authService";

interface LocationData {
  city: string;
  district?: string;
}

/** Mobil alt menü: bu sayfadayken Kategoriler → yalnız hizmet ağacı */
const USTALAR_VE_HIZMETLER_PATH = '/Ustalar-ve-Hizmetler';

function Navbar() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const pathname = usePathname();
  const isCreateListingPath = Boolean(
    pathname?.startsWith('/ilan-ver') ||
    pathname?.startsWith('/ilan-form') ||
    pathname?.startsWith('/kategori-sec') ||
    pathname?.includes('onizleme')
  );
  const isAuthOrRegisterPath = Boolean(pathname?.startsWith('/uyelik-sec'));
  const hideMobileBottomNav = isListingDetailPagePathname(pathname) || isCreateListingPath || isAuthOrRegisterPath;
  const router = useRouter();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (hideMobileBottomNav) root.setAttribute("data-hide-mobile-bottom-nav", "");
    else root.removeAttribute("data-hide-mobile-bottom-nav");
    return () => root.removeAttribute("data-hide-mobile-bottom-nav");
  }, [hideMobileBottomNav]);
  const { isAuthenticated: isLoggedIn, user, updateAuthState } = useAuth();
  const {
    location: locationData,
    handleModalLocationChange,
    isModalVisible,
    openLocationModal,
    closeLocationModal
  } = useLocationContext();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [hasUnread, setHasUnread] = useState<boolean>(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const [isNotifyDropdownOpen, setIsNotifyDropdownOpen] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const [liveAvatar, setLiveAvatar] = useState<string | null>(null);
  const [liveName, setLiveName] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const navbarRef = useRef<HTMLElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifyDropdownRef = useRef<HTMLDivElement>(null);

  // 3 Menülü Akışkan Mobil Alt Navigasyon Sekme Durumu
  const getTabFromPath = (path: string | null) => {
    if (path === "/") return 0;
    if (
      path?.startsWith("/kategori-sec") ||
      path?.startsWith("/ilan-ver") ||
      path?.startsWith("/ilan-form")
    ) {
      return 1;
    }
    if (path?.startsWith("/hesabim") || path?.startsWith("/dashboard")) return 2;
    if (path === "/giris") {
      if (typeof window !== "undefined" && window.location.search.includes("ilan-ver")) {
        return 1;
      }
      return 2;
    }
    return 0;
  };

  const [activeTab, setActiveTab] = useState<number>(() => getTabFromPath(pathname));

  useEffect(() => {
    setActiveTab(getTabFromPath(pathname));
  }, [pathname]);

  // Global "openAuthPromptModal" event dinleyicisi (sayfadaki herhangi bir İlan Ver butonundan tetiklenebilir)
  useEffect(() => {
    const handleOpen = () => setIsAuthModalOpen(true);
    window.addEventListener("openAuthPromptModal", handleOpen);
    return () => window.removeEventListener("openAuthPromptModal", handleOpen);
  }, []);

  const handleTabClick = (idx: number) => {
    if (idx === 0) {
      setActiveTab(0);
      if (pathname !== "/") router.push("/");
    } else if (idx === 1) {
      if (!isLoggedIn) {
        setIsAuthModalOpen(true);
      } else {
        setActiveTab(1);
        router.push("/ilan-ver");
      }
    } else if (idx === 2) {
      setActiveTab(2);
      if (isLoggedIn) {
        router.push("/hesabim");
      } else {
        router.push("/giris");
      }
    }
  };

  const cradlePositions = [18, 50, 82];
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Bildirim sayısını yükle (yalnızca giriş yapmış kullanıcılar için — aksi halde
  // anonim kullanıcıda 401 alınır ve global 401 yakalayıcı yanlışlıkla girişe atar)
  const loadUnreadCount = async () => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }
    try {
      const userId = parseInt(localStorage.getItem("userId") || "123") || 123;
      const response = await notificationService.getNotifications({ userId, unreadOnly: true });
      setUnreadCount(response.notifications?.length || 0);
    } catch (err) {
      console.error("Okunmamış bildirim sayısı yüklenirken hata:", err);
    }
  };

  useEffect(() => { loadUnreadCount(); }, [isLoggedIn]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ count?: number }>;
      if (typeof customEvent.detail?.count === 'number') {
        setUnreadCount(customEvent.detail.count);
      } else {
        loadUnreadCount();
      }
    };
    window.addEventListener("notificationsUpdated", handler);
    return () => window.removeEventListener("notificationsUpdated", handler);
  }, [isLoggedIn]);

  // Auth durumu kontrolü
  useEffect(() => {
    const authToken = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user_data");
    setAuthLoading(false);
  }, [isLoggedIn]);

  // Konum bilgisini kontrol et
  useEffect(() => {
    if (locationData) {
      setCurrentLocation({ city: locationData.city, district: locationData.district });
    } else {
      const savedLocation = localStorage.getItem("location_data");
      if (savedLocation) {
        try { setCurrentLocation(JSON.parse(savedLocation)); } catch {}
      }
    }
  }, [locationData]);

  // Okunmamış mesaj sayısı (RabbitMQ ve Realtime WebSocket olay güdümlü)
  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadMessagesCount(0);
      setHasUnread(false);
      return;
    }

    const checkUnreadMessages = async () => {
      try {
        const count = await messageService.getUnreadCount();
        setUnreadMessagesCount(count);
        setHasUnread(count > 0);
      } catch {
        setUnreadMessagesCount(0);
        setHasUnread(false);
      }
    };

    // İlk açılışta 1 kez sorgula
    checkUnreadMessages();

    // RabbitMQ ve Realtime WebSocket üzerinden gelen anlık olayları dinle
    const handleMessagesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ count?: number }>;
      if (typeof customEvent.detail?.count === 'number') {
        const c = customEvent.detail.count;
        setUnreadMessagesCount(c);
        setHasUnread(c > 0);
      } else {
        checkUnreadMessages();
      }
    };

    window.addEventListener("messagesUpdated", handleMessagesUpdated);

    // Sekme görünür olduğunda kontrol et (kullanıcı sekmeye döndüğünde)
    const handleVisibility = () => {
      if (!document.hidden) {
        checkUnreadMessages();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("messagesUpdated", handleMessagesUpdated);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isLoggedIn]);

  // Navbar dışına tıklama
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(e.target as Node)) {
        setActiveIcon(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Kullanıcı menüsü dışına tıklama
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!userDropdownRef.current?.contains(event.target as Node)) setIsUserDropdownOpen(false);
      setActiveIcon(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePostAd = () => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
    } else {
      router.push("/ilan-ver");
    }
  };

  const handleUserIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUserDropdownOpen(!isUserDropdownOpen);
  };

  const handleLocationSelect = (city: string, district: string) => {
    if (authLoading) return;
    setCurrentLocation({ city, district });
    handleModalLocationChange(city, district);
    closeLocationModal();
  };

  const handleLocationButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) return;
    openLocationModal();
  };

  const handleIconClick = (iconName: string, originalHandler?: (e: React.MouseEvent) => void) =>
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveIcon((current) => (current === iconName ? null : iconName));
      if (originalHandler) originalHandler(e);
    };

  const handleUserIconClickWithState = handleIconClick("user", handleUserIconClick);

  const handleSearch = (query: string) => {
    if (query) router.push(`/filtrele/tum-ilanlar?q=${encodeURIComponent(query)}`);
  };

  /** Hesabım: üst bar (logo + bildirim/mesaj) gösterilmez; alt menü kalır */
  const hideTopNavbar = pathname === "/hesabim";

  // Canlı profil avatar ve isim senkronizasyonu
  useEffect(() => {
    const u = user as Record<string, unknown> | null;
    const pic = (u?.profilePicture || u?.picture || u?.profilePic || u?.profileImage) as string | undefined;
    if (pic) setLiveAvatar(pic);
    const n = (u?.fullName || u?.name) as string | undefined;
    if (n) setLiveName(n);
  }, [user]);

  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent?.detail;
      const newPic = detail?.profilePicture || detail?.picture || detail?.profilePic || detail?.profileImage;
      if (newPic) setLiveAvatar(newPic);
      const newName = detail?.fullName || detail?.name || (detail?.firstName ? `${detail.firstName} ${detail.lastName || ''}`.trim() : null);
      if (newName) setLiveName(newName);
    };
    window.addEventListener("userProfileUpdated", handleProfileUpdate);

    if (isLoggedIn) {
      api.fetchBasicInfo()
        .then((profile) => {
          if (profile) {
            const pic = profile.profileImage || (profile as unknown as Record<string, string>)?.profilePicture;
            if (pic) {
              setLiveAvatar(pic);
              authService.updateCurrentUserProfile({
                profilePicture: pic,
                picture: pic,
                profilePic: pic,
              });
            }
            if (profile.fullName) {
              setLiveName(profile.fullName);
              authService.updateCurrentUserProfile({
                name: profile.fullName,
                fullName: profile.fullName,
              });
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("userProfileUpdated", handleProfileUpdate);
    };
  }, [isLoggedIn]);

  const getUserDisplayName = (): string => {
    if (liveName && liveName.trim()) {
      return liveName.length <= 22 ? liveName : `${liveName.substring(0, 19)}...`;
    }

    let sessionUser: Record<string, unknown> | null = null;
    try {
      const sessionData = sessionStorage.getItem("user_data");
      if (sessionData) sessionUser = JSON.parse(sessionData);
    } catch {}

    const firstName = (sessionUser?.firstName || sessionUser?.name || (user as Record<string, unknown>)?.firstName || (user as Record<string, unknown>)?.name || "") as string;
    const lastName = (sessionUser?.lastName || (user as Record<string, unknown>)?.lastName || "") as string;

    if (firstName && lastName) {
      const fullName = `${firstName} ${lastName}`;
      return fullName.length <= 22 ? fullName : `${firstName} ${lastName.charAt(0)}.`;
    }
    if (firstName) return firstName;
    const email = ((sessionUser?.email || (user as Record<string, unknown>)?.email) as string | undefined);
    if (email) return email.split("@")[0];
    return "Hesabım";
  };

  return (
    <>
      {!hideTopNavbar && (
      <nav className="navbar" ref={navbarRef}>
        <div className="navbar-logoContainer">
          <Link href="/">
            <img src="/images/acillazim-logo.png" alt="Logo" className="navbar-logo" />
          </Link>
        </div>

        {/* Mobil sağ taraf */}
        {isMobile && (
          <>
            {isLoggedIn ? (
              <div className="navbar-icons navbar-icons--auth">
                <Link
                  href="/dashboard/bildirimler"
                  className="navbar-icon navbar-icon--notifications"
                  aria-label="Bildirimler"
                >
                  <IoNotifications />
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </Link>
                <Link
                  href="/dashboard/mesajlar"
                  className="navbar-icon message-icon navbar-icon--messages"
                  aria-label="Mesajlar"
                >
                  <FontAwesomeIcon icon={faEnvelope} className="modern-icon" />
                  {hasUnread && (
                    <span className="message-badge">{unreadMessagesCount > 0 ? unreadMessagesCount : ""}</span>
                  )}
                </Link>
              </div>
            ) : (
              <div className="navbar-rightLinks">
                <Link href="/giris" className="navbar-auth-login">Giriş Yap</Link>
                <Link href="/uyelik-sec" className="navbar-auth-register">Hesap Aç</Link>
              </div>
            )}
          </>
        )}

        {/* PC menü */}
        {!isMobile && (
          <div className="navbar-menu">
            <form className="navbar-search-form">
              <SearchBox
                placeholder="Ne aramıştınız?"
                navbarIconClass="navbar-iconContainer"
                onSearch={handleSearch}
                className=""
                debounceTime={300}
              />

              {isLoggedIn === true && (
                <div className={locationButtonStyles.locationSelector}>
                  <button
                    type="button"
                    className={`${locationButtonStyles.locationButton} ${currentLocation ? locationButtonStyles.hasLocation : ""}`}
                    onClick={handleLocationButtonClick}
                  >
                    <IoLocationSharp className={locationButtonStyles.locationIcon} />
                    <div className={locationButtonStyles.locationText}>
                      {currentLocation ? (
                        <>
                          <span className={locationButtonStyles.locationLabel}>Konum</span>
                          <span className={locationButtonStyles.locationDivider}>|</span>
                          <span className={locationButtonStyles.locationValue}>{currentLocation.city}</span>
                        </>
                      ) : (
                        <span className={locationButtonStyles.locationValue}>Konum Seç</span>
                      )}
                    </div>
                  </button>
                </div>
              )}
            </form>

            <div className="navbar-right">
              {isLoggedIn ? (
                <div className="navbar-user-icons">
                  <div
                    className={`nav-icon user-icon ${activeIcon === "user" ? "active" : ""}`}
                    onClick={handleUserIconClickWithState}
                    style={{ cursor: "pointer", position: "relative" }}
                  >
                    {liveAvatar ? (
                      <img
                        src={liveAvatar}
                        alt={getUserDisplayName()}
                        className="navbar-user-avatar"
                        onError={() => setLiveAvatar(null)}
                      />
                    ) : (
                      <FontAwesomeIcon icon={faUser} className="modern-icon" />
                    )}
                    <span className="user-name">{getUserDisplayName()}</span>
                    <div ref={userDropdownRef} className="dropdown-container">
                      <UserDropdown isOpen={isUserDropdownOpen} onClose={() => setIsUserDropdownOpen(false)} />
                    </div>
                  </div>

                  <div className="navbar-comm-cluster">
                    <div
                      className={`nav-icon notifications-wrapper${pathname?.startsWith("/dashboard/bildirimler") ? " active" : ""}`}
                      onClick={() => { setIsNotifyDropdownOpen(!isNotifyDropdownOpen); setIsUserDropdownOpen(false); }}
                      style={{ cursor: "pointer", position: "relative" }}
                      ref={notifyDropdownRef}
                    >
                      <FontAwesomeIcon icon={faBell} className="modern-icon" />
                      {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                      <NotifyDropdown isOpen={isNotifyDropdownOpen} onClose={() => setIsNotifyDropdownOpen(false)} />
                    </div>
                    <Link
                      href="/dashboard/mesajlar"
                      className={`nav-icon message-icon${pathname?.startsWith("/dashboard/mesajlar") ? " active" : ""}`}
                      aria-label="Mesajlar"
                    >
                      <FontAwesomeIcon icon={faEnvelope} className="modern-icon" />
                      {hasUnread && (
                        <span className="message-badge">{unreadMessagesCount > 0 ? unreadMessagesCount : ""}</span>
                      )}
                    </Link>
                    <Link
                      href="/dashboard/favoriler"
                      className={`nav-icon favorites-icon${pathname?.startsWith("/dashboard/favoriler") ? " active" : ""}`}
                      aria-label="Favoriler"
                    >
                      <FontAwesomeIcon icon={faHeart} className="modern-icon" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="navbar-rightLinks">
                  <Link href="/giris" className="navbar-auth-login">Giriş Yap</Link>
                  <Link href="/uyelik-sec" className="navbar-auth-register">Hesap Aç</Link>
                </div>
              )}
              <button
                type="button"
                className="ilan-ver-btnn"
                onClick={handlePostAd}
              >
                <IoCreate className="plus-icon" />
                <span>İLAN VER</span>
              </button>
            </div>
          </div>
        )}
      </nav>
      )}

      {/* Mobil Bottom Navigation — 3 menülü akışkan kavisli yüzen dock (Model 2: Kurumsal Mavi İkonlar, Ortada Havalanmış İlan Ver +) */}
      {/* Kategoriler kullanıcının isteğiyle şuan için gizlenmiştir (kodda saklıdır) */}
      {isMobile && !hideMobileBottomNav && (
        <div className="bottom-nav">
          {/* Akışkan Kayan Çukur & Havalanmış Buton */}
          <div
            className="bottom-nav-cradle"
            style={{ left: `${cradlePositions[activeTab]}%` }}
          >
            <svg className="bottom-nav-cradle-svg" viewBox="0 0 76 32">
              <path
                d="M 0,1 C 15,1 20,27 38,27 C 56,27 61,1 76,1 L 76,-8 L 0,-8 Z"
                fill="var(--bg-page-fallback, #ffffff)"
              />
              <path
                d="M 0,1 C 15,1 20,27 38,27 C 56,27 61,1 76,1"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <div
              className="bottom-nav-bubble"
              onClick={() => handleTabClick(activeTab)}
              role="button"
              tabIndex={0}
              aria-label="Aktif Menü Butonu"
            >
              {activeTab === 0 && <IoHome className="bottom-nav-bubble-icon" />}
              {activeTab === 1 && <IoAdd className="bottom-nav-bubble-icon bottom-nav-bubble-icon--add" />}
              {activeTab === 2 && <IoPerson className="bottom-nav-bubble-icon" />}
            </div>
          </div>

          {/* 1. Menü: Ana Sayfa */}
          <div
            className={`bottom-nav-item ${activeTab === 0 ? "active" : ""}`}
            onClick={() => handleTabClick(0)}
            role="button"
            tabIndex={0}
            aria-label="Ana Sayfa"
          >
            <IoHomeOutline className="bottom-nav-item-icon" />
            <span className="bottom-nav-item-label">Ana Sayfa</span>
          </div>

          {/* Kategoriler — Kullanıcı isteğiyle şuan için gizlenmiştir (ileride açılabilir):
          <Link
            href={
              pathname === USTALAR_VE_HIZMETLER_PATH || pathname?.startsWith(`${USTALAR_VE_HIZMETLER_PATH}/`)
                ? "/kategoriler?alan=hizmet"
                : "/kategoriler"
            }
            className={`bottom-nav-item ${pathname.startsWith("/kategoriler") ? "active" : ""}`}
            aria-label="Kategoriler"
          >
            <div className="bottom-nav-icon-wrap">
              <BiCategoryAlt className="bottom-nav-icon" />
            </div>
            <span className="bottom-nav-item-label">Kategoriler</span>
          </Link>
          */}

          {/* 2. Menü: İlan Ver (+) (Tam Ortada) */}
          <div
            className={`bottom-nav-item ${activeTab === 1 ? "active" : ""}`}
            onClick={() => handleTabClick(1)}
            role="button"
            tabIndex={0}
            aria-label="İlan Ver"
          >
            <IoAdd className="bottom-nav-item-icon bottom-nav-item-icon--add" />
            <span className="bottom-nav-item-label">İlan Ver</span>
          </div>

          {/* 3. Menü: Profil */}
          <div
            className={`bottom-nav-item ${activeTab === 2 ? "active" : ""}`}
            onClick={() => handleTabClick(2)}
            role="button"
            tabIndex={0}
            aria-label={isLoggedIn ? "Hesabım" : "Profil"}
          >
            <IoPersonOutline className="bottom-nav-item-icon" />
            <span className="bottom-nav-item-label">{isLoggedIn ? "Hesabım" : "Profil"}</span>
          </div>
        </div>
      )}

      {/* LocationModal */}
      {isLoggedIn && (
        <LocationModal
          showModal={isModalVisible}
          closeModal={closeLocationModal}
          onLocationSelect={handleLocationSelect}
          onLocationClear={() => {
            handleModalLocationChange("", "");
            setCurrentLocation(null);
            closeLocationModal();
          }}
        />
      )}

      {/* iOS Stili İlan Verme Giriş Modalı */}
      <IlanVerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        redirectUrl="/ilan-ver"
      />
    </>
  );
}

export default Navbar;
