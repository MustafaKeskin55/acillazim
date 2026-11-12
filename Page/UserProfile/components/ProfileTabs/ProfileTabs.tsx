"use client";

import React, { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faList, 
  faListAlt, 
  faStar, 
  faUser,
  faShoppingBag,
  faShoppingCart,
  faStore,
  faTag,
  faTags,
  faBoxOpen,
  faClipboardList,
  faNewspaper
} from '@fortawesome/free-solid-svg-icons';
import './ProfileTabs.css';

/**
 * Profil sayfasındaki sekmeler bileşeni
 * @param {Function} onTabChange - Sekme değiştiğinde çağrılacak fonksiyon
 * @param {string} activeTab - Aktif sekme
 * @param {Object} stats - Kullanıcı istatistikleri
 */
const ProfileTabs = ({ onTabChange, activeTab, stats }) => {
  // Performans optimizasyonu için, sadece gerektiğinde loglama yapar
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log("[ProfileTabs] Stats:", stats);
    }
  }, [stats]);

  // Sekmelerin tanımlanması - tüm ikonlar için özel renk tanımlaması yapıldı
  const tabs = [
    {
      id: 'listings',
      label: 'İlanları',
      icon: faStore, // Mağaza/dükkan ikonu
      count: stats?.listingCounts?.active || 0,
      color: '#27ae60' // Yeşil
    },
    {
      id: 'reviews',
      label: 'Değerlendirmeler',
      icon: faStar, // Yıldız ikonu
      count: stats?.totalReviews || 0,
      color: '#f39c12' // Turuncu
    },
    {
      id: 'about',
      label: 'Hakkında',
      icon: faUser, // Kullanıcı ikonu
      count: null,
      color: '#3498db' // Mavi
    }
  ];

  // Sekme tıklama işleyicisi - useCallback ile optimize edildi
  const handleTabClick = useCallback((tabId) => {
    if (activeTab !== tabId) {
      onTabChange(tabId);
    }
  }, [activeTab, onTabChange]);

  return (
    <div className="profile-tabs">
      <div className="tabs-container">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            data-tab={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            <span className="tab-icon" style={{ color: tab.color }}>
              <FontAwesomeIcon icon={tab.icon} />
            </span>
            <span className="tab-label">{tab.label}</span>
            {tab.count !== null && (
              <span 
                className={`tab-count ${tab.id === 'listings' ? 'listing-count' : tab.id === 'reviews' ? 'review-count' : ''}`}
                style={activeTab !== tab.id ? { backgroundColor: `${tab.color}15`, color: tab.color } : {}}
              >
                {tab.count}
              </span>
            )}
            
            {/* Aktif sekme göstergesi */}
            {activeTab === tab.id && <div className="active-indicator" style={{ backgroundColor: tab.color }}></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// Gereksiz re-render'ları önlemek için React.memo kullanılıyor
export default React.memo(ProfileTabs); 