"use client";

/* Serviços opcionais, no formato do CHECKOUT.
 *
 * O checkout já resolvia isto melhor que a página de viagem: o cartão é mais
 * limpo, a descrição fica embaixo do nome (é ela que tira a dúvida do que vai
 * dentro de um "Combo de ingressos") e o obrigatório se explica no próprio
 * bloco, em vez de num aviso solto no topo da seção.
 *
 * Este arquivo é uma cópia fiel daquele desenho, para a página do combo usar o
 * mesmo. A página de viagem ainda tem o bloco antigo dela; unificar as três é
 * um passo separado, e visível para o cliente.
 */

import { Check } from "lucide-react";
import { fmtBRL } from "@/lib/format";

export type OpcionalItem = {
  name: string;
  price: number;
  description?: string | null;
};

export function Opcionais({
  optionals, selecionados, onToggle, forcados = [], titulo = "Opcionais (por pessoa)",
}: {
  optionals: OpcionalItem[];
  selecionados: string[];
  onToggle: (nome: string) => void;
  /** Opcionais que a regra da viagem impõe: marcados, não clicáveis, e
   *  explicados no próprio bloco. */
  forcados?: string[];
  titulo?: string;
}) {
  if (!optionals?.length) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2">{titulo}</p>
      <div className="space-y-2">
        {optionals.map((o) => {
          // Obrigatório não é opcional: fica marcado, não clicável, e rotulado
          // como incluído. Poder desmarcar na tela e o servidor cobrar assim
          // mesmo faria tela e cobrança divergirem.
          const travado = forcados.includes(o.name);
          const on = travado || selecionados.includes(o.name);
          return (
            // Obrigatório usa o MESMO dourado de selecionado: ele ESTÁ
            // selecionado. Quem diz que não é escolha é a frase embaixo e o
            // botão não clicar; cor nova só acrescentaria vocabulário à tela.
            <div key={o.name} className={`rounded-xl border-2 overflow-hidden transition-colors ${
              on ? "border-gold-400 bg-gold-50/60" : "border-gray-200 hover:border-gray-300"
            }`}>
              <button
                type="button"
                disabled={travado}
                onClick={() => { if (!travado) onToggle(o.name); }}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left disabled:cursor-default"
              >
                {/* `min-w-0` deixa o nome longo quebrar dentro da própria
                    coluna, em vez de empurrar o preço para fora. */}
                <span className="flex-1 min-w-0 text-sm text-navy-800 leading-snug">
                  {o.name}
                  {/* O que o item inclui, na hora de ESCOLHER. */}
                  {o.description && (
                    <span className="block text-xs text-gray-500 leading-snug mt-0.5 font-normal">
                      {o.description}
                    </span>
                  )}
                </span>
                {/* `whitespace-nowrap` e `shrink-0`: o preço nunca quebra em
                    "+ R$" numa linha e "210,00" na outra. */}
                <span className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-semibold text-navy-700 whitespace-nowrap">
                    + R$ {fmtBRL(o.price)}
                  </span>
                  <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    on ? "bg-gold-500 border-gold-500" : "border-gray-300"
                  }`}>
                    {on && <Check size={11} className="text-white" />}
                  </span>
                </span>
              </button>

              {/* Uma frase só, respondendo na ordem: o QUE é (obrigatório),
                  QUANDO (um adulto e criança), POR QUE (quarto não dividido) e
                  COMO SAIR. */}
              {travado && (
                <p className="px-3 pb-2.5 -mt-0.5 text-[11px] text-gold-800 leading-snug">
                  <strong className="font-semibold">Obrigatório com apenas um adulto e criança:</strong>{" "}
                  o quarto não é dividido com outros passageiros.
                  <span className="text-gray-600"> Inclua um segundo adulto e este valor deixa de ser cobrado.</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
