"use client";

import { Search, CreditCard, Plane } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Search,
    title: "Escolha seu Destino",
    description:
      "Navegue pelos nossos pacotes exclusivos e encontre o destino perfeito para você ou sua família. Filtros por preço, duração e tipo de viagem.",
    color: "bg-navy-600",
    accent: "text-gold-400",
  },
  {
    step: "02",
    icon: CreditCard,
    title: "Reserve com Segurança",
    description:
      "Faça sua reserva online de forma rápida e segura. Parcelamos em até 12x sem juros no cartão e aceitamos PIX com desconto especial.",
    color: "bg-gold-500",
    accent: "text-navy-700",
  },
  {
    step: "03",
    icon: Plane,
    title: "Aproveite a Viagem",
    description:
      "Receba todos os detalhes da sua viagem e embarque com tranquilidade. Nossa equipe acompanha você antes, durante e depois da viagem.",
    color: "bg-navy-600",
    accent: "text-gold-400",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="py-16 md:py-24 bg-white">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="badge mb-4">Simples assim</div>
          <h2 className="section-title">
            Como{" "}
            <span className="text-gold-500">Funciona</span>
          </h2>
          <p className="section-subtitle">
            Reservar sua viagem com a AJS é tão simples quanto 3 passos. Rápido,
            seguro e sem complicação.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-navy-600 via-gold-500 to-navy-600 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative z-10">
            {steps.map(({ step, icon: Icon, title, description, color, accent }) => (
              <div key={step} className="flex flex-col items-center text-center group">
                {/* Icon circle */}
                <div
                  className={`relative w-28 h-28 md:w-32 md:h-32 ${color} rounded-full flex items-center justify-center mb-6 shadow-card group-hover:shadow-card-hover transition-all duration-300 group-hover:-translate-y-2`}
                >
                  <Icon size={40} className={`${accent} transition-transform duration-300 group-hover:scale-110`} />

                  {/* Step number badge */}
                  <div className="absolute -top-2 -right-2 bg-white border-2 border-gray-100 text-navy-700 font-display font-black text-sm w-9 h-9 rounded-full flex items-center justify-center shadow-sm">
                    {step}
                  </div>
                </div>

                <h3 className="font-display font-black text-xl text-navy-700 mb-3">
                  {title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mt-14 md:mt-16 bg-hero-gradient rounded-2xl p-6 sm:p-8 md:p-12 text-center">
          <h3 className="font-display font-black text-xl sm:text-2xl md:text-3xl text-white mb-3">
            Pronto para começar?
          </h3>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Mais de 5.000 famílias já viajaram com a AJS Turismo. Junte-se a eles!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => document.querySelector("#pacotes")?.scrollIntoView({ behavior: "smooth" })}
              className="btn-primary py-3.5 px-8 inline-flex items-center justify-center gap-2"
            >
              Ver Pacotes Agora
            </button>
            <a
              href="https://wa.me/5541998348766?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20AJS%20Turismo%20e%20gostaria%20de%20falar%20com%20um%20especialista."
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary py-3.5 px-8 inline-flex items-center justify-center gap-2"
            >
              Falar com Especialista
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
