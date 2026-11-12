"use client";

import React, { useState, useEffect } from 'react';
import {
  FaLock, FaEnvelope, FaShieldAlt, FaInfoCircle, FaCheck,
  FaExclamationTriangle, FaKey, FaQuestionCircle, FaUserShield,
  FaAt, FaCheckCircle, FaTimes, FaSpinner, FaEye, FaEyeSlash,
} from 'react-icons/fa';
import Modal from './Modal/Modal';
import {
  verifyCurrentPassword, sendVerificationCode, verifyCode, changePassword,
  verifyExistingEmail, sendEmailVerificationCode, verifyEmailCode, updateEmail,
} from '@/services/auth/authService';
import userSecurityApi from '@/services/security/userSecurityApi';
import { useAuth } from '@/context/AuthContext';
import './Styles/PasswordAndSecurity.css';

interface PasswordRules { length: boolean; uppercase: boolean; number: boolean; special: boolean; }
interface FormErrors { currentPassword: string; newPassword: string; confirmPassword: string; verificationCode: string; }
interface EmailFormErrors { email: string; newEmail: string; verificationCode: string; }
interface AuthCtx { currentUser: { email?: string } | null; }

export interface PasswordAndSecurityProps {
  activeSubTab?: 'password' | 'email' | 'security' | 'verification';
  onSubTabChange?: (tab: string) => void;
  hideHeroHeader?: boolean;
  hideHeaderTabs?: boolean;
}

