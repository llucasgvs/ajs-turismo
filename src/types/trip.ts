export interface Trip {
  id: number;
  template_id: number | null;
  title: string;
  destination: string;
  description: string;
  short_description: string | null;
  image_url: string | null;
  gallery: string[];
  departure_date: string;
  return_date: string;
  duration_nights: number;
  price_per_person: number;
  original_price: number | null;
  max_installments: number;
  price_tiers: { name?: string; age_range?: string; price: number; original_price?: number | null; occupies_seat?: boolean; label?: string }[];
  // A API pública esconde o estoque: total_spots nunca vem, e available_spots
  // só vem quando é baixo (ou 0, para "Esgotado"). null significa "tem vaga de
  // sobra", e não "não sei". Ver app/core/vitrine.py no backend.
  total_spots?: number | null;
  available_spots: number | null;
  min_group_size: number;
  includes: string[];
  excludes: string[];
  optionals: { name: string; price: number }[];
  itinerary: { day?: number; title: string; description?: string; items?: string[] }[];
  departure_locations: string[];
  required_documents: string | null;
  whatsapp_only?: boolean;
  quote_only?: boolean;
  slug?: string | null;
  parent_id?: number | null;
  is_open_date: boolean;
  open_date_price: number | null;
  open_date_spots_per_day: number;
  open_date_min_advance: number;
  open_date_max_advance: number;
  category: string;
  tag: string | null;
  status: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}
