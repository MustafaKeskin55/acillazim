"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHeart, FaTimes, FaSpinner, FaPlus, FaCheck } from 'react-icons/fa';
import './FavoriteListSelectModal.css';
import favoriteService from '@/services/favorites/favoriteService';

export interface FavoriteList {
  id: string | number;
  name: string;
  isDefault?: boolean;
  itemCount?: number;
}

export interface FavoriteListSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (listId: string | number, listName?: string) => void;
  listingId?: string | number;
  listingData?: unknown;
}

const FavoriteListSelectModal: React.FC<FavoriteListSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  listingId,
  listingData,
}) => {
  const [lists, setLists] = useState<FavoriteList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListId, setSelectedListId] = useState<string | number | null>(null);

  // Yeni liste oluşturma durumu
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadLists();
      setIsCreating(false);
      setNewListName('');
      setCreateError(null);
    }
  }, [isOpen]);

  const loadLists = async () => {
    try {
      setLoading(true);
      const response = await (
        favoriteService as {
          getUserLists: () => Promise<{ success: boolean; data: FavoriteList[] }>;
        }
      ).getUserLists();

      if (response && response.success && Array.isArray(response.data)) {
        setLists(response.data);
        const defaultList = response.data.find((list) => list.isDefault);
        if (defaultList) {
          setSelectedListId(defaultList.id);
        } else if (response.data.length > 0) {
          setSelectedListId(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Liste yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectList = (listId: string | number) => {
    setSelectedListId(listId);
  };

  const handleCreateList = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newListName.trim();
    if (!name || name.length < 2) {
      setCreateError('Liste adı en az 2 karakter olmalıdır.');
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError(null);
      const res = await favoriteService.createList(name);
      if (res && res.success && res.data) {
        const created: FavoriteList = res.data;
        setLists((prev) => [...prev, created]);
        setSelectedListId(created.id);
        setNewListName('');
        setIsCreating(false);
      } else {
        setCreateError(res?.message || 'Liste oluşturulamadı.');
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Liste oluşturulurken hata oluştu.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedListId) {
      const selectedList = lists.find((l) => String(l.id) === String(selectedListId));
      onSelect(selectedListId, selectedList?.name);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedListId(null);
    setIsCreating(false);
    setNewListName('');
    setCreateError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="favorite-list-select-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="favorite-list-select-modal"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="favorite-list-select-header">
            <h2>Favori Listeye Ekle</h2>
            <button
              className="favorite-list-select-close"
              onClick={handleClose}
              aria-label="Kapat"
            >
              <FaTimes />
            </button>
          </div>

          <div className="favorite-list-select-content">
            {loading ? (
              <div className="favorite-list-select-loading">
                <FaSpinner className="fa-spin" />
                <p>Listeler yükleniyor...</p>
              </div>
            ) : (
              <>
                <p className="favorite-list-select-description">
                  Bu ilanı hangi favori listenize eklemek istiyorsunuz?
                </p>

                <div className="favorite-list-select-lists">
                  {lists.map((list) => (
                    <div
                      key={String(list.id)}
                      className={`favorite-list-select-item ${
                        String(selectedListId) === String(list.id) ? 'selected' : ''
                      }`}
                      onClick={() => handleSelectList(list.id)}
                    >
                      <div className="favorite-list-select-radio">
                        <input
                          type="radio"
                          name="favoriteList"
                          value={String(list.id)}
                          checked={String(selectedListId) === String(list.id)}
                          onChange={() => handleSelectList(list.id)}
                        />
                      </div>
                      <div className="favorite-list-select-info">
                        <h3>
                          {list.name}
                          {list.isDefault && <span className="default-badge">Varsayılan</span>}
                        </h3>
                        <p>{list.itemCount || 0} ilan</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Yeni Liste Oluşturma Bölümü */}
                <div className="favorite-list-create-wrapper">
                  {!isCreating ? (
                    <button
                      type="button"
                      className="favorite-list-new-btn"
                      onClick={() => setIsCreating(true)}
                    >
                      <FaPlus size={12} />
                      <span>Yeni Liste Oluştur</span>
                    </button>
                  ) : (
                    <form className="favorite-list-create-form" onSubmit={handleCreateList}>
                      <input
                        type="text"
                        className="favorite-list-create-input"
                        placeholder="Yeni liste adı (örn: Yazlıklar)"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        autoFocus
                        disabled={createLoading}
                        maxLength={50}
                      />
                      <div className="favorite-list-create-actions">
                        <button
                          type="submit"
                          className="favorite-list-create-submit"
                          disabled={createLoading || newListName.trim().length < 2}
                        >
                          {createLoading ? <FaSpinner className="fa-spin" /> : <FaCheck />}
                          <span>Oluştur</span>
                        </button>
                        <button
                          type="button"
                          className="favorite-list-create-cancel"
                          onClick={() => {
                            setIsCreating(false);
                            setNewListName('');
                            setCreateError(null);
                          }}
                        >
                          Vazgeç
                        </button>
                      </div>
                      {createError && (
                        <p className="favorite-list-create-error">{createError}</p>
                      )}
                    </form>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="favorite-list-select-footer">
            <button className="favorite-list-select-btn cancel" onClick={handleClose}>
              İptal
            </button>
            <button
              className="favorite-list-select-btn confirm"
              onClick={handleConfirm}
              disabled={!selectedListId || loading}
            >
              <FaHeart />
              <span>Ekle</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FavoriteListSelectModal;
