import { pipeline, hashToObject, VOTER_RE } from "./_redis.js";

// Retorna as categorias em que este visitante já votou
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const voterId = String(req.query?.voter || "");
  if (!VOTER_RE.test(voterId)) return res.status(400).json({ error: "Identificação inválida." });
  try {
    const [h] = await pipeline([["HGETALL", `voter:${voterId}`]]);
    return res.status(200).json({ voted: Object.keys(hashToObject(h)) });
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Erro ao consultar." });
  }
}
