import { pipeline, readBody } from "./_redis.js";
import { LOCAL_RE, toMs, votingState } from "../shared/schedule.js";
import { checkPassword } from "./_auth.js";
import { getConfig, getCategories, saveCategories } from "./_config.js";

// Ações do administrador: salvar agendamento e zerar votação
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  const { password, action, mode, start, end, confirm, id, title, desc, emoji } = readBody(req);
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
      for (const c of await getCategories()) keys.push(`votes:${c.id}`, `names:${c.id}`, `voters:${c.id}`);
      // Se o epoch ainda não existe, começa em 1 antes de incrementar
      await pipeline([["DEL", ...keys], ["HSETNX", "config", "epoch", "1"], ["HINCRBY", "config", "epoch", 1]]);
      return res.status(200).json({ ok: true, removedVoters: ids.length });
    }

    if (action === "addCategory") {
      const t = String(title || "").replace(/\s+/g, " ").trim();
      const d = String(desc || "").replace(/\s+/g, " ").trim();
      const e = String(emoji || "").trim() || "⭐";
      if (t.length < 2 || t.length > 60) return res.status(400).json({ error: "O nome da categoria precisa ter entre 2 e 60 caracteres." });
      if (d.length > 140) return res.status(400).json({ error: "A descrição pode ter no máximo 140 caracteres." });
      if ([...e].length > 4) return res.status(400).json({ error: "Use apenas um emoji." });
      const list = await getCategories();
      if (list.some((c) => c.title.toLowerCase() === t.toLowerCase())) return res.status(400).json({ error: "Já existe uma categoria com esse nome." });
      const slug = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
      const newId = `${slug || "categoria"}-${Date.now().toString(36)}`;
      const next = [...list, { id: newId, emoji: e, title: t, desc: d }];
      await saveCategories(next);
      return res.status(200).json({ ok: true, categories: next });
    }

    if (action === "removeCategory") {
      const list = await getCategories();
      if (!list.some((c) => c.id === id)) return res.status(404).json({ error: "Categoria não encontrada." });
      if (list.length <= 1) return res.status(400).json({ error: "A votação precisa de pelo menos uma categoria." });
      const next = list.filter((c) => c.id !== id);
      await saveCategories(next);
      await pipeline([["DEL", `votes:${id}`, `names:${id}`, `voters:${id}`]]);
      return res.status(200).json({ ok: true, categories: next });
    }

    return res.status(400).json({ error: "Ação inválida." });
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Erro ao executar ação." });
  }
}
