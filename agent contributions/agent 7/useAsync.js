// ============================================
// Agent 7 of 10 — useAsync Hook
// Generic utility for wrapping any async
// operation with loading/error/data state.
// ============================================

import { useState, useCallback } from 'react';

export function useAsync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (asyncFn) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      return result;
    } catch (err) {
      setError(err.message || 'Something went wrong');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return { loading, error, run, reset };
}

export default useAsync;
