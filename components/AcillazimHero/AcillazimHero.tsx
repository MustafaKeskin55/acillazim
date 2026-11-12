import Link from "next/link";
import React, { type ReactNode } from "react";
import Image from "next/image";
import styles from "./AcillazimHero.module.css";
import { useAuth } from "@/context/AuthContext";

export type AcillazimHeroProps = {
  /** Mevcut sitenizdeki hizmet arama sayfasının adresi. */
  searchHref?: string;
  /** Mevcut sitenizdeki ilan oluşturma sayfasının adresi. */
  postHref?: string;
  /** Arama butonuna tıklandığında tetiklenecek fonksiyon (örneğin sayfada yukarı kaydırma için). */
  onSearchClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
};

type IconName = "search" | "arrow" | "user" | "shield" | "pin" | "star" | "calendar";

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    user: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19v-1a6 6 0 0 1 12 0v1" />
        <path d="M19 9v8m-4-4h8" />
      </>
    ),
    shield: (
      <>
        <path d="M12 2 4 5v6c0 5 3.3 8.3 8 11 4.7-2.7 8-6 8-11V5l-8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    star: (
      <>
        <path d="m12 2 3.1 6.4 7.1 1-5.1 5 .9 7.1-6-3.3-6 3.3.9-7.1-5.1-5 7.1-1L12 2Z" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 2v6M17 2v6M3 10h18" />
        <path d="m9 16 2 2 4-4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

const benefits: { title: string; icon: IconName }[] = [
  { title: "Güvenilir Hizmetler", icon: "shield" },
  { title: "Konumuna En Yakın", icon: "pin" },
  { title: "Gerçek Yorumlar", icon: "star" },
  { title: "Kolay Randevu", icon: "calendar" },
];

export default function AcillazimHero({
  searchHref = "/arama",
  postHref = "/ilan-ver",
  onSearchClick,
  className = "",
}: AcillazimHeroProps) {
  const { isAuthenticated } = useAuth();

  const handlePostAdClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("openAuthPromptModal"));
    }
  };

  return (
    <div
      className={`${styles.banner} ${className}`.trim()}
      aria-labelledby="acillazim-hero-title"
    >
      <div className={styles.photo}>
        <Image
          src="/images/acillazim-usta.webp"
          alt="Müşterisinin mutfağında tesisat onarımı yapan profesyonel usta"
          fill
          priority
          sizes="(max-width: 700px) 100vw, 46vw"
          className={styles.photoImage}
        />
      </div>

      <div className={styles.content}>
        <div className={styles.deco} aria-hidden="true" />

        <h2 id="acillazim-hero-title" className={styles.heading}>
          Hizmet mi arıyorsun,<br />
          hizmet mi <span>vermek istiyorsun?</span>
        </h2>

        <p className={styles.description}>
          Acillazım, hizmet arayanlarla hizmet verenleri buluşturan platformdur.
        </p>

        <div className={styles.actions}>
          <Link
            href={searchHref}
            onClick={onSearchClick}
            className={styles.primaryButton}
          >
            <Icon name="search" className={styles.buttonIcon} />
            <span>Hizmet Ara</span>
            <Icon name="arrow" className={styles.arrowIcon} />
          </Link>
          <Link
            href={postHref}
            onClick={handlePostAdClick}
            className={styles.secondaryButton}
          >
            <Icon name="user" className={styles.buttonIcon} />
            <span>İlan Ver</span>
          </Link>
        </div>

        <ul className={styles.benefits} aria-label="Acillazım özellikleri">
          {benefits.map((item) => (
            <li className={styles.benefit} key={item.title}>
              <span className={styles.benefitIcon}>
                <Icon name={item.icon} />
              </span>
              <span>{item.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
