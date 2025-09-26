/* Cloudflare Worker - Tiles + style/sprite/glyphs proxy with HMAC signing */

function addCors(resp) {
  const h = new Headers(resp.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(resp.body, { status: resp.status, headers: h });
}

function b64url(ab) {
  let s = btoa(String.fromCharCode(...new Uint8Array(ab)));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/,"");
}

async function hmacSign(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url(sig);
}

async function hmacVerify(secret, data, sigB64url) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  let s = sigB64url.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const raw = Uint8Array.from(atob(s), c => c.charCodeAt(0));
  return await crypto.subtle.verify("HMAC", key, raw, new TextEncoder().encode(data));
}

function jsonResponse(obj, extraHeaders={}) {
  return addCors(new Response(JSON.stringify(obj), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60",
      ...extraHeaders
    }
  }));
}

async function proxyFromBucket(url, cacheSeconds=31536000, contentTypeOverride) {
  const resp = await fetch(url, { cf: { cacheTtl: cacheSeconds, cacheEverything: true } });
  if (!resp.ok) return addCors(new Response("Not found", { status: 404 }));
  const hdrs = new Headers(resp.headers);
  hdrs.set("Access-Control-Allow-Origin", "*");
  hdrs.set("Cache-Control", `public, max-age=${cacheSeconds}, immutable`);
  if (contentTypeOverride) hdrs.set("Content-Type", contentTypeOverride);
  return new Response(resp.body, { status: 200, headers: hdrs });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    if (request.method === "OPTIONS") {
      return addCors(new Response(null, { status: 204 }));
    }

    // STYLE
    if (pathname === "/style.json") {
      const origin = env.STYLE_ORIGIN || (env.BUCKET_BASE + "/style.json");
      const styleResp = await fetch(origin);
      if (!styleResp.ok) return addCors(new Response("style.json not found", { status: 502 }));

      let style = await styleResp.json();
      if (env.SPRITE_URL) style.sprite = env.SPRITE_URL;
      if (env.GLYPHS_URL) style.glyphs = env.GLYPHS_URL;

      const tilesArr = style?.sources?.openmaptiles?.tiles;
      if (Array.isArray(tilesArr) && tilesArr.length > 0) {
        const t0 = tilesArr[0];
        if (!/\b(exp|sig)=/.test(t0)) {
          const exp = Math.floor(Date.now()/1000) + 3600;
          const path = `/tiles/{z}/{x}/{y}.pbf`;
          const qs = `exp=${exp}`;
          const sig = await hmacSign(env.TILES_HMAC_SECRET, qs);
          style.sources.openmaptiles.tiles = [`${url.origin}${path}?${qs}&sig=${sig}`];
        }
      }
      return jsonResponse(style);
    }

    // SPRITES
    if (pathname === "/sprite.json") return proxyFromBucket(`${env.BUCKET_BASE}/sprite.json`, 31536000, "application/json");
    if (pathname === "/sprite@2x.json") return proxyFromBucket(`${env.BUCKET_BASE}/sprite@2x.json`, 31536000, "application/json");
    if (pathname === "/sprite.png") return proxyFromBucket(`${env.BUCKET_BASE}/sprite.png`, 31536000, "image/png");
    if (pathname === "/sprite@2x.png") return proxyFromBucket(`${env.BUCKET_BASE}/sprite@2x.png`, 31536000, "image/png");

    // GLYPHS
    if (pathname.startsWith("/fonts/")) {
      const rest = pathname.replace(/^\/fonts\//, "");
      return proxyFromBucket(`${env.BUCKET_BASE}/fonts/${rest}`, 31536000, "application/x-protobuf");
    }

    // TILES
    if (pathname.startsWith("/tiles/") && pathname.endsWith(".pbf")) {
      const m = pathname.match(/^\/tiles\/(\d+)\/(\d+)\/(\d+)\.pbf$/);
      if (!m) return addCors(new Response("bad tile path", { status: 400 }));
      const exp = Number(searchParams.get("exp") || 0);
      const sig = searchParams.get("sig") || "";
      if (!exp || !sig) return addCors(new Response("missing exp/sig", { status: 403 }));
      if (Math.floor(Date.now()/1000) > exp) return addCors(new Response("URL expired", { status: 403 }));

      const ok = await hmacVerify(env.TILES_HMAC_SECRET, `exp=${exp}`, sig);
      if (!ok) return addCors(new Response("invalid sig", { status: 403 }));

      const originUrl = `${env.BUCKET_BASE}/${m[1]}/${m[2]}/${m[3]}.pbf`;
      const resp = await fetch(originUrl, { cf: { cacheTtl: 31536000, cacheEverything: true } });
      if (!resp.ok) return addCors(new Response("tile not found", { status: 404 }));

      const hdrs = new Headers(resp.headers);
      hdrs.set("Access-Control-Allow-Origin", "*");
      hdrs.set("Content-Type", "application/x-protobuf");
      hdrs.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(resp.body, { status: 200, headers: hdrs });
    }

    return addCors(new Response("Not found", { status: 404 }));
  }
};
