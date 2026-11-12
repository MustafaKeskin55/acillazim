export interface MonthlyPoint {
  periodKey: string;
  label: string;
  views: number;
}

export interface PopularListingStat {
  id: number;
  title: string;
  views: number;
  favorites: number;
  messages: number;
  trendValue: string;
  trendStatus: "positive" | "negative" | "neutral";
}

export interface ListingStatItem {
  id: number;
  title: string;
  img: string | null;
  price: number | null;
  currency: string | null;
  locationCity: string | null;
  active: boolean;
  createdAt: string | null;
  views: number;
  favorites: number;
  messages: number;
  monthlyViews: number[];
  category?: string | null;
  categoryId?: number | null;
}

export interface ListingStatsResponse {
  totalViews: number;
  totalFavorites: number;
  totalMessages: number;
  monthlyViews: MonthlyPoint[];
  popularListings: PopularListingStat[];
  listings: ListingStatItem[];
}

function resolveListingStatsApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
  if (!raw) return "/api/v1";
  const host = raw
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/api\/?$/, "")
    .replace(/\/v1\/?$/, "");
  return `${host}/api/v1`;
}

const API_BASE_URL = resolveListingStatsApiBase();

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function unwrapData<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in (json as object)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export async function getMyListingStats(): Promise<ListingStatsResponse> {
  const endpoint = `${API_BASE_URL}/listings/my-stats`;
  console.log(`[ListingStatsApiService] GET ${endpoint}`);

  const response = await fetch(endpoint, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Listing stats request failed: ${response.status}`);
  }

  return unwrapData<ListingStatsResponse>(await response.json());
}

export default { getMyListingStats };