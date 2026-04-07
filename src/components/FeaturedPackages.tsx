"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Star, ArrowRight, Check, Calendar } from "lucide-react";
import { fmtBRL, fmtInstallment } from "@/lib/format";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PublicDate {
  id: number;
  departure_date: string;
  price_per_person: number;
  available_spots: number;
  status: string;
}

interface PublicTemplate {
  id: number;
  first_trip_id: number;
  title: string;
  destination: string;
  image_url: string | null;
  tag: string | null;
  is_featured: boolean;
  short_description: string | null;
  includes: string[];
  price_from: number;
  original_price_from: number | null;
  max_installments: number;
  dates: PublicDate[];
}

function fmtDate(d: string) {
  return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function FeaturedPackages() {
  const [packages, setPackages] = useState<PublicTemplate[]>([]);

  useEffect(() => {
    fetch(`${API}/templates/public`)
      .then((r) => r.json())
      .then((data: PublicTemplate[]) => {
        if (Array.isArray(data) && data.length > 0) {
          // Prioriza os em destaque, depois pega os 3 primeiros
          const sorted = [...data].sort((a, b) => {
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            return 0;
          });
          setPackages(sorted.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  if (packages.length === 0) return null;

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
          {packages.map((pkg) => {
            const discount = pkg.original_price_from
              ? Math.round((1 - pkg.price_from / pkg.original_price_from) * 100)
              : null;
            const nextDates = pkg.dates.filter((d) => d.status === "active").slice(0, 2);

            return (
              <Link key={pkg.id} href={`/viagens/${pkg.first_trip_id}`} className="card flex flex-col group cursor-pointer">
                {/* Image */}
                <div className="relative h-52 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pkg.image_url || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"}
                    alt={pkg.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {pkg.tag && (
                      <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-gold-500 text-navy-900">
                        <Star size={11} fill="currentColor" /> {pkg.tag}
                      </div>
                    )}
                    {discount && discount > 0 && (
                      <div className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500 text-white">
                        -{discount}% OFF
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="font-display font-black text-xl text-white">{pkg.title}</h3>
                    <div className="flex items-center gap-1.5 text-white/80 text-sm">
                      <MapPin size={12} /> {pkg.destination}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col flex-1">
                  {/* Includes */}
                  <ul className="space-y-2 mb-4 flex-1">
                    {pkg.includes.slice(0, 4).map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-gray-600 text-sm">
                        <Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" /> {item}
                      </li>
                    ))}
                  </ul>

                  {/* Próximas datas */}
                  {nextDates.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Próximas saídas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {nextDates.map((d) => (
                          <span key={d.id} className="inline-flex items-center gap-1 bg-navy-50 text-navy-700 text-xs font-medium px-2.5 py-1 rounded-full">
                            <Calendar size={9} /> {fmtDate(d.departure_date)}
                          </span>
                        ))}
                        {pkg.dates.filter((d) => d.status === "active").length > 2 && (
                          <span className="text-xs text-gold-600 font-semibold px-1 py-1">
                            +{pkg.dates.filter((d) => d.status === "active").length - 2} datas
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Price + CTA */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        {pkg.original_price_from && (
                          <p className="text-xs text-gray-400 line-through">
                            R$ {fmtBRL(pkg.original_price_from)}
                          </p>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-gray-500">a partir de</span>
                          <span className="font-display font-black text-2xl text-navy-700">
                            R$ {fmtBRL(pkg.price_from)}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-600 font-medium">
                          ou {pkg.max_installments}x de R${" "}
                          {fmtInstallment(pkg.price_from, pkg.max_installments)} sem juros
                        </p>
                      </div>
                      {discount && discount > 0 && (
                        <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg">
                          -{discount}% OFF
                        </div>
                      )}
                    </div>

                    <div className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
                      Ver pacote completo <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          * Preços por pessoa, sujeitos à disponibilidade. Consulte condições de parcelamento.
        </p>
      </div>
    </section>
  );
}
