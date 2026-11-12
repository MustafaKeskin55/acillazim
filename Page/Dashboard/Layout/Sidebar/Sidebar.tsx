"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaHome,
  FaClipboardList,
  FaChartLine,
  FaUser,
  FaBell,
  FaLock,
  FaCalendarAlt,
  FaClock,
  FaHistory,
  FaUserClock,
  FaClipboardCheck,
  FaQuestionCircle,
  FaCog,
  FaSignOutAlt,
  FaEye,
  FaBan,
  FaHeart,
  FaEnvelope,
  FaNewspaper,
  FaRegClock,
  FaTools,
  FaBars,
  FaAngleRight,
  FaAngleLeft,
  FaAngleDown,
  FaFlag,
  FaShieldAlt,
  FaBriefcase,
} from "react-icons/fa";
import notificationService from "@/services/notification/notificationService";
import { useAuth } from "@/context/AuthContext";
import "./Sidebar.css";

/**
 * 2. görseldeki 2x2 yuvarlatılmış 4 kare ızgara ikonu (Genel Bakış)
 */
const OverviewGridIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.5" />
    <rect x="13" y="2.5" width="8.5" height="8.5" rx="2.5" />
    <rect x="2.5" y="13" width="8.5" height="8.5" rx="2.5" />
    <rect x="13" y="13" width="8.5" height="8.5" rx="2.5" />
  </svg>
);

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface AuthContextValue {
  logout: () => void;
}

interface SubMenuItem {
  tab: string;
  label: string;
}

interface SubMenuGroup {
  id: string;
  title: string;
  icon?: React.ReactNode;
  badge?: string;
  items: SubMenuItem[];
}

interface MenuItem {
  path: string;
  icon: React.ReactNode;
  label: string;
  badge?: number | null;
  disabled?: boolean;
  highlight?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  subGroups?: SubMenuGroup[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const pathname = usePathname();
  const { logout } = useAuth() as AuthContextValue;
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [activeProfileTab, setActiveProfileTab] = useState<string>("basic-general");
  const [openSubGroups, setOpenSubGroups] = useState<Record<string, boolean>>({});

  const toggleSubGroup = (groupId: string) => {
    setOpenSubGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("activeProfileTab") || "basic-general";
      setActiveProfileTab(savedTab);

      const handleProfileTabChange = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail && customEvent.detail.tab) {
          setActiveProfileTab(customEvent.detail.tab);
        }
      };

