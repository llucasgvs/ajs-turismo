"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import {
  QrCode, CreditCard, MessageCircle, Copy, Check, Loader2, CheckCircle2,
  ShieldCheck, ArrowLeft, Lock, User, ChevronRight, Minus, Plus, Calendar, Users, MapPin, Clock, AlertCircle, X,
} from "lucide-react";
import Footer from "@/components/Footer";
import { apiFetch, getUser, getToken } from "@/lib/api";
import { fmtBRL, spotsLabel } from "@/lib/format";
import { BrandedLoader } from "@/components/BrandedLoader";
import { tierLabel } from "@/lib/tiers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WA_NUMBER = "5541998348766";
const ADULT = "Adulto";
const PIX_MINUTES = 15; // janela de pagamento do PIX (padrão de mercado: 10–30 min)
const PLACEHOLDER = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=60";

interface Trip {
  id: number; template_id: number | null; departure_date: string; return_date: string;
  title?: string | null; destination?: string | null; image_url?: string | null;
  price_per_person: number; original_price?: number | null; available_spots: number; max_installments: number;
  price_tiers: { name?: string; age_range?: string; price: number; label?: string }[];
  optionals: { name: string; price: number }[];
}
interface Booking {
  booking_code: string; trip_id: number; final_amount: number; total_amount: number;
  optionals_amount: number; num_travelers: number; status: string;
  selected_optionals: { name: string; price: number }[];
  tier_breakdown: { label: string; price: number; qty: number }[];
  trip_title?: string; trip_destination?: string; trip_departure_date?: string;
  trip_return_date?: string; trip_image_url?: string; trip_max_installments?: number;
  installments_max?: number;
  installment_options?: { n: number; installment: number; total: number; interest_free: boolean }[];
}
type Companion = { full_name: string; cpf: string; birth_date: string };
type Method = "pix" | "card" | "whatsapp";

function onlyDigits(s: string) { return s.replace(/\D/g, ""); }
function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}
function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
function maskCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

/* Logos reais das bandeiras (SVG inline, leves) */
function CardBrandLogo({ brand }: { brand: string }) {
  const wrap = "h-5 w-8 rounded shadow-sm";
  if (brand === "Mastercard") return (
    <svg viewBox="0 0 32 20" className={wrap} aria-label="Mastercard"><rect width="32" height="20" rx="3" fill="#fff" stroke="#eee" /><circle cx="13" cy="10" r="6" fill="#EB001B" /><circle cx="19" cy="10" r="6" fill="#F79E1B" /><path d="M16 5.5a6 6 0 000 9 6 6 0 000-9z" fill="#FF5F00" /></svg>
  );
  if (brand === "Visa") return (
    <svg viewBox="0 0 32 20" className={wrap} aria-label="Visa"><rect width="32" height="20" rx="3" fill="#1A1F71" /><text x="16" y="14" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontStyle="italic" fontFamily="Arial">VISA</text></svg>
  );
  if (brand === "Amex") return (
    <svg viewBox="0 0 32 20" className={wrap} aria-label="Amex"><rect width="32" height="20" rx="3" fill="#2E77BC" /><text x="16" y="13" textAnchor="middle" fill="#fff" fontSize="6.5" fontWeight="700" fontFamily="Arial">AMEX</text></svg>
  );
  if (brand === "Elo") return (
    <svg viewBox="0 0 32 20" className={wrap} aria-label="Elo"><rect width="32" height="20" rx="3" fill="#000" /><text x="16" y="14" textAnchor="middle" fill="#fff" fontSize="8.5" fontWeight="800" fontFamily="Arial">elo</text></svg>
  );
  return null;
}
function validateCPF(val: string): boolean {
  const c = onlyDigits(val);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += +c[i] * (10 - i);
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0; if (d1 !== +c[9]) return false;
  s = 0; for (let i = 0; i < 10; i++) s += +c[i] * (11 - i);
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0; return d2 === +c[10];
}
// Extrai faixa etária de um rótulo "Criança (3 a 11 anos)" ou "Idoso (60+ anos)".
function ageRangeFromLabel(label: string): { min: number; max: number } | null {
  const m = label.match(/\(([^)]+)\)/);
  if (!m) return null;
  const s = m[1];
  const plus = s.match(/(\d+)\s*\+/);
  if (plus) return { min: +plus[1], max: 120 };
  const range = s.match(/(\d+)\D+(\d+)/);
  if (range) return { min: +range[1], max: +range[2] };
  return null;
}
function ageFromBirth(birth: string): number | null {
  if (!birth) return null;
  const b = new Date(birth + "T12:00:00");
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
function ageError(label: string | undefined, birth: string, who: string): string | null {
  if (!label) return null;
  const range = ageRangeFromLabel(label);
  if (!range) return null;
  const age = ageFromBirth(birth);
  if (age == null) return null;
  if (age < range.min || age > range.max)
    return `A data de nascimento de ${who} não corresponde à faixa ${label}. Revise a data ou ajuste a categoria no resumo.`;
  return null;
}
/* Campo com rótulo — padrão consistente e profissional para os formulários */
function Field({ label, hint, req, children }: { label: string; hint?: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-semibold text-gray-600">{label}{req && <span className="text-red-500"> *</span>}</span>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

type InstallmentOption = { n: number; installment: number; total: number; interest_free: boolean };

function installmentSub(o: InstallmentOption) {
  return o.interest_free ? (o.n === 1 ? "à vista" : "sem juros") : `com juros · total R$ ${fmtBRL(o.total)}`;
}

/* Seletor de parcelas estilo Airbnb: campo-gatilho + modal central com radios */
function InstallmentField({ options, value, onChange }: { options: InstallmentOption[]; value: number; onChange: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(value);
  const sel = options.find(o => o.n === value) || options[0];

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const openModal = () => { setTemp(value); setOpen(true); };
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 animate-overlay"
      onClick={e => e.target === e.currentTarget && setOpen(false)}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-modal">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <h3 className="font-display font-black text-xl text-navy-800">Selecione as parcelas</h3>
          <button onClick={() => setOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6">
          {options.map(o => (
            <button key={o.n} type="button" onClick={() => setTemp(o.n)}
              className="w-full flex items-center justify-between py-4 border-b border-gray-100 text-left">
              <span>
                <span className="block text-navy-900 font-medium">{o.n}× de R$ {fmtBRL(o.installment)}</span>
                <span className={`block text-sm ${o.interest_free ? "text-emerald-600" : "text-gray-500"}`}>{installmentSub(o)}</span>
              </span>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${temp === o.n ? "border-navy-700" : "border-gray-300"}`}>
                {temp === o.n && <span className="w-2.5 h-2.5 rounded-full bg-navy-700" />}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={() => setOpen(false)} className="font-semibold text-navy-800 px-3 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={() => { onChange(temp); setOpen(false); }} className="bg-navy-700 hover:bg-navy-600 text-white font-bold px-7 py-2.5 rounded-xl transition-colors">Concluído</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={openModal}
        className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-gray-300 transition-colors flex items-center justify-between gap-3">
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-semibold text-gray-500">Parcelamento</span>
          <span className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-navy-900 font-medium truncate">{sel.n}× de R$ {fmtBRL(sel.installment)}</span>
            <span className={`shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded ${sel.interest_free ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              {sel.interest_free ? (sel.n === 1 ? "à vista" : "sem juros") : "com juros"}
            </span>
          </span>
        </span>
        <span className="text-xs font-semibold text-navy-600 shrink-0 ml-2">Alterar</span>
      </button>
      {open && mounted && createPortal(modal, document.body)}
    </>
  );
}

/* Aviso de erro padronizado — com ícone e destaque sutil */
function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3.5 py-3 reveal-soft">
      <AlertCircle size={17} className="shrink-0 mt-0.5 text-red-500" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}

/* Aviso neutro (âmbar) — para estados que não são erro (ex.: em análise) */
function InfoMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-xl px-3.5 py-3 reveal-soft">
      <Clock size={17} className="shrink-0 mt-0.5 text-amber-500" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}

/* Intervalo de datas compacto: "11 – 14 jul 2026" ou "30 jul – 2 ago 2026" */
function fmtDateRange(dep?: string, ret?: string) {
  if (!dep) return "";
  const d1 = new Date(dep.slice(0, 10) + "T12:00:00");
  const mon = (x: Date) => x.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  if (!ret) return `${d1.getDate()} ${mon(d1)} ${d1.getFullYear()}`;
  const d2 = new Date(ret.slice(0, 10) + "T12:00:00");
  // Bate-e-volta (mesmo dia): mostra só a data, sem intervalo "5 – 5".
  if (dep.slice(0, 10) === ret.slice(0, 10))
    return `${d1.getDate()} ${mon(d1)} ${d1.getFullYear()}`;
  if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear())
    return `${d1.getDate()} – ${d2.getDate()} ${mon(d1)} ${d1.getFullYear()}`;
  return `${d1.getDate()} ${mon(d1)} – ${d2.getDate()} ${mon(d2)} ${d2.getFullYear()}`;
}
/* Versão por extenso (telas maiores): "11 a 14 de julho de 2026" */
function fmtDateRangeFull(dep?: string, ret?: string) {
  if (!dep) return "";
  const d1 = new Date(dep.slice(0, 10) + "T12:00:00");
  const mon = (x: Date) => x.toLocaleDateString("pt-BR", { month: "long" });
  if (!ret) return `${d1.getDate()} de ${mon(d1)} de ${d1.getFullYear()}`;
  const d2 = new Date(ret.slice(0, 10) + "T12:00:00");
  // Bate-e-volta (mesmo dia): data única.
  if (dep.slice(0, 10) === ret.slice(0, 10))
    return `${d1.getDate()} de ${mon(d1)} de ${d1.getFullYear()}`;
  if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear())
    return `${d1.getDate()} a ${d2.getDate()} de ${mon(d1)} de ${d1.getFullYear()}`;
  return `${d1.getDate()} de ${mon(d1)} a ${d2.getDate()} de ${mon(d2)} de ${d2.getFullYear()}`;
}

const FIELD = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 transition";

/* Input com validação em tempo real: borda verde/vermelha + ícone ao sair do campo */
function VInput({ value, onChange, validate, errorMsg, placeholder, type = "text", inputMode, showIcon = true }: {
  value: string; onChange: (v: string) => void; validate: (v: string) => boolean; errorMsg?: string;
  placeholder?: string; type?: string; inputMode?: "numeric" | "text"; showIcon?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const show = touched && value.length > 0;
  const valid = validate(value);
  const border = show ? (valid ? "border-emerald-400 focus:ring-emerald-300" : "border-red-300 focus:ring-red-300") : "";
  return (
    <div>
      <div className="relative">
        <input type={type} inputMode={inputMode} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)} onBlur={() => setTouched(true)}
          className={`${FIELD} ${border} ${show && showIcon ? "pr-9" : ""}`} />
        {show && showIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 reveal-soft">
            {valid ? <Check size={15} className="text-emerald-500" /> : <span className="text-red-500 font-bold text-sm leading-none">!</span>}
          </span>
        )}
      </div>
      {show && !valid && errorMsg && <span className="block text-xs text-red-500 mt-1 reveal-soft">{errorMsg}</span>}
    </div>
  );
}
const vName = (v: string) => v.trim().length >= 3;
const vCpf = (v: string) => validateCPF(v);
const vPhone = (v: string) => onlyDigits(v).length >= 10;

function cardBrand(num: string): string | null {
  const n = num.replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^(6011|65|64[4-9])/.test(n)) return "Elo";
  return null;
}

function CheckoutHeader() {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon_ajs.png" alt="AJS Turismo" className="w-9 h-9 object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="font-display font-black text-navy-900 text-base tracking-tight">AJS</span>
            <span className="text-gold-500 text-[10px] font-semibold tracking-[0.2em] uppercase leading-none">Turismo</span>
          </div>
        </Link>
        <span className="flex items-center gap-1.5 text-gray-500 text-xs font-medium"><Lock size={13} className="text-emerald-500" /> Pagamento 100% seguro</span>
      </div>
    </header>
  );
}

