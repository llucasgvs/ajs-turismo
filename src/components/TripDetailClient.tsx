"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Clock, Calendar, Users, Check, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  ArrowLeft, AlertTriangle,
  Shield, Headphones, Award, Camera, Sun, Mountain, Waves,
  TreePine, Globe, Plane, Utensils, Star,
} from "lucide-react";
import type { Trip } from "@/types/trip";
import Footer from "@/components/Footer";
import { fmtBRL, fmtInstallment, isUnlimitedSpots, salesClosed, temVaga, poucasVagas, marcadoBateVolta } from "@/lib/format";
import { useLoading } from "@/components/LoadingProvider";
import { tierLabel, tierOccupiesSeat, tierPriceLabel } from "@/lib/tiers";
import { trackViewItem } from "@/lib/analytics";
import { imgOtim } from "@/lib/imagem";
import { GalleryModal, PhotoGrid, ShareButton } from "@/components/viagem/Galeria";
import {
  COMPACT_THRESHOLD, CompactDateSelector, DataEscolhida, DateSelector, } from "@/components/viagem/Datas";
import { TopoDaPagina } from "@/components/viagem/Topo";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Dia da saída (YYYY-MM-DD) no fuso de Brasília. Fatiar o ISO cru usaria a data
// em UTC, que vira o dia seguinte em saídas de fim de noite (23:45 BRT = 02:45 UTC).
const spDay = (iso: string) => new Date(iso).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });

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

/* ─── helpers ─── */
function getStoredUser(): StoredUser | null {
  try { return JSON.parse(localStorage.getItem("ajs_user") || "null"); } catch { return null; }
}

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




/* ─── destination highlights - derived from trip.includes ─── */
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
/* ═══════════════════════════════════════════
   3. Scarcity Banner
═══════════════════════════════════════════ */
/**
 * Aviso de poucas vagas.
 *
 * Duas correções sobre a versão anterior, e as duas nasceram de um caso real:
 * uma data do Foz ficou com 1 vaga e o texto dizia "Apenas 1 vaga disponível!",
 * como se o ROTEIRO inteiro estivesse acabando.
 *
 * 1. Diz a data. A escassez é daquela saída, não do destino.
 * 2. Quando existe outra data com lugar, oferece a saída em vez de deixar o
 *    visitante numa parede. Sem isso, quem não cabe naquele dia vai embora
 *    achando que não há mais viagem, e a agência perde uma venda que existia.
 */
