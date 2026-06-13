'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

function getBoliviaDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/La_Paz',
  }).format(value);
}

export function LiveAutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentDateRef = useRef(getBoliviaDate());

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextDate = getBoliviaDate();
      const hasManualDate = searchParams.has('date');

      if (nextDate !== currentDateRef.current) {
        currentDateRef.current = nextDate;

        if (pathname === '/en-vivo' && !hasManualDate) {
          router.replace(`/en-vivo?view=today&date=${nextDate}`);
          return;
        }
      }

      router.refresh();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [pathname, router, searchParams]);

  return null;
}
