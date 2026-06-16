"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  QrCode, CreditCard, Copy, Check, Loader2, CheckCircle2,
  ShieldCheck, ArrowLeft, Lock,
} from "lucide-react";
import { apiFetch, getUser } from "@/lib/api";
import { fmtBRL, fmtInstallment } from "@/lib/format";
import { BrandedLoader } from "@/components/BrandedLoader";

interface Booking {
  booking_code: string;
  final_amount: number;
  num_travelers: number;
  status: string;
  trip_title?: string;
  trip_destination?: string;
  trip_departure_date?: string;
  trip_max_installments?: number;
}

type Method = "pix" | "card";

function onlyDigits(s: string) { return s.replace(/\D/g, ""); }

export default function CheckoutPage({ params }: { params: { code: string } }) {
  const { code } = params;
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<Method>("pix");
  const [confirmed, setConfirmed] = useState(false);

  const loadStatus = useCallback(async (): Promise<string | null> => {
    try {
      const r = await apiFetch(`/payments/${code}/status`);
      if (r.ok) {
        const d: Booking = await r.json();
        setBooking(d);
        return d.status;
      }
    } catch { /* ignore */ }
    return null;
  }, [code]);

  useEffect(() => {
    loadStatus().then((st) => {
      if (st === "confirmed") setConfirmed(true);
      setLoading(false);
    });
  }, [loadStatus]);

  if (loading) {
    return <BrandedLoader label="Carregando pagamento..." />;
  }

  if (confirmed || booking?.status === "confirmed") {
    return <SuccessScreen code={code} amount={booking?.final_amount} />;
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Não encontramos esta reserva.</p>
          <Link href="/viagens" className="text-navy-700 font-semibold">Ver viagens</Link>
        </div>
      </main>
    );
  }

  const maxInst = booking.trip_max_installments || 1;

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-500 hover:text-navy-700 text-sm mb-5 transition-colors">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="grid md:grid-cols-[1fr_320px] gap-5">
          {/* Coluna de pagamento */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-navy-700 px-6 py-5 text-white">
              <h1 className="font-display font-black text-xl">Pagamento seguro</h1>
              <p className="text-navy-100 text-sm flex items-center gap-1.5 mt-1">
                <Lock size={13} /> Ambiente protegido — AJS Turismo
              </p>
            </div>

            {/* Tabs de método */}
            <div className="flex border-b border-gray-100">
              <TabButton active={method === "pix"} onClick={() => setMethod("pix")} icon={<QrCode size={18} />} label="PIX" hint="Aprovação na hora" />
              <TabButton active={method === "card"} onClick={() => setMethod("card")} icon={<CreditCard size={18} />} label="Cartão" hint={maxInst > 1 ? `até ${maxInst}x` : "à vista"} />
            </div>

            <div className="p-6">
              {method === "pix"
                ? <PixPanel code={code} onConfirmed={() => setConfirmed(true)} pollStatus={loadStatus} />
                : <CardPanel code={code} amount={booking.final_amount} maxInst={maxInst} onConfirmed={() => setConfirmed(true)} />}
            </div>
          </div>

          {/* Resumo */}
          <aside className="bg-white rounded-2xl shadow-sm p-5 h-fit">
            <h2 className="font-bold text-navy-800 mb-3">Resumo</h2>
            {booking.trip_title && (
              <p className="text-sm text-gray-800 font-semibold">{booking.trip_title}</p>
            )}
            {booking.trip_destination && (
              <p className="text-sm text-gray-500">{booking.trip_destination}</p>
            )}
            {booking.trip_departure_date && (
              <p className="text-sm text-gray-500 mt-1">
                {new Date(booking.trip_departure_date.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">{booking.num_travelers} viajante{booking.num_travelers > 1 ? "s" : ""}</p>
            <div className="border-t border-gray-100 mt-4 pt-4 flex items-end justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="font-display font-black text-2xl text-navy-800">R$ {fmtBRL(booking.final_amount)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Código: {booking.booking_code}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <ShieldCheck size={14} className="text-emerald-500" /> Pagamento processado com segurança
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function TabButton({ active, onClick, icon, label, hint }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <button onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-4 border-b-2 transition-colors ${active ? "border-navy-700 text-navy-800 bg-navy-50/40" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
      <div className="flex items-center gap-2 font-bold">{icon}{label}</div>
      <span className="text-[11px] font-medium">{hint}</span>
    </button>
  );
}

/* ── PIX ──────────────────────────────────────────────────────────────── */
function PixPanel({ code, onConfirmed, pollStatus }: { code: string; onConfirmed: () => void; pollStatus: () => Promise<string | null> }) {
  const [qr, setQr] = useState<{ image: string; payload: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true); setError("");
    try {
      const r = await apiFetch(`/payments/${code}/pix`, { method: "POST" });
      if (!r.ok) { const e = await r.json(); setError(e.detail || "Erro ao gerar o PIX."); return; }
      const d = await r.json();
      setQr({ image: d.qr_image, payload: d.qr_payload });
    } catch { setError("Erro de conexão. Tente novamente."); }
    finally { setLoading(false); }
  };

  // Quando o QR estiver visível, faz polling do status até confirmar
  useEffect(() => {
    if (!qr) return;
    const t = setInterval(async () => {
      const st = await pollStatus();
      if (st === "confirmed") { clearInterval(t); onConfirmed(); }
    }, 3000);
    return () => clearInterval(t);
  }, [qr, pollStatus, onConfirmed]);

  const copy = () => {
    if (!qr) return;
    navigator.clipboard.writeText(qr.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!qr) {
    return (
      <div className="text-center py-6">
        <QrCode size={44} className="text-navy-600 mx-auto mb-3" />
        <p className="text-gray-600 text-sm mb-1">Pague em segundos com o PIX</p>
        <p className="text-gray-400 text-xs mb-5">Aprovação imediata e sua vaga é confirmada na hora.</p>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button onClick={generate} disabled={loading}
          className="bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-60">
          {loading ? "Gerando..." : "Gerar QR Code PIX"}
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="inline-block p-3 bg-white border border-gray-200 rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${qr.image}`} alt="QR Code PIX" className="w-52 h-52" />
      </div>
      <p className="text-sm text-gray-600 mt-4 mb-2 font-medium">Escaneie o QR Code no app do seu banco</p>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 mt-3">
        <span className="text-xs text-gray-500 truncate flex-1 text-left px-1">{qr.payload}</span>
        <button onClick={copy} className="flex items-center gap-1 bg-navy-700 hover:bg-navy-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shrink-0">
          {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 text-navy-600 text-sm mt-5">
        <Loader2 size={15} className="animate-spin" /> Aguardando confirmação do pagamento…
      </div>
    </div>
  );
}

/* ── Cartão ───────────────────────────────────────────────────────────── */
function CardPanel({ code, amount, maxInst, onConfirmed }: { code: string; amount: number; maxInst: number; onConfirmed: () => void }) {
  const user = typeof window !== "undefined" ? getUser() : null;
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState(user?.full_name || "");
  const [expiry, setExpiry] = useState("");
  const [ccv, setCcv] = useState("");
  const [installments, setInstallments] = useState(1);
  const [cpf, setCpf] = useState(user?.cpf || "");
  const [cep, setCep] = useState("");
  const [addrNumber, setAddrNumber] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fmtCardNumber = (v: string) => onlyDigits(v).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExpiry = (v: string) => { const d = onlyDigits(v).slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const num = onlyDigits(number);
    const [mm, yy] = expiry.split("/");
    if (num.length < 13) { setError("Número do cartão inválido."); return; }
    if (!mm || !yy) { setError("Validade inválida (MM/AA)."); return; }
    if (ccv.length < 3) { setError("CVV inválido."); return; }
    if (onlyDigits(cpf).length !== 11) { setError("CPF inválido."); return; }
    if (onlyDigits(cep).length !== 8) { setError("CEP inválido."); return; }
    if (!addrNumber) { setError("Informe o número do endereço."); return; }

    setLoading(true);
    try {
      const r = await apiFetch(`/payments/${code}/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holder_name: holder, number: num,
          expiry_month: mm, expiry_year: yy, ccv,
          cpf: onlyDigits(cpf), postal_code: onlyDigits(cep),
          address_number: addrNumber, phone: onlyDigits(phone),
          installments,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.detail || "Pagamento não autorizado. Verifique os dados do cartão."); return; }
      if (d.status === "confirmed") onConfirmed();
      else setError(d.message || "Pagamento em análise. Avisaremos a confirmação.");
    } catch { setError("Erro de conexão. Tente novamente."); }
    finally { setLoading(false); }
  };

  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400";

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2.5">{error}</div>}

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Número do cartão</label>
        <input inputMode="numeric" value={number} onChange={e => setNumber(fmtCardNumber(e.target.value))} placeholder="0000 0000 0000 0000" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Nome impresso no cartão</label>
        <input value={holder} onChange={e => setHolder(e.target.value.toUpperCase())} placeholder="COMO ESTÁ NO CARTÃO" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Validade</label>
          <input inputMode="numeric" value={expiry} onChange={e => setExpiry(fmtExpiry(e.target.value))} placeholder="MM/AA" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">CVV</label>
          <input inputMode="numeric" value={ccv} onChange={e => setCcv(onlyDigits(e.target.value).slice(0, 4))} placeholder="123" className={inputCls} />
        </div>
      </div>

      {maxInst > 1 && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Parcelas</label>
          <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className={inputCls}>
            {Array.from({ length: maxInst }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}x de R$ {fmtInstallment(amount, n)} {n === 1 ? "à vista" : "sem juros"}</option>
            ))}
          </select>
        </div>
      )}

      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-2 mt-2">Dados do titular (segurança antifraude)</p>
        <div className="grid grid-cols-2 gap-3">
          <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="CPF" className={inputCls} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefone" className={inputCls} />
          <input value={cep} onChange={e => setCep(e.target.value)} placeholder="CEP" className={inputCls} />
          <input value={addrNumber} onChange={e => setAddrNumber(e.target.value)} placeholder="Nº do endereço" className={inputCls} />
        </div>
      </div>

      <button type="submit" disabled={loading}
        className="w-full bg-navy-700 hover:bg-navy-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
        {loading ? <><Loader2 size={17} className="animate-spin" /> Processando…</> : <><Lock size={15} /> Pagar R$ {fmtBRL(amount)}</>}
      </button>
      <p className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-1">
        <ShieldCheck size={12} className="text-emerald-500" /> Seus dados são transmitidos com criptografia
      </p>
    </form>
  );
}

/* ── Sucesso ──────────────────────────────────────────────────────────── */
function SuccessScreen({ code, amount }: { code: string; amount?: number }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="font-display font-black text-2xl text-navy-800 mb-2">Pagamento confirmado! 🎉</h1>
        <p className="text-gray-600 text-sm mb-5">Sua vaga está garantida. Enviaremos os detalhes em breve.</p>
        <div className="bg-navy-50 rounded-xl p-4 mb-6">
          <p className="text-navy-600 text-sm">Código da reserva</p>
          <p className="font-black text-navy-800 text-lg">{code}</p>
          {amount != null && <p className="text-navy-600 text-sm mt-1">Valor: R$ {fmtBRL(amount)}</p>}
        </div>
        <Link href="/dashboard" className="block w-full bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 rounded-xl transition-colors">
          Ver minhas reservas
        </Link>
      </div>
    </main>
  );
}
