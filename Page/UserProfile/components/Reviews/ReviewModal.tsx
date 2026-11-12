"use client";

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStar, 
  faTimes, 
  faCheck, 
  faExclamationCircle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import './ReviewModal.css';

/**
 * Modern ve şık tasarımlı değerlendirme modal bileşeni
 * @param {Function} onClose - Modalı kapatma fonksiyonu
 * @param {Function} onSubmit - Değerlendirme gönderildiğinde çağrılacak fonksiyon
 * @param {Object} initialData - Başlangıç değerleri (varsa)
 */
const ReviewModal = ({ onClose, onSubmit, initialData = {} }) => {
  // Form durumu
  const [rating, setRating] = useState(initialData.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(initialData.comment || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Karakter sınırı
  const maxCharacterCount = 250;
  const remainingChars = maxCharacterCount - comment.length;
  
  // Escape tuşu ile modalı kapatma
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onClose, isSubmitting]);
  
  // Başarılı durumda otomatik kapanma
  useEffect(() => {
    let timer;
    if (showFeedback && success) {
      timer = setTimeout(() => {
        onClose();
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [showFeedback, success, onClose]);
  
  // Form gönderimi
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation - tüm hatalarda yalnızca görsel vurgu kullanacağız
    if (rating < 1) {
      setError('no-stars');
      return;
    }
    
    if (!comment.trim()) {
      setError('no-comment');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        await onSubmit({ rating, comment: comment.trim() });
      }
      
      // Başarı durumu
      setSuccess(true);
      setShowFeedback(true);
      
    } catch (err) {
      console.error("Değerlendirme gönderilirken hata oluştu:", err);
      setError("submit-error");
      setShowFeedback(true);
      setSuccess(false);
      setIsSubmitting(false);
    }
  };
  
  // Modal dışına tıklama ile kapatma
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };
  
  // Yıldız derecelendirme bileşeni - İyileştirilmiş versiyon
  const StarRating = () => {
    // Form gönderildi ve yıldız seçilmediyse vurgu yapalım
    const needAttention = error === 'no-stars' || (isSubmitting && rating < 1);
    
    return (
      <div className="star-rating">
        <div className={`stars-container ${needAttention ? 'not-selected' : ''}`}>
          {[...Array(5)].map((_, idx) => {
            const starValue = idx + 1;
            const isActive = (hoverRating || rating) >= starValue;
            
            return (
              <span 
                key={idx}
                className={`rating-star ${isActive ? 'active' : ''}`}
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${starValue} yıldız`}
              >
                <FontAwesomeIcon icon={faStar} style={{ opacity: isActive ? 1 : 0.25 }} />
              </span>
            );
          })}
        </div>
        <div className="rating-text">
          {needAttention ? 'Lütfen yıldız seçin' : getRatingText(rating)}
        </div>
      </div>
    );
  };
  
  // Yıldız puanına göre metin
  const getRatingText = (starCount) => {
    if (starCount === 0) return 'Deneyiminizi puanlayın';
    
    const ratingTexts = {
      1: 'Çok Kötü',
      2: 'Kötü',
      3: 'Orta',
      4: 'İyi',
      5: 'Mükemmel'
    };
    
    return `${starCount} Yıldız - ${ratingTexts[starCount]}`;
  };
  
  // Feedback mesajı
  const FeedbackMessage = () => {
    if (!showFeedback) return null;
    
    return (
      <div className={`feedback-message ${success ? 'success' : 'error'}`}>
        <div className="feedback-icon">
          <FontAwesomeIcon icon={success ? faCheck : faExclamationCircle} />
        </div>
        <div className="feedback-text">
          {success 
            ? 'Değerlendirmeniz başarıyla gönderildi!' 
            : 'Değerlendirme gönderilirken bir sorun oluştu.'}
        </div>
      </div>
    );
  };
  
  // Modal içeriğini oluştur
  const modalContent = (
    <div className="review-modal-backdrop" onClick={handleBackdropClick}>
      <div className={`review-modal ${showFeedback ? 'with-feedback' : ''}`}>
        {showFeedback ? (
          <FeedbackMessage />
        ) : (
          <>
            <div className="modal-header">
              <h2>Değerlendirme Yap</h2>
              <button 
                className="close-button" 
                onClick={onClose} 
                disabled={isSubmitting}
                aria-label="Kapat"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="review-form">
              <div className="form-group">
                <label>Puanlama</label>
                <StarRating />
              </div>
              
              <div className="form-group">
                <div className="label-wrapper">
                  <label htmlFor="comment">Yorumunuz</label>
                  <div className={`char-count ${remainingChars < 20 ? 'warning' : ''}`}>
                    {remainingChars} karakter kaldı
                  </div>
                </div>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Deneyiminizi paylaşın..."
                  rows={4}
                  maxLength={maxCharacterCount}
                  disabled={isSubmitting}
                  className={error === 'no-comment' ? 'has-error' : ''}
                />
                {error === 'no-comment' && (
                  <div className="input-warning">
                    <FontAwesomeIcon icon={faInfoCircle} style={{ marginRight: '4px', fontSize: '12px' }} />
                    <span>Lütfen yorum yazın</span>
                  </div>
                )}
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Gönderiliyor...' : 'Değerlendirmeyi Gönder'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
  
  // Portal kullanarak modalı doğrudan body'ye ekle
  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

export default ReviewModal; 