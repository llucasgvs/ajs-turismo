"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X, Loader2, Save, ChevronLeft, Upload, Star, MapPin, Check } from "lucide-react";
import { apiFetch, getToken } from "@/lib/api";
import { invalidateAdminCache } from "@/lib/adminCache";

interface ItinerarySection {
  title: string;
  items: string[];
}

function normalizeItinerary(raw: unknown[]): ItinerarySection[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: unknown, idx) => {
    const entry = item as Record<string, unknown>;
    if (Array.isArray(entry.items)) {
      return { title: String(entry.title ?? ""), items: entry.items as string[] };
    }
    // Formato antigo: converte description em items
    const lines = String(entry.description ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return {
      title: String(entry.title ?? `Dia ${(entry.day as number) ?? idx + 1}`),
      items: lines,
    };
  });
}

interface TemplateFormData {
  title: string;
  destination: string;
  category: string;
  tag: string;
  short_description: string;
  description: string;
  required_documents: string;
  image_url: string;
  includes: string[];
  excludes: string[];
  optionals: { name: string; price: string }[];
  itinerary: ItinerarySection[];
  departure_locations: string[];
  gallery: string[];
  is_featured: boolean;
  is_active: boolean;
  whatsapp_only: boolean;
  group_key: string;
  // Saídas diárias
  is_open_date: boolean;
  open_date_price: string;
  open_date_spots_per_day: string;
  open_date_min_advance: string;
  open_date_max_advance: string;
  open_date_departure_time: string; // "HH:MM"
  open_date_return_time: string;    // "HH:MM"
}

const PRESET_CATEGORIES: [string, string][] = [
  ["praia", "Praia"],
  ["nordeste", "Nordeste"],
  ["litoral", "Litoral"],
  ["sul", "Sul do Brasil"],
  ["serra", "Serra / Montanha"],
  ["aventura", "Aventura"],
  ["natureza", "Natureza / Ecoturismo"],
  ["cultural", "Cultural"],
  ["gastronomia", "Gastronomia"],
  ["religioso", "Religioso / Romaria"],
  ["parque", "Parque Temático"],
  ["internacional", "Internacional"],
  ["outros", "Outros"],
];
const PRESET_VALUES = new Set(PRESET_CATEGORIES.map(([v]) => v));

const PRESET_DOCUMENTS =
  `• RG ou\n• CNH dentro da validade ou\n• Passaporte dentro da validade\n\nPara crianças menores de 12 anos, também é aceita a certidão de nascimento.`;

const PRESET_DEPARTURE_LOCATIONS = [
  "Curitiba · Shopping Curitiba (Rua Lamenha Lins, 447)",
  "Curitiba · Shopping Estação (Rua Barão do Rio Branco, 805)",
  "São José dos Pinhais · Posto Pinheirão",
];

const EMPTY: TemplateFormData = {
  title: "", destination: "", category: "praia", tag: "",
  short_description: "", description: "", required_documents: "", image_url: "",
  includes: ["Coordenador de grupo", "Transporte Ida e Volta", "Hospedagem"], excludes: [], optionals: [], itinerary: [], departure_locations: [], gallery: [],
  is_featured: false, is_active: true, whatsapp_only: false, group_key: "",
  is_open_date: false, open_date_price: "", open_date_spots_per_day: "0",
  open_date_min_advance: "1", open_date_max_advance: "180",
  open_date_departure_time: "06:00", open_date_return_time: "23:59",
};

