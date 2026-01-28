export interface Paste {
  id: string;
  content: string;
  createdAt: number;
  ttlSeconds: number | null;
  maxViews: number | null;
  viewCount: number;
}

export interface CreatePasteRequest {
  content: string;
  ttl_seconds?: number;
  max_views?: number;
}

export interface CreatePasteResponse {
  id: string;
  url: string;
}

export interface GetPasteResponse {
  content: string;
  remaining_views: number | null;
  expires_at: string | null;
}

export interface ErrorResponse {
  error: string;
}

