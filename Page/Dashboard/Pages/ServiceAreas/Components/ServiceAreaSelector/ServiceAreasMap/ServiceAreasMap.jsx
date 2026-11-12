'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap, Circle, Polygon, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import './ServiceAreasMap.css';
import { FaSave, FaTimes, FaEdit, FaArrowLeft, FaExclamationTriangle, FaTrash } from 'react-icons/fa';

// Leaflet ikonları için statik importlar
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Leaflet ikon ayarları
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Leaflet Draw için Türkçe çeviriler
L.drawLocal = {
  draw: {
    toolbar: {
      actions: {
        title: 'Çizimi iptal et',
        text: 'İptal'
      },
      finish: {
        title: 'Çizimi tamamla',
        text: 'Tamamla'
      },
      undo: {
        title: 'Son çizilen noktayı sil',
        text: 'Son noktayı sil'
      },
      buttons: {
        polyline: 'Çizgi çiz',
        polygon: 'Çokgen çiz',
        rectangle: 'Dikdörtgen çiz',
        circle: 'Daire çiz',
        marker: 'İşaretçi ekle',
        circlemarker: 'Daire işaretçi ekle'
      }
    },
    handlers: {
      circle: {
        tooltip: {
          start: 'Daire çizmek için tıklayın ve sürükleyin'
        },
        radius: 'Yarıçap'
      },
      circlemarker: {
        tooltip: {
          start: 'Daire işaretçi eklemek için haritaya tıklayın'
        }
      },
      marker: {
        tooltip: {
          start: 'İşaretçi eklemek için haritaya tıklayın'
        }
      },
      polygon: {
        tooltip: {
          start: 'Çokgen çizmeye başlamak için tıklayın',
          cont: 'Çizime devam etmek için tıklayın',
          end: 'İlk noktaya tıklayarak çokgeni tamamlayın'
        }
      },
      polyline: {
        error: '<strong>Hata:</strong> şekil kenarları kesişemez!',
        tooltip: {
          start: 'Çizgi çizmeye başlamak için tıklayın',
          cont: 'Çizime devam etmek için tıklayın',
          end: 'Son noktaya tıklayarak çizgiyi tamamlayın'
        }
      },
      rectangle: {
        tooltip: {
          start: 'Dikdörtgen çizmek için tıklayın ve sürükleyin'
        }
      },
      simpleshape: {
        tooltip: {
          end: 'Çizimi bitirmek için fareyi bırakın'
        }
      }
    }
  },
  edit: {
    toolbar: {
      actions: {
        save: {
          title: 'Değişiklikleri kaydet',
          text: 'Kaydet'
        },
        cancel: {
          title: 'Düzenlemeyi iptal et',
          text: 'İptal'
        },
        clearAll: {
          title: 'Tüm katmanları temizle',
          text: 'Hepsini Temizle'
        }
      },
      buttons: {
        edit: 'Katmanları düzenle',
        editDisabled: 'Düzenlenecek katman yok',
        remove: 'Katmanları sil',
        removeDisabled: 'Silinecek katman yok'
      }
    },
    handlers: {
      edit: {
        tooltip: {
          text: 'Şekli değiştirmek için kontrol noktalarını sürükleyin',
          subtext: 'Değişiklikleri iptal etmek için iptal düğmesine tıklayın'
        }
      },
      remove: {
        tooltip: {
          text: 'Silmek istediğiniz şekle tıklayın'
        }
      }
    }
  }
};

// Bildirim bileşeni
const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`notification ${type}`}>
      {type === 'error' && <FaExclamationTriangle />}
      <span>{message}</span>
      <button onClick={onClose}>
        <FaTimes />
      </button>
    </div>
  );
};

// Daire için bounds oluşturan yardımcı fonksiyon
const getBoundsForCircle = (center, radius) => {
  // Dairenin kuzey, güney, doğu ve batı sınırlarını hesapla
  const northPoint = L.GeometryUtil.destination(center, 0, radius);
  const southPoint = L.GeometryUtil.destination(center, 180, radius);
  const eastPoint = L.GeometryUtil.destination(center, 90, radius);
  const westPoint = L.GeometryUtil.destination(center, 270, radius);
  
  // Eğer L.GeometryUtil mevcut değilse yaklaşık hesaplama yap
  if (!northPoint) {
    // Metreleri yaklaşık olarak lat/lng'ye çevir (çok kabaca bir yaklaşım)
    const latOffset = radius / 111000; // 111 km ~ 1 derece
    const lngOffset = radius / (111000 * Math.cos(center.lat * (Math.PI/180)));
    
    return L.latLngBounds(
      [center.lat - latOffset, center.lng - lngOffset],
      [center.lat + latOffset, center.lng + lngOffset]
    );
  }
  
  return L.latLngBounds(
    [southPoint.lat, westPoint.lng],
    [northPoint.lat, eastPoint.lng]
  );
};

// İki nokta arasındaki bir çizgide, belirli bir noktaya en yakın noktayı bulma yardımcı fonksiyonu
const closestPointOnLine = (linePt1, linePt2, point) => {
  const L2 = (linePt1.lat - linePt2.lat) * (linePt1.lat - linePt2.lat) + 
            (linePt1.lng - linePt2.lng) * (linePt1.lng - linePt2.lng);
  
  if (L2 === 0) return linePt1;
  
  let t = ((point.lat - linePt1.lat) * (linePt2.lat - linePt1.lat) + 
          (point.lng - linePt1.lng) * (linePt2.lng - linePt1.lng)) / L2;
  
  t = Math.max(0, Math.min(1, t));
  
  return L.latLng(
    linePt1.lat + t * (linePt2.lat - linePt1.lat),
    linePt1.lng + t * (linePt2.lng - linePt1.lng)
  );
};

// Haritadan kart kaldırma bileşeni
const RemoveCard = ({ position, onRemove }) => {
  const map = useMap();

  useEffect(() => {
    const div = L.DomUtil.create('div', 'remove-marker');
    const control = L.control({ position });

    control.onAdd = () => {
      div.innerHTML = `
        <div class="remove-marker-button" title="Tüm seçimleri kaldır">
          <svg viewBox="0 0 448 512" width="16" height="16">
            <path fill="currentColor" d="M432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16zM53.2 467a48 48 0 0 0 47.9 45h245.8a48 48 0 0 0 47.9-45L416 128H32z"></path>
          </svg>
        </div>
      `;
      
      L.DomEvent.on(div, 'click', () => {
      onRemove();
    });

      return div;
    };

    control.addTo(map);

    return () => {
      control.remove();
    };
  }, [map, position, onRemove]);

  return null;
};

// Modal Bileşeni
const Modal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <p className="modal-message">{message}</p>
        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>İptal</button>
          <button className="modal-confirm-btn" onClick={onConfirm}>Evet, Sil</button>
        </div>
      </div>
    </div>
  );
};

// Bölge seçici bileşeni
const DistrictSelector = ({ isActive, onDistrictSelect, selectedDistricts, selectedCircle }) => {
  const map = useMap();

  const handleClick = useCallback((e) => {
    if (!isActive) return;

    // Haritanın doğrudan kendisine tıklandığından emin ol
    // Eğer e.originalEvent.target harita dışında bir element ise işlemi durdur
    if (e.originalEvent && e.originalEvent.target && !e.originalEvent.target.classList.contains('leaflet-container')) {
        return;
      }

    // Tıklanan noktayı al
    const clickLatLng = e.latlng;
    
    // Tıklanan herhangi bir konum için bir hizmet alanı oluştur
    const selectedLocation = {
      id: Date.now(), // Benzersiz bir ID
      name: `Alan ${Date.now()}`, // Otomatik isim
      center: [clickLatLng.lat, clickLatLng.lng] // Tıklanan konum
    };
    
    // Seçimi işle
    onDistrictSelect(selectedLocation);
  }, [isActive, onDistrictSelect]);
  
  useEffect(() => {
    if (isActive) {
      map.on('click', handleClick);
    }

    return () => {
      map.off('click', handleClick);
    };
  }, [map, isActive, handleClick]);

  return null;
};

