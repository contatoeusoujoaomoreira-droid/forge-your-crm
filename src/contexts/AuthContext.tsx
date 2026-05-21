import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  userPermissions: Record<string, boolean> | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isSuperAdmin: false,
  userPermissions: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean> | null>(null);

  const checkRole = async (userId: string) => {
    try {
      const withTimeout = <T,>(p: PromiseLike<T>, ms = 6000): Promise<T> =>
        Promise.race([
          Promise.resolve(p) as Promise<T>,
          new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
        ]);

      const [rolesRes, muRes] = await Promise.allSettled([
        withTimeout(supabase.from("user_roles").select("role").eq("user_id", userId)),
        withTimeout(
          supabase.from("managed_users").select("permissions, is_active").eq("user_id", userId).maybeSingle()
        ),
      ]);

      const roleData = rolesRes.status === "fulfilled" ? (rolesRes.value as any).data : null;
      const roles = (roleData || []).map((r: any) => r.role);
      setIsSuperAdmin(roles.includes("super_admin"));

      const mu = muRes.status === "fulfilled" ? (muRes.value as any).data : null;
      if (mu) {
        setUserPermissions(mu.permissions as Record<string, boolean>);
      } else {
        setUserPermissions(null);
      }
    } catch {
      // Never block the app if the backend is slow/unavailable
      setIsSuperAdmin(false);
      setUserPermissions(null);
    }
  };


  useEffect(() => {
    // Hard safety: never leave the app stuck on the loading screen
    const safety = setTimeout(() => setLoading(false), 4000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          setTimeout(() => checkRole(session.user.id), 0);
        } else {
          setIsSuperAdmin(false);
          setUserPermissions(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkRole(session.user.id);
      }
    }).catch(() => setLoading(false));

    return () => { clearTimeout(safety); subscription.unsubscribe(); };
  }, []);


  // Live-refresh permissions/roles when super admin updates them
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`auth-perms-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "managed_users", filter: `user_id=eq.${user.id}` }, () => {
        checkRole(user.id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${user.id}` }, () => {
        checkRole(user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isSuperAdmin, userPermissions, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
