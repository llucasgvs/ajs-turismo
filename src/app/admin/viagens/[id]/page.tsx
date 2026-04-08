"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Plus, Pencil, EyeOff, RefreshCw, Calendar, Users,
  MapPin, Star, Loader2, AlertTriangle, X, ChevronRight, CheckCircle2, XCircle, List, Layers,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { fmtBRL } from "@/lib/format";

interface TripTemplate {
  id: number;
  title: string;
  destination: string;
  description: string;
  short_description: string | null;
  image_url: string | null;
  category: string;
  tag: string | null;
  is_featured: boolean;
  is_active: boolean;
  includes: string[];
  excludes: string[];
  itinerary: { day: number; title: string; description: string }[];
  gallery: string[];
}

interface TripDate {
  id: number;
  template_id: number;
  departure_date: string;
  return_date: string;
  price_per_person: number;
  original_price: number | null;
  max_installments: number;
  total_spots: number;
  available_spots: number;
  status: string;
  is_active: boolean;
  created_at: string;
  hidden_at: string | null;
}

interface Counts {
  all: number; active: number; sold_out: number; hidden: number; completed: number;
}

const PAGE_SIZE = 10;

type Tab = "all" | "active" | "sold_out" | "hidden" | "completed";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "active", label: "Ativas" },
  { key: "sold_out", label: "Esgotadas" },
  { key: "hidden", label: "Ocultas" },
  { key: "completed", label: "Concluídas" },
];

