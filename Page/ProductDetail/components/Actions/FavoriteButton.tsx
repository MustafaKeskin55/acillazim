"use client";

import React from 'react';
import './FavoriteButton.css';

const FavoriteButton = ({ isFavorite, onClick }) => {
  return (
    <button 
      className={`product-detail-favorite-button ${isFavorite ? 'active' : ''}`}
      onClick={onClick}
      aria-label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      title={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
    >
      <i className={`${isFavorite ? 'fas' : 'far'} fa-heart`}></i>
      <span>{isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}</span>
    </button>
  );
};

export default FavoriteButton; 