import { useState, useRef, useCallback, useEffect } from 'react';

export const useConfirmAction = (timeoutMs = 3000) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const trigger = useCallback((action: () => void, id: string = 'default') => {
    setActiveId(prev => {
      if (prev !== id) {
        clearTimer();
        timeoutRef.current = setTimeout(() => {
          setActiveId(null);
        }, timeoutMs);
        return id;
      }

      action();
      clearTimer();
      return null;
    });
  }, [timeoutMs, clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { activeId, trigger };
};
