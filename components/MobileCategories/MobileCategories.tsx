"use client";

import React from 'react';
import './MobileCategories.css';

const MobileCategories: React.FC = () => {
    return (
        <div className="mobile-categories-container">
            <div className="mobile-categories-content">
                <div className="categories-list">
                    <div className="temporary-categories-message">
                        <h3>Kategoriler yakında eklenecektir</h3>
                        <p>Kategori listesi güncelleniyor. Lütfen daha sonra tekrar kontrol ediniz.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileCategories;
