"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import './UserDropdown.css';
import { FaUserCog, FaUserAlt, FaKey, FaClipboardList } from 'react-icons/fa';
import { BiLogOut } from 'react-icons/bi';
import { BsCalendarCheck } from 'react-icons/bs';
import authService from '@/services/auth/authService';

interface UserDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ isOpen, onClose, onLogout }) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleProfile = () => {
    router.push('/dashboard/profil');
    onClose();
  };

  const handleListings = () => {
    router.push('/dashboard/aktif-ilanlar');
    onClose();
  };

  const handleAppointments = () => {
    router.push('/dashboard/randevular');
    onClose();
  };

  const handleDashboard = () => {
    router.push('/dashboard');
    onClose();
  };

  const handleSecurity = () => {
    router.push('/dashboard/sifre-ve-guvenlik');
    onClose();
  };

  const handleLogout = () => {
    try {
      console.log("Çıkış işlemi başlatılıyor...");
      
      if (typeof onLogout === 'function') {
        onLogout();
      }
      
      (authService as { logout: () => void }).logout();
    } catch (error) {
      console.error("Çıkış yapılırken hata:", error);
      
      localStorage.clear();
      sessionStorage.clear();
      
      const pastDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = `auth_token=; path=/; max-age=0; expires=${pastDate}; secure; samesite=strict`;
      document.cookie = `refresh_token=; path=/; max-age=0; expires=${pastDate}; secure; samesite=strict`;
      
      window.location.replace('/');
    }
  };

  return (
    <div className="user-dropdown">
      <div className="user-dropdown-item" onClick={handleProfile}>
        <FaUserAlt className="dropdown-icon" />
        <span>Profilim</span>
      </div>
      <div className="user-dropdown-item" onClick={handleListings}>
        <FaClipboardList className="dropdown-icon" />
        <span>İlanlarım</span>
      </div>
      <div className="user-dropdown-item" onClick={handleAppointments}>
        <BsCalendarCheck className="dropdown-icon" />
        <span>Randevularım</span>
      </div>
      <div className="user-dropdown-item" onClick={handleDashboard}>
        <FaUserCog className="dropdown-icon" />
        <span>Yönetim Paneli</span>
      </div>
      <div className="user-dropdown-item" onClick={handleSecurity}>
        <FaKey className="dropdown-icon" />
        <span>Şifre ve Güvenlik</span>
      </div>
      <div className="user-dropdown-item" onClick={handleLogout}>
        <BiLogOut className="dropdown-icon" />
        <span>Çıkış Yap</span>
      </div>
    </div>
  );
};

export default UserDropdown;
