"use client";

import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ServiceSearch.css';
import { IoSearch, IoChevronDown, IoClose } from 'react-icons/io5';
import locationService from '@/services/location/locationService';

interface LocationOption {
  id?: string | number;
  value?: string;
  name?: string;
  label?: string;
}

const MOBILE_MEDIA = "(max-width: 768px)";

function optionValue(opt: LocationOption): string {
  return String(opt.id ?? opt.value ?? "");
}

function optionLabel(opt: LocationOption): string {
  return String(opt.name ?? opt.label ?? "");
}

const ServiceSearch: React.FC = () => {
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [locationSheet, setLocationSheet] = useState<null | "city" | "district">(null);
  const [sheetFilter, setSheetFilter] = useState("");
  const [openDropdown, setOpenDropdown] = useState<null | "city" | "district">(null);
  const [dropdownFilter, setDropdownFilter] = useState("");
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const sheetSearchRef = useRef<HTMLInputElement>(null);
  const dropdownSearchRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const districtDropdownRef = useRef<HTMLDivElement>(null);
  const cityTriggerRef = useRef<HTMLButtonElement>(null);
  const districtTriggerRef = useRef<HTMLButtonElement>(null);
  const floatingDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCities = async () => {
      setLoading(true);
      try {
        const cityData = await locationService.getCities();
        setCities(cityData);
      } catch (error) {
        console.error('Şehirler yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCities();
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(MOBILE_MEDIA);
    const apply = () => setIsMobileLayout(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!locationSheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locationSheet]);

  useEffect(() => {
    if (!locationSheet) setSheetFilter("");
  }, [locationSheet]);

  useEffect(() => {
    if (!locationSheet) return;
    if (!sheetSearchRef.current) return;
    sheetSearchRef.current.blur();
  }, [locationSheet]);

  useEffect(() => {
    const fetchDistricts = async () => {
      if (!selectedCity) { setDistricts([]); return; }
      setLoading(true);
      try {
        const districtData = await locationService.getDistricts(selectedCity);
        setDistricts(districtData);
      } catch (error) {
        console.error('İlçeler yüklenirken hata:', error);
        setDistricts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDistricts();
  }, [selectedCity]);

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
    setSelectedDistrict('');
  };

  const selectedCityLabel = useMemo(() => {
    if (!selectedCity) return "";
    const c = cities.find((x) => optionValue(x) === selectedCity);
    return c ? optionLabel(c) : "";
  }, [cities, selectedCity]);

  const selectedDistrictLabel = useMemo(() => {
    if (!selectedDistrict) return "";
    const d = districts.find((x) => optionValue(x) === selectedDistrict);
    return d ? optionLabel(d) : "";
  }, [districts, selectedDistrict]);

  const filteredCities = useMemo(() => {
    const q = sheetFilter.trim().toLocaleLowerCase("tr-TR");
    if (!q) return cities;
    return cities.filter((c) =>
      optionLabel(c).toLocaleLowerCase("tr-TR").includes(q),
    );
  }, [cities, sheetFilter]);

  const filteredDistricts = useMemo(() => {
    const q = sheetFilter.trim().toLocaleLowerCase("tr-TR");
    if (!q) return districts;
    return districts.filter((d) =>
      optionLabel(d).toLocaleLowerCase("tr-TR").includes(q),
    );
  }, [districts, sheetFilter]);

  const openCitySheet = useCallback(() => {
    if (loading) return;
    setSheetFilter("");
    setLocationSheet("city");
  }, [loading]);

  const openDistrictSheet = useCallback(() => {
    if (!selectedCity || loading) return;
    setSheetFilter("");
    setLocationSheet("district");
  }, [selectedCity, loading]);

  const closeLocationSheet = useCallback(() => {
    setLocationSheet(null);
    setSheetFilter("");
  }, []);

  useEffect(() => {
    if (!locationSheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLocationSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locationSheet, closeLocationSheet]);

  useEffect(() => {
    if (!openDropdown) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        floatingDropdownRef.current && floatingDropdownRef.current.contains(target)
      ) return;
      if (
        cityDropdownRef.current && cityDropdownRef.current.contains(target)
      ) return;
      if (
        districtDropdownRef.current && districtDropdownRef.current.contains(target)
      ) return;
      setOpenDropdown(null);
      setDropdownFilter("");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpenDropdown(null); setDropdownFilter(""); }
    };
    const updatePos = () => {
      const trigger = openDropdown === "city" ? cityTriggerRef.current : districtTriggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 10, left: rect.left + rect.width / 2, width: Math.max(rect.width, 340) });
    };
    updatePos();
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [openDropdown]);

  useEffect(() => {
    if (openDropdown) {
      if (dropdownSearchRef.current) dropdownSearchRef.current.blur();
    }
  }, [openDropdown]);

  const filteredCitiesForDropdown = useMemo(() => {
    const q = dropdownFilter.trim().toLocaleLowerCase("tr-TR");
    if (!q) return cities;
    return cities.filter((c) => optionLabel(c).toLocaleLowerCase("tr-TR").includes(q));
  }, [cities, dropdownFilter]);

  const filteredDistrictsForDropdown = useMemo(() => {
    const q = dropdownFilter.trim().toLocaleLowerCase("tr-TR");
    if (!q) return districts;
    return districts.filter((d) => optionLabel(d).toLocaleLowerCase("tr-TR").includes(q));
  }, [districts, dropdownFilter]);

  const pickCity = useCallback((value: string) => {
    setSelectedCity(value);
    setSelectedDistrict("");
    setLocationSheet(null);
    setSheetFilter("");
  }, []);

  const pickDistrict = useCallback((value: string) => {
    setSelectedDistrict(value);
    setLocationSheet(null);
    setSheetFilter("");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append('q', searchQuery.trim());
    if (selectedCity) params.append('il', selectedCity);
    if (selectedDistrict) params.append('ilce', selectedDistrict);
    if (params.toString()) {
      window.location.href = `/filtrele/tum-ilanlar?${params.toString()}`;
    }
  };

  return (
    <div className="service-search-container">
      <form onSubmit={handleSubmit} className="service-search-form">
        <div className="search-form-row">
          <div className="search-field search-field--query">
            <IoSearch className="search-field__icon" aria-hidden />
            <input
              type="text"
              placeholder="Aradığınız hizmet"
              className="search-field__input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isMobileLayout ? (
            <>
              <button
                type="button"
                className="search-field search-field--trigger"
                onClick={openCitySheet}
                disabled={loading}
              >
                <span
                  className={
                    selectedCityLabel
                      ? "search-field__text"
                      : "search-field__text search-field__text--placeholder"
                  }
                >
                  {selectedCityLabel || "İl"}
                </span>
                <IoChevronDown className="search-field__chev" aria-hidden />
              </button>

              <button
                type="button"
                className="search-field search-field--trigger"
                onClick={openDistrictSheet}
                disabled={!selectedCity || loading}
              >
                <span
                  className={
                    selectedDistrictLabel
                      ? "search-field__text"
                      : "search-field__text search-field__text--placeholder"
                  }
                >
                  {selectedDistrictLabel || "İlçe"}
                </span>
                <IoChevronDown className="search-field__chev" aria-hidden />
              </button>
            </>
          ) : (
            <>
              <div
                className="search-field search-field--select"
                ref={cityDropdownRef}
              >
                <button
                  ref={cityTriggerRef}
                  type="button"
                  className="search-field__select-trigger"
                  onClick={() => !loading && setOpenDropdown(openDropdown === "city" ? null : "city")}
                  disabled={loading}
                >
                  <span
                    className={
                      selectedCityLabel
                        ? "search-field__text"
                        : "search-field__text search-field__text--placeholder"
                    }
                  >
                    {selectedCityLabel || "İl"}
                  </span>
                  <IoChevronDown
                    className={
                      "search-field__chev" +
                      (openDropdown === "city" ? " search-field__chev--open" : "")
                    }
                    aria-hidden
                  />
                </button>
              </div>

              <div
                className="search-field search-field--select"
                ref={districtDropdownRef}
              >
                <button
                  ref={districtTriggerRef}
                  type="button"
                  className="search-field__select-trigger"
                  onClick={() => selectedCity && !loading && setOpenDropdown(openDropdown === "district" ? null : "district")}
                  disabled={!selectedCity || loading}
                >
                  <span
                    className={
                      selectedDistrictLabel
                        ? "search-field__text"
                        : "search-field__text search-field__text--placeholder"
                    }
                  >
                    {selectedDistrictLabel || "İlçe"}
                  </span>
                  <IoChevronDown
                    className={
                      "search-field__chev" +
                      (openDropdown === "district" ? " search-field__chev--open" : "")
                    }
                    aria-hidden
                  />
                </button>
              </div>
            </>
          )}

          <button type="submit" className="search-submit">
            <IoSearch className="search-submit__icon" aria-hidden />
            <span>Ara</span>
          </button>
        </div>
      </form>

      {openDropdown ? (
        <>{createPortal(
        <>
        <div
          className="search-dropdown-backdrop"
          onClick={() => { setOpenDropdown(null); setDropdownFilter(""); }}
        />
        <div
          ref={floatingDropdownRef}
          className="search-dropdown search-dropdown--floating"
          style={{
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
          }}
          role="listbox"
        >
          <div className="search-dropdown__search-wrap">
            <IoSearch className="search-dropdown__search-icon" aria-hidden />
            <input
              ref={dropdownSearchRef}
              type="search"
              className="search-dropdown__search"
              placeholder={openDropdown === "city" ? "İl ara…" : "İlçe ara…"}
              value={dropdownFilter}
              onChange={(e) => setDropdownFilter(e.target.value)}
              autoComplete="off"
            />
          </div>
          <ul className="search-dropdown__list">
            <li>
              <button
                type="button"
                className="search-dropdown__item"
                onClick={() => {
                  if (openDropdown === "city") setSelectedCity("");
                  else setSelectedDistrict("");
                  setOpenDropdown(null);
                  setDropdownFilter("");
                }}
              >
                {openDropdown === "city" ? "Tüm iller" : "Tüm ilçeler"}
              </button>
            </li>
            {(openDropdown === "city" ? filteredCitiesForDropdown : filteredDistrictsForDropdown).map((item) => {
              const v = optionValue(item);
              const active = openDropdown === "city" ? v === selectedCity : v === selectedDistrict;
              return (
                <li key={v || optionLabel(item)}>
                  <button
                    type="button"
                    className={
                      active
                        ? "search-dropdown__item search-dropdown__item--active"
                        : "search-dropdown__item"
                    }
                    onClick={() => {
                      if (openDropdown === "city") {
                        setSelectedCity(v);
                        setSelectedDistrict("");
                      } else {
                        setSelectedDistrict(v);
                      }
                      setOpenDropdown(null);
                      setDropdownFilter("");
                    }}
                  >
                    {optionLabel(item)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        </>
        , document.body)}</>
      ) : null}

      {isMobileLayout && locationSheet ? (
        <>{createPortal(
        <div
          className="service-search-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-search-sheet-title"
        >
          <button
            type="button"
            className="service-search-sheet__backdrop"
            aria-label="Kapat"
            onClick={closeLocationSheet}
          />
          <div className="service-search-sheet__panel">
            <div className="service-search-sheet__grab" aria-hidden />
            <div className="service-search-sheet__head">
              <h3 id="service-search-sheet-title" className="service-search-sheet__title">
                {locationSheet === "city" ? "İl seçin" : "İlçe seçin"}
              </h3>
              <button
                type="button"
                className="service-search-sheet__close"
                onClick={closeLocationSheet}
                aria-label="Kapat"
              >
                <IoClose size={26} />
              </button>
            </div>
            <div className="service-search-sheet__search-wrap">
              <IoSearch className="service-search-sheet__search-icon" aria-hidden />
              <input
                ref={sheetSearchRef}
                type="search"
                className="service-search-sheet__search"
                placeholder={locationSheet === "city" ? "İl ara…" : "İlçe ara…"}
                value={sheetFilter}
                onChange={(e) => setSheetFilter(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
              />
            </div>
            <ul className="service-search-sheet__list" role="listbox">
              {locationSheet === "city" ? (
                <>
                  <li role="none">
                    <button
                      type="button"
                      role="option"
                      className="service-search-sheet__item"
                      onClick={() => pickCity("")}
                    >
                      Tüm iller
                    </button>
                  </li>
                  {filteredCities.map((city) => {
                    const v = optionValue(city);
                    return (
                      <li key={v || optionLabel(city)} role="none">
                        <button
                          type="button"
                          role="option"
                          className={
                            v === selectedCity
                              ? "service-search-sheet__item service-search-sheet__item--active"
                              : "service-search-sheet__item"
                          }
                          onClick={() => pickCity(v)}
                        >
                          {optionLabel(city)}
                        </button>
                      </li>
                    );
                  })}
                </>
              ) : (
                <>
                  <li role="none">
                    <button
                      type="button"
                      role="option"
                      className="service-search-sheet__item"
                      onClick={() => pickDistrict("")}
                    >
                      Tüm ilçeler
                    </button>
                  </li>
                  {filteredDistricts.map((district) => {
                    const v = optionValue(district);
                    return (
                      <li key={v || optionLabel(district)} role="none">
                        <button
                          type="button"
                          role="option"
                          className={
                            v === selectedDistrict
                              ? "service-search-sheet__item service-search-sheet__item--active"
                              : "service-search-sheet__item"
                          }
                          onClick={() => pickDistrict(v)}
                        >
                          {optionLabel(district)}
                        </button>
                      </li>
                    );
                  })}
                </>
              )}
            </ul>
          </div>
        </div>,
        document.body
        )}</>
      ) : null}
    </div>
  );
};

export default ServiceSearch;
