/**
 * Harita Konum Servisi
 * Bu servis, ilan konumlarını ve harita görünümünü yönetir
 * İl, ilçe, mahalle/köy bilgilerine göre koordinatlama yapar
 */

// LocalStorage'da kalıcı önbellek için anahtar
const CACHE_KEY = 'acillazim_koordinat_onbellek';

// Önbellek verilerini yükle
const loadCacheFromStorage = () => {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (error) {
    console.warn('Önbellek yüklenemedi:', error);
  }
  return {};
};

// Önbelleği global olarak başlat
let coordinateCache = loadCacheFromStorage();

// İstek sırasını kontrol eden değişkenler
let isRequestInProgress = false;
const REQUEST_DELAY = 1100; // API isteği arasında 1.1 saniye (limitlere uymak için)

// Önbellekte olmayan lokasyonlar için işleme kuyruğu
let pendingLocationQueue = [];
let isProcessingQueue = false;

/**
 * İlanların konum bilgilerini alır ve gruplu işleme yapar
 * @param {Array} listings - İlanlar listesi
 * @param {boolean} useOnlyCache - Sadece önbellekteki koordinatları kullan, API çağrısı yapma
 * @returns {Promise<Array>} - Konum bilgileri eklenmiş ilan listesi
 */
export const getListingLocations = async (listings, useOnlyCache = false) => {
  console.time('koordinat-isleme');
  try {
    // İlan listesi geçerli mi kontrol et
    if (!listings || !Array.isArray(listings) || listings.length === 0) {
      console.warn('getListingLocations: İlan listesi boş veya geçersiz format!');
      return [];
    }

    console.log(`İşlenecek toplam ilan sayısı: ${listings.length}`);

    // 1. ADIM: İlanları grupla - aynı il/ilçe kombinasyonlarını birleştir
    const locationGroups = groupListingsByLocation(listings);
    console.log(`Benzersiz il/ilçe kombinasyonu: ${Object.keys(locationGroups).length}`);
    
    // 2. ADIM: Her konum grubunu işle ve koordinatları al
    const processedGroups = {};
    
    // Önce direkt koordinatı olan grupları işle
    for (const [key, group] of Object.entries(locationGroups)) {
      if (group.coordinates) {
        processedGroups[key] = group;
      }
    }
    
    // Önbellekte olan konumları işle
    for (const [key, group] of Object.entries(locationGroups)) {
      // Zaten işlenmiş mi kontrol et
      if (processedGroups[key]) continue;
      
      // Önbellekte var mı kontrol et
      if (group.province && group.district) {
        const cacheKey = `${group.province}-${group.district}${group.neighborhood ? '-' + group.neighborhood : ''}`;
        
        if (coordinateCache[cacheKey]) {
          processedGroups[key] = {
            ...group,
            coordinates: coordinateCache[cacheKey],
            source: 'cache'
          };
        }
      }
    }
    
    // İşlenecek koordinat grubu kalmadıysa ve sadece önbellek kullanılması isteniyorsa
    // ek işlem yapmadan işlenmiş grupları kullanan sonuçları döndür
    if (useOnlyCache && Object.keys(processedGroups).length === Object.keys(locationGroups).length) {
      // 3. ADIM: Koordinatları ilanlara dağıt (sadece önbellekte olanlar)
      const result = distributeCoordinatesToListings(listings, processedGroups);
      console.log(`Sadece önbellekten: ${result.length}/${listings.length} ilan için koordinat bulundu.`);
      console.timeEnd('koordinat-isleme');
      return result;
    }
    
    // 3. ADIM: Koordinatları ilanlara dağıt
    const result = distributeCoordinatesToListings(listings, processedGroups);
    let coordinateFoundCount = result.length;
    
    console.log(`İlk aşama tamamlandı: ${coordinateFoundCount}/${listings.length} ilan için koordinat bulundu.`);
    
    // API çağrısı yapmak istemiyorsak veya tüm koordinatlar bulunduysa burada sonlandır
    if (useOnlyCache || coordinateFoundCount === listings.length) {
      console.timeEnd('koordinat-isleme');
      return result;
    }
    
    // Kalan gruplar için koordinat bul (API çağrılarını azaltmak için bir kerede işleme yapılıyor)
    // 4. ADIM: Kalan grupları tek seferde işle
    const remainingGroups = {};
    for (const [key, group] of Object.entries(locationGroups)) {
      if (!processedGroups[key] && group.province && group.district) {
        remainingGroups[key] = group;
      }
    }
    
    // Kalan grupları işlemek için bir promise dizisi oluştur
    if (Object.keys(remainingGroups).length > 0) {
      console.log(`API işlemi gerektiren ${Object.keys(remainingGroups).length} benzersiz konum grubu var.`);
      
      // Tüm API çağrılarını sırayla (asenkron) yapmak yerine, ilk 5 grup için paralel işlem yap
      // diğerlerini arka planda işle
      const processFirstBatch = async () => {
        const batchSize = 5; // Bir seferde paralel işlenecek grup sayısı
        const groupEntries = Object.entries(remainingGroups).slice(0, batchSize);
        
        const batchPromises = groupEntries.map(async ([key, group]) => {
          try {
            if (group.province && group.district) {
              // Önce mahalle düzeyinde dene
              let coordinates = null;
              
              if (group.neighborhood) {
                coordinates = await findCoordinatesByLocation(group.province, group.district, group.neighborhood);
              }
              
              // Mahalle bulunamadıysa veya yoksa, ilçe düzeyinde dene
              if (!coordinates) {
                coordinates = await findCoordinatesByLocation(group.province, group.district);
              }
              
              if (coordinates) {
                return { key, coordinates, success: true };
              }
            }
            return { key, success: false };
          } catch (error) {
            console.error(`Koordinat bulunamadı (${key}):`, error);
            return { key, success: false };
          }
        });
        
        // Paralel işlemleri bekle
        const batchResults = await Promise.all(batchPromises);
        
        // Başarılı sonuçları işle
        const successfulResults = batchResults.filter(result => result.success);
        
        // Yeni koordinatları önbelleğe ekle
        for (const result of successfulResults) {
          const { key, coordinates } = result;
          const group = remainingGroups[key];
          
          if (coordinates && group) {
            const cacheKey = `${group.province}-${group.district}${group.neighborhood ? '-' + group.neighborhood : ''}`;
            coordinateCache[cacheKey] = coordinates;
            
            processedGroups[key] = {
              ...group,
              coordinates,
              source: 'api'
            };
          }
        }
        
        // Önbelleği her 5 yeni koordinatta kaydet
        saveCacheToStorage();
        
        // İlk grupların sonuçlarıyla yeni ilanları oluştur
        return distributeCoordinatesToListings(listings, processedGroups);
      };
      
      // İlk grup için hemen işlem yap ve sonuçları döndür
      const updatedResult = await processFirstBatch();
      
      // Kalan gruplar için arka planda işlemi başlat (sonucu beklemeden)
      if (Object.keys(remainingGroups).length > 5) {
        setTimeout(() => {
          console.log('Kalan konum grupları arka planda işleniyor...');
          for (const key of Object.keys(remainingGroups).slice(5)) {
            pendingLocationQueue.push({
              key,
              group: remainingGroups[key]
            });
          }
          
          // Kuyruk işlemesi başlatılmadıysa başlat
          if (!isProcessingQueue) {
            processLocationQueue();
          }
        }, 100);
      }
      
      console.timeEnd('koordinat-isleme');
      return updatedResult;
    }
    
    console.timeEnd('koordinat-isleme');
    return result;
  } catch (error) {
    console.error('İlan konumları alınırken hata oluştu:', error);
    console.timeEnd('koordinat-isleme');
    return listings; // Hata durumunda orijinal listeyi değiştirmeden döndür
  }
};

