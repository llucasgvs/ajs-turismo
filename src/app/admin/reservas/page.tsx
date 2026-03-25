"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { Check, X, Plus, Search, User, Phone, CreditCard, Cake, Users, FileText, MapPin, DollarSign, MessageSquare, Clock, Copy, CheckCheck, Filter, Globe, Store, Loader2, ChevronDown, Pencil, AlertTriangle } from "lucide-react";
import { getToken } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PAGE_SIZE = 25;

/* ─── Types ─── */
type Booking = {
  id: number;
  booking_code: string;
  trip_id: number;
  user_id: number | null;
  traveler_name: string | null;
  traveler_cpf: string | null;
  traveler_phone: string | null;
  traveler_birth_date: string | null;
  num_travelers: number;
  price_per_person: number;
  total_amount: number;
  final_amount: number;
  payment_method: string | null;
  status: string;
  notes: string | null;
  travelers_info: string | null;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  updated_at: string | null;
  discount_amount: number;
  installments: number;
  is_external: boolean;
};

type Trip = { id: number; title: string; destination: string; price_per_person: number; available_spots: number };

const STATUS_LABEL: Record<string, { label: string; color: string; border: string }> = {
  interesse:  { label: "Interesse",  color: "bg-amber-100 text-amber-700",     border: "border-l-amber-400" },
  pending:    { label: "Pendente",   color: "bg-blue-100 text-blue-700",       border: "border-l-blue-400" },
  confirmed:  { label: "Confirmado", color: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-400" },
  cancelled:  { label: "Cancelado",  color: "bg-red-100 text-red-700",         border: "border-l-red-400" },
  completed:  { label: "Realizado",  color: "bg-gray-100 text-gray-600",       border: "border-l-gray-300" },
};

function fmt(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function WaitingBadge({ createdAt }: { createdAt: string }) {
  const days = daysSince(createdAt);
  if (days === 0) return null;
  const label = days === 1 ? "há 1 dia" : `há ${days} dias`;
  const cls =
    days >= 5
      ? "bg-red-100 text-red-600"
      : days >= 3
      ? "bg-amber-100 text-amber-600"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>
      {label}
    </span>
  );
}

function buildWaUrl(phone: string, name: string, code: string) {
  const clean = phone.replace(/\D/g, "");
  const number = clean.startsWith("55") ? clean : `55${clean}`;
  const msg = `Olá ${name}! Aqui é a equipe AJS Turismo. Gostaria de falar sobre sua reserva *${code}*.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
}

/* ─── Pagination ─── */
function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const show = new Set([1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = Array.from(show).sort((a, b) => a - b);
  return (
    <div className="flex items-center justify-center gap-1 py-2">
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
        ← Anterior
      </button>
      {sorted.map((p, i) => {
        const prev = sorted[i - 1];
        return (
          <Fragment key={p}>
            {prev && p - prev > 1 && <span className="px-1 text-gray-300 select-none">…</span>}
            <button onClick={() => onPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${p === page ? "bg-navy-800 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}>
              {p}
            </button>
          </Fragment>
        );
      })}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
        className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
        Próxima →
      </button>
    </div>
  );
}

/* ─── Booking Detail Modal ─── */
function BookingDetailModal({ booking, trip, onClose, onConfirm, onEdit, onCancel, actionLoading }: {
  booking: Booking;
  trip: Trip | undefined;
  onClose: () => void;
  onConfirm: (code: string) => void;
  onEdit: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  actionLoading: string | null;
}) {
  const st = STATUS_LABEL[booking.status] ?? { label: booking.status, color: "bg-gray-100 text-gray-600", border: "border-l-gray-300" };
  const travelerName = booking.traveler_name || `Usuário #${booking.user_id}`;
  const [codeCopied, setCodeCopied] = useState(false);
  const copyCode = () => {
    navigator.clipboard.writeText(booking.booking_code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };
  const companions: { full_name: string; cpf: string; birth_date: string }[] = (() => {
    try { return booking.travelers_info ? JSON.parse(booking.travelers_info) : []; }
    catch { return []; }
  })();
  const isLoading = actionLoading === booking.booking_code;
  const canAct = ["interesse", "confirmed", "pending"].includes(booking.status);

  const PAYMENT_LABEL: Record<string, string> = {
    whatsapp: "WhatsApp / Presencial",
    pix: "PIX",
    transfer: "Transferência",
    credit_card: "Cartão de crédito",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={copyCode} className="flex items-center gap-1.5 font-mono text-sm text-navy-700 font-bold hover:text-gold-600 transition-colors group">
              {booking.booking_code}
              {codeCopied ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} className="text-gray-300 group-hover:text-gold-500 transition-colors" />}
            </button>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
            {booking.is_external
              ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700"><Store size={10} /> Externo</span>
              : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"><Globe size={10} /> Via Site</span>
            }
            {booking.status === "interesse" && <WaitingBadge createdAt={booking.created_at} />}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Viagem */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><MapPin size={11} /> Viagem</p>
            <p className="font-bold text-navy-800">{trip?.title ?? `Viagem #${booking.trip_id}`}</p>
            {trip?.destination && <p className="text-sm text-gray-500 mt-0.5">{trip.destination}</p>}
          </section>

          {/* Titular */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><User size={11} /> Titular</p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
              <p className="font-semibold text-navy-800">{travelerName}</p>
              {booking.traveler_cpf && (
                <p className="text-gray-500 font-mono text-xs flex items-center gap-1.5"><CreditCard size={11} className="text-gray-400" />{booking.traveler_cpf}</p>
              )}
              {booking.traveler_phone && (
                <div className="flex items-center gap-2">
                  <p className="text-gray-500 text-xs flex items-center gap-1.5"><Phone size={11} className="text-gray-400" />{booking.traveler_phone}</p>
                  <a href={buildWaUrl(booking.traveler_phone, travelerName, booking.booking_code)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors">
                    <MessageSquare size={11} /> WhatsApp
                  </a>
                </div>
              )}
              {booking.traveler_birth_date && (
                <p className="text-gray-500 text-xs flex items-center gap-1.5"><Cake size={11} className="text-gray-400" />{fmt(booking.traveler_birth_date)}</p>
              )}
            </div>
          </section>

          {/* Acompanhantes */}
          {companions.length > 0 && (
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Users size={11} /> Acompanhantes ({companions.length})</p>
              <div className="space-y-2">
                {companions.map((c, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-1">
                    <p className="font-semibold text-navy-800 text-sm">{c.full_name}</p>
                    <p className="text-xs text-gray-500 font-mono flex items-center gap-1.5"><CreditCard size={11} className="text-gray-400" />{c.cpf}</p>
                    {c.birth_date && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Cake size={11} className="text-gray-400" />{fmt(c.birth_date)}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Financeiro */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><DollarSign size={11} /> Financeiro</p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{booking.num_travelers} pessoa{booking.num_travelers !== 1 ? "s" : ""} × R$ {booking.price_per_person.toLocaleString("pt-BR")}</span>
                <span>R$ {booking.total_amount.toLocaleString("pt-BR")}</span>
              </div>
              {booking.discount_amount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Desconto</span>
                  <span>− R$ {booking.discount_amount.toLocaleString("pt-BR")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-navy-800 border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>R$ {booking.final_amount.toLocaleString("pt-BR")}</span>
              </div>
              <p className="text-xs text-gray-400">{PAYMENT_LABEL[booking.payment_method ?? ""] ?? booking.payment_method ?? "—"}{booking.installments > 1 ? ` · ${booking.installments}x` : ""}</p>
            </div>
          </section>

          {/* Observações */}
          {booking.notes && (
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><MessageSquare size={11} /> Observações</p>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{booking.notes}</p>
            </section>
          )}

          {/* Histórico */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Clock size={11} /> Histórico</p>
            <div className="space-y-1 text-xs text-gray-500">
              <p>Criado em {fmt(booking.created_at)}</p>
              {booking.updated_at && booking.updated_at !== booking.created_at && (
                <p className="text-gray-400">Editado em {fmt(booking.updated_at)}</p>
              )}
              {booking.confirmed_at && <p className="text-emerald-600">Confirmado em {fmt(booking.confirmed_at)}</p>}
              {booking.cancelled_at && <p className="text-red-500">Cancelado em {fmt(booking.cancelled_at)}</p>}
            </div>
          </section>
        </div>

        {/* Actions */}
        {canAct && (
          <div className="p-4 border-t border-gray-100 flex gap-2">
            {booking.status === "interesse" && (
              <button onClick={() => { onConfirm(booking.booking_code); onClose(); }} disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm">
                <Check size={14} /> Confirmar
              </button>
            )}
            <button onClick={() => { onEdit(booking); onClose(); }} disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 border border-navy-300 text-navy-700 bg-navy-50 hover:bg-navy-100 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm">
              <Pencil size={14} /> Editar
            </button>
            <button onClick={() => { onCancel(booking); onClose(); }} disabled={isLoading}
              className="flex items-center justify-center gap-1.5 border border-red-200 text-red-500 hover:bg-red-50 font-bold py-3 px-3 sm:px-4 rounded-xl transition-colors disabled:opacity-50 text-sm">
              <X size={14} />
              <span className="hidden sm:inline">Cancelar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Edit Booking Modal ─── */
function EditBookingModal({ booking, onClose, onSaved }: {
  booking: Booking;
  onClose: () => void;
  onSaved: () => void;
}) {
  type Companion = { full_name: string; cpf: string; birth_date: string };

  const parsedCompanions: Companion[] = (() => {
    try { return booking.travelers_info ? JSON.parse(booking.travelers_info) : []; }
    catch { return []; }
  })();

  const [price, setPrice] = useState(String(booking.price_per_person));
  const [discount, setDiscount] = useState(String(booking.discount_amount || ""));
  const [paymentMethod, setPaymentMethod] = useState(booking.payment_method || "whatsapp");
  const [notes, setNotes] = useState(booking.notes || "");
  const [phone, setPhone] = useState(booking.traveler_phone || "");
  const [people, setPeople] = useState(booking.num_travelers);
  const [companions, setCompanions] = useState<Companion[]>(
    parsedCompanions.length > 0
      ? parsedCompanions
      : Array.from({ length: Math.max(0, booking.num_travelers - 1) }, () => ({ full_name: "", cpf: "", birth_date: "" }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatCPF = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const changePeople = (n: number) => {
    const clamped = Math.max(1, n);
    setPeople(clamped);
    setCompanions((prev) => {
      const need = clamped - 1;
      if (need > prev.length) return [...prev, ...Array.from({ length: need - prev.length }, () => ({ full_name: "", cpf: "", birth_date: "" }))];
      return prev.slice(0, need);
    });
  };

  const updateCompanion = (i: number, field: keyof Companion, value: string) => {
    setCompanions((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const priceNum = parseFloat(price) || 0;
  const discNum = parseFloat(discount) || 0;
  const total = priceNum * people - discNum;
  const changed = priceNum !== booking.price_per_person || discNum !== (booking.discount_amount || 0) || people !== booking.num_travelers;

  const PAYMENT_LABEL: Record<string, string> = {
    whatsapp: "Presencial / WhatsApp", pix: "PIX", transfer: "Transferência", credit_card: "Cartão de crédito",
  };

  const handleSave = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/bookings/${booking.booking_code}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await import("@/lib/api")).getToken()}` },
        body: JSON.stringify({
          price_per_person: priceNum !== booking.price_per_person ? priceNum : undefined,
          discount_amount: discNum,
          payment_method: paymentMethod,
          notes: notes || null,
          traveler_phone: phone || undefined,
          num_travelers: people,
          companions: companions.map((c) => ({ full_name: c.full_name, cpf: c.cpf, birth_date: c.birth_date || undefined })),
        }),
      });
      if (!res.ok) { const e = await res.json(); setError(e.detail || "Erro ao salvar."); return; }
      onSaved();
      onClose();
    } catch { setError("Erro de conexão."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-navy-800 text-base flex items-center gap-2"><Pencil size={15} /> Editar Reserva</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{booking.booking_code} · {booking.traveler_name || `Usuário #${booking.user_id}`}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          {/* Preço + Desconto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Preço / pessoa</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">R$</span>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 ${priceNum !== booking.price_per_person ? "border-amber-300 bg-amber-50" : "border-gray-200"}`} />
              </div>
              {priceNum !== booking.price_per_person && <p className="text-[10px] text-amber-600 mt-1">Original: R$ {booking.price_per_person.toLocaleString("pt-BR")}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Desconto <span className="text-gray-400 font-normal normal-case">(R$)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">R$</span>
                <input type="number" min="0" step="0.01" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
            </div>
          </div>

          {/* Pessoas + Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pessoas</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white">
                <button type="button" onClick={() => changePeople(people - 1)}
                  className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors">−</button>
                <span className="flex-1 text-center font-bold text-sm text-navy-800">{people}</span>
                <button type="button" onClick={() => changePeople(people + 1)}
                  className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors">+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pagamento</label>
              <div className="relative">
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none bg-white cursor-pointer">
                  {Object.entries(PAYMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Telefone do titular</label>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="tel" placeholder="(41) 99999-9999" value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
            </div>
          </div>

          {/* Acompanhantes */}
          {companions.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Users size={11} /> Acompanhantes ({companions.length})
              </label>
              {companions.map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400">Acompanhante {i + 1}</p>
                  <div className="relative">
                    <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Nome completo" value={c.full_name}
                      onChange={(e) => updateCompanion(i, "full_name", e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <CreditCard size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" inputMode="numeric" placeholder="CPF" value={c.cpf}
                        onChange={(e) => updateCompanion(i, "cpf", formatCPF(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white" />
                    </div>
                    <div className="relative">
                      <Cake size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="date" value={c.birth_date}
                        onChange={(e) => updateCompanion(i, "birth_date", e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Observações</label>
            <div className="relative">
              <FileText size={13} className="absolute left-3 top-3 text-gray-400" />
              <textarea rows={2} placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none" />
            </div>
          </div>

          {/* Total */}
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between text-sm ${changed ? "bg-amber-50 border border-amber-200" : "bg-navy-50"}`}>
            <span className="text-gray-500">{people} × R$ {priceNum.toLocaleString("pt-BR")}{discNum > 0 ? ` − R$ ${discNum.toLocaleString("pt-BR")}` : ""}</span>
            <span className="font-black text-navy-800 text-base">R$ {total.toLocaleString("pt-BR")}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-500 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-navy-800 hover:bg-navy-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : <><Check size={15} /> Salvar alterações</>}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ─── Cancel Confirm Modal ─── */
function CancelConfirmModal({ booking, trip, onClose, onConfirm, loading }: {
  booking: Booking;
  trip: Trip | undefined;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const travelerName = booking.traveler_name || `Usuário #${booking.user_id}`;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={26} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">Cancelar reserva?</h3>
              <p className="text-gray-400 text-sm mt-1">Esta ação não pode ser desfeita.</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5">
            <p className="font-mono text-xs text-gray-400">{booking.booking_code}</p>
            <p className="font-bold text-navy-800">{travelerName}</p>
            {trip && <p className="text-sm text-gray-500">{trip.title}</p>}
            <p className="text-xs text-gray-400">
              R$ {booking.final_amount.toLocaleString("pt-BR")} · {booking.num_travelers} pessoa{booking.num_travelers !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Voltar
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
              Cancelar reserva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── External Sale Modal ─── */
function ExternalSaleModal({ trips, onClose, onSaved }: {
  trips: Trip[];
  onClose: () => void;
  onSaved: () => void;
}) {
  type Companion = { full_name: string; cpf: string; birth_date: string };

  const [tripId, setTripId] = useState("");
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birth, setBirth] = useState("");
  const [people, setPeople] = useState(1);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("whatsapp");
  const [notes, setNotes] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [showPriceOverride, setShowPriceOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cpfStatus, setCpfStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [autoFilled, setAutoFilled] = useState(false);
  const cpfTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changePeople = (n: number) => {
    const max = selectedTrip?.available_spots ?? 99;
    const clamped = Math.max(1, Math.min(n, max));
    setPeople(clamped);
    setCompanions((prev) => {
      const need = clamped - 1;
      if (need > prev.length) return [...prev, ...Array.from({ length: need - prev.length }, () => ({ full_name: "", cpf: "", birth_date: "" }))];
      return prev.slice(0, need);
    });
  };

  const updateCompanion = (i: number, field: keyof Companion, value: string) => {
    setCompanions((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const formatCPF = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const handleCpfChange = (v: string) => {
    const formatted = formatCPF(v);
    setCpf(formatted);
    setAutoFilled(false);
    const clean = formatted.replace(/\D/g, "");
    if (clean.length < 11) { setCpfStatus("idle"); return; }
    setCpfStatus("loading");
    if (cpfTimer.current) clearTimeout(cpfTimer.current);
    cpfTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/bookings/admin/lookup-cpf?cpf=${clean}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const d = await res.json();
        if (d.found) {
          setCpfStatus("found");
          setName(d.full_name || "");
          setPhone(d.phone ? formatPhone(d.phone) : "");
          setBirth(d.birth_date ? d.birth_date.slice(0, 10) : "");
          setAutoFilled(true);
        } else {
          setCpfStatus("not_found");
          setAutoFilled(false);
        }
      } catch {
        setCpfStatus("idle");
      }
    }, 400);
  };

  const selectedTrip = trips.find((t) => String(t.id) === tripId);
  const effectivePrice = priceOverride ? parseFloat(priceOverride) || 0 : (selectedTrip?.price_per_person || 0);
  const total = effectivePrice * people;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!tripId) { setError("Selecione a viagem."); return; }
    if (cpf.replace(/\D/g, "").length < 11) { setError("CPF inválido."); return; }
    if (!name.trim()) { setError("Informe o nome do titular."); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/bookings/admin/external`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          trip_id: parseInt(tripId),
          traveler_name: name,
          traveler_cpf: cpf,
          traveler_phone: phone,
          traveler_birth_date: birth || undefined,
          num_travelers: people,
          companions: companions.filter((c) => c.full_name.trim()).map((c) => ({
            full_name: c.full_name,
            cpf: c.cpf,
            birth_date: c.birth_date || undefined,
          })),
          payment_method: paymentMethod,
          price_override: priceOverride ? parseFloat(priceOverride) : undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Erro ao salvar.");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-navy-800 text-base">Nova Venda Externa</h3>
            <p className="text-xs text-gray-400 mt-0.5">Walk-in · WhatsApp · Presencial</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          {/* 1. Viagem */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Viagem</label>
            <div className="relative">
              <select required value={tripId} onChange={(e) => setTripId(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none bg-white cursor-pointer">
                <option value="">Selecione a viagem...</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.available_spots} vagas · R$ {t.price_per_person.toLocaleString("pt-BR")})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {selectedTrip && (
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                <MapPin size={10} /> {selectedTrip.destination}
                <span className="mx-1">·</span>
                <span className="font-semibold text-navy-600">R$ {selectedTrip.price_per_person.toLocaleString("pt-BR")} / pessoa</span>
                <span className="mx-1">·</span>
                {selectedTrip.available_spots} vagas
              </p>
            )}
          </div>

          {/* 2. CPF com lookup */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">CPF do Titular</label>
            <div className="relative">
              <CreditCard size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" inputMode="numeric" placeholder="000.000.000-00"
                value={cpf} onChange={(e) => handleCpfChange(e.target.value)}
                className="w-full pl-8 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {cpfStatus === "loading" && <Loader2 size={14} className="text-gray-400 animate-spin" />}
                {cpfStatus === "found" && <Check size={14} className="text-emerald-500" />}
              </div>
            </div>
            {cpfStatus === "found" && (
              <p className="mt-1.5 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check size={11} /> Cliente encontrado — dados preenchidos automaticamente
              </p>
            )}
            {cpfStatus === "not_found" && (
              <p className="mt-1.5 text-xs text-gray-400">Novo cliente — preencha os dados abaixo</p>
            )}
          </div>

          {/* 3. Dados pessoais */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Dados do Titular</label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Nome completo" value={name} onChange={(e) => { setName(e.target.value); setAutoFilled(false); }}
                className={`w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 ${autoFilled ? "border-emerald-300 bg-emerald-50" : "border-gray-200"}`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" placeholder="(41) 99999-9999" value={phone}
                  onChange={(e) => { setPhone(formatPhone(e.target.value)); setAutoFilled(false); }}
                  className={`w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 ${autoFilled && phone ? "border-emerald-300 bg-emerald-50" : "border-gray-200"}`} />
              </div>
              <div className="relative">
                <Cake size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="date" value={birth} onChange={(e) => { setBirth(e.target.value); setAutoFilled(false); }}
                  className={`w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 ${autoFilled && birth ? "border-emerald-300 bg-emerald-50" : "border-gray-200"}`} />
              </div>
            </div>
            <p className="text-[10px] text-gray-400">Data de nascimento é opcional</p>
          </div>

          {/* 4. Quantidade + Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pessoas</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white">
                <button type="button" onClick={() => changePeople(people - 1)}
                  className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors">−</button>
                <span className="flex-1 text-center font-bold text-sm text-navy-800">{people}</span>
                <button type="button" onClick={() => changePeople(people + 1)}
                  className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors">+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pagamento</label>
              <div className="relative">
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none bg-white cursor-pointer">
                  <option value="whatsapp">Presencial / WA</option>
                  <option value="pix">PIX</option>
                  <option value="transfer">Transferência</option>
                  <option value="credit_card">Cartão</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 4b. Acompanhantes */}
          {companions.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Users size={11} /> Acompanhantes ({companions.length})
              </label>
              {companions.map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400">Acompanhante {i + 1}</p>
                  <div className="relative">
                    <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Nome completo *" value={c.full_name}
                      onChange={(e) => updateCompanion(i, "full_name", e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <CreditCard size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" inputMode="numeric" placeholder="CPF *" value={c.cpf}
                        onChange={(e) => updateCompanion(i, "cpf", formatCPF(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white" />
                    </div>
                    <div className="relative">
                      <Cake size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="date" value={c.birth_date}
                        onChange={(e) => updateCompanion(i, "birth_date", e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 5. Preço (override) */}
          <div>
            <button type="button" onClick={() => setShowPriceOverride((v) => !v)}
              className="text-xs text-navy-500 hover:text-navy-700 underline underline-offset-2 transition-colors">
              {showPriceOverride ? "Usar preço padrão da viagem" : "Alterar preço por pessoa?"}
            </button>
            {showPriceOverride && (
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">R$</span>
                <input type="number" min="0" step="0.01" placeholder={String(selectedTrip?.price_per_person || "0")}
                  value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-amber-300 bg-amber-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            )}
          </div>

          {/* 6. Obs */}
          <div className="relative">
            <FileText size={13} className="absolute left-3 top-3 text-gray-400" />
            <textarea rows={2} placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none" />
          </div>

          {/* Resumo + Submit */}
          {selectedTrip && (
            <div className="bg-navy-50 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">{people} pessoa{people !== 1 ? "s" : ""} × R$ {effectivePrice.toLocaleString("pt-BR")}</span>
              <span className="font-black text-navy-800 text-base">R$ {total.toLocaleString("pt-BR")}</span>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : "Confirmar Venda"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function AdminReservasPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ interesse: 0, confirmed: 0, cancelled: 0, all: 0 });
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tab, setTab] = useState<"interesse" | "confirmed" | "cancelled" | "all">("interesse");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showExternal, setShowExternal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editTarget, setEditTarget] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [tripFilter, setTripFilter] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [tab, tripFilter, debouncedSearch]);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/bookings/admin/counts`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setCounts(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("skip", String((page - 1) * PAGE_SIZE));
      params.set("limit", String(PAGE_SIZE));
      if (tab !== "all") params.set("booking_status", tab);
      if (tripFilter) params.set("trip_id", tripFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`${API}/bookings/admin/all?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.items);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, tab, tripFilter, debouncedSearch]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  useEffect(() => {
    fetch(`${API}/trips/admin-list`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.json()).then((d) => { if (Array.isArray(d)) setTrips(d); }).catch(() => {});
  }, []);

  const confirm = async (code: string) => {
    // Used only from BookingDetailModal (no price adjust)
    setActionLoading(code);
    try {
      await fetch(`${API}/bookings/${code}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({}),
      });
      fetchBookings();
      fetchCounts();
    } finally {
      setActionLoading(null);
    }
  };

  const promptCancel = (booking: Booking) => {
    setCancelTarget(booking);
  };

  const executeCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await fetch(`${API}/bookings/${cancelTarget.booking_code}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setCancelTarget(null);
      fetchBookings();
      fetchCounts();
    } finally {
      setCancelLoading(false);
    }
  };

  const tripMap = Object.fromEntries(trips.map((t) => [t.id, t]));
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: "all",        label: "Todas",       count: counts.all },
    { key: "interesse",  label: "Interesses",  count: counts.interesse },
    { key: "confirmed",  label: "Confirmadas", count: counts.confirmed },
    { key: "cancelled",  label: "Canceladas",  count: counts.cancelled },
  ];

  return (
    <div className="space-y-6">
      {cancelTarget && (
        <CancelConfirmModal
          booking={cancelTarget}
          trip={tripMap[cancelTarget.trip_id]}
          onClose={() => setCancelTarget(null)}
          onConfirm={executeCancel}
          loading={cancelLoading}
        />
      )}

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          trip={tripMap[selectedBooking.trip_id]}
          onClose={() => setSelectedBooking(null)}
          onConfirm={(code) => { confirm(code); setSelectedBooking(null); }}
          onEdit={(b) => { setSelectedBooking(null); setEditTarget(b); }}
          onCancel={(b) => { setSelectedBooking(null); promptCancel(b); }}
          actionLoading={actionLoading}
        />
      )}

      {editTarget && (
        <EditBookingModal
          booking={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={fetchBookings}
        />
      )}

      {showExternal && (
        <ExternalSaleModal
          trips={trips.filter((t) => t.available_spots > 0)}
          onClose={() => setShowExternal(false)}
          onSaved={fetchBookings}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy-900">Reservas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Interesses e vendas confirmadas</p>
        </div>
        <button onClick={() => setShowExternal(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
          <Plus size={16} /> Nova Venda Externa
        </button>
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-col gap-3">
        {/* Mobile: grid 2x2 | Desktop: flex em linha */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {tabs.map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                tab === key
                  ? "bg-navy-800 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-navy-300 hover:text-navy-700"
              }`}>
              {label}
              {count > 0 && (
                <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold px-1 ${
                  tab === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar por código, nome ou CPF..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select value={tripFilter} onChange={(e) => setTripFilter(e.target.value)}
              className={`w-full sm:w-auto pl-8 pr-8 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none cursor-pointer ${tripFilter ? "border-navy-400 bg-navy-50 text-navy-700 font-semibold" : "border-gray-200 text-gray-500"}`}>
              <option value="">Todas as viagens</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Nenhuma reserva encontrada</p>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            {bookings.map((b) => {
              const trip = tripMap[b.trip_id];
              const st = STATUS_LABEL[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600", border: "border-l-gray-300" };
              const isLoading = actionLoading === b.booking_code;
              const travelerName = b.traveler_name || `Usuário #${b.user_id}`;
              return (
                <div key={b.id} onClick={() => setSelectedBooking(b)}
                  className={`rounded-xl border border-gray-100 border-l-4 ${st.border} bg-gray-50 p-4 space-y-3 transition-all duration-200 hover:bg-white hover:shadow-md cursor-pointer`}>
                  {/* Info + badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <button onClick={(e) => { e.stopPropagation(); copyCode(b.booking_code); }}
                          className="flex items-center gap-1 font-mono text-xs text-navy-500 font-semibold hover:text-gold-600 transition-colors group">
                          {b.booking_code}
                          {copiedCode === b.booking_code ? <CheckCheck size={11} className="text-emerald-500" /> : <Copy size={11} className="text-gray-300 group-hover:text-gold-500" />}
                        </button>
                        {b.is_external
                          ? <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-purple-600"><Store size={9} /> Ext.</span>
                          : <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-500"><Globe size={9} /> Site</span>
                        }
                        <span className="text-gray-300 hidden sm:inline">·</span>
                        <span className="font-bold text-navy-800 text-sm truncate">{trip?.title ?? `Viagem #${b.trip_id}`}</span>
                        {trip?.destination && <span className="text-xs text-gray-400 hidden sm:inline">{trip.destination}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                        <span className="font-medium text-gray-600 truncate">{travelerName}</span>
                        {b.traveler_cpf && <><span className="hidden sm:inline text-gray-300">·</span><span className="hidden sm:inline font-mono">{b.traveler_cpf}</span></>}
                        {b.traveler_phone && <><span className="hidden sm:inline text-gray-300">·</span><span className="hidden sm:inline">{b.traveler_phone}</span></>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 pt-0.5">
                        <span>{b.num_travelers} pessoa{b.num_travelers !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span className="font-bold text-navy-700">R$ {b.final_amount.toLocaleString("pt-BR")}</span>
                        <span>·</span>
                        <span>{fmt(b.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
                      {b.status === "interesse" && <WaitingBadge createdAt={b.created_at} />}
                    </div>
                  </div>
                  {/* Actions */}
                  {["interesse", "confirmed", "pending"].includes(b.status) && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {b.status === "interesse" && (
                        <button onClick={() => confirm(b.booking_code)} disabled={isLoading}
                          className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                          <Check size={11} /> Confirmar
                        </button>
                      )}
                      <button onClick={() => setEditTarget(b)} disabled={isLoading}
                        className="flex items-center gap-1 border border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                        <Pencil size={11} /> Editar
                      </button>
                      <button onClick={() => promptCancel(b)} disabled={isLoading}
                        className="flex items-center justify-center gap-1 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg transition-colors disabled:opacity-50">
                        <X size={11} />
                        <span className="hidden sm:inline">Cancelar</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      <p className="text-xs text-gray-400 text-right">
        {total} registro{total !== 1 ? "s" : ""} · página {page} de {Math.max(1, totalPages)}
      </p>
    </div>
  );
}
