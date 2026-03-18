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
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (roleData || []).map((r: any) => r.role);
    setIsSuperAdmin(roles.includes("super_admin"));

    // Check managed_users for permissions
    const { data: mu } = await supabase
      .from("managed_users")
      .select("permissions, is_active")
      .eq("user_id", userId)
      .single();

    if (mu) {
      setUserPermissions(mu.permissions as Record<string, boolean>);
    } else if (roles.includes("super_admin")) {
      setUserPermissions(null); // null = full access
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isSuperAdmin, userPermissions, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