/**
 * Konum koordinatlarını ilanlara dağıtır
 * @param {Array} listings - İlanlar listesi
 * @param {Object} processedGroups - İşlenmiş konum grupları
 * @returns {Array} - Koordinat bilgisi eklenmiş ilan listesi
 */
const distributeCoordinatesToListings = (listings, processedGroups) => {
  // Koordinat bilgisi eklenmiş ilanları topla
  const processedListings = [];
  
  // Her ilanı işle
  for (const listing of listings) {
    // Direkt koordinatı olan ilanları hemen ekle
    if (listing.latitude && listing.longitude) {
      const lat = parseFloat(listing.latitude);
      const lng = parseFloat(listing.longitude);
      
      // Koordinatlar geçerli mi kontrol et
      if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
        const processedListing = {
          ...listing,
          latitude: lat,
          longitude: lng,
          locationSource: 'direct'
        };
        processedListings.push(processedListing);
      }
      continue;
    }
    
    // İlanın konum anahtarını oluştur
    const locationKey = getLocationKey(listing);
    
    if (!locationKey) continue; // Konum bilgisi yoksa atla
    
    // Eşleşen grubu bul
    const matchingGroup = processedGroups[locationKey];
    
    if (matchingGroup && matchingGroup.coordinates) {
      // Koordinatları ilana ekle
      const processedListing = {
        ...listing,
        latitude: matchingGroup.coordinates.lat,
        longitude: matchingGroup.coordinates.lng,
        locationSource: matchingGroup.source || 'grouped'
      };
      processedListings.push(processedListing);
    }
  }
  
  return processedListings;
};

