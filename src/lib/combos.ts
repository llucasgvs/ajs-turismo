/**
 * O que a página do combo e o checkout do combo têm em comum.
 *
 * Nasceu porque as duas telas tinham cópias de `rotuloFaixa` e `paraSelecao`,
 * e cópia é o jeito mais fácil de as contas desencontrarem.
 */
import type { DataSelecionavel } from "@/components/viagem/Datas";

/** Uma faixa de idade do combo, sem preço: quem cobra é cada viagem. */
export type FaixaDoCombo = { name: string; age_range: string; occupies_seat: boolean };

/** "Criança (5 a 6 anos)", ou só "Criança" quando a faixa não diz idade. */
export function rotuloFaixa(f: FaixaDoCombo): string {
  return f.age_range ? `${f.name} (${f.age_range})` : f.name;
}

/** A data de um roteiro do combo no formato que o seletor de datas entende. */
export function paraSelecao(d: {
  trip_id: number;
  departure_date: string;
  return_date?: string | null;
  price_per_person: number;
  original_price?: number | null;
  available_spots: number;
}): DataSelecionavel {
  return {
    id: d.trip_id,
    departure_date: d.departure_date,
    return_date: d.return_date ?? null,
    price_per_person: d.price_per_person,
    original_price: d.original_price ?? null,
    available_spots: d.available_spots,
  };
}
