import { useEffect, useState } from "react";
import { Logos, BrandLines } from "./Brand.jsx";

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
