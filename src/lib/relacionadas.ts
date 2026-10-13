import type { Trip } from "@/types/trip";

/**
 * Escolha dos cartões "Você também pode gostar" e "Outras opções deste
 * destino" da página da viagem.
 *
 * Roda no servidor, para os links já virem no HTML que o Google e as IAs leem
 * (montados só no navegador, eles não apareciam para quem lê a página crua). E
 * também no navegador, como reserva, se a busca do servidor falhar. A regra é
 * uma só, aqui, para os dois lados nunca escolherem cartões diferentes.
 */

/** Só o que o cartão mostra: a lista de origem tem a viagem inteira, e mandar
 *  50 viagens completas para o celular era o que pesava. */
export type CartaoViagem = Pick<
  Trip,
  "id" | "slug" | "title" | "image_url" | "destination" | "tag" | "price_per_person" | "departure_date"
>;

export type OpcaoDestino = {
  id: number;
  first_trip_id: number;
  slug?: string | null;
  title: string;
  image_url: string | null;
  parent_id?: number | null;
  price_from: number;
};

/** Mesma lista que a página sempre usou (as 50 próximas saídas). */
export const URL_VIAGENS = "/trips/?limit=50";
export const URL_ROTEIROS = "/templates/public";

export function escolherRelacionadas(
  lista: Trip[],
  currentId: number,
  currentTemplateId: number | null,
  category: string,
): CartaoViagem[] {
  // Fora o roteiro atual, uma data por roteiro (a mais próxima), mesma
  // categoria primeiro.
  const seen = new Set<number | null>();
  return lista
    .filter((t) => t.id !== currentId && t.is_active !== false && t.template_id !== currentTemplateId)
    .sort((a, b) => {
      const catA = a.category === category ? 1 : 0;
      const catB = b.category === category ? 1 : 0;
      if (catB !== catA) return catB - catA;
      return new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime();
    })
    .filter((t) => {
      if (seen.has(t.template_id)) return false;
      seen.add(t.template_id);
      return true;
    })
    .slice(0, 4)
    .map(({ id, slug, title, image_url, destination, tag, price_per_person, departure_date }) => ({
      id, slug, title, image_url, destination, tag, price_per_person, departure_date,
    }));
}

export function escolherOpcoes(
  lista: OpcaoDestino[],
  templateId: number | null,
  parentId?: number | null,
): OpcaoDestino[] {
  // Raiz da família: se este roteiro é variação, o principal; senão, ele mesmo.
  const root = parentId || templateId;
  if (!root) return [];
  return lista
    .filter((t) => t.id !== templateId && (t.id === root || t.parent_id === root))
    .map(({ id, first_trip_id, slug, title, image_url, parent_id, price_from }) => ({
      id, first_trip_id, slug, title, image_url, parent_id, price_from,
    }));
}
