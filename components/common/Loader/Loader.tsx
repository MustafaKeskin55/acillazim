"use client";

import React from 'react';
import './Loader.css';

const Loader: React.FC = () => {
  return (
    <div className="loader-container">
      <div className="loader">
        <div className="loader-circle"></div>
        <div className="loader-content">
          <span className="loader-text-acil">acil</span>
          <span className="loader-exclamation">!</span>
          <span className="loader-text-lazim">lazım</span>
          <span className="loader-text-com">.com</span>
        </div>
      </div>
      <div className="loader-status">Yükleniyor</div>
    </div>
  );
};

export default Loader;
