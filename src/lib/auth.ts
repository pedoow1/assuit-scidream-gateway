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

  async function loadFor(session: Session | null) {
    if (!session?.user) {
      setState({ session: null, user: null, profile: null, roles: [], loading: false });
      return;
    }
    const userId = session.user.id;
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setState({
      session,
      user: session.user,
      profile: (profile as ProfileRow | null) ?? null,
      roles: (roleRows ?? []).map((r) => r.role as AppRole),
      loading: false,
    });
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) loadFor(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        loadFor(session);
      }
    });
    return () => {
      mounted = false;
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
