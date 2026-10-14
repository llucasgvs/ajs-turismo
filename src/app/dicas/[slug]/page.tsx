import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, ChevronRight, ListOrdered, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PerguntasFrequentes from "@/components/viagem/PerguntasFrequentes";
import { DICAS, dicaPorSlug, ancora } from "@/conteudo/dicas";
import { imgOtim, imgOg } from "@/lib/imagem";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ajsturismo.com.br";

export const dynamicParams = false;

export function generateStaticParams() {
  return DICAS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = dicaPorSlug(slug);
  if (!d) return {};
  const url = `${SITE}/dicas/${d.slug}`;
  const og = imgOg(d.capa.url, SITE);
  const imagens = og ? [{ url: og, width: 1200, height: 630, alt: d.capa.alt }] : undefined;
  return {
    title: { absolute: `${d.tituloGoogle} - AJS Turismo` },
    description: d.descricaoGoogle,
    alternates: { canonical: url },
    openGraph: {
      title: d.tituloGoogle, description: d.descricaoGoogle, url, siteName: "AJS Turismo",
      type: "article", locale: "pt_BR", images: imagens,
    },
    twitter: { card: "summary_large_image", title: d.tituloGoogle, description: d.descricaoGoogle, images: og ? [og] : undefined },
  };
}

/** O botão "Ver datas e preços" leva ao primeiro roteiro do destino que está
 *  no ar. Se nenhum estiver, leva à lista de viagens: o guia nunca aponta para
 *  uma página que não existe. */
