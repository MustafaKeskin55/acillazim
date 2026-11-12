'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  checkProfileCompleteness,
  MissingProfileField,
} from '@/services/api/ürapi';
import { IoWarningOutline, IoArrowForward, IoCloseCircleOutline } from 'react-icons/io5';
import './CreateListingGuard.css';

const CreateListing = () => {
  const router = useRouter();
  const [checking, setChecking] = useState<boolean>(true);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [missingFields, setMissingFields] = useState<MissingProfileField[]>([]);

  useEffect(() => {
    document.body.classList.add('ilan-ver-page');
    return () => {
      document.body.classList.remove('ilan-ver-page');
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const verifyProfile = async () => {
      try {
        setChecking(true);
        const result = await checkProfileCompleteness();
        if (!isMounted) return;

        if (!result.isComplete) {
          setIsBlocked(true);
          setMissingFields(result.missingFields);
          setChecking(false);
          return;
        }

        // Profil tam ise kategori seçimine yönlendir
        sessionStorage.setItem('selectedMainCategory', 'Ustalar ve Hizmetler');
        sessionStorage.setItem('selectedMainCategoryId', '12540');
        router.replace('/kategori-sec');
      } catch (error) {
        console.error('Profil kontrolü başarısız:', error);
        sessionStorage.setItem('selectedMainCategory', 'Ustalar ve Hizmetler');
        sessionStorage.setItem('selectedMainCategoryId', '12540');
        router.replace('/kategori-sec');
      }
    };

    verifyProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="create-listing-guard-overlay">
        <div className="create-listing-guard-card guard-loading-card">
          <div className="guard-spinner" />
          <p>Profil bilgileriniz kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="create-listing-guard-overlay">
        <div className="create-listing-guard-card">
          <div className="guard-icon-container">
            <IoWarningOutline />
          </div>

          <h2 className="guard-title">İlan Vermeden Önce Profilinizi Tamamlayın</h2>

          <p className="guard-description">
            Hizmet almak isteyen müşterilerin size güvenle ulaşabilmesi ve ilanınızın onaylanabilmesi için
            profilinizdeki zorunlu bilgilerin eksiksiz doldurulması gerekmektedir.
          </p>

          <div className="guard-missing-box">
            <div className="guard-missing-header">
              <IoCloseCircleOutline size={18} />
              <span>Eksik Zorunlu Bilgiler ({missingFields.length})</span>
            </div>
            <ul className="guard-missing-list">
              {missingFields.map((field) => (
                <li key={field.key} className="guard-missing-item">
                  <span className="guard-missing-bullet" />
                  <span>{field.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="guard-actions">
            <button
              type="button"
              className="guard-btn-secondary"
              onClick={() => router.push('/')}
            >
              Vazgeç / Ana Sayfa
            </button>
            <button
              type="button"
              className="guard-btn-primary"
              onClick={() => router.push('/dashboard/profil')}
            >
              <span>Profili Şimdi Tamamla</span>
              <IoArrowForward size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-listing-guard-overlay">
      <div className="create-listing-guard-card guard-loading-card">
        <div className="guard-spinner" />
        <p>Yönlendiriliyor...</p>
      </div>
    </div>
  );
};

export default CreateListing;
