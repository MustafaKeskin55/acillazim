'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ProgressSteps from '@/components/common/ProgressSteps';
import Breadcrumb2 from '@/components/Breadcrumb2/Breadcrumb2';
import CategoryLists from './CategoryLists';
import { createListingService } from '@/services/createListing';
import './CategorySelection.css';
import '../ilan-ver/CreateListingGuard.css';
import { checkProfileCompleteness, MissingProfileField } from '@/services/api/ürapi';
import { IoWarningOutline, IoArrowForward, IoCloseCircleOutline } from 'react-icons/io5';
import { IoChevronBack } from 'react-icons/io5';

interface SelectedCategory {
  id: string | number;
  name: string;
}

interface SelectedCategories {
  [key: string]: SelectedCategory | null;
}

interface CategoryItem {
  id: string | number;
  name: string;
  hasChildren?: boolean;
  icon?: string | null;
  [key: string]: unknown;
}

interface Categories {
  [key: string]: CategoryItem[];
}

function CategorySelectionInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [mobileDisplayLevel, setMobileDisplayLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMainCategory, setSelectedMainCategory] = useState('');
  const [categories, setCategories] = useState<Categories>({
    level1: [],
    level2: [],
    level3: [],
    level4: [],
    level5: [],
    level6: [],
  });
  const [showSummary, setShowSummary] = useState(false);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [profileBlocked, setProfileBlocked] = useState<boolean>(false);
  const [missingProfileFields, setMissingProfileFields] = useState<MissingProfileField[]>([]);
