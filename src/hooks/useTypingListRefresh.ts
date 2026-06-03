'use client';

import { useEffect, useState } from 'react';

/** Re-render list every ~400ms so typing labels expire visually */
export function useTypingListRefresh(enabled: boolean) {
  const [, tick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => tick((n) => n + 1), 400);
    return () => clearInterval(id);
  }, [enabled]);
}
