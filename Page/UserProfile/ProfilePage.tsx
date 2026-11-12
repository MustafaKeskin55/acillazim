"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import './ProfilePage.css';
import { toast } from 'react-toastify';

import ProfileHeader from './components/ProfileHeader/ProfileHeader';
import ProfileTabs from './components/ProfileTabs/ProfileTabs';
import UserInfo from './components/UserInfo/UserInfo';
import FilterBar from './components/ListingDisplay/FilterBar';
import ReviewList from './components/Reviews/ReviewList';
import UserIlanlar from './components/UserIlanlar/UserIlanlar';
import AdBanner from '@/components/AdvertisementBanner/AdBanner';
import ComplaintModal from '@/components/ComplaintModal/ComplaintModal';

import profileService from '@/services/profile/profileService';
import reviewService from '@/services/profile/reviewService';

interface ListingFilters { status: string; category: string; sort: string; }
interface ReviewFilters { rating: string; sort: string; }
interface ReviewResponse {
  success: boolean; message?: string;
  data?: { stats?: unknown; reviews?: unknown[] };
}

const ProfilePage: React.FC = () => {
  const params = useParams();
  const [searchParams] = useSearchParams() as unknown as [URLSearchParams];
  const userId = params?.userId as string | undefined;

  const [activeTab, setActiveTab] = useState<string>('listings');
  const [viewMode, setViewMode] = useState<string>('grid');
  const [profile, setProfile] = useState<unknown>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [reviewStats, setReviewStats] = useState<unknown>(null);
  const [reviewsEmpty, setReviewsEmpty] = useState<boolean>(false);
  const [reviews, setReviews] = useState<unknown[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState<boolean>(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [listingCount, setListingCount] = useState<number>(0);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [ilanFilters, setIlanFilters] = useState<ListingFilters>({ status: 'active', category: 'all', sort: 'date_desc' });
  const [reviewFilters, setReviewFilters] = useState<ReviewFilters>({ rating: '', sort: 'date_desc' });
  const [complaintModalOpen, setComplaintModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && ['listings', 'reviews', 'about'].includes(tabParam)) setActiveTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setIsProfileLoading(true);
      try {
        const svc = profileService as { fetchUserProfile: (id: string) => Promise<{ success: boolean; data?: { profile: unknown; stats: Record<string, unknown> }; message?: string }> };
        const response = await svc.fetchUserProfile(userId);
        if (response.success && response.data) {
          setProfile(response.data.profile);
          setStats(response.data.stats);
          if (listingCount === 0) {
            const lc = (response.data.stats?.listingCounts as Record<string, number>)?.active || 0;
            setListingCount(lc);
          }
        } else { toast.error(response.message || 'Profil bilgileri yüklenirken bir hata oluştu'); }
      } catch (err) { toast.error((err as Error).message || 'Profil yüklenirken bir hata oluştu'); }
      finally { setIsProfileLoading(false); }
    })();
  }, [userId]);

  const loadUserReviews = async (uid: string, filters: ReviewFilters = { rating: '', sort: 'date_desc' }) => {
    try {
      setIsReviewsLoading(true); setReviewsError(null);
      const svc = reviewService as { getUserReviews: (id: string, f: ReviewFilters) => Promise<ReviewResponse> };
      const response = await svc.getUserReviews(uid, filters);
      if (response.success && response.data) {
        setReviewStats(response.data.stats || {});
        setReviews(response.data.reviews || []);
        setReviewsEmpty(!response.data.reviews || response.data.reviews.length === 0);
      } else { setReviewsEmpty(true); setReviews([]); setReviewsError(response.message || 'Değerlendirmeler yüklenemedi'); }
    } catch (err) { setReviewsEmpty(true); setReviews([]); setReviewsError((err as Error).message || 'Hata oluştu'); }
    finally { setIsReviewsLoading(false); }
  };

  useEffect(() => {
    if (userId && activeTab === 'reviews') loadUserReviews(userId, reviewFilters);
  }, [userId, activeTab, reviewFilters]);

  const currentStats = useMemo(() => {
    if (!stats) return null;
    return { ...stats, listingCounts: { ...((stats.listingCounts as object) || {}), active: listingCount } };
  }, [stats, listingCount]);

  return (
    <div className="profile-page">
      <div className="profile-page-container">
        <ProfileHeader profile={profile} stats={currentStats} isLoading={isProfileLoading} onReportClick={() => setComplaintModalOpen(true)} />
        <ProfileTabs onTabChange={setActiveTab} activeTab={activeTab} stats={currentStats} />

        {activeTab === 'listings' && (
          <div className="profile-tab-content">
            <FilterBar filters={ilanFilters} onFilterChange={(f: Partial<ListingFilters>) => setIlanFilters((p) => ({ ...p, ...f }))} viewMode={viewMode} onViewModeChange={setViewMode} />
            <UserIlanlar userId={userId} filters={ilanFilters} onFilterChange={(f: Partial<ListingFilters>) => setIlanFilters((p) => ({ ...p, ...f }))} viewMode={viewMode} onListingCountChange={setListingCount} />
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="profile-tab-content">
            <ReviewList reviews={reviews} stats={reviewStats} isLoading={isReviewsLoading} isEmpty={reviewsEmpty} errorMessage={reviewsError} onFilterChange={setReviewFilters} filters={reviewFilters} userId={userId} />
          </div>
        )}

        {activeTab === 'about' && (
          <div className="profile-tab-content"><UserInfo userId={userId} /></div>
        )}

        <div className="profile-vitrin-bottom">
          <AdBanner pageId={4} sectionCode="PF1" useSlider={false} limit={1} />
        </div>
      </div>

      <ComplaintModal
        isOpen={complaintModalOpen}
        onClose={() => setComplaintModalOpen(false)}
        tip="kullanici"
        hedefId={userId || ''}
        hedefAdi={(profile as Record<string, unknown>)?.name as string || ''}
      />
    </div>
  );
};

export default ProfilePage;
