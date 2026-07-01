import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Caller-scoped client to verify identity & SYSADMIN role through RLS / has_role
    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerId = userData.user.id;

    // Verify caller is a confirmed SYSADMIN
    const { data: roleRow } = await caller
      .from("user_roles")
      .select("id")
      .eq("user_id", callerId)
      .eq("role", "SYSADMIN")
      .not("confirmed_at", "is", null)
      .limit(1)
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "SYSADMIN role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const targetId: string | undefined = body?.user_id;
    if (!targetId || typeof targetId !== "string") {
      return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (targetId === callerId) {
      return new Response(JSON.stringify({ error: "You cannot delete your own account." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Clean up app-side rows first (profiles + roles), then auth user.
    await admin.from("user_roles").delete().eq("user_id", targetId);
    await admin.from("profiles").delete().eq("user_id", targetId);

    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Audit
    await admin.from("audit_log").insert({
      actor: callerId,
      table_name: "auth.users",
      row_id: targetId,
      action: "DELETE",
      diff: { deleted_user_id: targetId, by: callerId },
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});