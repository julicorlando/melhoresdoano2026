import { pipeline, readBody } from "./_redis.js";
import { CATEGORIES } from "../shared/categories.js";
import { LOCAL_RE, toMs, votingState } from "../shared/schedule.js";
import { checkPassword } from "./_auth.js";
import { getConfig } from "./_config.js";

// Ações do administrador: salvar agendamento e zerar votação
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  const { password, action, mode, start, end, confirm } = readBody(req);
  if (!checkPassword(password)) return res.status(401).json({ error: "Senha incorreta." });

  try {
    if (action === "schedule") {
      if (!["auto", "open", "closed"].includes(mode)) return res.status(400).json({ error: "Modo inválido." });
      if (!LOCAL_RE.test(start || "") || !LOCAL_RE.test(end || "")) return res.status(400).json({ error: "Datas inválidas." });
      if (toMs(end) <= toMs(start)) return res.status(400).json({ error: "O fim precisa ser depois do início." });
      await pipeline([["HSET", "config", "mode", mode, "start", start, "end", end]]);
      const cfg = await getConfig();
      return res.status(200).json({ ok: true, voting: { state: votingState(cfg), mode: cfg.mode, start: cfg.start, end: cfg.end } });
    }

    if (action === "reset") {
      if (confirm !== "ZERAR") return res.status(400).json({ error: "Confirmação inválida." });
      const [members] = await pipeline([["SMEMBERS", "voters:all"]]);
      const ids = Array.isArray(members) ? members : [];
      for (let i = 0; i < ids.length; i += 500) {
        await pipeline([["DEL", ...ids.slice(i, i + 500).map((id) => `voter:${id}`)]]);
      }
      const keys = ["voters:all"];
      for (const c of CATEGORIES) keys.push(`votes:${c.id}`, `names:${c.id}`, `voters:${c.id}`);
      // Se o epoch ainda não existe, começa em 1 antes de incrementar
      await pipeline([["DEL", ...keys], ["HSETNX", "config", "epoch", "1"], ["HINCRBY", "config", "epoch", 1]]);
      return res.status(200).json({ ok: true, removedVoters: ids.length });
    }

    return res.status(400).json({ error: "Ação inválida." });
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Erro ao executar ação." });
  }
}
