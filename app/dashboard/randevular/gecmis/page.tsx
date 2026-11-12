import DashboardLayout from '@/Page/Dashboard/Layout/DashboardLayout';
import AppointmentsPage from '@/Page/Dashboard/Pages/Appointments/AppointmentsPage';
import AppointmentHistoryPage from '@/Page/Dashboard/Pages/Appointments/AppointmentHistory/AppointmentHistoryPage';

export default function RandevuGecmisPage() {
  return (
    <DashboardLayout>
      <AppointmentsPage>
        <AppointmentHistoryPage />
      </AppointmentsPage>
    </DashboardLayout>
  );
}
