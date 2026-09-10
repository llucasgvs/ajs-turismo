"use client";

/* Pagamento do COMBO: uma cobrança, N reservas.
 *
 * A tela de `/reservar/[code]` é feita para UMA reserva: ela edita pessoas,
 * opcionais e data, e cobra aquela viagem. No combo isso não cabe. O pacote já
 * foi montado na página do combo (datas, pessoas e opcionais de cada perna), e
 * aqui só falta pagar. Editar uma perna sozinha, aliás, o servidor recusa: o
 * valor dela é a fatia do pacote com o desconto dentro, e mexer nela quebraria
 * a conta da cobrança.
 *
 * Então esta tela é curta de propósito: mostra o que está sendo comprado, com
 * as N viagens e suas datas, e paga. Os painéis de PIX e cartão são os MESMOS
 * da reserva avulsa (`components/pagamento/Paineis`), com o endereço apontando
 * para o grupo. Duplicar o formulário de cartão seria manter dois vivos.
 *
 * O estado vem sempre do servidor (`GET /combos/carrinho/{grupo}`), e não da
 * resposta do checkout: quem recarrega a página, volta pelo histórico ou abre
 * o link no celular precisa encontrar a mesma tela.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, Calendar, Check, CreditCard, Loader2, Lock, Package, QrCode,
} from "lucide-react";
import Footer from "@/components/Footer";
import {
  CardBrandLogo, CardPanel, MethodRadio, PixPanel, type InstallmentOption,
} from "@/components/pagamento/Paineis";
import { apiFetch, getToken } from "@/lib/api";
import { fmtBRL, erroDaApi } from "@/lib/format";

type PernaDoCarrinho = {
  booking_code: string;
  trip_id: number;
  titulo: string;
  data: string | null;
  valor: number;
};

type Carrinho = {
  combo_grupo: string;
  combo_id: number;
  combo_nome: string;
  final_amount: number;
  desconto: number;
  max_installments: number;
  installment_options: InstallmentOption[];
  pernas: PernaDoCarrinho[];
  /** pending, confirmed ou parcial. */
  status: string;
};

type Metodo = "pix" | "card";

/** Data por extenso, no fuso de Brasília. Fatiar o ISO cru usaria a data em
 *  UTC, que vira o dia seguinte em saídas de fim de noite. */
function dataLonga(iso: string | null) {
  if (!iso) return "data a confirmar";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric",
  });
}

function Topo() {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon_ajs.png" alt="AJS Turismo" className="w-9 h-9 object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="font-display font-black text-navy-900 text-base tracking-tight">AJS</span>
            <span className="text-gold-500 text-[10px] font-semibold tracking-[0.2em] uppercase leading-none">Turismo</span>
          </div>
        </Link>
        <span className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
          <Lock size={13} className="text-emerald-500" /> Pagamento 100% seguro
        </span>
      </div>
    </header>
  );
}

/** As viagens do pacote. Aparece na lateral no desktop e no topo no celular:
 *  é o que o cliente confere antes de digitar o cartão. */
