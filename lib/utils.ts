const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 8;

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(ID_LENGTH);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => ID_CHARS[byte % ID_CHARS.length]).join('');
  }
  
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ID_CHARS.charAt(Math.floor(Math.random() * ID_CHARS.length));
  }
  return id;
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function getCurrentTime(testMode: boolean, testNowMs?: string): number {
  if (testMode && testNowMs) {
    const parsed = Number.parseInt(testNowMs, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return Date.now();
}

export function isPasteAvailable(
  paste: { createdAt: number; ttlSeconds: number | null; maxViews: number | null; viewCount: number },
  currentTime: number
): boolean {
  if (paste.ttlSeconds) {
    const elapsedSeconds = Math.floor((currentTime - paste.createdAt) / 1000);
    if (elapsedSeconds >= paste.ttlSeconds) {
      return false;
    }
  }

  if (paste.maxViews !== null && paste.viewCount >= paste.maxViews) {
    return false;
  }

  return true;
}

