"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, AlertTriangle, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Skel } from "@/components/admin/Skeleton";

type Passageiro = {
  n: number;
  nome: string;
  cpf: string | null;
  nascimento: string | null;
  idade: number | null;
  /** Anotação discreta ao lado do nome, hoje só "criança de colo". Ausente
   *  quando o backend não conseguiu identificar a pessoa com certeza. */
  nota?: string | null;
  reserva: string;
};

type Lista = {
  viagem: {
    trip_id: number;
    titulo: string;
    destino: string | null;
    saida: string;
    retorno: string | null;
    passageiros: number;
    assentos: number;
    sem_assento: number;
  };
  passageiros: Passageiro[];
  avisos: string[];
};

const SP = "America/Sao_Paulo";

function dia(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: SP }) : "";
}
function hora(iso?: string | null) {
  return iso
    ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: SP })
    : "";
}
/** Nascimento chega como "1980-03-15" puro, sem fuso. Passar pelo `new Date`
 *  interpretaria como UTC e no Brasil viraria 14/03. Por isso é fatiado à mão. */
function nascimentoBR(iso?: string | null) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

/** Nome do arquivo que o navegador sugere ao salvar como PDF.
 *
 *  Quem decide isso é o `document.title`, e sem mexer nele TODA lista salva
 *  como "AJS Turismo - Viagens e excursões saindo de Curitiba.pdf", que é o
 *  título global do site: dez listas viram dez arquivos de nome igual, com
 *  "(1)", "(2)" na frente, e depois ninguém sabe qual é qual.
 *
 *  A data de saída entra para separar uma saída da outra do mesmo roteiro.
 *  Os caracteres proibidos em nome de arquivo saem, senão o navegador corta o
 *  nome no meio (a barra é a pior: vira caminho de pasta). */
