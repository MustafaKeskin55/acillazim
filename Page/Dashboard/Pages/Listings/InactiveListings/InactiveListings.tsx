"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch, FaFilter, FaPauseCircle, FaLayerGroup, FaSpinner, FaInbox } from 'react-icons/fa';
import toast from 'react-hot-toast';
import DashboardCard from '../../../Components/DashboardCard/DashboardCard';
import ConfirmationModal from '../../../Components/ConfirmationModal/ConfirmationModal';
import QuickEditListingModal from '../../../Components/QuickEditListingModal/QuickEditListingModal';
import { useAuth } from '@/context/AuthContext';
import { ListingService } from '@/services/listingService';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import { isServiceListing } from '@/lib/isServiceListing';
import './InactiveListings.css';

// NOT: Bu sayfa eskiden data/ListingsContext -> data/cardData.js üzerinden
// statik/mock veri gösteriyordu. Artık gerçek backend'den
// (GET /api/listings/user/{userId}) kullanıcının kendi ilanları çekiliyor.

interface RawListing {
  id: number | string;
  title?: string;
  categoryName?: string;
  locationCity?: string;
  imageUrls?: string[];
  active?: boolean;
  hasPendingEdit?: boolean;
  [key: string]: unknown;
}

interface Listing {
  id: string | number;
  title: string;
  categories: string;
  city: string;
  status: string;
  img?: string;
  hasPendingEdit?: boolean;
  isService?: boolean;
}

interface AuthContextValue {
  currentUser: { id?: number | string } | null;
  isAuthenticated: boolean;
}

function getUserId(currentUser: { id?: number | string } | null): number {
  if (currentUser?.id && !Number.isNaN(Number(currentUser.id))) return Number(currentUser.id);
  if (typeof window !== 'undefined') {
    const stored = parseInt(localStorage.getItem('userId') || '0', 10);
    if (stored) return stored;
  }
  return 0;
}

function mapListing(raw: RawListing): Listing {
  const images = Array.isArray(raw.imageUrls) ? raw.imageUrls : [];
  const isService = isServiceListing(raw as Record<string, unknown>);
  return {
    id: raw.id,
    title: raw.title || 'İlan',
    categories: raw.categoryName || 'Diğer',
    city: raw.locationCity || '-',
    status: raw.active === false ? 'passive' : 'active',
    img: resolveImageUrl(images[0]),
    hasPendingEdit: raw.hasPendingEdit === true,
    isService,
  };
}

// Host normalize → {host}/api/v1 — WebCreateListingController (mobil controller'a dokunulmadı):
// PUT/DELETE /api/v1/listings/{id} burada; sahiplik kontrolü backend'de yapılıyor.
function resolveV1ListingsBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api/v1';
  const host = raw
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/v1\/?$/i, '');
  return `${host}/api/v1`;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

// İlanı aktif/pasif yapar. Hedef: PUT /api/v1/listings/{id} (sadece active alanı gönderilir).
async function setListingActiveStatus(id: string | number, active: boolean): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${resolveV1ListingsBase()}/listings/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error(`İlan durumu güncellenemedi (${res.status})`);
}

