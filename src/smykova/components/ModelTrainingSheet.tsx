// @ts-nocheck -- imported code, written for a looser TypeScript config
import React, { useState, useMemo, useEffect } from "react";
import {
  loadCollectionCsv,
  findCollectionRow,
  trainingDataFromCsv,
  CollectionRow,
} from "../data/collectionCsv";
import {
  ModelTrainingData,
  TrainingLanguage,
  LANGUAGE_LABELS,
  getModelTrainingData,
  generateTrainingHtmlOutput,
  checkModelStockAndOrderStatus,
  formatAvailabilityLabels,
} from "../data/trainingData";
import { MergedProduct, OrderItem } from "../types";
import { sellOutFor, extractModelMentions, splitStyling, SellOutCheck } from "../utils/sellOut";

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mt-10">
    <div className="border-b border-stone-200 pb-2 mb-4">
      <h2 className="text-xs font-bold tracking-[0.18em] text-stone-600 uppercase">{title}</h2>
    </div>
    {children}
  </div>
);

export const SizeCards: React.FC<{ check: SellOutCheck; compact?: boolean }> = ({
  check,
  compact,
}) => {
  if (!check.found || check.sizes.length === 0)
    return <p className="text-xs text-stone-500">Не заказано · нет в ассортименте бутика</p>;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {check.sizes.map((l) => (
          <div
            key={l.size}
            className={`rounded-lg border text-center ${compact ? "px-2.5 py-1.5 min-w-[82px]" : "px-4 py-2.5 min-w-[110px]"} ${l.left === 0 ? "border-rose-200 bg-rose-50/60" : "border-emerald-200 bg-emerald-50/60"}`}
          >
            <div
              className={`font-mono font-bold ${compact ? "text-xs" : "text-sm"} ${l.left === 0 ? "text-rose-900" : "text-emerald-900"}`}
            >
              Размер {l.size}
            </div>
            <div className={`${compact ? "text-[11px]" : "text-sm"} text-stone-700`}>
              Продано: <b>{l.sold}</b>/{l.ordered}
            </div>
            <div className={`${compact ? "text-[10px]" : "text-xs"} text-stone-400`}>
              {l.left === 0 ? "Распродано" : `Осталось: ${l.left}`}
            </div>
          </div>
        ))}
      </div>
      <div
        className={`mt-1.5 text-[10px] ${check.verified ? "text-emerald-700" : "text-rose-700"}`}
      >
        {check.verified
          ? `✓ Проверено: продано ${check.sold}/${check.ordered}, осталось ${check.left}`
          : `⚠ Расхождение: продано ${check.sold} при заказе ${check.ordered} — проверьте данные sell-out`}
      </div>
    </div>
  );
};
import {
  Sparkles,
  Globe,
  Printer,
  Copy,
  Check,
  FileCode,
  Upload,
  Layers,
  ChevronDown,
  Info,
} from "lucide-react";

interface ModelTrainingSheetProps {
  modelName: string;
  modelNumber?: string;
  image?: string;
  silhouette?: string;
  colorName?: string;
  fabrication?: string;
  products?: MergedProduct[];
  orders?: OrderItem[];
}

