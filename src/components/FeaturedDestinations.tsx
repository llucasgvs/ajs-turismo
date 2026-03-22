"use client";

import { useState } from "react";
import { MapPin, ArrowRight } from "lucide-react";

const destinations = [
  {
    id: 1,
    name: "Maceió, AL",
    description: "Praias paradisíacas com água esverdeada e cristalina",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80&fit=crop",
    startingFrom: 1299,
    nights: "4 noites",
    tag: "Mais Procurado",
    tagColor: "badge",
  },
  {
    id: 2,
    name: "Salvador, BA",
    description: "História, cultura e festas inesquecíveis na Bahia",
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&q=80&fit=crop",
    startingFrom: 1099,
    nights: "5 noites",
    tag: "Promoção",
    tagColor: "badge-green",
  },
  {
    id: 3,
    name: "Gramado, RS",
    description: "A cidade mais europeia e charmosa do Brasil",
    image: "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=600&q=80&fit=crop",
    startingFrom: 1599,
    nights: "4 noites",
    tag: "Novo",
    tagColor: "badge-navy",
  },
  {
    id: 4,
    name: "Rio de Janeiro, RJ",
    description: "A cidade maravilhosa com praias e pontos icônicos",
    image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600&q=80&fit=crop",
    startingFrom: 1399,
    nights: "5 noites",
    tag: "Mais Vendido",
    tagColor: "badge",
  },
  {
    id: 5,
    name: "Bonito, MS",
    description: "Ecoturismo e rios cristalinos no coração do Brasil",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80&fit=crop",
    startingFrom: 1899,
    nights: "5 noites",
    tag: "Aventura",
    tagColor: "badge-navy",
  },
  {
    id: 6,
    name: "Fortaleza, CE",
    description: "Sol, dunas e lagoas num paraíso nordestino",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80&fit=crop",
    startingFrom: 1199,
    nights: "6 noites",
    tag: "Promoção",
    tagColor: "badge-green",
  },
];

export default function FeaturedDestinations() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="destinos" className="py-16 md:py-24 bg-gray-50">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <div className="badge mb-4">Destinos</div>
          <h2 className="section-title">
            Destinos que Você{" "}
            <span className="text-gold-500">Vai Amar</span>
          </h2>
          <p className="section-subtitle">
            Explore os melhores destinos nacionais selecionados pela nossa equipe com os
            melhores preços e condições do mercado.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {destinations.map((dest) => (
            <div
              key={dest.id}
              className="card group cursor-pointer"
              onMouseEnter={() => setHovered(dest.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Image */}
              <div className="relative h-52 sm:h-56 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dest.image}
                  alt={dest.name}
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    hovered === dest.id ? "scale-110" : "scale-100"
                  }`}
                />
                <div className="absolute inset-0 bg-card-gradient" />

                {/* Tag */}
                <div className="absolute top-3 left-3">
                  <span className={dest.tagColor}>{dest.tag}</span>
                </div>

                {/* Nights */}
                <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {dest.nights}
                </div>

                {/* Name overlay */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-1.5 text-white">
                    <MapPin size={14} className="text-gold-400 flex-shrink-0" />
                    <span className="font-display font-bold text-lg leading-tight">{dest.name}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 md:p-5">
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{dest.description}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">A partir de</p>
                    <p className="text-navy-600 font-black text-xl">
                      R$ {dest.startingFrom.toLocaleString("pt-BR")}
                      <span className="text-gray-400 font-normal text-xs">/pessoa</span>
                    </p>
                  </div>

                  <button className="flex items-center gap-1.5 text-navy-600 hover:text-gold-500 font-semibold text-sm transition-colors group/btn">
                    Ver pacote
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover/btn:translate-x-1"
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* More button */}
        <div className="text-center mt-10">
          <button className="btn-outline-gold py-3 px-8 inline-flex items-center gap-2">
            Ver todos os destinos
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
