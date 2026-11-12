"use client";

import React, { useState, useEffect, useMemo } from "react";
import "./Service.css";
import Script from "next/script";
import popularCategoriesData from "@/data/popularCategories.json";
import serviceCategoriesData from "@/data/categroies__hiz_data.json";
import CategoryUtils from "@/services/category/CategoryUtils";
import categoryService from "@/services/category/categoryService";
import { USE_API } from "@/api/config";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import serviceHomeService from "@/services/home/serviceHomeService";
import ServiceSearch from "@/components/ServiceSearch/ServiceSearch";
import AcillazimHero from "@/components/AcillazimHero";
import FeaturedServices from "@/components/FeaturedServices/FeaturedServices";
import ServiceCardCategory from "@/components/ServiceCardCategory/ServiceCardCategory";
import NearbyListings from "@/components/NearbyListings/NearbyListings";
import AdBanner from "@/components/AdvertisementBanner/AdBanner";
import { useRouter } from "next/navigation";
import PopularLocation from "@/components/PopularLocations/PopularLocation";
import * as FaIcons from "react-icons/fa";
import { FaSearch, FaUserTie } from "react-icons/fa";
import * as Fa6Icons from "react-icons/fa6";
import * as IoIcons from "react-icons/io5";
import {
  FiArrowRight,
  FiChevronDown,
  FiMapPin,
  FiZap,
  FiShield,
  FiCheckCircle,
  FiClock,
  FiSearch,
} from "react-icons/fi";

interface AuthContextValue {
  isAuthenticated: boolean;
}
interface LocationContextValue {
  location: { city?: string } | null;
  loading: boolean;
}

const turkishChars: Record<string, string> = {
  i: "İ",
  ı: "I",
  g: "G",
  ğ: "Ğ",
  u: "U",
  ü: "Ü",
  s: "S",
  ş: "Ş",
  o: "O",
  ö: "Ö",
  c: "C",
  ç: "Ç",
};
const formatCityName = (cityName: string): string => {
  if (!cityName) return "";
  const fmt = cityName.toLowerCase().trim();
  const first = turkishChars[fmt.charAt(0)] || fmt.charAt(0).toUpperCase();
  const rest = fmt
    .slice(1)
    .split("")
    .map((ch) => turkishChars[ch] || ch.toUpperCase())
    .join("");
  return first + rest;
};

import { decodeHtmlEntities } from "@/services/listings/util/listingUtils";

// ---------------------------------------------------------------------------
// KATEGORİ İKONLARI — tamamen DATA'dan gelir (BE / data/*.json içindeki `icon` alanı).
// Burada kategori ID'sine ya da isme göre statik ikon eşlemesi YOKTUR; data ne diyorsa o.
// `icon` değeri iki biçimde olabilir:
//   • react-icons bileşen adı  → `FaWrench`, `FaHandshakeSimple` ...
//   • kebab-case slug          → `wrench`, `paint-roller` ... (→ `FaWrench`, `FaPaintRoller`)
// Data'daki `icon` boş veya react-icons'ta karşılığı yoksa varsayılan ikon gösterilir.
// ---------------------------------------------------------------------------
type CategoryIconComponent = React.ComponentType<Record<string, never>>;

const ICON_LIBRARIES = [FaIcons, Fa6Icons, IoIcons] as unknown as Array<
  Record<string, CategoryIconComponent | undefined>
>;

/** react-icons'ta birebir karşılığı olmayan BE slug'ları (yalnızca isim çevirisi) */
const BE_ICON_SLUG_ALIASES: Record<string, string> = {
  sparkles: "FaSpa",
};

const toPascalCase = (slug: string): string =>
  slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const findIconComponent = (iconName: string): CategoryIconComponent | null => {
  const raw = iconName.trim();
  if (!raw) return null;

  const candidates = [
    raw,
    BE_ICON_SLUG_ALIASES[raw.toLowerCase()],
    `Fa${toPascalCase(raw)}`,
  ].filter(Boolean) as string[];

  for (const name of candidates) {
    for (const lib of ICON_LIBRARIES) {
      const Icon = lib[name];
      if (Icon) return Icon;
    }
  }
  return null;
};

const resolveCategoryIcon = (
  cat?: { icon?: string | null } | null,
): React.ReactNode => {
  if (!cat || typeof cat.icon !== "string") return null;
  const Icon = findIconComponent(cat.icon);
  return Icon ? <Icon /> : null;
};

