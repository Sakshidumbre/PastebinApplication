import { NextResponse } from 'next/server';
import { CreatePasteRequest, ErrorResponse } from './types';

export function validateCreatePasteRequest(body: any): { valid: boolean; error?: NextResponse<ErrorResponse> } {
  const { content, ttl_seconds, max_views } = body as CreatePasteRequest;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'content is required and must be a non-empty string' },
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

  return { valid: true };
}

