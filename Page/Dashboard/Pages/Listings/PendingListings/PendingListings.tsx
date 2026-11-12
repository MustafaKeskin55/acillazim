"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch, FaClock, FaMapMarkerAlt, FaEdit, FaTrash, FaLayerGroup, FaSpinner, FaRegCalendarAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { ListingService } from '@/services/listingService';
import ConfirmationModal from '../../../Components/ConfirmationModal/ConfirmationModal';
import QuickEditListingModal from '../../../Components/QuickEditListingModal/QuickEditListingModal';
import { resolveImageUrl, FALLBACK_LISTING_IMAGE } from '@/utils/resolveImageUrl';
import { isServiceListing } from '@/lib/isServiceListing';
import styles from './PendingListings.module.css';

// NOT: Bu sayfa eskiden data/cardData.js -> defaultCardData üzerinden statik
// (status === 'pending') mock veri gösteriyordu. Artık gerçek backend'den
// (GET /api/v1/listings/pending-review) kullanıcının onay bekleyen (yeni ya da
// yayındaki ilanında düzenlemesi onay bekleyen) ilanları çekiliyor.

interface RawPendingListing {
  ilan_id?: number | string;
  baslik?: string;
  fiyat?: number;
  category_id?: number | string;
  onay_durumu?: 'onaylandi' | 'onay_bekliyor' | 'duzenleme_onay_bekliyor';
  konum?: { il?: string; ilce?: string };
  resimler?: string[];
  ilan_tarihi?: string;
  [key: string]: unknown;
}

interface CardItem {
  id: string | number;
  title: string;
  categories: string;
  city: string;
  img?: string;
  price?: number;
  date?: string;
  isEdit: boolean;
  isService?: boolean;
}

interface AuthContextValue {
  currentUser: { id?: number | string } | null;
  isAuthenticated: boolean;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

function resolveV1Base(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api/v1';
  const host = raw
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/api\/?$/i, '');
  return `${host}/api/v1`;
}

