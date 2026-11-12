"use client";

import React from 'react';
import './Header.css';

function Header() {
  const handleMessageClick = () => {
    window.location.href = '/dashboard/messages';
  };

  const handleFavoritesClick = () => {
    window.location.href = '/dashboard/favoriler';
  };

  return (
    <div className="header-icons">
      <div className="message-icon" onClick={handleMessageClick}>
        <i className="far fa-envelope"></i>
      </div>

      <div className="favorites-icon" onClick={handleFavoritesClick}>
        <i className="far fa-heart"></i>
      </div>
    </div>
  );
}

export default Header;
