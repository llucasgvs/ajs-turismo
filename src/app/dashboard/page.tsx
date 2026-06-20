"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LogOut, MapPin, Calendar, ChevronRight, ChevronLeft, Search, MessageCircle, Menu, X, Users,
  Plane, CheckCircle2, ArrowRight, Download, Ticket, FileText, Sparkles, Bus, Wallet, Clock, Share2, Loader2,
} from "lucide-react";
import { getUser, logout, apiFetch } from "@/lib/api";
import { fmtBRL, salesClosed } from "@/lib/format";
import { BrandedLoader } from "@/components/BrandedLoader";

interface StoredUser { full_name: string; email: string; is_admin: boolean }
interface Optional { name: string; price: number }
interface Booking {
  id: number; booking_code: string; trip_id: number; num_travelers: number;
  price_per_person: number; final_amount: number; base_amount?: number; status: string; created_at: string;
  traveler_name?: string | null; payment_method?: string | null; installments?: number;
  selected_optionals?: Optional[]; travelers_info?: string | null;
  trip_title?: string; trip_destination?: string; trip_departure_date?: string;
  trip_return_date?: string; trip_image_url?: string;
  trip_required_documents?: string | null; trip_departure_locations?: unknown[]; trip_includes?: string[];
}

const WA_BASE = "https://wa.me/5541998348766?text=";
const WA_HELP = WA_BASE + encodeURIComponent("Olá! Preciso de ajuda com minha reserva.");
const PLACEHOLDER = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80";
const PAY: Record<string, string> = { whatsapp: "Presencial / WhatsApp", pix: "PIX", credit_card: "Cartão de crédito", transfer: "Transferência" };

const fmtDate = (d: string) => { const [y, m, day] = d.slice(0, 10).split("-"); return `${day}/${m}/${y}`; };
const daysUntil = (d: string) => Math.ceil((new Date(d.slice(0, 10) + "T12:00:00").getTime() - new Date().setHours(12, 0, 0, 0)) / 86400000);
const sameDay = (a?: string, b?: string) => !!a && !!b && a.slice(0, 10) === b.slice(0, 10);
const pessoas = (n: number) => `${n} ${n === 1 ? "pessoa" : "pessoas"}`;
const countdownLabel = (days: number) => days <= 0 ? "É hoje!" : days === 1 ? "É amanhã!" : `Faltam ${days} dias`;
const waMsg = (b: Booking) => WA_BASE + encodeURIComponent(`Olá! Quero acompanhar minha reserva *${b.booking_code}* - ${b.trip_title ?? "viagem"}.`);
const locName = (l: unknown) => typeof l === "string" ? l : (l && typeof l === "object" ? ((l as Record<string, string>).name || (l as Record<string, string>).label || "") : "");

