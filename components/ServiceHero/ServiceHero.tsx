"use client";

import React from 'react';
import './ServiceHero.css';

const ServiceHero: React.FC = () => {
    return (
        <section className="service-hero-section">
            <div className="service-hero-content">
                <h2 className="service-hero-title">
                    Senin gibi hizmet verenler
                    <br />
                    <span className="service-hero-highlight">burada kazanıyor!</span>
                </h2>
                <p className="service-hero-description">
                    İlanını aç, öne çık, bölgenin en çok tercih edilenlerinden biri ol.
                    İşini dijitale taşımanın tam zamanı.
                </p>
                <button type="button" className="service-hero-button">
                    Hemen Başla
                </button>
            </div>

            <div className="service-hero-deco" aria-hidden>
                <div className="deco-pill">
                    <span className="num">01</span>
                    <span>Ücretsiz ilan oluştur</span>
                </div>
                <div className="deco-pill">
                    <span className="num">02</span>
                    <span>Bölgenden müşteri bul</span>
                </div>
                <div className="deco-pill">
                    <span className="num">03</span>
                    <span>Kazancını artır</span>
                </div>
            </div>
        </section>
    );
};

export default ServiceHero;