const PasswordAndSecurity: React.FC<PasswordAndSecurityProps> = ({
  activeSubTab,
  onSubTabChange,
  hideHeroHeader = false,
  hideHeaderTabs = false,
}) => {
  const { currentUser: user } = useAuth() as AuthCtx;
  const [activeTab, setActiveTab] = useState<string>(activeSubTab || 'password');

  useEffect(() => {
    if (activeSubTab && activeSubTab !== activeTab) {
      setActiveTab(activeSubTab);
    }
  }, [activeSubTab]);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [securityQuestion1, setSecurityQuestion1] = useState<string>('');
  const [securityAnswer1, setSecurityAnswer1] = useState<string>('');
  const [securityQuestion2, setSecurityQuestion2] = useState<string>('');
  const [securityAnswer2, setSecurityAnswer2] = useState<string>('');
  const [hasAnswer1, setHasAnswer1] = useState<boolean>(false);
  const [hasAnswer2, setHasAnswer2] = useState<boolean>(false);
  const [securityLoading, setSecurityLoading] = useState<boolean>(false);
  const [securityError, setSecurityError] = useState<string>('');
  const [securitySuccess, setSecuritySuccess] = useState<string>('');
  const [emailVerification, setEmailVerification] = useState<boolean>(false);
  const [securityQuestionVerification, setSecurityQuestionVerification] = useState<boolean>(false);
  const [verificationLoading, setVerificationLoading] = useState<boolean>(true);
  const [verificationSavingKey, setVerificationSavingKey] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string>('');

  const [emailVerificationCode, setEmailVerificationCode] = useState<string>('');
  const [emailVerificationToken, setEmailVerificationToken] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [emailVerificationStep, setEmailVerificationStep] = useState<string>('initial');
  const [emailVerificationTimer, setEmailVerificationTimer] = useState<number>(120);
  const [isEmailTimerActive, setIsEmailTimerActive] = useState<boolean>(false);
  const [emailLoading, setEmailLoading] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [emailSuccess, setEmailSuccess] = useState<string>('');
  const [emailFormErrors, setEmailFormErrors] = useState<EmailFormErrors>({ email: '', newEmail: '', verificationCode: '' });

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [verificationTimer, setVerificationTimer] = useState<number>(120);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({ currentPassword: '', newPassword: '', confirmPassword: '', verificationCode: '' });

  useEffect(() => { if (user?.email) setEmail(user.email); }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setVerificationLoading(true);
        const settings = await userSecurityApi.getVerificationSettings();
        if (cancelled) return;
        setEmailVerification(settings.emailVerification);
        setSecurityQuestionVerification(settings.securityQuestionVerification);
      } catch (err) {
        console.error('[PasswordAndSecurity] Doğrulama ayarları alınamadı:', err);
      } finally {
        if (!cancelled) setVerificationLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const questions = await userSecurityApi.getSecurityQuestions();
        if (cancelled) return;
        setSecurityQuestion1(questions.securityQuestion1 || '');
        setHasAnswer1(questions.hasAnswer1);
        setSecurityQuestion2(questions.securityQuestion2 || '');
        setHasAnswer2(questions.hasAnswer2);
      } catch (err) {
        console.error('[PasswordAndSecurity] Güvenlik soruları alınamadı:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const applyHash = () => {
      const raw = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      const allowed = ["password", "email", "security", "verification"];
      if (allowed.includes(raw)) setActiveTab(raw);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const passwordRules: PasswordRules = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  const calculatePasswordStrength = () => {
    const validRules = Object.values(passwordRules).filter(Boolean).length;
    return {
      score: validRules, isStrong: validRules >= 3,
      strengthText: validRules === 0 ? 'Çok Güçsüz' : validRules === 1 ? 'Güçsüz' : validRules === 2 ? 'Orta' : validRules === 3 ? 'Güçlü' : 'Çok Güçlü',
    };
  };

  const startVerificationTimer = () => {
    setVerificationTimer(120); setIsTimerActive(true);
    const timer = setInterval(() => {
      setVerificationTimer((prev) => { if (prev <= 1) { clearInterval(timer); setIsTimerActive(false); return 0; } return prev - 1; });
    }, 1000);
  };

  const startEmailVerificationTimer = () => {
    setEmailVerificationTimer(120); setIsEmailTimerActive(true);
    const timer = setInterval(() => {
      setEmailVerificationTimer((prev) => { if (prev <= 1) { clearInterval(timer); setIsEmailTimerActive(false); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleResendCode = async () => {
    try { const r = await (sendVerificationCode as (e: string) => Promise<{ token: string }>)(email); setVerificationToken(r.token); startVerificationTimer(); setError(''); }
    catch (err: unknown) { setError((err as Error).message); }
  };

  const handleEmailVerification = async () => {
    try {
      setLoading(true);
      const r = await (sendVerificationCode as (e: string) => Promise<{ token: string }>)(email);
      setVerificationToken(r.token); setIsVerified(true); setIsModalOpen(false); setVerificationStep('verification'); startVerificationTimer(); setError('');
    } catch (err: unknown) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [verificationStep, setVerificationStep] = useState<string>('initial');

  const handleResendEmailCode = async () => {
    try {
      setEmailLoading(true);
      const r = await (sendEmailVerificationCode as (e: string) => Promise<{ token: string }>)(newEmail);
      setEmailVerificationToken(r.token); startEmailVerificationTimer(); setEmailError('');
    } catch (err: unknown) { setEmailError((err as Error).message); }
    finally { setEmailLoading(false); }
  };

  const validateEmailForm = (): boolean => {
    let isValid = true;
    const errors: EmailFormErrors = { email: '', newEmail: '', verificationCode: '' };
    if (!email) { errors.email = 'Mevcut e-posta adresinizi giriniz'; isValid = false; }
    else if (email !== user?.email) { errors.email = 'Mevcut e-posta adresiniz yanlış'; isValid = false; }
    if (!newEmail) { errors.newEmail = 'Yeni e-posta adresinizi giriniz'; isValid = false; }
    else if (!/\S+@\S+\.\S+/.test(newEmail)) { errors.newEmail = 'Geçerli bir e-posta adresi giriniz'; isValid = false; }
    else if (newEmail === email) { errors.newEmail = 'Yeni e-posta adresi mevcut e-posta adresinizden farklı olmalıdır'; isValid = false; }
    if (emailVerificationStep === 'verification' && !emailVerificationCode.trim()) { errors.verificationCode = 'Doğrulama kodunu giriniz'; isValid = false; }
    setEmailFormErrors(errors);
    return isValid;
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault(); setEmailLoading(true); setEmailError('');
    if (!validateEmailForm()) { setEmailLoading(false); return; }
    try {
      if (emailVerificationStep === 'initial') {
        await (verifyExistingEmail as (e: string) => Promise<void>)(email);
        const r = await (sendEmailVerificationCode as (e: string) => Promise<{ token: string }>)(newEmail);
        setEmailVerificationToken(r.token); setEmailVerificationStep('verification'); startEmailVerificationTimer(); setEmailVerificationCode('');
      } else {
        await (verifyEmailCode as (code: string, token: string) => Promise<void>)(emailVerificationCode, emailVerificationToken!);
        await (updateEmail as (e: string, t: string) => Promise<void>)(newEmail, emailVerificationToken!);
        setIsEmailVerified(true); setEmailSuccess('E-posta adresiniz başarıyla güncellendi');
        setEmailVerificationStep('initial'); setEmail(newEmail); setNewEmail(''); setEmailVerificationCode(''); setEmailVerificationToken(null);
        setEmailFormErrors({ email: '', newEmail: '', verificationCode: '' });
      }
    } catch (err: unknown) { setEmailError((err as Error).message || 'E-posta doğrulama işlemi başarısız oldu'); }
    finally { setEmailLoading(false); }
  };

  const validateForm = (): boolean => {
    let isValid = true;
    const errors: FormErrors = { currentPassword: '', newPassword: '', confirmPassword: '', verificationCode: '' };
    if (!currentPassword.trim()) { errors.currentPassword = 'Mevcut şifrenizi giriniz'; isValid = false; }
    if (!newPassword.trim()) { errors.newPassword = 'Yeni şifrenizi giriniz'; isValid = false; }
    else if (!calculatePasswordStrength().isStrong) { errors.newPassword = 'Şifreniz yeterince güçlü değil. En az 3 kural sağlanmalıdır.'; isValid = false; }
    if (!confirmPassword.trim()) { errors.confirmPassword = 'Şifrenizi tekrar giriniz'; isValid = false; }
    else if (confirmPassword !== newPassword) { errors.confirmPassword = 'Şifreler eşleşmiyor'; isValid = false; }
    if (isVerified && !verificationCode.trim()) { errors.verificationCode = 'Doğrulama kodunu giriniz'; isValid = false; }
    setFormErrors(errors);
    return isValid;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(false); setError('');
    if (!validateForm()) return;
    try {
      if (!isVerified) {
        await (verifyCurrentPassword as (p: string) => Promise<void>)(currentPassword);
        setIsModalOpen(true);
        const r = await (sendVerificationCode as (e: string) => Promise<{ token: string }>)(email);
        setVerificationToken(r.token);
      } else {
        setLoading(true);
        await (changePassword as (cp: string, np: string, t: string) => Promise<void>)(currentPassword, newPassword, verificationToken!);
        setSuccess('Şifreniz başarıyla güncellendi');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setVerificationCode(''); setIsVerified(false); setVerificationToken(null);
        setFormErrors({ currentPassword: '', newPassword: '', confirmPassword: '', verificationCode: '' });
      }
    } catch (err: unknown) { setError((err as Error).message); if (!isVerified) setIsModalOpen(true); }
    finally { setLoading(false); }
  };

  const handleVerifyCode = async () => {
    setLoading(true); setError('');
    try {
      await (verifyCode as (code: string, token: string) => Promise<void>)(verificationCode, verificationToken!);
      setIsVerified(true); setIsModalOpen(false); setError('');
    } catch (err: unknown) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const handleSaveSecurityQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(''); setSecuritySuccess('');
    if (!securityQuestion1 && !securityQuestion2) {
      setSecurityError('En az bir güvenlik sorusu seçmelisiniz'); return;
    }
    if ((securityQuestion1 && !securityAnswer1.trim()) || (securityQuestion2 && !securityAnswer2.trim())) {
      setSecurityError('Seçtiğiniz sorunun cevabını girmelisiniz'); return;
    }
    setSecurityLoading(true);
    try {
      const result = await userSecurityApi.saveSecurityQuestions({
        securityQuestion1: securityQuestion1 || undefined,
        securityAnswer1: securityAnswer1.trim() || undefined,
        securityQuestion2: securityQuestion2 || undefined,
        securityAnswer2: securityAnswer2.trim() || undefined,
      });
      setHasAnswer1(result.hasAnswer1);
      setHasAnswer2(result.hasAnswer2);
      setSecurityAnswer1(''); setSecurityAnswer2('');
      setSecuritySuccess('Güvenlik sorularınız güncellendi');
    } catch (err: unknown) {
      setSecurityError((err as Error).message || 'Güvenlik soruları kaydedilemedi');
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleToggleVerification = async (key: 'emailVerification' | 'securityQuestionVerification') => {
    const current = key === 'emailVerification' ? emailVerification : securityQuestionVerification;
    const next = !current;
    setVerificationError('');
    setVerificationSavingKey(key);
    if (key === 'emailVerification') setEmailVerification(next);
    else setSecurityQuestionVerification(next);
    try {
      await userSecurityApi.updateVerificationSettings({ [key]: next });
    } catch (err: unknown) {
      if (key === 'emailVerification') setEmailVerification(current);
      else setSecurityQuestionVerification(current);
      setVerificationError((err as Error).message || 'Doğrulama ayarı güncellenemedi');
    } finally {
      setVerificationSavingKey(null);
    }
  };

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>, t2: ReturnType<typeof setTimeout>;
    if (success) t1 = setTimeout(() => setSuccess(''), 3000);
    if (emailSuccess) t2 = setTimeout(() => setEmailSuccess(''), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [success, emailSuccess]);

  useEffect(() => {
    setSuccess(''); setEmailSuccess(''); setEmailVerificationStep('initial'); setEmailError('');
    setEmailFormErrors({ email: '', newEmail: '', verificationCode: '' });
  }, [activeTab]);

  const { score, strengthText } = calculatePasswordStrength();
  const strengthSlug = score === 0 ? 'level-0' : score === 1 ? 'level-1' : score === 2 ? 'level-2' : score === 3 ? 'level-3' : 'level-4';

  const selectTab = (tab: string) => {
    setActiveTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
    if (typeof window !== "undefined") {
      const { pathname, search } = window.location;
      window.history.replaceState(null, "", `${pathname}${search}#${tab}`);
    }
  };

  return (
    <div className={`pas__container ${hideHeroHeader ? 'pas__container--embedded' : ''}`}>
      {/* ── ÜST KURUMSAL BAŞLIK & GÜVENLİK ÖZETİ ── */}
      {!hideHeroHeader && (
        <div className="pas__hero-header">
          <div className="pas__hero-left">
            <div className="pas__hero-badge">
              <span className="pas__hero-badge-dot" />
              <span>Hesap Güvenlik Merkezi</span>
            </div>
            <h1 className="pas__title">
              <span className="pas__title-icon"><FaShieldAlt /></span>
              <span>Şifre ve Güvenlik Ayarları</span>
            </h1>
            <p className="pas__subtitle">
              Hesap şifrenizi, kayıtlı e-posta adresinizi, kurtarma sorularınızı ve iki aşamalı doğrulama tercihlerinizi yönetin.
            </p>
          </div>

          <div className="pas__hero-status-strip">
            <div className={`pas__status-chip ${emailVerification ? 'is-active' : ''}`}>
              <FaEnvelope className="pas__status-chip-icon" />
              <div className="pas__status-chip-meta">
                <span className="pas__status-chip-label">E-posta Doğrulama</span>
                <span className="pas__status-chip-val">{emailVerification ? 'Aktif' : 'Standart'}</span>
              </div>
            </div>
            <div className={`pas__status-chip ${(hasAnswer1 || hasAnswer2) ? 'is-active' : ''}`}>
              <FaUserShield className="pas__status-chip-icon" />
              <div className="pas__status-chip-meta">
                <span className="pas__status-chip-label">Kurtarma Soruları</span>
                <span className="pas__status-chip-val">{(hasAnswer1 || hasAnswer2) ? 'Tanımlı' : 'Tanımsız'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SEKMELER ── */}
      {!hideHeaderTabs && (
        <div className="pas__tabs" role="tablist" aria-label="Güvenlik sekmeleri">
          <button type="button" className={`pas__tab-button ${activeTab === 'password' ? 'active' : ''}`} onClick={() => selectTab('password')}>
            <span className="pas__tab-icon"><FaKey /></span>
            <span>Şifre Değiştir</span>
          </button>
          <button type="button" className={`pas__tab-button ${activeTab === 'email' ? 'active' : ''}`} onClick={() => selectTab('email')}>
            <span className="pas__tab-icon"><FaAt /></span>
            <span>E-posta Güncelle</span>
          </button>
          <button type="button" className={`pas__tab-button ${activeTab === 'security' ? 'active' : ''}`} onClick={() => selectTab('security')}>
            <span className="pas__tab-icon"><FaQuestionCircle /></span>
            <span>Güvenlik Soruları</span>
          </button>
          <button type="button" className={`pas__tab-button ${activeTab === 'verification' ? 'active' : ''}`} onClick={() => selectTab('verification')}>
            <span className="pas__tab-icon"><FaUserShield /></span>
            <span>Doğrulama Seçenekleri</span>
          </button>
        </div>
      )}

      {/* ── İÇERİK PANELİ ── */}
      <div className="pas__content">
        {activeTab === 'password' && (
          <div className="pas__password-section pas__split-layout">
            <div className="pas__card-panel">
              <form onSubmit={handlePasswordChange} className="pas__form">
                <div className="pas__section-head">
                  <div>
                    <h2 className="pas__section-title">Şifre Değiştirme</h2>
                    <p className="pas__section-desc">Hesap güvenliğiniz için düzenli aralıklarla güçlü bir şifre belirleyin.</p>
                  </div>
                </div>

                {error && <p className="pas__info-text pas__info-text--error"><FaTimes /> {error}</p>}
                {success && <p className="pas__info-text pas__info-text--success"><FaCheck /> {success}</p>}

                <div className="pas__form-group">
                  <label>Mevcut Şifre</label>
                  <div className="pas__password-input-wrap">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Mevcut şifrenizi girin"
                      disabled={isVerified}
                      className={formErrors.currentPassword ? 'error' : ''}
                    />
                    <button
                      type="button"
                      className="pas__password-toggle"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      disabled={isVerified}
                      aria-label={showCurrentPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                      <span>{showCurrentPassword ? 'Gizle' : 'Göster'}</span>
                    </button>
                  </div>
                  {formErrors.currentPassword && <p className="pas__input-error">{formErrors.currentPassword}</p>}
                </div>

                <div className="pas__form-group">
                  <label>Yeni Şifre</label>
                  <div className="pas__password-input-wrap">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Yeni şifrenizi girin"
                      className={formErrors.newPassword ? 'error' : ''}
                    />
                    <button
                      type="button"
                      className="pas__password-toggle"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                      <span>{showNewPassword ? 'Gizle' : 'Göster'}</span>
                    </button>
                  </div>
                  {formErrors.newPassword && <p className="pas__input-error">{formErrors.newPassword}</p>}
                </div>

                <div className="pas__form-group">
                  <label>Yeni Şifre Tekrar</label>
                  <div className="pas__password-input-wrap">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Yeni şifrenizi tekrar girin"
                      className={formErrors.confirmPassword ? 'error' : ''}
                    />
                    <button
                      type="button"
                      className="pas__password-toggle"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      <span>{showConfirmPassword ? 'Gizle' : 'Göster'}</span>
                    </button>
                  </div>
                  {formErrors.confirmPassword && <p className="pas__input-error">{formErrors.confirmPassword}</p>}
                </div>

                {isVerified && (
                  <div className="pas__form-group">
                    <label>E-posta Doğrulaması</label>
                    <div className="verification-input-container">
                      <input
                        type="text"
                        className="verification-input"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="6 haneli doğrulama kodunu girin"
                        maxLength={6}
                      />
                      <div className="verification-action">
                        {isTimerActive ? (
                          <span className="verification-timer">
                            {Math.floor(verificationTimer / 60)}:{(verificationTimer % 60).toString().padStart(2, '0')}
                          </span>
                        ) : (
                          <button type="button" className="resend-button" onClick={handleResendCode}>Tekrar Gönder</button>
                        )}
                      </div>
                    </div>
                    {formErrors.verificationCode && <p className="pas__input-error">{formErrors.verificationCode}</p>}
                  </div>
                )}

                {/* Alt Aksiyon Çubuğu (Temel Bilgiler ile %100 Birebir) */}
                <div className="pas__actions-bar">
                  <div className="pas__actions-inner">
                    <p className="pas__actions-hint">Değişikliklerin kaydedilmesi için lütfen butona tıklayın.</p>
                    <button type="submit" className="pas__save-button" disabled={loading}>
                      {loading ? (
                        <>
                          <FaSpinner className="icon-spin" />
                          <span>İşlem Yapılıyor...</span>
                        </>
                      ) : (
                        <>
                          <FaCheck />
                          <span>{isVerified ? 'Şifreyi Güncelle' : 'Şifreyi Değiştir'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <aside className="pas__side-panel">
              <div className="pas__password-rules">
                <div className="pas__password-rules-head">
                  <div>
                    <h3 className="pas__password-rules-title">Şifre Güvenlik Kriterleri</h3>
                    <p className="pas__password-rules-sub">Güçlü bir şifre için aşağıdaki kuralları sağlayın</p>
                  </div>
                </div>

                <div className="pas__password-strength">
                  <div className="pas__password-strength-label">
                    <span>Şifre Gücü</span>
                    <span className={`pas__strength-tag ${strengthSlug}`}>{strengthText}</span>
                  </div>
                  <div className="pas__password-strength-bar">
                    <div className={`strength-progress ${strengthSlug}`} style={{ width: `${Math.max(8, (score / 4) * 100)}%` }} />
                  </div>
                </div>

                <div className="pas__rules-list">
                  <div className={`pas__password-rule ${passwordRules.length ? 'valid' : ''}`}>
                    {passwordRules.length ? <FaCheckCircle /> : <FaTimes />}
                    <span>En az 8 karakter uzunluğunda</span>
                  </div>
                  <div className={`pas__password-rule ${passwordRules.uppercase ? 'valid' : ''}`}>
                    {passwordRules.uppercase ? <FaCheckCircle /> : <FaTimes />}
                    <span>En az 1 büyük harf (A–Z)</span>
                  </div>
                  <div className={`pas__password-rule ${passwordRules.number ? 'valid' : ''}`}>
                    {passwordRules.number ? <FaCheckCircle /> : <FaTimes />}
                    <span>En az 1 rakam (0–9)</span>
                  </div>
                  <div className={`pas__password-rule ${passwordRules.special ? 'valid' : ''}`}>
                    {passwordRules.special ? <FaCheckCircle /> : <FaTimes />}
                    <span>En az 1 özel karakter (!@#$%^&amp;*)</span>
                  </div>
                </div>

                <div className="pas__side-tip">
                  <FaInfoCircle className="pas__side-tip-icon" />
                  <span>Başka platformlarda kullandığınız şifreleri veya doğum tarihi gibi kolay tahmin edilebilir bilgileri tercih etmeyin.</span>
                </div>
              </div>
            </aside>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
              <p className="pas__info-text--error"><FaTimes /> Mevcut şifre yanlış</p>
              <div className="modal__actions">
                <button className="modal__btn modal__btn--primary" onClick={handleEmailVerification} disabled={loading}>
                  {loading ? <><FaSpinner className="icon-spin" /> Doğrulama Kodu Gönderiliyor...</> : <><FaEnvelope /> E-posta ile Doğrula</>}
                </button>
                <button className="modal__btn modal__btn--secondary" onClick={() => setIsModalOpen(false)} disabled={loading}>
                  <FaTimes /> Tekrar Dene
                </button>
              </div>
            </Modal>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="pas__email-section pas__split-layout">
            <div className="pas__card-panel">
              <form onSubmit={handleEmailChange} className="pas__form">
                <div className="pas__section-head">
                  <div>
                    <h2 className="pas__section-title">E-posta Değişikliği</h2>
                    <p className="pas__section-desc">Bildirimler ve hesap kurtarma işlemleri için güncel e-posta adresinizi kullanın.</p>
                  </div>
                </div>

                {emailError && <p className="pas__info-text pas__info-text--error"><FaTimes /> {emailError}</p>}
                {emailSuccess && <p className="pas__info-text pas__info-text--success"><FaCheck /> {emailSuccess}</p>}

                <div className="pas__form-group">
                  <label>Mevcut E-posta Adresi</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Mevcut e-posta adresiniz"
                    disabled={emailVerificationStep === 'verification'}
                    className={emailFormErrors.email ? 'error' : ''}
                  />
                  {emailFormErrors.email && <p className="pas__input-error">{emailFormErrors.email}</p>}
                </div>

                <div className="pas__form-group">
                  <label>Yeni E-posta Adresi</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ornek@yenimail.com"
                    disabled={emailVerificationStep === 'verification'}
                    className={emailFormErrors.newEmail ? 'error' : ''}
                  />
                  {emailFormErrors.newEmail && <p className="pas__input-error">{emailFormErrors.newEmail}</p>}
                  <p className="pas__info-text"><FaInfoCircle /> Değişiklik sonrası yeni adresinize doğrulama kodu gönderilecektir.</p>
                </div>

                {emailVerificationStep === 'verification' && (
                  <div className="pas__form-group">
                    <label>E-posta Doğrulama Kodu</label>
                    <div className="verification-input-container">
                      <input
                        type="text"
                        className="verification-input"
                        value={emailVerificationCode}
                        onChange={(e) => setEmailVerificationCode(e.target.value)}
                        placeholder="Doğrulama kodunu girin"
                        maxLength={6}
                        autoFocus
                      />
                      <div className="verification-action">
                        {isEmailTimerActive ? (
                          <span className="verification-timer">
                            {Math.floor(emailVerificationTimer / 60)}:{(emailVerificationTimer % 60).toString().padStart(2, '0')}
                          </span>
                        ) : (
                          <button type="button" className="resend-button" onClick={handleResendEmailCode} disabled={emailLoading}>
                            Tekrar Gönder
                          </button>
                        )}
                      </div>
                    </div>
                    {emailFormErrors.verificationCode && <p className="pas__input-error">{emailFormErrors.verificationCode}</p>}
                  </div>
                )}

                {/* Alt Aksiyon Çubuğu (Temel Bilgiler ile %100 Birebir) */}
                <div className="pas__actions-bar">
                  <div className="pas__actions-inner">
                    <p className="pas__actions-hint">Değişikliklerin kaydedilmesi için lütfen butona tıklayın.</p>
                    <button type="submit" className="pas__save-button" disabled={emailLoading}>
                      {emailLoading ? (
                        <>
                          <FaSpinner className="icon-spin" />
                          <span>İşlem Yapılıyor...</span>
                        </>
                      ) : (
                        <>
                          <FaCheck />
                          <span>{emailVerificationStep === 'verification' ? 'E-postayı Güncelle' : 'Doğrulama Kodu Gönder'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <aside className="pas__side-panel">
              <div className="pas__steps-card">
                <h3 className="pas__steps-title">E-posta Güncelleme Süreci</h3>
                <div className="pas__step-item">
                  <span className="pas__step-num">01</span>
                  <div>
                    <h4>Mevcut E-posta Doğrulaması</h4>
                    <p>Hesabınıza kayıtlı mevcut e-posta adresinizin doğruluğu kontrol edilir.</p>
                  </div>
                </div>
                <div className="pas__step-item">
                  <span className="pas__step-num">02</span>
                  <div>
                    <h4>6 Haneli Güvenlik Kodu</h4>
                    <p>Yeni e-posta adresinize tek kullanımlık güvenlik kodu iletilir.</p>
                  </div>
                </div>
                <div className="pas__step-item">
                  <span className="pas__step-num">03</span>
                  <div>
                    <h4>Anında Güncelleme</h4>
                    <p>Kodu onayladığınızda tüm bildirim ve giriş bilgileriniz yeni adresinize aktarılır.</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="pas__security-section">
            <div className="pas__card-panel pas__card-panel--wide">
              <form onSubmit={handleSaveSecurityQuestions} className="pas__form pas__form--wide">
                <div className="pas__section-head">
                  <div>
                    <h2 className="pas__section-title">Güvenlik Soruları</h2>
                    <p className="pas__section-desc">Şifrenizi unuttuğunuzda veya kritik hesap işlemlerinde kimliğinizi doğrulamak için kullanılır.</p>
                  </div>
                </div>

                <p className="pas__info-text pas__info-text--warning">
                  <FaExclamationTriangle /> Güvenlik sorularınız şifrenizi unuttuğunuzda hesabınıza güvenli şekilde erişmenize yardımcı olur.
                </p>

                {securityError && <p className="pas__info-text pas__info-text--error"><FaTimes /> {securityError}</p>}
                {securitySuccess && <p className="pas__info-text pas__info-text--success"><FaCheck /> {securitySuccess}</p>}

                <div className="pas__questions-grid">
                  <div className="pas__question-box">
                    <div className="pas__question-box-head">
                      <span className="pas__question-num">Soru 01</span>
                      {hasAnswer1 && <span className="pas__answer-set-badge"><FaCheckCircle /> Cevap tanımlı</span>}
                    </div>
                    <div className="pas__form-group">
                      <label>1. Güvenlik Sorusu Seçimi</label>
                      <select value={securityQuestion1} onChange={(e) => setSecurityQuestion1(e.target.value)}>
                        <option value="">Bir güvenlik sorusu seçin</option>
                        <option value="pet">İlk evcil hayvanınızın adı nedir?</option>
                        <option value="school">İlk gittiğiniz okulun adı nedir?</option>
                        <option value="city">Doğduğunuz şehir neresidir?</option>
                      </select>
                      <label>Cevabınız</label>
                      <input
                        type="text"
                        value={securityAnswer1}
                        onChange={(e) => setSecurityAnswer1(e.target.value)}
                        placeholder={hasAnswer1 ? 'Cevabı değiştirmek için yeni cevabınızı girin' : 'Cevabınızı girin'}
                      />
                    </div>
                  </div>

                  <div className="pas__question-box">
                    <div className="pas__question-box-head">
                      <span className="pas__question-num">Soru 02</span>
                      {hasAnswer2 && <span className="pas__answer-set-badge"><FaCheckCircle /> Cevap tanımlı</span>}
                    </div>
                    <div className="pas__form-group">
                      <label>2. Güvenlik Sorusu Seçimi</label>
                      <select value={securityQuestion2} onChange={(e) => setSecurityQuestion2(e.target.value)}>
                        <option value="">Bir güvenlik sorusu seçin</option>
                        <option value="mother">Annenizin kızlık soyadı nedir?</option>
                        <option value="color">En sevdiğiniz renk nedir?</option>
                        <option value="book">En sevdiğiniz kitap nedir?</option>
                      </select>
                      <label>Cevabınız</label>
                      <input
                        type="text"
                        value={securityAnswer2}
                        onChange={(e) => setSecurityAnswer2(e.target.value)}
                        placeholder={hasAnswer2 ? 'Cevabı değiştirmek için yeni cevabınızı girin' : 'Cevabınızı girin'}
                      />
                    </div>
                  </div>
                </div>

                {/* Alt Aksiyon Çubuğu (Temel Bilgiler ile %100 Birebir) */}
                <div className="pas__actions-bar">
                  <div className="pas__actions-inner">
                    <p className="pas__actions-hint">Değişikliklerin kaydedilmesi için lütfen butona tıklayın.</p>
                    <button type="submit" className="pas__save-button" disabled={securityLoading}>
                      {securityLoading ? (
                        <>
                          <FaSpinner className="icon-spin" />
                          <span>Kaydediliyor...</span>
                        </>
                      ) : (
                        <>
                          <FaCheck />
                          <span>Güvenlik Sorularını Güncelle</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="pas__verification-section">
            <div className="pas__card-panel pas__card-panel--wide">
              <div className="pas__section-head">
                <div>
                  <h2 className="pas__section-title">Doğrulama Seçenekleri</h2>
                  <p className="pas__section-desc">Hesabınızı yetkisiz erişimlere karşı korumak için ek doğrulama katmanlarını aktif edin.</p>
                </div>
              </div>

              <p className="pas__info-text pas__info-text--info">
                <FaInfoCircle /> Hesabınızın güvenliğini artırmak için birden fazla doğrulama yöntemini aynı anda kullanabilirsiniz.
              </p>

              {verificationError && <p className="pas__info-text pas__info-text--error"><FaTimes /> {verificationError}</p>}

              {verificationLoading ? (
                <div className="pas__loading-state">
                  <FaSpinner className="icon-spin" />
                  <span>Doğrulama ayarları yükleniyor...</span>
                </div>
              ) : (
                <div className="pas__security-cards">
                  <div className={`pas__security-card ${emailVerification ? 'is-enabled' : ''}`}>
                    <div className="pas__security-card-content">
                      <div className="pas__security-card-title-row">
                        <h3>E-posta ile Doğrulama</h3>
                        <span className={`pas__card-state-pill ${emailVerification ? 'active' : ''}`}>
                          {emailVerification ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <p>Önemli hesap değişikliklerinde ve şifre işlemlerinde kayıtlı e-posta adresinize gönderilen onay kodu ile doğrulama yapılır.</p>
                    </div>
                    <label className="pas__toggle" aria-label="E-posta ile doğrulama">
                      <input
                        type="checkbox"
                        checked={emailVerification}
                        disabled={verificationSavingKey === 'emailVerification'}
                        onChange={() => handleToggleVerification('emailVerification')}
                      />
                      <span className="pas__toggle-slider" />
                    </label>
                  </div>

                  <div className={`pas__security-card ${securityQuestionVerification ? 'is-enabled' : ''}`}>
                    <div className="pas__security-card-content">
                      <div className="pas__security-card-title-row">
                        <h3>Güvenlik Soruları ile Doğrulama</h3>
                        <span className={`pas__card-state-pill ${securityQuestionVerification ? 'active' : ''}`}>
                          {securityQuestionVerification ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <p>Şifrenizi unuttuğunuzda veya kritik işlemlerde belirlediğiniz güvenlik sorularını yanıtlayarak kimliğinizi doğrulayın.</p>
                      {securityQuestionVerification && !hasAnswer1 && !hasAnswer2 && (
                        <p className="pas__info-text pas__info-text--warning">
                          <FaExclamationTriangle /> Bu doğrulamayı kullanabilmek için önce &quot;Güvenlik Soruları&quot; sekmesinden en az bir soru/cevap tanımlamalısınız.
                        </p>
                      )}
                    </div>
                    <label className="pas__toggle" aria-label="Güvenlik soruları ile doğrulama">
                      <input
                        type="checkbox"
                        checked={securityQuestionVerification}
                        disabled={verificationSavingKey === 'securityQuestionVerification'}
                        onChange={() => handleToggleVerification('securityQuestionVerification')}
                      />
                      <span className="pas__toggle-slider" />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordAndSecurity;
