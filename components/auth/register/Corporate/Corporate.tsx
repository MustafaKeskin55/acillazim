"use client";

import React, { useState, useEffect } from 'react';
import './Corporate.css';
import ErrorModal from '@/components/common/ErrorModal';
import ContractModal from '@/components/common/ContractModal';
import styles from './CorporateRegisterButton.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import locationService from '@/services/location/locationService';
import { RECAPTCHA } from '@/config/constants';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  companyName: string;
  province: string;
  district: string;
  neighborhood: string;
  businessType: string;
  taxOffice: string;
  taxNumber: string;
  identityNumber: string;
  activityArea: string;
  address: string;
}

interface PasswordRules {
  length: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

const BUSINESS_TYPES = [
  { type: 'TC', options: ['Şahıs Şirketi', 'Serbest Meslek Sahibi'] },
  { type: 'VKN', options: ['Limited Şirket (Ltd. Şti.)', 'Anonim Şirket (A.Ş.)', 'Kooperatif'] },
];

const ACTIVITY_AREAS = [
  'Ticaret ve Perakende', 'Üretim ve Sanayi', 'Hizmet Sektörü', 'İnşaat ve Emlak',
  'Tarım, Hayvancılık ve Gıda', 'Bilişim ve Teknoloji', 'Sağlık ve Medikal',
  'Eğitim ve Kültür', 'Enerji ve Çevre',
];

const formatPhoneNumber = (number: string): string => {
  const cleaned = number.replace(/^0+/, '');
  if (cleaned.startsWith('5')) return cleaned.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '0$1 $2 $3 $4');
  return cleaned;
};

const isValidPhoneNumber = (number: string): boolean => {
  const withoutZero = number.replace(/\D/g, '').replace(/^0+/, '');
  return /^5[0-9]{9}$/.test(withoutZero);
};

const validateTCKN = (tckn: string): boolean => {
  if (!tckn || tckn.length !== 11 || tckn[0] === '0') return false;
  const digits = tckn.split('').map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const digit10 = (oddSum * 7 - evenSum) % 10;
  if (digit10 !== digits[9]) return false;
  const digit11 = digits.slice(0, 10).reduce((s, n) => s + n, 0) % 10;
  return digit11 === digits[10];
};

declare global {
  interface Window {
    grecaptcha?: { render: (id: string, opts: Record<string, string>) => void; getResponse: () => string; };
  }
}

