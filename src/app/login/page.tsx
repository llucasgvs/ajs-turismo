"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Email ou senha incorretos.");
        return;
      }

      localStorage.setItem("ajs_token", data.access_token);
      localStorage.setItem("ajs_user", JSON.stringify(data.user));
      window.location.href = data.user.is_admin ? "/admin" : "/dashboard";
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80&fit=crop"
          alt="Viagem AJS"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-navy-800/75" />

        <div className="absolute inset-0 flex flex-col justify-between p-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-12 h-12">
              <Image src="/logo2.jpeg" alt="AJS Turismo" fill className="object-contain" />
            </div>
            <div>
              <span className="font-display font-black text-white text-2xl">AJS</span>
              <span className="text-gold-400 text-sm block tracking-[0.2em] uppercase -mt-1">Turismo</span>
            </div>
          </Link>

          {/* Quote */}
          <div>
            <blockquote className="text-white/90 text-2xl font-display font-bold leading-snug mb-4">
              &ldquo;Viajar é a única coisa que você compra que te torna mais rico.&rdquo;
            </blockquote>
            <p className="text-white/50 text-sm">— Anônimo</p>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-white">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="relative w-10 h-10">
            <Image src="/logo2.jpeg" alt="AJS Turismo" fill className="object-contain" />
          </div>
          <div>
            <span className="font-display font-black text-navy-700 text-xl">AJS Turismo</span>
          </div>
        </Link>

        <div className="max-w-md w-full mx-auto">
          <h1 className="font-display font-black text-3xl text-navy-700 mb-2">
            Bem-vindo de volta!
          </h1>
          <p className="text-gray-500 mb-8">
            Entre na sua conta e explore nossas viagens.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="seu@email.com"
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-navy-700">Senha</label>
                <Link href="/esqueci-senha" className="text-xs text-gold-600 hover:text-gold-500 font-medium">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Entrar na minha conta
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Register */}
          <p className="text-center text-gray-500 text-sm">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="text-navy-600 hover:text-gold-600 font-bold transition-colors">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
