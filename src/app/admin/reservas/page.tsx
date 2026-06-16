"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Check, X, Plus, Search, User, Phone, CreditCard, Cake, Users, FileText, MapPin, DollarSign, MessageSquare, Clock, Copy, CheckCheck, Filter, Globe, Store, Loader2, ChevronDown, Pencil, AlertTriangle, Undo2 } from "lucide-react";
import { getToken, fetchWithTimeout } from "@/lib/api";
import { fmtBRL } from "@/lib/format";
import { invalidateAdminCache, adminDirtyTs } from "@/lib/adminCache";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PAGE_SIZE = 25;

// Cache da lista de viagens (dados de referência p/ dropdown + venda externa).
// Reservas em si NÃO são cacheadas — sempre refrescadas a cada visita.
const _tripsCache: { data: Trip[] | null; ts: number } = { data: null, ts: 0 };
const TRIPS_TTL = 60_000;

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
  tier_breakdown?: { label: string; price: number; qty: number }[];
  trip_title: string | null;
  trip_destination: string | null;
  trip_departure_date: string | null;
  trip_return_date: string | null;
};

type Trip = { id: number; title: string; destination: string; price_per_person: number; available_spots: number; departure_date: string | null; return_date: string | null; template_id: number | null; is_active?: boolean; status?: string };

type Counts = {
  interesse: number; pending: number; confirmed: number; completed: number;
  cancelled: number; refunded: number; all: number;
  stats: { confirmed_revenue: number; pending_value: number; month_count: number; month_value: number };
};

const STATUS_LABEL: Record<string, { label: string; color: string; border: string }> = {
  interesse:  { label: "Interesse",  color: "bg-amber-100 text-amber-700",     border: "border-l-amber-400" },
  pending:    { label: "Pendente",   color: "bg-blue-100 text-blue-700",       border: "border-l-blue-400" },
  confirmed:  { label: "Confirmado", color: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-400" },
  cancelled:  { label: "Cancelado",  color: "bg-red-100 text-red-700",         border: "border-l-red-400" },
  refunded:   { label: "Estornado",  color: "bg-orange-100 text-orange-700",   border: "border-l-orange-400" },
  completed:  { label: "Realizado",  color: "bg-gray-100 text-gray-600",       border: "border-l-gray-300" },
};

const PAYMENT_LABEL: Record<string, string> = {
  whatsapp: "Presencial / WhatsApp",
  pix: "PIX",
  transfer: "Transferência",
  credit_card: "Cartão de crédito",
};

function paymentLabel(method: string | null, installments?: number): string {
  const base = PAYMENT_LABEL[method ?? ""] ?? method ?? "—";
  return installments && installments > 1 ? `${base} · ${installments}x` : base;
}

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
  const items: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) items.push(i);
    else if (items[items.length - 1] !== "…") items.push("…");
  }
  return (
    <div className="flex items-center justify-center gap-1 pt-1">
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors text-sm">‹</button>
      {items.map((item, i) =>
        item === "…" ? (
          <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
        ) : (
          <button key={item} onClick={() => onPage(item as number)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
              page === item ? "bg-navy-800 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>{item}</button>
        )
      )}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors text-sm">›</button>
    </div>
  );
}

