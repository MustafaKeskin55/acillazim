"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { IoClose, IoPersonOutline } from "react-icons/io5";
import {
  FaHeart,
  FaUser,
  FaKey,
  FaShieldAlt,
  FaClipboardList,
  FaChartLine,
  FaSignOutAlt,
  FaEnvelope,
  FaBell,
} from "react-icons/fa";
import { useAuth } from "@/context/AuthContext";
import "./hesabim.css";

function getUserDisplayName(
  currentUser: { name?: string; email?: string; firstName?: string; lastName?: string } | null
): string {
  let sessionUser: Record<string, unknown> | null = null;
  try {
    const sessionData = sessionStorage.getItem("user_data");
    if (sessionData) sessionUser = JSON.parse(sessionData);
  } catch {
    /* ignore */
  }

  const u = currentUser;
  const firstName = (sessionUser?.firstName ||
    sessionUser?.name ||
    u?.firstName ||
    u?.name ||
    "") as string;
  const lastName = (sessionUser?.lastName || u?.lastName || "") as string;

  if (firstName && lastName) {
    const fullName = `${firstName} ${lastName}`;
    return fullName.length <= 28 ? fullName : `${firstName} ${String(lastName).charAt(0)}.`;
  }
  if (firstName) return firstName;
  const email = (sessionUser?.email || currentUser?.email) as string | undefined;
  if (email) return email.split("@")[0];
  return "Kullanıcı";
}

const MENU_ITEMS: { href: string; label: string; icon: typeof FaHeart }[] = [
  { href: "/dashboard/profil", label: "Profilim", icon: FaUser },
  { href: "/dashboard/aktif-ilanlar", label: "İlanlarım", icon: FaClipboardList },
  { href: "/dashboard/ilan-istatistikleri", label: "İlan istatistiklerim", icon: FaChartLine },
  { href: "/dashboard/favoriler", label: "Favorilerim", icon: FaHeart },
  { href: "/dashboard/mesajlar", label: "Mesajlar", icon: FaEnvelope },
  { href: "/dashboard/bildirimler", label: "Bildirimler", icon: FaBell },
  { href: "/dashboard/sifre-ve-guvenlik#password", label: "Şifre ayarları", icon: FaKey },
  { href: "/dashboard/sifre-ve-guvenlik#security", label: "Güvenlik", icon: FaShieldAlt },
];

function isLinkActive(pathname: string, href: string): boolean {
  const pathOnly = href.split("#")[0];
  if (pathname === pathOnly) return true;
  /* Panel kökü yalnızca /dashboard’ta vurgulansın; alt rotalar başka satırlarda */
  if (pathOnly === "/dashboard") return false;
  if (pathOnly.length > 1 && pathname.startsWith(`${pathOnly}/`)) return true;
  return false;
}

export default function HesabimPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated: isLoggedIn, currentUser, logout } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) router.replace("/giris");
  }, [isLoggedIn, router]);

  const handleLogout = () => {
    logout();
    router.push("/giris");
  };

  if (!isLoggedIn) {
    return <div className="hesabim-page hesabim-page--empty" />;
  }

  const displayName = getUserDisplayName(currentUser);

  return (
    <>
      <main className="hesabim-page">
        <header className="hesabim-hero">
          <div className="hesabim-hero-bg" aria-hidden />
          <button
            type="button"
            className="hesabim-close"
            aria-label="Kapat"
            onClick={() => router.push("/")}
          >
            <IoClose />
          </button>
          <div className="hesabim-hero-row">
            <div className="hesabim-avatar" aria-hidden>
              <IoPersonOutline />
            </div>
            <div className="hesabim-hero-text">
              <h1 className="hesabim-username">{displayName}</h1>
              <span className="hesabim-badge">Üye</span>
            </div>
          </div>
        </header>

        <section className="hesabim-dashboard" aria-labelledby="hesabim-panel-title">
          <div className="hesabim-dashboard-intro">
            <h2 id="hesabim-panel-title" className="hesabim-dashboard-title">
              Yönetim paneli
            </h2>
            <p className="hesabim-dashboard-desc">
              İlanlar, hizmet alanları, randevular ve güvenlik ayarlarına tek yerden geçin.
            </p>
            <Link href="/dashboard?menu=1" className="hesabim-dashboard-cta">
              Yönetim paneline git
            </Link>
          </div>
        </section>

        <h2 className="hesabim-subsection-title">Hızlı bağlantılar</h2>
        <nav className="hesabim-list" aria-label="Hesap kısayolları">
          {MENU_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isLinkActive(pathname, href);
            return (
              <Link key={href} href={href} className={`hesabim-row ${active ? "hesabim-row--active" : ""}`}>
                <span className="hesabim-row-icon-wrap">
                  <Icon className="hesabim-row-icon" />
                </span>
                <span className="hesabim-row-label">{label}</span>
                <span className="hesabim-row-chevron" aria-hidden>
                  ›
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="hesabim-footer">
          <button type="button" className="hesabim-logout" onClick={handleLogout}>
            <span className="hesabim-logout-icon">
              <FaSignOutAlt />
            </span>
            Çıkış Yap
          </button>
        </div>
      </main>
    </>
  );
}
