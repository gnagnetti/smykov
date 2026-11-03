// @ts-nocheck -- matches the imported dashboard code style
// Sell-out "loop check" helpers: per-size ordered/sold/remaining, verified against model totals.
export interface SizeLine {
  size: string;
  ordered: number;
  sold: number;
  left: number;
}

export interface SellOutCheck {
  found: boolean;
  sizes: SizeLine[];
  ordered: number;
  sold: number;
  left: number;
  verified: boolean; // per-size sums match product totals
}

interface ProductLike {
  styleName: string;
  styleClean?: string;
  colorCode?: string;
  colorPrefix?: string;
  unitsOrdered: number;
  unitsSold: number;
  sizesOrdered?: Record<string, number>;
  sizesSold?: Record<string, number>;
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

export const normModel = (s: string) =>
  (s || "")
    .toUpperCase()
    .replace(/\b\d{3,4}\b/g, " ")
    .replace(/[^A-Z0-9À-Ü\u0400-\u04FF ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function sizeSort(a: string, b: string) {
  const ia = SIZE_ORDER.indexOf(a.toUpperCase());
  const ib = SIZE_ORDER.indexOf(b.toUpperCase());
  if (ia >= 0 && ib >= 0) return ia - ib;
  const na = Number(a),
    nb = Number(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

const codeMatches = (p: ProductLike, code: string) => {
  const digits = (value: string) => (String(value).match(/\d{3,4}/g) || []).map((part) => part.replace(/^0+/, ""));
  const wanted = digits(code);
  if (!wanted.length) return false;
  return [...digits(p.colorCode || ""), ...digits(p.colorPrefix || "")].some((candidate) => wanted.includes(candidate));
};

/** Exact model match (name without color codes); only falls back to prefix match when nothing exact exists. */
export function matchModelProducts<T extends ProductLike>(
  modelRef: string,
  products: T[],
  colorCode?: string,
): T[] {
  const name = normModel(modelRef);
  if (!name) return [];
  let hits = products.filter(
    (p) => normModel(p.styleClean || "") === name || normModel(p.styleName) === name,
  );
  if (!hits.length) {
    hits = products.filter(
      (p) =>
        normModel(p.styleName).startsWith(name + " ") ||
        normModel(p.styleClean || "").startsWith(name + " "),
    );
  }
  if (colorCode) hits = hits.filter((p) => codeMatches(p, colorCode));
  return hits;
}

export function computeSellOut(prods: ProductLike[]): SellOutCheck {
  const map: Record<string, SizeLine> = {};
  let ordered = 0,
    sold = 0;
  for (const p of prods) {
    ordered += Number(p.unitsOrdered || 0);
    sold += Number(p.unitsSold || 0);
    const keys = new Set([...Object.keys(p.sizesOrdered || {}), ...Object.keys(p.sizesSold || {})]);
    keys.forEach((sz) => {
      const o = Number((p.sizesOrdered || {})[sz] || 0);
      const s = Number((p.sizesSold || {})[sz] || 0);
      if (!map[sz]) map[sz] = { size: sz, ordered: 0, sold: 0, left: 0 };
      map[sz].ordered += o;
      map[sz].sold += s;
    });
  }
  const sizes = Object.values(map)
    .filter((l) => l.ordered > 0 || l.sold > 0)
    .map((l) => ({ ...l, left: Math.max(0, l.ordered - l.sold) }))
    .sort((a, b) => sizeSort(a.size, b.size));
  const sumO = sizes.reduce((a, l) => a + l.ordered, 0);
  const sumS = sizes.reduce((a, l) => a + l.sold, 0);
  return {
    found: prods.length > 0,
    sizes,
    ordered,
    sold,
    left: Math.max(0, ordered - sold),
    verified:
      prods.length > 0 &&
      sumO === ordered &&
      sumS === sold &&
      sizes.every((l) => l.sold <= l.ordered),
  };
}

export function sellOutFor(modelRef: string, products: ProductLike[], colorCode?: string) {
  return computeSellOut(matchModelProducts(modelRef, products, colorCode));
}

/** Extract model mentions like "Mossa G 0759", "Stelle 0919" from styling text. */
export function extractModelMentions(text: string): { name: string; code: string }[] {
  const clean = text.replace(/\(https?:\/\/[^)]*?\.(?:jpe?g|png|webp|gif)\)/gi, " ");
  const re = /\b([A-ZÀ-Þ][A-Za-zÀ-ÿ]*(?: [A-ZÀ-Þ](?![A-Za-zÀ-ÿ]))?)\s+(\d{4})\b/g;
  const out: { name: string; code: string }[] = [];
  const seen = new Set<string>();
  const skip = new Set(["Vetrina", "Look", "Bambola", "Variant", "Total"]);
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    if (skip.has(m[1])) continue;
    const k = `${m[1]}|${m[2]}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push({ name: m[1], code: m[2] });
    }
  }
  return out;
}

/** Split styling text into text and image segments (URLs in parentheses). */
export function splitStyling(
  text: string,
): ({ type: "text"; value: string } | { type: "img"; value: string })[] {
  const re = /\((https?:\/\/[^)]*?\.(?:jpe?g|png|webp|gif))\)/gi;
  const parts: any[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push({ type: "img", value: encodeURI(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts.filter((p) => p.type === "img" || p.value.trim());
}