const HOW_IT_WORKS = [
  {
    icon: <FiSearch />,
    title: "İhtiyacını Yaz",
    description: "Aradığın hizmeti yaz, kategorilerden seç ya da filtrele.",
  },
  {
    icon: <FiCheckCircle />,
    title: "İlanları İncele",
    description: "Konumundaki ilanları, fiyatları ve açıklamaları karşılaştır.",
  },
  {
    icon: <FiZap />,
    title: "Hızlıca Bağlan",
    description:
      "Beğendiğin ilanın sahibiyle doğrudan iletişime geç, anlaşmanı yap.",
  },
];

const WHY_FEATURES = [
  {
    icon: <FiShield />,
    title: "Güvenli Platform",
    text: "Doğrulanmış ilanlar, şeffaf iletişim.",
  },
  {
    icon: <FiMapPin />,
    title: "Konum Bazlı",
    text: "Çevrendeki ilanlar, doğru eşleşme.",
  },
  {
    icon: <FiClock />,
    title: "7/24 Erişim",
    text: "İstediğin an, istediğin yerden ara.",
  },
];

const FAQS = [
  {
    q: "Acillazım.com nedir?",
    a: "Acillazım.com, çevrendeki hizmet sağlayıcılarla seni buluşturan bir platformdur. Hizmet arayabilir, ilanları inceleyebilir ve ilan sahipleriyle doğrudan iletişime geçebilirsin.",
  },
  {
    q: "Hizmetleri nasıl ararım?",
    a: "Sayfanın üstündeki arama çubuğuna ihtiyacını yaz ya da kategorilerden birini seç. Şehir ve ilçe bilgisini eklediğinde çevrendeki ilanlar listelenir.",
  },
  {
    q: "Hesap açmam gerekiyor mu?",
    a: "İlanları incelemek ve arama yapmak için hesap açmana gerek yok. İletişim bilgilerini görmek veya ilan vermek istediğinde ücretsiz hesap açabilirsin.",
  },
  {
    q: "Nasıl ilan verilir?",
    a: 'Üye girişi yaptıktan sonra "İlan Ver" butonuyla kategorini seç, başlık, açıklama, fiyat ve konum bilgilerini ekle. İlanın kısa sürede yayına alınır.',
  },
  {
    q: "Hangi kategoriler mevcut?",
    a: 'Evden eve nakliyattan tesisatçıya, boya-badanadan özel ders almaya kadar yüzlerce kategoride ilan bulabilirsin. Sayfanın üstündeki "Kategoriler" bölümünden tüm aktif kategorilere ulaşabilirsin.',
  },
  {
    q: "Yardım almak istersem?",
    a: "İletişim sayfasındaki formu doldurarak ya da destek e-posta adresine yazarak bize ulaşabilirsin.",
  },
];

