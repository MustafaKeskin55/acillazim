"use client";

import React, { useState } from 'react';
import './ListingPriceCard.css';

interface LocationData {
  ilce?: string;
  il?: string;
}

interface FeaturesData {
  metrekare?: string | number;
  m2?: string | number;
  alan?: string | number;
  oda_sayisi?: string | number;
  oda?: string | number;
}

interface ListingPriceCardProps {
  price?: number | null;
  currency?: string;
  location?: LocationData;
  features?: FeaturesData;
  phone?: string;
  className?: string;
}

const currencySymbols: Record<string, string> = {
  TRY: '₺', TL: '₺', EUR: '€', USD: '$', GBP: '£',
};

const ListingPriceCard: React.FC<ListingPriceCardProps> = ({
  price, currency = '₺', location, features, phone, className = '',
}) => {
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);

  const formatPrice = (value?: number | null): string => {
    if (!value && value !== 0) return 'Fiyat belirtilmemiş';
    return new Intl.NumberFormat('tr-TR').format(value);
  };

  const formatPhoneNumber = (phoneNumber?: string): string | null => {
    if (!phoneNumber) return null;
    if (phoneNumber.length === 10)
      return `(${phoneNumber.substring(0, 3)}) ${phoneNumber.substring(3, 6)} ${phoneNumber.substring(6, 10)}`;
    if (phoneNumber.length === 11 && phoneNumber.startsWith('0'))
      return `(${phoneNumber.substring(1, 4)}) ${phoneNumber.substring(4, 7)} ${phoneNumber.substring(7, 11)}`;
    return phoneNumber;
  };

  const getCurrencySymbol = (): string => {
    if (!currency) return '₺';
    return currencySymbols[currency.toUpperCase()] || currency;
  };

  const locationText = location
    ? `${location.ilce || ''}, ${location.il || ''}`
    : 'Konum belirtilmemiş';

  const squareMeters = features?.metrekare ?? features?.m2 ?? features?.alan ?? '-';
  const roomCount = features?.oda_sayisi ?? features?.oda ?? '-';
  const currencySymbol = getCurrencySymbol();

  return (
    <div className={`listing-price-card ${className}`}>
      <div className="listing-price-card-header">
        <h2 className="listing-price">{currencySymbol} {formatPrice(price)}</h2>
        <div className="listing-price-card-location">
          <i className="fas fa-map-marker-alt" /> {locationText}
        </div>
      </div>
      <div className="listing-price-card-details">
        {squareMeters !== '-' && (
          <div className="listing-price-card-detail">
            <i className="fas fa-ruler-combined" /><span>{squareMeters} m²</span>
          </div>
        )}
        {roomCount !== '-' && (
          <div className="listing-price-card-detail">
            <i className="fas fa-door-open" /><span>{roomCount} Oda</span>
          </div>
        )}
      </div>
      <div className="listing-price-card-contact">
        <button className="listing-price-card-phone-button" onClick={() => setIsPhoneVisible(!isPhoneVisible)}>
          <i className="fas fa-phone-alt" />
          {isPhoneVisible ? formatPhoneNumber(phone) : 'Telefon Numarasını Göster'}
        </button>
        <a
          href={`https://wa.me/${phone?.replace(/\D/g, '')}`}
          className="listing-price-card-whatsapp-button"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fab fa-whatsapp" /> WhatsApp ile İletişim
        </a>
      </div>
    </div>
  );
};

export default ListingPriceCard;
