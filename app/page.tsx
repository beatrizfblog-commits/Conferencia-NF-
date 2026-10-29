"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Sliders,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { DocumentCard } from "@/components/documents/document-card";
import { ComparisonSummaryCard } from "@/components/comparison/comparison-summary";
import { FindingCard } from "@/components/comparison/finding-card";
import { FinalDecisionForm } from "@/components/comparison/final-decision-form";
import { ProcessedDocumentFile } from "@/src/lib/image-processing";
import {
  ConferenceResult,
  DecisionRecord,
} from "@/src/domain/documents/comparison-types";

export default function ConferenciaPage() {
  const [poFile, setPoFile] = useState<ProcessedDocumentFile | null>(null);
  const [invFile, setInvFile] = useState<ProcessedDocumentFile | null>(null);

  const [tolerance, setTolerance] = useState<number>(0.99);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [result, setResult] = useState<ConferenceResult | null>(null);
  const [decisionRecord, setDecisionRecord] = useState<DecisionRecord | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "divergences" | "matches">("all");
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const canProcess = Boolean(poFile && invFile && !isProcessing);

  const handleStartConference = async () => {
    if (!poFile || !invFile) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setProcessingStage("Enviando documentos de forma segura...");

    try {
      setProcessingStage("Extraindo dados com Groq Vision (Qwen 3.8)...");

      const response = await fetch("/api/conferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrder: {
            data: poFile.dataUrl,
            mimeType: poFile.mimeType,
          },
          invoice: {
            data: invFile.dataUrl,
            mimeType: invFile.mimeType,
          },
          priceTolerance: tolerance,
          totalTolerance: tolerance,
        }),
      });

      setProcessingStage("Aplicando regras determinísticas de conferência...");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const conferenceResult: ConferenceResult = await response.json();
      setResult(conferenceResult);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro desconhecido ao realizar a conferência.");
    } finally {
      setIsProcessing(false);
      setProcessingStage("");
    }
  };

  const handleReset = () => {
    setPoFile(null);
    setInvFile(null);
    setResult(null);
    setDecisionRecord(null);
    setErrorMsg(null);
    setIsCopied(false);
  };

  const handleCopySummary = () => {
    if (!result) return;

    const poNumber = result.extractedPurchaseOrder.documentNumber || "Não identificado";
    const invNumber = result.extractedInvoice.documentNumber || "Não identificado";
    const supplier = result.extractedPurchaseOrder.supplier?.name || "Fornecedor";

    const lines: string[] = [
      `=== RESUMO DE CONFERÊNCIA OC x NF-e (WLM DEALER HUB) ===`,
      `Data/Hora: ${new Date().toLocaleString("pt-BR")}`,
      `Ordem de Compra: ${poNumber}`,
      `Nota Fiscal: ${invNumber}`,
      `Fornecedor: ${supplier}`,
      `Tolerância Financeira Aplicada: R$ ${tolerance.toFixed(2)}`,
      `Status Global: ${result.summary.overallStatus.toUpperCase()}`,
      `Total de Checagens: ${result.summary.totalChecks} | Conformes: ${result.summary.matched} | Divergências: ${result.summary.mismatched}`,
      ``,
      `--- APONTAMENTOS DE DIVERGÊNCIA ---`,
    ];

    const divergences = result.findings.filter((f) => f.status !== "match");
    if (divergences.length === 0) {
      lines.push("Nenhuma divergência identificada.");
    } else {
      divergences.forEach((d) => {
        lines.push(`• [${d.severity.toUpperCase()}] ${d.label}`);
        lines.push(`  Esperado (OC): ${d.purchaseOrderValue || "—"}`);
        lines.push(`  Encontrado (NF): ${d.invoiceValue || "—"}`);
        lines.push(`  Diferença: ${d.difference || "—"}`);
        lines.push(`  Motivo: ${d.explanation}`);
      });
    }

    if (decisionRecord) {
      lines.push(``);
      lines.push(`--- DECISÃO DO RESPONSÁVEL ---`);
      lines.push(`Decisão: ${decisionRecord.decision}`);
      if (decisionRecord.comment) {
        lines.push(`Justificativa: ${decisionRecord.comment}`);
      }
      lines.push(`Registrado às: ${decisionRecord.decidedAt}`);
    }

    lines.push(``);
    lines.push(`*Dados conferidos via Dealer Hub em sessão efêmera.*`);

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    });
  };

  const filteredFindings = result?.findings.filter((f) => {
    if (activeFilter === "divergences") return f.status !== "match";
    if (activeFilter === "matches") return f.status === "match";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho Operacional e Configurações de Tolerância */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Nova Conferência de Recebimento
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare Ordens de Compra com Notas Fiscais via foto ou PDF sem retenção de arquivos.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          {/* Ajuste de Tolerância R$ 0,01 a R$ 0,99 */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs text-xs">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Tolerância:</span>
            <select
              value={tolerance}
              onChange={(e) => setTolerance(parseFloat(e.target.value))}
              disabled={isProcessing}
              className="font-bold text-blue-700 bg-transparent outline-none cursor-pointer"
            >
              <option value={0.01}>R$ 0,01</option>
              <option value={0.05}>R$ 0,05</option>
              <option value={0.1}>R$ 0,10</option>
              <option value={0.5}>R$ 0,50</option>
              <option value={0.99}>R$ 0,99 (Padrão)</option>
            </select>
          </div>

          {result && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reiniciar</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de Upload de Documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <DocumentCard
          title="Ordem de Compra (OC)"
          subtitle="Documento de autorização ou pedido de compra gerado pelo ERP"
          type="purchase_order"
          file={poFile}
          onFileSelected={setPoFile}
          disabled={isProcessing}
        />

        <DocumentCard
          title="Nota Fiscal (NF-e)"
          subtitle="DANFE ou foto do documento fiscal emitido pelo fornecedor"
          type="invoice"
          file={invFile}
          onFileSelected={setInvFile}
          disabled={isProcessing}
        />
      </div>

      {/* Botão de Ação Primária */}
      {!result && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-xs text-slate-600">
            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>
              Ao clicar em conferir, as imagens serão otimizadas e submetidas para extração e cruzamento fiscal.
            </span>
          </div>

          <button
            type="button"
            onClick={handleStartConference}
            disabled={!canProcess}
            className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-semibold text-sm shadow-md transition-all ${
              canProcess
                ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-98 shadow-blue-500/20"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{processingStage || "Processando..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Conferir Documentos</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Mensagem de Erro */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-red-900">Falha no processamento</h4>
            <p className="text-xs text-red-700 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Área de Resultados da Conferência */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Card de Sumário Geral e Métricas */}
          <ComparisonSummaryCard
            summary={result.summary}
            message={result.message}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onCopySummary={handleCopySummary}
            isCopied={isCopied}
          />

          {/* Lista de Apontamentos (Findings) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Itens Verificados ({filteredFindings?.length || 0})
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredFindings && filteredFindings.length > 0 ? (
                filteredFindings.map((finding) => (
                  <FindingCard key={finding.id} finding={finding} />
                ))
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  Nenhum apontamento corresponde ao filtro selecionado.
                </div>
              )}
            </div>
          </div>

          {/* Formulário de Registro de Decisão Final */}
          <FinalDecisionForm
            onRecordDecision={setDecisionRecord}
            onResetSession={handleReset}
            decisionRecorded={decisionRecord}
          />
        </div>
      )}
    </div>
  );
}