/* ─── Voucher / cartão de embarque ─── */
function Voucher({ b, userName }: { b: Booking; userName?: string }) {
  const days = b.trip_departure_date ? daysUntil(b.trip_departure_date) : null;
  const roundtrip = sameDay(b.trip_departure_date, b.trip_return_date);
  const companions: string[] = (() => {
    try { return (b.travelers_info ? JSON.parse(b.travelers_info) : []).map((c: { full_name?: string }) => c.full_name).filter(Boolean); }
    catch { return []; }
  })();
  const titular = b.traveler_name || userName;
  const pax = [titular, ...companions].filter(Boolean) as string[];
  const opts = b.selected_optionals ?? [];
  const locs = (b.trip_departure_locations ?? []).map(locName).filter(Boolean);
  const includes = b.trip_includes ?? [];

  const [isTouch, setIsTouch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setIsTouch(typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const filename = `voucher-${b.booking_code}.pdf`;
  const fetchPdf = async (): Promise<Blob> => {
    const res = await apiFetch(`/bookings/my/${b.booking_code}/voucher`);
    if (!res.ok) throw new Error(`erro ${res.status}`);
    return res.blob();
  };
  const saveBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const onShare = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const blob = await fetchPdf();
      const file = new File([blob], filename, { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: `Voucher · ${b.trip_title ?? "Viagem"}` }); }
        catch (e) { if ((e as DOMException)?.name !== "AbortError") saveBlob(blob); }
      } else {
        saveBlob(blob); // fallback: baixa o arquivo
      }
    } catch (e) { setErr((e as Error)?.message || "erro"); }
    finally { setBusy(false); }
  };
  const onDownload = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try { saveBlob(await fetchPdf()); } catch (e) { setErr((e as Error)?.message || "erro"); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden print:shadow-none print:border-gray-300">
      {/* Cabeçalho só na impressão: logo AJS */}
      <div className="hidden print:flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9"><Image src="/icon_ajs.png" alt="AJS Turismo" fill className="object-contain" /></div>
          <div className="flex flex-col leading-tight"><span className="font-display font-black text-navy-900 text-base">AJS Turismo</span><span className="text-[10px] text-gray-500 tracking-wide">Voucher de viagem</span></div>
        </div>
        <span className="font-mono font-black text-navy-800 tracking-wider text-sm">{b.booking_code}</span>
      </div>
      {/* Topo com foto */}
      <div className="relative h-44 sm:h-52 text-white print:h-32">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.trip_image_url || PLACEHOLDER} alt={b.trip_title ?? ""} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/95 via-navy-900/50 to-navy-900/10" />
        <div className="relative h-full flex flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full"><CheckCircle2 size={11} /> Confirmada</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/85 uppercase tracking-wide"><Ticket size={12} /> Voucher</span>
          </div>
          <div>
            <h2 className="font-display font-black text-2xl sm:text-3xl leading-tight drop-shadow">{b.trip_title ?? "Viagem"}</h2>
            {b.trip_destination && <p className="flex items-center gap-1.5 text-white/85 text-sm mt-0.5"><MapPin size={13} /> {b.trip_destination}</p>}
          </div>
        </div>
      </div>

      {/* Faixa principal: contagem + datas + código */}
      <div className="px-5 py-4 border-b border-dashed border-gray-200 flex flex-wrap items-center gap-x-4 gap-y-3 justify-between">
        {days !== null && (
          <div className="print:hidden">
            <p className="font-display font-black text-2xl leading-none text-navy-800">{days <= 0 ? "🎉" : days}</p>
            <p className="text-xs text-gray-400 mt-0.5">{countdownLabel(days)}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{roundtrip ? "Data" : "Saída → Retorno"}</p>
          <p className="text-sm font-bold text-navy-800">{b.trip_departure_date ? fmtDate(b.trip_departure_date) : "-"}{roundtrip ? " · bate e volta" : b.trip_return_date ? ` → ${fmtDate(b.trip_return_date)}` : ""}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Código</p>
          <p className="font-mono font-black text-navy-800 tracking-wider">{b.booking_code}</p>
        </div>
      </div>

      {/* Blocos */}
      <div className="p-5 space-y-5">
        {/* Viajantes */}
        <VBlock icon={<Users size={13} className="text-gold-500" />} title={`Viajantes (${pax.length || b.num_travelers})`}>
          {pax.length > 0
            ? <div className="flex flex-wrap gap-1.5">{pax.map((n, i) => <span key={i} className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 text-xs text-navy-700 font-medium">{n}</span>)}</div>
            : <p className="text-sm text-gray-500">{pessoas(b.num_travelers)}</p>}
        </VBlock>

        {/* Embarque */}
        {locs.length > 0 && (
          <VBlock icon={<Bus size={13} className="text-gold-500" />} title="Local de embarque">
            <ul className="space-y-1">{locs.map((l, i) => <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5"><MapPin size={12} className="text-gray-300 mt-0.5 flex-shrink-0" /> {l}</li>)}</ul>
          </VBlock>
        )}

        {/* Extras comprados */}
        {opts.length > 0 && (
          <VBlock icon={<Sparkles size={13} className="text-gold-500" />} title="Extras comprados">
            <ul className="space-y-1">{opts.map((o, i) => <li key={i} className="flex items-start justify-between gap-3 text-sm"><span className="text-gray-600 min-w-0">{o.name}</span><span className="text-gray-400 shrink-0 whitespace-nowrap">R$ {fmtBRL(o.price * b.num_travelers)}</span></li>)}</ul>
          </VBlock>
        )}

        {/* Inclui */}
        {includes.length > 0 && (
          <VBlock icon={<CheckCircle2 size={13} className="text-emerald-500" />} title="O que inclui">
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">{includes.map((it, i) => <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5"><CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" /> {it}</li>)}</ul>
          </VBlock>
        )}

        {/* Documentos */}
        {b.trip_required_documents && (
          <VBlock icon={<FileText size={13} className="text-gold-500" />} title="Documentos necessários">
            <p className="text-sm text-gray-600 whitespace-pre-line">{b.trip_required_documents}</p>
          </VBlock>
        )}

        {/* Pagamento */}
        <VBlock icon={<Wallet size={13} className="text-gold-500" />} title="Pagamento">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{PAY[b.payment_method ?? ""] ?? "-"}{(b.installments ?? 1) > 1 ? ` · ${b.installments}x` : ""}</span>
            <span className="font-display font-black text-lg text-navy-800">R$ {fmtBRL(b.final_amount)}</span>
          </div>
        </VBlock>
      </div>

      {/* Ações */}
      <div className="px-5 pb-5 print:hidden">
        <div className="flex flex-wrap gap-2 sm:justify-start">
          {isTouch ? (
            <button onClick={onShare} disabled={busy} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 active:scale-[.99] disabled:opacity-60 text-white font-bold text-sm py-3.5 sm:py-2.5 px-5 rounded-xl transition-all">{busy ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />} Compartilhar voucher</button>
          ) : (
            <button onClick={onDownload} disabled={busy} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 active:scale-[.99] disabled:opacity-60 text-white font-bold text-sm py-3.5 sm:py-2.5 px-5 rounded-xl transition-all">{busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Baixar voucher</button>
          )}
          <a href={waMsg(b)} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-emerald-200 text-[#25D366] hover:bg-emerald-50 active:scale-[.99] font-bold text-sm py-3 sm:py-2.5 px-4 rounded-xl transition-all"><MessageCircle size={16} /> WhatsApp</a>
          <Link href={`/viagens/${b.trip_id}`} className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-gray-200 text-navy-700 hover:bg-navy-50 active:scale-[.99] font-bold text-sm py-3 sm:py-2.5 px-4 rounded-xl transition-all">Ver viagem <ArrowRight size={14} /></Link>
        </div>
        {err && <p className="text-xs text-red-500 text-center mt-2">Não foi possível gerar o voucher agora. Tente novamente em instantes.</p>}
      </div>

      {/* Rodapé de contato (aparece na impressão) */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center print:bg-white">
        <p className="text-xs text-gray-500">Dúvidas? Fale com a AJS Turismo no WhatsApp <span className="font-bold text-navy-700">(41) 99834-8766</span></p>
      </div>
    </div>
  );
}
function VBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">{icon} {title}</p>
      {children}
    </div>
  );
}

/* ─── Card de reserva (aba "Minhas reservas") ─── */
type Variant = "pending" | "interesse" | "confirmed" | "past";
function TripCard({ b, variant }: { b: Booking; variant: Variant }) {
  const days = b.trip_departure_date ? daysUntil(b.trip_departure_date) : null;
  const roundtrip = sameDay(b.trip_departure_date, b.trip_return_date);
  const accent = variant === "pending" ? "border-l-amber-400" : variant === "interesse" ? "border-l-sky-400" : variant === "past" ? "border-l-gray-300" : "border-l-emerald-400";
  const badge = variant === "pending" ? { txt: "Aguardando pagamento", cls: "bg-amber-50 text-amber-700 border-amber-200" }
    : variant === "interesse" ? { txt: "Aguardando contato", cls: "bg-sky-50 text-sky-700 border-sky-200" }
    : variant === "past" ? { txt: "Realizada", cls: "bg-gray-100 text-gray-500 border-gray-200" }
    : { txt: "Confirmada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  return (
    <div className={`rounded-2xl overflow-hidden border border-gray-100 border-l-4 ${accent} bg-white shadow-sm hover:shadow-md transition-shadow`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-navy-100">
            {b.trip_image_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img loading="lazy" decoding="async" src={b.trip_image_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Plane size={20} className="text-navy-300" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1 ${badge.cls}`}>{badge.txt}</span>
            <p className="font-display font-black text-navy-800 text-sm sm:text-base leading-tight line-clamp-2">{b.trip_title ?? "Viagem"}</p>
            {b.trip_destination && <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><MapPin size={10} /> {b.trip_destination}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-2">
              <span className="flex items-center gap-1"><Calendar size={11} className="text-gold-500" />
                {b.trip_departure_date ? (roundtrip ? `${fmtDate(b.trip_departure_date)} · bate e volta` : `${fmtDate(b.trip_departure_date)}${b.trip_return_date ? ` → ${fmtDate(b.trip_return_date)}` : ""}`) : "Data a definir"}
              </span>
              <span className="flex items-center gap-1"><Users size={11} className="text-gold-500" /> {pessoas(b.num_travelers)}</span>
              {variant !== "interesse" && variant !== "past" && b.final_amount > 0 && <span className="font-bold text-navy-700">R$ {fmtBRL(b.final_amount)}</span>}
            </div>
          </div>
        </div>
        {variant === "pending" && (
          salesClosed(b.trip_departure_date) ? (
            <div className="mt-3">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 mb-2.5">As vendas para esta data já encerraram (fechamos alguns dias antes da saída). Fale com a nossa equipe para verificar.</div>
              <a href={waMsg(b)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:brightness-95 text-white font-bold text-sm py-2.5 rounded-xl transition-all"><MessageCircle size={14} /> Falar no WhatsApp</a>
            </div>
          ) : (
          <div className="mt-3">
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700 mb-2.5">As vagas são limitadas e só ficam garantidas após o pagamento - não deixe sua escolha esgotar.{days !== null && days >= 0 && days <= 30 ? <> <span className="font-bold">{days === 0 ? "A viagem é hoje!" : days === 1 ? "É amanhã!" : `Faltam só ${days} dias.`}</span></> : ""}</div>
            <Link href={`/reservar/${b.booking_code}`} className="flex items-center justify-center gap-2 w-full bg-navy-700 hover:bg-navy-600 text-white font-bold text-sm py-2.5 rounded-xl transition-colors">Concluir reserva <ArrowRight size={14} /></Link>
          </div>
          )
        )}
        {variant === "interesse" && <p className="mt-3 text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">Você demonstrou interesse nesta viagem. A equipe da AJS vai te chamar no WhatsApp para combinar os detalhes e o pagamento.</p>}
        {variant === "past" && <p className="mt-3 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">Viagem realizada - esperamos que tenha sido incrível! ✨</p>}
        <div className="flex items-center justify-between gap-2 flex-wrap mt-3 pt-3 border-t border-gray-50">
          <span className="text-[11px] font-mono text-gray-400">{b.booking_code}</span>
          <div className="flex items-center gap-2">
            {(variant === "pending" || variant === "interesse") && <a href={waMsg(b)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-[#25D366] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors"><MessageCircle size={12} /> WhatsApp</a>}
            <Link href={`/viagens/${b.trip_id}`} className="flex items-center gap-1 text-xs font-semibold text-navy-600 bg-white border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-navy-50 hover:border-navy-200 transition-colors">Ver viagem <ArrowRight size={11} /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
function SectionTitle({ dot, children, sub }: { dot: string; children: React.ReactNode; sub?: string }) {
  return (<div className="mb-3"><h2 className="font-display font-black text-navy-800 text-base flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${dot}`} /> {children}</h2>{sub && <p className="text-xs text-gray-400 mt-0.5 ml-4">{sub}</p>}</div>);
}

export default function Dashboard() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [tab, setTab] = useState<"viagens" | "andamento" | "historico">("viagens");
  const [vIdx, setVIdx] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { window.location.href = "/login"; return; }
    if (u.is_admin) { window.location.href = "/admin"; return; }
    setUser(u);
    apiFetch("/bookings/my").then(r => r.json())
      .then(data => { if (Array.isArray(data)) setBookings(data.filter((b: Booking) => b.status !== "cancelled" && b.status !== "refunded")); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const dleft = (b: Booking) => b.trip_departure_date ? daysUntil(b.trip_departure_date) : 99999;
  const upcomingConfirmed = bookings.filter(b => b.status === "confirmed" && dleft(b) >= 0).sort((a, b) => dleft(a) - dleft(b));
  const pending = bookings.filter(b => b.status === "pending").sort((a, b) => dleft(a) - dleft(b));
  // Interesse só fica no "Em andamento" enquanto a viagem é futura (passou = lead morto p/ o cliente).
  const interesse = bookings.filter(b => b.status === "interesse" && dleft(b) >= 0);
  const realizadas = bookings.filter(b => b.status === "completed" || (b.status === "confirmed" && dleft(b) < 0));
  const hasUpcoming = upcomingConfirmed.length > 0;
  const voucher = upcomingConfirmed[Math.min(vIdx, upcomingConfirmed.length - 1)];
  const andamentoCount = pending.length + interesse.length;
  const destinosVisitados = new Set(realizadas.map(b => b.trip_destination || b.trip_title).filter(Boolean)).size;

  // abre na aba mais relevante: viagem confirmada > em andamento > histórico
  useEffect(() => {
    if (loading) return;
    setTab(hasUpcoming ? "viagens" : andamentoCount > 0 ? "andamento" : "historico");
    /* eslint-disable-next-line */
  }, [loading, hasUpcoming, andamentoCount > 0]);

  if (!user) return null;
  if (loading) return <BrandedLoader label="Carregando seu painel..." />;
  const firstName = user.full_name.split(" ")[0];
  const initial = user.full_name[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col print:bg-white">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30 print:hidden">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-9 h-9"><Image src="/icon_ajs.png" alt="AJS Turismo" fill className="object-contain" priority /></div>
            <div className="flex flex-col leading-tight"><span className="font-display font-black text-navy-900 text-base tracking-tight">AJS</span><span className="text-gold-500 text-[10px] font-semibold tracking-[0.2em] uppercase leading-none">Turismo</span></div>
          </Link>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2 text-gray-700 hover:text-navy-800 transition-colors py-1.5 px-2 rounded-xl hover:bg-gray-100">
              <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm">{initial}</div>
              <span className="text-sm font-semibold hidden sm:inline">{firstName}</span>
              {showMenu ? <X size={14} className="text-gray-400" /> : <Menu size={14} className="text-gray-400" />}
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 w-56 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm flex-shrink-0">{initial}</div><div className="min-w-0"><p className="text-xs font-bold text-navy-800 truncate">{user.full_name}</p><p className="text-xs text-gray-400 truncate">{user.email}</p></div></div>
                <div className="py-1">
                  <Link href="/viagens" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><Search size={14} className="text-gray-400" /> Explorar viagens</Link>
                  <a href={WA_HELP} target="_blank" rel="noopener noreferrer" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><MessageCircle size={14} className="text-emerald-500" /> Falar no WhatsApp</a>
                </div>
                <div className="border-t border-gray-100 py-1"><button onClick={() => { setShowMenu(false); logout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"><LogOut size={14} /> Sair da conta</button></div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-5 pb-12">
        <div className="print:hidden">
          <h1 className="font-display font-black text-navy-900 text-xl">Olá, {firstName}! 👋</h1>
          <p className="text-gray-400 text-sm mt-0.5">{bookings.length === 0 ? "Pronto pra primeira viagem?" : "Aqui estão suas viagens com a AJS."}</p>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-14 px-6">
            <div className="w-16 h-16 bg-navy-50 rounded-full flex items-center justify-center mx-auto mb-4"><Plane size={28} className="text-navy-300" /></div>
            <p className="font-display font-black text-navy-800 mb-1">Nenhuma reserva ainda</p>
            <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">Explore nossos roteiros e planeje sua próxima aventura!</p>
            <Link href="/viagens" className="inline-flex items-center gap-2 bg-navy-800 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-navy-700 transition-colors">Ver viagens disponíveis <ChevronRight size={15} /></Link>
          </div>
        ) : (
          <>
            {/* Abas: Minhas viagens (destaque) · Em andamento · Histórico */}
            <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1 print:hidden">
              <button onClick={() => setTab("viagens")} className={`flex-1 sm:flex-[1.4] flex items-center justify-center gap-1 whitespace-nowrap text-[13px] font-bold py-2.5 rounded-lg transition-colors ${tab === "viagens" ? "bg-white text-navy-800 shadow-sm" : "text-gray-500 hover:text-navy-700"}`}><Ticket size={14} className="flex-shrink-0" /> <span className="sm:hidden">Viagens</span><span className="hidden sm:inline">Minhas viagens</span> {upcomingConfirmed.length > 1 && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === "viagens" ? "bg-navy-100 text-navy-700" : "bg-gray-200 text-gray-500"}`}>{upcomingConfirmed.length}</span>}</button>
              <button onClick={() => setTab("andamento")} className={`flex-1 flex items-center justify-center gap-1 whitespace-nowrap text-[13px] font-bold py-2.5 rounded-lg transition-colors ${tab === "andamento" ? "bg-white text-navy-800 shadow-sm" : "text-gray-500 hover:text-navy-700"}`}>Andamento {andamentoCount > 0 && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${pending.length > 0 ? "bg-amber-400 text-white" : tab === "andamento" ? "bg-navy-100 text-navy-700" : "bg-gray-200 text-gray-500"}`}>{andamentoCount}</span>}</button>
              <button onClick={() => setTab("historico")} className={`flex-1 flex items-center justify-center gap-1 whitespace-nowrap text-[13px] font-bold py-2.5 rounded-lg transition-colors ${tab === "historico" ? "bg-white text-navy-800 shadow-sm" : "text-gray-500 hover:text-navy-700"}`}>Histórico {realizadas.length > 0 && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === "historico" ? "bg-gold-100 text-gold-700" : "bg-gray-200 text-gray-500"}`}>{realizadas.length}</span>}</button>
            </div>

            {/* ── Aba: Minhas viagens (voucher) ── */}
            {tab === "viagens" && (
              hasUpcoming ? (
                <div className="space-y-3">
                  {/* Poucas viagens: pílulas. Muitas: navegador ‹ N de T › (escala pra qualquer quantidade). */}
                  {upcomingConfirmed.length > 1 && upcomingConfirmed.length <= 3 && (
                    <div className="flex gap-2 print:hidden">
                      {upcomingConfirmed.map((b, i) => (
                        <button key={b.id} onClick={() => setVIdx(i)} className={`flex-1 min-w-0 text-left rounded-xl border px-3 py-2 transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[.98] ${i === vIdx ? "bg-navy-800 border-navy-800 text-white shadow-sm" : "bg-white border-gray-200 text-navy-700 hover:border-navy-300"}`}>
                          <p className="text-[10px] uppercase tracking-wide font-semibold opacity-70 truncate">{i === 0 ? "Próxima" : `Viagem ${i + 1}`}</p>
                          <p className="text-xs font-bold leading-tight truncate">{b.trip_title ?? "Viagem"}</p>
                          {b.trip_departure_date && <p className="text-[11px] opacity-80 truncate">{fmtDate(b.trip_departure_date)}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                  {upcomingConfirmed.length > 3 && (
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1.5 print:hidden">
                      <button onClick={() => setVIdx(v => Math.max(0, v - 1))} disabled={vIdx === 0} aria-label="Viagem anterior" className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-navy-600 transition-[transform,background-color] duration-150 ease-out hover:bg-gray-100 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"><ChevronLeft size={18} /></button>
                      <div className="flex-1 min-w-0 text-center">
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">{vIdx === 0 ? "Próxima viagem" : `Viagem ${vIdx + 1}`} · {vIdx + 1} de {upcomingConfirmed.length}</p>
                        <p className="text-sm font-bold text-navy-800 leading-tight truncate">{voucher?.trip_title ?? "Viagem"}{voucher?.trip_departure_date ? ` · ${fmtDate(voucher.trip_departure_date)}` : ""}</p>
                      </div>
                      <button onClick={() => setVIdx(v => Math.min(upcomingConfirmed.length - 1, v + 1))} disabled={vIdx >= upcomingConfirmed.length - 1} aria-label="Próxima viagem" className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-navy-600 transition-[transform,background-color] duration-150 ease-out hover:bg-gray-100 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"><ChevronRight size={18} /></button>
                    </div>
                  )}
                  {voucher && <div key={vIdx} className="voucher-swap"><Voucher b={voucher} userName={user.full_name} /></div>}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12 px-6">
                  <div className="w-14 h-14 bg-navy-50 rounded-full flex items-center justify-center mx-auto mb-3"><Ticket size={24} className="text-navy-300" /></div>
                  <p className="font-display font-black text-navy-800 mb-1">Nenhuma viagem confirmada</p>
                  <p className="text-gray-400 text-sm mb-4">Quando você fechar uma viagem, o cartão de embarque aparece aqui.</p>
                  <Link href="/viagens" className="inline-flex items-center gap-2 bg-navy-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-navy-700 transition-colors">Explorar viagens <ChevronRight size={15} /></Link>
                </div>
              )
            )}

            {/* ── Aba: Em andamento (urgência) ── */}
            {tab === "andamento" && (
              andamentoCount > 0 ? (
                <div className="space-y-6">
                  {pending.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-500 to-amber-400 text-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-gold">
                      <Clock size={20} className="flex-shrink-0" />
                      <p className="text-sm font-semibold leading-snug">{pending.length === 1 ? "Você tem uma reserva quase pronta." : `Você tem ${pending.length} reservas quase prontas.`} As vagas são limitadas - conclua antes que esgotem.</p>
                    </div>
                  )}
                  {pending.length > 0 && <section><SectionTitle dot="bg-amber-400" sub="As vagas são limitadas e só ficam garantidas após o pagamento.">Aguardando pagamento</SectionTitle><div className="space-y-3">{pending.map(b => <TripCard key={b.id} b={b} variant="pending" />)}</div></section>}
                  {interesse.length > 0 && <section><SectionTitle dot="bg-sky-400" sub="Você pediu informações. A equipe da AJS vai te chamar no WhatsApp.">Aguardando contato da AJS</SectionTitle><div className="space-y-3">{interesse.map(b => <TripCard key={b.id} b={b} variant="interesse" />)}</div></section>}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12 px-6">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle2 size={24} className="text-emerald-400" /></div>
                  <p className="font-display font-black text-navy-800 mb-1">Tudo em dia!</p>
                  <p className="text-gray-400 text-sm">Você não tem pagamentos ou contatos pendentes.</p>
                </div>
              )
            )}

            {/* ── Aba: Histórico (recordação) ── */}
            {tab === "historico" && (
              realizadas.length > 0 ? (
                <div className="space-y-5">
                  <div className="bg-gradient-to-br from-navy-800 to-navy-900 text-white rounded-2xl p-5 relative overflow-hidden">
                    <Sparkles size={80} className="absolute -right-3 -top-3 text-gold-400/20" />
                    <p className="text-gold-300 text-xs font-bold uppercase tracking-wide mb-1">Suas recordações</p>
                    <p className="font-display font-black text-2xl leading-tight">Você já viveu {realizadas.length} {realizadas.length === 1 ? "viagem" : "viagens"} com a AJS 💛</p>
                    {destinosVisitados > 1 && <p className="text-white/70 text-sm mt-1">{destinosVisitados} destinos diferentes - e a próxima já pode estar te esperando.</p>}
                  </div>
                  <div className="space-y-3">{realizadas.map(b => <TripCard key={b.id} b={b} variant="past" />)}</div>
                  <div className="text-center pt-1">
                    <Link href="/viagens" className="inline-flex items-center gap-2 text-sm font-bold text-navy-700 hover:text-navy-900 transition-colors">Bora pra próxima? Ver viagens <ArrowRight size={14} /></Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12 px-6">
                  <div className="w-14 h-14 bg-gold-50 rounded-full flex items-center justify-center mx-auto mb-3"><Sparkles size={24} className="text-gold-400" /></div>
                  <p className="font-display font-black text-navy-800 mb-1">Sua primeira história começa em breve</p>
                  <p className="text-gray-400 text-sm">Suas viagens realizadas vão aparecer aqui como recordações.</p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
