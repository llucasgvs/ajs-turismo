"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Package, Calendar, Users, Check, Loader2, AlertCircle,
  Ticket, ArrowRight, Clock,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GalleryModal, PhotoGrid, ShareButton } from "@/components/viagem/Galeria";
import { apiFetch, getUser } from "@/lib/api";
import { fmtBRL, fmtInstallment, erroDaApi } from "@/lib/format";
import { imgOtim } from "@/lib/imagem";

type DataDoRoteiro = {
  trip_id: number;
  departure_date: string;
  price_per_person: number;
  available_spots: number;
};

type RoteiroDoCombo = {
  template_id: number;
  title: string;
  slug: string | null;
  destination: string | null;
  image_url: string | null;
  duration_nights: number | null;
  preco_desde: number | null;
  preco_tabela_desde: number | null;
  gallery: string[];
  datas: DataDoRoteiro[];
};

type Combo = {
  id: number;
  nome: string;
  slug: string;
  descricao: string | null;
  desconto_pct: number;
  max_installments: number;
  venda_fim: string | null;
  roteiros: RoteiroDoCombo[];
  preco_tabela_desde: number | null;
  preco_cheio_desde: number | null;
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function dataCurta(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d} de ${MESES[parseInt(m) - 1]}. de ${a}`;
}

/** Fotos dos N destinos, intercaladas.
 *
 *  Intercalar e não concatenar: com as fotos em blocos, o grande da esquerda e
 *  os quatro menores viriam todos da primeira viagem, e a página de um combo de
 *  três destinos pareceria a de uma viagem só. */
function galeriaDoCombo(roteiros: RoteiroDoCombo[]): string[] {
  const fotos: string[] = [];
  const listas = roteiros.map((r) => [r.image_url, ...(r.gallery ?? [])].filter(Boolean) as string[]);
  const maior = Math.max(0, ...listas.map((l) => l.length));
  for (let i = 0; i < maior; i++) {
    for (const l of listas) if (l[i]) fotos.push(l[i]);
  }
  return [...new Set(fotos)];
}

export default function ComboDetalheClient({ combo }: { combo: Combo }) {
  const router = useRouter();
  const [escolha, setEscolha] = useState<Record<number, number>>(() => {
    const inicial: Record<number, number> = {};
    for (const r of combo.roteiros) if (r.datas.length) inicial[r.template_id] = r.datas[0].trip_id;
    return inicial;
  });
  const [pessoas, setPessoas] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const [galeriaInicio, setGaleriaInicio] = useState(0);

  const fotos = useMemo(() => galeriaDoCombo(combo.roteiros), [combo.roteiros]);
  const abrirGaleria = (i: number) => { setGaleriaInicio(i); setGaleriaAberta(true); };

  const pernas = useMemo(
    () => combo.roteiros.map((r) => ({
      roteiro: r,
      data: r.datas.find((d) => d.trip_id === escolha[r.template_id]) ?? null,
    })),
    [combo.roteiros, escolha],
  );

  /* Cabem tantas pessoas quanto a MENOR vaga entre as datas escolhidas: o combo
     não pode ser vendido para mais gente do que cabe na viagem mais cheia. */
  const vagaMinima = useMemo(() => {
    const vagas = pernas.map((p) => p.data?.available_spots ?? 0);
    return vagas.length ? Math.min(...vagas) : 0;
  }, [pernas]);

  const cheio = pernas.reduce((s, p) => s + (p.data?.price_per_person ?? 0) * pessoas, 0);
  const desconto = Math.round(cheio * combo.desconto_pct) / 100;
  const final = Math.round((cheio - desconto) * 100) / 100;
  const faltaData = pernas.some((p) => !p.data);
  const proxima = pernas
    .map((p) => p.data?.departure_date)
    .filter(Boolean)
    .sort()[0] as string | undefined;

  const continuar = async () => {
    setErro("");
    if (faltaData) { setErro("Escolha a data de cada viagem."); return; }
    if (!getUser()) {
      router.push(`/login?redirect=${encodeURIComponent(`/combos/${combo.slug}`)}`);
      return;
    }
    setEnviando(true);
    try {
      const res = await apiFetch("/combos/checkout", {
        method: "POST",
        body: JSON.stringify({
          combo_id: combo.id,
          pernas: pernas.map((p) => ({ trip_id: p.data!.trip_id })),
          num_travelers: pessoas,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setErro(erroDaApi(d, "Não foi possível abrir a reserva.")); return; }
      router.push(`/reservar/combo/${d.combo_grupo}`);
    } catch {
      setErro("Erro de conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  /* O resumo do preço aparece na lateral no desktop e na barra fixa no celular,
     então mora aqui em vez de duplicado nos dois. */
  const Resumo = ({ compacto = false }: { compacto?: boolean }) => (
    <>
      <p className="text-xs text-gray-400 mb-0.5">
        as {combo.roteiros.length} viagens, {pessoas === 1 ? "1 pessoa" : `${pessoas} pessoas`}
      </p>
      <div className="flex items-end gap-2 mb-0.5">
        {desconto > 0 && (
          <span className="text-sm text-gray-400 line-through leading-none mb-0.5">R$ {fmtBRL(cheio)}</span>
        )}
        <span className={`font-display font-black text-navy-700 leading-tight ${compacto ? "text-2xl" : "text-4xl"}`}>
          R$ {fmtBRL(final)}
        </span>
      </div>
      {combo.max_installments > 1 && (
        <p className="text-xs text-emerald-600 font-semibold">
          {combo.max_installments}x de R$ {fmtInstallment(final, combo.max_installments)} sem juros
        </p>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-clip">
      <div className="hidden lg:block"><Navbar /></div>

      {galeriaAberta && fotos.length > 0 && (
        <GalleryModal images={fotos} startIndex={galeriaInicio} onClose={() => setGaleriaAberta(false)} />
      )}

      <div className="flex-1 pb-24 lg:pb-0">
        {/* Barra do celular: voltar e compartilhar, igual à da viagem */}
        <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push("/viagens")}
              className="flex items-center gap-1.5 text-gray-600 hover:text-navy-700 text-sm font-medium transition-colors">
              <ArrowLeft size={16} /> Voltar
            </button>
            <ShareButton title={combo.nome} />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-6 pb-8 w-full">
          {/* Título */}
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 bg-gold-500 text-navy-900 text-xs font-bold px-3 py-1 rounded-full">
                <Package size={10} /> Combo
              </span>
              <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                -{combo.desconto_pct.toString().replace(".", ",")}% OFF
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-navy-900 leading-tight">
                {combo.nome}
              </h1>
              <div className="hidden lg:block flex-shrink-0 mt-1"><ShareButton title={combo.nome} /></div>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1.5">
              <MapPin size={14} className="text-gold-500" />
              {combo.roteiros.map((r) => r.destination || r.title).join(" · ")}
            </div>
          </div>

          <div className="mb-6">
            <PhotoGrid images={fotos} onOpen={abrirGaleria} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Coluna principal ── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Faixa de informação, como a da viagem */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
                  {[
                    [<Package key="p" size={13} />, "Viagens", `${combo.roteiros.length} no pacote`],
                    [<Calendar key="c" size={13} />, "Primeira saída", proxima ? dataCurta(proxima) : "-"],
                    [<Ticket key="t" size={13} />, "Vouchers", `${combo.roteiros.length}, um por viagem`],
                    [<Clock key="k" size={13} />, "Pagamento", "uma vez só"],
                  ].map(([icone, rotulo, valor], i) => (
                    <div key={i} className="p-4">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide flex items-center gap-1">
                        <span className="text-gold-500">{icone}</span> {rotulo as string}
                      </p>
                      <p className="text-sm font-bold text-navy-800 mt-0.5">{valor as string}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escolha das datas: o coração da página */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="font-display font-black text-navy-800 text-lg mb-1">Escolha suas datas</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Uma data para cada viagem. Todas entram na mesma compra.
                </p>

                <div className="space-y-3">
                  {pernas.map(({ roteiro, data }, i) => {
                    const cheioR = roteiro.preco_tabela_desde ?? roteiro.preco_desde;
                    return (
                      <div key={roteiro.template_id} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="flex gap-3 p-3">
                          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-navy-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img loading="lazy" decoding="async"
                              src={roteiro.image_url ? imgOtim(roteiro.image_url, 200, 80) : ""}
                              alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-gold-600 uppercase tracking-wide">
                              Viagem {i + 1}
                            </p>
                            <p className="font-bold text-navy-800 leading-tight truncate">{roteiro.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {data && cheioR != null && cheioR > data.price_per_person * (1 - combo.desconto_pct / 100) && (
                                <span className="text-xs text-gray-400 line-through">R$ {fmtBRL(cheioR)}</span>
                              )}
                              {data && (
                                <span className="text-sm font-bold text-gold-600">
                                  R$ {fmtBRL(data.price_per_person * (1 - combo.desconto_pct / 100))}
                                </span>
                              )}
                              {roteiro.slug && (
                                <Link href={`/viagens/${roteiro.slug}`} target="_blank"
                                  className="text-xs text-navy-500 hover:text-gold-600 underline underline-offset-2">
                                  detalhes
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="px-3 pb-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {roteiro.datas.map((d) => {
                              const ativa = escolha[roteiro.template_id] === d.trip_id;
                              return (
                                <button
                                  key={d.trip_id}
                                  onClick={() => setEscolha((a) => ({ ...a, [roteiro.template_id]: d.trip_id }))}
                                  className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                                    ativa
                                      ? "border-gold-400 bg-gold-50"
                                      : "border-gray-200 bg-white hover:border-gold-300"
                                  }`}
                                >
                                  <span className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-navy-800">
                                      {dataCurta(d.departure_date)}
                                    </span>
                                    {ativa && <Check size={14} className="text-gold-600 flex-shrink-0" />}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    R$ {fmtBRL(d.price_per_person)}
                                    {d.available_spots <= 5 && (
                                      <span className="text-orange-500 font-semibold">
                                        {" "}· últimas {d.available_spots}
                                      </span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Viajantes */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="font-display font-black text-navy-800 text-lg mb-1">Quantas pessoas</h2>
                <p className="text-sm text-gray-500 mb-4">
                  As mesmas pessoas viajam nas {combo.roteiros.length} viagens.
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setPessoas((n) => Math.max(1, n - 1))} disabled={pessoas <= 1}
                    className="w-11 h-11 rounded-xl border border-gray-200 text-navy-700 font-bold text-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    −
                  </button>
                  <span className="w-12 text-center font-display font-black text-2xl text-navy-800 tabular-nums">
                    {pessoas}
                  </span>
                  <button onClick={() => setPessoas((n) => Math.min(vagaMinima || 1, n + 1))}
                    disabled={pessoas >= vagaMinima}
                    className="w-11 h-11 rounded-xl border border-gray-200 text-navy-700 font-bold text-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    +
                  </button>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Users size={12} /> cabem {vagaMinima} neste combo
                  </span>
                </div>
              </div>

              {/* Sobre */}
              {combo.descricao && (
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h2 className="font-display font-black text-navy-800 text-lg mb-2">Sobre o combo</h2>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{combo.descricao}</p>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="font-display font-black text-navy-800 text-lg mb-3">Como funciona</h2>
                <ul className="space-y-2.5">
                  {[
                    `Você escolhe a data de cada uma das ${combo.roteiros.length} viagens.`,
                    "Paga uma vez só, com o desconto do combo já aplicado.",
                    "Recebe um voucher por viagem, com o embarque e os documentos daquele dia.",
                    "Cada viagem acontece na data dela, como qualquer outra.",
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <Check size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Lateral ── */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-20 space-y-3">
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="p-5 pb-4">
                    <Resumo />
                    {desconto > 0 && (
                      <div className="mt-2 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg text-center border border-emerald-100">
                        Você economiza R$ {fmtBRL(desconto)}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {pernas.map(({ roteiro, data }, i) => (
                      <div key={roteiro.template_id} className="px-5 py-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Viagem {i + 1}</p>
                        <p className="text-sm font-semibold text-navy-800 truncate">{roteiro.title}</p>
                        <p className="text-xs text-gray-500">
                          {data ? dataCurta(data.departure_date) : "escolha a data"}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="p-5 pt-4">
                    {erro && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-3">
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        {erro}
                      </div>
                    )}
                    <button onClick={continuar} disabled={enviando || faltaData}
                      className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-navy-900 font-bold py-4 rounded-xl transition-colors text-lg">
                      {enviando ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                      {enviando ? "Abrindo..." : "Reservar agora"}
                    </button>
                    <p className="text-[11px] text-gray-400 text-center mt-2">
                      Você confere tudo antes de pagar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra fixa do celular, como na página de viagem */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-4 shadow-2xl">
        <div className="flex-1 min-w-0"><Resumo compacto /></div>
        <button onClick={continuar} disabled={enviando || faltaData}
          className="flex-shrink-0 bg-gold-500 hover:bg-gold-400 active:scale-95 disabled:opacity-50 text-navy-900 font-bold px-5 py-3.5 rounded-xl text-sm transition-[transform,background-color]">
          {enviando ? <Loader2 size={16} className="animate-spin" /> : "Reservar agora"}
        </button>
      </div>

      <div className="hidden lg:block"><Footer /></div>
    </div>
  );
}
