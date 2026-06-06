"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
}

/** ISO → "HH:MM" no horário de São Paulo */
function timeOf(iso: string): string {
  const sp = new Date(iso).toLocaleString("sv", { timeZone: "America/Sao_Paulo" });
  return sp.slice(11, 16);
}

export default function NovaDatum() {
  const { id } = useParams<{ id: string }>();
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

      // Herda valores da última data CRIADA (maior created_at)
      const items: Array<{
        created_at: string;
        departure_date: string;
        return_date: string;
        price_per_person: number;
        original_price: number | null;
        max_installments: number;
        total_spots: number;
      }> = datesData?.items ?? [];

      if (items.length > 0) {
        const last = items.reduce((a, b) =>
          new Date(b.created_at).getTime() > new Date(a.created_at).getTime() ? b : a
        );
        setDefaults({
          price_per_person: last.price_per_person,
          original_price: last.original_price,
          max_installments: last.max_installments,
          total_spots: last.total_spots,
          dep_time: timeOf(last.departure_date),
          ret_time: timeOf(last.return_date),
        });
      }
      setLoading(false);
    });
  }, [id]);

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
