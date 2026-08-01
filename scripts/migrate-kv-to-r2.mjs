#!/usr/bin/env node
/**
 * Migra la biblioteca de medios de Workers KV a R2.
 *
 * Lee todas las claves del namespace KV `MEDIA` (via Cloudflare API) y las
 * sube al bucket R2 `lanas-el-siglo-media` (via S3 API). Preserva la misma
 * clave y el mismo Content-Type, asi las URLs /api/media/<key> no cambian.
 *
 * Uso:
 *   CLOUDFLARE_API_TOKEN=<token> \
 *   R2_ACCESS_KEY_ID=<id> \
 *   R2_SECRET_ACCESS_KEY=<secret> \
 *   node scripts/migrate-kv-to-r2.mjs
 *
 * El token de Cloudflare necesita permisos: Workers KV Storage (Read) y
 * Account (Read). Las credenciales R2 se generan en:
 *   Dashboard > R2 > Manage R2 API Tokens > Create Access Token
 *   (permisos: Object Read & Write sobre el bucket lanas-el-siglo-media)
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHash, createHmac } from "node:crypto";

const ACCOUNT_ID = "f7f6884635183bbdf2c77577001262cb";
const KV_NAMESPACE = "aadcce57d7584ffc89159f937fc24818";
const BUCKET = "lanas-el-siglo-media";
const S3_ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

const API_TOKEN =
  process.env.CLOUDFLARE_API_TOKEN ||
  // Fallback: token OAuth que ya tiene wrangler en esta maquina.
  (() => {
    try {
      const text = readFileSync(
        join(homedir(), "Library/Preferences/.wrangler/config/default.toml"),
        "utf8"
      );
      return text.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
    } catch {
      return undefined;
    }
  })();

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

// Cuántas claves se procesan en paralelo (cada una: 1 GET a KV + 1 PUT a R2).
const CONCURRENCY = Number(process.env.MIGRATE_CONCURRENCY || 10);

if (!API_TOKEN) {
  console.error("Falta CLOUDFLARE_API_TOKEN (o el token OAuth de wrangler).");
  process.exit(1);
}
if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error(
    "Faltan R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY. Generalas en Dashboard > R2 > Manage R2 API Tokens."
  );
  process.exit(1);
}

/** Lista de claves KV con paginacion (via Cloudflare API). */
async function kvList(cursor = "") {
  const params = new URLSearchParams({ per_page: "1000" });
  if (cursor) params.set("cursor", cursor);
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE}/keys?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${API_TOKEN}` } });
  const data = await res.json();
  if (!data.success) throw new Error(`KV list: ${JSON.stringify(data.errors)}`);
  return { keys: data.result.map((k) => k.name), cursor: data.result_info?.cursor || "" };
}

/** Lee el valor y content-type de una clave KV. */
async function kvGet(key) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${API_TOKEN}` } });
  if (!res.ok) throw new Error(`KV get ${key}: ${res.status}`);
  return {
    buf: await res.arrayBuffer(),
    contentType: res.headers.get("content-type") || "application/octet-stream",
  };
}

/** Firma AWS SigV4 para el endpoint S3 de R2. */
function r2Sign(method, path, headers) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";
  const payloadHash = "UNSIGNED-PAYLOAD";

  const allHeaders = {
    host: new URL(S3_ENDPOINT).host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    ...headers,
  };
  const sortedKeys = Object.keys(allHeaders).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k.toLowerCase()}:${allHeaders[k]}\n`).join("");
  const signedHeaders = sortedKeys.map((k) => k.toLowerCase()).join(";");

  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const k1 = createHmac("sha256", "AWS4" + R2_SECRET_ACCESS_KEY).update(dateStamp).digest();
  const k2 = createHmac("sha256", k1).update(region).digest();
  const k3 = createHmac("sha256", k2).update(service).digest();
  const k4 = createHmac("sha256", k3).update("aws4_request").digest();
  const signature = createHmac("sha256", k4).update(stringToSign).digest("hex");

  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };
}

/** Sube un objeto a R2 via S3 API. */
async function r2Put(key, buf, contentType) {
  const path = `/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const headers = { "content-type": contentType };
  const res = await fetch(`${S3_ENDPOINT}${path}`, {
    method: "PUT",
    headers: { ...headers, ...r2Sign("PUT", path, headers) },
    body: buf,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`R2 put ${key}: ${res.status} ${body.slice(0, 200)}`);
  }
}

/** Procesa una lista de claves con concurrencia limitada. */
async function runWithConcurrency(keys, worker) {
  let index = 0;
  const runner = async () => {
    while (index < keys.length) {
      const i = index++;
      await worker(keys[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, keys.length) }, runner));
}

async function main() {
  console.log(`Migrando KV(${KV_NAMESPACE}) -> R2(${BUCKET}) con concurrencia ${CONCURRENCY}...`);
  let cursor = "";
  let total = 0;
  let ok = 0;
  let failed = 0;

  do {
    const { keys, cursor: nextCursor } = await kvList(cursor);
    cursor = nextCursor;

    await runWithConcurrency(keys, async (key) => {
      try {
        const { buf, contentType } = await kvGet(key);
        await r2Put(key, buf, contentType);
        ok++;
      } catch (err) {
        failed++;
        console.error(`  ✗ ${key}: ${err.message}`);
      }
      total++;
      if (total % 100 === 0) {
        console.log(`  ...${total} procesadas (${ok} ok, ${failed} fallidas)`);
      }
    });
  } while (cursor);

  console.log(`\nListo: ${ok}/${total} objetos migrados, ${failed} fallidas.`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
