import { useState, useCallback, useRef, useEffect } from 'react';

export const useApi = (apiFunction, options = {}) => {
  const { immediate = false, initialArgs = [], onSuccess, onError } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    if (!apiFunction) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFunction(...args);
      const result = response?.data ?? response;
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
        if (onSuccess) onSuccess(result);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        const errMsg = err.response?.data?.message || err.message || 'An error occurred';
        setError(errMsg);
        setLoading(false);
        if (onError) onError(errMsg);
      }
      throw err;
    }
  }, [apiFunction, onSuccess, onError]);

  const refresh = useCallback(() => {
    return execute(...initialArgs);
  }, [execute, initialArgs]);

  useEffect(() => {
    if (immediate && apiFunction) {
      execute(...initialArgs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, refresh, reset };
};

export default useApi;
