"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NovaViagemRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/viagens/novo-roteiro"); }, [router]);
  return null;
}