// Çizim kontrolleri bileşeni
const DrawControls = ({ onCreated, isActive }) => {
  const map = useMap();
  const featureGroupRef = useRef(null);

  useEffect(() => {
    if (!map || !isActive) return;
    
    // Çizim kontrolünü oluştur
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polyline: false,
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: '#e1e100',
            message: '<strong>Hata:</strong> Çokgen kendisiyle kesişemez!'
          },
          shapeOptions: {
            color: '#2196f3'
          },
          // Maksimum alan sınırı ekle
          metric: true,
          feet: false,
          showLength: true,
          showArea: true,
          maxArea: 9503320000 // 9503.32 km² (m² cinsinden)
        },
        rectangle: false,
        circle: {
          shapeOptions: {
            color: '#2196f3'
          },
          // Maksimum yarıçap sınırı ekle
          metric: true,
          feet: false,
          maxRadius: 55000 // 55 km (metre cinsinden)
        },
        marker: true,
        circlemarker: false
      },
      edit: false
    });
    
    // Kontrol ekle
    map.addControl(drawControl);

    // Çizim olayını dinle
    map.on(L.Draw.Event.CREATED, onCreated);
    
    // Temizle
    return () => {
      map.removeControl(drawControl);
      map.off(L.Draw.Event.CREATED);
    };
  }, [map, isActive, onCreated]);

  return null;
};

