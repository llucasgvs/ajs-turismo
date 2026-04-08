"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save, ChevronLeft, ChevronRight, Calendar, Users, DollarSign } from "lucide-react";
import { apiFetch } from "@/lib/api";

/* ── types ── */
interface TripDateFormData {
  dep_date: string;   // "YYYY-MM-DD"
  dep_time: string;   // "HH:MM"
  ret_date: string;   // "YYYY-MM-DD"
  ret_time: string;   // "HH:MM"
  price_per_person: string;
  original_price: string;
  max_installments: number;
  total_spots: number;
  available_spots: number;
}

const EMPTY: TripDateFormData = {
  dep_date: "", dep_time: "22:00",
  ret_date: "", ret_time: "22:00",
  price_per_person: "", original_price: "",
  max_installments: 12, total_spots: 30, available_spots: 30,
};

interface TripDateInitialData {
  departure_date?: string;
  return_date?: string;
  price_per_person?: number;
  original_price?: number | null;
  max_installments?: number;
  total_spots?: number;
  available_spots?: number;
}

/** ISO UTC → { date: "YYYY-MM-DD", time: "HH:MM" } em SP */
function splitISO(iso: string | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "22:00" };
  const sp = new Date(iso).toLocaleString("sv", { timeZone: "America/Sao_Paulo" });
  return { date: sp.slice(0, 10), time: sp.slice(11, 16) };
}

/** "YYYY-MM-DD" + "HH:MM" → ISO com offset -03:00 */
function toISO(date: string, time: string): string {
  return `${date}T${time}:00-03:00`;
}

/* ── DateRangePicker ── */
const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtCardDate(dateStr: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  return {
    day: d.getDate(),
    weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
    month: MONTHS_SHORT[d.getMonth()],
    year: d.getFullYear(),
  };
}

