"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './CategoryPage.css';
import { usePathname, useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import urlService from '@/services/utils/urlService';

import Breadcrumb2 from '@/components/Breadcrumb2/Breadcrumb2';
import CategoryBanner from './components/CategoryBanner/CategoryBanner';
import SubcategoryMenu from './components/SubcategoryMenu/SubcategoryMenu';
import ProductList from './components/ProductList/ProductList';
import ProductCard from '@/components/ProductCard/ProductCard';
import LocationModal from '@/components/Navbar/LocationModal/LocationModal';
import CardCategory from '@/components/CardCategory/CardCategory';
import Loader from '@/components/Loader/Loader';
import CategoryGuide from './components/CategoryGuide/CategoryGuide';
import AdBanner from '@/components/AdvertisementBanner/AdBanner';
import NearbyListings from '@/components/NearbyListings/NearbyListings';

import categoryService from '@/services/category/categoryService';
import productService from '@/services/products/productService';
import locationService from '@/services/location/locationService';
import { getFilteredListings } from '@/services/filters/filterService';

interface CategoryData {
  category_id?: string | number;
  id?: string | number;
  name?: string;
  label?: string;
  slug?: string;
  parent_id?: string | number | null;
  subcategories?: CategoryData[];
}

interface SubcategoryItem {
  id: string | number;
  name: string;
  slug: string;
}

interface FilterDetails {
  hierarchy?: { main?: string; status?: string; type?: string };
  category?: { name?: string };
  city?: { name?: string };
  district?: { name?: string };
  roomCount?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  currency?: string;
  ownershipStatus?: string;
  minSquareMeter?: number | string;
  maxSquareMeter?: number | string;
}

const slugify = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')
    .replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
};

