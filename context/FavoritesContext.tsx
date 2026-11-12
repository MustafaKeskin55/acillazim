'use client';

/**
 * Favoriler Context
 *
 * Sorun: Ana sayfada/ilan listelerinde onlarca ProductCard render edildiğinde,
 * her kart kendi favori durumunu ayrı ayrı GET /favorites/status/{id} isteğiyle
 * kontrol ediyordu (N kart = N istek). Bu context, kullanıcının favori
 * ilanlarını TEK bir istekle (GET /favorites/user/listings) yükleyip
 * bellekte paylaşır; kartlar artık ağ isteği yapmadan üyelik kontrolü yapar.
 *
 * Ayrıca merkezi FavoriteListSelectModal bileşenini barındırarak, kullanıcının
 * ilanı hangi favori listesine ekleyeceğini seçmesini sağlar.
 */

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import favoriteService from '@/services/favorites/favoriteService';
import { useAuth } from '@/context/AuthContext';
import FavoriteListSelectModal from '@/components/FavoritesList/FavoriteListSelectModal/FavoriteListSelectModal';

interface FavoritesContextType {
  isFavorite: (listingId: string | number | undefined | null) => boolean;
  isReady: boolean;
  refresh: () => Promise<void>;
  setFavorite: (listingId: string | number, value: boolean) => void;
  openFavoriteModal: (listingId: string | number, listingData?: unknown) => void;
  closeFavoriteModal: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isReady, setIsReady] = useState(false);
  const requestIdRef = useRef(0);

  // Merkezi Liste Seçim Modalı Durumu
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    listingId?: string | number;
    listingData?: unknown;
  }>({ isOpen: false });

  const openFavoriteModal = useCallback((listingId: string | number, listingData?: unknown) => {
    setModalState({ isOpen: true, listingId, listingData });
  }, []);

  const closeFavoriteModal = useCallback(() => {
    setModalState({ isOpen: false });
  }, []);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    // 1. LocalStorage'dan mevcut favorileri oku (misafir veya oturum fark etmeksizin)
    const localIds = new Set<string>();
    if (typeof window !== 'undefined') {
      try {
        const rawLocal = localStorage.getItem('acillazim_favorite_items');
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              const id = item?.listingId ?? item?.listing_id ?? item?.id;
              if (id !== undefined && id !== null) localIds.add(String(id));
            });
          }
        }
      } catch (e) {
        console.warn('[FavoritesContext] LocalStorage okuma hatası:', e);
      }
    }

    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      setIsReady(true);
      return;
    }

    try {
      const response = await favoriteService.getUserFavoriteListings();
      if (requestId !== requestIdRef.current) return; // eskimiş yanıt

      if (response.success && Array.isArray(response.data)) {
        setFavoriteIds(new Set(response.data.map((item) => String(item.listingId))));
      } else {
        setFavoriteIds(localIds);
      }
    } catch (error) {
      console.error('[FavoritesContext] Favoriler yüklenemedi:', error);
      setFavoriteIds(localIds);
    } finally {
      if (requestId === requestIdRef.current) setIsReady(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setIsReady(false);
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleUpdate = (e: CustomEvent<{ listingId?: string | number; isFavorite?: boolean }>) => {
      const { listingId, isFavorite } = e.detail || {};
      if (listingId === undefined || listingId === null) return;
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        const key = String(listingId);
        if (isFavorite) next.add(key);
        else next.delete(key);
        return next;
      });
    };

    const handleOpenModal = (e: CustomEvent<{ listingId?: string | number; listingData?: unknown }>) => {
      const { listingId, listingData } = e.detail || {};
      if (listingId) {
        openFavoriteModal(listingId, listingData);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'acillazim_favorite_items') refresh();
    };

    window.addEventListener('acillazim-favorite-update', handleUpdate as EventListener);
    window.addEventListener('acillazim-open-favorite-modal', handleOpenModal as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('acillazim-favorite-update', handleUpdate as EventListener);
      window.removeEventListener('acillazim-open-favorite-modal', handleOpenModal as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refresh, openFavoriteModal]);

  const isFavorite = useCallback(
    (listingId: string | number | undefined | null) => {
      if (listingId === undefined || listingId === null) return false;
      return favoriteIds.has(String(listingId));
    },
    [favoriteIds]
  );

  const setFavorite = useCallback((listingId: string | number, value: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      const key = String(listingId);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const handleModalSelect = async (listId: string | number, listName?: string) => {
    if (!modalState.listingId) return;
    const { listingId, listingData } = modalState;

    // 1. İyimser arayüz güncellemesi: Kalbi hemen kırmızı yap
    setFavorite(listingId, true);
    window.dispatchEvent(
      new CustomEvent('acillazim-favorite-update', {
        detail: { listingId, isFavorite: true, listId, listName }
      })
    );

    // 2. Arka planda servisi çağırıp hedef listeye kaydet
    try {
      await favoriteService.addToFavorites(listingId, listingData, String(listId));
      await refresh();
    } catch (err) {
      console.warn('[FavoritesContext] Listeye ekleme servisi hatası:', err);
    } finally {
      closeFavoriteModal();
    }
  };

  const values: FavoritesContextType = {
    isFavorite,
    isReady,
    refresh,
    setFavorite,
    openFavoriteModal,
    closeFavoriteModal,
  };

  return (
    <FavoritesContext.Provider value={values}>
      {children}
      {modalState.isOpen && (
        <FavoriteListSelectModal
          isOpen={modalState.isOpen}
          onClose={closeFavoriteModal}
          onSelect={handleModalSelect}
          listingId={modalState.listingId}
          listingData={modalState.listingData}
        />
      )}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites hook FavoritesProvider içinde kullanılmalıdır!');
  }
  return context;
};

export default FavoritesContext;
