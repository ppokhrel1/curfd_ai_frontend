import { STORAGE_KEYS } from '@/lib/auth';
import { ApiRequestConfig, ApiResponse } from '@/types/api.type';
import { useCallback, useState } from 'react';

/**
 * Hook for making API requests with authentication
 */
export const useApi = <T = any>() => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const request = useCallback(
    async (endpoint: string, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...config.headers,
        };

        const url = new URL(`${baseUrl}${endpoint}`);
        if (config.params) {
          Object.entries(config.params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
          });
        }

        const response = await fetch(url.toString(), {
          method: config.method || 'GET',
          headers,
          body: config.body ? JSON.stringify(config.body) : undefined,
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.message || 'API request failed');
        }

        setData(responseData.data);
        return {
          success: true,
          data: responseData.data,
          message: responseData.message,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const get = useCallback(
    (endpoint: string, params?: Record<string, string>) => {
      return request(endpoint, { method: 'GET', params });
    },
    [request]
  );

  const post = useCallback(
    (endpoint: string, body: any) => {
      return request(endpoint, { method: 'POST', body });
    },
    [request]
  );

  const put = useCallback(
    (endpoint: string, body: any) => {
      return request(endpoint, { method: 'PUT', body });
    },
    [request]
  );

  const del = useCallback(
    (endpoint: string) => {
      return request(endpoint, { method: 'DELETE' });
    },
    [request]
  );

  return {
    data,
    error,
    isLoading,
    request,
    get,
    post,
    put,
    delete: del,
  };
};