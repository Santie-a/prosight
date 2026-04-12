import { useState, useCallback } from 'react';

interface UseAPIOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  showErrorAlert?: boolean;
}

export function useAPI<T>(
  apiCall: (...args: any[]) => Promise<T>,
  options: UseAPIOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiCall(...args);
        setData(result);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);

        if (options.showErrorAlert) {
          console.error('API Error:', error.message);
        }

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [apiCall, options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, error, loading, execute, reset };
}
