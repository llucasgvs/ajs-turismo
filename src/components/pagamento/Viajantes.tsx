"use client";

/* Quem vai viajar: o bloco de contadores do checkout.
 *
 * Saiu de `/reservar/[code]` porque o combo precisava do MESMO bloco, e a
 * primeira tentativa foi escrever outro. Deu no que costuma dar: o contador do
 * combo deixava tirar o único adulto, coisa que o do checkout nunca deixou.
 *
 * As travas moram aqui, uma vez só:
 *   - o Adulto nunca chega a zero. Alguém tem que levar as crianças;
 *   - nunca fica ninguém: pelo menos uma pessoa;
 *   - não passa das poltronas livres, e a criança de colo não consome poltrona.
 */

import { Loader2, Minus, Plus, Users } from "lucide-react";
import { fmtBRL } from "@/lib/format";
import { tierPriceLabel } from "@/lib/tiers";

export const ADULTO = "Adulto";

/** Uma faixa como o bloco precisa dela: rótulo pronto e preço já somado. */
export type FaixaDoSeletor = {
  label: string;
  /** Preço por pessoa desta faixa. Num combo, a soma das N viagens. */
  price: number;
  /** O "de" anunciado, quando maior que o preço. Zero esconde o riscado. */
  original_price?: number;
  occupies_seat: boolean;
};

export function Counter({ value, onMinus, onPlus }: {
  value: number; onMinus: () => void; onPlus: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onMinus} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-navy-500 hover:text-navy-700 transition-colors"><Minus size={15} /></button>
      <span className="w-5 text-center font-semibold text-navy-800">{value}</span>
      <button type="button" onClick={onPlus} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-navy-500 hover:text-navy-700 transition-colors"><Plus size={15} /></button>
    </div>
  );
}

/** Quantas poltronas uma escolha ocupa (colo não conta). */
export function poltronasDe(sel: Record<string, number>, faixas: FaixaDoSeletor[]): number {
  const ocupa = new Map(faixas.map((f) => [f.label, f.occupies_seat]));
  return Object.entries(sel).reduce(
    (s, [label, qty]) => s + ((ocupa.get(label) ?? true) ? qty : 0), 0,
  );
}

/** A nova contagem depois de mexer numa faixa, ou `null` se a regra barra.
 *
 *  Devolver `null` em vez de corrigir é de propósito: o botão simplesmente não
 *  faz nada, em vez de mudar outra faixa por conta própria. */
export function contagemApos(
  atual: Record<string, number>, faixas: FaixaDoSeletor[],
  label: string, delta: number, vagas: number,
): Record<string, number> | null {
  const nova = { ...atual, [label]: Math.max(0, (atual[label] || 0) + delta) };
  if (delta > 0 && poltronasDe(nova, faixas) > vagas) return null;
  if (Object.values(nova).reduce((a, b) => a + b, 0) < 1) return null;
  // Alguém tem que levar as crianças: o Adulto nunca chega a zero.
  if ((nova[ADULTO] || 0) < 1) return null;
  return nova;
}

export function SeletorDeViajantes({
  faixas, contagem, pessoas, vagas, editavel, ocupado, semPreco, precoPorPessoa,
  onFaixa, onPessoas,
}: {
  /** Vazio = a viagem não tem faixas, e o bloco vira um contador de pessoas. */
  faixas: FaixaDoSeletor[];
  contagem: Record<string, number>;
  pessoas: number;
  vagas: number;
  editavel: boolean;
  ocupado?: boolean;
  /** Roteiro sob cotação: sem valor por pessoa para mostrar. */
  semPreco?: boolean;
  /** Sem faixas, o valor por pessoa que aparece ao lado do contador. */
  precoPorPessoa?: number;
  onFaixa: (label: string, delta: number) => void;
  onPessoas: (delta: number) => void;
}) {
  const total = faixas.length
    ? Object.values(contagem).reduce((a, b) => a + b, 0)
    : pessoas;

  return (
    <div className="border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-navy-800 flex items-center gap-1.5">
          <Users size={14} /> Viajantes
        </span>
        {ocupado && <Loader2 size={13} className="animate-spin text-gray-300" />}
      </div>

      {!editavel ? (
        <p className="text-sm text-gray-500">{total} viajante{total > 1 ? "s" : ""}</p>
      ) : faixas.length ? (
        <div className="space-y-2.5">
          {faixas.map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-navy-800 break-words">{f.label}</p>
                <p className="text-xs text-gray-400">
                  {(f.original_price ?? 0) > f.price && (
                    <s className="text-gray-300 mr-1">R$ {fmtBRL(f.original_price as number)}</s>
                  )}
                  {tierPriceLabel(f.price, fmtBRL)}
                  {!f.occupies_seat && " · não ocupa poltrona"}
                </p>
              </div>
              <Counter
                value={contagem[f.label] || 0}
                onMinus={() => onFaixa(f.label, -1)}
                onPlus={() => onFaixa(f.label, 1)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-400">
            {semPreco ? "Valor sob consulta" : `R$ ${fmtBRL(precoPorPessoa ?? 0)} / pessoa`}
          </p>
          <Counter
            value={pessoas}
            onMinus={() => onPessoas(-1)}
            onPlus={() => onPessoas(1)}
          />
        </div>
      )}
    </div>
  );
}
