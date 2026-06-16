"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Eye, EyeOff, Loader2 } from "lucide-react";
import { saveSession } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const FIELD = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 transition";

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

/** Modal de login/cadastro. Em sucesso, salva a sessão e chama onSuccess() (sem redirect). */
export default function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "", terms: false });
  const set = (k: keyof typeof f, v: string | boolean) => setF(prev => ({ ...prev, [k]: v }));

  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (mode === "signup") {
      if (f.full_name.trim().split(/\s+/).length < 2) return setError("Informe seu nome completo.");
      if (f.phone && f.phone.replace(/\D/g, "").length < 10) return setError("Telefone inválido (com DDD).");
      if (f.password.length < 8) return setError("A senha deve ter ao menos 8 caracteres.");
      if (f.password !== f.confirm) return setError("As senhas não conferem.");
      if (!f.terms) return setError("Aceite os termos para continuar.");
    }
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login"
        ? { email: f.email, password: f.password }
        : { full_name: f.full_name, email: f.email, phone: f.phone, password: f.password };
      const res = await fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data.detail) ? data.detail.map((d: { msg?: string }) => d.msg ?? "").join(", ") : (data.detail || "Não foi possível continuar."));
        return;
      }
      saveSession(data.access_token, data.refresh_token, data.user);
      onSuccess();
    } catch { setError("Erro de conexão. Tente novamente."); }
    finally { setLoading(false); }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 animate-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-modal">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h3 className="font-display font-black text-xl text-navy-800">{mode === "login" ? "Entrar" : "Criar conta"}</h3>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>
        <p className="px-6 text-sm text-gray-500 mb-4">Para concluir sua reserva, {mode === "login" ? "entre na sua conta" : "crie sua conta"}.</p>

        <form onSubmit={submit} className="px-6 pb-6 space-y-3">
          {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3.5 py-3">{error}</div>}

          {mode === "signup" && (
            <input value={f.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Nome completo" className={FIELD} />
          )}
          <input type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="E-mail" className={FIELD} />
          {mode === "signup" && (
            <input inputMode="numeric" value={f.phone} onChange={e => set("phone", maskPhone(e.target.value))} placeholder="Telefone (DDD)" className={FIELD} />
          )}
          <div className="relative">
            <input type={show ? "text" : "password"} value={f.password} onChange={e => set("password", e.target.value)} placeholder="Senha" className={`${FIELD} pr-11`} />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
          {mode === "signup" && (
            <>
              <input type="password" value={f.confirm} onChange={e => set("confirm", e.target.value)} placeholder="Confirmar senha" className={FIELD} />
              <label className="flex items-start gap-2 text-xs text-gray-500">
                <input type="checkbox" checked={f.terms} onChange={e => set("terms", e.target.checked)} className="mt-0.5" />
                <span>Li e aceito os <a href="/termos" target="_blank" className="text-navy-600 underline">termos</a> e a <a href="/privacidade" target="_blank" className="text-navy-600 underline">política de privacidade</a>.</span>
              </label>
            </>
          )}

          <button type="submit" disabled={loading} className="w-full bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <><Loader2 size={17} className="animate-spin" /> Aguarde…</> : (mode === "login" ? "Entrar" : "Criar conta")}
          </button>

          <p className="text-center text-sm text-gray-500">
            {mode === "login" ? (
              <>Não tem conta? <button type="button" onClick={() => { setMode("signup"); setError(""); }} className="text-navy-700 font-semibold">Cadastre-se</button></>
            ) : (
              <>Já tem conta? <button type="button" onClick={() => { setMode("login"); setError(""); }} className="text-navy-700 font-semibold">Entrar</button></>
            )}
          </p>
        </form>
      </div>
    </div>,
    document.body
  );
}
