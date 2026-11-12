"use client";

import React, { useState, useEffect, useRef } from "react";
import useAdBanner from "./useAdBanner";
import "./adBanner.css";

// ---- Types ----
interface Advertisement {
  id: string | number;
  title: string;
  link: string;
  src: string;
  mediaType: "image" | "video" | "animation" | "iframe" | "html" | "lottie";
  [key: string]: unknown;
}

interface AdBannerHookResult {
  advertisement: Advertisement | null;
  advertisements: Advertisement[];
  loading: boolean;
  error: Error | null;
  isEmpty: boolean;
}

// ---- Media URL & Type Helpers ----
const escapeXmlText = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildPlaceholderSvg = (
  text: string,
  width = 1200,
  height = 300,
  bg = "64748B",
  fg = "FFFFFF"
): string => {
  const fontSize = Math.max(18, Math.round(Math.min(width, height) / 8));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="#${bg}"/>` +
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#${fg}" ` +
    `font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700">${escapeXmlText(text)}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const buildFallbackSvg = (label = "Reklam"): string => {
  return buildPlaceholderSvg(label || "Reklam", 1200, 300, "e2e8f0", "475569");
};

const toVitrinMediaPath = (urlPath: string): string => {
  if (urlPath.startsWith("/uploads/advertisements/")) {
    return urlPath.replace(/^\/uploads\/advertisements\//, "/media/vitrin/");
  }
  return urlPath;
};

const resolveAdMediaUrl = (rawUrl?: string | null, fallbackTitle?: string | null): string => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      if (
        host === "via.placeholder.com" ||
        host.endsWith(".via.placeholder.com") ||
        host === "placeholder.com"
      ) {
        const parts = parsed.pathname.split("/").filter(Boolean);
        let width = 1200;
        let height = 300;
        let bg = "64748B";
        let fg = "FFFFFF";
        if (parts[0] && /^\d+x\d+$/i.test(parts[0])) {
          const [w, h] = parts[0].toLowerCase().split("x");
          width = Number(w) || 1200;
          height = Number(h) || 300;
          if (parts[1]) bg = parts[1].replace("#", "");
          if (parts[2]) fg = parts[2].replace("#", "");
        }
        const text = parsed.searchParams.get("text") || fallbackTitle || "Reklam";
        return buildPlaceholderSvg(text.replace(/\+/g, " "), width, height, bg, fg);
      }
      if (parsed.pathname.startsWith("/uploads/advertisements/")) {
        return toVitrinMediaPath(parsed.pathname);
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  if (trimmed.startsWith("/uploads/advertisements/")) {
    return toVitrinMediaPath(trimmed);
  }

  if (trimmed.startsWith("/uploads/")) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    return apiBase ? `${apiBase}${trimmed}` : trimmed;
  }
  return trimmed;
};

const detectMediaType = (
  declaredType: Advertisement["mediaType"],
  url: string
): Advertisement["mediaType"] => {
  const cleanPath = url.split("?")[0].split("#")[0].toLowerCase();
  if (/\.(mp4|webm|ogg|mov)$/.test(cleanPath)) return "video";
  if (/\.(png|jpe?g|webp|gif|svg|avif)$/.test(cleanPath)) {
    return declaredType === "animation" ? "animation" : "image";
  }
  return declaredType;
};

const getAdLinkBackgroundStyle = (ad: Advertisement | null): React.CSSProperties | undefined => {
  if (!ad) return undefined;
  const rawSrc = ad.src ? String(ad.src).trim() : "";
  const effectiveType = detectMediaType(ad.mediaType, rawSrc);
  if (effectiveType !== "image" && effectiveType !== "animation") return undefined;
  const resolved = resolveAdMediaUrl(rawSrc, ad.title);
  if (!resolved) return undefined;
  return {
    backgroundImage: `url("${resolved}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
};

// ---- AdContent ----
const AdContent: React.FC<{ advertisement: Advertisement | null }> = ({ advertisement }) => {
  const [videoFailed, setVideoFailed] = useState(false);

  const rawSrc = advertisement?.src ? String(advertisement.src).trim() : "";
  const rawPoster = advertisement
    ? ((advertisement as Record<string, unknown>).poster as string | undefined)
    : undefined;

  useEffect(() => {
    setVideoFailed(false);
  }, [rawSrc, rawPoster]);

  if (!advertisement) return null;
  const { mediaType: declaredMediaType, title } = advertisement;
  const src = resolveAdMediaUrl(rawSrc, title);
  const poster = resolveAdMediaUrl(rawPoster, title) || undefined;
  const effectiveMediaType = detectMediaType(declaredMediaType, rawSrc || src);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const t = e.currentTarget;
    if (rawSrc.startsWith("/uploads/") && t.dataset.triedRelative !== "1") {
      t.dataset.triedRelative = "1";
      if (t.src !== window.location.origin + rawSrc) {
        t.src = rawSrc;
        return;
      }
    }
    t.onerror = null;
    t.src = buildFallbackSvg(title || "Reklam");
  };

  switch (effectiveMediaType) {
    case "image":
      return (
        <img
          src={src}
          alt={title}
          className="alz-vitrin-media"
          loading="eager"
          onError={handleImageError}
        />
      );
    case "video":
      if (videoFailed) {
        return (
          <img
            src={poster || buildFallbackSvg(title || "Video Reklam")}
            alt={title}
            className="alz-vitrin-media"
            onError={(e) => {
              const t = e.currentTarget;
              if (rawPoster && rawPoster.startsWith("/uploads/") && t.dataset.triedRelative !== "1") {
                t.dataset.triedRelative = "1";
                t.src = rawPoster;
                return;
              }
              t.onerror = null;
              t.src = buildFallbackSvg(title || "Video Reklam");
            }}
          />
        );
      }
      return (
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          className="alz-vitrin-video"
          aria-label={title}
          poster={poster || buildFallbackSvg(title || "Video Reklam")}
          onError={(e) => {
            const t = e.currentTarget;
            if (rawSrc.startsWith("/uploads/") && t.dataset.triedRelative !== "1") {
              t.dataset.triedRelative = "1";
              t.src = rawSrc;
              t.load();
              return;
            }
            setVideoFailed(true);
          }}
        />
      );
    case "animation":
      return (
        <img
          src={src}
          alt={title}
          className="alz-vitrin-anim"
          loading="eager"
          onError={handleImageError}
        />
      );
    case "iframe":
      return <iframe src={src} title={title} className="alz-vitrin-iframe" sandbox="allow-scripts allow-same-origin" loading="lazy" />;
    case "html":
      return <div className="ad-banner-html" dangerouslySetInnerHTML={{ __html: src }} />;
    case "lottie":
      return <div className="ad-banner-lottie"><img src={src} alt={title} /></div>;
    default:
      return <div className="ad-banner-fallback"><p>{title}</p></div>;
  }
};

