"use client";

import React from 'react';
import './ListingBadge.css';

interface ListingBadgeProps {
  type: string;
  className?: string;
  variant?: 'card' | 'gallery';
}

const processType = (typeStr: string): string => {
  if (typeof typeStr !== 'string') return '';
  return typeStr.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ö/g, 'o')
    .replace(/[^\w-]/g, '');
};

const getStandardizedType = (typeStr: string): string => {
  const lowerType = typeof typeStr === 'string' ? typeStr.toLowerCase() : '';
  if (lowerType.includes('acil')) return 'acil';
  if (lowerType.includes('ön')) return 'one-cikan';
  if (lowerType.includes('yeni')) return 'yeni';
  if (lowerType.includes('jet')) return 'jet';
  if (lowerType.includes('kiral') && lowerType.includes('günl')) return 'gunluk-kiralik';
  if (lowerType.includes('kiral')) return 'kiralik';
  if (lowerType.includes('satil') || lowerType.includes('satıl')) return 'satilik';
  return processType(typeStr);
};

const ListingBadge: React.FC<ListingBadgeProps> = ({ type, className = '', variant = 'card' }) => {
  if (!type) return null;
  const safeClass = getStandardizedType(type);
  const badgeTypeClass = safeClass ? `listing-badge-${safeClass}` : 'listing-badge-default';
  return (
    <div className={`listing-badge listing-badge-${variant} ${badgeTypeClass} ${className}`}>
      {type}
    </div>
  );
};

export default ListingBadge;
