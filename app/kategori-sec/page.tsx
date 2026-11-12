import { Metadata } from 'next';
import CategorySelection from '@/Page/CreateListing/components/CategorySelection2/CategorySelection';
import ProtectedRoute from '@/components/routes/ProtectedRoute';

export const metadata: Metadata = {
  title: 'Kategori Seçimi | AcilLazım',
  description: 'İlanınız için kategori seçin.',
};

export default function KategoriSecPage() {
  return (
    <ProtectedRoute>
      <CategorySelection />
    </ProtectedRoute>
  );
}
