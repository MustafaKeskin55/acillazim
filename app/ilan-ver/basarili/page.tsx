import SuccessPage from '@/Page/CreateListing/components/SuccessPage/SuccessPage';
import ProtectedRoute from '@/components/routes/ProtectedRoute';

export default function BasariliPage() {
  return (
    <ProtectedRoute>
      <SuccessPage />
    </ProtectedRoute>
  );
}