function ScarcityBanner({ spots, dataSaida, outrasDatas, sabeDasDatas }: {
  /** `null` quando a API não publicou o número por haver vaga de sobra. Aí não
   *  há escassez para anunciar, e o aviso simplesmente não aparece. */
  spots: number | null;
  dataSaida?: string | null;
  outrasDatas: number;
  /** As outras datas chegam por uma busca posterior. Antes dela, não sabemos se
   *  existem, e "Reserve agora para garantir seu lugar" seria uma afirmação sem
   *  base: pode haver dez datas vazias. Enquanto não sabe, o aviso não conclui. */
  sabeDasDatas: boolean;
}) {
  if (!poucasVagas(spots)) return null;

  const dia = dataSaida
    ? new Date(dataSaida).toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit",
      })
    : null;

  const quanto = spots === 1
    ? (dia ? `Última vaga para ${dia}` : "Última vaga nesta data")
    : (dia ? `Restam ${spots} vagas para ${dia}` : `Restam ${spots} vagas nesta data`);

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-3">
      <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-orange-700 text-sm font-semibold">
          {quanto}
          {sabeDasDatas && outrasDatas === 0 && "! Reserve agora para garantir seu lugar."}
        </p>
        {sabeDasDatas && outrasDatas > 0 && (
          <p className="text-orange-600/90 text-xs mt-0.5">
            {outrasDatas === 1 ? "Há outra data com lugares" : `Há outras ${outrasDatas} datas com lugares`}
          </p>
        )}
      </div>
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
    { icon: Users, title: "+19.000 viajantes felizes", desc: "Avaliação média de 4.9 estrelas pelos nossos clientes" },
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
    <Link href={`/viagens/${trip.slug ?? trip.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 border border-gray-100 hover:border-gold-300 hover:-translate-y-0.5 flex flex-col"
    >
      <div className="relative h-40 overflow-hidden flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" decoding="async"
          src={trip.image_url ? imgOtim(trip.image_url, 828, 85) : "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80"}
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
            {depDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" })}
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

/* Outras vertentes do mesmo destino (família principal + variações via parent_id) */
type PubTemplate = { id: number; first_trip_id: number; slug?: string | null; title: string; image_url: string | null; parent_id?: number | null; price_from: number };
function DestinationOptions({ templateId, parentId }: { templateId: number | null; parentId?: number | null }) {
  const [items, setItems] = useState<PubTemplate[]>([]);
  // raiz da família: se este é variação, o principal; senão, ele mesmo.
  const root = parentId || templateId;
  useEffect(() => {
    if (!root) return;
    fetch(`${API}/templates/public`).then(r => r.ok ? r.json() : []).then((list: PubTemplate[]) => {
      setItems((list || []).filter(t => t.id !== templateId && (t.id === root || t.parent_id === root)));
    }).catch(() => {});
  }, [root, templateId]);
  if (!root || !items.length) return null;
  return (
    <div className="py-8">
      <h2 className="font-display font-black text-2xl text-navy-800 mb-6">Outras opções deste destino</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map(t => (
          <Link key={t.id} href={`/viagens/${t.slug ?? t.first_trip_id}`} className="group block rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="relative h-32 bg-navy-100 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {t.image_url && <img src={imgOtim(t.image_url, 640, 85)} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
            </div>
            <div className="p-3">
              <p className="font-bold text-navy-800 text-sm leading-tight line-clamp-2">{t.title}</p>
              <p className="text-xs text-gray-400 mt-1">a partir de <span className="font-bold text-navy-700">R$ {fmtBRL(t.price_from)}</span></p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   7. Share Button
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   8. Sticky Mobile CTA
═══════════════════════════════════════════ */
function StickyMobileCTA({
  trip, sold, onBook, whatsappFallback, isQuote = false, onQuote, semDatas = false, waDatas = "",
}: { trip: Trip; sold: boolean; onBook: () => void; whatsappFallback: string; isQuote?: boolean; onQuote?: () => void; semDatas?: boolean; waDatas?: string }) {
  if (semDatas) {
    return (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-4 shadow-2xl">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-400 leading-none">próximas saídas</p>
          <p className="font-display font-black text-xl text-navy-700 leading-tight">Em breve</p>
        </div>
        <a href={waDatas} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold px-5 py-3.5 rounded-xl text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity]">
          Consultar datas
        </a>
      </div>
    );
  }
  if (isQuote) {
    return (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-4 shadow-2xl">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-400 leading-none">valor</p>
          <p className="font-display font-black text-xl text-navy-700 leading-tight">Sob consulta</p>
        </div>
        <button onClick={onQuote}
          className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold px-5 py-3.5 rounded-xl text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity]">
          Solicitar cotação
        </button>
      </div>
    );
  }
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
          className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold px-5 py-3.5 rounded-xl text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity]">
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

/* ═══════════════════════════════════════════
   11. Date Selector
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   Description Block (collapsible on mobile)
═══════════════════════════════════════════ */
const DESC_THRESHOLD = 220; // chars - abaixo disso não precisa de "ver mais"

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

/* ═══════════════════════════════════════════
   11c. Open Date Calendar (saídas diárias)
═══════════════════════════════════════════ */
const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function OpenDateCalendar({
  trips, selected, onSelect, hasError, minAdvance, maxAdvance,
}: {
  trips: Trip[]; selected: Trip | null; onSelect: (t: Trip) => void;
  hasError: boolean; minAdvance: number; maxAdvance: number;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minDate = new Date(today); minDate.setDate(today.getDate() + minAdvance);
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + maxAdvance);

  const [displayMonth, setDisplayMonth] = useState(() => new Date(minDate));

  // Map: "YYYY-MM-DD" → Trip
  const tripsByDate = useMemo(() => {
    const map: Record<string, Trip> = {};
    trips.forEach(t => { map[spDay(t.departure_date)] = t; });
    return map;
  }, [trips]);

  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun

  const prevMonth = () => setDisplayMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setDisplayMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const canPrev = new Date(year, month - 1 + 1, 0) >= minDate; // last day of prev month >= minDate
  const canNext = new Date(year, month + 1, 1) <= maxDate;

  const monthLabel = displayMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div id="date-selector" className={`bg-white rounded-2xl shadow-sm overflow-hidden ${hasError ? "ring-2 ring-red-400" : ""}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-lg text-navy-800">Escolha sua data</h2>
          {selected ? (
            <p className="text-xs text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <Check size={12} />
              {new Date(selected.departure_date)
                .toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">Saídas todos os dias - escolha o dia que deseja ir</p>
          )}
        </div>
        {hasError && (
          <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
            <AlertTriangle size={13} /> Selecione uma data
          </span>
        )}
      </div>

      {/* Month navigation */}
      <div className="px-5 pb-2 flex items-center justify-between">
        <button type="button" onClick={prevMonth} disabled={!canPrev}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold text-navy-800 capitalize">{monthLabel}</span>
        <button type="button" onClick={nextMonth} disabled={!canNext}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 px-3 mb-1">
        {WEEK_LABELS.map(d => (
          <div key={d} className="text-[10px] font-bold text-gray-400 text-center py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 px-3 pb-5">
        {/* Empty offset cells */}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const d = new Date(year, month, day); d.setHours(0, 0, 0, 0);
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const trip = tripsByDate[key];
          const isPast = d < minDate;
          const isBeyond = d > maxDate;
          const isSold = trip?.available_spots === 0 || trip?.status === "sold_out";
          const isUnavailable = isPast || isBeyond || !trip || isSold;
          const isSelected = selected ? spDay(selected.departure_date) === key : false;
          const isToday = d.getTime() === today.getTime();

          return (
            <button key={day} type="button"
              disabled={isUnavailable}
              onClick={() => trip && !isUnavailable && onSelect(trip)}
              className={`aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] ${
                isSelected
                  ? "bg-navy-700 text-white shadow-md"
                  : isUnavailable
                  ? "text-gray-300 cursor-not-allowed"
                  : isToday
                  ? "border-2 border-navy-300 text-navy-700 hover:bg-navy-50"
                  : "text-navy-800 hover:bg-navy-50 hover:text-navy-700"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Price hint */}
      {trips.length > 0 && (
        <div className="px-5 pb-4 text-center text-xs text-gray-400">
          R$ {fmtBRL(trips[0].price_per_person)} por pessoa · Bate e volta
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   12. Main Component
═══════════════════════════════════════════ */
export default function TripDetailClient({ trip, semDatas = false }: { trip: Trip; semDatas?: boolean }) {
  const router = useRouter();
  const { show: showLoading } = useLoading();

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStart, setGalleryStart] = useState(0);
  const [navUser, setNavUser] = useState<StoredUser | null>(null);
  const [siblingTrips, setSiblingTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [dateError, setDateError] = useState(false);
  const [selectedOptionals, setSelectedOptionals] = useState<{ name: string; price: number }[]>([]);
  const [sidebarPeople, setSidebarPeople] = useState(1);
  // Quantidade por categoria na lateral (quando a data tem faixas de preço)
  const [sidebarTiers, setSidebarTiers] = useState<Record<string, number>>({});
  // O cliente realmente mexeu no seletor? No celular ele nem aparece aqui (a
  // escolha acontece dentro do checkout), então sai sempre o padrão de 1 adulto.
  // Sem esta marca, voltar por esta página rebaixaria uma reserva já preenchida.
  const [selecaoExplicita, setSelecaoExplicita] = useState(false);
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

  // Faixas de preço por idade da data ativa
  const ADULT = "Adulto";
  const activeTiers = activeTrip.price_tiers ?? [];
  const activeHasTiers = activeTiers.length > 0;
  const priceForLabel = (label: string) =>
    label === ADULT ? activeTrip.price_per_person : (activeTiers.find(t => tierLabel(t) === label)?.price ?? activeTrip.price_per_person);
  // Adulto sempre ocupa lugar; faixa sem a marcação também.
  const ocupaPoltrona = (label: string) =>
    label === ADULT ? true : tierOccupiesSeat(activeTiers.find(t => tierLabel(t) === label));
  /** O "de" da categoria. Zero quando não há desconto. Só vitrine. */
  const deForLabel = (label: string) => {
    const de = label === ADULT
      ? (activeTrip.original_price ?? 0)
      : (activeTiers.find(t => tierLabel(t) === label)?.original_price ?? 0);
    return de > priceForLabel(label) ? de : 0;
  };
  /** Poltronas de uma escolha por categoria (criança de colo não conta). */
  const contaPoltronas = (sel: Record<string, number>) =>
    Object.entries(sel).reduce((s, [label, qty]) => s + (ocupaPoltrona(label) ? qty : 0), 0);

  // Reinicia os contadores por categoria quando a data ativa muda
  useEffect(() => {
    if (!activeHasTiers) return;
    const init: Record<string, number> = { [ADULT]: 1 };
    activeTiers.forEach(t => { init[tierLabel(t)] = 0; });
    setSidebarTiers(init);
    setSelecaoExplicita(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip.id]);

  const changeSidebarTier = (label: string, delta: number) => {
    setSelecaoExplicita(true);
    setSidebarTiers(prev => {
      const next = Math.max(0, (prev[label] || 0) + delta);
      const updated = { ...prev, [label]: next };
      // O limite é de poltronas: a criança de colo não consome vaga do ônibus.
      if (delta > 0 && contaPoltronas(updated) > (activeTrip.available_spots || 50)) return prev;
      if (Object.values(updated).reduce((a, b) => a + b, 0) < 1) return prev;
      // Alguém tem que levar as crianças: o Adulto nunca chega a zero.
      if ((updated[ADULT] || 0) < 1) return prev;
      return updated;
    });
  };

  /** Economia total em reais, somando o "de" de TODAS as categorias escolhidas. */
  const sidebarSavings = activeHasTiers
    ? Object.entries(sidebarTiers).reduce((s, [label, qty]) => {
        const de = deForLabel(label);
        return s + (de > 0 ? (de - priceForLabel(label)) * qty : 0);
      }, 0)
    : (activeTrip.original_price && activeTrip.original_price > activeTrip.price_per_person
        ? (activeTrip.original_price - activeTrip.price_per_person) * sidebarPeople
        : 0);

  const sidebarTotalPeople = activeHasTiers
    ? Object.values(sidebarTiers).reduce((a, b) => a + b, 0)
    : sidebarPeople;
  const sidebarBaseTotal = activeHasTiers
    ? Object.entries(sidebarTiers).reduce((s, [label, qty]) => s + qty * priceForLabel(label), 0)
    : sidebarPeople * activeTrip.price_per_person;

  // Sem data aberta não é "esgotado": não há vaga porque não há saída publicada.
  const sold = !semDatas && (activeTrip.available_spots === 0 || activeTrip.status === "sold_out");
  const lowStock = !sold && poucasVagas(activeTrip.available_spots);
  // Outras datas do MESMO roteiro que ainda vendem. É o que transforma o aviso
  // de escassez em caminho, em vez de parede: sem isso o visitante conclui que
  // a viagem acabou, quando na verdade só aquele dia encheu.
  const outrasDatasComVaga = siblingTrips.filter(
    (t) => t.id !== activeTrip.id && temVaga(t.available_spots)
           && t.status !== "sold_out" && !salesClosed(t.departure_date)
  ).length;
  const discount = activeTrip.original_price
    ? Math.round((1 - activeTrip.price_per_person / activeTrip.original_price) * 100)
    : null;

  const allImages = [...(trip.image_url ? [trip.image_url] : []), ...(trip.gallery || [])].filter(Boolean);
  const whatsappFallback = `https://wa.me/5541998348766?text=${encodeURIComponent(`Olá! Tenho interesse no pacote *${trip.title}* - ${trip.destination}.`)}`;

  useEffect(() => {
    setNavUser(getStoredUser());
  }, []);

  // Load all dates for same template
  useEffect(() => {
    if (!trip.template_id || semDatas) return;
    fetch(`${API}/trips/?template_id=${trip.template_id}&limit=500&future_only=true`, { cache: "no-store" })
      .then(r => r.json())
      .then((data: Trip[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const sorted = [...data].sort(
          (a, b) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime()
        );
        setSiblingTrips(sorted);
        // Auto-seleciona a data mais próxima disponível (com vaga e dentro do prazo de vendas)
        const nearest = sorted.find(t => temVaga(t.available_spots) && t.status !== "sold_out" && !salesClosed(t.departure_date)) || sorted[0];
        if (nearest) setSelectedTrip(nearest);
      })
      .catch(() => {});
  }, [trip.id, trip.template_id]);

  // Etapa 1 do funil (Google Analytics): visualização do roteiro.
  // Só observa; não interfere em nada da página. A trava por ref garante um
  // único envio por roteiro, sem depender do modo de execução do React.
  const viewEnviado = useRef<string | null>(null);
  useEffect(() => {
    const chave = String(trip.template_id ?? trip.id);
    if (viewEnviado.current === chave) return;
    viewEnviado.current = chave;
    trackViewItem({
      id: trip.template_id ?? trip.id,
      name: trip.title,
      price: trip.price_per_person,
      category: trip.category,
    });
  }, [trip.template_id, trip.id, trip.title, trip.price_per_person, trip.category]);

  const handleSelectDate = useCallback((t: Trip) => {
    setSelectedTrip(t);
    setDateError(false);
  }, []);

  // Vai para o checkout (estilo Airbnb). Login/cadastro acontece lá dentro (modal),
  // então não checamos login aqui nem criamos a reserva - a seleção vai na URL.
  const handleOpenBooking = useCallback(() => {
    if (!selectedTrip || salesClosed(selectedTrip.departure_date)) {
      setDateError(true);
      document.getElementById("date-selector")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const hasTiers = (selectedTrip.price_tiers ?? []).length > 0;
    const tiers = hasTiers
      ? Object.entries(sidebarTiers).filter(([, q]) => q > 0).map(([label, qty]) => ({ label, qty }))
      : [];
    const people = hasTiers ? Object.values(sidebarTiers).reduce((a, b) => a + b, 0) : sidebarPeople;
    const sel = encodeURIComponent(JSON.stringify({ people, optionals: selectedOptionals, tiers, explicit: selecaoExplicita }));
    showLoading();
    router.push(`/reservar/novo?trip=${selectedTrip.id}&sel=${sel}`);
  }, [router, selectedTrip, sidebarTiers, sidebarPeople, selectedOptionals, selecaoExplicita, showLoading]);

  // Roteiro sob cotação: sem data/preço. CTA leva direto ao checkout (cadastro
  // + solicitar cotação pelo WhatsApp), usando o placeholder como alvo.
  const isQuote = !!trip.quote_only;
  // Sem data aberta: mesma página, sem preço/data e com o WhatsApp no lugar da compra.
  const semCompra = isQuote || semDatas;
  const waDatas = `https://wa.me/5541998348766?text=${encodeURIComponent(`Olá! Tenho interesse no roteiro *${trip.title}*. Quando abrem as próximas saídas?`)}`;
  const handleQuote = useCallback(() => {
    const sel = encodeURIComponent(JSON.stringify({ people: 1, optionals: [], tiers: [] }));
    showLoading();
    router.push(`/reservar/novo?trip=${trip.id}&sel=${sel}`);
  }, [router, trip.id, showLoading]);

  const openGallery = useCallback((idx: number) => {
    setGalleryStart(idx);
    setGalleryOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-clip">

      <TopoDaPagina usuario={navUser} />

      {/* Gallery Modal */}
      {galleryOpen && allImages.length > 0 && (
        <GalleryModal images={allImages} startIndex={galleryStart} onClose={() => setGalleryOpen(false)} />
      )}


      {/* Sticky Mobile CTA */}
      <StickyMobileCTA trip={activeTrip} sold={sold} onBook={handleOpenBooking} whatsappFallback={whatsappFallback} isQuote={isQuote} onQuote={handleQuote} semDatas={semDatas} waDatas={waDatas} />

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

          {/* Date Selector - mobile: before key info; desktop: in right sidebar */}
          {siblingTrips.length > 0 && (
            <div className="mb-6 lg:hidden">
              {trip.is_open_date ? (
                <OpenDateCalendar
                  trips={siblingTrips}
                  selected={selectedTrip}
                  onSelect={handleSelectDate}
                  hasError={dateError}
                  minAdvance={trip.open_date_min_advance}
                  maxAdvance={trip.open_date_max_advance}
                />
              ) : siblingTrips.length >= COMPACT_THRESHOLD ? (
                <CompactDateSelector
                  trips={siblingTrips}
                  selected={selectedTrip}
                  onSelect={handleSelectDate}
                  hasError={dateError}
                />
              ) : (
                <DateSelector
                  trips={siblingTrips}
                  selected={selectedTrip}
                  onSelect={handleSelectDate}
                  hasError={dateError}
                />
              )}
            </div>
          )}

          {/* Scarcity Banner */}
          {lowStock && !sold && (
            <div className="mb-6">
              {/* activeTrip, e não trip: o lowStock acima já olha a data
                  SELECIONADA, e passar `trip` mostrava o número da data
                  original depois que o cliente trocava de dia. */}
              <ScarcityBanner
                spots={activeTrip.available_spots}
                dataSaida={activeTrip.departure_date}
                outrasDatas={outrasDatasComVaga}
                sabeDasDatas={siblingTrips.length > 0}
              />
            </div>
          )}

          {/* Main 2-col grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Left column ── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Key info - uses activeTrip so it updates with date selection */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {semCompra ? (
                  <div className="p-5 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-navy-50 flex items-center justify-center flex-shrink-0">
                      <Calendar size={16} className="text-navy-500" />
                    </span>
                    <div>
                      <p className="font-semibold text-navy-800 text-sm">
                        {semDatas ? "Próximas saídas ainda não abertas" : "Roteiro sob cotação"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {semDatas
                          ? "Este roteiro está entre temporadas. Fale com a nossa equipe para saber das próximas datas."
                          : "Valor e datas montados sob medida. Solicite a sua cotação."}
                      </p>
                    </div>
                  </div>
                ) : trip.is_open_date ? (
                  /* Open date: 3 colunas - Saída (hora), Retorno (hora), Duração */
                  <div className="grid grid-cols-3 divide-x divide-gray-100">
                    <div className="p-5">
                      <InfoStat icon={<Clock size={16} className="text-gold-500" />} label="Saída"
                        value={selectedTrip ? fmtTimeSP(activeTrip.departure_date) : "-"} />
                    </div>
                    <div className="p-5">
                      <InfoStat icon={<Clock size={16} className="text-gold-500" />} label="Retorno"
                        value={selectedTrip ? fmtTimeSP(activeTrip.return_date) : "-"} />
                    </div>
                    <div className="p-5">
                      <InfoStat icon={<Calendar size={16} className="text-gold-500" />} label="Duração"
                        value="Bate e volta" />
                    </div>
                  </div>
                ) : (
                  /* Viagem normal: 4 colunas */
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-y divide-gray-100 sm:divide-y-0 sm:divide-x sm:divide-gray-100">
                    {/* A data aparece nas duas colunas, inclusive no bate-e-volta,
                        onde ela se repete. É de propósito: ver a MESMA data na
                        saída e no retorno é o que mostra ao cliente que a viagem
                        vai e volta no mesmo dia. Trocar por horário aqui deixava
                        essa informação só na coluna "Duração". */}
                    <div className="p-5">
                      <InfoStat icon={<Calendar size={16} className="text-gold-500" />} label="Saída"
                        value={selectedTrip
                          ? new Date(activeTrip.departure_date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo",  day: "2-digit", month: "short", year: "numeric" })
                          : "-"} />
                    </div>
                    <div className="p-5">
                      <InfoStat icon={<Calendar size={16} className="text-gold-500" />} label="Retorno"
                        value={selectedTrip
                          ? new Date(activeTrip.return_date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo",  day: "2-digit", month: "short", year: "numeric" })
                          : "-"} />
                    </div>
                    <div className="p-5">
                      <InfoStat icon={<Clock size={16} className="text-gold-500" />} label="Duração"
                        value={(() => {
                          // A etiqueta do painel manda: existe roteiro que sai
                          // 23:45 e volta às 16:00 do dia seguinte sem dormir em
                          // hotel. Pelo calendário são dois dias, e aqui saía
                          // "1 dia / 1 noite" para quem dormiu no ônibus.
                          if (marcadoBateVolta(activeTrip.tag)) return "Bate e volta";
                          const nights = activeTrip.duration_nights;
                          if (nights === 0) return "Bate e volta";
                          const days = calcDays(nights, activeTrip.departure_date);
                          if (nights === 1) return `${days} dia / ${nights} noite`;
                          return `${days} dias / ${nights} noites`;
                        })()} />
                    </div>
                    <div className="p-5">
                      <InfoStat
                        icon={<Users size={16} className="text-gold-500" />}
                        label="Vagas"
                        value={sold ? "Esgotado" : isUnlimitedSpots(activeTrip.available_spots) ? "Disponível" : `${activeTrip.available_spots} ${activeTrip.available_spots === 1 ? "disponível" : "disponíveis"}`}
                        valueClass={sold ? "text-red-500" : lowStock ? "text-orange-600" : "text-emerald-600"}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {trip.description && <DescriptionBlock description={trip.description} />}

              {/* Destination Highlights - hidden on mobile */}
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

              {/* Locais de Saída */}
              {trip.departure_locations?.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-display font-bold text-navy-800 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-navy-100 rounded-full flex items-center justify-center">
                      <MapPin size={13} className="text-navy-600" />
                    </span>
                    Locais de Saída
                  </h3>
                  <ul className="space-y-2">
                    {trip.departure_locations.map((loc, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700 text-sm">
                        <MapPin size={14} className="text-gold-500 flex-shrink-0" />{loc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Documentos necessários */}
              {trip.required_documents && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-display font-bold text-navy-800 mb-3 flex items-center gap-2">
                    <span className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield size={15} className="text-amber-600" />
                    </span>
                    Documentos necessários para embarque
                  </h3>
                  <div className="space-y-1.5">
                    {trip.required_documents.split("\n").map((line, i) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;
                      const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-");
                      return isBullet ? (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-amber-500 font-bold mt-0.5 flex-shrink-0">•</span>
                          <span>{trimmed.replace(/^[•\-]\s*/, "")}</span>
                        </div>
                      ) : (
                        <p key={i} className="text-sm text-gray-700 font-medium">{trimmed}</p>
                      );
                    })}
                  </div>
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
                          onClick={() => {
                            // Opcional também faz parte da composição da reserva.
                            setSelecaoExplicita(true);
                            setSelectedOptionals(prev =>
                              isSelected ? prev.filter(o => o.name !== opt.name) : [...prev, opt]
                            );
                          }}
                          className={`w-full flex items-center gap-3 rounded-xl border-2 px-3 sm:px-4 py-3.5 transition-[color,background-color,border-color,box-shadow,transform,opacity] text-left active:scale-[0.99] ${
                            isSelected ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-[color,background-color,border-color,box-shadow,transform,opacity] ${
                            isSelected ? "border-amber-500 bg-amber-500" : "border-gray-300"
                          }`}>
                            {isSelected && <Check size={11} className="text-white" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-gray-700 leading-tight">{opt.name}</span>
                            {/* Descrição aqui, onde há espaço - o nome fica curto. */}
                            {opt.description && (
                              <span className="block text-xs text-gray-500 leading-snug mt-0.5">{opt.description}</span>
                            )}
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
                  spDay(trip.departure_date) === spDay(trip.return_date);

                const isNewFormat = Array.isArray(trip.itinerary[0]?.items);

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
                    {isNewFormat ? (
                      <div className="space-y-5">
                        {trip.itinerary.map((item, idx) => (
                          <div key={idx}>
                            <h4 className="font-bold text-navy-800 mb-2">{item.title}</h4>
                            {item.items && item.items.length > 0 && (
                              <ul className="space-y-1.5 pl-1">
                                {item.items.map((bullet: string, bi: number) => (
                                  <li key={bi} className="flex items-start gap-2 text-gray-700 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0 mt-1.5" />
                                    {bullet}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Embarque */}
              {selectedTrip && (
                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                  <h2 className="font-display font-black text-lg text-navy-800 flex items-center gap-2">
                    <Clock size={18} className="text-gold-500" /> Horários de Embarque
                  </h2>
                  {/* Aqui a data fica sob CADA horário, mesmo no bate-e-volta,
                      onde ela se repete. É de propósito: este é o bloco que o
                      cliente confere antes de embarcar, e cada horário tem que
                      dizer sozinho de que dia é, sem depender de olhar para
                      cima. Repetir custa pouco; deixar dúvida custa uma pessoa
                      perdendo o ônibus. */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-navy-50 rounded-xl px-4 py-3">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Saída</p>
                      <p className="font-black text-2xl text-navy-800 leading-none">{fmtTimeSP(activeTrip.departure_date)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activeTrip.departure_date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo",  day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    <div className="bg-navy-50 rounded-xl px-4 py-3">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Retorno</p>
                      <p className="font-black text-2xl text-navy-800 leading-none">{fmtTimeSP(activeTrip.return_date)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activeTrip.return_date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo",  day: "2-digit", month: "short" })}
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

              {/* Trust Block - hidden on mobile */}
              {!semDatas && (
                <div className="hidden sm:block">
                  <TrustBlock maxInstallments={activeTrip.max_installments} />
                </div>
              )}

              {/* Related Trips */}
              <DestinationOptions templateId={trip.template_id} parentId={trip.parent_id} />
              <RelatedTrips currentId={trip.id} currentTemplateId={trip.template_id} category={trip.category} />
            </div>

            {/* ── Right sidebar (desktop only) ── */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-20 space-y-3">

                {/* Main booking card */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                  {semDatas ? (
                    <div className="p-5">
                      <p className="text-xs text-gray-400 mb-0.5">Próximas saídas</p>
                      <p className="font-display font-black text-3xl text-navy-700 leading-tight mb-1">Em breve</p>
                      <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                        Este roteiro está entre temporadas. Fale com a nossa equipe para saber quando abrem as próximas datas e garantir sua vaga antes de todo mundo.
                      </p>
                      <a href={waDatas} target="_blank" rel="noopener noreferrer"
                        className="w-full block font-bold py-4 rounded-xl text-center transition-[color,background-color,border-color,box-shadow,transform,opacity] text-lg bg-emerald-500 hover:bg-emerald-400 text-white hover:shadow-lg hover:shadow-emerald-500/20">
                        Consultar datas no WhatsApp
                      </a>
                    </div>
                  ) : isQuote ? (
                    <div className="p-5">
                      <p className="text-xs text-gray-400 mb-0.5">Valor</p>
                      <p className="font-display font-black text-3xl text-navy-700 leading-tight mb-1">Sob consulta</p>
                      <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                        Este roteiro é montado sob medida. Faça seu cadastro e solicite a cotação para receber o valor e as condições.
                      </p>
                      <button onClick={handleQuote}
                        className="w-full font-bold py-4 rounded-xl text-center transition-[color,background-color,border-color,box-shadow,transform,opacity] text-lg bg-emerald-500 hover:bg-emerald-400 text-white hover:shadow-lg hover:shadow-emerald-500/20">
                        Solicitar cotação
                      </button>
                    </div>
                  ) : (
                  <>

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
                        Economia de {discount}%
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 divide-y divide-gray-100">

                    {/* Selected date row - dropdown trigger */}
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
                              {/* No bate-e-volta, "· bate e volta" em vez de repetir
                                  a data. Repetida ficava pior que em outros blocos,
                                  porque aqui os dois lados usam formatos diferentes
                                  ("23 de ago. de 2026 → 23 de ago."), o que parecia
                                  defeito. É a mesma forma já usada no painel do
                                  cliente, e diz o mesmo dia com todas as letras. */}
                              <DataEscolhida
                                saida={selectedTrip.departure_date}
                                retorno={selectedTrip.return_date}
                              />
                            </p>
                          ) : (
                            <p className="text-sm font-bold text-gray-400">Selecione uma data</p>
                          )}
                        </div>
                        {siblingTrips.length > 1 && !trip.is_open_date && (
                          <span className="text-xs text-navy-600 font-semibold flex items-center gap-1 flex-shrink-0">
                            {showDatePicker
                              ? <><ChevronUp size={14}/> Fechar</>
                              : <><ChevronDown size={14}/> Trocar</>}
                          </span>
                        )}
                        {trip.is_open_date && (
                          <span className="text-xs text-navy-500 font-semibold flex items-center gap-1 flex-shrink-0">
                            <Calendar size={12}/> Alterar
                          </span>
                        )}
                      </button>

                      {/* Fixed-position dropdown - not clipped by overflow:hidden */}
                      {showDatePicker && siblingTrips.length > 1 && dropdownPos && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                          <div
                            className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-y-auto date-scroll animate-pop"
                            style={{
                              top: dropdownPos.top,
                              left: dropdownPos.left,
                              width: dropdownPos.width,
                              maxHeight: `calc(100vh - ${dropdownPos.top}px - 24px)`,
                            }}
                          >
                            {trip.is_open_date ? (
                              <OpenDateCalendar
                                trips={siblingTrips}
                                selected={selectedTrip}
                                onSelect={(t) => { handleSelectDate(t); setShowDatePicker(false); }}
                                hasError={dateError}
                                minAdvance={trip.open_date_min_advance}
                                maxAdvance={trip.open_date_max_advance}
                              />
                            ) : siblingTrips.length >= COMPACT_THRESHOLD ? (
                              <CompactDateSelector
                                trips={siblingTrips}
                                selected={selectedTrip}
                                onSelect={(t) => { handleSelectDate(t); setShowDatePicker(false); }}
                                hasError={dateError}
                              />
                            ) : (
                              <DateSelector
                                trips={siblingTrips}
                                selected={selectedTrip}
                                onSelect={(t) => { handleSelectDate(t); setShowDatePicker(false); }}
                                hasError={dateError}
                                sidebar
                                forceExpanded
                              />
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* People selector row */}
                    <div className="px-5 py-3.5">
                      {activeHasTiers ? (
                        <>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Pessoas por categoria</p>
                          <div className="space-y-2">
                            {[ADULT, ...activeTiers.map(t => tierLabel(t))].map((label) => (
                              <div key={label} className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-navy-800 truncate leading-tight">{label}</p>
                                  <p className="text-[11px] text-gray-400 leading-tight">
                                    {deForLabel(label) > 0 && (
                                      <s className="text-gray-300 mr-1">R$ {fmtBRL(deForLabel(label))}</s>
                                    )}
                                    {tierPriceLabel(priceForLabel(label), fmtBRL)}
                                    {!ocupaPoltrona(label) && " · não ocupa poltrona"}
                                  </p>
                                </div>
                                <button type="button" onClick={() => changeSidebarTier(label, -1)}
                                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold flex-shrink-0">−</button>
                                <span className="w-6 text-center font-bold text-navy-800">{sidebarTiers[label] || 0}</span>
                                <button type="button" onClick={() => changeSidebarTier(label, 1)}
                                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold flex-shrink-0">+</button>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Pessoas</p>
                          <div className="flex items-center gap-3">
                            <button type="button"
                              onClick={() => { setSelecaoExplicita(true); setSidebarPeople(p => Math.max(1, p - 1)); }}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-base transition-colors">−</button>
                            <span className="flex-1 text-center font-bold text-navy-800 text-base">{sidebarPeople} pessoa{sidebarPeople > 1 ? "s" : ""}</span>
                            <button type="button"
                              onClick={() => { setSelecaoExplicita(true); setSidebarPeople(p => Math.min(activeTrip.available_spots || 50, p + 1)); }}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-base transition-colors">+</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Total + CTA */}
                  <div className="p-5 pt-4">
                    {activeHasTiers ? (
                      <div className="space-y-1 mb-3 text-sm">
                        {Object.entries(sidebarTiers).filter(([, q]) => q > 0).map(([label, qty]) => (
                          <div key={label} className="flex items-center justify-between">
                            <span className="text-gray-500">{qty} × {label}</span>
                            <span className="font-semibold text-navy-700">
                              {tierPriceLabel(qty * priceForLabel(label), fmtBRL)}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                          <span className="text-gray-600 font-semibold">Total ({sidebarTotalPeople})</span>
                          <span className="font-black text-navy-700">R$ {fmtBRL(sidebarBaseTotal)}</span>
                        </div>
                        {sidebarSavings > 0 && (
                          <div className="flex items-center justify-between text-emerald-600 font-semibold">
                            <span>Você economiza</span>
                            <span>− R$ {fmtBRL(sidebarSavings)}</span>
                          </div>
                        )}
                      </div>
                    ) : sidebarPeople > 1 && (
                      <div className="mb-3 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{sidebarPeople} × R$ {fmtBRL(activeTrip.price_per_person)}</span>
                          <span className="font-black text-navy-700">R$ {fmtBRL(sidebarPeople * activeTrip.price_per_person)}</span>
                        </div>
                        {sidebarSavings > 0 && (
                          <div className="flex items-center justify-between text-emerald-600 font-semibold">
                            <span>Você economiza</span>
                            <span>− R$ {fmtBRL(sidebarSavings)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {lowStock && !sold && (
                      <div className="bg-orange-50 text-orange-700 text-xs font-semibold px-3 py-2 rounded-xl text-center mb-3 border border-orange-100 flex items-center justify-center gap-2">
                        <AlertTriangle size={13} />{" "}
                        {activeTrip.available_spots === 1
                          ? "Última vaga nesta data"
                          : `Restam ${activeTrip.available_spots} vagas nesta data`}
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
                        className={`w-full font-bold py-4 rounded-xl text-center transition-[color,background-color,border-color,box-shadow,transform,opacity] text-lg ${
                          selectedTrip
                            ? "bg-emerald-500 hover:bg-emerald-400 text-white hover:shadow-lg hover:shadow-emerald-500/20"
                            : "bg-gray-200 text-gray-500 cursor-pointer"
                        }`}>
                        {selectedTrip ? "Reservar agora" : "Selecione uma data"}
                      </button>
                    )}

                  </div>
                  </>
                  )}
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
          {semDatas ? (
            <a href={waDatas} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl transition-colors text-lg hover:scale-105 hover:shadow-xl shadow-emerald-500/20">
              Consultar datas no WhatsApp
            </a>
          ) : isQuote ? (
            <button onClick={handleQuote}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl transition-[color,background-color,border-color,box-shadow,transform,opacity] text-lg hover:scale-105 hover:shadow-xl shadow-emerald-500/20">
              Solicitar cotação
            </button>
          ) : sold ? (
            <a href={whatsappFallback} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl transition-colors text-lg hover:scale-105 hover:shadow-xl shadow-emerald-500/20">
              Entrar na lista de espera
            </a>
          ) : (
            <button onClick={handleOpenBooking}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl transition-[color,background-color,border-color,box-shadow,transform,opacity] text-lg hover:scale-105 hover:shadow-xl shadow-emerald-500/20">
              Quero reservar agora
            </button>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