export default function ReservarPage({ params }: { params: { code: string } }) {
  // "novo" = checkout antes da reserva existir (login embutido como passo 1).
  if (params.code === "novo") return <PreCheckout />;
  return <BookingCheckout code={params.code} />;
}

function BookingCheckout({ code }: { code: string }) {
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<Method>("pix");
  const [installments, setInstallments] = useState(1);
  const [confirmed, setConfirmed] = useState(false);

  const loadStatus = useCallback(async (): Promise<string | null> => {
    try {
      const r = await apiFetch(`/payments/${code}/status`);
      if (r.ok) { const d: Booking = await r.json(); setBooking(d); return d.status; }
    } catch { /* ignore */ }
    return null;
  }, [code]);

  useEffect(() => {
    // Viagem entregue pelo PreCheckout (evita um GET /trips no caminho crítico).
    let haveTrip = false;
    try {
      const cached = sessionStorage.getItem(`reservar_trip_${code}`);
      if (cached) { setTrip(JSON.parse(cached)); haveTrip = true; }
    } catch { /* ignore */ }

    (async () => {
      const r = await apiFetch(`/payments/${code}/status`);
      if (r.ok) {
        const d: Booking = await r.json();
        setBooking(d);
        if (d.status === "confirmed") setConfirmed(true);
        // Busca a viagem em paralelo (não bloqueia o render) só se não veio do handoff.
        if (!haveTrip) {
          fetch(`${API}/trips/${d.trip_id}`).then(t => t.ok ? t.json() : null).then(j => { if (j) setTrip(j); }).catch(() => {});
        }
      }
      setLoading(false);
    })();
  }, [code]);

  if (loading) return <BrandedLoader label="Abrindo sua reserva..." />;
  if (confirmed || booking?.status === "confirmed") return <div className="min-h-screen bg-gray-50 flex flex-col"><CheckoutHeader /><div className="flex-1"><SuccessScreen code={code} amount={booking?.final_amount} /></div><Footer /></div>;
  if (!booking) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center"><p className="text-gray-600 mb-4">Não encontramos esta reserva.</p><Link href="/viagens" className="text-navy-700 font-semibold">Ver viagens</Link></div>
    </main>
  );
  // Reserva em estado que não pode ser paga — mostra mensagem clara (nunca o checkout).
  if (["cancelled", "refunded", "completed"].includes(booking.status))
    return <div className="min-h-screen bg-gray-50 flex flex-col"><CheckoutHeader /><div className="flex-1"><BlockedScreen status={booking.status} /></div><Footer /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-clip">
      <CheckoutHeader />
      <main className="flex-1 py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-500 hover:text-navy-700 text-sm mb-4 transition-colors"><ArrowLeft size={16} /> Voltar</button>
          <h1 className="font-display font-black text-2xl md:text-3xl text-navy-800 mb-6">Confirmar e pagar</h1>
          <div className="grid md:grid-cols-[1fr_380px] gap-6 items-start stagger-in">
            {/* No mobile: resumo no topo. No desktop: à direita. */}
            <div className="space-y-4 order-2 md:order-1 min-w-0">
              <StepTravelers booking={booking} done={step > 1} active={step === 1} onEdit={() => setStep(1)} onDone={() => setStep(2)} code={code} />
              <StepPayment booking={booking} active={step === 2} code={code} method={method} setMethod={setMethod} installments={installments} setInstallments={setInstallments} onConfirmed={() => setConfirmed(true)} pollStatus={loadStatus} />
            </div>
            <ReservationCard booking={booking} trip={trip} code={code} onUpdate={setBooking} editable={true} method={method} installments={installments} onTravelersChange={() => setStep(1)} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ── Card da reserva (direita): foto + edição + preço ────────────────── */
