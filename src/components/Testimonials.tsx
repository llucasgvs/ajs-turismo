"use client";

import { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Maria Silva",
    location: "São Paulo, SP",
    avatar: "MS",
    avatarColor: "bg-navy-600",
    trip: "Maceió, AL",
    rating: 5,
    text: "Viagem perfeita! O pacote incluía tudo e o atendimento foi excelente do início ao fim. O hotel era lindo e as piscinas naturais de Maceió são de tirar o fôlego. Com certeza vou contratar de novo!",
    date: "Março 2025",
  },
  {
    id: 2,
    name: "João Pereira",
    location: "Belo Horizonte, MG",
    avatar: "JP",
    avatarColor: "bg-gold-500",
    trip: "Gramado, RS",
    rating: 5,
    text: "Melhor viagem da vida! Levei minha família inteira e foi incrível. A AJS cuidou de tudo com muito profissionalismo. O ônibus era confortável e o hotel superou as expectativas. Recomendo sem hesitar!",
    date: "Fevereiro 2025",
  },
  {
    id: 3,
    name: "Ana Carolina",
    location: "Recife, PE",
    avatar: "AC",
    avatarColor: "bg-sky-dark",
    trip: "Rio de Janeiro, RJ",
    rating: 5,
    text: "Já é a terceira vez que viajo com a AJS e nunca decepcionou. O preço é justo, o serviço é impecável e os guias são ótimos. A experiência no Rio foi incrível, visitamos todos os pontos turísticos!",
    date: "Janeiro 2025",
  },
  {
    id: 4,
    name: "Carlos Mendes",
    location: "Brasília, DF",
    avatar: "CM",
    avatarColor: "bg-navy-700",
    trip: "Fortaleza + Natal",
    rating: 5,
    text: "Viagem do nordeste foi sensacional! O pacote completo valeu muito a pena. As dunas de Natal e as praias de Fortaleza são maravilhosas. A equipe da AJS foi prestativa em todos os momentos.",
    date: "Dezembro 2024",
  },
  {
    id: 5,
    name: "Fernanda Lima",
    location: "Curitiba, PR",
    avatar: "FL",
    avatarColor: "bg-gold-600",
    trip: "Bonito, MS",
    rating: 5,
    text: "Bonito é um paraíso e a AJS me proporcionou a experiência perfeita! O roteiro estava muito bem planejado, os passeios eram incríveis. Vale cada centavo! Já estou planejando a próxima viagem.",
    date: "Novembro 2024",
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");

  const prev = () => {
    setDirection("left");
    setCurrent((p) => (p === 0 ? testimonials.length - 1 : p - 1));
  };

  const next = () => {
    setDirection("right");
    setCurrent((p) => (p === testimonials.length - 1 ? 0 : p + 1));
  };

  const t = testimonials[current];

  return (
    <section id="depoimentos" className="py-16 md:py-24 bg-navy-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gold-500/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-navy-800/50 rounded-full translate-x-1/3 translate-y-1/3" />

      <div className="container-custom relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 bg-gold-500/20 border border-gold-400/30 text-gold-300 text-xs font-semibold px-4 py-2 rounded-full mb-4">
            <Star size={12} fill="currentColor" />
            Mais de 500 avaliações 5 estrelas
          </div>
          <h2 className="font-display font-black text-3xl md:text-4xl text-white mb-3">
            O Que Nossos{" "}
            <span className="text-gold-400">Clientes Dizem</span>
          </h2>
          <p className="text-white/60 max-w-xl mx-auto">
            Mais de 5.000 famílias já viajaram com a AJS. Veja o que elas falam sobre nós.
          </p>
        </div>

        {/* Main testimonial */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8 md:p-12 text-center relative">
            {/* Quote icon */}
            <div className="absolute top-6 left-6 text-gold-400/30">
              <Quote size={48} />
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-1 mb-6">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} size={20} fill="#F7A800" className="text-gold-400" />
              ))}
            </div>

            {/* Text */}
            <p className="text-white/90 text-base md:text-lg leading-relaxed mb-8 italic">
              &ldquo;{t.text}&rdquo;
            </p>

            {/* Author */}
            <div className="flex items-center justify-center gap-4">
              <div
                className={`w-12 h-12 ${t.avatarColor} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
              >
                {t.avatar}
              </div>
              <div className="text-left">
                <p className="text-white font-bold">{t.name}</p>
                <p className="text-white/50 text-xs sm:text-sm break-words">{t.location} · {t.trip} · {t.date}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-gold-500 text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current ? "w-8 bg-gold-400" : "w-2 bg-white/30"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-gold-500 text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Bottom avatars strip */}
        <div className="flex justify-center gap-3 mt-10">
          {testimonials.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setCurrent(i)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all duration-200 ${
                i === current
                  ? `${t.avatarColor} scale-125 ring-2 ring-gold-400 ring-offset-2 ring-offset-navy-700`
                  : `${t.avatarColor} opacity-40 hover:opacity-70`
              }`}
            >
              {t.avatar}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
