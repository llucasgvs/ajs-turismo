"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TemplateForm from "@/components/admin/TemplateForm";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function EditarRoteiro() {
  const { id } = useParams<{ id: string }>();
  const [template, setTemplate] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/templates/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setTemplate(data);
        else setError("Roteiro não encontrado.");
      })
      .catch(() => setError("Erro ao carregar roteiro."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-navy-400 animate-spin" />
      </div>
    );
  }

  if (error || !template) {
    return <p className="text-red-500 p-8">{error || "Roteiro não encontrado."}</p>;
  }

  return (
    <TemplateForm
      templateId={parseInt(id)}
      initialData={template as Parameters<typeof TemplateForm>[0]["initialData"]}
    />
  );
}
