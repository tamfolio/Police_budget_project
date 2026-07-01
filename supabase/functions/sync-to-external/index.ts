import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import postgres from "npm:postgres@3.4.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTERNAL_DB_CA = `-----BEGIN CERTIFICATE-----
MIIEUDCCArigAwIBAgIUa6Xz/+zXPR9a5k77MdWSK0b/yW8wDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1NTM5YjdlNjAtOWI0MC00ODhmLWI3NjAtNTg5NWMwMzQ1
ZjNmIEdFTiAxIFByb2plY3QgQ0EwHhcNMjYwMTE5MTQyNTQ2WhcNMzYwMTE3MTQy
NTQ2WjBAMT4wPAYDVQQDDDU1MzliN2U2MC05YjQwLTQ4OGYtYjc2MC01ODk1YzAz
NDVmM2YgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBAOGzmMbdkE9QhrJ5qyI9bHeHMj7YUirQgEDe0/MRnxFGjavRPQ9GPNeT
6Rg4GQM/zve3n/ssyN6jgUW5ct91THaTEl3dFZYrEq6huO6bgHpdZNYYp33pbJN7
f5sVqtoOUQcROCazyR681hrvLIXiuThva8TlI1DW2jUSsN5S02MMyC4zme40IbI+
T7co1umIgH3afcqk1grajmfafPERXSOYctL+1WFtDZYBEe/tnVSv/nMls5xD4RWA
oZqkRHd4Gy/e/oCA+bFhH+TCMyjNRdn1IK7V04ISxxiZ4aR62BFU0ey8ye4reqy1
C7c3hPrpjJgkWA7q1OAn3+bncfXMKpRyT9YA90cGodgEcRo6YqyE2zvBd5mEFUpH
zXxstkT6LSYD3I/6ZgNR8RwRsesYLEQTF0X7p05le/FXXSoGn5Q9ptxa4zAeS9ek
NggHbKKvv0psYKm6L2TymdcGjmkZXkm0BFnyFoyiet9vjbbPkH3Cz6udPXYLeFeF
sIqL1sBLzwIDAQABo0IwQDAdBgNVHQ4EFgQUHP4wxyIVT6TfXA7ReNs3kBz2w2ow
EgYDVR0TAQH/BAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQAD
ggGBALibyUMwy5dpkb6lEBbL6RbRgWjbaN2+ANKtuoMwDznB0Vsv2KAyj5VNRWrT
fHSdcD7ytM5Gm6Y69gPWEW0VStkF+iM5UMx09Tt9Jzg5X6u7Mj4d5rH7peUhj1mY
MRh2WySeIp77yvlPD8m5ckVRB7MI1cxlbkPDm7nMZqKpw8q2roNHWKdLcF6G/tlM
FkiQmdM959MMgeqqr4R0/pFxQ8NX/FtrZmcAAH7UG559SN+XfHHHbvhHF9qluQyd
X0dUuT/heL704MUhcoHz0Ut61XauONB8UxeaqPW/5zPVH6YCwouGYrQkNIYO+KLo
MyG2YbVz8h+uS9Cv8WqKwFDZo/u2H27WzdZKeAdWV6UXP+Wck4aFAUSpScqH49NY
rQcX0zSoL31wJfVtSw7uslZ7iLEPuKndgHzmpnXbgSaRTTIGJMCqXn1C64tAmsha
wViDUmfWAXApd/pJXEjiY/uVMJSa+9uQL+3cEgTZuII6hXR1SUJ3S6Y64+f8bi/A
3+Nemg==
-----END CERTIFICATE-----`;

const TABLES = [
  "profiles", "user_roles", "fiscal_years", "budget_categories", "budget_sub_items",
  "formations", "fund_inflows", "aie_records", "aie_lines",
  "distribution_batches", "distribution_lines", "expenditures", "proposals",
  "carry_over_periods", "carry_over_lines", "approval_actions", "approval_delegations",
  "txn_comments", "notifications", "documents", "audit_log", "export_audit_log",
  "app_settings",
];

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Map Postgres udt_name to a portable SQL type for the mirror table.
function mapType(udt: string, dataType: string): string {
  if (dataType === "ARRAY") {
    // udt for arrays is like "_text", "_int4"; strip leading underscore
    const base = udt.startsWith("_") ? udt.slice(1) : udt;
    return `${mapType(base, "")}[]`;
  }
  if (dataType === "USER-DEFINED") return "text"; // flatten enums
  switch (udt) {
    case "uuid": return "uuid";
    case "text": case "varchar": case "bpchar": case "citext": return "text";
    case "int2": return "smallint";
    case "int4": return "integer";
    case "int8": return "bigint";
    case "float4": return "real";
    case "float8": return "double precision";
    case "numeric": return "numeric";
    case "bool": return "boolean";
    case "json": return "json";
    case "jsonb": return "jsonb";
    case "date": return "date";
    case "time": return "time";
    case "timestamp": return "timestamp";
    case "timestamptz": return "timestamptz";
    case "bytea": return "bytea";
    default: return "text";
  }
}

function quoteIdent(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

async function runSync(opts: {
  externalUrl: string;
  supabaseUrl: string;
  serviceKey: string;
  sourceDbUrl: string;
  actor: string;
}) {
  const { externalUrl, supabaseUrl, serviceKey, sourceDbUrl, actor } = opts;
  const admin = createClient(supabaseUrl, serviceKey);
  const startedAt = new Date().toISOString();
  const results: Record<string, { rows: number; error?: string }> = {};

  const writeStatus = async (extra: Record<string, unknown>) => {
    await admin.from("app_settings").upsert({
      key: "external_sync_status",
      value: { started_at: startedAt, actor, ...extra },
      updated_at: new Date().toISOString(),
    } as any);
  };

  await writeStatus({ state: "running", tables_done: 0, tables_total: TABLES.length, results });

  let sql: ReturnType<typeof postgres> | null = null;
  let src: ReturnType<typeof postgres> | null = null;
  try {
    sql = postgres(externalUrl, {
      ssl: { ca: EXTERNAL_DB_CA, rejectUnauthorized: false },
      max: 1,
      idle_timeout: 20,
      connect_timeout: 30,
    });
    src = postgres(sourceDbUrl, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 30,
    });
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS lovable_mirror;`);
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS lovable_mirror._sync_runs (
        id bigserial PRIMARY KEY,
        started_at timestamptz NOT NULL,
        finished_at timestamptz,
        actor uuid,
        summary jsonb
      );
    `);

    for (let ti = 0; ti < TABLES.length; ti++) {
      const t = TABLES[ti];
      try {
        // 1) Introspect column definitions from the source database.
        const cols = await src.unsafe<Array<{ column_name: string; data_type: string; udt_name: string; is_nullable: string }>>(
          `SELECT column_name, data_type, udt_name, is_nullable
             FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position`,
          [t],
        );
        if (!cols.length) {
          results[t] = { rows: 0, error: "table not found in source" };
          await writeStatus({ state: "running", tables_done: ti + 1, tables_total: TABLES.length, results });
          continue;
        }
        const colDefs = cols.map((c) => {
          const type = mapType(c.udt_name, c.data_type);
          return `${quoteIdent(c.column_name)} ${type}`;
        }).join(", ");
        const colList = cols.map((c) => quoteIdent(c.column_name)).join(", ");
        const colTypes = cols.map((c) => mapType(c.udt_name, c.data_type));
        const qIdent = `lovable_mirror.${quoteIdent(t)}`;

        // 2) Recreate the mirror table with the real schema (drop & recreate to
        //    pick up any column changes on the source).
        await sql.unsafe(`DROP TABLE IF EXISTS ${qIdent} CASCADE;`);
        await sql.unsafe(`CREATE TABLE ${qIdent} (${colDefs});`);

        // 3) Page rows from the source and copy them into the mirror.
        let offset = 0;
        const PAGE = 1000;
        let total = 0;
        await sql.unsafe("BEGIN");
        while (true) {
          const rows = await src.unsafe<any[]>(
            `SELECT ${colList} FROM public.${quoteIdent(t)} OFFSET $1 LIMIT $2`,
            [offset, PAGE],
          );
          if (!rows.length) break;
          // Build batched INSERT with explicit casts so postgres correctly
          // parses uuid / jsonb / arrays from text parameters.
          for (let i = 0; i < rows.length; i += 200) {
            const chunk = rows.slice(i, i + 200);
            const params: any[] = [];
            const values: string[] = [];
            chunk.forEach((row, ri) => {
              const ph = cols.map((c, ci) => {
                const idx = ri * cols.length + ci + 1;
                return `$${idx}::${colTypes[ci]}`;
              });
              values.push(`(${ph.join(", ")})`);
              cols.forEach((c) => {
                const v = (row as any)[c.column_name];
                if (v === null || v === undefined) {
                  params.push(null);
                } else if (c.udt_name === "jsonb" || c.udt_name === "json") {
                  params.push(typeof v === "string" ? v : JSON.stringify(v));
                } else if (v instanceof Date) {
                  params.push(v.toISOString());
                } else if (Array.isArray(v)) {
                  params.push(v);
                } else if (typeof v === "object") {
                  params.push(JSON.stringify(v));
                } else {
                  params.push(v);
                }
              });
            });
            await sql.unsafe(
              `INSERT INTO ${qIdent} (${colList}) VALUES ${values.join(", ")};`,
              params,
            );
          }
          total += rows.length;
          if (rows.length < PAGE) break;
          offset += PAGE;
        }
        await sql.unsafe("COMMIT");
        results[t] = { rows: total };
      } catch (e: any) {
        try { await sql!.unsafe("ROLLBACK"); } catch { /* ignore */ }
        results[t] = { rows: 0, error: e.message ?? String(e) };
      }
      await writeStatus({ state: "running", tables_done: ti + 1, tables_total: TABLES.length, results });
    }

    const finishedAt = new Date().toISOString();
    await sql.unsafe(
      `INSERT INTO lovable_mirror._sync_runs(started_at, finished_at, actor, summary) VALUES ($1, $2, $3, $4::jsonb);`,
      [startedAt, finishedAt, actor, JSON.stringify(results)]
    );
    const totalRows = Object.values(results).reduce((s, r) => s + r.rows, 0);
    const errors = Object.entries(results).filter(([, r]) => r.error).map(([t, r]) => ({ table: t, error: r.error }));
    await writeStatus({
      state: "done", finished_at: finishedAt, tables_done: TABLES.length, tables_total: TABLES.length,
      total_rows: totalRows, errors, results,
    });
  } catch (e) {
    await writeStatus({ state: "error", error: (e as Error).message, results });
  } finally {
    try { await sql?.end({ timeout: 5 }); } catch { /* ignore */ }
    try { await src?.end({ timeout: 5 }); } catch { /* ignore */ }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const EXTERNAL_DB_URL = Deno.env.get("EXTERNAL_DB_URL");
    const SOURCE_DB_URL = Deno.env.get("SUPABASE_DB_URL");
    if (!EXTERNAL_DB_URL) return json({ error: "EXTERNAL_DB_URL not configured" }, 500);
    if (!SOURCE_DB_URL) return json({ error: "SUPABASE_DB_URL not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing auth" }, 401);
    const caller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await caller.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: roleRow } = await caller.from("user_roles").select("id")
      .eq("user_id", u.user.id).eq("role", "SYSADMIN").not("confirmed_at", "is", null).limit(1).maybeSingle();
    if (!roleRow) return json({ error: "SYSADMIN required" }, 403);

    // Run the heavy sync as a background task to avoid CPU/wall-clock limits.
    // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(runSync({
      externalUrl: EXTERNAL_DB_URL,
      supabaseUrl: SUPABASE_URL,
      serviceKey: SERVICE_KEY,
      sourceDbUrl: SOURCE_DB_URL,
      actor: u.user.id,
    }));
    return json({ ok: true, started: true, message: "Sync started in background. Status will appear shortly." });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});