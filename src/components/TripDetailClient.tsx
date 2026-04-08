"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Clock, Calendar, Users, Check, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  ArrowLeft, Phone, User, CreditCard, Cake, Share2, AlertTriangle,
  Shield, Headphones, Award, Camera, Sun, Mountain, Waves,
  TreePine, Globe, Plane, Utensils, CheckCheck, Star,
} from "lucide-react";
import type { Trip } from "@/types/trip";
import Footer from "@/components/Footer";
import { fmtBRL, fmtInstallment } from "@/lib/format";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ─── types ─── */
type StoredUser = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  is_admin: boolean;
};
type CompanionForm = { full_name: string; cpf: string; birth_date: string };

/* ─── helpers ─── */
function getStoredUser(): StoredUser | null {
  try { return JSON.parse(localStorage.getItem("ajs_user") || "null"); } catch { return null; }
}
function getToken(): string | null { return localStorage.getItem("ajs_token"); }

/** Extrai hora local de Brasília de uma ISO string (ex: "22:00") */
function fmtTimeSP(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/** Hora numérica em SP para lógica de duração */
function getHourSP(iso: string): number {
  return parseInt(fmtTimeSP(iso).slice(0, 2));
}

/** Dias = noites se saída noturna (≥18h), senão noites+1 */
function calcDays(duration_nights: number, departure_date: string): number {
  if (duration_nights === 0) return 1;
  return getHourSP(departure_date) >= 18 ? duration_nights : duration_nights + 1;
}

function formatCPF(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
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
function formatPhone(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function buildWhatsAppMessage(
  trip: Trip, user: StoredUser, phone: string, cpf: string,
  birthDate: string, people: number, companions: CompanionForm[],
  note: string, bookingCode: string,
  optionals: { name: string; price: number }[],
) {
  const fmt = (d: string) => { if (!d) return "-"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
  let msg =
    `*Interesse em reserva -- ${trip.title}*\n` +
    `Destino: ${trip.destination}\n` +
    `Saida: ${fmt(trip.departure_date.slice(0, 10))}\n` +
    `Retorno: ${fmt(trip.return_date.slice(0, 10))}\n` +
    `Preco por pessoa: R$ ${fmtBRL(trip.price_per_person)}\n` +
    `Codigo: ${bookingCode}\n\n` +
    `*Titular:*\n` +
    `   Nome: ${user.full_name}\n` +
    `   CPF: ${cpf}\n` +
    `   Nascimento: ${fmt(birthDate)}\n` +
    `   Tel: ${phone}\n`;
  companions.forEach((c, i) => {
    msg += `\n*Acompanhante ${i + 1}:*\n   Nome: ${c.full_name}\n   CPF: ${c.cpf}\n   Nascimento: ${fmt(c.birth_date)}\n`;
  });
  msg += `\n*Total:* ${people} pessoa${people > 1 ? "s" : ""}\n`;
  const optsTotal = optionals.reduce((s, o) => s + o.price, 0);
  msg += `*Passagem:* R$ ${fmtBRL(people * trip.price_per_person)}`;
  if (optionals.length > 0) {
    msg += `\n*Opcionais selecionados:*`;
    optionals.forEach(o => { msg += `\n   - ${o.name}: R$ ${fmtBRL(o.price * people)} (${people}x R$ ${fmtBRL(o.price)})`; });
    msg += `\n*Total com opcionais:* R$ ${fmtBRL(people * trip.price_per_person + optsTotal * people)}`;
  }
  if (note) msg += `\n\nObservacao: ${note}`;
  return msg;
}

/* ─── destination highlights — derived from trip.includes ─── */
type HL = { icon: React.ElementType; label: string; sub: string };

const DESC_RULES: { keys: string[]; icon: React.ElementType; label: string; sub: string }[] = [
  { keys: ["gastronomia", "culinária", "culinaria", "restaurante", "fondue", "chocolate", "cerveja", "vinho", "frutos do mar", "churrasco"], icon: Utensils, label: "Gastronomia", sub: "Experiência gastronômica" },
  { keys: ["natureza", "trilha", "cachoeira", "cascata", "parque", "verde", "flora", "fauna", "mata", "floresta", "ecoturismo"], icon: TreePine, label: "Natureza", sub: "Paisagens naturais" },
  { keys: ["arquitetura", "europeu", "europeia", "colonial", "castelo", "chalé", "chale", "estilo", "rua coberta", "enxaimel"], icon: Camera, label: "Arquitetura", sub: "Estilo encantador" },
  { keys: ["clima", "aconchegante", "frio", "serra", "montanha", "altitude", "fresco", "neblina"], icon: Mountain, label: "Clima de serra", sub: "Temperatura agradável" },
  { keys: ["praia", "mar", "litoral", "costa", "areia", "cristalino", "mergulho", "snorkel"], icon: Waves, label: "Praias", sub: "Águas cristalinas" },
  { keys: ["romântico", "romantico", "romance", "casal", "lua de mel", "intimidade"], icon: Star, label: "Romântico", sub: "Clima acolhedor" },
  { keys: ["aventura", "radical", "adrenalina", "esporte", "rapel", "rafting", "tirolesa", "bungee"], icon: Sun, label: "Aventura", sub: "Emoção garantida" },
  { keys: ["cultura", "cultural", "história", "historia", "museu", "patrimônio", "patrimonio", "tradição", "tradicao", "histórico", "historico"], icon: Globe, label: "Cultura e história", sub: "Riqueza cultural" },
  { keys: ["família", "familia", "crianças", "criancas", "parque temático", "parque tematico", "aquático", "aquatico", "beto carrero"], icon: Users, label: "Família", sub: "Para toda a família" },
  { keys: ["compras", "shopping", "lojas", "outlet", "artesanato", "feira"], icon: Camera, label: "Compras", sub: "Muitas opções" },
  { keys: ["internacional", "exterior", "europa", "disney", "orlando", "cancún", "cancun", "miami", "paris", "fronteira", "paraguai", "argentina", "três países", "tres paises", "país vizinho"], icon: Plane, label: "Internacional", sub: "Experiência global" },
  { keys: ["lago", "rio", "barco", "lancha", "cruzeiro", "náutico", "nautico", "ferry"], icon: Waves, label: "Passeio náutico", sub: "Beleza das águas" },
  { keys: ["shows", "festival", "evento", "natal luz", "natal de luz", "carnatal", "reveillon", "carnaval"], icon: Star, label: "Eventos", sub: "Experiências únicas" },
];

function getHighlights(trip: Trip): HL[] {
  const text = (trip.description || "").toLowerCase();
  if (!text.trim()) return [];

  // Match whole words only to avoid "mar" inside "marcante", etc.
  const hasWord = (k: string) => new RegExp(`(?<![a-záàãâéêíóôõúüç])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-záàãâéêíóôõúüç])`).test(text);

  const seen = new Set<string>();
  const result: HL[] = [];

  for (const rule of DESC_RULES) {
    if (result.length >= 4) break;
    if (rule.keys.some(k => k.includes(" ") ? text.includes(k) : hasWord(k)) && !seen.has(rule.label)) {
      seen.add(rule.label);
      result.push({ icon: rule.icon, label: rule.label, sub: rule.sub });
    }
  }
  return result;
}

/* ═══════════════════════════════════════════
   1. Gallery Modal (full-screen)
═══════════════════════════════════════════ */
function GalleryModal({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx(i => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % images.length);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <span className="text-white/60 text-sm font-medium">{idx + 1} / {images.length}</span>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center relative px-14 min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[idx]} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        {images.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors">
              <ChevronLeft size={22} />
            </button>
            <button onClick={() => setIdx(i => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors">
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0">
          {images.map((img, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${i === idx ? "border-gold-400" : "border-white/20 opacity-60 hover:opacity-100"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   2. Photo Grid (Airbnb-style)
═══════════════════════════════════════════ */
function PhotoGrid({ images, onOpen }: { images: string[]; onOpen: (idx: number) => void }) {
  if (images.length === 0) return <div className="w-full h-72 sm:h-[480px] bg-navy-800 rounded-2xl" />;

  return (
    <div className="relative">
      {/* Mobile: single large image */}
      <div className="sm:hidden relative h-72 rounded-2xl overflow-hidden cursor-pointer" onClick={() => onOpen(0)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(0); }}
            className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-navy-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow"
          >
            <Camera size={12} /> Ver {images.length} fotos
          </button>
        )}
      </div>

      {/* Desktop: 1 large + up to 4 small grid */}
      <div className="hidden sm:grid grid-cols-4 grid-rows-2 gap-2 h-[480px] rounded-2xl overflow-hidden">
        {/* Large left */}
        <div className="col-span-2 row-span-2 relative cursor-pointer overflow-hidden" onClick={() => onOpen(0)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
        </div>
        {/* 4 small right — fill with placeholders if < 5 images */}
        {[1, 2, 3, 4].map((pos) => {
          const img = images[pos];
          const isLast = pos === 4 && images.length > 5;
          return img ? (
            <div key={pos} className="relative cursor-pointer overflow-hidden" onClick={() => onOpen(pos)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              {isLast && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">+{images.length - 5}</span>
                </div>
              )}
            </div>
          ) : (
            <div key={pos} className="bg-navy-100" />
          );
        })}
      </div>

      {/* "Ver todas as fotos" overlay button */}
      {images.length > 1 && (
        <button
          onClick={() => onOpen(0)}
          className="hidden sm:flex absolute bottom-3 right-3 items-center gap-2 bg-white text-navy-800 text-sm font-semibold px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200"
        >
          <Camera size={14} /> Ver todas as fotos
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   3. Scarcity Banner
═══════════════════════════════════════════ */
function ScarcityBanner({ spots }: { spots: number }) {
  if (spots <= 0 || spots > 5) return null;
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <AlertTriangle size={18} className="text-orange-500 flex-shrink-0" />
      <p className="text-orange-700 text-sm font-semibold">
        Apenas {spots} {spots === 1 ? "vaga disponível" : "vagas disponíveis"}! Reserve agora para garantir seu lugar.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   4. Trust Block
═══════════════════════════════════════════ */
function TrustBlock({ maxInstallments }: { maxInstallments: number }) {
  const paymentDesc = maxInstallments > 1
    ? `Parcele em até ${maxInstallments}x sem juros com total segurança`
    : "Pagamento seguro e à vista com total tranquilidade";
  const items = [
    { icon: Award, title: "10+ anos de experiência", desc: "Mais de uma década levando viajantes com segurança e qualidade" },
    { icon: Shield, title: "Pagamento seguro", desc: paymentDesc },
    { icon: Headphones, title: "Suporte via WhatsApp", desc: "Nossa equipe responde em minutos, antes e durante a viagem" },
    { icon: Users, title: "+16.000 viajantes felizes", desc: "Avaliação média de 4.9 estrelas pelos nossos clientes" },
  ];
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="font-display font-black text-lg text-navy-800 mb-5">Por que reservar com a AJS?</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-navy-600" />
            </div>
            <div>
              <p className="font-semibold text-navy-800 text-sm leading-tight">{title}</p>
              <p className="text-gray-400 text-xs leading-relaxed mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   5. Destination Highlights
═══════════════════════════════════════════ */
function DestinationHighlights({ trip }: { trip: Trip }) {
  const highlights = getHighlights(trip);
  if (highlights.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="font-display font-black text-lg text-navy-800 mb-5">Destaques do destino</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {highlights.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex flex-col items-center text-center gap-2 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Icon size={20} className="text-navy-600" />
            </div>
            <p className="font-semibold text-navy-800 text-xs leading-tight">{label}</p>
            <p className="text-gray-400 text-[11px] leading-tight">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   6. Related Trips
═══════════════════════════════════════════ */
function RelatedCard({ trip }: { trip: Trip }) {
  const depDate = new Date(trip.departure_date);
  return (
    <Link href={`/viagens/${trip.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-gold-300 hover:-translate-y-0.5 flex flex-col"
    >
      <div className="relative h-40 overflow-hidden flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.image_url || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80"}
          alt={trip.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
          <MapPin size={9} className="text-gold-400 flex-shrink-0" />
          <span className="text-white text-[10px] font-medium truncate max-w-[120px]">{trip.destination}</span>
        </div>
        {trip.tag && (
          <div className="absolute top-2 left-2">
            <span className="bg-gold-500 text-navy-900 text-[10px] font-bold px-2 py-0.5 rounded-full">{trip.tag}</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h4 className="font-display font-black text-xs text-navy-800 line-clamp-2 mb-2 leading-snug">{trip.title}</h4>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-[10px] text-gray-400">a partir de</p>
            <p className="font-black text-base text-navy-700 leading-tight">R$ {fmtBRL(trip.price_per_person)}</p>
          </div>
          <span className="text-[10px] text-navy-500 font-medium">
            {depDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        </div>
      </div>
    </Link>
  );
}

function RelatedTrips({ currentId, currentTemplateId, category }: { currentId: number; currentTemplateId: number | null; category: string }) {
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    fetch(`${API}/trips/?limit=50`)
      .then(r => r.json())
      .then((data: Trip[]) => {
        if (!Array.isArray(data)) return;
        // Exclude current trip's template, keep only one trip per template (earliest date), prioritize same category
        const seen = new Set<number | null>();
        const related = data
          .filter(t => t.id !== currentId && t.is_active !== false && t.template_id !== currentTemplateId)
          .sort((a, b) => {
            // Same category first, then by departure date
            const catA = a.category === category ? 1 : 0;
            const catB = b.category === category ? 1 : 0;
            if (catB !== catA) return catB - catA;
            return new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime();
          })
          .filter(t => {
            if (seen.has(t.template_id)) return false;
            seen.add(t.template_id);
            return true;
          })
          .slice(0, 4);
        setTrips(related);
      })
      .catch(() => {});
  }, [currentId, currentTemplateId, category]);

  if (!trips.length) return null;

  return (
    <div className="py-8">
      <h2 className="font-display font-black text-2xl text-navy-800 mb-6">Você também pode gostar</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {trips.map(trip => <RelatedCard key={trip.id} trip={trip} />)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   7. Share Button
═══════════════════════════════════════════ */
function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {});
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 text-gray-500 hover:text-navy-700 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
    >
      {copied
        ? <><CheckCheck size={15} className="text-emerald-500" /><span className="text-emerald-600">Link copiado!</span></>
        : <><Share2 size={15} /><span>Compartilhar</span></>
      }
    </button>
  );
}

/* ═══════════════════════════════════════════
   8. Sticky Mobile CTA
═══════════════════════════════════════════ */
function StickyMobileCTA({
  trip, sold, onBook, whatsappFallback,
}: { trip: Trip; sold: boolean; onBook: () => void; whatsappFallback: string }) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-4 shadow-2xl">
      <div className="flex-1 min-w-0">
        {trip.original_price && (
          <p className="text-xs text-gray-400 line-through leading-none">
            R$ {fmtBRL(trip.original_price)}
          </p>
        )}
        <p className="font-display font-black text-xl text-navy-700 leading-tight">
          R$ {fmtBRL(trip.price_per_person)}
        </p>
        <p className="text-[11px] text-emerald-600 font-medium">
          {trip.max_installments}x de R$ {fmtInstallment(trip.price_per_person, trip.max_installments)} s/juros
        </p>
      </div>
      {sold ? (
        <a href={whatsappFallback} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 bg-gray-200 text-gray-600 font-bold px-5 py-3 rounded-xl text-sm">
          Lista de espera
        </a>
      ) : (
        <button onClick={onBook}
          className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold px-5 py-3.5 rounded-xl text-sm transition-all">
          Reservar agora
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   9. Info Stat
═══════════════════════════════════════════ */
function InfoStat({ icon, label, value, valueClass = "text-navy-800" }: {
  icon: React.ReactNode; label: string; value: string; valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-gray-400 text-xs">{icon}{label}</div>
      <p className={`font-bold text-sm ${valueClass}`}>{value}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   10. Booking Modal
═══════════════════════════════════════════ */
function BookingModal({ trip, user, onClose, selectedOptionals: initialOptionals, initialPeople = 1 }: { trip: Trip; user: StoredUser; onClose: () => void; selectedOptionals: { name: string; price: number }[]; initialPeople?: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedOptionals, setSelectedOptionals] = useState<{ name: string; price: number }[]>(initialOptionals);
  const [fullName, setFullName] = useState(user.full_name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [cpf, setCpf] = useState(user.cpf || "");
  const [birthDate, setBirthDate] = useState(user.birth_date || "");
  const [people, setPeople] = useState(initialPeople);
  const [companions, setCompanions] = useState<CompanionForm[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const needed = people - 1;
    setCompanions(prev =>
      prev.length === needed ? prev :
      prev.length < needed
        ? [...prev, ...Array.from({ length: needed - prev.length }, () => ({ full_name: "", cpf: "", birth_date: "" }))]
        : prev.slice(0, needed)
    );
  }, [people]);

  const updateCompanion = (i: number, field: keyof CompanionForm, val: string) =>
    setCompanions(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateCPF(cpf)) { setError("CPF inválido. Verifique os números digitados."); return; }
    if (!birthDate) { setError("Informe sua data de nascimento."); return; }
    if (!phone || phone.replace(/\D/g, "").length < 10) { setError("Informe um telefone válido com DDD."); return; }
    for (const [i, c] of companions.entries()) {
      if (c.full_name.trim().length < 3) { setError(`Nome do acompanhante ${i + 1} inválido.`); return; }
      if (!validateCPF(c.cpf)) { setError(`CPF do acompanhante ${i + 1} inválido.`); return; }
      if (!c.birth_date) { setError(`Data de nascimento do acompanhante ${i + 1} obrigatória.`); return; }
    }
    setLoading(true);
    try {
      const token = getToken();
      await fetch(`${API}/auth/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName, phone, cpf, birth_date: birthDate }),
      });
      const bookingRes = await fetch(`${API}/bookings/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ trip_id: trip.id, num_travelers: people, companions: companions.map(c => ({ full_name: c.full_name, cpf: c.cpf, birth_date: c.birth_date })), notes: note || undefined, selected_optionals: selectedOptionals }),
      });
      if (!bookingRes.ok) {
        const err = await bookingRes.json();
        setError(Array.isArray(err.detail) ? err.detail.map((d: {msg?: string}) => d.msg ?? String(d)).join(", ") : (err.detail || "Erro ao criar reserva."));
        return;
      }
      const booking = await bookingRes.json();
      localStorage.setItem("ajs_user", JSON.stringify({ ...user, full_name: fullName, phone, cpf, birth_date: birthDate }));
      const msg = buildWhatsAppMessage(trip, { ...user, full_name: fullName }, phone, cpf, birthDate, people, companions, note, booking.booking_code, selectedOptionals);
      const waUrl = `https://wa.me/5541998348766?text=${encodeURIComponent(msg)}`;
      onClose();
      // Redireciona para o WhatsApp direto na mesma aba — evita bloqueio de popup após async
      window.location.href = waUrl;
    } catch { setError("Erro de conexão. Tente novamente."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-black text-navy-800 text-lg">Reservar viagem</h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
              <X size={18} />
            </button>
          </div>
          {/* Selected date highlight */}
          <div className="bg-navy-50 border border-navy-200 rounded-xl px-4 py-3">
            <p className="text-[10px] text-navy-500 font-semibold uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
              <Calendar size={11} className="text-navy-500" /> Data selecionada
            </p>
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <p className="text-sm font-bold text-navy-800 leading-snug">
                {new Date(trip.departure_date.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                {" → "}
                {new Date(trip.return_date.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
              <span className="font-black text-navy-700 text-base flex-shrink-0">
                R$ {fmtBRL(trip.price_per_person)}
                <span className="text-xs font-normal text-gray-400">/pessoa</span>
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Número de pessoas *</label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setPeople(p => Math.max(1, p - 1))}
                className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-bold text-lg">−</button>
              <span className="flex-1 text-center font-bold text-navy-800 text-xl">{people}</span>
              <button type="button" onClick={() => setPeople(p => Math.min(trip.available_spots || 50, p + 1))}
                className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-bold text-lg">+</button>
            </div>
          </div>

          {trip.optionals?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                <span className="text-amber-500">✨</span> Serviços opcionais
                <span className="font-normal text-gray-400">(por pessoa)</span>
              </p>
              <div className="space-y-2">
                {trip.optionals.map((opt, i) => {
                  const isSelected = selectedOptionals.some(o => o.name === opt.name);
                  return (
                    <button key={i} type="button"
                      onClick={() => setSelectedOptionals(prev =>
                        isSelected ? prev.filter(o => o.name !== opt.name) : [...prev, opt]
                      )}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 px-3 py-3 transition-all text-left active:scale-[0.98] ${
                        isSelected ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-amber-300"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "border-amber-500 bg-amber-500" : "border-gray-300"
                      }`}>
                        {isSelected && <Check size={11} className="text-white" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-700 leading-tight">{opt.name}</span>
                        <span className={`inline-flex items-center mt-1 text-xs font-black px-2 py-0.5 rounded-full ${isSelected ? "bg-amber-200 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                          + R$ {fmtBRL(opt.price)}/pessoa
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-navy-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-navy-700 uppercase tracking-wide">Seus dados (titular)</p>
            {[
              { label: "Nome completo *", icon: User, type: "text", placeholder: "Nome completo", value: fullName, onChange: (v: string) => setFullName(v), fmt: (v: string) => v },
              { label: "Telefone / WhatsApp *", icon: Phone, type: "tel", placeholder: "(41) 99999-9999", value: phone, onChange: (v: string) => setPhone(formatPhone(v)), fmt: (v: string) => v },
              { label: "CPF *", icon: CreditCard, type: "text", placeholder: "000.000.000-00", value: cpf, onChange: (v: string) => setCpf(formatCPF(v)), fmt: (v: string) => v },
              { label: "Data de nascimento *", icon: Cake, type: "date", placeholder: "", value: birthDate, onChange: (v: string) => setBirthDate(v), fmt: (v: string) => v },
            ].map(({ label, icon: Icon, type, placeholder, value, onChange }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                <div className="relative">
                  <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={type} required placeholder={placeholder} value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
                </div>
              </div>
            ))}
          </div>

          {companions.map((c, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-navy-700 uppercase tracking-wide flex items-center gap-2">
                <Users size={13} /> Acompanhante {i + 1}
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome completo *</label>
                <input type="text" required placeholder="Nome completo" value={c.full_name}
                  onChange={e => updateCompanion(i, "full_name", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">CPF *</label>
                  <input type="text" required placeholder="000.000.000-00" value={c.cpf}
                    onChange={e => updateCompanion(i, "cpf", formatCPF(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nascimento *</label>
                  <input type="date" required value={c.birth_date}
                    onChange={e => updateCompanion(i, "birth_date", e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
                </div>
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Observação <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea rows={2} placeholder="Ex: preciso de quarto duplo, tenho crianças..." value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none" />
          </div>

          <div className="bg-navy-50 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-navy-600 font-medium">{people} × R$ {fmtBRL(trip.price_per_person)}</span>
              <span className="font-bold text-navy-700 text-sm">R$ {fmtBRL(people * trip.price_per_person)}</span>
            </div>
            {selectedOptionals.map((opt) => (
              <div key={opt.name} className="flex items-center justify-between text-amber-700">
                <span className="text-xs font-medium">{people} × {opt.name}</span>
                <span className="text-xs font-bold">+ R$ {fmtBRL(opt.price * people)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1 border-t border-navy-200">
              <span className="text-sm text-navy-700 font-semibold">Total</span>
              <span className="font-black text-navy-800 text-lg">R$ {fmtBRL(people * trip.price_per_person + selectedOptionals.reduce((s, o) => s + o.price * people, 0))}</span>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-base disabled:opacity-60">
            {loading ? "Salvando..." : "Manifestar interesse pelo WhatsApp"}
          </button>
          <p className="text-center text-xs text-gray-400">
            Seus dados são salvos e abriremos o WhatsApp com tudo preenchido. Nossa equipe confirmará a reserva.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   11. Date Selector
═══════════════════════════════════════════ */
function fmtDate(d: string) {
  // Always show full date as dd/MM/yyyy — compact and unambiguous
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

/* ═══════════════════════════════════════════
   Description Block (collapsible on mobile)
═══════════════════════════════════════════ */
const DESC_THRESHOLD = 220; // chars — abaixo disso não precisa de "ver mais"

function DescriptionBlock({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > DESC_THRESHOLD;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm">
      <h2 className="font-display font-black text-xl text-navy-800 mb-3">Sobre o pacote</h2>
      <p className={`text-gray-600 leading-relaxed whitespace-pre-line ${
        isLong && !expanded ? "line-clamp-4 sm:line-clamp-none" : ""
      }`}>
        {description}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="sm:hidden mt-2 flex items-center gap-1 text-navy-600 text-sm font-semibold"
        >
          {expanded ? <><ChevronUp size={15} /> Ver menos</> : <><ChevronDown size={15} /> Ver mais</>}
        </button>
      )}
    </div>
  );
}

const DATE_INITIAL = 4;

function DateSelector({
  trips, selected, onSelect, hasError, sidebar = false, forceExpanded = false,
}: {
  trips: Trip[];
  selected: Trip | null;
  onSelect: (t: Trip) => void;
  hasError: boolean;
  sidebar?: boolean;
  forceExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (trips.length === 0) return null;

  const selectedIdx = selected ? trips.findIndex(t => t.id === selected.id) : -1;
  const needsExpand = !forceExpanded && trips.length > DATE_INITIAL;
  // If selected date is beyond initial view, auto-expand
  const forceExpandSelected = selectedIdx >= DATE_INITIAL;
  const showAll = forceExpanded || expanded || forceExpandSelected;
  const visible = showAll ? trips : trips.slice(0, DATE_INITIAL);
  const hidden = trips.length - DATE_INITIAL;

  return (
    <div id="date-selector" className={`bg-white rounded-2xl shadow-sm overflow-hidden ${hasError ? "ring-2 ring-red-400" : ""}`}>
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-lg text-navy-800">Escolha sua data</h2>
          <p className="text-xs text-gray-400 mt-0.5">{trips.length} {trips.length === 1 ? "data disponível" : "datas disponíveis"}</p>
        </div>
        {hasError && (
          <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
            <AlertTriangle size={13} /> Selecione uma data
          </span>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className={`grid gap-3 ${sidebar ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        {visible.map((t) => {
          const isSold = t.available_spots === 0 || t.status === "sold_out";
          const isLow = !isSold && t.available_spots > 0 && t.available_spots <= 5;
          const isSelected = selected?.id === t.id;
          const disc = t.original_price
            ? Math.round((1 - t.price_per_person / t.original_price) * 100)
            : null;

          return (
            <button
              key={t.id}
              disabled={isSold}
              onClick={() => !isSold && onSelect(t)}
              className={`relative text-left rounded-xl border-2 p-4 transition-all duration-150 w-full ${
                isSelected
                  ? "border-navy-700 bg-navy-50 shadow-md"
                  : isSold
                  ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                  : "border-gray-200 hover:border-navy-300 hover:bg-gray-50 cursor-pointer"
              }`}
            >
              {/* Top-right: check when selected, discount when not selected */}
              <span className="absolute top-3 right-3">
                {isSelected ? (
                  <span className="w-5 h-5 bg-navy-700 rounded-full flex items-center justify-center">
                    <Check size={11} className="text-white" />
                  </span>
                ) : disc && disc > 0 && !isSold ? (
                  <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    -{disc}%
                  </span>
                ) : null}
              </span>

              {/* Date range */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-2 min-w-0 pr-6">
                <Calendar size={13} className={`flex-shrink-0 ${isSelected ? "text-navy-600" : "text-gold-500"}`} />
                <span className={`text-sm font-bold whitespace-nowrap ${isSelected ? "text-navy-800" : "text-navy-700"}`}>
                  {fmtDate(t.departure_date)}
                </span>
                <span className="text-gray-400 text-xs flex-shrink-0">→</span>
                <span className={`text-sm font-bold whitespace-nowrap ${isSelected ? "text-navy-800" : "text-navy-700"}`}>
                  {fmtDate(t.return_date)}
                </span>
              </div>

              {/* Price row */}
              <div className="flex items-end justify-between">
                <div>
                  {t.original_price && (
                    <p className="text-[10px] text-gray-400 line-through leading-none">
                      R$ {fmtBRL(t.original_price)}
                    </p>
                  )}
                  {isSold ? (
                    <span className="text-sm font-bold text-gray-400">Esgotado</span>
                  ) : (
                    <span className={`text-base font-black ${isSelected ? "text-navy-700" : "text-navy-600"}`}>
                      R$ {fmtBRL(t.price_per_person)}
                      <span className="text-xs font-normal text-gray-400"> /pessoa</span>
                    </span>
                  )}
                </div>

                {/* Spots */}
                {!isSold && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isLow
                      ? "bg-orange-100 text-orange-600"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {isLow ? `⚠ ${t.available_spots} vagas` : `${t.available_spots} vagas`}
                  </span>
                )}
              </div>
            </button>
          );
        })}
        </div>

        {needsExpand && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-navy-300 text-navy-600 text-sm font-semibold hover:bg-navy-50 transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp size={15} /> Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown size={15} /> Ver mais {hidden} data{hidden !== 1 ? "s" : ""}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   12. Main Component
═══════════════════════════════════════════ */
export default function TripDetailClient({ trip }: { trip: Trip }) {
  const router = useRouter();

  // Capture ?book= at mount time (before any async/replaceState changes the URL)
  const initialBookId = useRef(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("book")
      : null
  );
  // Tracks if the ?book= redirect was already handled (prevents Strict Mode double-run)
  const bookHandled = useRef(false);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStart, setGalleryStart] = useState(0);
  const [bookingUser, setBookingUser] = useState<StoredUser | null>(null);
  const [navUser, setNavUser] = useState<StoredUser | null>(null);
  const [siblingTrips, setSiblingTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [dateError, setDateError] = useState(false);
  const [selectedOptionals, setSelectedOptionals] = useState<{ name: string; price: number }[]>([]);
  const [sidebarPeople, setSidebarPeople] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const dateRowRef = useRef<HTMLDivElement>(null);

  // Close date picker on scroll or resize
  useEffect(() => {
    if (!showDatePicker) return;
    const close = () => setShowDatePicker(false);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [showDatePicker]);

  const openDatePicker = useCallback(() => {
    if (dateRowRef.current) {
      const r = dateRowRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    setShowDatePicker(true);
  }, []);

  // activeTrip: the trip whose price/availability drives the UI
  const activeTrip = selectedTrip || trip;

  const sold = activeTrip.available_spots === 0 || activeTrip.status === "sold_out";
  const lowStock = !sold && activeTrip.available_spots > 0 && activeTrip.available_spots <= 5;
  const discount = activeTrip.original_price
    ? Math.round((1 - activeTrip.price_per_person / activeTrip.original_price) * 100)
    : null;

  const allImages = [...(trip.image_url ? [trip.image_url] : []), ...(trip.gallery || [])].filter(Boolean);
  const whatsappFallback = `https://wa.me/5541998348766?text=${encodeURIComponent(`Olá! Tenho interesse no pacote *${trip.title}* — ${trip.destination}.`)}`;

  useEffect(() => {
    setNavUser(getStoredUser());
  }, []);

  // Load all dates for same template
  useEffect(() => {
    if (!trip.template_id) return;
    fetch(`${API}/trips/?template_id=${trip.template_id}&limit=50`)
      .then(r => r.json())
      .then((data: Trip[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const sorted = [...data].sort(
          (a, b) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime()
        );
        setSiblingTrips(sorted);
        // Only auto-select if no ?book= param (post-login redirect handles its own selection)
        if (!initialBookId.current) {
          // Always auto-select the nearest available date
          const nearest = sorted.find(t => t.available_spots > 0 && t.status !== "sold_out") || sorted[0];
          if (nearest) setSelectedTrip(nearest);
        }
      })
      .catch(() => {});
  }, [trip.id, trip.template_id]);

  const handleSelectDate = useCallback((t: Trip) => {
    setSelectedTrip(t);
    setDateError(false);
  }, []);

  // Auto-open booking modal after login redirect (?book=tripId)
  useEffect(() => {
    if (siblingTrips.length === 0) return;
    if (bookHandled.current) return; // already processed (Strict Mode double-run guard)
    const bookId = initialBookId.current;
    if (!bookId) return;
    const target = siblingTrips.find(t => t.id === Number(bookId));
    if (!target) return;
    bookHandled.current = true;
    window.history.replaceState({}, "", window.location.pathname);
    setSelectedTrip(target);
    const u = getStoredUser();
    if (u) setBookingUser(u);
  }, [siblingTrips]);

  const handleOpenBooking = useCallback(() => {
    if (!selectedTrip) {
      setDateError(true);
      document.getElementById("date-selector")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const u = getStoredUser();
    if (!u) {
      const returnUrl = `${window.location.pathname}?book=${selectedTrip.id}`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
    } else {
      setBookingUser(u);
    }
  }, [router, selectedTrip]);

  const openGallery = useCallback((idx: number) => {
    setGalleryStart(idx);
    setGalleryOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-clip">

      {/* ── Desktop Header — fixed, always visible ── */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-100 shadow-sm items-center px-6">
        {/* Left: Logo + Back */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon_ajs.png" alt="AJS Turismo" className="w-9 h-9 object-contain" />
            <div className="flex flex-col leading-tight">
              <span className="font-display font-black text-navy-900 text-base tracking-tight">AJS</span>
              <span className="text-gold-500 text-[10px] font-semibold tracking-[0.2em] uppercase leading-none">Turismo</span>
            </div>
          </Link>
          <div className="w-px h-5 bg-gray-200 mx-0.5 flex-shrink-0" />
          <button
            onClick={() => router.push("/viagens")}
            className="flex items-center gap-1.5 text-gray-500 hover:text-navy-700 text-sm font-medium transition-colors whitespace-nowrap"
          >
            <ArrowLeft size={15} /> Voltar para viagens
          </button>
        </div>

        {/* Right: user/login */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {navUser ? (
            <Link href={navUser.is_admin ? "/admin" : "/dashboard"}
              className="flex items-center gap-2 text-gray-700 hover:text-navy-800 transition-colors text-sm font-medium">
              <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-black text-sm">
                {navUser.full_name?.[0]?.toUpperCase()}
              </div>
              <span className="hidden xl:block max-w-[120px] truncate">{navUser.full_name?.split(" ")[0]}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-gray-600 hover:text-navy-800 text-sm font-medium transition-colors px-3 py-1.5">
                Entrar
              </Link>
              <Link href="/cadastro" className="btn-primary py-1.5 px-4 text-sm">
                Criar conta
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Gallery Modal */}
      {galleryOpen && allImages.length > 0 && (
        <GalleryModal images={allImages} startIndex={galleryStart} onClose={() => setGalleryOpen(false)} />
      )}

      {/* Booking Modal */}
      {bookingUser && selectedTrip && (
        <BookingModal trip={selectedTrip} user={bookingUser} onClose={() => setBookingUser(null)} selectedOptionals={selectedOptionals} initialPeople={sidebarPeople} />
      )}

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA trip={activeTrip} sold={sold} onBook={handleOpenBooking} whatsappFallback={whatsappFallback} />

      <div className="flex-1 pt-0 lg:pt-16 pb-24 lg:pb-0">
        {/* ── Mobile top bar: back + share only ── */}
        <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push("/viagens")}
              className="flex items-center gap-1.5 text-gray-600 hover:text-navy-700 text-sm font-medium transition-colors">
              <ArrowLeft size={16} /> Voltar
            </button>
            <ShareButton title={trip.title} />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-6 pb-8 w-full">
          {/* Title + badges (mobile) */}
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {trip.tag && (
                <span className="inline-flex items-center gap-1 bg-gold-500 text-navy-900 text-xs font-bold px-3 py-1 rounded-full">
                  <Star size={9} fill="currentColor" /> {trip.tag}
                </span>
              )}
              {sold && <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">Esgotado</span>}
              {lowStock && !sold && <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">Últimas vagas!</span>}
              {discount && discount > 0 && <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">-{discount}% OFF</span>}
            </div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-navy-900 leading-tight">{trip.title}</h1>
              <div className="hidden lg:block flex-shrink-0 mt-1"><ShareButton title={trip.title} /></div>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1.5">
              <MapPin size={14} className="text-gold-500" /> {trip.destination}
            </div>
          </div>

          {/* Photo Grid */}
          <div className="mb-6">
            <PhotoGrid images={allImages} onOpen={openGallery} />
          </div>

          {/* Date Selector — mobile: before key info; desktop: in right sidebar */}
          {siblingTrips.length > 0 && (
            <div className="mb-6 lg:hidden">
              <DateSelector
                trips={siblingTrips}
                selected={selectedTrip}
                onSelect={handleSelectDate}
                hasError={dateError}
              />
            </div>
          )}

          {/* Scarcity Banner */}
          {lowStock && !sold && (
            <div className="mb-6">
              <ScarcityBanner spots={trip.available_spots} />
            </div>
          )}

          {/* Main 2-col grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Left column ── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Key info — uses activeTrip so it updates with date selection */}
              <div className="bg-white rounded-2xl p-5 grid grid-cols-2 gap-4 shadow-sm">
                <InfoStat icon={<Calendar size={16} className="text-gold-500" />} label="Saída"
                  value={selectedTrip
                    ? new Date(activeTrip.departure_date.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"} />
                <InfoStat icon={<Calendar size={16} className="text-gold-500" />} label="Retorno"
                  value={selectedTrip
                    ? new Date(activeTrip.return_date.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"} />
                <InfoStat icon={<Clock size={16} className="text-gold-500" />} label="Duração"
                  value={(() => {
                    const nights = activeTrip.duration_nights;
                    if (nights === 0) return "Bate e volta";
                    const days = calcDays(nights, activeTrip.departure_date);
                    if (nights === 1) return `${days} dia / ${nights} noite`;
                    return `${days} dias / ${nights} noites`;
                  })()} />
                <InfoStat
                  icon={<Users size={16} className="text-gold-500" />}
                  label="Vagas"
                  value={sold ? "Esgotado" : `${activeTrip.available_spots} disponíveis`}
                  valueClass={sold ? "text-red-500" : lowStock ? "text-orange-600" : "text-emerald-600"}
                />
              </div>

              {/* Description */}
              {trip.description && <DescriptionBlock description={trip.description} />}

              {/* Destination Highlights — hidden on mobile */}
              <div className="hidden sm:block">
                <DestinationHighlights trip={trip} />
              </div>

              {/* Includes / Excludes */}
              {(trip.includes?.length > 0 || trip.excludes?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trip.includes?.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <h3 className="font-display font-bold text-navy-800 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                          <Check size={13} className="text-emerald-600" />
                        </span>
                        O que inclui
                      </h3>
                      <ul className="space-y-2.5">
                        {trip.includes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
                            <Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {trip.excludes?.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <h3 className="font-display font-bold text-navy-800 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                          <X size={13} className="text-red-500" />
                        </span>
                        Não inclui
                      </h3>
                      <ul className="space-y-2.5">
                        {trip.excludes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-500 text-sm">
                            <X size={14} className="text-red-400 flex-shrink-0 mt-0.5" />{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Opcionais */}
              {trip.optionals?.length > 0 && (
                <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
                  <h3 className="font-display font-bold text-navy-800 mb-1 flex items-center gap-2 text-base">
                    <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">✨</span>
                    Serviços Opcionais
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">Selecione os extras que deseja. O valor é por pessoa.</p>
                  <div className="space-y-2">
                    {trip.optionals.map((opt, i) => {
                      const isSelected = selectedOptionals.some(o => o.name === opt.name);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedOptionals(prev =>
                            isSelected ? prev.filter(o => o.name !== opt.name) : [...prev, opt]
                          )}
                          className={`w-full flex items-center gap-3 rounded-xl border-2 px-3 sm:px-4 py-3.5 transition-all text-left active:scale-[0.99] ${
                            isSelected ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected ? "border-amber-500 bg-amber-500" : "border-gray-300"
                          }`}>
                            {isSelected && <Check size={11} className="text-white" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-gray-700 leading-tight">{opt.name}</span>
                            <span className={`inline-flex items-center mt-1 text-xs font-black px-2 py-0.5 rounded-full ${isSelected ? "bg-amber-200 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                              + R$ {fmtBRL(opt.price)}/pessoa
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedOptionals.length > 0 && (
                    <div className="mt-3 flex items-center justify-between bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-200">
                      <span className="text-xs text-amber-700 font-semibold">{selectedOptionals.length} {selectedOptionals.length > 1 ? "opcionais" : "opcional"} selecionado{selectedOptionals.length > 1 ? "s" : ""}</span>
                      <span className="text-sm font-black text-amber-700">
                        + R$ {fmtBRL(selectedOptionals.reduce((s, o) => s + o.price, 0))}/pessoa
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Itinerary */}
              {trip.itinerary?.length > 0 && (() => {
                const isSameDay = trip.departure_date && trip.return_date &&
                  trip.departure_date.slice(0, 10) === trip.return_date.slice(0, 10);

                const renderDescription = (text: string) => {
                  if (!text) return null;
                  const lines = text.split("\n").filter((l) => l.trim());
                  const timeLineRegex = /^(\d{1,2}:\d{2})\s*-\s*(.*)/;
                  return (
                    <div className="space-y-1.5 mt-2">
                      {lines.map((line, i) => {
                        const match = line.match(timeLineRegex);
                        if (match) {
                          const [, time, rest] = match;
                          return (
                            <div key={i} className="flex gap-2.5 items-baseline">
                              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gold-400 mt-2" />
                              <p className="text-gray-700 text-sm leading-relaxed">
                                <span className="font-bold text-gold-600 mr-1.5">{time}</span>
                                {rest}
                              </p>
                            </div>
                          );
                        }
                        return (
                          <p key={i} className="text-gray-500 text-sm leading-relaxed pl-4 italic">{line}</p>
                        );
                      })}
                    </div>
                  );
                };

                return (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="font-display font-black text-xl text-navy-800 mb-6">
                      {isSameDay ? "Programação do Dia" : "Roteiro dia a dia"}
                    </h2>
                    <div className="relative">
                      <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100" />
                      <div className="space-y-0">
                        {trip.itinerary.map((item, idx) => (
                          <div key={idx} className="flex gap-4 relative pb-6 last:pb-0">
                            <div className="flex-shrink-0 z-10 w-10 h-10 rounded-full bg-navy-700 text-white flex items-center justify-center font-bold text-sm">
                              {item.day ?? idx + 1}
                            </div>
                            <div className="flex-1 pt-2">
                              <h4 className="font-bold text-navy-800">{item.title}</h4>
                              {item.description && renderDescription(item.description)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-5">
                      * Os horários são previstos e podem variar conforme trânsito e imprevistos.
                    </p>
                  </div>
                );
              })()}

              {/* Embarque */}
              {selectedTrip && (
                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                  <h2 className="font-display font-black text-lg text-navy-800 flex items-center gap-2">
                    <Clock size={18} className="text-gold-500" /> Horários de Embarque
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-navy-50 rounded-xl px-4 py-3">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Saída</p>
                      <p className="font-black text-2xl text-navy-800 leading-none">{fmtTimeSP(activeTrip.departure_date)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activeTrip.departure_date.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    <div className="bg-navy-50 rounded-xl px-4 py-3">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Retorno</p>
                      <p className="font-black text-2xl text-navy-800 leading-none">{fmtTimeSP(activeTrip.return_date)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activeTrip.return_date.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
                    <p className="text-amber-800 text-sm font-medium">
                      Chegue ao ponto de embarque com <strong>10 minutos de antecedência</strong> do horário marcado.
                    </p>
                  </div>
                </div>
              )}

              {/* Trust Block — hidden on mobile */}
              <div className="hidden sm:block">
                <TrustBlock maxInstallments={activeTrip.max_installments} />
              </div>

              {/* Related Trips */}
              <RelatedTrips currentId={trip.id} currentTemplateId={trip.template_id} category={trip.category} />
            </div>

            {/* ── Right sidebar (desktop only) ── */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-20 space-y-3">

                {/* Main booking card */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">

                  {/* Price header */}
                  <div className="p-5 pb-4">
                    <p className="text-xs text-gray-400 mb-0.5">{selectedTrip ? "Preço por pessoa" : "A partir de"}</p>
                    <div className="flex items-end gap-2 mb-0.5">
                      {activeTrip.original_price && (
                        <span className="text-sm text-gray-400 line-through leading-none mb-0.5">R$ {fmtBRL(activeTrip.original_price)}</span>
                      )}
                      <span className="font-display font-black text-4xl text-navy-700 leading-tight">
                        R$ {fmtBRL(activeTrip.price_per_person)}
                      </span>
                    </div>
                    {activeTrip.max_installments > 1 && (
                      <p className="text-xs text-emerald-600 font-semibold">
                        {activeTrip.max_installments}x de R$ {fmtInstallment(activeTrip.price_per_person, activeTrip.max_installments)} sem juros
                      </p>
                    )}
                    {activeTrip.original_price && discount && discount > 0 && (
                      <div className="mt-2 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg text-center border border-emerald-100">
                        Economia de R$ {fmtBRL(activeTrip.original_price - activeTrip.price_per_person)} por pessoa
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 divide-y divide-gray-100">

                    {/* Selected date row — dropdown trigger */}
                    <div ref={dateRowRef}>
                      <button
                        type="button"
                        onClick={() => showDatePicker ? setShowDatePicker(false) : openDatePicker()}
                        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                      >
                        <div>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Data</p>
                          {selectedTrip ? (
                            <p className="text-sm font-bold text-navy-800">
                              {new Date(selectedTrip.departure_date.slice(0,10)+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}
                              {" → "}
                              {new Date(selectedTrip.return_date.slice(0,10)+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}
                            </p>
                          ) : (
                            <p className="text-sm font-bold text-gray-400">Selecione uma data</p>
                          )}
                        </div>
                        {siblingTrips.length > 1 && (
                          <span className="text-xs text-navy-600 font-semibold flex items-center gap-1 flex-shrink-0">
                            {showDatePicker
                              ? <><ChevronUp size={14}/> Fechar</>
                              : <><ChevronDown size={14}/> Trocar</>}
                          </span>
                        )}
                      </button>

                      {/* Fixed-position dropdown — not clipped by overflow:hidden */}
                      {showDatePicker && siblingTrips.length > 1 && dropdownPos && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                          <div
                            className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-y-auto date-scroll"
                            style={{
                              top: dropdownPos.top,
                              left: dropdownPos.left,
                              width: dropdownPos.width,
                              maxHeight: `calc(100vh - ${dropdownPos.top}px - 24px)`,
                            }}
                          >
                            <DateSelector
                              trips={siblingTrips}
                              selected={selectedTrip}
                              onSelect={(t) => { handleSelectDate(t); setShowDatePicker(false); }}
                              hasError={dateError}
                              sidebar
                              forceExpanded
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* People selector row */}
                    <div className="px-5 py-3.5">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Pessoas</p>
                      <div className="flex items-center gap-3">
                        <button type="button"
                          onClick={() => setSidebarPeople(p => Math.max(1, p - 1))}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-base transition-colors">−</button>
                        <span className="flex-1 text-center font-bold text-navy-800 text-base">{sidebarPeople} pessoa{sidebarPeople > 1 ? "s" : ""}</span>
                        <button type="button"
                          onClick={() => setSidebarPeople(p => Math.min(activeTrip.available_spots || 50, p + 1))}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-base transition-colors">+</button>
                      </div>
                    </div>
                  </div>

                  {/* Total + CTA */}
                  <div className="p-5 pt-4">
                    {sidebarPeople > 1 && (
                      <div className="flex items-center justify-between mb-3 text-sm">
                        <span className="text-gray-500">{sidebarPeople} × R$ {fmtBRL(activeTrip.price_per_person)}</span>
                        <span className="font-black text-navy-700">R$ {fmtBRL(sidebarPeople * activeTrip.price_per_person)}</span>
                      </div>
                    )}

                    {lowStock && !sold && (
                      <div className="bg-orange-50 text-orange-700 text-xs font-semibold px-3 py-2 rounded-xl text-center mb-3 border border-orange-100 flex items-center justify-center gap-2">
                        <AlertTriangle size={13} /> Apenas {activeTrip.available_spots} vagas restantes
                      </div>
                    )}

                    {sold ? (
                      <div className="space-y-2">
                        <div className="bg-gray-100 text-gray-500 font-bold py-3.5 rounded-xl text-center">Pacote esgotado</div>
                        <a href={whatsappFallback} target="_blank" rel="noopener noreferrer"
                          className="block text-center text-sm text-emerald-600 hover:text-emerald-700 font-semibold py-2 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-colors">
                          Entrar na lista de espera →
                        </a>
                      </div>
                    ) : (
                      <button onClick={handleOpenBooking}
                        className={`w-full font-bold py-4 rounded-xl text-center transition-all text-lg ${
                          selectedTrip
                            ? "bg-emerald-500 hover:bg-emerald-400 text-white hover:shadow-lg hover:shadow-emerald-500/20"
                            : "bg-gray-200 text-gray-500 cursor-pointer"
                        }`}>
                        {selectedTrip ? "Reservar agora" : "Selecione uma data"}
                      </button>
                    )}

                    <p className="text-xs text-gray-400 text-center mt-2">
                      Mín. {trip.min_group_size} {trip.min_group_size === 1 ? "pessoa" : "pessoas"}
                    </p>
                  </div>
                </div>

                {/* WhatsApp help card */}
                <div className="bg-navy-800 rounded-2xl p-5 text-white">
                  <p className="font-bold text-sm mb-1">Precisa de ajuda?</p>
                  <p className="text-navy-300 text-xs mb-3 leading-relaxed">
                    Nossa equipe responde em minutos pelo WhatsApp
                  </p>
                  <a href="https://wa.me/5541998348766?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20uma%20viagem."
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Falar agora
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA banner */}
      <div className="bg-navy-800 text-white py-12 px-4 mb-16 lg:mb-0">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-lg font-bold mb-2">Pronto para embarcar?</p>
          <p className="text-navy-300 text-sm mb-6">Fale com nossa equipe agora e garanta sua vaga</p>
          {sold ? (
            <a href={whatsappFallback} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl transition-colors text-lg hover:scale-105 hover:shadow-xl shadow-emerald-500/20">
              Entrar na lista de espera
            </a>
          ) : (
            <button onClick={handleOpenBooking}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl transition-all text-lg hover:scale-105 hover:shadow-xl shadow-emerald-500/20">
              Quero reservar agora
            </button>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