function fmt(d: string) {
  return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const items: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) items.push(i);
    else if (items[items.length - 1] !== "…") items.push("…");
  }
  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-sm">‹</button>
      {items.map((item, i) =>
        item === "…" ? <span key={i} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span> : (
          <button key={i} onClick={() => onChange(item)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${page === item ? "bg-navy-800 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {item}
          </button>
        )
      )}
      <button onClick={() => onChange(page + 1)} disabled={page === Math.ceil(total / PAGE_SIZE)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-sm">›</button>
    </div>
  );
}

/* ── Modal de confirmar ocultar data ───────────────────────────────────── */
function HideModal({ date, onClose, onConfirm, loading }: {
  date: TripDate; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  const sold = date.total_spots - date.available_spots;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={26} className="text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">Ocultar esta data?</h3>
              <p className="text-gray-400 text-sm mt-1">A data será ocultada do site.</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3.5 space-y-1">
            <p className="font-bold text-navy-800">{fmt(date.departure_date)} → {fmt(date.return_date)}</p>
            <p className="text-xs text-gray-400">
              {sold}/{date.total_spots} vendidas · R$ {fmtBRL(date.price_per_person)}
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Cancelar
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 bg-zinc-700 text-white font-semibold py-3 rounded-xl hover:bg-zinc-600 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <EyeOff size={15} />}
              Ocultar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Modal Gerar datas em lote ─────────────────────────────────────────── */
const WEEK_DAYS = [
  { label: "Seg", value: 0 }, { label: "Ter", value: 1 }, { label: "Qua", value: 2 },
  { label: "Qui", value: 3 }, { label: "Sex", value: 4 }, { label: "Sáb", value: 5 }, { label: "Dom", value: 6 },
];

function BulkModal({ templateId, onClose, onDone }: {
  templateId: number; onClose: () => void; onDone: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]); // vazio = todos
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [spots, setSpots] = useState("40");
  const [maxInstallments, setMaxInstallments] = useState("12");
  const [skipExisting, setSkipExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState("");

  // Preview: quantas datas serão criadas
  const previewCount = (() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate + "T12:00:00");
    const e = new Date(endDate + "T12:00:00");
    if (e < s) return 0;
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const wd = (cur.getDay() + 6) % 7; // JS: 0=Dom → Python: 0=Seg
      if (selectedDays.length === 0 || selectedDays.includes(wd)) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  })();

  const toggleDay = (d: number) =>
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleSubmit = async () => {
    if (!endDate) { setError("Informe a data de fim."); return; }
    if (!price || parseFloat(price) <= 0) { setError("Informe o preço por pessoa."); return; }
    setError(""); setLoading(true);
    try {
      const res = await apiFetch(`/templates/${templateId}/bulk-trips`, {
        method: "POST",
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          days_of_week: selectedDays,
          price_per_person: parseFloat(price),
          original_price: originalPrice ? parseFloat(originalPrice) : null,
          max_installments: parseInt(maxInstallments),
          total_spots: parseInt(spots),
          available_spots: parseInt(spots),
          skip_existing: skipExisting,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Erro ao gerar datas.");
      } else {
        const data = await res.json();
        setResult(data);
        onDone();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-black text-navy-800 text-base flex items-center gap-2">
              <Layers size={16} className="text-navy-600" /> Gerar datas em lote
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Ideal para roteiros com saídas diárias</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {result ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-black text-navy-800">{result.created} datas criadas!</p>
                {result.skipped > 0 && (
                  <p className="text-sm text-gray-400 mt-1">{result.skipped} datas já existiam e foram ignoradas.</p>
                )}
              </div>
              <button onClick={onClose}
                className="bg-navy-800 text-white font-semibold px-6 py-3 rounded-xl hover:bg-navy-700 transition-colors">
                Fechar
              </button>
            </div>
          ) : (
            <>
              {/* Período */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Período</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">De</label>
                    <input type="date" className="input-field text-sm" value={startDate}
                      min={today} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Até</label>
                    <input type="date" className="input-field text-sm" value={endDate}
                      min={startDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Dias da semana */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Dias da semana <span className="text-gray-400 font-normal normal-case">(vazio = todos os dias)</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {WEEK_DAYS.map(d => (
                    <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        selectedDays.includes(d.value)
                          ? "bg-navy-800 border-navy-800 text-white"
                          : "border-gray-200 text-gray-600 hover:border-navy-300"
                      }`}>
                      {d.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => setSelectedDays([])}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-navy-300 transition-colors">
                    Todos
                  </button>
                </div>
              </div>

              {/* Preço */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Preço</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Preço por pessoa *</label>
                    <input type="number" className="input-field text-sm" placeholder="Ex: 199.90"
                      value={price} min="0" step="0.01" onChange={e => setPrice(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Preço original (opcional)</label>
                    <input type="number" className="input-field text-sm" placeholder="Ex: 249.90"
                      value={originalPrice} min="0" step="0.01" onChange={e => setOriginalPrice(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Vagas e parcelas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Vagas por data</label>
                  <input type="number" className="input-field text-sm" value={spots}
                    min="1" onChange={e => setSpots(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Parcelas (máx)</label>
                  <input type="number" className="input-field text-sm" value={maxInstallments}
                    min="1" max="24" onChange={e => setMaxInstallments(e.target.value)} />
                </div>
              </div>

              {/* Opções */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-navy-700"
                  checked={skipExisting} onChange={e => setSkipExisting(e.target.checked)} />
                <span className="text-sm text-gray-600">Ignorar datas já cadastradas</span>
              </label>

              {error && (
                <p className="text-sm text-red-500 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 space-y-3">
            {previewCount > 0 && (
              <div className="bg-navy-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-navy-700">Datas a criar</span>
                <span className="text-lg font-black text-navy-800">{previewCount}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={loading || previewCount === 0}
                className="flex-1 bg-navy-800 text-white font-semibold py-3 rounded-xl hover:bg-navy-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Layers size={15} />}
                {loading ? "Criando..." : `Criar ${previewCount > 0 ? previewCount : ""} datas`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Drawer com detalhes do roteiro ────────────────────────────────────── */
function TemplateDrawer({ template, onClose }: { template: TripTemplate; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Drag handle / header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="sm:hidden w-10 h-1 bg-gray-200 rounded-full absolute left-1/2 -translate-x-1/2 top-2" />
          <h2 className="font-black text-navy-800 text-base truncate pr-4">{template.title}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="overflow-y-auto flex-1">
          {/* Imagem */}
          {template.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={template.image_url} alt={template.title} className="w-full h-44 object-cover" />
          )}

          <div className="p-5 space-y-5">
            {/* Destino + badges */}
            <div className="space-y-2">
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <MapPin size={13} className="text-gray-400" /> {template.destination}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-navy-50 text-navy-700 text-xs px-2.5 py-1 rounded-full font-medium capitalize">{template.category}</span>
                {template.tag && <span className="bg-gold-50 text-gold-700 text-xs px-2.5 py-1 rounded-full font-medium">{template.tag}</span>}
                {template.is_featured && (
                  <span className="bg-gold-100 text-gold-700 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                    <Star size={9} fill="currentColor" /> Destaque
                  </span>
                )}
              </div>
            </div>

            {/* Descrição curta */}
            {template.short_description && (
              <p className="text-sm text-gray-600 font-medium">{template.short_description}</p>
            )}

            {/* Descrição completa */}
            {template.description && (
              <div>
                <p className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">Sobre o roteiro</p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{template.description}</p>
              </div>
            )}

            {/* Inclui / Não inclui */}
            {(template.includes.length > 0 || template.excludes.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {template.includes.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> Inclui
                    </p>
                    <ul className="space-y-1.5">
                      {template.includes.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5 flex-shrink-0">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {template.excludes.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <XCircle size={12} /> Não inclui
                    </p>
                    <ul className="space-y-1.5">
                      {template.excludes.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-red-400 mt-0.5 flex-shrink-0">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Roteiro dia a dia */}
            {template.itinerary && template.itinerary.length > 0 && (
              <div>
                <p className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <List size={12} /> Roteiro dia a dia
                </p>
                <div className="space-y-3">
                  {template.itinerary.map((day) => (
                    <div key={day.day} className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 bg-navy-800 text-white text-xs font-black rounded-full flex items-center justify-center mt-0.5">
                        {day.day}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-navy-800">{day.title}</p>
                        {day.description && (
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{day.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Galeria */}
            {template.gallery && template.gallery.length > 0 && (
              <div>
                <p className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">Galeria</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {template.gallery.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt="" className="w-full h-20 object-cover rounded-xl" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ação no rodapé */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <Link href={`/admin/viagens/${template.id}/editar`}
            className="flex items-center justify-center gap-2 w-full bg-navy-800 text-white font-semibold py-3 rounded-xl hover:bg-navy-700 transition-colors text-sm">
            <Pencil size={15} /> Editar roteiro
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────────────────── */
export default function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const templateId = parseInt(id);

  const [template, setTemplate] = useState<TripTemplate | null>(null);
  const [dates, setDates] = useState<TripDate[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts>({ all: 0, active: 0, sold_out: 0, hidden: 0, completed: 0 });
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingDates, setLoadingDates] = useState(false);
  const [hideTarget, setHideTarget] = useState<TripDate | null>(null);
  const [hideLoading, setHideLoading] = useState(false);
  const [reactivatingId, setReactivatingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Carregar template
  useEffect(() => {
    apiFetch(`/templates/${templateId}`)
      .then((r) => r.json())
      .then((data) => setTemplate(data))
      .finally(() => setLoading(false));
  }, [templateId]);

  // Carregar contagens
  const fetchCounts = useCallback(async () => {
    const res = await apiFetch(`/templates/${templateId}/counts`);
    if (res.ok) setCounts(await res.json());
  }, [templateId]);

  // Carregar datas
  const fetchDates = useCallback(async () => {
    setLoadingDates(true);
    try {
      const params = new URLSearchParams({
        skip: String((page - 1) * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });
      if (tab !== "all") params.set("trip_status", tab);
      const res = await apiFetch(`/templates/${templateId}/trips?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDates(data.items);
        setTotal(data.total);
      }
    } finally {
      setLoadingDates(false);
    }
  }, [templateId, tab, page]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { fetchDates(); }, [fetchDates]);
  useEffect(() => { setPage(1); }, [tab]);

  const handleHide = async () => {
    if (!hideTarget) return;
    setHideLoading(true);
    try {
      await apiFetch(`/templates/${templateId}/trips/${hideTarget.id}`, { method: "DELETE" });
      setHideTarget(null);
      fetchCounts();
      fetchDates();
    } finally {
      setHideLoading(false);
    }
  };

  const handleReactivate = async (dateId: number) => {
    setReactivatingId(dateId);
    try {
      await apiFetch(`/templates/${templateId}/trips/${dateId}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: true, status: "active" }),
      });
      fetchCounts();
      fetchDates();
    } finally {
      setReactivatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-navy-400 animate-spin" />
      </div>
    );
  }

  if (!template) {
    return <p className="text-red-500 p-8">Roteiro não encontrado.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/admin/viagens"
          className="p-2 text-gray-400 hover:text-navy-700 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0 mt-0.5">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-display font-black text-navy-800 truncate">{template.title}</h1>
            {template.is_featured && (
              <span className="bg-gold-100 text-gold-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star size={10} fill="currentColor" /> Destaque
              </span>
            )}
            {!template.is_active && (
              <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">Inativo</span>
            )}
          </div>
          <p className="text-gray-500 text-sm flex items-center gap-1 mt-0.5">
            <MapPin size={11} /> {template.destination}
          </p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/viagens/${templateId}/datas/nova`}
          className="flex items-center justify-center gap-1.5 bg-navy-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-navy-700 transition-colors">
          <Plus size={15} />
          <span>Nova data</span>
        </Link>
        <button onClick={() => setBulkOpen(true)}
          className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-500 transition-colors">
          <Layers size={15} />
          <span>Gerar em lote</span>
        </button>
        <Link href={`/admin/viagens/${templateId}/editar`}
          className="flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
          <Pencil size={15} />
          <span>Editar roteiro</span>
        </Link>
      </div>

      {/* Card de info do roteiro — clicável */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
      >
        <div className="sm:flex">
          {template.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={template.image_url} alt={template.title}
              className="w-full sm:w-40 h-32 sm:h-auto object-cover flex-shrink-0" />
          )}
          <div className="p-4 flex-1 min-w-0">
            {template.short_description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{template.short_description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 text-xs mb-3">
              <span className="bg-navy-50 text-navy-700 px-2.5 py-1 rounded-full font-medium capitalize">{template.category}</span>
              {template.tag && <span className="bg-gold-50 text-gold-700 px-2.5 py-1 rounded-full font-medium">{template.tag}</span>}
            </div>
            {(template.includes.length > 0 || template.excludes.length > 0) && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {template.includes.length > 0 && (
                  <div>
                    <p className="font-semibold text-green-700 mb-1">Inclui</p>
                    <ul className="space-y-0.5">
                      {template.includes.slice(0, 3).map((item, i) => (
                        <li key={i} className="text-gray-500 truncate">• {item}</li>
                      ))}
                      {template.includes.length > 3 && (
                        <li className="text-gray-400">+{template.includes.length - 3} itens</li>
                      )}
                    </ul>
                  </div>
                )}
                {template.excludes.length > 0 && (
                  <div>
                    <p className="font-semibold text-red-600 mb-1">Não inclui</p>
                    <ul className="space-y-0.5">
                      {template.excludes.slice(0, 3).map((item, i) => (
                        <li key={i} className="text-gray-500 truncate">• {item}</li>
                      ))}
                      {template.excludes.length > 3 && (
                        <li className="text-gray-400">+{template.excludes.length - 3} itens</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-navy-500 font-semibold mt-3 flex items-center gap-1 group-hover:text-gold-600 transition-colors">
              Ver detalhes completos <ChevronRight size={12} />
            </p>
          </div>
        </div>
      </button>

      {/* Seção de datas */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-navy-700 uppercase tracking-wider flex items-center gap-2">
          <Calendar size={14} /> Datas
        </h2>

        {/* Tabs */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`${i === 0 ? "col-span-2 sm:col-span-1" : ""} flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "bg-navy-800 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Lista de datas */}
        {loadingDates ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="text-navy-400 animate-spin" />
          </div>
        ) : dates.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhuma data {tab !== "all" ? "nesta categoria" : "cadastrada"}</p>
            {tab === "all" && (
              <Link href={`/admin/viagens/${templateId}/datas/nova`}
                className="mt-2 inline-block text-sm text-navy-600 underline">
                Adicionar primeira data
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {dates.map((date) => (
              <DateCard
                key={date.id}
                date={date}
                templateId={templateId}
                onHide={() => setHideTarget(date)}
                onReactivate={() => handleReactivate(date.id)}
                reactivating={reactivatingId === date.id}
              />
            ))}
            <div className="pt-1">
              <Pagination page={page} total={total} onChange={setPage} />
              <p className="text-center text-xs text-gray-400 mt-2">
                {total} data{total !== 1 ? "s" : ""} no total
              </p>
            </div>
          </div>
        )}
      </div>

      {hideTarget && (
        <HideModal
          date={hideTarget}
          onClose={() => setHideTarget(null)}
          onConfirm={handleHide}
          loading={hideLoading}
        />
      )}

      {drawerOpen && template && (
        <TemplateDrawer template={template} onClose={() => setDrawerOpen(false)} />
      )}

      {bulkOpen && (
        <BulkModal
          templateId={templateId}
          onClose={() => setBulkOpen(false)}
          onDone={() => { fetchCounts(); fetchDates(); }}
        />
      )}
    </div>
  );
}

function DateCard({ date, templateId, onHide, onReactivate, reactivating }: {
  date: TripDate;
  templateId: number;
  onHide: () => void;
  onReactivate: () => void;
  reactivating: boolean;
}) {
  const sold = date.total_spots - date.available_spots;
  const pct = Math.round((sold / date.total_spots) * 100);
  const isHidden = !date.is_active && date.status !== "completed";
  const isCompleted = date.status === "completed";

  const borderCls = isCompleted ? "border-l-blue-400"
    : isHidden ? "border-l-gray-300"
    : date.status === "sold_out" ? "border-l-red-400"
    : "border-l-green-400";

  const statusBadge = isCompleted
    ? { label: "Concluída", cls: "bg-blue-100 text-blue-700" }
    : isHidden
    ? { label: "Oculta", cls: "bg-gray-100 text-gray-500" }
    : date.status === "sold_out"
    ? { label: "Esgotada", cls: "bg-red-100 text-red-700" }
    : { label: "Ativa", cls: "bg-green-100 text-green-700" };

  const barCls = pct >= 90 ? "bg-red-400" : pct >= 60 ? "bg-amber-400" : "bg-green-400";
  const availCls = pct >= 90 ? "text-red-500 font-semibold" : pct >= 60 ? "text-amber-500 font-semibold" : "text-green-600 font-semibold";

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${borderCls} shadow-sm p-4 transition-all ${isHidden ? "opacity-60" : ""}`}>

      {/* Linha 1: datas + badge + botões */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-bold text-navy-800 text-sm">
            {fmt(date.departure_date)} → {fmt(date.return_date)}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        </div>

        <div className="flex gap-1.5 flex-shrink-0">
          {isHidden ? (
            <button onClick={onReactivate} disabled={reactivating}
              className="flex items-center gap-1 border border-green-200 text-green-600 font-semibold text-xs px-2.5 py-1.5 rounded-xl hover:bg-green-50 transition-colors disabled:opacity-50">
              {reactivating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Reativar
            </button>
          ) : !isCompleted && (
            <>
              <Link href={`/admin/viagens/${templateId}/datas/${date.id}/editar`}
                className="flex items-center gap-1 border border-gray-200 text-gray-600 font-semibold text-xs px-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                <Pencil size={11} /> Editar
              </Link>
              <button onClick={onHide}
                className="flex items-center gap-1 border border-zinc-200 text-zinc-500 font-semibold text-xs px-2.5 py-1.5 rounded-xl hover:bg-zinc-50 transition-colors">
                <EyeOff size={11} /> Ocultar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Linha 2: preço */}
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-gold-600 font-bold text-lg leading-none">
          R$ {fmtBRL(date.price_per_person)}
        </span>
        {date.original_price && (
          <span className="text-gray-400 text-xs line-through">
            R$ {fmtBRL(date.original_price)}
          </span>
        )}
        <span className="text-gray-400 text-xs">/ pessoa · até {date.max_installments}x</span>
      </div>

      {/* Linha 3: barra de vagas full-width */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 flex items-center gap-1">
            <Users size={10} /> {sold}/{date.total_spots} vendidas
          </span>
          <span className={availCls}>{date.available_spots} disponíveis</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
