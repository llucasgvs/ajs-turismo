"use client";

/* O resumo do COMBO dentro do checkout, editável durante os passos.
 *
 * O checkout de viagem avulsa deixa mexer no resumo enquanto o cliente preenche
 * os passos: trocar a data, mudar quem vai, marcar um opcional. O combo tem que
 * se comportar igual, e não travar o cliente que percebeu no último instante
 * que a data está errada.
 *
 * A diferença é que aqui não há uma viagem, e sim N. Então o bloco repete, por
 * perna, o MESMO desenho da página do combo: a data com "Trocar" e os opcionais
 * daquela viagem. Os componentes são literalmente os mesmos
 * (`components/viagem/Datas` e `components/viagem/Opcionais`), e os dados vêm
 * da MESMA fonte que a página do combo usa (`/combos/by-slug`), em vez de um
 * endpoint só para a edição.
 *
 * Quem salva é `POST /combos/checkout`, que já sabe refazer um carrinho: mesmas
 * datas, ele atualiza os valores no mesmo grupo; datas diferentes, ele cancela
 * o antigo e abre outro, matando a cobrança velha no Asaas para ninguém pagar
 * um PIX que não vale mais. Nada disso é novo: é o mesmo caminho pelo qual o
 * carrinho nasceu.
 */

import { useCallback, useEffect, useState } from "react";
import { Calendar, Loader2, Minus, Package, Plus } from "lucide-react";
import {
  COMPACT_THRESHOLD, CompactDateSelector, DataEscolhida, DateSelector,
  type DataSelecionavel,
} from "@/components/viagem/Datas";
import { Opcionais } from "@/components/viagem/Opcionais";
import { apiFetch } from "@/lib/api";
import { QUARTO_SINGLE, quartoObrigatorio } from "@/lib/opcionais";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADULTO = "Adulto";

type Faixa = { name: string; age_range: string; occupies_seat: boolean };

type DataDoRoteiro = {
  trip_id: number;
  departure_date: string;
  return_date?: string | null;
  price_per_person: number;
  original_price?: number | null;
  available_spots: number;
  optionals: { name: string; price: number; description?: string | null }[];
  tem_hospedagem: boolean;
};

type RoteiroDoCombo = {
  template_id: number;
  title: string;
  datas: DataDoRoteiro[];
};

type ComboPublico = {
  id: number;
  nome: string;
  desconto_pct: number;
  price_tiers: Faixa[];
  roteiros: RoteiroDoCombo[];
};

export type PernaAtual = {
  booking_code: string;
  trip_id: number;
  trip_title?: string | null;
  trip_departure_date?: string | null;
  trip_return_date?: string | null;
  trip_template_id?: number | null;
  selected_optionals?: { name: string; price: number }[];
};

const rotuloFaixa = (f: Faixa) => (f.age_range ? `${f.name} (${f.age_range})` : f.name);

/** A data do combo no formato que o seletor de viagem entende. */
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

