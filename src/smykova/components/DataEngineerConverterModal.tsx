// @ts-nocheck -- imported code, written for a looser TypeScript config
import React, { useState } from "react";
import { FileSpreadsheet, Download, CheckCircle2, AlertCircle, Cpu, ArrowRight, Code2, Copy, Check, Layers, Sparkles, X } from "lucide-react";
import { DataEngineerRow, convertExcelToDataEngineerWithClient, generateDataEngineerCsv } from "../utils/excelParser";
import { BoutiqueInfo } from "../types";

interface DataEngineerConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyConvertedData?: (rows: DataEngineerRow[], clientInfo?: Partial<BoutiqueInfo>) => void;
  onOpenUploadWithFile?: (file: File, clientInfo?: Partial<BoutiqueInfo>) => void;
}

export const DataEngineerConverterModal: React.FC<DataEngineerConverterModalProps> = ({ isOpen, onClose, onApplyConvertedData, onOpenUploadWithFile }) => {
  const [activeTab, setActiveTab] = useState<"app" | "script">("app");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<DataEngineerRow[]>([]);
  const [parsedClientInfo, setParsedClientInfo] = useState<Partial<BoutiqueInfo> | null>(null);
  const [scriptCopied, setScriptCopied] = useState(false);

  if (!isOpen) return null;

  const pythonColabScript = `import pandas as pd
from google.colab import files

print("1. Загрузите файл Excel:")
uploaded = files.upload()
file_name = list(uploaded.keys())[0]
df = pd.read_excel(file_name, header=None)
parsed_rows = []
for idx in range(10, len(df)):
    row = df.iloc[idx]
    style = str(row[0]).strip()
    if style == 'Итого' or style == 'nan' or not style:
        continue
    desc = str(row[1]).strip()
    units = row[3]
    if desc == 'nan' or ',' not in desc:
        continue
    parts = [p.strip() for p in desc.split(',')]
    name = parts[0] if len(parts) > 0 else ""
    size = parts[1] if len(parts) > 1 else ""
    color = parts[2] if len(parts) > 2 else ""
    parsed_rows.append({'Style': style, 'Name': name, 'Color': color, 'Size': size, 'Units': units})
df_final = pd.DataFrame(parsed_rows)
required_columns = ['Style', 'Name', 'Color', 'Size', 'Units']
df_final = df_final[required_columns]
output_filename = 'export_ordinato.csv'
df_final.to_csv(output_filename, index=False, encoding='utf-8-sig')
print(f"\\nФайл CSV успешно создан: {len(df_final)} строк")
print("\\nПредварительный просмотр:")
print(df_final.head(10))
print("\\nНачинается загрузка...")
files.download(output_filename)`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(pythonColabScript);
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 2000);
  };
  const handleDownloadScript = () => {
    const blob = new Blob([pythonColabScript], { type: "text/x-python;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "convert_sellout_colab.py";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const handleConvertExcel = async () => {
    if (!excelFile) {
      setErrorMsg("Выберите файл Excel (.xlsx или .xls) для преобразования.");
      return;
    }
    setConverting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { rows, clientInfo } = await convertExcelToDataEngineerWithClient(excelFile);
      if (!rows.length) throw new Error("После 10-й строки не найдено подходящих строк с категорией и запятой в описании.");
      setParsedRows(rows);
      if (clientInfo && (clientInfo.name || clientInfo.location)) setParsedClientInfo(clientInfo);
      const csvContent = generateDataEngineerCsv(rows);
      const outputFilename = "export_ordinato.csv";
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = outputFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      const totalUnits = rows.reduce((acc, r) => acc + (Number(r.Units) || 0), 0);
      const clientNotice = clientInfo?.name ? ` · Клиент: ${clientInfo.name}` : "";
      setSuccessMsg(`Файл CSV «${outputFilename}» создан и загружен. Извлечено строк: ${rows.length} (продано изделий: ${totalUnits})${clientNotice}.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Ошибка преобразования файла: ${err.message || "Неверный формат файла"}`);
    } finally {
      setConverting(false);
    }
  };
  const totalCalculatedUnits = parsedRows.reduce((acc, r) => acc + (Number(r.Units) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Закрыть" className="absolute right-4 top-4 rounded-full bg-stone-100 p-2 text-stone-500 hover:bg-stone-200 transition"><X className="h-5 w-5" /></button>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-900 text-white"><Cpu className="h-5 w-5" /></div>
          <div><h2 className="font-serif-luxury text-2xl font-semibold text-stone-900">Преобразование данных (Excel → export_ordinato.csv)</h2><p className="text-xs text-stone-500">Стандартный формат для 1C Boutique: данные с 10-й строки, столбцы <code className="font-mono bg-stone-100 text-amber-900 px-1 py-0.5 rounded">['Style', 'Name', 'Color', 'Size', 'Units']</code></p></div>
        </div>
        <div className="mt-5 flex items-center gap-2 border-b border-stone-200 pb-2">
          <button onClick={() => setActiveTab("app")} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${activeTab === "app" ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900 bg-stone-100"}`}><Sparkles className="h-3.5 w-3.5" />Встроенный конвертер</button>
          <button onClick={() => setActiveTab("script")} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${activeTab === "script" ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900 bg-stone-100"}`}><Code2 className="h-3.5 w-3.5" />Скрипт Google Colab / Python</button>
        </div>
        {activeTab === "app" ? <div className="mt-4 space-y-4">
          {errorMsg && <div className="flex items-center gap-2 rounded bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200"><AlertCircle className="h-4 w-4 shrink-0" /><span>{errorMsg}</span></div>}
          {successMsg && <div className="flex items-center gap-2 rounded bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200"><CheckCircle2 className="h-4 w-4 shrink-0" /><span>{successMsg}</span></div>}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-5"><span className="text-xs font-semibold uppercase tracking-wider text-amber-900 block">1. Загрузите файл Excel 1C Boutique (.xlsx / .xls)</span><p className="text-[11px] text-stone-500 mt-1">Обработчик прочитает файл с 10-й строки, пропустит итоги («Итого»), извлечёт название, размер и полный цвет и создаст <strong>export_ordinato.csv</strong> в кодировке UTF-8-SIG.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3"><input type="file" accept=".xlsx, .xls" id="data-engineer-file-input" className="hidden" onChange={(e) => { setExcelFile(e.target.files?.[0] || null); setErrorMsg(null); setSuccessMsg(null); }} /><label htmlFor="data-engineer-file-input" className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-xs font-medium text-stone-800 hover:bg-stone-100 transition"><FileSpreadsheet className="h-4 w-4 text-emerald-700" /><span>{excelFile ? excelFile.name : "Выбрать файл Excel (.xlsx / .xls)"}</span></label>{excelFile && <span className="text-xs text-emerald-700 flex items-center gap-1 font-medium"><CheckCircle2 className="h-4 w-4" />Готово к преобразованию</span>}</div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2"><span className="text-xs text-stone-500">Результат: <strong className="text-stone-800">export_ordinato.csv</strong> (UTF-8-SIG)</span><button onClick={handleConvertExcel} disabled={converting || !excelFile} className="inline-flex items-center gap-2 rounded bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-stone-800 transition disabled:opacity-40"><Download className="h-4 w-4" /><span>{converting ? "Преобразование..." : "Преобразовать и скачать CSV"}</span><ArrowRight className="h-3.5 w-3.5" /></button></div>
          {!!parsedRows.length && <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
            {parsedClientInfo?.name && <div className="mb-3 rounded-lg bg-amber-50 border p-2.5 text-xs"><span className="font-semibold">Распознанный клиент (строки 9–12, столбец 4): </span><strong>{parsedClientInfo.name}</strong>{parsedClientInfo.address && <span> · {parsedClientInfo.address}</span>}</div>}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><div><h3 className="font-serif-luxury text-sm font-semibold">Предварительный просмотр: извлечено строк — {parsedRows.length}</h3><p className="text-[11px]">Всего продано изделий: <strong>{totalCalculatedUnits} шт.</strong></p></div><div className="flex gap-2"><button onClick={() => { const file = new File(["\uFEFF" + generateDataEngineerCsv(parsedRows)], "export_ordinato.csv", { type: "text/csv;charset=utf-8;" }); if (onOpenUploadWithFile) onOpenUploadWithFile(file, parsedClientInfo || undefined); else if (onApplyConvertedData) { onApplyConvertedData(parsedRows, parsedClientInfo || undefined); onClose(); } }} className="inline-flex items-center gap-1.5 rounded bg-amber-900 px-3.5 py-1.5 text-xs font-semibold text-white" title="Открыть загрузку заказов и продаж с готовым CSV"><Layers className="h-3.5 w-3.5" />Загрузить данные в панель</button><button onClick={() => { const url = URL.createObjectURL(new Blob(["\uFEFF" + generateDataEngineerCsv(parsedRows)], { type: "text/csv;charset=utf-8;" })); const link = document.createElement("a"); link.href = url; link.download = "export_ordinato.csv"; link.click(); URL.revokeObjectURL(url); }} className="inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs"><Download className="h-3.5 w-3.5" />Скачать CSV повторно</button></div></div>
            <div className="max-h-60 overflow-y-auto rounded-lg border"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-stone-100 uppercase"><tr>{["№", "Артикул", "Название", "Цвет (полный)", "Размер", "Количество"].map((h) => <th key={h} className="py-2 px-3">{h}</th>)}</tr></thead><tbody className="divide-y font-mono text-[11px]">{parsedRows.slice(0, 50).map((r, i) => <tr key={i}><td className="py-1 px-3">{i + 1}</td><td className="py-1 px-3">{r.Style}</td><td className="py-1 px-3">{r.Name}</td><td className="py-1 px-3">{r.Color}</td><td className="py-1 px-3">{r.Size}</td><td className="py-1 px-3">{r.Units}</td></tr>)}</tbody></table></div>
            {parsedRows.length > 50 && <p className="mt-2 text-center text-[11px]">Показаны первые 50 из {parsedRows.length} строк. В CSV включены все данные.</p>}
          </div>}
        </div> : <div className="mt-4 space-y-3"><div className="flex items-center justify-between text-xs"><span>Скрипт Python для Google Colab или Jupyter Notebook:</span><div className="flex gap-2"><button onClick={handleCopyScript} className="inline-flex items-center gap-1 rounded bg-stone-800 px-2.5 py-1 text-xs text-white">{scriptCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{scriptCopied ? "Скопировано" : "Копировать скрипт"}</button><button onClick={handleDownloadScript} className="inline-flex items-center gap-1 rounded bg-amber-900 px-2.5 py-1 text-xs text-white"><Download className="h-3.5 w-3.5" />Скачать .py</button></div></div><pre className="max-h-96 overflow-auto rounded-lg bg-stone-950 p-4 font-mono text-[11px] leading-relaxed text-stone-200">{pythonColabScript}</pre><div className="rounded-lg bg-stone-50 p-3 text-xs border"><strong>Как использовать в Google Colab:</strong><ol className="list-decimal list-inside mt-1 space-y-0.5"><li>Откройте Google Colab (colab.research.google.com)</li><li>Вставьте код в новую ячейку</li><li>Запустите ячейку и выберите файл Excel</li><li>Файл <code>export_ordinato.csv</code> будет создан и автоматически загружен</li></ol></div></div>}
        <div className="mt-6 flex justify-end border-t pt-3"><button onClick={onClose} className="rounded border px-4 py-2 text-xs">Закрыть</button></div>
      </div>
    </div>
  );
};