const Corporate: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '',
    companyName: '', province: '', district: '', neighborhood: '', businessType: '',
    taxOffice: '', taxNumber: '', identityNumber: '', activityArea: '', address: '',
  });
  const [showPassword, setShowPassword] = useState({ password: false, confirmPassword: false });
  const [passwordRules, setPasswordRules] = useState<PasswordRules>({ length: false, uppercase: false, number: false, special: false });
  const [showPasswordFeedback, setShowPasswordFeedback] = useState<boolean>(true);
  const [passwordMatch, setPasswordMatch] = useState({ isMatching: false, isDirty: false });
  const [errors, setErrors] = useState<string[]>([]);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [showContractModal, setShowContractModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showMarketingModal, setShowMarketingModal] = useState<boolean>(false);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [taxOffices, setTaxOffices] = useState<string[]>([]);
  const [tcknError, setTcknError] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<{ address: string }>({ address: '' });

  useEffect(() => {
    (async () => {
      try {
        const cities = await locationService.getProvinces() as Array<{ name: string }>;
        setProvinces(cities.map((c) => c.name));
      } catch { console.error('İller yüklenirken hata'); }
    })();
  }, []);

  useEffect(() => {
    if (!document.querySelector('script[src*="recaptcha/api.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true; script.defer = true;
      script.onload = () => setTimeout(() => {
        if (window.grecaptcha) window.grecaptcha.render('recaptcha-container-corporate', { sitekey: RECAPTCHA.SITE_KEY });
      }, 500);
      document.head.appendChild(script);
    }
  }, []);

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedProvince = e.target.value;
    setFormData((prev) => ({ ...prev, province: selectedProvince, district: '', neighborhood: '', taxOffice: '' }));
    try {
      const cities = await locationService.getProvinces() as Array<{ id: string; name: string }>;
      const selectedCity = cities.find((c) => c.name === selectedProvince);
      if (selectedCity) {
        const d = await locationService.getDistricts(selectedCity.id) as Array<{ name: string }>;
        setDistricts(d.map((x) => x.name));
        const upperProvince = selectedProvince.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
        const taxResponse = await fetch('/vergi_daireleri.json');
        const taxData = await taxResponse.json() as Record<string, string[]>;
        setTaxOffices((taxData[upperProvince] || []).sort());
      } else setDistricts([]);
      setNeighborhoods([]);
    } catch { setDistricts([]); setNeighborhoods([]); setTaxOffices([]); }
  };

  const handleDistrictChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDistrict = e.target.value;
    setFormData((prev) => ({ ...prev, district: selectedDistrict, neighborhood: '' }));
    try {
      const cities = await locationService.getProvinces() as Array<{ id: string; name: string }>;
      const selectedCity = cities.find((c) => c.name === formData.province);
      if (!selectedCity) return;
      const districtsData = await locationService.getDistricts(selectedCity.id) as Array<{ id: string; name: string }>;
      const districtData = districtsData.find((d) => d.name === selectedDistrict);
      if (districtData) {
        const settlements = await locationService.getNeighborhoods(districtData.id) as Array<{ name: string }>;
        setNeighborhoods(settlements.map((s) => s.name));
      } else setNeighborhoods([]);
    } catch { setNeighborhoods([]); }
  };

  const handleBusinessTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedType = e.target.value;
    setFormData((prev) => {
      const newData = { ...prev, businessType: selectedType };
      if (BUSINESS_TYPES[0].options.includes(selectedType)) { newData.taxOffice = ''; newData.taxNumber = ''; }
      else if (BUSINESS_TYPES[1].options.includes(selectedType)) newData.identityNumber = '';
      return newData;
    });
  };

  const shouldShowTaxFields = () => BUSINESS_TYPES[1].options.includes(formData.businessType);
  const shouldShowIdentityNumber = () => BUSINESS_TYPES[0].options.includes(formData.businessType);

  const checkPasswordRules = (password: string) => {
    const newRules: PasswordRules = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    setPasswordRules(newRules);
    if (Object.values(newRules).every(Boolean)) setTimeout(() => setShowPasswordFeedback(false), 2000);
    else setShowPasswordFeedback(true);
  };

  const getPasswordStrength = (rules: PasswordRules): string => {
    const validCount = Object.values(rules).filter(Boolean).length;
    return ['Çok Zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü'][validCount] || 'Çok Zayıf';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const numbersOnly = value.replace(/[^\d]/g, '');
      if (numbersOnly.length <= 11) setFormData((prev) => ({ ...prev, [name]: numbersOnly.length > 0 ? formatPhoneNumber(numbersOnly) : numbersOnly }));
    } else if (name === 'identityNumber') {
      const numbersOnly = value.replace(/[^\d]/g, '');
      if (numbersOnly.length <= 11) {
        setFormData((prev) => ({ ...prev, [name]: numbersOnly }));
        if (numbersOnly.length === 11) setTcknError(validateTCKN(numbersOnly) ? '' : 'Geçersiz TC Kimlik Numarası');
        else setTcknError('');
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (name === 'password') {
      checkPasswordRules(value);
      if (formData.confirmPassword) setPasswordMatch({ isMatching: value === formData.confirmPassword, isDirty: true });
    }
    if (name === 'confirmPassword') setPasswordMatch({ isMatching: value === formData.password, isDirty: true });
    if (name === 'address') setFieldErrors({ address: value.trim() === '' ? 'Açık adres boş olamaz' : '' });
  };

  const verifyRecaptcha = async (): Promise<boolean> => {
    try {
      if (window.grecaptcha && window.grecaptcha.getResponse) {
        const response = window.grecaptcha.getResponse();
        if (response) return true;
        setErrors(['Lütfen robot olmadığınızı doğrulayın']); setShowErrorModal(true); return false;
      }
      throw new Error('reCAPTCHA yüklenemedi');
    } catch { setErrors(['Robot doğrulama yapılamadı.']); setShowErrorModal(true); return false; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const recaptchaValid = await verifyRecaptcha();
    if (!recaptchaValid) return;
  };

  return (
    <div className="corporate-register">
      <div className="register-container">
        <div className="register-header">
          <div className="register-header-top">
            <div className="register-icon-squircle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18" />
                <path d="M5 21V7l8-4v18" />
                <path d="M19 21V11l-6-4" />
                <path d="M9 9h.01" />
                <path d="M9 13h.01" />
                <path d="M9 17h.01" />
              </svg>
            </div>
            <span className="register-badge">KURUMSAL & FİRMA HESABI</span>
          </div>
          <h1><span className="accent-text">Acillazım</span> Kurumsal Hesap Aç</h1>
          <p>İşletmenizi kaydedin, kurumsal mağaza ve ticari fırsatları hemen yakalayın</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-section-block">
            <div className="form-section-title">
              <span className="section-step">01</span>
              <span>Yetkili ve Firma Bilgileri</span>
            </div>

            <div className="input-group">
              <div className="input-field">
                <label className="field-label">Yetkili Adı</label>
                <input type="text" name="firstName" placeholder="Adınız" value={formData.firstName} onChange={handleChange} required />
              </div>
              <div className="input-field">
                <label className="field-label">Yetkili Soyadı</label>
                <input type="text" name="lastName" placeholder="Soyadınız" value={formData.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div className="input-field">
              <label className="field-label">Firma / İşletme Ünvanı</label>
              <input type="text" name="companyName" placeholder="Resmi firma veya işletme adınız" value={formData.companyName} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <div className="input-field">
                <label className="field-label">Kurumsal E-Posta Adresi</label>
                <input type="email" name="email" placeholder="firma@sirketiniz.com" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="input-field">
                <label className="field-label">İletişim Telefonu</label>
                <input type="tel" name="phone" placeholder="05XX XXX XX XX" value={formData.phone} onChange={handleChange} required pattern="0[5][0-9]{2} [0-9]{3} [0-9]{2} [0-9]{2}" maxLength={14} />
                {formData.phone && !isValidPhoneNumber(formData.phone.replace(/\s/g, '')) && (
                  <div className="phone-error">Lütfen geçerli bir cep telefonu numarası giriniz</div>
                )}
              </div>
            </div>
          </div>

          <div className="form-section-block">
            <div className="form-section-title">
              <span className="section-step">02</span>
              <span>Vergi ve Faaliyet Bilgileri</span>
            </div>

            <div className="input-group">
              <div className="input-field select-field">
                <label className="field-label">İşletme Türü</label>
                <select name="businessType" value={formData.businessType} onChange={handleBusinessTypeChange} required>
                  <option value="">İşletme türünüz</option>
                  {BUSINESS_TYPES.map((g) => g.options.map((t) => <option key={t} value={t}>{t}</option>))}
                </select>
              </div>

              <div className="input-field select-field">
                <label className="field-label">Faaliyet Alanı</label>
                <select name="activityArea" value={formData.activityArea} onChange={handleChange}>
                  <option value="">Faaliyet alanınız (Opsiyonel)</option>
                  {ACTIVITY_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {shouldShowTaxFields() && (
              <div className="input-group">
                <div className="input-field select-field">
                  <label className="field-label">Vergi Dairesi</label>
                  <select name="taxOffice" value={formData.taxOffice} onChange={handleChange} required>
                    <option value="">Vergi Daireniz</option>
                    {taxOffices.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="input-field">
                  <label className="field-label">Vergi Numarası</label>
                  <input type="text" name="taxNumber" placeholder="10 haneli vergi numaranız" value={formData.taxNumber} onChange={handleChange} required />
                </div>
              </div>
            )}

            {shouldShowIdentityNumber() && (
              <div className="input-field">
                <label className="field-label">TC Kimlik Numarası</label>
                <input type="text" name="identityNumber" placeholder="11 haneli TC Kimlik Numaranız" value={formData.identityNumber} onChange={handleChange} required maxLength={11} pattern="\d{11}" />
                {tcknError && <div className="tckn-error">{tcknError}</div>}
              </div>
            )}
          </div>

          <div className="form-section-block">
            <div className="form-section-title">
              <span className="section-step">03</span>
              <span>Firma Konum ve Adres Bilgileri</span>
            </div>

            <div className="input-group">
              <div className="input-field select-field">
                <label className="field-label">İl</label>
                <select name="province" value={formData.province} onChange={handleProvinceChange} required>
                  <option value="">İl Seçin</option>
                  {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="input-field select-field">
                <label className="field-label">İlçe</label>
                <select name="district" value={formData.district} onChange={handleDistrictChange} required>
                  <option value="">İlçe Seçin</option>
                  {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="input-field select-field">
              <label className="field-label">Mahalle / Köy</label>
              <select name="neighborhood" value={formData.neighborhood} onChange={handleChange} disabled={!formData.district} required>
                <option value="">Mahalle/Köy Seçin</option>
                {neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="input-field">
              <label className="field-label">Firma Açık Adresi</label>
              <textarea name="address" placeholder="Cadde, sokak, iş merkezi, bina ve kapı numarası" value={formData.address} onChange={handleChange} required rows={3} className={fieldErrors.address ? 'error' : ''} />
              {fieldErrors.address && <div className="error-message"><FontAwesomeIcon icon={faExclamationCircle} />{fieldErrors.address}</div>}
            </div>
          </div>

          <div className="form-section-block">
            <div className="form-section-title">
              <span className="section-step">04</span>
              <span>Hesap Güvenliği</span>
            </div>

            <div className="input-group">
              <div className="input-field corporate-password-field">
                <label className="field-label">Şifre</label>
                <div className="password-input-wrap">
                  <input type={showPassword.password ? 'text' : 'password'} name="password" placeholder="Şifrenizi belirleyin" value={formData.password} onChange={handleChange} required />
                  <span className="corporate-toggle-password" onClick={() => setShowPassword((p) => ({ ...p, password: !p.password }))}>{showPassword.password ? 'Gizle' : 'Göster'}</span>
                </div>
              </div>

              <div className="input-field corporate-password-field">
                <label className="field-label">Şifre Tekrar</label>
                <div className="password-input-wrap">
                  <input type={showPassword.confirmPassword ? 'text' : 'password'} name="confirmPassword" placeholder="Şifrenizi tekrar giriniz" value={formData.confirmPassword} onChange={handleChange} required />
                  <span className="corporate-toggle-password" onClick={() => setShowPassword((p) => ({ ...p, confirmPassword: !p.confirmPassword }))}>{showPassword.confirmPassword ? 'Gizle' : 'Göster'}</span>
                  {passwordMatch.isDirty && <span className={`corporate-password-match-icon ${passwordMatch.isMatching ? 'match' : 'mismatch'}`}>{passwordMatch.isMatching ? '✓' : '✕'}</span>}
                </div>
              </div>
            </div>

            {formData.password && showPasswordFeedback && (
              <div className="corporate-password-feedback">
                <div className="corporate-password-strength">
                  <div className="corporate-strength-bars">
                    <div className={`corporate-strength-bar ${passwordRules.length ? 'level-1' : ''}`} />
                    <div className={`corporate-strength-bar ${passwordRules.uppercase ? 'level-2' : ''}`} />
                    <div className={`corporate-strength-bar ${passwordRules.number ? 'level-3' : ''}`} />
                    <div className={`corporate-strength-bar ${passwordRules.special ? 'level-4' : ''}`} />
                  </div>
                  <div className="corporate-strength-text">{getPasswordStrength(passwordRules)}</div>
                </div>
                <div className="corporate-password-rules">
                  <h4>Şifre Belirleme Kuralları:</h4>
                  <ul>
                    <li className={passwordRules.length ? 'valid' : ''}>En az 8 karakter</li>
                    <li className={passwordRules.uppercase ? 'valid' : ''}>En az 1 büyük harf</li>
                    <li className={passwordRules.number ? 'valid' : ''}>En az 1 rakam</li>
                    <li className={passwordRules.special ? 'valid' : ''}>En az 1 özel karakter</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="terms-container">
            <label className="checkbox-container">
              <input type="checkbox" required />
              <span className="terms-text">
                <span className="contract-link" onClick={(e) => { e.preventDefault(); setShowContractModal(true); }}>Kurumsal Hesap Sözleşmesi</span>{' '}ve Ekleri&apos;ni okudum ve kabul ediyorum.
              </span>
            </label>

            <label className="checkbox-container">
              <input type="checkbox" required />
              <span className="terms-text">
                <span className="contract-link" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }}>Gizlilik Sözleşmesini</span>{' '}okudum ve kabul ediyorum.
              </span>
            </label>

            <label className="checkbox-container">
              <input type="checkbox" />
              <span className="terms-text">
                <span className="contract-link" onClick={(e) => { e.preventDefault(); setShowMarketingModal(true); }}>İletişim bilgilerime kampanya, tanıtım ve reklam içerikli ticari elektronik ileti gönderilmesine izin veriyorum</span>
              </span>
            </label>
          </div>

          <div className="recaptcha-container">
            <div id="recaptcha-container-corporate" className="g-recaptcha" data-sitekey={RECAPTCHA.SITE_KEY} data-theme="light" />
          </div>

          <div className="register-actions-row">
            <button type="submit" className={styles['register-button']}>Kurumsal Hesap Oluştur</button>

            <a href="/giris" className="login-link">
              Zaten hesabın var mı? <span>👉 Giriş yap</span>
            </a>
          </div>
        </form>

        <ErrorModal show={showErrorModal} errors={errors[0]} onClose={() => setShowErrorModal(false)} />
        <ContractModal show={showContractModal} onClose={() => setShowContractModal(false)} type="corporate" />
        <ContractModal show={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} type="privacy" />
        <ContractModal show={showMarketingModal} onClose={() => setShowMarketingModal(false)} type="marketing" />
      </div>
    </div>
  );
};

export default Corporate;
