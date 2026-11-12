"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import "./ServiceSidebarOption.css";
import categoryService from "@/services/category/categoryService";
import categoryApi from "@/api/categoryApi";

interface ServiceSidebarOptionProps {
  id?: number | string;
  category_id?: number | string;
  name: string;
  icon?: string;
  bgColor?: string;
  slug?: string;
  webUrl?: string;
  hasCustomPage?: boolean;
  type?: string;
}

function ServiceSidebarOption({ id, category_id, name, icon, bgColor, slug, webUrl, hasCustomPage, type }: ServiceSidebarOptionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const formatCategoryForUrl = useCallback((categoryName: string) => {
    if (slug) return slug;
    return categoryName
      .replace(/&/g, '-')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .toLowerCase();
  }, [slug]);

  useEffect(() => {
    const categorySlug = formatCategoryForUrl(name);
    const isThisCategoryActive = pathname.includes(`/kategoriler/${categorySlug}`);
    setIsActive(isThisCategoryActive);
  }, [pathname, name, formatCategoryForUrl]);

  const handleCategoryClick = async () => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      const categoryId = category_id || id;
      const categorySlug = slug || formatCategoryForUrl(name);

      console.log(`Hizmet kategorisi tıklandı: ${name} (ID: ${categoryId})`, { webUrl, hasCustomPage });

      if (webUrl && webUrl.includes('/filtrele')) {
        console.log(`🎯 Filtre URL'si tespit edildi, direkt filtreye yönlendiriliyor: ${webUrl}`);
        router.push(webUrl);
        return;
      }

      if (hasCustomPage === true && webUrl) {
        console.log(`🎯 Özel sayfaya yönlendiriliyor: ${webUrl}`);
        router.push(webUrl);
        return;
      }

      try {
        const category = { category_id: categoryId, type, name, slug };
        const hasSubcats = (categoryService as { hasSubCategories: (cat: unknown) => boolean }).hasSubCategories(category);
        console.log(`📊 [ServiceSidebarOption] Alt kategori kontrolü: ${hasSubcats ? 'Var' : 'Yok'}`);

        if (!hasSubcats) {
          console.log(`🎯 ${name} kategorisinin alt kategorisi YOK, filtreleme sayfasına yönlendiriliyor`);
          router.push(`/filtrele/${categorySlug}`);
          return;
        }
      } catch (subcatError) {
        console.warn('Alt kategori kontrolü hatası:', subcatError);
      }

      try {
        await (categoryApi as { initialize: () => Promise<void> }).initialize();
        const categoryResponse = await (categoryApi as { getCategoryById: (id: unknown) => Promise<{ success: boolean }> }).getCategoryById(categoryId);

        if (!categoryResponse.success) {
          console.error('Hizmet kategori bilgisi alınamadı:', categoryId);
        }

        router.push(`/kategoriler/${categorySlug}`);
      } catch (error) {
        console.error('Hizmet kategorisi yönlendirme hatası:', error);
        router.push(`/kategoriler/${categorySlug}`);
      }
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <div className="service-sidebar-options">
      <div className="service-sidebar-option">
        <p className="service-category-text">
          <span
            className={`service-sidebar-option-link ${isActive ? 'active' : ''}`}
            onClick={handleCategoryClick}
            style={{
              textDecoration: "none",
              color: isActive ? "#001a33" : "#003466",
              cursor: isNavigating ? "wait" : "pointer",
              pointerEvents: isNavigating ? "none" : "auto"
            }}
          >
            {name}
          </span>
        </p>
      </div>
    </div>
  );
}

export default ServiceSidebarOption;
