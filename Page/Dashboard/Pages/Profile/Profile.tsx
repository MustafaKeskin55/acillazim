"use client";

import React, { useState, useEffect } from 'react';
import {
  FaCamera,
  FaUser,
  FaExclamationCircle,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaBriefcase,
  FaShieldAlt,
  FaLayerGroup
} from 'react-icons/fa';
import BasicInfo from './components/BasicInfo';
import Services from './components/Services';
import PasswordAndSecurity from '../PasswordAndSecurity/PasswordAndSecurity';
import ProfilePhotoModal from './components/ProfilePhotoModal';
import './Profile.css';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api/ürapi';

interface CurrentUser {
  name?: string;
  email?: string;
  phone?: string;
  picture?: string;
  profilePic?: string;
  [key: string]: unknown;
}

interface AuthContextValue {
  currentUser: CurrentUser | null;
}

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('basic-general');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [profileComplete, setProfileComplete] = useState<boolean>(true);
  const [profileSummary, setProfileSummary] = useState<{
    fullName: string;
    city: string;
    district: string;
    phone: string;
    email: string;
    companyName?: string;
    isCompany?: boolean;
    activityArea?: string;
    headline?: string;
    serviceAreas?: Array<{ categoryId: number; name: string; years: number }>;
    skillItems?: Array<{ id: number; name: string }>;
  } | null>(null);

  const { currentUser } = useAuth() as AuthContextValue;

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      try {
        const data = await api.fetchBasicInfo();
        if (!isMounted) return;
        setProfileSummary({
          fullName: data.fullName || currentUser?.name || 'Kullanıcı',
          city: data.address?.city || '',
          district: data.address?.district || '',
          phone: data.phone || currentUser?.phone || '',
          email: data.email || currentUser?.email || '',
          companyName: data.companyInfo?.companyName || '',
          isCompany: data.companyInfo?.isCompany || false,
          activityArea: data.companyInfo?.activityArea || '',
          headline: ((data as any).headline || '') as string,
          serviceAreas: ((data as any).serviceAreas || []) as any,
          skillItems: ((data as any).skillItems || []) as any,
        });

        // Zorunlu alan kontrolü
        const isComplete = Boolean(
          data.fullName &&
          data.phone &&
          data.address?.city &&
          data.address?.district
        );
        setProfileComplete(isComplete);
        if (data.profileImage) setProfileImage(String(data.profileImage));
        if (data.coverImage) setCoverImage(String(data.coverImage));
      } catch (e) {
        if (!isMounted) return;
        if (currentUser) {
          setProfileSummary({
            fullName: currentUser.name || 'Kullanıcı',
            city: '',
            district: '',
            phone: currentUser.phone || '',
            email: currentUser.email || '',
          });
        }
      }
    };

    fetchSummary();

    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const d = customEvent.detail;
        if (d.profileImage || d.picture || d.profilePicture) {
          setProfileImage(String(d.profileImage || d.picture || d.profilePicture));
        }
        if (d.coverImage) {
          setCoverImage(String(d.coverImage));
        }
        setProfileSummary((prev) =>
          prev
            ? {
                ...prev,
                fullName: d.fullName || d.name || prev.fullName,
                phone: d.phone || prev.phone,
                city: d.city || prev.city,
                district: d.district || prev.district,
                isCompany: d.isCompany !== undefined ? Boolean(d.isCompany) : prev.isCompany,
                headline: d.headline !== undefined ? d.headline : prev.headline,
                serviceAreas: d.serviceAreas !== undefined ? d.serviceAreas : prev.serviceAreas,
                skillItems: d.skillItems !== undefined ? d.skillItems : prev.skillItems,
              }
            : null
        );
      }
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    // URL parametresinden veya localStorage'dan gelen sekme kontrolü
    const handleSidebarTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.tab) {
        const tab = customEvent.detail.tab;
        setActiveTab(tab);
      }
    };

    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTab = urlParams.get('tab');
        const savedTab = urlTab || localStorage.getItem('activeProfileTab');
        if (savedTab) {
          setActiveTab(savedTab);
        }
      } catch (err) {
        // localStorage veya URL erişiminde hata olursa yut
      }

      window.addEventListener('profileTabChanged', handleSidebarTabChange);
    }

    return () => {
      isMounted = false;
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      if (typeof window !== 'undefined') {
        window.removeEventListener('profileTabChanged', handleSidebarTabChange);
      }
    };
  }, [currentUser]);

  const isBasicActive = activeTab.startsWith('basic');
  const isServicesActive = activeTab.startsWith('services');
  const isSecurityActive = activeTab.startsWith('security-');

  const getBasicSection = (tab: string): 'all' | 'general' | 'address' | 'corporate' | 'social' | 'bio' => {
    if (tab === 'basic-address') return 'address';
    if (tab === 'basic-corporate') return 'corporate';
    if (tab === 'basic-social') return 'social';
    if (tab === 'basic-bio') return 'bio';
    return 'general';
  };

  const getServicesSection = (tab: string): 'all' | 'areas' | 'skills' => {
    if (tab === 'services-areas') return 'areas';
    if (tab === 'services-skills') return 'skills';
    return 'all';
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeProfileTab', tab);
      window.dispatchEvent(
        new CustomEvent('profileTabChanged', {
          detail: { tab },
        })
      );
      const scrollEl = document.querySelector('.dashboard-content');
      if (scrollEl) {
        scrollEl.scrollTop = 0;
      } else {
        window.scrollTo(0, 0);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCoverImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="pf-profile-container">
      {/* TEK VE BÜTÜNLEŞİK KART (Üstte Profil Başlığı, Altta Form İçeriği - Çizgisiz Tek Gövde) */}
      <div className="pf-unified-card">
        {/* ÜST BLOK: Birleşik Profil Kimlik & Özet Kartı */}
        <div className="pf-user-header-card">
          <div
            className="pf-user-card-cover"
            style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
          >
            <button
              type="button"
              className="pf-cover-mini-btn"
              title="Kapak Fotoğrafı Değiştir"
              onClick={() => setIsPhotoModalOpen(true)}
            >
              <FaCamera size={12} />
              <span>Kapak</span>
            </button>
          </div>

          <div className="pf-user-card-body">
            <div className="pf-avatar-wrapper">
              {profileImage ? (
                <img src={profileImage} alt="Profil" className="pf-avatar-img" />
              ) : (
                <div className="pf-avatar-placeholder">
                  <FaUser size={34} />
                </div>
              )}
              <button
                type="button"
                className="pf-avatar-upload-badge"
                title="Profil fotoğrafını güncelle"
                onClick={() => setIsPhotoModalOpen(true)}
              >
                <FaCamera size={11} />
              </button>
            </div>

            <div className="pf-user-header-details">
              <div className="pf-user-primary-row">
                <div className="pf-user-primary-info">
                  <h2 className="pf-user-fullname">
                    {profileSummary?.fullName || currentUser?.name || 'Mustafa Keskin'}
                  </h2>
                  {profileSummary?.isCompany ? (
                    <span className="pf-badge pf-badge-company">
                      <FaCheckCircle size={11} />
                      <span>Kurumsal Hesap</span>
                    </span>
                  ) : (
                    <span className="pf-badge pf-badge-individual">
                      <FaShieldAlt size={11} />
                      <span>Bireysel Hesap</span>
                    </span>
                  )}
                </div>

                {profileSummary?.isCompany && profileSummary?.companyName ? (
                  <p className="pf-company-subtext">
                    <FaBriefcase size={11} />
                    <span>{profileSummary.companyName}</span>
                    {profileSummary.activityArea && <em>• {profileSummary.activityArea}</em>}
                  </p>
                ) : null}
              </div>

              <div className="pf-user-quick-list">
                {profileSummary?.phone && (
                  <div className="pf-quick-item">
                    <FaPhoneAlt size={14} className="pf-quick-icon" />
                    <span>{profileSummary.phone}</span>
                  </div>
                )}
                {profileSummary?.email && (
                  <div className="pf-quick-item">
                    <FaEnvelope size={14} className="pf-quick-icon" />
                    <span>{profileSummary.email}</span>
                  </div>
                )}
                {profileSummary?.city && (
                  <div className="pf-quick-item">
                    <FaMapMarkerAlt size={14} className="pf-quick-icon" />
                    <span>{profileSummary.city}{profileSummary.district ? ` / ${profileSummary.district}` : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ALT BLOK: Dinamik İçerik Alanı (Form ve Ayarlar - Çizgisiz Bütünleşik) */}
        <main className="pf-main-column">
          <div className="pf-profile-content-area">
            {!profileComplete && (
              <div className="pf-incomplete-banner">
                <FaExclamationCircle size={18} className="pf-incomplete-icon" />
                <div className="pf-incomplete-text">
                  <strong>Profil bilgileriniz henüz tamamlanmadı</strong>
                  <p>Müşterilerinizin size güvenle ulaşabilmesi ve ilanlarınızın onaylanabilmesi için lütfen telefon, şehir ve adres bilgilerinizi eksiksiz doldurun.</p>
                </div>
              </div>
            )}

            {isBasicActive && (
              <BasicInfo currentUser={currentUser} activeSection={getBasicSection(activeTab)} />
            )}
            {isServicesActive && (
              <Services activeSection={getServicesSection(activeTab)} />
            )}
            {activeTab === 'security-password' && (
              <PasswordAndSecurity activeSubTab="password" hideHeroHeader hideHeaderTabs />
            )}
            {activeTab === 'security-email' && (
              <PasswordAndSecurity activeSubTab="email" hideHeroHeader hideHeaderTabs />
            )}
            {activeTab === 'security-questions' && (
              <PasswordAndSecurity activeSubTab="security" hideHeroHeader hideHeaderTabs />
            )}
            {activeTab === 'security-2fa' && (
              <PasswordAndSecurity activeSubTab="verification" hideHeroHeader hideHeaderTabs />
            )}
          </div>
        </main>
      </div>

      {/* Profil ve Kapak Fotoğrafı Modalı (Kurumsal Tasarım Kurallarına Uygun) */}
      <ProfilePhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        currentProfileImage={profileImage}
        currentCoverImage={coverImage}
        onSuccess={(newAvatarUrl, newCoverUrl) => {
          if (newAvatarUrl) setProfileImage(newAvatarUrl);
          if (newCoverUrl) setCoverImage(newCoverUrl);
        }}
      />
    </div>
  );
};

export default Profile;