function ReservationCard({ booking, trip, code, onUpdate, editable, method, installments, onTravelersChange }: {
  booking: Booking; trip: Trip | null; code: string; onUpdate: (b: Booking) => void; editable: boolean;
  method: Method; installments: number; onTravelersChange?: () => void;
}) {
  const hasTiers = (trip?.price_tiers ?? []).length > 0;
  const priceForLabel = (label: string) =>
    label === ADULT ? (trip?.price_per_person ?? 0) : (trip?.price_tiers.find(t => tierLabel(t) === label)?.price ?? trip?.price_per_person ?? 0);

  const [people, setPeople] = useState(booking.num_travelers);
  const [tierCounts, setTierCounts] = useState<Record<string, number>>(() => {
    if (!trip || !hasTiers) return {};
    const init: Record<string, number> = { [ADULT]: 0 };
    trip.price_tiers.forEach(t => { init[tierLabel(t)] = 0; });
    if (booking.tier_breakdown?.length) booking.tier_breakdown.forEach(b => { init[b.label] = b.qty; });
    else init[ADULT] = booking.num_travelers;
    return init;
  });
  const [opts, setOpts] = useState<Set<string>>(new Set((booking.selected_optionals || []).map(o => o.name)));
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const push = useCallback(async (num: number, tiers: Record<string, number>, optNames: Set<string>) => {
    if (!trip) return;
    const my = ++seq.current; setBusy(true);
    const priceOf = (label: string) =>
      label === ADULT ? (trip.price_per_person ?? 0) : (trip.price_tiers.find(t => tierLabel(t) === label)?.price ?? trip.price_per_person ?? 0);
    const tier_breakdown = hasTiers ? Object.entries(tiers).filter(([, q]) => q > 0).map(([label, qty]) => ({ label, qty })) : [];
    const selected_optionals = trip.optionals.filter(o => optNames.has(o.name));
    const total = hasTiers ? Object.values(tiers).reduce((a, b) => a + b, 0) : num;

    // Atualização otimista: o resumo (valor, opcionais, total) muda na hora,
    // sem esperar o round-trip do PATCH. O servidor reconcilia ao responder.
    const base = hasTiers
      ? tier_breakdown.reduce((s, t) => s + t.qty * priceOf(t.label), 0)
      : total * (trip.price_per_person || 0);
    const optionals_amount = selected_optionals.reduce((s, o) => s + o.price, 0) * total;
    onUpdate({
      ...booking,
      num_travelers: total,
      total_amount: base,
      optionals_amount,
      final_amount: base + optionals_amount,
      selected_optionals,
      tier_breakdown: tier_breakdown.map(t => ({ label: t.label, qty: t.qty, price: priceOf(t.label) })),
    });

    // Pré-login (sem code): edição local, sem servidor — o preço é recalculado
    // de forma autoritativa quando a reserva for criada.
    if (!code) { if (my === seq.current) setBusy(false); return; }

    try {
      const r = await apiFetch(`/payments/${code}/items`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ num_travelers: total, selected_optionals, tier_breakdown }) });
      if (r.ok && my === seq.current) onUpdate(await r.json());
    } catch { /* mantém */ } finally { if (my === seq.current) setBusy(false); }
  }, [code, hasTiers, trip, onUpdate, booking]);

  const changePeople = (d: number) => { const v = Math.max(1, Math.min(trip?.available_spots || 50, people + d)); setPeople(v); push(v, tierCounts, opts); onTravelersChange?.(); };
  const changeTier = (label: string, d: number) => setTierCounts(prev => {
    const total = Object.values(prev).reduce((a, b) => a + b, 0);
    if (d > 0 && total >= (trip?.available_spots || 50)) return prev;
    const next = { ...prev, [label]: Math.max(0, (prev[label] || 0) + d) };
    if (Object.values(next).reduce((a, b) => a + b, 0) < 1) return prev;
    push(0, next, opts); onTravelersChange?.(); return next;
  });
  const toggleOpt = (name: string) => setOpts(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); push(people, tierCounts, n); return n; });

  // Troca de data (outras datas do mesmo roteiro)
  const [editDate, setEditDate] = useState(false);
  const [dates, setDates] = useState<Trip[]>([]);
  const openDates = async () => {
    setEditDate(v => !v);
    if (!dates.length && trip?.template_id) {
      try { const r = await fetch(`${API}/trips/?template_id=${trip.template_id}&future_only=true&limit=500`); if (r.ok) setDates(await r.json()); } catch { /* ignore */ }
    }
  };
  const changeDate = async (tid: number) => {
    if (!trip) return;
    setEditDate(false);
    const tier_breakdown = hasTiers ? Object.entries(tierCounts).filter(([, q]) => q > 0).map(([label, qty]) => ({ label, qty })) : [];
    const selected_optionals = trip.optionals.filter(o => opts.has(o.name));
    const total = hasTiers ? Object.values(tierCounts).reduce((a, b) => a + b, 0) : people;

    // Otimista: a data (e o preço, quando não há faixas) muda na hora — sem isso
    // a lista fecha e nada parece acontecer por 1-2s até o PATCH responder.
    const target = dates.find(d => d.id === tid);
    if (target) {
      const newPrice = target.price_per_person ?? trip.price_per_person ?? 0;
      const optionals_amount = selected_optionals.reduce((s, o) => s + o.price, 0) * total;
      const base = hasTiers ? booking.total_amount : total * newPrice;
      onUpdate({
        ...booking,
        trip_id: tid,
        trip_departure_date: target.departure_date,
        trip_return_date: target.return_date ?? null,
        ...(hasTiers ? {} : { total_amount: base, optionals_amount, final_amount: base + optionals_amount }),
      });
    }
    // Pré-login (sem code): só a atualização otimista acima.
    if (!code) return;
    setBusy(true);
    try {
      const r = await apiFetch(`/payments/${code}/items`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ num_travelers: total, selected_optionals, tier_breakdown, trip_id: tid }) });
      if (r.ok) onUpdate(await r.json());
    } catch { /* mantém */ } finally { setBusy(false); }
  };

  return (
    <aside className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit min-w-0 order-1 md:order-2 md:sticky md:top-24">
      {/* Identificação clara da viagem */}
      <div className="flex gap-3 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={booking.trip_image_url || PLACEHOLDER} alt={booking.trip_title || "Viagem"} className="w-24 h-24 rounded-xl object-cover shrink-0 bg-gray-100" />
        <div className="min-w-0">
          <p className="font-bold text-navy-800 text-sm leading-snug line-clamp-2">{booking.trip_title || "Sua viagem"}</p>
          {booking.trip_destination && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin size={11} /> {booking.trip_destination}</p>}
          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium"><ShieldCheck size={12} /> Confirmação imediata</div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Data */}
        {booking.trip_departure_date && (
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-1.5"><Calendar size={13} /> Data</span>
              {editable && <button onClick={openDates} className="text-xs text-navy-600 font-semibold hover:underline">{editDate ? "Fechar" : "Alterar"}</button>}
            </div>
            <p className="text-navy-800 font-semibold text-sm mt-1">
              <span className="sm:hidden">{fmtDateRange(booking.trip_departure_date, booking.trip_return_date)}</span>
              <span className="hidden sm:inline">{fmtDateRangeFull(booking.trip_departure_date, booking.trip_return_date)}</span>
            </p>
            {editDate && (
              <div className="mt-2 rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden animate-pop max-h-56 overflow-y-auto">
                {dates.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-gray-400 flex items-center justify-center gap-2"><Loader2 size={13} className="animate-spin" /> Carregando datas…</p>
                ) : dates.map(d => {
                  const cur = d.departure_date.slice(0, 10) === (booking.trip_departure_date || "").slice(0, 10);
                  const sold = d.available_spots <= 0;
                  return (
                    <button key={d.id} disabled={sold || cur} onClick={() => changeDate(d.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 text-sm text-left transition-colors ${cur ? "bg-navy-50/60" : "hover:bg-gray-50"} ${sold && !cur ? "opacity-40" : ""}`}>
                      <span className="font-medium text-navy-800">{fmtDateRange(d.departure_date, d.return_date)}</span>
                      <span className={`text-xs font-medium ${cur ? "text-navy-600" : sold ? "text-gray-400" : "text-emerald-600"}`}>{cur ? "atual" : sold ? "esgotado" : spotsLabel(d.available_spots)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Edição de pessoas/faixas */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-navy-800 flex items-center gap-1.5"><Users size={14} /> Viajantes</span>
            {busy && <Loader2 size={13} className="animate-spin text-gray-300" />}
          </div>
          {!editable ? (
            <p className="text-sm text-gray-500">{booking.num_travelers} viajante{booking.num_travelers > 1 ? "s" : ""}</p>
          ) : hasTiers ? (
            <div className="space-y-2.5">
              {[ADULT, ...(trip?.price_tiers ?? []).map(t => tierLabel(t))].map(label => (
                <div key={label} className="flex items-center justify-between">
                  <div><p className="text-sm text-navy-800">{label}</p><p className="text-xs text-gray-400">R$ {fmtBRL(priceForLabel(label))}</p></div>
                  <Counter value={tierCounts[label] || 0} onMinus={() => changeTier(label, -1)} onPlus={() => changeTier(label, 1)} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">R$ {fmtBRL(trip?.price_per_person ?? booking.total_amount / booking.num_travelers)} / pessoa</p>
              <Counter value={people} onMinus={() => changePeople(-1)} onPlus={() => changePeople(1)} />
            </div>
          )}
        </div>

        {/* Opcionais */}
        {editable && trip && trip.optionals?.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Opcionais (por pessoa)</p>
            <div className="space-y-2">
              {trip.optionals.map(o => {
                const on = opts.has(o.name);
                return (
                  <button key={o.name} onClick={() => toggleOpt(o.name)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-colors text-left ${on ? "border-gold-400 bg-gold-50/60" : "border-gray-200 hover:border-gray-300"}`}>
                    <span className="text-sm text-navy-800">{o.name}</span>
                    <span className="flex items-center gap-2"><span className="text-sm font-semibold text-navy-700">+ R$ {fmtBRL(o.price)}</span><span className={`w-4 h-4 rounded border flex items-center justify-center ${on ? "bg-gold-500 border-gold-500" : "border-gray-300"}`}>{on && <Check size={11} className="text-white" />}</span></span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Detalhamento de preço */}
        {(() => {
          const price = trip?.price_per_person || 0;
          const orig = trip?.original_price && trip.original_price > price ? trip.original_price : 0;
          // O preço "de" só vale para o Adulto (faixas têm preço próprio).
          const adultQty = hasTiers
            ? (booking.tier_breakdown?.find(t => t.label.startsWith(ADULT))?.qty || 0)
            : booking.num_travelers;
          const savings = orig > 0 ? (orig - price) * adultQty : 0;
          return (
            <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
              {booking.tier_breakdown?.length > 0 ? booking.tier_breakdown.map(t => {
                const isAdult = t.label.startsWith(ADULT);
                return (
                  <div key={t.label} className="flex justify-between gap-2 text-gray-600">
                    <span className="min-w-0 truncate">{t.qty}× {t.label}</span>
                    <span className="shrink-0 whitespace-nowrap">{isAdult && orig > 0 && <s className="text-gray-300 mr-1">R$ {fmtBRL(orig * t.qty)}</s>}R$ {fmtBRL(t.qty * t.price)}</span>
                  </div>
                );
              }) : (
                <div className="flex justify-between gap-2 text-gray-600">
                  <span className="min-w-0 truncate">{booking.num_travelers}× Viagem</span>
                  <span className="shrink-0 whitespace-nowrap">{orig > 0 && <s className="text-gray-300 mr-1">R$ {fmtBRL(orig * booking.num_travelers)}</s>}R$ {fmtBRL(booking.total_amount)}</span>
                </div>
              )}
              {booking.optionals_amount > 0 && <div className="flex justify-between text-gold-700"><span>Opcionais</span><span>+ R$ {fmtBRL(booking.optionals_amount)}</span></div>}
              {savings > 0 && <div className="flex justify-between text-emerald-600 font-semibold"><span>Você economiza</span><span>− R$ {fmtBRL(savings)}</span></div>}
            </div>
          );
        })()}

        <div className="border-t border-gray-100 pt-3 flex items-end justify-between">
          <span className="text-sm text-gray-500">Total</span>
          <span className="font-display font-black text-2xl text-navy-800">R$ {fmtBRL(booking.final_amount)}</span>
        </div>

        {/* Detalhe do parcelamento no cartão (quando com juros) */}
        {method === "card" && (() => {
          const opt = booking.installment_options?.find(o => o.n === installments);
          if (!opt || opt.interest_free) return null;
          return (
            <div className="mt-3 rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-3 reveal-soft">
              <p className="text-[11px] font-semibold text-navy-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><CreditCard size={12} /> No cartão parcelado</p>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-navy-700 min-w-0 truncate">{opt.n}× de R$ {fmtBRL(opt.installment)}</span>
                <span className="font-bold text-navy-800 shrink-0 whitespace-nowrap">R$ {fmtBRL(opt.total)}</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Inclui juros do parcelamento. À vista ou no PIX: R$ {fmtBRL(booking.final_amount)}.</p>
            </div>
          );
        })()}

        <p className="text-xs text-gray-400 mt-3">Código: {booking.booking_code}</p>
      </div>
    </aside>
  );
}

function Counter({ value, onMinus, onPlus }: { value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onMinus} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-navy-500 hover:text-navy-700 transition-colors"><Minus size={15} /></button>
      <span className="w-5 text-center font-semibold text-navy-800">{value}</span>
      <button onClick={onPlus} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-navy-500 hover:text-navy-700 transition-colors"><Plus size={15} /></button>
    </div>
  );
}

/* ── Passo 1: Viajantes ──────────────────────────────────────────────── */
function StepTravelers({ booking, done, active, onEdit, onDone, code }: {
  booking: Booking; done: boolean; active: boolean; onEdit: () => void; onDone: () => void; code: string;
}) {
  const user = typeof window !== "undefined" ? getUser() : null;
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [cpf, setCpf] = useState(user?.cpf || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [birth, setBirth] = useState(user?.birth_date || "");
  const need = booking.num_travelers - 1;
  const [companions, setCompanions] = useState<Companion[]>([]);
  useEffect(() => {
    setCompanions(prev => {
      if (prev.length === need) return prev;
      if (prev.length < need) return [...prev, ...Array.from({ length: need - prev.length }, () => ({ full_name: "", cpf: "", birth_date: "" }))];
      return prev.slice(0, need);
    });
  }, [need]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const setComp = (i: number, f: keyof Companion, v: string) => setCompanions(prev => prev.map((c, idx) => idx === i ? { ...c, [f]: v } : c));

  // Categoria de cada viajante (titular = 0). Derivada das faixas escolhidas no card.
  const cats = useMemo(() => {
    const tiers = booking.tier_breakdown || [];
    if (!tiers.length) return [] as string[];
    const ordered = [...tiers].sort((a, b) => (a.label.startsWith("Adulto") ? -1 : b.label.startsWith("Adulto") ? 1 : 0));
    const list: string[] = [];
    ordered.forEach(t => { for (let i = 0; i < t.qty; i++) list.push(t.label); });
    return list;
  }, [booking.tier_breakdown]);
  const titularCat = cats[0];
  const compCat = (i: number) => cats[i + 1];

  const save = async () => {
    setError("");
    if (fullName.trim().length < 3) return setError("Informe seu nome completo.");
    if (!validateCPF(cpf)) return setError("CPF inválido.");
    if (!birth) return setError("Informe sua data de nascimento.");
    if (onlyDigits(phone).length < 10) return setError("Telefone inválido (com DDD).");
    const te = ageError(titularCat, birth, "Titular");
    if (te) return setError(te);
    for (const [i, c] of companions.entries()) {
      if (c.full_name.trim().length < 3) return setError(`Nome do acompanhante ${i + 1} inválido.`);
      if (!validateCPF(c.cpf)) return setError(`CPF do acompanhante ${i + 1} inválido.`);
      if (!c.birth_date) return setError(`Data de nascimento do acompanhante ${i + 1} obrigatória.`);
      const ce = ageError(compCat(i), c.birth_date, `Acompanhante ${i + 1}`);
      if (ce) return setError(ce);
    }
    setSaving(true);
    try {
      const r = await apiFetch(`/payments/${code}/travelers`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name: fullName, cpf, phone, birth_date: birth, companions }) });
      if (!r.ok) { const e = await r.json(); setError(typeof e.detail === "string" ? e.detail : "Erro ao salvar dados."); return; }
      localStorage.setItem("ajs_user", JSON.stringify({ ...user, full_name: fullName, cpf, phone, birth_date: birth }));
      onDone();
    } catch { setError("Erro de conexão."); } finally { setSaving(false); }
  };

  return (
    <section id="step-1" className="bg-white rounded-2xl shadow-sm scroll-mt-20">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3"><StepBadge n={1} done={done} active={active} /><h2 className="font-bold text-navy-800">Quem vai viajar</h2></div>
        {done && <button onClick={onEdit} className="text-sm text-navy-600 font-semibold hover:underline">Editar</button>}
      </header>
      {active && (
        <div className="px-5 pb-5 space-y-4">
          {error && <ErrorMsg>{error}</ErrorMsg>}

          {/* Titular */}
          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="text-xs font-bold text-navy-800 uppercase tracking-wide flex items-center gap-1.5"><User size={13} /> Titular {titularCat && <span className="ml-1 normal-case text-navy-500 bg-navy-50 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-normal">{titularCat}</span>}</p>
            <Field label="Nome completo" req><VInput value={fullName} onChange={setFullName} validate={vName} errorMsg="Informe o nome completo." placeholder="Seu nome completo" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CPF" req><VInput value={cpf} onChange={v => setCpf(maskCPF(v))} validate={vCpf} errorMsg="CPF inválido." placeholder="000.000.000-00" inputMode="numeric" /></Field>
              <Field label="Telefone" req><VInput value={phone} onChange={v => setPhone(maskPhone(v))} validate={vPhone} errorMsg="Telefone incompleto." placeholder="(00) 00000-0000" inputMode="numeric" /></Field>
            </div>
            <Field label="Data de nascimento" req hint={titularCat || undefined}><VInput value={birth} onChange={setBirth} validate={v => !!v && !ageError(titularCat, v, "")} errorMsg={titularCat ? `A idade não corresponde à faixa ${titularCat}.` : undefined} type="date" showIcon={false} /></Field>
          </div>

          {/* Acompanhantes */}
          {companions.map((c, i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-3">
              <p className="text-xs font-bold text-navy-800 uppercase tracking-wide flex items-center gap-1.5"><Users size={13} /> Acompanhante {i + 1} {compCat(i) && <span className="ml-1 normal-case text-navy-500 bg-navy-50 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-normal">{compCat(i)}</span>}</p>
              <Field label="Nome completo" req><VInput value={c.full_name} onChange={v => setComp(i, "full_name", v)} validate={vName} errorMsg="Informe o nome completo." placeholder="Nome completo" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CPF" req><VInput value={c.cpf} onChange={v => setComp(i, "cpf", maskCPF(v))} validate={vCpf} errorMsg="CPF inválido." placeholder="000.000.000-00" inputMode="numeric" /></Field>
                <Field label="Data de nascimento" req hint={compCat(i) || undefined}><VInput value={c.birth_date} onChange={v => setComp(i, "birth_date", v)} validate={v => !!v && !ageError(compCat(i), v, "")} errorMsg={compCat(i) ? `A idade não corresponde à faixa ${compCat(i)}.` : undefined} type="date" showIcon={false} /></Field>
              </div>
            </div>
          ))}

          <p className="text-[11px] text-gray-400"><span className="text-red-500">*</span> Campos obrigatórios</p>
          <button onClick={save} disabled={saving} className="w-full bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">{saving ? "Salvando..." : <>Continuar para pagamento <ChevronRight size={16} /></>}</button>
        </div>
      )}
      {done && (
        <ul className="px-5 pb-4 space-y-1 text-sm text-gray-600">
          <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> <span>{fullName}{titularCat && <span className="text-xs text-gray-400"> · {titularCat}</span>}</span></li>
          {companions.map((c, i) => c.full_name && (
            <li key={i} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> <span>{c.full_name}{compCat(i) && <span className="text-xs text-gray-400"> · {compCat(i)}</span>}</span></li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Passo 2: Pagamento ──────────────────────────────────────────────── */
function StepPayment({ booking, active, code, method, setMethod, installments, setInstallments, onConfirmed, pollStatus }: {
  booking: Booking; active: boolean; code: string;
  method: Method; setMethod: (m: Method) => void; installments: number; setInstallments: (n: number) => void;
  onConfirmed: () => void; pollStatus: () => Promise<string | null>;
}) {
  return (
    <section id="step-2" className={`bg-white rounded-2xl shadow-sm scroll-mt-20 ${!active ? "opacity-50 pointer-events-none" : ""}`}>
      <header className="flex items-center gap-3 px-5 py-4"><StepBadge n={2} done={false} active={active} /><h2 className="font-bold text-navy-800">Forma de pagamento</h2></header>
      {active && (
        <div className="px-5 pb-5">
          <div className="space-y-2">
            <MethodRadio icon={<QrCode size={18} />} label="PIX" hint="Aprovação na hora" selected={method === "pix"} onClick={() => setMethod("pix")} />
            <MethodRadio icon={<CreditCard size={18} />} label="Cartão de crédito" hint={(() => {
              const ni = (booking.installment_options || []).filter(o => o.interest_free).length || booking.trip_max_installments || 1;
              return ni > 1 ? `até ${ni}x sem juros` : "à vista ou parcelado";
            })()} selected={method === "card"} onClick={() => setMethod("card")} />
            <MethodRadio icon={<MessageCircle size={18} />} label="Combinar pelo WhatsApp" hint="Fale com a equipe" selected={method === "whatsapp"} onClick={() => setMethod("whatsapp")} />
          </div>
          <div key={method} className="mt-5 animate-pop">
            {method === "pix" && <PixPanel code={code} amount={booking.final_amount} onConfirmed={onConfirmed} pollStatus={pollStatus} />}
            {method === "card" && <CardPanel code={code} amount={booking.final_amount} options={booking.installment_options || []} installments={installments} setInstallments={setInstallments} onConfirmed={onConfirmed} />}
            {method === "whatsapp" && <WhatsappPanel code={code} booking={booking} />}
          </div>

          {/* Selos de segurança + aceite de termos */}
          {method !== "whatsapp" && (
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 font-medium">
                <ShieldCheck size={14} className="text-emerald-500" /> Pagamento 100% seguro e criptografado
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <CardBrandLogo brand="Visa" /><CardBrandLogo brand="Mastercard" /><CardBrandLogo brand="Elo" /><CardBrandLogo brand="Amex" />
                <span className="text-[11px] text-gray-400 ml-1">e PIX</span>
              </div>
              <p className="text-center text-[11px] text-gray-400 leading-relaxed">
                Ao concluir o pagamento, você concorda com os{" "}
                <a href="/termos" target="_blank" rel="noopener noreferrer" className="underline hover:text-navy-600">Termos de reserva</a> e a{" "}
                <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline hover:text-navy-600">Política de privacidade</a>.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function MethodRadio({ icon, label, hint, selected, onClick }: { icon: React.ReactNode; label: string; hint: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left ${selected ? "border-navy-600 bg-navy-50/50" : "border-gray-200 hover:border-gray-300"}`}>
      <span className={selected ? "text-navy-700" : "text-gray-400"}>{icon}</span>
      <span className="flex-1"><span className="block font-semibold text-sm text-navy-800">{label}</span><span className="block text-xs text-gray-400">{hint}</span></span>
      <span className={`w-4 h-4 rounded-full border-2 ${selected ? "border-navy-600 bg-navy-600" : "border-gray-300"}`} />
    </button>
  );
}

function PixPanel({ code, amount, onConfirmed, pollStatus }: { code: string; amount: number; onConfirmed: () => void; pollStatus: () => Promise<string | null> }) {
  const [qr, setQr] = useState<{ image: string; payload: string; expiresAt: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [info, setInfo] = useState("");

  // Segurança/UX: se o valor da reserva mudar, o QR antigo é inválido — descarta.
  const lastAmount = useRef(amount);
  const hadQr = useRef(false);
  useEffect(() => { hadQr.current = !!qr; }, [qr]);
  useEffect(() => {
    if (lastAmount.current === amount) return;
    lastAmount.current = amount;
    setQr(null);
    setRemaining(null);
    if (hadQr.current) setInfo("O valor foi atualizado. Gere o PIX novamente.");
  }, [amount]);

  const generate = async () => {
    setLoading(true); setError(""); setInfo("");
    try {
      const r = await apiFetch(`/payments/${code}/pix`, { method: "POST" });
      if (!r.ok) { const e = await r.json(); setError(typeof e.detail === "string" ? e.detail : "Erro ao gerar o PIX."); return; }
      const d = await r.json();
      // Janela de pagamento (urgência clara). O código real do Asaas dura mais,
      // então se passar disso é só gerar outro — a confirmação continua valendo.
      setQr({ image: d.qr_image, payload: d.qr_payload, expiresAt: Date.now() + PIX_MINUTES * 60 * 1000 });
    } catch { setError("Erro de conexão."); } finally { setLoading(false); }
  };

  // Polling de confirmação — segue mesmo após expirar a janela (pagamento tardio ainda confirma)
  const expired = remaining !== null && remaining <= 0;
  useEffect(() => {
    if (!qr) return;
    const t = setInterval(async () => { const st = await pollStatus(); if (st === "confirmed") { clearInterval(t); onConfirmed(); } }, 3000);
    return () => clearInterval(t);
  }, [qr, pollStatus, onConfirmed]);

  // Contagem regressiva
  useEffect(() => {
    if (!qr?.expiresAt) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, Math.round((qr.expiresAt! - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [qr]);

  const copy = () => { if (!qr) return; navigator.clipboard.writeText(qr.payload); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  // Só mostra contagem regressiva se a janela for curta (≤ 1h); o Asaas pode expirar só em dias.
  const showTimer = remaining != null && remaining > 0 && remaining <= 3600;
  const mmss = showTimer ? `${String(Math.floor(remaining! / 60)).padStart(2, "0")}:${String(remaining! % 60).padStart(2, "0")}` : null;

  if (!qr) return (
    <div className="text-center py-4">
      <p className="text-gray-500 text-sm mb-4">Pague em segundos. Sua vaga é confirmada na hora.</p>
      {error && <div className="mb-3 text-left"><ErrorMsg>{error}</ErrorMsg></div>}
      {info && <div className="mb-3 text-left"><InfoMsg>{info}</InfoMsg></div>}
      <button onClick={generate} disabled={loading} className="bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-60">{loading ? "Gerando..." : "Gerar QR Code PIX"}</button>
    </div>
  );

  if (expired) return (
    <div className="text-center py-6">
      <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
      <p className="font-semibold text-navy-800 mb-1">PIX expirado</p>
      <p className="text-gray-500 text-sm mb-4">O código venceu. Gere um novo para pagar.</p>
      <button onClick={generate} disabled={loading} className="bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-60">{loading ? "Gerando..." : "Gerar novo código"}</button>
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full min-w-0 animate-pop">
      <div className="p-3 bg-white border border-gray-200 rounded-2xl shadow-sm">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`data:image/png;base64,${qr.image}`} alt="QR Code PIX" className="w-44 h-44" /></div>
      {mmss && (
        <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${remaining! < 120 ? "bg-amber-50 text-amber-600" : "bg-navy-50 text-navy-600"}`}>
          <Clock size={12} /> Expira em {mmss}
        </div>
      )}
      <p className="text-sm text-gray-600 mt-3 mb-2 text-center">Escaneie no app do banco, ou copie o código abaixo</p>
      <div className="w-full min-w-0 bg-gray-50 border border-gray-200 rounded-xl p-3">
        <p className="text-[11px] text-gray-500 break-all leading-relaxed max-h-20 overflow-y-auto">{qr.payload}</p>
        <button onClick={copy} className="mt-2 w-full flex items-center justify-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-white text-sm font-bold px-3 py-2.5 rounded-lg transition-colors">{copied ? <><Check size={14} /> Código copiado</> : <><Copy size={14} /> Copiar código PIX</>}</button>
      </div>
      <div className="flex items-center justify-center gap-2 text-navy-600 text-sm mt-4"><Loader2 size={15} className="animate-spin" /> Aguardando pagamento…</div>
    </div>
  );
}

function CardPanel({ code, amount, options, installments, setInstallments, onConfirmed }: { code: string; amount: number; options: { n: number; installment: number; total: number; interest_free: boolean }[]; installments: number; setInstallments: (n: number) => void; onConfirmed: () => void }) {
  const user = typeof window !== "undefined" ? getUser() : null;
  // Pré-preenche o cartão de teste APENAS em ambiente local (sandbox). Nunca em produção.
  const DEV = API.includes("localhost");
  const [number, setNumber] = useState(DEV ? "5162 3062 1937 8829" : ""); const [holder, setHolder] = useState(DEV ? "CLIENTE TESTE" : (user?.full_name || "").toUpperCase());
  const [expiry, setExpiry] = useState(DEV ? "12/30" : ""); const [ccv, setCcv] = useState(DEV ? "318" : "");
  const [cep, setCep] = useState(DEV ? "01310-930" : (user?.postal_code ? maskCEP(user.postal_code) : "")); const [addr, setAddr] = useState(DEV ? "100" : (user?.address_number || "")); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [info, setInfo] = useState("");
  const [cepInfo, setCepInfo] = useState<{ text: string; ok: boolean } | null>(null);
  const onCep = async (v: string) => {
    const m = maskCEP(v); setCep(m); setCepInfo(null);
    const d = onlyDigits(m);
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) { setCepInfo({ text: "CEP não encontrado", ok: false }); return; }
      const parts = [j.logradouro, j.bairro].filter(Boolean).join(", ");
      setCepInfo({ text: `${parts ? parts + " · " : ""}${j.localidade}/${j.uf}`, ok: true });
    } catch { /* offline — não bloqueia */ }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setInfo("");
    const num = onlyDigits(number); const [mm, yy] = expiry.split("/");
    if (num.length < 13) return setError("Número do cartão inválido.");
    if (!mm || !yy) return setError("Validade inválida (MM/AA).");
    if (ccv.length < 3) return setError("CVV inválido.");
    if (onlyDigits(cep).length !== 8) return setError("CEP inválido.");
    if (!addr) return setError("Informe o número do endereço.");
    setLoading(true);
    try {
      const r = await apiFetch(`/payments/${code}/card`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ holder_name: holder, number: num, expiry_month: mm, expiry_year: yy, ccv, cpf: onlyDigits(user?.cpf || ""), postal_code: onlyDigits(cep), address_number: addr, phone: onlyDigits(user?.phone || ""), installments }) });
      const d = await r.json();
      if (!r.ok) { setError(typeof d.detail === "string" ? d.detail : "Pagamento não autorizado. Confira os dados do cartão."); return; }
      // Reaproveita o endereço de cobrança na próxima compra (sem re-login).
      try { if (user) localStorage.setItem("ajs_user", JSON.stringify({ ...user, postal_code: onlyDigits(cep), address_number: addr })); } catch { /* ignore */ }
      if (d.status === "confirmed") onConfirmed();
      else setInfo(d.message || "Pagamento em análise. Você será avisado assim que for confirmado.");
    } catch { setError("Erro de conexão. Tente novamente."); } finally { setLoading(false); }
  };
  const brand = cardBrand(number);
  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {info && <InfoMsg>{info}</InfoMsg>}

      {/* Seção: dados do cartão */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-navy-800 uppercase tracking-wide flex items-center gap-1.5"><CreditCard size={14} /> Dados do cartão</p>
        <Field label="Número do cartão" req>
          <div className="relative">
            <input inputMode="numeric" value={number} onChange={e => setNumber(onlyDigits(e.target.value).slice(0, 16).replace(/(.{4})/g, "$1 ").trim())} placeholder="0000 0000 0000 0000" className={`${FIELD} pr-12`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="block transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ opacity: brand ? 1 : 0, transform: brand ? "scale(1)" : "scale(0.8)" }}>{brand && <CardBrandLogo brand={brand} />}</span>
            </span>
          </div>
        </Field>
        <Field label="Nome impresso no cartão" req>
          <input value={holder} onChange={e => setHolder(e.target.value.toUpperCase())} placeholder="COMO ESTÁ NO CARTÃO" className={FIELD} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Validade" req>
            <input inputMode="numeric" value={expiry} onChange={e => { const d = onlyDigits(e.target.value).slice(0, 4); setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d); }} placeholder="MM/AA" className={FIELD} />
          </Field>
          <Field label="CVV" hint="3 dígitos" req>
            <input inputMode="numeric" value={ccv} onChange={e => setCcv(onlyDigits(e.target.value).slice(0, 4))} placeholder="123" className={FIELD} />
          </Field>
        </div>
        {options.length > 1 && <InstallmentField options={options} value={installments} onChange={setInstallments} />}
      </div>

      {/* Seção: endereço de cobrança */}
      <div className="space-y-3 pt-1">
        <p className="text-xs font-bold text-navy-800 uppercase tracking-wide flex items-center gap-1.5"><MapPin size={14} /> Endereço de cobrança</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CEP" req><input inputMode="numeric" value={cep} onChange={e => onCep(e.target.value)} placeholder="00000-000" className={FIELD} /></Field>
          <Field label="Número" req><input inputMode="numeric" value={addr} onChange={e => setAddr(e.target.value)} placeholder="123" className={FIELD} /></Field>
        </div>
        {cepInfo && (
          <p className={`text-xs flex items-center gap-1.5 reveal-soft ${cepInfo.ok ? "text-gray-500" : "text-amber-600"}`}>
            <MapPin size={12} className={cepInfo.ok ? "text-emerald-500" : "text-amber-500"} /> {cepInfo.text}
          </p>
        )}
      </div>

      {/* Valor a pagar, logo antes do botão — só no mobile (no desktop já está no resumo à direita) */}
      {(() => {
        const sel = options.find(o => o.n === installments);
        const com = sel && !sel.interest_free;
        const total = com ? sel!.total : amount;
        return (
          <div className="md:hidden border-t border-gray-100 pt-3 space-y-1">
            {com && (
              <div className="flex justify-between gap-2 text-sm text-gray-500">
                <span className="min-w-0 truncate">{sel!.n}× de R$ {fmtBRL(sel!.installment)}</span>
                <span className="shrink-0 whitespace-nowrap">juros incluído</span>
              </div>
            )}
            <div className="flex items-end justify-between gap-2">
              <span className="text-sm text-gray-500">{com ? "Total no cartão" : sel && sel.n > 1 ? `Total em ${sel.n}×` : "Total"}</span>
              <span className="font-display font-black text-xl text-navy-800 shrink-0">R$ {fmtBRL(total)}</span>
            </div>
          </div>
        );
      })()}

      <button type="submit" disabled={loading} className="w-full bg-navy-700 hover:bg-navy-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">{loading ? <><Loader2 size={17} className="animate-spin" /> Processando…</> : <><Lock size={15} /> Pagar agora</>}</button>
    </form>
  );
}

function WhatsappPanel({ code, booking }: { code: string; booking: Booking }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const buildUrl = () => {
    const u = typeof window !== "undefined" ? getUser() : null;
    const L: string[] = [];
    L.push("Olá! Quero reservar pela AJS Turismo.");
    L.push("");
    L.push(`*${booking.trip_title || "Viagem"}*${booking.trip_destination ? ` — ${booking.trip_destination}` : ""}`);
    if (booking.trip_departure_date) {
      L.push(`Data: ${fmtDateRange(booking.trip_departure_date, booking.trip_return_date)}`);
    }
    // Viajantes (com faixas, se houver)
    L.push(`Viajantes: ${booking.num_travelers}`);
    if (booking.tier_breakdown?.length) {
      booking.tier_breakdown.forEach(t => L.push(`- ${t.qty}x ${t.label}`));
    }
    // Opcionais
    if (booking.selected_optionals?.length) {
      L.push(`Opcionais: ${booking.selected_optionals.map(o => o.name).join(", ")}`);
    }
    L.push(`Total: R$ ${fmtBRL(booking.final_amount)}`);
    L.push("");
    L.push("*Meus dados:*");
    if (u?.full_name) L.push(`Nome: ${u.full_name}`);
    if (u?.phone) L.push(`Telefone: ${u.phone}`);
    if (u?.cpf) L.push(`CPF: ${u.cpf}`);
    L.push("");
    L.push(`Código da reserva: ${code}`);

    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(L.join("\n"))}`;
  };

  const go = async () => {
    setLoading(true);
    // Abre o WhatsApp em NOVA aba: a reserva fica em aberto aqui, então o cliente
    // pode voltar e pagar online se preferir, sem perder o checkout.
    const url = buildUrl();
    window.open(url, "_blank", "noopener,noreferrer");
    try { await apiFetch(`/payments/${code}/whatsapp`, { method: "POST" }); } catch { /* segue */ }
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="text-center py-4">
      {sent ? (
        <>
          <p className="text-emerald-600 text-sm font-semibold mb-2 inline-flex items-center gap-1.5"><Check size={15} /> Abrimos o WhatsApp em uma nova aba.</p>
          <p className="text-gray-500 text-sm mb-4">Não abriu? <a href={buildUrl()} target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-semibold underline">Toque aqui</a> para abrir de novo.</p>
        </>
      ) : (
        <p className="text-gray-500 text-sm mb-4">Abrimos o WhatsApp (em nova aba) com sua reserva preenchida. Nossa equipe confirma os detalhes e o pagamento com você — e a reserva continua aqui caso prefira pagar online.</p>
      )}
      <button onClick={go} disabled={loading} className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-60 inline-flex items-center gap-2"><MessageCircle size={17} /> {loading ? "Abrindo..." : sent ? "Abrir novamente" : "Continuar no WhatsApp"}</button>
    </div>
  );
}

function StepBadge({ n, done, active }: { n: number; done: boolean; active: boolean }) {
  return (<span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${done ? "bg-emerald-500 text-white" : active ? "bg-navy-700 text-white" : "bg-gray-200 text-gray-500"}`}>{done ? <Check size={15} /> : n}</span>);
}

/* Checkout ANTES da reserva existir: resumo (client-side) + login como passo 1. */
function PreCheckout() {
  const router = useRouter();
  const sp = useSearchParams();
  const tripId = sp.get("trip");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  // Reserva "de mentira" (editável) antes do login. Vira a reserva real no checkout.
  const [book, setBook] = useState<Booking | null>(null);

  // Seleção feita na página da viagem (JSON na URL).
  const sel = useMemo(() => {
    try { return JSON.parse(decodeURIComponent(sp.get("sel") || "")); }
    catch { return { people: 1, optionals: [], tiers: [] }; }
  }, [sp]);
  const people: number = sel.people || 1;
  const selOptionals: { name: string; price: number }[] = sel.optionals || [];
  const selTiers: { label: string; qty: number }[] = sel.tiers || [];

  useEffect(() => {
    if (!tripId) { setLoading(false); return; }
    fetch(`${API}/trips/${tripId}`).then(r => r.ok ? r.json() : null).then(t => { setTrip(t); setLoading(false); }).catch(() => setLoading(false));
  }, [tripId]);

  const createBooking = useCallback(async () => {
    setCreating(true); setError("");
    // Usa o que o cliente editou (book); se ainda não inicializou, cai na seleção da URL.
    const payload = book
      ? {
          trip_id: book.trip_id,
          num_travelers: book.num_travelers,
          selected_optionals: book.selected_optionals,
          tier_breakdown: (book.tier_breakdown || []).map(t => ({ label: t.label, qty: t.qty })),
        }
      : { trip_id: Number(tripId), num_travelers: people, selected_optionals: selOptionals, tier_breakdown: selTiers };
    try {
      const res = await apiFetch(`/payments/checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); setError(typeof e.detail === "string" ? e.detail : "Não foi possível iniciar a reserva."); setCreating(false); return; }
      const d = await res.json();
      // Passa a viagem adiante p/ a tela [code] renderizar na hora — só se a data não mudou
      // (se mudou, o trip_id difere; a tela [code] busca a viagem certa).
      try { if (trip && payload.trip_id === trip.id) sessionStorage.setItem(`reservar_trip_${d.booking_code}`, JSON.stringify(trip)); } catch { /* ignore */ }
      router.replace(`/reservar/${d.booking_code}`);
    } catch { setError("Erro de conexão. Tente novamente."); setCreating(false); }
  }, [book, tripId, people, selOptionals, selTiers, trip, router]);

  // Já logado → cria a reserva e segue direto (sem passar pelo passo de login).
  const tried = useRef(false);
  useEffect(() => {
    if (trip && getToken() && !tried.current) { tried.current = true; createBooking(); }
  }, [trip, createBooking]);

  // Resumo editável (pseudo-reserva). Recalculado no cliente; o servidor reconcilia ao criar.
  const hasTiers = selTiers.length > 0;
  const pseudo = useMemo<Booking | null>(() => {
    if (!trip) return null;
    const priceForLabel = (label: string) => label === ADULT ? trip.price_per_person : (trip.price_tiers.find(t => tierLabel(t) === label)?.price ?? trip.price_per_person);
    const tier_breakdown = selTiers.map(t => ({ label: t.label, qty: t.qty, price: priceForLabel(t.label) }));
    const base = hasTiers ? tier_breakdown.reduce((s, t) => s + t.qty * t.price, 0) : people * trip.price_per_person;
    const optionals_amount = selOptionals.reduce((s, o) => s + o.price * people, 0);
    return {
      booking_code: "", trip_id: trip.id, final_amount: base + optionals_amount, total_amount: base,
      optionals_amount, num_travelers: people, status: "pending",
      selected_optionals: selOptionals, tier_breakdown,
      trip_title: trip.title || undefined, trip_destination: trip.destination || undefined,
      trip_departure_date: trip.departure_date, trip_return_date: trip.return_date,
      trip_image_url: trip.image_url || undefined,
      trip_max_installments: trip.max_installments, installments_max: trip.max_installments, installment_options: [],
    };
  }, [trip, hasTiers, people, selOptionals, selTiers]);
  useEffect(() => { if (pseudo) setBook(prev => prev ?? pseudo); }, [pseudo]);

  if (loading || (getToken() && !error)) {
    return <BrandedLoader label="Abrindo sua reserva..." />;
  }
  if (!trip) {
    return <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4"><div className="text-center"><p className="text-gray-600 mb-4">Viagem não encontrada.</p><Link href="/viagens" className="text-navy-700 font-semibold">Ver viagens</Link></div></main>;
  }

  const view = book ?? pseudo;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-clip">
      <CheckoutHeader />
      <main className="flex-1 py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-500 hover:text-navy-700 text-sm mb-4 transition-colors"><ArrowLeft size={16} /> Voltar</button>
          <h1 className="font-display font-black text-2xl md:text-3xl text-navy-800 mb-6">Confirmar e pagar</h1>
          <div className="grid md:grid-cols-[1fr_380px] gap-6 items-start stagger-in">
            <div className="space-y-4 order-2 md:order-1 min-w-0">
              {/* Passo 1: login/cadastro */}
              <section className="bg-white rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 px-5 py-4">
                  <StepBadge n={1} done={false} active={true} />
                  <h2 className="font-bold text-navy-800">Entrar ou cadastrar</h2>
                </div>
                <div className="px-5 pb-5">
                  {error && <div className="mb-3"><ErrorMsg>{error}</ErrorMsg></div>}
                  <p className="text-sm text-gray-500 mb-3">Para concluir sua reserva, entre na sua conta ou crie uma — leva menos de 1 minuto.</p>
                  <button onClick={() => { if (getToken()) createBooking(); else setShowAuth(true); }} disabled={creating}
                    className="w-full sm:w-auto bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                    {creating ? <><Loader2 size={17} className="animate-spin" /> Aguarde…</> : "Continuar"}
                  </button>
                </div>
              </section>
              {/* Passos 2 e 3 (desabilitados até logar) */}
              <section className="bg-white rounded-2xl shadow-sm opacity-50">
                <div className="flex items-center gap-3 px-5 py-4"><StepBadge n={2} done={false} active={false} /><h2 className="font-bold text-navy-800">Dados dos viajantes</h2></div>
              </section>
              <section className="bg-white rounded-2xl shadow-sm opacity-50">
                <div className="flex items-center gap-3 px-5 py-4"><StepBadge n={3} done={false} active={false} /><h2 className="font-bold text-navy-800">Forma de pagamento</h2></div>
              </section>
            </div>
            <ReservationCard booking={view!} trip={trip} code="" onUpdate={setBook} editable={true} method="pix" installments={1} />
          </div>
        </div>
      </main>
      <Footer />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => { setShowAuth(false); createBooking(); }} />}
    </div>
  );
}

function BlockedScreen({ status }: { status: string }) {
  const map: Record<string, { title: string; msg: string }> = {
    cancelled: { title: "Reserva cancelada", msg: "Esta reserva foi cancelada e não pode mais ser paga." },
    refunded: { title: "Reserva reembolsada", msg: "Esta reserva foi reembolsada." },
    completed: { title: "Viagem já realizada", msg: "Esta reserva já foi concluída." },
  };
  const m = map[status] || { title: "Reserva indisponível", msg: "Esta reserva não está disponível para pagamento." };
  return (
    <main className="flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
        <AlertCircle className="w-14 h-14 text-gray-400 mx-auto mb-4" />
        <h1 className="font-display font-black text-2xl text-navy-800 mb-2">{m.title}</h1>
        <p className="text-gray-600 text-sm mb-6">{m.msg}</p>
        <Link href="/viagens" className="block w-full bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 rounded-xl transition-colors mb-2">Ver outras viagens</Link>
        <Link href="/dashboard" className="block text-sm text-gray-500 hover:text-navy-700">Minhas reservas</Link>
      </div>
    </main>
  );
}

function SuccessScreen({ code, amount }: { code: string; amount?: number }) {
  return (
    <main className="flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
        <span className="inline-block animate-pop" style={{ transformOrigin: "center" }}><CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" /></span>
        <h1 className="font-display font-black text-2xl text-navy-800 mb-2">Pagamento confirmado! 🎉</h1>
        <p className="text-gray-600 text-sm mb-5">Sua vaga está garantida. Enviaremos os detalhes em breve.</p>
        <div className="bg-navy-50 rounded-xl p-4 mb-6"><p className="text-navy-600 text-sm">Código da reserva</p><p className="font-black text-navy-800 text-lg">{code}</p>{amount != null && <p className="text-navy-600 text-sm mt-1">Valor: R$ {fmtBRL(amount)}</p>}</div>
        <Link href="/dashboard" className="block w-full bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 rounded-xl transition-colors">Ver minhas reservas</Link>
      </div>
    </main>
  );
}
