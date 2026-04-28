import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlanId = "start" | "pro" | "enterprise";

export const PLAN_DEFINITIONS: Record<PlanId, {
  label: string;
  price: number;
  credits: number;
  seats: number;
  modules: Record<string, boolean>;
}> = {
  start: {
    label: "Start", price: 197, credits: 50, seats: 0,
    modules: {
      crm: true, clients: true, import: true, imported: true, analytics: true,
      pages: false, forms: true, quiz: false, schedules: false, checkout: false,
      automation: false, chat: false, settings: true, admin: false,
    },
  },
  pro: {
    label: "Pro", price: 397, credits: 100, seats: 5,
    modules: {
      crm: true, clients: true, import: true, imported: true, analytics: true,
      pages: true, forms: true, quiz: true, schedules: false, checkout: true,
      automation: false, chat: false, settings: true, admin: false,
    },
  },
  enterprise: {
    label: "Enterprise", price: 497, credits: 200, seats: 20,
    modules: {
      crm: true, clients: true, import: true, imported: true, analytics: true,
      pages: true, forms: true, quiz: true, schedules: true, checkout: true,
      automation: true, chat: true, settings: true, admin: false,
    },
  },
};

export interface UserPlanInfo {
  plan: PlanId;
  fullName: string;
  creditsBalance: number;
  creditsMonthly: number;
  loading: boolean;
  hasModule: (id: string) => boolean;
}

export function useUserPlan(): UserPlanInfo {
  const { user, isSuperAdmin } = useAuth();
  const [plan, setPlan] = useState<PlanId>("start");
  const [fullName, setFullName] = useState<string>("");
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [creditsMonthly, setCreditsMonthly] = useState(50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, full_name, credits_balance, credits_monthly")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mounted) return;
      if (data) {
        const p = ((data as any).plan || "start") as PlanId;
        setPlan(PLAN_DEFINITIONS[p] ? p : "start");
        setFullName((data as any).full_name || "");
        setCreditsBalance((data as any).credits_balance ?? 0);
        setCreditsMonthly((data as any).credits_monthly ?? PLAN_DEFINITIONS[p]?.credits ?? 50);
      }
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("plan-watch-" + user.id)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user]);

  const hasModule = (id: string) => {
    if (isSuperAdmin) return true;
    if (id === "admin") return false;
    return PLAN_DEFINITIONS[plan]?.modules?.[id] !== false;
  };

  return { plan, fullName, creditsBalance, creditsMonthly, loading, hasModule };
}
