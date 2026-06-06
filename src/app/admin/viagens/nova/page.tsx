import { redirect } from "next/navigation";

// Rota legada: "nova viagem" virou "novo roteiro" após a separação template/data.
// Redirect server-side (sem flash de tela) para bookmarks antigos.
export default function NovaViagemRedirect() {
  redirect("/admin/viagens/novo-roteiro");
}
