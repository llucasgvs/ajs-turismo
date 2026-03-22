"use client";

import { useState } from "react";
import {
  MapPin,
  Clock,
  Users,
  Star,
  ArrowRight,
  Check,
  Flame,
  Tag,
} from "lucide-react";

const packages = [
  {
    id: 1,
    title: "Maceió Completo",
    destination: "Maceió, Alagoas",
    duration: "5 dias / 4 noites",
    groupSize: "Mínimo 2 pessoas",
    rating: 4.9,
    reviews: 128,
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80&fit=crop",
    originalPrice: 1899,
    price: 1299,
    tag: "hot",
    tagLabel: "Mais Vendido",
    includes: [
      "Passagem de ônibus ida e volta",
      "Hotel 3 estrelas café incluso",
      "Passeio de barco nas piscinas naturais",
      "Guia turístico exclusivo",
    ],
    installments: 10,
  },
  {
    id: 2,
    title: "Nordeste Incrível",
    destination: "Fortaleza + Natal, CE/RN",
    duration: "8 dias / 7 noites",
    groupSize: "Grupos de 10+",
    rating: 4.8,
    reviews: 94,
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80&fit=crop",
    originalPrice: 2799,
    price: 2099,
    tag: "promo",
    tagLabel: "25% OFF",
    includes: [
      "Ônibus executivo + refeições",
      "Hotel 4 estrelas",
      "City tour em ambas cidades",
      "Passeio de buggy nas dunas",
    ],
    installments: 12,
  },
  {
    id: 3,
    title: "Serra Gaúcha Especial",
    destination: "Gramado + Canela, RS",
    duration: "6 dias / 5 noites",
    groupSize: "Mínimo 2 pessoas",
    rating: 5.0,
    reviews: 67,
    image: "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=800&q=80&fit=crop",
    originalPrice: 2299,
    price: 1899,
    tag: "new",
    tagLabel: "Lançamento",
    includes: [
      "Ônibus leito confortável",
      "Hotel boutique 4 estrelas",
      "Ingressos mini mundo + parques",
      "Café da manhã especial",
    ],
    installments: 12,
  },
];

export default function FeaturedPackages() {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);

  const getTagStyle = (tag: string) => {
    if (tag === "hot") return "bg-red-500 text-white";
    if (tag === "promo") return "bg-emerald-500 text-white";
    return "bg-navy-600 text-white";
  };

  const getTagIcon = (tag: string) => {
    if (tag === "hot") return <Flame size={11} />;
    if (tag === "promo") return <Tag size={11} />;
    return <Star size={11} fill="currentColor" />;
  };

  return (
    <section id="pacotes" className="py-16 md:py-24 bg-gray-50">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="badge mb-4">Ofertas Exclusivas</div>
          <h2 className="section-title">
            Pacotes em{" "}
            <span className="text-gold-500">Destaque</span>
          </h2>
          <p className="section-subtitle">
            Ofertas exclusivas com o melhor custo-benefício. Aproveite agora antes
            que os lugares acabem!
          </p>
        </div>

        {/* Packages grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`card flex flex-col transition-all duration-300 ${
                selectedPackage === pkg.id ? "ring-2 ring-gold-500" : ""
              }`}
              onClick={() => setSelectedPackage(pkg.id === selectedPackage ? null : pkg.id)}
            >
              {/* Image */}
              <div className="relative h-52 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pkg.image}
                  alt={pkg.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Tag */}
                <div
                  className={`absolute top-3 left-3 flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${getTagStyle(pkg.tag)}`}
                >
                  {getTagIcon(pkg.tag)}
                  {pkg.tagLabel}
                </div>

                {/* Rating */}
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  <Star size={11} fill="#F7A800" className="text-gold-400" />
                  {pkg.rating} ({pkg.reviews})
                </div>

                {/* Title on image */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-display font-black text-xl text-white">{pkg.title}</h3>
                  <div className="flex items-center gap-1.5 text-white/80 text-sm">
                    <MapPin size={12} />
                    {pkg.destination}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                {/* Info pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-1.5 bg-navy-50 text-navy-600 text-xs font-medium px-3 py-1.5 rounded-full">
                    <Clock size={11} />
                    {pkg.duration}
                  </div>
                  <div className="flex items-center gap-1.5 bg-navy-50 text-navy-600 text-xs font-medium px-3 py-1.5 rounded-full">
                    <Users size={11} />
                    {pkg.groupSize}
                  </div>
                </div>

                {/* Includes */}
                <ul className="space-y-2 mb-5 flex-1">
                  {pkg.includes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
                      <Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Price */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 line-through">
                        R$ {pkg.originalPrice.toLocaleString("pt-BR")}
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-gray-500">a partir de</span>
                        <span className="font-display font-black text-2xl text-navy-700">
                          R$ {pkg.price.toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-600 font-medium">
                        ou {pkg.installments}x de R$ {Math.ceil(pkg.price / pkg.installments).toLocaleString("pt-BR")} sem juros
                      </p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg">
                      -{Math.round((1 - pkg.price / pkg.originalPrice) * 100)}% OFF
                    </div>
                  </div>

                  <button className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
                    Reservar agora
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-gray-400 text-sm mt-8">
          * Preços por pessoa, sujeitos à disponibilidade. Consulte condições de parcelamento.
        </p>
      </div>
    </section>
  );
}
