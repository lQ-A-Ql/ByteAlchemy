import { useEffect, useState } from 'react';


function readStringValue(key: string, fallback: string) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  return localStorage.getItem(key) ?? fallback;
}


function readNumberValue(key: string, fallback: number) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const rawValue = localStorage.getItem(key);
  const parsed = rawValue ? Number.parseFloat(rawValue) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}


export function useStoredString(key: string, fallback = '', updateEvent?: string) {
  const [value, setValue] = useState(() => readStringValue(key, fallback));

  useEffect(() => {
    const syncValue = () => setValue(readStringValue(key, fallback));

    syncValue();
    window.addEventListener('storage', syncValue);
    if (updateEvent) {
      window.addEventListener(updateEvent, syncValue);
    }

    return () => {
      window.removeEventListener('storage', syncValue);
      if (updateEvent) {
        window.removeEventListener(updateEvent, syncValue);
      }
    };
  }, [fallback, key, updateEvent]);

  return value;
}


export function useStoredNumber(key: string, fallback = 0, updateEvent?: string) {
  const [value, setValue] = useState(() => readNumberValue(key, fallback));

  useEffect(() => {
    const syncValue = () => setValue(readNumberValue(key, fallback));

    syncValue();
    window.addEventListener('storage', syncValue);
    if (updateEvent) {
      window.addEventListener(updateEvent, syncValue);
    }

    return () => {
      window.removeEventListener('storage', syncValue);
      if (updateEvent) {
        window.removeEventListener(updateEvent, syncValue);
      }
    };
  }, [fallback, key, updateEvent]);

  return value;
}