export default function TemplateForm({
  templateId,
  initialData,
}: {
  templateId?: number;
  initialData?: Partial<TemplateFormData>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<TemplateFormData>({
    ...EMPTY,
    ...initialData,
    // normaliza optionals: price pode vir como number da API, converte p/ string
    optionals: (initialData?.optionals ?? []).map((o) => ({
      name: String(o.name ?? ""),
      price: String((o as { name: string; price: number | string }).price ?? ""),
    })),
    // normaliza itinerário: suporta formato antigo {day,title,description} e novo {title,items}
    itinerary: normalizeItinerary((initialData?.itinerary as unknown[]) ?? []),
    departure_locations: (initialData?.departure_locations as string[] | undefined) ?? [],
    group_key: String((initialData as Record<string, unknown>)?.group_key ?? ""),
    // normaliza open_date: number → string para os inputs
    open_date_price: String((initialData as Record<string, unknown>)?.open_date_price ?? ""),
    open_date_spots_per_day: String((initialData as Record<string, unknown>)?.open_date_spots_per_day ?? "0"),
    open_date_min_advance: String((initialData as Record<string, unknown>)?.open_date_min_advance ?? "1"),
    open_date_max_advance: String((initialData as Record<string, unknown>)?.open_date_max_advance ?? "180"),
    // normaliza hour/minute → "HH:MM"
    open_date_departure_time: (() => {
      const d = initialData as Record<string, unknown>;
      const h = d?.open_date_departure_hour != null ? Number(d.open_date_departure_hour) : 6;
      const m = d?.open_date_departure_minute != null ? Number(d.open_date_departure_minute) : 0;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    })(),
    open_date_return_time: (() => {
      const d = initialData as Record<string, unknown>;
      const h = d?.open_date_return_hour != null ? Number(d.open_date_return_hour) : 23;
      const m = d?.open_date_return_minute != null ? Number(d.open_date_return_minute) : 59;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    })(),
  });
  const [isCustomCategory, setIsCustomCategory] = useState(
    () => !!initialData?.category && !PRESET_VALUES.has(initialData.category)
  );
  const customCategoryRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newInclude, setNewInclude] = useState("");
  const [newExclude, setNewExclude] = useState("");
  const [newDepartureLocation, setNewDepartureLocation] = useState("");
  const [newOptName, setNewOptName] = useState("");
  const [newOptPrice, setNewOptPrice] = useState("");
  const [existingGroups, setExistingGroups] = useState<string[]>([]);
  const [isNewGroup, setIsNewGroup] = useState(false);
  useEffect(() => {
    apiFetch("/templates/admin-list").then(r => r.ok ? r.json() : []).then((list: { group_key?: string | null }[]) => {
      setExistingGroups(Array.from(new Set((list || []).map(t => t.group_key).filter((g): g is string => !!g))));
    }).catch(() => {});
  }, []);

  const set = <K extends keyof TemplateFormData>(key: K, value: TemplateFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addToList = (key: "includes" | "excludes" | "departure_locations", value: string, clear: () => void) => {
    if (!value.trim()) return;
    setForm((f) => ({ ...f, [key]: [...f[key], value.trim()] }));
    clear();
  };

  const removeFromList = (key: "includes" | "excludes" | "departure_locations", index: number) =>
    setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));

  const toggleDepartureLocation = (loc: string) =>
    setForm((f) => ({
      ...f,
      departure_locations: f.departure_locations.includes(loc)
        ? f.departure_locations.filter((l) => l !== loc)
        : [...f.departure_locations, loc],
    }));

  const addSection = () =>
    setForm((f) => ({ ...f, itinerary: [...f.itinerary, { title: "", items: [] }] }));

  const updateSectionTitle = (idx: number, value: string) =>
    setForm((f) => ({ ...f, itinerary: f.itinerary.map((s, i) => i === idx ? { ...s, title: value } : s) }));

  const removeSection = (idx: number) =>
    setForm((f) => ({ ...f, itinerary: f.itinerary.filter((_, i) => i !== idx) }));

  const addItemToSection = (sectionIdx: number, text: string) => {
    if (!text.trim()) return;
    setForm((f) => ({
      ...f,
      itinerary: f.itinerary.map((s, i) =>
        i === sectionIdx ? { ...s, items: [...s.items, text.trim()] } : s
      ),
    }));
  };

  const removeItemFromSection = (sectionIdx: number, itemIdx: number) =>
    setForm((f) => ({
      ...f,
      itinerary: f.itinerary.map((s, i) =>
        i === sectionIdx ? { ...s, items: s.items.filter((_, j) => j !== itemIdx) } : s
      ),
    }));

  // Unified images: [image_url, ...gallery] (first = principal)
  const allImages = [form.image_url, ...form.gallery].filter(Boolean);
  const setAllImages = (imgs: string[]) =>
    setForm((f) => ({ ...f, image_url: imgs[0] ?? "", gallery: imgs.slice(1) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(
        templateId ? `/templates/${templateId}` : "/templates/",
        { method: templateId ? "PUT" : "POST", body: JSON.stringify({
          ...form,
          group_key: form.group_key.trim() || null,
          // converte price de string para number antes de enviar
          optionals: form.optionals
            .filter(o => o.name.trim())
            .map(o => ({ name: o.name.trim(), price: parseFloat(o.price) || 0 })),
          // converte open_date campos de string para number
          open_date_price: form.open_date_price ? parseFloat(form.open_date_price) : null,
          open_date_spots_per_day: parseInt(form.open_date_spots_per_day) || 0,
          open_date_min_advance: parseInt(form.open_date_min_advance) || 1,
          open_date_max_advance: parseInt(form.open_date_max_advance) || 180,
          // converte "HH:MM" → hora e minuto inteiros
          open_date_departure_hour: parseInt(form.open_date_departure_time.split(":")[0] ?? "6") || 6,
          open_date_departure_minute: parseInt(form.open_date_departure_time.split(":")[1] ?? "0"),
          open_date_return_hour: parseInt(form.open_date_return_time.split(":")[0] ?? "23") || 23,
          open_date_return_minute: parseInt(form.open_date_return_time.split(":")[1] ?? "59"),
        }) }
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
      invalidateAdminCache();
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
              <Field label="Grupo de destino (opcional)">
                <select className="input-field" value={isNewGroup ? "__new__" : form.group_key}
                  onChange={(e) => {
                    if (e.target.value === "__new__") { setIsNewGroup(true); set("group_key", ""); }
                    else { setIsNewGroup(false); set("group_key", e.target.value); }
                  }}>
                  <option value="">Sem grupo</option>
                  {Array.from(new Set([...existingGroups, form.group_key].filter(Boolean))).map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                  <option value="__new__">➕ Criar novo grupo…</option>
                </select>
                {isNewGroup && (
                  <input className="input-field mt-2" autoFocus value={form.group_key}
                    onChange={(e) => set("group_key", e.target.value)}
                    placeholder="Ex: Beto Carrero" />
                )}
                <p className="text-xs text-gray-400 mt-1">Agrupa vertentes do mesmo destino (ex.: bate-volta e 2 dias) para aparecerem como &quot;outras opções&quot; na página da viagem.</p>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Destino *">
                  <input className="input-field" required value={form.destination}
                    onChange={(e) => set("destination", e.target.value)}
                    placeholder="Ex: Ilha do Mel, PR" />
                </Field>
                <Field label="Categoria">
                  <select
                    className="input-field"
                    value={isCustomCategory ? "__outro__" : form.category}
                    onChange={(e) => {
                      if (e.target.value === "__outro__") {
                        setIsCustomCategory(true);
                        set("category", "");
                        setTimeout(() => customCategoryRef.current?.focus(), 50);
                      } else {
                        setIsCustomCategory(false);
                        set("category", e.target.value);
                      }
                    }}
                  >
                    {PRESET_CATEGORIES.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                    <option value="__outro__">✏️ Outro (digitar)</option>
                  </select>
                  {isCustomCategory && (
                    <input
                      ref={customCategoryRef}
                      className="input-field mt-2"
                      placeholder="Ex: Cruzeiro, Camping, City Tour..."
                      value={form.category}
                      onChange={(e) => set("category", e.target.value)}
                    />
                  )}
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
              <Field label="Documentos necessários para embarque">
                <textarea
                  className="input-field min-h-[140px] resize-y font-mono text-sm"
                  value={form.required_documents}
                  onChange={(e) => set("required_documents", e.target.value)}
                  placeholder={`Ex:\n• RG com menos de 10 anos de emissão\n• CNH física dentro da validade\n• Passaporte dentro da validade\n\nMenores de 18 anos: RG físico e acompanhado pelos pais.\nNa ausência de um dos responsáveis, necessário autorização registrada em cartório.`}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">Use • para marcar itens. Cada linha vira um parágrafo no site.</p>
                  <button
                    type="button"
                    onClick={() => set("required_documents", PRESET_DOCUMENTS)}
                    className="text-xs text-navy-500 hover:text-gold-600 hover:underline underline-offset-2 transition-colors flex-shrink-0 ml-3"
                  >
                    usar modelo padrão
                  </button>
                </div>
              </Field>
              <Field label="Tag (opcional)">
                <input className="input-field" value={form.tag}
                  onChange={(e) => set("tag", e.target.value)}
                  placeholder="Ex: Mais Vendido, Promoção" />
              </Field>
            </div>
          </Section>

          <Section title="Tipo de saída">
            <div className="space-y-4">
              {/* Toggle */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input type="checkbox" className="sr-only peer"
                    checked={form.is_open_date}
                    onChange={e => set("is_open_date", e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-checked:bg-navy-700 rounded-full transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                </div>
                <div>
                  <p className="font-semibold text-navy-800 text-sm">Saídas diárias (data livre)</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ideal para Beto Carrero, parques temáticos, city tours. O sistema gera datas automaticamente.
                    O cliente escolhe qualquer data disponível no calendário.
                  </p>
                </div>
              </label>

              {/* Campos open_date */}
              {form.is_open_date && (
                <div className="bg-navy-50 rounded-2xl p-4 space-y-3 border border-navy-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 font-semibold mb-1 block">Preço por pessoa *</label>
                      <input type="number" className="input-field text-sm" placeholder="Ex: 199.90"
                        value={form.open_date_price} min="0" step="0.01"
                        onChange={e => set("open_date_price", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-semibold mb-1 block">
                        Vagas por dia <span className="text-gray-400 font-normal">(0 = ilimitado)</span>
                      </label>
                      <input type="number" className="input-field text-sm" placeholder="0"
                        value={form.open_date_spots_per_day} min="0"
                        onChange={e => set("open_date_spots_per_day", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 font-semibold mb-1 block">Antecedência mínima (dias)</label>
                      <input type="number" className="input-field text-sm" value={form.open_date_min_advance}
                        min="0" onChange={e => set("open_date_min_advance", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-semibold mb-1 block">Disponível até (dias à frente)</label>
                      <input type="number" className="input-field text-sm" value={form.open_date_max_advance}
                        min="1" max="730" onChange={e => set("open_date_max_advance", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 font-semibold mb-1 block">Horário de saída</label>
                      <input type="time" className="input-field text-sm" value={form.open_date_departure_time}
                        onChange={e => set("open_date_departure_time", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-semibold mb-1 block">Horário de retorno</label>
                      <input type="time" className="input-field text-sm" value={form.open_date_return_time}
                        onChange={e => set("open_date_return_time", e.target.value)} />
                    </div>
                  </div>
                  <p className="text-xs text-navy-600 bg-white rounded-xl px-3 py-2 border border-navy-100">
                    ✅ O sistema vai gerar automaticamente todas as datas até <strong>{form.open_date_max_advance || 180} dias</strong> à frente ao salvar.
                    A cada deploy, datas futuras são renovadas automaticamente.
                  </p>
                </div>
              )}
            </div>
          </Section>

          <Section title="Imagens">
            <p className="text-xs text-gray-400 mb-3">
              A <span className="font-semibold text-gold-600">primeira imagem</span> é a principal (capa do roteiro). Passe o mouse nas demais para definir outra como principal.
            </p>
            <UnifiedGallery images={allImages} onChange={setAllImages} />
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

          <Section title="Locais de Saída">
            <p className="text-xs text-gray-400 mb-3">
              Selecione os pontos de embarque padrão ou adicione um personalizado.
            </p>
            {/* Chips de locais predefinidos */}
            <div className="flex flex-col gap-2 mb-4">
              {PRESET_DEPARTURE_LOCATIONS.map((loc) => {
                const selected = form.departure_locations.includes(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => toggleDepartureLocation(loc)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm border transition-[color,background-color,border-color,box-shadow,transform,opacity] text-left ${
                      selected
                        ? "bg-navy-700 text-white border-navy-700 shadow-sm"
                        : "bg-white text-gray-500 border-gray-200 hover:border-navy-300 hover:text-gray-700"
                    }`}
                  >
                    {/* Checkbox visual */}
                    <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                      selected
                        ? "bg-white border-white"
                        : "border-gray-300"
                    }`}>
                      {selected && <Check size={10} className="text-navy-700" strokeWidth={3} />}
                    </span>
                    <MapPin size={13} className={selected ? "text-gold-300 flex-shrink-0" : "text-gray-300 flex-shrink-0"} />
                    <span className="flex-1">{loc}</span>
                  </button>
                );
              })}
            </div>
            {/* Entradas personalizadas (não-predefinidas) */}
            {(() => {
              const customItems = form.departure_locations.filter(
                (l) => !PRESET_DEPARTURE_LOCATIONS.includes(l)
              );
              return (
                <div className="space-y-2">
                  {customItems.map((loc) => (
                    <div key={loc} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <p className="flex-1 text-sm text-gray-700 truncate">{loc}</p>
                      <button type="button"
                        onClick={() => setForm((f) => ({ ...f, departure_locations: f.departure_locations.filter((l) => l !== loc) }))}
                        className="text-gray-300 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <input
                      className="input-field flex-1 py-2 text-sm"
                      value={newDepartureLocation}
                      onChange={(e) => setNewDepartureLocation(e.target.value)}
                      placeholder="Outro local de embarque..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const v = newDepartureLocation.trim();
                          if (v && !form.departure_locations.includes(v)) {
                            setForm((f) => ({ ...f, departure_locations: [...f.departure_locations, v] }));
                            setNewDepartureLocation("");
                          }
                        }
                      }}
                    />
                    <button type="button"
                      onClick={() => {
                        const v = newDepartureLocation.trim();
                        if (v && !form.departure_locations.includes(v)) {
                          setForm((f) => ({ ...f, departure_locations: [...f.departure_locations, v] }));
                          setNewDepartureLocation("");
                        }
                      }}
                      className="px-3 bg-navy-700 text-white rounded-xl hover:bg-navy-600 transition-colors flex-shrink-0">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </Section>

          <Section title="Opcionais (cliente escolhe)">
            <p className="text-xs text-gray-400 mb-3">
              O cliente poderá selecionar esses itens ao fazer a reserva. O valor é por pessoa.
            </p>
            <div className="space-y-2">
              {form.optionals.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                    R$ {parseFloat(opt.price || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <p className="flex-1 text-sm text-gray-700 truncate">{opt.name}</p>
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, optionals: f.optionals.filter((_, j) => j !== i) }))}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input className="input-field flex-1 py-2 text-sm" value={newOptName}
                  onChange={e => setNewOptName(e.target.value)}
                  placeholder="Ex: Transfer Paraguai, Tour Argentina..."
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (newOptName.trim() && newOptPrice) { setForm(f => ({ ...f, optionals: [...f.optionals, { name: newOptName.trim(), price: newOptPrice }] })); setNewOptName(""); setNewOptPrice(""); } } }} />
                <div className="relative flex-shrink-0 w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input className="input-field py-2 text-sm pl-8 w-full" type="number" min="0" step="0.01"
                    value={newOptPrice} onChange={e => setNewOptPrice(e.target.value)}
                    placeholder="0,00"
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (newOptName.trim() && newOptPrice) { setForm(f => ({ ...f, optionals: [...f.optionals, { name: newOptName.trim(), price: newOptPrice }] })); setNewOptName(""); setNewOptPrice(""); } } }} />
                </div>
                <button type="button"
                  onClick={() => { if (newOptName.trim() && newOptPrice) { setForm(f => ({ ...f, optionals: [...f.optionals, { name: newOptName.trim(), price: newOptPrice }] })); setNewOptName(""); setNewOptPrice(""); } }}
                  className="px-3 bg-amber-500 text-white rounded-xl hover:bg-amber-400 transition-colors flex-shrink-0">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </Section>

          <Section title="Roteiro">
            <p className="text-xs text-gray-400 mb-4">
              Organize o roteiro em seções com título livre - pode ser o dia da semana, um tema ou qualquer nome que faça sentido para esta viagem.
            </p>
            <div className="space-y-4">
              {form.itinerary.map((section, si) => (
                <div key={si} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
                  <button type="button" onClick={() => removeSection(si)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors">
                    <X size={15} />
                  </button>

                  <input
                    className="input-field font-semibold pr-8"
                    value={section.title}
                    onChange={(e) => updateSectionTitle(si, e.target.value)}
                    placeholder="Ex: Sexta-feira, Sábado, Dia de Passeio, Retorno..."
                  />

                  <div className="space-y-1.5 pl-1">
                    {section.items.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
                        <p className="flex-1 text-sm text-gray-700">{item}</p>
                        <button type="button" onClick={() => removeItemFromSection(si, ii)}
                          className="text-gray-300 hover:text-red-500 transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    <SectionItemInput onAdd={(text) => addItemToSection(si, text)} />
                  </div>
                </div>
              ))}

              <button type="button" onClick={addSection}
                className="flex items-center gap-2 text-sm text-navy-600 hover:text-gold-600 font-medium py-2 transition-colors">
                <Plus size={16} /> Adicionar seção ao roteiro
              </button>
            </div>
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Section title="Reserva e pagamento">
            <div className="space-y-4">
              <Toggle label="Reserva só pelo WhatsApp" description="Desliga o pagamento online (PIX/cartão) deste roteiro. O cliente conclui a reserva pelo WhatsApp com a equipe."
                checked={form.whatsapp_only} onChange={(v) => set("whatsapp_only", v)} />
            </div>
          </Section>

          <Section title="Publicação">
            <div className="space-y-4">
              <Toggle label="Em Destaque" description="Aparece na seção de destaques da home"
                checked={form.is_featured} onChange={(v) => set("is_featured", v)} />
              <Toggle label="Roteiro Ativo" description="Permite criar novas datas para este roteiro"
                checked={form.is_active} onChange={(v) => set("is_active", v)} />
            </div>
          </Section>

          {form.image_url && (
            <Section title="Preview do Card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src={form.image_url} alt={form.title} className="w-full h-36 object-cover rounded-xl mb-3" />
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

      {/* Botão salvar inferior */}
      <div className="mt-6 flex flex-col items-stretch sm:items-end gap-2">
        {error && <p className="text-red-600 text-sm sm:text-right">{error}</p>}
        {success && <p className="text-green-600 text-sm sm:text-right">{success}</p>}
        <button type="submit" disabled={loading}
          className="btn-primary flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50 w-full sm:w-auto sm:px-8">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{templateId ? "Salvar Roteiro" : "Criar Roteiro"}</span>
        </button>
      </div>
    </form>
  );
}

/* ── Sub-componentes ────────────────────────────────────── */

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

function SectionItemInput({ onAdd }: { onAdd: (text: string) => void }) {
  const [value, setValue] = useState("");
  const submit = () => {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue("");
  };
  return (
    <div className="flex gap-2 pt-1">
      <input
        className="input-field flex-1 py-2 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Adicionar atividade..."
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
      />
      <button type="button" onClick={submit}
        className="px-3 bg-navy-700 text-white rounded-xl hover:bg-navy-600 transition-colors flex-shrink-0">
        <Plus size={16} />
      </button>
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

function UnifiedGallery({ images, onChange }: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [showUrl, setShowUrl] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const MAX = 5;

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (images.length >= MAX) { setUploadError(`Limite de ${MAX} imagens atingido.`); return; }
    if (images.includes(url)) { setUploadError("Esta imagem já está na galeria."); return; }
    onChange([...images, url]);
    setUrlInput("");
    setUploadError("");
  };

  const remove = (index: number) => onChange(images.filter((_, i) => i !== index));

  const setMain = (index: number) => {
    if (index === 0) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadError("");
    const next = [...images];
    let skipped = 0;
    try {
      for (const file of files) {
        if (next.length >= MAX) { skipped++; continue; }
        const url = await uploadFile(file);
        if (next.includes(url)) { skipped++; continue; }
        next.push(url);
      }
      onChange(next);
      if (skipped > 0) setUploadError(`${skipped} imagem(ns) ignorada(s) - duplicada ou limite de ${MAX} atingido.`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <div
            key={i}
            className={`relative group rounded-xl overflow-hidden border-2 transition-colors ${
              i === 0 ? "border-gold-400" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src={img} alt="" className="w-full h-28 object-cover" />

            {/* Principal badge */}
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 bg-gold-500 text-navy-900 text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                Principal
              </span>
            )}

            {/* Set as main - always visible on mobile, hover-only on desktop */}
            {i !== 0 && (
              <button
                type="button"
                onClick={() => setMain(i)}
                title="Definir como principal"
                className="absolute top-1.5 left-1.5 bg-white/90 text-gold-500 rounded-full p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <Star size={12} fill="currentColor" />
              </button>
            )}

            {/* Remove - always visible on mobile, hover-only on desktop */}
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <X size={12} />
            </button>

            {/* Order badge */}
            {i > 0 && (
              <span className="absolute bottom-1.5 right-1.5 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {i + 1}
              </span>
            )}
          </div>
        ))}

        {/* Add button - hidden when at limit */}
        {images.length < MAX && <label className={`flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          uploading
            ? "border-gray-200 text-gray-400 cursor-not-allowed"
            : "border-navy-200 text-navy-500 hover:border-gold-400 hover:text-gold-600"
        }`}>
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin mb-1" />
              <span className="text-xs">Enviando...</span>
            </>
          ) : (
            <>
              <Upload size={20} className="mb-1" />
              <span className="text-xs font-medium">Adicionar fotos</span>
              <span className="text-[10px] text-gray-400 mt-0.5">múltiplas de uma vez</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFiles}
            disabled={uploading}
          />
        </label>}
      </div>

      <div className="flex items-center justify-between">
        {images.length === 0 ? (
          <p className="text-xs text-gray-400">Nenhuma imagem ainda. A primeira será a principal.</p>
        ) : (
          <p className="text-xs text-gray-400">{images.length}/{MAX} imagens</p>
        )}
        {images.length >= MAX && (
          <p className="text-xs text-amber-600 font-medium">Limite atingido - remova uma para adicionar outra.</p>
        )}
      </div>

      {/* URL secundário */}
      <div>
        <button
          type="button"
          onClick={() => { setShowUrl(!showUrl); setUploadError(""); }}
          className="text-xs text-gray-400 hover:text-navy-600 underline underline-offset-2 transition-colors"
        >
          {showUrl ? "Ocultar" : "Adicionar por URL externa"}
        </button>
        {showUrl && (
          <div className="flex gap-2 mt-2">
            <input
              className="input-field flex-1 py-2 text-sm"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
            />
            <button
              type="button"
              onClick={addUrl}
              className="px-3 bg-navy-700 text-white rounded-xl hover:bg-navy-600 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      {uploadError && <p className="text-amber-600 text-xs">{uploadError}</p>}
    </div>
  );
}
