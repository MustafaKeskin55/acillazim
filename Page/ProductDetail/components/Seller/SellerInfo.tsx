"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaUser, FaCalendarAlt, FaListAlt, FaCheck, FaFlag } from 'react-icons/fa';
import './SellerInfo.css';
import userService from '@/services/users/userService';

const SellerInfo = ({ seller, onReportClick }) => {
  const [memberSince, setMemberSince] = useState<string | null | undefined>(null);
  
  useEffect(() => {
    const uid = seller?.id ?? seller?.user_id;
    if (!seller || !uid) return;
    let cancelled = false;
    (async () => {
      try {
        const userMemberSince = await userService.getUserMemberSinceAsync(uid);
        if (!cancelled) setMemberSince(userMemberSince);
      } catch (error) {
        console.error('[SellerInfo] Üyelik tarihi alınamadı:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [seller]);
  
  if (!seller) return null;
  
  const { id: sellerId, name, otherListings, profileImage, isVerified, location } = seller;
  const id = sellerId ?? seller.user_id;
  
  // Üye olma tarihini formatla
  const formatMemberSince = (dateString) => {
    try {
      if (!dateString) return 'Bilinmiyor';
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return 'Bilinmiyor';
      return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
    } catch (error) {
      return dateString || 'Bilinmiyor';
    }
  };
  
  // Kullanıcı adını formatla (Kullanıcı {ID})
  const formattedName = name || `Kullanıcı ${id || ''}`;
  
  // Konsola debug log
  console.log("SellerInfo bileşeni: seller =", seller);
  console.log("İşlenen ad:", name, "ID:", id, "Format sonrası:", formattedName);
  console.log("Üyelik tarihi:", memberSince);
  
  return (
    <div className="product-detail-seller-info">
      <h3 className="product-detail-seller-info-title">Satıcı Bilgileri</h3>
      
      <div className="product-detail-seller-profile">
        <Link href={`/profile/${id}`} className="product-detail-seller-avatar">
          <img 
            src={profileImage || 'https://via.placeholder.com/50?text=?'} 
            alt={formattedName} 
          />
          {isVerified && (
            <div className="product-detail-verified-badge" title="Doğrulanmış Hesap">
              <FaCheck />
            </div>
          )}
        </Link>
        
        <div className="product-detail-seller-details">
          <div className="product-detail-seller-name-row">
            <h4 className="product-detail-seller-name">
              <Link href={`/profile/${id}`} className="product-detail-seller-name-link">
                {formattedName}
              </Link>
            </h4>
            {isVerified && (
              <span className="product-detail-verified-text">Doğrulanmış Hesap</span>
            )}
          </div>
          
          <div className="product-detail-seller-meta">
            <div className="product-detail-meta-item">
              <FaCalendarAlt />
              <span>Üyelik: {formatMemberSince(memberSince)}</span>
            </div>
            
            <div className="product-detail-meta-item">
              <FaListAlt />
              <span>Toplam İlan: {otherListings || 0}</span>
            </div>
            
            {location && (
              <div className="product-detail-meta-item">
                <span>Konum: {location.district}, {location.city}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="product-detail-seller-actions">
        <Link href={`/profile/${id}`} className="product-detail-seller-profile-link">
          <FaUser />
          <span>Satıcı Profilini Görüntüle</span>
        </Link>
        {onReportClick ? (
          <button type="button" onClick={onReportClick} className="product-detail-seller-report-link">
            <FaFlag />
            <span>Kullanıcıyı Şikayet Et</span>
          </button>
        ) : (
          <Link href={`/sikayet/kullanici/${id}`} className="product-detail-seller-report-link">
            <FaFlag />
            <span>Kullanıcıyı Şikayet Et</span>
          </Link>
        )}
      </div>
      
      <div className="product-detail-seller-other-listings">
        <Link href={`/profile/${id}?tab=listings`} className="product-detail-other-listings-link">
          <FaListAlt />
          <span>Diğer İlanları</span>
        </Link>
      </div>
    </div>
  );
};

export default SellerInfo; 