export interface Paste {
  id: string;
  content: string;
  title?: string;
  syntax?: string;
  createdAt: number;
  ttlSeconds: number | null;
  maxViews: number | null;
  viewCount: number;
  burnAfterRead?: boolean;
}

export interface CreatePasteRequest {
  content: string;
  title?: string;
  syntax?: string;
  ttl_seconds?: number;
  expiration?: string;
  max_views?: number;
  burn_after_read?: boolean;
}

export interface ListPastesResponse {
  pastes: Array<{
    id: string;
    title?: string;
    syntax?: string;
    createdAt: number;
    viewCount: number;
    expires_at: string | null;
  }>;
  total: number;
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

