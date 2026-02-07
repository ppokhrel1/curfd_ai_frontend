import { AuthState, User } from "@/types/global";
import axios from "axios";
import { create } from "zustand";
import { api } from "./api/client";
import { STORAGE_KEYS } from "./constants";
import { encryptPassword } from "./encryption";

interface AuthStore extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
  initAuth: () => Promise<void>;
  demoLogin: () => void; // Keep for fallback if needed
  signInWithProvider: (provider: "google" | "github") => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Initialize auth from localStorage and verify token
  initAuth: async () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      if (token) {
        // optimistically set user if data exists
        const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (userData) {
          set({ user: JSON.parse(userData), isAuthenticated: true });
        }

        // Verify token with backend
        try {
          const response = await api.get("/auth/me");
          const user = response.data;

          localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

          // Initialize chat service with user context
          const { chatService } = await import(
            "@/modules/ai/services/chatService"
          );
          const { useChatStore } = await import(
            "@/modules/ai/stores/chatStore"
          );
          const userId = user.id || user.user_id;
          if (userId) {
            chatService.setUserId(userId.toString());
            useChatStore.getState().setCurrentUserId(userId.toString());
          }

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          // Token invalid
          console.error("Token verification failed:", error);
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER_DATA);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error("Auth initialization error:", err);
      set({ isLoading: false, error: "Failed to initialize authentication" });
    }
  },

  demoLogin: () => {
    const demoUser: User = {
      id: 1,
      name: "Demo User",
      email: "demo@curfd.ai",
    };

    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, "demo-token");
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(demoUser));

    set({
      user: demoUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      // Encrypt password before sending
      const encryptedPassword = encryptPassword(password);

      const payload = {
        username_or_email: email,
        password: encryptedPassword,
        encrypted: true // Flag to tell backend this is encrypted
      };

      const response = await api.post("/auth/login", payload);

      const { access_token } = response.data;

      // Save token
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, access_token);

      // Get User Profile immediately
      const profileResponse = await api.get("/auth/me");
      const user = profileResponse.data;

      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      // Clear and re-initialize chat for new user
      const { chatService } = await import("@/modules/ai/services/chatService");
      const { useChatStore } = await import("@/modules/ai/stores/chatStore");
      useChatStore.getState().clearStore();

      const userId = user.id || user.user_id;
      if (userId) {
        chatService.setUserId(userId.toString());
        useChatStore.getState().setCurrentUserId(userId.toString());
      }

      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      let message = "Sign in failed";
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        console.error("Sign in 422 DETAIL:", JSON.stringify(detail, null, 2));
        message =
          typeof detail === "string"
            ? detail
            : detail
              ? "Schema mismatch (see console)"
              : message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  // Sign up with API
  signUp: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      // Encrypt password before sending
      const encryptedPassword = encryptPassword(password);

      const payload = {
        username: email.split("@")[0],
        email: email,
        password: encryptedPassword,
        display_name: name,
        encrypted: true // Flag to tell backend this is encrypted
      };

      // Register calls /auth/register
      const response = await api.post("/auth/register", payload);
      const { access_token, user } = response.data;

      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, access_token);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      // Clear and re-initialize chat for new user
      const { chatService } = await import("@/modules/ai/services/chatService");
      const { useChatStore } = await import("@/modules/ai/stores/chatStore");
      useChatStore.getState().clearStore();

      const userId = user.id || user.user_id;
      if (userId) {
        chatService.setUserId(userId.toString());
        useChatStore.getState().setCurrentUserId(userId.toString());
      }

      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      let message = "Sign up failed";
      if (axios.isAxiosError(err)) {
        console.error(
          "Sign up ERROR DETAIL:",
          JSON.stringify(err.response?.data, null, 2)
        );
        const detail = err.response?.data?.detail;
        message =
          typeof detail === "string"
            ? detail
            : detail
              ? "Backend Error (see console)"
              : message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  // Sign in with Provider (Google/GitHub)
  signInWithProvider: async (provider: "google" | "github") => {
    set({ isLoading: true, error: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // TODO: Implement Real OAuth Flow with Backend
      throw new Error("Social login not yet implemented on backend");
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || `${provider} sign in failed`,
      });
      throw err;
    }
  },

  // Sign out
  signOut: async () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);

    // Clear chat service context locally
    const { chatService } = await import("@/modules/ai/services/chatService");
    const { useChatStore } = await import("@/modules/ai/stores/chatStore");

    chatService.setUserId(null);
    chatService.setActiveSession(null);
    useChatStore.getState().clearStore();

    set({ user: null, isAuthenticated: false, error: null });
  },
}));
