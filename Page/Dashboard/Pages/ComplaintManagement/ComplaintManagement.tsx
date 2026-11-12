"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaFlag, FaSearch, FaFilter, FaRegClock, FaEye, FaUserShield, FaSpinner, FaInbox, FaComments, FaPaperPlane, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { sikayetService, Sikayet, DurumDegeri } from '@/services/sikayet';
import './ComplaintManagement.css';

const isAdminUser = (user: unknown): boolean => {
  if (!user || typeof user !== 'object') return false;
  const roles = (user as { roles?: unknown }).roles;
  if (!Array.isArray(roles)) return false;
  return roles.some((r) => String(r).toUpperCase().includes('ADMIN'));
};

const ComplaintManagement: React.FC = () => {
  const { authToken, currentUser } = useAuth();
  const admin = isAdminUser(currentUser);

  const [sikayetler, setSikayetler] = useState<Sikayet[]>([]);
  const [durumDegerleri, setDurumDegerleri] = useState<DurumDegeri[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSikayet, setSelectedSikayet] = useState<Sikayet | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [durumGuncelleniyor, setDurumGuncelleniyor] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSikayetler = useCallback(async () => {
    if (!authToken || !admin) return;
    try {
      setLoading(true);
      setError(null);
      const [liste, durumlar] = await Promise.all([
        sikayetService.getTumSikayetler(authToken),
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
  }, [authToken, admin]);

  useEffect(() => { loadSikayetler(); }, [loadSikayetler]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedSikayet?.mesajlar]);

  const filteredSikayetler = sikayetler.filter((s) => {
    const matchesSearch = s.hedefAdi?.toLowerCase().includes(searchTerm.toLowerCase()) || s.kategoriAdi?.toLowerCase().includes(searchTerm.toLowerCase());
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
    if (diffMin < 60) return `${diffMin} dakika önce`;
    if (diffH < 24) return `${diffH} saat önce`;
    if (diffD < 7) return `${diffD} gün önce`;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getDurumRenk = (durum: string) => durumDegerleri.find(d => d.id === durum)?.renk || '#7f8c8d';
  const getDurumAdi = (durum: string) => durumDegerleri.find(d => d.id === durum)?.adi || durum;

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedSikayet || !authToken || sendingMessage) return;
    setSendingMessage(true);
    try {
      const updated = await sikayetService.addMessage(selectedSikayet.id, newMessage, authToken);
      setSikayetler(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSelectedSikayet(updated);
      setNewMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mesaj gönderilemedi');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDurumDegistir = async (sikayetId: string, yeniDurum: string) => {
    if (!authToken || durumGuncelleniyor) return;
    setDurumGuncelleniyor(true);
    try {
      const updated = await sikayetService.updateSikayet(sikayetId, { durum: yeniDurum }, authToken);
      setSikayetler(prev => prev.map(s => s.id === sikayetId ? updated : s));
      if (selectedSikayet?.id === sikayetId) {
        setSelectedSikayet(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Durum güncellenemedi');
    } finally {
      setDurumGuncelleniyor(false);
    }
  };

  const istatistikler = {
    toplam: sikayetler.length,
    acik: sikayetler.filter(s => s.durum === 'pending' || s.durum === 'reviewing').length,
    inceleniyor: sikayetler.filter(s => s.durum === 'reviewing').length,
    beklemede: sikayetler.filter(s => s.durum === 'pending').length,
    cozuldu: sikayetler.filter(s => s.durum === 'resolved').length,
  };

  if (!authToken) {
    return (
      <div className="cm-main">
        <div className="cm-main__empty">
          <FaFlag className="cm-main__empty-icon" />
          <h3>Giriş Yapmalısınız</h3>
          <p>Şikayetleri yönetmek için giriş yapmalısınız.</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="cm-main">
        <div className="cm-main__empty">
          <FaFlag className="cm-main__empty-icon" />
          <h3>Yetki Hatası</h3>
          <p>Şikayetleri yönetmek için admin yetkisine sahip olmalısınız.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cm-main">
      <div className="cm-main__header">
        <div className="cm-main__title">
          <div className="cm-main__title-icon">
            <FaFlag className="cm-main__flag-icon" />
          </div>
          <h1>Şikayet Yönetimi</h1>
        </div>
        <div className="cm-main__actions">
          <div className="cm-main__search">
            <FaSearch className="cm-main__search-icon" />
            <input type="text" placeholder="Şikayetlerde ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="cm-main__filter">
            <FaFilter className="cm-main__filter-icon" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">Tüm Şikayetler</option>
              {durumDegerleri.map((d) => (
                <option key={d.id} value={d.id}>{d.adi}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="cm-main__empty">
          <FaExclamationTriangle className="cm-main__empty-icon" />
          <h3>Şikayetler Yüklenemedi</h3>
          <p>{error}</p>
        </div>
      )}

      {!error && (
        <>
          <div className="cm-main__istatistikler">
            <div className="cm-main__ist-item">
              <span className="cm-main__ist-sayi">{istatistikler.toplam}</span>
              <span className="cm-main__ist-etiket">Toplam</span>
            </div>
            <div className="cm-main__ist-item cm-main__ist-item--acik">
              <span className="cm-main__ist-sayi">{istatistikler.acik}</span>
              <span className="cm-main__ist-etiket">Açık</span>
            </div>
            <div className="cm-main__ist-item cm-main__ist-item--inceleniyor">
              <span className="cm-main__ist-sayi">{istatistikler.inceleniyor}</span>
              <span className="cm-main__ist-etiket">İnceleniyor</span>
            </div>
            <div className="cm-main__ist-item cm-main__ist-item--beklemede">
              <span className="cm-main__ist-sayi">{istatistikler.beklemede}</span>
              <span className="cm-main__ist-etiket">Beklemede</span>
            </div>
            <div className="cm-main__ist-item cm-main__ist-item--cozuldu">
              <span className="cm-main__ist-sayi">{istatistikler.cozuldu}</span>
              <span className="cm-main__ist-etiket">Çözüldü</span>
            </div>
          </div>

          <div className="cm-main__content">
            <div className="cm-main__list-section">
              {loading ? (
                <div className="cm-main__loading">
                  <FaSpinner className="cm-main__spinner" />
                  <p>Şikayetler yükleniyor...</p>
                </div>
              ) : (
                <div className="cm-main__list">
                  {filteredSikayetler.map((sikayet) => (
                    <div
                      key={sikayet.id}
                      className={`cm-main__item ${selectedSikayet?.id === sikayet.id ? 'cm-main__item--selected' : ''}`}
                      onClick={() => setSelectedSikayet(sikayet)}
                    >
                      <div className="cm-main__item-icon">
                        {sikayet.hedefTipi === 'ilan' ? <FaEye /> : <FaUserShield />}
                      </div>
                      <div className="cm-main__item-content">
                        <h3 className="cm-main__item-title">{sikayet.kategoriAdi}</h3>
                        <p className="cm-main__item-desc">
                          {sikayet.hedefTipi === 'ilan' ? 'İlan' : 'Kullanıcı'}: {sikayet.hedefAdi || sikayet.baslik}
                        </p>
                        <div className="cm-main__item-footer">
                          <span className="cm-main__item-date">
                            <FaRegClock /> {formatDate(sikayet.olusturmaTarihi)}
                          </span>
                          <span className="cm-main__item-status" style={{ background: getDurumRenk(sikayet.durum) }}>
                            {getDurumAdi(sikayet.durum)}
                          </span>
                          {sikayet.mesajSayisi > 0 && (
                            <span className="cm-main__item-messages">
                              <FaComments /> {sikayet.mesajSayisi}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredSikayetler.length === 0 && (
                    <div className="cm-main__empty">
                      <FaInbox className="cm-main__empty-icon" />
                      <h3>Şikayet Bulunamadı</h3>
                      <p>Henüz bir şikayet yok veya aradığınız kriterlere uygun şikayet bulunamadı.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedSikayet && (
              <div className="cm-main__detail-section">
                <div className="cm-main__detail-header">
                  <div className="cm-main__detail-title">
                    <h2>{selectedSikayet.kategoriAdi}</h2>
                    <span className="cm-main__detail-id">#{selectedSikayet.id}</span>
                  </div>
                  <div className="cm-main__detail-actions">
                    <select
                      value={selectedSikayet.durum}
                      onChange={(e) => handleDurumDegistir(selectedSikayet.id, e.target.value)}
                      disabled={durumGuncelleniyor}
                      className="cm-main__durum-select"
                    >
                      {durumDegerleri.map(d => (
                        <option key={d.id} value={d.id}>{d.adi}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="cm-main__detail-info">
                  <div className="cm-main__info-item">
                    <span className="cm-main__info-label">Tür:</span>
                    <span className="cm-main__info-value">{selectedSikayet.hedefTipi === 'ilan' ? 'İlan Şikayeti' : 'Kullanıcı Şikayeti'}</span>
                  </div>
                  <div className="cm-main__info-item">
                    <span className="cm-main__info-label">Hedef:</span>
                    <span className="cm-main__info-value">{selectedSikayet.hedefAdi || '-'}</span>
                  </div>
                  <div className="cm-main__info-item">
                    <span className="cm-main__info-label">Tarih:</span>
                    <span className="cm-main__info-value">{formatDate(selectedSikayet.olusturmaTarihi)}</span>
                  </div>
                </div>

                <div className="cm-main__detail-fields">
                  <h3>Detaylar</h3>
                  <div className="cm-main__field-item">
                    <span className="cm-main__field-label">Başlık</span>
                    <span className="cm-main__field-value">{selectedSikayet.baslik}</span>
                  </div>
                  <div className="cm-main__field-item">
                    <span className="cm-main__field-label">Açıklama</span>
                    <span className="cm-main__field-value">{selectedSikayet.aciklama || '-'}</span>
                  </div>
                </div>

                <div className="cm-main__messages-section">
                  <h3><FaComments /> Mesajlaşma</h3>
                  <div className="cm-main__messages-list">
                    {selectedSikayet.mesajlar?.length === 0 ? (
                      <div className="cm-main__messages-empty">
                        <FaComments />
                        <p>Henüz mesaj yok. Admin olarak ilk mesajı siz gönderebilirsiniz.</p>
                      </div>
                    ) : (
                      selectedSikayet.mesajlar?.map((mesaj) => {
                        const gonderenTipi = mesaj.gonderenId === selectedSikayet.sikayetEdenId ? 'kullanici' : 'admin';
                        return (
                          <div key={mesaj.id} className={`cm-main__message cm-main__message--${gonderenTipi}`}>
                            <div className="cm-main__message-header">
                              <span className="cm-main__message-sender">
                                {gonderenTipi === 'admin' ? 'Admin' : 'Şikayet Eden'}
                              </span>
                              <span className="cm-main__message-date">{formatDate(mesaj.olusturmaTarihi)}</span>
                            </div>
                            <p className="cm-main__message-content">{mesaj.icerik}</p>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="cm-main__message-input">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Mesajınızı yazın..."
                      rows={2}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="cm-main__send-btn"
                    >
                      {sendingMessage ? <FaSpinner /> : <FaPaperPlane />} Gönder
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ComplaintManagement;
