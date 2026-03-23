"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TripForm from "@/components/admin/TripForm";
import { apiFetch } from "@/lib/api";

export default function EditarViagem() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/trips/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setTrip(data);
        else setError("Viagem não encontrada.");
      })
      .catch(() => setError("Erro ao carregar viagem."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !trip) {
    return <p className="text-red-500 p-8">{error || "Viagem não encontrada."}</p>;
  }

  return <TripForm tripId={parseInt(id)} initialData={trip as Parameters<typeof TripForm>[0]["initialData"]} />;
}
