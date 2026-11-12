"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  FaChartLine, FaCalendarAlt, FaDownload,
  FaChartBar, FaWaveSquare, FaEye, FaHeart, FaComments,
  FaArrowUp, FaArrowDown,
} from 'react-icons/fa';
import { Line, Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import './ListingStats.css';
import { getMyListingStats, ListingStatsResponse } from '@/services/listings/my-stats/listingStatsApiService';
import { exportToExcel } from '@/utils/excelExport';
import ListingDetailModal from './ListingDetailModal';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface ListingStat { views: number; favorites: number; messages: number; monthlyViews?: number[]; monthlyLabels?: string[]; }
interface CardItem { id: string | number; title: string; status: string; img?: string; price?: number; date?: string; category?: string; categories?: string; categoryId?: number; stats?: ListingStat; [key: string]: unknown; }
interface PopularListing { id: string | number; title: string; views: number; favorites: number; messages: number; trend: { value: string; status: string }; }
interface ChartDataset { label: string; data: number[]; borderColor: string; backgroundColor: string; tension?: number; fill?: boolean; pointRadius?: number; [key: string]: unknown; }
interface ChartData { labels: string[]; datasets: ChartDataset[]; }

const sumViews = (points: { views: number }[], count: number): number =>
  points.slice(-count).reduce((total, p) => total + p.views, 0);

const generateTimeData = (period: string, monthlyViews: ListingStatsResponse['monthlyViews']): { labels: string[]; data: number[] } => {
  if (!monthlyViews || monthlyViews.length === 0) {
    return { labels: [], data: [] };
  }

  if (period === 'quarterly') {
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 0; i < monthlyViews.length; i += 3) {
      const chunk = monthlyViews.slice(i, i + 3);
      labels.push(`${Math.floor(i / 3) + 1}. Çeyrek`);
      data.push(chunk.reduce((sum, p) => sum + p.views, 0));
    }
    return { labels, data };
  }

  if (period === 'yearly') {
    const yearTotals = new Map<string, number>();
    monthlyViews.forEach((p) => {
      const year = p.periodKey.slice(0, 4);
      yearTotals.set(year, (yearTotals.get(year) || 0) + p.views);
    });
    return { labels: Array.from(yearTotals.keys()), data: Array.from(yearTotals.values()) };
  }

  return {
    labels: monthlyViews.map((p) => p.label.split(' ')[0]),
    data: monthlyViews.map((p) => p.views),
  };
};

