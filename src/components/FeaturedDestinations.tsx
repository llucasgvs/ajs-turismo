"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import type { Trip } from "@/types/trip";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FALLBACK = [
  { id: 0, destination: "Maceió, AL", short_description: "Praias paradisíacas com água esverdeada e cristalina", image_url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80&fit=crop", price_per_person: 1299, duration_nights: 4, tag: "Mais Procurado" },
  { id: 0, destination: "Salvador, BA", short_description: "História, cultura e festas inesquecíveis na Bahia", image_url: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&q=80&fit=crop", price_per_person: 1099, duration_nights: 5, tag: "Promoção" },
  { id: 0, destination: "Gramado, RS", short_description: "A cidade mais europeia e charmosa do Brasil", image_url: "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=600&q=80&fit=crop", price_per_person: 1599, duration_nights: 4, tag: "Novo" },
  { id: 0, destination: "Rio de Janeiro, RJ", short_description: "A cidade maravilhosa com praias e pontos icônicos", image_url: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600&q=80&fit=crop", price_per_person: 1399, duration_nights: 5, tag: "Mais Vendido" },
  { id: 0, destination: "Bonito, MS", short_description: "Ecoturismo e rios cristalinos no coração do Brasil", image_url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80&fit=crop", price_per_person: 1899, duration_nights: 5, tag: "Aventura" },
  { id: 0, destination: "Fortaleza, CE", short_description: "Sol, dunas e lagoas num paraíso nordestino", image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80&fit=crop", price_per_person: 1199, duration_nights: 6, tag: "Promoção" },
];

type DestItem = {
  id: number;
  destination: string;
  short_description: string | null;
  image_url: string | null;
  price_per_person: number;
  duration_nights: number;
  tag: string | null;
};

export default function FeaturedDestinations() {
  const [destinations, setDestinations] = useState<DestItem[]>([]);

  useEffect(() => {
    fetch(`${API}/trips/?limit=6`)
      .then((r) => r.json())
      .then((data: Trip[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setDestinations(data);
        } else {
          setDestinations(FALLBACK);
        }
      })
      .catch(() => setDestinations(FALLBACK));
  }, []);

  const displayed = destinations.length > 0 ? destinations : FALLBACK;

  return (
    <section id="destinos" className="py-16 md:py-24 bg-gray-50">
      <div className="container-custom">
        <div className="text-center mb-10 md:mb-14">
          <div className="badge mb-4">Destinos</div>
          <h2 className="section-title">
            Destinos que Você <span className="text-gold-500">Vai Amar</span>
          </h2>
          <p className="section-subtitle">
            Explore os melhores destinos nacionais selecionados pela nossa equipe com os
            melhores preços e condições do mercado.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {displayed.map((dest, i) => (
            <div key={dest.id || i} className="card group cursor-pointer">
              <div className="relative h-52 sm:h-56 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dest.image_url || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"}
                  alt={dest.destination}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-card-gradient" />

                {dest.tag && (
                  <div className="absolute top-3 left-3">
                    <span className="badge">{dest.tag}</span>
                  </div>
                )}

                <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {dest.duration_nights} noites
                </div>

                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-1.5 text-white">
                    <MapPin size={14} className="text-gold-400 flex-shrink-0" />
                    <span className="font-display font-bold text-lg leading-tight">{dest.destination}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-5">
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  {dest.short_description || dest.destination}
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">A partir de</p>
                    <p className="text-navy-600 font-black text-xl">
                      R$ {dest.price_per_person.toLocaleString("pt-BR")}
                      <span className="text-gray-400 font-normal text-xs">/pessoa</span>
                    </p>
                  </div>

                  <Link
                    href={dest.id ? `/viagens/${dest.id}` : "/viagens"}
                    className="flex items-center gap-1.5 text-navy-600 hover:text-gold-500 font-semibold text-sm transition-colors group/btn"
                  >
                    Ver pacote
                    <ArrowRight size={15} className="transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/viagens" className="btn-outline-gold py-3 px-8 inline-flex items-center gap-2">
            Ver todos os destinos
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
