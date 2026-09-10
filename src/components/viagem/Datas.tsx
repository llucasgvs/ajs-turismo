"use client";

/* O seletor de datas, usado pela página de viagem E pela de combo.
 *
 * Saiu de TripDetailClient quando o combo passou a usar o mesmo template. Manter
 * um seletor "parecido" no combo seria pior que duplicar código: o cliente
 * aprenderia dois jeitos de escolher data no mesmo site.
 *
 * A única adição é `descontoPct`. Num combo o preço da data não é o que o
 * cliente paga: o pacote desconta do valor de TABELA daquela data, e o cartão
 * mostra os dois valores para não haver dúvida do que está sendo comprado.
 *
 * A base ser a tabela e não o preço de venda é decisão do dono (09/09/2026):
 * desconto de combo não se aplica sobre preço já promocional. A mesma conta roda
 * no servidor, e tela e cobrança divergindo é o pior defeito de um checkout.
 */

import { useState } from "react";
import { Calendar, Check, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { fmtBRL, precoDeTabela, spotsLabel, mesmoDia, poucasVagas, salesClosed } from "@/lib/format";

export type DataSelecionavel = {
  id: number;
  departure_date: string;
  return_date?: string | null;
  price_per_person: number;
  original_price?: number | null;
  // Nulo nas viagens antigas, e o cartão trata como zero: o tipo precisa aceitar
  // o que o banco realmente tem.
  available_spots: number | null;
  status?: string | null;
};

/* A data escolhida, como a lateral da página de viagem sempre mostrou.
 *
 * Estava escrita à mão dentro de TripDetailClient. Saiu para cá quando o combo
 * precisou da mesma linha: escrever de novo, ainda que igual, era pedir para as
 * duas divergirem no primeiro ajuste.
 *
 * O retorno vem sem o ano de propósito, e o mesmo dia vira "bate e volta" em
 * vez de repetir a data. Não é escolha nova: é o que já estava no ar e passou
 * pelos testes. */
export function DataEscolhida({ saida, retorno }: { saida: string; retorno?: string | null }) {
  const dia = (iso: string, comAno: boolean) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo", day: "2-digit", month: "short",
      ...(comAno ? { year: "numeric" as const } : {}),
    });
  return (
    <>
      {dia(saida, true)}
      {retorno && (mesmoDia(saida, retorno)
        ? " · bate e volta"
        : <>{" → "}{dia(retorno, false)}</>)}
    </>
  );
}

/** Dia da saída (YYYY-MM-DD) no fuso de Brasília. Fatiar o ISO cru usaria a
 *  data em UTC, que vira o dia seguinte em saídas de fim de noite. */
const spDay = (iso: string) => new Date(iso).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });

export function fmtDate(d: string) {
  // Data no fuso de Brasília: fatiar o ISO cru usaria a data em UTC, que vira o
  // dia seguinte em saídas de fim de noite (23:45 BRT = 02:45 UTC).
  const [y, m, day] = new Date(d).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" }).split("-");
  return `${day}/${m}/${y}`;
}


export const DATE_INITIAL = 4;

/* Genérico para o chamador receber de volta o SEU tipo no onSelect: a página de
   viagem trabalha com Trip inteira, a de combo com a data enxuta do combo, e
   nenhuma das duas precisa converter nada. */
