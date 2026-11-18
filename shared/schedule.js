// Horários guardados como "AAAA-MM-DDTHH:MM" no horário de Brasília (UTC-03:00)
export const DEFAULT_CONFIG = {
  mode: "auto", // auto = segue o agendamento | open = aberta | closed = fechada
  start: "2026-11-23T00:00",
  end: "2026-11-30T23:59",
  epoch: "1",
};

export const LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function toMs(local) {
  return Date.parse(`${local}:00-03:00`);
}

export function votingState(cfg, now = Date.now()) {
  const c = { ...DEFAULT_CONFIG, ...cfg };
  if (c.mode === "open") return "open";
  if (c.mode === "closed") return "closed";
  if (now < toMs(c.start)) return "before";
  if (now > toMs(c.end) + 59999) return "after";
  return "open";
}

export function formatLocal(local) {
  const [d, t] = String(local).split("T");
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y} às ${t}`;
}
