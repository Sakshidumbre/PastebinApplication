'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ExpirationHandlerProps {
  expiresAt: string | null;
  createdAt: number;
  ttlSeconds: number | null;
}

export default function ExpirationHandler({ expiresAt, createdAt, ttlSeconds }: ExpirationHandlerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!ttlSeconds || !expiresAt) {
      return;
    }

    const expirationTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const timeUntilExpiration = expirationTime - now;

    if (timeUntilExpiration <= 0) {
      router.refresh();
      return;
    }

    const timer = setTimeout(() => {
      router.refresh();
    }, timeUntilExpiration);

    return () => clearTimeout(timer);
  }, [expiresAt, ttlSeconds, router]);

  return null;
}

