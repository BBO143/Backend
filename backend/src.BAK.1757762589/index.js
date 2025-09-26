// Worker JS (routage public/privé + en-têtes sûrs) – garde SigV4 via s3-presign.js
// Variables attendues (wrangler.toml -> [vars]):
// - ORIGIN_BASE_PRIVATE = "https://s3.fr-par.scw.cloud/idf-maps-storage"
// - ORIGIN_BASE_PUBLIC  = "https://s3.fr-par.scw.cloud/idf-assets"
// - S3_REGION = "fr-par"
// - S3_ENDPOINT = "https://s3.fr-par.scw.cloud"
// - ROUTE_STYLE = "private" | "public"      (default: "private")
// - ROUTE_TILES = "private" | "public"      (default: "private")
// - ROUTE_FONTS = "private" | "public"      (default: "public")
//
// Secrets (wrangler secret put ...):
// - SCW_ACCESS_KEY_ID
// - SCW_SECRET_ACCESS_KEY

import { fetchS3Private } from "./s3-presign.js"; // ton fichier existant

const ONE_DAY = 86400;
const ONE_WEEK = 7 * ONE_DAY;
const ONE_YEAR = 31536000;

function setBinaryHeaders(h, cacheControl) {
  h.set("Content-Type", "application/x-protobuf");
  h.set("Cache-Control", `${cacheControl}, no-transform`);
  h.set("Vary", "Accept-Encoding");
  if (!h.has("Accept-Ranges")) h.set("Accept-Ranges", "bytes");
  const enc = h.get("Content-Encoding");
  if (enc && enc.toLowerCase() !== "gzip") {
    // on supprime toute annonce d'encodage autre que gzip
    h.delete("Content-Encoding");
    h.delete("Content-Length");
  }
}

function setJsonHeaders(h, cacheControl) {
  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Cache-Control", `${cacheControl}, no-transform`);
  h.set("Vary", "Accept-Encoding");
}

function wantsPrivate(env, kind) {
  const def = (kind === "fonts") ? "public" : "private";
  const route = (kind === "style") ? (env.ROUTE_STYLE || def)
              : (kind === "tiles") ? (env.ROUTE_TILES || def)
              : (kind === "fonts") ? (env.ROUTE_FONTS || def)
              : def;
  return route === "private";
}

function baseFor(env, isPrivate) {
  return isPrivate ? env.ORIGIN_BASE_PRIVATE : env.ORIGIN_BASE_PUBLIC;
}

function pathFromUrl(url) {
  // garde le pathname tel quel (/style.json, /tiles/..., /fonts/...)
  return url.pathname;
}

async function fetchPublic(originBase, path, req) {
  const fwd = new Headers();
  // Autoriser Range et validations
  for (const [k, v] of req.headers) {
    const lk = k.toLowerCase();
    if (lk === "range" || lk.startsWith("if-")) fwd.set(k, v);
  }
  // demander l’objet tel quel
  fwd.set("Accept-Encoding", "identity");

  return fetch(new URL(path, originBase), {
    method: "GET",
    headers: fwd,
    cf: {
      cacheEverything: true,
      cacheKey: req.url, // on laisse l’URL du worker comme clé (notre code nettoie côté tiles si besoin)
    },
  });
}

async function fetchPrivateSigV4(env, path, req) {
  // Utilise ta fonction existante de présignature/autorisation privée.
  // On propage Range/If-* et on impose Accept-Encoding: identity côté S3.
  const fwd = new Headers();
  for (const [k, v] of req.headers) {
    const lk = k.toLowerCase();
    if (lk === "range" || lk.startsWith("if-")) fwd.set(k, v);
  }
  fwd.set("Accept-Encoding", "identity");

  // fetchS3Private(originBase, path, env, extraRequestHeaders) -> Response
  // Ton s3-presign.js doit accepter base + path (ou reconstruire l'URL S3 path-style)
  return fetchS3Private(baseFor(env, true), path, env, fwd);
}

function normalizeBinaryResponse(originRes, cacheControl) {
  const h = new Headers(originRes.headers);
  setBinaryHeaders(h, cacheControl);
  h.set('Server-Timing', 'cf-no-br;desc="no brotli for protobuf"');
  return new Response(originRes.body, { status: originRes.status, statusText: originRes.statusText, headers: h });
}

function normalizeJsonResponse(originRes, cacheControl) {
  const h = new Headers(originRes.headers);
  setJsonHeaders(h, cacheControl);
  h.set('Server-Timing', 'cf-no-br;desc="no brotli for protobuf"');
  return new Response(originRes.body, { status: originRes.status, statusText: originRes.statusText, headers: h });
}

function matchKind(url) {
  const p = url.pathname;
  if (p === "/style.json") return "style";
  if (p.startsWith("/tiles/") && p.endsWith(".pbf")) return "tiles";
  if (p.startsWith("/fonts/") && p.endsWith(".pbf")) return "fonts";
  return "other";
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const kind = matchKind(url);
    if (kind === "other") return new Response("Not Found", { status: 404 });

    const isPrivate = wantsPrivate(env, kind);
    const originBase = baseFor(env, isPrivate);
    if (!originBase) {
      return new Response(`Misconfiguration: missing origin base for ${kind} (${isPrivate ? "private" : "public"})`, { status: 500 });
    }

    const path = pathFromUrl(url);

    if (kind === "style") {
      const upstream = isPrivate
        ? await fetchPrivateSigV4(env, path, req)
        : await fetchPublic(originBase, path, req);
      return normalizeJsonResponse(upstream, "public, max-age=300");
    }

    if (kind === "tiles") {
      const upstream = isPrivate
        ? await fetchPrivateSigV4(env, path, req)
        : await fetchPublic(originBase, path, req);
      return normalizeBinaryResponse(upstream, `public, max-age=${ONE_DAY}, stale-while-revalidate=${ONE_WEEK}`);
    }

    if (kind === "fonts") {
      const upstream = isPrivate
        ? await fetchPrivateSigV4(env, path, req)
        : await fetchPublic(originBase, path, req);
      return normalizeBinaryResponse(upstream, `public, max-age=${ONE_YEAR}, immutable`);
    }

    return new Response("Not Found", { status: 404 });
  },
};
