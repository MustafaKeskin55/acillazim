"use client";

import React, { useState } from 'react';
import { FaAd, FaBullhorn, FaChartLine, FaClock, FaSearch, FaFilter, FaPlus, FaEye } from 'react-icons/fa';
import './AdvertManagement.css';

interface Campaign {
  id: number;
  title: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  budget: string;
  spent: string;
  views: number;
  clicks: number;
  ctr: string;
}

const campaigns: Campaign[] = [
  { id: 1, title: 'Web Tasarım Hizmeti', type: 'Premium Listing', status: 'active', startDate: '2024-03-01', endDate: '2024-04-01', budget: '500₺', spent: '250₺', views: 1234, clicks: 123, ctr: '9.8%' },
  { id: 2, title: 'Mobil Uygulama Geliştirme', type: 'Sponsored Ad', status: 'pending', startDate: '2024-03-25', endDate: '2024-04-25', budget: '1000₺', spent: '0₺', views: 0, clicks: 0, ctr: '0%' },
];

const getStatusColor = (status: string): string => {
  switch (status) { case 'active': return '#4CAF50'; case 'pending': return '#FFC107'; case 'completed': return '#9E9E9E'; case 'paused': return '#FF5722'; default: return '#666'; }
};

const getStatusText = (status: string): string => {
  switch (status) { case 'active': return 'Aktif'; case 'pending': return 'Onay Bekliyor'; case 'completed': return 'Tamamlandı'; case 'paused': return 'Duraklatıldı'; default: return status; }
};

const AdvertManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="advert-management-container">
      <div className="advert-header">
        <div className="header-left"><h1>Reklam Yönetimi</h1><p>İlanlarınız için reklam kampanyalarını yönetin</p></div>
        <div className="advert-header-actions"><button className="create-campaign-btn"><FaPlus /> Yeni Kampanya</button></div>
      </div>

      <div className="campaign-stats">
        <div className="stat-card"><div className="stat-icon"><FaAd /></div><div className="stat-info"><h3>Aktif Kampanyalar</h3><div className="stat-value">3</div></div></div>
        <div className="stat-card"><div className="stat-icon"><FaEye /></div><div className="stat-info"><h3>Toplam Görüntülenme</h3><div className="stat-value">12,345</div></div></div>
        <div className="stat-card"><div className="stat-icon"><FaChartLine /></div><div className="stat-info"><h3>Ortalama CTR</h3><div className="stat-value">8.5%</div></div></div>
        <div className="stat-card"><div className="stat-icon"><FaClock /></div><div className="stat-info"><h3>Kalan Süre</h3><div className="stat-value">15 gün</div></div></div>
      </div>

      <div className="campaigns-container">
        <div className="campaigns-header">
          <div className="page-search-container">
            <div className="advert-page-search">
              <input type="text" placeholder="Kampanya ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <FaSearch className="advert-page-search-icon" />
            </div>
            <div className="filter-box">
              <FaFilter className="filter-icon" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="pending">Onay Bekleyen</option>
                <option value="completed">Tamamlanan</option>
                <option value="paused">Duraklatılan</option>
              </select>
            </div>
          </div>
        </div>

        <div className="campaigns-table">
          <table>
            <thead><tr><th>Kampanya</th><th>Tür</th><th>Durum</th><th>Tarih</th><th>Bütçe</th><th>Harcanan</th><th>Görüntülenme</th><th>Tıklama</th><th>CTR</th><th>İşlemler</th></tr></thead>
            <tbody>
              {filteredCampaigns.map(campaign => (
                <tr key={campaign.id}>
                  <td><div className="campaign-info"><FaBullhorn className="campaign-icon" /><div><div className="campaign-title">{campaign.title}</div><div className="campaign-id">ID: {campaign.id}</div></div></div></td>
                  <td>{campaign.type}</td>
                  <td><span className="status-badge" style={{ backgroundColor: getStatusColor(campaign.status) }}>{getStatusText(campaign.status)}</span></td>
                  <td><div className="date-range"><div>{campaign.startDate}</div><div>{campaign.endDate}</div></div></td>
                  <td>{campaign.budget}</td>
                  <td>{campaign.spent}</td>
                  <td>{campaign.views}</td>
                  <td>{campaign.clicks}</td>
                  <td>{campaign.ctr}</td>
                  <td><div className="action-buttons"><button className="action-btn edit">Düzenle</button><button className="action-btn pause">Duraklat</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvertManagement;
