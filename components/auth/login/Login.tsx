"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import authService from '@/services/auth/authService';
import { RECAPTCHA } from '@/config/constants';
import ErrorModal from '@/components/common/ErrorModal';
import NotMemberModal from '@/components/common/NotMemberModal';
import './Login.css';
import './Logo.css';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { FcGoogle } from 'react-icons/fc';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

interface FormData {
  email: string;
  password: string;
}

interface DemoUser {
  username: string;
  password: string;
  token: string;
  roles: string[];
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

const demoUsers: DemoUser[] = [
  {
    username: 'demo@acillazim.com',
    password: 'Acillazim.com1',
    token: 'fake-jwt-token-12345',
    roles: ['USER'],
  },
];

const Login: React.FC = () => {
  const { updateAuthState } = useAuth() as { updateAuthState: (a: boolean, b: unknown, c: string) => void };
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({ email: 'admin@acillazim.com', password: '123456' });
  const [error, setError] = useState<string>('');
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [showNotMemberModal, setShowNotMemberModal] = useState<boolean>(false);

  const getRedirectPath = (): string => {
    if (typeof window === 'undefined') return '/';
    const params = new URLSearchParams(window.location.search);
    const redirectAfter = params.get('redirect_after');
    return redirectAfter ? decodeURIComponent(redirectAfter) : '/';
  };

  useEffect(() => {
    const loadReCaptcha = () => {
      if (!document.querySelector('script[src*="recaptcha/api.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js';
        script.async = true;
        script.defer = true;
        script.onerror = () => console.error('reCAPTCHA script yüklenemedi');
        script.onload = () => {
          setTimeout(() => {
            if (window.grecaptcha && !window.grecaptcha.render) {
              window.grecaptcha.render('recaptcha-container-login', { sitekey: RECAPTCHA.SITE_KEY });
            }
          }, 500);
        };
        document.head.appendChild(script);
      }
    };
    loadReCaptcha();
  }, []);

  const getReCaptchaToken = async (): Promise<string | null> => {
    try {
      if (window.grecaptcha && window.grecaptcha.getResponse) {
        const response = window.grecaptcha.getResponse();
        return response || null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const verifyRecaptcha = async (): Promise<boolean> => {
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const recaptchaValid = await verifyRecaptcha();
    if (!recaptchaValid) return;

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email || !formData.password) {
      setError('Lütfen tüm alanları doldurunuz');
      setShowErrorModal(true);
      return;
    }
    if (!emailRegex.test(formData.email)) {
      setError('Geçerli bir e-posta adresi giriniz');
      setShowErrorModal(true);
      return;
    }

    try {
      const recaptchaToken = await getReCaptchaToken();
      const loginData = { username: formData.email, password: formData.password, recaptchaToken: recaptchaToken || 'no-token' };
      const { user, token } = await authService.login(loginData) as { user: unknown; token: string };
      updateAuthState(true, user, 'email');
      setFormData({ email: '', password: '' });
      window.location.replace(getRedirectPath());
    } catch (err) {
      console.error('Login error:', err);
      setError((err as Error).message || 'Giriş yapılırken bir hata oluştu');
      setShowNotMemberModal(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) return;
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);
      const userData = {
        email: decoded.email,
        firstName: decoded.given_name || '',
        lastName: decoded.family_name || '',
        picture: decoded.picture || '',
      };
      const { user } = await authService.loginWithGoogle({ credential: credentialResponse.credential, userData }) as { user: unknown; token: string };
      updateAuthState(true, user, 'google');
      window.location.replace(getRedirectPath());
    } catch (err) {
      console.error('Google login error:', err);
      setError('Google ile giriş yapılamadı');
      setShowErrorModal(true);
    }
  };

  return (
    <div className="login-container">
      <img src="/images/ucgenbos.png" alt="Üçgen" className="triangle-image" />
      <div className="triangle-text">Türkiye&apos;nin Sıra <br /> Dışı Platformu</div>
      <img src="/images/user.png" alt="Kullanıcı" className="user-image" />
      <img src="/images/ucgenbos.png" alt="Logo" className="logo-image" />

      <div
        className="uye-ol-wrapper"
        onClick={() => { window.location.href = '/uyelik-sec'; }}
        role="button"
        tabIndex={0}
        aria-label="Eğer Üye Değilsen Hemen Üye Ol"
      >
        <div className="uye-ol-content">
          <div className="uye-ol-text">Eğer Üye Değilsen</div>
          <div className="uye-ol-icon-wrap">👇</div>

          <div className="uye-ol-icon">

          </div>
          <div className="uye-ol-button">
            Hemen Üye Ol
          </div>
        </div>
      </div>

      <div className="login-form-container">
        <div className="login__header">
          {typeof window !== 'undefined' && window.location.search.includes('ilan-ver') && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(10, 56, 113, 0.08)',
                border: '1px solid rgba(10, 56, 113, 0.16)',
                borderRadius: '20px',
                padding: '6px 14px',
                color: '#0a3871',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '10px',
              }}
            >
              <span>✨ İlan verebilmek için lütfen giriş yapın</span>
            </div>
          )}

          <h1><span>Acillazım</span> Giriş Yap</h1>
          <p>Hemen giriş yapın fırsatları kaçırmayın</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login__form-group">
          <label className="login__label">E-Posta Adresi</label>
            <div className="login__input-wrap">
              <input type="email" className="login__input" placeholder="ornek@eposta.com" name="email" value={formData.email} onChange={handleChange} required />
            </div>
          </div>
          <div className="login__password-group">
            <div className="login__label-row">
              <label className="login__label">Şifre</label>
              <a href="/sifremi-unuttum" className="login__forgot-inline">Şifremi Unuttum</a>
            </div>
            <div className="login__input-wrap">
              <input type={showPassword ? 'text' : 'password'} className="login__input" placeholder="••••••••" name="password" value={formData.password} onChange={handleChange} required />
            </div>
            <button
              type="button"
              className="login__show-password"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
              <span>{showPassword ? 'Gizle' : 'Göster'}</span>
            </button>
          </div>
          <div className="login__forgot-password">
            <a href="/sifremi-unuttum">Şifremi Unuttum</a>
          </div>
          <div className="recaptcha-container">
            <div id="recaptcha-container-login" className="g-recaptcha" data-sitekey={RECAPTCHA.SITE_KEY} data-theme="light" />
          </div>
          <button type="submit" className="login__button">
            <span>Giriş Yap</span>
          </button>
        </form>

        <a href="/uyelik-sec" className="mobile-register-button">
          <span>Hesabınız yok mu? <strong>Kayıt Olun</strong></span>
        </a>
        <div className="login__divider">
          <span>VEYA</span>
        </div>

        <div className="login__social-buttons">
          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => { setError('Google ile giriş yapılamadı'); setShowErrorModal(true); }}
              useOneTap
              text="signin_with"
              theme="outline"
              size="large"
              shape="pill"
              width="300"
              logo_alignment="left"
              locale="tr"
              context="signin"
              type="standard"
            />
          </div>
        </div>
      </div>

      <ErrorModal show={showErrorModal} errors={error} onClose={() => setShowErrorModal(false)} />
      <NotMemberModal show={showNotMemberModal} onClose={() => { setShowNotMemberModal(false); window.location.href = '/membership-selection'; }} />
    </div>
  );
};

export default Login;