export function DateSelector<T extends DataSelecionavel>({
  trips, selected, onSelect, hasError, sidebar = false, forceExpanded = false,
  titulo = "Escolha sua data", descontoPct = 0, semMoldura = false,
}: {
  trips: T[];
  selected: T | null;
  onSelect: (t: T) => void;
  hasError: boolean;
  sidebar?: boolean;
  forceExpanded?: boolean;
  /** No combo, o nome da viagem daquela perna. */
  titulo?: string;
  /** Desconto do combo, aplicado sobre o preço da data. Zero na viagem avulsa. */
  descontoPct?: number;
  /** No combo o cartão já vem dentro de um bloco branco; a moldura própria
   *  criaria caixa dentro de caixa. */
  semMoldura?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (trips.length === 0) return null;

  const selectedIdx = selected ? trips.findIndex(t => t.id === selected.id) : -1;
  const needsExpand = !forceExpanded && trips.length > DATE_INITIAL;
  // If selected date is beyond initial view, auto-expand
  const forceExpandSelected = selectedIdx >= DATE_INITIAL;
  const showAll = forceExpanded || expanded || forceExpandSelected;
  const visible = showAll ? trips : trips.slice(0, DATE_INITIAL);
  const hidden = trips.length - DATE_INITIAL;

  return (
    <div id="date-selector" className={`overflow-hidden ${semMoldura ? "" : "bg-white rounded-2xl shadow-sm"} ${hasError ? "ring-2 ring-red-400" : ""}`}>
      <div className={`flex items-center justify-between ${semMoldura ? "pb-2" : "px-5 pt-5 pb-3"}`}>
        <div>
          <h2 className={`font-display font-black text-navy-800 ${semMoldura ? "text-base" : "text-lg"}`}>{titulo}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{trips.length} {trips.length === 1 ? "data disponível" : "datas disponíveis"}</p>
        </div>
        {hasError && (
          <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
            <AlertTriangle size={13} /> Selecione uma data
          </span>
        )}
      </div>

      <div className={semMoldura ? "" : "px-4 pb-4"}>
        <div className={`grid gap-3 ${sidebar ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        {visible.map((t) => {
          const isSold = t.available_spots === 0 || t.status === "sold_out";
          const isClosed = !isSold && salesClosed(t.departure_date);
          const blocked = isSold || isClosed;
          const isLow = !blocked && poucasVagas(t.available_spots);
          const isSelected = selected?.id === t.id;
          const disc = descontoPct > 0
            ? Math.round(descontoPct)
            : t.original_price
            ? Math.round((1 - t.price_per_person / t.original_price) * 100)
            : null;

          return (
            <button
              key={t.id}
              disabled={blocked}
              onClick={() => !blocked && onSelect(t)}
              className={`relative text-left rounded-xl border-2 p-4 transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-150 w-full ${
                isSelected
                  ? "border-navy-700 bg-navy-50 shadow-md"
                  : blocked
                  ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                  : "border-gray-200 hover:border-navy-300 hover:bg-gray-50 cursor-pointer"
              }`}
            >
              {/* Top-right: check when selected, discount when not selected */}
              <span className="absolute top-3 right-3">
                {isSelected ? (
                  <span className="w-5 h-5 bg-navy-700 rounded-full flex items-center justify-center">
                    <Check size={11} className="text-white" />
                  </span>
                ) : disc && disc > 0 && !blocked ? (
                  <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    -{disc}%
                  </span>
                ) : null}
              </span>

              {/* Date range. No bate-e-volta sai uma data só: repetir a mesma
                  dos dois lados da seta ocupa espaço e não informa nada. */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-2 min-w-0 pr-6">
                <Calendar size={13} className={`flex-shrink-0 ${isSelected ? "text-navy-600" : "text-gold-500"}`} />
                <span className={`text-sm font-bold whitespace-nowrap ${isSelected ? "text-navy-800" : "text-navy-700"}`}>
                  {fmtDate(t.departure_date)}
                </span>
                {!mesmoDia(t.departure_date, t.return_date) && (
                  <>
                    <span className="text-gray-400 text-xs flex-shrink-0">→</span>
                    <span className={`text-sm font-bold whitespace-nowrap ${isSelected ? "text-navy-800" : "text-navy-700"}`}>
                      {fmtDate(t.return_date as string)}
                    </span>
                  </>
                )}
              </div>

              {/* Price row */}
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  {/* Com desconto de combo, o riscado é o preço da própria
                      viagem: é dele que o cliente é poupado ao levar o pacote.
                      Sem combo, segue sendo o "de" cadastrado na data. */}
                  {/* Com combo, o riscado é a TABELA: é dela que o pacote
                      desconta. Sem combo, segue sendo o "de" cadastrado. */}
                  {(descontoPct > 0 ? precoDeTabela(t.price_per_person, t.original_price) : t.original_price) && (
                    <p className="text-[10px] text-gray-400 line-through leading-none">
                      R$ {fmtBRL(descontoPct > 0
                        ? precoDeTabela(t.price_per_person, t.original_price)
                        : (t.original_price as number))}
                    </p>
                  )}
                  {isSold ? (
                    <span className="text-sm font-bold text-gray-400">Esgotado</span>
                  ) : isClosed ? (
                    <span className="text-sm font-bold text-gray-400">Vendas encerradas</span>
                  ) : (
                    <span className={`text-base font-black whitespace-nowrap ${isSelected ? "text-navy-700" : "text-navy-600"}`}>
                      R$ {fmtBRL(precoDeTabela(t.price_per_person, t.original_price) * (1 - descontoPct / 100))}
                      <span className="text-xs font-normal text-gray-400"> /pessoa</span>
                    </span>
                  )}
                </div>

                {/* Spots */}
                {!blocked && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
                    isLow
                      ? "bg-orange-100 text-orange-600"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {isLow ? `⚠ ${spotsLabel(t.available_spots)}` : spotsLabel(t.available_spots)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
        </div>

        {needsExpand && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-navy-300 text-navy-600 text-sm font-semibold hover:bg-navy-50 transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp size={15} /> Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown size={15} /> Ver mais {hidden} data{hidden !== 1 ? "s" : ""}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}


/* O seletor para roteiro com MUITA data, agrupado por mês.
 *
 * Saiu de TripDetailClient pelo mesmo motivo do DateSelector: o combo precisa
 * dele. Ilha do Mel tem 42 datas à venda e Beto Carrero 80; na lista simples
 * isso vira "Ver mais 76 datas" e depois 80 cartões de uma vez, o que dentro da
 * página de combo empurraria as outras viagens para fora da tela.
 *
 * Agrupado por mês, abre com dois meses e cresce de três em três. */
export const COMPACT_THRESHOLD = 20; // a partir daqui, modo compacto

export function CompactDateSelector<T extends DataSelecionavel>({
  trips, selected, onSelect, hasError,
  titulo = "Escolha sua data", descontoPct = 0, semMoldura = false,
}: {
  trips: T[];
  selected: T | null;
  onSelect: (t: T) => void;
  hasError: boolean;
  titulo?: string;
  /** Desconto do combo, aplicado sobre o preço da data. Zero na viagem avulsa. */
  descontoPct?: number;
  /** No combo o cartão já vem dentro de um bloco branco. */
  semMoldura?: boolean;
}) {
  const MONTHS_INITIAL = 2;
  const [shownMonths, setShownMonths] = useState(MONTHS_INITIAL);

  // Agrupar por "YYYY-MM"
  const grouped = trips.reduce<Record<string, T[]>>((acc, t) => {
    const key = spDay(t.departure_date).slice(0, 7); // "2026-04" (fuso BRT)
    (acc[key] ||= []).push(t);
    return acc;
  }, {});
  const allMonthKeys = Object.keys(grouped).sort();
  const visibleKeys = allMonthKeys.slice(0, shownMonths);
  const remaining = allMonthKeys.length - shownMonths;

  const fmtMonthLabel = (key: string) => {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };
  // A data sai por extenso (23/08/2026), igual ao card de viagem com pernoite.
  // Antes era abreviada e sem ano ("23 de ago."), o que ia ficar ambíguo assim
  // que entrassem datas de 2027 na mesma lista.

  return (
    <div id="date-selector" className={`overflow-hidden ${semMoldura ? "" : "bg-white rounded-2xl shadow-sm"} ${hasError ? "ring-2 ring-red-400" : ""}`}>
      <div className={`flex items-center justify-between ${semMoldura ? "pb-2" : "px-5 pt-5 pb-3"}`}>
        <div>
          <h2 className={`font-display font-black text-navy-800 ${semMoldura ? "text-base" : "text-lg"}`}>{titulo}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{trips.length} {trips.length === 1 ? "data disponível" : "datas disponíveis"}</p>
        </div>
        {hasError && (
          <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
            <AlertTriangle size={13} /> Selecione uma data
          </span>
        )}
      </div>

      <div className={`space-y-4 ${semMoldura ? "" : "px-4 pb-4"}`}>
        {visibleKeys.map(monthKey => (
          <div key={monthKey}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 capitalize">
              {fmtMonthLabel(monthKey)}
            </p>
            <div className="space-y-1.5">
              {grouped[monthKey].map(t => {
                const isSold = t.available_spots === 0 || t.status === "sold_out";
                const isClosed = !isSold && salesClosed(t.departure_date);
                const blocked = isSold || isClosed;
                const isSelected = selected?.id === t.id;
                const isLow = !blocked && poucasVagas(t.available_spots);
                return (
                  <button
                    key={t.id}
                    disabled={blocked}
                    onClick={() => !blocked && onSelect(t)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-[color,background-color,border-color,box-shadow,transform,opacity] ${
                      isSelected
                        ? "border-navy-700 bg-navy-50"
                        : blocked
                        ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                        : "border-gray-200 hover:border-navy-300 hover:bg-gray-50 cursor-pointer"
                    }`}
                  >
                    {/* Duas linhas, igual ao card de viagem com pernoite. Numa
                        linha só, data + preço + selo de vagas não cabem num
                        celular estreito, e o navegador quebrava no meio dos
                        valores ("23 / de / ago.", "R$ / 216,00"). */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <Calendar size={13} className={`flex-shrink-0 ${isSelected ? "text-navy-600" : "text-gold-500"}`} />
                      <span className={`text-sm font-bold whitespace-nowrap ${isSelected ? "text-navy-800" : "text-navy-700"}`}>
                        {fmtDate(t.departure_date)}
                      </span>
                      {isSelected && (
                        <span className="ml-auto w-5 h-5 bg-navy-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check size={11} className="text-white" />
                        </span>
                      )}
                    </div>

                    {/* Sem "/pessoa" aqui de propósito: neste card estreito ele
                        é o que faz o conteúdo estourar num aparelho de 320px, e
                        o preço por pessoa já aparece na barra fixa de baixo. */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      {isSold ? (
                        <span className="text-sm font-bold text-gray-400">Esgotado</span>
                      ) : isClosed ? (
                        <span className="text-sm font-bold text-gray-400">Vendas encerradas</span>
                      ) : (
                        <>
                          <span className="min-w-0">
                            {/* Com desconto de combo, o riscado é a TABELA:
                                é dela que o pacote desconta. */}
                            {descontoPct > 0 && (
                              <span className="block text-[10px] text-gray-400 line-through leading-none">
                                R$ {fmtBRL(precoDeTabela(t.price_per_person, t.original_price))}
                              </span>
                            )}
                            <span className={`text-base font-black whitespace-nowrap ${isSelected ? "text-navy-700" : "text-navy-600"}`}>
                              R$ {fmtBRL(precoDeTabela(t.price_per_person, t.original_price) * (1 - descontoPct / 100))}
                            </span>
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap overflow-hidden text-ellipsis ${
                            isLow ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"
                          }`}>
                            {isLow ? `⚠ ${spotsLabel(t.available_spots)}` : spotsLabel(t.available_spots)}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setShownMonths(v => v + 3)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-navy-300 text-navy-600 text-sm font-semibold hover:bg-navy-50 transition-colors"
          >
            <ChevronDown size={15} /> Ver mais {remaining} {remaining === 1 ? "mês" : "meses"}
          </button>
        )}
      </div>
    </div>
  );
}