/* ─── Booking Detail Modal ─── */
function BookingDetailModal({ booking, trip, onClose, onConfirm, onEdit, onCancel, onRefund, actionLoading }: {
  booking: Booking;
  trip: Trip | undefined;
  onClose: () => void;
  onConfirm: (code: string) => void;
  onEdit: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onRefund: (booking: Booking) => void;
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-overlay p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal max-h-[92vh] flex flex-col">
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
            <p className="font-bold text-navy-800">{booking.trip_title ?? trip?.title ?? `Viagem #${booking.trip_id}`}</p>
            {(booking.trip_destination ?? trip?.destination) && (
              <p className="text-sm text-gray-500 mt-0.5">{booking.trip_destination ?? trip?.destination}</p>
            )}
            {booking.trip_departure_date && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <Clock size={10} />
                {fmt(booking.trip_departure_date)}{booking.trip_return_date ? ` → ${fmt(booking.trip_return_date)}` : ""}
              </p>
            )}
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
              {booking.tier_breakdown && booking.tier_breakdown.length > 0 ? (
                booking.tier_breakdown.map((t, i) => (
                  <div key={i} className="flex justify-between text-gray-600">
                    <span>{t.qty} × {t.label} (R$ {fmtBRL(t.price)})</span>
                    <span>R$ {fmtBRL(t.qty * t.price)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-gray-600">
                  <span>{booking.num_travelers} pessoa{booking.num_travelers !== 1 ? "s" : ""} × R$ {fmtBRL(booking.price_per_person)}</span>
                  <span>R$ {fmtBRL(booking.total_amount)}</span>
                </div>
              )}
              {booking.discount_amount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Desconto</span>
                  <span>− R$ {fmtBRL(booking.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-navy-800 border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>R$ {fmtBRL(booking.final_amount)}</span>
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
              {booking.cancelled_at && (
                booking.status === "refunded"
                  ? <p className="text-orange-600">Estornado em {fmt(booking.cancelled_at)}</p>
                  : <p className="text-red-500">Cancelado em {fmt(booking.cancelled_at)}</p>
              )}
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
            {booking.status === "confirmed" && ["pix", "credit_card"].includes(booking.payment_method ?? "") ? (
              <button onClick={() => { onRefund(booking); onClose(); }} disabled={isLoading}
                className="flex items-center justify-center gap-1.5 border border-amber-300 text-amber-600 hover:bg-amber-50 font-bold py-3 px-3 sm:px-4 rounded-xl transition-colors disabled:opacity-50 text-sm">
                <Undo2 size={14} />
                <span className="hidden sm:inline">Estornar</span>
              </button>
            ) : (
              <button onClick={() => { onCancel(booking); onClose(); }} disabled={isLoading}
                className="flex items-center justify-center gap-1.5 border border-red-200 text-red-500 hover:bg-red-50 font-bold py-3 px-3 sm:px-4 rounded-xl transition-colors disabled:opacity-50 text-sm">
                <X size={14} />
                <span className="hidden sm:inline">Cancelar</span>
              </button>
            )}
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
      if (!res.ok) { const e = await res.json(); setError(parseApiError(e)); return; }
      onSaved();
      onClose();
    } catch { setError("Erro de conexão."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal max-h-[92vh] flex flex-col">

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
              {priceNum !== booking.price_per_person && <p className="text-[10px] text-amber-600 mt-1">Original: R$ {fmtBRL(booking.price_per_person)}</p>}
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
            <span className="text-gray-500">{people} × R$ {fmtBRL(priceNum)}{discNum > 0 ? ` − R$ ${fmtBRL(discNum)}` : ""}</span>
            <span className="font-black text-navy-800 text-base">R$ {fmtBRL(total)}</span>
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
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal">
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
              R$ {fmtBRL(booking.final_amount)} · {booking.num_travelers} pessoa{booking.num_travelers !== 1 ? "s" : ""}
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

/* ─── Refund Confirm Modal ─── */
function RefundConfirmModal({ booking, trip, onClose, onConfirm, loading }: {
  booking: Booking;
  trip: Trip | undefined;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const travelerName = booking.traveler_name || `Usuário #${booking.user_id}`;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal">
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <Undo2 size={24} className="text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">Estornar reserva?</h3>
              <p className="text-gray-400 text-sm mt-1">O valor pago será devolvido ao cliente ({paymentLabel(booking.payment_method)}) e a vaga liberada.</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5">
            <p className="font-mono text-xs text-gray-400">{booking.booking_code}</p>
            <p className="font-bold text-navy-800">{travelerName}</p>
            {trip && <p className="text-sm text-gray-500">{trip.title}</p>}
            <p className="text-xs text-gray-400">
              R$ {fmtBRL(booking.final_amount)} · {booking.num_travelers} pessoa{booking.num_travelers !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Voltar
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Undo2 size={15} />}
              Estornar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function validateCPF(val: string): boolean {
  const d = val.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = sum % 11;
  if ((r < 2 ? 0 : 11 - r) !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = sum % 11;
  return (r < 2 ? 0 : 11 - r) === parseInt(d[10]);
}

function parseApiError(err: unknown): string {
  if (!err || typeof err !== "object") return "Erro ao salvar.";
  const e = err as Record<string, unknown>;
  if (typeof e.detail === "string") return e.detail;
  if (Array.isArray(e.detail)) {
    // Pydantic 422 — array de objetos com { msg, loc }
    return e.detail.map((d: unknown) => {
      if (d && typeof d === "object") {
        const de = d as Record<string, unknown>;
        return typeof de.msg === "string" ? de.msg : JSON.stringify(de);
      }
      return String(d);
    }).join(", ");
  }
  return "Erro ao salvar.";
}

/* ─── External Sale Modal ─── */
function ExternalSaleModal({ trips, onClose, onSaved }: {
  trips: Trip[];
  onClose: () => void;
  onSaved: () => void;
}) {
  type Companion = { full_name: string; cpf: string; birth_date: string };

  const [templateKey, setTemplateKey] = useState("");
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
        const res = await fetchWithTimeout(`${API}/bookings/admin/lookup-cpf?cpf=${clean}`, {
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

  // Unique templates (deduplicated by template_id or title)
  const templateOptions: Trip[] = (() => {
    const seen = new Set<string>();
    return trips.filter((t) => {
      const key = String(t.template_id ?? t.title);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  // Dates available for selected template
  const dateOptions = trips.filter(
    (t) => templateKey && String(t.template_id ?? t.title) === templateKey
  );

  const selectedTrip = trips.find((t) => String(t.id) === tripId);
  const effectivePrice = priceOverride ? parseFloat(priceOverride) || 0 : (selectedTrip?.price_per_person || 0);
  const total = effectivePrice * people;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!templateKey) { setError("Selecione o roteiro."); return; }
    if (!tripId) { setError("Selecione a data de saída."); return; }
    if (!validateCPF(cpf)) { setError("CPF inválido. Verifique os números digitados."); return; }
    if (!name.trim()) { setError("Informe o nome do titular."); return; }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) { setError("Telefone inválido. Informe DDD + número."); return; }
    for (let i = 0; i < companions.length; i++) {
      const c = companions[i];
      if (!c.full_name.trim()) { setError(`Informe o nome do acompanhante ${i + 1}.`); return; }
      if (c.cpf && !validateCPF(c.cpf)) { setError(`CPF do acompanhante ${i + 1} inválido.`); return; }
    }

    setLoading(true);
    try {
      const res = await fetchWithTimeout(`${API}/bookings/admin/external`, {
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
        setError(parseApiError(err));
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl animate-modal max-h-[92vh] flex flex-col">

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

          {/* 1. Roteiro */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Roteiro</label>
            <div className="relative">
              <select value={templateKey} onChange={(e) => { setTemplateKey(e.target.value); setTripId(""); }}
                className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none bg-white cursor-pointer">
                <option value="">Selecione o roteiro...</option>
                {templateOptions.map((t) => (
                  <option key={t.template_id ?? t.title} value={String(t.template_id ?? t.title)}>
                    {t.title} — {t.destination}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* 2. Data */}
          {templateKey && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Data de saída</label>
              <div className="relative">
                <select required value={tripId} onChange={(e) => setTripId(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 appearance-none bg-white cursor-pointer">
                  <option value="">Selecione a data...</option>
                  {dateOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.departure_date ? new Date(t.departure_date).toLocaleDateString("pt-BR") : "Data indefinida"}
                      {t.return_date ? ` → ${new Date(t.return_date).toLocaleDateString("pt-BR")}` : ""}
                      {" "}· {t.available_spots} vaga{t.available_spots !== 1 ? "s" : ""} · R$ {fmtBRL(t.price_per_person)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {selectedTrip && (
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                  <MapPin size={10} /> {selectedTrip.destination}
                  <span className="mx-1">·</span>
                  <span className="font-semibold text-navy-600">R$ {fmtBRL(selectedTrip.price_per_person)} / pessoa</span>
                  <span className="mx-1">·</span>
                  {selectedTrip.available_spots} vagas
                </p>
              )}
            </div>
          )}

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
              <span className="text-gray-500">{people} pessoa{people !== 1 ? "s" : ""} × R$ {fmtBRL(effectivePrice)}</span>
              <span className="font-black text-navy-800 text-base">R$ {fmtBRL(total)}</span>
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
  const [counts, setCounts] = useState<Counts>({
    interesse: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, refunded: 0, all: 0,
    stats: { confirmed_revenue: 0, pending_value: 0, month_count: 0, month_value: 0 },
  });
  const [trips, setTrips] = useState<Trip[]>(_tripsCache.data ?? []);
  const [tab, setTab] = useState<string>("interesse");
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
  const [refundTarget, setRefundTarget] = useState<Booking | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const searchParams = useSearchParams();
  const [tripFilter, setTripFilter] = useState<string>(searchParams.get("trip_id") ?? "");
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
      const res = await fetchWithTimeout(`${API}/bookings/admin/counts`, {
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

      const res = await fetchWithTimeout(`${API}/bookings/admin/all?${params}`, {
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
    // Usa cache fresco se houver (dentro do TTL e após a última mutação)
    if (_tripsCache.data && (Date.now() - _tripsCache.ts) < TRIPS_TTL && _tripsCache.ts >= adminDirtyTs()) {
      setTrips(_tripsCache.data);
      return;
    }
    fetchWithTimeout(`${API}/trips/admin-list?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.json())
      .then((d) => {
        const list = d?.items ?? (Array.isArray(d) ? d : []);
        setTrips(list);
        _tripsCache.data = list;
        _tripsCache.ts = Date.now();
      })
      .catch(() => {});
  }, []);

  const confirm = async (code: string) => {
    // Used only from BookingDetailModal (no price adjust)
    setActionLoading(code);
    try {
      await fetchWithTimeout(`${API}/bookings/${code}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({}),
      });
      invalidateAdminCache();
      fetchBookings();
      fetchCounts();
    } finally {
      setActionLoading(null);
    }
  };

  const executeRefund = async () => {
    if (!refundTarget) return;
    setRefundLoading(true);
    try {
      const res = await fetchWithTimeout(`${API}/payments/${refundTarget.booking_code}/refund`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.detail || "Não foi possível estornar."); return; }
      invalidateAdminCache();
      setRefundTarget(null);
      fetchBookings();
      fetchCounts();
    } catch {
      alert("Erro de conexão ao estornar. Tente novamente.");
    } finally {
      setRefundLoading(false);
    }
  };

  const promptCancel = (booking: Booking) => {
    setCancelTarget(booking);
  };

  const executeCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await fetchWithTimeout(`${API}/bookings/${cancelTarget.booking_code}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      invalidateAdminCache();
      setCancelTarget(null);
      fetchBookings();
      fetchCounts();
    } finally {
      setCancelLoading(false);
    }
  };

  const tripMap = Object.fromEntries(trips.map((t) => [t.id, t]));
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const tabs: { key: string; label: string; count: number }[] = [
    { key: "interesse",          label: "Interesses",        count: counts.interesse },
    { key: "pending",            label: "Aguardando pgto",   count: counts.pending },
    { key: "confirmed",          label: "Confirmadas",       count: counts.confirmed },
    { key: "completed",          label: "Concluídas",        count: counts.completed },
    { key: "cancelled,refunded", label: "Encerradas",        count: counts.cancelled + counts.refunded },
    { key: "all",                label: "Todas",             count: counts.all },
  ];

  const summary = [
    { label: "Receita confirmada", value: `R$ ${fmtBRL(counts.stats.confirmed_revenue)}`, sub: `${counts.confirmed} reserva${counts.confirmed !== 1 ? "s" : ""}`, accent: "text-emerald-600", icon: DollarSign },
    { label: "Aguardando pagamento", value: `R$ ${fmtBRL(counts.stats.pending_value)}`, sub: `${counts.pending} reserva${counts.pending !== 1 ? "s" : ""}`, accent: "text-blue-600", icon: Clock },
    { label: "Interesses a seguir", value: String(counts.interesse), sub: "contatos a fechar", accent: "text-amber-600", icon: MessageSquare },
    { label: "Vendas do mês", value: `R$ ${fmtBRL(counts.stats.month_value)}`, sub: `${counts.stats.month_count} confirmada${counts.stats.month_count !== 1 ? "s" : ""}`, accent: "text-navy-700", icon: CheckCheck },
  ];

  const RowActions = ({ b, compact }: { b: Booking; compact?: boolean }) => {
    const isLoading = actionLoading === b.booking_code;
    const canRefund = b.status === "confirmed" && ["pix", "credit_card"].includes(b.payment_method ?? "");
    const actionable = ["interesse", "confirmed", "pending"].includes(b.status);
    const name = b.traveler_name || `Usuário #${b.user_id}`;
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {b.status === "interesse" && (
          <button onClick={() => confirm(b.booking_code)} disabled={isLoading} title="Confirmar"
            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            <Check size={11} />{!compact && " Confirmar"}
          </button>
        )}
        {actionable && (
          <button onClick={() => setEditTarget(b)} disabled={isLoading} title="Editar"
            className="flex items-center gap-1 border border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            <Pencil size={11} />{!compact && " Editar"}
          </button>
        )}
        {actionable && (canRefund ? (
          <button onClick={() => setRefundTarget(b)} disabled={isLoading} title="Estornar"
            className="flex items-center gap-1 border border-amber-300 text-amber-600 hover:bg-amber-50 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            <Undo2 size={11} />{!compact && " Estornar"}
          </button>
        ) : (
          <button onClick={() => promptCancel(b)} disabled={isLoading} title="Cancelar"
            className="flex items-center gap-1 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            <X size={11} />{!compact && " Cancelar"}
          </button>
        ))}
        {b.traveler_phone && (
          <a href={buildWaUrl(b.traveler_phone, name, b.booking_code)} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()} title="WhatsApp"
            className="flex items-center justify-center border border-emerald-200 text-emerald-600 hover:bg-emerald-50 w-[30px] h-[30px] rounded-lg transition-colors shrink-0">
            <MessageSquare size={12} />
          </a>
        )}
        {!actionable && !b.traveler_phone && <span className="text-xs text-gray-300">—</span>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overlay de processamento: o estorno chama o Asaas e leva alguns segundos.
          Sem isto a tela parecia travada (o modal de detalhe fecha antes da resposta). */}
      {actionLoading && (
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl px-6 py-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            <span className="text-navy-800 font-semibold text-sm">Processando…</span>
          </div>
        </div>
      )}

      {cancelTarget && (
        <CancelConfirmModal
          booking={cancelTarget}
          trip={tripMap[cancelTarget.trip_id]}
          onClose={() => setCancelTarget(null)}
          onConfirm={executeCancel}
          loading={cancelLoading}
        />
      )}

      {refundTarget && (
        <RefundConfirmModal
          booking={refundTarget}
          trip={tripMap[refundTarget.trip_id]}
          onClose={() => setRefundTarget(null)}
          onConfirm={executeRefund}
          loading={refundLoading}
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
          onRefund={(b) => { setSelectedBooking(null); setRefundTarget(b); }}
          actionLoading={actionLoading}
        />
      )}

      {editTarget && (
        <EditBookingModal
          booking={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { invalidateAdminCache(); fetchBookings(); fetchCounts(); }}
        />
      )}

      {showExternal && (
        <ExternalSaleModal
          trips={trips.filter((t) => t.is_active !== false && t.available_spots > 0 && t.status !== "cancelled" && t.status !== "completed")}
          onClose={() => setShowExternal(false)}
          onSaved={() => { invalidateAdminCache(); fetchBookings(); fetchCounts(); }}
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

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summary.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{s.label}</p>
                <Icon size={15} className={s.accent} />
              </div>
              <p className={`mt-2 text-lg sm:text-xl font-black leading-tight ${s.accent}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-col gap-3">
        {/* Mobile: grid 2x2 | Desktop: flex em linha */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {tabs.map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ${
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
                <option key={t.id} value={t.id}>
                  {t.title}{t.departure_date ? ` · ${new Date(t.departure_date).toLocaleDateString("pt-BR")}` : ""}
                </option>
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
          <>
            {/* Desktop: tabela densa */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="px-4 py-3 font-semibold">Código</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Viagem</th>
                    <th className="px-4 py-3 font-semibold text-center">Pess.</th>
                    <th className="px-4 py-3 font-semibold text-right">Valor</th>
                    <th className="px-4 py-3 font-semibold">Pagamento</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const trip = tripMap[b.trip_id];
                    const st = STATUS_LABEL[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600", border: "border-l-gray-300" };
                    const travelerName = b.traveler_name || `Usuário #${b.user_id}`;
                    return (
                      <tr key={b.id} onClick={() => setSelectedBooking(b)}
                        className={`border-b border-gray-50 border-l-4 ${st.border} hover:bg-gray-50 cursor-pointer transition-colors`}>
                        <td className="px-4 py-3 align-top">
                          <button onClick={(e) => { e.stopPropagation(); copyCode(b.booking_code); }}
                            className="flex items-center gap-1 font-mono text-xs text-navy-600 font-semibold hover:text-gold-600 transition-colors group">
                            {b.booking_code}
                            {copiedCode === b.booking_code ? <CheckCheck size={11} className="text-emerald-500" /> : <Copy size={11} className="text-gray-300 group-hover:text-gold-500" />}
                          </button>
                          <span className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold">
                            {b.is_external
                              ? <span className="text-purple-600 flex items-center gap-0.5"><Store size={9} /> Externo</span>
                              : <span className="text-blue-500 flex items-center gap-0.5"><Globe size={9} /> Site</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-semibold text-navy-800 truncate max-w-[170px]">{travelerName}</p>
                          {b.traveler_phone && <p className="text-xs text-gray-400">{b.traveler_phone}</p>}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-navy-700 truncate max-w-[200px]">{b.trip_title ?? trip?.title ?? `Viagem #${b.trip_id}`}</p>
                          {b.trip_departure_date && <p className="text-xs text-gray-400">{fmt(b.trip_departure_date)}</p>}
                        </td>
                        <td className="px-4 py-3 align-top text-center text-gray-600">{b.num_travelers}</td>
                        <td className="px-4 py-3 align-top text-right font-bold text-navy-800 whitespace-nowrap">R$ {fmtBRL(b.final_amount)}</td>
                        <td className="px-4 py-3 align-top text-xs text-gray-500 whitespace-nowrap">{paymentLabel(b.payment_method, b.installments)}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
                            {b.status === "interesse" && <WaitingBadge createdAt={b.created_at} />}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex justify-end"><RowActions b={b} compact /></div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="md:hidden p-4 flex flex-col gap-3">
              {bookings.map((b) => {
                const trip = tripMap[b.trip_id];
                const st = STATUS_LABEL[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600", border: "border-l-gray-300" };
                const travelerName = b.traveler_name || `Usuário #${b.user_id}`;
                const showActions = ["interesse", "confirmed", "pending"].includes(b.status) || !!b.traveler_phone;
                return (
                  <div key={b.id} onClick={() => setSelectedBooking(b)}
                    className={`rounded-xl border border-gray-100 border-l-4 ${st.border} bg-gray-50 p-4 space-y-3 transition-colors duration-200 hover:bg-white hover:shadow-md cursor-pointer`}>
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
                            : <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-500"><Globe size={9} /> Site</span>}
                        </div>
                        <p className="font-bold text-navy-800 text-sm leading-snug">{b.trip_title ?? trip?.title ?? `Viagem #${b.trip_id}`}</p>
                        <p className="text-xs text-gray-500 truncate">{travelerName}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 pt-0.5">
                          <span>{b.num_travelers} pessoa{b.num_travelers !== 1 ? "s" : ""}</span>
                          <span>·</span>
                          <span className="font-bold text-navy-700">R$ {fmtBRL(b.final_amount)}</span>
                          <span>·</span>
                          <span>{paymentLabel(b.payment_method, b.installments)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
                        {b.status === "interesse" && <WaitingBadge createdAt={b.created_at} />}
                      </div>
                    </div>
                    {showActions && <RowActions b={b} />}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      <p className="text-xs text-gray-400 text-right">
        {total} registro{total !== 1 ? "s" : ""} · página {page} de {Math.max(1, totalPages)}
      </p>
    </div>
  );
}
