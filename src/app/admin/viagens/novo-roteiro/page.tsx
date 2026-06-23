"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TemplateForm from "@/components/admin/TemplateForm";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

function NovoRoteiroInner() {
  const params = useSearchParams();
  const variacaoDe = params.get("variacao_de");
  const [initial, setInitial] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(!!variacaoDe);

  useEffect(() => {
    if (!variacaoDe) return;
    apiFetch(`/templates/${variacaoDe}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          // copia o roteiro principal como base da variação
          const copy = { ...data } as Record<string, unknown>;
          delete copy.id;
          delete copy.created_at;
          delete copy.updated_at;
          copy.parent_id = Number(variacaoDe);
          setInitial(copy);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [variacaoDe]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-navy-400 animate-spin" />
      </div>
    );
  }

  return (
    <TemplateForm initialData={(initial ?? undefined) as Parameters<typeof TemplateForm>[0]["initialData"]} />
  );
}

export default function NovoRoteiro() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={28} className="text-navy-400 animate-spin" /></div>}>
      <NovoRoteiroInner />
    </Suspense>
  );
}
