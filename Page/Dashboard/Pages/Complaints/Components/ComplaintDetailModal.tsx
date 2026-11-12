"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FaTimes,
  FaComments,
  FaPaperPlane,
  FaSpinner,
  FaUserShield,
  FaRegClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaFileAlt,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { sikayetService, type Sikayet, type DurumDegeri } from "@/services/sikayet";
import "./ComplaintDetailModal.css";

interface ComplaintDetailModalProps {
  isOpen: boolean;
  sikayetSummary: Sikayet | null;
  authToken: string | null;
  currentUserId?: string | number;
  durumDegerleri: DurumDegeri[];
  onClose: () => void;
  onUpdateSikayet?: (updated: Sikayet) => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  isOpen,
  sikayetSummary,
  authToken,
  currentUserId,
  durumDegerleri,
  onClose,
  onUpdateSikayet,
}) => {
  const [detail, setDetail] = useState<Sikayet | null>(sikayetSummary);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !sikayetSummary || !authToken) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setDetail(sikayetSummary);

    // Canlı olarak tüm mesajları ve detayları çek
    sikayetService
      .getSikayetById(sikayetSummary.id, authToken)
      .then((fullData) => {
        if (isMounted) {
          setDetail(fullData);
          if (onUpdateSikayet) onUpdateSikayet(fullData);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Şikayet detayı çekilemedi:", err);
          setError("Mesajlar yüklenirken bir hata oluştu.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, sikayetSummary?.id, authToken]);

  // Yeni mesaj geldiğinde en alta kaydır
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [detail?.mesajlar, loading]);

  if (!isOpen || !sikayetSummary) return null;

  const currentSikayet = detail || sikayetSummary;

  const getDurumRenk = (durum: string) =>
    durumDegerleri.find((d) => d.id === durum)?.renk || "#7f8c8d";
  const getDurumAdi = (durum: string) =>
    durumDegerleri.find((d) => d.id === durum)?.adi || durum;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Tarih yok";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !authToken || sendingMessage) return;

    setSendingMessage(true);
    setError(null);
    try {
      const updated = await sikayetService.addMessage(
        currentSikayet.id,
        newMessage.trim(),
        authToken
      );
      setDetail(updated);
      if (onUpdateSikayet) onUpdateSikayet(updated);
      setNewMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mesaj gönderilemedi");
    } finally {
      setSendingMessage(false);
    }
  };

  const isResolvedOrClosed =
    currentSikayet.durum === "resolved" ||
    currentSikayet.durum === "cozuldu" ||
    currentSikayet.durum === "dismissed" ||
    currentSikayet.durum === "kapatildi";

  return (
    <div className="cdm-overlay" role="dialog" aria-modal="true">
      <div className="cdm-backdrop" onClick={onClose} />
      <div className="cdm-dialog">
        {/* ── ÜST BAŞLIK BÖLÜMÜ ── */}
        <div className="cdm-header">
          <div className="cdm-header-left">
            <span
              className="cdm-status-pill"
              style={{ backgroundColor: getDurumRenk(currentSikayet.durum) }}
            >
              <FaCheckCircle className="cdm-status-icon" />
              <span>{getDurumAdi(currentSikayet.durum)}</span>
            </span>
            <span className="cdm-id-badge">Takip No: #{currentSikayet.id}</span>
            <h2 className="cdm-title">
              {currentSikayet.kategoriAdi || currentSikayet.baslik}
            </h2>
          </div>
          <button
            type="button"
            className="cdm-close-btn"
            onClick={onClose}
            aria-label="Kapat"
          >
            <FaTimes />
          </button>
        </div>

        {/* ── İÇERİK: DETAYLAR & MESAJLAŞMA ── */}
        <div className="cdm-body">
          {/* Şikayet Özeti Kutusu */}
          <div className="cdm-summary-card">
            <div className="cdm-summary-row">
              <span className="cdm-summary-label">
                {currentSikayet.hedefTipi === "ilan" ? "İlgili İlan" : "İlgili Kullanıcı"}:
              </span>
              <span className="cdm-summary-val font-semibold">
                {currentSikayet.hedefAdi || currentSikayet.baslik}
              </span>
            </div>

            <div className="cdm-summary-row">
              <span className="cdm-summary-label">Oluşturulma Tarihi:</span>
              <span className="cdm-summary-val">
                <FaRegClock className="inline mr-1 text-slate-400" />
                {formatDate(currentSikayet.olusturmaTarihi)}
              </span>
            </div>

            {currentSikayet.aciklama && (
              <div className="cdm-summary-desc-box">
                <span className="cdm-summary-label block mb-1">Şikayet Açıklamanız:</span>
                <p className="cdm-summary-desc">{currentSikayet.aciklama}</p>
              </div>
            )}

            {/* Kanıt Dosyaları */}
            {currentSikayet.kanitDosyalari && currentSikayet.kanitDosyalari.length > 0 && (
              <div className="cdm-evidence-strip">
                <span className="cdm-summary-label">Eklenen Kanıtlar:</span>
                <div className="cdm-evidence-list">
                  {currentSikayet.kanitDosyalari.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cdm-evidence-link"
                    >
                      <FaFileAlt /> Kanıt #{i + 1}
                      <FaExternalLinkAlt className="text-xs ml-1" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── MESAJLAŞMA & DESTEK YANITLARI BÖLÜMÜ ── */}
          <div className="cdm-chat-section">
            <div className="cdm-chat-title-row">
              <div className="flex items-center gap-2">
                <FaComments className="text-orange-500 text-lg" />
                <h3 className="cdm-chat-title">Destek Ekibi &amp; Mesaj Geçmişi</h3>
              </div>
              <span className="cdm-msg-count-tag">
                {currentSikayet.mesajlar?.length || 0} Mesaj
              </span>
            </div>

            {error && <div className="cdm-error-alert">{error}</div>}

            <div className="cdm-messages-container">
              {loading && (!currentSikayet.mesajlar || currentSikayet.mesajlar.length === 0) ? (
                <div className="cdm-loading-box">
                  <FaSpinner className="cdm-spinner" />
                  <p>Mesajlar yükleniyor…</p>
                </div>
              ) : !currentSikayet.mesajlar || currentSikayet.mesajlar.length === 0 ? (
                <div className="cdm-empty-messages">
                  <FaComments className="cdm-empty-icon" />
                  <h4>Henüz Mesaj Yok</h4>
                  <p>
                    Destek ekibimiz talebinizi incelediğinde burada yanıtlarını ve bildirimleri görebilirsiniz.
                  </p>
                </div>
              ) : (
                currentSikayet.mesajlar.map((m) => {
                  const isMine =
                    currentUserId != null &&
                    String(m.gonderenId) === String(currentUserId);
                  const isSupport = !isMine;

                  return (
                    <div
                      key={m.id}
                      className={`cdm-message-bubble ${
                        isSupport ? "cdm-message-bubble--support" : "cdm-message-bubble--mine"
                      }`}
                    >
                      <div className="cdm-message-meta">
                        <span className="cdm-sender-badge">
                          {isSupport ? (
                            <>
                              <FaUserShield className="inline text-emerald-600 mr-1" />
                              Acillazım Destek Ekibi
                            </>
                          ) : (
                            "Siz"
                          )}
                        </span>
                        <span className="cdm-message-time">
                          {formatDate(m.olusturmaTarihi)}
                        </span>
                      </div>
                      <div className="cdm-message-text">{m.icerik}</div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Çözüldü Bilgilendirmesi */}
            {isResolvedOrClosed && (
              <div className="cdm-resolved-notice">
                <FaCheckCircle className="text-emerald-500 text-base flex-shrink-0" />
                <span>
                  Bu talep destek ekibimiz tarafından <strong>çözümlendi</strong> olarak sonuçlandırılmıştır.
                  Ek bir sorunuz olursa aşağıdan yanıt yazabilirsiniz.
                </span>
              </div>
            )}

            {/* Yanıt Gönderme Formu */}
            <form onSubmit={handleSendMessage} className="cdm-reply-form">
              <textarea
                className="cdm-reply-textarea"
                rows={2}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Destek ekibine yanıt yazın..."
                disabled={sendingMessage}
              />
              <button
                type="submit"
                className="cdm-send-btn"
                disabled={!newMessage.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <FaSpinner className="cdm-spinner" />
                ) : (
                  <>
                    <FaPaperPlane />
                    <span>Gönder</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetailModal;

