import { Metadata } from 'next';
import CreateListing from '@/Page/CreateListing/components/ilan-ver/Create-a-listing';
import ProtectedRoute from '@/components/routes/ProtectedRoute';

export const metadata: Metadata = {
  title: 'İlan Ver | AcilLazım',
  description: 'Ücretsiz ilan verin. Kategori seçin ve ilanınızı yayınlayın.',
};

export default function IlanVerPage() {
  return (
    <ProtectedRoute>
      <CreateListing />
    </ProtectedRoute>
  );
}
