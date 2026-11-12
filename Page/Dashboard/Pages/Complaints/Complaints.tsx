"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaFlag,
  FaSearch,
  FaFilter,
  FaRegClock,
  FaEye,
  FaUserShield,
  FaSpinner,
  FaInbox,
  FaPlus,
  FaExclamationTriangle,
  FaCheckCircle,
  FaHourglassHalf,
  FaClipboardList,
  FaComments,
  FaShieldAlt,
  FaArrowRight,
} from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { sikayetService, Sikayet, DurumDegeri } from '@/services/sikayet';
import ComplaintDetailModal from './Components/ComplaintDetailModal';
import './Complaints.css';

const Complaints: React.FC = () => {
  const router = useRouter();
  const auth = useAuth() as {
    isAuthenticated?: boolean;
    authToken?: string | null;
    currentUser?: unknown;
  } | null;

  const isAuthenticated = auth?.isAuthenticated;
  const authToken = auth?.authToken;
  const currentUserId = useMemo(() => {
    const u = auth?.currentUser as Record<string, unknown> | undefined;
    return u?.id ?? u?.user_id ?? u?.userId;
  }, [auth?.currentUser]);

  const [sikayetler, setSikayetler] = useState<Sikayet[]>([]);
  const [durumDegerleri, setDurumDegerleri] = useState<DurumDegeri[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Detay & Mesajlaşma Modalı State'i
  const [selectedSikayet, setSelectedSikayet] = useState<Sikayet | null>(null);

  const loadSikayetler = useCallback(async () => {
    if (!authToken) return;
    try {
      setLoading(true);
      setError(null);
      const [liste, durumlar] = await Promise.all([
        sikayetService.getSikayetlerim(authToken),
        sikayetService.getDurumDegerleri(),
      ]);
      setSikayetler(liste);
      setDurumDegerleri(durumlar);
    } catch (err) {
      setSikayetler([]);
      setError(err instanceof Error ? err.message : 'Şikayetler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadSikayetler();
  }, [loadSikayetler]);

  const filteredSikayetler = sikayetler.filter((s) => {
    const matchesSearch =
      s.hedefAdi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.kategoriAdi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.baslik?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || s.durum === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Tarih bilgisi yok';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Tarih bilgisi yok';
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffMin < 60) return `${Math.max(1, diffMin)} dakika önce`;
    if (diffH < 24) return `${diffH} saat önce`;
    if (diffD < 7) return `${diffD} gün önce`;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getDurumRenk = (durum: string) =>
    durumDegerleri.find((d) => d.id === durum)?.renk || '#64748b';
  const getDurumAdi = (durum: string) =>
    durumDegerleri.find((d) => d.id === durum)?.adi || durum;

  const handleUpdateSikayet = (updated: Sikayet) => {
    setSikayetler((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const totalCount = sikayetler.length;
  const resolvedCount = sikayetler.filter(
    (s) => s.durum === 'cozuldu' || s.durum === 'resolved' || s.durum === 'tamamlandi'
  ).length;
  const activeCount = Math.max(0, totalCount - resolvedCount);

  if (!isAuthenticated) {
    return (
      <div className="complaints-main">
        <div className="complaints-main__container">
          <div className="complaints-main__empty">
            <div className="complaints-main__empty-icon-wrap">
              <FaFlag className="complaints-main__empty-icon" />
            </div>
            <h3>Giriş Yapmalısınız</h3>
            <p>Şikayetlerinizi ve destek taleplerinizi görüntülemek için hesabınıza giriş yapmalısınız.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="complaints-main">
      <div className="complaints-main__container">
        {/* Kurumsal Başlık Kartı */}
        <header className="complaints-main__header">
          <div className="complaints-main__header-info">
            <span className="complaints-main__badge-pill">
              <FaShieldAlt /> DESTEK &amp; ÇÖZÜM MERKEZİ
            </span>
            <div className="complaints-main__title">
              <div className="complaints-main__title-icon">
                <FaFlag className="complaints-main__flag-icon" />
              </div>
              <div className="complaints-main__title-text">
                <h1>Şikayetlerim &amp; Taleplerim</h1>
                <p className="complaints-main__subtitle">
                  Oluşturduğunuz ilan ve kullanıcı bildirimlerini, çözüm süreçlerini ve yanıtları buradan takip edebilirsiniz.
                </p>
              </div>
            </div>
          </div>

          <div className="complaints-main__header-cta">
            <button
              type="button"
              className="complaints-main__new-btn"
              onClick={() => router.push('/sikayet/yeni')}
            >
              <FaPlus />
              <span>Yeni Şikayet Oluştur</span>
            </button>
          </div>
        </header>

        {/* Özet İstatistik Bento Şeridi */}
        <section className="complaints-main__stats" aria-label="Şikayet İstatistikleri">
          <div className="complaints-main__stat-card complaints-main__stat-card--navy">
            <div className="complaints-main__stat-icon">
              <FaClipboardList />
            </div>
            <div className="complaints-main__stat-body">
              <span className="complaints-main__stat-value">{totalCount}</span>
              <span className="complaints-main__stat-label">Toplam Bildirim</span>
            </div>
          </div>

          <div className="complaints-main__stat-card complaints-main__stat-card--orange">
            <div className="complaints-main__stat-icon">
              <FaHourglassHalf />
            </div>
            <div className="complaints-main__stat-body">
              <span className="complaints-main__stat-value">{activeCount}</span>
              <span className="complaints-main__stat-label">İncelenen / Açık</span>
            </div>
          </div>

          <div className="complaints-main__stat-card complaints-main__stat-card--emerald">
            <div className="complaints-main__stat-icon">
              <FaCheckCircle />
            </div>
            <div className="complaints-main__stat-body">
              <span className="complaints-main__stat-value">{resolvedCount}</span>
              <span className="complaints-main__stat-label">Çözümlenen</span>
            </div>
          </div>
        </section>

        {/* Arama ve Filtreleme Araç Çubuğu */}
        <div className="complaints-main__toolbar">
          <div className="complaints-main__search">
            <FaSearch className="complaints-main__search-icon" />
            <input
              type="text"
              placeholder="Kategori, ilan veya kullanıcı adına göre ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="complaints-main__actions">
            <div className="complaints-main__filter">
              <FaFilter className="complaints-main__filter-icon" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Duruma göre filtrele"
              >
                <option value="all">Tüm Durumlar ({totalCount})</option>
                {durumDegerleri.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.adi}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Hata Durumu */}
        {error && (
          <div className="complaints-main__empty complaints-main__empty--error">
            <div className="complaints-main__empty-icon-wrap complaints-main__empty-icon-wrap--error">
              <FaExclamationTriangle className="complaints-main__empty-icon" />
            </div>
            <h3>Şikayetler Yüklenemedi</h3>
            <p>{error}</p>
            <button
              type="button"
              className="complaints-main__retry-btn"
              onClick={loadSikayetler}
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Yüklenme ve Liste Durumu */}
        {!error && (
          loading ? (
            <div className="complaints-main__loading">
              <div className="complaints-main__spinner-wrap">
                <FaSpinner className="complaints-main__spinner" />
              </div>
              <h3>Bildirimleriniz Yükleniyor</h3>
              <p>Lütfen bekleyin, kayıtlarınız güvenli bağlantı üzerinden getiriliyor...</p>
            </div>
          ) : (
            <div className="complaints-main__list">
              {filteredSikayetler.map((sikayet) => (
                <article
                  key={sikayet.id}
                  className={`complaints-main__item complaints-main__item--${sikayet.durum}`}
                  onClick={() => setSelectedSikayet(sikayet)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedSikayet(sikayet);
                    }
                  }}
                  title="Şikayet detayını ve destek mesajlarını görüntülemek için tıklayın"
                >
                  <div className="complaints-main__item-icon">
                    {sikayet.hedefTipi === 'ilan' ? <FaEye /> : <FaUserShield />}
                  </div>

                  <div className="complaints-main__item-content">
                    <div className="complaints-main__item-top">
                      <div className="complaints-main__item-title-group">
                        <div className="complaints-main__item-badges-row">
                          <span className="complaints-main__item-type-badge">
                            {sikayet.hedefTipi === 'ilan' ? 'İlan Bildirimi' : 'Kullanıcı Bildirimi'}
                          </span>
                          <span className="complaints-main__item-id-pill">#{sikayet.id}</span>
                        </div>
                        <h3 className="complaints-main__item-title">{sikayet.kategoriAdi}</h3>
                      </div>

                      <span
                        className="complaints-main__item-status"
                        style={{ backgroundColor: getDurumRenk(sikayet.durum) }}
                      >
                        {getDurumAdi(sikayet.durum)}
                      </span>
                    </div>

                    <p className="complaints-main__item-desc">
                      <strong>{sikayet.hedefTipi === 'ilan' ? 'İlgili İlan:' : 'İlgili Kullanıcı:'}</strong>{' '}
                      {sikayet.hedefAdi || sikayet.baslik}
                    </p>

                    {sikayet.aciklama && (
                      <p className="complaints-main__item-excerpt">{sikayet.aciklama}</p>
                    )}

                    <div className="complaints-main__item-footer">
                      <span className="complaints-main__item-date">
                        <FaRegClock /> {formatDate(sikayet.olusturmaTarihi)}
                      </span>

                      {sikayet.mesajSayisi > 0 ? (
                        <span className="complaints-main__item-messages has-messages">
                          <FaComments /> {sikayet.mesajSayisi} mesaj
                        </span>
                      ) : (
                        <span className="complaints-main__item-messages">
                          Mesaj yok
                        </span>
                      )}

                      <span className="complaints-main__item-hint">
                        Detay &amp; Mesajlar <FaArrowRight />
                      </span>
                    </div>
                  </div>
                </article>
              ))}

              {filteredSikayetler.length === 0 && (
                <div className="complaints-main__empty">
                  <div className="complaints-main__empty-icon-wrap">
                    <FaInbox className="complaints-main__empty-icon" />
                  </div>
                  <h3>Şikayet veya Talep Bulunamadı</h3>
                  <p>
                    {searchTerm || filterType !== 'all'
                      ? 'Aradığınız kriterlere veya seçtiğiniz filtreye uygun bir bildirim kaydı bulunamadı.'
                      : 'Henüz oluşturulmuş bir şikayet veya destek talebiniz bulunmuyor. Güvenliğiniz için şüpheli ilan veya kullanıcıları bize bildirebilirsiniz.'}
                  </p>
                  <button
                    type="button"
                    className="complaints-main__new-btn"
                    onClick={() => router.push('/sikayet/yeni')}
                  >
                    <FaPlus />
                    <span>İlk Şikayetinizi Oluşturun</span>
                  </button>
                </div>
              )}
            </div>
          )
        )}

        {/* ── ŞİKAYET DETAY & MESAJLAŞMA MODALI ── */}
        <ComplaintDetailModal
          isOpen={Boolean(selectedSikayet)}
          sikayetSummary={selectedSikayet}
          authToken={authToken ?? null}
          currentUserId={currentUserId as string | number | undefined}
          durumDegerleri={durumDegerleri}
          onClose={() => setSelectedSikayet(null)}
          onUpdateSikayet={handleUpdateSikayet}
        />
      </div>
    </div>
  );
};

export default Complaints;
