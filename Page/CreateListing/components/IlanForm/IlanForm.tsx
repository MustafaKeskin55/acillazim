'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb2 from '@/components/Breadcrumb2/Breadcrumb2';
import ModernForm from './ModernForm';
import createListingService from '@/services/createListing';

interface BreadcrumbItem {
  id: string | number;
  name: string;
  url: string;
  isClickable?: boolean;
  isSpecialPage?: boolean;
  categoryLevel?: number;
}

const IlanForm = () => {
  const router = useRouter();
  const [categoryPath, setCategoryPath] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    /* Önizleme sayfasından geri dönüş ise veriyi koru */
    const fromPreview = sessionStorage.getItem('returningFromPreview');
    if (fromPreview) {
      sessionStorage.removeItem('returningFromPreview');
      return;
    }
    const shouldClear = createListingService.checkFormShouldClear();
    if (shouldClear) {
      createListingService.clearFormSession();
    }
  }, []);

  useEffect(() => {
    return () => {
      createListingService.markFormExit();
    };
  }, []);

  useEffect(() => {
    const buildCategoryPath = () => {
      const path: BreadcrumbItem[] = [];

      path.push({
        name: 'İlan Ver',
        url: '/ilan-ver',
        id: 'ilan-ver',
        isClickable: true,
        isSpecialPage: true,
      });

      const selectedMainCategory = sessionStorage.getItem('selectedMainCategory');
      if (selectedMainCategory) {
        path.push({
          name: selectedMainCategory,
          id: 'main-category',
          url: `/kategori-sec?kategori=${selectedMainCategory}`,
          isClickable: true,
        });
      }

      for (let i = 1; i <= 6; i++) {
        const levelId = sessionStorage.getItem(`level${i}_id`);
        const levelName = sessionStorage.getItem(`level${i}_name`);

        if (levelId && levelName) {
          path.push({
            id: levelId,
            name: levelName,
            url: `/kategoriler/${levelName.toLowerCase().replace(/\s+/g, '-')}`,
            isClickable: true,
            categoryLevel: i,
          });
        }
      }

      setCategoryPath(path);
    };

    buildCategoryPath();
  }, []);

  const handleCategoryBreadcrumbClick = () => {
    sessionStorage.removeItem('currentFormData');
    sessionStorage.removeItem('selectedCity');
    sessionStorage.removeItem('selectedDistrict');
    sessionStorage.removeItem('selectedNeighborhood');
    sessionStorage.removeItem('lastFormCategory');
    sessionStorage.removeItem('categoryFieldLabels');

    for (let i = 1; i <= 6; i++) {
      sessionStorage.removeItem(`level${i}_id`);
      sessionStorage.removeItem(`level${i}_name`);
    }

    sessionStorage.removeItem('currentLevel');
    sessionStorage.removeItem('selectedCategoryId');
    sessionStorage.removeItem('selectedCategories');
    sessionStorage.removeItem('selectedMainCategory');

    router.push('/kategori-sec');
  };

  const handleSubmit = () => {
    // handled inside ModernForm
  };

  return (
    <>
      <div className="ilanform-breadcrumb-wrapper">
        <Breadcrumb2
          containerClass="ilanform-breadcrumb-container"
          categoryPath={categoryPath}
          onCategoryClick={(item: BreadcrumbItem) => {
            if (item.id === 'ilan-ver') {
              router.push('/ilan-ver');
            } else if (item.id === 'main-category' || (item.isClickable && item.categoryLevel)) {
              handleCategoryBreadcrumbClick();
            }
          }}
        />
      </div>

      <div className="container">
        <ModernForm onSubmit={handleSubmit} />
      </div>
    </>
  );
};

export default IlanForm;
