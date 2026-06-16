"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { fmtBRL } from "@/lib/format";

interface BookingStatus {
  booking_code: string;
  status: string;
  final_amount: number;
  trip_title?: string;
  trip_destination?: string;
}

const WA_HELP =
  "https://wa.me/5541998348766?text=" +
  encodeURIComponent("Olá! Acabei de pagar uma viagem no site e preciso de ajuda.");

function RetornoInner() {
  const params = useSearchParams();
  const code = params.get("code") || "";
  const [booking, setBooking] = useState<BookingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await apiFetch(`/payments/${code}/status`);
        if (res.ok) {
          const data: BookingStatus = await res.json();
          setBooking(data);
          // Enquanto estiver 'pending', tenta de novo (webhook pode levar alguns segundos)
          if (data.status === "pending" && tries < 6) {
            tries++;
            timer = setTimeout(poll, 2500);
            return;
          }
        }
      } catch { /* ignora — mostra estado atual */ }
      setLoading(false);
    };
    poll();
    return () => clearTimeout(timer);
  }, [code]);

  const status = booking?.status;
  const confirmed = status === "confirmed";
  const pending = status === "pending";

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
        {loading ? (
          <>
            <Loader2 className="w-12 h-12 text-navy-500 mx-auto mb-4 animate-spin" />
            <h1 className="font-display font-black text-xl text-navy-800 mb-2">Confirmando seu pagamento…</h1>
            <p className="text-gray-500 text-sm">Só um instante, estamos verificando com o provedor.</p>
          </>
        ) : confirmed ? (
          <>
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h1 className="font-display font-black text-2xl text-navy-800 mb-2">Pagamento confirmado! 🎉</h1>
            <p className="text-gray-600 text-sm mb-1">Sua vaga está garantida.</p>
            {booking?.trip_title && (
              <p className="text-gray-500 text-sm mb-4">
                {booking.trip_title}{booking.trip_destination ? ` — ${booking.trip_destination}` : ""}
              </p>
            )}
            <div className="bg-navy-50 rounded-xl p-3 mb-5 text-sm">
              <p className="text-navy-600">Código da reserva</p>
              <p className="font-black text-navy-800 text-lg">{booking?.booking_code}</p>
              {booking && <p className="text-navy-600 mt-1">Valor: R$ {fmtBRL(booking.final_amount)}</p>}
            </div>
            <Link href="/dashboard" className="block w-full bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 rounded-xl transition-colors">
              Ver minhas reservas
            </Link>
          </>
        ) : pending ? (
          <>
            <Clock className="w-14 h-14 text-amber-500 mx-auto mb-4" />
            <h1 className="font-display font-black text-2xl text-navy-800 mb-2">Aguardando confirmação</h1>
            <p className="text-gray-600 text-sm mb-5">
              Recebemos seu pedido. Se você pagou por <strong>boleto</strong> ou <strong>PIX</strong>, a confirmação pode levar
              alguns minutos. Assim que cair, sua reserva é confirmada automaticamente.
            </p>
            <div className="bg-navy-50 rounded-xl p-3 mb-5 text-sm">
              <p className="text-navy-600">Código da reserva</p>
              <p className="font-black text-navy-800 text-lg">{booking?.booking_code || code}</p>
            </div>
            <Link href="/dashboard" className="block w-full bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 rounded-xl transition-colors mb-2">
              Acompanhar no painel
            </Link>
            <a href={WA_HELP} target="_blank" rel="noopener noreferrer" className="block text-sm text-gray-500 hover:text-navy-700">
              Falar com a equipe no WhatsApp
            </a>
          </>
        ) : (
          <>
            <AlertCircle className="w-14 h-14 text-gray-400 mx-auto mb-4" />
            <h1 className="font-display font-black text-2xl text-navy-800 mb-2">Não encontramos a confirmação</h1>
            <p className="text-gray-600 text-sm mb-5">
              Se você concluiu o pagamento, ele pode ainda estar sendo processado. Acompanhe no seu painel
              ou fale com a gente.
            </p>
            <Link href="/dashboard" className="block w-full bg-navy-700 hover:bg-navy-600 text-white font-bold py-3 rounded-xl transition-colors mb-2">
              Ir para o painel
            </Link>
            <a href={WA_HELP} target="_blank" rel="noopener noreferrer" className="block text-sm text-gray-500 hover:text-navy-700">
              Falar com a equipe no WhatsApp
            </a>
          </>
        )}
      </div>
    </main>
  );
}

export default function PagamentoRetornoPage() {
  return (
    <Suspense fallback={null}>
      <RetornoInner />
    </Suspense>
  );
}
