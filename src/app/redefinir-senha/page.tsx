"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, ArrowLeft, ShieldCheck } from "lucide-react";

export default function RedefinirSenhaPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    const accessToken = params.get("access_token");
    if (accessToken) setToken(accessToken);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!token) {
      setError("Token de recuperação não encontrado. Use o link enviado por e-mail.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Erro ao redefinir senha.");
        return;
      }
      setDone(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1502920514313-52581002a659?w=1200&q=80&fit=crop"
          alt="Viagem AJS"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-navy-800/75" />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-12 h-12">
              <Image src="/icon_ajs.png" alt="AJS Turismo" fill className="object-contain" />
            </div>
            <div>
              <span className="font-display font-black text-white text-2xl">AJS</span>
              <span className="text-gold-400 text-sm block tracking-[0.2em] uppercase -mt-1">Turismo</span>
            </div>
          </Link>
          <div>
            <blockquote className="text-white/90 text-2xl font-display font-bold leading-snug mb-4">
              &ldquo;A vida é curta demais para ficar no mesmo lugar.&rdquo;
            </blockquote>
            <p className="text-white/50 text-sm">— Anônimo</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-white">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="relative w-10 h-10">
            <Image src="/icon_ajs.png" alt="AJS Turismo" fill className="object-contain" />
          </div>
          <div>
            <span className="font-display font-black text-navy-700 text-xl">AJS</span>
            <span className="text-gold-500 text-xs block tracking-[0.2em] uppercase -mt-1">Turismo</span>
          </div>
        </Link>

        <div className="max-w-md w-full mx-auto">
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h1 className="font-display font-black text-3xl text-navy-700 mb-3">Senha redefinida!</h1>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Sua senha foi atualizada com sucesso. Você já pode entrar na sua conta com a nova senha.
              </p>
              <Link href="/login" className="btn-primary inline-flex items-center gap-2 py-3 px-6">
                <ArrowLeft size={16} />
                Fazer login
              </Link>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-navy-100 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck size={26} className="text-navy-600" />
              </div>

              <h1 className="font-display font-black text-3xl text-navy-700 mb-2">
                Nova senha
              </h1>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Escolha uma senha forte com pelo menos 8 caracteres.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-navy-700 mb-2">Nova senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="input-field pl-11 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy-700 mb-2">Confirmar nova senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="input-field pl-11"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    "Redefinir senha"
                  )}
                </button>
              </form>

              <div className="flex items-center gap-3 my-7">
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <p className="text-center text-gray-500 text-sm">
                <Link href="/login" className="flex items-center justify-center gap-2 text-navy-600 hover:text-gold-600 font-medium transition-colors">
                  <ArrowLeft size={14} />
                  Voltar para o login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
