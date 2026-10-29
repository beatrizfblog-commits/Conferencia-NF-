"use client";

import React, { useState } from "react";
import {
  CheckCircle,
  RotateCcw,
  Send,
  FileCheck2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { FinalDecision, DecisionRecord } from "@/src/domain/documents/comparison-types";

interface FinalDecisionFormProps {
  onRecordDecision: (record: DecisionRecord) => void;
  onResetSession: () => void;
  decisionRecorded: DecisionRecord | null;
}

export function FinalDecisionForm({
  onRecordDecision,
  onResetSession,
  decisionRecorded,
}: FinalDecisionFormProps) {
  const [selectedDecision, setSelectedDecision] = useState<FinalDecision>("accept_with_reservation");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Valida comentário obrigatório se for devolução ou análise
    if (selectedDecision !== "accept_with_reservation" && !comment.trim()) {
      setError("É obrigatório informar o motivo / justificativa para esta decisão.");
      return;
    }

    onRecordDecision({
      decision: selectedDecision,
      comment: comment.trim() || undefined,
      decidedAt: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  };

  const getDecisionBadge = (decision: FinalDecision) => {
    switch (decision) {
      case "accept_with_reservation":
        return {
          title: "Aceito com Ressalva",
          className: "bg-emerald-100 text-emerald-800 border-emerald-300",
        };
      case "return_for_correction":
        return {
          title: "Devolver para Correção",
          className: "bg-red-100 text-red-800 border-red-300",
        };
      case "send_for_review":
        return {
          title: "Encaminhar para Análise Superior",
          className: "bg-amber-100 text-amber-800 border-amber-300",
        };
    }
  };

  if (decisionRecorded) {
    const badge = getDecisionBadge(decisionRecorded.decision);
    return (
      <div className="bg-white border-2 border-emerald-300 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900 text-base">
              Decisão Registrada na Sessão
            </h3>
          </div>
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full border ${badge.className}`}
          >
            {badge.title}
          </span>
        </div>

        {decisionRecorded.comment && (
          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-100">
            <span className="font-semibold text-slate-900 block mb-1">
              Justificativa Operacional:
            </span>
            {decisionRecorded.comment}
          </div>
        )}

        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span>
            Atenção: Por premissa de privacidade, esta decisão não é salva no banco. Ao fechar a aba ou encerrar, todos os dados serão permanentemente descartados.
          </span>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onResetSession}
            className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Encerrar e Descartar Dados</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center space-x-2">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
        <h3 className="font-semibold text-slate-900 text-base">
          Registrar Decisão do Responsável
        </h3>
      </div>
      <p className="text-xs text-slate-500">
        A IA é assistiva e não aprova nem rejeita pedidos. Selecione o encaminhamento definitivo abaixo.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <label
            className={`border rounded-xl p-3 flex flex-col cursor-pointer transition-all ${
              selectedDecision === "accept_with_reservation"
                ? "border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">
                Aceitar com Ressalva
              </span>
              <input
                type="radio"
                name="decision"
                value="accept_with_reservation"
                checked={selectedDecision === "accept_with_reservation"}
                onChange={() => setSelectedDecision("accept_with_reservation")}
                className="text-emerald-600 focus:ring-emerald-500"
              />
            </div>
            <span className="text-[11px] text-slate-500">
              Liberar recebimento registrando as divergências toleradas.
            </span>
          </label>

          <label
            className={`border rounded-xl p-3 flex flex-col cursor-pointer transition-all ${
              selectedDecision === "return_for_correction"
                ? "border-red-600 bg-red-50/50 ring-1 ring-red-600"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">
                Devolver p/ Correção
              </span>
              <input
                type="radio"
                name="decision"
                value="return_for_correction"
                checked={selectedDecision === "return_for_correction"}
                onChange={() => setSelectedDecision("return_for_correction")}
                className="text-red-600 focus:ring-red-500"
              />
            </div>
            <span className="text-[11px] text-slate-500">
              Recusar nota ou solicitar carta de correção ao fornecedor.
            </span>
          </label>

          <label
            className={`border rounded-xl p-3 flex flex-col cursor-pointer transition-all ${
              selectedDecision === "send_for_review"
                ? "border-amber-600 bg-amber-50/50 ring-1 ring-amber-600"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">
                Encaminhar p/ Análise
              </span>
              <input
                type="radio"
                name="decision"
                value="send_for_review"
                checked={selectedDecision === "send_for_review"}
                onChange={() => setSelectedDecision("send_for_review")}
                className="text-amber-600 focus:ring-amber-500"
              />
            </div>
            <span className="text-[11px] text-slate-500">
              Submeter à gerência de compras ou equipe fiscal.
            </span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Justificativa / Observações Operacionais:
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder={
              selectedDecision === "accept_with_reservation"
                ? "Opcional: Insira qualquer anotação relevante..."
                : "Descreva o motivo da recusa ou pendência a ser corrigida..."
            }
            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 font-medium">{error}</p>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onResetSession}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Descartar e Reiniciar</span>
          </button>

          <button
            type="submit"
            className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Confirmar Decisão</span>
          </button>
        </div>
      </form>
    </div>
  );
}
