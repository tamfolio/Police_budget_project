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
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing auth" }, 401);

    const caller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await caller.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: roleRow } = await caller.from("user_roles").select("id").eq("user_id", u.user.id).eq("role", "SYSADMIN").not("confirmed_at", "is", null).limit(1).maybeSingle();
    if (!roleRow) return json({ error: "SYSADMIN required" }, 403);

    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body?.email;
    const redirectTo: string | undefined = body?.redirect_to;
    if (!email) return json({ error: "email required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { error } = await admin.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) return json({ error: error.message }, 500);

    await admin.from("audit_log").insert({
      actor: u.user.id, table_name: "auth.users", row_id: email, action: "RESET_PASSWORD",
      diff: { email, by: u.user.id },
    });
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
  function json(b: unknown, status = 200) {
    return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});