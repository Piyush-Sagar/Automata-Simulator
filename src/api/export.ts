import sharp from "sharp";
import type { AnyAutomaton } from "@/engine";
import { serializeAutomaton } from "@/engine";
import { requireValue } from "./errors";

const xml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );

// Native SVG keeps API rendering independent of browser DOM/foreignObject.
export function renderSvg(a: AnyAutomaton, theme: "light" | "dark") {
  requireValue(
    a.states.every(
      (s) =>
        Math.abs(s.x) <= 100000 &&
        Math.abs(s.y) <= 100000 &&
        s.label.length <= 200,
    ),
    "Export requires positions within ±100000 and labels up to 200 characters.",
  );
  let left = 0,
    top = 0,
    right = 400,
    bottom = 250;
  const include = (x: number, y: number, rx = 20, ry = 20) => {
    left = Math.min(left, x - rx);
    top = Math.min(top, y - ry);
    right = Math.max(right, x + rx);
    bottom = Math.max(bottom, y + ry);
  };
  for (const s of a.states)
    include(
      s.x,
      s.y,
      Math.max(s.isStart ? 90 : 45, Array.from(s.label).length * 5),
      45,
    );
  const fg = theme === "dark" ? "#e2e8f0" : "#1e293b";
  const bg = theme === "dark" ? "#0f172a" : "#ffffff";
  const states = new Map(a.states.map((s) => [s.id, s]));
  const pairs = new Map<string, number>();
  const pairKey = (from: string, to: string) =>
    JSON.stringify([from, to].sort());
  for (const t of a.transitions) {
    const key = pairKey(t.from, t.to);
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
  }
  const lanes = new Map<string, number>();
  const edges = a.transitions
    .map((t, i) => {
      const from = states.get(t.from),
        to = states.get(t.to);
      if (!from || !to) return "";
      const label =
        "symbol" in t
          ? t.symbol
          : "inputSymbol" in t
            ? `${t.inputSymbol}, ${t.stackTop} → ${t.stackReplacement.join("") || "ε"}`
            : `${t.readSymbol} → ${t.writeSymbol}, ${t.direction}`;
      requireValue(
        label.length <= 400,
        "Transition label is too long for image export.",
      );
      const key = pairKey(t.from, t.to);
      const lane = lanes.get(key) ?? 0;
      lanes.set(key, lane + 1);
      let d: string, x: number, y: number;
      if (from.id === to.id) {
        const h = 65 + lane * 30;
        d = `M ${from.x - 18} ${from.y - 24} C ${from.x - h} ${from.y - h - 40}, ${from.x + h} ${from.y - h - 40}, ${from.x + 18} ${from.y - 24}`;
        x = from.x;
        y = from.y - h - 25;
        include(from.x, from.y - h - 40, h + 20);
      } else {
        const dx = to.x - from.x,
          dy = to.y - from.y,
          len = Math.hypot(dx, dy) || 1;
        const offset = (pairs.get(key) ?? 0) > 1 ? 40 + lane * 28 : 0;
        x = (from.x + to.x) / 2 - (dy / len) * offset;
        y = (from.y + to.y) / 2 + (dx / len) * offset;
        d = `M ${from.x + (dx / len) * 32} ${from.y + (dy / len) * 32} Q ${x} ${y}, ${to.x - (dx / len) * 36} ${to.y - (dy / len) * 36}`;
        include(x, y);
        x = (from.x + 2 * x + to.x) / 4;
        y = (from.y + 2 * y + to.y) / 4;
      }
      include(x, y - 8, Math.max(20, Array.from(label).length * 5), 25);
      return `<g data-transition="${i}"><path d="${d}" fill="none" stroke="${fg}" marker-end="url(#arrow)"/><text x="${x}" y="${y - 8}" text-anchor="middle" paint-order="stroke" stroke="${bg}" stroke-width="4" stroke-linejoin="round" fill="${fg}">${xml(label)}</text></g>`;
    })
    .join("");
  const nodes = a.states
    .map(
      (s) =>
        `<g>${s.isStart ? `<path d="M ${s.x - 78} ${s.y} L ${s.x - 35} ${s.y}" stroke="${fg}" marker-end="url(#arrow)"/>` : ""}<circle cx="${s.x}" cy="${s.y}" r="31" fill="${bg}" stroke="${fg}"/>${s.isAccept ? `<circle cx="${s.x}" cy="${s.y}" r="25" fill="none" stroke="${fg}"/>` : ""}<text x="${s.x}" y="${s.y + 5}" text-anchor="middle" fill="${fg}">${xml(s.label)}</text></g>`,
    )
    .join("");
  const width = Math.ceil(right - left),
    height = Math.ceil(bottom - top);
  requireValue(
    width * height <= 16000000 && width <= 16000 && height <= 16000,
    "Export exceeds the 16-million-pixel budget. Arrange states first.",
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${left} ${top} ${width} ${height}"><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="${bg}"/><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${fg}"/></marker></defs><g font-family="sans-serif" font-size="14" stroke-width="2">${edges}${nodes}</g></svg>`;
}

export async function exportMachine(
  a: AnyAutomaton,
  format: "json" | "svg" | "png",
  theme: "light" | "dark",
) {
  const filename =
    (a.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "automaton") +
    `.${format}`;
  if (format === "json")
    return {
      filename,
      mimeType: "application/json",
      encoding: "utf8",
      data: serializeAutomaton(a),
    };
  const svg = renderSvg(a, theme);
  if (format === "svg")
    return { filename, mimeType: "image/svg+xml", encoding: "utf8", data: svg };
  const png = await sharp(Buffer.from(svg), { limitInputPixels: 16000000 })
    .png()
    .toBuffer();
  return {
    filename,
    mimeType: "image/png",
    encoding: "base64",
    data: png.toString("base64"),
  };
}
