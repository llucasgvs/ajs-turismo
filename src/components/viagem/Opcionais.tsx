"use client";

/* Serviços opcionais, usados pela página de viagem E pela de combo.
 *
 * Mesmo bloco nos dois lugares de propósito: o cliente já sabe o que é aquele
 * cartão âmbar com o círculo de seleção, e um bloco "parecido" no combo o faria
 * reaprender do zero. Combo é embalagem, não produto novo.
 *
 * O visual saiu de TripDetailClient sem alteração; o que entrou foi `forcados`,
 * para o quarto single que deixa de ser escolha quando um adulto viaja com
 * criança, e `subtitulo`, para o combo dizer de qual viagem é a lista.
 */

import { Check, Lock } from "lucide-react";
import { fmtBRL } from "@/lib/format";

export type OpcionalItem = { name: string; price: number; description?: string | null };

export function Opcionais({
  optionals, selecionados, onToggle, forcados = [], subtitulo, titulo = "Serviços Opcionais",
  moldura = true,
}: {
  optionals: OpcionalItem[];
  selecionados: string[];
  onToggle: (nome: string) => void;
  /** Opcionais que a regra da viagem impõe, marcados e travados. */
  forcados?: string[];
  subtitulo?: string;
  titulo?: string;
  /** No combo há uma lista por viagem dentro do mesmo bloco branco. */
  moldura?: boolean;
}) {
  if (!optionals?.length) return null;
  const marcados = optionals.filter(
    (o) => forcados.includes(o.name) || selecionados.includes(o.name),
  );

  return (
    <div className={moldura ? "bg-white rounded-2xl p-4 sm:p-5 shadow-sm" : ""}>
      {moldura && (
        <>
          <h3 className="font-display font-bold text-navy-800 mb-1 flex items-center gap-2 text-base">
            <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">✨</span>
            {titulo}
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            Selecione os extras que deseja. O valor é por pessoa.
          </p>
        </>
      )}
      {subtitulo && (
        <p className="text-[10px] font-bold text-gold-600 uppercase tracking-wide mb-2">{subtitulo}</p>
      )}

      <div className="space-y-2">
        {optionals.map((opt, i) => {
          const travado = forcados.includes(opt.name);
          const marcado = travado || selecionados.includes(opt.name);
          return (
            <button
              key={i}
              type="button"
              disabled={travado}
              onClick={() => !travado && onToggle(opt.name)}
              className={`w-full flex items-center gap-3 rounded-xl border-2 px-3 sm:px-4 py-3.5 transition-[color,background-color,border-color,box-shadow,transform,opacity] text-left ${
                travado
                  ? "border-amber-300 bg-amber-50 cursor-default"
                  : marcado
                  ? "border-amber-400 bg-amber-50 active:scale-[0.99]"
                  : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 active:scale-[0.99]"
              }`}
            >
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-[color,background-color,border-color,box-shadow,transform,opacity] ${
                marcado ? "border-amber-500 bg-amber-500" : "border-gray-300"
              }`}>
                {travado ? <Lock size={10} className="text-white" />
                  : marcado ? <Check size={11} className="text-white" /> : null}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-gray-700 leading-tight">{opt.name}</span>
                {opt.description && (
                  <span className="block text-xs text-gray-500 leading-snug mt-0.5">{opt.description}</span>
                )}
                {travado && (
                  <span className="block text-xs text-amber-700 leading-snug mt-0.5">
                    Incluído: um adulto com criança não divide quarto.
                  </span>
                )}
                <span className={`inline-flex items-center mt-1 text-xs font-black px-2 py-0.5 rounded-full ${
                  marcado ? "bg-amber-200 text-amber-700" : "bg-gray-100 text-gray-500"
                }`}>
                  + R$ {fmtBRL(opt.price)}/pessoa
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {marcados.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-200">
          <span className="text-xs text-amber-700 font-semibold">
            {marcados.length} {marcados.length > 1 ? "opcionais selecionados" : "opcional selecionado"}
          </span>
          <span className="text-sm font-black text-amber-700 whitespace-nowrap">
            + R$ {fmtBRL(marcados.reduce((s, o) => s + o.price, 0))}/pessoa
          </span>
        </div>
      )}
    </div>
  );
}
