import IlanForm from '@/Page/CreateListing/components/IlanForm/IlanForm';
import ProtectedRoute from '@/components/routes/ProtectedRoute';

export default function IlanFormPage() {
  return (
    <ProtectedRoute>
      <IlanForm />
    </ProtectedRoute>
  );
}
