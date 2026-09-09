import CombosClient from "./CombosClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getCombos() {
  try {
    // ISR como na vitrine de viagens: a página é a mesma para todo mundo, e o
    // que muda (datas esgotando) já é reconferido no checkout.
    const res = await fetch(`${API}/combos/public`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function CombosPage() {
  return <CombosClient combos={await getCombos()} />;
}
