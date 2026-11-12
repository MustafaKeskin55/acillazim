"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './ErrorMessage.css';

interface ErrorMessageProps {
  type?: 'error' | 'not-found' | 'server-error' | 'maintenance' | 'unauthorized' | 'forbidden' | 'product-not-found';
  message?: string;
  initialCountdown?: number;
  onCountdownEnd?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ type = 'error', message, initialCountdown = 5, onCountdownEnd }) => {
  const router = useRouter();
  const [countdown, setCountdown] = useState(initialCountdown);
  
  const errorInfo = {
    'error': {
      emoji: '😢',
      title: 'Bir Sorun Oluştu',
      defaultMessage: 'İşleminiz sırasında beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin veya site yöneticisiyle iletişime geçin.'
    },
    'not-found': {
      emoji: '😕',
      title: 'Sayfa Bulunamadı',
      defaultMessage: 'Aradığınız sayfa mevcut değil veya kaldırılmış olabilir.'
    },
    'server-error': {
      emoji: '🔧',
      title: 'Sunucu Hatası',
      defaultMessage: 'Sunucuda beklenmeyen bir hata oluştu. Teknik ekibimiz sorun üzerinde çalışıyor. Lütfen daha sonra tekrar deneyin.'
    },
    'maintenance': {
      emoji: '🛠️',
      title: 'Bakım Çalışması',
      defaultMessage: 'Şu anda planlı bir bakım çalışması yapılmaktadır. Kısa süre içinde hizmet vermeye devam edeceğiz.'
    },
    'unauthorized': {
      emoji: '🔒',
      title: 'Giriş Yapmanız Gerekiyor',
      defaultMessage: 'Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.'
    },
    'forbidden': {
      emoji: '⛔',
      title: 'Erişim Engellendi',
      defaultMessage: 'Bu sayfaya erişim yetkiniz bulunmuyor.'
    },
    'product-not-found': {
      emoji: '🔍',
      title: 'Ürün Bulunamadı',
      defaultMessage: 'Aradığınız ürün mevcut değil veya kaldırılmış olabilir.'
    }
  };
  
  const { emoji, title, defaultMessage } = errorInfo[type] || errorInfo['error'];
  
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    
    if (initialCountdown > 0) {
      timer = setInterval(() => {
        setCountdown(prevCount => {
          if (prevCount <= 1) {
            clearInterval(timer);
            
            if (typeof onCountdownEnd === 'function') {
              onCountdownEnd();
            } else {
              router.push('/');
            }
            return 0;
          }
          return prevCount - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [router, onCountdownEnd, initialCountdown]);
  
  return (
    <div className={`error-message ${type}`}>
      <div className="error-emoji">{emoji}</div>
      <h2>{title}</h2>
      <p>{message || defaultMessage}</p>
      {initialCountdown > 0 && (
        <div className="error-redirect-message">
          {countdown} saniye içinde ana sayfaya yönlendirileceksiniz...
        </div>
      )}
    </div>
  );
};

export default ErrorMessage;
