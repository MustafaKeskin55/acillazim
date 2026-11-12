"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { QRCodeCanvas } from 'qrcode.react';
import {
  FaHeart,
  FaFolder,
  FaFolderOpen,
  FaPlus,
  FaShareAlt,
  FaEdit,
  FaTrashAlt,
  FaArrowLeft,
  FaDownload,
  FaCopy,
  FaCheck,
  FaTimes,
  FaWhatsapp,
  FaFacebookF,
  FaInstagram,
  FaTelegramPlane,
  FaTwitter,
  FaEnvelope,
  FaChevronDown,
  FaLink,
  FaSearch,
  FaChevronRight,
  FaRegHeart,
} from 'react-icons/fa';
import styles from './DashboardFavorite.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DeleteConfirmModal from './DeleteConfirmModal/DsDeleteConfirmModal';
import favoriteService from '@/services/favorites/favoriteService';
import { showListNotification, showErrorNotification, copyToClipboard } from '@/utils/favoriteUtils';
import ProductCard from '@/components/ProductCard/ProductCard';

interface FavoriteList {
  id: string | number;
  name: string;
  itemCount?: number;
  items?: Array<{ id: string | number; listingData: Record<string, unknown> }>;
}

type FavSvc = {
  getUserLists: () => Promise<{ success: boolean; data: FavoriteList[]; message?: string }>;
  getListDetails: (id: string | number) => Promise<{ success: boolean; data?: { items?: FavoriteList['items'] } }>;
  createList: (name: string) => Promise<{ success: boolean; message?: string }>;
  updateList: (id: string | number, name: string) => Promise<{ success: boolean; message?: string }>;
  deleteList: (id: string | number) => Promise<{ success: boolean; message?: string }>;
  shareList: (id: string | number) => Promise<{ success: boolean; data?: { shareUrl: string }; message?: string }>;
};

