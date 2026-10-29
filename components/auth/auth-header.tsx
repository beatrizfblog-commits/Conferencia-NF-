"use client";

import React, { useEffect, useState } from "react";
import { User, LogIn, LogOut, Shield, Loader2, X, CheckCircle } from "lucide-react";
import { createClient } from "@/src/infrastructure/supabase/browser-client";

export function AuthHeader() {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal de login
  const [isOpen, setIsOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function checkUser() {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
      } catch (err) {
        console.error("Erro ao verificar sessão Supabase:", err);
      } finally {
        setLoading(false);
      }
    }

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setAuthSuccess("Conta criada com sucesso! Você já pode entrar.");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setIsOpen(false);
      }
    } catch (err: any) {
      setAuthError(err.message || "Erro na autenticação.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-3">
        {user ? (
          <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[10px]">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <span className="block font-semibold truncate max-w-[140px] text-white">
                {user.email?.split("@")[0]}
              </span>
              <span className="text-[10px] text-blue-400 font-medium">
                Conectado (Supabase)
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-red-400 p-1 ml-1 rounded hover:bg-slate-700/50 transition-colors"
              title="Sair da conta"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar (Supabase)</span>
          </button>
        )}
      </div>

      {/* Modal de Autenticação Supabase */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {isSignUp ? "Criar Conta Supabase" : "Entrar no Dealer Hub"}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Autenticação individual via Supabase Auth para registro de responsabilidade na conferência.
            </p>

            <form onSubmit={handleAuth} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail institucional:
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@wlm.com.br"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha:
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              {authError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-sm transition-colors flex items-center justify-center space-x-2"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{isSignUp ? "Cadastrar" : "Acessar Sistema"}</span>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              {isSignUp ? (
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Já tem conta? Clique aqui para entrar.
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Primeiro acesso? Criar nova conta.
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
