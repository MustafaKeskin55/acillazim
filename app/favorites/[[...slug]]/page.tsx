'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FaHeart, 
  FaExclamationCircle,
  FaHome
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import favoriteService, { PublicSharedListResponse } from '@/services/favorites/favoriteService';
import ProductCard from '@/components/ProductCard/ProductCard';
import styles from './SharedFavorites.module.css';

export default function SharedFavoritesCatchAllPage() {
  const params = useParams();
  const router = useRouter();

  // Extract token from params.slug
  // slug can be: undefined, ['fav_123'], ['shared', 'share_123'], ['shared', 'fav_123']
  const token = useMemo(() => {
    const slug = params?.slug;
    if (!slug) return '';
    if (Array.isArray(slug)) {
      if (slug.length === 0) return '';
      return slug[slug.length - 1];
    }
    return String(slug);
  }, [params?.slug]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicSharedListResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      router.push('/dashboard/favoriler');
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    favoriteService.getSharedList(token)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.message || 'Paylaşılan liste bulunamadı veya süresi dolmuş.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Paylaşılan liste yüklenemedi:', err);
        setError('Liste yüklenirken bir bağlantı hatası oluştu.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, router]);

  const handleCopy = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      toast.success('Bağlantı panoya kopyalandı!');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleWhatsApp = () => {
    if (typeof window === 'undefined' || !data) return;
    const msg = encodeURIComponent(`${data.listName} - Acillazım Favori Listesi: ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.pulseIcon}>
            <FaHeart />
          </div>
          <p className={styles.loadingText}>Paylaşılan favori listesi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.errorCard}>
            <div className={styles.errorIconWrap}>
              <FaExclamationCircle />
            </div>
            <h1 className={styles.errorTitle}>Paylaşım Bulunamadı</h1>
            <p className={styles.errorDesc}>
              {error || 'Aradığınız favori listesi bulunamadı, silinmiş veya paylaşım süresi dolmuş olabilir.'}
            </p>
            <Link href="/" className={styles.actionBtnPrimary}>
              <FaHome /> Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Format date helper
  const formattedDate = data.sharedAt 
    ? new Date(data.sharedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className={styles.container}>
      <Toaster position="top-center" />
      <div className={styles.inner}>
        {/* Acillazım 2026 Kurumsal Liste Başlığı */}
        <div className={styles.headerCard}>
          <div className={styles.headerInfo}>
            <div className={styles.titleRow}>
              <div className={styles.titleIconBox}>
                <FaHeart className={styles.heartIcon} />
              </div>
              <div className={styles.titleTextGroup}>
                <div className={styles.titleTopLine}>
                  <h1 className={styles.pageTitle}>{data.listName || 'Favori İlanlar'}</h1>
                  <span className={styles.countBadge}>
                    {data.items?.length || 0} İlan
                  </span>
                </div>
                <div className={styles.metaRow}>
                  {data.sharedBy && (
                    <span className={styles.metaText}>
                      Paylaşan: <strong>{data.sharedBy}</strong>
                    </span>
                  )}
                  {data.sharedBy && formattedDate && <span className={styles.metaDot}>•</span>}
                  {formattedDate && (
                    <span className={styles.metaText}>{formattedDate}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {data.items && data.items.length > 0 ? (
          <div className={styles.listingsGrid}>
            {data.items.map((it, idx) => {
              const listing = it.listing;
              if (!listing) return null;
              
              const rawData = (it as Record<string, unknown>).listingData as Record<string, unknown> | undefined;
              
              const productProp = {
                ...listing,
                id: listing.id,
                ilan_id: listing.id,
                title: listing.title,
                price: listing.price,
                fiyat: listing.price,
                currency: listing.currency || 'TRY',
                images: listing.images?.map(img => (typeof img === 'string' ? img : img.url)) || [],
                image: (typeof listing.images?.[0] === 'string' ? listing.images[0] : listing.images?.[0]?.url) || undefined,
                location: listing.location,
                province: (listing.location?.province || rawData?.province || rawData?.il) as string | undefined,
                district: (listing.location?.district || rawData?.district || rawData?.ilce) as string | undefined,
                il: (listing.location?.province || rawData?.province || rawData?.il) as string | undefined,
                ilce: (listing.location?.district || rawData?.district || rawData?.ilce) as string | undefined,
                categoryName: (listing.category?.name || rawData?.categoryName || rawData?.category || rawData?.kategori) as string | undefined,
                category: (listing.category?.name || rawData?.categoryName || rawData?.category || rawData?.kategori) as string | undefined,
                isActive: listing.isActive !== false,
              };

              return (
                <ProductCard 
                  key={listing.id ? `listing-${listing.id}` : `item-${idx}`} 
                  product={productProp as Record<string, unknown>} 
                />
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>
              <FaHeart />
            </div>
            <h3>Bu Listede Henüz İlan Bulunmuyor</h3>
            <p>Liste sahibi henüz bu listeye bir ilan eklememiş veya ilanlar yayından kaldırılmış olabilir.</p>
          </div>
        )}
      </div>
    </div>
  );
}
