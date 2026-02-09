import type { User } from "@/types/global";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export class SupabaseAuthService {
  async signUp(email: string, password: string, displayName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) throw error;

    return {
      user: this.mapSupabaseUser(data.user),
      session: data.session,
    };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return {
      user: this.mapSupabaseUser(data.user),
      session: data.session,
    };
  }

  async signInWithProvider(provider: "google" | "github") {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/home`,
      },
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    return {
      user: data.session?.user ? this.mapSupabaseUser(data.session.user) : null,
      session: data.session,
    };
  }

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    return this.mapSupabaseUser(data.user);
  }

  onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ? this.mapSupabaseUser(session.user) : null;
      callback(user, session);
    });
  }

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  }

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  private mapSupabaseUser(supabaseUser: SupabaseUser | null): User | null {
    if (!supabaseUser) return null;

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || "",
      name:
        supabaseUser.user_metadata?.display_name ||
        supabaseUser.email?.split("@")[0] ||
        "User",
    };
  }
}

export const supabaseAuth = new SupabaseAuthService();
