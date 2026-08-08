// useTrafficAnalytics — agregações de atribuição/ROAS por origem e campanha
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SourceRow { source: string; leads: number; sales: number; revenue: number; spend: number; roas: number | null; }
export interface CampaignRow { campaign: string; leads: number; sales: number; revenue: number; }
export interface CapiHealth { total: number; sent: number; failed: number; successRate: number; lastError: string | null; }

interface LeadRow {
  id: string; value: number | null; stage_id: string | null;
  utm_source: string | null; utm_campaign: string | null; created_at: string;
}

const WON_PATTERNS = ["fechado", "convertido", "venda", "ganho", "won", "closed", "purchase"];

export const useTrafficAnalytics = (days = 30) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [health, setHealth] = useState<CapiHealth>({ total: 0, sent: 0, failed: 0, successRate: 0, lastError: null });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [leadsRes, stagesRes, logsRes, spendRes] = await Promise.all([
      supabase.from("leads").select("id,value,stage_id,utm_source,utm_campaign,created_at").eq("user_id", user.id).gte("created_at", since).limit(20000),
      supabase.from("pipeline_stages").select("id,name,capi_event_name,capi_event_active").eq("user_id", user.id),
      supabase.from("meta_event_log").select("status,error,created_at").eq("user_id", user.id).gte("created_at", since).limit(5000),
      supabase.from("ad_campaign_spend").select("campaign_name,spend,date").eq("user_id", user.id).gte("date", since.slice(0, 10)).limit(5000),
    ]);

    const stages = (stagesRes.data || []) as any[];
    const saleStageIds = new Set(
      stages
        .filter((s) => (s.capi_event_name === "Purchase" || s.capi_event_name === "Subscribe") || WON_PATTERNS.some((p) => String(s.name || "").toLowerCase().includes(p)))
        .map((s) => s.id),
    );

    const leads = ((leadsRes.data || []) as LeadRow[]);
    const spendByCampaign: Record<string, number> = {};
    ((spendRes.data || []) as any[]).forEach((r) => {
      const k = String(r.campaign_name || "(sem campanha)");
      spendByCampaign[k] = (spendByCampaign[k] || 0) + Number(r.spend || 0);
    });

    const srcMap: Record<string, SourceRow> = {};
    const cmpMap: Record<string, CampaignRow & { spendKeys: Set<string> }> = {};

    leads.forEach((l) => {
      const src = l.utm_source || "(direto)";
      const cmp = l.utm_campaign || "(sem campanha)";
      const isSale = !!(l.stage_id && saleStageIds.has(l.stage_id));
      const val = Number(l.value || 0);

      srcMap[src] = srcMap[src] || { source: src, leads: 0, sales: 0, revenue: 0, spend: 0, roas: null };
      srcMap[src].leads += 1;
      if (isSale) { srcMap[src].sales += 1; srcMap[src].revenue += val; }

      cmpMap[cmp] = cmpMap[cmp] || { campaign: cmp, leads: 0, sales: 0, revenue: 0, spendKeys: new Set<string>() };
      cmpMap[cmp].leads += 1;
      cmpMap[cmp].spendKeys.add(src);
      if (isSale) { cmpMap[cmp].sales += 1; cmpMap[cmp].revenue += val; }
    });

    // Distribui o investimento das campanhas entre as origens correspondentes
    Object.entries(cmpMap).forEach(([cmp, row]) => {
      const spend = spendByCampaign[cmp] || 0;
      if (!spend) return;
      const keys = Array.from(row.spendKeys);
      const share = spend / (keys.length || 1);
      keys.forEach((k) => { if (srcMap[k]) srcMap[k].spend += share; });
    });

    const sourceRows = Object.values(srcMap)
      .map((r) => ({ ...r, roas: r.spend > 0 ? r.revenue / r.spend : null }))
      .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);

    const campaignRows: CampaignRow[] = Object.values(cmpMap)
      .map(({ campaign, leads: l, sales, revenue }) => ({ campaign, leads: l, sales, revenue }))
      .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads)
      .slice(0, 5);

    const logs = (logsRes.data || []) as any[];
    const sent = logs.filter((l) => l.status === "sent").length;
    const failed = logs.filter((l) => l.status === "failed").length;
    const lastError = logs.filter((l) => l.status === "failed").sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]?.error || null;

    setSources(sourceRows);
    setCampaigns(campaignRows);
    setHealth({ total: logs.length, sent, failed, successRate: logs.length ? Math.round((sent / logs.length) * 100) : 0, lastError });
    setLoading(false);
  }, [user, days]);

  useEffect(() => { load(); }, [load]);

  return { loading, sources, campaigns, health, reload: load };
};

export default useTrafficAnalytics;
