"use client";

import React, { useState } from 'react';
import './ShareSection.css';

const ShareSection = ({ url, title }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Paylaşım URL'ini oluştur
  const shareUrl = url || window.location.href;
  const shareTitle = title || document.title;
  
  // Sosyal medya paylaşım URL'leri oluştur
  const socialLinks = [
    {
      name: 'Facebook',
      icon: 'fab fa-facebook-f',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Twitter',
      icon: 'fab fa-twitter',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`
    },
    {
      name: 'WhatsApp',
      icon: 'fab fa-whatsapp',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`
    },
    {
      name: 'LinkedIn',
      icon: 'fab fa-linkedin-in',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    }
  ];
  
  // URL'i panoya kopyala
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };
  
  // Dropdown menüyü aç/kapat
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  // Dropdown menü dışı tıklandığında kapat
  const closeDropdown = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDropdownOpen(false);
    }
  };
  
  return (
    <div 
      className="product-detail-share-section" 
      onBlur={closeDropdown}
      tabIndex="0"
    >
      <button 
        type="button" 
        className="product-detail-share-button" 
        onClick={toggleDropdown}
        aria-label="Paylaş"
        aria-expanded={isDropdownOpen}
      >
        <i className="fas fa-share-alt"></i>
        <span>Paylaş</span>
      </button>
      
      {isDropdownOpen && (
        <div className="product-detail-share-dropdown">
          <h3 className="product-detail-share-title">
            <i className="fas fa-share-alt"></i>
            Bu ilanı paylaş
          </h3>
          
          <div className="product-detail-social-links">
            {socialLinks.map((socialLink, index) => (
              <a 
                key={index}
                href={socialLink.url}
                className="product-detail-social-button"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${socialLink.name} ile paylaş`}
              >
                <i className={socialLink.icon}></i>
                <span>{socialLink.name}</span>
              </a>
            ))}
          </div>
          
          <div className="product-detail-share-link-section">
            <label className="product-detail-share-link-label">Bağlantıyı Kopyala</label>
            <div className="product-detail-share-link-input-group">
              <input 
                type="text" 
                className="product-detail-share-link-input" 
                value={shareUrl} 
                readOnly 
                onClick={(e) => e.target.select()}
              />
              <button 
                type="button"
                className="product-detail-copy-button"
                onClick={copyToClipboard}
              >
                <i className={isCopied ? "fas fa-check" : "far fa-copy"}></i>
                <span>{isCopied ? "Kopyalandı" : "Kopyala"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareSection; 