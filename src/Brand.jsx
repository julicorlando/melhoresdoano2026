export function Logos({ compact = false }) {
  return (
    <div className={`logos ${compact ? "logos--compact" : ""}`}>
      <img src="/logos/petribu.png" alt="Petribu Desenvolvimento Urbano" className="logo logo-petribu" />
      <span className="logos-sep" aria-hidden="true" />
      <img src="/logos/shopping-carpina.png" alt="Shopping Carpina — Feito pra você!" className="logo logo-carpina" />
    </div>
  );
}

// Elementos gráficos de linhas contínuas, inspirados no manual da marca
export function BrandLines() {
  return (
    <svg className="brand-lines" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path className="ln ln-lime" d="M-40 640 C 120 640, 160 520, 300 520 L 520 520 C 600 520, 620 600, 700 600 C 800 600, 820 470, 940 470 L 1260 470" />
      <path className="ln ln-blue" d="M-40 700 C 160 700, 220 610, 380 610 C 520 610, 560 690, 700 690 L 1260 690" />
      <path className="ln ln-blue2" d="M980 -40 L 980 120 C 980 200, 1060 220, 1120 220 L 1260 220" />
      <path className="ln ln-lime2" d="M-40 140 L 160 140 C 230 140, 250 60, 320 60 L 420 60" />
    </svg>
  );
}
