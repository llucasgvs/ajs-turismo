"use client";

import { useState } from "react";
import { discountPercent, originalFromPercent, percentText } from "@/lib/pricing";

/**
 * Campos "de" e "%" amarrados nos dois sentidos.
 *
 * O valor cobrado continua sendo o "por" (price), que fica fora deste
 * componente. Aqui só se mexe na vitrine: digitar o percentual recalcula o
 * "de" a partir do "por" (centavos exatos), e digitar o "de" atualiza o
 * percentual mostrado.
 */
export default function DiscountFields({ price, original, onOriginal, title = "Desconto (opcional)" }: {
  /** O "por", já em texto do input de preço. */
  price: string;
  /** O "de" atual, em texto. Vazio = sem desconto. */
  original: string;
  onOriginal: (v: string) => void;
  title?: string;
}) {
  const por = parseFloat(price) || 0;
  const de = parseFloat(original) || 0;
  const pct = discountPercent(de, por);

  // Enquanto o admin digita no percentual o campo guarda o texto cru (para
  // "1" não virar "100%" antes do "0"); fora disso ele espelha de/por.
  const [digitando, setDigitando] = useState(false);
  const [texto, setTexto] = useState("");
  const mostrado = digitando ? texto : percentText(pct);

  const mudarPct = (v: string) => {
    setTexto(v);
    const novo = originalFromPercent(por, parseFloat(v.replace(",", ".")));
    onOriginal(novo === null ? "" : String(novo));
  };

  const campo =
    "w-full py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-400";

  return (
    <div className="rounded-xl border border-gray-100 bg-white/60 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-semibold text-gray-500">{title}</p>
        {pct !== null && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
            −{percentText(pct)}%
          </span>
        )}
      </div>

      {/* Quebra a linha em vez de espremer: abaixo de ~128px o campo "De:"
          corta o valor (R$ 240 vira "R$ 2"). O "ou" acompanha o percentual
          para não sobrar sozinho no fim da primeira linha. */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[128px]">
          <label className="block text-[10px] text-gray-400 mb-1">Preço cheio (De:)</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
            <input
              type="number" min="0" step="0.01" placeholder="sem desconto"
              value={original}
              onChange={(e) => onOriginal(e.target.value)}
              className={`${campo} pl-7 pr-2`}
            />
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span className="pb-2.5 text-gray-300 text-xs select-none">ou</span>

          <div className="w-[86px] flex-shrink-0">
            <label className="block text-[10px] text-gray-400 mb-1">Desconto</label>
            <div className="relative">
              <input
                type="number" min="0" max="99" step="0.01" placeholder="0"
                value={mostrado}
                onFocus={() => { setTexto(mostrado); setDigitando(true); }}
                onBlur={() => setDigitando(false)}
                onChange={(e) => mudarPct(e.target.value)}
                className={`${campo} pl-2.5 pr-6`}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
