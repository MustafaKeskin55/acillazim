'use client';

import React, { useState, useEffect } from 'react';
import { IoChevronForward } from 'react-icons/io5';
import * as Fa6Icons from 'react-icons/fa6';
import * as IoIcons from 'react-icons/io5';
import * as GiIcons from 'react-icons/gi';
import * as BsIcons from 'react-icons/bs';
import * as MdIcons from 'react-icons/md';
import * as LuIcons from 'react-icons/lu';
import * as BiIcons from 'react-icons/bi';
import * as RxIcons from 'react-icons/rx';
import { createListingService } from '@/services/createListing';
import './PostAdCategories.css';

interface Category {
  category_id: string | number;
  label: string;
  icon?: string;
  bgColor?: string;
  iconComponent?: React.ReactNode;
  subCategoriesText?: string;
}

interface PostAdCategoriesProps {
  onCategoryClick: (categoryId: string | number, categoryName: string, subCategoriesCount: number) => void;
}

type IconLibrary = Record<string, React.ComponentType<{ size?: number }>>;

const iconLibraries: Record<string, IconLibrary> = {
  Fa: Fa6Icons as unknown as IconLibrary,
  Io: IoIcons as unknown as IconLibrary,
  Gi: GiIcons as unknown as IconLibrary,
  Bs: BsIcons as unknown as IconLibrary,
  Md: MdIcons as unknown as IconLibrary,
  Lu: LuIcons as unknown as IconLibrary,
  Bi: BiIcons as unknown as IconLibrary,
  Rx: RxIcons as unknown as IconLibrary,
};

function getIconComponent(iconName?: string): React.ReactNode {
  if (!iconName) return <RxIcons.RxCube size={28} />;

  const prefix = iconName.slice(0, 2);
  const lib = iconLibraries[prefix];

  if (lib && lib[iconName]) {
    const IconComponent = lib[iconName];
    return <IconComponent size={28} />;
  }

  return <RxIcons.RxCube size={28} />;
}

function PostAdCategories({ onCategoryClick }: PostAdCategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const mainCategories = await createListingService.getMainCategories() as Category[];

      const categoriesWithDetails = await Promise.all(
        mainCategories.map(async (category) => {
          try {
            const subCategories = await createListingService.getSubCategories(category.category_id) as unknown[];
            return {
              ...category,
              iconComponent: getIconComponent(category.icon),
              subCategoriesText: `${subCategories.length} alt kategori`,
            };
          } catch {
            return {
              ...category,
              iconComponent: getIconComponent(category.icon),
              subCategoriesText: '—',
            };
          }
        }),
      );

      setCategories(categoriesWithDetails);
    } catch {
      setError('Kategoriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (categoryId: string | number, categoryName: string) => {
    try {
      const subCategories = await createListingService.getSubCategories(categoryId) as unknown[];
      const subCategoriesCount = subCategories?.length ?? 0;

      sessionStorage.setItem('selectedMainCategory', categoryName);
      sessionStorage.setItem('selectedMainCategoryId', String(categoryId));

      if (onCategoryClick) {
        onCategoryClick(categoryId, categoryName, subCategoriesCount);
      }
    } catch {
      if (onCategoryClick) {
        onCategoryClick(categoryId, categoryName, 0);
      }
    }
  };

  if (loading) {
    return (
      <div className="post-ad-container">
        <div className="post-ad-content">
          <h1>İlan Kategorileri</h1>
          <p className="post-ad-subtitle">İlanınızı yayınlamak için kategori seçin</p>
          <div className="post-ad-grid">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="post-ad-item post-ad-item--skeleton" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="post-ad-container">
        <div className="post-ad-content">
          <div className="post-ad-error">
            <p>{error}</p>
            <button onClick={loadCategories} className="post-ad-retry-btn">
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="post-ad-container">
      <div className="post-ad-content">
        <h1>İlan Kategorileri</h1>
        <p className="post-ad-subtitle">İlanınızı yayınlamak için kategori seçin</p>

        {/* Desktop & tablet: card grid */}
        <div className="post-ad-grid">
          {categories.map((category) => (
            <div
              key={category.category_id}
              className="post-ad-item"
              onClick={() => handleClick(category.category_id, category.label)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleClick(category.category_id, category.label)}
            >
              <div
                className="post-ad-icon"
                style={{ backgroundColor: category.bgColor ?? '#6366f1' }}
              >
                {category.iconComponent ?? '📦'}
              </div>
              <div className="post-ad-text">
                <span className="post-ad-name">{category.label}</span>
                <span className="post-ad-sub">{category.subCategoriesText}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: list view */}
        <div className="post-ad-mobile-list">
          {categories.map((category) => (
            <div
              key={`m-${category.category_id}`}
              className="post-ad-mobile-item"
              onClick={() => handleClick(category.category_id, category.label)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleClick(category.category_id, category.label)}
            >
              <div
                className="post-ad-mobile-icon"
                style={{ backgroundColor: category.bgColor ?? '#6366f1' }}
              >
                {category.iconComponent ?? '📦'}
              </div>
              <div className="post-ad-mobile-text">
                <span className="post-ad-mobile-name">{category.label}</span>
                <span className="post-ad-mobile-sub">{category.subCategoriesText}</span>
              </div>
              <IoChevronForward className="post-ad-mobile-arrow" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PostAdCategories;