/**
 * Kuyrukta bekleyen lokasyonları işler (her 2 saniyede bir lokasyon)
 * Bu işlev, arka planda çalışarak aşamalı olarak koordinatları alır
 */
const processLocationQueue = () => {
  if (pendingLocationQueue.length === 0) {
    isProcessingQueue = false;
    console.log('Koordinat kuyruğu işleme tamamlandı');
    return;
  }
  
  isProcessingQueue = true;
  
  // Kuyruktan bir lokasyon al
  const locationItem = pendingLocationQueue.shift();
  const { key, group } = locationItem;
  
  // Koordinat bul
  (async () => {
    try {
      // Önce mahalle düzeyinde dene
      let coordinates = null;
      
      if (group.neighborhood) {
        coordinates = await findCoordinatesByLocation(group.province, group.district, group.neighborhood);
      }
      
      // Mahalle bulunamadıysa veya yoksa, ilçe düzeyinde dene
      if (!coordinates) {
        coordinates = await findCoordinatesByLocation(group.province, group.district);
      }
      
      // Koordinat bulunduysa işle ve önbelleğe ekle
      if (coordinates) {
        // Önbelleğe ekle
        const cacheKey = `${group.province}-${group.district}${group.neighborhood ? '-' + group.neighborhood : ''}`;
        coordinateCache[cacheKey] = coordinates;
        
        console.log(`Kuyruktan işlenen konum: ${cacheKey}`);
        
        // Her 5 koordinatta bir önbelleği kaydet
        if (pendingLocationQueue.length % 5 === 0) {
          saveCacheToStorage();
        }
      }
    } catch (error) {
      console.error(`Koordinat bulma hatası (${key}):`, error);
    }
    
    // Kuyruğun sonraki öğesini işle (gecikmeli)
    setTimeout(processLocationQueue, REQUEST_DELAY * 2);
  })();
};

/**
 * Dışarıdan koordinat verilerini yükleyerek önbelleğe ekler
 * @param {Object} coordinateData - {[il-ilçe]: {lat, lng}} formatında koordinat verisi
 * @returns {number} - Eklenen koordinat sayısı
 */
export const setCoordinateData = (coordinateData) => {
  if (!coordinateData || typeof coordinateData !== 'object') {
    console.warn('Geçersiz koordinat verisi formatı');
    return 0;
  }
  
  // Koordinatları doğrulayarak önbelleğe ekle
  let count = 0;
  const validatedCoordinates = {};
  
  for (const [key, coords] of Object.entries(coordinateData)) {
    // Koordinatları doğrula
    if (!coords || typeof coords !== 'object') continue;
    
    let lat = parseFloat(coords.lat);
    let lng = parseFloat(coords.lng);
    
    // Geçersiz koordinatları atla
    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
      console.warn(`Geçersiz koordinat verisi atlandı: ${key}`);
      continue;
    }
    
    // Sınırları kontrol et
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn(`Sınırlar dışında koordinat verisi atlandı: ${key} (${lat}, ${lng})`);
      continue;
    }
    
    // Küçük bir offset ekle (aynı koordinatta birden fazla ilan için)
    const offsetFactor = 0.0005; // ~50 metre offset
    lat += (Math.random() - 0.5) * offsetFactor;
    lng += (Math.random() - 0.5) * offsetFactor;
    
    // Geçerli koordinatları ekle
    validatedCoordinates[key] = { lat, lng };
    count++;
  }
  
  // Koordinatları önbelleğe ekle
  coordinateCache = {
    ...coordinateCache,
    ...validatedCoordinates
  };
  
  // Önbelleği kaydet
  saveCacheToStorage();
  
  console.log(`${count} adet koordinat dışarıdan önbelleğe eklendi`);
  return count;
};

