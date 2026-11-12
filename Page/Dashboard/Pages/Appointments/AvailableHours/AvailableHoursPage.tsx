"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaClock,
  FaUser,
  FaChartBar,
  FaChartPie,
  FaChevronLeft,
  FaChevronRight,
  FaBriefcase,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaRegCalendarAlt,
  FaBuilding,
  FaFilter,
} from 'react-icons/fa';
import './AvailableHoursPage.css';
import Loader from '@/components/Loader/Loader';
import EmptyStateOnboarding from '../../../Components/EmptyStateOnboarding/EmptyStateOnboarding';
import { NO_SERVICE_FOR_HOURS_PRESET } from '../../../Components/EmptyStateOnboarding/presets';
import { getProviderAppointments, type ProviderAppointmentRecord } from '@/services/appointment/appointmentService';
import { fetchMyServicesDashboard } from '@/services/serviceAreas/myServicesDashboardService';
import { listingEditAPI, type WorkingHoursMap, type WorkingHoursDay } from '@/services/serviceAreas/serviceEditApi';

/** Acillazım Uyumlu Ara Renk Paleti (İndigo-Lavanta, Lagün Teal, Sıcak Turuncu, Kehribar, Adaçayı, Mürdüm) */
const CORPORATE_PALETTE = [
  '#6366f1', // İndigo / Lavanta Ara Tonu
  '#0d9488', // Okyanus Turkuaz / Lagün Teal
  '#f97316', // Sıcak Mercan Turuncusu
  '#f59e0b', // Şampanya / Kehribar
  '#10b981', // Adaçayı Nane Yeşili
  '#db2777', // Mürdüm / Gül Kurusu
  '#3b82f6', // Safir Mavi
];

const DEFAULT_WORKING_HOURS = Array.from({ length: 10 }, (_, i) => i + 8);
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getDayHourRange(dayHours?: any): number[] {
  if (!dayHours) return [];
  const active = dayHours.isActive !== undefined ? dayHours.isActive : (dayHours.is_active !== undefined ? dayHours.is_active : true);
  if (!active) return [];
  const startHour = parseInt(String(dayHours.start || '08:00').slice(0, 2), 10);
  const endHour = parseInt(String(dayHours.end || '18:00').slice(0, 2), 10);
  if (Number.isNaN(startHour) || Number.isNaN(endHour) || endHour <= startHour) return [];
  return Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
}

function getEffectiveDayHours(hours: WorkingHoursMap | null, dayIndex: number): number[] {
  if (!hours || Object.keys(hours).length === 0) {
    return DEFAULT_WORKING_HOURS;
  }
  const dayKey = DAY_KEYS[dayIndex];
  const dayConfig = hours[dayKey];
  if (!dayConfig) {
    return dayIndex === 0 ? [] : DEFAULT_WORKING_HOURS;
  }
  return getDayHourRange(dayConfig);
}

type Appointment = ProviderAppointmentRecord;
interface HourSlot {
  available: boolean;
  appointment: Appointment | null;
}
interface HoursMap {
  [dateKey: string]: { [hour: number]: HourSlot };
}
interface WorkStats {
  totalDays: number;
  busyDays: number;
  totalAppointments: number;
  avgAppointmentsPerDay: number | string;
  mostBusyDay: { day: string; count: number };
  mostBusyTime: { hour: number; count: number };
  mostFrequentService: { title: string; count: number };
}

const getServiceCategoryLabel = (appointment: Appointment): string =>
  appointment.category?.trim() || appointment.service?.title?.trim() || appointment.title?.trim() || 'Genel Hizmet';

const AvailableHoursPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableHours, setAvailableHours] = useState<HoursMap>({});
  const [workStats, setWorkStats] = useState<WorkStats>({
    totalDays: 0,
    busyDays: 0,
    totalAppointments: 0,
    avgAppointmentsPerDay: 0,
    mostBusyDay: { day: '', count: 0 },
    mostBusyTime: { hour: 0, count: 0 },
    mostFrequentService: { title: '', count: 0 },
  });
  const [activeTab, setActiveTab] = useState<'calendar' | 'analytics'>('calendar');
  const [workingHours, setWorkingHours] = useState<WorkingHoursMap | null>(null);
  const [chartHours, setChartHours] = useState<number[]>(DEFAULT_WORKING_HOURS);
  const [hourSlotFilter, setHourSlotFilter] = useState<'all' | 'available' | 'busy'>('all');
  const [activeServicePieIndex, setActiveServicePieIndex] = useState<number | null>(null);
  /** null = henüz bilinmiyor, false = kullanıcının hizmet ilanı yok */
  const [hasService, setHasService] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { services } = await fetchMyServicesDashboard();
        const primary = services?.[0];
        const listingId = primary?.ilanId ?? primary?.id ?? null;
        if (listingId == null) {
          if (!cancelled) setHasService(false);
          return;
        }
        if (!cancelled) setHasService(true);
        const hours = await listingEditAPI.getWorkingHours(listingId);
        if (!cancelled) setWorkingHours(hours);
      } catch (err) {
        console.error('[AvailableHoursPage] Çalışma saatleri alınamadı:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const calculateAvailableHours = (appointmentList: Appointment[], hours: WorkingHoursMap | null) => {
    const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
    const hoursMap: HoursMap = {};
    days.forEach((day) => {
      const key = format(day, 'yyyy-MM-dd');
      hoursMap[key] = {};
      const activeHours = getEffectiveDayHours(hours, day.getDay());
      activeHours.forEach((h) => {
        hoursMap[key][h] = { available: true, appointment: null };
      });
    });
    appointmentList.forEach((app) => {
      const appDate = parseISO(app.date);
      const key = format(appDate, 'yyyy-MM-dd');
      if (isSameMonth(appDate, currentMonth) && hoursMap[key]) {
        const hour = app.time ? parseInt(app.time.split(':')[0], 10) : 12;
        hoursMap[key][hour] = { available: false, appointment: app };
      }
    });
    setAvailableHours(hoursMap);
  };

  const calculateWorkStats = (appointmentList: Appointment[], hours: WorkingHoursMap | null) => {
    const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
    const busyDays = new Set<string>();
    const byDay: Record<string, number> = {};
    const byHour: Record<number, number> = {};
    const byService: Record<string, number> = {};
    days.forEach((d) => {
      byDay[format(d, 'yyyy-MM-dd')] = 0;
    });
    const rangeSet = new Set<number>();
    days.forEach((d) => {
      const range = getEffectiveDayHours(hours, d.getDay());
      range.forEach((h) => rangeSet.add(h));
    });
    const hourRange = rangeSet.size > 0 ? Array.from(rangeSet).sort((a, b) => a - b) : DEFAULT_WORKING_HOURS;
    hourRange.forEach((h) => {
      byHour[h] = 0;
    });
    setChartHours(hourRange);
    appointmentList.forEach((app) => {
      const d = parseISO(app.date);
      if (isSameMonth(d, currentMonth)) {
        const key = format(d, 'yyyy-MM-dd');
        busyDays.add(key);
        byDay[key] = (byDay[key] || 0) + 1;
        const h = app.time ? parseInt(app.time.split(':')[0], 10) : 12;
        byHour[h] = (byHour[h] || 0) + 1;
        const svc = app.title || app.service?.title || 'Genel Hizmet';
        byService[svc] = (byService[svc] || 0) + 1;
      }
    });
    let mostBusyDay = { day: '', count: 0 };
    Object.entries(byDay).forEach(([d, c]) => {
      if (c > mostBusyDay.count) mostBusyDay = { day: d, count: c };
    });
    let mostBusyTime = { hour: 0, count: 0 };
    Object.entries(byHour).forEach(([h, c]) => {
      if (c > mostBusyTime.count) mostBusyTime = { hour: parseInt(h, 10), count: c };
    });
    let mostFrequentService = { title: '', count: 0 };
    Object.entries(byService).forEach(([t, c]) => {
      if (c > mostFrequentService.count) mostFrequentService = { title: t, count: c };
    });
    const total = appointmentList.filter((a) => isSameMonth(parseISO(a.date), currentMonth)).length;
    setWorkStats({
      totalDays: days.length,
      busyDays: busyDays.size,
      totalAppointments: total,
      avgAppointmentsPerDay: busyDays.size > 0 ? (total / busyDays.size).toFixed(1) : 0,
      mostBusyDay,
      mostBusyTime,
      mostFrequentService,
    });
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const all = await getProviderAppointments();
        const validStatuses = ['confirmed', 'completed', 'in_progress', 'disputed', 'reschedule_requested'];
        const activeAppointments = all.filter((a) => {
          const s = a.status?.toLowerCase();
          return s ? validStatuses.includes(s) : false;
        });
        setAppointments(activeAppointments);
        calculateAvailableHours(activeAppointments, workingHours);
        calculateWorkStats(activeAppointments, workingHours);
      } catch (err) {
        setError('Randevular yüklenirken bir hata oluştu');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [currentMonth, workingHours]);

  /** Takvim günlerinin hesaplanması (Pazartesi başlangıçlı kurumsal düzen) */
  const calendarDaysList = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const renderCalendar = () => {
    const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    return (
      <div className="corp-calendar-card">
        <div className="corp-calendar-toolbar">
          <div className="corp-calendar-nav">
            <button
              className="corp-nav-btn"
              onClick={() => setCurrentMonth((p) => subMonths(p, 1))}
              aria-label="Önceki Ay"
              type="button"
            >
              <FaChevronLeft size={13} />
            </button>
            <h2 className="corp-month-heading">
              {currentMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              className="corp-nav-btn"
              onClick={() => setCurrentMonth((p) => addMonths(p, 1))}
              aria-label="Sonraki Ay"
              type="button"
            >
              <FaChevronRight size={13} />
            </button>
          </div>

          <div className="corp-calendar-meta">
            <button
              className="corp-today-btn"
              onClick={() => {
                const now = new Date();
                setCurrentMonth(now);
                setSelectedDate(now);
              }}
              type="button"
            >
              Bugün
            </button>
          </div>
        </div>

        <div className="corp-calendar-legend">
          <span className="legend-item"><span className="legend-dot available" /> Müsait</span>
          <span className="legend-item"><span className="legend-dot busy" /> Randevu Var</span>
          <span className="legend-item"><span className="legend-dot off" /> Kapalı</span>
        </div>

        <div className="corp-calendar-table">
          <div className="corp-weekdays-row">
            {weekDays.map((d) => (
              <div key={d} className="corp-weekday-col">{d}</div>
            ))}
          </div>

          <div className="corp-days-grid">
            {calendarDaysList.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelectedDay = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const dayAppts = appointments.filter((a) => isSameDay(parseISO(a.date), day));
              const apptCount = dayAppts.length;
              const hasHours = availableHours[key];
              const isWorkingDay = hasHours && Object.keys(hasHours).length > 0;

              return (
                <div
                  key={key}
                  className={`corp-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${
                    isSelectedDay ? 'selected' : ''
                  } ${isTodayDate ? 'today' : ''} ${isWorkingDay ? 'working-day' : ''}`}
                  onClick={() => {
                    if (isCurrentMonth) setSelectedDate(day);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="corp-day-top">
                    <span className="corp-day-num">{format(day, 'd')}</span>
                    {isTodayDate && <span className="corp-today-badge">Bugün</span>}
                  </div>

                  <div className="corp-day-status">
                    {apptCount > 0 ? (
                      <span className="corp-appt-pill" title={`${apptCount} Randevu`}>
                        <span className="corp-appt-count">{apptCount}</span>
                        <span className="corp-appt-text"> Randevu</span>
                      </span>
                    ) : isWorkingDay ? (
                      <span className="corp-dot-available" title="Müsait" />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDayHours = () => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    const dayData = availableHours[key];

    if (!dayData) {
      return (
        <div className="corp-no-data-card">
          <FaInfoCircle size={28} className="corp-muted-icon" />
          <h4>Saat Verisi Bulunamadı</h4>
          <p>Seçilen gün için çalışma saatleri veya randevu bilgisi bulunamadı.</p>
        </div>
      );
    }

    const allHours = Array.from({ length: 24 }, (_, i) => i);
    const dayAppointments = appointments.filter((a) => isSameDay(parseISO(a.date), selectedDate));
    const availableSlotsCount = Object.values(dayData).filter((s) => s.available).length;

    // Filtreleme mantığı
    const filteredHours = allHours.filter((h) => {
      const slot = dayData[h];
      if (hourSlotFilter === 'available') return slot && slot.available;
      if (hourSlotFilter === 'busy') return slot && !slot.available && slot.appointment;
      return true;
    });

    return (
      <div className="corp-inspector-card">
        <div className="corp-inspector-header">
          <div>
            <div className="corp-kicker">GÜN İNCELEMESİ</div>
            <h3 className="corp-inspector-title">
              {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
            </h3>
          </div>
          <div className="corp-inspector-metrics">
            <span className="corp-badge-metric success">
              <FaCheckCircle size={11} /> {availableSlotsCount} Müsait Saat
            </span>
            <span className="corp-badge-metric primary">
              <FaCalendarCheck size={11} /> {dayAppointments.length} Randevu
            </span>
          </div>
        </div>

        <div className="corp-slot-filter-row">
          <button
            type="button"
            className={`corp-pill-btn ${hourSlotFilter === 'all' ? 'active' : ''}`}
            onClick={() => setHourSlotFilter('all')}
          >
            Tüm Saatler ({allHours.length})
          </button>
          <button
            type="button"
            className={`corp-pill-btn ${hourSlotFilter === 'available' ? 'active' : ''}`}
            onClick={() => setHourSlotFilter('available')}
          >
            Müsait ({availableSlotsCount})
          </button>
          <button
            type="button"
            className={`corp-pill-btn ${hourSlotFilter === 'busy' ? 'active' : ''}`}
            onClick={() => setHourSlotFilter('busy')}
          >
            Randevulu ({dayAppointments.length})
          </button>
        </div>

        <div className="corp-slots-container">
          {filteredHours.length === 0 ? (
            <div className="corp-empty-slots">
              <p>Filtreye uygun saat aralığı bulunamadı.</p>
            </div>
          ) : (
            <div className="corp-slots-grid">
              {filteredHours.map((hourNum) => {
                const hourFormatted = `${String(hourNum).padStart(2, '0')}:00`;
                const hourEndFormatted = `${String((hourNum + 1) % 24).padStart(2, '0')}:00`;
                const hourData = dayData[hourNum];
                const isWorkingHour = !!hourData;
                const isBusy = !!hourData?.appointment;

                return (
                  <div
                    key={hourNum}
                    className={`corp-slot-item ${
                      isBusy ? 'status-busy' : isWorkingHour ? 'status-available' : 'status-closed'
                    }`}
                  >
                    <div className="corp-slot-time">
                      <FaClock size={12} className="corp-slot-time-icon" />
                      <span>{hourFormatted}</span>
                      <small className="corp-slot-end">-{hourEndFormatted}</small>
                    </div>

                    <div className="corp-slot-body">
                      {isBusy && hourData?.appointment ? (
                        <div className="corp-slot-booking">
                          <div className="corp-booking-title">
                            {hourData.appointment.title || hourData.appointment.service?.title || 'Randevu'}
                          </div>
                          <div className="corp-booking-client">
                            <FaUser size={10} />
                            <span>{hourData.appointment.client?.name || 'Müşteri'}</span>
                          </div>
                          {(() => {
                            const st = hourData.appointment.status?.toLowerCase();
                            if (st === 'completed') {
                              return <span className="corp-badge-status completed">Tamamlandı</span>;
                            }
                            if (st === 'in_progress') {
                              return <span className="corp-badge-status in-progress">İşlemde</span>;
                            }
                            if (st === 'disputed') {
                              return <span className="corp-badge-status disputed">İtiraz Edildi</span>;
                            }
                            if (st === 'reschedule_requested') {
                              return <span className="corp-badge-status reschedule">Tarih Talebi</span>;
                            }
                            return <span className="corp-badge-status booked">Onaylı</span>;
                          })()}
                        </div>
                      ) : isWorkingHour ? (
                        <div className="corp-slot-free">
                          <span className="corp-badge-status available">Müsait</span>
                          <span className="corp-slot-hint">Randevu Alınabilir</span>
                        </div>
                      ) : (
                        <div className="corp-slot-off">
                          <span className="corp-badge-status off">Kapalı</span>
                          <span className="corp-slot-hint">Mesai Dışı</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActivePieShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, percent, value } = props;
    return (
      <g>
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#0f172a" fontSize="14px" fontWeight="700">
          %{Math.round((percent || 0) * 100)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="11px" fontWeight="500">
          {value} Randevu
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{
            filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.22))',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        />
      </g>
    );
  };

  const renderAnalytics = () => {
    const categoryCounts = new Map<string, number>();
    appointments
      .filter((a) => isSameMonth(parseISO(a.date), currentMonth))
      .forEach((a) => {
        const label = getServiceCategoryLabel(a);
        categoryCounts.set(label, (categoryCounts.get(label) || 0) + 1);
      });

    const serviceTypeData = Array.from(categoryCounts.entries()).map(([name, value]) => ({ name, value }));

    const dailyData = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }).map(
      (day) => ({
        name: format(day, 'd MMM', { locale: tr }),
        count: appointments.filter((a) => isSameDay(parseISO(a.date), day)).length,
      })
    );

    const weekdayWeekendData = [
      {
        name: 'Hafta İçi',
        value: appointments.filter((a) => {
          const d = parseISO(a.date);
          const day = d.getDay();
          return day >= 1 && day <= 5 && isSameMonth(d, currentMonth);
        }).length,
      },
      {
        name: 'Hafta Sonu',
        value: appointments.filter((a) => {
          const d = parseISO(a.date);
          const day = d.getDay();
          return (day === 0 || day === 6) && isSameMonth(d, currentMonth);
        }).length,
      },
    ];

    const efficiencyValue = Math.min(
      100,
      Math.round((workStats.busyDays / Math.max(workStats.totalDays, 1)) * 100)
    );

    return (
      <div className="corp-analytics-container">
        {/* Üst Metrik Kartları (KPI) */}
        <div className="corp-kpi-grid">
          <div className="corp-kpi-card">
            <div className="corp-kpi-top">
              <span className="corp-kpi-label">Toplam Randevu</span>
              <div className="corp-kpi-icon-wrap primary">
                <FaCalendarCheck size={16} />
              </div>
            </div>
            <div className="corp-kpi-val">{workStats.totalAppointments}</div>
            <div className="corp-kpi-sub">Bu ay teyit edilen randevu hacmi</div>
          </div>

          <div className="corp-kpi-card">
            <div className="corp-kpi-top">
              <span className="corp-kpi-label">Aktif Çalışılan Gün</span>
              <div className="corp-kpi-icon-wrap success">
                <FaBriefcase size={16} />
              </div>
            </div>
            <div className="corp-kpi-val">{workStats.busyDays}</div>
            <div className="corp-kpi-sub">{workStats.totalDays} takvim günü içinde</div>
          </div>

          <div className="corp-kpi-card">
            <div className="corp-kpi-top">
              <span className="corp-kpi-label">Günlük Ort. Randevu</span>
              <div className="corp-kpi-icon-wrap indigo">
                <FaChartBar size={16} />
              </div>
            </div>
            <div className="corp-kpi-val">{workStats.avgAppointmentsPerDay}</div>
            <div className="corp-kpi-sub">Çalışılan gün başına ortalama</div>
          </div>

          <div className="corp-kpi-card">
            <div className="corp-kpi-top">
              <span className="corp-kpi-label">En Yoğun Gün</span>
              <div className="corp-kpi-icon-wrap slate">
                <FaClock size={16} />
              </div>
            </div>
            <div className="corp-kpi-val corp-kpi-text-val">
              {workStats.mostBusyDay.day ? format(parseISO(workStats.mostBusyDay.day), 'd MMMM', { locale: tr }) : 'Veri Yok'}
            </div>
            <div className="corp-kpi-sub">
              {workStats.mostBusyDay.count > 0 ? `${workStats.mostBusyDay.count} randevu ile zirve` : 'Henüz randevu yok'}
            </div>
          </div>
        </div>

        {/* Grafikler Bölümü */}
        <div className="corp-charts-grid">
          {/* Günlük Dağılım */}
          <div className="corp-chart-card corp-chart-card--wide">
            <div className="corp-chart-header">
              <div>
                <h4 className="corp-chart-title">Günlük Randevu Dağılımı</h4>
                <p className="corp-chart-desc">Ay içerisindeki günlük onaylı talep trendi</p>
              </div>
            </div>
            <div className="corp-chart-body">
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={dailyData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                  />
                  <Bar dataKey="count" name="Randevu" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hizmet Türü Dağılımı */}
          <div className="corp-chart-card">
            <div className="corp-chart-header">
              <div>
                <h4 className="corp-chart-title">Hizmet Türü Dağılımı</h4>
                <p className="corp-chart-desc">En çok tercih edilen uzmanlıklar</p>
              </div>
            </div>
            <div className="corp-chart-body">
              {serviceTypeData.length === 0 ? (
                <div className="corp-chart-empty">Bu ay için randevu verisi bulunamadı</div>
              ) : (
                <div className="corp-donut-container">
                  <div className="corp-donut-chart-box">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          activeIndex={activeServicePieIndex !== null ? activeServicePieIndex : undefined}
                          activeShape={renderActivePieShape}
                          data={serviceTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          onClick={(_, index) => {
                            setActiveServicePieIndex((prev) => (prev === index ? null : index));
                          }}
                          cursor="pointer"
                        >
                          {serviceTypeData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CORPORATE_PALETTE[index % CORPORATE_PALETTE.length]}
                              opacity={activeServicePieIndex === null || activeServicePieIndex === index ? 1 : 0.35}
                              style={{
                                transition: 'opacity 0.25s ease',
                                cursor: 'pointer',
                              }}
                            />
                          ))}
                        </Pie>
                        {activeServicePieIndex === null && (
                          <>
                            <text
                              x="50%"
                              y="48%"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#0f172a"
                              fontSize="16px"
                              fontWeight="700"
                            >
                              {serviceTypeData.reduce((sum, item) => sum + item.value, 0)}
                            </text>
                            <text
                              x="50%"
                              y="59%"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#64748b"
                              fontSize="11px"
                              fontWeight="500"
                            >
                              Toplam
                            </text>
                          </>
                        )}
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          }}
                          formatter={(value: any, name: any) => [`${value} Randevu`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Yandaki Liste (İsimler, Renkler ve Tıklama ile Öne Çıkarma) */}
                  <div className="corp-donut-legend">
                    {serviceTypeData.map((item, index) => {
                      const color = CORPORATE_PALETTE[index % CORPORATE_PALETTE.length];
                      const isSelected = activeServicePieIndex === index;
                      const totalCount = serviceTypeData.reduce((sum, s) => sum + s.value, 0);
                      const percent = totalCount > 0 ? Math.round((item.value / totalCount) * 100) : 0;

                      return (
                        <div
                          key={item.name}
                          className={`corp-legend-item ${isSelected ? 'active' : ''}`}
                          onClick={() => setActiveServicePieIndex(isSelected ? null : index)}
                          title="Grafikte öne çıkarmak için tıklayın"
                        >
                          <div className="corp-legend-left">
                            <span
                              className="corp-legend-color-dot"
                              style={{ backgroundColor: color }}
                            />
                            <span className="corp-legend-name">{item.name}</span>
                          </div>
                          <div className="corp-legend-right">
                            <span className="corp-legend-count">{item.value} randevu</span>
                            <span className="corp-legend-percent">%{percent}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Saatlik Yoğunluk */}
          <div className="corp-chart-card">
            <div className="corp-chart-header">
              <div>
                <h4 className="corp-chart-title">Saat Dilimi Yoğunluğu</h4>
                <p className="corp-chart-desc">Mesai saatleri içindeki talep yoğunluğu</p>
              </div>
            </div>
            <div className="corp-chart-body">
              <ResponsiveContainer width="100%" height={290}>
                <BarChart
                  data={chartHours.map((h) => ({
                    name: `${h}:00`,
                    count: appointments.filter((a) => {
                      if (!isSameMonth(parseISO(a.date), currentMonth)) return false;
                      return (a.time ? parseInt(a.time.split(':')[0], 10) : 8) === h;
                    }).length,
                  }))}
                  margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                  />
                  <Bar dataKey="count" name="Talep Sayısı" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hafta İçi / Hafta Sonu */}
          <div className="corp-chart-card">
            <div className="corp-chart-header">
              <div>
                <h4 className="corp-chart-title">Hafta İçi / Hafta Sonu Oranı</h4>
                <p className="corp-chart-desc">Haftanın günlerine göre iş yükü ayrımı</p>
              </div>
            </div>
            <div className="corp-chart-body">
              <div className="corp-donut-container">
                <div className="corp-donut-chart-box">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={weekdayWeekendData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        <Cell fill="#6366f1" />
                        <Cell fill="#f97316" />
                      </Pie>
                      <text
                        x="50%"
                        y="48%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#1e1b4b"
                        fontSize="16px"
                        fontWeight="700"
                      >
                        {weekdayWeekendData.reduce((s, d) => s + d.value, 0)}
                      </text>
                      <text
                        x="50%"
                        y="59%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#64748b"
                        fontSize="11px"
                        fontWeight="600"
                      >
                        Randevu
                      </text>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e1b4b',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                          border: 'none',
                        }}
                        formatter={(value: any, name: any) => [`${value} Randevu`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="corp-donut-legend">
                  {weekdayWeekendData.map((item, idx) => {
                    const colors = ['#6366f1', '#f97316'];
                    const total = weekdayWeekendData.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={item.name} className="corp-legend-item">
                        <div className="corp-legend-left">
                          <span
                            className="corp-legend-color-dot"
                            style={{ backgroundColor: colors[idx % colors.length] }}
                          />
                          <span className="corp-legend-name">{item.name}</span>
                        </div>
                        <div className="corp-legend-right">
                          <span className="corp-legend-count">{item.value} randevu</span>
                          <span className="corp-legend-percent">%{pct}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Verimlilik ve Kapasite */}
          <div className="corp-chart-card corp-chart-card--wide">
            <div className="corp-chart-header">
              <div>
                <h4 className="corp-chart-title">Aylık Kapasite ve Verimlilik</h4>
                <p className="corp-chart-desc">Toplam takvim günlerine oranla aktif randevulu gün verimliliği</p>
              </div>
            </div>
            <div className="corp-efficiency-wrapper">
              <div className="corp-efficiency-gauge">
                <ResponsiveContainer width={220} height={220}>
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="95%"
                    barSize={16}
                    data={[{ name: 'Verimlilik', value: efficiencyValue, fill: '#f97316' }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="corp-gauge-center">
                  <span className="corp-gauge-pct">%{efficiencyValue}</span>
                  <span className="corp-gauge-label">Doluluk Oranı</span>
                </div>
              </div>

              <div className="corp-efficiency-info">
                <h5>Performans Özeti</h5>
                <p>
                  Bu ay toplam <strong>{workStats.totalDays}</strong> takvim gününün{' '}
                  <strong>{workStats.busyDays}</strong> gününde teyitli randevu gerçekleştirdiniz.
                </p>
                <div className="corp-efficiency-stats-list">
                  <div className="corp-eff-item">
                    <span className="corp-eff-dot primary" />
                    <span>Ortalama Günlük Yoğunluk: <strong>{workStats.avgAppointmentsPerDay} randevu/gün</strong></span>
                  </div>
                  <div className="corp-eff-item">
                    <span className="corp-eff-dot success" />
                    <span>
                      En Çok Hizmet Verilen Alan:{' '}
                      <strong>{workStats.mostFrequentService.title || 'Genel Hizmet'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="corp-state-wrapper">
        <Loader />
        <p className="corp-loading-text">Randevu ve çalışma takvimi yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="corp-state-wrapper error">
        <FaTimesCircle size={40} className="corp-error-icon" />
        <h3>Veriler Alınamadı</h3>
        <p>{error}</p>
        <button
          className="corp-retry-btn"
          onClick={() => window.location.reload()}
          type="button"
        >
          Yeniden Dene
        </button>
      </div>
    );
  }

  if (hasService === false) {
    return <EmptyStateOnboarding {...NO_SERVICE_FOR_HOURS_PRESET} />;
  }

  return (
    <div className="corp-available-hours-page">
      {/* Kurumsal Başlık ve Segment Switcher */}
      <div className="corp-page-header">
        <div className="corp-header-main">
          <div className="corp-kicker-badge">
            <FaBuilding size={11} /> İŞLETME YÖNETİMİ
          </div>
          <h1 className="corp-page-title">Müsait Saatler ve Analiz</h1>
          <p className="corp-page-subtitle">
            Hizmet randevu takviminizi yönetin, saatlik müsaitlik durumunuzu denetleyin ve iş yükü metriklerinizi kurumsal raporlarla inceleyin.
          </p>
        </div>

        <div className="corp-segment-nav">
          <button
            type="button"
            className={`corp-segment-tab ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <FaRegCalendarAlt size={14} />
            <span>Takvim & Müsaitlik</span>
          </button>
          <button
            type="button"
            className={`corp-segment-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <FaChartBar size={14} />
            <span>Analiz & Raporlar</span>
          </button>
        </div>
      </div>

      {/* Sayfa Gövdesi */}
      <div className="corp-page-body">
        {activeTab === 'calendar' ? (
          <div className="corp-calendar-layout">
            <div className="corp-calendar-col-main">{renderCalendar()}</div>
            <div className="corp-calendar-col-side">{renderDayHours()}</div>
          </div>
        ) : (
          renderAnalytics()
        )}
      </div>
    </div>
  );
};

export default AvailableHoursPage;
