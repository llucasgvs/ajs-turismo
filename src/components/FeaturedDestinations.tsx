"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { fmtBRL } from "@/lib/format";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PublicTemplate {
  id: number;
  first_trip_id: number;
  title: string;
  destination: string;
  image_url: string | null;
  tag: string | null;
  is_featured: boolean;
  short_description: string | null;
  price_from: number;
}

export default function FeaturedDestinations() {
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);

  useEffect(() => {
    fetch(`${API}/templates/public`)
      .then((r) => r.json())
      .then((data: PublicTemplate[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const sorted = [...data].sort((a, b) => {
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            return 0;
          });
          setTemplates(sorted.slice(0, 6));
        }
      })
      .catch(() => {});
  }, []);

  if (templates.length === 0) return null;

  return (
    <section id="destinos" className="py-16 md:py-24 bg-gray-50">
      <div className="container-custom">
        <div className="text-center mb-10 md:mb-14">
          <div className="badge mb-4">Destinos</div>
          <h2 className="section-title">
            Destinos que Você <span className="text-gold-500">Vai Amar</span>
          </h2>
          <p className="section-subtitle">
            Explore os melhores destinos nacionais e internacionais selecionados pela nossa equipe com os
            melhores preços e condições do mercado.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {templates.map((tmpl) => (
            <Link
              key={tmpl.id}
              href={`/viagens/${tmpl.first_trip_id}`}
              className="card group cursor-pointer block"
            >
              <div className="relative h-52 sm:h-56 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tmpl.image_url || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"}
                  alt={tmpl.destination}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-card-gradient" />

                {tmpl.tag && (
                  <div className="absolute top-3 left-3">
                    <span className="badge">{tmpl.tag}</span>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-1.5 text-white">
                    <MapPin size={14} className="text-gold-400 flex-shrink-0" />
                    <span className="font-display font-bold text-lg leading-tight">{tmpl.destination}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-5">
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  {tmpl.short_description || tmpl.title}
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">A partir de</p>
                    <p className="text-navy-600 font-black text-xl">
                      R$ {fmtBRL(tmpl.price_from)}
                      <span className="text-gray-400 font-normal text-xs">/pessoa</span>
                    </p>
                  </div>

                  <span className="flex items-center gap-1.5 text-navy-600 group-hover:text-gold-500 font-semibold text-sm transition-colors">
                    Ver pacote
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
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
