"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save, ChevronLeft, Calendar, Users, DollarSign } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface TripDateFormData {
  departure_date: string;
  return_date: string;
  price_per_person: string;
  original_price: string;
  max_installments: number;
  total_spots: number;
  available_spots: number;
}

const EMPTY: TripDateFormData = {
  departure_date: "",
  return_date: "",
  price_per_person: "",
  original_price: "",
  max_installments: 12,
  total_spots: 30,
  available_spots: 30,
};

/** Converte ISO UTC → datetime-local no fuso de SP (para preencher o input) */
function toDatetimeInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  // "sv" locale produz formato "YYYY-MM-DD HH:MM:SS"
  return d.toLocaleString("sv", { timeZone: "America/Sao_Paulo" }).slice(0, 16).replace(" ", "T");
}

interface TripDateInitialData {
  departure_date?: string;
  return_date?: string;
  price_per_person?: number;
  original_price?: number | null;
  max_installments?: number;
  total_spots?: number;
  available_spots?: number;
}

export default function TripDateForm({
  templateId,
  tripId,
  initialData,
  templateTitle,
}: {
  templateId: number;
  tripId?: number;
  initialData?: TripDateInitialData;
  templateTitle?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<TripDateFormData>({
    ...EMPTY,
    max_installments: initialData?.max_installments ?? EMPTY.max_installments,
    total_spots: initialData?.total_spots ?? EMPTY.total_spots,
    available_spots: initialData?.available_spots ?? EMPTY.available_spots,
    departure_date: toDatetimeInput(initialData?.departure_date),
    return_date: toDatetimeInput(initialData?.return_date),
    price_per_person: initialData?.price_per_person != null ? String(initialData.price_per_person) : "",
    original_price: initialData?.original_price != null ? String(initialData.original_price) : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Noites = diferença entre datas (ignora hora)
  const depDateOnly = form.departure_date.slice(0, 10);
  const retDateOnly = form.return_date.slice(0, 10);
  const nights =
    depDateOnly && retDateOnly
      ? Math.max(0, Math.round(
          (new Date(retDateOnly + "T12:00:00").getTime() -
           new Date(depDateOnly + "T12:00:00").getTime()) /
           (1000 * 60 * 60 * 24)
        ))
      : 0;
  // Dias: se saída ≥ 18h (ônibus noturno), dias = noites; senão dias = noites + 1
  const depHour = form.departure_date.length >= 13 ? parseInt(form.departure_date.slice(11, 13)) : 12;
  const days = nights === 0 ? 1 : depHour >= 18 ? nights : nights + 1;

  // Sync available_spots when total_spots changes on new form
  useEffect(() => {
    if (!tripId) setForm((f) => ({ ...f, available_spots: f.total_spots }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof TripDateFormData>(key: K, value: TripDateFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.departure_date) { setError("Informe a data e hora de saída."); return; }
    if (!form.return_date) { setError("Informe a data e hora de retorno."); return; }
    if (form.return_date < form.departure_date) {
      setError("A data/hora de retorno deve ser igual ou posterior à saída."); return;
    }
    if (form.departure_date.slice(0, 10) < new Date().toISOString().slice(0, 10)) {
      setError("A data de saída não pode ser no passado."); return;
    }
    const priceVal = parseFloat(form.price_per_person);
    if (!form.price_per_person || isNaN(priceVal) || priceVal <= 0) {
      setError("Informe um preço por pessoa válido."); return;
    }
    if (form.available_spots > form.total_spots) {
      setError("Vagas disponíveis não podem ser maiores que o total de vagas."); return;
    }
    if (form.total_spots <= 0) { setError("Total de vagas deve ser maior que zero."); return; }

    setLoading(true);

    const body = {
      // Envia com offset de Brasília (-03:00) para preservar o horário local
      departure_date: form.departure_date ? `${form.departure_date}:00-03:00` : null,
      return_date: form.return_date ? `${form.return_date}:00-03:00` : null,
      price_per_person: parseFloat(form.price_per_person) || 0,
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      max_installments: form.max_installments,
      total_spots: form.total_spots,
      available_spots: form.available_spots,
    };

    try {
      const url = tripId
        ? `/templates/${templateId}/trips/${tripId}`
        : `/templates/${templateId}/trips`;
      const res = await apiFetch(url, {
        method: tripId ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.detail)) {
          setError(data.detail.map((d: {msg?: string}) => d.msg ?? JSON.stringify(d)).join(", "));
        } else {
          setError(typeof data.detail === "string" ? data.detail : "Erro ao salvar.");
        }
        return;
      }
      setSuccess(tripId ? "Data atualizada!" : "Data criada!");
      setTimeout(() => router.push(`/admin/viagens/${templateId}`), 1200);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/admin/viagens/${templateId}`}
            className="p-2 text-gray-400 hover:text-navy-700 hover:bg-gray-100 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-black text-navy-800">
              {tripId ? "Editar Data" : "Nova Data"}
            </h1>
            {templateTitle && (
              <p className="text-gray-500 text-sm">{templateTitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-red-600 text-sm max-w-xs text-right">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}
          <button type="submit" disabled={loading}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {tripId ? "Salvar" : "Criar Data"}
          </button>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Datas */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar size={13} /> Datas da Viagem
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Data e hora de saída *</label>
              <input className="input-field" type="datetime-local" required value={form.departure_date}
                onChange={(e) => set("departure_date", e.target.value)} />
              <p className="text-[11px] text-gray-400 mt-1">Horário de Brasília (GMT-3)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Data e hora de retorno *</label>
              <input className="input-field" type="datetime-local" required value={form.return_date}
                onChange={(e) => set("return_date", e.target.value)} />
              <p className="text-[11px] text-gray-400 mt-1">Horário de Brasília (GMT-3)</p>
            </div>
          </div>
          {nights > 0 && (
            <div className="mt-3 flex items-center gap-3 bg-navy-50 rounded-xl px-4 py-3">
              <span className="text-navy-500 text-sm font-semibold">{days} {days === 1 ? "dia" : "dias"}</span>
              <span className="text-gray-300">/</span>
              <span className="text-navy-500 text-sm font-semibold">{nights} {nights === 1 ? "noite" : "noites"}</span>
              {depHour >= 18 && (
                <span className="ml-auto text-[11px] text-gray-400">Saída noturna detectada</span>
              )}
            </div>
          )}
        </div>

        {/* Preço */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <DollarSign size={13} /> Preço
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Preço por Pessoa (R$) *</label>
              <input className="input-field" type="number" required step="0.01" min="0"
                value={form.price_per_person} onChange={(e) => set("price_per_person", e.target.value)}
                placeholder="299.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Preço Original (De:)</label>
              <input className="input-field" type="number" step="0.01" min="0"
                value={form.original_price} onChange={(e) => set("original_price", e.target.value)}
                placeholder="399.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Parcelamento máx.</label>
              <select className="input-field" value={form.max_installments}
                onChange={(e) => set("max_installments", parseInt(e.target.value))}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Vagas */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users size={13} /> Vagas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Total de Vagas *</label>
              <input className="input-field" type="number" required min="1" value={form.total_spots}
                onChange={(e) => set("total_spots", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Vagas Disponíveis *</label>
              <input className="input-field" type="number" required min="0" value={form.available_spots}
                onChange={(e) => set("available_spots", parseInt(e.target.value) || 0)} />
              <p className="text-xs text-gray-400 mt-1">
                {form.total_spots - form.available_spots} vendidas · {form.available_spots} livres
              </p>
            </div>
          </div>

          {/* Preview barra */}
          {form.total_spots > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>{form.total_spots - form.available_spots}/{form.total_spots} vendidas</span>
                <span>{form.available_spots} disponíveis</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round(((form.total_spots - form.available_spots) / form.total_spots) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
