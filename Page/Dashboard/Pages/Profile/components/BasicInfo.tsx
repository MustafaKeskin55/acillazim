"use client";

import React, { useState, useEffect } from 'react';
import './BasicInfo.css';
import {
  FaLinkedin,
  FaGithub,
  FaGlobe,
  FaBehance,
  FaDribbble,
  FaMedium,
  FaYoutube,
  FaInstagram,
  FaPlus,
  FaMinus,
  FaFigma,
  FaPinterest,
  FaCodepen,
  FaCheck,
  FaCheckCircle,
  FaSpinner
} from 'react-icons/fa';
import api from '@/services/api/ürapi';
import authService from '@/services/auth/authService';
import Loader from '@/components/Loader/Loader';
import { useAuth } from '@/context/AuthContext';
import locationService from '@/services/location/locationService';
import ilIlceJson from '@/data/ililcebilgileri.json';
import CustomDatePicker from './DatePicker/CustomDatePicker';

const ilIlceDataMap: Record<string, string[]> = ilIlceJson as Record<string, string[]>;

/** 81 il ve ilçeleri derlenmiş haritadan anında (0ms) yükler */
const fetchCityData = (): Record<string, string[]> => {
  return ilIlceDataMap;
};

interface BasicInfoUser {
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

export type BasicInfoSection = 'all' | 'general' | 'address' | 'corporate' | 'social' | 'bio';

interface BasicInfoProps {
  currentUser?: BasicInfoUser | null;
  activeSection?: BasicInfoSection;
}

const BasicInfo: React.FC<BasicInfoProps> = ({ currentUser: userFromProps, activeSection = 'all' }) => {
  const { currentUser: authUser } = useAuth();
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [cities, setCities] = useState<Record<string, string[]>>({});
  const [selectedCity, setSelectedCity] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState({ show: false, type: '', message: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const isAll = activeSection === 'all';
  const showGeneral = isAll || activeSection === 'general';
  const showAddress = isAll || activeSection === 'address';
  const showCorporate = isAll || activeSection === 'corporate';
  const showSocial = isAll || activeSection === 'social';
  const showBio = isAll || activeSection === 'bio';

  // Props'tan veya AuthContext'ten gelen kullanıcı bilgisi
  const currentUser = userFromProps || authUser;

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    birthDate: '',
    address: '',
    city: '',
    district: '',
    neighborhood: '',
    bio: '',
    companyInfo: {
      isCompany: false,
      companyType: '',
      companyName: '',
      activityArea: '',
      taxOffice: '',
      taxNumber: '',
      identityNumber: ''
    },
    socialMedia: {
      linkedin: '',
      website: '',
      instagram: '',
      behance: '',
      dribbble: '',
      medium: '',
      youtube: '',
      github: '',
      figma: '',
      pinterest: '',
      codepen: ''
    }
  });

  // İşletme türleri ve faaliyet alanları (Veritabanından dinamik API ile çekilir, kodda statik veri tutulmaz)
  const [companyTypes, setCompanyTypes] = useState<string[]>([]);
  const [activityAreas, setActivityAreas] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || String(currentUser.name || ''),
        email: String(currentUser.email || prev.email || ''),
        phone: String(currentUser.phone || prev.phone || '')
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        const cityData = await fetchCityData();
        if (!isMounted) return;
        setCities(cityData);

        // Veritabanından şirket türleri ve faaliyet alanlarını dinamik çek
        try {
          const [btRes, aaRes] = await Promise.all([
            fetch('/api/v1/mobile/corporate/business-types'),
            fetch('/api/v1/mobile/corporate/activity-areas')
          ]);
          if (btRes.ok) {
            const btJson = await btRes.json();
            if (btJson?.data && Array.isArray(btJson.data) && isMounted) {
              setCompanyTypes(btJson.data.map((item: any) => item.name).filter(Boolean));
            }
          }
          if (aaRes.ok) {
            const aaJson = await aaRes.json();
            if (aaJson?.data && Array.isArray(aaJson.data) && isMounted) {
              setActivityAreas(aaJson.data.map((item: any) => item.name).filter(Boolean));
            }
          }
        } catch (err) {
          console.error('Dinamik kurumsal listeler yüklenirken hata:', err);
        }

        let userData: any = {};
        try {
          const response = await api.fetchBasicInfo();
          if (response) {
            userData = response;
          }
        } catch (error) {
          console.log('API verisi alınamadı, mevcut kullanıcı verileri kullanılacak');
        }

        if (currentUser) {
          userData = {
            ...userData,
            fullName: userData.fullName || currentUser?.name || '',
            email: userData.email || currentUser?.email || '',
            phone: userData.phone || currentUser?.phone || '',
          };
        }

        const rawCity = userData.address?.city || '';
        const rawDistrict = userData.address?.district || '';
        const rawNeighborhood = userData.address?.neighborhood || '';

        // Şehir adını listede eşleştir (büyük/küçük harf toleranslı)
        const matchedCity = Object.keys(cityData).find(
          c => c.localeCompare(rawCity, 'tr-TR', { sensitivity: 'accent' }) === 0
        ) || rawCity;

        const cityDistricts = cityData[matchedCity] || [];
        const matchedDistrict = cityDistricts.find(
          d => d.localeCompare(rawDistrict, 'tr-TR', { sensitivity: 'accent' }) === 0
        ) || rawDistrict;

        const rawBirth = String((userData as any).birthDate || userData.personalInfo?.birthDate || '');
        const formattedBirth = rawBirth.includes('T') ? rawBirth.split('T')[0] : (rawBirth.length >= 10 ? rawBirth.substring(0, 10) : rawBirth);

        setFormData({
          fullName: userData.fullName || '',
          phone: userData.phone || '',
          email: userData.email || '',
          birthDate: formattedBirth,
          address: userData.address?.fullAddress || '',
          city: matchedCity,
          district: matchedDistrict,
          neighborhood: rawNeighborhood,
          bio: userData.additionalInfo?.bio || '',
          companyInfo: {
            isCompany: userData.companyInfo?.isCompany || false,
            companyType: userData.companyInfo?.companyType || '',
            companyName: userData.companyInfo?.companyName || '',
            activityArea: userData.companyInfo?.activityArea || '',
            taxOffice: userData.companyInfo?.taxOffice || '',
            taxNumber: userData.companyInfo?.taxNumber || '',
            identityNumber: userData.companyInfo?.identityNumber || ''
          },
          socialMedia: {
            linkedin: userData.socialMedia?.linkedin || '',
            website: userData.website || '',
            instagram: userData.socialMedia?.instagram || '',
            behance: userData.socialMedia?.behance || '',
            dribbble: userData.socialMedia?.dribbble || '',
            medium: userData.socialMedia?.medium || '',
            youtube: userData.socialMedia?.youtube || '',
            github: userData.socialMedia?.github || '',
            figma: userData.socialMedia?.figma || '',
            pinterest: userData.socialMedia?.pinterest || '',
            codepen: userData.socialMedia?.codepen || ''
          }
        });

        if (matchedCity) {
          setSelectedCity(matchedCity);
          setDistricts(cityDistricts);
        }

        if (rawNeighborhood) {
          setNeighborhoods([rawNeighborhood]);
        }

        if (userData.fullName) {
          authService.updateCurrentUserProfile({
            fullName: userData.fullName,
            name: userData.fullName,
            phone: userData.phone,
            city: matchedCity,
            district: matchedDistrict,
          });
        }
      } catch (error) {
        console.error('Load Data Error:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  // İlçe değiştiğinde mahalleleri yükle (mevcut kayıtlı mahalle silinmeden güncellenir)
  useEffect(() => {
    let cancelled = false;
    const loadNeighborhoods = async () => {
      if (!formData.city || !formData.district) {
        setNeighborhoods([]);
        return;
      }
      try {
        const provs = (await locationService.getProvinces()) as Array<{ id: string | number; name: string }>;
        const cityObj = provs.find(p => p.name === formData.city || p.name.toUpperCase() === formData.city.toUpperCase());
        if (!cityObj) return;
        const dists = (await locationService.getDistricts(cityObj.id)) as Array<{ id: string | number; name: string }>;
        const distObj = dists.find(d => d.name === formData.district || d.name.toUpperCase() === formData.district.toUpperCase());
        if (!distObj) return;
        const nhs = (await locationService.getNeighborhoods(distObj.id)) as Array<{ name: string }>;
        if (!cancelled && nhs && nhs.length > 0) {
          const names = nhs.map(n => n.name);
          // Eğer kullanıcının kayıtlı mahallesi listede yoksa bile onu en başa ekleyerek koru
          if (formData.neighborhood && !names.includes(formData.neighborhood)) {
            names.unshift(formData.neighborhood);
          }
          setNeighborhoods(names);
        }
      } catch (err) {
        console.warn('Mahalleler yüklenemedi:', err);
      }
    };
    loadNeighborhoods();
    return () => { cancelled = true; };
  }, [formData.city, formData.district]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'city') {
      setSelectedCity(value);
      const newDistricts = cities[value] || [];
      setDistricts(newDistricts);
      setFormData(prev => ({
        ...prev,
        city: value,
        district: '', // Sadece kullanıcı elle yeni il seçtiğinde ilçe ve mahalle sıfırlanır
        neighborhood: ''
      }));
      setNeighborhoods([]);
      return;
    }
    if (name === 'district') {
      setFormData(prev => ({
        ...prev,
        district: value,
        neighborhood: '' // İlçe değişirse mahalle sıfırlanır
      }));
      return;
    }
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus({ show: true, type: 'loading', message: 'Bilgiler kaydediliyor...' });

    try {
      const submitData: any = {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        address: {
          fullAddress: formData.address,
          city: formData.city,
          district: formData.district,
          neighborhood: formData.neighborhood,
        },
        birthDate: formData.birthDate,
        addressText: formData.address,
        city: formData.city,
        district: formData.district,
        neighborhood: formData.neighborhood,
        website: formData.socialMedia.website,
        bio: formData.bio,
        socialMedia: {
          linkedin: formData.socialMedia.linkedin,
          instagram: formData.socialMedia.instagram,
          github: formData.socialMedia.github,
          behance: formData.socialMedia.behance,
          dribbble: formData.socialMedia.dribbble,
          medium: formData.socialMedia.medium,
          youtube: formData.socialMedia.youtube,
          figma: formData.socialMedia.figma,
          pinterest: formData.socialMedia.pinterest,
          codepen: formData.socialMedia.codepen
        },
        personalInfo: {
          birthDate: formData.birthDate
        },
        additionalInfo: {
          bio: formData.bio
        },
        companyInfo: {
          isCompany: formData.companyInfo.isCompany,
          companyType: formData.companyInfo.companyType,
          companyName: formData.companyInfo.companyName,
          activityArea: formData.companyInfo.activityArea,
          taxOffice: formData.companyInfo.taxOffice,
          taxNumber: formData.companyInfo.taxNumber,
          identityNumber: formData.companyInfo.identityNumber
        }
      };

      const response = await api.saveBasicInfo(submitData);
      if (response.success) {
        setSaveStatus({
          show: true,
          type: 'success',
          message: response.message || 'Profil bilgileriniz başarıyla güncellendi.'
        });
        try {
          authService.updateCurrentUserProfile({
            name: submitData.fullName,
            fullName: submitData.fullName,
            phone: submitData.phone,
            city: submitData.city,
            district: submitData.district,
          });
          window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: submitData }));
        } catch (e) {
          console.warn('Profile sync event dispatch error:', e);
        }
      }