async function destinoDoBotao(roteiros: string[]): Promise<string> {
  for (const slug of roteiros) {
    try {
      const r = await fetch(`${API}/templates/by-slug/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
      if (r.ok) return `/viagens/${slug}`;
    } catch {
      // Tenta o próximo.
    }
  }
  return "/viagens";
}

export default async function DicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = dicaPorSlug(slug);
  if (!d) notFound();
  const linkViagem = await destinoDoBotao(d.roteiros);
  const url = `${SITE}/dicas/${d.slug}`;

  // Artigo e trilha para o Google. As datas ficam só aqui, fora da tela: data
  // à vista faz o guia parecer velho com o tempo.
  const artigo = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: d.tituloGoogle,
    description: d.descricaoGoogle,
    image: [d.capa.url, ...d.secoes.flatMap((s) => (s.foto ? [s.foto.url] : []))],
    datePublished: d.escritoEm,
    dateModified: d.atualizadoEm,
    author: { "@type": "Organization", name: "AJS Turismo", url: SITE },
    publisher: { "@type": "Organization", name: "AJS Turismo", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/icon_ajs.png` } },
    mainEntityOfPage: url,
    about: { "@type": "TouristDestination", name: d.destino },
  };
  const trilha = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE },
      { "@type": "ListItem", position: 2, name: "Dicas de viagem", item: `${SITE}/dicas` },
      { "@type": "ListItem", position: 3, name: d.destino, item: url },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(artigo) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(trilha) }} />
      <Navbar />

      <section className="relative pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-navy-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgOtim(d.capa.url, 1920, 85)} alt="" fetchPriority="high" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-900/60 via-navy-900/70 to-navy-900" />
        </div>
        <div className="relative container-custom py-12 md:py-20 text-center flex flex-col items-center">
          <nav aria-label="Você está em" className="flex items-center gap-1 text-xs text-navy-300 mb-5">
            <Link href="/" className="hover:text-gold-400 transition-colors">Início</Link>
            <ChevronRight size={12} />
            <Link href="/dicas" className="hover:text-gold-400 transition-colors">Dicas de viagem</Link>
          </nav>
          <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-500/30 text-gold-400 text-xs font-semibold px-4 py-2 rounded-full mb-5">
            <BookOpen size={12} /> Dicas de viagem
          </div>
          <h1 className="font-display font-black text-white text-4xl md:text-6xl leading-tight mb-4">{d.titulo}</h1>
          <p className="text-navy-200 text-base md:text-lg max-w-2xl">{d.subtitulo}</p>
        </div>
      </section>

      <main className="flex-1 container-custom px-4 py-10 md:py-14">
        <article className="max-w-3xl mx-auto space-y-10">
          <p className="flex items-center gap-2 text-sm text-gray-500 -mb-4">
            <Users size={15} className="text-gold-500 flex-shrink-0" />
            <span>Dicas escritas pela equipe da <strong className="text-navy-700 font-semibold">AJS Turismo</strong>, que leva grupos à {d.destino} saindo de Curitiba.</span>
          </p>

          <p className="bg-white rounded-2xl shadow-sm border-l-4 border-gold-500 p-5 sm:p-6 text-gray-700 leading-relaxed text-[15px] sm:text-base">
            {d.resumo}
          </p>

          {/* Sumário: atalho para cada parte. O Google às vezes mostra esses
              atalhos no próprio resultado da busca. */}
          <nav aria-labelledby="neste-guia" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <p id="neste-guia" className="font-display font-black text-navy-900 flex items-center gap-2 mb-3">
              <ListOrdered size={18} className="text-gold-500" /> Neste guia
            </p>
            <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[15px]">
              {[...d.secoes.map((s) => s.titulo), "Perguntas frequentes"].map((t, i) => (
                <li key={t}>
                  <a href={`#${t === "Perguntas frequentes" ? "perguntas-frequentes" : ancora(t)}`}
                    className="flex gap-2 text-navy-700 hover:text-gold-600 transition-colors">
                    <span className="text-gold-500 font-semibold tabular-nums">{i + 1}.</span> {t}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {d.secoes.map((s) => (
            <section key={s.titulo} id={ancora(s.titulo)} className="space-y-4 scroll-mt-24">
              <h2 className="font-display font-black text-2xl sm:text-[28px] text-navy-900 leading-tight">{s.titulo}</h2>
              {s.paragrafos.map((p) => (
                <p key={p} className="text-gray-700 leading-relaxed">{p}</p>
              ))}
              {s.lista && (
                <ul className="space-y-2.5">
                  {s.lista.map((item) => {
                    // "Nome: explicação" vira nome em negrito.
                    const i = item.indexOf(": ");
                    return (
                      <li key={item} className="flex gap-3 text-gray-700 leading-relaxed">
                        <span className="text-gold-500 mt-0.5">•</span>
                        <span>
                          {i > 0 && i < 50
                            ? <><strong className="text-navy-800">{item.slice(0, i)}:</strong>{item.slice(i + 1)}</>
                            : item}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {s.experiencia && (
                <div className="flex gap-3 bg-gold-50 border border-gold-200 rounded-2xl p-4 sm:p-5">
                  <Users size={20} className="text-gold-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-navy-800 text-sm mb-1">Como fazemos com o grupo</p>
                    <p className="text-gray-700 leading-relaxed text-[15px]">{s.experiencia}</p>
                  </div>
                </div>
              )}
              {s.foto && (
                <figure className={`pt-2 ${s.foto.vertical ? "max-w-sm mx-auto" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgOtim(s.foto.url, 1200, 90)} alt={s.foto.alt} loading="lazy" decoding="async"
                    style={s.foto.enquadramento ? { objectPosition: s.foto.enquadramento } : undefined}
                    className={`w-full rounded-2xl shadow-sm object-cover ${s.foto.vertical ? "aspect-[4/5]" : "aspect-[16/10]"}`} />
                  {s.foto.legenda && (
                    <figcaption className="text-center text-sm text-gray-500 mt-2.5">{s.foto.legenda}</figcaption>
                  )}
                </figure>
              )}
            </section>
          ))}

          <PerguntasFrequentes perguntas={d.perguntas} />

          <aside className="bg-navy-900 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, #C9A84C 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="relative">
              <p className="font-display font-black text-white text-xl sm:text-2xl mb-2">Quer conhecer a {d.destino} com a AJS?</p>
              <p className="text-navy-300 text-sm sm:text-base mb-5">Saída de Curitiba, com tudo organizado para você só aproveitar.</p>
              <Link href={linkViagem}
                className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold px-6 py-3 rounded-xl transition-colors">
                Ver datas e preços <ArrowRight size={16} />
              </Link>
            </div>
          </aside>
        </article>
      </main>

      <Footer />
    </div>
  );
}
