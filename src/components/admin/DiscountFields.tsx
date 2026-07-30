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
export default function DiscountFields({ price, original, onOriginal }: {
  /** O "por", já em texto do input de preço. */
  price: string;
  /** O "de" atual, em texto. Vazio = sem desconto. */
  original: string;
  onOriginal: (v: string) => void;
}) {
  const por = parseFloat(price) || 0;
  const de = parseFloat(original) || 0;

  // Enquanto o admin digita no percentual o campo guarda o texto cru (para
  // "1" não virar "100%" antes do "0"); fora disso ele espelha de/por.
  const [digitando, setDigitando] = useState(false);
  const [texto, setTexto] = useState("");
  const mostrado = digitando ? texto : percentText(discountPercent(de, por));

  const mudarPct = (v: string) => {
    setTexto(v);
    const novo = originalFromPercent(por, parseFloat(v.replace(",", ".")));
    onOriginal(novo === null ? "" : String(novo));
  };

  const inputCls =
    "w-full pl-7 pr-2 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-400";

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">De</span>
        <input
          type="number" min="0" step="0.01" placeholder="sem desconto"
          value={original}
          onChange={(e) => onOriginal(e.target.value)}
          className={inputCls}
        />
      </div>
      <div className="relative w-20 flex-shrink-0">
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
        <input
          type="number" min="0" max="99" step="0.01" placeholder="0"
          value={mostrado}
          onFocus={() => { setTexto(mostrado); setDigitando(true); }}
          onBlur={() => setDigitando(false)}
          onChange={(e) => mudarPct(e.target.value)}
          className="w-full pl-2.5 pr-6 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-400"
        />
      </div>
    </div>
  );
}
