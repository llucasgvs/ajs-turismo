import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { fmtBRL } from "@/lib/format";
import { imgOtim } from "@/lib/imagem";

interface PublicTemplate {
  id: number;
  first_trip_id: number;
  slug?: string | null;
  title: string;
  destination: string;
  image_url: string | null;
  tag: string | null;
  is_featured: boolean;
  quote_only?: boolean;
  short_description: string | null;
  price_from: number;
  /** Preço "de", quando a data tem promoção. Sem ele não há desconto a mostrar. */
  original_price_from?: number | null;
}

export default function FeaturedDestinations({ templates: raw }: { templates: PublicTemplate[] }) {
  const templates = [...raw]
    .sort((a, b) => (a.is_featured === b.is_featured ? 0 : a.is_featured ? -1 : 1))
    .slice(0, 6);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 stagger-in">
          {templates.map((tmpl) => {
            // `round` e não `floor`, pelo mesmo cálculo de `FeaturedPackages` e
            // da lista de viagens. Arredondar para baixo parecia mais honesto,
            // mas 216/240 dá 0,8999... em ponto flutuante e um desconto exato de
            // 10% virava "-9% OFF" - menor do que é, e diferente do que a mesma
            // viagem mostra em /viagens. Site que se contradiz custa confiança.
            const desconto = tmpl.original_price_from && tmpl.original_price_from > tmpl.price_from
              ? Math.round((1 - tmpl.price_from / tmpl.original_price_from) * 100)
              : 0;
            return (
            <Link
              key={tmpl.id}
              href={`/viagens/${tmpl.slug ?? tmpl.first_trip_id}`}
              className="card group cursor-pointer block"
            >
              <div className="relative h-52 sm:h-56 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async"
                  src={tmpl.image_url ? imgOtim(tmpl.image_url, 828, 85) : "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"}
                  alt={tmpl.destination}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-card-gradient" />

                {tmpl.tag && (
                  <div className="absolute top-3 left-3">
                    <span className="badge">{tmpl.tag}</span>
                  </div>
                )}

                {/* Desconto: mesmo selo verde de `FeaturedPackages` e da lista de
                    viagens, para o cliente reconhecer a promoção em qualquer
                    tela. Fica à direita porque a tag já ocupa a esquerda.
                    Só aparece quando a DATA tem preço "de" cadastrado. */}
                {desconto > 0 && (
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500 text-white">
                      -{desconto}% OFF
                    </span>
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
                    {tmpl.quote_only ? (
                      <>
                        <p className="text-xs text-gray-400 mb-0.5">Valor</p>
                        <p className="text-navy-600 font-black text-xl">Sob consulta</p>
                      </>
                    ) : (
                      <>
                        {/* O "de" riscado é o que dá tamanho ao desconto: o selo
                            diz o percentual, esta linha mostra quanto economiza. */}
                        {desconto > 0 && (
                          <p className="text-xs text-gray-400 line-through leading-none mb-0.5">
                            R$ {fmtBRL(tmpl.original_price_from as number)}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mb-0.5">A partir de</p>
                        <p className="text-navy-600 font-black text-xl">
                          R$ {fmtBRL(tmpl.price_from)}
                          <span className="text-gray-400 font-normal text-xs">/pessoa</span>
                        </p>
                      </>
                    )}
                  </div>

                  <span className="flex items-center gap-1.5 text-navy-600 group-hover:text-gold-500 font-semibold text-sm transition-colors">
                    Ver pacote
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
            );
          })}
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