function ResumoDoPacote({ c }: { c: Carrinho }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 bg-gold-500 text-navy-900 text-[11px] font-bold px-2 py-0.5 rounded-full">
          <Package size={10} /> Combo
        </span>
        <h2 className="font-bold text-navy-800 leading-tight min-w-0 truncate">{c.combo_nome}</h2>
      </div>

      <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
        {c.pernas.map((p, i) => (
          <div key={p.booking_code} className="px-3.5 py-3">
            <p className="text-[10px] font-bold text-gold-600 uppercase tracking-wide">
              Viagem {i + 1} de {c.pernas.length}
            </p>
            <p className="text-sm font-semibold text-navy-800 leading-snug">{p.titulo}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
              <Calendar size={11} className="text-gold-500 flex-shrink-0" /> {dataLonga(p.data)}
            </p>
            {/* O código de cada reserva aparece porque é ele que vale na porta
                do ônibus, e é por ele que o cliente fala com a agência. */}
            <p className="text-[11px] text-gray-400 mt-1">{p.booking_code}</p>
          </div>
        ))}
      </div>

      {/* Um valor só, o do pacote.
          O valor de cada perna NÃO aparece: ele é o rateio do desconto, não um
          preço pelo qual a AJS vende aquela viagem. Impresso numa tela que o
          cliente guarda, vira o argumento do dia em que alguém cancelar uma das
          viagens e pedir aquele valor de volta. */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        {c.desconto > 0 && (
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Desconto do combo</span>
            <span className="font-semibold text-emerald-600">- R$ {fmtBRL(c.desconto)}</span>
          </div>
        )}
        <div className="flex items-end justify-between gap-2">
          <span className="text-sm text-gray-500">Total do pacote</span>
          <span className="font-display font-black text-2xl text-navy-800 whitespace-nowrap">
            R$ {fmtBRL(c.final_amount)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Sucesso({ c }: { c: Carrinho }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
        <Check className="text-emerald-500" size={28} />
      </div>
      <h1 className="font-display font-black text-2xl text-navy-800 mb-2">Combo confirmado</h1>
      <p className="text-gray-500 text-sm mb-6">
        Suas {c.pernas.length} viagens estão reservadas. O voucher de cada uma está no seu painel,
        e é ele que vale no dia do embarque.
      </p>
      <Link href="/minhas-reservas"
        className="inline-block bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 px-8 rounded-xl transition-colors">
        Ver minhas reservas
      </Link>
    </div>
  );
}

/* Pagou, e uma das viagens ficou sem vaga no caminho.
 *
 * Acontece porque reserva pendente não segura poltrona: entre montar o pacote e
 * pagar, um ônibus pode encher. A decisão do dono é salvar o que dá, em vez de
 * cancelar o pacote inteiro, e a tela precisa dizer isso em vez de fingir que
 * deu tudo certo. */
function Parcial({ c }: { c: Carrinho }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <div className="flex items-start gap-3 bg-gold-50 border border-gold-200 rounded-xl px-4 py-3 mb-5">
        <AlertTriangle size={18} className="text-gold-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-navy-800 text-sm">Pagamento recebido, com uma pendência</p>
          <p className="text-xs text-navy-700 mt-1 leading-relaxed">
            Uma das viagens do combo ficou sem vaga entre a escolha e o pagamento. Nossa equipe já
            foi avisada e vai falar com você para remarcar essa viagem ou devolver a parte dela.
            As demais estão confirmadas.
          </p>
        </div>
      </div>
      <Link href="/minhas-reservas"
        className="inline-block bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 px-8 rounded-xl transition-colors">
        Ver minhas reservas
      </Link>
      <p className="text-[11px] text-gray-400 mt-4">Pacote {c.combo_grupo}</p>
    </div>
  );
}

export default function PagarComboPage({ params }: { params: { grupo: string } }) {
  const grupo = params.grupo.toUpperCase();
  const router = useRouter();
  const [carrinho, setCarrinho] = useState<Carrinho | null>(null);
  const [erro, setErro] = useState("");
  const [metodo, setMetodo] = useState<Metodo>("pix");
  const [parcelas, setParcelas] = useState(1);

  const carregar = useCallback(async () => {
    try {
      const r = await apiFetch(`/combos/carrinho/${grupo}`);
      if (!r.ok) { setErro(await erroDaApi(r, "Não encontramos este combo.")); return; }
      const d: Carrinho = await r.json();
      setCarrinho(d);
    } catch { setErro("Erro de conexão."); }
  }, [grupo]);

  useEffect(() => {
    // Sem conta não há o que pagar: o carrinho é do cliente. Volta para cá
    // depois do login, para ninguém perder o pacote que acabou de montar.
    if (!getToken()) {
      router.replace(`/login?redirect=${encodeURIComponent(`/reservar/combo/${grupo}`)}`);
      return;
    }
    carregar();
  }, [carregar, grupo, router]);

  /* O PIX cai por webhook, e o painel pergunta de tempos em tempos se já caiu.
     Devolve "confirmed" quando o PACOTE fechou: perguntar por uma perna
     responderia por ela, e o cliente comprou o conjunto. */
  const consultarStatus = useCallback(async (): Promise<string | null> => {
    try {
      const r = await apiFetch(`/payments/combo/${grupo}/status`);
      if (!r.ok) return null;
      const d = await r.json();
      if (d.status === "confirmed" || d.status === "parcial") carregar();
      return d.status;
    } catch { return null; }
  }, [grupo, carregar]);

  const aoConfirmar = useCallback(() => { carregar(); }, [carregar]);

  if (erro) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Topo />
        <main className="flex-1 max-w-md mx-auto px-4 py-16 text-center">
          <p className="text-navy-800 font-semibold mb-2">{erro}</p>
          <Link href="/viagens" className="text-navy-600 underline text-sm">Voltar para as viagens</Link>
        </main>
        <Footer />
      </div>
    );
  }

  if (!carrinho) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Topo />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-navy-400" size={28} />
        </main>
      </div>
    );
  }

  const pago = carrinho.status === "confirmed";
  const parcial = carrinho.status === "parcial";
  const semJuros = carrinho.installment_options.filter((o) => o.interest_free).length
    || carrinho.max_installments;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Topo />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full">
        {pago ? (
          <div className="max-w-lg mx-auto"><Sucesso c={carrinho} /></div>
        ) : parcial ? (
          <div className="max-w-lg mx-auto"><Parcial c={carrinho} /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* No celular o resumo vem PRIMEIRO: é o que o cliente confere antes
                de digitar o cartão. No desktop ele fica na lateral. */}
            <div className="lg:col-span-2 lg:order-2">
              <div className="lg:sticky lg:top-20">
                <ResumoDoPacote c={carrinho} />
              </div>
            </div>

            <div className="lg:col-span-3 lg:order-1">
              <div className="bg-white rounded-2xl shadow-sm">
                <header className="px-5 py-4 border-b border-gray-100">
                  <h1 className="font-bold text-navy-800">Forma de pagamento</h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Uma cobrança só, para as {carrinho.pernas.length} viagens do combo.
                  </p>
                </header>

                <div className="p-5">
                  <div className="space-y-2">
                    <MethodRadio
                      icon={<QrCode size={18} />} label="PIX" hint="Aprovação na hora"
                      selected={metodo === "pix"} onClick={() => setMetodo("pix")}
                    />
                    <MethodRadio
                      icon={<CreditCard size={18} />} label="Cartão de crédito"
                      hint={semJuros > 1 ? `até ${semJuros}x sem juros` : "à vista ou parcelado"}
                      selected={metodo === "card"} onClick={() => setMetodo("card")}
                    />
                  </div>

                  <div key={metodo} className="mt-5 animate-pop">
                    {metodo === "pix" && (
                      <PixPanel
                        base={`/payments/combo/${grupo}`}
                        amount={carrinho.final_amount}
                        onConfirmed={aoConfirmar}
                        pollStatus={consultarStatus}
                      />
                    )}
                    {metodo === "card" && (
                      <CardPanel
                        base={`/payments/combo/${grupo}`}
                        amount={carrinho.final_amount}
                        options={carrinho.installment_options}
                        installments={parcelas}
                        setInstallments={setParcelas}
                        onConfirmed={aoConfirmar}
                      />
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <CardBrandLogo brand="Visa" /><CardBrandLogo brand="Mastercard" />
                      <CardBrandLogo brand="Elo" /><CardBrandLogo brand="Amex" />
                      <span className="text-[11px] text-gray-400 ml-1">e PIX</span>
                    </div>
                    <p className="text-center text-[11px] text-gray-400 leading-relaxed">
                      Ao concluir o pagamento, você concorda com os{" "}
                      <a href="/termos" target="_blank" rel="noopener noreferrer" className="underline hover:text-navy-600">Termos de reserva</a> e a{" "}
                      <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline hover:text-navy-600">Política de privacidade</a>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
