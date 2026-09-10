"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Package, Users, Check, Loader2, AlertCircle,
  ArrowRight, ChevronDown, X, Plus,
} from "lucide-react";
import Footer from "@/components/Footer";
import { GalleryModal, PhotoGrid, ShareButton } from "@/components/viagem/Galeria";
import {
  COMPACT_THRESHOLD, CompactDateSelector, DataEscolhida, DateSelector,
  type DataSelecionavel,
} from "@/components/viagem/Datas";
import { TopoDaPagina } from "@/components/viagem/Topo";
import { apiFetch, getUser } from "@/lib/api";
import { fmtBRL, fmtInstallment, erroDaApi, precoDeTabela } from "@/lib/format";
import { QUARTO_SINGLE } from "@/lib/opcionais";
import { Opcionais } from "@/components/viagem/Opcionais";
import { imgOtim } from "@/lib/imagem";

type Opcional = { name: string; price: number; description?: string | null };

type DataDoRoteiro = {
  trip_id: number;
  departure_date: string;
  return_date: string | null;
  price_per_person: number;
  original_price: number | null;
  available_spots: number;
  optionals: Opcional[];
  price_tiers: { name?: string; age_range?: string; price?: number;
                 original_price?: number | null; occupies_seat?: boolean }[];
  tem_hospedagem: boolean;
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
  description: string | null;
  includes: string[];
  excludes: string[];
  departure_locations: string[];
  required_documents: string | null;
  gallery: string[];
  datas: DataDoRoteiro[];
};

type Faixa = { name: string; age_range: string; occupies_seat: boolean };

/** Rótulo mostrado ao cliente, igual ao da página de viagem. */
function rotuloFaixa(f: Faixa): string {
  return f.age_range ? `${f.name} (${f.age_range})` : f.name;
}

const ADULTO = "Adulto";

type Combo = {
  id: number;
  nome: string;
  slug: string;
  descricao: string | null;
  /** A capa do combo: as fotos dos roteiros montadas numa imagem só. */
  image_url: string | null;
  desconto_pct: number;
  max_installments: number;
  price_tiers: Faixa[];
  venda_fim: string | null;
  roteiros: RoteiroDoCombo[];
  preco_tabela_desde: number | null;
  preco_cheio_desde: number | null;
};

/* A data do combo no formato que o seletor de viagem entende. Converter aqui,
   e não no servidor, mantém a resposta da API enxuta. */
function paraSelecao(d: DataDoRoteiro): DataSelecionavel {
  return {
    id: d.trip_id,
    departure_date: d.departure_date,
    return_date: d.return_date,
    price_per_person: d.price_per_person,
    original_price: d.original_price,
    available_spots: d.available_spots,
  };
}


/** Quantas fotos a página do combo mostra, a capa inclusa.
 *
 *  É exatamente o que cabe na grade: a grande da esquerda mais quatro. Passar
 *  disso só acrescentaria um "+12" e um álbum sem fim, que é o oposto do que o
 *  cliente precisa para decidir. */
const MAX_FOTOS = 5;

/** A capa montada, e depois as fotos dos N destinos intercaladas.
 *
 *  A capa vem primeiro porque é ela que diz, numa imagem só, que ali são duas
 *  ou três viagens. É a foto grande da esquerda e a que vai para o WhatsApp.
 *
 *  Intercalar as demais e não concatenar: com as fotos em blocos, os quatro
 *  menores viriam todos da primeira viagem, e a página de um combo de três
 *  destinos pareceria a de uma viagem só. Intercalando, as primeiras a entrar
 *  são a foto de capa de cada roteiro, e só depois as de galeria. */
function galeriaDoCombo(capa: string | null, roteiros: RoteiroDoCombo[]): string[] {
  const fotos: string[] = [];
  const listas = roteiros.map((r) => [r.image_url, ...(r.gallery ?? [])].filter(Boolean) as string[]);
  const maior = Math.max(0, ...listas.map((l) => l.length));
  for (let i = 0; i < maior; i++) {
    for (const l of listas) if (l[i]) fotos.push(l[i]);
  }
  // O Set tira repetida e, com a capa na frente, garante que ela é a primeira.
  return [...new Set([...(capa ? [capa] : []), ...fotos])].slice(0, MAX_FOTOS);
}

