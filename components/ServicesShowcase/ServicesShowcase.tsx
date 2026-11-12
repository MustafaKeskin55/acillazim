"use client";

import React from 'react';
import './ServicesShowcase.css';

interface ServiceItem {
  name: string;
  image: string;
}

const SERVICES: ServiceItem[] = [
  { name: 'Evden Eve Nakliyat', image: '/images/services/category-image/Evden-Eve-Nakliyat.png' },
  { name: 'Oto Tamir & Servis', image: '/images/services/category-image/tamirci.png' },
  { name: 'Su Tesisatçısı', image: '/images/services/category-image/Tesisat.png' },
  { name: 'İnşaat & Hafriyat', image: '/images/services/category-image/inşaat.png' },
  { name: 'Ev Temizliği', image: '/images/services/category-image/temizlikçi.png' },
  { name: 'Boya & Badana', image: '/images/services/category-image/boyacı.png' },
  { name: 'Çekici & Yol Yardım', image: '/images/services/category-image/çekiçi.png' },
  { name: 'Oto Ekspertiz', image: '/images/services/category-image/Oto-Ekspertiz.png' },
  { name: 'Tamirci', image: '/images/services/category-image/tamirci.png' },
  { name: 'Elektrikçi', image: '/images/services/category-image/elektirikçi.png' },
  { name: 'Mobilya Montajı', image: '/images/services/category-image/Mobilya-Montajı.png' },
  { name: 'Camcı', image: '/images/services/category-image/Camcı.png' },
  { name: 'Çatı Tamiri', image: '/images/services/category-image/Çatı-Ustası-İzolasyon.png' },
  { name: 'Haşere & Böcek İlaçlama', image: '/images/services/category-image/Haşere-Böcek-İlaçlama.png' },
  { name: 'Web Tasarım & Yazılım Hizmetleri', image: '/images/services/category-image/Web-Tasarım-Yazılım-Hizmetleri.png' },
  { name: 'Beyaz Eşya Servisi', image: '/images/services/category-image/Beyaz-Eşya-Klima-Kombi-Tamiri.png' },
];

const ServicesShowcase: React.FC = () => {
  return (
    <section className="ss-section" aria-labelledby="ss-title">
      <div className="ss-inner">
        <header className="ss-header">
          <span className="ss-kicker">HİZMETLER</span>
          <h2 className="ss-title" id="ss-title">
            Profesyonel hizmet <span className="ss-accent">ağı</span>
          </h2>
          <p className="ss-subtitle">
            Evinden işyerine, acilden plana — ihtiyacın olan her hizmet tek yerde.
          </p>
        </header>

        <div className="ss-grid">
          {SERVICES.map((service, index) => (
            <div className="ss-card" key={index}>
              <div
                className="ss-card__bg"
                style={{ backgroundImage: `url(${service.image})` }}
                aria-hidden
              />
              <div className="ss-card__overlay" aria-hidden />
              <div className="ss-card__content">
                <h3 className="ss-card__name">{service.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesShowcase;