const [selectedCategories, setSelectedCategories] = useState<SelectedCategories>({
    level1: null,
    level2: null,
    level3: null,
    level4: null,
    level5: null,
    level6: null,
  });
  const [categoryCache, setCategoryCache] = useState<Record<string, CategoryItem[]>>({});

  // Read selected categories from URL / sessionStorage
  const getSelectedCategoriesFromUrl = useCallback((): SelectedCategories => {
    const result: SelectedCategories = {};

    for (let i = 1; i <= 6; i++) {
      const key = `level${i}`;
      const nameFromUrl = searchParams.get(key);

      if (nameFromUrl) {
        const id = sessionStorage.getItem(`${key}_id`) ?? localStorage.getItem(`${key}_id`);
        result[key] = { name: nameFromUrl, id: id ?? '' };
      } else {
        const storedName =
          sessionStorage.getItem(`${key}_name`) ?? localStorage.getItem(`${key}_name`);
        const storedId =
          sessionStorage.getItem(`${key}_id`) ?? localStorage.getItem(`${key}_id`);

        result[key] = storedName && storedId ? { name: storedName, id: storedId } : null;
      }
    }

    return result;
  }, [searchParams]);

  // Keep selectedCategories in sync with URL
  useEffect(() => {
    const newSel = getSelectedCategoriesFromUrl();
    setSelectedCategories(newSel);

    for (let i = 6; i >= 1; i--) {
      if (newSel[`level${i}`]?.name) {
        setCurrentLevel(i);
        break;
      }
      if (i === 1) setCurrentLevel(1);
    }
  }, [searchParams, getSelectedCategoriesFromUrl]);

  // Initial data load
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const mainCategory = sessionStorage.getItem('selectedMainCategory');
      const mainCategoryId = sessionStorage.getItem('selectedMainCategoryId');

      if (!mainCategory || !mainCategoryId) {
        router.push('/');
        return;
      }

      const navigatingFromIlanForm = sessionStorage.getItem('navigatingFromIlanForm');
      const targetCategoryLevel = parseInt(
        sessionStorage.getItem('targetCategoryLevel') ?? '0',
        10,
      );

      if (isFirstLoad && !isNavigatingBack && !navigatingFromIlanForm) {
        for (let i = 1; i <= 6; i++) {
          localStorage.removeItem(`level${i}_id`);
          localStorage.removeItem(`level${i}_name`);
          sessionStorage.removeItem(`level${i}_id`);
          sessionStorage.removeItem(`level${i}_name`);
        }

        setSelectedCategories({
          level1: null, level2: null, level3: null,
          level4: null, level5: null, level6: null,
        });

        router.replace(pathname);
        setIsFirstLoad(false);
      } else if (navigatingFromIlanForm) {
        sessionStorage.removeItem('navigatingFromIlanForm');
        sessionStorage.removeItem('targetCategoryLevel');
        if (targetCategoryLevel > 0) setCurrentLevel(targetCategoryLevel);
        setIsFirstLoad(false);
      }

      const previousMainCategory = localStorage.getItem('currentMainCategory');
      if (previousMainCategory !== mainCategory && !isNavigatingBack) {
        for (let i = 1; i <= 6; i++) {
          localStorage.removeItem(`level${i}_id`);
          localStorage.removeItem(`level${i}_name`);
          sessionStorage.removeItem(`level${i}_id`);
          sessionStorage.removeItem(`level${i}_name`);
        }
        localStorage.setItem('currentMainCategory', mainCategory);
        localStorage.setItem('currentMainCategoryId', mainCategoryId);
        setSelectedCategories({
          level1: null, level2: null, level3: null,
          level4: null, level5: null, level6: null,
        });
        router.replace(pathname);
      }

      setSelectedMainCategory(mainCategory);

      const subCategories = await createListingService.getSubCategories(mainCategoryId) as CategoryItem[];

      if (!subCategories || subCategories.length === 0) return;

      setCategories((prev) => ({ ...prev, level1: subCategories }));

      // Reload deeper levels if already selected
      const selCats = getSelectedCategoriesFromUrl();
      for (let i = 1; i <= 5; i++) {
        const cat = selCats[`level${i}`];
        if (cat?.id) {
          try {
            const nextCats = await createListingService.getSubCategories(cat.id) as CategoryItem[];
            if (nextCats?.length > 0) {
              setCategories((prev) => ({ ...prev, [`level${i + 1}`]: nextCats }));
            }
          } catch {
            // silently ignore
          }
        }
      }
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
    }
  }, [router, pathname, isFirstLoad, isNavigatingBack, getSelectedCategoriesFromUrl]);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategorySelect = async (
    categoryId: string | number,
    categoryName: string,
    level: number,
  ) => {
    try {
      const lastCategory = createListingService.getCurrentCategoryId();
      const newCategoryId = parseInt(String(categoryId), 10);
      if (lastCategory && lastCategory !== newCategoryId) {
        createListingService.clearFormSession();
      }

      const newSel: SelectedCategories = { ...selectedCategories };
      newSel[`level${level}`] = { id: categoryId, name: categoryName };
      for (let i = level + 1; i <= 6; i++) {
        newSel[`level${i}`] = null;
      }

      setSelectedCategories(newSel);
      createListingService.saveSelectedCategory(level, categoryId, categoryName);

      const nextLevelCats = await createListingService.getSubCategories(categoryId) as CategoryItem[];
      const updatedCats = { ...categories };

      if (nextLevelCats?.length > 0) {
        updatedCats[`level${level + 1}`] = nextLevelCats;
        for (let i = level + 2; i <= 6; i++) {
          updatedCats[`level${i}`] = [];
        }
      }

      setCategories(updatedCats);
      setCurrentLevel(level);
      const hasSub = !!(nextLevelCats?.length > 0);
      setShowSummary(!hasSub);
      // Mobilde bir sonraki seviyeye geç
      setMobileDisplayLevel(hasSub ? level + 1 : level);

      // Persist selection
      Object.entries(newSel).forEach(([key, value]) => {
        if (value?.name) {
          sessionStorage.setItem(`${key}_id`, String(value.id));
          sessionStorage.setItem(`${key}_name`, value.name);
          localStorage.setItem(`${key}_id`, String(value.id));
          localStorage.setItem(`${key}_name`, value.name);
        } else {
          sessionStorage.removeItem(`${key}_id`);
          sessionStorage.removeItem(`${key}_name`);
          localStorage.removeItem(`${key}_id`);
          localStorage.removeItem(`${key}_name`);
        }
      });

      // Update URL
      const params = new URLSearchParams();
      Object.entries(newSel).forEach(([key, value]) => {
        if (value?.name) params.set(key, value.name);
      });
      router.replace(`${pathname}?${params.toString()}`);
    } catch {
      setShowSummary(true);
    }
  };

  const handleBack = () => {
    setIsNavigatingBack(true);

    // Level1 görünümündeyken / daha geri kategori yoksa → ana sayfaya git
    if (mobileDisplayLevel <= 1) {
      for (let i = 1; i <= 6; i++) {
        const key = `level${i}`;
        sessionStorage.removeItem(`${key}_id`);
        sessionStorage.removeItem(`${key}_name`);
        localStorage.removeItem(`${key}_id`);
        localStorage.removeItem(`${key}_name`);
      }
      sessionStorage.removeItem('selectedMainCategory');
      sessionStorage.removeItem('selectedMainCategoryId');
      router.push('/');
      return;
    }

    // Bir önceki seviyeye dön
    const newDisplayLevel = mobileDisplayLevel - 1;
    setMobileDisplayLevel(newDisplayLevel);

    // mobileDisplayLevel-1 seviyesindeki seçimi ve altındakileri temizle
    const levelToDeselect = mobileDisplayLevel - 1;
    const newSel: SelectedCategories = { ...selectedCategories };
    for (let i = levelToDeselect; i <= 6; i++) {
      newSel[`level${i}`] = null;
    }

    setCurrentLevel(Math.max(1, levelToDeselect - 1));
    setSelectedCategories(newSel);
    setShowSummary(false);

    // Storage temizle
    for (let i = levelToDeselect; i <= 6; i++) {
      const key = `level${i}`;
      sessionStorage.removeItem(`${key}_id`);
      sessionStorage.removeItem(`${key}_name`);
      localStorage.removeItem(`${key}_id`);
      localStorage.removeItem(`${key}_name`);
    }

    // URL güncelle
    const params = new URLSearchParams();
    Object.entries(newSel).forEach(([key, value]) => {
      if (value?.name) params.set(key, value.name);
    });
    router.replace(`${pathname}?${params.toString()}`);
  };

  const getMobileTitle = () => {
    if (showSummary) return 'Kategori Seçildi';
    if (mobileDisplayLevel === 1) return selectedMainCategory || 'Kategori Seçimi';
    return selectedCategories[`level${mobileDisplayLevel - 1}`]?.name ?? selectedMainCategory ?? 'Kategori Seçimi';
  };

  if (isLoading) {
    return (
      <div className="category-selection-container">
        {/* Mobil loading header */}
        <div className="cs-mobile-header">
          <button className="cs-mobile-back" onClick={handleBack} aria-label="Geri">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div className="cs-mobile-header__titles">
            <span className="cs-mobile-header__title">Yükleniyor…</span>
          </div>
        </div>
        <div className="category-loading">
          <div className="category-loading-spinner" />
          <p>Kategoriler yükleniyor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="category-selection-container">

      {/* ════════════════════════════════
          MOBİL — sticky header (2. görsel stili)
          ════════════════════════════════ */}
      <div className="cs-mobile-header">
        <button className="cs-mobile-back" onClick={handleBack} aria-label="Geri">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="cs-mobile-header__titles">
          <span className="cs-mobile-header__title">{getMobileTitle()}</span>
        </div>
      </div>

      {/* ════════════════════════════════
          DESKTOP — breadcrumb
          ════════════════════════════════ */}
      <div className="cs-desktop-top">
        <div className="breadcrumb-container category-breadcrumb-container">
          <Breadcrumb2
            containerClass="category-selection-breadcrumb"
            categoryPath={[
              {
                name: 'İlan Ver',
                url: '/ilan-ver',
                id: 'ilan-ver',
                isClickable: true,
                isSpecialPage: true,
              },
              { name: selectedMainCategory, id: 'main-category', isClickable: false },
              ...(selectedCategories.level1?.name
                ? [{ name: selectedCategories.level1.name, id: 'level1', isClickable: false }]
                : []),
              ...(selectedCategories.level2?.name
                ? [{ name: selectedCategories.level2.name, id: 'level2', isClickable: false }]
                : []),
              ...(selectedCategories.level3?.name
                ? [{ name: selectedCategories.level3.name, id: 'level3', isClickable: false }]
                : []),
            ]}
            onCategoryClick={(item: { id?: string | number }) => {
              if (item.id === 'ilan-ver') router.push('/');
            }}
          />
        </div>
      </div>

      {/* ════════════════════════════════
          İçerik (ortak)
          ════════════════════════════════ */}
      <div className="category-selection-content">
        <div className="container">
          {/* Progress steps container içinde — kendi max-width'i ile sınırlı */}
          <div className="cs-desktop-only category-selection-progress">
            <ProgressSteps currentStep={selectedCategories.level1 ? 2 : 1} />
          </div>
          <CategoryLists
            categories={categories}
            selectedCategories={selectedCategories}
            currentLevel={currentLevel}
            mobileDisplayLevel={mobileDisplayLevel}
            onSelect={handleCategorySelect}
            onBack={handleBack}
            showSummary={showSummary}
            mainCategoryName={selectedMainCategory}
          />
        </div>
      </div>
    </div>
  );
}

export default function CategorySelection() {
  return (
    <Suspense fallback={<div className="category-loading"><p>Yükleniyor…</p></div>}>
      <CategorySelectionInner />
    </Suspense>
  );
}