async function fetchPendingReview(): Promise<RawPendingListing[]> {
  const token = getAuthToken();
  const res = await fetch(`${resolveV1Base()}/listings/pending-review`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Onay bekleyen ilanlar alınamadı (${res.status})`);
  const raw = await res.json();
  const data = raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw;
  return Array.isArray(data) ? data : [];
}

function mapPending(raw: RawPendingListing): CardItem {
  return {
    id: raw.ilan_id ?? '',
    title: raw.baslik || 'İlan',
    categories: '',
    city: [raw.konum?.il, raw.konum?.ilce].filter(Boolean).join(' / ') || '-',
    img: resolveImageUrl(raw.resimler?.[0]),
    price: raw.fiyat,
    date: raw.ilan_tarihi,
    isEdit: raw.onay_durumu === 'duzenleme_onay_bekliyor',
    isService: isServiceListing(raw as Record<string, unknown>),
  };
}

const PendingListings: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth() as AuthContextValue;
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [listings, setListings] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [listingToDelete, setListingToDelete] = useState<CardItem | null>(null);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [listingToEdit, setListingToEdit] = useState<CardItem | null>(null);
  const itemsPerPage = 10;

  const loadPending = useCallback(async () => {
    if (!isAuthenticated) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPendingReview();
      setListings(data.map(mapPending));
    } catch (error) {
      console.error('Onay bekleyen ilanlar alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { loadPending(); }, [loadPending]);

  const filteredListings = useMemo(() => {
    return listings.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [listings, searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredListings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const formatPrice = (price?: number) => (price ? new Intl.NumberFormat('tr-TR').format(price) : '');

  const handleEdit = (item: CardItem) => {
    const isService =
      item.isService ||
      isServiceListing({
        id: item.id,
        categoryName: item.categories,
        kategori: item.categories,
        title: item.title,
      });

    if (isService) {
      router.push(`/dashboard/ilan-duzenle/${item.id}`);
      return;
    }

    setListingToEdit(item);
    setEditModalOpen(true);
  };

  const handleEditSaved = () => {
    // Değişiklik yine onaya düşer; liste zaten "onay bekliyor" durumunda olduğu için değişmez.
    loadPending();
  };

  const handleDelete = (item: CardItem) => {
    setListingToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!listingToDelete) return;
    try {
      await ListingService.deleteListing(Number(listingToDelete.id));
      setListings(prev => prev.filter(item => item.id !== listingToDelete.id));
      toast.success('İlan silindi');
    } catch (error) {
      console.error('İlan silinirken hata:', error);
      toast.error('İlan silinemedi. Lütfen tekrar deneyin.');
    } finally {
      setDeleteModalOpen(false);
      setListingToDelete(null);
    }
  };

  return (
    <div className={styles['listings-container']}>
      <div className={styles['listings-header']}>
        <div className={styles['listings-header__info']}>
          <span className={styles['listings-header__badge']}>
            <FaLayerGroup /> MODERASYON &amp; ONAY SÜRECİ
          </span>
          <div className={styles['listings-header__title-row']}>
            <div className={styles['listings-header__icon']}>
              <FaClock />
            </div>
            <div className={styles['listings-header__text']}>
              <div className={styles['listings-header__heading-group']}>
                <h1>Onayda Bekleyen İlanlarım</h1>
                <span className={styles['listings-count-badge']}>
                  {listings.length} İnceleniyor
                </span>
              </div>
              <p className={styles['listings-subtitle']}>
                Yeni oluşturduğunuz veya düzenlediğiniz ilanlar moderasyon ekibimiz tarafından incelendikten sonra yayına alınır.
              </p>
            </div>
          </div>
        </div>

        <div className={styles['search-filter']}>
          <div className={styles['search-box']}>
            <FaSearch className={styles['search-icon']} />
            <input
              type="text"
              placeholder="Başlık veya şehir ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles['search-input']}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles['no-listings']}>
          <div className={styles['no-listings__icon-wrap']}>
            <FaSpinner className={styles['no-listings__spinner']} />
          </div>
          <h3>Onay Bekleyen İlanlarınız Yükleniyor</h3>
          <p>Lütfen bekleyin, incelemedeki ilanlarınız getiriliyor...</p>
        </div>
      ) : currentItems.length === 0 ? (
        <div className={styles['no-listings']}>
          <div className={styles['no-listings__icon-wrap']}>
            <FaClock className={styles['no-listings__icon']} />
          </div>
          <h3>Onay Bekleyen İlanınız Bulunmuyor</h3>
          <p>
            {searchTerm
              ? 'Arama kriterlerinize uygun onay bekleyen ilan bulunamadı.'
              : 'Şu anda moderasyon onayı bekleyen herhangi bir ilanınız bulunmamaktadır.'}
          </p>
        </div>
      ) : (
        <div className={styles['listings-grid']}>
          {currentItems.map(item => (
            <article key={String(item.id)} className={styles['listing-card']}>
              <div className={styles['card-image']}>
                <img
                  src={item.img || FALLBACK_LISTING_IMAGE}
                  alt={item.title}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== FALLBACK_LISTING_IMAGE) {
                      target.src = FALLBACK_LISTING_IMAGE;
                    }
                  }}
                />
                <div className={styles['card-image-overlay']} />
                <span className={`${styles['status-badge']} ${item.isEdit ? styles['status-badge--edit'] : ''}`}>
                  <FaClock /> {item.isEdit ? 'Düzenleme Onayda' : 'Onay Bekliyor'}
                </span>
              </div>

              <div className={styles['card-content']}>
                <h3 className={styles['card-title']} title={item.title}>{item.title}</h3>

                <div className={styles['card-info']}>
                  <div className={styles['card-location']}>
                    <FaMapMarkerAlt />
                    <span>{item.city}</span>
                  </div>
                  {!!item.price && (
                    <div className={styles['card-price']}>{formatPrice(item.price)} ₺</div>
                  )}
                </div>

                {formatDate(item.date) && (
                  <div className={styles['card-category']}>
                    <FaRegCalendarAlt />
                    <span>{formatDate(item.date)}</span>
                  </div>
                )}

                <div className={styles['card-actions']}>
                  <button
                    type="button"
                    className={`${styles['action-btn']} ${styles['edit']}`}
                    onClick={() => handleEdit(item)}
                  >
                    <FaEdit />
                    <span>Düzenle</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles['action-btn']} ${styles['delete']}`}
                    onClick={() => handleDelete(item)}
                  >
                    <FaTrash />
                    <span>Sil</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles['listings-pagination']}>
          <button
            className={styles['page-btn']}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Önceki
          </button>
          <div className={styles['page-numbers']}>
            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index + 1}
                className={`${styles['page-btn']} ${currentPage === index + 1 ? styles['active'] : ''}`}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button
            className={styles['page-btn']}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Sonraki
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setListingToDelete(null); }}
        onConfirm={handleConfirmDelete}
        title="İlanı Sil"
        message={`"${listingToDelete?.title}" ilanını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Sil"
      />

      <QuickEditListingModal
        isOpen={editModalOpen}
        listingId={listingToEdit?.id ?? null}
        listingTitleFallback={listingToEdit?.title}
        onClose={() => { setEditModalOpen(false); setListingToEdit(null); }}
        onSaved={handleEditSaved}
      />
    </div>
  );
};

export default PendingListings;
