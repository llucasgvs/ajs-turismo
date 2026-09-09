import { redirect } from "next/navigation";

/* Combo é viagem, e mora na vitrine junto das outras: uma lista separada só de
 * combos dividia a atenção de quem chegou para comprar. O caminho continua
 * existindo por causa de links já divulgados, e leva para onde os combos estão.
 *
 * A página de CADA combo (/combos/[slug]) continua sendo dele. */
export default function CombosPage() {
  redirect("/viagens");
}
