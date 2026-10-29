import type { Metadata, Viewport } from "next";
import "@/src/lib/polyfills";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conferência Inteligente OC x NF-e | WLM Dealer Hub",
  description: "Conferência automatizada e segura entre Ordens de Compra e Notas Fiscais eletrônicas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1e3a8a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
        <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm no-print">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
                WLM
              </div>
              <div>
                <h1 className="font-semibold text-base leading-tight tracking-tight text-white">
                  Dealer Hub <span className="text-blue-400 font-normal">| Conferência OC x NF-e</span>
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Ambiente de Apoio Operacional e Efêmero
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                Sessão Efêmera Ativa
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>

        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
          <div className="max-w-6xl mx-auto px-4">
            <p>
              WLM Indústria e Comércio &bull; Sistema de Conferência Assistida por IA.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Privacidade Garantida: Nenhuma imagem, documento ou resultado é salvo em banco de dados ou storage.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
