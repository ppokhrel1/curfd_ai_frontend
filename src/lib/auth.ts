import type { AuthState, User } from "@/types/global";
import { create } from "zustand";
import { STORAGE_KEYS } from "./constants";
import { supabaseAuth } from "./supabaseAuth";

interface AuthStore extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
  initAuth: () => Promise<void>;
  demoLogin: () => void;
  signInWithProvider: (provider: "google" | "github") => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initAuth: async () => {
    try {
      const { user, session } = await supabaseAuth.getSession();

      if (user && session) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, session.access_token);
        const { chatService } = await import(
          "@/modules/ai/services/chatService"
        );
        const { useChatStore } = await import("@/modules/ai/stores/chatStore");

        chatService.setUserId(user.id.toString());
        useChatStore.getState().setCurrentUserId(user.id.toString());

        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        set({ user: null, isAuthenticated: false, isLoading: false });
      }

      supabaseAuth.onAuthStateChange((user, session) => {
        if (user && session) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, session.access_token);
          set({ user, isAuthenticated: true });
        } else {
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          set({ user: null, isAuthenticated: false });
        }
      });
    } catch (err) {
      console.error("Auth initialization error:", err);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      set({ isLoading: false, error: "Failed to initialize authentication" });
    }
  },

  demoLogin: () => {
    const demoUser: User = {
      id: "demo-user-id",
      name: "Demo User",
      email: "demo@curfd.ai",
    };

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
      const { user, session } = await supabaseAuth.signIn(email, password);

      if (!user) {
        throw new Error("Sign in failed");
      }

      if (session) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, session.access_token);
      }

      const { chatService } = await import("@/modules/ai/services/chatService");
      const { useChatStore } = await import("@/modules/ai/stores/chatStore");
      useChatStore.getState().clearStore();

      chatService.setUserId(user.id.toString());
      useChatStore.getState().setCurrentUserId(user.id.toString());

      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  signUp: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user, session } = await supabaseAuth.signUp(email, password, name);

      if (!user) {
        throw new Error(
          "Sign up failed - please check your email for confirmation"
        );
      }

      if (session) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, session.access_token);
      }

      const { chatService } = await import("@/modules/ai/services/chatService");
      const { useChatStore } = await import("@/modules/ai/stores/chatStore");
      useChatStore.getState().clearStore();

      chatService.setUserId(user.id.toString());
      useChatStore.getState().setCurrentUserId(user.id.toString());

      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  signInWithProvider: async (provider: "google" | "github") => {
    set({ isLoading: true, error: null });
    try {
      await supabaseAuth.signInWithProvider(provider);
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || `${provider} sign in failed`,
      });
      throw err;
    }
  },

  signOut: async () => {
    try {
      await supabaseAuth.signOut();
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      const { chatService } = await import("@/modules/ai/services/chatService");
      const { useChatStore } = await import("@/modules/ai/stores/chatStore");

      chatService.setUserId(null);
      chatService.setActiveSession(null);
      useChatStore.getState().clearStore();

      set({ user: null, isAuthenticated: false, error: null });
    } catch (err) {
      console.error("Sign out error:", err);
      set({ user: null, isAuthenticated: false, error: null });
    }
  },
}));
