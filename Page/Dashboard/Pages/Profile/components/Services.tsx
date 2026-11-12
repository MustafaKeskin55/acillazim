"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FaBriefcase,
  FaCheckCircle,
  FaSpinner,
  FaTimes,
  FaPlus,
  FaLayerGroup,
  FaCode,
  FaSearch,
} from "react-icons/fa";
import toast from "react-hot-toast";
import api, { ServiceCategoryOption, SkillSearchOption } from "@/services/api/ürapi";
import "./Services.css";

const EXPERIENCE_YEARS = Array.from({ length: 50 }, (_, i) => i + 1);

interface ServiceAreaEntry {
  categoryId: number;
  name: string;
  years: number;
}

interface SkillEntry {
  id: number;
  name: string;
}

export type ServicesSection = 'all' | 'areas' | 'skills';

interface ServicesProps {
  activeSection?: ServicesSection;
}

const Services: React.FC<ServicesProps> = ({ activeSection = 'all' }) => {
  const [headline, setHeadline] = useState("");
  const [serviceAreas, setServiceAreas] = useState<ServiceAreaEntry[]>([]);
  const [skillItems, setSkillItems] = useState<SkillEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [allCategories, setAllCategories] = useState<ServiceCategoryOption[]>([]);
  const [areaQuery, setAreaQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryOption | null>(null);
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number>(1);
  const areaTypeaheadRef = useRef<HTMLDivElement | null>(null);

  const [skillQuery, setSkillQuery] = useState("");
  const [skillSuggestions, setSkillSuggestions] = useState<SkillSearchOption[]>([]);
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false);
  const skillTypeaheadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadProfileAndCategories = async () => {
      try {
        setLoading(true);
        const [profileData, categoriesData] = await Promise.all([
          api.fetchBasicInfo().catch(() => null),
          api.fetchServiceCategories().catch(() => []),
        ]);
        if (!isMounted) return;

        if (Array.isArray(categoriesData)) {
          setAllCategories(categoriesData);
        }

        if (profileData) {
          setHeadline(profileData.headline || "");
          setServiceAreas(
            (profileData.serviceAreas || []).map((item) => ({
              categoryId: item.categoryId,
              name: item.name || "",
              years: item.years,
            }))
          );
          setSkillItems(
            (profileData.skillItems || []).map((item) => ({
              id: item.id,
              name: item.name || "",
            }))
          );
        }
      } catch (err) {
        console.warn("Hizmet bilgileri yüklenemedi:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfileAndCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCategories = useMemo(() => {
    if (!areaQuery.trim()) return allCategories.slice(0, 40);
    const q = areaQuery.trim().toLowerCase();
    return allCategories
      .filter(
        (cat) =>
          cat.label.toLowerCase().includes(q) ||
          (cat.parentName && cat.parentName.toLowerCase().includes(q))
      )
      .slice(0, 40);
  }, [allCategories, areaQuery]);

  useEffect(() => {
    if (!skillDropdownOpen) return;
    const timer = setTimeout(async () => {
      try {
        const results = await api.searchSkills(skillQuery);
        setSkillSuggestions(results.map((r) => ({ id: r.id, name: r.name })));
      } catch {
        setSkillSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [skillQuery, skillDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        areaTypeaheadRef.current &&
        !areaTypeaheadRef.current.contains(e.target as Node)
      ) {
        setAreaDropdownOpen(false);
      }
      if (
        skillTypeaheadRef.current &&
        !skillTypeaheadRef.current.contains(e.target as Node)
      ) {
        setSkillDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRemoveArea = (categoryId: number) => {
    setServiceAreas((prev) => prev.filter((item) => item.categoryId !== categoryId));
  };

  const handleUpdateAreaYears = (categoryId: number, years: number) => {
    setServiceAreas((prev) =>
      prev.map((item) => (item.categoryId === categoryId ? { ...item, years } : item))
    );
  };

  const handleAddArea = () => {
    if (!selectedCategory) {
      toast.error("Lütfen listeden bir hizmet alanı seçin.");
      return;
    }
    if (
      serviceAreas.length >= 10 &&
      !serviceAreas.some((item) => item.categoryId === selectedCategory.id)
    ) {
      toast.error("En fazla 10 hizmet alanı ekleyebilirsiniz.");
      return;
    }

    setServiceAreas((prev) =>
      prev.some((item) => item.categoryId === selectedCategory.id)
        ? prev.map((item) =>
            item.categoryId === selectedCategory.id
              ? { ...item, years: selectedYears }
              : item
          )
        : [
            ...prev,
            {
              categoryId: selectedCategory.id,
              name: selectedCategory.label,
              years: selectedYears,
            },
          ]
    );
    setSelectedCategory(null);
    setAreaQuery("");
    setSelectedYears(1);
    setAreaDropdownOpen(false);
  };

  const handleAddSkill = (skill: SkillEntry) => {
    if (!skillItems.some((item) => item.id === skill.id)) {
      if (skillItems.length >= 25) {
        toast.error("En fazla 25 yetenek ekleyebilirsiniz.");
        return;
      }
      setSkillItems((prev) => [...prev, skill]);
      setSkillQuery("");
    }
  };

  const handleRemoveSkill = (skillId: number) => {
    setSkillItems((prev) => prev.filter((item) => item.id !== skillId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.saveBasicInfo({
        headline,
        serviceAreas: serviceAreas.map((item) => ({
          categoryId: item.categoryId,
          years: item.years,
        })),
        skillItems: skillItems.map((item) => ({ id: item.id })),
      });

      if (res.success) {
        toast.success("Hizmet ve uzmanlık bilgileri başarıyla kaydedildi.");
        window.dispatchEvent(
          new CustomEvent("userProfileUpdated", {
            detail: {
              headline,
              serviceAreas,
              skillItems,
            },
          })
        );
      } else {
        toast.error(res.message || "Kaydedilirken bir hata oluştu.");
      }
    } catch (err: any) {
      console.error("Hizmet kaydetme hatası:", err);
      toast.error(err.message || "Hizmet bilgileri kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const availableSkillSuggestions = skillSuggestions.filter(
    (s) => !skillItems.some((existing) => existing.id === s.id)
  );

  const showAreas = activeSection === 'all' || activeSection === 'areas';
  const showSkills = activeSection === 'all' || activeSection === 'skills';

  return (
    <div className="sv-services-container">
      <form className="sv-services-form" onSubmit={handleSubmit}>
        {/* Kart Düzeni (Hizmet Alanlarım & Yeteneklerim) */}
        <div className={`sv-cards-grid ${activeSection !== 'all' ? 'sv-cards-grid--single' : ''}`}>
          {/* Bölüm 1: Hizmet Alanlarım */}
          {showAreas && (
          <div className="sv-section-card sv-fade-in">
            <div className="sv-section-header">
              <div className="sv-header-left">
                <h2 className="sv-section-title">Hizmet Alanlarım</h2>
                <span className="sv-count-pill">{serviceAreas.length}/10</span>
              </div>
              <p className="sv-section-subtitle">
                Yalnızca hizmet kategorilerinden seçilebilir. İlan verdiğinizde ilanın hizmet kategorisi ve deneyim yılı buraya otomatik eklenir veya buradan güncellenebilir.
              </p>
            </div>

            <div className="sv-section-content">
              {serviceAreas.length > 0 && (
                <ul className="sv-area-list">
                  {serviceAreas.map((area) => (
                    <li key={area.categoryId} className="sv-area-item">
                      <span className="sv-area-name">{area.name}</span>
                      <div className="sv-area-item-actions">
                        <div className="sv-area-edit-group">
                          <label
                            htmlFor={`sv-years-${area.categoryId}`}
                            className="sv-area-years-label"
                          >
                            Deneyim:
                          </label>
                          <select
                            id={`sv-years-${area.categoryId}`}
                            className="sv-area-years-select"
                            value={area.years}
                            onChange={(e) =>
                              handleUpdateAreaYears(area.categoryId, Number(e.target.value))
                            }
                            disabled={loading || saving}
                            title="Deneyim yılını düzenle"
                          >
                            {EXPERIENCE_YEARS.map((yr) => (
                              <option key={yr} value={yr}>
                                {yr} yıl deneyim
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          className="sv-chip-remove"
                          aria-label={`${area.name} hizmet alanını kaldır`}
                          onClick={() => handleRemoveArea(area.categoryId)}
                          disabled={loading || saving}
                          title="Hizmet alanını kaldır"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="sv-area-add-row">
                <div className="sv-typeahead" ref={areaTypeaheadRef}>
                  <FaSearch className="sv-input-search-icon" size={13} aria-hidden="true" />
                  <input
                    type="text"
                    id="sv-area-search"
                    className="sv-input-with-icon"
                    value={selectedCategory ? selectedCategory.label : areaQuery}
                    onChange={(e) => {
                      setSelectedCategory(null);
                      setAreaQuery(e.target.value);
                      setAreaDropdownOpen(true);
                    }}
                    onFocus={() => setAreaDropdownOpen(true)}
                    placeholder="Hizmet alanı seçin veya yazın (örn. klima, boya, web tasarım)"
                    autoComplete="off"
                    disabled={loading || saving}
                  />
                  {areaDropdownOpen && filteredCategories.length > 0 && !selectedCategory && (
                    <ul className="sv-typeahead-list" role="listbox">
                      {filteredCategories.map((cat) => (
                        <li key={cat.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setAreaQuery(cat.label);
                              setAreaDropdownOpen(false);
                            }}
                          >
                            <span>{cat.label}</span>
                            {cat.parentName && <em>{cat.parentName}</em>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="sv-area-add-controls">
                  <select
                    className="sv-years-add-select"
                    value={selectedYears}
                    onChange={(e) => setSelectedYears(Number(e.target.value))}
                    aria-label="Deneyim yılı"
                    disabled={loading || saving}
                  >
                    {EXPERIENCE_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr} yıl
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="sv-add-button"
                    onClick={handleAddArea}
                    disabled={loading || saving}
                  >
                    <FaPlus size={11} />
                    <span>Ekle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Bölüm 2: Yetenekler ve Uzmanlık */}
          {showSkills && (
          <div className="sv-section-card sv-fade-in">
            <div className="sv-section-header">
              <div className="sv-header-left">
                <h2 className="sv-section-title">Yeteneklerim</h2>
                <span className="sv-count-pill">{skillItems.length}/25</span>
              </div>
              <p className="sv-section-subtitle">
                Yazmaya başlayın ve listeden uzmanlık etiketlerinizi seçin. Profilinizde ve aramalarda öne çıkmanızı sağlar.
              </p>
            </div>

            <div className="sv-section-content">
              {skillItems.length > 0 && (
                <div className="sv-chip-list">
                  {skillItems.map((skill) => (
                    <span key={skill.id} className="sv-chip">
                      <span>{skill.name}</span>
                      <button
                        type="button"
                        className="sv-chip-remove"
                        aria-label={`${skill.name} yeteneğini kaldır`}
                        onClick={() => handleRemoveSkill(skill.id)}
                        disabled={loading || saving}
                      >
                        <FaTimes size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="sv-typeahead sv-skill-typeahead" ref={skillTypeaheadRef}>
                <FaSearch className="sv-input-search-icon" size={13} aria-hidden="true" />
                <input
                  type="text"
                  id="sv-skill-search"
                  className="sv-input-with-icon"
                  value={skillQuery}
                  onChange={(e) => setSkillQuery(e.target.value)}
                  onFocus={() => setSkillDropdownOpen(true)}
                  placeholder="Yetenek ara (örn. klima montajı, react, fayans)"
                  autoComplete="off"
                  disabled={loading || saving}
                />
                {skillDropdownOpen && availableSkillSuggestions.length > 0 && (
                  <ul className="sv-typeahead-list" role="listbox">
                    {availableSkillSuggestions.map((skill) => (
                      <li key={skill.id}>
                        <button type="button" onClick={() => handleAddSkill(skill)}>
                          <span>{skill.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Form Aksiyon Çubuğu (Kaydet Butonu - Temel Bilgiler ile Tam Uyumlu) */}
        <div className="sv-actions-bar">
          <div className="sv-actions-inner">
            <p className="sv-actions-hint">Değişikliklerin kaydedilmesi için lütfen butona tıklayın.</p>
            <button type="submit" className="sv-save-button" disabled={loading || saving}>
              {saving ? (
                <>
                  <FaSpinner className="spin-icon" size={14} aria-hidden="true" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <FaCheckCircle size={14} aria-hidden="true" />
                  <span>Değişiklikleri Kaydet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Services;
