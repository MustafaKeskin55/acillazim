"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faStar, faCalendarAlt, faExclamationTriangle, faMapMarkerAlt, 
  faShoppingBag, faComments, faCrown, faEnvelope, faPhone, faFlag, faMapMarkedAlt, faHistory, faClock, faCalendarCheck, faUserClock, faLocationDot, faCalendarDays, faAward, faGem, faMedal, faStore, faUser, faBuilding, faBriefcase, faStoreAlt, faHandshake, faIdCard, faUserTie, faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarEmpty } from '@fortawesome/free-regular-svg-icons';
import { useRouter } from 'next/navigation';
import './ProfileHeader.css';
import * as messageService from '@/services/message/messageService';
import { SERVICE_LISTING_COVER_PLACEHOLDER_MOBILE } from '@/lib/serviceListingAssets';

/** Profil kapak: kullanıcı yüklememişse `public/kapak-fotografi-mobil.png` */
const DEFAULT_PROFILE_COVER = SERVICE_LISTING_COVER_PLACEHOLDER_MOBILE;

/**
 * Profil arkaplan bileşeni
 * Profil üst kısmındaki arkaplan, rozetler ve kapak görseli için ayrı komponent
 * @param {Object} param - Bileşen parametreleri
 * @param {JSX.Element} param.memberBadge - Üyelik rozeti
 * @param {JSX.Element} param.userRoleBadge - Kullanıcı rol rozeti
 * @param {string} param.coverImage - Kapak fotoğrafı URL'i (varsa)
 * @returns {JSX.Element} - ProfileHeaderBg bileşeni
 */
const ProfileHeaderBg = ({ memberBadge, userRoleBadge, coverImage }) => {
  const coverSrc =
    typeof coverImage === 'string' && coverImage.trim().length > 0
      ? coverImage.trim()
      : DEFAULT_PROFILE_COVER;

  return (
    <div className="profile-header-bg">
      <div className="cover-image-container">
        <img
          src={coverSrc}
          alt="Kapak fotoğrafı"
          className="cover-image"
          onError={(e) => {
            const el = e.currentTarget;
            if (el.dataset.coverFallback === 'true') {
              el.style.display = 'none';
              return;
            }
            el.dataset.coverFallback = 'true';
            el.src = DEFAULT_PROFILE_COVER;
          }}
        />
        <div className="cover-image-overlay" />
      </div>

      {memberBadge}
      {userRoleBadge}
    </div>
  );
};

/**
 * Kullanıcı profil başlığı bileşeni
 * @param {Object} param - Bileşen parametreleri
 * @param {Object} param.profile - Kullanıcı profil verileri
 * @param {Object} param.stats - Kullanıcı istatistik verileri
 * @returns {JSX.Element} - ProfileHeader bileşeni
 */
