"use client";

/* Os painéis de pagamento: PIX e cartão.
 *
 * Saíram de `/reservar/[code]` quando o combo precisou pagar pelo site. O
 * pacote é UMA cobrança de N reservas, então a tela dele é outra, mas o
 * pagamento em si é idêntico: mesmo QR, mesmo formulário de cartão, mesmo
 * endereço de cobrança, mesma espera pela confirmação.
 *
 * A única diferença entre os dois casos é PARA ONDE cobrar, e por isso ela é o
 * parâmetro `base`: `/payments/AJS-123` numa reserva avulsa,
 * `/payments/combo/CMB-123` num pacote. Duplicar estes painéis para o combo
 * seria manter dois formulários de cartão vivos, e o dia em que um deles
 * ganhasse uma correção o outro ficaria para trás.
 *
 * Nada aqui mudou de comportamento na extração: é o mesmo código que já estava
 * no ar, com o endereço parametrizado.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle, Check, Clock, Copy, CreditCard, Info, Loader2, Lock, MapPin, X,
} from "lucide-react";
import { apiFetch, getUser } from "@/lib/api";
import { fmtBRL } from "@/lib/format";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const PIX_MINUTES = 15; // janela de pagamento do PIX (padrão de mercado: 10-30 min)

export function onlyDigits(s: string) { return s.replace(/\D/g, ""); }

export function maskCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

/* Logos reais das bandeiras (SVG inline, leves) */
export function CardBrandLogo({ brand }: { brand: string }) {
  const wrap = "h-5 w-8 rounded shadow-sm";
  if (brand === "Mastercard") return (
    <svg viewBox="0 0 32 20" className={wrap} aria-label="Mastercard"><rect width="32" height="20" rx="3" fill="#fff" stroke="#eee" /><circle cx="13" cy="10" r="6" fill="#EB001B" /><circle cx="19" cy="10" r="6" fill="#F79E1B" /><path d="M16 5.5a6 6 0 000 9 6 6 0 000-9z" fill="#FF5F00" /></svg>
  );
  if (brand === "Visa") return (
    <svg viewBox="0 0 32 20" className={wrap} aria-label="Visa"><rect width="32" height="20" rx="3" fill="#1A1F71" /><text x="16" y="14" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontStyle="italic" fontFamily="Arial">VISA</text></svg>
  );
  if (brand === "Amex") return (
    <svg viewBox="0 0 32 20" className={wrap} aria-label="Amex"><rect width="32" height="20" rx="3" fill="#2E77BC" /><text x="16" y="13" textAnchor="middle" fill="#fff" fontSize="6.5" fontWeight="700" fontFamily="Arial">AMEX</text></svg>
  );
  if (brand === "Elo") return (
    <svg viewBox="0 0 32 20" className={wrap} aria-label="Elo"><rect width="32" height="20" rx="3" fill="#000" /><text x="16" y="14" textAnchor="middle" fill="#fff" fontSize="8.5" fontWeight="800" fontFamily="Arial">elo</text></svg>
  );
  return null;
}