/**
 * İlanları lokasyon bilgisine göre gruplar
 * @param {Array} listings - İlan listesi
 * @returns {Object} - Konum grupları
 */
const groupListingsByLocation = (listings) => {
  const groups = {};
  
  for (const listing of listings) {
    // Direkt koordinatı olan ilanları hemen işle
    if (listing.latitude && listing.longitude) {
      // Doğrudan kordinatı olan ilanlar için benzersiz bir key oluştur
      // Böylece aynı koordinattaki tüm ilanlar ayrı ayrı işlenecek
      const uniqueKey = `direct_${listing.id || listing.ilan_id || Math.random().toString(36).substring(2, 10)}`;
      
      // Koordinatları float olarak ayarla
      let lat = parseFloat(listing.latitude);
      let lng = parseFloat(listing.longitude);
      
      // Küçük bir offset ekle (yaklaşık 50 metre)
      const offsetFactor = 0.0005; 
      lat += (Math.random() - 0.5) * offsetFactor;
      lng += (Math.random() - 0.5) * offsetFactor;
      
      groups[uniqueKey] = {
        source: 'direct',
        coordinates: {
          lat,
          lng
        },
        listings: [listing]
      };
      
      // Aynı zamanda bu koordinatları önbelleğe de ekleyelim ki diğer ilanlar için de kullanılabilsin
      const province = extractProvince(listing);
      const district = extractDistrict(listing);
      
      if (province && district) {
        const locationKey = `${province}-${district}`;
        
        if (!coordinateCache[locationKey]) {
          coordinateCache[locationKey] = {
            lat,
            lng
          };
        }
      }
      
      continue;
    }
    
    // Konum bilgisine göre anahtar oluştur
    const locationKey = getLocationKey(listing);
    
    if (!locationKey) {
      // Konum bilgisi olmayan ilanları atla
      continue;
    }
    
    // Grup yoksa oluştur
    if (!groups[locationKey]) {
      groups[locationKey] = {
        province: extractProvince(listing),
        district: extractDistrict(listing),
        neighborhood: extractNeighborhood(listing),
        coordinates: null,
        listings: []
      };
    }
    
    // İlanı gruba ekle
    groups[locationKey].listings.push(listing);
  }
  
  return groups;
};

/**
 * İlandan konum anahtarı oluşturur
 * @param {Object} listing - İlan
 * @returns {string|null} - Konum anahtarı
 */
const getLocationKey = (listing) => {
  const province = extractProvince(listing);
  const district = extractDistrict(listing);
  
  if (!province || !district) return null;
  
  const neighborhood = extractNeighborhood(listing);
  
  // Province ve district varsa, neighborhood opsiyonel
  // Cache key oluştururken büyük harflere dönüştürerek tutarlılık sağlayalım
  return `${province.toLocaleUpperCase('tr-TR')}-${district.toLocaleUpperCase('tr-TR')}${neighborhood ? '-' + neighborhood.toLocaleUpperCase('tr-TR') : ''}`;
};

/**
 * İlandan il bilgisini çıkarır ve formatlar
 * @param {Object} listing - İlan
 * @returns {string|null} - İl adı
 */
const extractProvince = (listing) => {
  let province = null;
  
  if (listing.konum && listing.konum.il) {
    // Büyük/küçük harf düzenlemesi - Her kelimenin ilk harfi büyük
    province = formatLocationName(listing.konum.il);
  } else if (listing.il) {
    province = formatLocationName(listing.il);
  } else if (listing.province) {
    province = formatLocationName(listing.province);
  }
  
  // İstanbul normalizasyonu - tüm İstanbul varyasyonlarını "İstanbul" olarak norm et
  if (province && province.includes("İstanbul")) {
    return "İstanbul";
  }
  
  return province;
};

/**
 * İlandan ilçe bilgisini çıkarır ve formatlar
 * @param {Object} listing - İlan
 * @returns {string|null} - İlçe adı
 */
const extractDistrict = (listing) => {
  if (listing.konum && listing.konum.ilce) {
    return formatLocationName(listing.konum.ilce);
  }
  
  if (listing.ilce) {
    return formatLocationName(listing.ilce);
  }
  
  if (listing.district) {
    return formatLocationName(listing.district);
  }
  
  return null;
};

