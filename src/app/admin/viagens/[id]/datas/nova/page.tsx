"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import TripDateForm from "@/components/admin/TripDateForm";
import { apiFetch } from "@/lib/api";

interface TripDateDefaults {
  price_per_person?: number;
  original_price?: number | null;
  max_installments?: number;
  total_spots?: number;
  dep_time?: string;
  ret_time?: string;
  price_tiers?: { label: string; price: number }[];
}

/** ISO → "HH:MM" no horário de São Paulo */
function timeOf(iso: string): string {
  const sp = new Date(iso).toLocaleString("sv", { timeZone: "America/Sao_Paulo" });
  return sp.slice(11, 16);
}

export default function NovaDatum() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const dupId = searchParams.get("dup");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDurationNights, setTemplateDurationNights] = useState<number | undefined>();
  const [defaults, setDefaults] = useState<TripDateDefaults | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch(`/templates/${id}`).then((r) => r.json()).catch(() => null),
      apiFetch(`/templates/${id}/trips?limit=100`).then((r) => r.json()).catch(() => null),
    ]).then(([tmpl, datesData]) => {
      if (tmpl?.title) setTemplateTitle(tmpl.title);
      if (tmpl?.duration_nights != null) setTemplateDurationNights(tmpl.duration_nights);

      const items: Array<{
        id: number;
        created_at: string;
        departure_date: string;
        return_date: string;
        price_per_person: number;
        original_price: number | null;
        max_installments: number;
        total_spots: number;
        price_tiers?: { label: string; price: number }[];
      }> = datesData?.items ?? [];

      // Com ?dup=<id>, herda daquela data específica; senão, da última criada
      let source = dupId ? items.find((t) => t.id === parseInt(dupId)) : undefined;
      if (!source && items.length > 0) {
        source = items.reduce((a, b) =>
          new Date(b.created_at).getTime() > new Date(a.created_at).getTime() ? b : a
        );
      }

      if (source) {
        setDefaults({
          price_per_person: source.price_per_person,
          original_price: source.original_price,
          max_installments: source.max_installments,
          total_spots: source.total_spots,
          dep_time: timeOf(source.departure_date),
          ret_time: timeOf(source.return_date),
          price_tiers: source.price_tiers ?? [],
        });
      }
      setLoading(false);
    });
  }, [id, dupId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-navy-400 animate-spin" />
      </div>
    );
  }

  return (
    <TripDateForm
      templateId={parseInt(id)}
      templateTitle={templateTitle}
      templateDurationNights={templateDurationNights}
      defaults={defaults}
    />
  );
}
