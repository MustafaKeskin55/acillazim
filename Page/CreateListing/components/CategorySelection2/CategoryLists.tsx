"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { IoChevronForward, IoCheckmarkCircle } from "react-icons/io5";
import * as Fa6Icons from "react-icons/fa6";
import * as FaIcons from "react-icons/fa";
import * as IoIcons from "react-icons/io5";
import "./CategoryLists.css";

interface CategoryItem {
  id: string | number;
  name: string;
  hasChildren?: boolean;
  icon?: string | null;
  [key: string]: unknown;
}

const renderCategoryIcon = (iconName?: string | null): React.ReactNode => {
  if (!iconName) return null;
  const IconComp =
    (Fa6Icons as Record<string, React.ElementType | undefined>)[iconName] ||
    (FaIcons as Record<string, React.ElementType | undefined>)[iconName] ||
    (IoIcons as Record<string, React.ElementType | undefined>)[iconName];
  return IconComp ? <IconComp className="category-item-icon-svg" /> : null;
};

interface SelectedCategory {
  id: string | number;
  name: string;
}

interface SelectedCategories {
  [key: string]: SelectedCategory | null;
}

interface Categories {
  [key: string]: CategoryItem[];
}

interface CategoryListsProps {
  categories: Categories;
  selectedCategories: SelectedCategories;
  currentLevel: number;
  mobileDisplayLevel: number;
  onSelect: (id: string | number, name: string, level: number) => void;
  onBack: () => void;
  showSummary: boolean;
  mainCategoryName?: string;
}

export default function CategoryLists({
  categories,
  selectedCategories,
  currentLevel,
  mobileDisplayLevel,
  onSelect,
  showSummary,
}: CategoryListsProps) {
  const router = useRouter();

  const handleDesktopClick = useCallback(
    (categoryId: string | number, categoryName: string, level: number) => {
      onSelect(categoryId, categoryName, level);
      setTimeout(() => {
        const container = document.querySelector(".category-lists-container");
        const box = document.querySelector(
          `.category-box[data-level="${level + 1}"]`,
        );
        if (container && box) {
          (container as HTMLElement).scrollTo({
            left:
              (box as HTMLElement).offsetLeft -
              (container as HTMLElement).offsetLeft -
              12,
            behavior: "smooth",
          });
        }
      }, 100);
    },
    [onSelect],
  );

  const handleMobileClick = (
    categoryId: string | number,
    categoryName: string,
    level: number,
  ) => {
    onSelect(categoryId, categoryName, level);
  };

  const handleContinue = () => {
    sessionStorage.setItem(
      "selectedCategories",
      JSON.stringify({
        kategori0: selectedCategories.level1,
        kategori1: selectedCategories.level2,
        kategori2: selectedCategories.level3,
      }),
    );
    router.push("/ilan-form");
  };

  /* ── Mobile: parent'tan gelen mobileDisplayLevel kullan ── */
  const mobileItems = categories[`level${mobileDisplayLevel}`] ?? [];
  const mobileSelectedItem = selectedCategories[`level${mobileDisplayLevel}`];

  /* ── Desktop: tüm dolu seviyeler yatay ── */
  const renderDesktopBoxes = () => {
    const boxes = [];
    for (let level = 1; level <= 6; level++) {
      const items = categories[`level${level}`];
      if (!items || items.length === 0) break;

      const hasIcons = items.some((cat) => Boolean(cat.icon));

      boxes.push(
        <div
          key={`lvl-${level}`}
          className={`category-box${hasIcons ? " category-box--has-icons" : ""}`}
          data-level={level}
        >
          {items.map((cat) => {
            const isSelected =
              selectedCategories[`level${level}`]?.id === cat.id;
            const iconElement = renderCategoryIcon(cat.icon);
            return (
              <div
                key={cat.id}
                className={`list-group-item${isSelected ? " selected" : ""}`}
                onClick={() => handleDesktopClick(cat.id, cat.name, level)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  handleDesktopClick(cat.id, cat.name, level)
                }
              >
                <div className="list-group-item-content">
                  {iconElement && (
                    <span className="cat-icon-wrap" aria-hidden="true">
                      {iconElement}
                    </span>
                  )}
                  <span className="cat-text">{cat.name}</span>
                </div>
                {cat.hasChildren && (
                  <span className="has-children-icon">›</span>
                )}
              </div>
            );
          })}
        </div>,
      );
    }
    return boxes;
  };

  return (
    <>
      {/* ═══════════════════════════════════════════
          MOBİL — tam ekran, sayfa sayfa drill-down
          ═══════════════════════════════════════════ */}
      <div className="cl-mobile">
        {showSummary ? (
          /* Seçim tamamlandı ekranı */
          <div className="cl-mobile-done">
            <IoCheckmarkCircle className="cl-mobile-done__icon" />
            <h3 className="cl-mobile-done__title">Kategori Seçildi</h3>
            <div className="cl-mobile-done__path">
              {[1, 2, 3, 4, 5, 6].map(
                (lvl) =>
                  selectedCategories[`level${lvl}`]?.name && (
                    <div key={lvl} className="cl-mobile-done__step">
                      <span className="cl-mobile-done__step-num">{lvl}</span>
                      <span className="cl-mobile-done__step-name">
                        {selectedCategories[`level${lvl}`]!.name}
                      </span>
                    </div>
                  ),
              )}
            </div>
            <button className="cl-mobile-continue" onClick={handleContinue}>
              İlan Oluştur
              <IoChevronForward />
            </button>
          </div>
        ) : (
          /* Kategori listesi */
          <div className="cl-mobile-list">
            {mobileItems.map((cat) => {
              const isSelected = mobileSelectedItem?.id === cat.id;
              const iconElement = renderCategoryIcon(cat.icon);
              return (
                <button
                  key={cat.id}
                  className={`cl-mobile-row${isSelected ? " cl-mobile-row--selected" : ""}`}
                  onClick={() =>
                    handleMobileClick(cat.id, cat.name, mobileDisplayLevel)
                  }
                >
                  <div className="cl-mobile-row-content">
                    {iconElement && (
                      <span className="cl-mobile-icon-wrap" aria-hidden="true">
                        {iconElement}
                      </span>
                    )}
                    <span className="cl-mobile-row__name">{cat.name}</span>
                  </div>
                  <span className="cl-mobile-row__right">
                    {isSelected ? (
                      <IoCheckmarkCircle className="cl-mobile-row__check" />
                    ) : (
                      <IoChevronForward className="cl-mobile-row__chevron" />
                    )}
                  </span>
                </button>
              );
            })}

            {mobileItems.length === 0 && (
              <div className="cl-mobile-empty">Kategori bulunamadı.</div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          DESKTOP — yatay kaydırılabilir paneller
          ═══════════════════════════════════════════ */}
      <div className="category-lists-container">
        <div className="category-boxes-wrapper">
          {renderDesktopBoxes()}

          {showSummary && (
            <div className="category-box summary-card show">
              <h3>Kategori seçimi tamamlanmıştır.</h3>
              <div className="summary-content">
                {[1, 2, 3, 4, 5, 6].map(
                  (lvl) =>
                    selectedCategories[`level${lvl}`]?.name && (
                      <div key={lvl} className="summary-item">
                        <span>{selectedCategories[`level${lvl}`]!.name}</span>
                      </div>
                    ),
                )}
              </div>
              <button className="continue-button" onClick={handleContinue}>
                Devam Et
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