/**
 * İlandan mahalle/köy bilgisini çıkarır ve formatlar
 * @param {Object} listing - İlan
 * @returns {string|null} - Mahalle/köy adı
 */
const extractNeighborhood = (listing) => {
  if (listing.konum && listing.konum['mahalle/köy']) {
    return formatLocationName(listing.konum['mahalle/köy']);
  }
  
  if (listing['mahalle/köy']) {
    return formatLocationName(listing['mahalle/köy']);
  }
  
  if (listing.mahalle) {
    return formatLocationName(listing.mahalle);
  }
  
  if (listing.neighborhood) {
    return formatLocationName(listing.neighborhood);
  }
  
  return null;
};

/**
 * Konum adını formatlar - tutarlı büyük/küçük harf formatı için
 * @param {string} name - Konum adı
 * @returns {string} - Formatlanmış konum adı
 */
const formatLocationName = (name) => {
  if (!name) return '';
  
  // Türkçe karakter desteği ile birlikte her kelimenin ilk harfini büyük yap
  return name.split(' ')
    .map(word => {
      if (!word) return '';
      const firstChar = word.charAt(0).toLocaleUpperCase('tr-TR');
      return firstChar + word.slice(1).toLocaleLowerCase('tr-TR');
    })
    .join(' ');
};

/**
 * Önbelleği localStorage'a kaydeder
 */
const saveCacheToStorage = () => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(coordinateCache));
  } catch (error) {
    console.warn('Önbellek kaydedilemedi:', error);
  }
};

/**
 * İl, ilçe ve mahalle/köy bilgisine göre koordinatları bulur
 * OpenStreetMap Nominatim API üzerinden geocoding yapar
 * @param {string} province - İl adı
 * @param {string} district - İlçe adı
 * @param {string} neighborhood - Mahalle veya köy adı (opsiyonel)
 * @returns {Promise<Object|null>} - Koordinatlar veya null
 */
