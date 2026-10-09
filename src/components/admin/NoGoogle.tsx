"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, PencilLine } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { tituloAutomatico, descricaoAutomatica } from "@/lib/seoViagem";

/**
 * Título e descrição da viagem no Google, dentro do formulário do roteiro.
 *
 * Vazio = automático. Em vez de um campo em branco, o campo mostra em cinza o
 * texto que o site está usando, calculado com o que está no formulário agora:
 * mudou o nome ou o "O que inclui", o cinza muda junto.
 */

type Roteiro = {
  title: string;
  destination: string;
  short_description: string;
  includes: string[];
  departure_locations: string[];
  quote_only: boolean;
};

type Data = { departure_date?: string | null; return_date?: string | null } | null;

const SUFIXO = " - AJS Turismo";
const GOOGLE_TITULO = 60;
const GOOGLE_DESCRICAO = 155;

export default function NoGoogle({
  slug,
  roteiro,
  titulo,
  descricao,
  onTitulo,
  onDescricao,
}: {
  slug?: string | null;
  roteiro: Roteiro;
  titulo: string;
  descricao: string;
  onTitulo: (v: string) => void;
  onDescricao: (v: string) => void;
}) {
  // A próxima data à venda, a mesma que a página pública usa para dizer
  // "bate e volta" ou "3 dias". Sem ela, o texto diz só "viagem".
  const [data, setData] = useState<Data>(null);
  useEffect(() => {
    if (!slug) return;
    let vivo = true;
    apiFetch(`/templates/by-slug/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo) setData(d?.trip ?? null); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [slug]);

  const automatico = useMemo(() => {
    try {
      return { titulo: tituloAutomatico(roteiro), descricao: descricaoAutomatica(roteiro, data) };
    } catch {
      return { titulo: roteiro.title, descricao: roteiro.short_description };
    }
  }, [roteiro, data]);

  const tituloFinal = (titulo.trim() || automatico.titulo) + SUFIXO;
  const descricaoFinal = descricao.trim() || automatico.descricao;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 leading-relaxed">
        Como esta viagem aparece na busca do Google e na prévia do link no WhatsApp.
        Em branco, o site escreve sozinho a partir do cadastro: o texto em cinza é o que está valendo.
      </p>

      <Campo
        id="seo_titulo"
        label="Título no Google"
        valor={titulo}
        automatico={automatico.titulo}
        limite={120}
        aoMudar={onTitulo}
        contagem={tituloFinal.length}
        ideal={GOOGLE_TITULO}
        dica={`O "${SUFIXO.trim()}" entra sozinho no fim e já está na contagem.`}
      />

      <Campo
        id="seo_descricao"
        label="Descrição no Google"
        valor={descricao}
        automatico={automatico.descricao}
        limite={320}
        aoMudar={onDescricao}
        contagem={descricaoFinal.length}
        ideal={GOOGLE_DESCRICAO}
        multilinha
        dica="Evite colocar preço: o Google guarda o texto por dias e a promoção muda o valor."
      />

      <div>
        <p className="text-[11px] font-bold text-navy-500 uppercase tracking-wider mb-2">Prévia no Google</p>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
          <p className="text-xs text-gray-600 truncate">ajsturismo.com.br › viagens › {slug || "nova-viagem"}</p>
          <p className="text-[18px] leading-snug text-[#1a0dab] mt-0.5">{tituloFinal}</p>
          <p className="text-[13px] leading-relaxed text-gray-600 mt-1">{descricaoFinal}</p>
        </div>
      </div>
    </div>
  );
}

function Campo({
  id, label, valor, automatico, limite, aoMudar, contagem, ideal, multilinha, dica,
}: {
  id: string;
  label: string;
  valor: string;
  automatico: string;
  limite: number;
  aoMudar: (v: string) => void;
  contagem: number;
  ideal: number;
  multilinha?: boolean;
  dica: string;
}) {
  const manual = valor.trim().length > 0;
  const longo = contagem > ideal;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-navy-700">
          {label}
          <span className={`ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${manual ? "bg-gold-100 text-gold-800" : "bg-gray-100 text-gray-500"}`}>
            {manual ? "Escrito à mão" : "Automático"}
          </span>
        </label>
        {manual ? (
          <button type="button" onClick={() => aoMudar("")}
            className="flex items-center gap-1 text-[11px] font-semibold text-navy-500 hover:text-gold-600 transition-colors">
            <RotateCcw size={12} /> Voltar ao automático
          </button>
        ) : (
          <button type="button" onClick={() => aoMudar(automatico)}
            className="flex items-center gap-1 text-[11px] font-semibold text-navy-500 hover:text-gold-600 transition-colors">
            <PencilLine size={12} /> Editar a partir deste
          </button>
        )}
      </div>
      {multilinha ? (
        <textarea id={id} className="input-field min-h-[84px] resize-y" value={valor} maxLength={limite}
          onChange={(e) => aoMudar(e.target.value)} placeholder={automatico} />
      ) : (
        <input id={id} className="input-field" value={valor} maxLength={limite}
          onChange={(e) => aoMudar(e.target.value)} placeholder={automatico} />
      )}
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 mt-1 text-[11px]">
        <span className="text-gray-400">{dica}</span>
        <span className={longo ? "text-amber-600 font-semibold" : "text-gray-400"}>
          {contagem} caracteres{longo ? ` · o Google mostra cerca de ${ideal}, o resto fica cortado` : ` · o Google mostra cerca de ${ideal}`}
        </span>
      </div>
    </div>
  );
}
