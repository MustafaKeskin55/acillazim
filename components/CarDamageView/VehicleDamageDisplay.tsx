"use client";

import React, { useState, useEffect, useRef } from 'react';
import './VehicleDamageDisplay.css';
import carDamageService from '@/services/productDetail/carDamageService';

interface StatusTypeData {
  label: string;
  color: string;
}

interface DamageConfig {
  title?: string;
  statusTypes?: Record<string, StatusTypeData>;
  partTranslations?: Record<string, string>;
}

interface DamageData {
  partsStatus: Record<string, string>;
  hasAnyDamage: boolean;
  message?: string;
  config?: DamageConfig;
}

interface VehicleDamageDisplayProps {
  productData?: Record<string, unknown>;
  showTitle?: boolean;
  titleText?: string;
}

const VehicleDamageDisplay: React.FC<VehicleDamageDisplayProps> = ({
  productData, showTitle = true, titleText,
}) => {
  const [damageData, setDamageData] = useState<DamageData | null>(null);
  const [statusColors, setStatusColors] = useState<Record<string, string>>({});
  const [partNames, setPartNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [svgElement, setSvgElement] = useState<Element | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!productData) { setLoading(false); return; }
    (async () => {
      try {
        setLoading(true);
        const response = await (carDamageService as Record<string, (...args: unknown[]) => Promise<{ success: boolean; data: DamageData }>>)
          .processCarDamageInfo(productData as unknown);
        if (!response?.success || !response?.data) { setDamageData(null); return; }
        setDamageData(response.data);
        if (response.data.config) {
          const statusTypesMap: Record<string, string> = {};
          Object.entries(response.data.config.statusTypes || {}).forEach(([, data]) => {
            statusTypesMap[data.label] = data.color;
          });
          setStatusColors(statusTypesMap);
          setPartNames(response.data.config.partTranslations || {});
        }
      } catch { setDamageData(null); }
      finally { setLoading(false); }
    })();
  }, [productData]);

  useEffect(() => {
    fetch('/damage-areaac.svg')
      .then((r) => r.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        setSvgElement(svgDoc.documentElement);
      })
      .catch((err) => console.error('SVG yüklenirken hata:', err));
  }, []);

  const getPartName = (partId: string): string => partNames[partId] || partId;

  const handlePartHover = (event: Event) => {
    const part = event.target as SVGElement;
    const status = part.getAttribute('data-status');
    const name = part.getAttribute('data-name');
    const tooltip = tooltipRef.current;
    if (tooltip && name && status) {
      const cleanName = name.replace(/\.$/, '');
      const nameEl = document.getElementById('tooltip-part-name');
      const statusEl = document.getElementById('tooltip-part-status');
      if (nameEl) nameEl.textContent = cleanName;
      if (statusEl) statusEl.textContent = status;
      const rect = part.getBoundingClientRect();
      const containerRect = svgContainerRef.current!.getBoundingClientRect();
      tooltip.style.left = `${rect.left - containerRect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
      tooltip.style.top = `${rect.top - containerRect.top - tooltip.offsetHeight - 10}px`;
      tooltip.style.opacity = '1';
    }
  };

  const handlePartOut = () => {
    if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
  };

  useEffect(() => {
    if (!svgElement || !svgContainerRef.current || !damageData?.partsStatus || Object.keys(statusColors).length === 0) return;
    const container = svgContainerRef.current;
    container.innerHTML = '';
    const svgClone = svgElement.cloneNode(true) as Element;
    container.appendChild(svgClone);

    const allParts = container.querySelectorAll('[id]');
    const partIdPattern = /^(on|arka|motor|sag|ust)_/;
    const processedPartNames = new Set<string>();

    allParts.forEach((element) => {
      if (partIdPattern.test(element.id) && !processedPartNames.has(element.id)) {
        processedPartNames.add(element.id);
        const defaultColor = statusColors['Orijinal'] || Object.values(statusColors)[0] || '#E0E0E0';
        element.setAttribute('fill', defaultColor);
        element.classList.add('car-part');
        element.setAttribute('data-status', 'Orijinal');
        element.setAttribute('data-name', getPartName(element.id));
        element.addEventListener('mouseover', handlePartHover);
        element.addEventListener('mouseout', handlePartOut);
      }
    });

    Object.entries(damageData.partsStatus).forEach(([partId, status]) => {
      const el = container.querySelector(`#${partId}`);
      if (el && status) {
        const color = statusColors[status] || statusColors['Orijinal'] || Object.values(statusColors)[0] || '#E0E0E0';
        el.setAttribute('fill', color);
        el.setAttribute('data-status', status);
      }
    });
  }, [svgElement, damageData, statusColors]);

  if (!damageData || Object.keys(damageData.partsStatus || {}).length === 0) return null;

  const displayTitle = titleText || damageData.config?.title || 'Boyalı veya Değişen Parça';

  return (
    <div className="damage-display-container">
      {showTitle && <h3 className="damage-display-title">{displayTitle}</h3>}
      <div className="damage-display-content">
        <div className="color-legend">
          {damageData.config?.statusTypes && Object.entries(damageData.config.statusTypes).map(([key, data]) => (
            <div className="legend-item" key={key}>
              <span className="color-box" style={{ backgroundColor: data.color }} />
              <span className="legend-text">{data.label}</span>
            </div>
          ))}
        </div>
        <div className="car-diagram-container">
          {loading ? (
            <div className="loading-indicator">Hasar bilgileri yükleniyor...</div>
          ) : (
            <>
              <div className="car-diagram">
                <div className="car-svg-container" ref={svgContainerRef} />
                <div className="car-part-tooltip" id="car-part-tooltip" ref={tooltipRef}>
                  <span id="tooltip-part-name" />
                  <span id="tooltip-part-status" />
                </div>
              </div>
              <div className="damage-info-panel">
                <h4 className="damage-info-title">Parça Durumları</h4>
                <div className="damage-info-section">
                  {damageData.hasAnyDamage ? (
                    <div className="parts-status-list">
                      {damageData.config?.statusTypes && Object.entries(damageData.config.statusTypes).map(([statusKey, statusData]) => {
                        const partsWithStatus = Object.entries(damageData.partsStatus)
                          .filter(([, status]) => status === statusData.label)
                          .map(([partId]) => partId);
                        if (partsWithStatus.length === 0) return null;
                        return (
                          <div className="part-category" key={statusKey}>
                            <div className="category-label">
                              <span className="status-dot" style={{ backgroundColor: statusData.color }} />
                              <span>{statusData.label} parçalar:</span>
                            </div>
                            <div className="category-parts">
                              {partsWithStatus.map((partId) => (
                                <span key={partId} className="part-name">{getPartName(partId)}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="damage-info-text">{damageData.message}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleDamageDisplay;
