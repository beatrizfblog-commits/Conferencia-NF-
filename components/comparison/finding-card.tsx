import React from "react";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Info,
} from "lucide-react";
import { ComparisonFinding } from "@/src/domain/documents/comparison-types";

interface FindingCardProps {
  finding: ComparisonFinding;
}

export function FindingCard({ finding }: FindingCardProps) {
  const isMatch = finding.status === "match";
  const isMismatch = finding.status === "mismatch";
  const isAmbiguous = finding.status === "ambiguous";

  const getStatusBadge = () => {
    if (isMatch) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
          Conforme
        </span>
      );
    }
    if (isMismatch) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
          Divergência
        </span>
      );
    }
    if (isAmbiguous) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
          A Confirmar
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
        <HelpCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
        Não Comparável
      </span>
    );
  };

  const getBorderColor = () => {
    if (isMatch) return "border-slate-200 bg-white";
    if (finding.severity === "critical") return "border-red-300 bg-red-50/20";
    if (finding.severity === "high") return "border-amber-300 bg-amber-50/20";
    return "border-slate-200 bg-white";
  };

  return (
    <div
      className={`border rounded-xl p-4 transition-all shadow-2xs hover:shadow-xs ${getBorderColor()}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <h4 className="font-semibold text-sm text-slate-900 leading-snug">
            {finding.label}
          </h4>
        </div>
        {getStatusBadge()}
      </div>

      {/* Grid de Comparação Lado a Lado (ou empilhado em mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-lg text-xs">
        <div>
          <span className="block font-medium text-slate-500 uppercase tracking-wider text-[10px] mb-0.5">
            Ordem de Compra (Esperado)
          </span>
          <span className="font-semibold text-slate-800 break-words">
            {finding.purchaseOrderValue || "—"}
          </span>
        </div>

        <div>
          <span className="block font-medium text-slate-500 uppercase tracking-wider text-[10px] mb-0.5">
            Nota Fiscal (Encontrado)
          </span>
          <span
            className={`font-semibold break-words ${
              isMismatch ? "text-red-700" : isMatch ? "text-emerald-700" : "text-slate-800"
            }`}
          >
            {finding.invoiceValue || "—"}
          </span>
        </div>
      </div>

      {/* Diferença e Explicação */}
      <div className="mt-3 flex items-start space-x-2 text-xs">
        <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-slate-600 leading-relaxed">{finding.explanation}</p>
          {finding.difference && (
            <span
              className={`inline-block mt-1 font-semibold ${
                isMismatch ? "text-red-700" : "text-slate-700"
              }`}
            >
              Variação: {finding.difference}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
