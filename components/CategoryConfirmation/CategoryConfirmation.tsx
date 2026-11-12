"use client";

import React from 'react';

interface CategoryConfirmationProps {
  categories?: Record<string, string | null | undefined> | null;
}

function CategoryConfirmation({ categories }: CategoryConfirmationProps) {
  // categories'in bir array olduğundan emin olalım
  const categoryArray = categories ? Object.values(categories).filter(Boolean) as string[] : [];

  return (
    <div className="category-confirmation">
      {categoryArray.length > 0 ? (
        <div className="selected-categories">
          {categoryArray.map((category, index) => (
            <div key={index} className="category-item">
              {category}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-selection">
          Henüz kategori seçilmedi
        </div>
      )}
    </div>
  );
}

export default CategoryConfirmation;
