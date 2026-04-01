"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, Loader2, Check } from "lucide-react";
import { saveSession } from "@/lib/api";
import { useLoading } from "@/components/LoadingProvider";

export default function CadastroPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "";
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { show: showLoading } = useLoading();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const nameParts = form.full_name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setError("Informe seu nome e sobrenome.");
      return;
    }

    if (form.phone) {
      const phoneDigits = form.phone.replace(/\D/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        setError("Telefone inválido. Informe DDD + número (ex: 41999999999).");
        return;
      }
    }

    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (form.password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (!form.terms) {
      setError("Você precisa aceitar os termos de uso.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (Array.isArray(data.detail)) {
          setError(data.detail.map((d: {msg?: string}) => d.msg ?? JSON.stringify(d)).join(", "));
        } else {
          setError(data.detail || "Erro ao criar conta. Tente novamente.");
        }
        return;
      }

      saveSession(data.access_token, data.refresh_token, data.user);
      const dest = redirectTo || (data.user.is_admin ? "/admin" : "/dashboard");
      showLoading();
      window.location.href = dest;
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-3xl shadow-card p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={36} className="text-emerald-500" />
          </div>
          <h2 className="font-display font-black text-2xl text-navy-700 mb-3">
            Conta criada com sucesso!
          </h2>
          <p className="text-gray-500 mb-8">
            Bem-vindo à AJS Turismo! Agora você pode explorar nossos pacotes e fazer suas reservas.
          </p>
          <Link href="/login" className="btn-primary w-full flex items-center justify-center gap-2">
            Fazer login agora
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&fit=crop"
          alt="AJS Turismo"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-navy-800/80" />
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
            <h2 className="text-white font-display font-black text-3xl mb-4">
              Junte-se a mais de 5.000 viajantes!
            </h2>
            <ul className="space-y-3">
              {[
                "Acesse ofertas exclusivas para membros",
                "Gerencie suas reservas facilmente",
                "Histórico completo das suas viagens",
                "Suporte prioritário via WhatsApp",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-white/80 text-sm">
                  <Check size={16} className="text-gold-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-16 xl:px-20 bg-white overflow-y-auto">
        <Link href="/" className="flex items-center gap-3 mb-8 lg:hidden">
          <div className="relative w-10 h-10">
            <Image src="/icon_ajs.png" alt="AJS Turismo" fill className="object-contain" />
          </div>
          <span className="font-display font-black text-navy-700 text-xl">AJS Turismo</span>
        </Link>

        <div className="max-w-md w-full mx-auto">
          <h1 className="font-display font-black text-3xl text-navy-700 mb-2">
            Criar conta grátis
          </h1>
          <p className="text-gray-500 mb-8">
            Cadastre-se e comece a planejar sua próxima aventura.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Full name */}
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">Nome completo</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Seu nome completo"
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">E-mail</label>
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

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">WhatsApp / Telefone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">Confirmar senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Repita a senha"
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded accent-navy-600"
              />
              <span className="text-sm text-gray-500">
                Concordo com os{" "}
                <Link href="/termos" className="text-navy-600 hover:text-gold-600 font-medium">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" className="text-navy-600 hover:text-gold-600 font-medium">
                  Política de Privacidade
                </Link>
              </span>
            </label>

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
                  Criar minha conta
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-navy-600 hover:text-gold-600 font-bold transition-colors">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
