import axios, { AxiosError } from "axios";
import { STORAGE_KEYS } from "../constants";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const newToken = response.headers["x-refresh-token"];
    const expiresAt = response.headers["x-refresh-token-expires-at"];

    if (newToken) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
    }

    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      if (window.location.pathname !== "/landing") {
        window.location.href = "/landing";
      }
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"];
      console.warn(`⚠️ Rate limited. Retry after ${retryAfter}s`);
    }

    return Promise.reject(error);
  }
);

export default api;
