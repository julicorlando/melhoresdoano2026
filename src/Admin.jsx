import { useEffect, useState } from "react";
import { Logos, BrandLines } from "./Brand.jsx";
import { formatLocal } from "../shared/schedule.js";

const STATE_LABEL = {
  open: "Votação aberta",
  before: "Agendada — ainda não abriu",
  after: "Encerrada (prazo terminou)",
  closed: "Fechada manualmente",
};

const SS_KEY = "mda2026_admin";

function toCsv(data) {
  const rows = [["Categoria", "Posição", "Nome", "Votos"]];
  for (const c of data.categories) {
    c.ranking.forEach((r, i) => rows.push([c.title, i + 1, r.name, r.votes]));
  }
  return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
}

export default function Admin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(SS_KEY) || "");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState({});
  const [sched, setSched] = useState(null);
  const [schedMsg, setSchedMsg] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(pw = password) {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || "Erro ao carregar.");
        if (r.status === 401) { sessionStorage.removeItem(SS_KEY); setData(null); }
        return;
      }
      sessionStorage.setItem(SS_KEY, pw);
      setData(d);
      setSched((prev) => prev || { mode: d.voting.mode, start: d.voting.start, end: d.voting.end });
    } catch {
      setError("Sem conexão.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (password) load(password); }, []); // eslint-disable-line

  function exportCsv() {
    const blob = new Blob(["﻿" + toCsv(data)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "melhores-do-ano-2026-resultados.csv";
    a.click();
  }

  async function adminAction(body) {
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, ...body }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Erro ao executar ação.");
    return d;
  }

  async function saveSchedule(e) {
    e.preventDefault();
    setBusy(true);
    setSchedMsg("");
    try {
      const d = await adminAction({ action: "schedule", ...sched });
      setData((prev) => ({ ...prev, voting: d.voting }));
      setSchedMsg("Agendamento salvo.");
    } catch (err) {
      setSchedMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function doReset() {
    setBusy(true);
    setResetMsg("");
    try {
      await adminAction({ action: "reset", confirm: resetText });
      setResetOpen(false);
      setResetText("");
      setResetMsg("Votação zerada. Todos podem votar novamente.");
      await load();
    } catch (err) {
      setResetMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(SS_KEY);
    setPassword("");
    setData(null);
  }

  if (!data) {
    return (
      <div className="page">
        <BrandLines />
        <header className="topbar"><Logos compact /></header>
        <main className="stage">
          <form className="card admin-login fade-in" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <p className="eyebrow">Área restrita</p>
            <h2 className="card-title">Resultados</h2>
            <p className="card-desc">Melhores do Ano 2026</p>
            <label className="label" htmlFor="pw">Senha</label>
            <input id="pw" type="password" className="input" value={password}
              onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn btn-primary btn-block" disabled={loading || !password}>
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </main>
      </div>
    );
  }

  const totalVotes = data.categories.reduce((s, c) => s + c.total, 0);

  return (
    <div className="page page-admin">
      <BrandLines />
      <header className="topbar"><Logos compact /></header>
      <main className="admin">
        <div className="admin-head">
          <div>
            <p className="eyebrow">Painel do administrador</p>
            <h1 className="admin-title">Resultados · Melhores do Ano 2026</h1>
            <p className="admin-updated">Atualizado às {new Date(data.updatedAt).toLocaleTimeString("pt-BR")}</p>
          </div>
          <div className="admin-actions">
            <button className="btn btn-ghost" onClick={() => load()} disabled={loading}>{loading ? "Atualizando…" : "Atualizar"}</button>
            <button className="btn btn-ghost" onClick={exportCsv}>Exportar CSV</button>
            <button className="btn btn-link" onClick={logout}>Sair</button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="stats">
          <div className="stat"><span className="stat-n">{data.totalVoters}</span><span className="stat-l">participantes</span></div>
          <div className="stat"><span className="stat-n">{totalVotes}</span><span className="stat-l">votos registrados</span></div>
          <div className="stat"><span className="stat-n">{data.categories.length}</span><span className="stat-l">categorias</span></div>
        </div>

        <section className="controls">
          <form className="panel" onSubmit={saveSchedule}>
            <div className="panel-head">
              <h3 className="panel-title">Agendamento da votação</h3>
              <span className={`badge badge-${data.voting.state}`}>{STATE_LABEL[data.voting.state]}</span>
            </div>
            <div className="seg" role="radiogroup" aria-label="Modo da votação">
              {[["auto", "Automático (agenda)"], ["open", "Aberta agora"], ["closed", "Fechada agora"]].map(([v, l]) => (
                <button type="button" key={v} role="radio" aria-checked={sched?.mode === v}
                  className={`seg-btn ${sched?.mode === v ? "is-on" : ""}`}
                  onClick={() => setSched((p) => ({ ...p, mode: v }))}>{l}</button>
              ))}
            </div>
            <div className={`dates ${sched?.mode !== "auto" ? "is-dim" : ""}`}>
              <label className="field">
                <span className="label">Libera em</span>
                <input type="datetime-local" className="input input-sm" value={sched?.start || ""}
                  onChange={(e) => setSched((p) => ({ ...p, start: e.target.value }))} required />
              </label>
              <label className="field">
                <span className="label">Bloqueia em</span>
                <input type="datetime-local" className="input input-sm" value={sched?.end || ""}
                  onChange={(e) => setSched((p) => ({ ...p, end: e.target.value }))} required />
              </label>
            </div>
            <p className="panel-note">
              Horário de Brasília. Em “Automático”, a votação abre em {formatLocal(data.voting.start)} e fecha em {formatLocal(data.voting.end)}.
            </p>
            <div className="panel-foot">
              <button className="btn btn-primary btn-sm" disabled={busy}>Salvar agendamento</button>
              {schedMsg && <span className="panel-msg">{schedMsg}</span>}
            </div>
          </form>

          <div className="panel panel-danger">
            <h3 className="panel-title">Zerar votação</h3>
            <p className="panel-note">
              Apaga todos os votos e libera todo mundo para votar de novo. Não dá para desfazer —
              exporte o CSV antes se quiser guardar os resultados.
            </p>
            {!resetOpen ? (
              <button className="btn btn-danger btn-sm" onClick={() => { setResetOpen(true); setResetMsg(""); }}>
                Limpar votos e resetar
              </button>
            ) : (
              <div className="reset-confirm">
                <label className="label" htmlFor="zerar">Digite ZERAR para confirmar</label>
                <input id="zerar" className="input input-sm" value={resetText} autoComplete="off"
                  onChange={(e) => setResetText(e.target.value.toUpperCase())} />
                <div className="panel-foot">
                  <button className="btn btn-danger btn-sm" disabled={busy || resetText !== "ZERAR"} onClick={doReset}>
                    {busy ? "Zerando…" : "Confirmar e zerar"}
                  </button>
                  <button className="btn btn-link" onClick={() => { setResetOpen(false); setResetText(""); }}>Cancelar</button>
                </div>
              </div>
            )}
            {resetMsg && <p className="panel-msg">{resetMsg}</p>}
          </div>
        </section>

        <div className="results">
          {data.categories.map((c, i) => {
            const max = c.ranking[0]?.votes || 1;
            const leaders = c.ranking.filter((r) => r.votes === c.ranking[0]?.votes);
            const expanded = open[c.id];
            const list = expanded ? c.ranking : c.ranking.slice(0, 5);
            return (
              <article className="result" key={c.id}>
                <header className="result-head">
                  <span className="result-num">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="result-title">{c.emoji} {c.title}</h3>
                    <p className="result-desc">{c.desc}</p>
                  </div>
                  <span className="result-total">{c.total} {c.total === 1 ? "voto" : "votos"}</span>
                </header>

                {c.ranking.length === 0 ? (
                  <p className="result-empty">Nenhum voto ainda.</p>
                ) : (
                  <>
                    <div className="winner">
                      <span className="winner-label">{leaders.length > 1 ? "Empate na liderança" : "Liderando"}</span>
                      <span className="winner-name">{leaders.map((l) => l.name).join(" · ")}</span>
                    </div>
                    <ol className="ranking">
                      {list.map((r, k) => (
                        <li key={r.name + k} className={r.votes === max ? "is-top" : ""}>
                          <span className="rk-pos">{k + 1}º</span>
                          <span className="rk-name">{r.name}</span>
                          <span className="rk-bar"><span style={{ width: `${(r.votes / max) * 100}%` }} /></span>
                          <span className="rk-votes">{r.votes}</span>
                        </li>
                      ))}
                    </ol>
                    {c.ranking.length > 5 && (
                      <button className="btn btn-link" onClick={() => setOpen((o) => ({ ...o, [c.id]: !expanded }))}>
                        {expanded ? "Mostrar menos" : `Ver todos (${c.ranking.length})`}
                      </button>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
