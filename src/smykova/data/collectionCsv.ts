// @ts-nocheck -- imported code, written for a looser TypeScript config
import collectionAsset from "../static/collection.csv.asset.json";
import { parseCsvString } from "../utils/excelParser";
import type { ModelTrainingData } from "./trainingData";

export interface CollectionRow {
  id: string;
  name: string;
  description: string;
  colors: { name: string; code: string; image: string | null }[];
  styling: string[];
  salesTips: string[];
  objections: { objection: string; response: string }[];
}

let cache: Promise<CollectionRow[]> | null = null;

function parseColors(raw: string) {
  return (raw || "")
    .split(" | ")
    .map((part) => {
      const idx = part.indexOf(": ");
      const label = idx >= 0 ? part.slice(0, idx) : part;
      const url = idx >= 0 ? part.slice(idx + 2).trim() : "";
      const m = label.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
      return {
        name: (m ? m[1] : label).trim(),
        code: m ? m[2].trim() : "",
        image: /^https?:\/\//.test(url) ? url : null,
      };
    })
    .filter((c) => c.name);
}

function getStandardModelObjections(modelName: string) {
  const name = modelName || "questo modello";
  return [
    {
      objection: `Il design di ${name} sembra troppo essenziale`,
      response: `L'autentica eleganza Luisa Spagnoli risiede nella purezza delle linee; ${name} è concepito come una tela sartoriale che esalta la nobiltà dei tessuti e degli accessori.`,
    },
    {
      objection: `Timore sulla portabilità delle tonalità proposte`,
      response: `Le varianti colore di ${name} sono state accuratamente calibrate dai nostri stilisti per valorizzare ogni incarnato con un'allure sofisticata e senza tempo.`,
    },
    {
      objection: `Come abbinare ${name} nei look quotidiani o da sera?`,
      response: `Si presta a molteplici interpretazioni: perfetto di giorno con capispalla coordinati o accessori iconici, e luminoso di sera con gioielli scultura e calzature d'impatto.`,
    },
    {
      objection: `Richiesta di dettagli sulla cura e durata del capo`,
      response: `Ogni creazione Luisa Spagnoli nasce da fibre selezionate e controlli artigianali rigorosi, garantendo comfort sensoriale e durata eccezionale nel corso delle stagioni.`,
    },
  ];
}

function parseObjections(raw: string, modelName: string = "") {
  const cleaned = (raw || "")
    .replace(/!\[\]\([^)]*\)(\{[^}]*\})?/g, " ")
    .replace(/^\s*Возражение\s+Стратегия преодоления\s*/, "")
    .replace(/---/g, "—")
    .trim();

  // If contains explicit separators || or ->
  if (cleaned.includes("||") || cleaned.includes("->")) {
    const parsed = cleaned
      .split("||")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const i = s.indexOf("->");
        if (i < 0) return { objection: s, response: "" };
        const q = s
          .slice(0, i)
          .trim()
          .replace(/^\[|\]$/g, "")
          .trim();
        return { objection: q, response: s.slice(i + 2).trim() };
      })
      .filter((item) => item.objection || item.response);

    if (parsed.length >= 2) {
      return parsed;
    }
  }

  // Single block or unstructured text: automatic sentence pairing & reconstruction
  const sentences = cleaned
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  const pairs: { objection: string; response: string }[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const objection = sentences[i];
    const response = sentences[i + 1] || objection;
    if (objection) {
      pairs.push({
        objection: objection.replace(/^\[|\]$/g, "").trim(),
        response: response.replace(/^\[|\]$/g, "").trim(),
      });
    }
  }

  if (pairs.length < 2) {
    return getStandardModelObjections(modelName);
  }

  return pairs;
}

export function loadCollectionCsv(): Promise<CollectionRow[]> {
  if (!cache) {
    cache = fetch(collectionAsset.url)
      .then((r) => r.text())
      .then(async (text) => {
        const rows = parseCsvString(text.replace(/^\uFEFF/, ""), ";");
        const stylingText = await fetch("/assets/226FWCollectionMultilingua.csv").then((r) => r.text());
        const stylingRows = parseCsvString(stylingText.replace(/^\uFEFF/, ""), "\t");
        const stylingByModel = new Map(
          stylingRows.slice(1).filter((r) => r && r[1]).map((r) => [norm(String(r[1])), String(r[5] || "")]),
        );
        return rows
          .slice(1)
          .filter((r) => r && r[1])
          .map((r) => ({
            id: String(r[0] || "").trim(),
            name: String(r[1] || "").trim(),
            description: String(r[2] || "").trim(),
            colors: parseColors(String(r[3] || "")),
            styling: String(stylingByModel.get(norm(String(r[1]))) || r[5] || "")
              .split(/\s*\|\s*/)
              .map((s) => s.trim())
              .filter(Boolean),
            salesTips: String(r[6] || "")
              .split("|")
              .map((s) =>
                s
                  .trim()
                  .replace(/^[-–•]\s*/, "")
                  .replace(/^\d+[.)]\s*/, ""),
              )
              .filter(Boolean),
            objections: parseObjections(String(r[7] || ""), String(r[1] || "").trim()),
          }));
      })
      .catch((e) => {
        cache = null;
        throw e;
      });
  }
  return cache;
}

const norm = (s: string) => (s || "").trim().toUpperCase().replace(/\s+/g, " ");

export function findCollectionRow(rows: CollectionRow[], modelName: string): CollectionRow | null {
  const n = norm(modelName);
  if (!n) return null;
  const exact = rows.find((r) => norm(r.name) === n);
  if (exact) return exact;
  const first = n.split(" ")[0];
  return (
    rows.find((r) => norm(r.name) === first) ||
    rows.find((r) => norm(r.name).split(" ")[0] === first) ||
    null
  );
}

const all = <T>(v: T) => ({ it: v, en: v, ru: v, pl: v });

export function trainingDataFromCsv(row: CollectionRow, fallbackImage?: string): ModelTrainingData {
  const firstImg = row.colors.find((c) => c.image)?.image || fallbackImage || "";
  return {
    modelName: row.name,
    modelId: `ID #${row.id}`,
    season: {
      it: "Scheda di Formazione Autunno-Inverno 2026/2027",
      en: "Training Materials Fall-Winter 2026/2027",
      ru: "Учебные материалы Осень-Зима 2026/2027",
      pl: "Materiały szkoleniowe Jesień-Zima 2026/2027",
    },
    heroImage: firstImg,
    hasTechnicalData: true,
    description: all(row.description),
    colors: row.colors.map((c) => ({
      name: all(c.name),
      code: c.code,
      image: c.image || firstImg,
    })),
    stylingLooks: all([]),
    stylingRaw: row.styling,
    salesTips: all(row.salesTips),
    objections: all(row.objections),
  };
}
