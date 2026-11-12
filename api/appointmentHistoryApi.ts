/**
 * Randevu geçmişi ve analizi için API servisi
 *
 * Canlı BE kullanır — mock veri (eski data/appointmentData.js) yoktur.
 * Kaynak: getProviderAppointments() → GET /api/v1/appointments/provider (Bearer token ile).
 */
import { getProviderAppointments, type ProviderAppointmentRecord } from '@/services/appointment/appointmentService';

interface AppointmentFilters {
    startDate?: string;
    endDate?: string;
    status?: string;
    searchTerm?: string;
}

interface AppointmentStats {
    totalAppointments: number;
    completed: number;
    rejected: number;
    rejectionRate: number;
    totalRevenue: number;
    lostRevenue: number;
    period: string;
}

interface MonthlyEarning {
    month: string;
    kazanç: number;
    kayıp: number;
}

const toPrice = (price: string | number): number => {
    const value = typeof price === 'number' ? price : parseFloat(price);
    return Number.isFinite(value) ? value : 0;
};

const filterByDateAndSearch = (
    appointments: ProviderAppointmentRecord[],
    filters: AppointmentFilters
): ProviderAppointmentRecord[] => {
    const { startDate, endDate, status, searchTerm } = filters;

    return appointments.filter((app) => {
        if (status && status !== 'all' && app.status !== status) return false;

        if (startDate && new Date(app.date) < new Date(startDate)) return false;
        if (endDate && new Date(app.date) > new Date(endDate)) return false;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const haystack = `${app.title} ${app.client?.name ?? ''} ${app.service?.title ?? ''}`.toLowerCase();
            if (!haystack.includes(term)) return false;
        }

        return true;
    });
};

const periodStartDate = (period: string): Date => {
    const now = new Date();
    switch (period) {
        case 'week':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'year':
            return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        case 'month':
        default:
            return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
};

/**
 * Randevu geçmişi ve analizi için API servisi
 */
export const appointmentHistoryApi = {
    /**
     * Randevu geçmişini getir
     * @param _token - Kullanılmıyor (auth token appointmentService içinde localStorage'dan okunur, geriye dönük uyumluluk için parametre korunuyor)
     * @param filters - Filtre parametreleri
     * @returns Filtrelenmiş randevu geçmişi
     */
    getAppointmentHistory: async (_token: string, filters: AppointmentFilters = {}): Promise<ProviderAppointmentRecord[]> => {
        try {
            const appointments = await getProviderAppointments();
            return filterByDateAndSearch(appointments, filters);
        } catch (error) {
            console.error('Randevu geçmişi alınırken hata:', error);
            throw new Error('Randevu geçmişi yüklenirken bir sorun oluştu');
        }
    },

    /**
     * Randevu istatistiklerini getir
     * @param _token - Kullanılmıyor (bkz. getAppointmentHistory)
     * @param period - İstatistik periyodu (week, month, year)
     * @returns Randevu istatistikleri
     */
    getAppointmentStats: async (_token: string, period: string = 'month'): Promise<AppointmentStats> => {
        try {
            const allAppointments = await getProviderAppointments();
            const since = periodStartDate(period);
            const appointments = allAppointments.filter((app) => new Date(app.date) >= since);

            const completed = appointments.filter((app) => app.status === 'completed').length;
            const rejected = appointments.filter((app) => app.status === 'rejected').length;
            const totalRevenue = appointments
                .filter((app) => ['completed', 'confirmed'].includes(app.status))
                .reduce((sum, app) => sum + toPrice(app.price), 0);
            const lostRevenue = appointments
                .filter((app) => app.status === 'rejected')
                .reduce((sum, app) => sum + toPrice(app.price), 0);

            return {
                totalAppointments: appointments.length,
                completed,
                rejected,
                rejectionRate: appointments.length > 0 ? Math.round((rejected / appointments.length) * 100) : 0,
                totalRevenue,
                lostRevenue,
                period
            };
        } catch (error) {
            console.error('Randevu istatistikleri alınırken hata:', error);
            throw new Error('Randevu istatistikleri yüklenirken bir sorun oluştu');
        }
    },

    /**
     * Aylık gelir verilerini getir
     * @param _token - Kullanılmıyor (bkz. getAppointmentHistory)
     * @param months - İstenilen ay sayısı
     * @returns Aylık gelir verileri
     */
    getMonthlyEarnings: async (_token: string, months: number = 6): Promise<MonthlyEarning[]> => {
        try {
            const appointments = await getProviderAppointments();
            const today = new Date();
            const results: MonthlyEarning[] = [];

            for (let i = months - 1; i >= 0; i--) {
                const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthLabel = monthDate.toLocaleDateString('tr-TR', { month: 'short' });

                const monthAppointments = appointments.filter((app) => {
                    const d = new Date(app.date);
                    return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth();
                });

                const kazanc = monthAppointments
                    .filter((app) => ['completed', 'confirmed'].includes(app.status))
                    .reduce((sum, app) => sum + toPrice(app.price), 0);
                const kayip = monthAppointments
                    .filter((app) => app.status === 'rejected')
                    .reduce((sum, app) => sum + toPrice(app.price), 0);

                results.push({ month: monthLabel, kazanç: kazanc, kayıp: kayip });
            }

            return results;
        } catch (error) {
            console.error('Aylık gelir verileri alınırken hata:', error);
            throw new Error('Aylık gelir verileri yüklenirken bir sorun oluştu');
        }
    }
};
