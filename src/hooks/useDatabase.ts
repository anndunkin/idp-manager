import { useState, useCallback } from 'react';

type AsyncFn<T, A extends unknown[]> = (...args: A) => Promise<T>;

export function useAsync<T, A extends unknown[]>(fn: AsyncFn<T, A>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: A): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn(...args);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fn]);

  return { execute, loading, error };
}

export function useDatabase() {
  const isAvailable = typeof window !== 'undefined' && !!window.api;

  return {
    isAvailable,
    employees: isAvailable ? window.api.employees : null,
    plans: isAvailable ? window.api.plans : null,
    items: isAvailable ? window.api.items : null,
    milestones: isAvailable ? window.api.milestones : null,
    export: isAvailable ? window.api.export : null,
  };
}
