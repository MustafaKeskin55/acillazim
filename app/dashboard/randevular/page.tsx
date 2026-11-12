import DashboardLayout from '@/Page/Dashboard/Layout/DashboardLayout';
import AppointmentsPage from '@/Page/Dashboard/Pages/Appointments/AppointmentsPage';
import MyAppointments from '@/Page/Dashboard/Pages/Appointments/MyAppointments/MyAppointments';

export default function RandevularPage() {
  return (
    <DashboardLayout>
      <AppointmentsPage>
        <MyAppointments />
      </AppointmentsPage>
    </DashboardLayout>
  );
}
