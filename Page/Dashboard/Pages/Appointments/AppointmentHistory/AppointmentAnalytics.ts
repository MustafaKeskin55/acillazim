import { format, parseISO, isAfter, startOfMonth, endOfMonth, addMonths, isSameMonth } from "date-fns";
import { tr } from "date-fns/locale";

/** Randevu analizleri — acillazim-FE-tasarim ile aynı davranış (TS) */
export const AppointmentAnalytics = {
  calculateTotalEarnings: (appointments: Array<{ status: string; price: string | number }>, statuses: string[]): number => {
    return appointments
      .filter((app) => statuses.includes(app.status))
      .reduce((sum, app) => sum + parseFloat(String(app.price)), 0);
  },

  calculateLostEarnings: (appointments: Array<{ status: string; price: string | number }>, rejectedStatus: string): number => {
    return appointments
      .filter((app) => app.status === rejectedStatus)
      .reduce((sum, app) => sum + parseFloat(String(app.price)), 0);
  },

  calculateRejectionRate: (appointments: Array<{ status: string }>, rejectedStatus: string): number => {
    if (appointments.length === 0) return 0;
    const rejectedCount = appointments.filter((app) => app.status === rejectedStatus).length;
    return Math.round((rejectedCount / appointments.length) * 100);
  },

  countAppointmentsByStatus: (appointments: Array<{ status: string }>, status: string): number => {
    return appointments.filter((app) => app.status === status).length;
  },

  getMonthlyEarnings: (
    appointments: Array<{ date: string; status: string; price: string | number }>,
    months: number,
    includedStatuses: string[],
    rejectedStatus: string
  ): Array<{ name: string; kazanç: number; kayıp: number; count: number; rate: number }> => {
    const today = new Date();
    const results: Array<{ name: string; kazanç: number; kayıp: number; count: number; rate: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const currentMonth = startOfMonth(addMonths(today, -i));
      endOfMonth(currentMonth);

      const monthAppointments = appointments.filter((app) => isSameMonth(parseISO(app.date), currentMonth));
      const monthlyCompletedApps = monthAppointments.filter((app) => includedStatuses.includes(app.status));
      const monthlyRejectedApps = monthAppointments.filter((app) => app.status === rejectedStatus);

      results.push({
        name: format(currentMonth, "MMM", { locale: tr }),
        kazanç: monthlyCompletedApps.reduce((sum, app) => sum + parseFloat(String(app.price)), 0),
        kayıp: monthlyRejectedApps.reduce((sum, app) => sum + parseFloat(String(app.price)), 0),
        count: monthAppointments.length,
        rate: monthAppointments.length > 0 ? Math.round((monthlyCompletedApps.length / monthAppointments.length) * 100) : 0,
      });
    }

    return results;
  },

  getStatusDistribution: (
    appointments: Array<{ status: string }>,
    statusLabels: Record<string, string>
  ): Array<{ name: string; value: number }> => {
    const statusCounts: Record<string, number> = {};
    Object.keys(statusLabels).forEach((status) => {
      statusCounts[status] = 0;
    });
    appointments.forEach((app) => {
      if (statusCounts[app.status] !== undefined) {
        statusCounts[app.status]++;
      }
    });
    return Object.keys(statusLabels)
      .filter((status) => statusCounts[status] > 0)
      .map((status) => ({
        name: statusLabels[status],
        value: statusCounts[status],
      }));
  },

  filterAppointments: <T extends { date: string; title: string; client: { name: string }; status: string }>(
    appointments: T[],
    filters: {
      searchTerm?: string;
      statusFilter?: string;
      dateRange?: string;
      pastOnly?: boolean;
    }
  ): T[] => {
    const { searchTerm, statusFilter, dateRange, pastOnly } = filters;
    const today = new Date();

    return appointments.filter((appointment) => {
      const appointmentDate = parseISO(appointment.date);
      if (pastOnly && isAfter(appointmentDate, today)) return false;

      const matchesSearch =
        !searchTerm ||
        appointment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.client.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;

      let matchesDateRange = true;
      if (dateRange && dateRange !== "all") {
        const monthsAgo = parseInt(dateRange, 10);
        const rangeDate = addMonths(today, -monthsAgo);
        matchesDateRange = isAfter(appointmentDate, rangeDate) || isSameMonth(appointmentDate, rangeDate);
      }

      return matchesSearch && matchesStatus && matchesDateRange;
    });
  },

};

export const statusLabels: Record<string, string> = {
  completed: "Tamamlandı",
  confirmed: "Onaylandı",
  in_progress: "İşlemde",
  pending: "Bekliyor",
  rejected: "Reddedildi",
  cancelled: "İptal Edildi",
  disputed: "İtiraz Edildi",
  reschedule_requested: "Tarih Değişikliği Talebi",
};
