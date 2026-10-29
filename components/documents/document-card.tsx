"use client";

import React, { useRef, useState } from "react";
import {
  Camera,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  Loader2,
  Maximize2,
  AlertCircle,
} from "lucide-react";
import {
  processFileForUpload,
  ProcessedDocumentFile,
  formatBytes,
} from "@/src/lib/image-processing";

interface DocumentCardProps {
  title: string;
  subtitle: string;
  type: "purchase_order" | "invoice";
  file: ProcessedDocumentFile | null;
  onFileSelected: (file: ProcessedDocumentFile | null) => void;
  disabled?: boolean;
}

export function DocumentCard({
  title,
  subtitle,
  type,
  file,
  onFileSelected,
  disabled = false,
}: DocumentCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const processed = await processFileForUpload(selected);
      onFileSelected(processed);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao processar arquivo.");
      onFileSelected(null);
    } finally {
      setIsProcessing(false);
      // Limpa os inputs para permitir selecionar o mesmo arquivo se quiser
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelected(null);
    setErrorMsg(null);
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <h3 className="font-semibold text-slate-900 text-base">{title}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>

          {file && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              title="Remover arquivo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Inputs de arquivo ocultos */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        {/* Área de Seleção / Dropzone */}
        {!file && !isProcessing && (
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>

              <div className="text-sm font-medium text-slate-700">
                Selecione o arquivo ou fotografe
              </div>
              <p className="text-xs text-slate-400 max-w-xs">
                Formatos aceitos: PDF, JPEG, PNG ou tire foto direta com a câmera
              </p>

              <div className="flex items-center gap-2 mt-2 w-full max-w-xs justify-center">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={disabled}
                  className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <Camera className="w-4 h-4 text-slate-600" />
                  <span>Usar Câmera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Anexar PDF/Foto</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Estado Carregando / Comprimindo */}
        {isProcessing && (
          <div className="border border-slate-200 rounded-xl p-8 text-center bg-slate-50 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-slate-700">Otimizando documento...</p>
            <p className="text-xs text-slate-400">
              Redimensionando e ajustando resolução para a leitura de IA
            </p>
          </div>
        )}

        {/* Arquivo Pronto com Preview */}
        {file && !isProcessing && (
          <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              {file.mimeType.startsWith("image/") ? (
                <div
                  className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-white cursor-pointer group flex-shrink-0"
                  onClick={() => setShowPreviewModal(true)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.dataUrl}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-lg bg-red-100 text-red-700 flex flex-col items-center justify-center font-bold text-xs flex-shrink-0">
                  <FileText className="w-5 h-5 mb-0.5" />
                  PDF
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {file.fileName}
                  </p>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-2">
                  <span>
                    Original: {formatBytes(file.originalSizeBytes)}
                  </span>
                  <span>&bull;</span>
                  <span className="font-medium text-emerald-700">
                    Otimizado: {formatBytes(file.compressedSizeBytes)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md shadow-2xs hover:bg-slate-50 transition-colors"
              >
                Trocar
              </button>
            </div>
          </div>
        )}

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Modal de Pré-visualização Ampliada */}
      {showPreviewModal && file && file.mimeType.startsWith("image/") && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-800">{title} - Visualização</h4>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                ✕
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[75vh] flex items-center justify-center bg-slate-900/5 rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.dataUrl}
                alt={title}
                className="max-w-full max-h-[70vh] object-contain rounded shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
