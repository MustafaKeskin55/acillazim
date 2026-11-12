/**
 * Site Haberleri (News) Servisi
 *
 *   GET /api/v1/news?category=&search=&page=&page_size=  -> liste (yayinlanmis)
 *   GET /api/v1/news/{id}                                 -> detay + ilgili haberler (goruntulenme sayisi artar)
 */

export interface NewsItem {
  id: number;
  title: string;
  category: string;
  date: string;
  summary: string;
  image: string;
  views: number;
  tags: string[];
}

export interface NewsDetail extends NewsItem {
  content: string;
  author: string;
  readTime: string;
}

interface RawNews {
  id: number;
  title: string;
  category: string;
  summary?: string;
  content?: string;
  image?: string;
  author?: string;
  readTime?: string;
  views?: number;
  tags?: string[];
  date?: string;
}

function resolveApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api/v1';
  const host = raw
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/v1\/?$/, '');
  return `${host}/api/v1`;
}

const API_BASE_URL = resolveApiBase();

function unwrapData<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/** Backend ISO tarihi -> "5 Mart 2024" formatinda gosterim (tasarim korunur). */
export function formatNewsDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function mapNews(raw: RawNews): NewsItem {
  return {
    id: raw.id,
    title: raw.title,
    category: raw.category,
    date: formatNewsDate(raw.date),
    summary: raw.summary || '',
    image: raw.image || 'https://placehold.co/600x400',
    views: raw.views || 0,
    tags: raw.tags || [],
  };
}

function mapNewsDetail(raw: RawNews): NewsDetail {
  return {
    ...mapNews(raw),
    content: raw.content || '',
    author: raw.author || 'Admin',
    readTime: raw.readTime || '1 dakika',
  };
}

class NewsService {
  private baseUrl = `${API_BASE_URL}/news`;

  async getNews(params?: { category?: string; search?: string }): Promise<NewsItem[]> {
    const qs = new URLSearchParams();
    if (params?.category && params.category !== 'all') qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    qs.set('page_size', '100');

    try {
      const response = await fetch(`${this.baseUrl}?${qs.toString()}`);
      if (!response.ok) throw new Error('Haberler yüklenemedi');
      const data = unwrapData<{ news?: RawNews[] }>(await response.json());
      return (data.news || []).map(mapNews);
    } catch (error) {
      console.error('Haberler yüklenirken hata:', error);
      throw error;
    }
  }

  async getNewsDetail(id: string | number): Promise<{ news: NewsDetail; related: NewsItem[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      if (!response.ok) throw new Error('Haber bulunamadı');
      const data = unwrapData<{ news: RawNews; related?: RawNews[] }>(await response.json());
      return {
        news: mapNewsDetail(data.news),
        related: (data.related || []).map(mapNews),
      };
    } catch (error) {
      console.error('Haber detayı yüklenirken hata:', error);
      throw error;
    }
  }
}

export const newsService = new NewsService();
