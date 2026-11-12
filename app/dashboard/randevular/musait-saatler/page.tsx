import DashboardLayout from '@/Page/Dashboard/Layout/DashboardLayout';
import AppointmentsPage from '@/Page/Dashboard/Pages/Appointments/AppointmentsPage';
import AvailableHoursPage from '@/Page/Dashboard/Pages/Appointments/AvailableHours/AvailableHoursPage';

export default function MusaitSaatlerPage() {
  return (
    <DashboardLayout>
      <AppointmentsPage>
        <AvailableHoursPage />
      </AppointmentsPage>
    </DashboardLayout>
  );
}
