"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Calendar,
  Users,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Phone,
  User,
} from "lucide-react";
import type { Trip } from "@/types/trip";

type BookingFormData = {
  name: string;
  phone: string;
  people: string;
  note: string;
};

function buildWhatsAppUrl(trip: Trip, form?: BookingFormData): string {
  let text: string;
  if (form) {
    text =
      `Olá! Tenho interesse no pacote *${trip.title}* (${trip.destination}).\n\n` +
      `👤 Nome: ${form.name}\n` +
      `📞 Telefone: ${form.phone}\n` +
      `👥 Nº de pessoas: ${form.people}\n` +
      (form.note ? `📝 Observação: ${form.note}\n` : "") +
      `\nPode me passar mais informações?`;
  } else {
    text = `Olá! Tenho interesse no pacote *${trip.title}* para ${trip.destination}. Pode me passar mais informações?`;
  }
  return `https://wa.me/5541998348766?text=${encodeURIComponent(text)}`;
}

function BookingModal({
  trip,
  onClose,
}: {
  trip: Trip;
  onClose: () => void;
}) {
  const [form, setForm] = useState<BookingFormData>({
    name: "",
    phone: "",
    people: "1",
    note: "",
  });
  const [phoneError, setPhoneError] = useState("");

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }));
    setPhoneError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setPhoneError("Informe um telefone válido com DDD");
      return;
    }
    window.open(buildWhatsAppUrl(trip, form), "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-display font-black text-navy-800 text-lg">Reservar viagem</h3>
            <p className="text-xs text-gray-500 mt-0.5">{trip.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Seu nome *
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                placeholder="Como prefere ser chamado?"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Telefone / WhatsApp *
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                required
                placeholder="(41) 99999-9999"
                value={form.phone}
                onChange={handlePhoneChange}
                className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-transparent ${phoneError ? "border-red-400" : "border-gray-200"}`}
              />
            </div>
            {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Número de pessoas *
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, people: String(Math.max(1, Number(f.people) - 1)) }))}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-bold text-lg"
              >
                −
              </button>
              <span className="flex-1 text-center font-bold text-navy-800 text-lg">{form.people}</span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, people: String(Math.min(trip.available_spots || 50, Number(f.people) + 1)) }))}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-bold text-lg"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Alguma dúvida ou observação? <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ex: preciso de quarto duplo, tenho crianças..."
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Price summary */}
          <div className="bg-navy-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-navy-600 font-medium">
              {form.people} × R$ {trip.price_per_person.toLocaleString("pt-BR")}
            </span>
            <span className="font-black text-navy-800 text-lg">
              R$ {(Number(form.people) * trip.price_per_person).toLocaleString("pt-BR")}
            </span>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
          >
            Enviar pelo WhatsApp
          </button>
          <p className="text-center text-xs text-gray-400">
            Você será redirecionado ao WhatsApp com seus dados preenchidos
          </p>
        </form>
      </div>
    </div>
  );
}

export default function TripDetailClient({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showBooking, setShowBooking] = useState(false);

  const sold = trip.available_spots === 0 || trip.status === "sold_out";
  const allImages = [
    ...(trip.image_url ? [trip.image_url] : []),
    ...(trip.gallery || []),
  ].filter(Boolean);

  const departureDate = new Date(trip.departure_date);
  const returnDate = new Date(trip.return_date);

  return (
    <div className="min-h-screen bg-gray-50">
      {showBooking && (
        <BookingModal trip={trip} onClose={() => setShowBooking(false)} />
      )}

      {/* Back nav */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-gray-500 hover:text-navy-700 text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar para viagens
          </button>
        </div>
      </div>

      {/* Hero / Gallery */}
      <div className="relative bg-navy-900 h-72 sm:h-96 overflow-hidden">
        {allImages.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={allImages[galleryIndex]}
              alt={trip.title}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {allImages.length > 1 && (
              <>
                <button
                  onClick={() => setGalleryIndex((i) => (i - 1 + allImages.length) % allImages.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setGalleryIndex((i) => (i + 1) % allImages.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIndex(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === galleryIndex ? "bg-gold-400" : "bg-white/50"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-navy-800" />
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {trip.tag && (
                <span className="bg-gold-500 text-navy-900 text-xs font-bold px-3 py-1 rounded-full">
                  {trip.tag}
                </span>
              )}
              {sold && (
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Esgotado
                </span>
              )}
              {!sold && trip.available_spots <= 5 && (
                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Últimas {trip.available_spots} vagas!
                </span>
              )}
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white leading-tight">
              {trip.title}
            </h1>
            <div className="flex items-center gap-1.5 text-white/80 text-sm mt-1">
              <MapPin size={14} className="text-gold-400" />
              {trip.destination}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Key info */}
            <div className="bg-white rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 shadow-sm">
              <InfoStat
                icon={<Calendar size={18} className="text-gold-500" />}
                label="Saída"
                value={departureDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
              />
              <InfoStat
                icon={<Calendar size={18} className="text-gold-500" />}
                label="Retorno"
                value={returnDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
              />
              <InfoStat
                icon={<Clock size={18} className="text-gold-500" />}
                label="Duração"
                value={`${trip.duration_nights + 1} dias / ${trip.duration_nights} noites`}
              />
              <InfoStat
                icon={<Users size={18} className="text-gold-500" />}
                label="Vagas"
                value={sold ? "Esgotado" : `${trip.available_spots} disponíveis`}
                valueClass={sold ? "text-red-500" : "text-emerald-600"}
              />
            </div>

            {/* Description */}
            {trip.description && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-display font-black text-xl text-navy-800 mb-4">Sobre o pacote</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{trip.description}</p>
              </div>
            )}

            {/* Includes / Excludes */}
            {(trip.includes?.length > 0 || trip.excludes?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {trip.includes?.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h3 className="font-display font-bold text-navy-800 mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-emerald-600" />
                      </span>
                      O que inclui
                    </h3>
                    <ul className="space-y-2.5">
                      {trip.includes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
                          <Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {trip.excludes?.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h3 className="font-display font-bold text-navy-800 mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                        <X size={12} className="text-red-500" />
                      </span>
                      Não inclui
                    </h3>
                    <ul className="space-y-2.5">
                      {trip.excludes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-500 text-sm">
                          <X size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Itinerary */}
            {trip.itinerary?.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-display font-black text-xl text-navy-800 mb-6">Roteiro dia a dia</h2>
                <div className="space-y-4">
                  {trip.itinerary.map((day) => (
                    <div key={day.day} className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-navy-700 text-white flex items-center justify-center font-bold text-sm">
                        {day.day}
                      </div>
                      <div className="flex-1 pb-4 border-b border-gray-100 last:border-0">
                        <h4 className="font-bold text-navy-800 mb-1">{day.title}</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">{day.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery thumbnails */}
            {allImages.length > 1 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h2 className="font-display font-bold text-navy-800 mb-4">Galeria de fotos</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setGalleryIndex(i);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`relative h-24 rounded-lg overflow-hidden border-2 transition-colors ${i === galleryIndex ? "border-gold-400" : "border-transparent"}`}
                    >
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
                {trip.original_price && (
                  <p className="text-sm text-gray-400 line-through">
                    R$ {trip.original_price.toLocaleString("pt-BR")}
                  </p>
                )}
                <p className="font-display font-black text-4xl text-navy-700">
                  R$ {trip.price_per_person.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-gray-500 mb-1">por pessoa</p>
                <p className="text-sm text-emerald-600 font-medium mb-5">
                  ou {trip.max_installments}x de R${" "}
                  {Math.ceil(trip.price_per_person / trip.max_installments).toLocaleString("pt-BR")} sem juros
                </p>

                {trip.original_price && (
                  <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg text-center mb-5">
                    Você economiza R$ {(trip.original_price - trip.price_per_person).toLocaleString("pt-BR")} por pessoa
                  </div>
                )}

                {sold ? (
                  <div className="text-center">
                    <div className="bg-gray-100 text-gray-500 font-bold py-3.5 rounded-xl mb-3">
                      Pacote esgotado
                    </div>
                    <a
                      href={buildWhatsAppUrl(trip)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Entrar na lista de espera →
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowBooking(true)}
                    className="block w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl text-center transition-colors text-lg"
                  >
                    Reservar agora
                  </button>
                )}

                <p className="text-xs text-gray-400 text-center mt-3">
                  Mín. {trip.min_group_size} {trip.min_group_size === 1 ? "pessoa" : "pessoas"}
                </p>
              </div>

              <div className="bg-navy-800 rounded-2xl p-5 text-white">
                <p className="font-bold mb-1 text-sm">Precisa de ajuda?</p>
                <p className="text-navy-300 text-xs mb-3">
                  Nossa equipe responde em minutos pelo WhatsApp
                </p>
                <a
                  href="https://wa.me/5541998348766"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  (41) 99834-8766
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-navy-800 text-white py-12 px-4 mt-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-lg font-medium mb-2">Pronto para embarcar?</p>
          <p className="text-navy-300 text-sm mb-6">
            Fale com nossa equipe agora e garanta sua vaga
          </p>
          {sold ? (
            <a
              href={buildWhatsAppUrl(trip)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-xl transition-colors text-lg"
            >
              Entrar na lista de espera
            </a>
          ) : (
            <button
              onClick={() => setShowBooking(true)}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-xl transition-colors text-lg"
            >
              Quero reservar agora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoStat({
  icon,
  label,
  value,
  valueClass = "text-navy-800",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-gray-400 text-xs">
        {icon}
        {label}
      </div>
      <p className={`font-bold text-sm ${valueClass}`}>{value}</p>
    </div>
  );
}
