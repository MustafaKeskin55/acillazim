'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IoClose, IoFlashOutline, IoShieldCheckmarkOutline, IoSparklesOutline, IoArrowForward } from 'react-icons/io5';
import './IlanVerAuthModal.css';

interface IlanVerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectUrl?: string;
}

export default function IlanVerAuthModal({
  isOpen,
  onClose,
  redirectUrl = '/ilan-ver',
}: IlanVerAuthModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC tuşu ile kapatma ve arka plan kaydırma kilidi
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const loginHref = `/giris?redirect_after=${encodeURIComponent(redirectUrl)}`;
  const registerHref = `/uyelik-sec?redirect_after=${encodeURIComponent(redirectUrl)}`;

  return (
    <div className="ios-auth-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="ios-auth-title">
      <div
        className="ios-auth-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Grabber (Mobilde Native Görünüm) */}
        <div className="ios-grabber-bar" aria-hidden="true">
          <span className="ios-grabber" />
        </div>

        {/* Kapat Butonu (iOS Dairesel Buton) */}
        <button
          type="button"
          className="ios-auth-close-btn"
          onClick={onClose}
          aria-label="Kapat"
        >
          <IoClose />
        </button>

        {/* İkon Rozeti (Apple Squircle Gradient) */}
        <div className="ios-auth-icon-wrap" aria-hidden="true">
          <div className="ios-auth-icon-squircle">
            <IoSparklesOutline className="ios-auth-icon" />
          </div>
          <span className="ios-auth-icon-glow" />
        </div>

        {/* Başlık ve Açıklama */}
        <div className="ios-auth-header">
          <span className="ios-auth-pill">Giriş Gerekli</span>
          <h2 id="ios-auth-title" className="ios-auth-title">
            İlan Vermek İçin Oturum Açın
          </h2>
          <p className="ios-auth-description">
            Acillazım güvencesiyle ilanınızı oluşturup binlerce kullanıcıya ulaştırmak için lütfen hesabınıza giriş yapın veya ücretsiz hesap açın.
          </p>
        </div>

        {/* iOS Rozet Özellikleri */}
        <div className="ios-auth-features" aria-label="Acillazım Ayrıcalıkları">
          <div className="ios-auth-feat-item">
            <span className="ios-auth-feat-icon">
              <IoFlashOutline />
            </span>
            <span className="ios-auth-feat-text">Hızlı Yayın</span>
          </div>
          <div className="ios-auth-feat-sep" aria-hidden="true" />
          <div className="ios-auth-feat-item">
            <span className="ios-auth-feat-icon">
              <IoShieldCheckmarkOutline />
            </span>
            <span className="ios-auth-feat-text">Güvenli İşlem</span>
          </div>
          <div className="ios-auth-feat-sep" aria-hidden="true" />
          <div className="ios-auth-feat-item">
            <span className="ios-auth-feat-icon">
              <IoSparklesOutline />
            </span>
            <span className="ios-auth-feat-text">Ücretsiz İlan</span>
          </div>
        </div>

        {/* Eylem Butonları (iOS Tarzı Aksiyonlar) */}
        <div className="ios-auth-actions">
          <Link
            href={loginHref}
            className="ios-auth-btn ios-auth-btn--primary"
            onClick={onClose}
          >
            <span>Giriş Yap</span>
            <IoArrowForward className="ios-auth-btn-arrow" />
          </Link>

          <Link
            href={registerHref}
            className="ios-auth-btn ios-auth-btn--secondary"
            onClick={onClose}
          >
            <span>Ücretsiz Hesap Aç</span>
          </Link>

          <button
            type="button"
            className="ios-auth-btn ios-auth-btn--cancel"
            onClick={onClose}
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
