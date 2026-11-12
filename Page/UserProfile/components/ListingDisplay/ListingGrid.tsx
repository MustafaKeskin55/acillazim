"use client";

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import './ListingGrid.css';

// Mevcut ürün kartı bileşenini içe aktar
import ProductCard from '@/components/ProductCard/ProductCard';
import BaseListingsService from '@/services/listings/base/baseListingsService';

/**
 * İlanları grid görünümünde sergileyen bileşen
 * @param {Array} listings - İlanlar dizisi
 * @param {boolean} isLoading - Yükleme durumu
 * @param {boolean} isEmpty - Veri yok durumu
 * @param {string} errorMessage - Hata mesajı (varsa)
 */
const ListingGrid = ({ listings, isLoading, isEmpty, errorMessage }) => {
  const [enrichedListings, setEnrichedListings] = useState([]);
  const listingsService = new BaseListingsService();

  // İlanları kategori bilgileriyle zenginleştir
  useEffect(() => {
    const enrichListings = async () => {
      if (!listings || listings.length === 0) {
        setEnrichedListings([]);
        return;
      }

      try {
        const enriched = await Promise.all(
          listings.map(async (listing) => {
            if (!listing.category_id) return listing;

            try {
              const categoryInfo = await listingsService.getCategoryPath(listing.category_id);
              return {
                ...listing,
                kategori: categoryInfo.mainCategory.name,
                categories: categoryInfo.mainCategory.name,
                kategoriYolu: categoryInfo.fullCategoryPath.split(' > '),
                alt_kategori: categoryInfo.subCategory.name,
                subcategory: categoryInfo.subCategory.name
              };
            } catch (error) {
              console.error('Kategori bilgisi yüklenemedi:', error);
              return listing;
            }
          })
        );

        setEnrichedListings(enriched);
      } catch (error) {
        console.error('İlanlar zenginleştirilemedi:', error);
        setEnrichedListings(listings);
      }
    };

    enrichListings();
  }, [listings]);

  // Yükleniyor durumu
  if (isLoading) {
    return (
      <div className="listings-grid">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="listing-card-skeleton">
            <div className="listing-image-skeleton"></div>
            <div className="listing-content-skeleton">
              <div className="listing-title-skeleton"></div>
              <div className="listing-price-skeleton"></div>
              <div className="listing-meta-skeleton"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Hata durumu
  if (errorMessage) {
    return (
      <div className="listings-error">
        <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
        <h3>Bir hata oluştu</h3>
        <p>{errorMessage}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Tekrar Dene
        </button>
      </div>
    );
  }

  // Veri yok durumu
  if (isEmpty || !enrichedListings || enrichedListings.length === 0) {
    return (
      <div className="listings-empty">
        <FontAwesomeIcon icon={faInfoCircle} className="info-icon" />
        <h3>İlan Bulunamadı</h3>
        <p>Bu kriterlere uygun ilan bulunmamaktadır.</p>
      </div>
    );
  }

  // İlanları grid olarak göster
  return (
    <div className="listings-grid">
      {enrichedListings.map((listing) => (
        <div key={listing.id || listing.listing_id} className="listing-card-wrapper">
          <ProductCard
            product={listing}
            onFavoriteToggle={() => {}}
            onProductClick={() => {}}
          />
        </div>
      ))}
    </div>
  );
};

export default ListingGrid; 