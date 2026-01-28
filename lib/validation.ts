import { NextResponse } from 'next/server';
import { CreatePasteRequest, ErrorResponse } from './types';

const EXPIRATION_OPTIONS: Record<string, number> = {
  '1m': 60,
  '10m': 600,
  '1h': 3600,
  '1d': 86400,
  '1w': 604800,
  '2w': 1209600,
  '1month': 2592000,
  '6months': 15552000,
  '1year': 31536000,
};

export function validateCreatePasteRequest(body: any): { valid: boolean; error?: NextResponse<ErrorResponse> } {
  const { content, ttl_seconds, expiration, max_views, title, syntax, burn_after_read, privacy } = body as CreatePasteRequest;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'content is required and must be a non-empty string' },
        { status: 400 }
      ),
    };
  }

  if (title !== undefined && (typeof title !== 'string' || title.length > 200)) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'title must be a string with max 200 characters' },
        { status: 400 }
      ),
    };
  }

  if (syntax !== undefined && typeof syntax !== 'string') {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'syntax must be a string' },
        { status: 400 }
      ),
    };
  }

  if (ttl_seconds !== undefined) {
    if (typeof ttl_seconds !== 'number' || !Number.isInteger(ttl_seconds) || ttl_seconds < 1) {
      return {
        valid: false,
        error: NextResponse.json(
          { error: 'ttl_seconds must be an integer >= 1' },
          { status: 400 }
        ),
      };
    }
  }

  if (expiration !== undefined) {
    if (typeof expiration !== 'string' || !EXPIRATION_OPTIONS[expiration]) {
      return {
        valid: false,
        error: NextResponse.json(
          { error: `expiration must be one of: ${Object.keys(EXPIRATION_OPTIONS).join(', ')}` },
          { status: 400 }
        ),
      };
    }
  }

  if (max_views !== undefined) {
    if (typeof max_views !== 'number' || !Number.isInteger(max_views) || max_views < 1) {
      return {
        valid: false,
        error: NextResponse.json(
          { error: 'max_views must be an integer >= 1' },
          { status: 400 }
        ),
      };
    }
  }

  if (burn_after_read !== undefined && typeof burn_after_read !== 'boolean') {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'burn_after_read must be a boolean' },
        { status: 400 }
      ),
    };
  }

  if (privacy !== undefined) {
    if (!['public', 'unlisted', 'private'].includes(privacy)) {
      return {
        valid: false,
        error: NextResponse.json(
          { error: 'privacy must be one of: public, unlisted, private' },
          { status: 400 }
        ),
      };
    }
  }

  return { valid: true };
}

export function getTtlFromExpiration(expiration?: string, ttl_seconds?: number): number | null {
  if (ttl_seconds !== undefined) {
    return ttl_seconds;
  }
  if (expiration && EXPIRATION_OPTIONS[expiration]) {
    return EXPIRATION_OPTIONS[expiration];
  }
  return null;
}

