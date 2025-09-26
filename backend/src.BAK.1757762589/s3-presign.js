// s3-presign.js – Scaleway S3 SigV4 (GET, path-style, UNSIGNED-PAYLOAD)
export async function fetchS3Private(originBase, path, env, forwardHeaders) {
  // originBase ex: "https://s3.fr-par.scw.cloud/idf-maps-storage"
  // path       ex: "/tiles/12/2074/1409.pbf" ou "/style.json"
  const accessKey = env.SCW_ACCESS_KEY_ID;
  const secretKey = env.SCW_SECRET_ACCESS_KEY;
  const region    = env.S3_REGION;            // "fr-par"
  const endpoint  = env.S3_ENDPOINT;          // "https://s3.fr-par.scw.cloud"

  if (!accessKey || !secretKey || !region || !endpoint) {
    return new Response("SigV4 misconfigured", { status: 500 });
  }

  // Décompose originBase en host + bucket
  const baseURL = new URL(originBase);
  const host = new URL(endpoint).host;        // s3.fr-par.scw.cloud
  const bucket = baseURL.pathname.replace(/^\/+/, ""); // "idf-maps-storage"
  const canonicalUri = `/${bucket}${path}`;   // "/idf-maps-storage/tiles/.."

  // Dates SigV4
  const now = new Date();
  const amzDate  = toAmzDate(now);   // 20250913T053305Z
  const shortDate = amzDate.slice(0, 8); // 20250913

  // Canonical request (GET, UNSIGNED-PAYLOAD)
  const method = "GET";
  const service = "s3";
  const payloadHash = "UNSIGNED-PAYLOAD";
  const signedHeaders = "host";

  // Query presign (tri ASCII, attention à l'encodage de Credential)
  const credential = `${accessKey}/${shortDate}/${region}/${service}/aws4_request`;
  const q = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": encodeURIComponent(credential),
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": "300",
    "X-Amz-SignedHeaders": signedHeaders,
  });
  // Tri ASCII
  const canonicalQuery = [...q.entries()]
    .map(([k, v]) => [encodeURIComponent(k), encodeURIComponent(v)])
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    `${shortDate}/${region}/${service}/aws4_request`,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSigningKey(secretKey, shortDate, region, service);
  const signature  = await hmacHex(signingKey, stringToSign);

  // URL présignée
  const presignedUrl = `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;

  // En-têtes vers l'origin (Range/If-* + Accept-Encoding: identity)
  const headers = new Headers(forwardHeaders || {});
  headers.set("Accept-Encoding", "identity");

  const upstream = await fetch(presignedUrl, {
    method: "GET",
    headers,
    cf: {
      cacheEverything: false, // on laisse le Worker wrapper gérer le cache
    },
  });

  // Ajoute un header debug visible côté client
  const outHeaders = new Headers(upstream.headers);
  outHeaders.set("x-debug-url", presignedUrl);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

// ===== Helpers cryptographiques =====
async function sha256Hex(data) {
  const enc = new TextEncoder();
  const b = typeof data === "string" ? enc.encode(data) : data;
  const d = await crypto.subtle.digest("SHA-256", b);
  return buf2hex(d);
}

async function hmacHex(key, data) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? enc.encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return buf2hex(sig);
}

async function getSigningKey(secret, date, region, service) {
  const enc = new TextEncoder();
  const kDate = await hmac(`AWS4${secret}`, date);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return await hmac(kService, "aws4_request");
}

async function hmac(key, data) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? enc.encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return new Uint8Array(sig);
}

function buf2hex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function toAmzDate(d) {
  const YYYY = d.getUTCFullYear();
  const MM = String(d.getUTCMonth() + 1).padStart(2, "0");
  const DD = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}T${hh}${mm}${ss}Z`;
}
