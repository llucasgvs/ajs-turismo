"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Clock, Users, Star, ArrowRight, Check } from "lucide-react";
import type { Trip } from "@/types/trip";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FALLBACK = [
  {
    id: 0,
    title: "Maceió Completo",
    destination: "Maceió, Alagoas",
    duration_nights: 4,
    min_group_size: 2,
    image_url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80&fit=crop",
    original_price: 1899,
    price_per_person: 1299,
    tag: "Mais Vendido",
    max_installments: 10,
    includes: ["Passagem de ônibus ida e volta", "Hotel 3 estrelas café incluso", "Passeio de barco nas piscinas naturais", "Guia turístico exclusivo"],
  },
  {
    id: 0,
    title: "Nordeste Incrível",
    destination: "Fortaleza + Natal, CE/RN",
    duration_nights: 7,
    min_group_size: 10,
    image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80&fit=crop",
    original_price: 2799,
    price_per_person: 2099,
    tag: "25% OFF",
    max_installments: 12,
    includes: ["Ônibus executivo + refeições", "Hotel 4 estrelas", "City tour em ambas cidades", "Passeio de buggy nas dunas"],
  },
  {
    id: 0,
    title: "Serra Gaúcha Especial",
    destination: "Gramado + Canela, RS",
    duration_nights: 5,
    min_group_size: 2,
    image_url: "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=800&q=80&fit=crop",
    original_price: 2299,
    price_per_person: 1899,
    tag: "Lançamento",
    max_installments: 12,
    includes: ["Ônibus leito confortável", "Hotel boutique 4 estrelas", "Ingressos mini mundo + parques", "Café da manhã especial"],
  },
];

type PackageItem = {
  id: number;
  title: string;
  destination: string;
  duration_nights: number;
  min_group_size: number;
  image_url: string | null;
  original_price: number | null;
  price_per_person: number;
  tag: string | null;
  max_installments: number;
  includes: string[];
};

export default function FeaturedPackages() {
  const [packages, setPackages] = useState<PackageItem[]>([]);

  useEffect(() => {
    fetch(`${API}/trips/featured`)
      .then((r) => r.json())
      .then((data: Trip[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setPackages(data.slice(0, 3));
        } else {
          setPackages(FALLBACK);
        }
      })
      .catch(() => setPackages(FALLBACK));
  }, []);

  const displayed = packages.length > 0 ? packages : FALLBACK;

  return (
    <section id="pacotes" className="py-16 md:py-24 bg-gray-50">
      <div className="container-custom">
        <div className="text-center mb-12 md:mb-16">
          <div className="badge mb-4">Ofertas Exclusivas</div>
          <h2 className="section-title">
            Pacotes em <span className="text-gold-500">Destaque</span>
          </h2>
          <p className="section-subtitle">
            Ofertas exclusivas com o melhor custo-benefício. Aproveite antes que os lugares acabem!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {displayed.map((pkg, i) => (
            <div key={pkg.id || i} className="card flex flex-col">
              <div className="relative h-52 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pkg.image_url || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"}
                  alt={pkg.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {pkg.tag && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-gold-500 text-navy-900">
                    <Star size={11} fill="currentColor" />
                    {pkg.tag}
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-display font-black text-xl text-white">{pkg.title}</h3>
                  <div className="flex items-center gap-1.5 text-white/80 text-sm">
                    <MapPin size={12} />
                    {pkg.destination}
                  </div>
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-1.5 bg-navy-50 text-navy-600 text-xs font-medium px-3 py-1.5 rounded-full">
                    <Clock size={11} />
                    {pkg.duration_nights + 1} dias / {pkg.duration_nights} noites
                  </div>
                  <div className="flex items-center gap-1.5 bg-navy-50 text-navy-600 text-xs font-medium px-3 py-1.5 rounded-full">
                    <Users size={11} />
                    Mín. {pkg.min_group_size} {pkg.min_group_size === 1 ? "pessoa" : "pessoas"}
                  </div>
                </div>

                <ul className="space-y-2 mb-5 flex-1">
                  {pkg.includes.slice(0, 4).map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-gray-600 text-sm">
                      <Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      {pkg.original_price && (
                        <p className="text-xs text-gray-400 line-through">
                          R$ {pkg.original_price.toLocaleString("pt-BR")}
                        </p>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-gray-500">a partir de</span>
                        <span className="font-display font-black text-2xl text-navy-700">
                          R$ {pkg.price_per_person.toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-600 font-medium">
                        ou {pkg.max_installments}x de R${" "}
                        {Math.ceil(pkg.price_per_person / pkg.max_installments).toLocaleString("pt-BR")} sem juros
                      </p>
                    </div>
                    {pkg.original_price && (
                      <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg">
                        -{Math.round((1 - pkg.price_per_person / pkg.original_price) * 100)}% OFF
                      </div>
                    )}
                  </div>

                  {pkg.id ? (
                    <Link href={`/viagens/${pkg.id}`} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
                      Ver pacote completo
                      <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <a href="https://wa.me/5541998348766" target="_blank" rel="noopener noreferrer" className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
                      Reservar agora
                      <ArrowRight size={16} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          * Preços por pessoa, sujeitos à disponibilidade. Consulte condições de parcelamento.
        </p>
      </div>
    </section>
  );
}
