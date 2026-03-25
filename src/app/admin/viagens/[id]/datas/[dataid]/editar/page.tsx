"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TripDateForm from "@/components/admin/TripDateForm";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function EditarDatum() {
  const { id, dataid } = useParams<{ id: string; dataid: string }>();
  const [tripDate, setTripDate] = useState<Record<string, unknown> | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch(`/templates/${id}`).then((r) => r.json()),
      apiFetch(`/templates/${id}/trips?limit=100`).then((r) => r.json()),
    ])
      .then(([tmpl, datesData]) => {
        if (tmpl.title) setTemplateTitle(tmpl.title);
        const found = datesData.items?.find((d: { id: number }) => d.id === parseInt(dataid));
        if (found) setTripDate(found);
        else setError("Data não encontrada.");
      })
      .catch(() => setError("Erro ao carregar dados."))
      .finally(() => setLoading(false));
  }, [id, dataid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-navy-400 animate-spin" />
      </div>
    );
  }

  if (error || !tripDate) {
    return <p className="text-red-500 p-8">{error || "Data não encontrada."}</p>;
  }

  return (
    <TripDateForm
      templateId={parseInt(id)}
      tripId={parseInt(dataid)}
      templateTitle={templateTitle}
      initialData={tripDate as Parameters<typeof TripDateForm>[0]["initialData"]}
    />
  );
}