export const ModelTrainingSheet: React.FC<ModelTrainingSheetProps> = ({
  modelName,
  modelNumber,
  image,
  silhouette,
  colorName,
  fabrication,
  products = [],
  orders = [],
}) => {
  // Default language is Russian (matching the provided PDF Caprese-B-ru) or Italian
  const [lang, setLang] = useState<TrainingLanguage>("ru"); // monolingual Russian;
  const [copied, setCopied] = useState(false);
  const [viewHtmlCode, setViewHtmlCode] = useState(false);
  const [customJson, setCustomJson] = useState<any | null>(null);
  const [showJsonUploader, setShowJsonUploader] = useState(false);

  const sheetRef = React.useRef<HTMLDivElement>(null);
  const [csvRows, setCsvRows] = useState<CollectionRow[] | null>(null);
  useEffect(() => {
    loadCollectionCsv()
      .then(setCsvRows)
      .catch((e) => console.error("CSV collezione", e));
  }, []);
  const csvRow = useMemo(
    () => (csvRows ? findCollectionRow(csvRows, modelName) : null),
    [csvRows, modelName],
  );
  const modelStock = useMemo(
    () => checkModelStockAndOrderStatus(modelName, products, orders),
    [modelName, products, orders],
  );

  // Compute base training data
  const trainingData = useMemo<ModelTrainingData>(() => {
    if (customJson && customJson.modelName) {
      // If user uploaded a custom JSON matching Fonte A, C, D, E, 4
      return customJson as ModelTrainingData;
    }
    if (csvRow) return trainingDataFromCsv(csvRow, image);
    return getModelTrainingData(modelName, modelNumber, image, silhouette, colorName, fabrication);
  }, [modelName, modelNumber, image, silhouette, colorName, fabrication, customJson, csvRow]);

  const mainCheck = useMemo(
    () => sellOutFor(trainingData.modelName, products),
    [trainingData.modelName, products],
  );
  const stylingLooks = useMemo(
    () =>
      ((trainingData as any).stylingRaw || [])
        .filter((t: string) => t && !/Данные отсутствуют/.test(t))
        .map((t: string) => ({
          parts: splitStyling(t),
          mentions: extractModelMentions(t).map((m) => ({
            ...m,
            check: sellOutFor(m.name, products, m.code),
          })),
        })),
    [trainingData, products],
  );

  const htmlOutput = useMemo(() => {
    return generateTrainingHtmlOutput(trainingData, lang, products, orders);
  }, [trainingData, lang, products, orders]);

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy HTML:", err);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${trainingData.modelName} - Luisa Spagnoli</title>
          ${Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map((n) => n.outerHTML)
            .join("")}
          <style>
            body { font-family: 'Georgia', serif; margin: 40px; color: #1c1917; }
            img { max-width: 100%; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
            th { background-color: #f9fafb; }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${sheetRef.current ? sheetRef.current.outerHTML : htmlOutput}
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setCustomJson(parsed);
        setShowJsonUploader(false);
      } catch (err) {
        alert("File JSON non valido.");
      }
    };
    reader.readAsText(file);
  };

  const sectionHeaders = {
    it: {
      analysis: `ANALISI ${trainingData.modelName.toUpperCase()}`,
      desc: "DESCRIZIONE",
      colors: "VARIANTI COLORE",
      styling: "STYLING & VETRINE",
      sales: "CONSIGLI DI VENDITA",
      objections: "GESTIONE OBIEZIONI",
      objCol: "Obiezione della Cliente",
      respCol: "Risposta Strategica del Training Expert",
    },
    en: {
      analysis: `ANALYSIS ${trainingData.modelName.toUpperCase()}`,
      desc: "DESCRIPTION",
      colors: "COLOR VARIANTS",
      styling: "STYLING & SHOWCASES",
      sales: "SELLING TIPS",
      objections: "OBJECTION HANDLING",
      objCol: "Customer Objection",
      respCol: "Strategic Sales Response",
    },
    ru: {
      analysis: `АНАЛИЗ ${trainingData.modelName.toUpperCase()}`,
      desc: "ОПИСАНИЕ",
      colors: "ВАРИАНТЫ ЦВЕТА",
      styling: "СТАЙЛИНГ И СОЧЕТАНИЯ",
      sales: "СОВЕТЫ ПО ПРОДАЖАМ",
      objections: "УПРАВЛЕНИЕ ВОЗРАЖЕНИЯМИ",
      objCol: "Возражение клиента",
      respCol: "Стратегический ответ эксперта",
    },
    pl: {
      analysis: `ANALIZA ${trainingData.modelName.toUpperCase()}`,
      desc: "OPIS",
      colors: "WARIANTY KOLORYSTYCZNE",
      styling: "STYLIZACJA I WITRYNY",
      sales: "WSKAZÓWKI SPRZEDAŻOWE",
      objections: "ZARZĄDZANIE OBIEKCJAMI",
      objCol: "Obiekcja Klientki",
      respCol: "Strategiczna odpowiedź doradcy",
    },
  }[lang];

  return (
    <div className="mt-8 border-t-2 border-stone-200 pt-8">
      {/* Luxury Editorial Header & Control Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-900 font-semibold">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>Virtual Training Expert · Luisa Spagnoli Haute Couture</span>
          </div>
          <h3 className="mt-1 font-serif-luxury text-2xl font-bold tracking-tight text-stone-900">
            Scheda Formativa del Modello
          </h3>
          <p className="text-xs text-stone-500">
            Formato editoriale ufficiale sincronizzato con il lookbook e il catalogo foto
          </p>
        </div>

        {/* Action Controls & Language Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy HTML Button */}
          <button
            onClick={handleCopyHtml}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition shadow-2xs"
            title="Copia codice HTML come da istruzioni"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copiato!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-stone-500" />
                <span>Copia HTML</span>
              </>
            )}
          </button>

          {/* Print PDF Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition shadow-2xs"
            title="Stampa o esporta scheda in PDF"
          >
            <Printer className="h-3.5 w-3.5 text-stone-500" />
            <span>Stampa PDF</span>
          </button>

          {/* Code View Toggle */}
          <button
            onClick={() => setViewHtmlCode(!viewHtmlCode)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition shadow-2xs ${
              viewHtmlCode
                ? "border-amber-400 bg-amber-50 text-amber-900"
                : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            <FileCode className="h-3.5 w-3.5 text-stone-500" />
            <span>{viewHtmlCode ? "Vista Scheda" : "Sorgente HTML"}</span>
          </button>

          {/* Upload JSON Button */}
          <button
            onClick={() => setShowJsonUploader(!showJsonUploader)}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition shadow-2xs"
            title="Carica un file JSON con fonti A, C, D, E, 4"
          >
            <Upload className="h-3.5 w-3.5 text-stone-500" />
            <span>Carica JSON</span>
          </button>
        </div>
      </div>

      {/* JSON File Uploader Box (Collapsible) */}
      {showJsonUploader && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                Caricamento File JSON di Formazione
              </h4>
              <p className="mt-1 text-xs text-amber-800">
                Puoi caricare un file JSON contenente le fonti (Fonte A: immagini URL, Fonte C:
                descrizioni, Fonte D: lookbook, Fonte E: varianti colore, Fonte 4: vetrine).
              </p>
              <div className="mt-3 flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-900 transition">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Seleziona file .json</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleJsonUpload}
                    className="hidden"
                  />
                </label>
                {customJson && (
                  <button
                    onClick={() => setCustomJson(null)}
                    className="text-xs text-stone-500 underline hover:text-stone-800"
                  >
                    Ripristina scheda modello predefinita
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HTML Code Inspection View */}
      {viewHtmlCode ? (
        <div className="mt-6 rounded-xl border border-stone-300 bg-stone-900 p-4 text-stone-100">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800 text-xs">
            <span className="font-mono text-stone-400">
              Codice HTML Generato ({lang.toUpperCase()})
            </span>
            <button
              onClick={handleCopyHtml}
              className="text-amber-300 hover:text-amber-200 underline font-medium"
            >
              {copied ? "Copiato!" : "Copia codice negli appunti"}
            </button>
          </div>
          <pre className="mt-3 max-h-96 overflow-x-auto overflow-y-auto text-[11px] font-mono leading-relaxed text-amber-100/90 whitespace-pre-wrap">
            {htmlOutput}
          </pre>
        </div>
      ) : (
        <div
          ref={sheetRef}
          className="mt-6 rounded-xl border border-stone-200 bg-white p-6 sm:p-10 shadow-sm"
        >
          {/* Header Bar identical to PDF Page 1 */}
          <div className="border-b border-stone-200 pb-5">
            <div className="text-xs font-bold tracking-[0.25em] text-stone-900 uppercase">
              LUISA SPAGNOLI
            </div>
            <div className="mt-1 text-xs text-stone-500 font-sans-clean">
              {trainingData.season[lang]}
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <h1 className="font-serif-luxury text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight">
                {trainingData.modelName}
              </h1>
              <span className="font-mono text-sm text-stone-400 tracking-wider">
                {trainingData.modelId}
              </span>
            </div>
          </div>

          {/* Hero Garment Image Showcase (Boxed like PDF Page 1) */}
          <div className="mt-8 rounded-lg border border-stone-200 bg-stone-50/50 p-6 flex justify-center">
            <div className="relative max-w-sm overflow-hidden rounded bg-white shadow-2xs">
              <img
                src={trainingData.heroImage}
                alt={trainingData.modelName}
                className="max-h-[380px] w-auto object-contain mx-auto"
              />
              <div className="border-t border-stone-100 px-3 py-2 text-center text-[11px] text-stone-600">
                Sell-in / Sell-out: {mainCheck.ordered} / {mainCheck.sold} capi · {mainCheck.ordered ? ((mainCheck.sold / mainCheck.ordered) * 100).toFixed(1) : "0.0"}%
              </div>
            </div>
          </div>

          {/* НАЛИЧИЕ ПО РАЗМЕРАМ — loop check */}
          <Section title="НАЛИЧИЕ ПО РАЗМЕРАМ">
            <SizeCards check={mainCheck} />
          </Section>

          {/* ОПИСАНИЕ — exactly the "Descrizione" column */}
          <Section title="ОПИСАНИЕ">
            <p className="text-sm sm:text-base leading-relaxed text-stone-800 font-sans-clean text-justify whitespace-pre-line">
              {trainingData.description.ru}
            </p>
          </Section>

          {/* ВАРИАНТЫ ЦВЕТА — remaining stock under each color */}
          <Section title="ВАРИАНТЫ ЦВЕТА">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trainingData.colors.map((color, idx) => {
                const ck = sellOutFor(trainingData.modelName, products, color.code);
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-stone-200 bg-white p-3 shadow-2xs"
                  >
                    <div className="aspect-[4/5] overflow-hidden rounded bg-stone-50 flex items-center justify-center">
                      {color.image && (
                        <img
                          src={encodeURI(color.image)}
                          alt={color.name.ru}
                          className="h-full w-full object-contain p-1"
                        />
                      )}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-stone-900 text-center">
                      {color.name.ru} {color.code && `(${color.code})`}
                    </div>
                    <div className="mt-2">
                      <SizeCards check={ck} compact />
                      <p className="mt-2 text-center text-[10px] text-stone-500">
                        Sell-in / Sell-out: {ck.ordered} / {ck.sold} · {ck.ordered ? ((ck.sold / ck.ordered) * 100).toFixed(1) : "0.0"}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* СТАЙЛИНГ И СОЧЕТАНИЯ — URL images + sell-out of each cited model */}
          {stylingLooks.length > 0 && (
            <Section title="STYLING">
              <div className="space-y-6">
                {stylingLooks.map((look, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-stone-200 bg-stone-50/40 p-4 sm:p-5"
                  >
                    <div className="text-sm leading-relaxed text-stone-800">
                      {look.parts.map((part, j) =>
                        part.type === "img" ? (
                          <span key={j} className="m-1 inline-flex flex-col align-middle rounded border border-stone-200 bg-white p-1">
                            <img
                              src={part.value}
                              alt=""
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                              className="h-28 w-24 object-contain"
                            />
                            <span className="mt-1 text-center text-[9px] text-stone-500">
                              Sell-in / Sell-out {mainCheck.ordered}/{mainCheck.sold} · {mainCheck.ordered ? ((mainCheck.sold / mainCheck.ordered) * 100).toFixed(1) : "0.0"}%
                            </span>
                          </span>
                        ) : (
                          <span key={j}>{part.value}</span>
                        ),
                      )}
                    </div>
                    {look.mentions.length > 0 && (
                      <div className="mt-4 space-y-3 border-t border-stone-200 pt-3">
                        {look.mentions.map((mn, k) => (
                          <div key={k}>
                            <div className="mb-1.5 font-mono text-xs font-bold text-stone-900">
                              {mn.name} {mn.code}
                            </div>
                            <SizeCards check={mn.check} compact />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* СОВЕТЫ — "Consigli di Vendita" */}
          <Section title="СОВЕТЫ">
            <ol className="space-y-3 pl-2 text-sm text-stone-800 leading-relaxed font-sans-clean">
              {trainingData.salesTips.ru.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-900 text-xs mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ol>
          </Section>

          {/* УПРАВЛЕНИЕ ВОЗРАЖЕНИЯМИ — objection left, response right */}
          <Section title="УПРАВЛЕНИЕ ВОЗРАЖЕНИЯМИ">
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/70 text-stone-700">
                    <th className="p-3 sm:p-4 font-semibold w-2/5">Возражение клиента</th>
                    <th className="p-3 sm:p-4 font-semibold w-3/5">Стратегический ответ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {trainingData.objections.ru.map((obj, idx) => (
                    <tr key={idx}>
                      <td className="p-3 sm:p-4 font-semibold text-stone-900 align-top bg-stone-50/30">
                        {obj.objection}
                      </td>
                      <td className="p-3 sm:p-4 text-stone-700 leading-relaxed align-top">
                        {obj.response}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Footer note & model signature */}
          <div className="mt-10 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
            <span>Luisa Spagnoli Fashion Training Portal</span>
            <span className="font-mono">{trainingData.modelName} · Pagina Ufficiale</span>
          </div>
        </div>
      )}
    </div>
  );
};