const InactiveListings: React.FC = () => {
  const router = useRouter();
  const { currentUser, isAuthenticated } = useAuth() as AuthContextValue;
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [listingToEdit, setListingToEdit] = useState<Listing | null>(null);
  const itemsPerPage = 21;

  // Gerçek ilan verilerini backend'den çek
  const fetchListings = useCallback(async () => {
    if (!isAuthenticated) {
      setListings([]);
      setLoading(false);
      return;
    }
    const userId = getUserId(currentUser);
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await ListingService.getUserListings(userId, 100);
      setListings((data as RawListing[]).map(mapListing));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const inactiveListings = listings.filter(item => item.status === 'passive');

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(inactiveListings.map(item => item.categories.toLowerCase()))];
    return uniqueCategories.sort();
  }, [inactiveListings]);

  const filteredListings = inactiveListings.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categories.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.categories.toLowerCase() === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredListings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);

  useEffect(() => {
    const newTotalPages = Math.ceil(filteredListings.length / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) setCurrentPage(1);
  }, [filteredListings.length, currentPage]);

  // Düzenleme: Hizmet ilanları doğrudan Hizmet Alanları kurgusundaki tam düzenleme sayfasına yönlendirilir; diğer ilanlar QuickEditListingModal ile açılır.
  const handleEdit = (id: string | number) => {
    const listing = inactiveListings.find(item => item.id === id);
    if (!listing) return;
    const isService =
      listing.isService ||
      isServiceListing({
        id: listing.id,
        categoryName: listing.categories,
        kategori: listing.categories,
        title: listing.title,
      });

    if (isService) {
      router.push(`/dashboard/ilan-duzenle/${id}`);
      return;
    }

    setListingToEdit(listing);
    setEditModalOpen(true);
  };

  // Not: Değişiklikler backend'de admin onayına gönderilir; ilan üzerinde eski
  // (yayındaki) içerik onaylanana kadar gösterilmeye devam eder. Bu yüzden başlığı
  // burada hemen güncellemiyoruz; sadece "Düzenleme Onayda" rozetini gösteriyoruz.
  const handleEditSaved = () => {
    if (!listingToEdit) return;
    setListings(prev => prev.map(item => (
      item.id === listingToEdit.id ? { ...item, hasPendingEdit: true } : item
    )));
  };

  const handleActivate = (id: string | number) => {
    const listing = inactiveListings.find(item => item.id === id);
    if (listing) { setSelectedListing(listing); setModalOpen(true); }
  };

  const handleConfirmActivate = async () => {
    if (!selectedListing) return;
    try {
      await setListingActiveStatus(selectedListing.id, true);
      setListings(prev => prev.map(item => item.id === selectedListing.id ? { ...item, status: 'active' } : item));
      toast.success('İlan aktifleştirildi');
    } catch (error) {
      console.error('İlan aktifleştirilirken hata:', error);
      toast.error('İlan aktifleştirilemedi. Lütfen tekrar deneyin.');
    } finally {
      setModalOpen(false);
      setSelectedListing(null);
    }
  };

  const handlePause = async (id: string | number) => {
    try {
      await setListingActiveStatus(id, false);
      setListings(prev => prev.map(item => item.id === id ? { ...item, status: 'passive' } : item));
      toast.success('İlan pasifleştirildi');
    } catch (error) {
      console.error('İlan pasifleştirilirken hata:', error);
      toast.error('İlan pasifleştirilemedi. Lütfen tekrar deneyin.');
    }
  };

  const handleDelete = (id: string | number) => {
    const listing = inactiveListings.find(item => item.id === id);
    if (listing) { setListingToDelete(listing); setDeleteModalOpen(true); }
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
    <div className="listings-container">
      <div className="listings-header">
        <div className="listings-header__info">
          <span className="listings-header__badge">
            <FaLayerGroup /> İLAN ARŞİV &amp; DURUM MERKEZİ
          </span>
          <div className="listings-header__title-row">
            <div className="listings-header__icon listings-header__icon--passive">
              <FaPauseCircle />
            </div>
            <div className="listings-header__text">
              <div className="listings-header__heading-group">
                <h1>Pasif İlanlarım</h1>
                <span className="listings-count-badge listings-count-badge--passive">
                  {inactiveListings.length} Pasif
                </span>
              </div>
              <p className="listings-subtitle">
                Geçici olarak duraklattığınız ilanlarınızı buradan tekrar yayına alabilir, düzenleyebilir veya silebilirsiniz.
              </p>
            </div>
          </div>
        </div>

        <div className="search-filter">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Başlık, kategori veya şehir ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-box">
            <FaFilter className="filter-icon" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
              aria-label="Kategoriye göre filtrele"
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="listings-empty">
          <div className="listings-empty__icon-wrap">
            <FaSpinner className="listings-empty__spinner" />
          </div>
          <h3>Pasif İlanlarınız Yükleniyor</h3>
          <p>Lütfen bekleyin, pasif durumdaki ilanlarınız getiriliyor...</p>
        </div>
      ) : currentItems.length === 0 ? (
        <div className="listings-empty">
          <div className="listings-empty__icon-wrap">
            <FaInbox className="listings-empty__icon" />
          </div>
          <h3>Pasif İlan Bulunmuyor</h3>
          <p>
            {searchTerm || filterCategory !== 'all'
              ? 'Arama veya kategori filtrenize uygun pasif ilan bulunamadı.'
              : 'Şu anda pasif (duraklatılmış) durumda olan herhangi bir ilanınız bulunmuyor.'}
          </p>
        </div>
      ) : (
        <div className="listings-grid">
          {currentItems.map(item => (
            <DashboardCard
              key={String(item.id)}
              data={item}
              onEdit={() => handleEdit(item.id)}
              onPause={() => handlePause(item.id)}
              onActivate={() => handleActivate(item.id)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="listings-pagination">
          <button className="page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Önceki</button>
          <div className="page-numbers">
            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index + 1}
                className={`page-btn ${currentPage === index + 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button className="page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Sonraki</button>
        </div>
      )}

      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedListing(null); }}
        onConfirm={handleConfirmActivate}
        title="İlanı Aktifleştir"
        message={`"${selectedListing?.title}" ilanını aktifleştirmek istediğinize emin misiniz?`}
        confirmText="Aktifleştir"
      />

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

export default InactiveListings;