const findCoordinatesByLocation = async (province, district, neighborhood = null) => {
  if (!province || !district) {
    return null;
  }
  
  // İstanbul'un farklı yakaları için normalizasyon işlemi
  let normalizedProvince = province;
  if (province.includes("İstanbul")) {
    normalizedProvince = "İstanbul";
  }
  
  // Önbellek anahtarı oluştur - büyük harfe dönüştürerek tutarlılık sağla
  const cacheKey = `${normalizedProvince.toLocaleUpperCase('tr-TR')}-${district.toLocaleUpperCase('tr-TR')}${neighborhood ? '-' + neighborhood.toLocaleUpperCase('tr-TR') : ''}`;
  
  // Önbellekte var mı kontrol et
  if (coordinateCache[cacheKey]) {
    console.log(`Önbellekten koordinat alındı: ${cacheKey}`);
    return coordinateCache[cacheKey];
  }

  // Arama terimi oluştur
  let searchTerm = '';
  
  if (neighborhood) {
    // En detaylı arama - İstanbul'u normalize ederek
    searchTerm = `${neighborhood}, ${district}, ${normalizedProvince}, Türkiye`;
  } else {
    // İlçe seviyesinde arama - İstanbul'u normalize ederek
    searchTerm = `${district}, ${normalizedProvince}, Türkiye`;
  }
  
  try {
    console.log(`Geocoding yapılıyor: ${searchTerm}`);
    
    // Nominatim API'ye istek at
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchTerm)}&format=json&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'tr', // Türkçe sonuçlar için
        'User-Agent': 'AcilLazim.com Konum Servisi (info@acillazim.com)' // API kurallarına göre UA belirtilmeli
      }
    });
    
    if (!response.ok) {
      throw new Error(`API yanıt hatası: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      // API'den gelen koordinatları doğrula
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      
      // Koordinatlar geçerli mi kontrol et
      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
        throw new Error(`API'den geçersiz koordinat döndü: ${data[0].lat}, ${data[0].lon}`);
      }
      
      // Sınırları kontrol et (haritanın sola kaymaması için)
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error(`API'den sınırlar dışında koordinat döndü: ${lat}, ${lng}`);
      }
      
      const result = {
        lat,
        lng
      };
      
      // Sonucu önbelleğe ekle
      coordinateCache[cacheKey] = result;
      console.log(`Koordinat bulundu ve önbelleğe eklendi: ${cacheKey}`);
      
      // Eğer bu bir İstanbul ilçesi ise, farklı "İstanbul" varyasyonları için de önbelleğe ekle
      if (normalizedProvince === "İstanbul" && province !== normalizedProvince) {
        // Orijinal ve normalize edilmiş versiyonların önbellekte eşlenmesini sağla
        const originalCacheKey = `${province.toLocaleUpperCase('tr-TR')}-${district.toLocaleUpperCase('tr-TR')}${neighborhood ? '-' + neighborhood.toLocaleUpperCase('tr-TR') : ''}`;
        coordinateCache[originalCacheKey] = result;
        console.log(`İstanbul normalizasyonu: ${originalCacheKey} anahtarı da önbelleğe eklendi`);
      }
      
      // Önbelleği her yeni koordinat bulunduğunda kaydet
      saveCacheToStorage();
      
      return result;
    }
    
    console.warn(`Konum bulunamadı: ${searchTerm}`);
    
    // Mahalle düzeyinde bulunamadıysa ve mahalle belirtilmişse, ilçe düzeyine düş
    if (neighborhood) {
      console.log(`Mahalle düzeyinde konum bulunamadı, ilçe düzeyine düşülüyor: ${district}, ${normalizedProvince}`);
      
      // İlçe düzeyinde varolan önbelleği kontrol et - büyük harfe dönüştürerek tutarlılık sağla
      const districtCacheKey = `${normalizedProvince.toLocaleUpperCase('tr-TR')}-${district.toLocaleUpperCase('tr-TR')}`;
      if (coordinateCache[districtCacheKey]) {
        // İlçe düzeyinde önbellekte varsa, bunu kullan ve mahalle için de kaydet
        coordinateCache[cacheKey] = coordinateCache[districtCacheKey];
        console.log(`İlçe düzeyindeki koordinat mahalle için de kullanıldı: ${cacheKey}`);
        return coordinateCache[districtCacheKey];
      }
      
      // İlçe düzeyinde önbellekte yoksa, yeni sorgu yap
      return findCoordinatesByLocation(normalizedProvince, district);
    }
    
    return null;
  } catch (error) {
    console.error('Konum koordinatları bulunurken hata:', error);
    
    // API hatası durumunda, mahalle belirtilmişse ilçe merkezini kullan
    if (neighborhood) {
      console.log(`Mahalle düzeyinde hata, ilçe düzeyinde tekrar deneniyor: ${district}, ${normalizedProvince}`);
      return findCoordinatesByLocation(normalizedProvince, district);
    }
    
    // İl plaka kodlarına göre yaklaşık merkez koordinat belirleme (son çare)
    if (!neighborhood && district) {
      const approxProvinceCenters = {
        'İstanbul': { lat: 41.0082, lng: 28.9784 },
        'Ankara': { lat: 39.9334, lng: 32.8597 },
        'İzmir': { lat: 38.4237, lng: 27.1428 },
        'Adana': { lat: 37.0000, lng: 35.3213 },
        'Antalya': { lat: 36.8969, lng: 30.7133 },
        'Bursa': { lat: 40.1885, lng: 29.0610 }
        // Diğer büyük iller için yaklaşık koordinatlar eklenebilir
      };
      
      if (approxProvinceCenters[normalizedProvince]) {
        console.log(`API hatası nedeniyle ${normalizedProvince} için yaklaşık merkez koordinat kullanıldı`);
        return approxProvinceCenters[normalizedProvince];
      }
    }
    
    return null;
  }
};

/**
 * İlanların resim URL'lerini alır ve birincil resmi döndürür
 * @param {Object} listing - İlan bilgisi
 * @returns {string|null} - Resim URL veya null
 */
export const getListingImageUrl = (listing) => {
  try {
    // İlanda resim var mı kontrol et
    if (listing.resimler && listing.resimler.length > 0) {
      return listing.resimler[0]; // İlk resmi döndür
    }
    
    if (listing.images && listing.images.length > 0) {
      return listing.images[0]; // İlk resmi döndür
    }
    
    if (listing.image) {
      return listing.image; // Tekli resim değişkenini döndür
    }
    
    if (listing.resim) {
      return listing.resim; // Tekli resim değişkenini döndür
    }

    // Hiçbir resim bulunamazsa null döndür
    return null;
  } catch (error) {
    console.error('İlan resmi alınırken hata:', error);
    return null;
  }
};

