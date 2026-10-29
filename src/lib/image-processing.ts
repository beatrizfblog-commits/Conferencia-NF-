import "./polyfills";

export type ProcessedDocumentFile = {
  dataUrl: string;
  mimeType: string;
  fileName: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
};

export async function processFileForUpload(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<ProcessedDocumentFile> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return processPdfFile(file, quality);
  }

  return processImageFile(file, maxDimension, quality);
}

/**
 * Converte páginas de PDF para imagem JPEG usando PDF.js no navegador
 */
async function processPdfFile(file: File, quality = 0.85): Promise<ProcessedDocumentFile> {
  const pdfjsLib = await import("pdfjs-dist");

  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  } catch {}

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = Math.min(pdf.numPages, 2);

  const renderedCanvases: HTMLCanvasElement[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await (page.render({
      canvasContext: ctx,
      viewport,
    } as any).promise);

    renderedCanvases.push(canvas);
  }

  if (renderedCanvases.length === 0) {
    throw new Error("Não foi possível renderizar as páginas do PDF.");
  }

  let finalCanvas = renderedCanvases[0];
  if (renderedCanvases.length > 1) {
    const totalHeight = renderedCanvases.reduce((acc, c) => acc + c.height, 0);
    const maxWidth = Math.max(...renderedCanvases.map((c) => c.width));

    const combinedCanvas = document.createElement("canvas");
    combinedCanvas.width = maxWidth;
    combinedCanvas.height = totalHeight;

    const ctx = combinedCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, maxWidth, totalHeight);
      let currentY = 0;
      for (const c of renderedCanvases) {
        ctx.drawImage(c, 0, currentY);
        currentY += c.height;
      }
      finalCanvas = combinedCanvas;
    }
  }

  if (finalCanvas.width > 1200 || finalCanvas.height > 1600) {
    const scale = Math.min(1200 / finalCanvas.width, 1600 / finalCanvas.height);
    const resizedCanvas = document.createElement("canvas");
    resizedCanvas.width = Math.round(finalCanvas.width * scale);
    resizedCanvas.height = Math.round(finalCanvas.height * scale);

    const rCtx = resizedCanvas.getContext("2d");
    if (rCtx) {
      rCtx.fillStyle = "#ffffff";
      rCtx.fillRect(0, 0, resizedCanvas.width, resizedCanvas.height);
      rCtx.drawImage(finalCanvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
      finalCanvas = resizedCanvas;
    }
  }

  const jpegDataUrl = finalCanvas.toDataURL("image/jpeg", quality);
  const sizeInBytes = estimateBase64Size(jpegDataUrl);

  return {
    dataUrl: jpegDataUrl,
    mimeType: "image/jpeg",
    fileName: file.name.replace(/\.[^/.]+$/, "") + " (PDF renderizado).jpg",
    originalSizeBytes: file.size,
    compressedSizeBytes: sizeInBytes,
  };
}

async function processImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<ProcessedDocumentFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Erro ao inicializar contexto do canvas."));
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        const sizeInBytes = estimateBase64Size(compressedDataUrl);

        resolve({
          dataUrl: compressedDataUrl,
          mimeType: "image/jpeg",
          fileName: file.name.replace(/\.[^/.]+$/, ".jpg"),
          originalSizeBytes: file.size,
          compressedSizeBytes: sizeInBytes,
        });
      };

      img.onerror = () => reject(new Error("Formato de imagem não suportado."));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Falha na leitura do arquivo."));
    reader.readAsDataURL(file);
  });
}

function estimateBase64Size(dataUrl: string): number {
  const base64Index = dataUrl.indexOf(",");
  const base64String = base64Index !== -1 ? dataUrl.substring(base64Index + 1) : dataUrl;
  return Math.round((base64String.length * 3) / 4);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
