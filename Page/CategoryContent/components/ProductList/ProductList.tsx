"use client";

import React, { useState, useEffect } from 'react';
import './ProductList.css';
import ProductCard from '@/components/ProductCard/ProductCard';
import Loader from '@/components/Loader/Loader';
import { useRouter } from 'next/navigation';
import urlService from '@/services/utils/urlService';
import BaseListingsService from '@/services/listings/base/baseListingsService';

interface Listing {
  ilan_id?: number;
  id?: number;
  [key: string]: unknown;
}

interface ProductListProps {
  categoryId?: number | string;
  categoryName?: string;
  onProductClick?: (listing: Listing) => void;
  onFavoriteToggle?: (id: number | string, isFavorite: boolean) => void;
}

const ProductList: React.FC<ProductListProps> = ({ categoryId, categoryName, onProductClick, onFavoriteToggle }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(15);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const listingsService = new (BaseListingsService as new () => { getListings: (params: Record<string, unknown>) => Promise<{ listings?: Listing[]; totalListings?: number } | Listing[] | null> })();

  useEffect(() => {
    // categoryId henüz hazır değil — loading göster, "ilan yok" deme
    if (!categoryId) {
      setLoading(true);
      return;
    }

    const fetchListings = async () => {
      try {
        setLoading(true);
        setError(null);
        setVisibleCount(15);
        setExpanded(false);

        const result = await listingsService.getListings({
          categoryId: Number(categoryId),
          page: 1,
          pageSize: 30,
          includeSubcategories: true,
        });

        if (result && !Array.isArray(result) && result.listings) {
          setListings(result.listings);
        } else if (result && Array.isArray(result)) {
          setListings(result);
        } else if (result === null) {
          setError('API\'ye bağlanılamadı.');
          setListings([]);
        } else {
          setError('İlanlar getirilirken bir hata oluştu.');
          setListings([]);
        }
      } catch (err) {
        const e = err as { isNetworkError?: boolean; status?: number; message?: string };
        let msg = 'İlanlar yüklenirken hata oluştu.';
        if (e.isNetworkError) msg = 'API\'ye bağlanılamadı.';
        else if (e.status === 404) msg = 'Bu kategoride henüz ilan yok.';
        else if (e.status === 500) msg = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
        else if (e.message) msg = e.message;
        setError(msg);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [categoryId]);

  const handleListingClick = (listing: Listing) => {
    try {
      const seoUrl = (urlService as { getIlanUrl: (l: Listing) => string }).getIlanUrl(listing);
      router.push(seoUrl);
    } catch {
      router.push(`/ilan/${listing.ilan_id || listing.id}`);
    }
  };

  const handleFavoriteToggle = (listingId: number | string, isFavorite: boolean) => {
    if (onFavoriteToggle) onFavoriteToggle(listingId, isFavorite);
  };

  const handleLoadMore = () => {
    if (expanded) {
      setVisibleCount(15);
      setExpanded(false);
    } else {
      setVisibleCount(listings.length);
      setExpanded(true);
    }
  };

  const visibleListings = listings.slice(0, visibleCount);
  const hasMoreListings = listings.length > 15;

  return (
    <div className="productlist-container productlist-container--vitrin-mobile">
      <div className="productlist-view-controls productlist-view-controls--vitrin">
        <h2 className="productlist-section-title">{categoryName || 'Kategori'} İlanları</h2>
      </div>

      {loading ? (
        <div className="productlist-loader-container">
          <Loader />
        </div>
      ) : error ? (
        <div className="productlist-error">
          <p>{error}</p>
        </div>
      ) : listings.length > 0 ? (
        <>
          <div className="productlist-grid productlist-grid-view">
            {visibleListings.map((listing, index) => (
              <ProductCard
                key={listing.ilan_id || listing.id || index}
                product={listing}
                onProductClick={() => handleListingClick(listing)}
                onFavoriteToggle={(id: number | string) => handleFavoriteToggle(id, false)}
                viewType="grid"
              />
            ))}
          </div>
          {hasMoreListings && (
            <div className="productlist-load-more">
              <button className="productlist-load-more-button" onClick={handleLoadMore}>
                {expanded ? (
                  <><span className="productlist-load-more-icon productlist-less-icon">▲</span> Daha Az Göster</>
                ) : (
                  <><span className="productlist-load-more-icon productlist-more-icon">▼</span> Daha Fazla İlan Göster</>
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="productlist-no-listings">
          <p>Bu kategoride henüz ilan bulunamadı.</p>
        </div>
      )}
    </div>
  );
};

export default ProductList;