const CategoryPage: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [categoryData, setCategoryData] = useState<CategoryData | null>(null);
  const [subcategories, setSubcategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<string>('grid');
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [noListingsFound, setNoListingsFound] = useState<boolean>(false);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [nearbyProducts, setNearbyProducts] = useState<unknown[]>([]);
  const [showSpecialBanner, setShowSpecialBanner] = useState<boolean>(false);
  const [currentCategorySlug, setCurrentCategorySlug] = useState<string>('');
  const [currentCategoryName, setCurrentCategoryName] = useState<string>('');
  const [categoryIdToLoad, setCategoryIdToLoad] = useState<string | number | null>(null);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | number | null>(null);
  // Root (en üst) kategori ID'si — ProductList her zaman bunu kullanır, alt kategori seçiminde değişmez
  const [rootCategoryId, setRootCategoryId] = useState<string | number | null>(null);
  const [rootCategoryName, setRootCategoryName] = useState<string>('');
  const [selectedSubcategories, setSelectedSubcategories] = useState<SubcategoryItem[]>([]);
  const [currentUser, setCurrentUser] = useState<{ isLoggedIn: boolean } | null>(null);
  const [filteredListings, setFilteredListings] = useState<unknown[]>([]);
  const [hasFilterApplied, setHasFilterApplied] = useState<boolean>(false);
  const [filterAppliedDetails, setFilterAppliedDetails] = useState<FilterDetails | null>(null);
  const [isContentLoading, setIsContentLoading] = useState<boolean>(false);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const prevPathRef = useRef<string>(pathname || '');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const svc = locationService as {
      getUserLocation: () => { city?: string } | null;
      isLocationModalSeen: () => boolean;
    };
    const locationData = svc.getUserLocation();
    const modalSeen = svc.isLocationModalSeen();
    if (locationData?.city) setCurrentCity(locationData.city);
    else if (!modalSeen) setShowLocationModal(true);
    const token = localStorage.getItem('auth_token');
    if (token) setCurrentUser({ isLoggedIn: true });

    const handleLocChange = (event: Event) => {
      const newLoc = (event as CustomEvent<{ city?: string }>).detail;
      if (newLoc?.city) { setCurrentCity(newLoc.city); getNearbyItems(newLoc.city); }
      else { setCurrentCity(null); setNearbyProducts([]); setNoListingsFound(false); }
    };
    window.addEventListener('userLocationChanged', handleLocChange);
    return () => window.removeEventListener('userLocationChanged', handleLocChange);
  }, []);

  const createSlug = (text?: string): string => {
    if (!text || typeof text !== 'string') return '';
    return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')
      .replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
  };

  const handleSubcategoryClick = async (subcategory: CategoryData & {
    preventNavigation?: boolean; isBackNavigation?: boolean; fromBreadcrumb?: boolean;
  }) => {
    try {
      const categoryId = subcategory.category_id || subcategory.id;
      if (!subcategory.subcategories || subcategory.subcategories.length === 0) {
        // NOT: createFilterUrlFromCategoryId eski statik mock kategori ağacını kullanıyor ve
        // gerçek backend kategori ID'leriyle çakışıp yanlış URL üretebiliyor — bkz. loadCategoryData.
        router.push(`/filtrele/${subcategory.slug || createSlug(subcategory.name || subcategory.label || '')}`);
        return;
      }
      if (subcategory.preventNavigation) {
        if (subcategory.subcategories) {
          setSubcategories(subcategory.subcategories);
          if (subcategory.slug) {
            document.title = `${subcategory.name || subcategory.label} | Acillazım.net`;
            setCurrentCategoryName(subcategory.name || subcategory.label || '');
            setCurrentCategorySlug(subcategory.slug);
            if (subcategory.isBackNavigation) {
              setSelectedSubcategories((prev) => prev.length === 0 ? [] : prev.slice(0, -1));
            } else if (!subcategory.fromBreadcrumb) {
              setSelectedSubcategories((prev) => [...prev, {
                id: categoryId as string | number,
                name: subcategory.name || subcategory.label || '',
                slug: subcategory.slug || createSlug(subcategory.name || subcategory.label || ''),
              }]);
            }
          }
        }
        return;
      }
      setCategoryIdToLoad(categoryId as string | number);
      setCurrentCategoryId(categoryId as string | number);
      const slug = subcategory.slug || createSlug(subcategory.name || subcategory.label || '');
      setSelectedSubcategories([{ id: categoryId as string | number, name: subcategory.name || subcategory.label || '', slug }]);
      router.push(`/kategoriler/${slug}`);
    } catch (err) { console.error('Alt kategori tıklama hatası:', err); }
  };

  const handleFilterNavigation = (category: CategoryData) => {
    // NOT: createFilterUrlFromCategoryId eski statik mock kategori ağacını kullanıyor ve
    // gerçek backend kategori ID'leriyle çakışıp yanlış URL üretebiliyor — bkz. loadCategoryData.
    router.push(`/filtrele/${category.slug || createSlug(category.name || '')}`);
  };

  const handleProductClick = (productId: unknown) => {
    const svc = urlService as { getIlanUrl: (p: unknown) => string };
    const product = (filteredListings as Array<{ ilan_id?: unknown; id?: unknown }>)
      .find((p) => p.ilan_id === productId || p.id === productId);
    if (product) {
      try { router.push(svc.getIlanUrl(product)); }
      catch { router.push(`/ilan/${productId}`); }
    } else { router.push(`/ilan/${productId}`); }
  };

  const handleFavoriteToggle = async (productId: unknown, isFavorite: boolean) => {
    try {
      const svc = productService as {
        addToFavorites: (id: unknown) => Promise<void>;
        removeFromFavorites: (id: unknown) => Promise<void>;
      };
      if (isFavorite) await svc.addToFavorites(productId);
      else await svc.removeFromFavorites(productId);
    } catch (err) { console.error('Favori durumu değiştirme hatası:', err); }
  };

  const handleExploreClick = () => {
    const el = document.querySelector('.category-main-content');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCreateAdClick = () => { router.push('/dashboard/new-listing'); };

  const handleLocationSelect = (city: string, district?: string) => {
    (locationService as { saveUserLocation: (c: string, d?: string) => void }).saveUserLocation(city, district);
    setCurrentCity(city);
    setShowLocationModal(false);
    getNearbyItems(city);
  };

  const handleLocationClear = () => {
    (locationService as { clearUserLocation: () => void }).clearUserLocation();
    setCurrentCity(null);
    setNearbyProducts([]);
    setNoListingsFound(false);
    setShowLocationModal(false);
  };

  const shouldShowCategoryBanner = (categoryName?: string, slug?: string): boolean => {
    if (!categoryName && !slug) return false;
    const nl = categoryName?.toLowerCase() || '';
    const sl = slug?.toLowerCase() || '';
    const isEmlak = (pathname || '').toLowerCase().includes('emlak');
    const isVasita = (pathname || '').toLowerCase().includes('vasita');
    return nl === 'vasıta' || nl === 'emlak' || isEmlak || isVasita;
  };

  useEffect(() => {
    const svc = categoryService as {
      getAllCategories: () => Promise<CategoryData[]>;
      getCategoryById: (id: string) => Promise<CategoryData>;
      getSubcategoriesByParentId: (id: string) => Promise<CategoryData[]>;
    };
    const loadCategoryData = async () => {
      try {
        setLoading(true);
        const urlPath = window.location.pathname.split('/').pop() || '';
        let targetCategoryId = categoryIdToLoad;
        let matchingCategory: CategoryData | null = null;
        let allCategories: CategoryData[] = [];

        if (!targetCategoryId) {
          allCategories = await svc.getAllCategories();
          if (!allCategories?.length) { setError('Kategoriler yüklenemedi'); return; }
          matchingCategory = allCategories.find((cat) => {
            const catSlug = cat.slug || slugify(cat.label || cat.name || '');
            return catSlug && catSlug.toLowerCase() === urlPath.toLowerCase();
          }) || null;
          if (!matchingCategory) { setError('Kategori bulunamadı'); return; }

          let foundId = matchingCategory.category_id;
          let rootCat = matchingCategory;
          if (matchingCategory.parent_id !== null && matchingCategory.parent_id !== undefined) {
            let current = matchingCategory; let depth = 10;
            while (current.parent_id !== null && current.parent_id !== undefined && depth > 0) {
              const parent = allCategories.find((c) => c.category_id === current.parent_id || c.id === current.parent_id);
              if (parent) { current = parent; depth--; } else break;
            }
            foundId = current.category_id || current.id;
            rootCat = current;
          }
          targetCategoryId = foundId as string | number;
          setCurrentCategoryId(targetCategoryId);
          // Root kategori her zaman sabit kalır
          setRootCategoryId(targetCategoryId);
          setRootCategoryName(rootCat.name || rootCat.label || '');
        } else {
          setCurrentCategoryId(targetCategoryId);
          allCategories = await svc.getAllCategories();
          matchingCategory = allCategories.find((c) => c.category_id === targetCategoryId || c.id === targetCategoryId) || null;
          // Root kategoriyi bul
          let rootCat = matchingCategory;
          if (matchingCategory && matchingCategory.parent_id !== null && matchingCategory.parent_id !== undefined) {
            let current = matchingCategory; let depth = 10;
            while (current.parent_id !== null && current.parent_id !== undefined && depth > 0) {
              const parent = allCategories.find((c) => c.category_id === current.parent_id || c.id === current.parent_id);
              if (parent) { current = parent; depth--; } else break;
            }
            rootCat = current;
            targetCategoryId = (current.category_id || current.id) as string | number;
          }
          setRootCategoryId(targetCategoryId);
          setRootCategoryName(rootCat ? (rootCat.name || rootCat.label || '') : '');
        }

        const categoryDataId = matchingCategory ? (matchingCategory.category_id || matchingCategory.id) : targetCategoryId;
        const strId = String(categoryDataId);
        const data = await svc.getCategoryById(strId);
        if (!data) throw new Error(`ID ${strId} için veri yok`);
        const normalized: CategoryData = { ...data, name: data.label || data.name, id: data.category_id || data.id };
        setCategoryData(normalized);
        setCurrentCategorySlug(normalized.slug || createSlug(normalized.name || '') || '');
        setCurrentCategoryName(normalized.name || '');

        const subcats = await svc.getSubcategoriesByParentId(strId);
        const normalizedSubs = (subcats || []).map((s) => ({ ...s, name: s.label || s.name, id: s.category_id || s.id }));
        
        // Alt kategori yoksa otomatik olarak filtre sayfasına yönlendir
        if (normalizedSubs.length === 0) {
          setIsRedirecting(true);

          // NOT: createFilterUrlFromCategoryId (urlService) eski/statik emlak-vasıta mock
          // kategori ağacını (data/categories-data.json) kullanır. O ağaçtaki kategori ID'leri
          // gerçek backend "Hizmetler" kategori ID'leriyle (12540+) çakışabiliyor ve yanlış,
          // çok segmentli bir slug (ör. /filtrele/hizmetler/teknik-tesisat-hizmetleri) üretip
          // backend'de 404/500'e ve ardından ana sayfaya otomatik yönlenmeye sebep oluyordu.
          // Bu yüzden burada her zaman backend'in kendi (tekil) slug alanı kullanılır.
          const slugToUse = matchingCategory?.slug || normalized.slug || createSlug(normalized.name || '');
          const finalUrl = `/filtrele/${slugToUse}`;

          router.replace(finalUrl);
          return; // Yönlendirme başladığı için state'leri güncellemeden çık
        }

        setSubcategories(normalizedSubs);
        setCategoryIdToLoad(null);
        setError(null);
      } catch (err) { console.error('Kategori yükleme hatası:', err); setError('Kategori verileri yüklenirken hata oluştu.'); setSubcategories([]); }
      finally { setLoading(false); }
    };
    if (pathname !== prevPathRef.current) { prevPathRef.current = pathname || ''; setLoading(false); }
    loadCategoryData();
  }, [pathname, categoryIdToLoad]);

  useEffect(() => {
    if (currentCity) getNearbyItems(currentCity);
  }, [currentCity]);

  const getNearbyItems = async (city: string) => {
    if (!city) { setNoListingsFound(true); setNearbyProducts([]); return; }
    try {
      const token = localStorage.getItem('auth_token');
      const svc = locationService as { getNearbyListings: (c: string, n: number, t: string | null) => Promise<{ items?: unknown[] }> };
      const result = await svc.getNearbyListings(city, 15, token);
      if (!result?.items) { setNoListingsFound(true); setNearbyProducts([]); }
      else { setNoListingsFound(false); setNearbyProducts(result.items); }
    } catch { setNoListingsFound(true); setNearbyProducts([]); }
  };

  const handleBreadcrumbClick = (categoryItem: { id?: string | number; name?: string; slug?: string; isHome?: boolean }, index: number) => {
    try {
      if (!categoryItem?.id) return;
      if (categoryItem.isHome) return;
      if (index === 1) { setSelectedSubcategories([]); return; }
      const newSubs = selectedSubcategories.slice(0, index - 1);
      setSelectedSubcategories(newSubs);
      const svc = categoryService as { getSubcategoriesByParentId: (id: string) => Promise<CategoryData[]> };
      svc.getSubcategoriesByParentId(String(categoryItem.id)).then((subcats) => {
        setSubcategories(subcats || []);
        handleSubcategoryClick({
          category_id: categoryItem.id, id: categoryItem.id, name: categoryItem.name,
          slug: categoryItem.slug, subcategories: subcats || [],
          preventNavigation: true, isBackNavigation: false, fromBreadcrumb: true,
        });
      }).catch((err) => console.error('Breadcrumb kategori hatası:', err));
    } catch (err) { console.error('Breadcrumb tıklama hatası:', err); }
  };

  if (loading || isRedirecting) {
    return (
      <div className="catcontent-container catcontent-container--loading">
        <Loader />
      </div>
    );
  }

  if (error && !categoryData) {
    return (
      <div className="catcontent-container">
        <Breadcrumb2 className="category-breadcrumb" containerClass="categorypage-breadcrumb-container" categoryPath={[{ id: 'error', name: 'Hata', slug: 'hata' }]} />
        <div className="error-container">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Tekrar Dene</button>
        </div>
      </div>
    );
  }

  return (
    <div className="catcontent-container">
      <Breadcrumb2
        className="category-breadcrumb"
        containerClass="categorypage-breadcrumb-container"
        categoryPath={[
          { id: categoryData?.category_id || 'category', name: categoryData?.name || 'Kategori', slug: currentCategorySlug || 'kategori' },
          ...selectedSubcategories,
        ]}
        onCategoryClick={handleBreadcrumbClick}
      />

      <div className="category-content-main">
        <div className="category-banner-section">
          <div className="category-sidebar">
              <SubcategoryMenu category={categoryData} subcategories={subcategories || []} onSubcategoryClick={handleSubcategoryClick} loading={false} showBackToCategories={isMobile} />
            {categoryData && (
              <div className="alz-category-side-vitrin">
                <AdBanner
                  pageId={1}
                  categoryId={Number(selectedSubcategories.length > 0 ? selectedSubcategories[selectedSubcategories.length - 1].id : (categoryData.category_id || categoryData.id))}
                  sectionCode="S1"
                  className="alz-sidebar-vitrin"
                />
              </div>
            )}
          </div>

          <div className="banner-and-products">
            <div className="banner-container">
              {categoryData && (
                shouldShowCategoryBanner(categoryData.name, currentCategorySlug) ? (
                  <CategoryBanner
                    categoryId={categoryData.category_id}
                    onFilterSubmit={(filterResults: Record<string, unknown>) => {
                      if (filterResults.isLoading) { setIsContentLoading(true); return; }
                      setIsContentLoading(false);
                      if (filterResults?.success) {
                        setFilteredListings((filterResults.listings as unknown[]) || []);
                        setHasFilterApplied(true);
                        setFilterAppliedDetails(filterResults.filters as FilterDetails || null);
                      } else {
                        setFilteredListings([]);
                        setHasFilterApplied(true);
                        setFilterAppliedDetails(null);
                      }
                    }}
                  />
                ) : (
                  <AdBanner
                    pageId={1}
                    categoryId={Number(selectedSubcategories.length > 0 ? selectedSubcategories[selectedSubcategories.length - 1].id : (categoryData.category_id || categoryData.id))}
                    sectionCode="B1"
                    className="alz-category-vitrin"
                  />
                )
              )}
            </div>

            {isContentLoading && <div className="category-content-loader"><Loader /></div>}

            {!isContentLoading && hasFilterApplied ? (
              <div className="productlist-container">
                <div className="productlist-view-controls">
                  <h2 className="productlist-section-title">
                    {filteredListings.length > 0 ? `${filteredListings.length} İlan Bulundu` : 'Arama Sonuçları'}
                  </h2>
                  {filterAppliedDetails && (
                    <div className="applied-filters" style={{ marginLeft: 'auto', marginRight: '0' }}>
                      <span className="filter-label">Uygulanan Filtreler:</span>
                      <div className="filter-tags-container">
                        {filterAppliedDetails.hierarchy?.main && <span className="filter-tag">{filterAppliedDetails.hierarchy.main}</span>}
                        {filterAppliedDetails.hierarchy?.status && <span className="filter-tag">{filterAppliedDetails.hierarchy.status}</span>}
                        {filterAppliedDetails.hierarchy?.type && <span className="filter-tag">{filterAppliedDetails.hierarchy.type}</span>}
                        {!filterAppliedDetails.hierarchy && filterAppliedDetails.category?.name && <span className="filter-tag">{filterAppliedDetails.category.name}</span>}
                        {filterAppliedDetails.city?.name && <span className="filter-tag">{filterAppliedDetails.city.name}</span>}
                        {filterAppliedDetails.district?.name && <span className="filter-tag">{filterAppliedDetails.district.name}</span>}
                        {filterAppliedDetails.roomCount && <span className="filter-tag">Oda: {filterAppliedDetails.roomCount}</span>}
                        {(filterAppliedDetails.minPrice || filterAppliedDetails.maxPrice) && (
                          <span className="filter-tag">Fiyat: {filterAppliedDetails.minPrice || 0} - {filterAppliedDetails.maxPrice || '∞'} {filterAppliedDetails.currency || 'TL'}</span>
                        )}
                        {filterAppliedDetails.ownershipStatus && <span className="filter-tag">Tapu: {filterAppliedDetails.ownershipStatus}</span>}
                        {(filterAppliedDetails.minSquareMeter || filterAppliedDetails.maxSquareMeter) && (
                          <span className="filter-tag">Alan: {filterAppliedDetails.minSquareMeter || 0} - {filterAppliedDetails.maxSquareMeter || '∞'} m²</span>
                        )}
                      </div>
                      <button className="clear-filters-button" onClick={() => {
                        setHasFilterApplied(false); setFilteredListings([]); setFilterAppliedDetails(null);
                        window.dispatchEvent(new CustomEvent('resetCategoryFilters'));
                      }}>
                        <FontAwesomeIcon icon={faTimes} style={{ marginRight: '5px' }} /> Filtreleri Temizle
                      </button>
                    </div>
                  )}
                </div>
                {(filteredListings as Array<Record<string, unknown>>).length > 0 ? (
                  <div className="productlist-grid productlist-grid-view">
                    {(filteredListings as Array<Record<string, unknown>>).map((listing, index) => (
                      <ProductCard
                        key={(listing.ilan_id as string) || (listing.id as string) || String(index)}
                        product={listing}
                        onProductClick={() => handleProductClick(listing)}
                        onFavoriteToggle={(id: unknown) => handleFavoriteToggle(id, true)}
                        viewMode="grid"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="productlist-no-products">
                    <p>Seçtiğiniz kriterlere uygun ilan bulunamadı. Lütfen farklı kriterler deneyin.</p>
                  </div>
                )}
              </div>
            ) : (
              <ProductList
                categoryId={rootCategoryId || categoryData?.category_id}
                categoryName={rootCategoryName || categoryData?.name}
                onProductClick={handleProductClick}
                onFavoriteToggle={handleFavoriteToggle}
              />
            )}

            {currentCity && categoryData && (
              <NearbyListings
                city={currentCity}
                isAuthenticated={currentUser !== null}
                itemLimit={15}
                customTitle={`${currentCity.toLocaleUpperCase('tr-TR')} BÖLGESİNDEKİ İLANLAR`}
                onItemClick={handleProductClick}
              />
            )}

            {categoryData && (
              <CategoryGuide categoryData={categoryData} onExploreClick={handleExploreClick} />
            )}
          </div>
        </div>
      </div>

      <LocationModal
        showModal={showLocationModal}
        closeModal={() => setShowLocationModal(false)}
        onLocationSelect={handleLocationSelect}
        onLocationClear={handleLocationClear}
      />
    </div>
  );
};

export default CategoryPage;
