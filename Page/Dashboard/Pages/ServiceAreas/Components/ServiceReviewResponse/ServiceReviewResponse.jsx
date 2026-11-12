import React, { useState, useEffect, useRef } from 'react';
import {
  FaStar,
  FaEdit,
  FaSave,
  FaReply,
  FaTrash,
  FaChevronDown,
  FaRobot,
  FaTimes,
  FaUserAlt,
  FaCheckCircle,
  FaClock,
} from 'react-icons/fa';
import { dashboardReviewsAPI } from '@/services/reviews/dashboardReviewsService';
import { maskUserName } from '@/services/userService';
import './ServiceReviewResponse.css';
import ServiceReviewResponseModal from './ServiceReviewResponseModal';

/**
 * Yorum içeriğinde (Türkçe) geçen hizmet konusu anahtar kelimelerine göre yanıta
 * eklenecek bağlama uygun bir cümle seçer.
 */
const TOPIC_CLAUSES = [
  { keywords: ['temizlik', 'temiz'], positive: 'Evinizin/işyerinizin temizliğinde gösterdiğimiz titizliği fark etmeniz bizi çok mutlu etti.', neutral: 'Temizlik hizmetimizle ilgili belirttiğiniz noktaları önemsiyoruz.', negative: 'Temizlik hizmetimizde beklentinizi karşılayamamış olmamız için özür dileriz.' },
  { keywords: ['boya', 'badana'], positive: 'Boya ve badana işçiliğimizi beğenmeniz bizi gururlandırdı.', neutral: 'Boya/badana işimizle ilgili geri bildiriminizi değerlendireceğiz.', negative: 'Boya/badana işçiliğimizde yaşadığınız sorun için özür dileriz.' },
  { keywords: ['tesisat', 'musluk', 'boru', 'su kaça'], positive: 'Tesisat sorununuzu hızlıca ve kalıcı şekilde çözebilmiş olmamız bizi mutlu etti.', neutral: 'Tesisat hizmetimizle ilgili yorumunuzu dikkate alıyoruz.', negative: 'Tesisat sorununuzu beklediğiniz şekilde çözemediğimiz için özür dileriz.' },
  { keywords: ['elektrik', 'sigorta', 'priz'], positive: 'Elektrik arızanızı güvenle ve hızlıca çözmüş olmamız önceliğimizdi.', neutral: 'Elektrik hizmetimizle ilgili notunuzu ekibimizle paylaşacağız.', negative: 'Elektrik hizmetimizde yaşadığınız aksaklık için özür dileriz.' },
  { keywords: ['nakliye', 'taşı', 'eşya'], positive: 'Eşyalarınızı kendi eşyalarımız gibi özenle taşımış olmamız bizim için önemliydi.', neutral: 'Nakliye sürecine dair yorumunuzu değerlendirmeye alıyoruz.', negative: 'Nakliye sürecinde yaşattığımız sıkıntı için özür dileriz.' },
  { keywords: ['tadilat', 'yenileme', 'renovasyon'], positive: 'Tadilat projenizde hayalinizdeki sonucu yaratabilmiş olmamız bizi mutlu etti.', neutral: 'Tadilat projeniz hakkındaki geri bildiriminizi dikkate alacağız.', negative: 'Tadilat projenizde beklentinizi karşılayamadığımız için özür dileriz.' },
  { keywords: ['klima', 'kombi'], positive: 'Cihazınızın bakımını özenle yapmış olmamız bizim için önemliydi.', neutral: 'Klima/kombi hizmetimizle ilgili yorumunuzu değerlendireceğiz.', negative: 'Klima/kombi hizmetimizde yaşadığınız sorun için özür dileriz.' },
  { keywords: ['mobilya', 'montaj'], positive: 'Mobilya montajınızı sorunsuz tamamlamış olmamız güzel bir haber.', neutral: 'Montaj hizmetimizle ilgili notunuzu değerlendireceğiz.', negative: 'Montaj sürecinde yaşadığınız sorun için özür dileriz.' },
  { keywords: ['bahçe', 'bahce', 'peyzaj'], positive: 'Bahçe düzenlemenizden memnun kalmanız bizi gururlandırdı.', neutral: 'Bahçe düzenleme hizmetimizle ilgili yorumunuzu değerlendireceğiz.', negative: 'Bahçe düzenleme hizmetimizde beklentinizi karşılayamadığımız için özür dileriz.' },
  { keywords: ['kilit', 'çilingir', 'cilingir'], positive: 'Güvenliğinizi sağlamış olmamız bizim için en önemli önceliktir.', neutral: 'Çilingir hizmetimizle ilgili notunuzu değerlendireceğiz.', negative: 'Çilingir hizmetimizde yaşattığımız sıkıntı için özür dileriz.' },
  { keywords: ['acil'], positive: 'Acil durumunuzda hızlıca yanınızda olabilmiş olmamız bizim için değerli.', neutral: 'Acil talebinizle ilgili sürecimizi geliştirmeye devam edeceğiz.', negative: 'Acil talebinize beklediğiniz hızda yanıt verememiş olmamız için özür dileriz.' },
  { keywords: ['tamir', 'arıza', 'ariza', 'bozul'], positive: 'Sorununuzu kalıcı şekilde çözmüş olmamız bizi mutlu etti.', neutral: 'Tamir sürecine dair yorumunuzu değerlendiriyoruz.', negative: 'Tamir sürecinde yaşadığınız sorun için özür dileriz.' },
  { keywords: ['fiyat', 'ücret', 'pahalı', 'ucuz'], positive: 'Fiyat-performans dengesini beğenmiş olmanız bizi mutlu etti.', neutral: 'Fiyatlandırmamızla ilgili görüşünüzü not aldık.', negative: 'Fiyatlandırmamızla ilgili yaşadığınız memnuniyetsizlik için özür dileriz.' },
  { keywords: ['zaman', 'gecik', 'geç kal'], positive: 'İşi söz verdiğimiz sürede teslim etmiş olmamız bizim için bir ilke.', neutral: 'Zamanlama ile ilgili geri bildiriminizi değerlendireceğiz.', negative: 'Zamanında ulaşamamış olmamız için özür dileriz, bu konuda gerekli iyileştirmeleri yapacağız.' },
];

