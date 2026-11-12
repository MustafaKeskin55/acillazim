"use client";

import React, { useState } from 'react';
import './ForgotPassword.css';
import ForgotPasswordModal from './ForgotPasswordModal';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<string>('');
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json() as { message?: string };
      if (response.ok) {
        setModalType('success');
        setModalMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
        setEmail('');
      } else {
        setModalType('error');
        setModalMessage(data.message || 'Bir hata oluştu.');
      }
    } catch {
      setModalType('error');
      setModalMessage('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setIsLoading(false);
      setShowModal(true);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-form">
        <h2>Şifremi Unuttum</h2>
        <p>E-posta adresinizi girin, şifre sıfırlama bağlantısını gönderelim.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta adresiniz"
            required
            disabled={isLoading}
          />
          <button type="submit" className={isLoading ? 'loading' : ''} disabled={isLoading}>
            {isLoading ? '' : 'Şifremi Sıfırla'}
          </button>
        </form>
        <a href="/giris" className="back-to-login">Giriş sayfasına dön</a>
      </div>
      <ForgotPasswordModal show={showModal} message={modalMessage} type={modalType} onClose={() => setShowModal(false)} />
    </div>
  );
};

export default ForgotPassword;
