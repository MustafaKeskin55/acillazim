"use client";

import React, { useState, useEffect, useCallback } from "react";
import "./ServiceSidebar.css";
import ServiceSidebarOption from "./ServiceSidebarOption/ServiceSidebarOption";
import categoryService from "@/services/category/categoryService";

interface ServiceCategory {
  id: string | number;
  category_id?: string | number;
  name: string;
  icon: string;
  bgColor: string;
  slug: string;
  webUrl?: string | null;
  hasCustomPage: boolean;
  type?: string;
}

function ServiceSidebar() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Ekran boyutu kontrolü
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 880);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadServiceCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const categories = await categoryService.getServiceCategories();

      if (Array.isArray(categories) && categories.length > 0) {
        const normalizedCategories: ServiceCategory[] = categories.map((category: Record<string, unknown>, index: number) => {
          const categoryName = (category.label || category.name || "İsimsiz Kategori") as string;
          return {
            id: (category.id || category.category_id || index + 1) as string | number,
            category_id: (category.category_id || category.id) as string | number | undefined,
            name: categoryName,
            icon: (category.icon || "fa-cog") as string,
            bgColor: (category.bgColor || "#cccccc") as string,
            slug: (category.slug ||
              categoryName.toLowerCase().replace(/\s+/g, "-").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
            ) as string,
            webUrl: (category.webUrl || null) as string | null,
            hasCustomPage: (category.hasCustomPage || false) as boolean,
            type: category.type as string | undefined,
          };
        });

        setServiceCategories(normalizedCategories);
        setError(null);
      } else {
        setServiceCategories([]);
        setError("Henüz hizmet kategorisi bulunmuyor.");
      }
    } catch (err) {
      console.error("❌ [ServiceSidebar] Hizmet kategorileri yüklenirken hata:", err);
      setError("Hizmet kategorileri yüklenemedi. Lütfen daha sonra tekrar deneyin.");
      setServiceCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadServiceCategories(); }, [loadServiceCategories]);

  return (
    <div className={`service-sidebar ${isOpen ? "open" : "closed"}`}>
      {/* Mobil için sidebar toggle butonu */}
      {isMobile && (
        <div className="toggle-button" onClick={() => setIsOpen(!isOpen)}>
          <i className={`fas ${isOpen ? "fa-times" : "fa-bars"}`}></i>
        </div>
      )}

      {loading && (
        <div className="sidebar-loading">
          <p>Kategoriler yükleniyor...</p>
        </div>
      )}

      {error && (
        <div className="sidebar-error">
          <p>{error}</p>
          <button onClick={loadServiceCategories}>Tekrar Dene</button>
        </div>
      )}

      {!loading && !error && serviceCategories.length > 0 && (
        <div className="sidebar-categories">
          {serviceCategories.map((category) => (
            <ServiceSidebarOption
              key={category.id || category.category_id}
              id={category.id || category.category_id}
              category_id={category.category_id}
              name={category.name}
              icon={category.icon}
              bgColor={category.bgColor}
              slug={category.slug}
              webUrl={category.webUrl}
              hasCustomPage={category.hasCustomPage}
              type={category.type}
            />
          ))}
        </div>
      )}

      {!loading && !error && serviceCategories.length === 0 && (
        <div className="sidebar-empty">
          <p>Kategori bulunamadı.</p>
        </div>
      )}
    </div>
  );
}

export default ServiceSidebar;
