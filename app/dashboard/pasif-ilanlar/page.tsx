import DashboardLayout from '@/Page/Dashboard/Layout/DashboardLayout';
import InactiveListings from '@/Page/Dashboard/Pages/Listings/InactiveListings/InactiveListings';

export default function PasifIlanlarPage() {
  return (
    <DashboardLayout>
      <InactiveListings />
    </DashboardLayout>
  );
}