const ListingStats: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('month');
  const [chartFilter, setChartFilter] = useState<string>('monthly');
  const [chartType, setChartType] = useState<string>('line');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [sortBy, setSortBy] = useState<string>('views');
  const [selectedListing, setSelectedListing] = useState<CardItem | null>(null);

  const [statsData, setStatsData] = useState<ListingStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMyListingStats()
      .then((data) => {
        if (!cancelled) setStatsData(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'İstatistikler yüklenirken bir hata oluştu');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const getAllListings = useCallback((): CardItem[] => {
    if (!statsData) return [];
    const monthlyLabels = statsData.monthlyViews.map((p) => p.label.split(' ')[0]);
    const items: CardItem[] = statsData.listings
      .filter((l) => l.active)
      .map((l) => ({
        id: l.id,
        title: l.title,
        img: l.img ?? undefined,
        price: l.price ?? 0,
        status: l.active ? 'active' : 'passive',
        date: l.createdAt ?? undefined,
        createdAt: l.createdAt ?? undefined,
        city: l.locationCity ?? undefined,
        category: l.category ?? undefined,
        categories: l.category ?? undefined,
        categoryId: l.categoryId ?? undefined,
        stats: {
          views: l.views,
          favorites: l.favorites,
          messages: l.messages,
          monthlyViews: l.monthlyViews && l.monthlyViews.length > 0 ? l.monthlyViews : Array(12).fill(0),
          monthlyLabels,
        },
      }));

    items.sort((a, b) => {
      if (sortBy === 'views') return (b.stats?.views ?? 0) - (a.stats?.views ?? 0);
      if (sortBy === 'date') return new Date(String(b.date || 0)).getTime() - new Date(String(a.date || 0)).getTime();
      return 0;
    });
    return items;
  }, [statsData, sortBy]);

  const allListings = getAllListings();

  const popularListings: PopularListing[] = (statsData?.popularListings || []).map((p) => ({
    id: p.id,
    title: p.title,
    views: p.views,
    favorites: p.favorites,
    messages: p.messages,
    trend: { value: p.trendValue, status: p.trendStatus },
  }));

  const overallStats = {
    views: statsData?.totalViews ?? 0,
    favorites: statsData?.totalFavorites ?? 0,
    messages: statsData?.totalMessages ?? 0,
  };

  const calculateStats = useCallback((range: string) => {
    const monthlyViews = statsData?.monthlyViews ?? [];
    const periodCount = range === 'quarter' ? 3 : range === 'year' ? 12 : 1;
    const currentViews = sumViews(monthlyViews, periodCount);
    const previousSlice = monthlyViews.slice(0, Math.max(0, monthlyViews.length - periodCount));
    const previousViews = range === 'year' ? 0 : sumViews(previousSlice, periodCount);
    const viewsChange = previousViews > 0 ? Math.round(((currentViews - previousViews) / previousViews) * 100) : 0;

    return [
      { title: 'Görüntülenme', value: currentViews.toLocaleString('tr-TR'), change: `${viewsChange >= 0 ? '+' : ''}${viewsChange}%`, icon: <FaEye />, color: '#3182ce', colorRgb: '49, 130, 206', lastPeriod: previousViews.toLocaleString('tr-TR'), description: 'Toplam görüntülenme sayısı' },
      { title: 'Favoriler', value: overallStats.favorites.toLocaleString('tr-TR'), change: '0%', icon: <FaHeart />, color: '#e53e3e', colorRgb: '229, 62, 62', lastPeriod: '0', description: 'Toplam favori sayısı' },
      { title: 'Mesajlar', value: overallStats.messages.toLocaleString('tr-TR'), change: '0%', icon: <FaComments />, color: '#38a169', colorRgb: '56, 161, 105', lastPeriod: '0', description: 'Toplam mesaj sayısı' },
    ];
  }, [statsData, overallStats.favorites, overallStats.messages]);

  const [stats, setStats] = useState(calculateStats('month'));
  useEffect(() => { setStats(calculateStats(dateRange)); }, [dateRange, calculateStats]);

  useEffect(() => {
    const timeData = generateTimeData(chartFilter, statsData?.monthlyViews ?? []);
    setChartData({
      labels: timeData.labels,
      datasets: [
        {
          label: 'İlan Görüntülenme',
          data: timeData.data,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.12)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#ea580c',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#ea580c',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    });
  }, [chartFilter, statsData]);

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx: any) =>
            `Görüntülenme: ${Number(ctx.parsed?.y ?? 0).toLocaleString('tr-TR')}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.14)' },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (v: number | string) => Number(v).toLocaleString('tr-TR'),
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          maxRotation: 0,
          autoSkip: true,
        },
      },
    },
    animation: { duration: 700, easing: 'easeInOutQuart' as const },
  };

  const renderChart = () => {
    if (!chartData) return null;
    if (chartType === 'bar')
      return (
        <Bar
          data={{
            ...chartData,
            datasets: [
              {
                ...chartData.datasets[0],
                backgroundColor: 'rgba(249, 115, 22, 0.82)',
                hoverBackgroundColor: '#ea580c',
                borderColor: '#ea580c',
                borderWidth: 1,
                borderRadius: 8,
              },
            ],
          }}
          options={chartOptions}
        />
      );
    if (chartType === 'scatter')
      return (
        <Scatter
          data={{
            ...chartData,
            datasets: [
              {
                ...chartData.datasets[0],
                showLine: true,
                pointStyle: 'circle',
                pointRadius: 6,
                fill: false,
              },
            ],
          }}
          options={chartOptions}
        />
      );
    return (
      <Line
        data={{
          ...chartData,
          datasets: [{ ...chartData.datasets[0], fill: true, borderWidth: 3, pointRadius: 3 }],
        }}
        options={chartOptions}
      />
    );
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString as string);
    if (Number.isNaN(date.getTime())) return 'Belirtilmemiş';
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleExport = () => {
    const exportData: any = { stats, timeData: generateTimeData(chartFilter, statsData?.monthlyViews ?? []), popularListings, allListings, formatDate };
    exportToExcel(exportData, dateRange);
  };

  if (loading) {
    return (
      <div className="listing-stats-container">
        <div className="ls-stats-header"><div className="header-left"><h1>İlan İstatistikleri</h1><p>İstatistikler yükleniyor...</p></div></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="listing-stats-container">
        <div className="ls-stats-header"><div className="header-left"><h1>İlan İstatistikleri</h1><p>{error}</p></div></div>
      </div>
    );
  }

  return (
    <div className="listing-stats-container">
      <div className="ls-stats-header">
        <div className="header-left"><h1>İlan İstatistikleri</h1><p>İlanlarınızın performans analizi ve detaylı raporları</p></div>
        <div className="header-actions">
          <div className="date-filter">
            <FaCalendarAlt />
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="month">Bu Ay</option><option value="quarter">3 Aylık</option><option value="year">Bu Yıl</option>
            </select>
          </div>
          <button className="export-btn" onClick={handleExport} title="Tüm istatistikleri Excel dosyası olarak indir"><FaDownload /> Rapor İndir</button>
        </div>
      </div>

      <div className="ls-stats-grid">
        <div className="ls-stat-card ls-earning"><div className="ls-stat-icon"><FaEye /></div><div className="ls-stat-content"><div className="ls-stat-title">Toplam Görüntülenme</div><div className="ls-stat-value">{overallStats.views.toLocaleString('tr-TR')}</div></div></div>
        <div className="ls-stat-card ls-lost"><div className="ls-stat-icon"><FaHeart /></div><div className="ls-stat-content"><div className="ls-stat-title">Favoriye Eklenme</div><div className="ls-stat-value">{overallStats.favorites.toLocaleString('tr-TR')}</div></div></div>
        <div className="ls-stat-card ls-total"><div className="ls-stat-icon"><FaComments /></div><div className="ls-stat-content"><div className="ls-stat-title">Toplam Mesaj</div><div className="ls-stat-value">{overallStats.messages.toLocaleString('tr-TR')}</div></div></div>
      </div>

      <div className="stats-chart-wrapper">
        <div className="stats-chart-header">
          <div className="stats-chart-title"><h2>İlan Görüntülenme İstatistikleri</h2><p>Aylık görüntülenme sayıları</p></div>
          <div className="stats-chart-controls">
            <div className="stats-chart-type-selector">
              <button className={`type-btn ${chartType === 'line' ? 'active' : ''}`} onClick={() => setChartType('line')}><FaChartLine /> Çizgi</button>
              <button className={`type-btn ${chartType === 'scatter' ? 'active' : ''}`} onClick={() => setChartType('scatter')}><FaWaveSquare /> Nokta</button>
              <button className={`type-btn ${chartType === 'bar' ? 'active' : ''}`} onClick={() => setChartType('bar')}><FaChartBar /> Sütun</button>
            </div>
            <div className="stats-time-filters">
              {['monthly', 'quarterly', 'yearly'].map(f => <button key={f} className={`time-filter-btn ${chartFilter === f ? 'active' : ''}`} onClick={() => setChartFilter(f)}>{f === 'monthly' ? 'Aylık' : f === 'quarterly' ? '3 Aylık' : 'Yıllık'}</button>)}
            </div>
          </div>
        </div>
        <div className="stats-chart-content">{renderChart()}</div>
      </div>

      <div className="popular-listings">
        <h2>Popüler İlanlar</h2>
        <div className="listings-table">
          <table>
            <thead><tr><th>İlan Başlığı</th><th>Görüntülenme</th><th>Favoriye Eklenme</th><th>Mesajlar</th><th>Trend</th></tr></thead>
            <tbody>
              {popularListings.map(listing => (
                <tr key={String(listing.id)}>
                  <td data-label="İlan Başlığı" className="ls-cell-title">{listing.title}</td>
                  <td data-label="Görüntülenme"><div className="stat-cell"><FaEye /> {listing.views.toLocaleString('tr-TR')}</div></td>
                  <td data-label="Favori"><div className="stat-cell"><FaHeart /> {listing.favorites.toLocaleString('tr-TR')}</div></td>
                  <td data-label="Mesaj"><div className="stat-cell"><FaComments /> {listing.messages.toLocaleString('tr-TR')}</div></td>
                  <td data-label="Trend"><div className={`trend-cell ${listing.trend.status}`}>{listing.trend.status === 'positive' ? <FaArrowUp /> : <FaArrowDown />}{listing.trend.value}</div></td>
                </tr>
              ))}
              {popularListings.length === 0 && (
                <tr className="ls-empty-row"><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>Henüz veri yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="all-listings-stats">
        <div className="section-header">
          <h2>Aktif İlanların İstatistikleri</h2>
          <div className="filter-controls">
            <select className="sort-filter" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="views">Görüntülenmeye Göre</option><option value="date">Tarihe Göre</option>
            </select>
          </div>
        </div>
        <div className="listings-detailed-table">
          <table>
            <thead><tr><th>İlan Görseli</th><th>İlan Başlığı</th><th>Tutar</th><th>Durum</th><th>Görüntülenme</th><th>İlan Tarihi</th><th>Aylık Görüntülenme</th></tr></thead>
            <tbody>
              {allListings.map(listing => (
                <tr key={String(listing.id)} onClick={() => setSelectedListing(listing)} style={{ cursor: 'pointer' }}>
                  <td data-label="Görsel" className="ls-cell-thumb">{listing.img ? <img src={listing.img as string} alt={listing.title} className="listing-thumbnail" /> : <div className="listing-thumbnail" style={{ background: '#f1f5f9' }} />}</td>
                  <td data-label="İlan Başlığı" className="ls-cell-title"><div className="listing-title"><span>{listing.title}</span></div></td>
                  <td data-label="Tutar"><div className="listing-price">{listing.price} TL</div></td>
                  <td data-label="Durum"><span className={`status-badge ${listing.status}`}>{listing.status === 'active' ? 'Aktif' : 'Pasif'}</span></td>
                  <td data-label="Görüntülenme"><div className="stat-cell"><FaEye /> {(listing.stats?.views ?? 0).toLocaleString('tr-TR')}</div></td>
                  <td data-label="İlan Tarihi"><div className="listing-date">{formatDate((listing.date as string) || new Date())}</div></td>
                  <td data-label="Aylık Trend" className="ls-cell-sparkline">
                    <div className="monthly-views">
                      <Line
                        data={{ labels: Array(12).fill(''), datasets: [{ label: '', data: listing.stats?.monthlyViews || Array(12).fill(0), borderColor: '#f97316', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true, backgroundColor: 'rgba(249, 115, 22, 0.12)' }] }}
                        options={{ plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.parsed?.y ?? 0} görüntülenme` } } }, scales: { x: { display: false }, y: { display: false } }, maintainAspectRatio: false }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {allListings.length === 0 && (
                <tr className="ls-empty-row"><td colSpan={7} style={{ textAlign: 'center', color: '#999' }}>Aktif ilan bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedListing && <ListingDetailModal listing={selectedListing} onClose={() => setSelectedListing(null)} />}
    </div>
  );
};

export default ListingStats;