function detectTopicClause(comment, tier) {
  const text = String(comment || '').toLowerCase();
  const match = TOPIC_CLAUSES.find((t) => t.keywords.some((k) => text.includes(k)));
  return match ? match[tier] : null;
}

function generateSmartReviewResponse(review) {
  const rating = Number(review?.rating) || 0;
  const tier = rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative';

  const openers = {
    positive: [
      'Değerli yorumunuz için çok teşekkür ederiz!',
      'Bizi tercih ettiğiniz ve deneyiminizi paylaştığınız için teşekkür ederiz!',
      'Yorumunuzla bizi çok mutlu ettiniz, teşekkürler!',
    ],
    neutral: [
      'Yorumunuz ve geri bildiriminiz için teşekkür ederiz.',
      'Deneyiminizi bizimle paylaştığınız için teşekkürler.',
    ],
    negative: [
      'Deneyiminizin beklentilerinizi karşılamamış olmasından dolayı üzgünüz.',
      'Yaşadığınız olumsuz deneyim için içtenlikle özür dileriz.',
    ],
  };

  const genericClauses = {
    positive: 'Kaliteli hizmet sunma anlayışımızın karşılığını almak bizi mutlu ediyor.',
    neutral: 'Belirttiğiniz noktaları dikkatle değerlendirip hizmet kalitemizi geliştirmeye devam edeceğiz.',
    negative: 'Belirttiğiniz sorunu ciddiye alıyor ve ekibimizle birlikte üzerinde çalışıyoruz.',
  };

  const closers = {
    positive: [
      'Tekrar hizmet vermek için sabırsızlanıyoruz! 😊',
      'Her zaman yanınızdayız, tekrar görüşmek dileğiyle!',
      'Yeni ihtiyaçlarınızda da yanınızda olmaktan mutluluk duyarız!',
    ],
    neutral: [
      'Bir dahaki hizmetinizde daha iyisini sunmak için elimizden geleni yapacağız.',
      'Görüşlerinizi hizmet kalitemizi geliştirme çalışmalarımızda dikkate alacağız.',
    ],
    negative: [
      'Bu durumu düzeltmek için sizinle iletişime geçmek isteriz; bize ulaşabilirseniz memnuniyetle ilgileniriz.',
      'Memnuniyetinizi sağlamak için elimizden geleni yapmaya hazırız, bizimle iletişime geçebilirsiniz.',
    ],
  };

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const topicClause = detectTopicClause(review?.comment, tier);
  const middle = topicClause || genericClauses[tier];

  return `${pick(openers[tier])} ${middle} ${pick(closers[tier])}`;
}

