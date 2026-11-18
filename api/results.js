import { pipeline, hashToObject, readBody } from "./_redis.js";
import { CATEGORIES } from "../shared/categories.js";
import { votingState } from "../shared/schedule.js";
import { checkPassword } from "./_auth.js";
import { getConfig } from "./_config.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  const { password } = readBody(req);
  if (!checkPassword(password)) return res.status(401).json({ error: "Senha incorreta." });

  try {
    const cmds = [["SCARD", "voters:all"]];
    for (const c of CATEGORIES) {
      cmds.push(["HGETALL", `votes:${c.id}`], ["HGETALL", `names:${c.id}`], ["SCARD", `voters:${c.id}`]);
    }
    const out = await pipeline(cmds);
    const totalVoters = Number(out[0]) || 0;
    const categories = CATEGORIES.map((c, i) => {
      const votes = hashToObject(out[1 + i * 3]);
      const names = hashToObject(out[2 + i * 3]);
      const ranking = Object.entries(votes)
        .map(([k, v]) => ({ name: names[k] || k, votes: Number(v) || 0 }))
        .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, "pt-BR"));
      return { ...c, total: Number(out[3 + i * 3]) || 0, ranking };
    });
    const cfg = await getConfig();
    const voting = { state: votingState(cfg), mode: cfg.mode, start: cfg.start, end: cfg.end };
    return res.status(200).json({ totalVoters, categories, voting, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Erro ao carregar resultados." });
  }
}
