'use client';

import React, { useState, useEffect, useContext } from 'react';
import { FaMapMarkedAlt, FaListUl, FaExclamationTriangle } from 'react-icons/fa';
import ServiceAreasManual from './ServiceAreasManual/ServiceAreasManual';
import ServiceAreasModal from './ServiceAreasModal/ServiceAreasModal';
import ServiceAreasContext from '@/context/ServiceAreasContext';
import './ServiceAreaSelector.css';

/**
 * @param {object} props
 * @param {boolean} [props.embedded] — true: ilan düzenleme modali; context yerine `listingId` + `existingAreas` + `onSave`
 * @param {string|number} [props.listingId] — ilan id (backend service-areas endpoint'i ServiceEdit.jsx üzerinden çağrılır)
 * @param {{ type: 'map'|'manual'|null, areas: unknown[] }} [props.existingAreas]
 * @param {(payload: { type: string, areas: unknown[] }) => void} [props.onSave]
 */
const ServiceAreaSelector = ({
  embedded = false,
  listingId,
  existingAreas,
  onSave: onEmbeddedSave,
}) => {
  const context = useContext(ServiceAreasContext);

  if (!embedded && context == null) {
    throw new Error("ServiceAreaSelector: ServiceAreasProvider gerekli (embedded değilse).");
  }

  const serviceAreas = embedded ? null : context.serviceAreas;
  const loading = embedded ? false : context.loading;
  const saveAreas = embedded ? null : context.saveAreas;
  const deleteAreas = embedded ? null : context.deleteAreas;

  const [selectionType, setSelectionType] = useState(null);
  const [isMapEditing, setIsMapEditing] = useState(false);
  /** Leaflet modülü import aşamasında `window` kullanır; `useEffect` içi import() yalnızca tarayıcıda çalışır */
  const [MapComponent, setMapComponent] = useState(null);

  const [localAreas, setLocalAreas] = useState({
    type: null,
    areas: [],
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (embedded) {
      // Backend'den yüklenen seçim (bkz. ServiceEdit.jsx → loadServiceAreasSelection).
      setLocalAreas({
        type: existingAreas?.type ?? null,
        areas: existingAreas?.areas ?? [],
      });
      return;
    }

    if (serviceAreas) {
      const type =
        serviceAreas.map.length > 0 ? 'map' : serviceAreas.manual.length > 0 ? 'manual' : null;
      setLocalAreas({
        type,
        areas: type ? serviceAreas[type] : [],
      });
    }
  }, [embedded, listingId, existingAreas, serviceAreas]);

  useEffect(() => {
    if (selectionType !== 'map') {
      setMapComponent(null);
      return;
    }
    let cancelled = false;
    import('./ServiceAreasMap/ServiceAreasMap').then((mod) => {
      if (!cancelled) setMapComponent(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [selectionType]);

  const showSelectionScreen = () => {
    setSelectionType(null);
  };

  const showModal = (title, message, onConfirm) => {
    setModalConfig({
      title,
      message,
      onConfirm,
    });
    setIsModalOpen(true);
  };

  const changeSelectionType = async (newType) => {
    if (localAreas.type && !embedded) {
      await deleteAreas(localAreas.type);
    }

    setLocalAreas({
      type: newType,
      areas: [],
    });

    setSelectionType(newType);
    setIsMapEditing(false);
  };

  const handleSave = async (type, areas) => {
    if (embedded) {
      setLocalAreas({ type, areas });
      if (onEmbeddedSave) {
        await onEmbeddedSave({ type, areas });
      }
      return true;
    }

    const success = await saveAreas(type, areas);

    if (success) {
      setLocalAreas({
        type,
        areas,
      });
    }
    return success;
  };

  if (loading && !selectionType && !embedded) {
    return (
      <div className="area-selector-container">
        <div className="loading-indicator">Yükleniyor...</div>
      </div>
    );
  }

  const hasExistingData = localAreas.type && localAreas.areas && localAreas.areas.length > 0;

  const existingDataType = localAreas.type;
  const existingDataCount = localAreas.areas?.length || 0;

  if (!selectionType) {
    return (
      <div className="area-selector-container">
        <ServiceAreasModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={() => {
            setIsModalOpen(false);
            modalConfig.onConfirm();
          }}
          title={modalConfig.title}
          message={modalConfig.message}
        />

        <h2>Hizmet Bölgesi Seçim Yöntemi</h2>

        {hasExistingData && (
          <div className="warning-message">
            <FaExclamationTriangle className="warning-icon" />
            <div className="warning-content">
              <h4>Mevcut Seçimleriniz</h4>
              <p>
                {existingDataType === 'manual'
                  ? `Manuel olarak seçilmiş ${existingDataCount} bölgeniz var.`
                  : `Harita üzerinde seçilmiş ${existingDataCount} bölgeniz var.`}
                <br />
                Farklı bir yöntem seçerseniz mevcut seçimleriniz silinecektir.
              </p>
            </div>
          </div>
        )}

        <div className="selection-methods">
          <button
            type="button"
            className="selection-method map"
            onClick={() => {
              if (hasExistingData && existingDataType === 'manual') {
                showModal(
                  'Dikkat',
                  `Manuel olarak seçilmiş ${existingDataCount} bölgeniz var. Bu seçimler silinecek. Devam etmek istiyor musunuz?`,
                  () => changeSelectionType('map')
                );
              } else {
                setSelectionType('map');
                setIsMapEditing(false);
              }
            }}
          >
            <FaMapMarkedAlt />
            <h3>Harita Üzerinden Seç</h3>
            <p>Harita üzerinde bölgeleri işaretleyerek seçim yapın</p>
          </button>

          <button
            type="button"
            className="selection-method manual"
            onClick={() => {
              if (hasExistingData && existingDataType === 'map') {
                showModal(
                  'Dikkat',
                  `Harita üzerinde seçilmiş ${existingDataCount} bölgeniz var. Bu seçimler silinecek. Devam etmek istiyor musunuz?`,
                  () => changeSelectionType('manual')
                );
              } else {
                setSelectionType('manual');
              }
            }}
          >
            <FaListUl />
            <h3>Manuel Seç</h3>
            <p>İl ve ilçe listesinden seçim yapın</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {selectionType === 'map' ? (
        MapComponent ? (
          <MapComponent
            isEditing={isMapEditing}
            existingAreas={localAreas.type === 'map' ? localAreas.areas : null}
            onStartEditing={() => setIsMapEditing(true)}
            onSaveChanges={async (areas) => {
              await handleSave('map', areas);
              setIsMapEditing(false);
            }}
            onCancelEditing={() => {
              setIsMapEditing(false);
            }}
            onBackToSelection={showSelectionScreen}
          />
        ) : (
          <div className="area-selector-container">
            <div className="loading-indicator">Harita yükleniyor…</div>
          </div>
        )
      ) : (
        <ServiceAreasManual
          existingAreas={localAreas.type === 'manual' ? localAreas.areas : null}
          onSave={(areas) => {
            handleSave('manual', areas);
          }}
          onCancel={showSelectionScreen}
        />
      )}
    </>
  );
};

export default ServiceAreaSelector;
