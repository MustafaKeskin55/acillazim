"use client";

import React, { useState, useEffect } from 'react';
import './CategoryPathDisplay.css';
import { getCategoryTree, formatCategoryPath } from '@/services/filters/categoryTreeService';

/**
 * Kategori Yolu Gösterimi
 * FilterPage içinde kategori ağaç yapısını gösterir
 * 
 * @param {Object} props
 * @param {string|number} props.categoryId - Gösterilecek kategori ID'si
 * @returns {JSX.Element}
 */
const CategoryPathDisplay = ({ categoryId }) => {
  const [loading, setLoading] = useState(true);
  const [categoryPath, setCategoryPath] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchCategoryPath = async () => {
      if (!categoryId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Kategori ağacını getir
        const result = await getCategoryTree(categoryId);
        
        if (result.success && result.data && result.data.categoryPath) {
          setCategoryPath(result.data.categoryPath);
          setError(null);
        } else {
          setError('Kategori bilgisi alınamadı');
          setCategoryPath([]);
        }
      } catch (error) {
        console.error('Kategori yolu gösterimi hatası:', error);
        setError('Kategori bilgileri yüklenirken bir hata oluştu');
        setCategoryPath([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategoryPath();
  }, [categoryId]);
  
  // Kategori yolunu kullanıcı dostu formata çevir
  const { categories } = formatCategoryPath(categoryPath);
  
  if (loading) {
    return <div className="category-path-loading">Kategori bilgileri yükleniyor...</div>;
  }
  
  if (error) {
    return null; // Hata varsa hiçbir şey gösterme
  }
  
  if (!categories || categories.length === 0) {
    return null; // Kategori yoksa hiçbir şey gösterme
  }
  
  return (
    <div className="category-path-container">
      <div className="category-path-header">Kategori</div>
      <div className="category-path-blocks">
        {categories.map((category, index) => (
          <div key={category.id} className="category-path-block">
            <span className="category-name">{category.name}</span>
            {index < categories.length - 1 && (
              <span className="category-separator"></span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPathDisplay; 