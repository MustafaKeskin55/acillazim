"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import './ListingPriceCard.css';
import * as messageService from '@/services/message/messageService';
import authService from '@/services/auth/authService';

const ListingPriceCard = ({ 
  price, 
  location, 
  features, 
  phone = "0555-915-55-48",
  message = "Mesaj Gönder",
  sellerId = "0",
  listingId = null 
}: any) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const formattedPrice = new Intl.NumberFormat('tr-TR').format(price || 0);
  const formattedPhoneForCall = (phone || '').replace(/[-\s]/g, '');
  
  const handleMessageClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;

    // 1. Giriş kontrolü
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        router.push(`/giris?redirect_after=${encodeURIComponent(currentPath)}`);
      } else {
        router.push('/giris');
      }
      return;
    }

    const currentUserId = (currentUser as any)?.id || (currentUser as any)?.user_id || (currentUser as any)?.userId;
    const sellerIdNum = parseInt(String(sellerId), 10);

    if (!sellerIdNum || isNaN(sellerIdNum)) {
      alert('İlan sahibinin kullanıcı bilgisi bulunamadı.');
      return;
    }

    // 2. Kendi ilanına mesaj atma kontrolü
    if (currentUserId && String(currentUserId) === String(sellerIdNum)) {
      alert('Kendi ilanınıza mesaj gönderemezsiniz.');
      return;
    }

    try {
      setLoading(true);
      let conversation = await messageService.getConversationWithUser(sellerIdNum);
      
      if (!conversation) {
        conversation = await messageService.createConversation(sellerIdNum, listingId);
      }

      if (!conversation || !conversation.conversation_id) {
        throw new Error('Konuşma başlatılamadı');
      }

      try {
        sessionStorage.setItem(
          'message_thread_context',
          JSON.stringify({
            conversation_id: conversation.conversation_id,
            listing_id: listingId,
            seller_id: sellerIdNum,
            listingInfo: {
              title: location?.title || 'İlan',
              price: price ? `${new Intl.NumberFormat('tr-TR').format(price)} TL` : '',
              image: features?.image || location?.image || null,
              location,
            },
          })
        );
      } catch {
        /* ignore */
      }

      router.push(`/dashboard/mesajlar/${conversation.conversation_id}`);
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      alert('Mesaj sayfasına yönlendirilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const district = location?.district || location?.ilce || '';
  const city = location?.city || location?.il || '';
  const locationText = [district, city].filter(Boolean).join(', ');

  const propertyType = features?.propertyType || features?.mulk_tipi || features?.emlak_tipi || '';
  const squareMeters = features?.squareMeters || features?.metrekare || features?.m2 || features?.alan || features?.net_metrekare || features?.brut_metrekare || '';
  const roomCount = features?.roomCount || features?.oda_sayisi || features?.oda || '';

  const vehicleKm = features?.km || features?.kilometre || '';
  const vehicleYear = features?.yil || features?.model_yili || '';

  return (
    <div className="product-detail-listing-price-card">
      <div className="price-section">
        <span className="currency-symbol">₺</span>
        <span className="price-value">{formattedPrice}</span>
      </div>
      
      <div className="quick-info">
        {locationText ? (
          <div className="quick-info-item">
            <i className="fas fa-map-marker-alt"></i>
            <span>{locationText}</span>
          </div>
        ) : null}
        {propertyType ? (
          <div className="quick-info-item">
            <i className="fas fa-home"></i>
            <span>{propertyType}</span>
          </div>
        ) : null}
        {squareMeters ? (
          <div className="quick-info-item">
            <i className="fas fa-ruler-combined"></i>
            <span>{squareMeters} m²</span>
          </div>
        ) : null}
        {roomCount ? (
          <div className="quick-info-item">
            <i className="fas fa-bed"></i>
            <span>{roomCount} Oda</span>
          </div>
        ) : null}
        {vehicleKm ? (
          <div className="quick-info-item">
            <i className="fas fa-tachometer-alt"></i>
            <span>{vehicleKm} km</span>
          </div>
        ) : null}
        {vehicleYear ? (
          <div className="quick-info-item">
            <i className="fas fa-calendar-alt"></i>
            <span>{vehicleYear} Model</span>
          </div>
        ) : null}
      </div>
      
      <div className="listing-actions">
        <a href={`tel:${formattedPhoneForCall}`} className="product-detail-phone-button">
          <i className="fas fa-phone-alt"></i>
          {phone}
        </a>
        
        <button 
          type="button" 
          onClick={handleMessageClick} 
          className="product-detail-message-button"
          disabled={loading}
        >
          <i className="fas fa-envelope"></i>
          {loading ? 'Yükleniyor...' : 'Mesaj Gönder'}
        </button>
      </div>
    </div>
  );
};

export default ListingPriceCard;