export function ComboEditavel({
  slug, nome, pernas, faixasAtuais, numViajantes, editavel, aoSalvar,
}: {
  slug?: string | null;
  nome?: string | null;
  pernas: PernaAtual[];
  faixasAtuais: { label: string; qty: number }[];
  numViajantes: number;
  /** Depois de pago não se edita mais nada: fica só a leitura. */
  editavel: boolean;
  /** Recebe o grupo devolvido pelo servidor. Muda quando as datas mudam. */
  aoSalvar: (grupo: string) => void;
}) {
  const [combo, setCombo] = useState<ComboPublico | null>(null);
  const [aberta, setAberta] = useState<Record<number, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Escolha atual: qual data e quais opcionais em cada roteiro.
  const [escolha, setEscolha] = useState<Record<number, number>>({});
  const [opcionais, setOpcionais] = useState<Record<number, string[]>>({});
  const [porFaixa, setPorFaixa] = useState<Record<string, number>>({});

  useEffect(() => {
    const porRoteiro: Record<number, number> = {};
    const opc: Record<number, string[]> = {};
    for (const p of pernas) {
      if (p.trip_template_id) porRoteiro[p.trip_template_id] = p.trip_id;
      opc[p.trip_id] = (p.selected_optionals || [])
        // O quarto obrigatório não é escolha: ele é derivado da composição, e
        // guardá-lo aqui o deixaria preso mesmo quando a regra parasse de valer.
        .filter((o) => o.name !== QUARTO_SINGLE)
        .map((o) => o.name);
    }
    setEscolha(porRoteiro);
    setOpcionais(opc);
    setPorFaixa(
      faixasAtuais.length
        ? Object.fromEntries(faixasAtuais.map((f) => [f.label, f.qty]))
        : { [ADULTO]: numViajantes },
    );
  }, [pernas, faixasAtuais, numViajantes]);

  useEffect(() => {
    if (!slug || !editavel) return;
    let vivo = true;
    fetch(`${API}/combos/by-slug/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d) setCombo(d); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [slug, editavel]);

  const temFaixas = (combo?.price_tiers ?? []).length > 0;
  const totalPessoas = temFaixas
    ? Object.values(porFaixa).reduce((a, b) => a + b, 0)
    : (porFaixa[ADULTO] ?? numViajantes);
  const adultos = temFaixas ? (porFaixa[ADULTO] ?? 0) : totalPessoas;

  /* Manda a composição inteira, sempre. O servidor recalcula tudo e devolve o
     grupo: não existe atualização parcial de um pacote. */
  const salvar = useCallback(async (
    novaEscolha: Record<number, number>,
    novosOpcionais: Record<number, string[]>,
    novasFaixas: Record<string, number>,
  ) => {
    if (!combo) return;
    const pessoas = temFaixas
      ? Object.values(novasFaixas).reduce((a, b) => a + b, 0)
      : (novasFaixas[ADULTO] ?? numViajantes);
    const adultosAgora = temFaixas ? (novasFaixas[ADULTO] ?? 0) : pessoas;
    if (temFaixas && adultosAgora < 1) {
      setErro("A reserva precisa de pelo menos um adulto."); return;
    }
    setSalvando(true); setErro("");
    try {
      const corpo = {
        combo_id: combo.id,
        num_travelers: pessoas,
        tier_breakdown: temFaixas
          ? Object.entries(novasFaixas).filter(([, q]) => q > 0).map(([label, qty]) => ({ label, qty }))
          : [],
        pernas: combo.roteiros.map((r) => {
          const tripId = novaEscolha[r.template_id];
          return {
            trip_id: tripId,
            // Só o nome: o preço vem do servidor, sempre.
            selected_optionals: (novosOpcionais[tripId] ?? []).map((name) => ({ name })),
          };
        }),
      };
      const res = await apiFetch("/combos/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const d = await res.json();
      if (!res.ok) {
        setErro(typeof d.detail === "string" ? d.detail : "Não foi possível atualizar o combo.");
        return;
      }
      aoSalvar(d.combo_grupo);
    } catch {
      setErro("Erro de conexão. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }, [combo, temFaixas, numViajantes, aoSalvar]);

  const trocarData = (templateId: number, tripId: number) => {
    const nova = { ...escolha, [templateId]: tripId };
    setEscolha(nova);
    setAberta((a) => ({ ...a, [templateId]: false }));
    salvar(nova, opcionais, porFaixa);
  };

  const alternarOpcional = (tripId: number, nome: string) => {
    const atuais = opcionais[tripId] ?? [];
    const novos = {
      ...opcionais,
      [tripId]: atuais.includes(nome) ? atuais.filter((n) => n !== nome) : [...atuais, nome],
    };
    setOpcionais(novos);
    salvar(escolha, novos, porFaixa);
  };

  const mudarFaixa = (label: string, delta: number) => {
    const novas = { ...porFaixa, [label]: Math.max(0, (porFaixa[label] ?? 0) + delta) };
    const pessoas = temFaixas
      ? Object.values(novas).reduce((a, b) => a + b, 0)
      : (novas[ADULTO] ?? 0);
    if (pessoas < 1) return;
    setPorFaixa(novas);
    salvar(escolha, opcionais, novas);
  };

  // Enquanto o combo não chegou, mostra o que já se sabe pelas pernas: o cliente
  // não pode ver a tela vazia enquanto uma consulta carrega.
  const roteiros = combo?.roteiros ?? pernas.map((p) => ({
    template_id: p.trip_template_id ?? p.trip_id,
    title: p.trip_title || "Viagem",
    datas: [] as DataDoRoteiro[],
  }));

  return (
    <div className="p-4">
      {/* O nome inteiro, sem cortar: "Combo Bombinhas + Ilha do Mel +
          Cascaneia" é a lista do que está sendo comprado, e cortada no meio
          esconde um destino. */}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1 bg-gold-500 text-navy-900 text-[11px] font-bold px-2 py-0.5 rounded-full mb-1.5">
          <Package size={10} /> Combo
        </span>
        <p className="font-bold text-navy-800 text-sm leading-snug">{nome || "Seu combo"}</p>
      </div>

      {erro && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">{erro}</p>
      )}

      <div className="space-y-3">
        {roteiros.map((r, i) => {
          const tripId = escolha[r.template_id] ?? pernas[i]?.trip_id;
          const perna = pernas.find((p) => p.trip_id === tripId) ?? pernas[i];
          const data = r.datas.find((d) => d.trip_id === tripId);
          const saida = data?.departure_date ?? perna?.trip_departure_date ?? null;
          const volta = data?.return_date ?? perna?.trip_return_date ?? null;
          const podeTrocar = editavel && r.datas.length > 1;
          const muitasDatas = r.datas.length >= COMPACT_THRESHOLD;
          const quartoTravado = quartoObrigatorio(data?.tem_hospedagem, adultos, totalPessoas);

          return (
            <div key={r.template_id} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
              <p className="text-[10px] font-bold text-gold-600 uppercase tracking-wide">
                Viagem {i + 1} de {roteiros.length}
              </p>
              <p className="text-sm font-semibold text-navy-800 leading-snug break-words">{r.title}</p>

              <div className="mt-1 flex items-start justify-between gap-2">
                <p className="text-xs text-gray-500 flex items-start gap-1.5 min-w-0">
                  <Calendar size={11} className="text-gold-500 shrink-0 mt-0.5" />
                  <span className="break-words">
                    {saida ? <DataEscolhida saida={saida} retorno={volta} /> : "data a confirmar"}
                  </span>
                </p>
                {podeTrocar && (
                  <button
                    type="button" disabled={salvando}
                    onClick={() => setAberta((a) => ({ ...a, [r.template_id]: !a[r.template_id] }))}
                    className="text-xs text-navy-600 font-semibold hover:underline shrink-0 disabled:opacity-50"
                  >
                    {aberta[r.template_id] ? "Fechar" : "Alterar"}
                  </button>
                )}
              </div>
              {/* Sem o código de cada viagem aqui: ver o comentário no card do
                  checkout. Antes de o pagamento confirmar, o código confunde, e
                  num combo seriam três de uma vez. Eles aparecem no voucher de
                  cada viagem, depois de pago. */}

              {aberta[r.template_id] && (
                /* UMA coluna, sempre. Este bloco vive dentro do card do
                   checkout, que no desktop tem 380px: em duas colunas cada
                   cartão ficava com 170px, a data quebrava em duas linhas, o
                   preço saía cortado ("R$ 194,6") e o selo de desconto
                   encavalava. É para isso que o seletor tem o modo de lateral. */
                <div className="mt-2">
                  {muitasDatas ? (
                    <CompactDateSelector
                      trips={r.datas.map(paraSelecao)}
                      selected={data ? paraSelecao(data) : null}
                      onSelect={(d) => trocarData(r.template_id, d.id)}
                      hasError={false}
                      titulo=""
                      descontoPct={combo?.desconto_pct ?? 0}
                      semMoldura
                    />
                  ) : (
                    <DateSelector
                      trips={r.datas.map(paraSelecao)}
                      selected={data ? paraSelecao(data) : null}
                      onSelect={(d) => trocarData(r.template_id, d.id)}
                      hasError={false}
                      titulo=""
                      descontoPct={combo?.desconto_pct ?? 0}
                      semMoldura
                      sidebar
                    />
                  )}
                </div>
              )}

              {/* Os opcionais DESTA viagem, no mesmo cartão da página do combo. */}
              {editavel && data && data.optionals.length > 0 && (
                <div className="mt-3">
                  <Opcionais
                    optionals={data.optionals}
                    selecionados={opcionais[tripId] ?? []}
                    onToggle={(n) => alternarOpcional(tripId, n)}
                    forcados={quartoTravado ? [QUARTO_SINGLE] : []}
                    titulo="Opcionais desta viagem"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quem vai. Vale para as N viagens: é regra do combo que sejam as mesmas
          pessoas nas três. */}
      <div className="border-t border-gray-100 mt-3 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-navy-800">Viajantes</span>
          {salvando && <Loader2 size={13} className="animate-spin text-gray-300" />}
        </div>
        {!editavel || !combo ? (
          <p className="text-sm text-gray-500">{numViajantes} viajante{numViajantes > 1 ? "s" : ""}</p>
        ) : temFaixas ? (
          <div className="space-y-2.5">
            {[{ name: ADULTO, age_range: "", occupies_seat: true } as Faixa, ...combo.price_tiers].map((f) => {
              const label = f.name === ADULTO ? ADULTO : rotuloFaixa(f);
              return (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-600 min-w-0 break-words">{label}</span>
                  <Contador
                    valor={porFaixa[label] ?? 0}
                    onMenos={() => mudarFaixa(label, -1)}
                    onMais={() => mudarFaixa(label, 1)}
                    travado={salvando}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-600">Pessoas</span>
            <Contador
              valor={porFaixa[ADULTO] ?? numViajantes}
              onMenos={() => mudarFaixa(ADULTO, -1)}
              onMais={() => mudarFaixa(ADULTO, 1)}
              travado={salvando}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Contador({ valor, onMenos, onMais, travado }: {
  valor: number; onMenos: () => void; onMais: () => void; travado: boolean;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button type="button" onClick={onMenos} disabled={travado || valor <= 0}
        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-navy-700 disabled:opacity-30 hover:bg-gray-50 transition-colors">
        <Minus size={13} />
      </button>
      <span className="w-5 text-center text-sm font-semibold text-navy-800 tabular-nums">{valor}</span>
      <button type="button" onClick={onMais} disabled={travado}
        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-navy-700 disabled:opacity-30 hover:bg-gray-50 transition-colors">
        <Plus size={13} />
      </button>
    </div>
  );
}
