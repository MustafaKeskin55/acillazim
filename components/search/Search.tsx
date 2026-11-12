"use client";

import React, { useState, useEffect } from 'react';
import { IoSearch } from "react-icons/io5";
import './Search.css';

// Popüler aramalar statik verisi — mobil arama sayfası için (2. görsel)
const popularSearches = ['iPhone 14', 'Kiralık Daire', 'PlayStation 5', 'Elektrikli Bisiklet', 'Laptop'];
const recentSearches = ['Kiralık Ev', 'MacBook Pro', 'Bisiklet'];

function Search() {
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    // 2. görsel mobil arama içindir; masaüstünde ana sayfadaki arama alanına yönlendir
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      window.location.replace('/#hizmet-ara');
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/filtrele/tum-ilanlar?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="search-page">
      <div className="search-container">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ne aramıştınız?"
              className="search-input"
            />
            <button type="submit" className="search-button">
              <IoSearch className="search-icon" />
            </button>
          </div>
        </form>

        {/* Popüler aramalar */}
        <div className="popular-searches">
          <h3>Popüler Aramalar</h3>
          <div className="search-tags">
            {popularSearches.map((term) => (
              <span
                key={term}
                className="search-tag"
                onClick={() => { window.location.href = `/filtrele/tum-ilanlar?q=${encodeURIComponent(term)}`; }}
              >
                {term}
              </span>
            ))}
          </div>
        </div>

        {/* Son aramalar */}
        <div className="recent-searches">
          <h3>Son Aramalarınız</h3>
          <div className="recent-search-list">
            {recentSearches.map((term) => (
              <div
                key={term}
                className="recent-search-item"
                onClick={() => { window.location.href = `/filtrele/tum-ilanlar?q=${encodeURIComponent(term)}`; }}
              >
                <IoSearch className="recent-search-icon" />
                <span>{term}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Search;
