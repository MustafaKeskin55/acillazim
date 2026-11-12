"use client";

import React from 'react';
import './Breadcrumb.css';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  id?: string | number | null;
  name: string;
}

interface BreadcrumbProps {
  breadcrumbPath?: BreadcrumbItem[];
  onBreadcrumbClick?: ((item: BreadcrumbItem) => void) | null;
  isSelectionPage?: boolean;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  breadcrumbPath = [],
  onBreadcrumbClick,
  isSelectionPage = false
}) => {
  const pathname = usePathname();
  const isCurrentlyOnSelectionPage = pathname === '/kategori-sec' || isSelectionPage;

  // Breadcrumb öğelerini oluştur
  const renderBreadcrumbItems = () => {
    if (!breadcrumbPath || breadcrumbPath.length === 0) {
      return [
        <div key="default" className="breadcrumb-item">
          <span>İlan Ver</span>
        </div>
      ];
    }

    const items = breadcrumbPath.map((item, index) => (
      <div
        key={`breadcrumb-${index}`}
        className={`breadcrumb-item ${isCurrentlyOnSelectionPage && onBreadcrumbClick ? 'clickable' : ''}`}
        onClick={() => isCurrentlyOnSelectionPage && onBreadcrumbClick && onBreadcrumbClick(item)}
      >
        <span>{item.name}</span>
      </div>
    ));

    // Öğeler arasına "›" işareti ekle
    return items.reduce<React.ReactNode[]>((acc, item, index) => {
      if (index === 0) return [item];
      return [
        ...acc,
        <div key={`separator-${index}`} className="breadcrumb-separator">
          <span>›</span>
        </div>,
        item
      ];
    }, []);
  };

  return (
    <div className="breadcrumb-container">
      <div className="breadcrumb-content">
        <nav aria-label="breadcrumb">
          <div className="breadcrumb">
            {renderBreadcrumbItems()}
          </div>
        </nav>
        {/* Mobilde göster, PC'de gizle — CSS ile kontrol edilir */}
        {!isCurrentlyOnSelectionPage && onBreadcrumbClick && (
          <button
            onClick={() => onBreadcrumbClick({ id: null, name: 'İlan Ver' })}
            className="change-category-btn"
            style={{ display: 'none' }} // CSS @media (max-width: 768px) açar
          >
            değiştir
          </button>
        )}
      </div>
    </div>
  );
};

export default Breadcrumb;
