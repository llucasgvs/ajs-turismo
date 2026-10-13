import { ChevronDown, HelpCircle } from "lucide-react";
import type { Trip } from "@/types/trip";
import { BOOKING_CUTOFF_DAYS } from "@/lib/format";

/**
 * Perguntas frequentes da página da viagem.
 *
 * Toda resposta sai do cadastro (roteiro e data). Nada é escrito à mão aqui:
 * se o campo está vazio no admin, a pergunta simplesmente não aparece, para a
 * página nunca afirmar algo que a AJS não cadastrou. Regras que não estão no
 * cadastro (chuva, cancelamento) só entram depois de o dono definir o texto.
 *
 * Sem JavaScript: <details> abre e fecha sozinho, funciona igual no celular e
 * no computador, e o texto já vai no HTML que o Google lê.
 */

export type Pergunta = { pergunta: string; resposta: string; lista?: string[]; preformatado?: boolean };

const TZ = "America/Sao_Paulo";

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

function dia(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ, day: "numeric", month: "long" });
}

function mesmoDia(a: string, b: string): boolean {
  const f = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
  return f(a) === f(b);
}

function juntar(itens: string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/**
 * `trip` traz o que é do roteiro (inclui, documentos, embarque); `data` é a
 * saída que está selecionada na página, de onde vêm horário, parcelas e faixas.
 * `comDatas` é falso em roteiro sob cotação ou sem data aberta.
 */
export function montarPerguntas(trip: Trip, data: Trip, comDatas: boolean): Pergunta[] {
  const p: Pergunta[] = [];
  const locais = (trip.departure_locations || []).filter(Boolean);
  const inclui = (trip.includes || []).filter(Boolean);
  const naoInclui = (trip.excludes || []).filter(Boolean);
  const opcionais = (trip.optionals || []).map((o) => o.name).filter(Boolean);
  const faixas = (data.price_tiers || []).filter((f) => (f.name || f.label));
  const vendaOnline = comDatas && !trip.whatsapp_only && !trip.quote_only;

  if (comDatas && data.departure_date && data.return_date) {
    const sai = hora(data.departure_date);
    const volta = hora(data.return_date);
    p.push({
      pergunta: "Que horas sai e que horas volta?",
      resposta: mesmoDia(data.departure_date, data.return_date)
        ? `É bate e volta. Na saída de ${dia(data.departure_date)}, o embarque é às ${sai} e o retorno está previsto para ${volta} do mesmo dia. Chegue ao ponto de embarque 10 minutos antes.`
        : `Na saída de ${dia(data.departure_date)}, o embarque é às ${sai} e o retorno está previsto para ${dia(data.return_date)}, às ${volta}. Chegue ao ponto de embarque 10 minutos antes.`,
    });
  }

  if (locais.length) {
    p.push({
      pergunta: "Onde é o embarque?",
      resposta: locais.length === 1 ? `O embarque é em ${locais[0]}.` : "Você escolhe um destes pontos de embarque:",
      lista: locais.length > 1 ? locais : undefined,
    });
  }

  if (inclui.length) {
    p.push({ pergunta: "O que está incluso?", resposta: "Está incluso na viagem:", lista: inclui });
  }

  if (naoInclui.length) {
    p.push({ pergunta: "O que não está incluso?", resposta: "Não está incluso:", lista: naoInclui });
  }

  if (opcionais.length) {
    p.push({
      pergunta: "Tem opcionais?",
      resposta: "Sim. Os opcionais são pagos à parte e você escolhe na hora da reserva:",
      lista: opcionais,
    });
  }

  if (faixas.length) {
    const linhas = faixas.map((f) => {
      const nome = [f.name || f.label, f.age_range].filter(Boolean).join(", ");
      if (Number(f.price) === 0) {
        return f.occupies_seat === false ? `${nome}: não paga e vai no colo, sem ocupar poltrona` : `${nome}: não paga`;
      }
      return `${nome}: valor diferenciado, mostrado na reserva`;
    });
    p.push({ pergunta: "Criança paga?", resposta: "Depende da idade:", lista: linhas });
  }

  if (vendaOnline) {
    const parcelas = Math.max(1, Number(data.max_installments) || 1);
    p.push({
      pergunta: "Como posso pagar?",
      resposta: parcelas > 1
        ? `Pelo próprio site, no PIX ou no cartão de crédito em até ${parcelas}x. A vaga é confirmada assim que o pagamento é aprovado.`
        : "Pelo próprio site, no PIX ou no cartão de crédito. A vaga é confirmada assim que o pagamento é aprovado.",
    });
    p.push({
      pergunta: "Até quando posso comprar?",
      resposta: `Pelo site, até ${BOOKING_CUTOFF_DAYS} dias antes da saída. Depois disso, fale com a nossa equipe pelo WhatsApp.`,
    });
  } else if (trip.whatsapp_only && !trip.quote_only) {
    p.push({
      pergunta: "Como faço a reserva?",
      resposta: "A reserva desta viagem é feita com a nossa equipe pelo WhatsApp.",
    });
  }

  if (trip.required_documents?.trim()) {
    p.push({ pergunta: "Quais documentos preciso levar?", resposta: trip.required_documents.trim(), preformatado: true });
  }

  return p;
}

/** Texto corrido de uma resposta, para os dados estruturados do Google. */
function textoDa(p: Pergunta): string {
  const base = p.resposta.replace(/\s*\n\s*/g, " ");
  return p.lista?.length ? `${base} ${juntar(p.lista)}.` : base;
}

export default function PerguntasFrequentes({ perguntas }: { perguntas: Pergunta[] }) {
  if (perguntas.length < 2) return null;

  const dados = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: perguntas.map((p) => ({
      "@type": "Question",
      name: p.pergunta,
      acceptedAnswer: { "@type": "Answer", text: textoDa(p) },
    })),
  };

  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm" aria-labelledby="perguntas-frequentes">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados) }} />
      <h2 id="perguntas-frequentes" className="font-display font-black text-lg text-navy-800 flex items-center gap-2 mb-2">
        <HelpCircle size={18} className="text-gold-500" /> Perguntas frequentes
      </h2>
      <div className="divide-y divide-gray-100">
        {perguntas.map((p) => (
          <details key={p.pergunta} className="group py-1">
            <summary className="flex items-center justify-between gap-3 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span className="font-semibold text-navy-800 text-sm sm:text-[15px]">{p.pergunta}</span>
              <ChevronDown size={18} className="text-navy-400 flex-shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="pb-3 text-sm text-gray-600 leading-relaxed">
              <p className={p.preformatado ? "whitespace-pre-line" : undefined}>{p.resposta}</p>
              {p.lista && (
                <ul className="mt-2 space-y-1">
                  {p.lista.map((item) => (
                    <li key={item} className="flex gap-2"><span className="text-gold-500">•</span><span>{item}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
