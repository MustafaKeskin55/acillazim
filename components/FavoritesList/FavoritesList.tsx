"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { QRCodeCanvas } from 'qrcode.react';
import styles from './FavoritesList.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DeleteConfirmModal from './DeleteConfirmModal/DeleteConfirmModal';
import favoriteService from '@/services/favorites/favoriteService';

interface FavoriteItem {
  id: string | number;
  title?: string;
  [key: string]: unknown;
}

interface FavoriteList {
  id: string | number;
  name: string;
  itemCount?: number;
  items?: FavoriteItem[];
}

interface ServiceResponse {
  success: boolean;
  message?: string;
  data?: FavoriteList | FavoriteList[] | { shareUrl: string } | { items: FavoriteItem[] };
}

const FavoritesList: React.FC = () => {
  const [lists, setLists] = useState<FavoriteList[]>([]);
  const [selectedList, setSelectedList] = useState<string | number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingList, setEditingList] = useState<FavoriteList | null>(null);
  const [newListName, setNewListName] = useState<string>('');
  const [activeMenu, setActiveMenu] = useState<string | number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [sharingList, setSharingList] = useState<FavoriteList | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedListToDelete, setSelectedListToDelete] = useState<string | number | null>(null);

  useEffect(() => { loadFavoriteLists(); }, []);

  const loadFavoriteLists = async () => {
    try {
      setLoading(true);
      const response = await favoriteService.getUserLists() as ServiceResponse;
      if (response.success) {
        setLists(response.data as FavoriteList[]);
      } else {
        toast.error(response.message || 'Listeler yüklenirken hata oluştu', { position: "top-center", autoClose: 2000 });
      }
    } catch (error) {
      console.error('Liste yükleme hatası:', error);
      toast.error('Listeler yüklenirken hata oluştu', { position: "top-center", autoClose: 2000 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (e: React.MouseEvent, listId: string | number) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === listId ? null : listId);
  };

  const sanitizeInput = (input: string): string => DOMPurify.sanitize(input);

  const handleListClick = async (listId: string | number) => {
    try {
      setSelectedList(listId);
      const response = await favoriteService.getListDetails(listId) as ServiceResponse;
      if (response.success) {
        const updatedLists = lists.map((list) =>
          list.id === listId ? { ...list, items: (response.data as { items: FavoriteItem[] })?.items || [] } : list
        );
        setLists(updatedLists);
      }
    } catch (error) {
      console.error('Liste detayları yükleme hatası:', error);
    }
  };

  const handleEditList = (e: React.MouseEvent, list: FavoriteList) => {
    e.stopPropagation();
    setEditingList(list);
    setNewListName(list.name);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (listId: string | number) => {
    try {
      const response = await favoriteService.deleteList(listId) as ServiceResponse;
      if (response.success) {
        await loadFavoriteLists();
        toast.success('Liste başarıyla silindi', { position: "top-center", autoClose: 2000 });
      } else {
        toast.error(response.message || 'Liste silinemedi', { position: "top-center", autoClose: 2000 });
      }
    } catch (error) {
      console.error('Liste silme hatası:', error);
      toast.error('Liste silinirken hata oluştu', { position: "top-center", autoClose: 2000 });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, listId: string | number) => {
    e.stopPropagation();
    setSelectedListToDelete(listId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedListToDelete) {
      handleDelete(selectedListToDelete);
      setIsDeleteModalOpen(false);
      setSelectedListToDelete(null);
    }
  };

  const handleShareList = async (e: React.MouseEvent, list: FavoriteList) => {
    e.stopPropagation();
    try {
      const response = await favoriteService.shareList(list.id) as ServiceResponse;
      if (response.success) {
        setShareUrl((response.data as { shareUrl: string }).shareUrl);
        setSharingList(list);
        setIsShareModalOpen(true);
        setActiveMenu(null);
      } else {
        toast.error(response.message || 'Paylaşım linki oluşturulamadı', { position: "top-center", autoClose: 2000 });
      }
    } catch (error) {
      console.error('Liste paylaşma hatası:', error);
      toast.error('Paylaşım linki oluşturulurken hata oluştu', { position: "top-center", autoClose: 2000 });
    }
  };

  const handleShare = (platform: string) => {
    if (!sharingList) return;
    const listUrl = shareUrl || `${window.location.origin}/favorites/shared/${sharingList.id}`;
    const shareMessage = "Favori İlanlarımı Sizlerle Paylaşıyorum";
    switch (platform) {
      case 'whatsapp':
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}: ${encodeURIComponent(listUrl)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(listUrl)}`, '_blank');
        break;
      case 'instagram':
        window.open(`instagram://share?text=${encodeURIComponent(shareMessage)}: ${encodeURIComponent(listUrl)}`, '_blank');
        setTimeout(() => window.open('https://www.instagram.com', '_blank'), 500);
        break;
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('✓ Bağlantı başarıyla kopyalandı', { position: "top-center", autoClose: 2000 });
    });
  };

  const handleDownloadQR = (type: 'png' | 'jpg') => {
    try {
      const qrCanvas = document.getElementById('qr-code') as HTMLCanvasElement;
      if (!qrCanvas) return;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
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
    } catch (error) {
      console.error('QR kod indirme hatası:', error);
    }
  };

  const handleCreateList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) {
      toast.warning('Lütfen bir liste adı girin', { position: "top-center", autoClose: 2500 });
      return;
    }
    if (trimmed.length < 2) {
      toast.warning('Liste adı en az 2 karakter olmalıdır', { position: "top-center", autoClose: 2500 });
      return;
    }
    if (trimmed.length > 100) {
      toast.warning('Liste adı en fazla 100 karakter olabilir', { position: "top-center", autoClose: 2500 });
      return;
    }
    try {
      const response = await favoriteService.createList(sanitizeInput(trimmed)) as ServiceResponse;
      if (response.success) {
        await loadFavoriteLists();
        setNewListName('');
        setIsCreateModalOpen(false);
        toast.success('Liste başarıyla oluşturuldu', { position: "top-center", autoClose: 2000 });
      } else {
        toast.error(response.message || 'Liste oluşturulamadı', { position: "top-center", autoClose: 2000 });
      }
    } catch (error: any) {
      console.error('Liste oluşturma hatası:', error);
      toast.error(error?.message || 'Liste oluşturulurken hata oluştu', { position: "top-center", autoClose: 2000 });
    }
  };

  const handleUpdateList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed || !editingList) return;
    if (trimmed.length < 2) {
      toast.warning('Liste adı en az 2 karakter olmalıdır', { position: "top-center", autoClose: 2500 });
      return;
    }
    if (trimmed.length > 100) {
      toast.warning('Liste adı en fazla 100 karakter olabilir', { position: "top-center", autoClose: 2500 });
      return;
    }
    try {
      const response = await favoriteService.updateList(editingList.id, sanitizeInput(trimmed)) as ServiceResponse;
      if (response.success) {
        await loadFavoriteLists();
        setNewListName('');
        setIsEditModalOpen(false);
        setEditingList(null);
        toast.success('Liste başarıyla güncellendi', { position: "top-center", autoClose: 2000 });
      } else {
        toast.error(response.message || 'Liste güncellenemedi', { position: "top-center", autoClose: 2000 });
      }
    } catch (error: any) {
      console.error('Liste güncelleme hatası:', error);
      toast.error(error?.message || 'Liste güncellenirken hata oluştu', { position: "top-center", autoClose: 2000 });
    }
  };

  return (
    <div className={styles.favoritesContainer}>
      <ToastContainer />
      {!selectedList ? (
        <>
          <h1 className={styles.pageTitle}>Favori İlanlar</h1>
          <div className={styles.listsGrid}>
            {lists.map((list) => (
              <motion.div
                key={list.id as string}
                className={`${styles.listCard} ${activeMenu === list.id ? styles.menuActive : ''}`}
                onClick={() => handleListClick(list.id)}
                whileHover={{ scale: 1.02 }}
              >
                <div className={styles.listPreview}>
                  <h2>{list.name}</h2>
                  {list.itemCount != null && list.itemCount > 0 && <p>({list.itemCount} ilan)</p>}
                </div>
                <div className={styles.listOverlay}>
                  <button onClick={(e) => handleShareList(e, list)} className={styles.overlayBtn}>Paylaş</button>
                  <button onClick={(e) => handleEditList(e, list)} className={styles.overlayBtn}>Değiştir</button>
                  <button onClick={(e) => handleDeleteClick(e, list.id)} className={styles.overlayBtn}>Sil</button>
                </div>
                <button className={styles.mobileMenuButton} onClick={(e) => toggleMenu(e, list.id)} />
                {activeMenu === list.id && (
                  <div className={styles.mobileMenu} ref={menuRef}>
                    <button onClick={(e) => handleShareList(e, list)}>Paylaş</button>
                    <button onClick={(e) => handleEditList(e, list)}>Değiştir</button>
                    <button onClick={(e) => handleDeleteClick(e, list.id)}>Sil</button>
                  </div>
                )}
              </motion.div>
            ))}
            <motion.div className={styles.newListCard} onClick={() => setIsCreateModalOpen(true)} whileHover={{ scale: 1.02 }}>
              <div className={styles.newListContent}>
                <span className={styles.plusIcon}>+</span>
                <p>Yeni Liste Oluştur</p>
              </div>
            </motion.div>
          </div>
        </>
      ) : (
        <div className={styles.listDetail}>
          <div className={styles.listHeader}>
            <button className={styles.backButton} onClick={() => setSelectedList(null)}>← Geri</button>
            <div className={styles.listInfo}>
              <h1>{lists.find((l) => l.id === selectedList)?.name}</h1>
            </div>
          </div>
          <div className={styles.listItems}>
            {lists.find((l) => l.id === selectedList)?.items?.length === 0 ? (
              <div className={styles.emptyState}><p>Şuan için favori ilanınız yok</p></div>
            ) : (
              <div className={styles.itemsGrid}>
                {lists.find((l) => l.id === selectedList)?.items?.map((item) => (
                  <div key={item.id as string} className={styles.itemCard}><p>{item.title}</p></div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Yeni Liste Oluşturma */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.createModal} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className={styles.modalHeader}><h2>Yeni Liste Oluştur</h2></div>
              <div className={styles.modalContent}>
                <input type="text" value={newListName} onChange={(e) => setNewListName(sanitizeInput(e.target.value))} placeholder="Liste Adı" className={styles.input} />
              </div>
              <div className={styles.modalFooter}>
                <button onClick={() => setIsCreateModalOpen(false)} className={styles.cancelButton}>İptal</button>
                <button onClick={handleCreateList} className={styles.submitButton}>Oluştur</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste Düzenleme */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.createModal} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className={styles.modalHeader}><h2>Listeyi Düzenle</h2></div>
              <div className={styles.modalContent}>
                <input type="text" value={newListName} onChange={(e) => setNewListName(sanitizeInput(e.target.value))} placeholder="Liste Adı" className={styles.input} />
              </div>
              <div className={styles.modalFooter}>
                <button onClick={() => { setIsEditModalOpen(false); setEditingList(null); }} className={styles.cancelButton}>İptal</button>
                <button onClick={handleUpdateList} className={styles.submitButton}>Güncelle</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paylaşım */}
      <AnimatePresence>
        {isShareModalOpen && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modal} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <h2>Listeyi Paylaş</h2>
              <div className={styles.shareButtons}>
                <button onClick={() => handleShare('whatsapp')} className={styles.whatsappButton}>WhatsApp</button>
                <button onClick={() => handleShare('facebook')} className={styles.facebookButton}>Facebook</button>
                <button onClick={() => handleShare('instagram')} className={styles.instagramButton}>Instagram</button>
              </div>
              <div className={styles.qrCodeSection}>
                <div className={styles.qrCodeWrapper}>
                  <QRCodeCanvas
                    id="qr-code"
                    value={shareUrl}
                    size={1024}
                    level="H"
                    includeMargin={true}
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
                    style={{ width: '150px', height: '150px' }}
                  />
                </div>
                <p>QR Kodu Tarayın</p>
                <div className={styles.qrDownloadButtons}>
                  <button onClick={() => handleDownloadQR('png')} className={styles.downloadBtn}><i className="fas fa-download"></i> PNG İndir</button>
                  <button onClick={() => handleDownloadQR('jpg')} className={styles.downloadBtn}><i className="fas fa-download"></i> JPG İndir</button>
                </div>
              </div>
              <div className={styles.copyLinkSection}>
                <input type="text" value={shareUrl} readOnly className={styles.linkInput} />
                <button onClick={handleCopyLink} className={styles.copyBtn}>Kopyala</button>
              </div>
              <button onClick={() => setIsShareModalOpen(false)} className={styles.closeBtn}>Kapat</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} />
    </div>
  );
};

export default FavoritesList;