      setTimeout(() => {
        setSaveStatus({ show: false, type: '', message: '' });
      }, 4000);
    } catch (error: any) {
      setSaveStatus({
        show: true,
        type: 'error',
        message: error.message || 'Bilgiler kaydedilirken bir hata oluştu.'
      });
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  // 6 Temel platform (3x2 ızgara) + genişletilebilir olanlar (daha fazla)
  const primarySocialPlatforms = [
    { id: 'linkedin', icon: <FaLinkedin />, label: 'LinkedIn', hint: 'Profesyonel iş ağı', placeholder: 'https://linkedin.com/in/kullaniciadiniz', color: '#0A66C2', bg: 'rgba(10, 102, 194, 0.1)' },
    { id: 'website', icon: <FaGlobe />, label: 'Kişisel Website', hint: 'Kurumsal / portfolyo siteniz', placeholder: 'https://ornekwebsiteniz.com', color: '#0d9488', bg: 'rgba(13, 148, 136, 0.1)' },
    { id: 'instagram', icon: <FaInstagram />, label: 'Instagram', hint: 'Görsel vitrin & referanslar', placeholder: 'https://instagram.com/kullaniciadiniz', color: '#E1306C', bg: 'rgba(225, 48, 108, 0.1)' },
    { id: 'github', icon: <FaGithub />, label: 'GitHub', hint: 'Yazılım & kod projeleri', placeholder: 'https://github.com/kullaniciadiniz', color: '#1e293b', bg: 'rgba(30, 41, 59, 0.1)' },
    { id: 'youtube', icon: <FaYoutube />, label: 'YouTube', hint: 'Video tanıtım & kanal', placeholder: 'https://youtube.com/@kanaliniz', color: '#FF0000', bg: 'rgba(255, 0, 0, 0.1)' },
    { id: 'behance', icon: <FaBehance />, label: 'Behance', hint: 'Tasarım portfolyosu', placeholder: 'https://behance.net/profiliniz', color: '#1769FF', bg: 'rgba(23, 105, 255, 0.1)' },
  ];

  const extendedSocialPlatforms = [
    { id: 'dribbble', icon: <FaDribbble />, label: 'Dribbble', hint: 'UI/UX vitrini', placeholder: 'https://dribbble.com/profiliniz', color: '#EA4C89', bg: 'rgba(234, 76, 137, 0.1)' },
    { id: 'figma', icon: <FaFigma />, label: 'Figma', hint: 'Tasarım sistemleri', placeholder: 'https://figma.com/@profiliniz', color: '#F24E1E', bg: 'rgba(242, 78, 30, 0.1)' },
    { id: 'medium', icon: <FaMedium />, label: 'Medium', hint: 'Makale & blog yazıları', placeholder: 'https://medium.com/@profiliniz', color: '#00AB6C', bg: 'rgba(0, 171, 108, 0.1)' },
    { id: 'pinterest', icon: <FaPinterest />, label: 'Pinterest', hint: 'İlham & koleksiyon panoları', placeholder: 'https://pinterest.com/profiliniz', color: '#E60023', bg: 'rgba(230, 0, 35, 0.1)' },
    { id: 'codepen', icon: <FaCodepen />, label: 'CodePen', hint: 'Canlı kod demoları', placeholder: 'https://codepen.io/profiliniz', color: '#0f172a', bg: 'rgba(15, 23, 42, 0.1)' }
  ];

  const visibleSocialPlatforms = showAllPlatforms
    ? [...primarySocialPlatforms, ...extendedSocialPlatforms]
    : primarySocialPlatforms;

  const filledSocialCount = Object.values(formData.socialMedia || {}).filter(
    (v) => typeof v === 'string' && v.trim().length > 0
  ).length;

  return (
    <div className="bi-basic-info-container">
      <form onSubmit={handleSubmit} className="bi-basic-info-form">

        {/* Bölüm 1: Kişisel Bilgiler */}
        {showGeneral && (
          <div className={`bi-section-card bi-fade-in ${isDatePickerOpen ? 'bi-section-card--popover-open' : ''}`}>
            <div className="bi-section-header">
              <h2 className="bi-section-title">Kişisel Bilgiler</h2>
              <p className="bi-section-subtitle">Hesap sahibinin temel iletişim ve kimlik bilgileri</p>
            </div>

            <div className="bi-form-grid">
              <div className="bi-form-group">
                <label htmlFor="bi-fullName">
                  Ad Soyad <span className="bi-required">*</span>
                </label>
                <input
                  id="bi-fullName"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Örn. Ahmet Yılmaz"
                  required
                />
              </div>

              <div className="bi-form-group">
                <label htmlFor="bi-phone">
                  Telefon Numarası <span className="bi-required">*</span>
                </label>
                <input
                  id="bi-phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="05XX XXX XX XX"
                  required
                />
              </div>

              <div className="bi-form-group">
                <div className="bi-label-header">
                  <label htmlFor="bi-email">
                    E-posta Adresi <span className="bi-required">*</span>
                  </label>
                  <span className="bi-verified-pill" title="Sistem girişi ve bildirimler için onaylanmış e-posta">
                    <FaCheckCircle size={10} />
                    <span>Doğrulandı</span>
                  </span>
                </div>
                <input
                  id="bi-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ornek@acillazım.net"
                  disabled
                  title="E-posta adresi güvenlik nedeniyle buradan değiştirilemez"
                />
                <span className="bi-field-hint">Giriş için kullanılan onaylı e-posta adresiniz.</span>
              </div>

              <div className="bi-form-group">
                <label htmlFor="bi-birthDate">Doğum Tarihi</label>
                <CustomDatePicker
                  id="bi-birthDate"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={(val) => setFormData((prev) => ({ ...prev, birthDate: val }))}
                  placeholder="GG.AA.YYYY"
                  onOpenChange={setIsDatePickerOpen}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bölüm 2: Konum ve Adres Bilgileri */}
        {showAddress && (
          <div className="bi-section-card bi-fade-in">
            <div className="bi-section-header">
              <h2 className="bi-section-title">Adres ve Hizmet Konumu</h2>
              <p className="bi-section-subtitle">Hizmet sunduğunuz veya ikamet ettiğiniz bölge detayları</p>
            </div>

            <div className="bi-form-grid bi-form-grid-3">
              <div className="bi-form-group">
                <label htmlFor="bi-city">
                  İl / Şehir <span className="bi-required">*</span>
                </label>
                <select
                  id="bi-city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="bi-select"
                  required
                >
                  <option value="">İl seçiniz</option>
                  {Object.keys(cities).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bi-form-group">
                <label htmlFor="bi-district">
                  İlçe <span className="bi-required">*</span>
                </label>
                <select
                  id="bi-district"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  className="bi-select"
                  disabled={!formData.city}
                  required
                >
                  <option value="">İlçe seçiniz</option>
                  {formData.district && !districts.includes(formData.district) && (
                    <option value={formData.district}>{formData.district}</option>
                  )}
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bi-form-group">
                <label htmlFor="bi-neighborhood">Mahalle</label>
                <select
                  id="bi-neighborhood"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  className="bi-select"
                  disabled={!formData.district}
                >
                  <option value="">Mahalle seçiniz</option>
                  {formData.neighborhood && !neighborhoods.includes(formData.neighborhood) && (
                    <option value={formData.neighborhood}>{formData.neighborhood}</option>
                  )}
                  {neighborhoods.map((nh) => (
                    <option key={nh} value={nh}>
                      {nh}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bi-form-group bi-full-width">
                <label htmlFor="bi-address">Açık Adres (Cadde, Sokak, Bina No)</label>
                <textarea
                  id="bi-address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Örn. Atatürk Mah. İnönü Cad. No: 12 Daire: 4"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bölüm 3: Kurumsal & İşletme Bilgileri */}
        {showCorporate && (
          <div className="bi-section-card bi-fade-in">
            <div className="bi-corporate-switch-box">
              <div className="bi-corporate-switch-text">
                <span className="bi-switch-title">Kurumsal Hizmet Veren / Usta Hesabı</span>
                <p className="bi-switch-desc">
                  Vergi mükellefi, şahıs şirketi veya ticari işletme olarak ilan verip fatura kesiyorsanız bu alanı aktifleştirin.
                </p>
              </div>
              <label className="bi-switch" htmlFor="bi-corporate-toggle">
                <input
                  id="bi-corporate-toggle"
                  type="checkbox"
                  checked={formData.companyInfo.isCompany}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setFormData(prev => ({
                      ...prev,
                      companyInfo: {
                        ...prev.companyInfo,
                        isCompany: isChecked
                      }
                    }));
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
                        detail: { isCompany: isChecked }
                      }));
                    }
                  }}
                />
                <span className="bi-slider" />
              </label>
            </div>

            {formData.companyInfo.isCompany && (
              <div className="bi-form-grid bi-corporate-grid">
                <div className="bi-form-group">
                  <label htmlFor="bi-companyType">İşletme Türü</label>
                  <select
                    id="bi-companyType"
                    name="companyInfo.companyType"
                    value={formData.companyInfo.companyType}
                    onChange={handleChange}
                    className="bi-select"
                  >
                    <option value="">İşletme türü seçiniz</option>
                    {companyTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="bi-form-group">
                  <label htmlFor="bi-companyName">Firma / Tabela Ünvanı</label>
                  <input
                    id="bi-companyName"
                    type="text"
                    name="companyInfo.companyName"
                    value={formData.companyInfo.companyName}
                    onChange={handleChange}
                    placeholder="Örn. Yılmaz Sıhhi Tesisat"
                  />
                </div>

                <div className="bi-form-group">
                  <label htmlFor="bi-activityArea">Faaliyet Alanı</label>
                  <select
                    id="bi-activityArea"
                    name="companyInfo.activityArea"
                    value={formData.companyInfo.activityArea}
                    onChange={handleChange}
                    className="bi-select"
                  >
                    <option value="">Faaliyet alanı seçiniz</option>
                    {activityAreas.map((area) => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                <div className="bi-form-group">
                  <label htmlFor="bi-taxOffice">Vergi Dairesi</label>
                  <input
                    id="bi-taxOffice"
                    type="text"
                    name="companyInfo.taxOffice"
                    value={formData.companyInfo.taxOffice}
                    onChange={handleChange}
                    placeholder="Örn. Kadıköy Vergi Dairesi"
                  />
                </div>

                {formData.companyInfo.companyType === "Şahıs Şirketi" || formData.companyInfo.companyType === "Serbest Meslek Sahibi" ? (
                  <div className="bi-form-group">
                    <label htmlFor="bi-identityNumber">T.C. Kimlik Numarası</label>
                    <input
                      id="bi-identityNumber"
                      type="text"
                      name="companyInfo.identityNumber"
                      value={formData.companyInfo.identityNumber}
                      onChange={handleChange}
                      maxLength={11}
                      placeholder="11 haneli T.C. Kimlik No"
                    />
                  </div>
                ) : (
                  <div className="bi-form-group">
                    <label htmlFor="bi-taxNumber">Vergi Kimlik Numarası (VKN)</label>
                    <input
                      id="bi-taxNumber"
                      type="text"
                      name="companyInfo.taxNumber"
                      value={formData.companyInfo.taxNumber}
                      onChange={handleChange}
                      maxLength={10}
                      placeholder="10 haneli VKN"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bölüm 4: Sosyal Medya & Web Siteleri */}
        {showSocial && (
          <div className="bi-section-card bi-social-section-card bi-fade-in">
            <div className="bi-section-header bi-social-section-header">
              <div className="bi-social-header-copy">
                <h2 className="bi-section-title">Sosyal Medya ve Web Siteleri</h2>
                <p className="bi-section-subtitle">Müşterilerinizin güvenini artıracak sosyal ağ ve portfolyo profilleriniz</p>
              </div>
            </div>

            <div className="bi-social-grid">
              {visibleSocialPlatforms.map((platform) => {
                const rawValue = (formData.socialMedia as any)?.[platform.id] || '';
                const isFilled = Boolean(String(rawValue).trim());
                return (
                  <div
                    className={`bi-social-item ${isFilled ? 'bi-social-item--filled' : ''}`}
                    key={platform.id}
                    style={
                      {
                        '--platform-color': platform.color,
                        '--platform-bg': platform.bg,
                      } as React.CSSProperties
                    }
                  >
                    <label htmlFor={`bi-social-${platform.id}`} className="bi-social-label">
                      {platform.label}
                    </label>
                    <div className="bi-input-with-icon">
                      <span className="bi-social-icon-wrapper" aria-hidden="true">
                        {platform.icon}
                      </span>
                      <input
                        id={`bi-social-${platform.id}`}
                        type="url"
                        name={`socialMedia.${platform.id}`}
                        value={rawValue}
                        onChange={handleChange}
                        placeholder={platform.placeholder}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bi-social-actions">
              <button
                type="button"
                className="bi-toggle-platforms-button"
                onClick={() => setShowAllPlatforms(!showAllPlatforms)}
              >
                {showAllPlatforms ? (
                  <>
                    <span className="bi-toggle-icon"><FaMinus size={10} /></span>
                    <span>Daha Az Platform Göster</span>
                  </>
                ) : (
                  <>
                    <span className="bi-toggle-icon"><FaPlus size={10} /></span>
                    <span>Daha Fazla Platform Göster</span>
                    <span className="bi-toggle-count">+{extendedSocialPlatforms.length}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Bölüm 5: Hakkımda (Bio) */}
        {showBio && (
          <div className="bi-section-card bi-fade-in">
            <div className="bi-section-header">
              <h2 className="bi-section-title">Hakkımda</h2>
              <p className="bi-section-subtitle">Kendinizi, tecrübelerinizi ve verdiğiniz hizmetlerin kalitesini kısaca tanıtın</p>
            </div>

            <div className="bi-form-group bi-full-width">
              <textarea
                id="bi-bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Kendinizi tanıtın"
                rows={4}
                maxLength={800}
              />
              <div className="bi-char-counter">
                {(formData.bio || '').length}/800
              </div>
            </div>
          </div>
        )}

        {/* Form Aksiyon Çubuğu (Kaydet Butonu) */}
        <div className="bi-actions-bar">
          <div className="bi-actions-inner">
            <p className="bi-actions-hint">Değişikliklerin kaydedilmesi için lütfen butona tıklayın.</p>
            <button
              type="submit"
              className="bi-save-button"
              disabled={saveStatus.type === 'loading'}
            >
              {saveStatus.type === 'loading' ? (
                <>
                  <FaSpinner className="bi-spinner" size={14} />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <FaCheck size={14} />
                  <span>Değişiklikleri Kaydet</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bildirim Durumu Toast */}
        {saveStatus.show && (
          <div className={`bi-save-status ${saveStatus.type}`} role="status">
            <span>{saveStatus.message}</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default BasicInfo;
