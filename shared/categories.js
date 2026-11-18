export const CATEGORIES = [
  { id: "gps-humano", emoji: "📍", title: "O GPS Humano", desc: "Sabe de tudo e onde todo mundo está." },
  { id: "sincerao", emoji: "🗣️", title: "O Sincerão do Ano", desc: "Fala o que todo mundo pensa." },
  { id: "diplomata", emoji: "🎩", title: "O Diplomata Inglês(sa)", desc: "Consegue resolver qualquer situação na conversa." },
  { id: "pdu-fashion-week", emoji: "👗", title: "PDU Fashion Week", desc: "Parece que vai para um evento todos os dias." },
  { id: "influencer", emoji: "📸", title: "O Influencer da Empresa", desc: "A câmera é praticamente sua colega." },
  { id: "funcionario-google", emoji: "🔎", title: "Funcionário Google", desc: "Tem resposta para absolutamente tudo." },
  { id: "sherlock", emoji: "🕵️", title: "O Sherlock Holmes", desc: "Descobre tudo antes de todo mundo." },
  { id: "sobrevivente", emoji: "💪", title: "O Sobrevivente do Ano", desc: "Passou por cada situação e segue firme." },
  { id: "chalala", emoji: "👑", title: "O Rei/Rainha do Chalalá", desc: "Fala muito." },
  { id: "energetico", emoji: "⚡", title: "O Energético Humano", desc: "Parece que funciona com pilha." },
  { id: "lenda-viva", emoji: "📖", title: "O Lenda Viva", desc: "Tem uma história para cada situação." },
];

export const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

// Normaliza o nome digitado para agrupar "joão silva", "João  Silva" e "JOAO SILVA"
export function nameKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function displayName(name) {
  const lower = ["da", "de", "do", "das", "dos", "e"];
  return String(name || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && lower.includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
