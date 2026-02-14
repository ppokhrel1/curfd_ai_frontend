import axios, { AxiosError } from "axios";
import { STORAGE_KEYS } from "../constants";
import { supabaseAuth } from "../supabaseAuth";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 👇 UPDATED: Async interceptor to get FRESH token
api.interceptors.request.use(
  async (config) => {
    // 1. Initialize with local token (fallback)
    let token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    // 2. Ask Supabase for the current session
    // This automatically refreshes the token if it's expired
    try {
      // Handle different export styles of supabaseAuth
      const sessionData = await (supabaseAuth.getSession 
        ? supabaseAuth.getSession() 
        : supabaseAuth.auth.getSession());

      if (sessionData.data.session?.access_token) {
        token = sessionData.data.session.access_token;
        // Keep local storage in sync
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      }
    } catch (e) {
      // If Supabase check fails, fall back to existing token
      // This prevents crashing if offline
    }

    // 3. Attach the valid token
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
    if (newToken) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
    }
    return response;
  },
  async (error: AxiosError) => {
    // If we still get 401, the user is truly logged out
    if (error.response?.status === 401) {
      console.warn("[API] 401 Unauthorized - Logging out");
      
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      
      try {
        await supabaseAuth.signOut();
      } catch (e) {
        console.error("Failed to sign out from Supabase on 401", e);
      }
      
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