import * as XLSX from 'xlsx';

interface StatItem {
  title: string;
  value: string | number;
  change: string | number;
  lastWeek: string | number;
}

interface TimeData {
  labels: string[];
  data: number[];
}

interface Listing {
  title: string;
  price?: string | number;
  status?: string;
  stats?: { views?: number };
  date?: string | Date;
  views?: number;
  favorites?: number;
  messages?: number;
  trend?: { value: number };
}

interface ExportData {
  stats: StatItem[];
  timeData: TimeData;
  popularListings: Listing[];
  allListings: Listing[];
  formatDate: (date: string | Date) => string;
}

export const exportToExcel = (data: ExportData, dateRange: string): void => {
  const { stats, timeData, popularListings, allListings, formatDate } = data;

  const workbook = XLSX.utils.book_new();

  // 1. İstatistik Özeti sayfası
  const summaryData = stats.map(stat => ({
    'İstatistik': stat.title,
    'Değer': stat.value,
    'Değişim': stat.change,
    'Geçen Hafta': stat.lastWeek
  }));
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'İstatistik Özeti');

  // 2. Görüntülenme İstatistikleri sayfası
  let viewsData: Record<string, unknown>[];
  switch (dateRange) {
    case 'month':
      viewsData = [{
        'Dönem': new Date().toLocaleString('tr-TR', { month: 'long', year: 'numeric' }),
        'Toplam Görüntülenme': timeData.data.reduce((a, b) => a + b, 0)
      }];
      break;
    case 'quarter': {
      const currentMonth = new Date().getMonth();
      viewsData = timeData.data.map((value, index) => ({
        'Ay': new Date(new Date().getFullYear(), currentMonth - 2 + index).toLocaleString('tr-TR', { month: 'long' }),
        'Görüntülenme': value
      }));
      break;
    }
    case 'year':
      viewsData = timeData.labels.map((month, index) => ({
        'Ay': month,
        'Görüntülenme': timeData.data[index]
      }));
      break;
    default:
      viewsData = timeData.labels.map((label, index) => ({
        'Dönem': label,
        'Görüntülenme': timeData.data[index]
      }));
  }

  const viewsSheet = XLSX.utils.json_to_sheet(viewsData);
  XLSX.utils.book_append_sheet(workbook, viewsSheet, 'Görüntülenme İstatistikleri');

  // 3. Popüler İlanlar sayfası
  const popularData = popularListings.map(listing => ({
    'İlan Başlığı': listing.title,
    'Görüntülenme': listing.views,
    'Favoriye Eklenme': listing.favorites,
    'Mesajlar': listing.messages,
    'Trend': listing.trend?.value
  }));
  const popularSheet = XLSX.utils.json_to_sheet(popularData);
  XLSX.utils.book_append_sheet(workbook, popularSheet, 'Popüler İlanlar');

  // 4. Tüm İlanlar Detayı sayfası
  const allListingsData = allListings.map(listing => ({
    'İlan Başlığı': listing.title,
    'Fiyat': listing.price,
    'Durum': listing.status === 'active' ? 'Aktif' : 'Pasif',
    'Görüntülenme': listing.stats?.views || 0,
    'İlan Tarihi': formatDate(listing.date || new Date())
  }));

  const allListingsSheet = XLSX.utils.json_to_sheet(allListingsData);
  const wscols = [
    { wch: 30 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 }
  ];
  allListingsSheet['!cols'] = wscols;
  const wsrows = Array(allListingsData.length + 1).fill({ hpt: 25 });
  allListingsSheet['!rows'] = wsrows;
  XLSX.utils.book_append_sheet(workbook, allListingsSheet, 'Tüm İlanlar');

  const fileName = `ilan_istatistikleri_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
