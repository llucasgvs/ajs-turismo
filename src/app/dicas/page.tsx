import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DICAS } from "@/conteudo/dicas";
import { imgOtim } from "@/lib/imagem";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ajsturismo.com.br";

export const metadata: Metadata = {
  title: { absolute: "Dicas de viagem saindo de Curitiba - AJS Turismo" },
  description: "Guias da AJS Turismo com dicas para cada destino: como chegar, o que ver, o que levar e a melhor época para ir.",
  alternates: { canonical: `${SITE}/dicas` },
};

export default function DicasPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      <Navbar />

      <section className="relative pt-20 overflow-hidden bg-navy-900">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, #C9A84C 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative container-custom py-12 md:py-16 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-500/30 text-gold-400 text-xs font-semibold px-4 py-2 rounded-full mb-5">
            <BookOpen size={12} /> Dicas de viagem
          </div>
          <h1 className="font-display font-black text-white text-4xl md:text-5xl leading-tight mb-4">
            Dicas para a sua <span className="text-gold-400">próxima viagem</span>
          </h1>
          <p className="text-navy-300 text-base md:text-lg max-w-xl">
            Como chegar, o que ver e o que levar em cada destino, por quem leva grupos saindo de Curitiba.
          </p>
        </div>
      </section>

      <main className="flex-1 container-custom px-4 py-10 md:py-14">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {DICAS.map((d) => (
            <Link key={d.slug} href={`/dicas/${d.slug}`}
              className="group bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
              <div className="aspect-[16/10] overflow-hidden bg-navy-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgOtim(d.capa.url, 640, 85)} alt={d.capa.alt} loading="lazy" decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-5">
                <h2 className="font-display font-black text-lg text-navy-900 mb-1.5">{d.titulo}</h2>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{d.subtitulo}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-600">
                  Ler as dicas <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
