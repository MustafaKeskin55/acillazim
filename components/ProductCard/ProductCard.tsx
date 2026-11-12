"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import './ProductCard.css';
import { IoHeart, IoHeartOutline } from 'react-icons/io5';
import { FaMapMarkerAlt } from 'react-icons/fa';
import urlService from '@/services/utils/urlService';
import BaseListingsService, {
  type CategoryPath,
} from '@/services/listings/base/baseListingsService';
import {
  decodeHtmlEntities,
  formatListingLocation,
  getListingPrimaryImageUrl,
  LISTING_PLACEHOLDER_IMAGE,
} from '@/services/listings/util/listingUtils';
import favoriteService from '@/services/favorites/favoriteService';
import { showFavoriteNotification, showErrorNotification } from '@/utils/favoriteUtils';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { resolveListingPricing } from '@/lib/listingPricingResolver';

/**
 * Tarihi formatlar (1 Ocak 2024 formatında)
 */
const formatDateLocal = (date: string | Date | undefined | null): string => {
  if (!date) return '';

  try {
    let dateObj: Date;

    if (typeof date === 'string') {
      if (date.includes('T')) {
        dateObj = new Date(date);
      } else if (!isNaN(Number(date)) && date.length === 10) {
        dateObj = new Date(parseInt(date) * 1000);
      } else if (!isNaN(Number(date)) && date.length === 13) {
        dateObj = new Date(parseInt(date));
      } else {
        dateObj = new Date(date);
      }
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return '';
    }

    if (isNaN(dateObj.getTime())) return '';

    const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const gun = dateObj.getDate();
    const ay = aylar[dateObj.getMonth()];
    const yil = dateObj.getFullYear();

    return `${gun} ${ay} ${yil}`;
  } catch (error) {
    console.error('Tarih formatı hatası:', error);
    return '';
  }
};

interface ProductData {
  ilan_id?: string | number;
  id?: string | number;
  listingId?: string | number;
  listing_id?: string | number;
  title?: string;
  baslik?: string;
  price?: number;
  fiyat?: number;
  isFavorite?: boolean;
  category_id?: string | number;
  categoryName?: string;
  kategori?: string;
  categories?: string;
  date?: string;
  tarih?: string;
  created_at?: string;
  ilan_tarihi?: string;
  img?: string;
  image?: string;
  resimler?: string[];
  listingType?: string;
  ilan_turu?: string;
  kategoriYolu?: string[];
  [key: string]: unknown;
}

