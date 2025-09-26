export interface Env {
  ORIGIN_BASE: string; // ex: "https://s3.fr-par.scw.cloud/your-bucket"
}

const ONE_DAY = 86400;
const ONE_WEEK = 7 * ONE_DAY;
const ONE_YEAR = 31536000;

function buildCacheKey(url: URL): string {
  const u = new URL(url.toString());
  if (u.pathname.startsWith("/tiles/") || u.pathname.startsWith("/fonts/")) {
    u.searchParams.delete("exp");
    u.searchParams.delete("sig");
  }
  return u.origin + u.pathname + (u.search ? "?" + u.searchParams.toString() : "");
}

function setBinaryHeaders(h: Headers, cacheControl: string) {
  h.set("Content-Type", "application/x-protobuf");
  h.set("Cache-Control", `${cacheControl}, no-transform`);
  h.set("Vary", "Accept-Encoding");
  if (!h.has("Accept-Ranges")) h.set("Accept-Ranges", "bytes");
  const enc = h.get("Content-Encoding");
  if (enc) {
    if (enc.toLowerCase() !== "gzip") {
      h.delete("Content-Encoding");
      h.delete("Content-Length");
    }
  }
}

function setJsonHeaders(h: Headers, cacheControl: string) {
  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Cache-Control", `${cacheControl}, no-transform`);
  h.set("Vary", "Accept-Encoding");
}

async function proxyOrigin(req: Request, env: Env, originPath: string, opts: {
  cacheTtl?: number,
  cacheControl?: string,
  binary?: boolean
}) {
  const url = new URL(req.url);
  const originUrl = new URL(originPath, env.ORIGIN_BASE);

  const fwdHeaders = new Headers();
  for (const [k, v] of req.headers) {
    const lk = k.toLowerCase();
    if (lk === "range" || lk.startsWith("if-")) {
      fwdHeaders.set(k, v);
    }
  }
  // Demande à l'origin l'objet tel quel (pas de recompression opportuniste)
  fwdHeaders.set("Accept-Encoding", "identity");

  const originRes = await fetch(originUrl.toString(), {
    method: "GET",
    headers: fwdHeaders,
    cf: {
      cacheEverything: true,
      cacheTtl: opts.cacheTtl ?? 300,
      cacheKey: buildCacheKey(url),
    },
  });

  const headers = new Headers(originRes.headers);
  if (opts.binary) {
    setBinaryHeaders(headers, opts.cacheControl ?? "public, max-age=86400, stale-while-revalidate=604800");
  } else {
    setJsonHeaders(headers, opts.cacheControl ?? "public, max-age=300");
  }
  headers.set("Server-Timing", "cf-no-br;desc=\"no brotli for protobuf\"");

  return new Response(originRes.body, {
    status: originRes.status,
    statusText: originRes.statusText,
    headers,
  });
}

function matchRoute(url: URL) {
  const p = url.pathname;
  if (p === "/style.json") return { kind: "style" as const };
  if (p.startsWith("/tiles/") && p.endsWith(".pbf")) return { kind: "tile" as const };
  if (p.startsWith("/fonts/") && p.endsWith(".pbf")) return { kind: "glyph" as const };
  return { kind: "other" as const };
}

export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);
    const route = matchRoute(url);

    if (route.kind === "style") {
      return proxyOrigin(req, env, "/style.json", {
        cacheTtl: 300,
        cacheControl: "public, max-age=300",
        binary: false,
      });
    }

    if (route.kind === "tile") {
      return proxyOrigin(req, env, url.pathname, {
        cacheTtl: ONE_DAY,
        cacheControl: `public, max-age=${ONE_DAY}, stale-while-revalidate=${ONE_WEEK}`,
        binary: true,
      });
    }

    if (route.kind === "glyph") {
      return proxyOrigin(req, env, url.pathname, {
        cacheTtl: ONE_YEAR,
        cacheControl: `public, max-age=${ONE_YEAR}, immutable`,
        binary: true,
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