const ProfileHeader = ({ profile, stats, isLoading, onReportClick }) => {
  const router = useRouter();

  /**
   * Üyelik rozetini gösterip göstermeyeceğini kontrol et
   */
  const memberBadge = useMemo(() => {
    if (!profile?.uyelik_tarihi) return null;
    
    try {
      // Eğer string içinde "yıldır" kelimesi varsa, direkt formatlanmış metinden al
      if (typeof profile.uyelik_tarihi === 'string' && profile.uyelik_tarihi.includes('yıldır')) {
        const yearMatch = profile.uyelik_tarihi.match(/(\d+)/);
        const years = yearMatch ? parseInt(yearMatch[1]) : 0;
        
        if (years >= 3) {
          return (
            <div className="member-badge premium" title={`${years} yıllık üye`}>
              <FontAwesomeIcon icon={faCalendarDays} />
              <span>Premium Üye</span>
            </div>
          );
        } else if (years >= 1) {
          return (
            <div className="member-badge active" title={`${years} yıllık üye`}>
              <FontAwesomeIcon icon={faCalendarDays} />
              <span>Aktif Üye</span>
            </div>
          );
        }
      }
      
      return null;
    } catch (error) {
      console.error('Üyelik rozeti gösterilemedi:', error);
      return null;
    }
  }, [profile?.uyelik_tarihi]);
  
  /**
   * Kullanıcı rol rozetini göster
   */
  const userRoleBadge = useMemo(() => {
    if (!profile?.rol) return null;
    
    try {
      let badgeText = "";
      let badgeIcon = null;
      let badgeClass = "";
      
      switch(profile.rol) {
        case "ticari_satici":
          badgeText = "Kurumsal Satıcı";
          badgeIcon = faBriefcase;
          badgeClass = "ticari";
          break;
        case "bireysel_satici":
          badgeText = "Bireysel Satıcı";
          badgeIcon = faHandshake;
          badgeClass = "bireysel";
          break;
        default:
          return null; // Normal kullanıcı rozeti gösterilmeyecek
      }
      
      return (
        <div className={`user-role-badge ${badgeClass}`} title={badgeText}>
          <FontAwesomeIcon icon={badgeIcon} className="role-icon" />
          <span>{badgeText}</span>
        </div>
      );
    } catch (error) {
      console.error('Rol rozeti gösterilemedi:', error);
      return null;
    }
  }, [profile?.rol]);

  // Yükleniyor durumunda iskelet ekranı göster
  if (isLoading) {
    return <ProfileHeaderSkeleton />;
  }

  // Hata durumunda bilgi mesajı göster
  if (!profile || !stats) {
    return <ProfileHeaderError />;
  }

  /**
   * Üyelik süresini ay/yıl formatında hesaplama fonksiyonu
   * @param {string} membershipDate - Üyelik tarihi
   * @returns {Object} - Hesaplanan üyelik süresi ve ikon
   */
  const calculateMembershipDuration = (membershipDate) => {
    if (!membershipDate) return { text: 'Yeni Üye', icon: faAward, class: 'new' };
    
    // Eğer zaten "X yıldır üye" formatında ise
    if (typeof membershipDate === 'string' && membershipDate.includes('yıldır')) {
      const yearMatch = membershipDate.match(/(\d+)/);
      const years = yearMatch ? parseInt(yearMatch[1]) : 0;
      
      if (years >= 3) {
        return { text: `${years} Yıldır Üye`, icon: faGem, class: 'years' };
      } else if (years >= 1) {
        return { text: `${years} Yıldır Üye`, icon: faMedal, class: 'years' };
      } else {
        return { text: 'Aktif Üye', icon: faMedal, class: 'months' };
      }
    }
    
    // Eğer tarih formatındaysa
    try {
      const memberDate = new Date(membershipDate);
      const now = new Date();
      const diffTime = Math.abs(now - memberDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 365 * 3) {
        const years = Math.floor(diffDays / 365);
        return { text: `${years} Yıldır Üye`, icon: faGem, class: 'years' };
      } else if (diffDays >= 365) {
        const years = Math.floor(diffDays / 365);
        return { text: `${years} Yıldır Üye`, icon: faMedal, class: 'years' };
      } else if (diffDays >= 30) {
        const months = Math.floor(diffDays / 30);
        return { text: `${months} Aydır Üye`, icon: faCalendarCheck, class: 'months' };
      } else {
        return { text: 'Yeni Üye', icon: faAward, class: 'new' };
      }
    } catch (error) {
      // Eğer tarih formatı geçersizse sadece tarihi göster
      return { text: membershipDate, icon: faCalendarDays, class: 'new' };
    }
  };

  /**
   * Yıldız puanı gösterimi için yardımcı fonksiyon
   * Tam, yarım ve boş yıldızları hesaplar ve gösterir
   * @param {number} rating - Değerlendirme puanı (0-5 arası)
   * @returns {JSX.Element} - Yıldız gösterimi
   */
  const renderStars = (rating) => {
    // Geçersiz değer kontrolü
    if (!rating || isNaN(rating) || rating <= 0) return null;
    
    // Maksimum 5 yıldız sınırlaması
    const normalizedRating = Math.min(5, rating);
    
    // Tam ve yarım yıldızları hesapla
    const fullStars = Math.floor(normalizedRating);
    const hasHalfStar = normalizedRating % 1 >= 0.3 && normalizedRating % 1 < 0.8;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    const stars = [];
    
    // Dolu yıldızlar
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={`full-${i}`} className="star full">
          <FontAwesomeIcon icon={faStar} />
        </span>
      );
    }
    
    // Yarım yıldız (eğer varsa)
    if (hasHalfStar) {
      stars.push(
        <span key="half" className="star half">
          <div className="half-star-container">
            <FontAwesomeIcon icon={faStar} className="half-star-bg" />
            <div className="half-star-fill">
              <FontAwesomeIcon icon={faStar} />
            </div>
          </div>
        </span>
      );
    }
    
    // Boş yıldızlar
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="star empty">
          <FontAwesomeIcon icon={faStarEmpty} />
        </span>
      );
    }
    
    return (
      <>
        {stars}
        <span className="rating-value">{normalizedRating.toFixed(1)}</span>
      </>
    );
  };
  
  /**
   * Yanıt süresi formatlama yardımcı fonksiyonu
   * @returns {string} - Formatlanmış yanıt süresi metni
   */
  const formatResponseTime = () => {
    if (!stats.responseTime) return "Bilgi yok";
    
    // API'den gelen yanıt süresini kullan
    if (typeof stats.responseTime === 'string') {
      return stats.responseTime; // Doğrudan API'den geleni kullan
    }
    
    // Saat cinsinden yanıt süresi
    const responseHours = stats.responseTime;
    
    if (responseHours < 1) {
      return "Genellikle hemen yanıt verir";
    } else if (responseHours < 3) {
      return "Genellikle birkaç saat içinde yanıt verir";
    } else if (responseHours < 24) {
      return "Genellikle aynı gün içinde yanıt verir";
    } else if (responseHours < 48) {
      return "Genellikle 1-2 gün içinde yanıt verir";
    } else {
      return "Yanıt vermesi birkaç gün sürebilir";
    }
  };
  
  // 0 yorum kontrolü
  const hasReviews = stats.totalReviews && stats.totalReviews > 0;

  /**
   * Mesaj gönder butonuna tıklandığında
   * Kullanıcıyla olan conversation'ı bul veya yeni conversation başlat
   */
  const handleMessageClick = async () => {
    try {
      // Bu kullanıcıyla olan conversation'ı bul veya yeni oluştur
      let conversation = await messageService.getConversationWithUser(profile.user_id);
      
      if (!conversation) {
        // Conversation yoksa yeni conversation başlat
        conversation = await messageService.createConversation(profile.user_id);
      }
      
      // Mesajlaşma sayfasına yönlendir - state ile mevcut profil bilgilerini geç
      try {
        sessionStorage.setItem(
          'message_thread_context',
          JSON.stringify({
            conversation_id: conversation.conversation_id,
            listing_id: null,
            seller_id: profile.user_id,
            listingInfo: {
              title: 'Mesajlaşma',
              price: '',
              image: profile.profil_fotografi || null,
              location: null,
            },
          })
        );
      } catch {
        /* ignore */
      }
      router.push(`/dashboard/mesajlar/${conversation.conversation_id}`);
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      alert('Mesaj sayfasına yönlendirilirken bir hata oluştu.');
    }
  };

  return (
    <div className="profile-header">
      {/* Profil arkaplan rengini gösteren üst bölüm - Ayrı komponent olarak */}
      <ProfileHeaderBg 
        memberBadge={memberBadge}
        userRoleBadge={userRoleBadge}
        coverImage={profile.kapak_fotografi}
      />
      
      {/* Profil içerik alanı */}
      <div className="profile-header-content">
        {/* Profil fotoğrafı - Eğer yoksa baş harf gösterilir */}
        <div className="profile-avatar">
          {profile.profil_fotografi ? (
            <img 
              src={profile.profil_fotografi} 
              alt={profile.ad_soyad || 'Kullanıcı'} 
              className="avatar-image" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/120?text=' + (profile.ad_soyad?.charAt(0) || 'U');
              }}
            />
          ) : (
            <div className="avatar-placeholder">
              {profile.ad_soyad?.charAt(0) || 'U'}
            </div>
          )}
          
          {/* Doğrulanmış hesap rozeti */}
          {profile.dogrulanmis_hesap && (
            <span className="verified-badge" title="Doğrulanmış Hesap">
              <FontAwesomeIcon icon={faCheckCircle} />
            </span>
          )}
        </div>
        
        {/* Kullanıcı bilgileri */}
        <div className="profile-info">
          <div className="profile-name-rating">
            <h1 className="profile-name">{profile.ad_soyad || 'İsimsiz Kullanıcı'}</h1>
            
            {/* Değerlendirme puanı - İsmin yanına taşındı (daha şık tasarım) */}
            {stats.trustScore > 0 && (
              <span className="profile-rating">
                <span className="rating-container">
                  <div className="stars-container">
                    {renderStars(stats.trustScore)}
                  </div>
                  <span className="rating-count">
                    ({stats.totalReviews} {stats.totalReviews === 1 ? 'yorum' : 'yorum'})
                  </span>
                </span>
              </span>
            )}
          </div>
          
          <div className="profile-meta">
            {/* Konum bilgisi - Eğer varsa göster */}
            {profile.il && (
              <span className="profile-location" title="Konum">
                <FontAwesomeIcon icon={faLocationDot} />
                {profile.il}{profile.ilce ? `, ${profile.ilce}` : ''}
              </span>
            )}
            
            {/* Üyelik tarihi - Rozet olarak göster */}
            {profile.uyelik_tarihi && (() => {
              const membership = calculateMembershipDuration(profile.uyelik_tarihi);
              return (
                <span className={`membership-badge ${membership.class}`} title="Üyelik Süresi">
                  <FontAwesomeIcon icon={membership.icon} />
                  {membership.text}
                </span>
              );
            })()}
            
            {/* Yanıt süresi - Dinamik hesaplanır */}
            <span className="profile-response-time" title="Yanıt Süresi">
              <FontAwesomeIcon icon={faClock} />
              {formatResponseTime()}
            </span>
          </div>
        </div>
      </div>
      
      {/* İletişim butonları */}
      <div className="profile-actions">
        <button 
          className="btn-message"
          onClick={handleMessageClick}
        >
          <FontAwesomeIcon icon={faEnvelope} />
          Mesaj Gönder
        </button>
        
        <button 
          className="btn-phone"
          onClick={() => window.alert('Telefon gösterme API\'si çağrılacak')}
        >
          <FontAwesomeIcon icon={faPhone} />
          Telefon Numarasını Göster
        </button>
        
        <button 
          className="btn-report"
          onClick={() => onReportClick ? onReportClick() : router.push(`/sikayet/kullanici/${profile.id}`)}
        >
          <FontAwesomeIcon icon={faFlag} />
          Şikayet Et
        </button>
      </div>
    </div>
  );
};