function DateRangePicker({
  depDate, retDate, onChange,
}: {
  depDate: string;
  retDate: string;
  onChange: (dep: string, ret: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(() =>
    depDate ? parseInt(depDate.slice(0, 4)) : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(() =>
    depDate ? parseInt(depDate.slice(5, 7)) - 1 : today.getMonth()
  );
  const [phase, setPhase] = useState<"dep" | "ret">(depDate ? "ret" : "dep");
  const [hovered, setHovered] = useState<string | null>(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (dateStr: string) => {
    if (new Date(dateStr + "T12:00:00") < today) return;
    if (phase === "dep") {
      onChange(dateStr, "");
      setPhase("ret");
    } else {
      if (dateStr < depDate) {
        onChange(dateStr, "");
        setPhase("ret");
      } else {
        onChange(depDate, dateStr);
        setPhase("dep");
      }
    }
  };

  const renderMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div key={`${year}-${month}`} className="flex-1 min-w-0">
        <p className="text-center text-sm font-bold text-navy-800 mb-4">
          {MONTHS_PT[month]} {year}
        </p>
        <div className="grid grid-cols-7">
          {WEEK_DAYS.map(w => (
            <div key={w} className="text-center text-[11px] text-gray-400 font-semibold py-1.5">{w}</div>
          ))}
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={i} className="h-9" />;

            const isPast = new Date(dateStr + "T12:00:00") < today;
            const isToday = dateStr === today.toISOString().slice(0, 10);
            const isDep = dateStr === depDate;
            const isRet = dateStr === retDate;

            const previewEnd = phase === "ret" && hovered && depDate
              ? (hovered >= depDate ? hovered : null) : retDate;
            const inRange = depDate && previewEnd && dateStr > depDate && dateStr < previewEnd;
            const isRangeStart = isDep && previewEnd && depDate !== previewEnd;
            const isRangeEnd = dateStr === previewEnd && depDate && depDate !== previewEnd;

            return (
              <div
                key={dateStr}
                className={[
                  "relative h-9 flex items-center justify-center",
                  inRange ? "bg-navy-50" : "",
                  isRangeStart ? "rounded-l-full bg-navy-50" : "",
                  isRangeEnd ? "rounded-r-full bg-navy-50" : "",
                ].join(" ")}
              >
                <button
                  type="button"
                  disabled={isPast}
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => phase === "ret" && setHovered(dateStr)}
                  onMouseLeave={() => setHovered(null)}
                  title={isDep ? "Saída" : isRet ? "Volta" : undefined}
                  className={[
                    "relative w-9 h-9 text-sm rounded-full flex flex-col items-center justify-center transition-all leading-none",
                    isPast ? "text-gray-300 cursor-not-allowed" : "cursor-pointer",
                    isDep ? "bg-navy-700 text-white font-black shadow-md" : "",
                    isRet ? "bg-gold-500 text-navy-900 font-black shadow-md" : "",
                    !isDep && !isRet && !isPast ? "hover:bg-navy-100 text-gray-700" : "",
                    isToday && !isDep && !isRet ? "font-bold text-navy-600 ring-1 ring-navy-300 ring-offset-1" : "",
                  ].join(" ")}
                >
                  <span className="text-[13px] leading-none">{parseInt(dateStr.slice(8))}</span>
                  {isDep && <span className="text-[8px] leading-none mt-0.5 font-black tracking-wider opacity-80">IDA</span>}
                  {isRet && <span className="text-[8px] leading-none mt-0.5 font-black tracking-wider opacity-80">VTA</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const nextMonthNum = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYearNum = viewMonth === 11 ? viewYear + 1 : viewYear;

  const depCard = fmtCardDate(depDate);
  const retCard = fmtCardDate(retDate);

  return (
    <div>
      {/* ── Selector cards ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Saída */}
        <button
          type="button"
          onClick={() => { onChange("", ""); setPhase("dep"); }}
          className={[
            "text-left rounded-xl border-2 px-4 py-3 transition-all",
            phase === "dep"
              ? "border-navy-600 bg-navy-50 shadow-sm"
              : depCard
                ? "border-gray-200 hover:border-navy-300 bg-white"
                : "border-dashed border-gray-300 bg-gray-50 hover:border-navy-300",
          ].join(" ")}
        >
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${phase === "dep" ? "text-navy-600" : "text-gray-400"}`}>
            ✈ Saída
          </p>
          {depCard ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-navy-800 leading-none">{depCard.day}</span>
              <div>
                <p className="text-xs font-bold text-navy-700 leading-none">{depCard.month} {depCard.year}</p>
                <p className="text-[11px] text-gray-400 capitalize leading-none mt-0.5">{depCard.weekday}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-1">Selecionar data</p>
          )}
          {phase === "dep" && (
            <div className="mt-2 h-0.5 rounded-full bg-navy-600" />
          )}
        </button>

        {/* Volta */}
        <button
          type="button"
          onClick={() => depDate && setPhase("ret")}
          disabled={!depDate}
          className={[
            "text-left rounded-xl border-2 px-4 py-3 transition-all",
            phase === "ret"
              ? "border-gold-500 bg-amber-50 shadow-sm"
              : retCard
                ? "border-gray-200 hover:border-gold-400 bg-white"
                : depDate
                  ? "border-dashed border-gray-300 bg-gray-50 hover:border-gold-400 cursor-pointer"
                  : "border-dashed border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed",
          ].join(" ")}
        >
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${phase === "ret" ? "text-gold-600" : "text-gray-400"}`}>
            🏁 Volta
          </p>
          {retCard ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-navy-800 leading-none">{retCard.day}</span>
              <div>
                <p className="text-xs font-bold text-navy-700 leading-none">{retCard.month} {retCard.year}</p>
                <p className="text-[11px] text-gray-400 capitalize leading-none mt-0.5">{retCard.weekday}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-1">{depDate ? "Selecionar data" : "Defina a saída primeiro"}</p>
          )}
          {phase === "ret" && (
            <div className="mt-2 h-0.5 rounded-full bg-gold-500" />
          )}
        </button>
      </div>

      {/* ── Calendar navigation ── */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-navy-700">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1" />
        <button type="button" onClick={nextMonth}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-navy-700">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Calendar grid (1 month mobile, 2 desktop) ── */}
      <div className="flex gap-6">
        {renderMonth(viewYear, viewMonth)}
        <div className="hidden sm:block w-px bg-gray-100 flex-shrink-0" />
        <div className="hidden sm:flex flex-1 min-w-0">
          {renderMonth(nextYearNum, nextMonthNum)}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-navy-700 inline-block" /> Saída
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gold-500 inline-block" /> Volta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-navy-50 border border-navy-200 inline-block" /> Período
        </span>
        {(depDate || retDate) && (
          <button type="button" onClick={() => { onChange("", ""); setPhase("dep"); }}
            className="ml-auto text-gray-400 hover:text-red-500 transition-colors underline underline-offset-2">
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main form ── */
export default function TripDateForm({
  templateId,
  tripId,
  initialData,
  templateTitle,
  templateDurationNights,
}: {
  templateId: number;
  tripId?: number;
  initialData?: TripDateInitialData;
  templateTitle?: string;
  templateDurationNights?: number;
}) {
  const router = useRouter();

  const initDep = splitISO(initialData?.departure_date);
  const initRet = splitISO(initialData?.return_date);

  const [form, setForm] = useState<TripDateFormData>({
    ...EMPTY,
    dep_date: initDep.date,
    dep_time: initDep.date ? initDep.time : "22:00",
    ret_date: initRet.date,
    ret_time: initRet.date ? initRet.time : "22:00",
    max_installments: initialData?.max_installments ?? EMPTY.max_installments,
    total_spots: initialData?.total_spots ?? EMPTY.total_spots,
    available_spots: initialData?.available_spots ?? EMPTY.available_spots,
    price_per_person: initialData?.price_per_person != null ? String(initialData.price_per_person) : "",
    original_price: initialData?.original_price != null ? String(initialData.original_price) : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Duration calc
  const nights = form.dep_date && form.ret_date
    ? Math.max(0, Math.round(
        (new Date(form.ret_date + "T12:00:00").getTime() - new Date(form.dep_date + "T12:00:00").getTime())
        / (1000 * 60 * 60 * 24)
      ))
    : 0;
  const depHour = parseInt(form.dep_time.slice(0, 2) || "22");
  const days = nights === 0 ? 1 : depHour >= 18 ? nights : nights + 1;

  useEffect(() => {
    if (!tripId) setForm(f => ({ ...f, available_spots: f.total_spots }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill return when departure set and return empty
  const handleDateRange = (dep: string, ret: string) => {
    setForm(f => ({
      ...f,
      dep_date: dep,
      ret_date: ret || (dep && !f.ret_date
        ? (() => {
            const d = new Date(dep + "T12:00:00");
            d.setDate(d.getDate() + (templateDurationNights ?? 2));
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          })()
        : f.ret_date),
    }));
  };

  const set = <K extends keyof TripDateFormData>(key: K, value: TripDateFormData[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!form.dep_date) { setError("Selecione a data de saída."); return; }
    if (!form.ret_date) { setError("Selecione a data de retorno."); return; }
    if (form.ret_date < form.dep_date || (form.ret_date === form.dep_date && form.ret_time < form.dep_time)) {
      setError("A data/hora de retorno deve ser igual ou posterior à saída."); return;
    }
    if (form.dep_date < new Date().toISOString().slice(0, 10)) {
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
      departure_date: toISO(form.dep_date, form.dep_time),
      return_date: toISO(form.ret_date, form.ret_time),
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
      const res = await apiFetch(url, { method: tripId ? "PUT" : "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.detail)) {
          setError(data.detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join(", "));
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
            {templateTitle && <p className="text-gray-500 text-sm">{templateTitle}</p>}
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

        {/* Calendário */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar size={13} /> Datas da Viagem
          </h2>

          <DateRangePicker
            depDate={form.dep_date}
            retDate={form.ret_date}
            onChange={handleDateRange}
          />

          {/* Horários */}
          {form.dep_date && form.ret_date && (
            <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Horário de saída
                </label>
                <input type="time" className="input-field text-lg font-bold text-navy-800"
                  value={form.dep_time} onChange={e => set("dep_time", e.target.value)} />
                <p className="text-[11px] text-gray-400 mt-1">Horário de Brasília</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Horário de retorno
                </label>
                <input type="time" className="input-field text-lg font-bold text-navy-800"
                  value={form.ret_time} onChange={e => set("ret_time", e.target.value)} />
                <p className="text-[11px] text-gray-400 mt-1">Horário de Brasília</p>
              </div>
            </div>
          )}

          {/* Duração preview */}
          {nights > 0 && (
            <div className="mt-3 flex items-center gap-3 bg-navy-50 rounded-xl px-4 py-3">
              <span className="text-navy-500 text-sm font-semibold">{days} {days === 1 ? "dia" : "dias"}</span>
              <span className="text-gray-300">/</span>
              <span className="text-navy-500 text-sm font-semibold">{nights} {nights === 1 ? "noite" : "noites"}</span>
              {depHour >= 18 && (
                <span className="ml-auto text-[11px] text-gray-400">Saída noturna</span>
              )}
            </div>
          )}
          {nights === 0 && form.dep_date && form.ret_date && form.dep_date === form.ret_date && (
            <div className="mt-3 bg-navy-50 rounded-xl px-4 py-3">
              <span className="text-navy-500 text-sm font-semibold">Bate e volta</span>
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
                value={form.price_per_person} onChange={e => set("price_per_person", e.target.value)}
                placeholder="299.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Preço Original (De:)</label>
              <input className="input-field" type="number" step="0.01" min="0"
                value={form.original_price} onChange={e => set("original_price", e.target.value)}
                placeholder="399.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Parcelamento máx.</label>
              <select className="input-field" value={form.max_installments}
                onChange={e => set("max_installments", parseInt(e.target.value))}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
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
                onChange={e => set("total_spots", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Vagas Disponíveis *</label>
              <input className="input-field" type="number" required min="0" value={form.available_spots}
                onChange={e => set("available_spots", parseInt(e.target.value) || 0)} />
              <p className="text-xs text-gray-400 mt-1">
                {form.total_spots - form.available_spots} vendidas · {form.available_spots} livres
              </p>
            </div>
          </div>
          {form.total_spots > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>{form.total_spots - form.available_spots}/{form.total_spots} vendidas</span>
                <span>{form.available_spots} disponíveis</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round(((form.total_spots - form.available_spots) / form.total_spots) * 100))}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
