"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, Loader2, CheckCircle, KeyRound } from "lucide-react";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
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
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h1 className="font-display font-black text-3xl text-navy-700 mb-3">E-mail enviado!</h1>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Se este e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha. Verifique também a caixa de spam.
              </p>
              <Link href="/login" className="btn-primary inline-flex items-center gap-2 py-3 px-6">
                <ArrowLeft size={16} />
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-gold-100 rounded-2xl flex items-center justify-center mb-6">
                <KeyRound size={26} className="text-gold-600" />
              </div>

              <h1 className="font-display font-black text-3xl text-navy-700 mb-2">
                Esqueceu a senha?
              </h1>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Sem problemas! Informe seu e-mail e enviaremos um link para você criar uma nova senha.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-navy-700 mb-2">E-mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
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
                    "Enviar instruções"
                  )}
                </button>
              </form>

              <div className="flex items-center gap-3 my-7">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-gray-400 text-sm">ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <p className="text-center text-gray-500 text-sm">
                Lembrou a senha?{" "}
                <Link href="/login" className="text-navy-600 hover:text-gold-600 font-bold transition-colors">
                  Entrar na conta
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