// ---- AdSlider ----
interface AdSliderProps {
  advertisements: Advertisement[];
  onAdClick?: ((ad: Advertisement) => void) | null;
  interval?: number;
  className?: string;
  sectionCode?: string | null;
}

const AdSlider: React.FC<AdSliderProps> = ({
  advertisements,
  onAdClick,
  interval = 5000,
  className = "",
  sectionCode = null,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"next" | "prev">("next");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => handleNextSlide(), interval);
  };

  useEffect(() => {
    if (advertisements.length <= 1) return;
    timerRef.current = setInterval(() => handleNextSlide(), interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advertisements.length, interval]);

  const handlePrevSlide = () => {
    if (animating) return;
    setSlideDirection("prev");
    setAnimating(true);
    setCurrentIndex((prev) => (prev === 0 ? advertisements.length - 1 : prev - 1));
    setTimeout(() => setAnimating(false), 1300);
    resetTimer();
  };

  const handleNextSlide = () => {
    if (animating) return;
    setSlideDirection("next");
    setAnimating(true);
    setCurrentIndex((prev) => (prev === advertisements.length - 1 ? 0 : prev + 1));
    setTimeout(() => setAnimating(false), 1300);
    resetTimer();
  };

  if (!advertisements || advertisements.length === 0) return null;

  if (advertisements.length === 1) {
    const ad = advertisements[0];
    return (
      <div className={`ad-banner ${className}`} data-vitrin-id={ad.id} data-section-code={sectionCode}>
        {sectionCode !== "AB1" && <div className="ad-banner-label">Reklam</div>}
        <a
          href={ad.link}
          target="_blank"
          rel="noopener noreferrer"
          className="ad-banner-link"
          style={getAdLinkBackgroundStyle(ad)}
          onClick={() => onAdClick && onAdClick(ad)}
        >
          <AdContent advertisement={ad} />
        </a>
      </div>
    );
  }

  const currentAd = advertisements[currentIndex];

  return (
    <div
      className={`ad-banner ad-slider ${className} ${sectionCode === "AB1" ? "acillazim-ab1-slider" : ""}`}
      data-vitrin-id={currentAd.id}
      data-section-code={sectionCode}
    >
      {sectionCode !== "AB1" && <div className="ad-banner-label">Reklam</div>}
      <div
        className={`ad-slider-container ${sectionCode === "AB1" ? "acillazim-ab1-slider-container" : ""} ${animating ? "animating" : ""} ${slideDirection === "next" ? "slide-next" : "slide-prev"}`}
        style={{ transformStyle: "flat", perspective: "none", background: "white", backfaceVisibility: "hidden" }}
      >
        <a
          href={currentAd.link}
          target="_blank"
          rel="noopener noreferrer"
          className={`ad-banner-link ${sectionCode === "AB1" ? "acillazim-ab1-ad-link" : ""}`}
          style={getAdLinkBackgroundStyle(currentAd)}
          onClick={() => onAdClick && onAdClick(currentAd)}
        >
          <AdContent advertisement={currentAd} />
        </a>
      </div>

      {sectionCode === "AB1" && (
        <div className="acillazim-ab1-nav-wrapper">
          <div className="acillazim-ab1-indicators">
            {advertisements.map((_, index) => (
              <button
                key={index}
                className={`acillazim-ab1-indicator ${index === currentIndex ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (animating || index === currentIndex) return;
                  setSlideDirection(index > currentIndex ? "next" : "prev");
                  setAnimating(true);
                  setCurrentIndex(index);
                  resetTimer();
                  setTimeout(() => setAnimating(false), 1300);
                }}
                aria-label={`İlan ${index + 1}`}
                disabled={animating}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---- AdBanner (default export) ----
interface AdBannerProps {
  pageId?: number;
  sectionId?: number;
  sectionCode?: string | null;
  categoryId?: number | null;
  listingType?: string | null;
  region?: string | null;
  onAdClick?: ((ad: Advertisement) => void) | null;
  className?: string;
  useSlider?: boolean;
  sliderInterval?: number;
  limit?: number;
  showDebugInfo?: boolean;
}

const AdBanner: React.FC<AdBannerProps> = ({
  pageId = 1,
  sectionId: sectionIdProp = 1,
  sectionCode = null,
  categoryId = null,
  listingType = null,
  region = null,
  onAdClick = null,
  className = "",
  useSlider = true,
  sliderInterval = 10000,
  limit = 20,
  showDebugInfo = false,
}) => {
  let sectionId = sectionIdProp;

  if (sectionCode) {
    const code = sectionCode.toUpperCase().replace(/İ/g, "I");
    if (["B1", "KB1", "AB1", "DB1", "ID1"].includes(code)) sectionId = 1;
    else if (["S1", "KS1", "SB1", "AS1", "SA1", "DS1", "HI1"].includes(code)) sectionId = 2;
    else if (["AS2", "SC1"].includes(code)) sectionId = 3;
    else if (["PF1"].includes(code)) {
      pageId = 4;
      sectionId = 4;
    }
  }

  if (pageId === 5) pageId = 4;
  const validPageIds = [1, 2, 3, 4];
  const validSectionIds = [1, 2, 3, 4];
  if (!validPageIds.includes(pageId)) pageId = 1;
  if (!validSectionIds.includes(sectionId)) sectionId = 1;

  const { advertisement, advertisements, loading, error, isEmpty } = useAdBanner({
    pageId, sectionId, sectionCode, categoryId, listingType, region,
    limit: useSlider ? limit : 1,
    showSlider: useSlider,
  }) as AdBannerHookResult;

  if (loading) return <div className={`ad-banner-loading ${className}`} aria-busy="true" data-section-code={sectionCode} />;

  if (error) {
    return null;
  }

  const primaryAd = advertisement ?? (advertisements.length > 0 ? advertisements[0] : null);

  if (isEmpty || !primaryAd) {
    return null;
  }

  const handleClick = (ad: Advertisement) => {
    if (onAdClick && typeof onAdClick === "function") onAdClick(ad);
    console.log("Reklama tıklandı:", ad.id, ad.title);
  };

  if (!useSlider || advertisements.length <= 1) {
    return (
      <div className={`ad-banner ${className}`} data-vitrin-id={primaryAd.id} data-section-code={sectionCode}>
        <div className="ad-banner-label">Reklam</div>
        <a
          href={primaryAd.link}
          target="_blank"
          rel="noopener noreferrer"
          className="ad-banner-link"
          style={getAdLinkBackgroundStyle(primaryAd)}
          onClick={() => handleClick(primaryAd)}
        >
          <AdContent advertisement={primaryAd} />
        </a>
      </div>
    );
  }

  return (
    <AdSlider
      advertisements={advertisements}
      onAdClick={handleClick}
      interval={sliderInterval}
      className={className}
      sectionCode={sectionCode}
    />
  );
};

// ---- MultipleAdBanner ----
interface MultipleAdBannerProps {
  pageId?: number;
  sectionId?: number;
  categoryId?: number | null;
  listingType?: string | null;
  region?: string | null;
  limit?: number;
  onAdClick?: ((ad: Advertisement) => void) | null;
  className?: string;
}

export const MultipleAdBanner: React.FC<MultipleAdBannerProps> = ({
  pageId = 1, sectionId = 3, categoryId = null, listingType = null, region = null, limit = 3, onAdClick = null, className = "",
}) => {
  const { advertisements, loading, error, isEmpty } = useAdBanner({ pageId, sectionId, categoryId, listingType, region, limit }) as AdBannerHookResult;
  if (loading) return <div className={`multiple-ad-banner-loading ${className}`} aria-busy="true" />;
  if (error || isEmpty || !advertisements || advertisements.length === 0) return null;

  return (
    <div className={`multiple-ad-banner ${className}`}>
      {advertisements.map((ad) => (
        <div key={ad.id} className="multiple-ad-banner-item">
          <div className="ad-banner-label">Reklam</div>
          <a href={ad.link} className="ad-banner-link" target="_blank" rel="noopener noreferrer" onClick={() => onAdClick && onAdClick(ad)} aria-label={ad.title}>
            <AdContent advertisement={ad} />
            {ad.title && <div className="ad-banner-title">{ad.title}</div>}
          </a>
        </div>
      ))}
    </div>
  );
};

export default AdBanner;
