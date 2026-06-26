import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  academic_id: string | null;
  phone: string | null;
  id_card_url: string | null;
  is_verified: boolean;
  verification_status: "incomplete" | "pending" | "verified" | "rejected";
  rejection_reason: string | null;
  batch_year: number | null;
  avatar_url: string | null;
}

export type AppRole = "super_admin" | "admin" | "student";

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  roles: AppRole[];
  loading: boolean;
}

export function useAuth(): AuthState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    roles: [],
    loading: true,
  });

  async function ensureProfile(user: User): Promise<ProfileRow | null> {
    const { data: existing, error: selectError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError) throw selectError;
    if (existing) return existing as ProfileRow;

    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email ?? null,
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;
    return inserted as ProfileRow;
  }

  async function loadFor(session: Session | null) {
    if (!session?.user) {
      setState({ session: null, user: null, profile: null, roles: [], loading: false });
      return;
    }
    const userId = session.user.id;
    try {
      const [profile, { data: roleRows, error: rolesError }] = await Promise.all([
        ensureProfile(session.user),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (rolesError) throw rolesError;
      setState({
        session,
        user: session.user,
        profile,
        roles: (roleRows ?? []).map((r) => r.role as AppRole),
        loading: false,
      });
    } catch (error) {
      console.error("[auth] failed to load user profile", error);
      setState({ session, user: session.user, profile: null, roles: [], loading: false });
    }
  }

  useEffect(() => {
    let mounted = true;
    const fallbackTimer = window.setTimeout(() => {
      if (mounted) setState((current) => ({ ...current, loading: false }));
    }, 8000);

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        window.clearTimeout(fallbackTimer);
        void loadFor(data.session);
      })
      .catch((error) => {
        console.error("[auth] getSession failed", error);
        if (mounted) setState({ session: null, user: null, profile: null, roles: [], loading: false });
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        window.setTimeout(() => {
          if (mounted) void loadFor(session);
        }, 0);
      }
    });
    return () => {
      mounted = false;
      window.clearTimeout(fallbackTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    ...state,
    refresh: async () => {
      const { data } = await supabase.auth.getSession();
      await loadFor(data.session);
    },
  };
}

export function isAdminRole(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("super_admin");
}
