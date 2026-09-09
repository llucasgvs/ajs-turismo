"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package, Calendar, Users, ArrowRight, Loader2, AlertCircle, Check, Ticket, Percent,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiFetch, getUser } from "@/lib/api";
import { fmtBRL, erroDaApi } from "@/lib/format";
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
  image_url: string | null;
  duration_nights: number | null;
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
};

const FOTO_PADRAO =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80";

function dataLonga(iso: string): string {
  const [a, m, d] = iso.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${d} de ${meses[parseInt(m) - 1]} de ${a}`;
}

export default function ComboDetalheClient({ combo }: { combo: Combo }) {
  const router = useRouter();
  // template_id -> trip_id escolhido. Já nasce na primeira data de cada
  // roteiro: é a mais próxima, e o cliente só mexe no que quiser mudar.
  const [escolha, setEscolha] = useState<Record<number, number>>(() => {
    const inicial: Record<number, number> = {};
    for (const r of combo.roteiros) {
      if (r.datas.length) inicial[r.template_id] = r.datas[0].trip_id;
    }
    return inicial;
  });
  const [pessoas, setPessoas] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const pernas = useMemo(
    () =>
      combo.roteiros.map((r) => ({
        roteiro: r,
        data: r.datas.find((d) => d.trip_id === escolha[r.template_id]) ?? null,
      })),
    [combo.roteiros, escolha],
  );

  /* Quantas pessoas cabem: a MENOR vaga entre as datas escolhidas. O combo não
     pode ser vendido para mais gente do que cabe na viagem mais cheia, e
     descobrir isso só no fim, com a ficha preenchida, seria pior. */
  const vagaMinima = useMemo(() => {
    const vagas = pernas.map((p) => p.data?.available_spots ?? 0);
    return vagas.length ? Math.min(...vagas) : 0;
  }, [pernas]);

  const cheio = pernas.reduce((s, p) => s + (p.data?.price_per_person ?? 0) * pessoas, 0);
  const desconto = Math.round(cheio * combo.desconto_pct) / 100;
  const final = Math.round((cheio - desconto) * 100) / 100;
  const parcela = combo.max_installments > 1 ? final / combo.max_installments : null;
  const faltaData = pernas.some((p) => !p.data);

  const trocarPessoas = (n: number) => setPessoas(Math.max(1, Math.min(n, vagaMinima || 1)));

  const continuar = async () => {
    setErro("");
    if (faltaData) { setErro("Escolha a data de cada viagem."); return; }
    // Sem conta não dá para abrir o carrinho: a reserva é de alguém. Volta para
    // cá depois de entrar, com o que ele já escolheu preservado na URL.
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

  const capa = combo.roteiros.find((r) => r.image_url)?.image_url;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1">
        {/* Capa */}
        <div className="relative h-56 sm:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={capa ? imgOtim(capa, 1600, 85) : FOTO_PADRAO}
            alt={combo.nome}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/95 via-navy-900/60 to-navy-900/20" />
          <div className="relative h-full max-w-4xl mx-auto px-4 flex flex-col justify-end pb-6">
            <div className="flex gap-1.5 flex-wrap mb-2">
              <span className="inline-flex items-center gap-1 bg-gold-500 text-navy-900 text-xs font-bold px-2.5 py-1 rounded-full">
                <Package size={11} /> Combo
              </span>
              <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                -{combo.desconto_pct.toString().replace(".", ",")}%
              </span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-4xl text-white leading-tight drop-shadow">
              {combo.nome}
            </h1>
            <p className="text-white/80 text-sm mt-1">
              {combo.roteiros.length} viagens · você escolhe a data de cada uma
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* ── Escolha das datas ── */}
          <div className="space-y-4">
            {combo.descricao && (
              <p className="text-gray-600 text-sm leading-relaxed bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                {combo.descricao}
              </p>
            )}

            <div>
              <h2 className="font-display font-black text-navy-800 text-lg mb-1">
                Monte o seu combo
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Escolha quando quer fazer cada viagem. Todas entram na mesma compra.
              </p>

              <div className="space-y-3">
                {pernas.map(({ roteiro, data }, i) => (
                  <div
                    key={roteiro.template_id}
                    className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
                  >
                    <div className="flex gap-3 p-3.5">
                      <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-navy-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          loading="lazy"
                          src={roteiro.image_url ? imgOtim(roteiro.image_url, 200, 80) : FOTO_PADRAO}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-gold-600 uppercase tracking-wide">
                          Viagem {i + 1}
                        </p>
                        <p className="font-bold text-navy-800 leading-tight">{roteiro.title}</p>
                        {roteiro.slug && (
                          <Link
                            href={`/viagens/${roteiro.slug}`}
                            target="_blank"
                            className="text-xs text-navy-500 hover:text-gold-600 underline underline-offset-2"
                          >
                            ver detalhes da viagem
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="px-3.5 pb-3.5">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                        <Calendar size={11} className="inline mr-1 text-gold-500" /> Data
                      </label>
                      <select
                        value={escolha[roteiro.template_id] ?? ""}
                        onChange={(e) =>
                          setEscolha((a) => ({ ...a, [roteiro.template_id]: parseInt(e.target.value) }))
                        }
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold-300"
                      >
                        {roteiro.datas.map((d) => (
                          <option key={d.trip_id} value={d.trip_id}>
                            {dataLonga(d.departure_date)} · R$ {fmtBRL(d.price_per_person)}
                            {d.available_spots <= 5 ? ` · últimas ${d.available_spots} vagas` : ""}
                          </option>
                        ))}
                      </select>
                      {data && (
                        <p className="text-xs text-gray-400 mt-1.5">
                          {data.available_spots} {data.available_spots === 1 ? "vaga" : "vagas"} nesta data
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Viajantes */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                <Users size={11} className="inline mr-1 text-gold-500" /> Quantas pessoas
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => trocarPessoas(pessoas - 1)}
                  disabled={pessoas <= 1}
                  className="w-10 h-10 rounded-xl border border-gray-200 text-navy-700 font-bold hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  −
                </button>
                <span className="w-10 text-center font-display font-black text-xl text-navy-800 tabular-nums">
                  {pessoas}
                </span>
                <button
                  onClick={() => trocarPessoas(pessoas + 1)}
                  disabled={pessoas >= vagaMinima}
                  className="w-10 h-10 rounded-xl border border-gray-200 text-navy-700 font-bold hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  +
                </button>
                <span className="text-xs text-gray-400">
                  as mesmas pessoas nas {combo.roteiros.length} viagens
                </span>
              </div>
              {vagaMinima > 0 && pessoas >= vagaMinima && (
                <p className="text-xs text-gold-700 mt-2">
                  Uma das datas escolhidas tem {vagaMinima} {vagaMinima === 1 ? "vaga" : "vagas"}.
                  Para ir em mais gente, escolha outra data.
                </p>
              )}
            </div>
          </div>

          {/* ── Resumo ── */}
          <div className="lg:sticky lg:top-24 space-y-3">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-card p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                Seu combo
              </p>
              <ul className="space-y-2 mb-4">
                {pernas.map(({ roteiro, data }, i) => (
                  <li key={roteiro.template_id} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 w-4 h-4 mt-0.5 rounded-full bg-gold-100 text-gold-700 text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="text-navy-800 block truncate">{roteiro.title}</span>
                      {data && (
                        <span className="text-xs text-gray-400">
                          {dataLonga(data.departure_date)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>
                    {combo.roteiros.length} viagens × {pessoas}{" "}
                    {pessoas === 1 ? "pessoa" : "pessoas"}
                  </span>
                  <span className="tabular-nums">R$ {fmtBRL(cheio)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Percent size={12} /> desconto do combo
                  </span>
                  <span className="text-emerald-600 font-semibold tabular-nums">
                    − R$ {fmtBRL(desconto)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-2 border-t border-gray-100">
                  <span className="font-bold text-navy-800">Total</span>
                  <span className="font-display font-black text-2xl text-navy-800 tabular-nums">
                    R$ {fmtBRL(final)}
                  </span>
                </div>
                {parcela && (
                  <p className="text-xs text-gray-500 text-right">
                    ou {combo.max_installments}x de R$ {fmtBRL(parcela)} sem juros
                  </p>
                )}
              </div>

              {erro && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mt-3">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {erro}
                </div>
              )}

              <button
                onClick={continuar}
                disabled={enviando || faltaData}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-navy-900 font-bold py-3.5 rounded-xl transition-colors"
              >
                {enviando ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
                {enviando ? "Abrindo..." : "Continuar"}
              </button>
              <p className="text-[11px] text-gray-400 text-center mt-2">
                Você confere tudo antes de pagar.
              </p>
            </div>

            {/* O que o cliente ganha, em uma linha cada. */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
              {[
                [<Ticket key="t" size={13} />, "Um voucher para cada viagem"],
                [<Calendar key="c" size={13} />, "Datas escolhidas por você"],
                [<Check key="k" size={13} />, "Pagamento uma vez só"],
              ].map(([icone, texto], i) => (
                <p key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-emerald-500">{icone}</span>
                  {texto as string}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
