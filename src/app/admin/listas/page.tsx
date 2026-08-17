"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Users, ArmchairIcon, ChevronRight, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Skel } from "@/components/admin/Skeleton";

type Saida = {
  trip_id: number;
  titulo: string;
  destino: string | null;
  saida: string;
  retorno: string | null;
  passageiros: number;
  assentos: number;
};

/** Data e hora sempre no fuso de São Paulo. Sem isso, uma saída 07:00 de
 *  Curitiba apareceria 10:00 para quem abrisse o painel com o relógio em UTC. */
function dataHora(iso: string) {
  const d = new Date(iso);
  return {
    dia: d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }),
    semana: d.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "America/Sao_Paulo" }),
  };
}

/** Quantos dias faltam, contando em dia de calendário e não em 24h: uma saída
 *  amanhã às 6h precisa dizer "amanhã", não "hoje" por faltar 20 horas. */
function faltam(iso: string): number {
  const fmt = (d: Date) => d.toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
  const hoje = new Date(fmt(new Date()) + "T00:00:00");
  const saida = new Date(fmt(new Date(iso)) + "T00:00:00");
  return Math.round((saida.getTime() - hoje.getTime()) / 86400000);
}

function Prazo({ dias }: { dias: number }) {
  if (dias <= 0) return <span className="text-xs font-bold text-red-600">Hoje</span>;
  if (dias === 1) return <span className="text-xs font-bold text-red-600">Amanhã</span>;
  if (dias <= 7) return <span className="text-xs font-bold text-gold-600">Em {dias} dias</span>;
  return <span className="text-xs text-gray-400">Em {dias} dias</span>;
}

/** Em que bloco a saída cai.
 *
 *  Numa lista plana de 13 datas, a que sai depois de amanhã tem exatamente o
 *  mesmo peso visual da de outubro, e é a de depois de amanhã que precisa de
 *  lista impressa hoje. Os blocos existem para essa urgência aparecer sem o
 *  dono ter que ler data por data. */
const BLOCOS = [
  { titulo: "Esta semana", ate: 7 },
  { titulo: "Próximas duas semanas", ate: 14 },
  { titulo: "Mais adiante", ate: Infinity },
];

export default function ListasPage() {
  const [saidas, setSaidas] = useState<Saida[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch("/listas/embarques");
        if (!r.ok) throw new Error(String(r.status));
        setSaidas(await r.json());
      } catch {
        setErro("Não foi possível carregar as saídas. Tente recarregar a página.");
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-black text-xl sm:text-2xl text-navy-800">Listas de embarque</h1>
        <p className="text-gray-500 text-sm mt-1">
          Escolha a saída para abrir a lista de passageiros e imprimir.
        </p>
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          {erro}
        </div>
      )}

      {/* A altura bate com a do card real. Esqueleto mais baixo que o conteúdo
          faz a página pular quando os dados chegam. */}
      {!saidas && !erro && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skel key={i} className="h-[88px] rounded-2xl" />)}
        </div>
      )}

      {saidas?.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <CalendarDays size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">
            Nenhuma saída futura com passageiro confirmado.
          </p>
        </div>
      )}

      {/* `stagger-in` é do projeto (fade-up de 360ms com 50ms entre itens) e já
          é usada na vitrine. As saídas entram em cascata em vez de todas de uma
          vez. É decorativo e não bloqueia clique. */}
      {BLOCOS.map((bloco, bi) => {
        const anterior = bi === 0 ? -1 : BLOCOS[bi - 1].ate;
        const doBloco = (saidas ?? []).filter((s) => {
          const d = faltam(s.saida);
          return d > anterior && d <= bloco.ate;
        });
        if (doBloco.length === 0) return null;

        return (
          <div key={bloco.titulo} className="space-y-3">
            <div className="flex items-center gap-3 pt-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                {bloco.titulo}
              </h2>
              <span className="h-px bg-gray-200 flex-1" />
              <span className="text-xs text-gray-400">
                {doBloco.length} saída{doBloco.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-3 stagger-in">
              {doBloco.map((s) => {
                const { dia, hora, semana } = dataHora(s.saida);
                const semAssento = s.passageiros - s.assentos;
                return (
                  <Link
                    key={s.trip_id}
                    href={`/admin/listas/${s.trip_id}`}
                    className="card group flex items-center gap-4 p-4 border border-transparent hover:border-gold-400 hover:-translate-y-0.5 active:scale-[0.995] transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-out)]"
                  >
                    <div className="flex-shrink-0 w-16 text-center">
                      <p className="font-display font-black text-lg text-navy-800 leading-none">
                        {dia.slice(0, 5)}
                      </p>
                      <p className="text-[11px] text-gray-400 uppercase mt-0.5">{semana.replace(".", "")}</p>
                      <p className="text-[11px] text-gray-400">{hora}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy-800 text-sm truncate">{s.titulo}</p>
                      {s.destino && <p className="text-gray-500 text-xs truncate">{s.destino}</p>}
                      <div className="mt-1"><Prazo dias={faltam(s.saida)} /></div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-navy-700 font-semibold" title="Passageiros">
                        <Users size={15} className="text-gray-400" />
                        {s.passageiros}
                      </span>
                      {/* Só aparece quando difere: mostrar "12 pax / 12 assentos" em
                          toda linha vira ruído. A diferença é que interessa, porque
                          é ela que muda o que a empresa de ônibus cobra. */}
                      {semAssento > 0 && (
                        <span className="flex items-center gap-1.5 text-gray-500" title="Assentos ocupados">
                          <ArmchairIcon size={15} className="text-gray-400" />
                          {s.assentos}
                        </span>
                      )}
                    </div>

                    <ChevronRight
                      size={18}
                      className="text-gray-300 group-hover:text-gold-500 flex-shrink-0 transition-colors duration-200 ease-[var(--ease-out)]"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
