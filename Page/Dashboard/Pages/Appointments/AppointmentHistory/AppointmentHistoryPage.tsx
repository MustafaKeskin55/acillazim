"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import {
  FiBarChart2,
  FiList,
  FiSearch,
  FiDownload,
  FiTrendingUp,
  FiTrendingDown,
  FiCalendar,
  FiPercent,
  FiInfo,
  FiFilter,
  FiClock,
  FiUser,
  FiInbox,
  FiAlertTriangle,
  FiX,
} from 'react-icons/fi';
import './AppointmentHistoryPage.css';
import { getProviderAppointments, type ProviderAppointmentRecord } from '@/services/appointment/appointmentService';
import { AppointmentAnalytics, statusLabels } from './AppointmentAnalytics';
import Loader from '@/components/Loader/Loader';

const appointmentStatuses = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

type AppointmentItem = ProviderAppointmentRecord;
interface MonthlyData {
  name: string;
  kazanç: number;
  kayıp: number;
  count: number;
  rate: number;
  [key: string]: unknown;
}

const AppointmentHistoryPage: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('stats');
  const [monthlyEarningsData, setMonthlyEarningsData] = useState<MonthlyData[]>([]);
  const [showTotalEarningTooltip, setShowTotalEarningTooltip] = useState<boolean>(false);
  const [showLostEarningTooltip, setShowLostEarningTooltip] = useState<boolean>(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const fetchedAppointments = await getProviderAppointments();
        setAppointments(fetchedAppointments);
        const analyticsData = AppointmentAnalytics.getMonthlyEarnings(
          fetchedAppointments,
          6,
          [appointmentStatuses.CONFIRMED, appointmentStatuses.COMPLETED],
          appointmentStatuses.REJECTED
        );
        setMonthlyEarningsData(analyticsData);
        setLoading(false);
      } catch (err) {
        setError('Randevular yüklenirken bir hata oluştu');
        setLoading(false);
        console.error(err);
      }
    };
    fetchAppointments();
  }, []);

  const filteredAppointments = AppointmentAnalytics.filterAppointments(appointments, {
    searchTerm,
    statusFilter,
    dateRange,
    pastOnly: true,
  });
  const completedAppointments = filteredAppointments.filter(
    (a) => a.status?.toLowerCase() === appointmentStatuses.COMPLETED
  );
  const confirmedAppointments = filteredAppointments.filter(
    (a) => a.status?.toLowerCase() === appointmentStatuses.CONFIRMED
  );
  const rejectedAppointments = filteredAppointments.filter(
    (a) => a.status?.toLowerCase() === appointmentStatuses.REJECTED
  );
  const totalEarnings = AppointmentAnalytics.calculateTotalEarnings(filteredAppointments, [
    appointmentStatuses.COMPLETED,
    appointmentStatuses.CONFIRMED,
  ]);
  const lostEarnings = AppointmentAnalytics.calculateLostEarnings(
    filteredAppointments,
    appointmentStatuses.REJECTED
  );
  const rejectionRate = AppointmentAnalytics.calculateRejectionRate(
    filteredAppointments,
    appointmentStatuses.REJECTED
  );

  const statusDistribution = [
    { name: 'Tamamlandı', value: completedAppointments.length, fill: '#10b981' },
    { name: 'Onaylandı', value: confirmedAppointments.length, fill: '#003466' },
    { name: 'Reddedildi', value: rejectedAppointments.length, fill: '#FF6B00' },
  ].filter((item) => item.value > 0);

  const hasActiveFilters =
    searchTerm.trim() !== '' || statusFilter !== 'all' || dateRange !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange('all');
  };

  const exportToExcel = (type: string) => {
    try {
      const wb = XLSX.utils.book_new();
      const dateStamp = new Date().toISOString().slice(0, 10);

      if (type === 'appointments') {
        if (filteredAppointments.length === 0) {
          alert('Dışa aktarılacak randevu verisi bulunamadı.');
          return;
        }
        const appointmentRows = filteredAppointments.map((app) => ({
          Tarih: format(parseISO(app.date), 'dd MMMM yyyy', { locale: tr }),
          Saat: app.time || '—',
          Randevu: app.title,
          Müşteri: app.client.name,
          Telefon: app.client.phone || '—',
          Fiyat: parseFloat(String(app.price)).toLocaleString('tr-TR') + ' ₺',
          Durum: (statusLabels as Record<string, string>)[(app.status || '').toLowerCase()] || (statusLabels as Record<string, string>)[app.status] || app.status,
          Notlar: app.notes || '—',
        }));
        const ws = XLSX.utils.json_to_sheet(appointmentRows);
        ws['!cols'] = [
          { wch: 18 },
          { wch: 10 },
          { wch: 30 },
          { wch: 22 },
          { wch: 16 },
          { wch: 15 },
          { wch: 14 },
          { wch: 30 },
        ];
        ws['!rows'] = Array(appointmentRows.length + 1).fill({ hpt: 24 });
        XLSX.utils.book_append_sheet(wb, ws, 'Randevu Geçmişi');
        XLSX.writeFile(wb, `Randevu_Gecmisi_${dateStamp}.xlsx`);
      } else {
        // 1. İstatistik Özeti Sayfası (İlan İstatistikleri raporu ile aynı yapı)
        const summaryData = [
          { İstatistik: 'Toplam Kazanç (Tahmini)', Değer: `${totalEarnings.toLocaleString('tr-TR')} ₺` },
          { İstatistik: 'Kaybedilen Gelir (Tahmini)', Değer: `${lostEarnings.toLocaleString('tr-TR')} ₺` },
          { İstatistik: 'Toplam Geçmiş Randevu', Değer: filteredAppointments.length },
          { İstatistik: 'Onaylanan Randevu Sayısı', Değer: confirmedAppointments.length },
          { İstatistik: 'Reddedilen Randevu Sayısı', Değer: rejectedAppointments.length },
          { İstatistik: 'Ret Oranı (%)', Değer: `%${rejectionRate}` },
        ];
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        summarySheet['!cols'] = [{ wch: 28 }, { wch: 20 }];
        summarySheet['!rows'] = Array(summaryData.length + 1).fill({ hpt: 24 });
        XLSX.utils.book_append_sheet(wb, summarySheet, 'İstatistik Özeti');

        // 2. Aylık Gelir Analizi Sayfası
        const monthlyRows = monthlyEarningsData.map((m) => ({
          Ay: m.name,
          'Kazanç (₺)': m.kazanç,
          'Kayıp (₺)': m.kayıp,
          'Randevu Sayısı': m.count,
          'Onay Oranı (%)': `%${m.rate}`,
        }));
        const monthlySheet = XLSX.utils.json_to_sheet(monthlyRows);
        monthlySheet['!cols'] = [
          { wch: 14 },
          { wch: 16 },
          { wch: 16 },
          { wch: 16 },
          { wch: 16 },
        ];
        monthlySheet['!rows'] = Array(monthlyRows.length + 1).fill({ hpt: 24 });
        XLSX.utils.book_append_sheet(wb, monthlySheet, 'Aylık Gelir Analizi');

        // 3. Randevu Geçmişi Detay Sayfası (varsa)
        if (filteredAppointments.length > 0) {
          const appointmentRows = filteredAppointments.map((app) => ({
            Tarih: format(parseISO(app.date), 'dd MMMM yyyy', { locale: tr }),
            Saat: app.time || '—',
            Randevu: app.title,
            Müşteri: app.client.name,
            Telefon: app.client.phone || '—',
            Fiyat: parseFloat(String(app.price)).toLocaleString('tr-TR') + ' ₺',
            Durum: (statusLabels as Record<string, string>)[(app.status || '').toLowerCase()] || (statusLabels as Record<string, string>)[app.status] || app.status,
            Notlar: app.notes || '—',
          }));
          const detailSheet = XLSX.utils.json_to_sheet(appointmentRows);
          detailSheet['!cols'] = [
            { wch: 18 },
            { wch: 10 },
            { wch: 30 },
            { wch: 22 },
            { wch: 16 },
            { wch: 15 },
            { wch: 14 },
            { wch: 30 },
          ];
          detailSheet['!rows'] = Array(appointmentRows.length + 1).fill({ hpt: 24 });
          XLSX.utils.book_append_sheet(wb, detailSheet, 'Randevu Geçmişi');
        }

        XLSX.writeFile(wb, `Randevu_Istatistikleri_${dateStamp}.xlsx`);
      }
    } catch (err) {
      console.error('Excel dışa aktarma hatası:', err);
      alert('Dışa aktarma sırasında bir hata oluştu.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="apphist-error">
        <FiAlertTriangle size={22} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="apphist-container">
      {/* Üst Başlık ve Sekmeler */}
      <header className="apphist-header">
        <div className="apphist-header-copy">
          <div className="apphist-eyebrow">
            <span className="apphist-eyebrow-dot" />
            <span>Finansal & Operasyonel Raporlama</span>
          </div>
          <h1 className="apphist-title">Randevu Geçmişi ve Analizler</h1>
          <p className="apphist-subtitle">
            Geçmiş randevu performansınızı, tahmini gelir dağılımınızı ve onay oranlarınızı detaylı inceleyin.
          </p>
        </div>

        <div className="apphist-tabs" role="tablist" aria-label="Görünüm Seçimi">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'stats'}
            className={`apphist-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <FiBarChart2 size={16} />
            <span>İstatistikler</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'list'}
            className={`apphist-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <FiList size={16} />
            <span>Randevu Listesi</span>
            <span className="apphist-tab-badge">{filteredAppointments.length}</span>
          </button>
        </div>
      </header>

      {/* 4'lü KPI İstatistik Kartları */}
      <div className="apphist-stats-cards">
        <div
          className="apphist-stat-card apphist-earning"
          onMouseEnter={() => setShowTotalEarningTooltip(true)}
          onMouseLeave={() => setShowTotalEarningTooltip(false)}
        >
          <div className="apphist-stat-icon" aria-hidden="true">
            <FiTrendingUp size={22} />
          </div>
          <div className="apphist-stat-content">
            <div className="apphist-stat-label-row">
              <h3 className="apphist-stat-title">Toplam Kazanç</h3>
              <span className="apphist-estimate-tag">
                <FiInfo size={11} />
                Tahmini
              </span>
            </div>
            <p className="apphist-stat-value">
              {totalEarnings.toLocaleString('tr-TR')} <span className="apphist-currency">₺</span>
            </p>
            <span className="apphist-stat-caption">
              Onaylanan ve tamamlanan randevular
            </span>
          </div>
          {showTotalEarningTooltip && (
            <span className="apphist-tooltip" role="tooltip">
              Bu kazanç tahminidir, net değer vermez
            </span>
          )}
        </div>

        <div
          className="apphist-stat-card apphist-lost"
          onMouseEnter={() => setShowLostEarningTooltip(true)}
          onMouseLeave={() => setShowLostEarningTooltip(false)}
        >
          <div className="apphist-stat-icon" aria-hidden="true">
            <FiTrendingDown size={22} />
          </div>
          <div className="apphist-stat-content">
            <div className="apphist-stat-label-row">
              <h3 className="apphist-stat-title">Kaybedilen Gelir</h3>
              <span className="apphist-estimate-tag apphist-estimate-tag--warn">
                <FiInfo size={11} />
                Tahmini
              </span>
            </div>
            <p className="apphist-stat-value">
              {lostEarnings.toLocaleString('tr-TR')} <span className="apphist-currency">₺</span>
            </p>
            <span className="apphist-stat-caption">
              Reddedilen randevuların toplam tutarı
            </span>
          </div>
          {showLostEarningTooltip && (
            <span className="apphist-tooltip" role="tooltip">
              Bu kaybedilen gelir tahminidir, net değer vermez
            </span>
          )}
        </div>

        <div className="apphist-stat-card apphist-total">
          <div className="apphist-stat-icon" aria-hidden="true">
            <FiCalendar size={22} />
          </div>
          <div className="apphist-stat-content">
            <div className="apphist-stat-label-row">
              <h3 className="apphist-stat-title">Toplam Randevu</h3>
            </div>
            <p className="apphist-stat-value">{filteredAppointments.length}</p>
            <span className="apphist-stat-caption">
              {completedAppointments.length} tamamlanan · {confirmedAppointments.length} onaylı · {rejectedAppointments.length} reddedilen
            </span>
          </div>
        </div>

        <div className="apphist-stat-card apphist-rejection">
          <div className="apphist-stat-icon" aria-hidden="true">
            <FiPercent size={22} />
          </div>
          <div className="apphist-stat-content">
            <div className="apphist-stat-label-row">
              <h3 className="apphist-stat-title">Ret Oranı</h3>
            </div>
            <p className="apphist-stat-value">%{rejectionRate}</p>
            <span className="apphist-stat-caption">
              Kabul oranı: %{filteredAppointments.length > 0 ? Math.max(0, 100 - rejectionRate) : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Arama ve Filtre Çubuğu */}
      <div className="apphist-filters">
        <div className="apphist-search">
          <span className="apphist-icon-search" aria-hidden="true">
            <FiSearch size={17} />
          </span>
          <input
            type="text"
            placeholder="Randevu başlığı veya müşteri adına göre ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="apphist-search-clear"
              onClick={() => setSearchTerm('')}
              aria-label="Aramayı temizle"
            >
              <FiX size={15} />
            </button>
          )}
        </div>

        <div className="apphist-filter-group">
          <div className="apphist-select-wrapper">
            <FiFilter className="apphist-select-icon" size={14} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="apphist-select"
              aria-label="Durum Filtresi"
            >
              <option value="all">Tüm Durumlar</option>
              <option value={appointmentStatuses.COMPLETED}>Tamamlanan</option>
              <option value={appointmentStatuses.CONFIRMED}>Onaylanan</option>
              <option value={appointmentStatuses.REJECTED}>Reddedilen</option>
              <option value={appointmentStatuses.CANCELLED}>İptal Edilen</option>
              <option value={appointmentStatuses.PENDING}>Bekleyen</option>
            </select>
          </div>

          <div className="apphist-select-wrapper">
            <FiClock className="apphist-select-icon" size={14} />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="apphist-select"
              aria-label="Zaman Aralığı Filtresi"
            >
              <option value="all">Tüm Zamanlar</option>
              <option value="1">Son 1 Ay</option>
              <option value="3">Son 3 Ay</option>
              <option value="6">Son 6 Ay</option>
              <option value="12">Son 1 Yıl</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="apphist-btn-reset"
              onClick={resetFilters}
            >
              <FiX size={14} />
              <span>Filtreleri Temizle</span>
            </button>
          )}
        </div>
      </div>

      {/* İçerik Alanı: İstatistik Grafikleri veya Randevu Tablosu */}
      {activeTab === 'stats' ? (
        <div className="apphist-analytics-section">
          <div className="apphist-section-toolbar">
            <div>
              <h2 className="apphist-section-title">Performans ve Gelir İstatistikleri</h2>
              <p className="apphist-section-subtitle">
                Son 6 aylık finansal akış, randevu durum dağılımı ve aylık onay eğilimi
              </p>
            </div>
            <button
              type="button"
              className="apphist-btn-export"
              onClick={() => exportToExcel('statistics')}
            >
              <FiDownload size={16} />
              <span>İstatistikleri İndir (.xlsx)</span>
            </button>
          </div>

          <div className="apphist-charts-container">
            {/* Grafik 1: Aylık Gelir Analizi */}
            <div className="apphist-chart-card">
              <div className="apphist-chart-header">
                <div>
                  <h3 className="apphist-chart-title">Aylık Gelir Analizi</h3>
                  <p className="apphist-chart-subtitle">Tahmini kazanç ve kaybedilen gelir karşılaştırması</p>
                </div>
                <div className="apphist-chart-legend">
                  <span className="apphist-legend-item">
                    <span className="apphist-legend-color" style={{ backgroundColor: '#059669' }} />
                    Kazanç
                  </span>
                  <span className="apphist-legend-item">
                    <span className="apphist-legend-color" style={{ backgroundColor: '#FF6B00' }} />
                    Kaybedilen
                  </span>
                </div>
              </div>
              <div className="apphist-chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyEarningsData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorKazanc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="colorKayip" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#FF6B00" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number) => `${value.toLocaleString('tr-TR')} ₺`}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
                        fontSize: '13px',
                      }}
                      itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="kazanç"
                      name="Kazanç"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorKazanc)"
                    />
                    <Area
                      type="monotone"
                      dataKey="kayıp"
                      name="Kaybedilen"
                      stroke="#FF6B00"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorKayip)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grafik 2: Randevu Durumları */}
            <div className="apphist-chart-card">
              <div className="apphist-chart-header">
                <div>
                  <h3 className="apphist-chart-title">Randevu Durumları</h3>
                  <p className="apphist-chart-subtitle">Onaylanan ve reddedilen randevuların oranı</p>
                </div>
                <div className="apphist-chart-legend">
                  <span className="apphist-legend-item">
                    <span className="apphist-legend-color" style={{ backgroundColor: '#10b981' }} />
                    Tamamlandı ({completedAppointments.length})
                  </span>
                  <span className="apphist-legend-item">
                    <span className="apphist-legend-color" style={{ backgroundColor: '#003466' }} />
                    Onaylandı ({confirmedAppointments.length})
                  </span>
                  <span className="apphist-legend-item">
                    <span className="apphist-legend-color" style={{ backgroundColor: '#FF6B00' }} />
                    Reddedildi ({rejectedAppointments.length})
                  </span>
                </div>
              </div>
              <div className="apphist-chart-body">
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadialBarChart
                      cx="50%"
                      cy="55%"
                      innerRadius="28%"
                      outerRadius="85%"
                      barSize={22}
                      data={statusDistribution}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        label={{ position: 'insideStart', fill: '#fff', fontSize: 12 }}
                        background
                        dataKey="value"
                        cornerRadius={10}
                      />
                      <Legend
                        iconSize={10}
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value} randevu`, name]}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
                          fontSize: '13px',
                        }}
                        itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="apphist-chart-empty">
                    <FiInbox size={28} />
                    <p>Seçili dönemde onaylanan veya reddedilen randevu verisi bulunmuyor.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Grafik 3: Randevu Eğilimi */}
            <div className="apphist-chart-card apphist-chart-card--wide">
              <div className="apphist-chart-header">
                <div>
                  <h3 className="apphist-chart-title">Randevu Eğilimi</h3>
                  <p className="apphist-chart-subtitle">Aylık toplam randevu adedi ve onaylanma yüzdesi</p>
                </div>
                <div className="apphist-chart-legend">
                  <span className="apphist-legend-item">
                    <span className="apphist-legend-color" style={{ backgroundColor: '#003466' }} />
                    Randevu Sayısı
                  </span>
                  <span className="apphist-legend-item">
                    <span className="apphist-legend-color" style={{ backgroundColor: '#059669' }} />
                    Onay Oranı (%)
                  </span>
                </div>
              </div>
              <div className="apphist-chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyEarningsData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis
                      yAxisId="left"
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
                        fontSize: '13px',
                      }}
                      itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="count"
                      stroke="#003466"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#003466', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 7, fill: '#003466' }}
                      name="Randevu Sayısı"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="rate"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 7, fill: '#059669' }}
                      name="Onay Oranı %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="apphist-table-container">
          <div className="apphist-table-header">
            <div>
              <h2 className="apphist-table-title">Geçmiş Randevular</h2>
              <p className="apphist-table-subtitle">
                Toplam <strong>{filteredAppointments.length}</strong> geçmiş randevu kaydı listeleniyor
              </p>
            </div>
            <div className="apphist-table-actions">
              <button
                type="button"
                className="apphist-btn-export"
                onClick={() => exportToExcel('appointments')}
              >
                <FiDownload size={16} />
                <span>Excel Olarak Dışa Aktar</span>
              </button>
            </div>
          </div>

          <div className="apphist-table-responsive">
            <table className="apphist-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Randevu</th>
                  <th>Müşteri</th>
                  <th>Fiyat</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((appointment) => (
                    <tr key={String(appointment.id)}>
                      <td>
                        <div className="apphist-date-cell">
                          <span className="apphist-date-main">
                            {format(parseISO(appointment.date), 'dd MMMM yyyy', { locale: tr })}
                          </span>
                          {appointment.time && (
                            <span className="apphist-date-time">
                              <FiClock size={12} />
                              {appointment.time}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="apphist-appointment-title">{appointment.title}</span>
                      </td>
                      <td>
                        <div className="apphist-client-cell">
                          <span className="apphist-client-avatar" aria-hidden="true">
                            {appointment.client?.name ? (
                              appointment.client.name.charAt(0).toUpperCase()
                            ) : (
                              <FiUser size={13} />
                            )}
                          </span>
                          <div className="apphist-client-info">
                            <span className="apphist-client-name">{appointment.client.name}</span>
                            {appointment.client.phone && (
                              <span className="apphist-client-phone">{appointment.client.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="apphist-price-badge">
                          {parseFloat(String(appointment.price)).toLocaleString('tr-TR')} ₺
                        </span>
                      </td>
                      <td>
                        <span
                          className={`apphist-status-badge apphist-status-${(appointment.status || '').toLowerCase()}`}
                        >
                          {(statusLabels as Record<string, string>)[(appointment.status || '').toLowerCase()] ||
                            (statusLabels as Record<string, string>)[appointment.status] ||
                            appointment.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="apphist-no-data">
                      <div className="apphist-empty-state">
                        <div className="apphist-empty-icon-wrap">
                          <FiInbox size={28} />
                        </div>
                        <h4>Filtrelere uygun randevu bulunamadı</h4>
                        <p>
                          Arama kriterlerinizi veya tarih/durum filtrelerinizi değiştirerek tekrar deneyebilirsiniz.
                        </p>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            className="apphist-btn-reset"
                            onClick={resetFilters}
                          >
                            <FiX size={14} />
                            <span>Filtreleri Sıfırla</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentHistoryPage;