/* Campo com rótulo - padrão consistente e profissional para os formulários */
export function Field({ label, hint, req, children }: { label: string; hint?: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      {/* flex-wrap: em coluna estreita a dica desce para a linha de baixo em vez
          de se sobrepor ao rotulo. */}
      <span className="flex flex-wrap items-baseline justify-between gap-x-2 mb-1">
        <span className="text-xs font-semibold text-gray-600">{label}{req && <span className="text-red-500"> *</span>}</span>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export type InstallmentOption = { n: number; installment: number; total: number; interest_free: boolean };

export function installmentSub(o: InstallmentOption) {
  return o.interest_free ? (o.n === 1 ? "à vista" : "sem juros") : `com juros · total R$ ${fmtBRL(o.total)}`;
}

/* Seletor de parcelas estilo Airbnb: campo-gatilho + modal central com radios */
export function InstallmentField({ options, value, onChange }: { options: InstallmentOption[]; value: number; onChange: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(value);
  const sel = options.find(o => o.n === value) || options[0];

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const openModal = () => { setTemp(value); setOpen(true); };
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 animate-overlay"
      onClick={e => e.target === e.currentTarget && setOpen(false)}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-modal">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <h3 className="font-display font-black text-xl text-navy-800">Selecione as parcelas</h3>
          <button onClick={() => setOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6">
          {options.map(o => (
            <button key={o.n} type="button" onClick={() => setTemp(o.n)}
              className="w-full flex items-center justify-between py-4 border-b border-gray-100 text-left">
              <span>
                <span className="block text-navy-900 font-medium">{o.n}× de R$ {fmtBRL(o.installment)}</span>
                <span className={`block text-sm ${o.interest_free ? "text-emerald-600" : "text-gray-500"}`}>{installmentSub(o)}</span>
              </span>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${temp === o.n ? "border-navy-700" : "border-gray-300"}`}>
                {temp === o.n && <span className="w-2.5 h-2.5 rounded-full bg-navy-700" />}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={() => setOpen(false)} className="font-semibold text-navy-800 px-3 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={() => { onChange(temp); setOpen(false); }} className="bg-navy-700 hover:bg-navy-600 text-white font-bold px-7 py-2.5 rounded-xl transition-colors">Concluído</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={openModal}
        className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-gray-300 transition-colors flex items-center justify-between gap-3">
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-semibold text-gray-500">Parcelamento</span>
          <span className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-navy-900 font-medium truncate">{sel.n}× de R$ {fmtBRL(sel.installment)}</span>
            <span className={`shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded ${sel.interest_free ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              {sel.interest_free ? (sel.n === 1 ? "à vista" : "sem juros") : "com juros"}
            </span>
          </span>
        </span>
        <span className="text-xs font-semibold text-navy-600 shrink-0 ml-2">Alterar</span>
      </button>
      {open && mounted && createPortal(modal, document.body)}
    </>
  );
}

/* Aviso de erro padronizado - com ícone e destaque sutil */
export function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3.5 py-3 reveal-soft">
      <AlertCircle size={17} className="shrink-0 mt-0.5 text-red-500" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}

/* Aviso neutro (âmbar) - para estados que não são erro (ex.: em análise) */
export function InfoMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-xl px-3.5 py-3 reveal-soft">
      <Clock size={17} className="shrink-0 mt-0.5 text-amber-500" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}

export const FIELD = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 transition";

export function cardBrand(num: string): string | null {
  const n = num.replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^(6011|65|64[4-9])/.test(n)) return "Elo";
  return null;
}

export function MethodRadio({ icon, label, hint, selected, onClick }: { icon: React.ReactNode; label: string; hint: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left ${selected ? "border-navy-600 bg-navy-50/50" : "border-gray-200 hover:border-gray-300"}`}>
      <span className={selected ? "text-navy-700" : "text-gray-400"}>{icon}</span>
      <span className="flex-1"><span className="block font-semibold text-sm text-navy-800">{label}</span><span className="block text-xs text-gray-400">{hint}</span></span>
      <span className={`w-4 h-4 rounded-full border-2 ${selected ? "border-navy-600 bg-navy-600" : "border-gray-300"}`} />
    </button>
  );
}

export function PixPanel({ base, amount, onConfirmed, pollStatus }: {
  /** Onde cobrar: `/payments/AJS-123` numa reserva, `/payments/combo/CMB-123`
   *  num pacote. É a ÚNICA diferença entre os dois casos. */
  base: string;
  amount: number;
  onConfirmed: () => void;
  pollStatus: () => Promise<string | null>;
}) {
  const [qr, setQr] = useState<{ image: string; payload: string; expiresAt: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [info, setInfo] = useState("");

  // Segurança/UX: se o valor da reserva mudar, o QR antigo é inválido - descarta.
  const lastAmount = useRef(amount);
  const hadQr = useRef(false);
  useEffect(() => { hadQr.current = !!qr; }, [qr]);
  useEffect(() => {
    if (lastAmount.current === amount) return;
    lastAmount.current = amount;
    setQr(null);
    setRemaining(null);
    if (hadQr.current) setInfo("O valor foi atualizado. Gere o PIX novamente.");
  }, [amount]);

  const generate = async () => {
    setLoading(true); setError(""); setInfo("");
    try {
      const r = await apiFetch(`${base}/pix`, { method: "POST" });
      if (!r.ok) { const e = await r.json(); setError(typeof e.detail === "string" ? e.detail : "Erro ao gerar o PIX."); return; }
      const d = await r.json();
      // Janela de pagamento (urgência clara). O código real do Asaas dura mais,
      // então se passar disso é só gerar outro - a confirmação continua valendo.
      setQr({ image: d.qr_image, payload: d.qr_payload, expiresAt: Date.now() + PIX_MINUTES * 60 * 1000 });
    } catch { setError("Erro de conexão."); } finally { setLoading(false); }
  };

  // Polling de confirmação - segue mesmo após expirar a janela (pagamento tardio ainda confirma)
  const expired = remaining !== null && remaining <= 0;
  useEffect(() => {
    if (!qr) return;
    const t = setInterval(async () => { const st = await pollStatus(); if (st === "confirmed") { clearInterval(t); onConfirmed(); } }, 3000);
    return () => clearInterval(t);
  }, [qr, pollStatus, onConfirmed]);

  // Contagem regressiva
  useEffect(() => {
    if (!qr?.expiresAt) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, Math.round((qr.expiresAt! - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [qr]);

  const copy = () => { if (!qr) return; navigator.clipboard.writeText(qr.payload); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  // Só mostra contagem regressiva se a janela for curta (≤ 1h); o Asaas pode expirar só em dias.
  const showTimer = remaining != null && remaining > 0 && remaining <= 3600;
  const mmss = showTimer ? `${String(Math.floor(remaining! / 60)).padStart(2, "0")}:${String(remaining! % 60).padStart(2, "0")}` : null;

  if (!qr) return (
    <div className="text-center py-4">
      <p className="text-gray-500 text-sm mb-4">Pague em segundos. Sua vaga é confirmada na hora.</p>
      {error && <div className="mb-3 text-left"><ErrorMsg>{error}</ErrorMsg></div>}
      {info && <div className="mb-3 text-left"><InfoMsg>{info}</InfoMsg></div>}
      <button onClick={generate} disabled={loading} className="bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-60">{loading ? "Gerando..." : "Gerar QR Code PIX"}</button>
    </div>
  );

  if (expired) return (
    <div className="text-center py-6">
      <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
      <p className="font-semibold text-navy-800 mb-1">PIX expirado</p>
      <p className="text-gray-500 text-sm mb-4">O código venceu. Gere um novo para pagar.</p>
      <button onClick={generate} disabled={loading} className="bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-60">{loading ? "Gerando..." : "Gerar novo código"}</button>
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full min-w-0 animate-pop">
      <div className="p-3 bg-white border border-gray-200 rounded-2xl shadow-sm">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`data:image/png;base64,${qr.image}`} alt="QR Code PIX" className="w-44 h-44" /></div>
      {mmss && (
        <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${remaining! < 120 ? "bg-amber-50 text-amber-600" : "bg-navy-50 text-navy-600"}`}>
          <Clock size={12} /> Expira em {mmss}
        </div>
      )}
      <p className="text-sm text-gray-600 mt-3 mb-2 text-center">Escaneie no app do banco, ou copie o código abaixo</p>
      <div className="w-full min-w-0 bg-gray-50 border border-gray-200 rounded-xl p-3">
        <p className="text-[11px] text-gray-500 break-all leading-relaxed max-h-20 overflow-y-auto">{qr.payload}</p>
        <button onClick={copy} className="mt-2 w-full flex items-center justify-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-white text-sm font-bold px-3 py-2.5 rounded-lg transition-colors">{copied ? <><Check size={14} /> Código copiado</> : <><Copy size={14} /> Copiar código PIX</>}</button>
      </div>
      <div className="flex items-center justify-center gap-2 text-navy-600 text-sm mt-4"><Loader2 size={15} className="animate-spin" /> Aguardando pagamento…</div>
    </div>
  );
}

export function CardPanel({ base, amount, options, installments, setInstallments, onConfirmed }: {
  /** Ver PixPanel. */
  base: string;
  amount: number;
  options: InstallmentOption[];
  installments: number;
  setInstallments: (n: number) => void;
  onConfirmed: () => void;
}) {
  const user = typeof window !== "undefined" ? getUser() : null;
  // Pré-preenche o cartão de teste APENAS em ambiente local (sandbox). Nunca em produção.
  const DEV = API.includes("localhost");
  const [number, setNumber] = useState(DEV ? "5162 3062 1937 8829" : ""); const [holder, setHolder] = useState(DEV ? "CLIENTE TESTE" : (user?.full_name || "").toUpperCase());
  const [expiry, setExpiry] = useState(DEV ? "12/30" : ""); const [ccv, setCcv] = useState(DEV ? "318" : "");
  const [cep, setCep] = useState(DEV ? "01310-930" : (user?.postal_code ? maskCEP(user.postal_code) : "")); const [addr, setAddr] = useState(DEV ? "100" : (user?.address_number || "")); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [info, setInfo] = useState("");
  const [cepInfo, setCepInfo] = useState<{ text: string; ok: boolean } | null>(null);
  const onCep = async (v: string) => {
    const m = maskCEP(v); setCep(m); setCepInfo(null);
    const d = onlyDigits(m);
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) { setCepInfo({ text: "CEP não encontrado", ok: false }); return; }
      const parts = [j.logradouro, j.bairro].filter(Boolean).join(", ");
      setCepInfo({ text: `${parts ? parts + " · " : ""}${j.localidade}/${j.uf}`, ok: true });
    } catch { /* offline - não bloqueia */ }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setInfo("");
    const num = onlyDigits(number); const [mm, yy] = expiry.split("/");
    if (num.length < 13) return setError("Número do cartão inválido.");
    if (!mm || !yy) return setError("Validade inválida (MM/AA).");
    if (ccv.length < 3) return setError("CVV inválido.");
    if (onlyDigits(cep).length !== 8) return setError("CEP inválido.");
    if (!addr) return setError("Informe o número do endereço.");
    setLoading(true);
    try {
      const r = await apiFetch(`${base}/card`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ holder_name: holder, number: num, expiry_month: mm, expiry_year: yy, ccv, cpf: onlyDigits(user?.cpf || ""), postal_code: onlyDigits(cep), address_number: addr, phone: onlyDigits(user?.phone || ""), installments }) });
      const d = await r.json();
      if (!r.ok) { setError(typeof d.detail === "string" ? d.detail : "Pagamento não autorizado. Confira os dados do cartão."); return; }
      // Reaproveita o endereço de cobrança na próxima compra (sem re-login).
      try { if (user) localStorage.setItem("ajs_user", JSON.stringify({ ...user, postal_code: onlyDigits(cep), address_number: addr })); } catch { /* ignore */ }
      if (d.status === "confirmed") onConfirmed();
      else setInfo(d.message || "Pagamento em análise. Você será avisado assim que for confirmado.");
    } catch { setError("Erro de conexão. Tente novamente."); } finally { setLoading(false); }
  };
  const brand = cardBrand(number);
  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {info && <InfoMsg>{info}</InfoMsg>}

      {/* Seção: dados do cartão */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-navy-800 uppercase tracking-wide flex items-center gap-1.5"><CreditCard size={14} /> Dados do cartão</p>
        <Field label="Número do cartão" req>
          <div className="relative">
            <input inputMode="numeric" value={number} onChange={e => setNumber(onlyDigits(e.target.value).slice(0, 16).replace(/(.{4})/g, "$1 ").trim())} placeholder="0000 0000 0000 0000" className={`${FIELD} pr-12`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="block transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ opacity: brand ? 1 : 0, transform: brand ? "scale(1)" : "scale(0.8)" }}>{brand && <CardBrandLogo brand={brand} />}</span>
            </span>
          </div>
        </Field>
        <Field label="Nome impresso no cartão" req>
          <input value={holder} onChange={e => setHolder(e.target.value.toUpperCase())} placeholder="COMO ESTÁ NO CARTÃO" className={FIELD} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Validade" req>
            <input inputMode="numeric" value={expiry} onChange={e => { const d = onlyDigits(e.target.value).slice(0, 4); setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d); }} placeholder="MM/AA" className={FIELD} />
          </Field>
          <Field label="CVV" hint="3 dígitos" req>
            <input inputMode="numeric" value={ccv} onChange={e => setCcv(onlyDigits(e.target.value).slice(0, 4))} placeholder="123" className={FIELD} />
          </Field>
        </div>
        {options.length > 1 && <InstallmentField options={options} value={installments} onChange={setInstallments} />}
      </div>

      {/* Seção: endereço de cobrança */}
      <div className="space-y-3 pt-1">
        <p className="text-xs font-bold text-navy-800 uppercase tracking-wide flex items-center gap-1.5"><MapPin size={14} /> Endereço de cobrança</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CEP" req><input inputMode="numeric" value={cep} onChange={e => onCep(e.target.value)} placeholder="00000-000" className={FIELD} /></Field>
          <Field label="Número" req><input inputMode="numeric" value={addr} onChange={e => setAddr(e.target.value)} placeholder="123" className={FIELD} /></Field>
        </div>
        {cepInfo && (
          <p className={`text-xs flex items-center gap-1.5 reveal-soft ${cepInfo.ok ? "text-gray-500" : "text-amber-600"}`}>
            <MapPin size={12} className={cepInfo.ok ? "text-emerald-500" : "text-amber-500"} /> {cepInfo.text}
          </p>
        )}
      </div>

      {/* Valor a pagar, logo antes do botão - só no mobile (no desktop já está no resumo à direita) */}
      {(() => {
        const sel = options.find(o => o.n === installments);
        const com = sel && !sel.interest_free;
        const total = com ? sel!.total : amount;
        return (
          <div className="md:hidden border-t border-gray-100 pt-3 space-y-1">
            {com && (
              <div className="flex justify-between gap-2 text-sm text-gray-500">
                <span className="min-w-0 truncate">{sel!.n}× de R$ {fmtBRL(sel!.installment)}</span>
                <span className="shrink-0 whitespace-nowrap">juros incluído</span>
              </div>
            )}
            <div className="flex items-end justify-between gap-2">
              <span className="text-sm text-gray-500">{com ? "Total no cartão" : sel && sel.n > 1 ? `Total em ${sel.n}×` : "Total"}</span>
              <span className="font-display font-black text-xl text-navy-800 shrink-0">R$ {fmtBRL(total)}</span>
            </div>
          </div>
        );
      })()}

      <button type="submit" disabled={loading} className="w-full bg-navy-700 hover:bg-navy-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">{loading ? <><Loader2 size={17} className="animate-spin" /> Processando…</> : <><Lock size={15} /> Pagar agora</>}</button>
    </form>
  );
}
