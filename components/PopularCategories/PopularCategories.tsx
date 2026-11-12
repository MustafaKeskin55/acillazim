"use client";

import React, { useState, useEffect, useLayoutEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import './PopularCategories.css';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import categoryService from '@/services/category/categoryService';
import CategoryUtils from '@/services/category/CategoryUtils';
import categoryApi from '@/api/categoryApi';
import { USE_API } from '@/api/config';
import popularCategoriesData from '@/data/popularCategories.json';

interface Category {
  id: number | string;
  category_id?: number | string;
  name: string;
  parent_id?: number | null;
  img_url?: string;
  imageUrl?: string;
  position?: string;
  slug?: string;
  webUrl?: string;
  hasCustomPage?: boolean;
  type?: string;
}

interface PopularCategoriesProps {
  mode?: 'slider' | 'grid';
  title?: string;
}

const GRID_PAGE_DESKTOP = 8;
const GRID_PAGE_MOBILE = 4;
const GRID_MOBILE_AUTOPLAY_MS = 5200;
const MOBILE_MEDIA_GRID = '(max-width: 768px)';

const PopularCategories = memo(({ mode = 'slider', title = 'En Çok Tercih Edilen Hizmetler' }: PopularCategoriesProps) => {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | string | null>(null);

  const [activePage, setActivePage] = useState<number>(0);
  const [isGridMobile, setIsGridMobile] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || mode !== 'grid') return;
    const mq = window.matchMedia(MOBILE_MEDIA_GRID);
    const apply = () => setIsGridMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  const gridPageSize = mode === 'grid' && isGridMobile ? GRID_PAGE_MOBILE : GRID_PAGE_DESKTOP;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);

        if (!USE_API) {
          // Mock mod: popularCategories.json'dan direkt oku
          const data = popularCategoriesData as Record<string, unknown>[];
          if (mode === 'slider') {
            setCategories(
              data
                .filter((cat) => cat.parent_id === null)
                .map((cat) => ({
                  id: cat.id as number,
                  name: cat.label as string,
                  parent_id: cat.parent_id as number | null,
                  img_url: cat.img_url as string,
                  position: cat.position as string,
                }))
            );
          } else {
            setCategories(
              data
                .filter((cat) => cat.parent_id === 12540)
                .map((cat) => ({
                  id: cat.id as number,
                  category_id: cat.id as number,
                  name: cat.label as string,
                  parent_id: cat.parent_id as number,
                  imageUrl: cat.img_url as string,
                  position: cat.position as string,
                  slug: CategoryUtils.slugify(String(cat.label ?? '')),
                }))
            );
          }
        } else {
          // API mod: categoryService üzerinden
          if (mode === 'slider') {
            const mainCategories = await categoryService.getMainCategories();
            setCategories(mainCategories.map((cat) => ({
              id: cat.category_id,
              name: cat.label,
              parent_id: cat.parent_id,
              img_url: cat.img_url,
              position: cat.position as string | undefined,
            })));
          } else {
            const popularCategories = await categoryService.getPopularServiceCategories();
            setCategories(
              popularCategories.map((cat) => ({
                id: cat.id,
                category_id: cat.category_id ?? cat.id,
                name: cat.name,
                parent_id: cat.parent_id,
                imageUrl: cat.imageUrl || undefined,
                position: cat.position,
                slug: cat.slug,
                webUrl: typeof cat.webUrl === 'string' ? cat.webUrl : undefined,
                hasCustomPage: cat.hasCustomPage === true,
                type: typeof cat.type === 'string' ? cat.type : undefined,
              }))
            );
          }
        }

        setError(null);
      } catch (err) {
        console.error(`❌ [Popular Categories - ${mode}] Kategoriler yüklenirken hata:`, err);
        setError('Kategoriler yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [mode]);

  const totalGridPages = Math.max(1, Math.ceil(categories.length / gridPageSize));

  useEffect(() => {
    if (mode !== 'grid') return;
    setActivePage((p) => Math.min(p, totalGridPages - 1));
  }, [mode, totalGridPages, gridPageSize]);

  useEffect(() => {
    if (mode !== 'grid' || !isGridMobile || totalGridPages <= 1) return;
    const id = window.setInterval(() => {
      setActivePage((p) => (p + 1) % totalGridPages);
    }, GRID_MOBILE_AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [mode, isGridMobile, totalGridPages, categories.length]);

  /** Ustalar-ve-Hizmetler grid: mobil kategori ilerlemesi = Sidebar / ServiceSidebar ile aynı (slug, filtre, özel sayfa). */
  const navigateServiceCategoryLikeSidebar = async (category: Category) => {
    const categoryId = category.category_id ?? category.id;
    const slug = category.slug || CategoryUtils.slugify(category.name);
    const webUrl = category.webUrl;
    const hasCustomPage = category.hasCustomPage === true;

    if (webUrl && webUrl.includes('/filtrele')) {
      router.push(webUrl);
      return;
    }
    if (hasCustomPage && webUrl) {
      router.push(webUrl);
      return;
    }

    try {
      const cat = { category_id: categoryId, type: category.type, name: category.name, slug };
      const hasSubcats = (categoryService as { hasSubCategories: (c: unknown) => boolean }).hasSubCategories(cat);
      if (!hasSubcats) {
        router.push(`/filtrele/${slug}`);
        return;
      }
    } catch {
      /* devam */
    }

    try {
      await categoryApi.initialize();
      await categoryApi.getCategoryById(categoryId);
    } catch {
      /* yine de kategori sayfasına git */
    }
    router.push(`/kategoriler/${slug}`);
  };

  const handleCategoryClick = (categoryId: number | string) => {
    setActiveCategory(categoryId);
  };

  const handleGridCategoryActivate = (category: Category) => {
    setActiveCategory(category.id);
    void navigateServiceCategoryLikeSidebar(category);
  };

  const settings = {
    dots: false,
    infinite: true,
    slidesToShow: 6,
    slidesToScroll: 1,
    autoplay: true,
    speed: 2000,
    autoplaySpeed: 2000,
    cssEase: "linear",
    draggable: true,
    swipeToSlide: true,
    focusOnSelect: false,
    accessibility: false,
    responsive: [
      { breakpoint: 1300, settings: { slidesToShow: 5, slidesToScroll: 1 } },
      { breakpoint: 1154, settings: { slidesToShow: 4, slidesToScroll: 1 } },
      { breakpoint: 909,  settings: { slidesToShow: 3, slidesToScroll: 1 } },
      { breakpoint: 600,  settings: { slidesToShow: 2, slidesToScroll: 1 } },
      { breakpoint: 480,  settings: { slidesToShow: 2, slidesToScroll: 1 } },
    ],
  };

  const totalPages = totalGridPages;
  const hasMultiplePages = totalPages > 1;
  const safePage = Math.min(activePage, totalPages - 1);
  const currentCategories = categories.slice(
    safePage * gridPageSize,
    (safePage + 1) * gridPageSize,
  );

  // Yükleniyor durumu
  if (loading) {
    if (mode === 'grid') {
      return (
        <div className="popular-categories-section">
          <h2 className="section-title">{title}</h2>
          <div className="popular-categories-loading">
            <div className="loading-spinner"></div>
            <p>Kategoriler yükleniyor...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="category-wrapper">
        <div className="category-loading">Kategoriler yükleniyor...</div>
      </div>
    );
  }

  // Hata durumu
  if (error) {
    if (mode === 'grid') {
      return (
        <div className="popular-categories-section">
          <h2 className="section-title">{title}</h2>
          <div className="popular-categories-error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Yeniden Dene</button>
          </div>
        </div>
      );
    }
    return (
      <div className="category-wrapper">
        <div className="category-error">{error}</div>
      </div>
    );
  }

  // Grid modu
  if (mode === 'grid') {
    return (
      <div className="popular-categories-section">
        <h2 className="section-title">{title}</h2>
        <div className="popular-categories-grid-wrap" key={safePage}>
          <div className={`popular-categories-grid${isGridMobile ? ' popular-categories-grid--mobile-2x2' : ''}`}>
            {currentCategories.map((category) => (
              <div
                key={category.id}
                className="category-card"
                onClick={() => handleGridCategoryActivate(category)}
              >
                <div
                  className="category-card-background"
                  style={{
                    backgroundImage: `url(${category.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: category.position || 'center',
                  }}
                />
                <div className="category-card-overlay">
                  <div className="category-card-name">{category.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {hasMultiplePages && (
          <div className="pagination-controls">
            <button
              type="button"
              className="page-arrow page-arrow-left"
              onClick={() => setActivePage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              aria-label="Önceki sayfa"
            >
              <i className="fa fa-chevron-left"></i>
            </button>
            <div className="page-indicators">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  type="button"
                  key={index}
                  className={`page-indicator ${safePage === index ? 'active' : ''}`}
                  onClick={() => setActivePage(index)}
                  aria-label={`Sayfa ${index + 1}`}
                  aria-current={safePage === index ? 'true' : undefined}
                />
              ))}
            </div>
            <button
              type="button"
              className="page-arrow page-arrow-right"
              onClick={() => setActivePage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage === totalPages - 1}
              aria-label="Sonraki sayfa"
            >
              <i className="fa fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Slider modu
  return (
    <div className="category-wrapper">
      <div className="category-container">
        <Slider {...settings}>
          {categories.map((category) => (
            <div key={category.id} className="category-button-container">
              <button
                className={`category-button ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(category.id)}
              >
                {category.name}
              </button>
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
});

PopularCategories.displayName = 'PopularCategories';
export default PopularCategories;