/* Os detalhes da viagem, abertos NA PRÓPRIA página do combo.
 *
 * Mandar o cliente para a página da viagem e esperar que ele volte é perder a
 * compra no meio do caminho: ele sai do fluxo, perde as datas que já escolheu de
 * vista e muitas vezes não volta.
 *
 * Padrão de "disclosure": um botão que diz o estado, conteúdo com id ligado a
 * ele por aria-controls, e a seta girando. É o mesmo comportamento que o
 * cliente já conhece de qualquer acordeão, e funciona no teclado. */
function DetalhesDaViagem({ roteiro }: { roteiro: RoteiroDoCombo }) {
  const [aberto, setAberto] = useState(false);
  const id = `detalhes-${roteiro.template_id}`;
  const temAlgo =
    roteiro.description || roteiro.includes.length || roteiro.excludes.length ||
    roteiro.departure_locations.length || roteiro.required_documents;
  if (!temAlgo) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={id}
        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-navy-600 hover:text-gold-600 transition-colors"
      >
        {aberto ? "Ocultar detalhes" : "Ver detalhes desta viagem"}
        <ChevronDown size={13} className={`transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <div id={id} className="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-4">
          {roteiro.description && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Sobre a viagem</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{roteiro.description}</p>
            </div>
          )}

          {roteiro.includes.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">O que inclui</p>
              <ul className="sm:columns-2 sm:gap-x-5">
                {roteiro.includes.map((x, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5 break-inside-avoid mb-1.5">
                    <Check size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="min-w-0">{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {roteiro.excludes.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Não inclui</p>
              <ul className="sm:columns-2 sm:gap-x-5">
                {roteiro.excludes.map((x, i) => (
                  <li key={i} className="text-sm text-gray-500 flex items-start gap-1.5 break-inside-avoid mb-1.5">
                    <X size={12} className="text-gray-300 mt-0.5 flex-shrink-0" />
                    <span className="min-w-0">{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {roteiro.departure_locations.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                {roteiro.departure_locations.length > 1 ? "Pontos de embarque" : "Local de embarque"}
              </p>
              <ol className="space-y-1">
                {roteiro.departure_locations.map((l, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    {roteiro.departure_locations.length > 1 ? (
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-semibold flex items-center justify-center mt-0.5 tabular-nums">
                        {i + 1}
                      </span>
                    ) : (
                      <MapPin size={12} className="text-gray-300 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="min-w-0">{l}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {roteiro.required_documents && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Documentos necessários</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{roteiro.required_documents}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function ComboDetalheClient({ combo }: { combo: Combo }) {
  const router = useRouter();
  const [escolha, setEscolha] = useState<Record<number, number>>(() => {
    const inicial: Record<number, number> = {};
    for (const r of combo.roteiros) if (r.datas.length) inicial[r.template_id] = r.datas[0].trip_id;
    return inicial;
  });
  /* Sem faixas, um contador simples, como na viagem sem faixa. Com faixas,
     uma linha por categoria, exatamente como a página de viagem faz. */
  const temFaixas = (combo.price_tiers ?? []).length > 0;
  const [pessoas, setPessoas] = useState(1);
  const [porFaixa, setPorFaixa] = useState<Record<string, number>>({ [ADULTO]: 1 });
  /* trip_id -> nomes marcados. Por DATA e não por roteiro: o preço de um
     opcional pode mudar de uma saída para outra, e trocar a data tem que
     começar do zero em vez de carregar a escolha de outra saída. */
  const [opcionais, setOpcionais] = useState<Record<number, string[]>>({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [trocandoData, setTrocandoData] = useState<Record<number, boolean>>({});
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const [galeriaInicio, setGaleriaInicio] = useState(0);

  const fotos = useMemo(
    () => galeriaDoCombo(combo.image_url, combo.roteiros),
    [combo.image_url, combo.roteiros],
  );
  const abrirGaleria = (i: number) => { setGaleriaInicio(i); setGaleriaAberta(true); };

  const pernas = useMemo(
    () => combo.roteiros.map((r) => ({
      roteiro: r,
      data: r.datas.find((d) => d.trip_id === escolha[r.template_id]) ?? null,
    })),
    [combo.roteiros, escolha],
  );

  const totalPessoas = temFaixas
    ? Object.values(porFaixa).reduce((a, b) => a + b, 0)
    : pessoas;

  /* Poltronas, que não é o mesmo que pessoas: criança de colo não desconta
     vaga. É por poltrona que a viagem cabe ou não cabe. */
  const poltronas = temFaixas
    ? (combo.price_tiers ?? []).reduce(
        (s, f) => s + (f.occupies_seat ? (porFaixa[rotuloFaixa(f)] ?? 0) : 0),
        porFaixa[ADULTO] ?? 0,
      )
    : pessoas;

  /* Cabem tantas pessoas quanto a MENOR vaga entre as datas escolhidas: o combo
     não pode ser vendido para mais gente do que cabe na viagem mais cheia. */
  const vagaMinima = useMemo(() => {
    const vagas = pernas.map((p) => p.data?.available_spots ?? 0);
    return vagas.length ? Math.min(...vagas) : 0;
  }, [pernas]);

  /* Opcional é por pessoa, como no checkout de viagem única. O quarto single é
     por adulto, mas enquanto o combo não tem faixas de idade todo mundo é
     adulto, então as duas contas dão no mesmo. */
  /* Quarto single OBRIGATÓRIO: viagem com hospedagem, UM adulto e ao menos uma
     criança. A regra é do servidor e roda de qualquer jeito no checkout; a tela
     precisa aplicá-la também, senão o valor muda sozinho na hora de pagar.
     Foi exatamente o que aconteceu ao testar: tela R$ 1.328,46, servidor
     R$ 1.489,46, os R$ 230 do quarto que ninguém tinha pedido. */
  const adultos = temFaixas ? (porFaixa[ADULTO] ?? 0) : pessoas;
  const quartoObrigatorio = (d: DataDoRoteiro): boolean =>
    d.tem_hospedagem && adultos === 1 && totalPessoas > adultos
    && d.optionals.some((o) => o.name === QUARTO_SINGLE);

  /* O que cada perna cobra de opcional: o que o cliente marcou, mais o quarto
     quando ele deixa de ser escolha. O quarto multiplica por ADULTO, o resto
     por pessoa, como no checkout de viagem única. */
  const opcionaisDaPerna = (d: DataDoRoteiro) => {
    const marcados = new Set(opcionais[d.trip_id] ?? []);
    if (quartoObrigatorio(d)) marcados.add(QUARTO_SINGLE);
    return d.optionals.filter((o) => marcados.has(o.name));
  };

  const totalOpcionais = pernas.reduce((s, p) => {
    if (!p.data) return s;
    return s + opcionaisDaPerna(p.data).reduce(
      (t, o) => t + o.price * (o.name === QUARTO_SINGLE ? adultos : totalPessoas), 0,
    );
  }, 0);

  /* O preço de cada perna sai da FAIXA daquela viagem, não da do combo: a faixa
     do combo diz quem é criança, o valor é sempre o da viagem. É a mesma
     tradução que o servidor faz ao cobrar, e as duas contas precisam bater,
     senão o cliente vê um total na tela e outro na hora de pagar. */
  const precoNaPerna = (d: DataDoRoteiro, faixa: Faixa | null): number => {
    const padrao = precoDeTabela(d.price_per_person, d.original_price);
    if (!faixa) return padrao;
    const equivalente = (d.price_tiers ?? []).find(
      (t) => (t.occupies_seat ?? true) === faixa.occupies_seat,
    );
    // O "de" DA FAIXA, não o da viagem: criança em promoção e adulto sem
    // promoção na mesma reserva não caberiam num percentual só.
    return equivalente
      ? precoDeTabela(Number(equivalente.price ?? d.price_per_person), equivalente.original_price)
      : padrao;
  };

  /* Só as VIAGENS entram no desconto. Opcional é custo de terceiro e entra pelo
     valor cheio, exatamente como na viagem avulsa. É a mesma conta do servidor,
     e as duas precisam bater.

     A base é a TABELA de cada viagem, nunca o preço já promocional: desconto de
     combo não se aplica sobre desconto (decisão do dono, 09/09/2026). */
  const viagens = pernas.reduce((s, p) => {
    if (!p.data) return s;
    const padrao = precoDeTabela(p.data.price_per_person, p.data.original_price);
    if (!temFaixas) return s + padrao * pessoas;
    const deAdultos = (porFaixa[ADULTO] ?? 0) * padrao;
    const demais = (combo.price_tiers ?? []).reduce(
      (t, f) => t + (porFaixa[rotuloFaixa(f)] ?? 0) * precoNaPerna(p.data!, f), 0,
    );
    return s + deAdultos + demais;
  }, 0);

  const cheio = viagens + totalOpcionais;
  const desconto = Math.round(viagens * combo.desconto_pct) / 100;
  const final = Math.round((cheio - desconto) * 100) / 100;
  const faltaData = pernas.some((p) => !p.data);
  const proxima = pernas
    .map((p) => p.data?.departure_date)
    .filter(Boolean)
    .sort()[0] as string | undefined;

  const continuar = async () => {
    setErro("");
    if (faltaData) { setErro("Escolha a data de cada viagem."); return; }
    if (temFaixas && (porFaixa[ADULTO] ?? 0) < 1) {
      setErro("A reserva precisa de pelo menos um adulto."); return;
    }
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
          pernas: pernas.map((p) => ({
            trip_id: p.data!.trip_id,
            // Só o nome: o preço vem do servidor, sempre.
            selected_optionals: (opcionais[p.data!.trip_id] ?? []).map((name) => ({ name })),
          })),
          num_travelers: totalPessoas,
          tier_breakdown: temFaixas
            ? Object.entries(porFaixa).filter(([, q]) => q > 0).map(([label, qty]) => ({ label, qty }))
            : [],
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
  /* No celular a barra fixa divide 375px com o botão, então o valor precisa
     caber numa linha: sem `whitespace-nowrap` o "R$ 839,23" quebrava entre o
     cifrão e o número. O riscado sobe para a linha de cima, onde há espaço. */
  const Resumo = ({ compacto = false }: { compacto?: boolean }) => (
    <>
      <p className="text-[11px] text-gray-400 leading-tight truncate">
        {compacto && desconto > 0 && (
          <span className="line-through mr-1.5">R$ {fmtBRL(cheio)}</span>
        )}
        as {combo.roteiros.length} viagens, {totalPessoas === 1 ? "1 pessoa" : `${totalPessoas} pessoas`}
      </p>
      <div className="flex items-end gap-2 mb-0.5">
        {!compacto && desconto > 0 && (
          <span className="text-sm text-gray-400 line-through leading-none mb-0.5">R$ {fmtBRL(cheio)}</span>
        )}
        <span className={`font-display font-black text-navy-700 leading-tight whitespace-nowrap ${
          compacto ? "text-xl" : "text-4xl"
        }`}>
          R$ {fmtBRL(final)}
        </span>
      </div>
      {combo.max_installments > 1 && (
        <p className={`text-emerald-600 font-semibold leading-tight ${compacto ? "text-[11px] truncate" : "text-xs"}`}>
          {combo.max_installments}x de R$ {fmtInstallment(final, combo.max_installments)} sem juros
        </p>
      )}
    </>
  );

  /* O MESMO seletor no corpo (celular) e na lateral (desktop), com o mesmo
     estado. Duplicar o componente e não o estado: no celular a lateral não
     existe, e sem isto o cliente ficaria preso em uma pessoa, sem conseguir
     dizer que leva criança. Foi o que aconteceu ao testar em 375px. */
  const SeletorDePessoas = () => (
    <div className="px-5 py-3.5">
      {temFaixas ? (
        <>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">
            Pessoas por categoria
          </p>
          <div className="space-y-2">
            {[{ name: ADULTO, age_range: "", occupies_seat: true }, ...combo.price_tiers].map((f) => {
              const rotulo = f.name === ADULTO ? ADULTO : rotuloFaixa(f);
              const qtd = porFaixa[rotulo] ?? 0;
              return (
                <div key={rotulo} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-800 truncate leading-tight">{rotulo}</p>
                    <p className="text-[11px] text-gray-400 leading-tight">
                      {f.occupies_seat ? "ocupa poltrona" : "não ocupa poltrona"}
                    </p>
                  </div>
                  <button type="button"
                    onClick={() => setPorFaixa((a) => ({ ...a, [rotulo]: Math.max(0, (a[rotulo] ?? 0) - 1) }))}
                    className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold flex-shrink-0">−</button>
                  <span className="w-6 text-center font-bold text-navy-800">{qtd}</span>
                  <button type="button"
                    onClick={() => setPorFaixa((a) => ({ ...a, [rotulo]: (a[rotulo] ?? 0) + 1 }))}
                    disabled={f.occupies_seat && poltronas >= vagaMinima}
                    className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 font-bold flex-shrink-0">+</button>
                </div>
              );
            })}
          </div>
          {(porFaixa[ADULTO] ?? 0) < 1 && totalPessoas > 0 && (
            <p className="text-[11px] text-gold-700 mt-2">Alguém precisa ser adulto na reserva.</p>
          )}
        </>
      ) : (
        <>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Pessoas</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setPessoas((n) => Math.max(1, n - 1))}
              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold">−</button>
            <span className="flex-1 text-center font-bold text-navy-800">
              {pessoas} pessoa{pessoas > 1 ? "s" : ""}
            </span>
            <button type="button" onClick={() => setPessoas((n) => Math.min(vagaMinima || 1, n + 1))}
              disabled={pessoas >= vagaMinima}
              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 font-bold">+</button>
          </div>
        </>
      )}
      <p className="text-[11px] text-gray-400 mt-2">
        As mesmas pessoas viajam nas {combo.roteiros.length} viagens.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-clip">
      <TopoDaPagina usuario={getUser()} />

      {galeriaAberta && fotos.length > 0 && (
        <GalleryModal images={fotos} startIndex={galeriaInicio} onClose={() => setGaleriaAberta(false)} />
      )}

      <div className="flex-1 pt-0 lg:pt-16 pb-24 lg:pb-0">
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
              {/* Escolha das datas.
                  Uma LINHA por viagem, mostrando só a data escolhida, e o
                  seletor abre em "Trocar". É o mesmo movimento da página de
                  viagem, onde a lateral mostra uma data e o resto fica atrás de
                  um clique. Com as quatro datas de cada viagem sempre abertas,
                  um combo de três viravam doze cartões de uma vez. */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="font-display font-black text-navy-800 text-lg mb-4">Escolha suas datas</h2>

                <div className="space-y-4">
                  {pernas.map(({ roteiro, data }, i) => {
                    const aberto = !!trocandoData[roteiro.template_id];
                    const cheioDaData = data
                      ? precoDeTabela(data.price_per_person, data.original_price)
                      : 0;
                    const comDesconto = cheioDaData * (1 - combo.desconto_pct / 100);
                    return (
                      <div key={roteiro.template_id} className="border-t border-gray-100 pt-4 first:border-0 first:pt-0">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-navy-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img loading="lazy" decoding="async"
                              src={roteiro.image_url ? imgOtim(roteiro.image_url, 200, 80) : ""}
                              alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-gold-600 uppercase tracking-wide">
                              Viagem {i + 1} de {combo.roteiros.length}
                            </p>
                            <p className="font-bold text-navy-800 leading-tight truncate">{roteiro.title}</p>
                            <DetalhesDaViagem roteiro={roteiro} />
                          </div>
                        </div>

                        {/* A data escolhida, e só ela. */}
                        <button
                          type="button"
                          onClick={() => setTrocandoData((a) => ({ ...a, [roteiro.template_id]: !aberto }))}
                          aria-expanded={aberto}
                          className="mt-3 w-full block rounded-xl border-2 border-gray-200 hover:border-navy-300 px-3.5 py-3 text-left transition-colors"
                        >
                          {/* "Trocar" sobe para a linha do rótulo e a data usa a
                              largura toda. Lado a lado, "18 de set. de 2026 →
                              20 de set." quebrava em duas linhas no celular. */}
                          <span className="flex items-center justify-between gap-3">
                            <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Data</span>
                            {roteiro.datas.length > 1 && (
                              <span className="text-xs text-navy-600 font-semibold flex items-center gap-1 flex-shrink-0">
                                {aberto ? <><ChevronDown size={14} className="rotate-180" /> Fechar</>
                                        : <><ChevronDown size={14} /> Trocar</>}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0">
                            {data ? (
                              <>
                                <span className="block text-sm font-bold text-navy-800">
                                  <DataEscolhida saida={data.departure_date} retorno={data.return_date} />
                                </span>
                                <span className="block text-xs mt-0.5">
                                  <span className="text-gray-400 line-through mr-1.5">
                                    R$ {fmtBRL(cheioDaData)}
                                  </span>
                                  <span className="font-bold text-navy-700">R$ {fmtBRL(comDesconto)}</span>
                                  <span className="text-gray-400"> /pessoa</span>
                                </span>
                              </>
                            ) : (
                              <span className="block text-sm font-bold text-gray-400">Selecione uma data</span>
                            )}
                          </span>
                        </button>

                        {aberto && roteiro.datas.length > 1 && (() => {
                          // Roteiro com muita data usa o seletor agrupado por
                          // mês, o MESMO da página de viagem. Ilha do Mel tem 42
                          // datas à venda e Beto Carrero 80: na lista simples
                          // seriam 80 cartões dentro do acordeão, jogando as
                          // outras viagens do combo para fora da tela.
                          const Seletor = roteiro.datas.length >= COMPACT_THRESHOLD
                            ? CompactDateSelector
                            : DateSelector;
                          return (
                            <div className="mt-2">
                              <Seletor
                                trips={roteiro.datas.map(paraSelecao)}
                                selected={data ? paraSelecao(data) : null}
                                onSelect={(d) => {
                                  setEscolha((a) => ({ ...a, [roteiro.template_id]: d.id }));
                                  // Escolheu, fecha: manter aberto empurraria as
                                  // outras viagens para fora da tela.
                                  setTrocandoData((a) => ({ ...a, [roteiro.template_id]: false }));
                                }}
                                hasError={false}
                                titulo=""
                                descontoPct={combo.desconto_pct}
                                semMoldura
                              />
                            </div>
                          );
                        })()}

                        {/* Os opcionais DESTA viagem, logo abaixo da data dela.
                            Numa lista separada no fim da página, o cliente
                            precisava lembrar de qual viagem era cada extra; aqui
                            cada viagem fica completa em si: foto, detalhes, data
                            e o que dá para incluir nela.

                            Depois da data e não antes porque o preço do opcional
                            pode mudar de uma saída para outra. */}
                        {data && data.optionals.length > 0 && (
                          <div className="mt-3 border-t border-dashed border-gray-200 pt-3">
                            <Opcionais
                              titulo="Opcionais desta viagem (por pessoa)"
                              optionals={data.optionals}
                              selecionados={opcionais[data.trip_id] ?? []}
                              forcados={quartoObrigatorio(data) ? [QUARTO_SINGLE] : []}
                              onToggle={(nome) => setOpcionais((a) => {
                                const atuais = a[data.trip_id] ?? [];
                                return {
                                  ...a,
                                  [data.trip_id]: atuais.includes(nome)
                                    ? atuais.filter((n) => n !== nome)
                                    : [...atuais, nome],
                                };
                              })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* No celular a lateral não existe, então o seletor vem aqui. */}
              <div className="lg:hidden bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 pt-4">
                  <h2 className="font-display font-black text-navy-800 text-lg">Quantas pessoas</h2>
                </div>
                <SeletorDePessoas />
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

                  <div className="border-t border-gray-100"><SeletorDePessoas /></div>

                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {pernas.map(({ roteiro, data }, i) => (
                      <div key={roteiro.template_id} className="px-5 py-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Viagem {i + 1}</p>
                        <p className="text-sm font-semibold text-navy-800 truncate">{roteiro.title}</p>
                        <p className="text-xs text-gray-500">
                          {data ? <DataEscolhida saida={data.departure_date} retorno={data.return_date} />
                                : "escolha a data"}
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-3 py-2.5 flex items-center gap-3 shadow-2xl">
        <div className="flex-1 min-w-0"><Resumo compacto /></div>
        <button onClick={continuar} disabled={enviando || faltaData}
          className="flex-shrink-0 bg-gold-500 hover:bg-gold-400 active:scale-95 disabled:opacity-50 text-navy-900 font-bold px-4 py-3 rounded-xl text-sm whitespace-nowrap transition-[transform,background-color]">
          {enviando ? <Loader2 size={16} className="animate-spin" /> : "Reservar"}
        </button>
      </div>

      <div className="hidden lg:block"><Footer /></div>
    </div>
  );
}
