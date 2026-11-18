import { pipeline, hashToObject, VOTER_RE } from "./_redis.js";
import { votingState } from "../shared/schedule.js";
import { getConfig } from "./_config.js";

// Estado público da votação + categorias em que este visitante já votou
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const voterId = String(req.query?.voter || "");
  try {
    const cfg = await getConfig();
    let voted = [];
    if (VOTER_RE.test(voterId)) {
      const [h] = await pipeline([["HGETALL", `voter:${voterId}`]]);
      voted = Object.keys(hashToObject(h));
    }
    return res.status(200).json({
      voted,
      epoch: cfg.epoch,
      voting: { state: votingState(cfg), mode: cfg.mode, start: cfg.start, end: cfg.end },
    });
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Erro ao consultar." });
  }
}
