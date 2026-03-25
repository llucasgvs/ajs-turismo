"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TripDateForm from "@/components/admin/TripDateForm";
import { apiFetch } from "@/lib/api";

export default function NovaDatum() {
  const { id } = useParams<{ id: string }>();
  const [templateTitle, setTemplateTitle] = useState("");

  useEffect(() => {
    apiFetch(`/templates/${id}`)
      .then((r) => r.json())
      .then((data) => { if (data.title) setTemplateTitle(data.title); });
  }, [id]);

  return (
    <TripDateForm
      templateId={parseInt(id)}
      templateTitle={templateTitle}
    />
  );
}
