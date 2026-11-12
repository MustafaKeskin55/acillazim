import React, { useState, useRef, useEffect } from 'react';
import { FaClock, FaSun, FaMoon, FaSave, FaCheck, FaTimes, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import './ServiceWorkingHours.css';

const ServiceWorkingHours = ({ workingHours, onUpdate }) => {
  const [hours, setHours] = useState(workingHours);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /** `workingHours` backend'den asenkron yükleniyor (bkz. ServiceEdit.jsx) — hazır olduğunda senkronize et. */
  useEffect(() => {
    if (workingHours) setHours(workingHours);
  }, [workingHours]);

  const timeOptions = Array.from({ length: 24 }, (_, hour) => {
    const hourStr = hour.toString().padStart(2, '0');
    return [`${hourStr}:00`, `${hourStr}:30`];
  }).flat();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const timePickerRef = useRef(null);

  const [selectedHour, setSelectedHour] = useState('00');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const handleTimeChange = (day, field, value) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleStatusChange = (day) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isActive: !prev[day].isActive
      }
    }));
  };

  const handleSave = () => {
    onUpdate(hours);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const getDayName = (day) => {
    const days = {
      monday: 'Pazartesi',
      tuesday: 'Salı',
      wednesday: 'Çarşamba',
      thursday: 'Perşembe',
      friday: 'Cuma',
      saturday: 'Cumartesi',
      sunday: 'Pazar'
    };
    return days[day];
  };

  const handleTimeClick = (day, field, currentValue) => {
    setActiveDay(day);
    setActiveTimeField(field);
    const [hour, minute] = currentValue.split(':');
    const roundedMinute = (Math.round(parseInt(minute) / 5) * 5).toString().padStart(2, '0');
    setSelectedHour(hour);
    setSelectedMinute(roundedMinute);
    setShowTimePicker(true);
  };

  const handleTimeSelect = () => {
    if (activeDay && activeTimeField) {
      const timeValue = `${selectedHour}:${selectedMinute}`;
      handleTimeChange(activeDay, activeTimeField, timeValue);
      setShowTimePicker(false);
      setActiveTimeField(null);
      setActiveDay(null);
    }
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minuteOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const scrollTime = (type, direction) => {
    const options = type === 'hour' ? hourOptions : minuteOptions;
    const currentValue = type === 'hour' ? selectedHour : selectedMinute;
    const setValue = type === 'hour' ? setSelectedHour : setSelectedMinute;
    
    const currentIndex = options.indexOf(currentValue);
    let newIndex;
    
    if (direction === 'up') {
      newIndex = currentIndex <= 0 ? options.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex >= options.length - 1 ? 0 : currentIndex + 1;
    }
    
    setValue(options[newIndex]);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timePickerRef.current && !timePickerRef.current.contains(event.target)) {
        setShowTimePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="service-working-hours-root">
      <div className="service-working-hours">
        <div className="working-hours-header">
          <div className="working-hours-title">
            <h2>Çalışma Saatleri</h2>
          </div>
        </div>

        <div className="working-hours-container">
          {Object.entries(hours).map(([day, dayHours]) => (
            <div key={day} className={`working-hours-item ${dayHours.isActive ? 'active' : 'inactive'}`}>
              <div className="day-info">
                <span className="day-name">{getDayName(day)}</span>
                <div className="day-status">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={dayHours.isActive}
                      onChange={() => handleStatusChange(day)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <div className="time-inputs">
                <div className="time-input-group">
                  <FaSun className="time-icon" />
                  <input
                    type="time"
                    value={dayHours.start}
                    onClick={() => handleTimeClick(day, 'start', dayHours.start)}
                    readOnly
                    disabled={!dayHours.isActive}
                    className={!dayHours.isActive ? 'disabled' : ''}
                  />
                </div>
                <span className="time-separator">-</span>
                <div className="time-input-group">
                  <FaMoon className="time-icon" />
                  <input
                    type="time"
                    value={dayHours.end}
                    onClick={() => handleTimeClick(day, 'end', dayHours.end)}
                    readOnly
                    disabled={!dayHours.isActive}
                    className={!dayHours.isActive ? 'disabled' : ''}
                  />
                </div>
              </div>
            </div>
          ))}

          {showTimePicker && (
            <div className="time-picker" ref={timePickerRef}>
              <div className="time-picker-header">
                <FaClock className="time-picker-icon" />
                <span>Saat Seçin</span>
                <button className="time-picker-close" onClick={() => setShowTimePicker(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="digital-clock">
                <div className="digital-time">
                  <div className="time-column">
                    <button
                      className="scroll-button"
                      onClick={() => scrollTime('hour', 'up')}
                    >
                      <FaChevronUp />
                    </button>
                    <div className="digital-hours">
                      {hourOptions.map((hour) => (
                        <button
                          key={hour}
                          className={`digital-number ${selectedHour === hour ? 'selected' : ''}`}
                          onClick={() => setSelectedHour(hour)}
                        >
                          {hour}
                        </button>
                      ))}
                    </div>
                    <button
                      className="scroll-button"
                      onClick={() => scrollTime('hour', 'down')}
                    >
                      <FaChevronDown />
                    </button>
                  </div>
                  <div className="digital-separator">:</div>
                  <div className="time-column">
                    <button
                      className="scroll-button"
                      onClick={() => scrollTime('minute', 'up')}
                    >
                      <FaChevronUp />
                    </button>
                    <div className="digital-minutes">
                      {minuteOptions.map((minute) => (
                        <button
                          key={minute}
                          className={`digital-number ${selectedMinute === minute ? 'selected' : ''}`}
                          onClick={() => setSelectedMinute(minute)}
                        >
                          {minute}
                        </button>
                      ))}
                    </div>
                    <button
                      className="scroll-button"
                      onClick={() => scrollTime('minute', 'down')}
                    >
                      <FaChevronDown />
                    </button>
                  </div>
                </div>
                <div className="digital-display">
                  {selectedHour}:{selectedMinute}
                </div>
                <button className="digital-confirm" onClick={handleTimeSelect}>
                  Seç
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="working-hours-actions">
          <button
            className={`save-button ${saveSuccess ? 'success' : ''}`}
            onClick={handleSave}
          >
            {saveSuccess ? (
              <>
                <FaCheck /> Kaydedildi
              </>
            ) : (
              <>
                <FaSave /> Değişiklikleri Kaydet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceWorkingHours; 