"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X, Loader2, Save, ChevronLeft, Upload } from "lucide-react";
import { apiFetch, getToken } from "@/lib/api";

interface ItineraryDay {
  day: number;
  title: string;
  description: string;
  time?: string;
}

interface TripFormData {
  title: string;
  destination: string;
  category: string;
  tag: string;
  short_description: string;
  description: string;
  image_url: string;
  departure_date: string;
  return_date: string;
  duration_nights: number;
  price_per_person: string;
  original_price: string;
  max_installments: number;
  total_spots: number;
  available_spots: number;
  min_group_size: number;
  includes: string[];
  excludes: string[];
  itinerary: ItineraryDay[];
  gallery: string[];
  status: string;
  is_featured: boolean;
  is_active: boolean;
}

const EMPTY: TripFormData = {
  title: "",
  destination: "",
  category: "praia",
  tag: "",
  short_description: "",
  description: "",
  image_url: "",
  departure_date: "",
  return_date: "",
  duration_nights: 1,
  price_per_person: "",
  original_price: "",
  max_installments: 12,
  total_spots: 30,
  available_spots: 30,
  min_group_size: 1,
  includes: [],
  excludes: [],
  itinerary: [],
  gallery: [],
  status: "active",
  is_featured: false,
  is_active: true,
};

function toDateInput(iso: string | undefined): string {
  if (!iso) return "";
  return iso.split("T")[0];
}

