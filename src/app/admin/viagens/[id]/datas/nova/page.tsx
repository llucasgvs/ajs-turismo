"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TripDateForm from "@/components/admin/TripDateForm";
import { apiFetch } from "@/lib/api";

export default function NovaDatum() {
  const { id } = useParams<{ id: string }>();
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDurationNights, setTemplateDurationNights] = useState<number | undefined>();

  useEffect(() => {
    apiFetch(`/templates/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.title) setTemplateTitle(data.title);
        if (data.duration_nights != null) setTemplateDurationNights(data.duration_nights);
      });
  }, [id]);

  return (
    <TripDateForm
      templateId={parseInt(id)}
      templateTitle={templateTitle}
      templateDurationNights={templateDurationNights}
    />
  );
}