const FavoritesList: React.FC = () => {
  const [lists, setLists] = useState<FavoriteList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [listDetailsLoading, setListDetailsLoading] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingList, setEditingList] = useState<FavoriteList | null>(null);
  const [newListName, setNewListName] = useState<string>('');
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [sharingList, setSharingList] = useState<FavoriteList | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedListToDelete, setSelectedListToDelete] = useState<string | number | null>(null);

  const svc = favoriteService as unknown as FavSvc;
  const sanitizeInput = (input: string): string => DOMPurify.sanitize(input);

  const totalLists = lists.length;
  const totalFavoriteItems = useMemo(
    () => lists.reduce((acc, l) => acc + (l.itemCount ?? l.items?.length ?? 0), 0),
    [lists]
  );

  const currentList = useMemo(
    () => lists.find((l) => String(l.id) === String(selectedListId)) || null,
    [lists, selectedListId]
  );

  const fetchListDetails = useCallback(async (listId: string | number) => {
    try {
      setListDetailsLoading(true);
      const response = await svc.getListDetails(listId);
      if (response.success && response.data?.items) {
        setLists((prev) =>
          prev.map((l) => (String(l.id) === String(listId) ? { ...l, items: response.data?.items || [] } : l))
        );
      }
    } catch {
      /* ignore */
    } finally {
      setListDetailsLoading(false);
    }
  }, [svc]);

  const loadFavoriteLists = useCallback(async (selectFirst = false) => {
    try {
      setLoading(true);
      const response = await svc.getUserLists();
      if (response.success) {
        const fetchedLists = response.data || [];
        setLists(fetchedLists);

        if (fetchedLists.length > 0) {
          const targetId = selectFirst || !selectedListId ? fetchedLists[0].id : selectedListId;
          setSelectedListId(targetId);
          fetchListDetails(targetId);
        } else {
          setSelectedListId(null);
        }
      } else {
        toast.error(response.message || 'Listeler yüklenirken hata oluştu', { position: 'top-center', autoClose: 2000 });
      }
    } catch {
      toast.error('Listeler yüklenirken hata oluştu', { position: 'top-center', autoClose: 2000 });
    } finally {
      setLoading(false);
    }
  }, [svc, selectedListId, fetchListDetails]);

  useEffect(() => {
    loadFavoriteLists(true);
  }, []);

  const handleSelectList = (listId: string | number) => {
    setSelectedListId(listId);
    setMobileView('detail');
    const existing = lists.find((l) => String(l.id) === String(listId));
    if (!existing?.items) {
      fetchListDetails(listId);
    }
  };

  const handleEditList = (e: React.MouseEvent, list: FavoriteList | null) => {
    e.stopPropagation();
    if (!list) return;
    setEditingList(list);
    setNewListName(list.name || '');
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, listId: string | number | undefined | null) => {
    e.stopPropagation();
    if (!listId) return;
    setSelectedListToDelete(listId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedListToDelete) return;
    try {
      const response = await svc.deleteList(selectedListToDelete);
      if (response && response.success) {
        const deletedId = selectedListToDelete;
        setIsDeleteModalOpen(false);
        setSelectedListToDelete(null);

        const remaining = lists.filter((l) => String(l.id) !== String(deletedId));
        setLists(remaining);

        if (String(selectedListId) === String(deletedId)) {
          if (remaining.length > 0) {
            setSelectedListId(remaining[0].id);
            fetchListDetails(remaining[0].id);
          } else {
            setSelectedListId(null);
            setMobileView('list');
          }
        }

        (showListNotification as (t: string, n: string) => void)('deleted', 'Liste');
      } else {
        (showErrorNotification as (l: string, e: Error) => void)(
          'Liste silme',
          new Error(response?.message || 'Liste silinemedi')
        );
      }
    } catch (e) {
      (showErrorNotification as (l: string, e: Error) => void)('Liste silme', e as Error);
    }
  };

  const handleShareList = async (e: React.MouseEvent, list: FavoriteList | null) => {
    e.stopPropagation();
    if (!list) return;

    // Her durumda önce güvenli fallback URL oluşturup modalı aç
    const fallbackUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/favorites/shared/${list.id}`
        : `/favorites/shared/${list.id}`;

    setShareUrl(fallbackUrl);
    setSharingList(list);
    setCopied(false);
    setIsShareModalOpen(true);

    try {
      const response = await svc.shareList(list.id);
      if (response && response.success && response.data?.shareUrl) {
        setShareUrl(response.data.shareUrl.replace('acillazım.net', 'acillazim.net'));
      }
    } catch {
      // Backend başarısız olsa bile kullanıcı hazır fallback linkini paylaşabilir
    }
  };

  const handleShare = (platform: string) => {
    if (!sharingList) return;
    const listUrl = shareUrl || `${window.location.origin}/favorites/shared/${sharingList.id}`;
    const msg = 'Favori İlanlarımı Sizlerle Paylaşıyorum';
    switch (platform) {
      case 'whatsapp':
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}: ${encodeURIComponent(listUrl)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(listUrl)}`, '_blank');
        break;
      case 'instagram':
        window.open(`instagram://share?text=${encodeURIComponent(msg)}: ${encodeURIComponent(listUrl)}`, '_blank');
        setTimeout(() => window.open('https://www.instagram.com', '_blank'), 500);
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(listUrl)}&text=${encodeURIComponent(msg)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(listUrl)}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(msg)}&body=${encodeURIComponent(`${msg}: ${listUrl}`)}`, '_self');
        break;
      case 'native':
        if (typeof navigator !== 'undefined' && navigator.share) {
          navigator.share({ title: sharingList.name, text: msg, url: listUrl }).catch(() => {});
        }
        break;
    }
  };

  const handleNativeOrCopyShare = async () => {
    const rawUrl = shareUrl || (sharingList ? `${window.location.origin}/favorites/shared/${sharingList.id}` : window.location.href);
    const normalizedUrl = rawUrl.replace('acillazım.net', 'acillazim.net');
    const title = sharingList?.name || 'Favori İlanlarım';
    const text = `${title} - Favori İlanlarımı Sizlerle Paylaşıyorum`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: normalizedUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    const ok = await (copyToClipboard as (url: string) => Promise<boolean>)(normalizedUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = (type: 'png' | 'jpg') => {
    try {
      const qrCanvas = document.getElementById('qr-code') as HTMLCanvasElement | null;
      if (!qrCanvas) return;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
      const qrSize = 1024;
      canvas.width = qrSize;
      canvas.height = qrSize;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(qrCanvas, 0, 0, qrCanvas.width, qrCanvas.height, 0, 0, qrSize, qrSize);
      const link = document.createElement('a');
      link.download = type === 'png' ? 'acillazim-qr.png' : 'acillazim-qr.jpg';
      link.href = canvas.toDataURL(type === 'png' ? 'image/png' : 'image/jpeg', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      /* ignore */
    }
  };

  const handleCreateList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) {
      toast.warning('Lütfen bir liste adı girin', { position: 'top-center' });
      return;
    }
    if (trimmed.length < 2) {
      toast.warning('Liste adı en az 2 karakter olmalıdır', { position: 'top-center' });
      return;
    }
    try {
      const response = await svc.createList(sanitizeInput(trimmed));
      if (response.success) {
        setNewListName('');
        setIsCreateModalOpen(false);
        await loadFavoriteLists();
        (showListNotification as (t: string, n: string) => void)('created', trimmed);
      } else {
        (showErrorNotification as (l: string, e: Error) => void)(
          'Liste oluşturma',
          new Error(response.message || 'Liste oluşturulurken hata oluştu')
        );
      }
    } catch (e) {
      (showErrorNotification as (l: string, e: Error) => void)('Liste oluşturma', e as Error);
    }
  };

  const handleUpdateList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed || !editingList) return;
    try {
      const response = await svc.updateList(editingList.id, sanitizeInput(trimmed));
      if (response.success) {
        setNewListName('');
        setIsEditModalOpen(false);
        setEditingList(null);
        await loadFavoriteLists();
        (showListNotification as (t: string, n: string) => void)('updated', trimmed);
      } else {
        (showErrorNotification as (l: string, e: Error) => void)(
          'Liste güncelleme',
          new Error(response.message || 'Liste güncellenirken hata oluştu')
        );
      }
    } catch (e) {
      (showErrorNotification as (l: string, e: Error) => void)('Liste güncelleme', e as Error);
    }
  };

  const filteredLists = useMemo(() => {
    if (!searchQuery.trim()) return lists;
    return lists.filter((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [lists, searchQuery]);

  return (
    <div className={styles.favoritesPage}>
      <ToastContainer />

      {/* ── 1. ÜST BAŞLIK VE YENİ LİSTE KONTROLÜ (BİLDİRİMLER STİLİ) ── */}
      <div className={styles.headerBar}>
        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>Favori Listelerim</h1>
            {totalLists > 0 && (
              <span className={styles.countBadge}>
                {totalLists} liste &bull; {totalFavoriteItems} ilan
              </span>
            )}
          </div>
          <p className={styles.pageDesc}>
            İlgilendiğiniz ilanları özel klasörlerde toplayın, kolayca organize edin ve sevdiklerinizle paylaşın
          </p>
        </div>

        <div className={styles.headerControls}>
          <button
            type="button"
            className={styles.createBtn}
            onClick={() => setIsCreateModalOpen(true)}
            title="Yeni Favori Listesi Oluştur"
          >
            <FaPlus size={13} />
            <span>Yeni Liste Oluştur</span>
          </button>
        </div>
      </div>

      {/* ── 2. İKİ KOLONLU MASTER-DETAIL AKIŞ KARTI ── */}
      <div
        className={`${styles.splitCard} ${
          mobileView === 'detail' ? styles.showMobileDetail : styles.showMobileList
        }`}
      >
        {/* ════════════ SOL KOLON: LİSTELER (KLASÖRLER) ════════════ */}
        <aside className={styles.listColumn}>
          {/* Arama ve Filtre Üst Barı */}
          <div className={styles.listHeader}>
            <div className={styles.searchBox}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Listelerimde ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={styles.searchClearBtn}
                >
                  <FaTimes size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Listeler Kaydırma Alanı */}
          <div className={styles.listScroll}>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Listeler getiriliyor...</p>
              </div>
            ) : filteredLists.length === 0 ? (
              <div className={styles.emptyListState}>
                <div className={styles.emptyIcon}>
                  <FaFolderOpen size={22} />
                </div>
                <h4 className={styles.emptyTitle}>
                  {searchQuery ? 'Aramayla eşleşen liste yok' : 'Henüz Listeniz Yok'}
                </h4>
                <p className={styles.emptyDesc}>
                  {searchQuery
                    ? 'Farklı bir arama terimi deneyebilirsiniz.'
                    : 'İlanlarınızı gruplandırmak için hemen bir liste oluşturun.'}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    className={styles.inlineCreateBtn}
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    <FaPlus size={11} />
                    <span>İlk Listenizi Ekleyin</span>
                  </button>
                )}
              </div>
            ) : (
              filteredLists.map((list) => {
                const isSelected = String(list.id) === String(selectedListId);
                const itemCount = list.itemCount ?? list.items?.length ?? 0;

                return (
                  <div
                    key={list.id}
                    className={`${styles.listRow} ${isSelected ? styles.isSelected : ''}`}
                    onClick={() => handleSelectList(list.id)}
                    role="button"
                    tabIndex={0}
                  >
                    {/* Klasör İkonu */}
                    <div
                      className={`${styles.rowIconBox} ${
                        isSelected ? styles.rowIconBoxActive : ''
                      }`}
                    >
                      {itemCount > 0 ? <FaFolderOpen /> : <FaFolder />}
                    </div>

                    {/* Liste Bilgisi */}
                    <div className={styles.rowBody}>
                      <div className={styles.rowTitleWrap}>
                        <span className={styles.rowTitle} title={list.name}>
                          {list.name}
                        </span>
                      </div>
                      <span className={styles.rowSubtitle}>
                        {itemCount > 0 ? `${itemCount} kayıtlı ilan` : 'Boş liste'}
                      </span>
                    </div>

                    {/* Sağ Aksiyonlar ve Ok */}
                    <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={styles.rowActionBtn}
                        onClick={(e) => handleShareList(e, list)}
                        title="Listeyi Paylaş"
                        aria-label="Listeyi Paylaş"
                      >
                        <FaShareAlt size={11} />
                      </button>
                      <button
                        type="button"
                        className={styles.rowActionBtn}
                        onClick={(e) => handleEditList(e, list)}
                        title="Listeyi Düzenle"
                        aria-label="Listeyi Düzenle"
                      >
                        <FaEdit size={11} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.rowActionBtn} ${styles.rowActionBtnDelete}`}
                        onClick={(e) => handleDeleteClick(e, list.id)}
                        title="Listeyi Sil"
                        aria-label="Listeyi Sil"
                      >
                        <FaTrashAlt size={11} />
                      </button>
                      <FaChevronRight className={styles.rowChevron} size={10} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ════════════ SAĞ KOLON: SEÇİLİ LİSTE İÇERİĞİ VE İLANLAR ════════════ */}
        <main className={styles.detailColumn}>
          {listDetailsLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>İlanlar yükleniyor...</p>
            </div>
          ) : !currentList ? (
            <div className={styles.noSelectionState}>
              <div className={styles.noSelectionIcon}>
                <FaRegHeart size={28} />
              </div>
              <h3 className={styles.noSelectionTitle}>Görüntülenecek Liste Seçilmedi</h3>
              <p className={styles.noSelectionDesc}>
                Sol taraftaki listeden bir klasör seçerek içindeki ilanları inceleyebilir veya yeni bir liste oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            <div className={styles.detailContainer}>
              {/* Üst Detay Kontrol Barı: Başlık, Sayaç ve Aksiyonlar Tek Hizada */}
              <div className={styles.detailTopbar}>
                <div className={styles.detailHeaderLeft}>
                  {/* Mobilde Listeye Dön Butonu */}
                  <button
                    type="button"
                    className={styles.mobileBackBtn}
                    onClick={() => setMobileView('list')}
                  >
                    <FaArrowLeft size={11} />
                    <span>Listeler</span>
                  </button>

                  <div className={styles.detailIconBox}>
                    <FaFolderOpen />
                  </div>

                  <div className={styles.detailTitleWrap}>
                    <h2 className={styles.detailTitle}>{currentList.name}</h2>
                    <span className={styles.detailCountBadge}>
                      {currentList.items?.length ?? currentList.itemCount ?? 0} İlan
                    </span>
                  </div>
                </div>

                {/* Sağ Aksiyon Butonları */}
                <div className={styles.detailTopbarActions}>
                  <button
                    type="button"
                    className={`${styles.detailActionBtn} ${styles.detailActionBtnShare}`}
                    onClick={(e) => currentList && handleShareList(e, currentList)}
                  >
                    <FaShareAlt size={12} />
                    <span>Paylaş</span>
                  </button>
                  <button
                    type="button"
                    className={styles.detailActionBtn}
                    onClick={(e) => currentList && handleEditList(e, currentList)}
                  >
                    <FaEdit size={12} />
                    <span>Düzenle</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.detailActionBtn} ${styles.detailActionBtnDelete}`}
                    onClick={(e) => currentList && handleDeleteClick(e, currentList.id)}
                  >
                    <FaTrashAlt size={12} />
                    <span>Sil</span>
                  </button>
                </div>
              </div>

              {/* İlanlar Izgarası veya Boş Durum */}
              {!currentList.items || currentList.items.length === 0 ? (
                <div className={styles.detailEmptyBox}>
                  <div className={styles.detailEmptyIcon}>
                    <FaRegHeart size={26} />
                  </div>
                  <h3 className={styles.detailEmptyTitle}>Bu Listede Henüz Favori İlan Yok</h3>
                  <p className={styles.detailEmptyDesc}>
                    İlan sayfalarında kalp simgesine dokunarak ilgilendiğiniz ilanları bu listeye ekleyebilirsiniz.
                  </p>
                  <Link href="/ilanlar" className={styles.exploreListingsBtn}>
                    <FaSearch size={12} />
                    <span>İlanları Keşfet</span>
                  </Link>
                </div>
              ) : (
                <div className={styles.itemsGrid}>
                  {currentList.items.map((item) => (
                    <ProductCard key={item.id} product={item.listingData} />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── YENİ LİSTE OLUŞTURMA MODALI ── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCreateModalOpen(false)}
          >
            <motion.div
              className={styles.createModal}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderLeft}>
                  <div className={styles.modalHeaderIcon}>
                    <FaFolder />
                  </div>
                  <h2>Yeni Liste Oluştur</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={styles.modalCloseBtn}
                  aria-label="Kapat"
                >
                  <FaTimes />
                </button>
              </div>

              <div className={styles.modalContent}>
                <div className={styles.inputLabel}>
                  <span>Liste Adı</span>
                  <span className={styles.charCount}>{newListName.length} / 100</span>
                </div>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(sanitizeInput(e.target.value))}
                  placeholder="Örn: Favori Araçlar, Yazlıklar, İş İlanları..."
                  minLength={2}
                  maxLength={100}
                  className={styles.input}
                  autoFocus
                />
                <p className={styles.inputHelper}>En az 2, en fazla 100 karakter belirleyebilirsiniz.</p>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={styles.cancelButton}
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleCreateList}
                  className={styles.submitButton}
                >
                  Listeyi Oluştur
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LİSTE DÜZENLEME MODALI ── */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsEditModalOpen(false);
              setEditingList(null);
            }}
          >
            <motion.div
              className={styles.createModal}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderLeft}>
                  <div className={styles.modalHeaderIcon}>
                    <FaEdit />
                  </div>
                  <h2>Listeyi Düzenle</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingList(null);
                  }}
                  className={styles.modalCloseBtn}
                  aria-label="Kapat"
                >
                  <FaTimes />
                </button>
              </div>

              <div className={styles.modalContent}>
                <div className={styles.inputLabel}>
                  <span>Liste Adı</span>
                  <span className={styles.charCount}>{newListName.length} / 100</span>
                </div>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(sanitizeInput(e.target.value))}
                  placeholder="Liste Adı (En az 2 karakter)"
                  minLength={2}
                  maxLength={100}
                  className={styles.input}
                  autoFocus
                />
                <p className={styles.inputHelper}>En az 2, en fazla 100 karakter olmalıdır.</p>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingList(null);
                  }}
                  className={styles.cancelButton}
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleUpdateList}
                  className={styles.submitButton}
                >
                  Güncelle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PAYLAŞIM MODALI (SOSYAL MEDYA & QR KOD) ── */}
      <AnimatePresence>
        {isShareModalOpen && sharingList && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsShareModalOpen(false)}
          >
            <motion.div
              className={styles.shareModal}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderLeft}>
                  <div className={styles.modalHeaderIcon}>
                    <FaShareAlt />
                  </div>
                  <div>
                    <h2>Favori İlanları Paylaş</h2>
                    <span className={styles.modalHeaderSubtitle}>
                      {sharingList.name} ({sharingList.itemCount ?? sharingList.items?.length ?? 0} İlan)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className={styles.modalCloseBtn}
                  aria-label="Kapat"
                >
                  <FaTimes />
                </button>
              </div>

              <div className={styles.shareBody}>
                {/* 1. Sosyal Medya İkonları & Bağlantı Kopyala (Sadece İkon) */}
                <div className={styles.shareSection}>
                  <span className={styles.shareSectionLabel}>Sosyal Medyada Paylaş</span>
                  <div className={styles.shareButtons}>
                    <button
                      type="button"
                      onClick={() => handleShare('whatsapp')}
                      className={`${styles.shareIconBtn} ${styles.whatsappButton}`}
                      title="WhatsApp'ta Paylaş"
                      aria-label="WhatsApp'ta Paylaş"
                    >
                      <FaWhatsapp className={styles.shareBtnIcon} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare('facebook')}
                      className={`${styles.shareIconBtn} ${styles.facebookButton}`}
                      title="Facebook'ta Paylaş"
                      aria-label="Facebook'ta Paylaş"
                    >
                      <FaFacebookF className={styles.shareBtnIcon} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare('instagram')}
                      className={`${styles.shareIconBtn} ${styles.instagramButton}`}
                      title="Instagram'da Paylaş"
                      aria-label="Instagram'da Paylaş"
                    >
                      <FaInstagram className={styles.shareBtnIcon} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNativeOrCopyShare}
                      className={`${styles.shareIconBtn} ${copied ? styles.linkIconBtnCopied : styles.linkIconBtn}`}
                      title="Diğer Uygulamalarda Paylaş"
                      aria-label="Diğer Uygulamalarda Paylaş"
                    >
                      {copied ? (
                        <FaCheck className={styles.shareBtnIcon} />
                      ) : (
                        <FaLink className={styles.shareBtnIcon} />
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. QR Kod Alanı */}
                <div className={styles.shareSection}>
                  <span className={styles.shareSectionLabel}>QR Kod ile Okut & Paylaş</span>
                  <div className={styles.qrCodeSection}>
                    <div className={styles.qrCodeWrapper}>
                      <QRCodeCanvas
                        id="qr-code"
                        value={shareUrl}
                        size={1024}
                        level="H"
                        includeMargin
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                        imageSettings={{
                          src: '/qrlogo-watermark.png',
                          width: 780,
                          height: 780,
                          excavate: false,
                          opacity: 0.42,
                          crossOrigin: 'anonymous',
                        }}
                        style={{ width: '148px', height: '148px' }}
                      />
                    </div>
                    <p className={styles.qrCodeText}>Telefon kamerasını QR koda tutarak listeye ulaşın</p>

                    <div className={styles.qrDownloadBar}>
                      <button
                        type="button"
                        onClick={() => handleDownloadQR('png')}
                        className={styles.downloadBtnPrimary}
                      >
                        <FaDownload size={11} />
                        <span>PNG İndir</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadQR('jpg')}
                        className={styles.downloadBtnSecondary}
                      >
                        <FaDownload size={11} />
                        <span>JPG İndir</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SİLME ONAY MODALI ── */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default FavoritesList;