      window.addEventListener("profileTabChanged", handleProfileTabChange);
      return () => {
        window.removeEventListener("profileTabChanged", handleProfileTabChange);
      };
    }
  }, []);

  const loadUnreadCount = async () => {
    try {
      const userId = parseInt(localStorage.getItem("userId") || "0") || 123;
      const svc = notificationService as {
        getNotifications: (
          opts: Record<string, unknown>,
        ) => Promise<{ notifications?: unknown[] }>;
      };
      const response = await svc.getNotifications({ userId, unreadOnly: true });
      setUnreadCount(response.notifications?.length || 0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadUnreadCount();
  }, []);

  useEffect(() => {
    const handleUpdate = () => loadUnreadCount();
    window.addEventListener("notificationsUpdated", handleUpdate);
    return () =>
      window.removeEventListener("notificationsUpdated", handleUpdate);
  }, []);

  const menuSections: MenuSection[] = [
    {
      title: "Ana Menü",
      items: [
        { path: "/dashboard", icon: <OverviewGridIcon />, label: "Genel Bakış" },
        {
          path: "/dashboard/profil",
          icon: <FaUser />,
          label: "Profilim",
          subGroups: [
            {
              id: "personal",
              title: "Kişisel & İletişim Bilgileri",
              icon: <FaUser />,
              items: [
                { tab: "basic-general", label: "Temel Bilgiler" },
                { tab: "basic-address", label: "Adres & Konum" },
                { tab: "basic-corporate", label: "Kurumsal Bilgiler" },
                { tab: "basic-social", label: "Sosyal Medya & Web" },
                { tab: "basic-bio", label: "Hakkımda & Biyografi" },
              ],
            },
            {
              id: "services",
              title: "Hizmetler & Uzmanlık",
              icon: <FaBriefcase />,
              items: [
                { tab: "services-areas", label: "Hizmet Alanlarım" },
                { tab: "services-skills", label: "Yetenekler & Uzmanlık" },
              ],
            },
            {
              id: "security",
              title: "Şifre & Güvenlik Ayarları",
              icon: <FaShieldAlt />,
              badge: "Güvenli",
              items: [
                { tab: "security-password", label: "Şifre Değiştir" },
                { tab: "security-email", label: "E-posta Güncelle" },
                { tab: "security-questions", label: "Güvenlik Soruları" },
                { tab: "security-2fa", label: "İki Adımlı Doğrulama" },
              ],
            },
          ],
        },
        {
          path: "/dashboard/bildirimler",
          icon: <FaBell />,
          label: "Bildirimler",
          badge: unreadCount > 0 ? unreadCount : null,
        },
        { path: "/dashboard/favoriler", icon: <FaHeart />, label: "Favoriler" },
        {
          path: "/dashboard/mesajlar",
          icon: <FaEnvelope />,
          label: "Mesajlar",
        },
      ],
    },
    {
      title: "İlan Yönetimi",
      items: [
        {
          path: "/dashboard/aktif-ilanlar",
          icon: <FaClipboardCheck />,
          label: "Aktif İlanlarım",
        },
        {
          path: "/dashboard/pasif-ilanlar",
          icon: <FaBan />,
          label: "Pasif İlanlarım",
        },
        {
          path: "/dashboard/onay-bekleyen-ilanlar",
          icon: <FaClock />,
          label: "Onayda Bekleyenler",
        },
        {
          path: "/dashboard/ilan-istatistikleri",
          icon: <FaChartLine />,
          label: "İlan İstatistikleri",
        },
      ],
    },
    {
      title: "Hizmet Yönetimi",
      items: [
        {
          path: "/dashboard/randevular",
          icon: <FaCalendarAlt />,
          label: "Randevularım",
        },
        {
          path: "/dashboard/hizmet-alanlari",
          icon: <FaTools />,
          label: "Hizmet Alanlarım",
        },
        {
          path: "/dashboard/randevular/gecmis",
          icon: <FaHistory />,
          label: "Randevu Geçmişi",
        },
        {
          path: "/dashboard/randevular/musait-saatler",
          icon: <FaRegClock />,
          label: "Müsait Saatler",
        },
      ],
    },
    {
      title: "Destek & Şikayet",
      items: [
        {
          path: "/dashboard/sikayetlerim-taleplerim",
          icon: <FaFlag />,
          label: "Şikayetlerim & Taleplerim",
        },
      ],
    },
  ];

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      logout();
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    } catch {
      window.location.href = "/login";
    }
  };

  const footerItems: MenuItem[] = [
    { path: "/yardim", icon: <FaQuestionCircle />, label: "Yardım" },
    {
      path: "#",
      icon: <FaSignOutAlt />,
      label: "Çıkış Yap",
      className: "logout",
      onClick: handleLogout,
    },
  ];

  const isActive = (path: string): boolean => pathname === path;

  return (
    <div className={`dashboard-sidebar ${isOpen ? "" : "collapsed"}`}>
      <div className="dashboard-sidebar-header">
        <a href="/" className="dashboard-sidebar-logo-link" title="Acillazım Ana Sayfa">
          {/* Geniş Logo: Menü açıkken gösterilir */}
          <img
            src="/images/sidebar-logo.png"
            alt="Acillazım"
            className="dashboard-sidebar-logo-wide"
          />
          {/* Kompakt Yuvarlak İkon Logo: Menü daraltıldığında/kapalıyken gösterilir */}
          <img
            src="/images/logo.png"
            alt="Acillazım"
            className="dashboard-sidebar-logo-compact"
          />
        </a>
        <button
          type="button"
          className="dashboard-sidebar-toggle"
          onClick={onToggle}
          aria-label={isOpen ? "Menüyü Kapat" : "Menüyü Genişlet"}
        >
          <span className="sidebar-toggle-desktop">
            {isOpen ? <FaAngleLeft /> : <FaAngleRight />}
          </span>
          <span className="sidebar-toggle-mobile">
            <FaAngleLeft />
          </span>
        </button>
      </div>

      <div className="dashboard-sidebar-content">
        <div className="dashboard-sidebar-top-action">
          <Link
            href="/"
            className={`dashboard-sidebar-nav-item dashboard-sidebar-site-home ${pathname === "/" ? "active" : ""}`}
            data-tooltip="Ana Sayfa"
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth <= 1024) {
                onToggle();
              }
            }}
          >
            <span className="dashboard-sidebar-nav-icon">
              <FaHome />
            </span>
            <span className="dashboard-sidebar-nav-label">Ana Sayfa</span>
          </Link>
        </div>

        {menuSections.map((section, index) => (
          <div key={index} className="dashboard-sidebar-section">
            <div className="dashboard-sidebar-section-title">
              {section.title}
            </div>
            {section.items.map((item) => {
              const itemActive = isActive(item.path);
              const hasSubGroups = item.subGroups && item.subGroups.length > 0;

              if (hasSubGroups && item.path === "/dashboard/profil") {
                return (
                  <div key={item.path} className="dashboard-sidebar-accordion-group">
                    <button
                      type="button"
                      className={`dashboard-sidebar-nav-item dashboard-sidebar-accordion-trigger ${itemActive ? "active" : ""} ${isProfileOpen ? "open" : ""}`}
                      data-tooltip={item.label}
                      onClick={() => {
                        if (!isOpen) {
                          onToggle();
                          setIsProfileOpen(true);
                        } else {
                          setIsProfileOpen((prev) => !prev);
                        }
                      }}
                    >
                      <span className="dashboard-sidebar-nav-icon">{item.icon}</span>
                      <span className="dashboard-sidebar-nav-label">
                        <span>{item.label}</span>
                        <FaAngleDown
                          className={`dashboard-sidebar-chevron ${isProfileOpen ? "rotated" : ""}`}
                        />
                      </span>
                    </button>

                    {/* Akordeon Alt Sekmeler (Bölümler Halinde) */}
                    {isProfileOpen && isOpen && (
                      <div className="dashboard-sidebar-subnav-container expanded">
                        {item.subGroups?.map((group) => {
                          const isGroupOpen = openSubGroups[group.id] ?? false;
                          const hasActiveChild = group.items.some(
                            (sub) => itemActive && activeProfileTab === sub.tab
                          );

                          return (
                            <div key={group.id} className="dashboard-sidebar-subgroup-block">
                              <button
                                type="button"
                                className={`dashboard-sidebar-subgroup-header ${isGroupOpen ? "expanded" : ""} ${hasActiveChild ? "has-active" : ""}`}
                                onClick={() => toggleSubGroup(group.id)}
                              >
                                <div className="dashboard-sidebar-subgroup-title-wrap">
                                  {group.icon && (
                                    <span className="dashboard-sidebar-subgroup-icon">
                                      {group.icon}
                                    </span>
                                  )}
                                  <span className="dashboard-sidebar-subgroup-title">
                                    {group.title}
                                  </span>
                                </div>
                                <div className="dashboard-sidebar-subgroup-meta">
                                  {group.badge && (
                                    <span className="dashboard-sidebar-subgroup-badge">
                                      {group.badge}
                                    </span>
                                  )}
                                  <FaAngleDown
                                    className={`dashboard-sidebar-subgroup-chevron ${isGroupOpen ? "rotated" : ""}`}
                                  />
                                </div>
                              </button>

                              {isGroupOpen && (
                                <div className="dashboard-sidebar-subnav-list">
                                  {group.items.map((sub) => {
                                    const isSubActive = itemActive && activeProfileTab === sub.tab;
                                    return (
                                      <button
                                        key={sub.tab}
                                        type="button"
                                        className={`dashboard-sidebar-subnav-btn ${isSubActive ? "active" : ""}`}
                                        onClick={() => {
                                          setActiveProfileTab(sub.tab);
                                          if (typeof window !== "undefined") {
                                            localStorage.setItem("activeProfileTab", sub.tab);
                                            window.dispatchEvent(
                                              new CustomEvent("profileTabChanged", {
                                                detail: { tab: sub.tab },
                                              })
                                            );
                                            if (pathname !== "/dashboard/profil") {
                                              window.location.href = `/dashboard/profil?tab=${sub.tab}`;
                                            }
                                            if (window.innerWidth <= 1024) {
                                              onToggle();
                                            }
                                          }
                                        }}
                                      >
                                        <span className="dashboard-sidebar-subnav-indicator" />
                                        <span className="dashboard-sidebar-subnav-label">{sub.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={`dashboard-sidebar-nav-item ${itemActive ? "active" : ""} ${item.disabled ? "disabled" : ""}`}
                  data-tooltip={item.label}
                  onClick={(e) => {
                    if (item.disabled) {
                      e.preventDefault();
                      return;
                    }
                    if (item.onClick) {
                      item.onClick(e);
                    }
                    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
                      onToggle();
                    }
                  }}
                >
                  <span className="dashboard-sidebar-nav-icon">{item.icon}</span>
                  <span className="dashboard-sidebar-nav-label">
                    {item.label}
                    {item.badge && (
                      <span className="dashboard-sidebar-notification-badge">
                        {item.badge}
                      </span>
                    )}
                  </span>
                </a>
              );
            })}
          </div>
        ))}
      </div>

      <div className="dashboard-sidebar-footer">
        {footerItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`dashboard-sidebar-nav-item ${item.className || ""}`}
            data-tooltip={item.label}
            onClick={(e) => {
              if (item.onClick) {
                item.onClick(e);
              }
              if (typeof window !== "undefined" && window.innerWidth <= 1024) {
                onToggle();
              }
            }}
          >
            <span className="dashboard-sidebar-nav-icon">{item.icon}</span>
            <span className="dashboard-sidebar-nav-label">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
