"use client";

import React, { useState, useEffect, useCallback } from 'react';
import './SiteNews.css';
import { FaNewspaper, FaBullhorn, FaCalendarAlt, FaSearch, FaTags, FaEye, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { newsService, NewsItem } from '@/services/news/newsService';

const SiteNews: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await newsService.getNews({
        category: activeCategory !== 'all' ? activeCategory : undefined,
        search: searchTerm || undefined,
      });
      setNewsData(result);
    } catch (err) {
      setNewsData([]);
      setError(err instanceof Error ? err.message : 'Haberler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchTerm]);

  useEffect(() => {
    const timeout = setTimeout(loadNews, 300);
    return () => clearTimeout(timeout);
  }, [loadNews]);

  return (
    <div className="site-news">
      <div className="site-news__header">
        <h1><FaNewspaper /> Site Haberleri ve Güncellemeler</h1>
        <p>En son haberler, güncellemeler ve faydalı içerikler</p>
      </div>

      <div className="site-news__filters">
        <div className="site-news__categories">
          {[['all', 'Tümü'], ['güncelleme', 'Güncellemeler'], ['duyuru', 'Duyurular'], ['makale', 'Makaleler']].map(([cat, label]) => (
            <button key={cat} className={`category-btn ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
              {cat === 'güncelleme' && <FaBullhorn />}
              {cat === 'duyuru' && <FaCalendarAlt />}
              {cat === 'makale' && <FaNewspaper />}
              {label}
            </button>
          ))}
        </div>
        <div className="site-news__search">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="Haber veya konu ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {loading && (
        <div className="site-news__status">
          <FaSpinner className="site-news__status-icon site-news__status-icon--spin" />
          <p>Haberler yükleniyor...</p>
        </div>
      )}

      {!loading && error && (
        <div className="site-news__status">
          <FaExclamationTriangle className="site-news__status-icon" />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && newsData.length === 0 && (
        <div className="site-news__status">
          <FaNewspaper className="site-news__status-icon" />
          <p>Bu kriterlere uygun haber bulunamadı.</p>
        </div>
      )}

      {!loading && !error && newsData.length > 0 && (
        <div className="site-news__grid">
          {newsData.map((news) => (
            <article key={news.id} className="news-card">
              <a href={`/site-haberleri/${news.id}`} className="news-card__link">
                <div className="news-card__image">
                  <img src={news.image} alt={news.title} />
                  <span className={`news-card__category news-card__category--${news.category}`}>{news.category}</span>
                </div>
                <div className="news-card__content">
                  <h2>{news.title}</h2>
                  <p>{news.summary}</p>
                  <div className="news-card__meta">
                    <span><FaCalendarAlt /> {news.date}</span>
                    <span><FaEye /> {news.views} görüntülenme</span>
                  </div>
                  <div className="news-card__tags">
                    <FaTags />
                    {news.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
                  </div>
                </div>
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiteNews;
