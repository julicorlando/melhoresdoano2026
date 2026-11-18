import { pipeline, readBody, VOTER_RE } from "./_redis.js";
import { nameKey, displayName } from "../shared/categories.js";
import { votingState, formatLocal } from "../shared/schedule.js";
import { getConfig, getCategories } from "./_config.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { voterId, categoryId, name } = readBody(req);
  if (!VOTER_RE.test(String(voterId || ""))) return res.status(400).json({ error: "Identificação inválida." });

  const key = nameKey(name);
  const pretty = displayName(name);
  if (key.length < 2 || pretty.length > 60) return res.status(400).json({ error: "Digite um nome válido." });

  try {
    const [cfg, categories] = await Promise.all([getConfig(), getCategories()]);
    if (!categories.some((c) => c.id === categoryId)) return res.status(400).json({ error: "Categoria inválida." });
    const state = votingState(cfg);
    if (state === "before") return res.status(403).json({ error: `A votação abre em ${formatLocal(cfg.start)}.`, state });
    if (state !== "open") return res.status(403).json({ error: "A votação está encerrada.", state });

    const [added] = await pipeline([["SADD", `voters:${categoryId}`, voterId]]);
    if (Number(added) === 0) {
      return res.status(409).json({ error: "Você já votou nesta categoria.", alreadyVoted: true });
    }
    await pipeline([
      ["HSETNX", `names:${categoryId}`, key, pretty],
      ["HINCRBY", `votes:${categoryId}`, key, 1],
      ["SADD", "voters:all", voterId],
      ["HSET", `voter:${voterId}`, categoryId, String(Date.now())],
    ]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Erro ao registrar voto. Tente novamente." });
  }
}
