export type PastePrivacy = 'public' | 'unlisted' | 'private';

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
  userId?: string;
  privacy?: PastePrivacy;
}

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: number;
}

export interface CreatePasteRequest {
  content: string;
  title?: string;
  syntax?: string;
  ttl_seconds?: number;
  expiration?: string;
  max_views?: number;
  burn_after_read?: boolean;
  privacy?: PastePrivacy;
}

export interface ListPastesResponse {
  pastes: Array<{
    id: string;
    title?: string;
    syntax?: string;
    createdAt: number;
    viewCount: number;
    privacy?: PastePrivacy;
    expires_at: string | null;
  }>;
  total: number;
}

export interface UserRegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
  };
  token: string;
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

