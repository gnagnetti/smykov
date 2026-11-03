import { describe, it, expect } from "vitest";
import { sellOutFor, extractModelMentions } from "../smykova/utils/sellOut";

const p = (
  styleName: string,
  colorCode: string,
  o: Record<string, number>,
  s: Record<string, number>,
) => ({
  styleName,
  styleClean: styleName.toUpperCase(),
  colorCode,
  unitsOrdered: Object.values(o).reduce((a, b) => a + b, 0),
  unitsSold: Object.values(s).reduce((a, b) => a + b, 0),
  sizesOrdered: o,
  sizesSold: s,
});
const products = [
  p("Mossa G", "0759", { S: 2, M: 2, L: 2 }, { S: 2, M: 1, L: 2 }),
  p("Mossa G", "0101", { M: 1 }, {}),
  p("Mossa B", "0101", { M: 5 }, { M: 5 }),
];

describe("sell-out loop check", () => {
  it("shows sold/ordered and remaining per size", () => {
    const c = sellOutFor("Mossa G 0759", products, "0759");
    expect(c.sizes).toEqual([
      { size: "S", ordered: 2, sold: 2, left: 0 },
      { size: "M", ordered: 2, sold: 1, left: 1 },
      { size: "L", ordered: 2, sold: 2, left: 0 },
    ]);
    expect(c.verified).toBe(true);
  });
  it("does not mix Mossa G with Mossa B", () => {
    expect(sellOutFor("Mossa G", products).ordered).toBe(7);
  });
  it("finds cited models with color codes", () => {
    expect(
      extractModelMentions("с жакетом Moles 0759 (https://x/a.jpg) и брюками Minuccio A 0759"),
    ).toEqual([
      { name: "Moles", code: "0759" },
      { name: "Minuccio A", code: "0759" },
    ]);
  });
  it("extracts uppercase and accented model names from styling text", () => {
    expect(extractModelMentions("OPAGLIO 0927, Étoile 0101, MOSSA G 0759")).toEqual([
      { name: "OPAGLIO", code: "0927" },
      { name: "Étoile", code: "0101" },
      { name: "MOSSA G", code: "0759" },
    ]);
  });
  it("matches model names with suffixes and color codes without mixing other styles", () => {
    const catalog = [
      p("OPAGLIO P", "0927 (NERO)", { 40: 10 }, { 40: 9 }),
      p("OPAGLIO P", "2210", { 42: 4 }, { 42: 1 }),
      p("OPAL", "0927", { 40: 2 }, { 40: 2 }),
    ];
    expect(sellOutFor("OPAGLIO 0927", catalog, "0927")).toMatchObject({
      found: true,
      ordered: 10,
      sold: 9,
    });
    expect(sellOutFor("OPAGLIO", catalog).ordered).toBe(14);
  });
});

import { reconcileOrderedSold } from "../smykova/utils/excelParser";
describe("verification loop: sold never exceeds ordered", () => {
  it("raises ordered to sold per size (Marius case: 13 sold vs 1 ordered)", () => {
    const g = {
      unitsOrdered: 1,
      unitsSold: 13,
      sizesOrdered: { L: 1 },
      sizesSold: { S: 5, M: 5, L: 3 },
    };
    reconcileOrderedSold(g);
    expect(g.sizesOrdered).toEqual({ S: 5, M: 5, L: 3 });
    expect(g.unitsOrdered).toBe(13);
    expect(g.unitsSold).toBe(13);
  });
  it("leaves correct data untouched", () => {
    const g = {
      unitsOrdered: 6,
      unitsSold: 4,
      sizesOrdered: { S: 3, M: 3 },
      sizesSold: { S: 2, M: 2 },
    };
    expect(reconcileOrderedSold(g)).toBe(0);
    expect(g.unitsOrdered).toBe(6);
  });
});
