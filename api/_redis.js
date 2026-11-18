// Cliente mínimo para Upstash Redis via REST (sem dependências).
// A integração "Upstash for Redis" da Vercel cria as variáveis KV_REST_API_URL e KV_REST_API_TOKEN.
const BASE = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function isConfigured() {
  return Boolean(BASE && TOKEN);
}

export async function pipeline(commands) {
  if (!isConfigured()) {
    const err = new Error("Banco de dados não configurado. Conecte o Upstash Redis no painel da Vercel.");
    err.status = 503;
    throw err;
  }
  const res = await fetch(`${BASE.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const data = await res.json();
  return data.map((item) => {
    if (item.error) throw new Error(item.error);
    return item.result;
  });
}

export function hashToObject(arr) {
  const out = {};
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i += 2) out[arr[i]] = arr[i + 1];
  } else if (arr && typeof arr === "object") {
    Object.assign(out, arr);
  }
  return out;
}

export function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export const VOTER_RE = /^[A-Za-z0-9-]{8,64}$/;
