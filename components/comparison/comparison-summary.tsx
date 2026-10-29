import React from "react";
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { ComparisonSummary } from "@/src/domain/documents/comparison-types";

interface ComparisonSummaryProps {
  summary: ComparisonSummary;
  message: string;
  activeFilter: "all" | "divergences" | "matches";
  onFilterChange: (filter: "all" | "divergences" | "matches") => void;
  onCopySummary: () => void;
  isCopied: boolean;
}

export function ComparisonSummaryCard({
  summary,
  message,
  activeFilter,
  onFilterChange,
  onCopySummary,
  isCopied,
}: ComparisonSummaryProps) {
  const isOk = summary.overallStatus === "no_divergences_detected";
  const hasDivergences = summary.overallStatus === "divergences_found";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      {/* Banner Principal de Status */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isOk
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : hasDivergences
            ? "bg-red-50 border-red-200 text-red-900"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}
      >
        <div className="flex items-start space-x-3">
          {isOk ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : hasDivergences ? (
            <AlertOctagon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className="font-bold text-base leading-snug">
              {isOk
                ? "Sem Divergências Detectadas"
                : hasDivergences
                ? "Divergências Encontradas"
                : "Revisão Manual Necessária"}
            </h3>
            <p className="text-xs mt-0.5 opacity-90">{message}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCopySummary}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white shadow-2xs border border-slate-300 hover:bg-slate-50 transition-colors text-slate-700 self-start sm:self-auto"
          title="Copiar relatório formatado para o Dealer Hub / Senior ERP"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Resumo Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copiar Resumo</span>
            </>
          )}
        </button>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
          <span className="block text-xl font-bold text-slate-800">
            {summary.totalChecks}
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            Checagens Totais
          </span>
        </div>

        <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
          <span className="block text-xl font-bold text-emerald-700">
            {summary.matched}
          </span>
          <span className="text-[11px] font-medium text-emerald-600">
            Conformes
          </span>
        </div>

        <div className="bg-red-50/60 p-3 rounded-lg border border-red-100">
          <span className="block text-xl font-bold text-red-700">
            {summary.mismatched}
          </span>
          <span className="text-[11px] font-medium text-red-600">
            Divergências
          </span>
        </div>

        <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-100">
          <span className="block text-xl font-bold text-amber-700">
            {summary.notComparable}
          </span>
          <span className="text-[11px] font-medium text-amber-600">
            A Verificar
          </span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-100">
        <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">
          Filtrar lista:
        </span>
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            activeFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Todas ({summary.totalChecks})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("divergences")}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            activeFilter === "divergences"
              ? "bg-red-700 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Divergências ({summary.mismatched})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("matches")}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            activeFilter === "matches"
              ? "bg-emerald-700 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Conformes ({summary.matched})
        </button>
      </div>
    </div>
  );
}
