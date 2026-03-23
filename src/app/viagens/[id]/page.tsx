"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import type { Trip } from "@/types/trip";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function TripDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/trips/${id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setTrip(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <TripSkeleton />;

  if (notFound || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <MapPin size={48} className="text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-700 mb-2">Viagem não encontrada</h1>
        <p className="text-gray-500 mb-6">O pacote que você procura não existe ou foi removido.</p>
        <Link href="/viagens" className="btn-primary px-6 py-3">Ver todas as viagens</Link>
      </div>
    );
  }

  const sold = trip.available_spots === 0 || trip.status === "sold_out";
  const allImages = [
    ...(trip.image_url ? [trip.image_url] : []),
    ...(trip.gallery || []),
  ].filter(Boolean);

  const whatsappText = encodeURIComponent(
    `Olá! Tenho interesse no pacote *${trip.title}* para ${trip.destination}. Pode me passar mais informações?`
  );
  const whatsappUrl = `https://wa.me/5541998348766?text=${whatsappText}`;

  const departureDate = new Date(trip.departure_date);
  const returnDate = new Date(trip.return_date);

  return (
    <div className="min-h-screen bg-gray-50">
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

          {/* Sidebar - Price & CTA */}
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
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Entrar na lista de espera →
                    </a>
                  </div>
                ) : (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl text-center transition-colors text-lg"
                  >
                    Reservar pelo WhatsApp
                  </a>
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
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-xl transition-colors text-lg"
          >
            Quero reservar agora
          </a>
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

function TripSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="bg-gray-200 h-96" />
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-5 h-24" />
          <div className="bg-white rounded-2xl p-6 h-48" />
          <div className="bg-white rounded-2xl p-6 h-64" />
        </div>
        <div className="bg-white rounded-2xl p-6 h-64" />
      </div>
    </div>
  );
}
