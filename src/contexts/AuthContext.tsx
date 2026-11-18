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

  const checkRole = async (userId: string, attempt = 0): Promise<void> => {
    const { data: roleData, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    // Falha temporária (ex.: sessão renovando): tenta de novo sem rebaixar o acesso.
    if (roleErr) {
      setTimeout(() => checkRole(userId, attempt + 1), Math.min(10000, 1000 * (attempt + 1)));
      return;
    }

    const roles = (roleData || []).map((r: any) => r.role);
    // Logo após entrar, a consulta pode voltar vazia antes da sessão "assentar": confere de novo.
    if (roles.length === 0 && attempt < 2) setTimeout(() => checkRole(userId, attempt + 1), 1500);
    setIsSuperAdmin(roles.includes("super_admin"));

    // Check managed_users for permissions
    const { data: mu } = await supabase
      .from("managed_users")
      .select("permissions, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (mu) {
      setUserPermissions(mu.permissions as Record<string, boolean>);
    } else if (roles.includes("super_admin")) {
      setUserPermissions(null); // null = full access
    } else {
      setUserPermissions(null); // no managed record = no overrides; rely on plan defaults
    }
  };

  useEffect(() => {
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

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        // Sessão antiga/corrompida (ex: refresh_token_already_used): limpa só neste navegador.
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        session = null;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
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
