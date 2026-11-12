"use client";

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faTimes } from '@fortawesome/free-solid-svg-icons';
import './LoginModal.css'; // Yeni bağımsız stil dosyası

/**
 * Oturum gerektiren işlemlerde kullanıcıya gösterilen uyarı modalı
 * @param {Function} onClose - Modal kapatma fonksiyonu
 * @param {string} actionType - Engellenen işlem türü (filtreleme/görüntüleme)
 */
const LoginRequiredModal = ({ onClose, actionType = 'görüntüleme' }) => {
  // Login sayfasına yönlendirme
  const handleLogin = () => {
    // Modal kapatılıp login sayfasına yönlendirilir
    onClose();
    window.location.href = '/giris';
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        <div className="login-modal-header">
          <h3>Oturum Açmanız Gerekiyor</h3>
          <button className="login-close-button" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="login-modal-content">
          <div className="login-icon-wrapper">
            <FontAwesomeIcon icon={faLock} className="login-lock-icon" />
          </div>
          
          <h4 className="login-modal-title">Daha fazla içerik için giriş yapın</h4>
          
          <p className="login-modal-message">
            Daha fazla değerlendirme {actionType === 'filter' ? 'filtrelemek' : 'görüntülemek'} için 
            lütfen oturum açın.
          </p>

          <div className="login-modal-actions">
            <button 
              className="login-modal-cancel" 
              onClick={onClose}
            >
              İptal
            </button>
            <button 
              className="login-modal-submit" 
              onClick={handleLogin}
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginRequiredModal; 