// Yükleniyor durumu iskelet bileşeni
const ProfileHeaderSkeleton = () => (
  <div className="profile-header profile-header-skeleton">
    <div className="profile-header-bg">
      <div className="cover-image-container">
        <img src={DEFAULT_PROFILE_COVER} alt="" className="cover-image" />
        <div className="cover-image-overlay" />
      </div>
    </div>
    <div className="profile-header-content">
      <div className="profile-avatar-skeleton"></div>
      <div className="profile-info-skeleton">
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-line" style={{ width: '60%' }}></div>
        <div className="skeleton-line" style={{ width: '40%' }}></div>
        <div className="skeleton-line" style={{ width: '70%' }}></div>
      </div>
    </div>
    <div className="profile-stats-skeleton">
      <div className="stat-item-skeleton"></div>
      <div className="stat-item-skeleton"></div>
      <div className="stat-item-skeleton"></div>
    </div>
  </div>
);

// Hata durumu bileşeni
const ProfileHeaderError = () => (
  <div className="profile-header-error">
    <div className="profile-error-message">
      <div className="error-icon">
        <FontAwesomeIcon icon={faExclamationTriangle} />
      </div>
      <h3>Profil bilgileri yüklenirken bir hata oluştu.</h3>
      <p>Lütfen sayfayı yenileyerek tekrar deneyin.</p>
      <button className="retry-button" onClick={() => window.location.reload()}>
        Yeniden Dene
      </button>
    </div>
  </div>
);

export default ProfileHeader;