function nomeDoArquivo(titulo: string, saidaISO: string) {
  const d = new Date(saidaISO).toLocaleDateString("pt-BR", { timeZone: SP }).replace(/\//g, "-");
  const limpo = titulo.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
  return `Lista de embarque - ${limpo} - ${d}`;
}

export default function ListaEmbarquePage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [dados, setDados] = useState<Lista | null>(null);
  const [erro, setErro] = useState("");

  // Duas coisas enquanto esta tela está aberta, e as duas desfeitas ao sair:
  //
  // O título vira o nome do arquivo que o navegador sugere ao salvar em PDF.
  // Ao sair, volta o original, senão a aba fica com o nome de uma lista que já
  // não está na tela.
  //
  // A marca `folha-aberta` no <html> é o que liga as regras de impressão do
  // globals.css. Sem ela, aquelas regras valeriam para o site inteiro e um
  // cliente imprimindo a página de uma viagem perderia menu e rodapé.
  useEffect(() => {
    if (!dados) return;
    const original = document.title;
    document.title = nomeDoArquivo(dados.viagem.titulo, dados.viagem.saida);
    document.documentElement.classList.add("folha-aberta");
    return () => {
      document.title = original;
      document.documentElement.classList.remove("folha-aberta");
    };
  }, [dados]);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch(`/listas/embarques/${tripId}`);
        if (r.status === 404) return setErro("Saída não encontrada.");
        if (!r.ok) throw new Error(String(r.status));
        setDados(await r.json());
      } catch {
        setErro("Não foi possível carregar a lista. Tente recarregar a página.");
      }
    })();
  }, [tripId]);

  if (erro) {
    return (
      <div className="space-y-4">
        <Link href="/admin/listas" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-navy-700">
          <ArrowLeft size={16} /> Voltar para as listas
        </Link>
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          {erro}
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="space-y-4">
        <Skel className="h-6 w-40" />
        <Skel className="h-24 rounded-2xl" />
        <Skel className="h-64 rounded-2xl" />
      </div>
    );
  }

  const v = dados.viagem;

  // Calculado na renderização, não num `useState`: o que vale é o instante em
  // que a folha foi para o papel, e recarregar a página gera folha nova.
  const emitidaEm = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: SP,
  });

  return (
    <>
      {/* As regras de impressão vivem no globals.css, junto do resto do CSS
          global do projeto. Aqui só marcamos o que é navegação
          (`nao-imprimir`) e o que é papel (`folha`). */}
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 nao-imprimir">
          <Link href="/admin/listas" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-navy-700">
            <ArrowLeft size={16} /> Voltar para as listas
          </Link>
          <button
            onClick={() => window.print()}
            className="btn-navy inline-flex items-center gap-2 py-2.5 px-5"
          >
            <Printer size={16} /> Imprimir
          </button>
        </div>

        {/* A trava de contagem. Fica FORA da área de impressão de propósito: é
            recado para quem monta a lista resolver antes, não informação para o
            motorista levar na estrada.

            Quem cai aqui é quase sempre VENDA DE BALCÃO. Pelo site é impossível:
            o checkout gera exatamente `num_travelers - 1` campos e exige nome,
            CPF e nascimento em cada um. Já o balcão aceita marcar 4 pessoas e
            cadastrar 1 nome - nem o formulário, nem o schema, nem o endpoint
            conferem a contagem. Por isso o texto aponta para esse caminho, em
            vez de sugerir que o cliente errou. */}
        {dados.avisos.length > 0 && (
          <div className="nao-imprimir bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
            <p className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
              <AlertTriangle size={16} />
              A folha vai sair com menos nomes do que passageiros
            </p>
            {dados.avisos.map((a, i) => (
              <p key={i} className="text-amber-700 text-sm">{a}</p>
            ))}
            <p className="text-amber-600 text-xs pt-1">
              Costuma ser venda de balcão cadastrada sem os acompanhantes. Complete
              em Reservas para todo mundo constar.
            </p>
          </div>
        )}

        {/* `.card` dá o raio e a sombra da casa. O `hover:shadow-card` anula de
            propósito a variação de sombra que a classe traz no hover: aqui a
            folha não é clicável, e sombra que reage ao mouse promete um clique
            que não existe. */}
        <div className="folha card hover:shadow-card">
          {/* Cabeçalho de DOCUMENTO, não de painel. Esta folha é o único
              artefato que sai da empresa: vai para o motorista e para a empresa
              de ônibus. A logo faz ela chegar como papel oficial da AJS, e não
              como impressão de tela. */}
          <div className="p-5 border-b-2 border-navy-700">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo_horizontal.png" alt="AJS Turismo" className="h-9 mb-3" />
                <h1 className="font-display font-black text-xl text-navy-800 leading-tight">
                  {v.titulo}
                </h1>
                {v.destino && <p className="text-gray-500 text-sm">{v.destino}</p>}
                <p className="text-navy-700 text-sm font-semibold mt-2">
                  Saída {dia(v.saida)} às {hora(v.saida)}
                  {v.retorno && (
                    <span className="text-gray-500 font-normal"> · retorno {dia(v.retorno)}</span>
                  )}
                </p>
              </div>

              {/* A contagem é o número que a empresa de ônibus confere primeiro,
                  e estava como texto cinza pequeno. Vira bloco, porque é o dado
                  que se procura de longe numa folha na mão. */}
              <div className="flex-shrink-0">
                <div className="flex gap-5 text-center">
                  <div>
                    <p className="font-display font-black text-3xl text-navy-800 leading-none">
                      {v.passageiros}
                    </p>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">
                      passageiro{v.passageiros === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div>
                    <p className="font-display font-black text-3xl text-navy-800 leading-none">
                      {v.assentos}
                    </p>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">
                      assento{v.assentos === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                {/* Fica logo abaixo dos dois números porque é a explicação de
                    por que eles divergem. Longe deles, virava frase solta. */}
                {v.sem_assento > 0 && (
                  <p className="text-[11px] text-gray-500 text-center mt-2 leading-snug">
                    {v.sem_assento} criança{v.sem_assento === 1 ? "" : "s"} de colo,
                    <br />sem ocupar poltrona.
                  </p>
                )}
              </div>
            </div>
          </div>

          {dados.passageiros.length === 0 ? (
            <p className="p-8 text-center text-gray-500 text-sm">
              Nenhum passageiro confirmado nesta saída.
            </p>
          ) : (
            <div className="overflow-x-auto">
              {/* `border-collapse: collapse` não é detalhe: no padrão
                  (`separate`) cada célula desenha a própria borda, e no
                  arredondamento de subpixel da impressão elas não encostam - a
                  linha vertical da direita sai picotada no PDF. Colapsando, as
                  bordas viram uma linha só e contínua. */}
              {/* `table-fixed` com larguras declaradas.

                  No padrão (largura automática) o navegador reparte a tabela
                  conforme o conteúdo: bastava UM nome longo para a coluna Nome
                  crescer, espremer as outras e quebrar o CPF de todo mundo em
                  duas linhas. Três das quatro colunas têm largura conhecida e
                  constante - CPF são sempre 14 caracteres, data 10, idade no
                  máximo 3 - então elas ficam fixas e só o nome cede.

                  `min-w` para que em tela estreita a tabela role no contêiner
                  em vez de esmagar as colunas. */}
              <table className="w-full text-sm border-collapse table-fixed min-w-[580px]">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-600">
                    <th className="px-3 py-2.5 font-semibold w-[7%]">#</th>
                    <th className="px-3 py-2.5 font-semibold w-[45%]">Nome</th>
                    <th className="px-3 py-2.5 font-semibold w-[22%]">CPF</th>
                    <th className="px-3 py-2.5 font-semibold w-[18%]">Nascimento</th>
                    <th className="px-3 py-2.5 font-semibold text-center w-[8%]">Idade</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.passageiros.map((p) => (
                    // Zebra: numa folha de 40 linhas com quatro colunas, o olho
                    // troca de linha no meio do caminho e lê o CPF de outra
                    // pessoa. É a razão de manifesto de embarque ser listrado.
                    <tr key={`${p.reserva}-${p.n}`} className="border-t border-gray-100 even:bg-gray-50/70">
                      <td className="px-3 py-2.5 text-gray-400 align-top tabular-nums">{p.n}</td>
                      {/* `align-top`: quando um nome quebra em duas linhas, os
                          demais campos da linha ficam alinhados pelo topo, e não
                          centralizados no meio do vão. */}
                      <td className="px-3 py-2.5 font-medium text-navy-800 align-top break-words">
                        {p.nome}
                        {/* Discreto de propósito: quem confere na porta procura
                            nome, e a nota não pode competir com ele. Só aparece
                            quando o backend conseguiu identificar a pessoa sem
                            ambiguidade. */}
                        {p.nota && (
                          <span className="text-gray-400 font-normal italic ml-1.5">
                            ({p.nota})
                          </span>
                        )}
                      </td>
                      {/* `whitespace-nowrap`: documento nunca pode quebrar no
                          meio. CPF partido em duas linhas é erro de leitura na
                          conferência, não questão de estética. */}
                      <td className="px-3 py-2.5 text-gray-700 tabular-nums align-top whitespace-nowrap">
                        {p.cpf || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 tabular-nums align-top whitespace-nowrap">
                        {nascimentoBR(p.nascimento)}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-700 tabular-nums align-top">
                        {p.idade ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Data de emissão. Existe por um motivo prático: se você corrigir um
              nome e reimprimir, passam a existir duas folhas parecidas, e sem
              carimbo ninguém sabe qual é a boa. */}
          <div className="px-5 py-3 border-t border-gray-200 text-right text-[11px] text-gray-400">
            Emitida em {emitidaEm}
          </div>
        </div>
      </div>
    </>
  );
}
