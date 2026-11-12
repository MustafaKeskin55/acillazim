/**
 * Reklam Banner Hook'u - TypeScript Versiyonu
 * React bileşenlerinin reklam verilerine erişimini kolaylaştırır
 *
 * Not: Mock JSON (`data/advertisementBanners.json`) kaldırıldı — reklamlar artık
 * her zaman canlı BE'den (`adService` → `/api/v1/advertisements/context`,
 * kategori sayfası için `categoryAdService` → `/api/v1/advertisements/category/{id}/all-sections`)
 * getirilir. `filterSecureAds` (URL/medya güvenlik doğrulaması) savunma derinliği
 * için istemci tarafında da korunuyor.
 */

import { useState, useEffect } from "react";
import { getAdvertisements } from "@/services/advertisement/adService";
import { filterSecureAds } from "@/services/advertisement/adFilterEngine";
import categoryAdService from "@/services/advertisement/categoryAdService";

// ---- Types ----
interface AdBannerRaw {
  id: string | number;
  title: string;
  link: string;
  src: string;
  mediaType: string;
  page: string;
  section_code: string;
  isActive: boolean;
  categoryId?: number | null;
  listingType?: string | null;
  regions: string[];
  [key: string]: unknown;
}

interface UseAdBannerParams {
  pageId?: number;
  sectionId?: number;
  sectionCode?: string | null;
  categoryId?: number | string | null;
  listingType?: string | null;
  region?: string | null;
  limit?: number;
  showSlider?: boolean;
}

interface UseAdBannerResult {
  advertisement: AdBannerRaw | null;
  advertisements: AdBannerRaw[];
  loading: boolean;
  error: Error | null;
  isEmpty: boolean;
}

const getUserLoginStatus = (): boolean => {
  try {
    const user = localStorage.getItem("user");
    return !!user;
  } catch {
    return false;
  }
};

const useAdBanner = ({
  pageId = 1,
  sectionId: sectionIdProp = 1,
  sectionCode = null,
  categoryId = null,
  listingType = null,
  region = null,
  limit = 20,
  showSlider = true,
}: UseAdBannerParams): UseAdBannerResult => {
  const [advertisement, setAdvertisement] = useState<AdBannerRaw | null>(null);
  const [advertisements, setAdvertisements] = useState<AdBannerRaw[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  let sectionId = sectionIdProp;
  if (sectionCode) {
    const code = sectionCode.toUpperCase().replace(/İ/g, "I");
    if (["AB1", "KB1", "B1", "DB1", "ID1"].includes(code)) sectionId = 1;
    else if (["AS1", "SA1", "KS1", "S1", "SB1", "DS1", "HI1"].includes(code)) sectionId = 2;
    else if (["AS2", "SC1"].includes(code)) sectionId = 3;
    else if (["PF1"].includes(code)) {
      pageId = 4;
      sectionId = 4;
    }
  }
  if (pageId === 5) pageId = 4;

  useEffect(() => {
    let isMounted = true;

    const fetchAdvertisements = async () => {
      setLoading(true);
      setError(null);

      try {
        const isUserLoggedIn = getUserLoginStatus();
        const numericCategoryId =
          categoryId !== null && categoryId !== undefined ? Number(categoryId) : null;
        const effectiveLimit = showSlider ? limit : 1;

        let ads: AdBannerRaw[] = [];

        if ((sectionCode === "KB1" || sectionCode === "B1") && numericCategoryId !== null) {
          // Kategori sayfası banner alanı — canlı BE (categoryAdService)
          const response = await categoryAdService.getCategoryBanner(numericCategoryId);
          ads = response.data ? [response.data as AdBannerRaw] : [];
        } else if ((sectionCode === "KS1" || sectionCode === "S1" || sectionCode === "SB1") && numericCategoryId !== null) {
          // Kategori sayfası sidebar alanı — canlı BE (categoryAdService)
          const response = await categoryAdService.getCategorySidebar(numericCategoryId);
          ads = response.data ? [response.data as AdBannerRaw] : [];
        } else {
          // Genel bağlamsal reklamlar (anasayfa, ilan detay, profil vb.) — canlı BE (/api/v1/advertisements/context)
          ads = (await getAdvertisements({
            pageId,
            sectionId,
            categoryId: numericCategoryId,
            listingType,
            region,
            isUserLoggedIn,
            limit: effectiveLimit,
          })) as AdBannerRaw[];
        }

        // Savunma derinliği: BE'den gelen reklamları da URL/medya güvenlik kontrolünden geçir
        const secureAds = filterSecureAds(ads) as AdBannerRaw[];

        if (!isMounted) return;

        setAdvertisements(secureAds);
        setAdvertisement(secureAds[0] ?? null);
        setIsEmpty(secureAds.length === 0);
      } catch (err) {
        if (!isMounted) return;
        console.error("[useAdBanner] Reklam yükleme hatası:", err);
        setError(err as Error);
        setAdvertisements([]);
        setAdvertisement(null);
        setIsEmpty(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAdvertisements();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, sectionId, sectionCode, categoryId, listingType, region, limit, showSlider]);

  return { advertisement, advertisements, loading, error, isEmpty };
};

// ---- Yardımcı Hook'lar ----
const usePageAwareBanner = (sectionId: number, categoryId: number | null, listingType: string | null, limit = 1) => {
  const detectCurrentPage = (): number => {
    if (typeof window === "undefined") return 4;
    const path = window.location.pathname;
    if (path.includes("/kategori/")) return 1;
    if (path === "/" || path === "/index.html") return 2;
    if (path.includes("/ilan/")) return 3;
    return 4;
  };
  return useAdBanner({ pageId: detectCurrentPage(), sectionId, categoryId, listingType, limit });
};

const useCategoryAdBanner = (categoryId: number | null, sectionId: number, limit = 1) =>
  useAdBanner({ pageId: 1, sectionId, categoryId, limit });

(useAdBanner as unknown as Record<string, unknown>).usePageAwareBanner = usePageAwareBanner;
(useAdBanner as unknown as Record<string, unknown>).useCategoryAdBanner = useCategoryAdBanner;

export default useAdBanner;
