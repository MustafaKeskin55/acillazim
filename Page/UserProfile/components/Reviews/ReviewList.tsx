"use client";

import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faExclamationTriangle, faInfoCircle, faEdit, faChevronDown, faUser, faUserTie, faUserNurse } from '@fortawesome/free-solid-svg-icons';
import './ReviewList.css';
import ReviewModal from './ReviewModal';
import LoginRequiredModal from './LoginRequiredModal';
import authService from '@/services/auth/authService';
import { maskUserName } from '@/services/userService';

/**
 * Kullanıcı değerlendirmelerini listeleyen bileşen
 * @param {Array} reviews - Değerlendirmeler dizisi
 * @param {Object} stats - Değerlendirme istatistikleri
 * @param {boolean} isLoading - Yükleme durumu
 * @param {boolean} isEmpty - Veri yok durumu
 * @param {string} errorMessage - Hata mesajı (varsa)
 * @param {Function} onFilterChange - Filtre değiştiğinde çağrılacak fonksiyon
 * @param {Object} filters - Mevcut filtreler
 * @param {string} userId - Kullanıcı ID
 */
const ReviewList = ({ reviews, stats, isLoading, isEmpty, errorMessage, onFilterChange, filters, userId }) => {
  // Modal durumu
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginActionType, setLoginActionType] = useState('görüntüleme');
  
  // Oturum durumu kontrolü
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Maksimum gösterilecek yorum sayısı
  const MAX_VISIBLE_REVIEWS = 5;
  
  // Sayfa yüklendiğinde oturum durumunu kontrol et
  useEffect(() => {
    checkLoginStatus();
    
    // AuthService'den oturum durumu değişikliklerini dinle
    const unsubscribe = authService.subscribe((authState) => {
      setIsLoggedIn(authState.isAuthenticated);
    });
    
    // Temizleme fonksiyonu
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Oturum durumu kontrolü yapan yardımcı fonksiyon
  const checkLoginStatus = () => {
    // Merkezi auth servisini kullan
    const isAuthenticated = authService.isUserLoggedIn();
    console.log("[ReviewList] Oturum durumu kontrol ediliyor:", isAuthenticated);
    setIsLoggedIn(isAuthenticated);
  };
  
  // Debug için değerlendirmelerin yapısını kontrol et
  useEffect(() => {
    if (reviews && reviews.length > 0) {
      console.log("[ReviewList] İlk değerlendirme örneği:", reviews[0]);
    }
    
    if (filters) {
      console.log("[ReviewList] Mevcut filtreler:", filters);
    }
  }, [reviews, filters]);

  // Yıldız puanı gösterimi için yardımcı fonksiyon
  const renderStars = (rating) => {
    // Puanın sayısal değer olduğundan emin ol
    const numericRating = Number(rating) || 0;
    
    return (
      <div className="review-stars">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`star ${i < numericRating ? 'active' : ''}`}>
            <FontAwesomeIcon icon={faStar} />
          </span>
        ))}
      </div>
    );
  };
  
  // Tarihi formatla 
  const formatDate = (dateString) => {
    if (!dateString) return "Belirtilmemiş";
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
  };
  
  // Kullanıcı adına göre cinsiyet belirleme yardımcı fonksiyonu
  const determineGender = (userName) => {
    // Eğer API'den gender bilgisi gelmiyorsa, isim üzerinden basit bir tahmin yap
    if (!userName) return 'male'; // Varsayılan olarak erkek
    
    // Türkçede sık kullanılan kadın isimlerinin sonu
    const femaleNameEndings = ['a', 'e', 'ay', 'ey', 'an', 'en', 'in', 'un', 'ün', 'u'];
    
    // İsmi küçük harfe çevirip son harfi veya son iki harfi alıyoruz
    const lowerName = userName.toLowerCase();
    const lastChar = lowerName.charAt(lowerName.length - 1);
    const lastTwoChars = lowerName.substring(lowerName.length - 2);
    
    // Kadın ismi olma olasılığını kontrol et
    if (femaleNameEndings.includes(lastChar) || femaleNameEndings.includes(lastTwoChars)) {
      return 'female';
    }
    
    return 'male'; // Varsayılan olarak erkek
  };
  
  // Yükleniyor durumu
  if (isLoading) {
    return (
      <div className="reviews-container">
        <div className="reviews-stats-skeleton">
          <div className="stats-left-skeleton"></div>
          <div className="stats-right-skeleton">
            <div className="rating-bar-skeleton"></div>
            <div className="rating-bar-skeleton"></div>
            <div className="rating-bar-skeleton"></div>
            <div className="rating-bar-skeleton"></div>
            <div className="rating-bar-skeleton"></div>
          </div>
        </div>
        
        <div className="reviews-list">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="review-item-skeleton">
              <div className="review-header-skeleton">
                <div className="reviewer-avatar-skeleton"></div>
                <div className="reviewer-info-skeleton">
                  <div className="reviewer-name-skeleton"></div>
                  <div className="review-date-skeleton"></div>
                </div>
                <div className="review-rating-skeleton"></div>
              </div>
              <div className="review-content-skeleton">
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Hata durumu
  if (errorMessage) {
    return (
      <div className="reviews-error">
        <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
        <h3>Bir hata oluştu</h3>
        <p>{errorMessage}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Tekrar Dene
        </button>
      </div>
    );
  }
  
  // Filtre değişikliği - Oturum kontrolü eklenmiş hali
  const handleFilterChange = (filterType, value) => {
    // Oturum açık değilse login modalını göster
    if (!isLoggedIn) {
      setLoginActionType('filter');
      setIsLoginModalOpen(true);
      return;
    }
    
    if (onFilterChange) {
      console.log(`[ReviewList] Filtre değişti: ${filterType} = ${value}`);
      
      // Değer değişikliğini uygula ve ana bileşene bildir
      const newFilters = { ...filters, [filterType]: value };
      onFilterChange(newFilters);
    }
  };
  
  // Modal açma/kapama işlevleri
  const openModal = () => {
    // Değerlendirme için oturum kontrolü
    if (!isLoggedIn) {
      setLoginActionType('değerlendirme');
      setIsLoginModalOpen(true);
      return;
    }
    
    setIsModalOpen(true);
  };
  
  const closeModal = () => setIsModalOpen(false);
  
  // Login modalı kapatma
  const closeLoginModal = () => setIsLoginModalOpen(false);
  
  // Modal submit işlevi
  const handleReviewSubmit = async (reviewData) => {
    console.log('Yeni değerlendirme:', reviewData);
    // Burada gerçek API çağrısı yapılacak
    // reviewService.addReview(userId, reviewData) gibi
    
    // Başarılı kayıttan sonra değerlendirmeleri yenile
    // NOT: Alert mesajı kaldırıldı, mesaj backend tarafından gösterilecek
    
    return true; // Başarılı sonuç
  };
  
  // Görüntülenecek yorumları sınırlandır
  const visibleReviews = isLoggedIn 
    ? reviews 
    : (reviews && reviews.length > 0 ? reviews.slice(0, MAX_VISIBLE_REVIEWS) : []);
  
  // Daha fazla yorum var mı kontrol et
  const hasMoreReviews = !isLoggedIn && reviews && reviews.length > MAX_VISIBLE_REVIEWS;
  
  // Daha fazla yorum gösterme butonuna tıklandığında
  const handleShowMoreReviews = () => {
    if (!isLoggedIn) {
      setLoginActionType('görüntüleme');
      setIsLoginModalOpen(true);
    }
  };
  
  return (
    <div className="reviews-container">
      {/* Değerlendirme İstatistikleri */}
      {stats && (
        <div className="reviews-stats">
          <div className="stats-left">
            <div className="average-rating">{stats.averageRating?.toFixed(1) || '0.0'}</div>
            {renderStars(stats.averageRating || 0)}
            <div className="total-reviews">{stats.totalReviews || 0} değerlendirme</div>
          </div>
          
          <div className="stats-right">
            {[5, 4, 3, 2, 1].map(rating => {
              // API'den gelen değerler yoksa varsayılan olarak 0 kullan
              const ratingCount = stats.ratingCounts?.[rating] || 0;
              const totalCount = stats.totalReviews || 1; // Sıfıra bölmeyi önlemek için
              const percentage = (ratingCount / totalCount) * 100;
              
              return (
                <div 
                  key={rating} 
                  className={`rating-bar-container ${filters.rating === rating.toString() ? 'selected' : ''}`}
                  onClick={() => handleFilterChange('rating', rating.toString())}
                >
                  <div className="rating-label">{rating} yıldız</div>
                  <div className="rating-bar">
                    <div 
                      className="rating-bar-fill" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="rating-count">{ratingCount}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Geliştirilmiş Filtre Bölümü */}
      <div className="enhanced-filter-section">
        <div className="filters-container">
          <div className="filter-group">
            <span className="filter-label">Sıralama</span>
            <div className="custom-select">
              <select 
                value={filters.sort || 'date_desc'} 
                onChange={(e) => handleFilterChange('sort', e.target.value)}
              >
                <option value="date_desc">En Yeni</option>
                <option value="date_asc">En Eski</option>
                <option value="rating_desc">En Yüksek Puan</option>
                <option value="rating_asc">En Düşük Puan</option>
              </select>
              <FontAwesomeIcon icon={faChevronDown} className="select-arrow" />
            </div>
          </div>
          
          <div className="filter-group">
            <span className="filter-label">Yıldız Filtresi</span>
            <div className="custom-select">
              <select 
                value={filters.rating || ''} 
                onChange={(e) => handleFilterChange('rating', e.target.value)}
              >
                <option value="">Tüm Puanlar</option>
                <option value="5">5 Yıldız</option>
                <option value="4">4 Yıldız</option>
                <option value="3">3 Yıldız</option>
                <option value="2">2 Yıldız</option>
                <option value="1">1 Yıldız</option>
              </select>
              <FontAwesomeIcon icon={faChevronDown} className="select-arrow" />
            </div>
          </div>
        </div>
        
        <button className="write-review-button" onClick={openModal}>
          <FontAwesomeIcon icon={faEdit} className="review-icon" />
          <span>Değerlendirme Yap</span>
        </button>
      </div>
      
      {/* Değerlendirmeler Listesi */}
      {(!visibleReviews || visibleReviews.length === 0) ? (
        <div className="reviews-empty filtered-empty">
          <h3 className="empty-title">
            {filters.rating 
              ? <><span className="highlight">{filters.rating} Yıldızlı</span> Değerlendirme Bulunamadı</>
              : 'Henüz Değerlendirme Bulunamadı'}
          </h3>
          <p className="empty-description">
            {filters.rating 
              ? `Bu kullanıcı için ${filters.rating} yıldızlı değerlendirme bulunmamaktadır.` 
              : 'Bu kullanıcı için henüz değerlendirme bulunmamaktadır.'}
          </p>
          <button className="empty-review-button" onClick={openModal}>
            İlk Değerlendirmeyi Yapın
          </button>
        </div>
      ) : (
        <div className="reviews-list">
          {visibleReviews.map((review) => {
            // Review içindeki rating değerini güvenli şekilde al
            const ratingValue = Number(review.rating) || 0;
            
            // Cinsiyet bilgisini belirle - API'den geldiyse kullan, yoksa tahmin et
            const gender = review.gender || determineGender(review.userName);
            
            return (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  {/* Avatar - Cinsiyet bazlı ikon gösterimi */}
                  <div className="reviewer-avatar">
                    {gender === 'female' ? (
                      <FontAwesomeIcon icon={faUserNurse} className="avatar-icon female-avatar" />
                    ) : (
                      <FontAwesomeIcon icon={faUserTie} className="avatar-icon male-avatar" />
                    )}
                  </div>
                  
                  <div className="reviewer-info">
                    <div className="reviewer-name-container">
                      <div className="reviewer-name">{maskUserName(review.userName || review.reviewerName || review.user)}</div>
                      {/* Yıldız gösterimi yorumcunun adının yanında */}
                      <div className="reviewer-stars">
                        {renderStars(ratingValue)}
                        <span className="rating-value">{ratingValue.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="review-date">{formatDate(review.date)}</div>
                  </div>
                </div>
                
                <div className="review-content">
                  <p>{review.comment || 'Yorum yok'}</p>
                </div>
                
                {/* İlan bilgileri - Eğer varsa göster */}
                {review.listing && (
                  <div className="review-listing">
                    {review.listing.image && (
                      <div className="listing-image">
                        <img 
                          src={review.listing.image} 
                          alt={review.listing.title || 'İlan'} 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/80';
                          }}
                        />
                      </div>
                    )}
                    <div className="listing-info">
                      <div className="listing-title">{review.listing.title || 'İlan'}</div>
                      {review.listing.price && (
                        <div className="listing-price">{review.listing.price} TL</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Daha fazla göster butonu - Oturum açık değilse ve daha fazla yorum varsa */}
          {hasMoreReviews && (
            <div className="more-reviews-container">
              <div className="reviews-limit-message">
                <FontAwesomeIcon icon={faInfoCircle} className="info-icon" />
                <span>Sadece {MAX_VISIBLE_REVIEWS} değerlendirme gösteriliyor</span>
              </div>
              <button 
                className="more-reviews-button" 
                onClick={handleShowMoreReviews}
              >
                Tüm Değerlendirmeleri Görüntüle
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Değerlendirme Modalı */}
      {isModalOpen && (
        <ReviewModal 
          onClose={closeModal} 
          onSubmit={handleReviewSubmit}
        />
      )}
      
      {/* Login Modalı */}
      {isLoginModalOpen && (
        <LoginRequiredModal 
          onClose={closeLoginModal}
          actionType={loginActionType}
        />
      )}
    </div>
  );
};

export default ReviewList; 