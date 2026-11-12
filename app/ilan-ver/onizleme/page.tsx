import PreviewPage from '@/Page/CreateListing/components/PreviewPage/PreviewPage';
import ProtectedRoute from '@/components/routes/ProtectedRoute';

export default function OnizlemePage() {
  return (
    <ProtectedRoute>
      <PreviewPage />
    </ProtectedRoute>
  );
}
