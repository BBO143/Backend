import { fetchS3Private } from "./s3-presign.js";

const ONE_DAY = 86400;
const ONE_WEEK = 7 * ONE_DAY;
const ONE_YEAR = 31536000;

function setBinaryHeaders(h, cacheControl) {
  h.set("Content-Type", "application/x-protobuf");
  h.set("Cache-Control", `${cacheControl}, no-transform`);
  h.set("Vary", "Accept-Encoding");
  h.set("Access-Control-Allow-Origin", "*");  if (!h.has("Accept-Ranges")) h.set("Accept-Ranges", "bytes");
  const enc = h.get("Content-Encoding");
  if (enc && enc.toLowerCase() !== "gzip") {
    h.delete("Content-Encoding");
    h.delete("Content-Length");
  }
}
function setJsonHeaders(h, cacheControl) {
  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Cache-Control", `${cacheControl}, no-transform`);
  h.set("Vary", "Accept-Encoding");
  h.set("Access-Control-Allow-Origin", "*");}
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
function kindFromPath(p) {
  if (p === "/style.json") return "style";
  if (p.startsWith("/tiles/") && p.endsWith(".pbf")) return "tiles";
  if (p.startsWith("/fonts/") && p.endsWith(".pbf")) return "fonts";
  return "other";
}
async function fetchPrivate(env, path, req) {
  const fwd = new Headers();
  for (const [k, v] of req.headers) {
    const lk = k.toLowerCase();
    if (lk === "range" || lk.startsWith("if-")) fwd.set(k, v);
  }
  fwd.set("Accept-Encoding", "identity");
  return fetchS3Private(env.ORIGIN_BASE_PRIVATE, path, env, fwd);
}
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    // === EMBEDDED SPRITES START ===
        // === EMBEDDED SPRITES (no S3 dependency) ===
        function b642bytes(b){const bin=atob(b);const arr=new Uint8Array(bin.length);for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return arr;}
    
        if (url.pathname === "/sprite.png") {
          return new Response(b642bytes("iVBORw0KGgoAAAANSUhEUgAAAB4AAAAPCAMAAADEZI+uAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAABUUExURQAAAC7McR6Q/x6Q/x6Q/y7McS7McR6Q/y7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McR6Q/y7Mcf///wOAFt0AAAAZdFJOUwAAB2DPAwoeTqNcKYZeNAsIi74eWMAZOQIGvkzHAAAAAWJLR0QbAmDUpAAAAAd0SU1FB+kJDgoMGzsX9p4AAAAQY2FOdgAAAA8AAAAPAAAAAAAAAACr/z1IAAAAbElEQVQY06WRSQ6AIBAEkUFx3zf6/w8VFYYTxMS6TVc6wCDEbyQpo0iGIEcRBm1eNCclqtA1HslloPaaWBOXLY0bFGvlEjy4wQRc0t62i7b7Ww/Rs0drp/jNxQwsiXev2FJb23Gktpzh/PQbF1SGDJ0TueGmAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI1LTA5LTE0VDEwOjEyOjA1KzAwOjAwwI1KBwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNS0wOS0xNFQxMDoxMjowNSswMDowMLHQ8rsAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjUtMDktMTRUMTA6MTI6MjcrMDA6MDAzf8UwAAAAAElFTkSuQmCC"), {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=31536000, immutable, no-transform",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        if (url.pathname === "/sprite@2x.png") {
          return new Response(b642bytes("iVBORw0KGgoAAAANSUhEUgAAADwAAAAeCAMAAABHRo19AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAH4UExURQAAAB6Q/y7McR6Q/x6Q/x6Q/x6Q/x6Q/x6Q/y7McS7McS7McR6Q/x6Q/x6Q/x6Q/x6Q/y7McS7McS7McS7McR6Q/x6Q/x6Q/x6Q/x6Q/x6Q/x6Q/x6Q/y7McS7McS7McS7McS7McS7McS7McS7McR6Q/x6Q/x6Q/x6Q/x6Q/x6Q/x6Q/x6Q/y7McS7McS7McS7McS7McS7McS7McS7McR6Q/x6Q/y7McS7McS7McS7McS7McS7McS7McS7McS7McR6Q/y7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McS7McR6Q/y7Mcf///4yKEOMAAACldFJOUwAAAAMPHCo1Ow8wEDJbh6i7MpeYNQESVHefy+v+AQhR0NdmHQcJPJjN1+Hw+gombNbpo1oagdwbnuL105M8CwL4M6Hl+f70wy4NTcmmZCRq0vrnqkgDHFuf4d2KRRU0nDE3r/L966gnfcHsqSAZUpXe1XUO1MtVEQQGXcz88K5Mx+3Cfyk+uJRQGJ3g99FpJXu/vErf++Sgdu5fz4dAE0/OYkfNL+r6mrsAAAABYktHRKfAtysDAAAAB3RJTUUH6QkOCgwbOxf2ngAAABBjYU52AAAAHgAAAB4AAAAAAAAAAHnVFCUAAAIASURBVDjLY2CgGDBiAagqmJAA9TRDFDOzsLKxc3Cws7GyMGNqB2ni5OLixqGZhYeXj19AgJ+Pl4cFu2ZBIWERNM1gdaJiPOISklLSMjLSUpIS4jxioijaQVpk5eQVFJWUVVC0g/WqqqlraGpp6yxdqqOtpamhrqYqiq5ZV0/fwNDI2ARDs5iaqdlSJGBmqiaGrtnc2MLSytrG1s4eSTtIEY+6mQOyZgczdR50zY5Ozi6ubu76Hp4omplZxDWWogENcVCYIzTLynl5LwMCZx9fP3tkzSw8EpromjUlQGGO0Kyr5x8A0hwYFBzCGYqkmZVXUgtds5YkLyuy5rDwiMhlYBAVHROLpJmNT0obXbO2FB8bsuY4oyAXiGaXyPgEJM3s/NI66Jp1pPnZkTUnJiWnQDQHpqaJIGnmEJBZigFkBDiQNadnZGZBNDtnK+WQqDk3L78AormwKKGYRGcXCxaVQDSXlpVXkBhglblV1SCtNbV1tiiJhJiokpWrbwBpbmxqbmEiNZEwMbW2BQI1F7R3dJKcPIFpu6u7Z9my3r5+XTIyht6EiVnLaiZN1rUnI0vm5glNmTpteiLJhQE4shJmGMycNMMPQzOhYggSWbNmF8yZOw9bKUawAJSVm7+gZKGJCplF76LFs70qyC30ufLzE8iuMTiXLOHEopkYgKW6AQAYaSLMsADx0AAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNS0wOS0xNFQxMDoxMjoyNyswMDowMBU3XFMAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjUtMDktMTRUMTA6MTI6MjcrMDA6MDBkauTvAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDI1LTA5LTE0VDEwOjEyOjI3KzAwOjAwM3/FMAAAAABJRU5ErkJggg=="), {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=31536000, immutable, no-transform",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        if (url.pathname === "/sprite.json") {
          return new Response("{\n  \"marker-15\": { \"width\": 15, \"height\": 15, \"x\": 0,  \"y\": 0, \"pixelRatio\": 1 },\n  \"poi-15\":    { \"width\": 15, \"height\": 15, \"x\": 15, \"y\": 0, \"pixelRatio\": 1 }\n}\n", {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "public, max-age=31536000, immutable, no-transform",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        if (url.pathname === "/sprite@2x.json") {
          return new Response("{\n  \"marker-15\": { \"width\": 30, \"height\": 30, \"x\": 0,  \"y\": 0,  \"pixelRatio\": 2 },\n  \"poi-15\":    { \"width\": 30, \"height\": 30, \"x\": 30, \"y\": 0,  \"pixelRatio\": 2 }\n}\n", {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "public, max-age=31536000, immutable, no-transform",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
    // END EMBEDDED SPRITES
    // --- BEGIN SPRITE+FONTSTACK SNIPPET (after const url = new URL(req.url);) ---
    
    // 1) Routes sprite (optionnel si tu as enlevé "sprite" du style.json)
    if (url.pathname === "/sprite.png" || url.pathname === "/sprite@2x.png" ||
        url.pathname === "/sprite.json" || url.pathname === "/sprite@2x.json") {
      if (!env.ORIGIN_BASE_PUBLIC) {
        return new Response("Missing ORIGIN_BASE_PUBLIC", { status: 500 });
      }
      const up = await fetch(`${env.ORIGIN_BASE_PUBLIC}${url.pathname}`);
      const isJson = url.pathname.endsWith(".json");
      return (isJson ? normalizeJsonResponse : normalizeBinaryResponse)(
        up,
        "public, max-age=31536000, immutable"
      );
    }
    
    // 2) Fallback fontstack: si {fontstack} contient une virgule, on garde la 1ère police
    if (url.pathname.startsWith("/fonts/")) {
      const parts = decodeURIComponent(url.pathname).split("/");
      if (parts.length >= 4 && parts[2].includes(",")) {
        parts[2] = encodeURIComponent(parts[2].split(",")[0].trim());
        url.pathname = parts.join("/");
      }
    }
    
    // --- END SPRITE+FONTSTACK SNIPPET ---
    const p = url.pathname;
    const kind = kindFromPath(p);
    if (kind === "other") return new Response("Not Found", { status: 404 });
    if (!env.ORIGIN_BASE_PRIVATE) return new Response("Missing ORIGIN_BASE_PRIVATE", { status: 500 });

    if (kind === "style") {
      const up = await fetchPrivate(env, "/style.json", req);
      return normalizeJsonResponse(up, "public, max-age=300");
    }
    if (kind === "tiles") {
      const up = await fetchPrivate(env, p, req);
      return normalizeBinaryResponse(up, `public, max-age=${ONE_DAY}, stale-while-revalidate=${ONE_WEEK}`);
    }
    if (kind === "fonts") {
      const up = await fetchPrivate(env, p, req);
      return normalizeBinaryResponse(up, `public, max-age=${ONE_YEAR}, immutable`);
    }
    return new Response("Not Found", { status: 404 });
  },
};