interface ProductCardProps {
  product: ProductData;
  viewType?: 'grid' | 'list';
  viewMode?: 'grid' | 'list' | string;
  onFavoriteToggle?: (id: string | number, isFavorite?: boolean) => void;
  onProductClick?: (id: string | number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, viewType = 'grid', viewMode, onFavoriteToggle, onProductClick }) => {
  const effectiveViewType = (viewMode || viewType) === 'list' ? 'list' : 'grid';
  const [categoryInfo, setCategoryInfo] = useState<CategoryPath | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const listingsService = new BaseListingsService();
  const { isAuthenticated } = useAuth();
  const { isFavorite: checkIsFavorite, setFavorite: setFavoriteInContext, openFavoriteModal } = useFavorites();
  const router = useRouter();

  const ilan_id = product?.ilan_id || product?.id || product?.listingId || product?.listing_id;
  const rawTitle = product?.title || product?.baslik || 'İlan Başlığı';
  const title = decodeHtmlEntities(rawTitle as string);
  const price = product?.price || product?.fiyat || 0;

  useEffect(() => {
    if (!ilan_id) {
      console.warn('⚠️ ProductCard: İlan ID bulunamadı!', { product });
    }
  }, [ilan_id]);

  useEffect(() => {
    const loadCategoryInfo = async () => {
      if (!product?.category_id) return;
      try {
        const info = await listingsService.getCategoryPath(product.category_id);
        setCategoryInfo(info);
      } catch (error) {
        console.error('Kategori bilgisi yüklenemedi:', error);
      }
    };
    loadCategoryInfo();
  }, [product?.category_id]);

  // Favori durumu artık kart başına ayrı bir API isteğiyle değil, uygulama
  // genelinde tek seferde yüklenen FavoritesContext'ten okunuyor (N+1 istek sorunu giderildi).
  const isFavorite = checkIsFavorite(ilan_id);

  const kategoriYoluResolved = useMemo(() => {
    if (!product) return undefined;
    const existing = product.kategoriYolu;
    if (existing && existing.length > 0) return existing;
    const cid = product.category_id;
    if (!cid) return undefined;
    try {
      const categoryPath = urlService.getCategoryPathById(cid);
      return categoryPath && categoryPath.length > 0 ? categoryPath : undefined;
    } catch (err) {
      console.error('Kategori yolu oluşturma hatası:', err);
      return undefined;
    }
  }, [product]);

  const seoUrl = useMemo(() => {
    if (!product) return '';
    const forUrl =
      kategoriYoluResolved && (!product.kategoriYolu || product.kategoriYolu.length === 0)
        ? { ...product, kategoriYolu: kategoriYoluResolved }
        : product;
    return urlService.getIlanUrl(forUrl);
  }, [product, kategoriYoluResolved]);

  if (!product) return null;
  if (!ilan_id || !title || title.trim().length === 0) return null;

  const category =
    categoryInfo?.mainCategory?.name ||
    product.categoryName ||
    (product as Record<string, unknown>).category_name ||
    (product as Record<string, unknown>).category ||
    product.kategori ||
    product.categories ||
    'Diğer';

  const location = formatListingLocation(product);
  const locationParts = location.split(', ');
  let il = locationParts[0] || '';
  const ilce = locationParts.length > 1 ? locationParts[1] : '';

  const normalizedIl = il.toLocaleLowerCase('tr-TR').trim();
  if (normalizedIl.startsWith('istanbul')) il = 'İstanbul';

  const listingDate = product.date || product.tarih || product.created_at || product.ilan_tarihi || '';
  const formattedDate = formatDateLocal(listingDate as string);

  const image =
    getListingPrimaryImageUrl(product as Record<string, unknown>) || LISTING_PLACEHOLDER_IMAGE;
  const listingType = product.listingType || (product.ilan_turu as string)?.toLowerCase() || 'normal';

  const pricing = useMemo(() => {
    const forPricing =
      kategoriYoluResolved && (!product.kategoriYolu || product.kategoriYolu.length === 0)
        ? { ...product, kategoriYolu: kategoriYoluResolved }
        : product;
    return resolveListingPricing(
      forPricing as Record<string, unknown>,
      categoryInfo?.mainCategory ? [categoryInfo.mainCategory] : null
    );
  }, [product, kategoriYoluResolved, categoryInfo]);

  const handleFavoriteToggle = async (e: React.SyntheticEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Giriş kontrolü: Giriş yapmadan favorileme yapılamaz
    if (!isAuthenticated) {
      showErrorNotification('Giriş Gerekli', new Error('Favorilere eklemek için lütfen giriş yapın.'));
      const currentUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
      router.push(currentUrl ? `/giris?redirect_after=${encodeURIComponent(currentUrl)}` : '/giris');
      return;
    }

    if (!ilan_id) {
      showErrorNotification('Favori işlemi', new Error('İlan ID bulunamadı'));
      return;
    }

    if (isFavorite) {
      // 1. Zaten favorilerde ise: Kaldır
      setFavoriteInContext(ilan_id, false);
      showFavoriteNotification(false, title);
      window.dispatchEvent(
        new CustomEvent('acillazim-favorite-update', {
          detail: { listingId: ilan_id, isFavorite: false }
        })
      );
      try {
        onFavoriteToggle?.(ilan_id, false);
      } catch (cbErr) {
        console.warn('[ProductCard] onFavoriteToggle callback error:', cbErr);
      }
      try {
        await favoriteService.removeFromFavorites(ilan_id);
      } catch (error) {
        console.warn(`[ProductCard] Favori servis senkronizasyon uyarısı:`, error);
      }
    } else {
      // 2. Favorilere eklenecekse: Hangi listeye ekleneceğini sor (Modal Aç)
      if (typeof openFavoriteModal === 'function') {
        openFavoriteModal(ilan_id, product);
      } else {
        window.dispatchEvent(
          new CustomEvent('acillazim-open-favorite-modal', {
            detail: { listingId: ilan_id, listingData: product }
          })
        );
      }
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.prodcard-favorite-button') ||
      target.closest('.prodcard-actions') ||
      target.closest('.prodcard-favorite-container-list')
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const renderBadges = () => {
    if (!listingType) return <div className="prodcard-badges"></div>;
    const type = listingType.toLowerCase();
    return (
      <div className="prodcard-badges">
        {(type.includes('acil') || type === 'apacil') && (
          <span className="prodcard-badge prodcard-badge-urgent">Apacil İlan</span>
        )}
        {type.includes('yeni') && (
          <span className="prodcard-badge prodcard-badge-new">Yeni İlan</span>
        )}
        {type.includes('jet') && (
          <span className="prodcard-badge prodcard-badge-featured">Jet İlan</span>
        )}
      </div>
    );
  };

  // Liste görünümü
  if (effectiveViewType === 'list') {
    return (
      <div className="prodcard-wrapper prodcard-wrapper-list">
        <a
          ref={linkRef}
          href={seoUrl}
          className="prodcard-container prodcard-container-list"
          onClick={handleCardClick}
        >
          <div className="prodcard-image-container prodcard-image-container-list">
            <img
              src={image as string}
              className="prodcard-image"
              alt={title}
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                if (t.dataset.listingImgFallback === '1') return;
                t.dataset.listingImgFallback = '1';
                t.onerror = null;
                t.src = LISTING_PLACEHOLDER_IMAGE;
              }}
            />
          </div>

          <div className="prodcard-title-column">
            <h3 className="prodcard-title prodcard-title-list">{title}</h3>
          </div>

          <div className="prodcard-info-column">
            <div className="prodcard-list-price-loc-row">
              {pricing.type === 'service' ? (
                <div className="prodcard-info-item prodcard-price-list prodcard-price-list--service">
                  <span className="prodcard-service-badge prodcard-service-badge--list">{pricing.actionText || 'Teklif Alın'}</span>
                </div>
              ) : pricing.hasPrice ? (
                <div className="prodcard-info-item prodcard-price-list">
                  <span>
                    {pricing.formattedPrice} {pricing.currencySymbol}
                    {pricing.periodLabel && (
                      <small className="prodcard-price-period-list"> {pricing.periodLabel}</small>
                    )}
                  </span>
                </div>
              ) : null}
              <div className="prodcard-info-item prodcard-location-list">
                <span className="location-inline">{il}{ilce ? ` · ${ilce}` : ''}</span>
              </div>
            </div>
            <div className="prodcard-info-item prodcard-date-list">
              <span className="date-single">{formattedDate}</span>
            </div>
          </div>

          <div className="prodcard-favorite-container-list">
            <span
              role="button"
              tabIndex={0}
              aria-label={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
              className="prodcard-favorite-button"
              onClick={handleFavoriteToggle}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleFavoriteToggle(e);
                }
              }}
            >
              {isFavorite ? <IoHeart className="prodcard-favorite-icon active" /> : <IoHeartOutline className="prodcard-favorite-icon" />}
            </span>
          </div>
        </a>
        {renderBadges()}
      </div>
    );
  }

  // Grid görünümü (varsayılan)
  return (
    <div className="prodcard-wrapper">
      <a
        ref={linkRef}
        href={seoUrl}
        className="prodcard-container"
        onClick={handleCardClick}
      >
        <div className="prodcard-image-container">
          <img
            src={image as string}
            className="prodcard-image"
            alt={title}
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              if (t.dataset.listingImgFallback === '1') return;
              t.dataset.listingImgFallback = '1';
              t.onerror = null;
              t.src = LISTING_PLACEHOLDER_IMAGE;
            }}
          />
        </div>

        <div className="prodcard-content">
          <div className="prodcard-category">{category as string}</div>
          <h3 className="prodcard-title">{title}</h3>

          <div className="prodcard-location">
            <FaMapMarkerAlt className="prodcard-location-icon" />
            <span>{il}{ilce ? `, ${ilce}` : ''}</span>
          </div>

          <div className="prodcard-footer">
            {pricing.type === 'service' ? (
              <div className="prodcard-service-cta">
                <span className="prodcard-service-badge">{pricing.actionText || 'Teklif Alın'}</span>
              </div>
            ) : pricing.hasPrice ? (
              <div className="prodcard-price-container">
                <span className="prodcard-price">
                  {pricing.formattedPrice} {pricing.currencySymbol}
                  {pricing.periodLabel && (
                    <span className="prodcard-price-period">{pricing.periodLabel}</span>
                  )}
                </span>
                {pricing.isNegotiable && (
                  <span className="prodcard-price-negotiable">Pazarlıklı</span>
                )}
              </div>
            ) : (
              <div className="prodcard-price-container prodcard-price-container--empty" />
            )}
            <div className="prodcard-actions">
              <span
                role="button"
                tabIndex={0}
                aria-label={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
                className="prodcard-favorite-button"
                onClick={handleFavoriteToggle}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFavoriteToggle(e);
                  }
                }}
              >
                {isFavorite ? <IoHeart className="prodcard-favorite-icon active" /> : <IoHeartOutline className="prodcard-favorite-icon" />}
              </span>
            </div>
          </div>
        </div>
      </a>
      {renderBadges()}
    </div>
  );
};

export default ProductCard;
