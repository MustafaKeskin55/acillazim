"use client";

import React, { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import FilterSidebar from './components/FilterSidebar/FilterSidebar';
import FilterResults from './components/FilterResults/FilterResults';
import FilterHeader from './components/FilterHeader/FilterHeader';
import Breadcrumb2 from '@/components/Breadcrumb2/Breadcrumb2';
import Loader from '@/components/Loader/Loader';
import './FilterPage.css';

import {
  getFilterOptions, getFilteredListings, parseFilterFromUrl, buildFilterUrl,
} from '@/services/filters/filterService';
import { secureUrl, isValidFilterUrl } from '@/services/filters/security/urlSecurityService';
import { findCategoryPath, getCategoryIdBySlug } from '@/services/filters/categoryTreeService';

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalListings: number;
}

/** Sahibinden tarzı mobil filtre rozetu için: categoryId dışındaki dolu alan sayısı */
function countActiveFilters(f: Record<string, unknown> | null | undefined): number {
  if (!f) return 0;
  const skip = new Set(['categoryId', 'category_id']);
  let c = 0;
  for (const [k, v] of Object.entries(f)) {
    if (skip.has(k)) continue;
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    c += 1;
  }
  return c;
}

const FilterPage: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState<boolean>(true);
  const [filterOptions, setFilterOptions] = useState<Record<string, unknown>>({});
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [listings, setListings] = useState<unknown[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ currentPage: 1, totalPages: 1, totalListings: 0 });
  const [sort, setSort] = useState<string>('');
  const [viewMode, setViewMode] = useState<string>('grid');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [totalListings, setTotalListings] = useState<number>(0);
  const [categoryPath, setCategoryPath] = useState<unknown[]>([]);
  const [selectedQuarterIds, setSelectedQuarterIds] = useState<string[]>([]);
  const [selectedQuarterNames, setSelectedQuarterNames] = useState<string[]>([]);
  const [loaderMessage, setLoaderMessage] = useState<string>('İlanlar yükleniyor...');
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [isMobileLayout, setIsMobileLayout] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => setIsMobileLayout(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const extractCategorySlugFromUrl = (): string => {
    const path = pathname || '';
    if (path.startsWith('/filtrele/')) return path.substring('/filtrele/'.length);
    return '';
  };

  const handlePageNotFound = (errorMessage: string) => {
    setLoading(false); setDataLoaded(true); setListings([]);
    setLoaderMessage(errorMessage);
    setPagination({ currentPage: 1, totalPages: 0, totalListings: 0 });
    setTotalListings(0);
    setTimeout(() => { window.location.href = '/'; }, 3000);
  };

  const fetchListings = async (currentFilters: Record<string, unknown>, page = 1, currentSort?: string) => {
    try {
      setLoading(true); setDataLoaded(false);
      setLoaderMessage('İlanlar yükleniyor...');
      await new Promise((r) => setTimeout(r, 100));
      type GetFilteredResponse = { listings?: unknown[]; pagination?: Pagination };
      const response = await (getFilteredListings as (...a: unknown[]) => Promise<GetFilteredResponse>)(currentFilters, page, 20, currentSort);
      if (response?.listings) {
        setListings(response.listings);
        if (response.pagination) { setPagination(response.pagination); setTotalListings(response.pagination.totalListings); }
        if (page > 1 || Object.keys(currentFilters).length > 1) window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => { setDataLoaded(true); setLoading(false); }, 200);
      }
    } catch {
      setListings([]);
      setPagination({ currentPage: 1, totalPages: 0, totalListings: 0 });
      setTotalListings(0);
      setTimeout(() => { setDataLoaded(true); setLoading(false); }, 200);
    }
  };

  useEffect(() => {
    const lastReset = localStorage.getItem('rateLimiterLastReset');
    const now = Date.now();
    if (!lastReset || now - parseInt(lastReset) > 30 * 60 * 1000) {
      localStorage.setItem('rateLimiterLastReset', now.toString());
      localStorage.setItem('rateLimiterRequests', JSON.stringify({}));
    }
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      setLoading(true);
      try {
        const { preloadCategoryData } = await import('@/services/filters/categoryTreeService');
        (preloadCategoryData as () => Promise<void>)().catch(() => {});
        const queryString = searchParams?.toString() || '';
        const queryParams = (parseFilterFromUrl as (s: string) => Record<string, unknown>)(`?${queryString}`);
        const categorySlug = extractCategorySlugFromUrl();
        if (!categorySlug) { handlePageNotFound('Kategori bulunamadı. Ana sayfaya yönlendiriliyorsunuz...'); return; }

        let categoryId: number;
        try {
          if (categorySlug === 'tum-ilanlar') { categoryId = 0; }
          else { categoryId = await (getCategoryIdBySlug as (s: string) => Promise<number>)(categorySlug); }
          if (!categoryId && categorySlug !== 'tum-ilanlar') { handlePageNotFound(`"${categorySlug}" kategorisi bulunamadı.`); return; }
        } catch { handlePageNotFound('Kategori yüklenirken sorun oluştu.'); return; }

        const parsedCategoryId = Number(categoryId);
        setSelectedCategoryId(parsedCategoryId);

        if (queryString.includes('vitrin_durumu=vitrin')) queryParams.vitrin_durumu = 'vitrin';
        else if (queryString.includes('vitrin_durumu=one_cikan')) queryParams.vitrin_durumu = 'one_cikan';
        const currentFilters = { ...queryParams, categoryId: parsedCategoryId };
        setFilters(currentFilters);

        const optionsPromise = (getFilterOptions as (id: number) => Promise<Record<string, unknown>>)(parsedCategoryId);
        let categoryPathResult: unknown[] = [];
        try {
          categoryPathResult = await (findCategoryPath as (id: number) => Promise<unknown[]>)(parsedCategoryId);
          if (categoryPathResult?.length > 0) setCategoryPath(categoryPathResult);
        } catch { categoryPathResult = []; }

        const options = await optionsPromise;
        setFilterOptions(options);
        if (!categoryPathResult?.length && (options as Record<string, unknown>)?.categoryInfo) {
          const ci = (options as { categoryInfo?: { path?: unknown[] } }).categoryInfo;
          if (ci?.path) setCategoryPath(ci.path);
        }

        fetchListings(currentFilters, 1, sort);
      } catch { /* handled in fetchListings */ }
      finally { setTimeout(() => setLoading(false), 200); }
    };
    fetchFilterOptions();
  }, [pathname, searchParams?.toString(), sort]);

  useEffect(() => {
    if (!loading && Object.keys(filters).length > 0 && selectedCategoryId) {
      const filterUrl = (buildFilterUrl as (f: Record<string, unknown>, id: number) => string)(filters, selectedCategoryId);
      const securedUrl = (secureUrl as (u: string) => string)(filterUrl);
      const currentSearch = searchParams?.toString() || '';
      const currentFull = `${pathname}${currentSearch ? '?' + currentSearch : ''}`;
      if ((isValidFilterUrl as (u: string) => boolean)(securedUrl) && securedUrl !== currentFull) {
        const queryPart = securedUrl.includes('?') ? securedUrl.split('?')[1] : '';
        const newUrl = queryPart ? `${pathname}?${queryPart}` : (pathname || '');
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [filters, selectedCategoryId, loading]);

  const handleFilterChange = (newFilters: Record<string, unknown>) => {
    const updatedFilters: Record<string, unknown> = { ...filters };
    Object.keys(newFilters).forEach((key) => {
      const newValue = newFilters[key];
      if (newValue === undefined || newValue === null || newValue === '') { delete updatedFilters[key]; }
      else if (Array.isArray(newValue) && newValue.length === 0) { delete updatedFilters[key]; }
      else if (key === 'fiyat_min' || key === 'fiyatMin') { updatedFilters['fiyat_min'] = newValue; updatedFilters['fiyatMin'] = newValue; }
      else if (key === 'fiyat_max' || key === 'fiyatMax') { updatedFilters['fiyat_max'] = newValue; updatedFilters['fiyatMax'] = newValue; }
      else if (Array.isArray(newValue)) { updatedFilters[key] = [...newValue]; }
      else { updatedFilters[key] = newValue; }
    });
    if (!updatedFilters.categoryId && selectedCategoryId) updatedFilters.categoryId = selectedCategoryId;
    setFilters(updatedFilters);
    if (pagination.currentPage !== 1) setPagination({ ...pagination, currentPage: 1 });
    fetchListings(updatedFilters, 1, sort);
  };

  const handleResetFilters = () => {
    const resetFilters = { categoryId: selectedCategoryId };
    setFilters(resetFilters);
    fetchListings(resetFilters, 1, sort);
    if (pagination.currentPage !== 1) setPagination({ ...pagination, currentPage: 1 });
    window.scrollTo(0, 0);
  };

  const handlePageChange = (page: number) => {
    setPagination({ ...pagination, currentPage: page });
    fetchListings(filters, page, sort);
    window.scrollTo(0, 0);
  };

  const handleSortChange = (newSort: string) => { setSort(newSort); fetchListings(filters, pagination.currentPage, newSort); };
  const handleViewModeChange = (mode: string) => setViewMode(mode);

  useEffect(() => {
    if (Object.keys(filters).length === 0) { setSelectedQuarterIds([]); setSelectedQuarterNames([]); }
  }, [filters]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mobileFilterOpen) {
      root.classList.add('filter-mobile-no-scroll');
    } else {
      root.classList.remove('filter-mobile-no-scroll');
    }
    return () => root.classList.remove('filter-mobile-no-scroll');
  }, [mobileFilterOpen]);

  const activeFilterCount = countActiveFilters(filters);
  const isServiceCategory = categoryPath.some((cat: any) => (cat.id && Number(cat.id) === 12540) || cat.name === 'Hizmetler') || Number(selectedCategoryId) === 12540;

  return (
    <div className={`filter-page ${mobileFilterOpen ? 'filter-page--mobile-filter-open' : ''}`}>
      <Breadcrumb2 categoryPath={categoryPath} isLoading={loading} className="filter-page-breadcrumb" />
      <div className="filter-container">
        {(!dataLoaded || loading) && viewMode !== 'map' && (
          <div className="filter-loader-overlay"><Loader message={loaderMessage} /></div>
        )}
        <aside
          className={`filter-sidebar-aside ${mobileFilterOpen ? 'filter-sidebar-aside--open' : ''}`}
          aria-hidden={isMobileLayout ? !mobileFilterOpen : false}
        >
          <div className="filter-mobile-sheet-header">
            <button
              type="button"
              className="filter-mobile-sheet-back"
              onClick={() => setMobileFilterOpen(false)}
              aria-label="Filtreleri kapat"
            >
              <span className="filter-mobile-sheet-back-icon" aria-hidden>‹</span>
              <span>Geri</span>
            </button>
            <h2 className="filter-mobile-sheet-title">Filtreler</h2>
            <span className="filter-mobile-sheet-spacer" aria-hidden />
          </div>
          <div className="filter-mobile-sheet-body">
            <FilterSidebar
              filterOptions={filterOptions} initialFilters={filters}
              onFilterChange={handleFilterChange} onResetFilters={handleResetFilters}
              isLoading={loading} categoryId={selectedCategoryId}
              onMobilePanelClose={() => setMobileFilterOpen(false)}
              isServiceCategoryProp={isServiceCategory}
            />
          </div>
        </aside>
        <main className="filter-content">
          <FilterHeader
            totalListings={pagination.totalListings} sort={sort} onSortChange={handleSortChange}
            viewMode={viewMode} onViewModeChange={handleViewModeChange}
            filters={filters} categoryId={selectedCategoryId}
            onFilterChange={handleFilterChange} onResetFilters={handleResetFilters}
            onOpenMobileFilter={() => setMobileFilterOpen(true)}
            activeFilterCount={activeFilterCount}
          />
          {dataLoaded && !loading && (
            <>
              {listings.length === 0 ? (
                <div className="no-results-message">
                  <div className="no-results-container">
                    <i className="fa fa-search no-results-icon" />
                    <h3>Sonuç Bulunamadı</h3>
                    <p>Arama kriterlerinize uygun ilan bulunamadı. Lütfen filtrelerinizi değiştirerek tekrar deneyin.</p>
                  </div>
                </div>
              ) : (
                <FilterResults listings={listings} loading={false} viewMode={viewMode} pagination={pagination} onPageChange={handlePageChange} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default FilterPage;
