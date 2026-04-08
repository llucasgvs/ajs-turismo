"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Star, Users, ArrowRight, ChevronDown } from "lucide-react";

const heroSlides = [
  {
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=85&fit=crop",
    title: "Maceió",
    subtitle: "Praias de água cristalina"
  },
  {
    image: "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1920&q=85&fit=crop",
    title: "Rio de Janeiro",
    subtitle: "A cidade maravilhosa"
  },
  {
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=85&fit=crop",
    title: "Fernando de Noronha",
    subtitle: "Paraíso preservado"
  },
];

const stats = [
  { icon: Users, value: "16.000+", label: "Clientes felizes" },
  { icon: MapPin, value: "80+", label: "Destinos disponíveis" },
  { icon: Star, value: "4.9", label: "Avaliação média" },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Background slides */}
      {heroSlides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-900/80 via-navy-800/60 to-navy-900/90" />
        </div>
      ))}

      {/* Decorative overlay pattern */}
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='2' fill='%23ffffff'/%3E%3C/svg%3E")`
      }} />

      {/* Content */}
      <div className="relative z-10 container-custom pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2 bg-gold-500/20 border border-gold-400/30 text-gold-300 text-xs md:text-sm font-semibold px-4 py-2 rounded-full mb-6 transition-all duration-700 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Star size={12} fill="currentColor" />
            Agência de viagens com mais de 10 anos de experiência
          </div>

          {/* Main headline */}
          <h1
            className={`font-display font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.05] mb-6 transition-all duration-700 delay-100 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Cada Viagem{" "}
            <span className="text-gold-400 relative">
              Um Novo Mundo
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path d="M2 8C50 4 100 2 150 6C200 10 250 8 298 5" stroke="#F7A800" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </span>
            {" "}a Descobrir
          </h1>

          {/* Sub headline */}
          <p
            className={`text-white/80 text-base md:text-xl mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Pacotes de viagem incríveis com o melhor custo-benefício do Brasil.
            Destinos nacionais e internacionais, atendimento personalizado e muito mais.
          </p>

          {/* CTAs */}
          <div
            className={`flex flex-col sm:flex-row gap-3 justify-center mb-12 md:mb-16 transition-all duration-700 delay-300 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Link
              href="/viagens"
              className="btn-primary flex items-center justify-center gap-2 py-4 px-8 text-base"
            >
              Ver Viagens Disponíveis
              <ArrowRight size={18} />
            </Link>
            <a
              href="https://wa.me/5541998348766?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20AJS%20Turismo%20e%20gostaria%20de%20saber%20mais%20sobre%20os%20pacotes%20de%20viagem."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 text-base hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Falar no WhatsApp
            </a>
          </div>

          {/* Stats */}
          <div
            className={`flex flex-row justify-center gap-4 md:gap-8 transition-all duration-700 delay-[400ms] ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-gold-400 mb-1">
                  <Icon size={16} />
                  <span className="font-display font-black text-xl md:text-2xl text-white">{value}</span>
                </div>
                <p className="text-white/60 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentSlide ? "w-8 bg-gold-400" : "w-2 bg-white/40"
            }`}
          />
        ))}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={() => document.querySelector("#destinos")?.scrollIntoView({ behavior: "smooth" })}
          className="flex flex-col items-center gap-1 text-white/50 hover:text-gold-400 transition-colors animate-bounce-slow"
        >
          <span className="text-xs">Explore</span>
          <ChevronDown size={20} />
        </button>
      </div>
    </section>
  );
}
