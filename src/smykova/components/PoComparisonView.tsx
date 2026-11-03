// @ts-nocheck -- imported code, written for a looser TypeScript config
import React from "react";
import { OrderItem, MergedProduct } from "../types";
import { Ban, CheckCircle2 } from "lucide-react";

interface PoComparisonViewProps { orders: OrderItem[]; products: MergedProduct[] }

export const PoComparisonView: React.FC<PoComparisonViewProps> = ({ orders, products }) => {
  const poMap = new Map<string, { poNumber: string; items: OrderItem[]; totalUnits: number; totalEur: number }>();
  orders.forEach((o) => {
    const entry = poMap.get(o.poNumber) || { poNumber: o.poNumber, items: [], totalUnits: 0, totalEur: 0 };
    entry.items.push(o);
    entry.totalUnits += o.unitsOrdered;
    entry.totalEur += o.totalEur;
    poMap.set(o.poNumber, entry);
  });
  const poList = Array.from(poMap.values());
  const cancelledStyles = [
    { po: "18827955", styleName: "Cips", styleNumber: "100503", colorCode: "Celeste(0644)", silhouette: "Поло", fabrication: "75% WP 25% PA", wholesaleEur: 127, reason: "Отменено производством из-за нехватки ткани" },
    { po: "18827970", styleName: "Girevole", styleNumber: "543517", colorCode: "Var Verde _ Senape(3406)", silhouette: "Платье", fabrication: "48% LY 44% VI 8% WO", wholesaleEur: 183, reason: "Вариант цвета модели отменён" },
  ];

  return <div className="space-y-6">
    <div><h2 className="font-serif-luxury text-xl font-semibold text-stone-900">Сводка заказов на закупку</h2><p className="text-xs text-stone-500">Сравнение заказов JOOR Luisa Spagnoli и отслеживание отменённых моделей</p></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{poList.map((po) => {
      const related = products.filter((p) => p.poNumbers.includes(po.poNumber));
      const sold = related.reduce((a, p) => a + p.unitsSold, 0);
      const ordered = related.reduce((a, p) => a + p.unitsOrdered, 0);
      const sellOut = ordered > 0 ? sold / ordered * 100 : 0;
      return <div key={po.poNumber} className="rounded-lg border border-stone-200 bg-white p-4 shadow-xs"><div className="flex items-center justify-between"><span className="font-mono text-xs font-semibold">{po.poNumber}</span><span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded"><CheckCircle2 className="h-3 w-3" />Утверждён</span></div><div className="mt-3"><div className="font-serif-luxury text-2xl font-semibold">{po.totalUnits} <span className="text-xs font-normal text-stone-500">заказано, шт.</span></div><div className="text-xs text-stone-500">Стоимость: <strong>€{po.totalEur.toLocaleString("ru-RU")}</strong> (оптовая)</div></div><div className="mt-3 border-t pt-3"><div className="flex justify-between text-xs"><span className="text-stone-500">Продано от заказа:</span><span className="font-semibold text-emerald-800">{sellOut.toFixed(1)}%</span></div><div className="mt-1 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, sellOut)}%` }} /></div><div className="mt-1.5 flex justify-between text-[11px] text-stone-400"><span>Уникальных моделей: {po.items.length}</span><span>Продано: {sold}</span></div></div></div>;
    })}</div>
    <div className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50/30 shadow-xs"><div className="flex items-center justify-between border-b border-amber-200/80 bg-amber-100/50 px-4 py-3"><div className="flex items-center gap-2"><Ban className="h-4 w-4 text-amber-800" /><h3 className="font-serif-luxury text-base font-semibold text-amber-950">Отменённые модели и варианты</h3></div><span className="text-xs text-amber-800 font-medium">2 модели отмечены брендом</span></div><div className="overflow-x-auto"><table className="w-full text-left text-xs text-stone-700"><thead className="border-b bg-amber-50 text-[11px] text-amber-900 uppercase"><tr>{["Исходный заказ", "Модель", "Цвет / код", "Категория", "Состав ткани", "Оптовая цена (EUR)", "Причина / статус"].map((x) => <th key={x} className="py-2.5 px-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-amber-100 bg-white">{cancelledStyles.map((cs) => <tr key={`${cs.po}-${cs.styleName}`}><td className="py-2.5 px-4 font-mono">{cs.po}</td><td className="py-2.5 px-4 font-semibold">{cs.styleName} <span className="font-mono text-xs text-stone-400">#{cs.styleNumber}</span></td><td className="py-2.5 px-3">{cs.colorCode}</td><td className="py-2.5 px-3">{cs.silhouette}</td><td className="py-2.5 px-3">{cs.fabrication}</td><td className="py-2.5 px-3 text-right">€{cs.wholesaleEur}</td><td className="py-2.5 px-4 text-rose-700">{cs.reason}</td></tr>)}</tbody></table></div></div>
  </div>;
};
