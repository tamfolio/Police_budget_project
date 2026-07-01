// Server-side proxy to api.pabdigitalsystem.com.
// The upstream API does not currently return CORS headers, so calling it
// directly from the browser fails with "Failed to fetch". This function
// forwards the request server-to-server and adds the CORS headers the
// browser needs.

const UPSTREAM = "https://api.pabdigitalsystem.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Path after the function name: /functions/v1/pab-proxy/<rest>
  const url = new URL(req.url);
  const marker = "/pab-proxy";
  const idx = url.pathname.indexOf(marker);
  const rest = idx >= 0 ? url.pathname.slice(idx + marker.length) : "";
  const upstreamUrl = `${UPSTREAM}${rest}${url.search}`;

  // Forward selected headers only. Drop hop-by-hop and Supabase-specific ones.
  const fwdHeaders = new Headers();
  const incomingAuth = req.headers.get("authorization");
  if (incomingAuth) fwdHeaders.set("authorization", incomingAuth);
  const ct = req.headers.get("content-type");
  if (ct) fwdHeaders.set("content-type", ct);
  fwdHeaders.set("accept", req.headers.get("accept") ?? "application/json");

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: fwdHeaders,
      body,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "UPSTREAM_UNREACHABLE", message: (e as Error).message } }),
      { status: 502, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }

  // Pass body and status through, but use OUR CORS headers (upstream sends none).
  const responseHeaders = new Headers(corsHeaders);
  const upstreamCT = upstreamRes.headers.get("content-type");
  if (upstreamCT) responseHeaders.set("content-type", upstreamCT);

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  });
});