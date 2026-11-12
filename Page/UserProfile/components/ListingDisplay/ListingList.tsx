"use client";

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import './ListingList.css';

// Mevcut ürün kartı bileşenini içe aktar
import ProductCard from '@/components/ProductCard/ProductCard';
import BaseListingsService from '@/services/listings/base/baseListingsService';

/**
 * İlanları liste görünümünde sergileyen bileşen
 * @param {Array} listings - İlanlar dizisi
 * @param {boolean} isLoading - Yükleme durumu
 * @param {boolean} isEmpty - Veri yok durumu
 * @param {string} errorMessage - Hata mesajı (varsa)
 */
const ListingList = ({ listings, isLoading, isEmpty, errorMessage }) => {
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
      <div className="listings-list">
        <div className="listings-list-header">
          <div className="list-header-image">Görsel</div>
          <div className="list-header-title">İlan Başlığı</div>
          <div className="list-header-price">Fiyat</div>
          <div className="list-header-date">Tarih</div>
          <div className="list-header-location">Konum</div>
          <div className="list-header-action"></div>
        </div>
        
        {[...Array(5)].map((_, index) => (
          <div key={index} className="listing-list-item-skeleton">
            <div className="list-image-skeleton"></div>
            <div className="list-content-skeleton">
              <div className="list-title-skeleton"></div>
              <div className="list-meta-skeleton"></div>
            </div>
            <div className="list-price-skeleton"></div>
            <div className="list-date-skeleton"></div>
            <div className="list-location-skeleton"></div>
            <div className="list-action-skeleton"></div>
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

  // İlanları liste olarak göster
  return (
    <div className="listings-list">
      <div className="listings-list-header">
        <div className="list-header-image">Görsel</div>
        <div className="list-header-title">İlan Başlığı</div>
        <div className="list-header-price">Fiyat</div>
        <div className="list-header-date">Tarih</div>
        <div className="list-header-location">Konum</div>
        <div className="list-header-action"></div>
      </div>
      
      {enrichedListings.map((listing) => (
        <div key={listing.id || listing.listing_id} className="listing-list-item">
          <ProductCard
            product={listing}
            onFavoriteToggle={() => {}}
            onProductClick={() => {}}
            viewMode="list"
          />
        </div>
      ))}
    </div>
  );
};

export default ListingList; 