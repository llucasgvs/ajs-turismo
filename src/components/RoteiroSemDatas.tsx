"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Check, X, ChevronLeft, CalendarClock, FileText, Bus } from "lucide-react";
import Footer from "@/components/Footer";

const WA_NUMBER = "5541998348766";

export type RoteiroPublic = {
  id: number;
  slug: string | null;
  title: string;
  destination: string;
  description: string;
  short_description: string | null;
  image_url: string | null;
  gallery: string[];
  duration_nights: number;
  includes: string[];
  excludes: string[];
  itinerary: { title?: string; items?: string[]; description?: string }[];
  departure_locations: string[];
  required_documents: string | null;
  category: string;
  tag: string | null;
};

/**
 * Roteiro ativo, mas sem data aberta. A página continua existindo (e indexada)
 * para captar quem procura o destino fora de temporada; a única ação é o WhatsApp.
 */
export default function RoteiroSemDatas({ roteiro }: { roteiro: RoteiroPublic }) {
  const [imgErro, setImgErro] = useState(false);
  const capa = !imgErro && roteiro.image_url ? roteiro.image_url : null;

  const msg = encodeURIComponent(
    `Olá! Tenho interesse no roteiro *${roteiro.title}*. Quando abrem as próximas saídas?`
  );
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${msg}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Capa */}
      <div className="relative h-[38vh] min-h-[240px] sm:h-[46vh] bg-navy-800">
        {capa && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capa}
            alt={roteiro.title}
            onError={() => setImgErro(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/40 to-navy-900/30" />

        <Link
          href="/viagens"
          className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-navy-800 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-white transition-colors"
        >
          <ChevronLeft size={15} /> Viagens
        </Link>

        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <div className="max-w-5xl mx-auto">
            <span className="inline-block bg-gold-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full mb-2">
              Próximas saídas em breve
            </span>
            <h1 className="font-display font-black text-white text-2xl sm:text-4xl leading-tight text-balance">
              {roteiro.title}
            </h1>
            <p className="flex items-center gap-1.5 text-white/85 text-sm mt-1.5">
              <MapPin size={14} /> {roteiro.destination}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Conteúdo */}
        <div className="lg:col-span-2 space-y-5">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <h2 className="font-display font-black text-navy-800 text-lg mb-2">Sobre o roteiro</h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
              {roteiro.description}
            </p>
          </section>

          {roteiro.includes.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <h2 className="font-display font-black text-navy-800 text-lg mb-3">O que inclui</h2>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {roteiro.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {roteiro.excludes.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <h2 className="font-display font-black text-navy-800 text-lg mb-3">O que não inclui</h2>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {roteiro.excludes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <X size={15} className="text-gray-300 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {roteiro.itinerary.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <h2 className="font-display font-black text-navy-800 text-lg mb-3">Roteiro</h2>
              <div className="space-y-4">
                {roteiro.itinerary.map((sec, i) => (
                  <div key={i}>
                    {sec.title && (
                      <p className="font-bold text-navy-700 text-sm mb-1.5">{sec.title}</p>
                    )}
                    {sec.description && (
                      <p className="text-sm text-gray-600 leading-relaxed">{sec.description}</p>
                    )}
                    {sec.items && sec.items.length > 0 && (
                      <ul className="space-y-1">
                        {sec.items.map((it, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="w-1 h-1 rounded-full bg-gold-500 mt-2 flex-shrink-0" />
                            {it}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {roteiro.departure_locations.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <h2 className="font-display font-black text-navy-800 text-lg mb-3 flex items-center gap-2">
                <Bus size={17} className="text-navy-400" /> Pontos de embarque
              </h2>
              <ul className="space-y-1.5">
                {roteiro.departure_locations.map((loc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin size={14} className="text-gold-500 mt-0.5 flex-shrink-0" /> {loc}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {roteiro.required_documents && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <h2 className="font-display font-black text-navy-800 text-lg mb-3 flex items-center gap-2">
                <FileText size={17} className="text-navy-400" /> Documentos necessários
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {roteiro.required_documents}
              </p>
            </section>
          )}
        </div>

        {/* CTA */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 text-navy-700 mb-2">
              <CalendarClock size={18} className="text-gold-500" />
              <p className="font-display font-black text-lg leading-tight">
                Próximas saídas ainda não abertas
              </p>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Este roteiro está entre temporadas. Fale com a nossa equipe para saber quando abrem as
              próximas datas e garantir sua vaga antes de todo mundo.
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3.5 rounded-xl transition-colors"
            >
              Consultar datas no WhatsApp
            </a>
            <Link
              href="/viagens"
              className="w-full mt-2 flex items-center justify-center gap-1.5 border border-gray-200 text-navy-700 hover:bg-gray-50 font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              Ver viagens com data aberta
            </Link>
          </div>
        </aside>
      </div>

      <Footer />
    </div>
  );
}