function normalizeReviewItem(r, idx = 0) {
  if (!r || typeof r !== 'object') {
    return {
      id: idx,
      user: 'Müşteri',
      rating: 5,
      date: '',
      comment: '',
      response: null,
    };
  }
  const rawUser =
    r.user ||
    r.customerName ||
    r.user_name ||
    r.userName ||
    r.reviewerName ||
    r.reviewer_name ||
    'Müşteri';
  const rawDate =
    r.date ||
    r.serviceDate ||
    (typeof r.createdAt === 'string' ? r.createdAt.split('T')[0] : '') ||
    '';
  const rawResponse =
    r.response ?? r.reply ?? r.seller_response ?? r.providerResponse ?? null;

  return {
    ...r,
    id: r.id ?? r.comment_id ?? idx,
    user: String(rawUser).trim() || 'Müşteri',
    rating: Number(r.rating) || 5,
    date: String(rawDate).trim(),
    comment: String(r.comment ?? r.comment_text ?? r.content ?? '').trim(),
    response:
      rawResponse != null && String(rawResponse).trim() !== ''
        ? String(rawResponse).trim()
        : null,
  };
}

function formatMaskedName(user) {
  const str = String(user || '').trim();
  if (!str) return 'Müşteri';
  if (str.includes('*')) return str;
  try {
    return maskUserName(str) || str;
  } catch {
    return str;
  }
}