export default function TripForm({ tripId, initialData }: { tripId?: number; initialData?: Partial<TripFormData> & { departure_date?: string; return_date?: string } }) {
  const router = useRouter();
  const [form, setForm] = useState<TripFormData>({
    ...EMPTY,
    ...initialData,
    departure_date: toDateInput(initialData?.departure_date),
    return_date: toDateInput(initialData?.return_date),
    price_per_person: initialData?.price_per_person?.toString() ?? "",
    original_price: initialData?.original_price?.toString() ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newInclude, setNewInclude] = useState("");
  const [newExclude, setNewExclude] = useState("");
  const [newGallery, setNewGallery] = useState("");

  useEffect(() => {
    if (form.departure_date && form.return_date) {
      const dep = new Date(form.departure_date + "T12:00:00");
      const ret = new Date(form.return_date + "T12:00:00");
      const nights = Math.max(0, Math.round((ret.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24)));
      setForm((f) => ({ ...f, duration_nights: nights }));
    }
  }, [form.departure_date, form.return_date]);

  const set = <K extends keyof TripFormData>(key: K, value: TripFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addToList = (
    key: "includes" | "excludes" | "gallery",
    value: string,
    setInput: (v: string) => void
  ) => {
    if (!value.trim()) return;
    setForm((f) => ({ ...f, [key]: [...f[key], value.trim()] }));
    setInput("");
  };

  const removeFromList = (key: "includes" | "excludes" | "gallery", index: number) =>
    setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));

  const addDay = () =>
    setForm((f) => ({
      ...f,
      itinerary: [...f.itinerary, { day: f.itinerary.length + 1, title: "", description: "", time: "" }],
    }));

  const updateDay = (index: number, field: "title" | "description" | "time", value: string) =>
    setForm((f) => ({
      ...f,
      itinerary: f.itinerary.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    }));

  const removeDay = (index: number) =>
    setForm((f) => ({
      ...f,
      itinerary: f.itinerary
        .filter((_, i) => i !== index)
        .map((d, i) => ({ ...d, day: i + 1 })),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const body = {
      ...form,
      price_per_person: parseFloat(form.price_per_person) || 0,
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      departure_date: form.departure_date
        ? new Date(form.departure_date + "T12:00:00").toISOString()
        : null,
      return_date: form.return_date
        ? new Date(form.return_date + "T12:00:00").toISOString()
        : null,
    };

    try {
      const res = await apiFetch(tripId ? `/trips/${tripId}` : "/trips/", {
        method: tripId ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        if (Array.isArray(data.detail)) {
          setError(data.detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join(", "));
        } else {
          setError(typeof data.detail === "string" ? data.detail : "Erro ao salvar.");
        }
        return;
      }

      setSuccess(tripId ? "Viagem atualizada com sucesso!" : "Viagem criada com sucesso!");
      if (!tripId) setTimeout(() => router.push("/admin/viagens"), 1500);
    } catch {
      setError("Erro de conexão. Verifique se o backend está rodando.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/viagens"
            className="p-2 text-gray-400 hover:text-navy-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-black text-navy-800">
              {tripId ? "Editar Viagem" : "Nova Viagem"}
            </h1>
            <p className="text-gray-500 text-sm">
              {tripId ? "Atualize os dados do pacote" : "Preencha os dados do novo pacote"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-red-600 text-sm max-w-xs text-right">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {tripId ? "Salvar" : "Criar Viagem"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main */}
        <div className="col-span-2 space-y-6">
          <Section title="Informações Básicas">
            <div className="space-y-4">
              <Field label="Título do Pacote *">
                <input
                  className="input-field"
                  required
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Ex: Pacote Maceió — Praia do Francês 5 dias"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Destino *">
                  <input
                    className="input-field"
                    required
                    value={form.destination}
                    onChange={(e) => set("destination", e.target.value)}
                    placeholder="Ex: Maceió, AL"
                  />
                </Field>
                <Field label="Categoria">
                  <select
                    className="input-field"
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                  >
                    {[
                      ["praia", "Praia"],
                      ["nordeste", "Nordeste"],
                      ["serra", "Serra"],
                      ["aventura", "Aventura"],
                      ["cultural", "Cultural"],
                      ["internacional", "Internacional"],
                    ].map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Descrição Curta (aparece nos cards)">
                <input
                  className="input-field"
                  value={form.short_description}
                  onChange={(e) => set("short_description", e.target.value)}
                  placeholder="Ex: 5 dias no paraíso nordestino com transfer e café da manhã"
                  maxLength={500}
                />
              </Field>
              <Field label="Descrição Completa *">
                <textarea
                  className="input-field min-h-[120px] resize-y"
                  required
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Descreva os detalhes da viagem..."
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Imagem Principal">
                  <ImageUpload
                    value={form.image_url}
                    onChange={(url) => set("image_url", url)}
                  />
                </Field>
                <Field label="Tag (opcional)">
                  <input
                    className="input-field"
                    value={form.tag}
                    onChange={(e) => set("tag", e.target.value)}
                    placeholder="Ex: Mais Vendido, Promoção"
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Datas">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Data de Ida *">
                <input
                  className="input-field"
                  type="date"
                  required
                  value={form.departure_date}
                  onChange={(e) => set("departure_date", e.target.value)}
                />
              </Field>
              <Field label="Data de Volta *">
                <input
                  className="input-field"
                  type="date"
                  required
                  value={form.return_date}
                  onChange={(e) => set("return_date", e.target.value)}
                />
              </Field>
              <Field label="Noites (auto)">
                <input
                  className="input-field bg-gray-50 cursor-not-allowed"
                  type="number"
                  value={form.duration_nights}
                  readOnly
                />
              </Field>
            </div>
          </Section>

          <Section title="Preços">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Preço por Pessoa (R$) *">
                <input
                  className="input-field"
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={form.price_per_person}
                  onChange={(e) => set("price_per_person", e.target.value)}
                  placeholder="1490.00"
                />
              </Field>
              <Field label="Preço Original R$ (De:)">
                <input
                  className="input-field"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.original_price}
                  onChange={(e) => set("original_price", e.target.value)}
                  placeholder="1890.00"
                />
              </Field>
              <Field label="Parcelamento máximo">
                <select
                  className="input-field"
                  value={form.max_installments}
                  onChange={(e) => set("max_installments", parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Vagas">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Total de Vagas *">
                <input
                  className="input-field"
                  type="number"
                  required
                  min="1"
                  value={form.total_spots}
                  onChange={(e) => set("total_spots", parseInt(e.target.value) || 0)}
                />
              </Field>
              <Field label="Vagas Disponíveis *">
                <input
                  className="input-field"
                  type="number"
                  required
                  min="0"
                  value={form.available_spots}
                  onChange={(e) => set("available_spots", parseInt(e.target.value) || 0)}
                />
              </Field>
              <Field label="Mínimo por Grupo">
                <input
                  className="input-field"
                  type="number"
                  min="1"
                  value={form.min_group_size}
                  onChange={(e) => set("min_group_size", parseInt(e.target.value) || 1)}
                />
              </Field>
            </div>
          </Section>

          <Section title="O que inclui">
            <ListEditor
              items={form.includes}
              value={newInclude}
              onChange={setNewInclude}
              onAdd={() => addToList("includes", newInclude, setNewInclude)}
              onRemove={(i) => removeFromList("includes", i)}
              placeholder="Ex: Transfer aeroporto, Café da manhã..."
            />
          </Section>

          <Section title="O que NÃO inclui">
            <ListEditor
              items={form.excludes}
              value={newExclude}
              onChange={setNewExclude}
              onAdd={() => addToList("excludes", newExclude, setNewExclude)}
              onRemove={(i) => removeFromList("excludes", i)}
              placeholder="Ex: Passagem aérea, Almoços e jantares..."
            />
          </Section>

          <Section title="Roteiro Dia a Dia">
            <div className="space-y-3">
              {form.itinerary.map((day, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 relative">
                  <button
                    type="button"
                    onClick={() => removeDay(i)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <X size={15} />
                  </button>
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-xs font-bold text-gold-600 uppercase tracking-wider">
                      Dia {day.day}
                    </p>
                    <input
                      className="input-field py-1 px-2 text-xs w-28"
                      type="time"
                      value={day.time ?? ""}
                      onChange={(e) => updateDay(i, "time", e.target.value)}
                      title="Horário (opcional)"
                    />
                    <span className="text-xs text-gray-400">horário opcional</span>
                  </div>
                  <input
                    className="input-field mb-2 text-sm"
                    value={day.title}
                    onChange={(e) => updateDay(i, "title", e.target.value)}
                    placeholder="Título (Ex: Chegada e city tour)"
                  />
                  <textarea
                    className="input-field resize-y min-h-[80px] text-sm"
                    value={day.description}
                    onChange={(e) => updateDay(i, "description", e.target.value)}
                    placeholder="Descreva as atividades..."
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addDay}
                className="flex items-center gap-2 text-sm text-navy-600 hover:text-gold-600 font-medium py-2 transition-colors"
              >
                <Plus size={16} />
                Adicionar Dia ao Roteiro
              </button>
            </div>
          </Section>

          <Section title="Galeria de Fotos">
            <GalleryUpload
              items={form.gallery}
              value={newGallery}
              onChange={setNewGallery}
              onAdd={() => addToList("gallery", newGallery, setNewGallery)}
              onRemove={(i) => removeFromList("gallery", i)}
            />
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Section title="Publicação">
            <div className="space-y-4">
              <Field label="Status">
                <select
                  className="input-field"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option value="active">Ativo</option>
                  <option value="sold_out">Esgotado</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="completed">Concluído</option>
                </select>
              </Field>
              <Toggle
                label="Em Destaque"
                description="Aparece na seção de destaques da home"
                checked={form.is_featured}
                onChange={(v) => set("is_featured", v)}
              />
              <Toggle
                label="Publicado"
                description="Visível para os clientes no site"
                checked={form.is_active}
                onChange={(v) => set("is_active", v)}
              />
            </div>
          </Section>

          {form.image_url && (
            <Section title="Preview do Card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.image_url}
                alt={form.title}
                className="w-full h-36 object-cover rounded-xl mb-3"
              />
              <p className="font-bold text-navy-800 text-sm leading-tight">
                {form.title || "Título do pacote"}
              </p>
              <p className="text-gray-500 text-xs mt-1">{form.destination || "Destino"}</p>
              {form.price_per_person && (
                <p className="text-gold-600 font-bold text-sm mt-2">
                  A partir de R${" "}
                  {parseFloat(form.price_per_person).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              )}
            </Section>
          )}
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-navy-700">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${
          checked ? "bg-gold-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function ListEditor({
  items,
  value,
  onChange,
  onAdd,
  onRemove,
  placeholder,
  type = "text",
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <p className="flex-1 text-sm text-gray-700 truncate">{item}</p>
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <input
          className="input-field flex-1 py-2 text-sm"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <button
          type="button"
          onClick={onAdd}
          className="px-3 bg-navy-700 text-white rounded-xl hover:bg-navy-600 transition-colors flex-shrink-0"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

async function uploadFile(file: File): Promise<string> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/admin/upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro no upload");
  }
  const data = await res.json();
  return data.url;
}

function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadFile(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed cursor-pointer text-sm font-medium transition-colors ${
          uploading ? "border-gray-200 text-gray-400" : "border-navy-200 text-navy-600 hover:border-gold-400 hover:text-gold-600"
        }`}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Enviando..." : "Enviar foto"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        <input
          className="input-field flex-1 py-2 text-sm"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ou cole uma URL..."
        />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}

function GalleryUpload({
  items,
  value,
  onChange,
  onAdd,
  onRemove,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const url = await uploadFile(file);
        onChange(url);
        onAdd();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item} alt="" className="w-10 h-8 object-cover rounded-lg flex-shrink-0" />
          <p className="flex-1 text-xs text-gray-500 truncate">{item}</p>
          <button type="button" onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed cursor-pointer text-sm font-medium transition-colors flex-shrink-0 ${
          uploading ? "border-gray-200 text-gray-400" : "border-navy-200 text-navy-600 hover:border-gold-400 hover:text-gold-600"
        }`}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Enviando..." : "Enviar fotos"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        <input
          className="input-field flex-1 py-2 text-sm"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ou cole uma URL e pressione Enter..."
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
        />
        <button type="button" onClick={onAdd} className="px-3 bg-navy-700 text-white rounded-xl hover:bg-navy-600 transition-colors">
          <Plus size={16} />
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
