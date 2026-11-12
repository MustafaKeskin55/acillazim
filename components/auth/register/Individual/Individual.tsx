"use client";

import {
  faCheck,
  faExclamationCircle,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useRef, useState } from "react";
import ContractModal from "@/components/common/ContractModal";
import "./Individual.css";
import styles from "./IndividualRegisterButton.module.css";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { FcGoogle } from "react-icons/fc";
import authService from "@/services/auth/authService";
import { RECAPTCHA } from "@/config/constants";
import locationService from "@/services/location/locationService";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  province: string;
  district: string;
  neighborhood: string;
  address: string;
  termsAccepted: boolean;
}

interface PasswordVisibility {
  password: boolean;
  confirmPassword: boolean;
}

interface FieldErrors {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  address?: string;
}

interface Country {
  code: string;
  flag: string;
  name: string;
  pattern: string;
}

interface GoogleJwtPayload {
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

declare global {
  interface Window {
    grecaptcha?: {
      render: (id: string, opts: Record<string, string>) => void;
      getResponse: () => string;
    };
  }
}

const countries: Country[] = [
  { code: "+90", flag: "🇹🇷", name: "Türkiye", pattern: "5XX XXX XX XX" },
  { code: "+1", flag: "🇺🇸", name: "United States", pattern: "XXX XXX XXXX" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom", pattern: "XXXX XXXXXX" },
  { code: "+49", flag: "🇩🇪", name: "Germany", pattern: "XXXX XXXXXX" },
  { code: "+33", flag: "🇫🇷", name: "France", pattern: "X XX XX XX XX" },
  { code: "+39", flag: "🇮🇹", name: "Italy", pattern: "XXX XXX XXXX" },
  { code: "+34", flag: "🇪🇸", name: "Spain", pattern: "XXX XXX XXX" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands", pattern: "X XX XX XX XX" },
  { code: "+86", flag: "🇨🇳", name: "China", pattern: "XXX XXXX XXXX" },
  { code: "+81", flag: "🇯🇵", name: "Japan", pattern: "XX XXXX XXXX" },
  { code: "+82", flag: "🇰🇷", name: "South Korea", pattern: "XX XXXX XXXX" },
  { code: "+91", flag: "🇮🇳", name: "India", pattern: "XXXXX XXXXX" },
  { code: "+7", flag: "🇷🇺", name: "Russia", pattern: "XXX XXX XX XX" },
  { code: "+55", flag: "🇧🇷", name: "Brazil", pattern: "XX XXXXX XXXX" },
  { code: "+52", flag: "🇲🇽", name: "Mexico", pattern: "XXX XXX XXXX" },
];

const Individual: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
    phone: "", province: "", district: "", neighborhood: "", address: "", termsAccepted: false,
  });
  const [termsChecks, setTermsChecks] = useState<{ termsOfUse: boolean; privacyPolicy: boolean }>({
    termsOfUse: false,
    privacyPolicy: false,
  });
  const [contractModalType, setContractModalType] = useState<string>("individual");
  const [showPassword, setShowPassword] = useState<PasswordVisibility>({ password: false, confirmPassword: false });
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; message: string }>({ score: 0, message: "" });
  const [passwordMatch, setPasswordMatch] = useState<{ isMatching: boolean; isDirty: boolean }>({ isMatching: false, isDirty: false });
  const [errors, setErrors] = useState<string[]>([]);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [selectedCountry] = useState<Country>({ code: "+90", flag: "🇹🇷", pattern: "5XX XXX XX XX" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", phone: "" });
  const [showContractModal, setShowContractModal] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const countryListRef = useRef<HTMLDivElement>(null);

  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const getTurkishPhoneRegex = () => /^5(0[5-7]|[3-5]\d)(\d{3})(\d{4})$/;

  const formatPhoneNumber = (number: string): string => {
    const cleaned = number.replace(/^0+/, "");
    if (cleaned.startsWith("5")) return cleaned.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, "0$1 $2 $3 $4");
    return cleaned;
  };

  const isValidPhoneNumber = (number: string): boolean => {
    const cleaned = number.replace(/\D/g, "");
    const withoutZero = cleaned.replace(/^0+/, "");
    return /^5[0-9]{9}$/.test(withoutZero);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneWithoutSpaces = phone.replace(/\s/g, "");
    if (selectedCountry.code === "+90") return getTurkishPhoneRegex().test(phoneWithoutSpaces);
    return phoneWithoutSpaces.length >= 10;
  };

  const validateField = (name: string, value: string): boolean => {
    let error = "";
    switch (name) {
      case "firstName":
      case "lastName":
        if (!value.trim()) error = `${name === "firstName" ? "İsim" : "Soyisim"} boş bırakılamaz`;
        else if (value.trim().length < 2) error = `${name === "firstName" ? "İsim" : "Soyisim"} en az 2 karakter olmalıdır`;
        else if (value.trim().length > 20) error = `${name === "firstName" ? "İsim" : "Soyisim"} 20 karakterden uzun olamaz`;
        else if (!/^[A-ZĞÜŞİÖÇa-zğüşıöç\s]+$/.test(value.trim())) error = `${name === "firstName" ? "İsim" : "Soyisim"} sadece harf içerebilir`;
        break;
      case "email":
        if (!emailRegex.test(value)) error = "Geçerli bir e-posta adresi giriniz";
        break;
      case "phone":
        if (selectedCountry.code === "+90" && !getTurkishPhoneRegex().test(value.replace(/\s/g, ""))) error = "Geçerli bir telefon numarası giriniz";
        break;
      case "password": {
        const pErrors: string[] = [];
        if (value.length < 8) pErrors.push("En az 8 karakter");
        if (!/[A-Z]/.test(value)) pErrors.push("En az 1 büyük harf");
        if (!/[0-9]/.test(value)) pErrors.push("En az 1 rakam");
        if (!/[^A-Za-z0-9]/.test(value)) pErrors.push("En az 1 özel karakter");
        error = pErrors.join(", ");
        break;
      }
    }
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
    return error === "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "firstName" || name === "lastName") {
      if (!/^[A-ZĞÜŞİÖÇa-zğüşıöç\s]*$/.test(value)) return;
      const formatted = value.replace(/\s+/g, " ").trim().split(" ").map((w) => w ? w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR") : "").join(" ");
      setFormData((prev) => ({ ...prev, [name]: formatted }));
      validateField(name, formatted);
      return;
    }
    if (name === "phone") {
      const numbersOnly = value.replace(/[^\d]/g, "");
      if (numbersOnly.length <= 11) {
        setFormData((prev) => ({ ...prev, [name]: numbersOnly.length > 0 ? formatPhoneNumber(numbersOnly) : numbersOnly }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    validateField(name, value);
  };

  const togglePasswordVisibility = (field: "password" | "confirmPassword") => setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^A-Za-z0-9]/)) score++;
    const messages = ["Çok Zayıf", "Zayıf", "Orta", "Güçlü", "Çok Güçlü"];
    setPasswordStrength({ score, message: messages[score] });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    checkPasswordStrength(e.target.value);
    if (formData.confirmPassword) setPasswordMatch({ isMatching: e.target.value === formData.confirmPassword, isDirty: true });
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    setPasswordMatch({ isMatching: e.target.value === formData.password, isDirty: true });
  };

  const isFormValid = (): boolean => {
    if (!formData.firstName || !formData.lastName) return false;
    if (fieldErrors.firstName || fieldErrors.lastName) return false;
    if (!formData.email || !emailRegex.test(formData.email)) return false;
    if (!formData.password || formData.password.length < 8) return false;
    if (!/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[^A-Za-z0-9]/.test(formData.password)) return false;
    if (formData.password !== formData.confirmPassword) return false;
    if (!formData.phone || !validatePhone(formData.phone)) return false;
    return true;
  };

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!document.querySelector('script[src*="recaptcha/api.js"]')) {
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(() => {
          if (window.grecaptcha) window.grecaptcha.render("recaptcha-container-individual", { sitekey: RECAPTCHA.SITE_KEY });
        }, 500);
      };
      document.head.appendChild(script);
    }
    (async () => {
      try {
        const cities = await locationService.getProvinces() as Array<{ name: string }>;
        setProvinces(cities.map((c) => c.name));
      } catch { console.error("İller yüklenirken hata"); }
    })();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryListRef.current && !countryListRef.current.contains(event.target as Node)) {}
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const verifyRecaptcha = async (): Promise<boolean> => {
    try {
      if (window.grecaptcha && window.grecaptcha.getResponse) {
        const response = window.grecaptcha.getResponse();
        if (response) return true;
        setErrors(["Lütfen robot olmadığınızı doğrulayın"]); setShowErrorModal(true); return false;
      }
      throw new Error("reCAPTCHA yüklenemedi");
    } catch {
      setErrors(["Robot doğrulama yapılamadı."]); setShowErrorModal(true); return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const recaptchaValid = await verifyRecaptcha();
    if (!recaptchaValid) return;
    if (!formData.termsAccepted) {
      setErrors(["Bireysel Hesap Sözleşmesi ve Ekleri'ni kabul etmelisiniz"]); setShowErrorModal(true); return;
    }
    const registrationData = {
      username: formData.email, password: formData.password,
      fullName: `${formData.firstName} ${formData.lastName}`, roles: ["test"], active: true,
    };
    try {
      const response = await fetch("http://54.235.237.2:8080/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(registrationData),
      });
      if (response.status === 200) {
        setErrors(["Kullanıcı başarıyla kaydedildi"]); setShowErrorModal(true);
        setTimeout(() => { window.location.href = "/giris"; }, 2000);
      } else {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || "Kayıt işlemi başarısız oldu");
      }
    } catch (err) {
      setErrors([(err as Error).message || "Kayıt işlemi sırasında bir hata oluştu"]); setShowErrorModal(true);
    }
  };

  const handleGoogleRegister = async (credentialResponse: CredentialResponse) => {
    try {
      if (!formData.termsAccepted) {
        setErrors(["Kayıt olmak için kullanım koşullarını kabul etmelisiniz"]); setShowErrorModal(true); return;
      }
      if (!credentialResponse.credential) return;
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);
      if (!decoded.email || !decoded.given_name || !decoded.family_name) {
        setErrors(["Google'dan yeterli bilgi alınamadı."]); setShowErrorModal(true); return;
      }
      await authService.loginWithGoogle({ credential: credentialResponse.credential, userData: { email: decoded.email, firstName: decoded.given_name, lastName: decoded.family_name, picture: decoded.picture || "" } });
      setErrors(["Google hesabınızla başarıyla kaydoldunuz!"]); setShowErrorModal(true);
      setTimeout(() => { window.location.replace("/"); }, 2000);
    } catch {
      setErrors(["Google ile kayıt olurken bir hata oluştu."]); setShowErrorModal(true);
    }
  };

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedProvince = e.target.value;
    setFormData((prev) => ({ ...prev, province: selectedProvince, district: "", neighborhood: "" }));
    try {
      const cities = await locationService.getProvinces() as Array<{ id: string; name: string }>;
      const selectedCity = cities.find((c) => c.name === selectedProvince);
      if (selectedCity) {
        const d = await locationService.getDistricts(selectedCity.id) as Array<{ name: string }>;
        setDistricts(d.map((x) => x.name));
      } else setDistricts([]);
      setNeighborhoods([]);
    } catch { setDistricts([]); setNeighborhoods([]); }
  };

  const handleDistrictChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDistrict = e.target.value;
    setFormData((prev) => ({ ...prev, district: selectedDistrict, neighborhood: "" }));
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

  const handleTermsCheckChange = (field: "termsOfUse" | "privacyPolicy", checked: boolean) => {
    const updated = { ...termsChecks, [field]: checked };
    setTermsChecks(updated);
    setFormData((prev) => ({ ...prev, termsAccepted: updated.termsOfUse && updated.privacyPolicy }));
  };

  return (
    <>
      <div className="individual-register">
        <div className="register-container">
          <div className="register-header">
            <div className="register-header-top">
              <div className="register-icon-squircle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span className="register-badge">BİREYSEL HESAP</span>
            </div>
            <h1><span className="accent-text">Acillazım</span> Bireysel Hesap Aç</h1>
            <p>Hemen hesabınızı oluşturun, acil ilan ve fırsatları kaçırmayın</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-section-block">
              <div className="form-section-title">
                <span className="section-step">01</span>
                <span>Kişisel ve İletişim Bilgileri</span>
              </div>

              <div className="input-group">
                {["firstName", "lastName"].map((field) => (
                  <div key={field} className="input-field">
                    <label className="field-label">{field === "firstName" ? "Adınız" : "Soyadınız"}</label>
                    <input
                      type="text"
                      name={field}
                      placeholder={field === "firstName" ? "Adınız" : "Soyadınız"}
                      value={formData[field as keyof FormData] as string}
                      onChange={handleChange}
                      className={fieldErrors[field as keyof FieldErrors] ? "error" : ""}
                      required
                    />
                    {fieldErrors[field as keyof FieldErrors] && (
                      <div className="error-message">
                        <FontAwesomeIcon icon={faExclamationCircle} />
                        {fieldErrors[field as keyof FieldErrors]}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="input-group">
                <div className="input-field">
                  <label className="field-label">E-Posta Adresi</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="ornek@eposta.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={fieldErrors.email ? "error" : ""}
                    required
                  />
                  {fieldErrors.email && (
                    <div className="error-message">
                      <FontAwesomeIcon icon={faExclamationCircle} />
                      {fieldErrors.email}
                    </div>
                  )}
                </div>

                <div className="input-field">
                  <label className="field-label">Cep Telefonu</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="05XX XXX XX XX"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    pattern="0[5][0-9]{2} [0-9]{3} [0-9]{2} [0-9]{2}"
                    maxLength={14}
                  />
                  {formData.phone && !isValidPhoneNumber(formData.phone.replace(/\s/g, "")) && (
                    <div className="phone-error">Lütfen geçerli bir cep telefonu numarası giriniz</div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section-block">
              <div className="form-section-title">
                <span className="section-step">02</span>
                <span>Konum ve Adres Bilgileri</span>
              </div>

              <div className="input-group">
                <div className="input-field select-field">
                  <label className="field-label">İl</label>
                  <select name="province" value={formData.province} onChange={handleProvinceChange}>
                    <option value="">İl Seçin</option>
                    {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="input-field select-field">
                  <label className="field-label">İlçe</label>
                  <select name="district" value={formData.district} onChange={handleDistrictChange}>
                    <option value="">İlçe Seçin</option>
                    {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="input-field select-field">
                <label className="field-label">Mahalle / Köy</label>
                <select name="neighborhood" value={formData.neighborhood} onChange={handleChange} disabled={!formData.district}>
                  <option value="">Mahalle/Köy Seçin</option>
                  {neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="input-field">
                <label className="field-label">Açık Adres</label>
                <textarea
                  name="address"
                  placeholder="Cadde, sokak, bina ve daire bilgilerinizi giriniz"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={3}
                  className={fieldErrors.address ? "error" : ""}
                />
              </div>
            </div>

            <div className="form-section-block">
              <div className="form-section-title">
                <span className="section-step">03</span>
                <span>Hesap Güvenliği</span>
              </div>

              <div className="input-group">
                <div className="input-field password-field">
                  <label className="field-label">Şifre</label>
                  <div className="password-input-wrap">
                    <input
                      type={showPassword.password ? "text" : "password"}
                      name="password"
                      placeholder="Şifrenizi belirleyin"
                      value={formData.password}
                      onChange={handlePasswordChange}
                      className={fieldErrors.password ? "error" : ""}
                      required
                    />
                    <button type="button" className="toggle-password" onClick={() => togglePasswordVisibility("password")}>
                      {showPassword.password ? "Gizle" : "Göster"}
                    </button>
                  </div>
                </div>

                <div className="input-field password-field">
                  <label className="field-label">Şifre Tekrar</label>
                  <div className="password-input-wrap">
                    <input
                      type={showPassword.confirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Şifrenizi tekrar giriniz"
                      value={formData.confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      required
                    />
                    <button type="button" className="toggle-password" onClick={() => togglePasswordVisibility("confirmPassword")}>
                      {showPassword.confirmPassword ? "Gizle" : "Göster"}
                    </button>
                    {passwordMatch.isDirty && (
                      <FontAwesomeIcon
                        icon={passwordMatch.isMatching ? faCheck : faXmark}
                        className={`password-match-icon ${passwordMatch.isMatching ? "match" : "mismatch"}`}
                      />
                    )}
                  </div>
                </div>
              </div>

              {!isMobile && formData.password && passwordStrength.score < 4 && (
                <div className="password-feedback">
                  <div className="password-strength">
                    <div className="strength-bars">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={`strength-bar ${i < passwordStrength.score ? `level-${passwordStrength.score}` : ""}`} />
                      ))}
                    </div>
                    <span className={`strength-text level-${passwordStrength.score}`}>{passwordStrength.message}</span>
                  </div>
                  <div className="password-rules">
                    <h4>Şifre Belirleme Kuralları:</h4>
                    <ul>
                      <li className={formData.password.length >= 8 ? "valid" : ""}>En az 8 karakter</li>
                      <li className={/[A-Z]/.test(formData.password) ? "valid" : ""}>En az 1 büyük harf</li>
                      <li className={/[0-9]/.test(formData.password) ? "valid" : ""}>En az 1 rakam</li>
                      <li className={/[^A-Za-z0-9]/.test(formData.password) ? "valid" : ""}>En az 1 özel karakter</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="terms-container">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="termsAccept"
                  checked={termsChecks.termsOfUse}
                  onChange={(e) => handleTermsCheckChange("termsOfUse", e.target.checked)}
                  required
                />
                <label htmlFor="termsAccept" className="terms-text">
                  <span
                    className="contract-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setContractModalType("individual");
                      setShowContractModal(true);
                    }}
                  >
                    Bireysel Hesap Kullanım Koşullarını
                  </span>{" "}
                  okudum ve kabul ediyorum.
                </label>
              </div>

              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="privacyAccept"
                  checked={termsChecks.privacyPolicy}
                  onChange={(e) => handleTermsCheckChange("privacyPolicy", e.target.checked)}
                  required
                />
                <label htmlFor="privacyAccept" className="terms-text">
                  <span
                    className="contract-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setContractModalType("privacy");
                      setShowContractModal(true);
                    }}
                  >
                    Gizlilik Sözleşmesini
                  </span>{" "}
                  okudum ve kabul ediyorum.
                </label>
              </div>
            </div>

            <div className="recaptcha-container">
              <div id="recaptcha-container-individual" className="g-recaptcha" data-sitekey={RECAPTCHA.SITE_KEY} data-theme="light" />
            </div>

            <div className="register-actions-row">
              <button
                type="submit"
                className="register-button"
                disabled={!isFormValid() || !formData.termsAccepted || !formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword || !formData.phone}
              >
                Bireysel Hesap Oluştur
              </button>

              <div className="google-register-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleRegister}
                  onError={() => { setErrors(["Google ile kayıt olurken bir hata oluştu"]); setShowErrorModal(true); }}
                  useOneTap
                  text="signup_with"
                  theme="outline"
                  size="large"
                  shape="pill"
                  width="310"
                  logo_alignment="left"
                  locale="tr"
                  context="signup"
                  type="standard"
                />
              </div>
            </div>

            <div className={styles["login-link-container"]}>
              <a href="/giris" className={styles["login-link"]}>Zaten hesabın var mı? <span>👉 Giriş yap</span></a>
            </div>
          </form>
        </div>
      </div>

      {showErrorModal && (
        <div className="modal-overlay" onClick={(e) => { if ((e.target as HTMLElement).className === "modal-overlay") setShowErrorModal(false); }}>
          <div className="modal-content">
            <div className="modal-icon">!</div>
            <div className="modal-message">{errors[0]}</div>
            <button className="modal-button" onClick={() => setShowErrorModal(false)}>Tamam</button>
          </div>
        </div>
      )}

      <ContractModal show={showContractModal} onClose={() => setShowContractModal(false)} type={contractModalType} />
    </>
  );
};

export default Individual;
