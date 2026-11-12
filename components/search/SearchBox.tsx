"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import useSuggestions from '@/hooks/useSuggestions';
import SuggestionCard from './SuggestionCard';
import { sanitizeSearchQuery } from '@/utils/sanitizeInput';
import { IoSearch, IoTimeOutline, IoClose } from 'react-icons/io5';
import urlService from '@/services/utils/urlService';
import './SearchStyles.css';
import { decodeHtmlEntities } from '@/services/listings/util/listingUtils';

interface Suggestion {
  id?: string | number;
  ilan_id?: string | number;
  name: string;
  type?: string;
  price?: string | number;
  title?: string;
  image?: string;
  location?: string;
  category_id?: string | number;
  kategoriYolu?: string[];
  pathString?: string;
  score?: number;
  [key: string]: unknown;
}

interface SearchBoxProps {
  initialQuery?: string;
  placeholder?: string;
  navbarIconClass?: string;
  onSearch?: (query: string) => void;
  className?: string;
  debounceTime?: number;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  initialQuery = '',
  placeholder = 'Ne aramıştınız?',
  navbarIconClass = 'navbar-iconContainer',
  onSearch = () => {},
  className = '',
  debounceTime = 150,
}) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [didUserSelect, setDidUserSelect] = useState(false);

  const {
    query,
    suggestions,
    relatedCategories,
    popularListings,
    loading,
    error,
    updateQuery,
    handleSelection,
    setQuery,
    recentSearches,
  } = useSuggestions(initialQuery, debounceTime);

  const highlightMatch = useCallback((text: string, q: string): string => {
    if (!q) return text;
    try {
      const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<span class="search-suggestion-highlight">$1</span>');
    } catch { return text; }
  }, []);

  const showSuggestions = isInputFocused && !didUserSelect && query.length > 0;
  const showRecentSearches = false;
  const showSearchResults = showSuggestions && query.length > 0;

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateQuery(e.target.value);
    setDidUserSelect(false);
    setHighlightedIndex(-1);
  }, [updateQuery]);

  const handleSubmitSearch = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      handleSelection(suggestions[highlightedIndex]);
      setDidUserSelect(true);
      return;
    }
    const cleanQuery = sanitizeSearchQuery(query);
    if (!cleanQuery || cleanQuery.trim() === '') return;
    onSearch(cleanQuery);
    router.push(`/filtrele/tum-ilanlar?q=${encodeURIComponent(cleanQuery)}`);
    if (inputRef.current) inputRef.current.blur();
    setIsInputFocused(false);
    setDidUserSelect(true);
    setQuery('');
  }, [query, onSearch, highlightedIndex, suggestions, handleSelection, setQuery]);

  const handleSuggestionSelect = useCallback(async (suggestion: Suggestion) => {
    if (!suggestion) return;
    handleSelection(suggestion);
    try {
      if (suggestion.type === 'category') {
        // /kategori/[id] diye bir route yok — kategori sayfaları /filtrele/{slug-yolu}
        // altında yaşıyor. Kategori ID'sinden gerçek yolu (BE) alıp filtre URL'i üretiyoruz.
        const categoryPath = await urlService.getCategoryPathByIdAsync(suggestion.id as string | number);
        const filterUrl = urlService.createFilterUrlFromPath(categoryPath);
        router.push(filterUrl);
      } else if (suggestion.type === 'listing') {
        const ilanId = suggestion.ilan_id || suggestion.id;
        if (!ilanId) {
          router.push(`/filtrele/tum-ilanlar?q=${encodeURIComponent(suggestion.name || '')}`);
          return;
        }
        if (!suggestion.category_id && !suggestion.kategoriYolu) {
          router.push(`/ilan/${ilanId}`);
          return;
        }
        const seoUrl = urlService.getIlanUrl(suggestion);
        router.push(seoUrl);
      } else {
        router.push(`/filtrele/tum-ilanlar?q=${encodeURIComponent(suggestion.name || '')}`);
      }
    } catch {
      router.push('/');
    }
    setDidUserSelect(true);
    setIsInputFocused(false);
    if (inputRef.current) inputRef.current.blur();
    setQuery('');
  }, [handleSelection, setQuery]);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setDidUserSelect(false);
    setHighlightedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  }, [setQuery]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Escape':
        e.preventDefault();
        setIsInputFocused(false);
        if (inputRef.current) inputRef.current.blur();
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSuggestionSelect(suggestions[highlightedIndex] as Suggestion);
        } else {
          handleSubmitSearch();
        }
        break;
    }
  }, [showSuggestions, suggestions, highlightedIndex, handleSuggestionSelect, handleSubmitSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setIsInputFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="search-box-container">
      <div style={{ width: '100%', position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <div className={`search-box navbar-search-box ${className}`}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsInputFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            aria-label="Arama"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={showSuggestions}
            aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined}
          />
          <button
            type="button"
            className={navbarIconClass}
            aria-label="Ara"
            onClick={handleSubmitSearch}
            onMouseDown={(e) => e.preventDefault()}
          >
            <IoSearch />
          </button>
          {query && query.length > 0 && (
            <button type="button" className="search-clear-button" onClick={handleClearSearch} aria-label="Aramayı Temizle">
              <IoClose />
            </button>
          )}
        </div>

        {showSuggestions && ((suggestions && suggestions.length > 0) || (relatedCategories && relatedCategories.length > 0) || (popularListings && popularListings.length > 0)) && (
          <div id="search-suggestions" className="search-suggestions-container" ref={suggestionsRef} role="listbox">
            {showSearchResults && loading && <div className="search-suggestions-loading">Yükleniyor...</div>}
            {showSearchResults && error && <div className="search-suggestions-error">{String(error)}</div>}

            {showSearchResults && !loading && !error && (
              <div className="search-results">
                {suggestions.length === 0 && relatedCategories.length === 0 && popularListings.length === 0 && query.length >= 2 && (
                  <div className="search-no-results-message">
                    &quot;<strong>{query}</strong>&quot; için sonuç bulunamadı
                  </div>
                )}

                {/* İlanlar */}
                {popularListings && popularListings.length > 0 && (
                  <div className="search-result-section">
                    <ul className="search-listing-results-list">
                      {popularListings.map((listing: Suggestion, idx: number) => (
                        <li key={listing.id as string || `listing-${idx}`} className="search-unified-result-item">
                          <div className="search-listing-item" onClick={() => { if (!listing || (!listing.id && !listing.ilan_id)) return; handleSuggestionSelect({ ...listing, type: 'listing' }); }}>
                            <div className="search-result-content search-listing-result">
                              <div className="search-result-title search-listing-title">{decodeHtmlEntities(listing.title as string)}</div>
                              {listing.price && <div className="search-result-price">{String(listing.price)}</div>}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Kategoriler */}
                {relatedCategories && relatedCategories.length > 0 && (
                  <div className="search-result-section">
                    <ul className="search-category-results-list">
                      {relatedCategories.map((category: Suggestion, idx: number) => (
                        <li key={category.id as string || `category-${idx}`} className="search-unified-result-item">
                          <div className="search-category-item" onClick={() => handleSuggestionSelect({ ...category, type: 'category' })}>
                            <div className="search-result-content search-category-result">
                              <div className="search-result-type">KATEGORİ</div>
                              <div className="search-result-title" dangerouslySetInnerHTML={{ __html: highlightMatch(category.name, query) }} />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Öneriler */}
                {suggestions && suggestions.length > 0 && (
                  <div className="search-result-section">
                    <ul className="search-unified-results-list">
                      {suggestions.map((suggestion: Suggestion, index: number) => (
                        <li
                          key={`${suggestion.id || ''}-${index}`}
                          className={`search-unified-result-item ${index === highlightedIndex ? 'search-suggestion-highlighted' : ''}`}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          role="option"
                          aria-selected={index === highlightedIndex}
                          id={`suggestion-${index}`}
                        >
                          {suggestion.type === 'category' ? (
                            <div className="search-result-content search-category-result">
                              <div className="search-result-type">KATEGORİ</div>
                              <div className="search-result-title" dangerouslySetInnerHTML={{ __html: highlightMatch(suggestion.name, query) }} />
                            </div>
                          ) : (
                            <div className="search-result-content search-listing-result">
                              <div className="search-result-title search-listing-title" dangerouslySetInnerHTML={{ __html: highlightMatch(suggestion.name, query) }} />
                              {suggestion.price && <div className="search-result-price">{String(suggestion.price)}</div>}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

SearchBox.displayName = 'SearchBox';
export default memo(SearchBox);
