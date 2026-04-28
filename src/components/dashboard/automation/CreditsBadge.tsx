import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Coins, Zap, Plus, Infinity as InfinityIcon } from "lucide-react";
import RequestCreditsModal from "../RequestCreditsModal";

const PLAN_INFO: Record<string, { label: string; credits: number; seats: number; color: string }> = {
  start: { label: "Start", credits: 50, seats: 1, color: "bg-secondary text-secondary-foreground" },
  pro: { label: "Pro", credits: 1000, seats: 5, color: "bg-primary/20 text-primary border-primary/30" },
  enterprise: { label: "Enterprise", credits: 10000, seats: 20, color: "bg-amber-500/20 text-amber-500 border-amber-500/30" },
};

export default function CreditsBadge() {
  const { user, isSuperAdmin } = useAuth();
  const [profile, setProfile] = useState<{ plan: string; credits_balance: number; credits_used: number } | null>(null);
  const [tier, setTier] = useState<string>("basic");
  const [showReq, setShowReq] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, credits_balance, credits_used")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile(data as any);
      const { data: mu } = await supabase.from("managed_users").select("tier").eq("user_id", user.id).maybeSingle();
      if (mu) setTier((mu as any).tier || "basic");
    };
    load();
    const ch = supabase
      .channel("credits-watch")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!profile) return null;
  const isUnlimited = isSuperAdmin || tier === "unlimited";
  const info = PLAN_INFO[profile.plan] || PLAN_INFO.start;
  const total = info.credits;
  const used = profile.credits_used || 0;
  const pct = Math.min(100, Math.round((used / total) * 100));

  return (
    <>
      <Card className="p-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <Badge className={info.color + " text-[10px]"} variant="outline">Plano {info.label}</Badge>
        </div>
        {isUnlimited ? (
          <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary">
            <InfinityIcon className="h-3 w-3" /> Créditos ilimitados
          </Badge>
        ) : (
          <div className="flex-1 min-w-[140px]">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Coins className="h-3 w-3" /> Créditos
              </span>
              <span className="font-mono">{profile.credits_balance} / {total}</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        )}
        {!isUnlimited && (
          <Button size="icon" variant="outline" className="h-7 w-7" title="Solicitar mais créditos" onClick={() => setShowReq(true)}>
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </Card>
      <RequestCreditsModal open={showReq} onOpenChange={setShowReq} />
    </>
  );
}
