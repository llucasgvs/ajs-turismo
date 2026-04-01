"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X, Loader2, Save, ChevronLeft, Upload, Star } from "lucide-react";
import { apiFetch, getToken } from "@/lib/api";

interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

interface TemplateFormData {
  title: string;
  destination: string;
  category: string;
  tag: string;
  short_description: string;
  description: string;
  image_url: string;
  includes: string[];
  excludes: string[];
  itinerary: ItineraryDay[];
  gallery: string[];
  is_featured: boolean;
  is_active: boolean;
}

const EMPTY: TemplateFormData = {
  title: "", destination: "", category: "praia", tag: "",
  short_description: "", description: "", image_url: "",
  includes: [], excludes: [], itinerary: [], gallery: [],
  is_featured: false, is_active: true,
};

export default function TemplateForm({
  templateId,
  initialData,
}: {
  templateId?: number;
  initialData?: Partial<TemplateFormData>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<TemplateFormData>({ ...EMPTY, ...initialData });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newInclude, setNewInclude] = useState("");
  const [newExclude, setNewExclude] = useState("");
  const [newGallery, setNewGallery] = useState("");

  const set = <K extends keyof TemplateFormData>(key: K, value: TemplateFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addToList = (key: "includes" | "excludes" | "gallery", value: string, clear: () => void) => {
    if (!value.trim()) return;
    setForm((f) => ({ ...f, [key]: [...f[key], value.trim()] }));
    clear();
  };

  const removeFromList = (key: "includes" | "excludes" | "gallery", index: number) =>
    setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));

  const addDay = () =>
    setForm((f) => ({ ...f, itinerary: [...f.itinerary, { day: f.itinerary.length + 1, title: "", description: "" }] }));

  const updateDay = (index: number, field: "title" | "description", value: string) =>
    setForm((f) => ({ ...f, itinerary: f.itinerary.map((d, i) => (i === index ? { ...d, [field]: value } : d)) }));

  const removeDay = (index: number) =>
    setForm((f) => ({
      ...f,
      itinerary: f.itinerary.filter((_, i) => i !== index).map((d, i) => ({ ...d, day: i + 1 })),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(
        templateId ? `/templates/${templateId}` : "/templates/",
        { method: templateId ? "PUT" : "POST", body: JSON.stringify(form) }
      );
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.detail)) {
          setError(data.detail.map((d: {msg?: string}) => d.msg ?? JSON.stringify(d)).join(", "));
        } else {
          setError(typeof data.detail === "string" ? data.detail : "Erro ao salvar.");
        }
        return;
      }
      setSuccess(templateId ? "Roteiro atualizado!" : "Roteiro criado!");
      if (!templateId) setTimeout(() => router.push(`/admin/viagens/${data.id}`), 1200);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={templateId ? `/admin/viagens/${templateId}` : "/admin/viagens"}
              className="p-2 text-gray-400 hover:text-navy-700 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
            >
              <ChevronLeft size={20} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-display font-black text-navy-800 truncate">
                {templateId ? "Editar Roteiro" : "Novo Roteiro"}
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm hidden sm:block">
                {templateId ? "Atualize os dados do roteiro" : "Preencha os dados do novo roteiro"}
              </p>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50 flex-shrink-0">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span className="hidden xs:inline">{templateId ? "Salvar" : "Criar"}</span>
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2 px-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2 px-2">{success}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <Section title="Informações do Roteiro">
            <div className="space-y-4">
              <Field label="Nome do Roteiro *">
                <input className="input-field" required value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Ex: Ilha do Mel · Final de Semana" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Destino *">
                  <input className="input-field" required value={form.destination}
                    onChange={(e) => set("destination", e.target.value)}
                    placeholder="Ex: Ilha do Mel, PR" />
                </Field>
                <Field label="Categoria">
                  <select className="input-field" value={form.category}
                    onChange={(e) => set("category", e.target.value)}>
                    {[["praia","Praia"],["nordeste","Nordeste"],["serra","Serra"],
                      ["aventura","Aventura"],["cultural","Cultural"],["internacional","Internacional"]
                    ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Descrição Curta (aparece nos cards)">
                <input className="input-field" value={form.short_description}
                  onChange={(e) => set("short_description", e.target.value)}
                  placeholder="Ex: 2 dias e 1 noite com transfer incluso" maxLength={500} />
              </Field>
              <Field label="Descrição Completa *">
                <textarea className="input-field min-h-[120px] resize-y" required value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Descreva os detalhes do roteiro..." />
              </Field>
              <Field label="Imagem Principal">
                <ImageUpload value={form.image_url} onChange={(url) => set("image_url", url)} />
              </Field>
              <Field label="Tag (opcional)">
                <input className="input-field" value={form.tag}
                  onChange={(e) => set("tag", e.target.value)}
                  placeholder="Ex: Mais Vendido, Promoção" />
              </Field>
            </div>
          </Section>

          <Section title="O que inclui">
            <ListEditor items={form.includes} value={newInclude} onChange={setNewInclude}
              onAdd={() => addToList("includes", newInclude, () => setNewInclude(""))}
              onRemove={(i) => removeFromList("includes", i)}
              placeholder="Ex: Transfer aeroporto, Café da manhã..." />
          </Section>

          <Section title="O que NÃO inclui">
            <ListEditor items={form.excludes} value={newExclude} onChange={setNewExclude}
              onAdd={() => addToList("excludes", newExclude, () => setNewExclude(""))}
              onRemove={(i) => removeFromList("excludes", i)}
              placeholder="Ex: Passagem aérea, Almoços..." />
          </Section>

          <Section title="Roteiro Dia a Dia">
            <div className="space-y-3">
              {form.itinerary.map((day, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 relative">
                  <button type="button" onClick={() => removeDay(i)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors">
                    <X size={15} />
                  </button>
                  <p className="text-xs font-bold text-gold-600 uppercase tracking-wider mb-3">Dia {day.day}</p>
                  <input className="input-field mb-2 text-sm" value={day.title}
                    onChange={(e) => updateDay(i, "title", e.target.value)}
                    placeholder="Título do dia (Ex: Chegada e city tour)" />
                  <textarea className="input-field resize-y min-h-[80px] text-sm" value={day.description}
                    onChange={(e) => updateDay(i, "description", e.target.value)}
                    placeholder="Descreva as atividades do dia..." />
                </div>
              ))}
              <button type="button" onClick={addDay}
                className="flex items-center gap-2 text-sm text-navy-600 hover:text-gold-600 font-medium py-2 transition-colors">
                <Plus size={16} /> Adicionar Dia ao Roteiro
              </button>
            </div>
          </Section>

          <Section title="Galeria de Fotos">
            <GalleryUpload items={form.gallery} value={newGallery} onChange={setNewGallery}
              onAdd={() => addToList("gallery", newGallery, () => setNewGallery(""))}
              onRemove={(i) => removeFromList("gallery", i)} />
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Section title="Publicação">
            <div className="space-y-4">
              <Toggle label="Em Destaque" description="Aparece na seção de destaques da home"
                checked={form.is_featured} onChange={(v) => set("is_featured", v)} />
              <Toggle label="Roteiro Ativo" description="Permite criar novas datas para este roteiro"
                checked={form.is_active} onChange={(v) => set("is_active", v)} />
            </div>
          </Section>

          {form.image_url && (
            <Section title="Preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image_url} alt={form.title} className="w-full h-36 object-cover rounded-xl mb-3" />
              <p className="font-bold text-navy-800 text-sm leading-tight">{form.title || "Nome do roteiro"}</p>
              <p className="text-gray-500 text-xs mt-1">{form.destination || "Destino"}</p>
              {form.is_featured && (
                <span className="mt-2 inline-flex items-center gap-1 text-gold-600 text-xs font-semibold">
                  <Star size={10} fill="currentColor" /> Destaque
                </span>
              )}
            </Section>
          )}
        </div>
      </div>
    </form>
  );
}

/* ── Sub-componentes reutilizáveis ────────────────────────────────────── */

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

function Toggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-navy-700">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${checked ? "bg-gold-500" : "bg-gray-200"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function ListEditor({ items, value, onChange, onAdd, onRemove, placeholder }: {
  items: string[]; value: string; onChange: (v: string) => void;
  onAdd: () => void; onRemove: (i: number) => void; placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <p className="flex-1 text-sm text-gray-700 truncate">{item}</p>
          <button type="button" onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-500 transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <input className="input-field flex-1 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} />
        <button type="button" onClick={onAdd}
          className="px-3 bg-navy-700 text-white rounded-xl hover:bg-navy-600 transition-colors flex-shrink-0">
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
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/upload`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData,
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Erro no upload"); }
  return (await res.json()).url;
}

function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setError("");
    try { onChange(await uploadFile(file)); }
    catch (err) { setError(err instanceof Error ? err.message : "Erro"); }
    finally { setUploading(false); e.target.value = ""; }
  };
  return (
    <div className="space-y-2">
      {value && (
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
          <button type="button" onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <X size={12} />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed cursor-pointer text-sm font-medium transition-colors ${uploading ? "border-gray-200 text-gray-400" : "border-navy-200 text-navy-600 hover:border-gold-400 hover:text-gold-600"}`}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Enviando..." : "Enviar foto"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        <input className="input-field flex-1 py-2 text-sm" type="url" value={value}
          onChange={(e) => onChange(e.target.value)} placeholder="Ou cole uma URL..." />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}

function GalleryUpload({ items, value, onChange, onAdd, onRemove }: {
  items: string[]; value: string; onChange: (v: string) => void;
  onAdd: () => void; onRemove: (i: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setUploading(true); setError("");
    try { for (const file of files) { onChange(await uploadFile(file)); onAdd(); } }
    catch (err) { setError(err instanceof Error ? err.message : "Erro"); }
    finally { setUploading(false); e.target.value = ""; }
  };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item} alt="" className="w-10 h-8 object-cover rounded-lg flex-shrink-0" />
          <p className="flex-1 text-xs text-gray-500 truncate">{item}</p>
          <button type="button" onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed cursor-pointer text-sm font-medium transition-colors flex-shrink-0 ${uploading ? "border-gray-200 text-gray-400" : "border-navy-200 text-navy-600 hover:border-gold-400 hover:text-gold-600"}`}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Enviando..." : "Enviar fotos"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        <input className="input-field flex-1 py-2 text-sm" type="url" value={value}
          onChange={(e) => onChange(e.target.value)} placeholder="Ou cole uma URL..."
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} />
        <button type="button" onClick={onAdd}
          className="px-3 bg-navy-700 text-white rounded-xl hover:bg-navy-600 transition-colors"><Plus size={16} /></button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
