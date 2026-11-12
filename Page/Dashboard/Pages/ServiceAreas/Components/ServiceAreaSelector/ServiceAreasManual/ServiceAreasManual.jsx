import React, { useState, useEffect } from 'react';
import { FaSave, FaTimes, FaMapMarkerAlt, FaPlus, FaTrashAlt, FaCheck, FaSpinner, FaArrowLeft } from 'react-icons/fa';
import './ServiceAreasManual.css';
import locationService from '@/services/location/locationService';

const ServiceAreasManual = ({ existingAreas, onSave, onCancel }) => {
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [tempAreas, setTempAreas] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isDeletingIndex, setIsDeletingIndex] = useState(null);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoadingCities(true);
        /** Gerçek backend: GET /api/v1/locations/provinces */
        const provinces = await locationService.getProvinces();
        if (!cancelled) setCities(provinces);
      } catch (err) {
        console.error('[ServiceAreasManual] İller yüklenemedi:', err);
        if (!cancelled) setCities([]);
      } finally {
        if (!cancelled) setIsLoadingCities(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (existingAreas && existingAreas.length > 0) {
      setTempAreas(existingAreas);
    }
  }, [existingAreas]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedCity) {
      setDistricts([]);
      return undefined;
    }
    (async () => {
      try {
        setIsLoadingDistricts(true);
        /** Gerçek backend: GET /api/v1/locations/districts?province_id= */
        const districtList = await locationService.getDistricts(selectedCity);
        if (!cancelled) setDistricts(districtList);
      } catch (err) {
        console.error('[ServiceAreasManual] İlçeler yüklenemedi:', err);
        if (!cancelled) setDistricts([]);
      } finally {
        if (!cancelled) setIsLoadingDistricts(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCity]);

  const handleAddArea = () => {
    if (tempAreas.length >= 3) {
      alert('En fazla 3 bölge seçebilirsiniz!');
      return;
    }

    if (!selectedCity || !selectedDistrict) {
      alert('Lütfen il ve ilçe seçin!');
      return;
    }

    const cityObj = cities.find(c => String(c.id) === String(selectedCity));
    const districtObj = districts.find(d => String(d.id) === String(selectedDistrict));

    const newArea = {
      cityId: selectedCity,
      cityName: cityObj?.name || '',
      districtId: selectedDistrict,
      districtName: districtObj?.name || ''
    };

    // Aynı il ve ilçe kombinasyonu zaten var mı kontrol et
    const isDuplicate = tempAreas.some(
      area => String(area.cityId) === String(newArea.cityId) && String(area.districtId) === String(newArea.districtId)
    );

    if (isDuplicate) {
      alert('Bu bölge zaten eklenmiş');
      return;
    }

    // Listeye ekle (henüz kaydetme)
    setTempAreas([...tempAreas, newArea]);
    setSelectedCity('');
    setSelectedDistrict('');
    
    // Kayıt durumunu sıfırla
    setIsSaved(false);
  };

  const handleRemoveArea = (index) => {
    // Silme işlemi başladığını belirt
    setIsDeletingIndex(index);
    
    try {
      // Silinecek elemanı tempAreas'dan çıkar
      const updatedAreas = [...tempAreas];
      updatedAreas.splice(index, 1);
      setTempAreas(updatedAreas);
      
      // Silinen veriyi backend'e gönder
      if (onSave && typeof onSave === 'function') {
        console.log('Silme işlemi sonrası onSave fonksiyonu çağrılıyor');
        onSave(updatedAreas);
        console.log('Silme işlemi sonrası onSave fonksiyonu çağrıldı');
        
        // Kısa bir süre silme göstergesini göster, sonra kapat
        setTimeout(() => {
          setIsDeletingIndex(null);
        }, 1000);
      } else {
        console.error('onSave fonksiyonu tanımlı değil veya fonksiyon değil');
        setIsDeletingIndex(null);
      }
    } catch (error) {
      console.error('Bölge silinirken hata:', error);
      setIsDeletingIndex(null);
    }
  };

  const handleSave = () => {
    try {
      console.log('Kaydet butonu tıklandı');
      console.log('Seçilen alanlar:', tempAreas);
      
      // Seçilen alanları kaydet
      setSelectedAreas(tempAreas);
      
      // Ana bileşene seçilen alanları gönder
      if (onSave && typeof onSave === 'function') {
        console.log('onSave fonksiyonu çağrılıyor');
        onSave(tempAreas);
        console.log('onSave fonksiyonu çağrıldı');
        
        // Kayıt başarılı olduğunda durumu güncelle
        setIsSaved(true);
        
        // 3 saniye sonra butonu eski haline getir
        setTimeout(() => {
          setIsSaved(false);
        }, 3000);
      } else {
        console.error('onSave fonksiyonu tanımlı değil veya fonksiyon değil');
      }
    } catch (error) {
      console.error('Manuel seçim kaydedilirken hata:', error);
    }
  };

  return (
    <div className="manual-selector-container">
      <div className="manual-selector-header">
        <div className="header-left">
          <button className="back-to-selection-button" onClick={onCancel}>
            <FaArrowLeft /> Seçime Dön
          </button>
          <h2>Manuel Bölge Seçimi</h2>
        </div>
        <div className="manual-selector-actions">
          <button className="cancel-button" onClick={onCancel}>
            <FaTimes /> Vazgeç
          </button>
          <button 
            className={`save-button ${isSaved ? 'saved' : ''}`}
            onClick={handleSave}
            disabled={tempAreas.length === 0 || isSaved}
          >
            {isSaved ? <><FaCheck /> Kaydedildi</> : <><FaSave /> Kaydet</>}
          </button>
        </div>
      </div>

      <div className="area-selection-form">
        <div className="selection-inputs">
          <div className="select-wrapper">
            <FaMapMarkerAlt className="select-icon" />
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedDistrict('');
              }}
              disabled={isLoadingCities}
            >
              <option value="">{isLoadingCities ? 'İller yükleniyor...' : 'İl Seçin'}</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </div>

          <div className="select-wrapper">
            <FaMapMarkerAlt className="select-icon" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedCity || isLoadingDistricts}
            >
              <option value="">{isLoadingDistricts ? 'İlçeler yükleniyor...' : 'İlçe Seçin'}</option>
              {districts.map(district => (
                <option key={district.id} value={district.id}>{district.name}</option>
              ))}
            </select>
          </div>

          <button 
            className="add-button" 
            onClick={handleAddArea}
            disabled={!selectedCity || !selectedDistrict || tempAreas.length >= 3}
          >
            <FaPlus /> Ekle
          </button>
        </div>

        {tempAreas.length > 0 && (
          <div className="selected-areas">
            {tempAreas.map((area, index) => (
              <div key={index} className="selected-area">
                <div className="area-info">
                  <FaMapMarkerAlt className="area-icon" />
                  <span>{area.cityName} / {area.districtName}</span>
                </div>
                <button 
                  className={isDeletingIndex === index ? 'deleting' : ''}
                  onClick={() => handleRemoveArea(index)}
                  disabled={isDeletingIndex !== null}
                >
                  {isDeletingIndex === index ? <FaSpinner className="spin" /> : <FaTrashAlt />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceAreasManual; 