const Service: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth() as AuthContextValue;
  const { location: locationData, loading: locationLoading } =
    useLocation() as LocationContextValue;

  const [currentCity, setCurrentCity] = useState<string>("");
  const [popularServices, setPopularServices] = useState<unknown[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    (async () => {
      try {
        const svc = serviceHomeService as {
          getFeaturedServiceListings: () => Promise<unknown[]>;
        };
        const featured = await svc.getFeaturedServiceListings();
        setPopularServices(featured || []);
      } catch {
        setPopularServices([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (locationData && !locationLoading && locationData.city)
      setCurrentCity(locationData.city);
  }, [locationData, locationLoading]);

  const mainCategories = useMemo(() => {
    return (
      popularCategoriesData as Array<{
        id: number;
        label: string;
        parent_id: number | null;
        img_url: string | null;
      }>
    )
      .filter((c) => c.parent_id === null)
      .map((c) => ({
        id: c.id,
        name: c.label,
        slug: CategoryUtils.slugify(c.label),
      }));
  }, []);

  // Statik JSON fallback (yalnızca USE_API=false / mock modda kullanılır)
  const staticServiceCategories = useMemo(() => {
    return (
      serviceCategoriesData as Array<{
        category_id: number;
        label: string;
        type: string;
        icon: string | null;
        parent_id: number | null;
        order: number;
      }>
    )
      .filter((c) => c.parent_id === 12540 && c.type === "subcategory")
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        id: c.category_id,
        name: decodeHtmlEntities(c.label),
        slug: CategoryUtils.slugify(c.label),
        icon: resolveCategoryIcon(c),
      }));
  }, []);

  const staticMarqueeCategories = useMemo(() => {
    return (
      popularCategoriesData as Array<{
        id: number;
        label: string;
        parent_id: number | null;
        icon: string | null;
        img_url: string | null;
        position: string | null;
      }>
    )
      .filter((c) => c.parent_id === 12540 && c.img_url)
      .map((c) => ({
        id: c.id,
        name: decodeHtmlEntities(c.label),
        slug: CategoryUtils.slugify(c.label),
        imageUrl: c.img_url as string,
        position: c.position || "center",
        icon: resolveCategoryIcon(c),
      }));
  }, []);

  // Hizmetler (12540) alt kategorileri — TEK API çağrısı hem "Tüm Kategoriler" grid'ini
  // hem de "Profesyonel Hizmet Ağı" marquee'sini besliyor (BE artık img_url + position da dönüyor).
  // USE_API=true  → SADECE gerçek BE (/api/v1/categories?parent_id=12540). BE hata verirse
  //                 mock'a düşülmez — liste boş kalır ve "yüklenemedi" durumu gösterilir.
  //                 (Amaç: BE hazır değilken sayfanın "her şey normal" görünmesini engellemek.)
  // USE_API=false → categroies_data.json / popularCategories.json (bilinçli mock mod)
  interface FetchedHizmetCategory {
    category_id: number;
    label: string;
    slug: string;
    name?: string;
    type?: string;
    icon?: string | null;
    img_url?: string | null;
    position?: string | null;
    order?: number;
  }

  const [fetchedCategories, setFetchedCategories] = useState<
    FetchedHizmetCategory[] | null
  >(null);
  const [categoriesLoading, setCategoriesLoading] = useState(USE_API);
  const [categoriesFailed, setCategoriesFailed] = useState(false);

  useEffect(() => {
    if (!USE_API) return; // Mock modda zaten static veriyi kullanıyoruz, API'ye hiç gitmiyoruz

    let cancelled = false;
    (async () => {
      try {
        const subCategories = await categoryService.getSubCategories(12540);
        if (cancelled) return;
        const list = (Array.isArray(subCategories)
          ? subCategories
          : []) as unknown as FetchedHizmetCategory[];
        // BE ne dönerse onu göster (boşsa boş, kısmi ise kısmi) — mock'a düşülmüyor.
        // Not: parent_id=12540 filtresi zaten BE tarafında uygulandığı için ek "type" filtresi
        // gerekmiyor — BE'nin type sözlüğü (branch/leaf) mock'takinden (subcategory/leaf) farklı.
        setFetchedCategories(list);
        setCategoriesFailed(list.length === 0);
      } catch (error) {
        console.error(
          "❌ [Service.tsx] Kategoriler BE'den alınamadı, mock kullanılmıyor:",
          error,
        );
        if (!cancelled) {
          setFetchedCategories([]);
          setCategoriesFailed(true);
        }
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allServiceCategories = useMemo(() => {
    if (!USE_API) return staticServiceCategories;
    return [...(fetchedCategories || [])]
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((c) => ({
        id: c.category_id,
        name: decodeHtmlEntities(c.label || c.name || ""),
        slug: c.slug,
        icon: resolveCategoryIcon(c),
      }));
  }, [fetchedCategories, staticServiceCategories]);

  const serviceCategories = useMemo(() => {
    const categoriesWithImages = (fetchedCategories || [])
      .map((c) => {
        const jsonMatch = (
          popularCategoriesData as Array<{
            label?: string;
            img_url?: string | null;
            position?: string | null;
          }>
        ).find(
          (p) =>
            p.label &&
            c.label &&
            p.label.toLowerCase() === c.label.toLowerCase(),
        );
        const imageUrl = c.img_url || jsonMatch?.img_url;
        if (!imageUrl) return null;
        return {
          id: c.category_id,
          name: decodeHtmlEntities(c.label || c.name || ""),
          slug: c.slug,
          imageUrl: imageUrl as string,
          position: c.position || jsonMatch?.position || "center",
          icon: resolveCategoryIcon(c),
        };
      })
      .filter(Boolean) as Array<{
      id: number;
      name: string;
      slug: string;
      imageUrl: string;
      position: string;
      icon: React.ReactNode;
    }>;

    if (categoriesWithImages.length > 0) {
      return categoriesWithImages;
    }
    return staticMarqueeCategories;
  }, [fetchedCategories, staticMarqueeCategories]);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.hash === "#hizmet-ara"
    ) {
      const heroEl = document.getElementById("hizmet-ara");
      if (heroEl) {
        setTimeout(() => {
          heroEl.scrollIntoView({ behavior: "smooth", block: "start" });
          const input = heroEl.querySelector<HTMLInputElement>("input");
          if (input) input.focus();
        }, 300);
      }
    }
  }, []);

  const handleHizmetAraClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      e.preventDefault();
      const heroEl =
        document.getElementById("hizmet-ara") ||
        document.querySelector(".svc-hero");
      if (heroEl) {
        heroEl.scrollIntoView({ behavior: "smooth", block: "start" });
        const input = heroEl.querySelector<HTMLInputElement>("input");
        if (input) {
          setTimeout(() => input.focus(), 400);
        }
      } else {
        window.location.href = "/#hizmet-ara";
      }
    }
  };

  return (
    <>
      <Script
        id="ld-faq"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <article className="svc" lang="tr">
        <h1 className="sr-only">Ustalar ve Hizmetler — Acillazım.com</h1>

        {/* ===========================================================
            1. HERO — Editorial split (light background, NO dark orbs)
            =========================================================== */}
        <section className="svc-hero" id="hizmet-ara" aria-label="Hizmet arama">
          <div className="svc-hero__container">
            <div className="svc-hero__left">
              <span className="svc-pill">
                <span className="svc-pill__dot" aria-hidden /> Türkiye'nin
                hizmet platformu
              </span>
              <h2 className="svc-hero__title">
                İstediğin hizmet,
                <br />
                <span className="svc-hero__accent">doğru usta,</span>
                <br />
                tek aramaya yakın.
              </h2>
              <p className="svc-hero__lede">
                Onaylı profesyonellerle anında eşleş. Konumundaki en iyi
                ustalardan teklif al, güvenle randevu oluştur.
              </p>
              <div className="svc-hero__search">
                <ServiceSearch />
              </div>
              <div
                className="svc-hero__quickstats"
                aria-label="Platformda neler var"
              >
                <div className="svc-hero__stat">
                  <span className="svc-hero__stat-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="5" cy="5" r="1.6" />
                      <circle cx="12" cy="5" r="1.6" />
                      <circle cx="19" cy="5" r="1.6" />
                      <circle cx="5" cy="12" r="1.6" />
                      <circle cx="12" cy="12" r="1.6" />
                      <circle cx="19" cy="12" r="1.6" />
                      <circle cx="5" cy="19" r="1.6" />
                      <circle cx="12" cy="19" r="1.6" />
                      <circle cx="19" cy="19" r="1.6" />
                    </svg>
                  </span>
                  <div className="svc-hero__stat-text">
                    <span className="svc-hero__stat-num">
                      {mainCategories.length}
                    </span>
                    <span className="svc-hero__stat-label">Ana Kategori</span>
                  </div>
                </div>
                <span className="svc-hero__stat-sep" aria-hidden />
                <div className="svc-hero__stat">
                  <span className="svc-hero__stat-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2zM5 14l1 2.6 2.6 1-2.6 1L5 21.2 4 18.6 1.4 17.6 4 16.6 5 14zm14 0l1 2.6 2.6 1-2.6 1L19 21.2 18 18.6 15.4 17.6 18 16.6 19 14z" />
                    </svg>
                  </span>
                  <div className="svc-hero__stat-text">
                    <span className="svc-hero__stat-num">
                      {serviceCategories.length}
                    </span>
                    <span className="svc-hero__stat-label">Hizmet Alanı</span>
                  </div>
                </div>
                <span className="svc-hero__stat-sep" aria-hidden />
                <div className="svc-hero__stat">
                  <span className="svc-hero__stat-icon" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path
                        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                        fill="currentColor"
                      />
                      <circle cx="12" cy="10" r="3" fill="#FFF8F1" />
                    </svg>
                  </span>
                  <div className="svc-hero__stat-text">
                    <span className="svc-hero__stat-num">81</span>
                    <span className="svc-hero__stat-label">İl</span>
                  </div>
                </div>
              </div>
            </div>

            <aside className="svc-hero__right" aria-label="Platform görseli">
              <div
                className="svc-hero__image"
                role="img"
                aria-label="Acillazım profesyonel ekibi"
              />
            </aside>
          </div>
        </section>

        {/* ANASAYFA ÜST ANA BANNER (AB1 — 1200x300 px) */}
        <div className="svc-ab1-banner">
          <AdBanner
            pageId={2}
            sectionId={1}
            sectionCode="AB1"
            useSlider={true}
            sliderInterval={7000}
          />
        </div>

        {/* ===========================================================
            2. TÜM KATEGORİLER (29 ana kategori - gerçek veri)
            =========================================================== */}
        <section className="svc-allcats" aria-labelledby="svc-allcats-title">
          <div className="svc-allcats__inner">
            <header className="svc-section-header">
              <span className="svc-section-header__kicker">
                Hizmet Kategorileri
              </span>
              <h2 className="svc-section-header__title" id="svc-allcats-title">
                Aradığın her şey{" "}
                <span className="svc-section-header__accent">burada</span>
              </h2>
              <p className="svc-section-header__lede">
                Platformdaki tüm aktif hizmet kategorileri. Birine tıkla, ilgili
                ustalara ulaş.
              </p>
            </header>

            {categoriesLoading ? (
              <div className="svc-allcats__state" role="status">
                Kategoriler yükleniyor…
              </div>
            ) : categoriesFailed ? (
              <div className="svc-allcats__state" role="alert">
                Kategoriler şu anda yüklenemedi. Lütfen daha sonra tekrar
                deneyin.
              </div>
            ) : (
              <div className="svc-allcats__grid">
                {allServiceCategories.map((cat) => (
                  <a
                    key={cat.id}
                    href={`/kategoriler/${cat.slug}`}
                    className="svc-allcat"
                  >
                    {cat.icon && (
                      <span className="svc-allcat__icon" aria-hidden>
                        {cat.icon}
                      </span>
                    )}
                    <span className="svc-allcat__name">{cat.name}</span>
                    <span className="svc-allcat__arrow" aria-hidden>
                      <FiArrowRight />
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ===========================================================
            4. HİZMET KATEGORİLERİ — Sunum Galerisi
            =========================================================== */}
        <section className="svc-servcats" aria-labelledby="svc-servcats-title">
          <div className="svc-servcats__inner">
            <header className="svc-section-header">
              <span className="svc-section-header__kicker">Hizmetler</span>
              <h2 className="svc-section-header__title" id="svc-servcats-title">
                Profesyonel hizmet{" "}
                <span className="svc-section-header__accent">ağı</span>
              </h2>
              <p className="svc-section-header__lede">
                Evinden işyerine, acilden plana — ihtiyacın olan her hizmet tek
                yerde.
              </p>
            </header>

            <div className="svc-marquee">
              <div className="svc-marquee__track">
                {[...serviceCategories, ...serviceCategories].map((cat, i) => (
                  <div
                    key={`r1-${cat.id}-${i}`}
                    className="svc-marquee__card"
                  >
                    <img
                      className="svc-marquee__img"
                      src={cat.imageUrl}
                      alt={cat.name}
                      loading="lazy"
                      style={{ objectPosition: cat.position }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "/images/services/category-image/Web-Tasarım-Yazılım-Hizmetleri.png";
                      }}
                    />
                    <div className="svc-marquee__label">
                      <span>{cat.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===========================================================
            4b. ANA İÇERİK — Gerçek ilanlar
            =========================================================== */}
        <main className="svc-main" id="main">
          <section className="svc-block" aria-labelledby="svc-feat-title">
            <header className="svc-section-header">
              <span className="svc-section-header__kicker">Öne Çıkan</span>
              <h2 className="svc-section-header__title" id="svc-feat-title">
                Vitrin{" "}
                <span className="svc-section-header__accent">Hizmetler</span>
              </h2>
              <p className="svc-section-header__lede">
                Platformda öne çıkan, güncel hizmet ilanları.
              </p>
            </header>
            <FeaturedServices services={popularServices} />
            <div className="svc-section-footer">
              <button
                className="svc-section-footer__link"
                onClick={() =>
                  router.push("/filtrele/tum-ilanlar?vitrin_durumu=vitrin")
                }
              >
                Tümünü Gör →
              </button>
            </div>
          </section>
        </main>

        {/* ===========================================================
            5. POPÜLER HİZMETLER + YAKINDAKİ
            =========================================================== */}
        <main className="svc-main" id="main-2">
          <section className="svc-block" aria-labelledby="svc-pop-title">
            <header className="svc-section-header">
              <span className="svc-section-header__kicker">Trend</span>
              <h2 className="svc-section-header__title" id="svc-pop-title">
                Şu sıralar{" "}
                <span className="svc-section-header__accent">
                  tercih ediliyor
                </span>
              </h2>
              <p className="svc-section-header__lede">
                Kullanıcıların en çok ilgi gösterdiği güncel hizmet ilanları.
              </p>
            </header>
            <ServiceCardCategory
              cardCategoryText="Popüler Hizmetler"
              usePopularServices
            />
          </section>

          <section className="svc-block" aria-labelledby="svc-near-title">
            <div className="svc-nearby-wrap">
              <NearbyListings
                city={currentCity}
                isAuthenticated={isAuthenticated}
                itemLimit={12}
                customTitle={`${currentCity ? formatCityName(currentCity) : ""} çevresindeki hizmetler`}
              />
            </div>
            <h2 className="sr-only" id="svc-near-title">
              Yakındaki Hizmetler
            </h2>
          </section>
        </main>

        {/* ===========================================================
            5. ŞEHİRLER
            =========================================================== */}
        <section className="svc-cities" aria-labelledby="svc-cities-title">
          <div className="svc-cities__inner">
            <header className="svc-section-header">
              <span className="svc-section-header__kicker">
                <FiMapPin aria-hidden /> Şehirler
              </span>
              <h2 className="svc-section-header__title" id="svc-cities-title">
                Türkiye'nin dört bir{" "}
                <span className="svc-section-header__accent">yanındayız</span>
              </h2>
            </header>
            <PopularLocation />
          </div>
        </section>

        {/* ===========================================================
            6. NASIL ÇALIŞIR + NEDEN BİZ
            =========================================================== */}
        <section className="svc-info" aria-labelledby="svc-how-title">
          <div className="svc-info__inner">
            <div className="svc-info__col">
              <header className="svc-section-header">
                <span className="svc-section-header__kicker">
                  Nasıl Çalışır
                </span>
                <h2 className="svc-section-header__title" id="svc-how-title">
                  Üç adımda{" "}
                  <span className="svc-section-header__accent">çözüm</span>
                </h2>
              </header>

              <ol className="svc-how__steps">
                {HOW_IT_WORKS.map((s, i) => (
                  <li className="svc-how__step" key={i}>
                    <span className="svc-how__num" aria-hidden>
                      0{i + 1}
                    </span>
                    <span className="svc-how__icon" aria-hidden>
                      {s.icon}
                    </span>
                    <h3 className="svc-how__title">{s.title}</h3>
                    <p className="svc-how__desc">{s.description}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="svc-info__col">
              <header className="svc-section-header">
                <span className="svc-section-header__kicker">
                  Neden Acillazım
                </span>
                <h2 className="svc-section-header__title">
                  Güvenin{" "}
                  <span className="svc-section-header__accent">
                    standartlarını
                  </span>{" "}
                  yükselttik
                </h2>
              </header>

              <ul className="svc-why__list">
                {WHY_FEATURES.map((w) => (
                  <li className="svc-why__item" key={w.title}>
                    <span className="svc-why__icon" aria-hidden>
                      {w.icon}
                    </span>
                    <div>
                      <h3 className="svc-why__title">{w.title}</h3>
                      <p className="svc-why__desc">{w.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ===========================================================
            7. SSS
            =========================================================== */}
        <section className="svc-faq" aria-labelledby="svc-faq-title" id="sss">
          <div className="svc-faq__inner">
            <header className="svc-section-header">
              <span className="svc-section-header__kicker">
                Sıkça Sorulan Sorular
              </span>
              <h2 className="svc-section-header__title" id="svc-faq-title">
                Aklındaki{" "}
                <span className="svc-section-header__accent">sorular</span>
              </h2>
            </header>

            <div className="svc-faq__list">
              {FAQS.map((f, i) => (
                <details
                  className={`svc-faq__item ${openFaq === i ? "is-open" : ""}`}
                  key={f.q}
                  open={openFaq === i}
                  onToggle={(e) => {
                    if ((e.target as HTMLDetailsElement).open) setOpenFaq(i);
                  }}
                >
                  <summary className="svc-faq__q">
                    <span className="svc-faq__q-text">{f.q}</span>
                    <span className="svc-faq__chev" aria-hidden>
                      <FiChevronDown />
                    </span>
                  </summary>
                  <div className="svc-faq__a">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===========================================================
            8. CTA — Acillazım Hero Banner
            =========================================================== */}
        <section className="svc-cta" aria-labelledby="acillazim-hero-title">
          <AcillazimHero
            searchHref="/arama"
            postHref="/ilan-ver"
            onSearchClick={handleHizmetAraClick}
          />
        </section>
      </article>
    </>
  );
};

export default Service;
