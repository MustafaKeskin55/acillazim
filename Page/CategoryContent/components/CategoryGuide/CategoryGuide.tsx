"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faInfoCircle, faCamera, faShield, faTag, faUserShield,
  faMoneyBillWave, faFileContract, faExclamationTriangle,
  faEye, faCheckCircle, faTools, faCarSide, faHome, faLaptop,
  faCouch, faTshirt, faChild, faBook, faBicycle, faPaw,
  faBusinessTime, faIndustry, faCogs, faHardHat, faWrench,
  faTruck, faWarehouse, faRobot, faFan, faDraftingCompass,
  faHammer, faChargingStation, faSolarPanel, faPlug, faPrint,
  faMicrochip, faMobileAlt, faTabletAlt, faBuilding, faCity,
  faKey, faRuler, faPallet, faChair, faLightbulb, faGem,
  faGlasses, faShoePrints, faBaby, faGamepad, faFootballBall,
  faHeart, faMedkit, faAppleAlt,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import ContentGuideService from '@/services/content/ContentGuideService';
import './CategoryGuide.css';

interface CategoryData {
  id?: number | string;
  name?: string;
  [key: string]: unknown;
}

interface GuideTip {
  id?: string | number;
  title?: string;
  description?: string;
  icon?: string | IconDefinition;
}

interface GuideData {
  icon?: string;
  label?: string;
  categoryName?: string;
  sections?: GuideTip[];
  [key: string]: unknown;
}

interface CategoryGuideProps {
  categoryData?: CategoryData;
  onExploreClick?: () => void;
}

const CategoryGuide: React.FC<CategoryGuideProps> = ({ categoryData, onExploreClick }) => {
  const [guideData, setGuideData] = useState<GuideData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const iconMap = useMemo<Record<string, IconDefinition>>(() => ({
    faInfoCircle, faCamera, faShield, faTag, faUserShield,
    faMoneyBillWave, faFileContract, faExclamationTriangle,
    faEye, faCheckCircle, faTools, faCarSide, faHome, faLaptop,
    faCouch, faTshirt, faChild, faBook, faBicycle, faPaw,
    faBusinessTime, faIndustry, faCogs, faHardHat, faWrench,
    faTruck, faWarehouse, faRobot, faFan, faDraftingCompass,
    faHammer, faChargingStation, faSolarPanel, faPlug, faPrint,
    faMicrochip, faMobileAlt, faTabletAlt, faBuilding, faCity,
    faKey, faRuler, faPallet, faChair, faLightbulb, faGem,
    faGlasses, faShoePrints, faBaby, faGamepad, faFootballBall,
    faHeart, faMedkit, faAppleAlt,
  }), []);

  useEffect(() => {
    const fetchGuideData = async () => {
      if (!categoryData?.id) { setIsLoading(false); return; }
      setIsLoading(true);
      setError(null);
      try {
        const response = await (ContentGuideService as { getContentByCategoryId: (id: number | string) => Promise<{ data: GuideData }> }).getContentByCategoryId(categoryData.id);
        setGuideData(response.data);
      } catch {
        setError('Rehber verisi yüklenemedi');
        setGuideData(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGuideData();
  }, [categoryData?.id]);

  const getIconFromString = useCallback((iconString: string): IconDefinition => {
    return iconMap[iconString] || faInfoCircle;
  }, [iconMap]);

  const getCategoryIcon = useMemo<IconDefinition>(() => {
    if (guideData?.icon) return getIconFromString(guideData.icon);
    return faInfoCircle;
  }, [guideData, getIconFromString]);

  const categoryTips = useMemo<GuideTip[]>(() => {
    if (guideData?.sections && Array.isArray(guideData.sections)) return guideData.sections;
    return [];
  }, [guideData]);

  if (isLoading) return <div className="category-guide"><div className="guide-loading"><p>Rehber yükleniyor...</p></div></div>;
  if (error) return null;
  if (!categoryData && !guideData) return null;
  if (!categoryTips || categoryTips.length === 0) return null;

  const guideTitle = guideData?.label || guideData?.categoryName || categoryData?.name || 'Kategori';
  const guideSubtitle = guideData?.categoryName
    ? `${guideData.categoryName} kategorisinde ilanları incelerken dikkat edilmesi gereken noktalar ve öneriler`
    : 'İlanları incelerken dikkat edilmesi gereken noktalar ve öneriler';

  return (
    <div className="category-guide">
      <div className="guide-background"></div>
      <div className="guide-pattern"></div>
      <div className="guide-content">
        <div className="guide-header">
          <div className="guide-icon">
            <FontAwesomeIcon icon={getCategoryIcon} />
          </div>
          <div className="guide-title-container">
            <h2 className="guide-title">{guideTitle} Rehberi</h2>
            <p className="guide-subtitle">{guideSubtitle}</p>
          </div>
        </div>
        <div className="guide-body">
          {categoryTips.map((tip, index) => {
            const tipIcon = typeof tip.icon === 'string' ? getIconFromString(tip.icon) : (tip.icon as IconDefinition);
            return (
              <div key={tip.id || index} className="guide-card horizontal-card">
                <div className="card-icon-container">
                  <FontAwesomeIcon icon={tipIcon} className="card-icon" />
                </div>
                <div className="card-content">
                  <h3 className="card-title">{tip.title}</h3>
                  <p className="card-description">{tip.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryGuide;
