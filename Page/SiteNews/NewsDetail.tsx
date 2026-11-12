"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DOMPurify from 'dompurify';
import { FaCalendarAlt, FaEye, FaTags, FaArrowLeft, FaShare, FaBookmark, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { newsService, NewsDetail as NewsDetailType, NewsItem } from '@/services/news/newsService';
import './NewsDetail.css';

const NewsDetail: React.FC = () => {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [news, setNews] = useState<NewsDetailType | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [relatedNews, setRelatedNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await newsService.getNewsDetail(id);
        if (cancelled) return;
        setNews(result.news);
        setRelatedNews(result.related);
      } catch (err) {
        if (!cancelled) {
          setNews(null);
          setError(err instanceof Error ? err.message : 'Haber yüklenirken bir hata oluştu');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="news-detail__loading">
        <FaSpinner style={{ animationName: 'spin' }} /> Yükleniyor...
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="news-detail__loading">
        <FaExclamationTriangle /> {error || 'Haber bulunamadı'}
      </div>
    );
  }

  return (
    <div className="news-detail">
      <div className="news-detail__container">
        <div className="news-detail__header">
          <a href="/site-haberleri" className="news-detail__back"><FaArrowLeft /> Haberlere Dön</a>
          <div className="news-detail__actions">
            <button className={`action-btn ${isBookmarked ? 'active' : ''}`} onClick={() => setIsBookmarked(!isBookmarked)}>
              <FaBookmark /> {isBookmarked ? 'Kaydedildi' : 'Kaydet'}
            </button>
            <button className="action-btn" onClick={() => { if (navigator.share) navigator.share({ title: news.title, url: window.location.href }).catch(() => { }); }}><FaShare /> Paylaş</button>
          </div>
        </div>

        <article className="news-detail__content">
          <div className="news-detail__meta">
            <span className={`category category--${news.category}`}>{news.category}</span>
            <span><FaCalendarAlt /> {news.date}</span>
            <span><FaEye /> {news.views} görüntülenme</span>
            <span>Okuma süresi: {news.readTime}</span>
          </div>
          <h1>{news.title}</h1>
          <div className="news-detail__author">Yazar: {news.author}</div>
          <div className="news-detail__image"><img src={news.image} alt={news.title} /></div>
          <div className="news-detail__text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(news.content) }} />
          <div className="news-detail__tags">
            <FaTags />
            {news.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
          </div>
        </article>

        {relatedNews.length > 0 && (
          <div className="news-detail__related">
            <h2>İlgili Haberler</h2>
            <div className="related-news__grid">
              {relatedNews.map((item) => (
                <a href={`/site-haberleri/${item.id}`} key={item.id} className="related-news__card">
                  <div className="related-news__image">
                    <img src={item.image} alt={item.title} />
                    <span className={`category category--${item.category}`}>{item.category}</span>
                  </div>
                  <div className="related-news__content">
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                    <span className="related-news__date"><FaCalendarAlt /> {item.date}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsDetail;
