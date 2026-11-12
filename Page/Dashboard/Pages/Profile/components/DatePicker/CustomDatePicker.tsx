"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaTimes,
} from "react-icons/fa";
import "./CustomDatePicker.css";

interface CustomDatePickerProps {
  id?: string;
  name?: string;
  value?: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const WEEKDAY_NAMES = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"];

type ViewMode = "days" | "month" | "year";

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder = "GG.AA.YYYY",
  disabled = false,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const containerRef = useRef<HTMLDivElement>(null);
  const yearsGridRef = useRef<HTMLDivElement>(null);

  const toggleOpen = (state: boolean) => {
    setIsOpen(state);
    if (!state) {
      setViewMode("days");
    }
    onOpenChange?.(state);
  };

  // Parse initial selected date
  const parseDate = (val?: string) => {
    if (!val) return null;
    const parts = val.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    return null;
  };

  const selectedDate = parseDate(value);

  // Current view month & year (defaults to selected date or 1995 for birth dates / current date)
  const [viewYear, setViewYear] = useState(() =>
    selectedDate ? selectedDate.getFullYear() : 1995
  );
  const [viewMonth, setViewMonth] = useState(() =>
    selectedDate ? selectedDate.getMonth() : 0
  );

  // Update view month/year when value changes
  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      if (d) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Mobile viewport detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Click outside to close (desktop only)
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        toggleOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobile]);

  // Prevent background scroll when mobile modal is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isMobile]);

  // Auto scroll to active year when year mode is opened
  useEffect(() => {
    if (viewMode === "year" && yearsGridRef.current) {
      const activeEl = yearsGridRef.current.querySelector(".cdp-year-cell--active");
      if (activeEl) {
        (activeEl as HTMLElement).scrollIntoView({ block: "center", behavior: "auto" });
      }
    }
  }, [viewMode]);

  const handlePrevMonth = () => {
    if (viewMode === "year") {
      setViewYear((prev) => prev - 12);
      return;
    }
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMode === "year") {
      setViewYear((prev) => prev + 12);
      return;
    }
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleDayClick = (year: number, month: number, day: number) => {
    const formattedMonth = String(month + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    const formattedIso = `${year}-${formattedMonth}-${formattedDay}`;
    onChange(formattedIso);
    toggleOpen(false);
  };

  const handleClear = () => {
    onChange("");
    toggleOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const formattedMonth = String(today.getMonth() + 1).padStart(2, "0");
    const formattedDay = String(today.getDate()).padStart(2, "0");
    const formattedIso = `${today.getFullYear()}-${formattedMonth}-${formattedDay}`;
    onChange(formattedIso);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setViewMode("days");
    toggleOpen(false);
  };

  // Generate Year Options (1925 to Current Year)
  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentYear; y >= 1925; y--) {
    yearOptions.push(y);
  }

  // Format date for display in input: "DD.MM.YYYY"
  const formattedDisplay = selectedDate
    ? `${String(selectedDate.getDate()).padStart(2, "0")}.${String(
        selectedDate.getMonth() + 1
      ).padStart(2, "0")}.${selectedDate.getFullYear()}`
    : "";

  // Calendar Grid generation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  // Monday is 0, Sunday is 6
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const calendarDays = [];

  // Trailing days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      month: viewMonth === 0 ? 11 : viewMonth - 1,
      year: viewMonth === 0 ? viewYear - 1 : viewYear,
      isCurrentMonth: false,
    });
  }

  // Days in current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
    });
  }

  // Leading days from next month to complete 35 or 42 cells
  const totalSlots = calendarDays.length > 35 ? 42 : 35;
  const remaining = totalSlots - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({
      day: i,
      month: viewMonth === 11 ? 0 : viewMonth + 1,
      year: viewMonth === 11 ? viewYear + 1 : viewYear,
      isCurrentMonth: false,
    });
  }

  const today = new Date();
  const isToday = (y: number, m: number, d: number) =>
    today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;

  const isSelected = (y: number, m: number, d: number) =>
    selectedDate &&
    selectedDate.getFullYear() === y &&
    selectedDate.getMonth() === m &&
    selectedDate.getDate() === d;

  const calendarBody = (
    <div className="cdp-calendar-card">
      {/* Başlık: Ay ve Yıl Seçici Butonları + İleri/Geri Okları */}
      <div className="cdp-calendar-header">
        <button
          type="button"
          className="cdp-nav-btn"
          onClick={handlePrevMonth}
          title="Önceki"
          aria-label="Önceki"
        >
          <FaChevronLeft size={12} />
        </button>

        <div className="cdp-header-pills-group">
          {/* Ay Butonu */}
          <button
            type="button"
            className={`cdp-header-pill ${viewMode === "month" ? "cdp-header-pill--active" : ""}`}
            onClick={() => setViewMode(viewMode === "month" ? "days" : "month")}
            title="Ay Seç"
          >
            <span>{MONTH_NAMES[viewMonth]}</span>
            <FaChevronDown
              size={10}
              className={`cdp-pill-chevron ${viewMode === "month" ? "rotated" : ""}`}
            />
          </button>

          {/* Yıl Butonu */}
          <button
            type="button"
            className={`cdp-header-pill ${viewMode === "year" ? "cdp-header-pill--active" : ""}`}
            onClick={() => setViewMode(viewMode === "year" ? "days" : "year")}
            title="Yıl Seç"
          >
            <span>{viewYear}</span>
            <FaChevronDown
              size={10}
              className={`cdp-pill-chevron ${viewMode === "year" ? "rotated" : ""}`}
            />
          </button>
        </div>

        <button
          type="button"
          className="cdp-nav-btn"
          onClick={handleNextMonth}
          title="Sonraki"
          aria-label="Sonraki"
        >
          <FaChevronRight size={12} />
        </button>
      </div>

      {/* GÖRÜNÜM 1: GÜNLER IZGARASI */}
      {viewMode === "days" && (
        <div className="cdp-days-view">
          {/* Haftanın Günleri Başlığı */}
          <div className="cdp-weekdays-row">
            {WEEKDAY_NAMES.map((dayName, idx) => (
              <span key={idx} className="cdp-weekday">
                {dayName}
              </span>
            ))}
          </div>

          {/* Günler Izgarası */}
          <div className="cdp-days-grid">
            {calendarDays.map((item, idx) => {
              const selected = isSelected(item.year, item.month, item.day);
              const currentDay = isToday(item.year, item.month, item.day);

              return (
                <button
                  key={idx}
                  type="button"
                  className={`cdp-day-cell ${
                    item.isCurrentMonth ? "cdp-day-in-month" : "cdp-day-out-month"
                  } ${selected ? "cdp-day-selected" : ""} ${
                    currentDay ? "cdp-day-today" : ""
                  }`}
                  onClick={() => handleDayClick(item.year, item.month, item.day)}
                >
                  {item.day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* GÖRÜNÜM 2: AYLAR SEÇİM IZGARASI (12 Ay Şık Haplar) */}
      {viewMode === "month" && (
        <div className="cdp-months-grid">
          {MONTH_NAMES.map((name, idx) => {
            const isCurrent = viewMonth === idx;
            return (
              <button
                key={idx}
                type="button"
                className={`cdp-month-cell ${isCurrent ? "cdp-month-cell--active" : ""}`}
                onClick={() => {
                  setViewMonth(idx);
                  setViewMode("days");
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {/* GÖRÜNÜM 3: YILLAR SEÇİM IZGARASI (1925-2026 Kaydırılabilir Liste) */}
      {viewMode === "year" && (
        <div className="cdp-years-grid" ref={yearsGridRef}>
          {yearOptions.map((y) => {
            const isCurrent = viewYear === y;
            return (
              <button
                key={y}
                type="button"
                className={`cdp-year-cell ${isCurrent ? "cdp-year-cell--active" : ""}`}
                onClick={() => {
                  setViewYear(y);
                  setViewMode("days");
                }}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}

      {/* Alt Aksiyon Çubuğu: Temizle & Bugün */}
      <div className="cdp-calendar-footer">
        <button
          type="button"
          className="cdp-footer-btn cdp-footer-clear"
          onClick={handleClear}
        >
          Temizle
        </button>
        <button
          type="button"
          className="cdp-footer-btn cdp-footer-today"
          onClick={handleToday}
        >
          Bugün
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`cdp-datepicker-container ${isOpen ? "cdp-is-open" : ""}`}
      ref={containerRef}
    >
      {/* Gizli native input (form submit ve name uyumu için) */}
      <input type="hidden" name={name} value={value || ""} />

      {/* Tıklanabilir Şık Görsel Input */}
      <div
        id={id}
        className={`cdp-input-trigger ${isOpen ? "cdp-focused" : ""} ${
          disabled ? "cdp-disabled" : ""
        }`}
        onClick={() => {
          if (!disabled) toggleOpen(!isOpen);
        }}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) toggleOpen(!isOpen);
          }
        }}
      >
        <span
          className={`cdp-input-text ${!formattedDisplay ? "cdp-placeholder" : ""}`}
        >
          {formattedDisplay || placeholder}
        </span>
        <FaCalendarAlt className="cdp-calendar-icon" />
      </div>

      {/* Desktop: Popover Dropdown (Modalsız, inputun hemen altında) */}
      {isOpen && !isMobile && (
        <div className="cdp-popover-wrapper">{calendarBody}</div>
      )}

      {/* Mobile: Şık ve Sade Modal Görünümü */}
      {isOpen && isMobile && (
        <div className="cdp-mobile-modal-overlay">
          <div
            className="cdp-mobile-backdrop"
            onClick={() => toggleOpen(false)}
          />
          <div className="cdp-mobile-modal-content">
            <div className="cdp-mobile-modal-header">
              <span className="cdp-mobile-modal-title">Doğum Tarihi Seçin</span>
              <button
                type="button"
                className="cdp-mobile-modal-close"
                onClick={() => toggleOpen(false)}
                aria-label="Kapat"
              >
                <FaTimes size={14} />
              </button>
            </div>
            <div className="cdp-mobile-modal-body">{calendarBody}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
