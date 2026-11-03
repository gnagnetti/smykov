// @ts-nocheck -- imported code, written for a looser TypeScript config
import React from "react";
import { FilterState, ViewMode } from "../types";
import {
  Search,
  LayoutGrid,
  Table as TableIcon,
  BarChart3,
  Ruler,
  PackageCheck,
} from "lucide-react";

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  viewMode: ViewMode;
  onViewModeChange: (view: ViewMode) => void;
  allSilhouettes: string[];
  allPOs: string[];
  resultCount: number;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
  allSilhouettes,
  allPOs,
  resultCount,
  totalCount,
}) => {
  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-3 sm:p-4 shadow-xs">
      {/* Top Row: View Switcher & Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Navigation View Switcher */}
        <div className="flex flex-wrap items-center gap-1 rounded-md bg-stone-100 p-1">
          <button
            onClick={() => onViewModeChange("lookbook")}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "lookbook"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Галерея моделей</span>
          </button>

          <button
            onClick={() => onViewModeChange("table")}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "table"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>Таблица</span>
          </button>

          <button
            onClick={() => onViewModeChange("categories")}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "categories"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Категории</span>
          </button>

          <button
            onClick={() => onViewModeChange("sizes")}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "sizes"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Ruler className="h-3.5 w-3.5" />
            <span>Размерная сетка</span>
          </button>

          <button
            onClick={() => onViewModeChange("linesheets")}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "linesheets"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <PackageCheck className="h-3.5 w-3.5" />
            <span>Заказы</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="Поиск по модели, артикулу, цвету или составу ткани…"
            className="w-full rounded border border-stone-200 bg-stone-50/60 py-1.5 pl-9 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-stone-400 focus:bg-white focus:outline-hidden"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ ...filters, search: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Granular Filters & Sorts */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Silhouette Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500">Категория:</span>
            <select
              value={filters.silhouette}
              onChange={(e) => onFilterChange({ ...filters, silhouette: e.target.value })}
              className="rounded border border-stone-200 bg-white py-1 px-2 text-xs text-stone-800 focus:border-stone-400 focus:outline-hidden"
            >
              <option value="all">Все категории</option>
              {allSilhouettes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Performance Tier Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500">Уровень продаж:</span>
            <select
              value={filters.performanceTier}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  performanceTier: e.target.value as FilterState["performanceTier"],
                })
              }
              className="rounded border border-stone-200 bg-white py-1 px-2 text-xs text-stone-800 focus:border-stone-400 focus:outline-hidden"
            >
              <option value="all">Все уровни</option>
              <option value="bestseller">Лидеры продаж (≥70%)</option>
              <option value="healthy">Стабильные продажи (40–69%)</option>
              <option value="slow">Низкие продажи (&lt;40%)</option>
              <option value="soldout">Распродано (100%)</option>
            </select>
          </div>

          {/* PO Filter */}
          {allPOs.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500">Заказ:</span>
              <select
                value={filters.poFilter}
                onChange={(e) => onFilterChange({ ...filters, poFilter: e.target.value })}
                className="rounded border border-stone-200 bg-white py-1 px-2 text-xs text-stone-800 focus:border-stone-400 focus:outline-hidden"
              >
                <option value="all">Все заказы</option>
                {allPOs.map((po) => (
                  <option key={po} value={po}>
                    {po}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Sort Order & Results Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500">Сортировка:</span>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  sortBy: e.target.value as FilterState["sortBy"],
                })
              }
              className="rounded border border-stone-200 bg-white py-1 px-2 text-xs font-medium text-stone-800 focus:border-stone-400 focus:outline-hidden"
            >
              <option value="soldDesc">Продано: от большего к меньшему</option>
              <option value="sellOutDesc">Продажи %: от большего к меньшему</option>
              <option value="orderedDesc">Заказано: от большего к меньшему</option>
              <option value="stockDesc">Остаток: от большего к меньшему</option>
              <option value="revenueDesc">Выручка (€)</option>
              <option value="nameAsc">Название модели (А → Я)</option>
              <option value="sellOutAsc">Продажи %: от меньшего к большему</option>
            </select>
          </div>

          <span className="text-stone-400">|</span>

          <span className="text-stone-500">
            Показано <strong className="text-stone-800">{resultCount}</strong> из {totalCount} моделей
          </span>
        </div>
      </div>
    </div>
  );
};
