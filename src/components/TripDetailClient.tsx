"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Clock, Calendar, Users, Check, X, ChevronLeft, ChevronRight, ArrowLeft, Phone, User, CreditCard, Cake } from "lucide-react";
import type { Trip } from "@/types/trip";

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

type CompanionForm = {
  full_name: string;
  cpf: string;
  birth_date: string;
};

/* ─── helpers ─── */
function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("ajs_user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getToken(): string | null {
  return localStorage.getItem("ajs_token");
}

function formatCPF(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function buildWhatsAppMessage(
  trip: Trip,
  user: StoredUser,
  phone: string,
  cpf: string,
  birthDate: string,
  people: number,
  companions: CompanionForm[],
  note: string,
  bookingCode: string,
): string {
  const fmt = (d: string) => {
    if (!d) return "-";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  let msg =
    `*Interesse em reserva -- ${trip.title}*\n` +
    `Destino: ${trip.destination}\n` +
    `Saida: ${fmt(trip.departure_date.slice(0, 10))}\n` +
    `Codigo: ${bookingCode}\n\n` +
    `*Titular:*\n` +
    `   Nome: ${user.full_name}\n` +
    `   CPF: ${cpf}\n` +
    `   Nascimento: ${fmt(birthDate)}\n` +
    `   Tel: ${phone}\n`;

  companions.forEach((c, i) => {
    msg +=
      `\n*Acompanhante ${i + 1}:*\n` +
      `   Nome: ${c.full_name}\n` +
      `   CPF: ${c.cpf}\n` +
      `   Nascimento: ${fmt(c.birth_date)}\n`;
  });

  msg += `\n*Total:* ${people} pessoa${people > 1 ? "s" : ""}\n`;
  msg += `*Valor estimado:* R$ ${(people * trip.price_per_person).toLocaleString("pt-BR")}`;
  if (note) msg += `\n\nObservacao: ${note}`;

  return msg;
}

/* ─── BookingModal ─── */
function BookingModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const router = useRouter();
  const [user] = useState<StoredUser | null>(getStoredUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [cpf, setCpf] = useState(user?.cpf || "");
  const [birthDate, setBirthDate] = useState(user?.birth_date || "");
  const [people, setPeople] = useState(1);
  const [companions, setCompanions] = useState<CompanionForm[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!user) {
      const redirect = encodeURIComponent(window.location.pathname);
      router.push(`/login?redirect=${redirect}`);
      onClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const needed = people - 1;
    setCompanions((prev) => {
      if (prev.length === needed) return prev;
      if (prev.length < needed)
        return [...prev, ...Array(needed - prev.length).fill({ full_name: "", cpf: "", birth_date: "" })];
      return prev.slice(0, needed);
    });
  }, [people]);

  if (!user) return null;

  const updateCompanion = (i: number, field: keyof CompanionForm, val: string) =>
    setCompanions((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (cpf.replace(/\D/g, "").length < 11) { setError("Informe seu CPF completo."); return; }
    if (!birthDate) { setError("Informe sua data de nascimento."); return; }
    if (!phone || phone.replace(/\D/g, "").length < 10) { setError("Informe um telefone válido com DDD."); return; }
    for (const [i, c] of companions.entries()) {
      if (c.full_name.trim().length < 3) { setError(`Nome do acompanhante ${i + 1} inválido.`); return; }
      if (c.cpf.replace(/\D/g, "").length < 11) { setError(`CPF do acompanhante ${i + 1} inválido.`); return; }
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
        body: JSON.stringify({
          trip_id: trip.id,
          num_travelers: people,
          companions: companions.map((c) => ({ full_name: c.full_name, cpf: c.cpf, birth_date: c.birth_date })),
          notes: note || undefined,
        }),
      });

      if (!bookingRes.ok) {
        const err = await bookingRes.json();
        setError(err.detail || "Erro ao criar reserva.");
        return;
      }

      const booking = await bookingRes.json();
      localStorage.setItem("ajs_user", JSON.stringify({ ...user, full_name: fullName, phone, cpf, birth_date: birthDate }));
      const msg = buildWhatsAppMessage(trip, { ...user, full_name: fullName }, phone, cpf, birthDate, people, companions, note, booking.booking_code);
      window.open(`https://wa.me/5541998348766?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
      onClose();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-display font-black text-navy-800 text-lg">Reservar viagem</h3>
            <p className="text-xs text-gray-500 mt-0.5">{trip.title} · {trip.destination}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          {/* Nº pessoas */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Número de pessoas *</label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setPeople((p) => Math.max(1, p - 1))}
                className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-bold text-lg">−</button>
              <span className="flex-1 text-center font-bold text-navy-800 text-xl">{people}</span>
              <button type="button" onClick={() => setPeople((p) => Math.min(trip.available_spots || 50, p + 1))}
                className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-bold text-lg">+</button>
            </div>
          </div>

          {/* Titular */}
          <div className="bg-navy-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-navy-700 uppercase tracking-wide">Seus dados (titular)</p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nome completo *</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" required placeholder="Nome completo" value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone / WhatsApp *</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" required placeholder="(41) 99999-9999" value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">CPF *</label>
              <div className="relative">
                <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" required placeholder="000.000.000-00" value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data de nascimento *</label>
              <div className="relative">
                <Cake size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="date" required value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
            </div>
          </div>

          {/* Acompanhantes */}
          {companions.map((c, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-navy-700 uppercase tracking-wide flex items-center gap-2">
                <Users size={13} /> Acompanhante {i + 1}
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome completo *</label>
                <input type="text" required placeholder="Nome completo" value={c.full_name}
                  onChange={(e) => updateCompanion(i, "full_name", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">CPF *</label>
                  <input type="text" required placeholder="000.000.000-00" value={c.cpf}
                    onChange={(e) => updateCompanion(i, "cpf", formatCPF(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nascimento *</label>
                  <input type="date" required value={c.birth_date}
                    onChange={(e) => updateCompanion(i, "birth_date", e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
                </div>
              </div>
            </div>
          ))}

          {/* Observação */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Observação <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea rows={2} placeholder="Ex: preciso de quarto duplo, tenho crianças..." value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none" />
          </div>

          {/* Resumo */}
          <div className="bg-navy-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-navy-600 font-medium">
              {people} × R$ {trip.price_per_person.toLocaleString("pt-BR")}
            </span>
            <span className="font-black text-navy-800 text-lg">
              R$ {(people * trip.price_per_person).toLocaleString("pt-BR")}
            </span>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-base disabled:opacity-60">
            {loading ? "Salvando..." : "Enviar pelo WhatsApp"}
          </button>
          <p className="text-center text-xs text-gray-400">
            Dados salvos para próximas reservas. Abriremos o WhatsApp com tudo preenchido.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function TripDetailClient({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showBooking, setShowBooking] = useState(false);

  const sold = trip.available_spots === 0 || trip.status === "sold_out";
  const allImages = [...(trip.image_url ? [trip.image_url] : []), ...(trip.gallery || [])].filter(Boolean);
  const departureDate = new Date(trip.departure_date);
  const returnDate = new Date(trip.return_date);
  const whatsappFallback = `https://wa.me/5541998348766?text=${encodeURIComponent(`Olá! Tenho interesse no pacote *${trip.title}* — ${trip.destination}.`)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {showBooking && <BookingModal trip={trip} onClose={() => setShowBooking(false)} />}

      {/* Back nav */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-gray-500 hover:text-navy-700 text-sm font-medium transition-colors">
            <ArrowLeft size={16} /> Voltar para viagens
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="relative bg-navy-900 h-72 sm:h-96 overflow-hidden">
        {allImages.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={allImages[galleryIndex]} alt={trip.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            {allImages.length > 1 && (
              <>
                <button onClick={() => setGalleryIndex((i) => (i - 1 + allImages.length) % allImages.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => setGalleryIndex((i) => (i + 1) % allImages.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors">
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5">
                  {allImages.map((_, i) => (
                    <button key={i} onClick={() => setGalleryIndex(i)}
                      className={`w-2 h-2 rounded-full ${i === galleryIndex ? "bg-gold-400" : "bg-white/50"}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : <div className="w-full h-full bg-navy-800" />}

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {trip.tag && <span className="bg-gold-500 text-navy-900 text-xs font-bold px-3 py-1 rounded-full">{trip.tag}</span>}
              {sold && <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">Esgotado</span>}
              {!sold && trip.available_spots <= 5 && <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">Últimas {trip.available_spots} vagas!</span>}
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white leading-tight">{trip.title}</h1>
            <div className="flex items-center gap-1.5 text-white/80 text-sm mt-1">
              <MapPin size={14} className="text-gold-400" /> {trip.destination}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Key info */}
            <div className="bg-white rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 shadow-sm">
              <InfoStat icon={<Calendar size={18} className="text-gold-500" />} label="Saída"
                value={departureDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })} />
              <InfoStat icon={<Calendar size={18} className="text-gold-500" />} label="Retorno"
                value={returnDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })} />
              <InfoStat icon={<Clock size={18} className="text-gold-500" />} label="Duração"
                value={`${trip.duration_nights + 1} dias / ${trip.duration_nights} noites`} />
              <InfoStat icon={<Users size={18} className="text-gold-500" />} label="Vagas"
                value={sold ? "Esgotado" : `${trip.available_spots} disponíveis`}
                valueClass={sold ? "text-red-500" : "text-emerald-600"} />
            </div>

            {trip.description && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-display font-black text-xl text-navy-800 mb-4">Sobre o pacote</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{trip.description}</p>
              </div>
            )}

            {(trip.includes?.length > 0 || trip.excludes?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {trip.includes?.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h3 className="font-display font-bold text-navy-800 mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center"><Check size={12} className="text-emerald-600" /></span>
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
                      <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center"><X size={12} className="text-red-500" /></span>
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

            {trip.itinerary?.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-display font-black text-xl text-navy-800 mb-6">Roteiro dia a dia</h2>
                <div className="space-y-4">
                  {trip.itinerary.map((day) => (
                    <div key={day.day} className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-navy-700 text-white flex items-center justify-center font-bold text-sm">{day.day}</div>
                      <div className="flex-1 pb-4 border-b border-gray-100 last:border-0">
                        <h4 className="font-bold text-navy-800 mb-1">{day.title}</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">{day.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allImages.length > 1 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h2 className="font-display font-bold text-navy-800 mb-4">Galeria de fotos</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {allImages.map((img, i) => (
                    <button key={i} onClick={() => { setGalleryIndex(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className={`relative h-24 rounded-lg overflow-hidden border-2 transition-colors ${i === galleryIndex ? "border-gold-400" : "border-transparent"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">A partir de</p>
                {trip.original_price && <p className="text-sm text-gray-400 line-through">R$ {trip.original_price.toLocaleString("pt-BR")}</p>}
                <p className="font-display font-black text-4xl text-navy-700">R$ {trip.price_per_person.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-gray-500 mb-1">por pessoa</p>
                <p className="text-sm text-emerald-600 font-medium mb-5">
                  ou {trip.max_installments}x de R$ {Math.ceil(trip.price_per_person / trip.max_installments).toLocaleString("pt-BR")} sem juros
                </p>
                {trip.original_price && (
                  <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg text-center mb-5">
                    Você economiza R$ {(trip.original_price - trip.price_per_person).toLocaleString("pt-BR")} por pessoa
                  </div>
                )}
                {sold ? (
                  <div className="text-center">
                    <div className="bg-gray-100 text-gray-500 font-bold py-3.5 rounded-xl mb-3">Pacote esgotado</div>
                    <a href={whatsappFallback} target="_blank" rel="noopener noreferrer"
                      className="block text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium">Entrar na lista de espera →</a>
                  </div>
                ) : (
                  <button onClick={() => setShowBooking(true)}
                    className="block w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl text-center transition-colors text-lg">
                    Reservar agora
                  </button>
                )}
                <p className="text-xs text-gray-400 text-center mt-3">
                  Mín. {trip.min_group_size} {trip.min_group_size === 1 ? "pessoa" : "pessoas"}
                </p>
              </div>

              <div className="bg-navy-800 rounded-2xl p-5 text-white">
                <p className="font-bold mb-1 text-sm">Precisa de ajuda?</p>
                <p className="text-navy-300 text-xs mb-3">Nossa equipe responde em minutos pelo WhatsApp</p>
                <a href="https://wa.me/5541998348766" target="_blank" rel="noopener noreferrer"
                  className="block text-center text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">(41) 99834-8766</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-navy-800 text-white py-12 px-4 mt-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-lg font-medium mb-2">Pronto para embarcar?</p>
          <p className="text-navy-300 text-sm mb-6">Fale com nossa equipe agora e garanta sua vaga</p>
          {sold ? (
            <a href={whatsappFallback} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-xl transition-colors text-lg">
              Entrar na lista de espera
            </a>
          ) : (
            <button onClick={() => setShowBooking(true)}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-xl transition-colors text-lg">
              Quero reservar agora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

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