/**
 * İki koordinat arasındaki mesafeyi hesaplar (km cinsinden)
 * Haversine formülü kullanır
 * @param {number} lat1 - İlk koordinat enlemi
 * @param {number} lon1 - İlk koordinat boylamı
 * @param {number} lat2 - İkinci koordinat enlemi
 * @param {number} lon2 - İkinci koordinat boylamı
 * @returns {number} - Mesafe (km)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Dünya yarıçapı (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

/**
 * Önbelleği temizler
 */
export const clearCoordinateCache = () => {
  coordinateCache = {};
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Önbellek temizlenirken hata:', error);
  }
  console.log('Koordinat önbelleği temizlendi');
};

// Görünen alan içindeki konumları getiren fonksiyon
const getLocationsInBounds = async (bounds) => {
  try {
    // Koordinat bilgilerini kontrol et
    if (!bounds || !bounds.minLat || !bounds.maxLat || !bounds.minLng || !bounds.maxLng) {
      console.warn('Geçersiz koordinat bilgileri:', bounds);
      return [];
    }
    
    // Tam ekran modunda ise tamamen farklı davran
    if (document.body.classList.contains('map-fullscreen-active')) {
      // Tam ekran modunda iken detaylı loglama yapma
      // console.log('Görünen harita alanı içindeki konumlar alınıyor:', bounds);
      
      // Tam ekran modunda daha az sıklıkla çağrı yap
      if (!window._lastFullscreenRequestTime) {
        window._lastFullscreenRequestTime = Date.now();
      } else {
        const now = Date.now();
        // Son istek üzerinden en az 8 saniye geçmiş olmalı
        if ((now - window._lastFullscreenRequestTime) < 8000) {
          // console.log('Tam ekran modunda kısa sürede birden fazla istek yapılamaz.');
          return [];
        }
        window._lastFullscreenRequestTime = now;
      }
      
      // Tam ekran modunda boş veri döndür (gerçek API'ye geçildiğinde kaldırılabilir)
      return [];
    }
    
    // Son yapılan istek ile arasında önemli bir fark var mı kontrol et
    if (window._lastBoundsRequest) {
      const lastBounds = window._lastBoundsRequest;
      
      // Koordinat farklarını hesapla
      const latDiffMin = Math.abs(lastBounds.minLat - bounds.minLat);
      const latDiffMax = Math.abs(lastBounds.maxLat - bounds.maxLat);
      const lngDiffMin = Math.abs(lastBounds.minLng - bounds.minLng);
      const lngDiffMax = Math.abs(lastBounds.maxLng - bounds.maxLng);
      
      // Eğer koordinat farkı belirli bir eşiğin altındaysa, yeni istek yapma
      const MIN_COORD_DIFF = 0.05; // ~5.5 km mesafe farkı
      if (latDiffMin < MIN_COORD_DIFF && latDiffMax < MIN_COORD_DIFF && 
          lngDiffMin < MIN_COORD_DIFF && lngDiffMax < MIN_COORD_DIFF) {
        console.log('Koordinat farkı çok az, yeni istek yapılmıyor:', bounds);
        return [];
      }
    }
    
    // Son istek bilgisini kaydet
    window._lastBoundsRequest = {...bounds};
    
    console.log('Görünen harita alanı içindeki konumlar alınıyor:', bounds);

    // NOT: Backend'de coğrafi sınır (bounding box) bazlı ilan arama endpoint'i henüz yok
    // (ListingSearchCriteria sadece locationCity/locationDistrict destekliyor, lat/lng aralığı yok).
    // Bu nedenle burada gerçek bir ağ isteği yapılmıyor — sahte/başarılı yanıt simülasyonu da
    // kaldırıldı. Tam ekran haritada pan/zoom sırasında ek ilan yüklenmesi şu an devre dışı;
    // gösterilen pinler `getListingLocations` ile zaten yüklenmiş ilanlardan geliyor.
    return [];
  } catch (error) {
    console.error('Görünen alan içindeki konumları alırken hata:', error);
    return [];
  }
};

export default {
  getListingLocations,
  getListingImageUrl,
  calculateDistance,
  clearCoordinateCache,
  setCoordinateData,
  getLocationsInBounds
}; 