import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HIERARCHY_PRESETS: Record<string, Record<string, boolean>> = {
  admin: { crm: true, clients: true, import: true, imported: true, analytics: true, pages: true, forms: true, quiz: true, schedules: true, checkout: true, automation: true, chat: true, settings: false },
  manager: { crm: true, clients: true, import: true, imported: true, analytics: true, pages: false, forms: true, quiz: true, schedules: true, checkout: false, automation: true, chat: true, settings: false },
  attendant: { crm: false, clients: true, import: false, imported: false, analytics: false, pages: false, forms: false, quiz: false, schedules: true, checkout: false, automation: false, chat: true, settings: false },
};

function presetFor(hierarchy: string, custom?: Record<string, boolean>) {
  if (hierarchy === "custom" && custom) return custom;
  return HIERARCHY_PRESETS[hierarchy] || HIERARCHY_PRESETS.attendant;
}

function jres(status: number, body: any) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jres(401, { error: "Unauthorized" });

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return jres(401, { error: "Unauthorized" });
    const ownerId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const { action } = body;

    if (action === "list") {
      const { data } = await admin.from("team_members").select("*").eq("owner_user_id", ownerId).order("created_at", { ascending: false });
      return jres(200, { members: data || [] });
    }

    if (action === "create") {
      const { email, password, full_name, hierarchy, permissions } = body;
      if (!email || !password || password.length < 6) return jres(400, { error: "E-mail e senha (mín. 6) obrigatórios" });

      // Check seat limit based on owner's plan
      const { data: prof } = await admin.from("profiles").select("plan, team_seats").eq("user_id", ownerId).maybeSingle();
      const planLimits: Record<string, number> = { start: 0, pro: 5, enterprise: 20 };
      const seatLimit = Math.max(planLimits[(prof as any)?.plan || "start"] ?? 0, (prof as any)?.team_seats ?? 0);
      const { count } = await admin.from("team_members").select("*", { count: "exact", head: true }).eq("owner_user_id", ownerId);
      const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", ownerId).eq("role", "super_admin").maybeSingle();
      const isSuper = !!roleRow;
      if (!isSuper && (count ?? 0) >= seatLimit) return jres(400, { error: `Limite do plano: ${seatLimit} usuários` });

      // Create or attach auth user
      let memberUserId: string | null = null;
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || null, parent_owner_id: ownerId },
      });
      if (cErr) {
        // If already exists, try to find via list
        if (String(cErr.message).toLowerCase().includes("already")) {
          const { data: list } = await admin.auth.admin.listUsers();
          const found = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());
          if (!found) return jres(400, { error: cErr.message });
          memberUserId = found.id;
        } else {
          return jres(400, { error: cErr.message });
        }
      } else {
        memberUserId = created.user.id;
      }

      const perms = presetFor(hierarchy || "attendant", permissions);
      const { error: insErr } = await admin.from("team_members").insert({
        owner_user_id: ownerId,
        member_user_id: memberUserId,
        member_email: email.toLowerCase().trim(),
        full_name: full_name || null,
        role: hierarchy === "admin" ? "admin" : hierarchy === "manager" ? "manager" : "attendant",
        hierarchy: hierarchy || "attendant",
        permissions: perms,
        is_active: true,
        created_by: ownerId,
      });
      if (insErr) return jres(400, { error: insErr.message });
      return jres(200, { success: true, user_id: memberUserId });
    }

    if (action === "update") {
      const { id, hierarchy, permissions, is_active, full_name } = body;
      const { data: row } = await admin.from("team_members").select("*").eq("id", id).single();
      if (!row || row.owner_user_id !== ownerId) return jres(403, { error: "Forbidden" });
      const updates: any = {};
      if (hierarchy !== undefined) {
        updates.hierarchy = hierarchy;
        updates.role = hierarchy === "admin" ? "admin" : hierarchy === "manager" ? "manager" : "attendant";
        updates.permissions = presetFor(hierarchy, permissions);
      } else if (permissions !== undefined) {
        updates.permissions = permissions;
      }
      if (is_active !== undefined) updates.is_active = is_active;
      if (full_name !== undefined) updates.full_name = full_name;
      await admin.from("team_members").update(updates).eq("id", id);
      return jres(200, { success: true });
    }

    if (action === "set_password") {
      const { id, password } = body;
      if (!password || password.length < 6) return jres(400, { error: "Senha mínima 6 caracteres" });
      const { data: row } = await admin.from("team_members").select("*").eq("id", id).single();
      if (!row || row.owner_user_id !== ownerId) return jres(403, { error: "Forbidden" });
      if (!row.member_user_id) return jres(400, { error: "Usuário sem conta vinculada" });
      const { error } = await admin.auth.admin.updateUserById(row.member_user_id, { password });
      if (error) return jres(400, { error: error.message });
      return jres(200, { success: true });
    }

    if (action === "delete") {
      const { id, delete_auth } = body;
      const { data: row } = await admin.from("team_members").select("*").eq("id", id).single();
      if (!row || row.owner_user_id !== ownerId) return jres(403, { error: "Forbidden" });
      if (delete_auth && row.member_user_id) {
        try { await admin.auth.admin.deleteUser(row.member_user_id); } catch (_) { /* ignore */ }
      }
      await admin.from("team_members").delete().eq("id", id);
      return jres(200, { success: true });
    }

    if (action === "update_self") {
      const { full_name, password } = body;
      if (full_name !== undefined) {
        await admin.from("profiles").update({ full_name }).eq("user_id", ownerId);
        await admin.auth.admin.updateUserById(ownerId, { user_metadata: { full_name } });
      }
      if (password) {
        if (password.length < 6) return jres(400, { error: "Senha mínima 6 caracteres" });
        const { error } = await admin.auth.admin.updateUserById(ownerId, { password });
        if (error) return jres(400, { error: error.message });
      }
      return jres(200, { success: true });
    }

    return jres(400, { error: "Unknown action" });
  } catch (e) {
    return jres(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
