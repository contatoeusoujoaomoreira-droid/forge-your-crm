import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate JWT using anon client + getClaims
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub as string;

    // Use admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check super_admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .single();

    if (!roleData) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { action } = body;

    if (action === "create_user") {
      const { email, password, full_name, permissions, ai_credits } = body;
      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      await supabaseAdmin.from("user_roles").insert({ user_id: newUser.user.id, role: "user" });
      await supabaseAdmin.from("managed_users").insert({
        email, full_name, user_id: newUser.user.id,
        permissions: permissions || { crm: true, clients: true, import: true, analytics: true, pages: true, forms: true, quiz: true, schedules: true, checkout: true, automation: true, chat: true },
        ai_credits: ai_credits || 100,
        created_by: userId,
      });

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list_users") {
      const { data } = await supabaseAdmin.from("managed_users").select("*").order("created_at", { ascending: false });
      return new Response(JSON.stringify({ users: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_user") {
      const { managed_user_id, is_active, permissions, ai_credits, full_name, plan, tier, credits_balance, credits_monthly } = body;
      const updates: any = {};
      if (is_active !== undefined) updates.is_active = is_active;
      if (permissions !== undefined) updates.permissions = permissions;
      if (ai_credits !== undefined) updates.ai_credits = ai_credits;
      if (full_name !== undefined) updates.full_name = full_name;
      if (plan !== undefined) updates.plan = plan;
      if (tier !== undefined) updates.tier = tier;
      if (credits_balance !== undefined) updates.credits_balance = credits_balance;
      if (credits_monthly !== undefined) updates.credits_monthly = credits_monthly;
      const { data: mu } = await supabaseAdmin.from("managed_users").update(updates).eq("id", managed_user_id).select().single();

      // Sync to user_roles + profiles when we have a linked auth user
      if (mu?.user_id) {
        if (tier !== undefined) {
          // Reset roles to a single canonical one based on tier
          const roleMap: Record<string, string> = { super_admin: "super_admin", professional: "user", basic: "user" };
          const newRole = roleMap[tier] || "user";
          await supabaseAdmin.from("user_roles").delete().eq("user_id", mu.user_id);
          await supabaseAdmin.from("user_roles").insert({ user_id: mu.user_id, role: newRole });
        }
        const profileUpdates: any = {};
        if (plan !== undefined) profileUpdates.plan = plan;
        if (credits_balance !== undefined) profileUpdates.credits_balance = credits_balance;
        if (credits_monthly !== undefined) profileUpdates.credits_monthly = credits_monthly;
        if (Object.keys(profileUpdates).length) {
          await supabaseAdmin.from("profiles").update(profileUpdates).eq("user_id", mu.user_id);
        }
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_user") {
      const { managed_user_id } = body;
      const { data: mu } = await supabaseAdmin.from("managed_users").select("user_id").eq("id", managed_user_id).single();
      if (mu?.user_id) {
        await supabaseAdmin.auth.admin.deleteUser(mu.user_id);
      }
      await supabaseAdmin.from("managed_users").delete().eq("id", managed_user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reset_password") {
      const { managed_user_id, new_password } = body;
      const { data: mu } = await supabaseAdmin.from("managed_users").select("user_id").eq("id", managed_user_id).single();
      if (mu?.user_id) {
        await supabaseAdmin.auth.admin.updateUserById(mu.user_id, { password: new_password });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
