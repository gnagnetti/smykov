// @ts-nocheck -- imported code, written for a looser TypeScript config
import React, { useState, useEffect } from "react";
import staticOrders from "../static/orders.xlsx.asset.json";
import staticPhotos from "../static/photos.xlsx.asset.json";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Download,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  parseOrdersFile,
  parsePhotoCatalogFile,
  parseSellOutFile,
  mergeOrderAndSellOut,
} from "../utils/excelParser";
import { downloadSampleSellOutCsv } from "../utils/exportUtils";
import { BoutiqueInfo, MergedProduct, OrderItem, SellOutItem, StylePhoto } from "../types";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrders: OrderItem[];
  preloadedSelloutFile?: File | null;
  preloadedClientInfo?: Partial<BoutiqueInfo> | null;
  onDataParsed: (
    products: MergedProduct[],
    orders: OrderItem[],
    info: Partial<BoutiqueInfo>,
    label: string,
  ) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  currentOrders,
  preloadedSelloutFile,
  preloadedClientInfo,
  onDataParsed,
}) => {
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [photosFile, setPhotosFile] = useState<File | null>(null);
  const [selloutFile, setSelloutFile] = useState<File | null>(null);

  const [parsing, setParsing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync preloaded sellout file from Data Engineer Converter
  useEffect(() => {
    if (isOpen && preloadedSelloutFile) {
      setSelloutFile(preloadedSelloutFile);
      setStatusMsg(`Файл «${preloadedSelloutFile.name}» загружен из конвертера.`);
    }
  }, [isOpen, preloadedSelloutFile]);

  // Static databases: always preload the orders file and the photo catalog
  useEffect(() => {
    if (!isOpen) return;
    const load = async (url: string, name: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${name}: ${res.status}`);
      return new File([await res.blob()], name, {
        type: name.endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    };
    if (!ordersFile)
      load(staticOrders.url, "6_Orders_2026-10-28.xlsx").then(setOrdersFile).catch(console.error);
    if (!photosFile)
      load(staticPhotos.url, "226FWCollectionMultilingua.csv")
        .then(setPhotosFile)
        .catch(console.error);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoadAttachedCsv = async () => {
    setParsing(true);
    setStatusMsg("Загрузка и проверка файла продаж (418 изделий)...");
    setErrorMsg(null);
    try {
      const { loadAttachedCsvSellOut } = await import("../utils/excelParser");
      const { INITIAL_ORDERS } = await import("../data/initialData");
      const items = await loadAttachedCsvSellOut();
      const baseOrders = ordersFile
        ? (await parseOrdersFile(ordersFile)).orders
        : currentOrders.length > 0
          ? currentOrders
          : INITIAL_ORDERS;
      const merged = mergeOrderAndSellOut(baseOrders, [], items);
      onDataParsed(merged, baseOrders, {}, "Проверенный отчёт о продажах (418 изделий)");
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Ошибка загрузки файла: ${err.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleProcessFiles = async () => {
    if (!ordersFile && !photosFile && !selloutFile) {
      setErrorMsg("Выберите хотя бы один файл Excel или CSV для обработки.");
      return;
    }

    setParsing(true);
    setStatusMsg("Чтение и обработка файлов...");
    setErrorMsg(null);

    try {
      const { INITIAL_ORDERS } = await import("../data/initialData");
      let parsedOrders: OrderItem[] = currentOrders.length > 0 ? currentOrders : INITIAL_ORDERS;
      let parsedInfo: Partial<BoutiqueInfo> = preloadedClientInfo ? { ...preloadedClientInfo } : {};
      let parsedPhotos: StylePhoto[] = [];
      let parsedSellOuts: SellOutItem[] = [];

      if (ordersFile) {
        setStatusMsg("Обработка заказов JOOR (несколько листов)...");
        try {
          const res = await parseOrdersFile(ordersFile);
          parsedOrders = res.orders;
          parsedInfo = { ...parsedInfo, ...res.boutiqueInfo };
        } catch (e: any) {
          throw new Error(
            `Файл заказов «${ordersFile.name}»: ${e?.message || "неизвестный формат"}`,
          );
        }
      }

      if (photosFile) {
        setStatusMsg("Подключение каталога фотографий и моделей...");
        try {
          parsedPhotos = await parsePhotoCatalogFile(photosFile);
        } catch (e: any) {
          throw new Error(
            `Каталог фотографий «${photosFile.name}»: ${e?.message || "неизвестный формат"}`,
          );
        }
      }

      if (selloutFile) {
        setStatusMsg("Анализ отчёта о продажах (.CSV или .XLSX)...");
        try {
          parsedSellOuts = await parseSellOutFile(selloutFile);
        } catch (e: any) {
          throw new Error(
            `Отчёт о продажах «${selloutFile.name}»: ${e?.message || "неизвестный формат"}`,
          );
        }
      }

      setStatusMsg("Сверка данных и расчёт процента продаж...");
      const merged = mergeOrderAndSellOut(parsedOrders, parsedPhotos, parsedSellOuts);

      const totalSold = parsedSellOuts.reduce((a, b) => a + (b.qtySold || 1), 0);
      const sourceFiles = [ordersFile, photosFile, selloutFile].filter(Boolean).map((file) => file.name);
      const savedTime = new Date().toLocaleString("ru-RU");
      const label = `Сохранено · ${sourceFiles.join(", ")} · ${savedTime} (моделей: ${merged.length} · продано: ${totalSold} шт.)`;
      onDataParsed(merged, parsedOrders, parsedInfo, label);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Ошибка обработки файла: ${err.message || "Неверный формат файла"}`);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-stone-100 p-2 text-stone-500 hover:bg-stone-200 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-amber-800" />
            <h2 className="font-serif-luxury text-2xl font-semibold text-stone-900">
              Загрузить заказы и продажи (Excel / CSV)
            </h2>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Поддерживаются официальные файлы <strong>.XLSX</strong> и файлы <strong>.CSV</strong>
            в табличном формате (<code>Модель,Цвет,Размер,Количество</code>).
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && (
          <div className="mt-4 flex items-center gap-2 rounded bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-800 border-t-transparent" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Preloaded File Banner from Data Engineer Converter */}
        {selloutFile && (
          <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50/90 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                  <span>Загружен файл, созданный конвертером:</span>
                  <span className="font-mono text-emerald-900 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300 font-bold">
                    {selloutFile.name}
                  </span>
                </span>
                <p className="text-[11px] text-emerald-800/90 mt-0.5">
                  Созданный конвертером файл добавлен в поле продаж. Нажмите <strong>«Обработать»</strong>, чтобы загрузить данные в панель.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleProcessFiles}
              disabled={parsing}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-800 transition active:scale-95 cursor-pointer shrink-0"
            >
              <span>Обработать</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Quick Load Attached CSV Button */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
              <span>Проверенный файл продаж (export_ordinato)</span>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 border border-emerald-300">
                418 Capi Venduti Accertati
              </span>
            </span>
            <p className="text-[11px] text-amber-800/80 mt-0.5">
              Полный проверенный набор: 358 строк, продано 418 изделий (включая <strong>Orlato</strong>: 4 шт., размеры 40, 42, 44, 46).
            </p>
          </div>
          <button
            type="button"
            onClick={handleLoadAttachedCsv}
            disabled={parsing}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-amber-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-amber-800 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <span>Загрузить данные о 418 продажах</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* 1. Orders File */}
          <div className="rounded-lg border border-stone-200 p-4 transition hover:border-stone-400">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                  1. Файл заказов с несколькими листами (JOOR)
                </span>
                <p className="text-xs text-stone-500 mt-0.5">
                  Es.{" "}
                  <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">
                    4_Orders_2026-10-26.xlsx
                  </code>{" "}
                  (fogli PO# 18827955, 18827970, ecc.)
                </p>
              </div>
              {ordersFile ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Selezionato
                </span>
              ) : (
                <span className="text-xs text-stone-400 font-mono">.xlsx</span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="file"
                accept=".xlsx, .xls"
                id="file-orders"
                className="hidden"
                onChange={(e) => setOrdersFile(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="file-orders"
                className="cursor-pointer inline-flex items-center gap-1.5 rounded border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100 transition"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-stone-600" />
                <span>{ordersFile ? ordersFile.name : "Выбрать файл заказов"}</span>
              </label>
              {ordersFile && (
                <button
                  onClick={() => setOrdersFile(null)}
                  className="text-xs text-stone-400 hover:text-stone-700"
                >
                  Rimuovi
                </button>
              )}
            </div>
          </div>

          {/* 2. Photo Database File (226FWCollectionMultilingua) */}
          <div className="rounded-lg border border-stone-200 p-4 transition hover:border-stone-400">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <span>2. Каталог фотографий моделей</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                    226FWCollectionMultilingua
                  </span>
                </span>
                <p className="text-xs text-stone-500 mt-0.5">
                  Файл многоязычного каталога фотографий:{" "}
                  <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">
                    226FWCollectionMultilingua.csv
                  </code>{" "}
                  oppure{" "}
                  <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">
                    file foto style.xlsx
                  </code>{" "}
                  (автоматически определяет столбцы фото, модели, цвета и категории).
                </p>
              </div>
              {photosFile ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Selezionato
                </span>
              ) : (
                <span className="text-xs text-stone-400 font-mono">.csv / .xlsx</span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="file"
                accept=".csv, .tsv, .xlsx, .xls"
                id="file-photos"
                className="hidden"
                onChange={(e) => setPhotosFile(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="file-photos"
                className="cursor-pointer inline-flex items-center gap-1.5 rounded border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100 transition"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-stone-600" />
                <span>
                  {photosFile ? photosFile.name : "Выбрать каталог 226FWCollectionMultilingua.csv / xls"}
                </span>
              </label>
              {photosFile && (
                <button
                  onClick={() => setPhotosFile(null)}
                  className="text-xs text-stone-400 hover:text-stone-700"
                >
                  Rimuovi
                </button>
              )}
            </div>
          </div>

          {/* 3. Sell-Out Report File (CSV or XLSX) */}
          <div className="rounded-lg border border-stone-200 p-4 transition hover:border-stone-400">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <span>3. Отчёт о продажах бутика</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                    .CSV o .XLSX
                  </span>
                </span>
                <p className="text-xs text-stone-500 mt-0.5">
                  Загрузите отчёт о продажах в формате <strong>.CSV</strong> (например, экспорт 1C/кассы с разделителем-запятой <code>,</code> или точкой с запятой <code>;</code>) либо в формате <strong>.XLSX</strong>.
                </p>
              </div>
              {selloutFile ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                  {selloutFile.name.toLowerCase().endsWith(".csv") ? "CSV Pronto" : "Excel Pronto"}
                </span>
              ) : (
                <span className="text-xs text-stone-400 font-mono">.csv / .xlsx</span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".csv, .tsv, .txt, .xlsx, .xls, text/csv"
                id="file-sellout"
                className="hidden"
                onChange={(e) => setSelloutFile(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="file-sellout"
                className="cursor-pointer inline-flex items-center gap-1.5 rounded border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100 transition"
              >
                <FileText className="h-3.5 w-3.5 text-amber-800" />
                <span>
                  {selloutFile ? selloutFile.name : "Выбрать файл продаж (.CSV или .XLSX)"}
                </span>
              </label>

              {selloutFile && (
                <button
                  onClick={() => setSelloutFile(null)}
                  className="text-xs text-stone-400 hover:text-stone-700"
                >
                  Rimuovi
                </button>
              )}

              <button
                type="button"
                onClick={downloadSampleSellOutCsv}
                className="inline-flex items-center gap-1 text-[11px] text-amber-900 hover:text-amber-950 underline decoration-stone-300 ml-auto"
                title="Скачать пример CSV с данными о продажах"
              >
                <Download className="h-3 w-3" />
                <span>Скачать пример CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
          <button
            onClick={onClose}
            className="rounded border border-stone-200 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
          >
            Отмена
          </button>
          <button
            onClick={handleProcessFiles}
            disabled={parsing || (!ordersFile && !photosFile && !selloutFile)}
            className="inline-flex items-center gap-1.5 rounded bg-stone-900 px-5 py-2 text-xs font-medium text-white shadow transition hover:bg-stone-800 disabled:opacity-50"
          >
            <span>{parsing ? "Обработка..." : "Обработать и обновить панель"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