const ServiceAreasMap = ({ isEditing, existingAreas, onStartEditing, onSaveChanges, onCancelEditing, onBackToSelection }) => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [tempAreas, setTempAreas] = useState([]);
  const [tempDistricts, setTempDistricts] = useState([]);
  const [mode, setMode] = useState('draw');
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const featureGroupRef = useRef(null);
  const mapRef = useRef(null);

  // Alanları gerçek backenden (bkz. ServiceEdit.jsx → getServiceAreas) yükleyen üst
  // bileşenden gelen `existingAreas` prop'u ile başlat. Düzenleme modunda tekrar
  // ezmemek için sadece prop değiştiğinde ve düzenlemede değilken senkronize edilir.
  useEffect(() => {
    if (isEditing) return;
    setAreas(Array.isArray(existingAreas) ? existingAreas : []);
  }, [existingAreas, isEditing]);

  /**
   * Alan ekleme işlemi — backend yalnızca toplu (bulk-replace) kaydetmeyi destekler
   * (bkz. serviceEditApi.ts / ListingServiceAreaController), bu yüzden çizim anında
   * sadece yerel state güncellenir; gerçek kayıt "Kaydet" butonuna basıldığında
   * (handleSaveChanges) tek seferde backend'e gönderilir.
   */
  const handleAreaAdd = (newArea) => {
    try {
      const isIntersecting = checkIntersection(newArea);
      if (isIntersecting) {
        setNotification({
          message: 'Seçtiğiniz alanların kesişmemesi gerekir.',
          type: 'error'
        });
        return null;
      }
    } catch (intersectionError) {
      console.error('Kesişim kontrolünde hata:', intersectionError);
    }

    if (areas.length >= 3) {
      setNotification({
        message: 'En fazla 3 farklı hizmet alanı tanımlayabilirsiniz',
        type: 'error'
      });
      return null;
    }

    const savedArea = { ...newArea, id: newArea.id ?? Date.now().toString() };
    setAreas(prev => [...prev, savedArea]);

    setNotification({
      message: 'Hizmet alanı eklendi. Kalıcı olması için "Kaydet"e basın.',
      type: 'success'
    });
    return savedArea;
  };

  // Alan silme işlemi (yerel state — kalıcı hale gelmesi için "Kaydet" gerekir)
  const handleAreaDelete = (areaId) => {
    const areaToDelete = areas.find(area => area.id === areaId);

    if (!areaToDelete) {
      console.error('Silinecek alan bulunamadı:', areaId);
      setNotification({
        message: 'Silinecek alan bulunamadı.',
        type: 'error'
      });
      return;
    }

    setAreas(prev => prev.filter(area => area.id !== areaId));

    // Layer'ı da kaldır
    if (featureGroupRef.current) {
      const layers = featureGroupRef.current.getLayers();
      const layerToRemove = layers.find(layer => layer.areaId === areaId);
      if (layerToRemove) {
        featureGroupRef.current.removeLayer(layerToRemove);
      }
    }

    setNotification({
      message: 'Hizmet alanı kaldırıldı. Kalıcı olması için "Kaydet"e basın.',
      type: 'success'
    });
  };
  
  // Tüm alanları temizle
  const handleClearAll = () => {
    setIsModalOpen(true);
  };
  
  const confirmClearAll = () => {
    setIsModalOpen(false);

    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }

    setAreas([]);

    setNotification({
      message: 'Tüm hizmet alanları kaldırıldı. Kalıcı olması için "Kaydet"e basın.',
      type: 'success'
    });
  };

  // Bölge seçimi olayı
  const handleDistrictSelect = useCallback(async (district) => {
    // Önce bu bölgenin zaten seçili olup olmadığını kontrol et
    const existingAreaIndex = areas.findIndex(area => 
      area.type === 'circle' && 
      area.center && 
      area.center.lat === district.center[0] && 
      area.center.lng === district.center[1]
    );

    // Eğer bölge zaten seçiliyse, onu kaldır
    if (existingAreaIndex !== -1) {
      const areaToRemove = areas[existingAreaIndex];
      await handleAreaDelete(areaToRemove.id);
      return;
    }

    // Maksimum seçim kontrolü
    if (areas.length >= 3) {
      setNotification({
        message: 'En fazla 3 bölge seçebilirsiniz!',
        type: 'error'
      });
      return;
    }

    // Yeni alan oluştur
    const newArea = {
      type: 'circle',
      center: {
        lat: district.center[0],
        lng: district.center[1]
      },
      radius: 3000, // Varsayılan yarıçap 3000 metre, maksimum 55000 metre
      name: district.name
    };

    // Kesişim kontrolü yap
    const checkIntersection = () => {
      try {
        const circleCenter = L.latLng(newArea.center.lat, newArea.center.lng);
        const circleRadius = newArea.radius;
        
        // Tüm mevcut alanları kontrol et
        for (const area of areas) {
          // Mevcut alan bir daire ise
          if (area.type === 'circle' && area.center && area.radius) {
            const centerPoint = L.latLng(area.center.lat, area.center.lng);
            const distance = circleCenter.distanceTo(centerPoint);
            
            // İki daire kesişiyor mu?
            if (distance < (circleRadius + area.radius)) {
              return true;
            }
          }
          // Mevcut alan bir polygon veya rectangle ise
          else if ((area.type === 'polygon' || area.type === 'rectangle') && area.points && area.points.length > 0) {
            // Manuel bounds oluştur
            const circleBounds = getBoundsForCircle(circleCenter, circleRadius);
            
            // Polygon latlngs oluştur
            const polygonLatLngs = area.points.map(p => [p.lat, p.lng]);
            const poly = L.polygon(polygonLatLngs);
            
            // Bounds kontrolü yap
            try {
              const polyBounds = poly.getBounds();
              
              // Boundslar kesişiyor mu?
              if (circleBounds.intersects(polyBounds)) {
                // Dairenin merkezi polygon içinde mi?
                if (L.PolyUtil && L.PolyUtil.pointInPolygon) {
                  if (L.PolyUtil.pointInPolygon(circleCenter, polygonLatLngs)) {
                    return true;
                  }
                }
                
                // Polygon çizgilerine dairenin mesafesini kontrol et
                for (let i = 0; i < polygonLatLngs.length; i++) {
                  const p1 = L.latLng(polygonLatLngs[i][0], polygonLatLngs[i][1]);
                  const p2 = L.latLng(polygonLatLngs[(i + 1) % polygonLatLngs.length][0], polygonLatLngs[(i + 1) % polygonLatLngs.length][1]);
                  
                  // Çizgiye olan mesafeyi yaklaşık olarak hesapla
                  const closestPoint = closestPointOnLine(p1, p2, circleCenter);
                  const distance = circleCenter.distanceTo(closestPoint);
                  
                  if (distance < circleRadius) {
                    return true;
                  }
                }
              }
            } catch (e) {
              console.error("Polygon bounds hesaplanırken hata:", e);
              // Hata durumunda basit mesafe kontrolü yap
              const polygonCenter = polygonLatLngs.reduce((center, point) => {
                return {
                  lat: center.lat + point[0]/polygonLatLngs.length,
                  lng: center.lng + point[1]/polygonLatLngs.length
                };
              }, {lat: 0, lng: 0});
              
              const centerLatLng = L.latLng(polygonCenter.lat, polygonCenter.lng);
              const distance = circleCenter.distanceTo(centerLatLng);
              
              // Polygon merkezi ve daire merkezi arasındaki mesafe belirli bir eşikten küçükse kesişim kabul et
              if (distance < (circleRadius + 5000)) { // 5km buffer
                return true;
              }
            }
          }
          // Mevcut alan bir marker ise
          else if (area.type === 'marker' && area.center) {
            const markerPoint = L.latLng(area.center.lat, area.center.lng);
            const distance = circleCenter.distanceTo(markerPoint);
            
            // Marker dairenin içinde mi?
            if (distance < circleRadius) {
              return true;
            }
          }
          // Mevcut alan bir circlemarker ise
          else if (area.type === 'circlemarker' && area.center && area.radius) {
            const cmPoint = L.latLng(area.center.lat, area.center.lng);
            const cmRadius = area.radius || 10;
            const distance = circleCenter.distanceTo(cmPoint);
            
            // Daire ve circle marker kesişiyor mu?
            if (distance < (circleRadius + cmRadius)) { 
              return true;
            }
          }
        }
        return false;
      } catch (error) {
        console.error("Kesişim kontrolünde hata:", error);
        return false; // Hata durumunda kesişim olmadığını varsay
      }
    };

    // Kesişim kontrolünü yap
    const intersects = checkIntersection();
    
    if (intersects) {
      setNotification({
        message: 'Seçilen alan mevcut bir seçimle kesişiyor! Lütfen farklı bir alan seçin.',
        type: 'error'
      });
      return;
    }

    try {
      // Veritabanına kaydet
      const savedArea = await handleAreaAdd(newArea);
      
      if (savedArea) {
        // Layer oluştur ve popup ekle
        const layer = new L.Circle([newArea.center.lat, newArea.center.lng], {
          radius: newArea.radius,
            color: '#2196f3',
            fillColor: '#2196f3',
            fillOpacity: 0.2
        });
        
        // Layer'a alan ID'si ata
        layer.areaId = savedArea.id;

        layer.bindPopup(
          '<button class="remove-area-btn">Seçimi Kaldır</button>'
        ).on('popupopen', () => {
          const btn = document.querySelector('.remove-area-btn');
          if (btn) {
            btn.onclick = () => {
              handleAreaDelete(savedArea.id);
              layer.closePopup();
            };
          }
        });

        if (featureGroupRef.current) {
          featureGroupRef.current.addLayer(layer);
        } else if (mapRef.current) {
          // Feature group henüz oluşturulmamışsa haritaya ekle
          mapRef.current.addLayer(layer);
        }
      }
    } catch (error) {
      console.error('Bölge seçilirken hata:', error);
      setNotification({
        message: 'Bölge seçilirken bir hata oluştu.',
        type: 'error'
      });
    }
  }, [areas, handleAreaAdd, handleAreaDelete, mapRef]);

  // Çizim olayı
  const handleCreated = useCallback(async (e) => {
    if (!e || !e.layer) return;

    // Maksimum seçim kontrolü
    if (areas.length >= 3) {
      setNotification({
        message: 'En fazla 3 alan seçebilirsiniz!',
        type: 'error'
      });
      
      // Layer'ı haritadan kaldır
      mapRef.current?.removeLayer(e.layer);
      return;
    }

      const layer = e.layer;
      const type = e.layerType;
    let newArea;
    let intersects = false;

    // Alan sınırları kontrolü
    if (type === 'circle') {
      const radius = layer.getRadius();
      if (radius > 55000) { // 55 km kontrolü
        setNotification({
          message: 'Daire yarıçapı en fazla 55 km olabilir!',
          type: 'error'
        });
        
        // Layer'ı haritadan kaldır
        mapRef.current?.removeLayer(e.layer);
          return;
        }
    } else if (type === 'polygon' || type === 'rectangle') {
      try {
        // Poligon alanını hesapla
        const latlngs = layer.getLatLngs()[0];
        const area = L.GeometryUtil.geodesicArea(latlngs);
        
        if (area > 9503320000) { // 9503.32 km² kontrolü (m² cinsinden)
          setNotification({
            message: 'Çokgen alanı en fazla 9503.32 km² olabilir!',
            type: 'error'
          });
          
          // Layer'ı haritadan kaldır
          mapRef.current?.removeLayer(e.layer);
        return;
        }
      } catch (error) {
        console.error("Alan hesaplanırken hata:", error);
      }
    }

    // Kesişim kontrolü için yardımcı fonksiyon
    const checkIntersection = () => {
      try {
        // Mevcut alanları döngüyle kontrol et
        for (const area of areas) {
          // Marker kontrolünü diğer şekillerden ayrı yap
          if (type === 'marker') {
            const markerLatLng = layer.getLatLng();
            
            // Mevcut alan bir daire ise
            if (area.type === 'circle' && area.center && area.radius) {
              const centerPoint = L.latLng(area.center.lat, area.center.lng);
              const distance = markerLatLng.distanceTo(centerPoint);
              
              // Marker, dairenin içinde mi?
              if (distance < area.radius) {
                return true;
              }
            } 
            // Mevcut alan bir polygon veya rectangle ise
            else if ((area.type === 'polygon' || area.type === 'rectangle') && area.points && area.points.length > 0) {
              // Polygon içerisinde mi kontrolü
              const polygonLatLngs = area.points.map(p => [p.lat, p.lng]);
              
              // Leaflet PolyUtil kullanarak noktanın çokgen içinde olup olmadığını kontrol et
              if (L.PolyUtil && L.PolyUtil.pointInPolygon) {
                if (L.PolyUtil.pointInPolygon(markerLatLng, polygonLatLngs)) {
                  return true;
                }
              }
            }
            // Mevcut alan bir marker ise - noktalar aynı konumda mı?
            else if (area.type === 'marker' && area.center) {
              const centerPoint = L.latLng(area.center.lat, area.center.lng);
              const distance = markerLatLng.distanceTo(centerPoint);
              
              // Çok yakın noktalar (10 metre içinde) kesişiyor kabul et
              if (distance < 10) {
                return true;
              }
            }
            // Mevcut alan bir circlemarker ise
            else if (area.type === 'circlemarker' && area.center && area.radius) {
              const centerPoint = L.latLng(area.center.lat, area.center.lng);
              const distance = markerLatLng.distanceTo(centerPoint);
              
              // Marker, circle marker'ın içinde mi?
              if (distance < (area.radius || 10)) { 
                return true;
              }
            }
          }
          // Circle marker kontrolü
          else if (type === 'circlemarker') {
            const cmLatLng = layer.getLatLng();
            const cmRadius = layer.getRadius() || 10;
            
            // Mevcut alan bir daire ise
            if (area.type === 'circle' && area.center && area.radius) {
              const centerPoint = L.latLng(area.center.lat, area.center.lng);
              const distance = cmLatLng.distanceTo(centerPoint);
              
              // Circle marker, dairenin içinde/kesişiminde mi?
              if (distance < (area.radius + cmRadius)) {
                return true;
              }
            } 
            // Mevcut alan bir polygon veya rectangle ise
            else if ((area.type === 'polygon' || area.type === 'rectangle') && area.points && area.points.length > 0) {
              // Polygon içerisinde mi kontrolü
              const polygonLatLngs = area.points.map(p => [p.lat, p.lng]);
              
              // Noktanın çokgen içinde olup olmadığını kontrol et
              if (L.PolyUtil && L.PolyUtil.pointInPolygon) {
                if (L.PolyUtil.pointInPolygon(cmLatLng, polygonLatLngs)) {
                  return true;
                }
              }
            }
            // Mevcut alan bir marker ise
            else if (area.type === 'marker' && area.center) {
              const centerPoint = L.latLng(area.center.lat, area.center.lng);
              const distance = cmLatLng.distanceTo(centerPoint);
              
              // Marker ve circle marker yakın mı?
              if (distance < cmRadius) {
                return true;
              }
            }
            // Mevcut alan bir circlemarker ise
            else if (area.type === 'circlemarker' && area.center && area.radius) {
              const centerPoint = L.latLng(area.center.lat, area.center.lng);
              const distance = cmLatLng.distanceTo(centerPoint);
              
              // İki circle marker kesişiyor mu?
              if (distance < (cmRadius + (area.radius || 10))) { 
                return true;
              }
            }
          }
          // Circle kontrolü
          else if (type === 'circle') {
            const circleCenter = layer.getLatLng();
            const circleRadius = layer.getRadius();
            
            // Mevcut alan bir daire ise
            if (area.type === 'circle' && area.center && area.radius) {
              const centerPoint = L.latLng(area.center.lat, area.center.lng);
              const distance = circleCenter.distanceTo(centerPoint);
              
              // İki daire kesişiyor mu?
              if (distance < (circleRadius + area.radius)) {
                return true;
              }
            }
            // Mevcut alan bir polygon veya rectangle ise
            else if ((area.type === 'polygon' || area.type === 'rectangle') && area.points && area.points.length > 0) {
              // Manuel bounds oluştur
              const circleBounds = getBoundsForCircle(circleCenter, circleRadius);
              
              // Polygon latlngs oluştur
              const polygonLatLngs = area.points.map(p => [p.lat, p.lng]);
              const poly = L.polygon(polygonLatLngs);
              const polyBounds = poly.getBounds();
              
              // Boundslar kesişiyor mu?
              if (circleBounds.intersects(polyBounds)) {
                // Dairenin merkezi polygon içinde mi?
                if (L.PolyUtil && L.PolyUtil.pointInPolygon) {
                  if (L.PolyUtil.pointInPolygon(circleCenter, polygonLatLngs)) {
                    return true;
                  }
                }
                
                // Polygon çizgilerine dairenin mesafesini kontrol et
                for (let i = 0; i < polygonLatLngs.length; i++) {
                  const p1 = L.latLng(polygonLatLngs[i][0], polygonLatLngs[i][1]);
                  const p2 = L.latLng(polygonLatLngs[(i + 1) % polygonLatLngs.length][0], polygonLatLngs[(i + 1) % polygonLatLngs.length][1]);
                  
                  // Çizgiye olan mesafeyi yaklaşık olarak hesapla
                  const closestPoint = closestPointOnLine(p1, p2, circleCenter);
                  const distance = circleCenter.distanceTo(closestPoint);
                  
                  if (distance < circleRadius) {
                    return true;
                  }
                }
              }
            }
            // Mevcut alan bir marker ise
            else if (area.type === 'marker' && area.center) {
              const centerPoint = L.latLng(area.center.lat, area.center.lng);
              const distance = circleCenter.distanceTo(centerPoint);
              
              // Marker dairenin içinde mi?
              if (distance < circleRadius) {
                return true;
              }
            }
            // Mevcut alan bir circlemarker ise
            else if (area.type === 'circlemarker' && area.center && area.radius) {
              const centerPoint = L.latLng(area.center.lat, area.center.lng);
              const distance = circleCenter.distanceTo(centerPoint);
              
              // Daire ve circle marker kesişiyor mu?
              if (distance < (circleRadius + (area.radius || 10))) { 
                return true;
              }
            }
          }
          // Polygon veya Rectangle kontrolü
          else if (type === 'polygon' || type === 'rectangle') {
            // Polygon veya dikdörtgen için bounds al
            if (!layer.getBounds) continue;
            const polyBounds = layer.getBounds();
            
            // Mevcut alan bir daire ise
            if (area.type === 'circle' && area.center && area.radius) {
              const centerPoint = L.latLng(area.center.lat, area.center.lng);
              const areaBounds = getBoundsForCircle(centerPoint, area.radius);
              
              // Boundslar kesişiyor mu?
              if (polyBounds.intersects(areaBounds)) {
                // Dairenin merkezi polygon içinde mi?
                if (polyBounds.contains(centerPoint)) {
                  return true;
                }
                
                // Polygon'un köşeleri dairenin içinde mi?
                const corners = layer.getLatLngs()[0];
                for (const corner of corners) {
                  const distance = centerPoint.distanceTo(corner);
                  if (distance < area.radius) {
                    return true;
                  }
                }
              }
            }
            // Mevcut alan bir polygon veya rectangle ise
            else if ((area.type === 'polygon' || area.type === 'rectangle') && area.points && area.points.length > 0) {
              // İki polygon'un bounds'ları kesişiyor mu?
              const areaLatLngs = area.points.map(p => [p.lat, p.lng]);
              const areaPoly = L.polygon(areaLatLngs);
              const areaBounds = areaPoly.getBounds();
              
              if (polyBounds.intersects(areaBounds)) {
                return true;
              }
            }
            // Mevcut alan bir marker ise
            else if (area.type === 'marker' && area.center) {
              const markerPoint = L.latLng(area.center.lat, area.center.lng);
              
              // Marker polygon içinde mi?
              if (polyBounds.contains(markerPoint)) {
                return true;
              }
            }
            // Mevcut alan bir circlemarker ise
            else if (area.type === 'circlemarker' && area.center && area.radius) {
              const cmPoint = L.latLng(area.center.lat, area.center.lng);
              const cmRadius = area.radius || 10;
              
              // Circle marker polygon içinde mi?
              if (polyBounds.contains(cmPoint)) {
                return true;
              }
              
              // Polygon'un köşeleri circle marker'ın içinde mi?
              const corners = layer.getLatLngs()[0];
              for (const corner of corners) {
                const distance = cmPoint.distanceTo(corner);
                if (distance < cmRadius) {
                  return true;
                }
              }
            }
          }
        }
        return false;
      } catch (error) {
        console.error("Kesişim kontrolünde hata:", error);
        return false; // Hata durumunda kesişim olmadığını varsay
      }
    };
    
    // Kesişim kontrolü yap
    intersects = checkIntersection();
    
    if (intersects) {
      // Kesişim varsa, layer'ı haritadan kaldır ve kullanıcıya bildir
      mapRef.current?.removeLayer(layer);
      setNotification({
        message: 'Seçilen alan mevcut bir seçimle kesişiyor! Lütfen farklı bir alan seçin.',
        type: 'error'
      });
      return;
    }

    // Benzersiz bir ID oluştur
    const uniqueId = Date.now().toString();
    
    // Layer'a alan ID'si ata
    layer.areaId = uniqueId;

    switch (type) {
      case 'circle':
        const center = layer.getLatLng();
        
        // Aynı noktada başka bir daire olup olmadığını kontrol et
        const existingCircleIndex = areas.findIndex(area => 
          area.type === 'circle' && 
          area.center && 
          Math.abs(area.center.lat - center.lat) < 0.001 && 
          Math.abs(area.center.lng - center.lng) < 0.001
        );

        // Eğer bu alanda zaten bir daire varsa, yeni daire ekleme
        if (existingCircleIndex !== -1) {
          // Layer'ı haritadan kaldır
          mapRef.current?.removeLayer(layer);
          
          // Kullanıcıya bildir
          setNotification({
            message: 'Bu bölge zaten seçili!',
            type: 'info'
          });
          return;
        }

        newArea = {
          id: uniqueId,
          type: 'circle',
          center: {
            lat: center.lat,
            lng: center.lng
          },
          radius: layer.getRadius() || 3000
        };
        break;
        
      case 'polygon':
        const latlngs = layer.getLatLngs()[0];
        
        // Çokgenin merkez noktasını hesapla
        let centerLat = 0;
        let centerLng = 0;
        latlngs.forEach(point => {
          centerLat += point.lat;
          centerLng += point.lng;
        });
        centerLat /= latlngs.length;
        centerLng /= latlngs.length;
        
        // Yakınlarda başka bir çokgen olup olmadığını kontrol et
        const existingPolygonIndex = areas.findIndex(area => 
          area.type === 'polygon' && 
          area.points && 
          Math.abs(centerLat - area.points.reduce((sum, p) => sum + p.lat, 0) / area.points.length) < 0.001 && 
          Math.abs(centerLng - area.points.reduce((sum, p) => sum + p.lng, 0) / area.points.length) < 0.001
        );

        // Eğer bu alanda zaten bir çokgen varsa, yeni çokgen ekleme
        if (existingPolygonIndex !== -1) {
          // Layer'ı haritadan kaldır
          mapRef.current?.removeLayer(layer);
          
          // Kullanıcıya bildir
          setNotification({
            message: 'Bu bölge zaten seçili!',
            type: 'info'
          });
          return;
        }
        
        newArea = {
          id: uniqueId,
          type: 'polygon',
          points: latlngs.map(point => ({
            lat: point.lat,
            lng: point.lng
          }))
        };
        break;
        
      case 'rectangle':
        const bounds = layer.getBounds();
        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        
        // Dikdörtgenin merkez noktasını hesapla
        const rectCenterLat = (northEast.lat + southWest.lat) / 2;
        const rectCenterLng = (northEast.lng + southWest.lng) / 2;
        
        // Yakınlarda başka bir dikdörtgen olup olmadığını kontrol et
        const existingRectIndex = areas.findIndex(area => 
          area.type === 'rectangle' && 
          area.center && 
          Math.abs(area.center.lat - rectCenterLat) < 0.001 && 
          Math.abs(area.center.lng - rectCenterLng) < 0.001
        );

        // Eğer bu alanda zaten bir dikdörtgen varsa, yeni dikdörtgen ekleme
        if (existingRectIndex !== -1) {
          // Layer'ı haritadan kaldır
          mapRef.current?.removeLayer(layer);
          
          // Kullanıcıya bildir
          setNotification({
            message: 'Bu bölge zaten seçili!',
            type: 'info'
          });
        return;
      }

        // Dikdörtgenin köşe noktalarını polygon olarak kaydedelim
        const corners = [
          { lat: northEast.lat, lng: northEast.lng },
          { lat: northEast.lat, lng: southWest.lng },
          { lat: southWest.lat, lng: southWest.lng },
          { lat: southWest.lat, lng: northEast.lng }
        ];
        
        newArea = {
          id: uniqueId,
          type: 'rectangle',
          center: {
            lat: rectCenterLat,
            lng: rectCenterLng
          },
          points: corners,
          bounds: {
            northEast: { lat: northEast.lat, lng: northEast.lng },
            southWest: { lat: southWest.lat, lng: southWest.lng }
          }
        };
        break;
        
      case 'marker':
        const markerLatLng = layer.getLatLng();
        
        // Aynı noktada başka bir işaretçi olup olmadığını kontrol et
        const existingMarkerIndex = areas.findIndex(area => 
          area.type === 'marker' && 
          area.center && 
          Math.abs(area.center.lat - markerLatLng.lat) < 0.001 && 
          Math.abs(area.center.lng - markerLatLng.lng) < 0.001
        );

        // Eğer bu alanda zaten bir işaretçi varsa, yeni işaretçi ekleme
        if (existingMarkerIndex !== -1) {
          // Layer'ı haritadan kaldır
          mapRef.current?.removeLayer(layer);
          
          // Kullanıcıya bildir
          setNotification({
            message: 'Bu noktada zaten bir işaretçi var!',
            type: 'info'
          });
          return;
        }
        
        newArea = {
          id: uniqueId,
          type: 'marker',
          center: {
            lat: markerLatLng.lat,
            lng: markerLatLng.lng
          },
          name: `İşaretçi ${Date.now()}`
        };
        break;
        
      case 'circlemarker':
        const cmLatLng = layer.getLatLng();
        const cmRadius = layer.getRadius();
        
        // Aynı noktada başka bir daire işaretçi olup olmadığını kontrol et
        const existingCMIndex = areas.findIndex(area => 
          area.type === 'circlemarker' && 
          area.center && 
          Math.abs(area.center.lat - cmLatLng.lat) < 0.001 && 
          Math.abs(area.center.lng - cmLatLng.lng) < 0.001
        );

        // Eğer bu alanda zaten bir daire işaretçi varsa, yeni ekleme
        if (existingCMIndex !== -1) {
          // Layer'ı haritadan kaldır
          mapRef.current?.removeLayer(layer);
          
          // Kullanıcıya bildir
          setNotification({
            message: 'Bu noktada zaten bir daire işaretçi var!',
            type: 'info'
          });
          return;
        }
        
        newArea = {
          id: uniqueId,
          type: 'circlemarker',
          center: {
            lat: cmLatLng.lat,
            lng: cmLatLng.lng
          },
          radius: cmRadius,
          name: `Daire İşaretçi ${Date.now()}`
        };
        break;
        
      default:
        return;
    }

    if (newArea) {
      try {
        // Yerel state'e ekle — kalıcı kayıt "Kaydet" butonuyla (handleSaveChanges) yapılır.
        setAreas(prev => [...prev, newArea]);

        // Layer'a popup ekle
        layer.bindPopup(
          '<button class="remove-area-btn">Seçimi Kaldır</button>'
        );
        
        // Popup açıldığında silme düğmesini aktif hale getir
        layer.on('popupopen', () => {
          setTimeout(() => {
            const btn = document.querySelector('.remove-area-btn');
            if (btn) {
              btn.onclick = () => {
                handleAreaDelete(newArea.id);
                layer.closePopup();
              };
            }
          }, 10);
        });
        
        // Layer'ı feature group'a ekle
        if (featureGroupRef.current) {
          featureGroupRef.current.addLayer(layer);
        } else if (mapRef.current) {
          // Feature group henüz oluşturulmamışsa haritaya ekle
          mapRef.current.addLayer(layer);
        }

        setNotification({
          message: 'Hizmet alanı eklendi. Kalıcı olması için "Kaydet"e basın.',
          type: 'success'
        });
      } catch (error) {
        console.error('Alan oluşturulurken hata:', error);
        // Hata durumunda layer'ı kaldır
        mapRef.current?.removeLayer(layer);
        setNotification({
          message: 'Alan oluşturulurken bir hata oluştu.',
          type: 'error'
        });
      }
    }
  }, [areas, handleAreaDelete, mapRef]);

  const handleEdit = () => {
    setTempAreas([...areas]);
    setTempDistricts([...selectedDistricts]);
    onStartEditing?.();
  };

  // Kaydetme işlemi
  const handleSaveChanges = useCallback(async () => {
    setLoading(true);
    try {
      if (areas.length === 0) {
        setNotification({
          message: 'Lütfen en az bir bölge seçin!',
          type: 'error'
        });
        setLoading(false);
        return;
      }

      // Layer referanslarını çıkararak kaydet
      const areasToSave = areas.map(area => {
        const { layer, ...areaData } = area;
        return areaData;
      });

      // Gerçek kayıt üst bileşende yapılır (bkz. ServiceEdit.jsx → saveServiceAreas
      // PUT /api/v1/listings/{listingId}/service-areas).
      await onSaveChanges?.(areasToSave);

      setNotification({
        message: 'Hizmet alanları başarıyla kaydedildi.',
        type: 'success'
      });
    } catch (error) {
      console.error('Hizmet bölgeleri kaydedilirken hata:', error);
      setNotification({
        message: 'Hizmet alanları kaydedilirken bir hata oluştu.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [areas, onSaveChanges]);

  // İptal işlemi
  const handleCancel = useCallback(() => {
    try {
      // Layer'ları temizle
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
      }

      // Orijinal verileri geri yükle
      if (existingAreas && Array.isArray(existingAreas)) {
        setAreas(existingAreas);
        
        // Layer'ları yeniden oluştur
        existingAreas.forEach(area => {
          if (!area || !area.center) return;

          let layer;
          switch (area.type) {
            case 'circle':
              layer = new L.Circle([area.center.lat, area.center.lng], {
                radius: area.radius,
                color: '#2196f3',
                fillColor: '#2196f3',
                fillOpacity: 0.2
              });
              break;
            case 'polygon':
              if (!area.points) return;
              layer = new L.Polygon(area.points.map(p => [p.lat, p.lng]), {
                color: '#2196f3',
                fillColor: '#2196f3',
                fillOpacity: 0.2
              });
              break;
            case 'rectangle':
              if (!area.points) return;
              layer = new L.Polygon(area.points.map(p => [p.lat, p.lng]), {
                color: '#2196f3',
                fillColor: '#2196f3',
                fillOpacity: 0.2
              });
              break;
            case 'marker':
              layer = new L.Marker([area.center.lat, area.center.lng]);
              break;
            case 'circlemarker':
              layer = new L.CircleMarker([area.center.lat, area.center.lng], {
                radius: area.radius || 10,
                color: '#2196f3',
                fillColor: '#2196f3',
                fillOpacity: 0.5
              });
              break;
            default:
              return;
          }

          if (layer && featureGroupRef.current) {
            // Layer'a alan ID'si ata
            layer.areaId = area.id;
            
            featureGroupRef.current.addLayer(layer);
            
            // Popup ekle
            layer.bindPopup(
              '<button class="remove-area-btn">Seçimi Kaldır</button>'
            ).on('popupopen', () => {
              document.querySelector('.remove-area-btn').onclick = () => {
                handleAreaDelete(area.id);
                layer.closePopup();
              };
            });
          }
        });
      }

      // Parent component'e bildir
    onCancelEditing?.();
      
      setNotification({
        message: 'Değişiklikler iptal edildi.',
        type: 'info'
      });
    } catch (error) {
      console.error('İptal işlemi sırasında hata:', error);
      setNotification({
        message: 'İptal işlemi sırasında bir hata oluştu.',
        type: 'error'
      });
    }
  }, [existingAreas, onCancelEditing, handleAreaDelete]);

  // Bildirim kapatma
  const closeNotification = () => {
    setNotification(null);
  };

  // Mod değiştirme
  const changeMode = (newMode) => {
    // Önceki modu kaydet
    const previousMode = mode;
    
    // Yeni modu ayarla
    setMode(newMode);
    
    // Mevcut çizimleri koru
    if (featureGroupRef.current) {
      const layers = featureGroupRef.current.getLayers();
      console.log('Mevcut katmanlar:', layers.length);
    }
  };

  // Kesişim kontrolü yapan fonksiyon
  const checkIntersection = (newArea) => {
    try {
      // Yeni alan yoksa kesişim kontrolü yapma
      if (!newArea || !newArea.type) {
        console.warn('checkIntersection: Geçersiz alan verisi');
        return false;
      }

      // Daire kontrolü
      if (newArea.type === 'circle') {
        // newArea içindeki center ve radius'un varlığını kontrol et
        if (!newArea.center || !newArea.center.lat || !newArea.center.lng || !newArea.radius) {
          console.warn('checkIntersection: Daire için eksik veriler', newArea);
          return false;
        }

        const circleCenter = L.latLng(newArea.center.lat, newArea.center.lng);
        const circleRadius = newArea.radius;

        // Maksimum yarıçap kontrolü
        if (circleRadius > 55000) {
          setNotification({
            message: 'Maksimum yarıçap 55 km olmalıdır.',
            type: 'error'
          });
          return true; // Geçersiz alan
        }
        
        // Mevcut alanlarla kesişim kontrolü
        for (const area of areas) {
          // Diğer alan geçerli değilse atla
          if (!area || !area.type) continue;

          // İki daire arasında kesişim kontrolü
          if (area.type === 'circle') {
            // Diğer dairenin merkez ve yarıçapını kontrol et
            if (!area.center || !area.center.lat || !area.center.lng || !area.radius) continue;

            const otherCenter = L.latLng(area.center.lat, area.center.lng);
            const otherRadius = area.radius;
            
            // İki merkez noktası arasındaki mesafeyi hesapla
            try {
              const distance = circleCenter.distanceTo(otherCenter);
              
              // İki daire kesişiyor mu?
              if (distance < (circleRadius + otherRadius)) {
                return true; // Kesişim var
              }
            } catch (e) {
              console.error('Daire mesafe hesaplamasında hata:', e);
            }
          }
          
          // Daire ile polygon/rectangle kesişimi
          else if (area.type === 'polygon' || area.type === 'rectangle') {
            // Polygon noktalarını kontrol et
            if (!area.points || !Array.isArray(area.points) || area.points.length < 3) continue;
            
            try {
              // Polygon'un latlngs dizisini oluştur
              const polygonPoints = area.points.map(p => [p.lat, p.lng]);
              
              // PolyUtil ile kontrol et (Leaflet'in PolyUtil'i)
              if (L.PolyUtil && L.PolyUtil.pointInPolygon) {
                // Dairenin merkezi polygon içinde mi?
                if (L.PolyUtil.pointInPolygon(circleCenter, polygonPoints)) {
                  return true; // Kesişim var
                }
              }
              
              // Polygon'un her kenarına göre kontrol et
              for (let i = 0; i < polygonPoints.length; i++) {
                const p1 = L.latLng(polygonPoints[i][0], polygonPoints[i][1]);
                const p2 = L.latLng(polygonPoints[(i + 1) % polygonPoints.length][0], polygonPoints[(i + 1) % polygonPoints.length][1]);
                
                try {
                  // Çizgiye olan mesafeyi yaklaşık olarak hesapla
                  const closestPoint = closestPointOnLine(p1, p2, circleCenter);
                  const distance = circleCenter.distanceTo(closestPoint);
                  
                  if (distance < circleRadius) {
                    return true; // Kesişim var
                  }
                } catch (e) {
                  console.error('Polygon kenar mesafe hesaplamasında hata:', e);
                }
              }
            } catch (e) {
              console.error('Polygon işlemlerinde hata:', e);
            }
          }
        }
      }
      // Çokgen kontrolü
      else if (newArea.type === 'polygon') {
        // newArea içindeki points'in varlığını kontrol et
        if (!newArea.points || !Array.isArray(newArea.points) || newArea.points.length < 3) {
          console.warn('checkIntersection: Çokgen için geçersiz noktalar', newArea);
          return false;
        }

        // Çokgenin yaklaşık alanını hesapla
        let polygonArea = 0;
        try {
          const latlngs = newArea.points.map(p => [p.lat, p.lng]);
          const tempPolygon = L.polygon(latlngs);
          // Leaflet ile alanı hesaplamaya çalış, olmuyorsa manuel hesapla
          if (tempPolygon.getArea) {
            polygonArea = tempPolygon.getArea();
          } else {
            // Yaklaşık alan hesabı - Gauss alanı formülü
            for (let i = 0; i < latlngs.length; i++) {
              const j = (i + 1) % latlngs.length;
              polygonArea += latlngs[i][0] * latlngs[j][1];
              polygonArea -= latlngs[j][0] * latlngs[i][1];
            }
            polygonArea = Math.abs(polygonArea) / 2;
            // lat/lng alanını yaklaşık m² değerine çevir
            polygonArea = polygonArea * 111319 * 111319; // 1 derece yaklaşık 111.319 km
          }
          
          // Maksimum alan kontrolü
          if (polygonArea > 9503320000) { // 9503.32 km²
            setNotification({
              message: 'Maksimum alan 9503.32 km² olmalıdır.',
              type: 'error'
            });
            return true; // Geçersiz alan
          }
        } catch (e) {
          console.error('Çokgen alan hesaplamasında hata:', e);
        }
        
        // Diğer alanlarla kesişim kontrolü için mevcut alanları döngüye al
        for (const area of areas) {
          // Diğer alan geçerli değilse atla
          if (!area || !area.type) continue;
          
          // Aynı çokgen tipi için kesişim kontrolü
          if (area.type === 'polygon' || area.type === 'rectangle') {
            // Diğer çokgenin noktalarını kontrol et
            if (!area.points || !Array.isArray(area.points) || area.points.length < 3) continue;
            
            try {
              // Her iki çokgenin kenarlarını karşılaştır
              const polygonA = newArea.points.map(p => [p.lat, p.lng]);
              const polygonB = area.points.map(p => [p.lat, p.lng]);
              
              // Basitleştirilmiş kesişim kontrolü - herhangi bir nokta diğer çokgende mi?
              for (const pointA of polygonA) {
                if (L.PolyUtil && L.PolyUtil.pointInPolygon) {
                  if (L.PolyUtil.pointInPolygon(L.latLng(pointA[0], pointA[1]), polygonB)) {
                    return true; // Kesişim var
                  }
                }
              }
              
              for (const pointB of polygonB) {
                if (L.PolyUtil && L.PolyUtil.pointInPolygon) {
                  if (L.PolyUtil.pointInPolygon(L.latLng(pointB[0], pointB[1]), polygonA)) {
                    return true; // Kesişim var
                  }
                }
              }
            } catch (e) {
              console.error('Çokgen-çokgen kesişim kontrolünde hata:', e);
            }
          }
          
          // Çokgen ile daire kesişimi
          else if (area.type === 'circle') {
            // Diğer dairenin merkez ve yarıçapını kontrol et
            if (!area.center || !area.center.lat || !area.center.lng || !area.radius) continue;
            
            try {
              const circleCenter = L.latLng(area.center.lat, area.center.lng);
              const circleRadius = area.radius;
              const polygonPoints = newArea.points.map(p => [p.lat, p.lng]);
              
              // Dairenin merkezi çokgenin içinde mi?
              if (L.PolyUtil && L.PolyUtil.pointInPolygon) {
                if (L.PolyUtil.pointInPolygon(circleCenter, polygonPoints)) {
                  return true; // Kesişim var
                }
              }
              
              // Çokgenin her kenarı daire ile kesişiyor mu?
              for (let i = 0; i < polygonPoints.length; i++) {
                const p1 = L.latLng(polygonPoints[i][0], polygonPoints[i][1]);
                const p2 = L.latLng(polygonPoints[(i + 1) % polygonPoints.length][0], polygonPoints[(i + 1) % polygonPoints.length][1]);
                
                try {
                  // Çizgiye olan mesafeyi yaklaşık olarak hesapla
                  const closestPoint = closestPointOnLine(p1, p2, circleCenter);
                  const distance = circleCenter.distanceTo(closestPoint);
                  
                  if (distance < circleRadius) {
                    return true; // Kesişim var
                  }
                } catch (e) {
                  console.error('Çokgen-daire mesafe hesaplamasında hata:', e);
                }
              }
            } catch (e) {
              console.error('Çokgen-daire kesişim kontrolünde hata:', e);
            }
          }
        }
      }
      
      // Kesişim yok
      return false;
    } catch (e) {
      console.error('Kesişim kontrolünde genel hata:', e);
      // Hata durumunda, kullanıcıya bilgi ver ve güvenli tarafta kal
      setNotification({
        message: 'Kesişim kontrolü yapılırken bir hata oluştu. Lütfen tekrar deneyin.',
        type: 'error'
      });
      return false;
    }
  };

  return (
    <div className="map-wrapper">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={closeNotification}
        />
      )}
      
      <Modal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmClearAll}
        title="Seçimleri Kaldır"
        message="Tüm hizmet alanlarını silmek istediğinizden emin misiniz?"
      />
      
      {!isEditing && (
        <div className="back-button-container">
          <button 
            className="back-button" 
            onClick={onBackToSelection}
            disabled={loading}
          >
            <FaArrowLeft /> Seçime dön
          </button>
        </div>
      )}
      
      <div className="map-controls">
        <div className="control-info">
          <div className="control-header">
            <h3>Harita Kontrolleri</h3>
          </div>
          
              {isEditing ? (
            <div className="action-buttons">
              <button 
                className="save-button" 
                onClick={handleSaveChanges}
                disabled={loading}
              >
                    <FaSave /> Kaydet
                  </button>
              <button 
                className="vazgec-button" 
                onClick={handleCancel}
                disabled={loading}
              >
                    <FaTimes /> Vazgeç
                  </button>
            </div>
          ) : (
            <div className="action-buttons">
              <button 
                className="map-edit-button" 
                onClick={handleEdit}
                disabled={loading}
              >
                  <FaEdit /> Düzenle
                </button>
            </div>
          )}
          
            {isEditing && (
            <div className="drawing-options">
              <div className={`drawing-option ${mode === 'draw' ? 'active' : ''}`}>
                <button 
                  onClick={() => changeMode('draw')}
                  disabled={loading}
                >
                  Çizim Modu
                </button>
              </div>
              <div className={`drawing-option ${mode === 'district' ? 'active' : ''}`}>
                <button 
                  onClick={() => changeMode('district')}
                  disabled={loading}
                >
                  Bölge Seçimi
                </button>
          </div>
              </div>
          )}
          
              <div className="drawing-rules">
            <h4>Çizim Kuralları</h4>
            <ul>
              <li><span className="rule-icon">📍</span> En fazla 3  farklı hizmet alanı tanımlayabilirsiniz</li>
              <li><span className="rule-icon">⭕</span> Çember yarıçapı en fazla 55 km olabilir</li>
              <li><span className="rule-icon">🔷</span> Çokgen alanı en fazla 9503.32 km² olabilir</li>
              <li><span className="rule-icon">❌</span> Seçtiğiniz alanların kesişmemesi gerekir</li>
                </ul>
              </div>
        </div>
      </div>
      
      <MapContainer
        center={[39.0, 35.0]} // Türkiye'nin merkezi
        zoom={6} // Tüm Türkiye'yi gösterecek zoom seviyesi
        className="map-container"
        whenCreated={setInstance => {
          mapRef.current = setInstance;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FeatureGroup ref={featureGroupRef}>
          {/* Çizim kontrollerini göster */}
          {mode === 'draw' && isEditing && (
        <DrawControls 
          onCreated={handleCreated} 
              isActive={true}
          />
          )}
          
          {/* Seçimleri kaldır butonu */}
          {isEditing && (
            <RemoveCard
              position="bottomleft"
              onRemove={handleClearAll}
            />
          )}

          {/* Bölge seçici göster */}
          {mode === 'district' && isEditing && (
        <DistrictSelector 
              isActive={true}
          onDistrictSelect={handleDistrictSelect} 
              selectedDistricts={selectedDistricts}
          selectedCircle={selectedCircle}
        />
          )}
        </FeatureGroup>

        {/* Seçili alanları göster */}
        {areas.map((area) => {
          if (!area || !area.center || !area.center.lat || !area.center.lng) return null;

          switch (area.type) {
            case 'marker':
              return (
                <Marker
                  key={area.id}
                  position={[area.center.lat, area.center.lng]}
                  eventHandlers={{
                    click: (e) => {
                      // Olayın haritaya yayılmasını engelle
                      L.DomEvent.stopPropagation(e.originalEvent);
                      
                      // Düzenleme modunda değilse, doğrudan kaldır
                      if (!isEditing) {
                        handleAreaDelete(area.id);
                        return;
                      }

                      // Düzenleme modunda popup göster
                      const layer = e.target;
                      layer.bindPopup(
                        '<button class="remove-area-btn">Seçimi Kaldır</button>'
                      ).openPopup();
                      
                      // Popup içindeki butona tıklama olayını ekle (setTimeout ile DOM'a eklendikten sonra)
                      setTimeout(() => {
                        const btn = document.querySelector('.remove-area-btn');
                        if (btn) {
                          btn.onclick = () => {
                            handleAreaDelete(area.id);
                            layer.closePopup();
                          };
                        }
                      }, 100);
                    }
                  }}
                />
              );

            case 'circlemarker':
              return (
            <Circle
                  key={area.id}
                  center={[area.center.lat, area.center.lng]}
                  radius={area.radius || 10}
              pathOptions={{
                color: '#2196f3',
                fillColor: '#2196f3',
                    fillOpacity: 0.5,
                    weight: 2
              }}
              eventHandlers={{
                click: (e) => {
                      // Olayın haritaya yayılmasını engelle
                      L.DomEvent.stopPropagation(e.originalEvent);
                      
                      // Düzenleme modunda değilse, doğrudan kaldır
                      if (!isEditing) {
                        handleAreaDelete(area.id);
                        return;
                      }

                      // Düzenleme modunda popup göster
                      const layer = e.target;
                      layer.bindPopup(
                        '<button class="remove-area-btn">Seçimi Kaldır</button>'
                      ).openPopup();
                      
                      // Popup içindeki butona tıklama olayını ekle (setTimeout ile DOM'a eklendikten sonra)
                      setTimeout(() => {
                        const btn = document.querySelector('.remove-area-btn');
                        if (btn) {
                          btn.onclick = () => {
                            handleAreaDelete(area.id);
                            layer.closePopup();
                          };
                        }
                      }, 100);
                }
              }}
            />
              );

            case 'circle':
              return (
                <Circle
                  key={area.id}
                  center={[area.center.lat, area.center.lng]}
                  radius={area.radius}
                  pathOptions={{
                    color: '#2196f3',
                    fillColor: '#2196f3',
                    fillOpacity: 0.2
                  }}
                  eventHandlers={{
                    click: (e) => {
                      // Olayın haritaya yayılmasını engelle
                      L.DomEvent.stopPropagation(e.originalEvent);
                      
                      // Düzenleme modunda değilse, doğrudan kaldır
                      if (!isEditing) {
                        handleAreaDelete(area.id);
                        return;
                      }

                      // Düzenleme modunda popup göster
                      const layer = e.target;
                      layer.bindPopup(
                        '<button class="remove-area-btn">Seçimi Kaldır</button>'
                      ).openPopup();
                      
                      // Popup içindeki butona tıklama olayını ekle (setTimeout ile DOM'a eklendikten sonra)
                      setTimeout(() => {
                        const btn = document.querySelector('.remove-area-btn');
                        if (btn) {
                          btn.onclick = () => {
                            handleAreaDelete(area.id);
                            layer.closePopup();
                          };
                        }
                      }, 100);
                    }
                  }}
                />
              );

            case 'polygon':
            case 'rectangle':
              if (!area.points) return null;
              return (
                <Polygon
                  key={area.id}
                  positions={area.points.map(p => [p.lat, p.lng])}
                  pathOptions={{
                    color: '#2196f3',
                    fillColor: '#2196f3',
                    fillOpacity: 0.2
                  }}
                  eventHandlers={{
                    click: (e) => {
                      // Olayın haritaya yayılmasını engelle
                      L.DomEvent.stopPropagation(e.originalEvent);
                      
                      // Düzenleme modunda değilse, doğrudan kaldır
                      if (!isEditing) {
                        handleAreaDelete(area.id);
                        return;
                      }

                      // Düzenleme modunda popup göster
                      const layer = e.target;
                      layer.bindPopup(
                        '<button class="remove-area-btn">Seçimi Kaldır</button>'
                      ).openPopup();
                      
                      // Popup içindeki butona tıklama olayını ekle (setTimeout ile DOM'a eklendikten sonra)
                      setTimeout(() => {
                        const btn = document.querySelector('.remove-area-btn');
                        if (btn) {
                          btn.onclick = () => {
                            handleAreaDelete(area.id);
                            layer.closePopup();
                          };
                        }
                      }, 100);
                    }
                  }}
                />
              );

            default:
              return null;
          }
        })}
      </MapContainer>
    </div>
  );
};

export default ServiceAreasMap;