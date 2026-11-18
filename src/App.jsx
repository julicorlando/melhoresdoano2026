import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "../shared/categories.js";
import { formatLocal } from "../shared/schedule.js";
import { Logos, BrandLines } from "./Brand.jsx";

const LS_ID = "mda2026_voter";
const LS_VOTED = "mda2026_voted";
const LS_EPOCH = "mda2026_epoch";

function getVoterId() {
  let id = null;
  try { id = localStorage.getItem(LS_ID); } catch {}
  if (!id) {
    const m = document.cookie.match(/(?:^|; )mda2026_voter=([^;]+)/);
    if (m) id = decodeURIComponent(m[1]);
  }
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
  }
  try { localStorage.setItem(LS_ID, id); } catch {}
  document.cookie = `mda2026_voter=${encodeURIComponent(id)}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
  return id;
}

function readLocalVoted() {
  try { return JSON.parse(localStorage.getItem(LS_VOTED) || "[]"); } catch { return []; }
}
function saveLocalVoted(list) {
  try { localStorage.setItem(LS_VOTED, JSON.stringify(list)); } catch {}
}

function downloadIcs() {
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Petribu//Melhores do Ano 2026//PT",
    "BEGIN:VEVENT",
    `UID:melhores-do-ano-2026-${Date.now()}@petribu`,
    "DTSTAMP:20261118T000000Z",
    "DTSTART;VALUE=DATE:20261211", "DTEND;VALUE=DATE:20261212",
    "SUMMARY:Melhores do Ano 2026 – Save the date",
    "DESCRIPTION:Petribu · Shopping Carpina",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url; a.download = "melhores-do-ano-2026.ics"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const voterId = useMemo(getVoterId, []);
  const [voted, setVoted] = useState(readLocalVoted);
  const [started, setStarted] = useState(() => readLocalVoted().length > 0);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [anim, setAnim] = useState("in");
  const [voting, setVoting] = useState(null);
  const inputRef = useRef(null);

  // Sincroniza com o servidor (garante 1 voto por categoria mesmo trocando de aba)
  useEffect(() => {
    fetch(`/api/status?voter=${encodeURIComponent(voterId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.voting) setVoting(d.voting);
        if (d?.voted) {
          let local = readLocalVoted();
          // Votação foi zerada pelo admin: descarta o progresso salvo no navegador
          let storedEpoch = null;
          try { storedEpoch = localStorage.getItem(LS_EPOCH); } catch {}
          if (d.epoch && storedEpoch !== String(d.epoch)) {
            local = [];
            try { localStorage.setItem(LS_EPOCH, String(d.epoch)); } catch {}
            if (storedEpoch !== null) setStarted(false);
          }
          const merged = Array.from(new Set([...local, ...d.voted]));
          setVoted(merged);
          saveLocalVoted(merged);
          if (merged.length) setStarted(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [voterId]);

  const pending = CATEGORIES.filter((c) => !voted.includes(c.id));
  const current = pending[0];
  const index = current ? CATEGORIES.indexOf(current) : CATEGORIES.length;
  const done = !current;
  const progress = Math.round(((CATEGORIES.length - pending.length) / CATEGORIES.length) * 100);

  useEffect(() => {
    if (started && current) setTimeout(() => inputRef.current?.focus(), 350);
  }, [started, current?.id]);

  function markVoted(id) {
    setAnim("out");
    setTimeout(() => {
      setVoted((prev) => {
        const next = Array.from(new Set([...prev, id]));
        saveLocalVoted(next);
        return next;
      });
      setName("");
      setAnim("in");
    }, 280);
  }

  async function submit(e) {
    e.preventDefault();
    if (!current || sending) return;
    const value = name.replace(/\s+/g, " ").trim();
    if (value.length < 2) { setError("Digite o nome da pessoa."); return; }
    setSending(true);
    setError("");
    try {
      const r = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId, categoryId: current.id, name: value }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok || d.alreadyVoted) markVoted(current.id);
      else if (d.state) { setVoting((v) => ({ ...(v || {}), state: d.state })); setError(d.error); }
      else setError(d.error || "Não foi possível registrar seu voto. Tente novamente.");
    } catch {
      setError("Sem conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page">
      <BrandLines />
      <header className="topbar">
        <Logos compact={started} />
      </header>

      <main className="stage">
        {!started && (
          <section className="intro fade-in">
            <p className="eyebrow">Premiação interna</p>
            <h1 className="title">
              <span className="title-light">Melhores</span>
              <span className="title-strong">do Ano</span>
              <span className="title-year">2026</span>
            </h1>
            <p className="lead">
              Chegou a hora de reconhecer quem fez o nosso ano mais divertido.
              São <strong>{CATEGORIES.length} categorias</strong> — é só digitar o nome da pessoa.
            </p>
            <div className="period">
              <span className="period-label">Votação</span>
              <span className="period-dates">23 a 30/11</span>
            </div>
            {voting?.state === "before" ? (
              <div className="notice">
                <strong>A votação ainda não começou.</strong>
                <span>Abre em {formatLocal(voting.start)}. Volte por este mesmo link!</span>
              </div>
            ) : voting && voting.state !== "open" ? (
              <div className="notice">
                <strong>A votação está encerrada.</strong>
                <span>Obrigado a todos que participaram. Até a revelação!</span>
              </div>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => setStarted(true)} disabled={loading}>
                  {loading ? "Carregando…" : "Começar a votar"}
                </button>
                <p className="hint">Você vota uma vez em cada categoria.</p>
              </>
            )}
          </section>
        )}

        {started && !done && voting && voting.state !== "open" && (
          <section className="intro fade-in">
            <div className="notice">
              <strong>{voting.state === "before" ? "A votação ainda não começou." : "A votação está encerrada."}</strong>
              <span>{voting.state === "before" ? `Abre em ${formatLocal(voting.start)}.` : "Os votos que você já enviou estão garantidos."}</span>
            </div>
          </section>
        )}

        {started && !done && (!voting || voting.state === "open") && (
          <section className={`vote ${anim === "in" ? "slide-in" : "slide-out"}`} key={current.id}>
            <div className="progress" aria-label={`Progresso: ${progress}%`}>
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <div className="counter">
              Categoria <strong>{String(index + 1).padStart(2, "0")}</strong> de {CATEGORIES.length}
            </div>

            <div className="card">
              <div className="card-num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
              <div className="card-emoji" aria-hidden="true">{current.emoji}</div>
              <h2 className="card-title">{current.title}</h2>
              <p className="card-desc">{current.desc}</p>

              <form onSubmit={submit} className="form">
                <label htmlFor="nome" className="label">Quem merece esse título?</label>
                <input
                  id="nome"
                  ref={inputRef}
                  className="input"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  placeholder="Nome da pessoa"
                  maxLength={60}
                  autoComplete="off"
                  autoCapitalize="words"
                  enterKeyHint="send"
                />
                {error && <p className="error" role="alert">{error}</p>}
                <button className="btn btn-primary btn-block" disabled={sending}>
                  {sending ? "Enviando…" : index + 1 === CATEGORIES.length ? "Votar e finalizar" : "Votar"}
                </button>
              </form>
            </div>
          </section>
        )}

        {started && done && (
          <section className="thanks fade-in">
            <div className="check" aria-hidden="true">
              <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M15 27 l7 7 l15 -16" /></svg>
            </div>
            <h2 className="thanks-title">Obrigado por votar!</h2>
            <p className="lead">
              Seus votos nas {CATEGORIES.length} categorias foram registrados.
              Agora é torcer — os vencedores serão revelados em breve.
            </p>

            <div className="std">
              <span className="std-label">Save the date</span>
              <div className="std-date">
                <span>11</span><i>.</i><span>12</span><i>.</i><span>2026</span>
              </div>
              <span className="std-sub">Melhores do Ano 2026</span>
              <button className="btn btn-ghost" onClick={downloadIcs}>Adicionar à agenda</button>
            </div>
          </section>
        )}
      </main>

      <footer className="foot">Melhores do Ano 2026 · Petribu · Shopping Carpina</footer>
    </div>
  );
}