const ServiceReviewResponse = ({ reviews, onUpdate, serviceId = 1, ownerModalEmbed = false }) => {
  const [selectedReview, setSelectedReview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [response, setResponse] = useState('');
  const [isGeneratingAIResponse, setIsGeneratingAIResponse] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [serviceReviews, setServiceReviews] = useState(() =>
    Array.isArray(reviews) ? reviews.map((r, i) => normalizeReviewItem(r, i)) : []
  );
  const loadMoreRef = useRef(null);

  const [visibleReviews, setVisibleReviews] = useState([]);
  const [page, setPage] = useState(1);
  const initialItemCount = 8;
  const pageSize = 8;

  useEffect(() => {
    if (Array.isArray(reviews) && reviews.length > 0) {
      setServiceReviews(reviews.map((r, i) => normalizeReviewItem(r, i)));
    } else {
      loadReviews();
    }
  }, [reviews]);

  useEffect(() => {
    if (!reviews || reviews.length === 0) {
      loadReviews();
    }
  }, [serviceId]);

  useEffect(() => {
    if (serviceReviews && serviceReviews.length > 0) {
      setVisibleReviews(serviceReviews.slice(0, initialItemCount + (page - 1) * pageSize));
    } else {
      setVisibleReviews([]);
    }
  }, [serviceReviews, page]);

  const loadMoreReviews = () => {
    const nextPage = page + 1;
    const startIndex = initialItemCount + (page - 1) * pageSize;
    if (startIndex < serviceReviews.length) {
      setPage(nextPage);
      setTimeout(() => {
        if (loadMoreRef.current) {
          loadMoreRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const loadReviews = async () => {
    try {
      let reviewsData = [];
      if (serviceId != null) {
        try {
          reviewsData = await dashboardReviewsAPI.getIlanReviews(serviceId);
        } catch {
          reviewsData = [];
        }
      }
      if (!Array.isArray(reviewsData) || reviewsData.length === 0) {
        reviewsData = await dashboardReviewsAPI.getAllReviews();
      }
      const normalized = Array.isArray(reviewsData)
        ? reviewsData.map((r, i) => normalizeReviewItem(r, i))
        : [];
      setServiceReviews(normalized);
      setPage(1);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const startEditingReview = (review, e) => {
    if (e) e.stopPropagation();
    setSelectedReview(review);
    setResponse(review.response || '');
    if (ownerModalEmbed) {
      setInlineEditingId(review.id);
      setIsEditing(true);
    } else {
      setIsEditing(true);
    }
  };

  const handleReviewCardClick = (review) => {
    if (ownerModalEmbed) {
      if (inlineEditingId === review.id) return;
      startEditingReview(review);
      return;
    }
    setSelectedReview(review);
    setResponse(review.response || '');
    setIsEditing(true);
  };

  const closeModal = () => {
    setSelectedReview(null);
    setInlineEditingId(null);
    setIsEditing(false);
    setResponse('');
  };

  const handleSaveResponseForReview = async (targetReview) => {
    const activeReview = targetReview || selectedReview;
    if (!activeReview) return;
    const trimmedResponse = String(response || '').trim();
    if (!trimmedResponse) return;

    setIsSaving(true);
    try {
      await dashboardReviewsAPI.respondToReview(serviceId, activeReview.id, trimmedResponse);

      const updatedReviews = serviceReviews.map((r) =>
        r.id === activeReview.id ? { ...r, response: trimmedResponse } : r
      );

      setServiceReviews(updatedReviews);
      if (onUpdate) {
        onUpdate(updatedReviews);
      }

      setIsEditing(false);
      setInlineEditingId(null);
      setSelectedReview((prev) => (prev ? { ...prev, response: trimmedResponse } : null));
    } catch (error) {
      console.error('Yanıt kaydedilirken hata oluştu:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResponseForReview = async (targetReview, e) => {
    if (e) e.stopPropagation();
    const activeReview = targetReview || selectedReview;
    if (!activeReview) return;

    try {
      await dashboardReviewsAPI.deleteReviewResponse(serviceId, activeReview.id);

      const updatedReviews = serviceReviews.map((r) =>
        r.id === activeReview.id ? { ...r, response: null } : r
      );

      setServiceReviews(updatedReviews);
      if (onUpdate) {
        onUpdate(updatedReviews);
      }

      if (inlineEditingId === activeReview.id) {
        setInlineEditingId(null);
      }
      setIsEditing(false);
      setResponse('');
      setSelectedReview((prev) => (prev && prev.id === activeReview.id ? { ...prev, response: null } : prev));
    } catch (error) {
      console.error('Yanıt silinirken hata oluştu:', error);
    }
  };

  const handleAIResponseGenerate = (targetReview) => {
    const activeReview = targetReview || selectedReview;
    if (!activeReview) return;
    setIsGeneratingAIResponse(true);
    setTimeout(() => {
      setResponse(generateSmartReviewResponse(activeReview));
      setIsGeneratingAIResponse(false);
    }, 450);
  };

  const renderEditorBox = (review, isModalContext = false) => (
    <div
      className="srr-editor-box"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="srr-editor-header">
        <span className="srr-editor-title">
          <FaReply size={12} />
          <span>{review.response ? 'Hizmet Sağlayıcı Yanıtını Düzenle' : 'Müşteri Yorumuna Yanıt Yaz'}</span>
        </span>
        <button
          type="button"
          className="srr-ai-suggest-btn"
          onClick={() => handleAIResponseGenerate(review)}
          disabled={isGeneratingAIResponse}
        >
          <FaRobot size={13} />
          <span>{isGeneratingAIResponse ? 'Oluşturuluyor…' : 'AI ile Yanıt Öner'}</span>
        </button>
      </div>

      <textarea
        className="srr-review-response-textarea"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Müşterinize kurumsal ve samimi bir teşekkür/açıklama yanıtı yazın..."
        rows={4}
        autoFocus
      />

      <div className="srr-editor-footer">
        <button
          type="button"
          className="srr-btn srr-btn--cancel"
          onClick={() => {
            if (isModalContext) {
              closeModal();
            } else {
              setInlineEditingId(null);
              setIsEditing(false);
              setResponse(review.response || '');
            }
          }}
        >
          <FaTimes size={12} />
          <span>Vazgeç</span>
        </button>

        <button
          type="button"
          className="srr-btn srr-btn--save"
          onClick={() => handleSaveResponseForReview(review)}
          disabled={isSaving || !String(response || '').trim()}
        >
          <FaSave size={13} />
          <span>{isSaving ? 'Kaydediliyor…' : 'Yanıtı Kaydet'}</span>
        </button>
      </div>
    </div>
  );

  const renderReviewModal = () => {
    if (ownerModalEmbed || !selectedReview) return null;

    return (
      <ServiceReviewResponseModal
        isOpen={!!selectedReview}
        onClose={closeModal}
        title={selectedReview.response ? 'Müşteri Yorumu ve Yanıtı Düzenle' : 'Müşteri Yorumuna Yanıt Yaz'}
      >
        <div className="srr-modal-review-card">
          <div className="srr-card-top">
            <div className="srr-user-block">
              <div className="srr-avatar-circle">
                <FaUserAlt size={14} />
              </div>
              <div className="srr-user-meta">
                <span className="srr-username">{formatMaskedName(selectedReview.user)}</span>
                {selectedReview.date ? (
                  <span className="srr-date">{selectedReview.date}</span>
                ) : null}
              </div>
            </div>
            <div className="srr-rating-pill">
              <div className="srr-stars">
                {[...Array(5)].map((_, index) => (
                  <FaStar
                    key={index}
                    className={index < selectedReview.rating ? 'star-filled' : 'star-empty'}
                  />
                ))}
              </div>
              <span className="srr-rating-num">{Number(selectedReview.rating || 5).toFixed(1)}</span>
            </div>
          </div>

          <div className="srr-comment-box">{selectedReview.comment}</div>
        </div>

        {isEditing ? (
          renderEditorBox(selectedReview, true)
        ) : (
          <div className="srr-modal-existing-reply">
            {selectedReview.response ? (
              <div className="srr-reply-box">
                <div className="srr-reply-box__header">
                  <span className="srr-reply-badge">
                    <FaReply size={11} />
                    <span>Hizmet Sağlayıcı Yanıtı</span>
                  </span>
                  <div className="srr-reply-actions">
                    <button
                      type="button"
                      className="srr-action-chip srr-action-chip--edit"
                      onClick={() => setIsEditing(true)}
                    >
                      <FaEdit size={12} />
                      <span>Düzenle</span>
                    </button>
                    <button
                      type="button"
                      className="srr-action-chip srr-action-chip--delete"
                      onClick={(e) => handleDeleteResponseForReview(selectedReview, e)}
                    >
                      <FaTrash size={11} />
                      <span>Sil</span>
                    </button>
                  </div>
                </div>
                <p className="srr-reply-box__text">{selectedReview.response}</p>
              </div>
            ) : (
              <div className="srr-empty-reply-bar">
                <button
                  type="button"
                  className="srr-btn srr-btn--save"
                  onClick={() => setIsEditing(true)}
                >
                  <FaReply size={13} />
                  <span>Yanıt Yaz</span>
                </button>
              </div>
            )}
          </div>
        )}
      </ServiceReviewResponseModal>
    );
  };

  const answeredCount = serviceReviews.filter((r) => Boolean(r.response)).length;

  return (
    <div className={`srr-service-reviews-response${ownerModalEmbed ? ' srr-service-reviews-response--owner-modal' : ''}`}>
      <div className="srr-toolbar">
        <div className="srr-toolbar__info">
          {!ownerModalEmbed && <h2 className="srr-toolbar__title">Müşteri Yorumları</h2>}
          <p className="srr-service-reviews-response__hint">
            Müşteri yorumlarını ve verdiğiniz yanıtları aşağıda görebilir, <strong>Yanıtı Düzenle</strong> veya <strong>Yanıt Yaz</strong> butonuyla anında güncelleyebilirsiniz.
          </p>
        </div>
        {serviceReviews.length > 0 && (
          <div className="srr-toolbar__stats">
            <span className="srr-stat-pill srr-stat-pill--total">
              Toplam: <strong>{serviceReviews.length}</strong>
            </span>
            <span className="srr-stat-pill srr-stat-pill--answered">
              <FaCheckCircle size={12} />
              <span>Yanıtlanan: <strong>{answeredCount}</strong></span>
            </span>
          </div>
        )}
      </div>

      {visibleReviews.length === 0 ? (
        <div className="srr-empty-state">
          <FaStar size={28} />
          <h4>Henüz Müşteri Yorumu Yok</h4>
          <p>Bu ilan için müşterileriniz değerlendirme bıraktığında burada listelenecek ve yanıtlayabileceksiniz.</p>
        </div>
      ) : (
        <div className="srr-service-reviews-response-grid">
          {visibleReviews.map((review) => {
            const isCardEditing = ownerModalEmbed && inlineEditingId === review.id;
            return (
              <div
                key={review.id}
                className={`srr-service-review-response-item ${review.response ? 'is-answered' : 'is-pending'} ${isCardEditing ? 'is-editing' : ''}`}
                onClick={() => handleReviewCardClick(review)}
              >
                <div className="srr-card-top">
                  <div className="srr-user-block">
                    <div className="srr-avatar-circle">
                      <FaUserAlt size={15} />
                    </div>
                    <div className="srr-user-meta">
                      <span className="srr-username">{formatMaskedName(review.user)}</span>
                      {review.date ? <span className="srr-date">{review.date}</span> : null}
                    </div>
                  </div>

                  <div className="srr-card-top-right">
                    <span
                      className={`srr-status-badge ${review.response ? 'srr-status-badge--answered' : 'srr-status-badge--pending'}`}
                    >
                      {review.response ? (
                        <>
                          <FaCheckCircle size={11} />
                          <span>Yanıtlandı</span>
                        </>
                      ) : (
                        <>
                          <FaClock size={11} />
                          <span>Yanıt Bekliyor</span>
                        </>
                      )}
                    </span>

                    <div className="srr-rating-pill">
                      <div className="srr-stars">
                        {[...Array(5)].map((_, index) => (
                          <FaStar
                            key={index}
                            className={index < review.rating ? 'star-filled' : 'star-empty'}
                          />
                        ))}
                      </div>
                      <span className="srr-rating-num">{Number(review.rating || 5).toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="srr-comment-box">{review.comment}</div>

                {isCardEditing ? (
                  renderEditorBox(review, false)
                ) : review.response ? (
                  <div className="srr-reply-box" onClick={(e) => e.stopPropagation()}>
                    <div className="srr-reply-box__header">
                      <span className="srr-reply-badge">
                        <FaReply size={11} />
                        <span>Hizmet Sağlayıcı Yanıtı</span>
                      </span>

                      <div className="srr-reply-actions">
                        <button
                          type="button"
                          className="srr-action-chip srr-action-chip--edit"
                          onClick={(e) => startEditingReview(review, e)}
                        >
                          <FaEdit size={12} />
                          <span>Yanıtı Düzenle</span>
                        </button>
                        <button
                          type="button"
                          className="srr-action-chip srr-action-chip--delete"
                          onClick={(e) => handleDeleteResponseForReview(review, e)}
                        >
                          <FaTrash size={11} />
                          <span>Sil</span>
                        </button>
                      </div>
                    </div>

                    <p className="srr-reply-box__text">{review.response}</p>
                  </div>
                ) : (
                  <div className="srr-card-footer-cta" onClick={(e) => e.stopPropagation()}>
                    <span className="srr-no-reply-note">Bu değerlendirmeye henüz yanıt verilmemiş.</span>
                    <button
                      type="button"
                      className="srr-action-chip srr-action-chip--primary"
                      onClick={(e) => startEditingReview(review, e)}
                    >
                      <FaReply size={12} />
                      <span>Yanıt Yaz</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {visibleReviews.length < serviceReviews.length && (
        <div className="srr-load-more-container" ref={loadMoreRef}>
          <button type="button" className="srr-load-more-button" onClick={loadMoreReviews}>
            <FaChevronDown /> Daha Fazla Göster
          </button>
        </div>
      )}

      {renderReviewModal()}
    </div>
  );
};

export default ServiceReviewResponse;
