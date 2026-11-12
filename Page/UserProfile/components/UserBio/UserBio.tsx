"use client";

import React from 'react';
import './UserBio.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faCalendarAlt,
  faInfoCircle,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import { formatDate } from '../../../../utils/dateUtils';

/**
 * Kullanıcı biyografisi bileşeni
 * @param {Object} props - Bileşen özellikleri
 * @param {Object} props.userData - Kullanıcı verileri
 * @param {boolean} props.isLoading - Yükleniyor durumu
 * @param {Object} props.error - Hata durumu
 * @returns {JSX.Element} - Kullanıcı biyografisi bileşeni
 */
const UserBio = ({ userData, isLoading, error }) => {
  // Yükleniyor durumu
  if (isLoading) {
    return (
      <div className="user-bio-container">
        <div className="user-bio-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
      </div>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <div className="user-bio-container">
        <div className="user-bio-error">
          <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
          <h3>Kullanıcı bilgileri yüklenemedi</h3>
          <p>{error.message || 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.'}</p>
        </div>
      </div>
    );
  }

  // Veri olmama durumu
  if (!userData) {
    return (
      <div className="user-bio-container">
        <div className="user-bio-error">
          <FontAwesomeIcon icon={faInfoCircle} className="error-icon" />
          <h3>Kullanıcı bilgileri bulunamadı</h3>
          <p>İstenen kullanıcı bilgileri mevcut değil.</p>
        </div>
      </div>
    );
  }

  // Üyelik tarihini formatla (eğer varsa)
  const formattedDate = userData.memberSince ? formatDate(userData.memberSince) : 'Belirtilmemiş';

  return (
    <div className="user-bio-container">
      <div className="user-bio-section">
        <h2 className="section-title">
          <FontAwesomeIcon icon={faUser} className="section-icon" />
          Kullanıcı Profili
        </h2>

        {/* Biyografi */}
        <div className="bio-content">
          <h3 className="bio-title">Hakkında</h3>
          <p className="bio-text">
            {userData.bio || 'Bu kullanıcı henüz kendisi hakkında bir bilgi girmemiş.'}
          </p>
        </div>

        {/* Üyelik Tarihi */}
        <div className="bio-meta">
          <div className="meta-item">
            <FontAwesomeIcon icon={faCalendarAlt} className="meta-icon" />
            <span className="meta-label">Üyelik Tarihi:</span>
            <span className="meta-value">{formattedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserBio; 