"use client";

import React, { useState } from 'react';
import './UserContactInfo.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faMapMarkerAlt,
  faEnvelope,
  faPhone,
  faExclamationTriangle,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Kullanıcı iletişim bilgileri bileşeni
 * @param {Object} props - Bileşen özellikleri
 * @param {Object} props.userData - Kullanıcı verileri
 * @param {boolean} props.isLoading - Yükleniyor durumu
 * @param {Object} props.error - Hata durumu
 * @returns {JSX.Element} - Kullanıcı iletişim bilgileri bileşeni
 */
const UserContactInfo = ({ userData, isLoading, error }) => {
  // Telefon numarası görünürlüğü için state
  const [showPhone, setShowPhone] = useState(false);

  // Yükleniyor durumu
  if (isLoading) {
    return (
      <div className="contact-info-container">
        <div className="contact-info-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
          <div className="skeleton-line"></div>
        </div>
      </div>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <div className="contact-info-container">
        <div className="contact-info-error">
          <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
          <h3>İletişim bilgileri yüklenemedi</h3>
          <p>{error.message || 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.'}</p>
        </div>
      </div>
    );
  }

  // Veri olmama durumu
  if (!userData) {
    return (
      <div className="contact-info-container">
        <div className="contact-info-error">
          <FontAwesomeIcon icon={faInfoCircle} className="error-icon" />
          <h3>İletişim bilgileri bulunamadı</h3>
          <p>İstenen kullanıcı bilgileri mevcut değil.</p>
        </div>
      </div>
    );
  }

  // Telefon gösterme işleyicisi
  const handleShowPhone = () => {
    setShowPhone(true);
  };

  // Kullanıcı iletişim bilgileri görünümü
  return (
    <div className="contact-info-container">
      <div className="contact-info-section">
        <h2 className="section-title">
          <FontAwesomeIcon icon={faUser} className="section-icon" />
          İletişim Bilgileri
        </h2>

        {/* İsim */}
        <div className="info-item">
          <div className="info-label">
            <FontAwesomeIcon icon={faUser} /> İsim
          </div>
          <div className="info-value">{userData.fullName || 'Belirtilmemiş'}</div>
        </div>

        {/* Konum */}
        {userData.location && (
          <div className="info-item">
            <div className="info-label">
              <FontAwesomeIcon icon={faMapMarkerAlt} /> Konum
            </div>
            <div className="info-value">{userData.location}</div>
          </div>
        )}

        {/* E-posta */}
        <div className="info-item">
          <div className="info-label">
            <FontAwesomeIcon icon={faEnvelope} /> E-posta
          </div>
          <div className="info-value email-value">{userData.email || 'Belirtilmemiş'}</div>
        </div>

        {/* Telefon */}
        <div className="info-item phone-item">
          <div className="info-label">
            <FontAwesomeIcon icon={faPhone} /> Telefon
          </div>
          <div className="info-value">
            {showPhone ? (
              userData.phone || 'Belirtilmemiş'
            ) : (
              <button className="show-phone-button" onClick={handleShowPhone}>
                Telefon Numarasını Göster
              </button>
            )}
          </div>
        </div>

        {/* İletişim bilgileri hakkında not */}
        <div className="info-note">
          <p>
            <FontAwesomeIcon icon={faInfoCircle} className="note-icon" />
            Satıcıyla iletişime geçmeden önce ilan detaylarını dikkatlice inceleyin ve sorularınızı hazırlayın.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserContactInfo; 