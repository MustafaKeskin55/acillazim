"use client";

import React from 'react';
import './Loader.css';

const Loader: React.FC = () => {
  return (
    <div className="loader-container">
      <div className="loader">
        <div className="circle-loader">
          <svg viewBox="0 0 100 100">
            <circle className="circle-path" cx="50" cy="50" r="40" />
          </svg>
          <div className="pulse-rings">
            <div className="loader-ring ring1"></div>
            <div className="loader-ring ring2"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loader;
