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
  total_spots: number;
  available_spots: number;
  min_group_size: number;
  includes: string[];
  excludes: string[];
  itinerary: { day: number; title: string; description: string; time?: string }[];
  category: string;
  tag: string | null;
  status: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}
