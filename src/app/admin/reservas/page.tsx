"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Plus, Search, ChevronDown, User, Phone, CreditCard, Cake, Users, FileText } from "lucide-react";
import { getToken } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ─── Types ─── */
type Booking = {
  id: number;
  booking_code: string;
  trip_id: number;
  user_id: number | null;
  traveler_name: string | null;
  traveler_cpf: string | null;
  traveler_phone: string | null;
  traveler_birth_date: string | null;
  num_travelers: number;
  price_per_person: number;
  total_amount: number;
  final_amount: number;
  payment_method: string | null;
  status: string;
  notes: string | null;
  travelers_info: string | null;
  created_at: string;
  confirmed_at: string | null;
};

type Trip = { id: number; title: string; destination: string; price_per_person: number; available_spots: number };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  interesse:  { label: "Interesse",  color: "bg-amber-100 text-amber-700" },
  pending:    { label: "Pendente",   color: "bg-blue-100 text-blue-700" },
  confirmed:  { label: "Confirmado", color: "bg-emerald-100 text-emerald-700" },
  cancelled:  { label: "Cancelado",  color: "bg-red-100 text-red-700" },
  completed:  { label: "Realizado",  color: "bg-gray-100 text-gray-600" },
};

function fmt(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

/* ─── External Sale Modal ─── */
function ExternalSaleModal({ trips, onClose, onSaved }: {
  trips: Trip[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tripId, setTripId] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [birth, setBirth] = useState("");
  const [people, setPeople] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("whatsapp");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatCPF = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!tripId) { setError("Selecione a viagem."); return; }
    if (cpf.replace(/\D/g, "").length < 11) { setError("CPF inválido."); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/bookings/admin/external`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          trip_id: parseInt(tripId),
          traveler_name: name,
          traveler_cpf: cpf,
          traveler_phone: phone,
          traveler_birth_date: birth,
          num_travelers: people,
          payment_method: paymentMethod,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Erro ao salvar.");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-navy-800 text-lg">Nova Venda Externa</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Viagem *</label>
            <select required value={tripId} onChange={(e) => setTripId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400">
              <option value="">Selecione...</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.title} — {t.destination} ({t.available_spots} vagas)</option>
              ))}
            </select>
          </div>

          <div className="bg-navy-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-navy-700 uppercase tracking-wide">Dados do titular</p>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required type="text" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <CreditCard size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required type="text" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))}
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required type="tel" placeholder="(41) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Cake size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required type="date" value={birth} onChange={(e) => setBirth(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
              </div>
              <div className="flex items-center gap-3">
                <Users size={13} className="text-gray-400 flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPeople((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center font-bold">−</button>
                  <span className="w-6 text-center font-bold text-sm">{people}</span>
                  <button type="button" onClick={() => setPeople((p) => p + 1)}
                    className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center font-bold">+</button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Forma de pagamento</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400">
                <option value="whatsapp">WhatsApp / Presencial</option>
                <option value="pix">PIX</option>
                <option value="transfer">Transferência</option>
                <option value="credit_card">Cartão de crédito</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <FileText size={13} className="absolute left-3 top-3 text-gray-400" />
            <textarea rows={2} placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60">
            {loading ? "Salvando..." : "Registrar Venda Confirmada"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function AdminReservasPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tab, setTab] = useState<"interesse" | "confirmed" | "all">("interesse");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showExternal, setShowExternal] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = tab !== "all" ? `?booking_status=${tab}` : "";
      const res = await fetch(`${API}/bookings/admin/all${params}&limit=200`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setBookings(await res.json());
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetch(`${API}/trips/admin-list`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.json()).then(setTrips).catch(() => {});
  }, []);

  const confirm = async (code: string) => {
    setActionLoading(code);
    try {
      await fetch(`${API}/bookings/${code}/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchBookings();
    } finally {
      setActionLoading(null);
    }
  };

  const cancel = async (code: string) => {
    if (!confirm(`Cancelar reserva ${code}?`)) return;
    setActionLoading(code);
    try {
      await fetch(`${API}/bookings/${code}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchBookings();
    } finally {
      setActionLoading(null);
    }
  };

  const tripMap = Object.fromEntries(trips.map((t) => [t.id, t]));

  const filtered = bookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.booking_code.toLowerCase().includes(q) ||
      (b.traveler_name || "").toLowerCase().includes(q) ||
      (b.traveler_cpf || "").includes(q) ||
      (tripMap[b.trip_id]?.title || "").toLowerCase().includes(q)
    );
  });

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "interesse", label: "Interesses" },
    { key: "confirmed", label: "Confirmadas" },
    { key: "all",       label: "Todas" },
  ];

  return (
    <div className="space-y-6">
      {showExternal && (
        <ExternalSaleModal
          trips={trips.filter((t) => t.available_spots > 0)}
          onClose={() => setShowExternal(false)}
          onSaved={fetchBookings}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy-900">Reservas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Interesses e vendas confirmadas</p>
        </div>
        <button onClick={() => setShowExternal(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
          <Plus size={16} /> Nova Venda Externa
        </button>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                tab === key ? "bg-navy-800 text-white" : "text-gray-500 hover:text-navy-800"
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por código, nome, CPF ou viagem..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
        </div>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Nenhuma reserva encontrada</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map((b) => {
                const trip = tripMap[b.trip_id];
                const st = STATUS_LABEL[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600" };
                const isLoading = actionLoading === b.booking_code;
                const travelerName = b.traveler_name || `Usuário #${b.user_id}`;
                return (
                  <div key={b.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-navy-600 font-semibold">{b.booking_code}</p>
                        <p className="font-medium text-navy-800 text-sm leading-tight truncate">{trip?.title ?? `Viagem #${b.trip_id}`}</p>
                        <p className="text-xs text-gray-400">{travelerName}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{b.num_travelers} pessoa{b.num_travelers !== 1 ? "s" : ""}</span>
                      <span className="font-bold text-navy-700">R$ {b.final_amount.toLocaleString("pt-BR")}</span>
                      <span>{fmt(b.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.status === "interesse" && (
                        <button onClick={() => confirm(b.booking_code)} disabled={isLoading}
                          className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                          <Check size={11} /> Confirmar
                        </button>
                      )}
                      {["interesse", "confirmed", "pending"].includes(b.status) && (
                        <button onClick={() => cancel(b.booking_code)} disabled={isLoading}
                          className="flex items-center gap-1 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                          <X size={11} /> Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Viagem</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Titular</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pessoas</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((b) => {
                    const trip = tripMap[b.trip_id];
                    const st = STATUS_LABEL[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600" };
                    const isLoading = actionLoading === b.booking_code;
                    const travelerName = b.traveler_name || `Usuário #${b.user_id}`;
                    return (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs text-navy-700 font-semibold">{b.booking_code}</td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-navy-800 leading-tight">{trip?.title ?? `Viagem #${b.trip_id}`}</p>
                          <p className="text-xs text-gray-400">{trip?.destination}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-navy-800 leading-tight">{travelerName}</p>
                          {b.traveler_cpf && <p className="text-xs text-gray-400">{b.traveler_cpf}</p>}
                          {b.traveler_phone && <p className="text-xs text-gray-400">{b.traveler_phone}</p>}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-navy-800">{b.num_travelers}</td>
                        <td className="px-5 py-4 font-semibold text-navy-800">
                          R$ {b.final_amount.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">{fmt(b.created_at)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            {b.status === "interesse" && (
                              <button onClick={() => confirm(b.booking_code)} disabled={isLoading}
                                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                                <Check size={12} /> Confirmar
                              </button>
                            )}
                            {["interesse", "confirmed", "pending"].includes(b.status) && (
                              <button onClick={() => cancel(b.booking_code)} disabled={isLoading}
                                className="flex items-center gap-1.5 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                                <X size={12} /> Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 text-right">{filtered.length} registro(s)</p>
    </div>
  );
}
